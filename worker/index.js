import { DurableObject } from "cloudflare:workers";

const CHANNELS = ["general", "list-talk", "records", "level-requests", "minigames", "off-topic"];
const MAX_IMAGE_BYTES = 500 * 1024;
const MAX_MESSAGES = 100;
const MAX_TEXT = 300;
const COOLDOWN_MS = 2000;
const SESSION_MS = 30 * 24 * 60 * 60 * 1000;
const PBKDF2_ITERATIONS = 100000;
const MAX_FAILS = 5;
const FAIL_WINDOW_MS = 10 * 60 * 1000;

const json = (body, status = 200) =>
    new Response(JSON.stringify(body), {
        status,
        headers: { "content-type": "application/json", "cache-control": "no-store" },
    });

const toHex = (bytes) =>
    [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, "0")).join("");
const fromHex = (hex) =>
    new Uint8Array(hex.match(/../g).map((h) => parseInt(h, 16)));

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

export class ChatRoom extends DurableObject {
    constructor(ctx, env) {
        super(ctx, env);
        this.lastSent = new Map();
        this.fails = new Map();
    }

    async fetch(request) {
        const { pathname, searchParams } = new URL(request.url);

        if (pathname === "/api/chat") {
            if (request.method === "GET") return this.getMessages(searchParams);
            if (request.method === "POST") return this.postMessage(request);
        } else if (request.method === "GET" && pathname === "/api/chat/summary") {
            return this.summary(request);
        } else if (request.method === "GET" && pathname === "/api/chat/users") {
            return this.searchUsers(request, searchParams);
        } else if (request.method === "POST" && pathname === "/api/chat/image") {
            return this.postImage(request, searchParams);
        } else if (request.method === "GET" && pathname.startsWith("/api/chat/image/")) {
            return this.getImage(pathname.slice("/api/chat/image/".length));
        } else if (request.method === "POST" && pathname === "/api/auth/register") {
            return this.register(request);
        } else if (request.method === "POST" && pathname === "/api/auth/login") {
            return this.login(request);
        } else if (request.method === "POST" && pathname === "/api/auth/logout") {
            return this.logout(request);
        } else if (request.method === "GET" && pathname === "/api/auth/me") {
            const username = await this.sessionUser(request);
            return username ? json({ username }) : json({ error: "Not logged in." }, 401);
        }

        return json({ error: "Not found." }, 404);
    }

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

        if (!/^[A-Za-z0-9_]{3,20}$/.test(username)) {
            return json({ error: "Username must be 3-20 letters, numbers or underscores." }, 400);
        }
        if (password.length < 6 || password.length > 100) {
            return json({ error: "Password must be 6-100 characters." }, 400);
        }

        const key = `u:${username.toLowerCase()}`;
        if (await this.ctx.storage.get(key)) {
            return json({ error: "That username is taken." }, 409);
        }

        const salt = crypto.getRandomValues(new Uint8Array(16));
        await this.ctx.storage.put(key, {
            username,
            salt: toHex(salt),
            hash: await hashPassword(password, salt),
            created: Date.now(),
        });
        return json({ username, token: await this.createSession(username) });
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
        return json({ username: user.username, token: await this.createSession(user.username) });
    }

    async logout(request) {
        const header = request.headers.get("authorization") || "";
        const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
        if (token) await this.ctx.storage.delete(`s:${await sha256(token)}`);
        return json({ ok: true });
    }

    async getMessages(searchParams) {
        const channel = searchParams.get("channel") || "general";
        if (!CHANNELS.includes(channel)) return json({ error: "Unknown channel." }, 404);
        const after = Number(searchParams.get("after")) || 0;
        const messages = (await this.ctx.storage.get(`m:${channel}`)) || [];
        return json({ messages: messages.filter((m) => m.id > after) });
    }

    async postMessage(request) {
        const username = await this.sessionUser(request);
        if (!username) return json({ error: "Log in to send messages." }, 401);

        const body = await this.readBody(request);
        const channel = String(body?.channel ?? "general");
        if (!CHANNELS.includes(channel)) return json({ error: "Unknown channel." }, 404);
        const text = String(body?.text ?? "").trim().slice(0, MAX_TEXT);
        if (!text) return json({ error: "Message is empty." }, 400);

        return this.storeMessage(username, channel, text);
    }

    async postImage(request, searchParams) {
        const username = await this.sessionUser(request);
        if (!username) return json({ error: "Log in to send messages." }, 401);

        const channel = searchParams.get("channel") || "general";
        if (!CHANNELS.includes(channel)) return json({ error: "Unknown channel." }, 404);
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

        const now = Date.now();
        if (now - (this.lastSent.get(username) || 0) < COOLDOWN_MS) {
            return json({ error: "Slow down a little." }, 429);
        }

        const imageId = toHex(crypto.getRandomValues(new Uint8Array(12)));
        await this.ctx.storage.put(`img:${imageId}`, { type, bytes: bytes.buffer });
        return this.storeMessage(username, channel, text, {
            image: imageId,
            w: dim("w"),
            h: dim("h"),
        });
    }

    async getImage(id) {
        if (!/^[0-9a-f]{24}$/.test(id)) return json({ error: "Not found." }, 404);
        const image = await this.ctx.storage.get(`img:${id}`);
        if (!image) return json({ error: "Not found." }, 404);
        return new Response(image.bytes, {
            headers: {
                "content-type": image.type,
                "cache-control": "public, max-age=31536000, immutable",
                "x-content-type-options": "nosniff",
                "content-security-policy": "default-src 'none'; sandbox",
            },
        });
    }

    async storeMessage(username, channel, text, extra = {}) {
        const now = Date.now();
        if (now - (this.lastSent.get(username) || 0) < COOLDOWN_MS) {
            return json({ error: "Slow down a little." }, 429);
        }
        this.lastSent.set(username, now);
        if (this.lastSent.size > 500) this.lastSent.clear();

        const mentions = await this.findMentions(text, username);
        const messages = (await this.ctx.storage.get(`m:${channel}`)) || [];
        const nextId = ((await this.ctx.storage.get(`n:${channel}`)) || 0) + 1;
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
        const writes = { [`m:${channel}`]: kept, [`n:${channel}`]: nextId };
        for (const name of mentions) writes[`mn:${channel}:${name.toLowerCase()}`] = nextId;
        await this.ctx.storage.put(writes);

        const droppedImages = dropped.filter((m) => m.image).map((m) => `img:${m.image}`);
        if (droppedImages.length) await this.ctx.storage.delete(droppedImages);
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

    async summary(request) {
        const username = await this.sessionUser(request);
        const counts = await this.ctx.storage.get(CHANNELS.map((c) => `n:${c}`));
        const latest = Object.fromEntries(CHANNELS.map((c) => [c, counts.get(`n:${c}`) || 0]));
        let mentions = {};
        if (username) {
            const keys = CHANNELS.map((c) => `mn:${c}:${username.toLowerCase()}`);
            const found = await this.ctx.storage.get(keys);
            mentions = Object.fromEntries(
                CHANNELS.map((c) => [c, found.get(`mn:${c}:${username.toLowerCase()}`) || 0]),
            );
        }
        return json({ latest, mentions });
    }

    async searchUsers(request, searchParams) {
        if (!(await this.sessionUser(request))) return json({ users: [] }, 401);
        const q = String(searchParams.get("q") ?? "").toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 20);
        const list = await this.ctx.storage.list({ prefix: `u:${q}`, limit: 8 });
        return json({ users: [...list.values()].map((u) => u.username) });
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
