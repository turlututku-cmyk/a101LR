import { DurableObject } from "cloudflare:workers";

// channel id -> config. `post` limits who can send (by role); omitted = everyone logged in.
const CHANNELS = {
    announcements: { post: ["a101"] },
    general: {},
    "off-topic": {},
    "list-talk": {},
    records: {},
    "level-requests": {},
    minigames: {},
};

// Roles are assigned by username. Everyone else is a "member".
const ROLES = { cduking: "a101", hxmza7: "admin" };
const MODERATORS = ["a101", "admin"];

// Reserved usernames can only be registered with a claim code (stored here as SHA-256).
const CLAIM_HASHES = {
    cduking: "4649514cf8192eb14fe7e5f8df5a2519f802e8eb2ad3595a2ec18642e6893885",
    hxmza7: "fa70739a09ac917a77abb820ab5cb70d2703492fe02045c647c2074e04cae2db",
};

const REACTIONS = [
    "\u{1F44D}",
    "❤️",
    "\u{1F602}",
    "\u{1F62E}",
    "\u{1F622}",
    "\u{1F525}",
    "\u{1F389}",
];
const CUSTOM_REACTION_RE = /^:[a-z0-9_]{2,32}:$/;
const MAX_REACTION_TYPES = 12;

const MAX_IMAGE_BYTES = 500 * 1024;
const MAX_AVATAR_BYTES = 100 * 1024;
const MAX_VIDEO_BYTES = 25 * 1024 * 1024;
const VIDEO_CHUNK = 1024 * 1024;
const VIDEO_SLICE = 2 * 1024 * 1024;
const MAX_VIDEOS = 20;
const GIF_RE = /^[A-Za-z0-9_-]{1,50}\.(gif|mp4)$/;
const MAX_MESSAGES = 100;
const MAX_TEXT = 300;
const MAX_BIO = 190;
const COOLDOWN_MS = 2000;
const SESSION_MS = 30 * 24 * 60 * 60 * 1000;
const PBKDF2_ITERATIONS = 100000;
const MAX_FAILS = 5;
const FAIL_WINDOW_MS = 10 * 60 * 1000;
const EMBED_TTL_MS = 60 * 60 * 1000;
const EMBED_PER_MINUTE = 30;

const json = (body, status = 200) =>
    new Response(JSON.stringify(body), {
        status,
        headers: { "content-type": "application/json", "cache-control": "no-store" },
    });

const toHex = (bytes) =>
    [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, "0")).join("");
const fromHex = (hex) =>
    new Uint8Array(hex.match(/../g).map((h) => parseInt(h, 16)));

const has = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
const roleOf = (name) => {
    const lower = String(name).toLowerCase();
    return has(ROLES, lower) ? ROLES[lower] : "member";
};
const dmKey = (a, b) => `dm:${[a.toLowerCase(), b.toLowerCase()].sort().join("|")}`;

async function hashPassword(password, salt) {
    const key = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(password),
        "PBKDF2",
        false,
        ["deriveBits"],
    );
    return toHex(
        await crypto.subtle.deriveBits(
            { name: "PBKDF2", hash: "SHA-256", salt, iterations: PBKDF2_ITERATIONS },
            key,
            256,
        ),
    );
}

async function sha256(text) {
    return toHex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)));
}

async function readLimited(request, max) {
    if (!request.body) return new Uint8Array(0);
    const reader = request.body.getReader();
    const bytes = new Uint8Array(max);
    let length = 0;
    for (;;) {
        const { done, value } = await reader.read();
        if (done) return bytes.slice(0, length);
        if (length + value.length > max) {
            await reader.cancel();
            return null;
        }
        bytes.set(value, length);
        length += value.length;
    }
}

function sniffVideo(b) {
    if (b.length < 12) return null;
    if (b[4] === 0x66 && b[5] === 0x74 && b[6] === 0x79 && b[7] === 0x70) return "video/mp4";
    if (b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3) return "video/webm";
    return null;
}

function sniffImage(b) {
    if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
    if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "image/png";
    if (
        b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
        b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50
    ) {
        return "image/webp";
    }
    return null;
}

function safeEqual(a, b) {
    if (a.length !== b.length) return false;
    let diff = 0;
    for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
    return diff === 0;
}

const IMAGE_HEADERS = (type) => ({
    "content-type": type,
    "x-content-type-options": "nosniff",
    "content-security-policy": "default-src 'none'; sandbox",
});

export class ChatRoom extends DurableObject {
    constructor(ctx, env) {
        super(ctx, env);
        this.lastSent = new Map();
        this.fails = new Map();
        this.embeds = new Map();
        this.embedHits = [];
    }

    async fetch(request) {
        const { pathname, searchParams } = new URL(request.url);
        const get = request.method === "GET";
        const post = request.method === "POST";

        if (pathname === "/api/chat") {
            if (get) return this.getMessages(request, searchParams);
            if (post) return this.postMessage(request);
        } else if (get && pathname === "/api/chat/summary") {
            return this.summary(request);
        } else if (get && pathname === "/api/chat/users") {
            return this.searchUsers(request, searchParams);
        } else if (get && pathname === "/api/chat/profiles") {
            return this.profiles(searchParams);
        } else if (get && pathname === "/api/chat/embed") {
            return this.youtubeEmbed(searchParams);
        } else if (post && pathname === "/api/chat/image") {
            return this.postImage(request, searchParams);
        } else if (get && pathname.startsWith("/api/chat/image/")) {
            return this.getImage(pathname.slice("/api/chat/image/".length));
        } else if (post && pathname === "/api/chat/video") {
            return this.postVideo(request, searchParams);
        } else if (get && pathname.startsWith("/api/chat/video/")) {
            return this.getVideo(request, pathname.slice("/api/chat/video/".length));
        } else if (post && pathname === "/api/chat/react") {
            return this.react(request);
        } else if (post && pathname === "/api/chat/delete") {
            return this.deleteMessage(request);
        } else if (post && pathname === "/api/chat/avatar") {
            return this.postAvatar(request, searchParams);
        } else if (get && pathname.startsWith("/api/chat/avatar/")) {
            return this.getAvatar(pathname.slice("/api/chat/avatar/".length));
        } else if (post && pathname === "/api/auth/register") {
            return this.register(request);
        } else if (post && pathname === "/api/auth/login") {
            return this.login(request);
        } else if (post && pathname === "/api/auth/logout") {
            return this.logout(request);
        } else if (post && pathname === "/api/auth/profile") {
            return this.updateProfile(request);
        } else if (get && pathname === "/api/auth/me") {
            const username = await this.sessionUser(request);
            if (!username) return json({ error: "Not logged in." }, 401);
            return json(await this.publicProfile(username));
        }

        return json({ error: "Not found." }, 404);
    }

    // ---------- helpers ----------

    async readBody(request) {
        try {
            return await request.json();
        } catch {
            return null;
        }
    }

    async createSession(username) {
        const token = toHex(crypto.getRandomValues(new Uint8Array(32)));
        await this.ctx.storage.put(`s:${await sha256(token)}`, {
            username,
            expires: Date.now() + SESSION_MS,
        });
        return token;
    }

    async sessionUser(request) {
        const header = request.headers.get("authorization") || "";
        const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
        if (!token) return null;
        const key = `s:${await sha256(token)}`;
        const session = await this.ctx.storage.get(key);
        if (!session) return null;
        if (session.expires < Date.now()) {
            await this.ctx.storage.delete(key);
            return null;
        }
        return session.username;
    }

    async publicProfile(username) {
        const user = await this.ctx.storage.get(`u:${username.toLowerCase()}`);
        return {
            username: user?.username || username,
            role: roleOf(username),
            avatar: user?.avatar || 0,
            bio: user?.bio || "",
            created: user?.created || 0,
        };
    }

    /** Turn { channel } or { dm } into a storage key, enforcing who may read or post. */
    async resolveTarget(username, source, forPost) {
        const dm = source.dm ? String(source.dm).trim() : "";
        if (dm) {
            if (!username) return { error: json({ error: "Log in to use direct messages." }, 401) };
            const other = await this.ctx.storage.get(`u:${dm.toLowerCase()}`);
            if (!other) return { error: json({ error: "No such user." }, 404) };
            if (other.username.toLowerCase() === username.toLowerCase()) {
                return { error: json({ error: "You can't message yourself." }, 400) };
            }
            return { key: dmKey(username, other.username), isDm: true };
        }
        const channel = String(source.channel || "general");
        if (!has(CHANNELS, channel)) return { error: json({ error: "Unknown channel." }, 404) };
        const allowed = CHANNELS[channel].post;
        if (forPost && allowed && !allowed.includes(roleOf(username))) {
            return { error: json({ error: `Only ${allowed.join(", ")} can post in #${channel}.` }, 403) };
        }
        return { key: channel, isDm: false };
    }

    async bumpVersion(key) {
        await this.ctx.storage.put(`ver:${key}`, ((await this.ctx.storage.get(`ver:${key}`)) || 0) + 1);
    }

    // ---------- auth ----------

    tooManyFails(id) {
        const entry = this.fails.get(id);
        if (!entry) return false;
        if (Date.now() - entry.first > FAIL_WINDOW_MS) {
            this.fails.delete(id);
            return false;
        }
        return entry.count >= MAX_FAILS;
    }

    recordFail(id) {
        const entry = this.fails.get(id);
        if (!entry || Date.now() - entry.first > FAIL_WINDOW_MS) {
            this.fails.set(id, { count: 1, first: Date.now() });
        } else {
            entry.count++;
        }
        if (this.fails.size > 500) this.fails.clear();
    }

    async register(request) {
        const body = await this.readBody(request);
        const username = String(body?.username ?? "").trim();
        const password = String(body?.password ?? "");
        const ip = request.headers.get("cf-connecting-ip") || "unknown";

        if (!/^[A-Za-z0-9_]{3,20}$/.test(username)) {
            return json({ error: "Username must be 3-20 letters, numbers or underscores." }, 400);
        }
        if (password.length < 6 || password.length > 100) {
            return json({ error: "Password must be 6-100 characters." }, 400);
        }

        const lower = username.toLowerCase();
        if (has(CLAIM_HASHES, lower)) {
            const failId = `claim|${ip}`;
            if (this.tooManyFails(failId)) {
                return json({ error: "Too many attempts. Try again in a few minutes." }, 429);
            }
            const claim = String(body?.claim ?? "").trim().toLowerCase();
            if (!claim || !safeEqual(await sha256(claim), CLAIM_HASHES[lower])) {
                if (claim) this.recordFail(failId);
                return json(
                    { error: "That username is reserved. Enter its claim code.", claim: true },
                    403,
                );
            }
        }

        const key = `u:${lower}`;
        if (await this.ctx.storage.get(key)) {
            return json({ error: "That username is taken." }, 409);
        }

        const salt = crypto.getRandomValues(new Uint8Array(16));
        await this.ctx.storage.put(key, {
            username,
            salt: toHex(salt),
            hash: await hashPassword(password, salt),
            created: Date.now(),
            bio: "",
            avatar: 0,
        });
        return json({ ...(await this.publicProfile(username)), token: await this.createSession(username) });
    }

    async login(request) {
        const body = await this.readBody(request);
        const username = String(body?.username ?? "").trim();
        const password = String(body?.password ?? "");
        const ip = request.headers.get("cf-connecting-ip") || "unknown";
        const failId = `${ip}|${username.toLowerCase()}`;

        if (this.tooManyFails(failId)) {
            return json({ error: "Too many attempts. Try again in a few minutes." }, 429);
        }

        const user = await this.ctx.storage.get(`u:${username.toLowerCase()}`);
        const salt = user ? fromHex(user.salt) : crypto.getRandomValues(new Uint8Array(16));
        const hash = await hashPassword(password, salt);

        if (!user || !safeEqual(hash, user.hash)) {
            this.recordFail(failId);
            return json({ error: "Wrong username or password." }, 401);
        }

        this.fails.delete(failId);
        return json({
            ...(await this.publicProfile(user.username)),
            token: await this.createSession(user.username),
        });
    }

    async logout(request) {
        const header = request.headers.get("authorization") || "";
        const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
        if (token) await this.ctx.storage.delete(`s:${await sha256(token)}`);
        return json({ ok: true });
    }

    async updateProfile(request) {
        const username = await this.sessionUser(request);
        if (!username) return json({ error: "Log in first." }, 401);
        const body = await this.readBody(request);
        const bio = String(body?.bio ?? "").replace(/\s+/g, " ").trim().slice(0, MAX_BIO);
        const key = `u:${username.toLowerCase()}`;
        const user = await this.ctx.storage.get(key);
        await this.ctx.storage.put(key, { ...user, bio });
        return json(await this.publicProfile(username));
    }

    // ---------- profiles & avatars ----------

    async profiles(searchParams) {
        const names = [
            ...new Set(
                String(searchParams.get("names") ?? "")
                    .split(",")
                    .map((n) => n.trim().toLowerCase())
                    .filter((n) => /^[a-z0-9_]{3,20}$/.test(n)),
            ),
        ].slice(0, 40);
        if (!names.length) return json({ profiles: [] });
        const found = await this.ctx.storage.get(names.map((n) => `u:${n}`));
        return json({
            profiles: names
                .map((n) => found.get(`u:${n}`))
                .filter(Boolean)
                .map((u) => ({
                    username: u.username,
                    role: roleOf(u.username),
                    avatar: u.avatar || 0,
                    bio: u.bio || "",
                    created: u.created || 0,
                })),
        });
    }

    async postAvatar(request, searchParams) {
        const username = await this.sessionUser(request);
        if (!username) return json({ error: "Log in first." }, 401);
        const lower = username.toLowerCase();
        const key = `u:${lower}`;
        const user = await this.ctx.storage.get(key);

        if (searchParams.get("remove")) {
            await this.ctx.storage.delete(`av:${lower}`);
            await this.ctx.storage.put(key, { ...user, avatar: 0 });
            return json({ avatar: 0 });
        }

        const declared = Number(request.headers.get("content-length")) || 0;
        const bytes = declared > MAX_AVATAR_BYTES ? null : await readLimited(request, MAX_AVATAR_BYTES);
        if (!bytes) return json({ error: "Profile picture is too large (max 100 KB)." }, 413);
        if (bytes.length === 0) return json({ error: "No image received." }, 400);
        const type = sniffImage(bytes);
        if (!type) return json({ error: "Only JPEG, PNG or WebP images are allowed." }, 415);

        const version = Date.now();
        await this.ctx.storage.put(`av:${lower}`, { type, bytes: bytes.buffer });
        await this.ctx.storage.put(key, { ...user, avatar: version });
        return json({ avatar: version });
    }

    async getAvatar(name) {
        const lower = name.toLowerCase();
        if (!/^[a-z0-9_]{3,20}$/.test(lower)) return json({ error: "Not found." }, 404);
        const avatar = await this.ctx.storage.get(`av:${lower}`);
        if (!avatar) return json({ error: "Not found." }, 404);
        return new Response(avatar.bytes, {
            headers: { ...IMAGE_HEADERS(avatar.type), "cache-control": "public, max-age=31536000, immutable" },
        });
    }

    // ---------- messages ----------

    async getMessages(request, searchParams) {
        const source = { channel: searchParams.get("channel"), dm: searchParams.get("dm") };
        const username = source.dm ? await this.sessionUser(request) : null;
        const target = await this.resolveTarget(username, source, false);
        if (target.error) return target.error;

        const after = Number(searchParams.get("after")) || 0;
        const clientVersion = Number(searchParams.get("v")) || 0;
        const version = (await this.ctx.storage.get(`ver:${target.key}`)) || 0;
        const full = clientVersion !== version;
        const messages = (await this.ctx.storage.get(`m:${target.key}`)) || [];
        return json({
            messages: full ? messages : messages.filter((m) => m.id > after),
            version,
            full,
        });
    }

    async postMessage(request) {
        const username = await this.sessionUser(request);
        if (!username) return json({ error: "Log in to send messages." }, 401);

        const body = await this.readBody(request);
        const target = await this.resolveTarget(username, body || {}, true);
        if (target.error) return target.error;

        const text = String(body?.text ?? "").trim().slice(0, MAX_TEXT);
        const gif = body?.gif == null ? "" : String(body.gif);
        if (gif && !GIF_RE.test(gif)) return json({ error: "Unknown GIF." }, 400);
        if (!text && !gif) return json({ error: "Message is empty." }, 400);

        return this.storeMessage(username, target, text, gif ? { gif } : {});
    }

    async postImage(request, searchParams) {
        const username = await this.sessionUser(request);
        if (!username) return json({ error: "Log in to send messages." }, 401);

        const target = await this.resolveTarget(
            username,
            { channel: searchParams.get("channel"), dm: searchParams.get("dm") },
            true,
        );
        if (target.error) return target.error;
        const text = String(searchParams.get("text") ?? "").trim().slice(0, MAX_TEXT);

        const declared = Number(request.headers.get("content-length")) || 0;
        const bytes = declared > MAX_IMAGE_BYTES ? null : await readLimited(request, MAX_IMAGE_BYTES);
        if (!bytes) return json({ error: "Image is too large (max 500 KB)." }, 413);
        if (bytes.length === 0) return json({ error: "No image received." }, 400);
        const type = sniffImage(bytes);
        if (!type) return json({ error: "Only JPEG, PNG or WebP images are allowed." }, 415);

        const dim = (name) => {
            const n = Math.round(Number(searchParams.get(name)));
            return n >= 1 && n <= 4096 ? n : 0;
        };

        if (Date.now() - (this.lastSent.get(username) || 0) < COOLDOWN_MS) {
            return json({ error: "Slow down a little." }, 429);
        }

        const imageId = toHex(crypto.getRandomValues(new Uint8Array(12)));
        await this.ctx.storage.put(`img:${imageId}`, { type, bytes: bytes.buffer });
        const response = await this.storeMessage(username, target, text, {
            image: imageId,
            w: dim("w"),
            h: dim("h"),
        });
        if (response.status !== 200) await this.ctx.storage.delete(`img:${imageId}`);
        return response;
    }

    async getImage(id) {
        if (!/^[0-9a-f]{24}$/.test(id)) return json({ error: "Not found." }, 404);
        const image = await this.ctx.storage.get(`img:${id}`);
        if (!image) return json({ error: "Not found." }, 404);
        return new Response(image.bytes, {
            headers: { ...IMAGE_HEADERS(image.type), "cache-control": "public, max-age=31536000, immutable" },
        });
    }

    async postVideo(request, searchParams) {
        const username = await this.sessionUser(request);
        if (!username) return json({ error: "Log in to send messages." }, 401);

        const target = await this.resolveTarget(
            username,
            { channel: searchParams.get("channel"), dm: searchParams.get("dm") },
            true,
        );
        if (target.error) return target.error;
        const text = String(searchParams.get("text") ?? "").trim().slice(0, MAX_TEXT);

        const tooBig = () => json({ error: "Video is too large (max 25 MB)." }, 413);
        const declared = Number(request.headers.get("content-length")) || 0;
        if (declared > MAX_VIDEO_BYTES) return tooBig();
        if (Date.now() - (this.lastSent.get(username) || 0) < COOLDOWN_MS) {
            return json({ error: "Slow down a little." }, 429);
        }
        if (!request.body) return json({ error: "No video received." }, 400);

        const id = toHex(crypto.getRandomValues(new Uint8Array(12)));
        const reader = request.body.getReader();
        const buf = new Uint8Array(VIDEO_CHUNK);
        let filled = 0;
        let chunks = 0;
        let total = 0;
        let type = null;

        const flush = async (length) => {
            const chunk = buf.slice(0, length);
            if (chunks === 0) {
                type = sniffVideo(chunk);
                if (!type) return false;
            }
            await this.ctx.storage.put(`vc:${id}:${chunks}`, chunk.buffer);
            chunks++;
            filled = 0;
            return true;
        };
        const abort = async (response) => {
            await reader.cancel().catch(() => {});
            await this.deleteVideoData(id, chunks);
            return response;
        };

        for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            total += value.length;
            if (total > MAX_VIDEO_BYTES) return abort(tooBig());
            let offset = 0;
            while (offset < value.length) {
                const take = Math.min(VIDEO_CHUNK - filled, value.length - offset);
                buf.set(value.subarray(offset, offset + take), filled);
                filled += take;
                offset += take;
                if (filled === VIDEO_CHUNK && !(await flush(VIDEO_CHUNK))) {
                    return abort(json({ error: "Only MP4 or WebM videos are allowed." }, 415));
                }
            }
        }
        if (filled > 0 && !(await flush(filled))) {
            return abort(json({ error: "Only MP4 or WebM videos are allowed." }, 415));
        }
        if (total === 0) return abort(json({ error: "No video received." }, 400));

        await this.ctx.storage.put(`vm:${id}`, { type, size: total, chunks });
        const response = await this.storeMessage(username, target, text, { video: id });
        if (response.status !== 200) return abort(response);

        const videos = (await this.ctx.storage.get("videos")) || [];
        videos.push(id);
        while (videos.length > MAX_VIDEOS) await this.purgeVideo(videos.shift());
        await this.ctx.storage.put("videos", videos);
        return response;
    }

    async deleteVideoData(id, chunks) {
        const keys = Array.from({ length: chunks }, (_, i) => `vc:${id}:${i}`);
        keys.push(`vm:${id}`);
        for (let i = 0; i < keys.length; i += 100) {
            await this.ctx.storage.delete(keys.slice(i, i + 100));
        }
    }

    async purgeVideo(id) {
        const meta = await this.ctx.storage.get(`vm:${id}`);
        if (meta) await this.deleteVideoData(id, meta.chunks);
    }

    /** Remove the stored image/video that belonged to messages that no longer exist. */
    async purgeMessageAssets(messages) {
        const images = messages.filter((m) => m.image).map((m) => `img:${m.image}`);
        if (images.length) await this.ctx.storage.delete(images);

        const videoIds = messages.filter((m) => m.video).map((m) => m.video);
        if (videoIds.length) {
            for (const id of videoIds) await this.purgeVideo(id);
            const videos = (await this.ctx.storage.get("videos")) || [];
            await this.ctx.storage.put("videos", videos.filter((id) => !videoIds.includes(id)));
        }
    }

    async getVideo(request, id) {
        if (!/^[0-9a-f]{24}$/.test(id)) return json({ error: "Not found." }, 404);
        const meta = await this.ctx.storage.get(`vm:${id}`);
        if (!meta) return json({ error: "Not found." }, 404);

        const { size, type } = meta;
        const header = request.headers.get("range");
        let start = 0;
        let end = Math.min(size - 1, VIDEO_SLICE - 1);
        let partial = size > VIDEO_SLICE;

        if (header) {
            const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
            if (!match || (match[1] === "" && match[2] === "")) {
                return new Response(null, { status: 416, headers: { "content-range": `bytes */${size}` } });
            }
            if (match[1] === "") {
                start = Math.max(0, size - Number(match[2]));
                end = size - 1;
            } else {
                start = Number(match[1]);
                end = match[2] === "" ? size - 1 : Math.min(Number(match[2]), size - 1);
            }
            if (start >= size || start > end) {
                return new Response(null, { status: 416, headers: { "content-range": `bytes */${size}` } });
            }
            end = Math.min(end, start + VIDEO_SLICE - 1);
            partial = true;
        }

        const first = Math.floor(start / VIDEO_CHUNK);
        const last = Math.floor(end / VIDEO_CHUNK);
        const keys = [];
        for (let i = first; i <= last; i++) keys.push(`vc:${id}:${i}`);
        const stored = await this.ctx.storage.get(keys);

        const out = new Uint8Array(end - start + 1);
        for (let i = first; i <= last; i++) {
            const chunk = new Uint8Array(stored.get(`vc:${id}:${i}`));
            const chunkStart = i * VIDEO_CHUNK;
            const from = Math.max(start, chunkStart) - chunkStart;
            const to = Math.min(end + 1, chunkStart + chunk.length) - chunkStart;
            out.set(chunk.subarray(from, to), Math.max(start, chunkStart) - start);
        }

        const headers = {
            ...IMAGE_HEADERS(type),
            "accept-ranges": "bytes",
            "cache-control": "public, max-age=31536000, immutable",
        };
        if (partial) headers["content-range"] = `bytes ${start}-${end}/${size}`;
        return new Response(out, { status: partial ? 206 : 200, headers });
    }

    async storeMessage(username, target, text, extra = {}) {
        const now = Date.now();
        if (now - (this.lastSent.get(username) || 0) < COOLDOWN_MS) {
            return json({ error: "Slow down a little." }, 429);
        }
        this.lastSent.set(username, now);
        if (this.lastSent.size > 500) this.lastSent.clear();

        const key = target.key;
        const mentions = target.isDm ? [] : await this.findMentions(text, username);
        const messages = (await this.ctx.storage.get(`m:${key}`)) || [];
        const nextId = ((await this.ctx.storage.get(`n:${key}`)) || 0) + 1;
        messages.push({
            id: nextId,
            name: username,
            text,
            time: now,
            ...(mentions.length ? { mentions } : {}),
            ...extra,
        });

        const kept = messages.slice(-MAX_MESSAGES);
        const dropped = messages.slice(0, messages.length - kept.length);
        const writes = { [`m:${key}`]: kept, [`n:${key}`]: nextId };
        for (const name of mentions) writes[`mn:${key}:${name.toLowerCase()}`] = nextId;
        await this.ctx.storage.put(writes);
        if (dropped.length) await this.purgeMessageAssets(dropped);

        if (target.isDm) {
            const [a, b] = key.slice(3).split("|");
            for (const [me, other] of [[a, b], [b, a]]) {
                const list = (await this.ctx.storage.get(`dmx:${me}`)) || [];
                if (!list.includes(other)) await this.ctx.storage.put(`dmx:${me}`, [...list, other]);
            }
        }
        return json({ ok: true, id: nextId });
    }

    async findMentions(text, author) {
        const found = [...new Set((text.match(/@[A-Za-z0-9_]{3,20}/g) || []).map((s) => s.slice(1).toLowerCase()))]
            .filter((n) => n !== author.toLowerCase())
            .slice(0, 10);
        if (!found.length) return [];
        const users = await this.ctx.storage.get(found.map((n) => `u:${n}`));
        return found.map((n) => users.get(`u:${n}`)?.username).filter(Boolean);
    }

    async react(request) {
        const username = await this.sessionUser(request);
        if (!username) return json({ error: "Log in to react." }, 401);
        const body = (await this.readBody(request)) || {};
        const target = await this.resolveTarget(username, body, false);
        if (target.error) return target.error;

        const emoji = String(body.emoji ?? "");
        if (!REACTIONS.includes(emoji) && !CUSTOM_REACTION_RE.test(emoji)) {
            return json({ error: "That reaction is not allowed." }, 400);
        }

        const messages = (await this.ctx.storage.get(`m:${target.key}`)) || [];
        const message = messages.find((m) => m.id === Number(body.id));
        if (!message) return json({ error: "Message not found." }, 404);

        const reactions = message.reactions || {};
        const users = has(reactions, emoji) ? reactions[emoji] : [];
        const at = users.indexOf(username);
        if (at >= 0) {
            users.splice(at, 1);
        } else {
            if (!has(reactions, emoji) && Object.keys(reactions).length >= MAX_REACTION_TYPES) {
                return json({ error: "Too many different reactions on this message." }, 400);
            }
            users.push(username);
        }
        if (users.length) reactions[emoji] = users;
        else delete reactions[emoji];
        if (Object.keys(reactions).length) message.reactions = reactions;
        else delete message.reactions;

        await this.ctx.storage.put(`m:${target.key}`, messages);
        await this.bumpVersion(target.key);
        return json({ ok: true });
    }

    async deleteMessage(request) {
        const username = await this.sessionUser(request);
        if (!username) return json({ error: "Log in first." }, 401);
        const body = (await this.readBody(request)) || {};
        const target = await this.resolveTarget(username, body, false);
        if (target.error) return target.error;

        const messages = (await this.ctx.storage.get(`m:${target.key}`)) || [];
        const message = messages.find((m) => m.id === Number(body.id));
        if (!message) return json({ error: "Message not found." }, 404);

        const own = message.name.toLowerCase() === username.toLowerCase();
        const moderator = !target.isDm && MODERATORS.includes(roleOf(username));
        if (!own && !moderator) return json({ error: "You can't delete that message." }, 403);

        await this.ctx.storage.put(`m:${target.key}`, messages.filter((m) => m !== message));
        await this.purgeMessageAssets([message]);
        await this.bumpVersion(target.key);
        return json({ ok: true });
    }

    // ---------- summary, search, embeds ----------

    async summary(request) {
        const username = await this.sessionUser(request);
        const ids = Object.keys(CHANNELS);
        const counts = await this.ctx.storage.get(ids.map((c) => `n:${c}`));
        const latest = Object.fromEntries(ids.map((c) => [c, counts.get(`n:${c}`) || 0]));

        let mentions = {};
        let dms = [];
        if (username) {
            const lower = username.toLowerCase();
            const found = await this.ctx.storage.get(ids.map((c) => `mn:${c}:${lower}`));
            mentions = Object.fromEntries(ids.map((c) => [c, found.get(`mn:${c}:${lower}`) || 0]));

            const partners = ((await this.ctx.storage.get(`dmx:${lower}`)) || []).slice(0, 50);
            if (partners.length) {
                const keys = partners.map((p) => dmKey(lower, p));
                const dmCounts = await this.ctx.storage.get(keys.map((k) => `n:${k}`));
                const users = await this.ctx.storage.get(partners.map((p) => `u:${p}`));
                dms = partners.map((p, i) => ({
                    user: users.get(`u:${p}`)?.username || p,
                    latest: dmCounts.get(`n:${keys[i]}`) || 0,
                }));
            }
        }
        return json({ latest, mentions, dms });
    }

    async searchUsers(request, searchParams) {
        if (!(await this.sessionUser(request))) return json({ users: [] }, 401);
        const q = String(searchParams.get("q") ?? "").toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 20);
        const list = await this.ctx.storage.list({ prefix: `u:${q}`, limit: 8 });
        return json({ users: [...list.values()].map((u) => u.username) });
    }

    /** Title/author for a YouTube link. Only a validated 11-character video id is ever fetched. */
    async youtubeEmbed(searchParams) {
        const id = String(searchParams.get("v") ?? "");
        if (!/^[A-Za-z0-9_-]{11}$/.test(id)) return json({ error: "Invalid video id." }, 400);

        const cached = this.embeds.get(id);
        if (cached && Date.now() - cached.time < EMBED_TTL_MS) return json(cached.data);

        const now = Date.now();
        this.embedHits = this.embedHits.filter((t) => now - t < 60000);
        if (this.embedHits.length >= EMBED_PER_MINUTE) return json({ error: "Try again shortly." }, 429);
        this.embedHits.push(now);

        try {
            const url = `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(
                `https://www.youtube.com/watch?v=${id}`,
            )}`;
            const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
            if (!res.ok) return json({ error: "Video not found." }, 404);
            const info = await res.json();
            const data = {
                id,
                title: String(info.title ?? "").slice(0, 200),
                author: String(info.author_name ?? "").slice(0, 100),
            };
            if (this.embeds.size > 200) this.embeds.clear();
            this.embeds.set(id, { time: now, data });
            return json(data);
        } catch {
            return json({ error: "Could not load video info." }, 502);
        }
    }
}

export default {
    async fetch(request, env) {
        const { pathname } = new URL(request.url);
        if (pathname.startsWith("/api/chat") || pathname.startsWith("/api/auth/")) {
            const room = env.CHAT.get(env.CHAT.idFromName("main"));
            return room.fetch(request);
        }
        return env.ASSETS.fetch(request);
    },
};
