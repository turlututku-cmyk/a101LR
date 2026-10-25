import { store } from "../main.js";

const API = "/api/chat";
const AUTH = "/api/auth";
const TOKEN_KEY = "a101lr-chat-token";
const CHANNEL_KEY = "a101lr-chat-channel";
const SEEN_KEY = "a101lr-chat-seen";
const POLL_MS = 3000;
const GROUP_MS = 5 * 60 * 1000;
const MAX_IMAGE_BYTES = 480 * 1024;
const MAX_IMAGE_DIM = 1600;
const MENTION_RE = /@[A-Za-z0-9_]{3,20}/g;
const WEBP =
    typeof document !== "undefined" &&
    document.createElement("canvas").toDataURL("image/webp").startsWith("data:image/webp");

const formatSize = (bytes) => `${Math.max(1, Math.round(bytes / 1024))} KB`;

const CATEGORIES = [
    {
        name: "Text Channels",
        channels: [
            { id: "general", topic: "General chat about the a101 List Reborn." },
            { id: "off-topic", topic: "Anything that is not about the list." },
        ],
    },
    {
        name: "The List",
        channels: [
            { id: "list-talk", topic: "Discuss the rankings, tiers and placements." },
            { id: "records", topic: "Share your records and completions." },
            { id: "level-requests", topic: "Suggest levels to add to the list." },
        ],
    },
    {
        name: "Games",
        channels: [
            { id: "minigames", topic: "Scores and chat about the site minigames." },
        ],
    },
];
const CHANNELS = CATEGORIES.flatMap((c) => c.channels);

const load = (key) => {
    try {
        return localStorage.getItem(key) || "";
    } catch {
        return "";
    }
};
const save = (key, value) => {
    try {
        if (value) localStorage.setItem(key, value);
        else localStorage.removeItem(key);
    } catch {}
};
const loadSeen = () => {
    try {
        return JSON.parse(load(SEEN_KEY)) || {};
    } catch {
        return {};
    }
};

export default {
    template: `
        <main class="page-chat">
            <div class="dc">
                <aside class="dc-side">
                    <div class="dc-server">
                        <span>a101 List Reborn</span>
                        <span class="dc-chevron">&#9662;</span>
                    </div>
                    <nav class="dc-channels">
                        <div v-for="cat in categories" :key="cat.name" class="dc-category">
                            <p class="dc-cat"><span class="dc-arrow">&#9662;</span> {{ cat.name }}</p>
                            <button
                                v-for="ch in cat.channels"
                                :key="ch.id"
                                type="button"
                                class="dc-channel"
                                :class="{ active: ch.id === channel, unread: isUnread(ch.id) }"
                                @click="selectChannel(ch.id)"
                            >
                                <span class="dc-hash">#</span>
                                <span class="dc-channel-name">{{ ch.id }}</span>
                                <span v-if="isMentioned(ch.id)" class="dc-badge">@</span>
                                <span v-else-if="isUnread(ch.id)" class="dc-dot"></span>
                            </button>
                        </div>
                    </nav>
                    <div class="dc-user">
                        <template v-if="username">
                            <div class="dc-avatar dc-avatar-sm" :style="{ background: color(username) }">
                                {{ username[0].toUpperCase() }}<span class="dc-status"></span>
                            </div>
                            <div class="dc-user-info">
                                <div class="dc-user-name">{{ username }}</div>
                                <div class="dc-user-sub">Online</div>
                            </div>
                            <button class="dc-icon-btn" type="button" title="Log out" @click="logout">&#x23FB;</button>
                        </template>
                        <template v-else>
                            <div class="dc-avatar dc-avatar-sm dc-avatar-guest">?</div>
                            <div class="dc-user-info">
                                <div class="dc-user-name">Guest</div>
                                <div class="dc-user-sub">Not logged in</div>
                            </div>
                        </template>
                    </div>
                </aside>
                <section class="dc-main">
                    <header class="dc-header">
                        <span class="dc-hash">#</span>
                        <span class="dc-header-name">{{ channel }}</span>
                        <span class="dc-divider"></span>
                        <span class="dc-topic">{{ topic }}</span>
                    </header>
                    <div class="dc-mobile-channels">
                        <button
                            v-for="ch in allChannels"
                            :key="ch.id"
                            type="button"
                            :class="{ active: ch.id === channel }"
                            @click="selectChannel(ch.id)"
                        ># {{ ch.id }}</button>
                    </div>
                    <div class="dc-body">
                        <div class="dc-chat" @dragover.prevent="dragging = true" @dragleave="onDragLeave" @drop.prevent="onDrop">
                            <div v-if="dragging" class="dc-drop">Drop an image to share it</div>
                            <div class="dc-messages" ref="box">
                                <div class="dc-welcome">
                                    <div class="dc-welcome-icon">#</div>
                                    <div class="dc-welcome-title">Welcome to #{{ channel }}!</div>
                                    <div class="dc-welcome-text">This is the start of the #{{ channel }} channel.</div>
                                </div>
                                <p v-if="offline" class="dc-notice">Chat is offline right now. Retrying...</p>
                                <div v-for="m in grouped" :key="m.id" class="dc-msg" :class="{ cont: m.cont, mine: m.name === username, mentioned: mentionsMe(m) }">
                                    <div v-if="!m.cont" class="dc-avatar" :style="{ background: color(m.name) }">{{ m.name[0].toUpperCase() }}</div>
                                    <span v-else class="dc-msg-time">{{ time(m.time) }}</span>
                                    <div class="dc-msg-body">
                                        <div v-if="!m.cont" class="dc-msg-head">
                                            <span class="dc-msg-name" :style="{ color: color(m.name) }">{{ m.name }}</span>
                                            <span class="dc-msg-stamp">{{ stamp(m.time) }}</span>
                                        </div>
                                        <div v-if="m.text" class="dc-msg-text"><template v-for="(p, i) in parts(m)" :key="i"><span v-if="p.mention" class="dc-mention" :class="{ me: p.me }" @click="insertMention(p.text)">{{ p.text }}</span><template v-else>{{ p.text }}</template></template></div>
                                        <img v-if="m.image" class="dc-msg-img" :src="imageUrl(m.image)" :style="imageStyle(m)" loading="lazy" alt="shared image" @load="onImageLoad" @click="viewer = imageUrl(m.image)">
                                    </div>
                                </div>
                            </div>
                            <button v-if="!atBottom" type="button" class="dc-jump" @click="scrollDown(true)">Jump to latest &#8595;</button>
                            <p v-if="error" class="dc-error">{{ error }}</p>
                            <div v-if="username && pending" class="dc-pending">
                                <img :src="pending.url" alt="">
                                <div class="dc-pending-info">
                                    <span>{{ pending.name }}</span>
                                    <small>{{ pending.size }}</small>
                                </div>
                                <button type="button" class="dc-icon-btn" title="Remove image" @click="clearPending">&#x2715;</button>
                            </div>
                            <form v-if="username" class="dc-composer" @submit.prevent="send">
                                <ul v-if="suggest.length" class="dc-suggest">
                                    <li class="dc-suggest-head">Members</li>
                                    <li
                                        v-for="(name, i) in suggest"
                                        :key="name"
                                        :class="{ active: i === suggestIndex }"
                                        @mousedown.prevent="pickMention(name)"
                                    >
                                        <span class="dc-avatar dc-avatar-xs" :style="{ background: color(name) }">{{ name[0].toUpperCase() }}</span>
                                        {{ name }}
                                    </li>
                                </ul>
                                <button type="button" class="dc-attach" title="Share an image" @click="$refs.file.click()">+</button>
                                <input ref="file" type="file" accept="image/*" hidden @change="onFile">
                                <input
                                    ref="input"
                                    class="dc-text"
                                    type="text"
                                    v-model="text"
                                    maxlength="300"
                                    :placeholder="'Message #' + channel"
                                    autocomplete="off"
                                    @input="onInput"
                                    @click="onInput"
                                    @keydown="onKey"
                                    @blur="suggest = []"
                                    @paste="onPaste"
                                >
                                <span class="dc-count" :class="{ warn: text.length > 270 }" v-if="text.length > 0">{{ 300 - text.length }}</span>
                            </form>
                            <form v-else class="dc-login" @submit.prevent="authenticate">
                                <h3>{{ registering ? 'Create an account' : 'Welcome back!' }}</h3>
                                <p>{{ registering ? 'Pick a username to start chatting.' : 'Log in to send messages.' }}</p>
                                <label>USERNAME
                                    <input type="text" v-model="form.username" maxlength="20" autocomplete="username">
                                </label>
                                <label>PASSWORD
                                    <input type="password" v-model="form.password" maxlength="100" :autocomplete="registering ? 'new-password' : 'current-password'">
                                </label>
                                <button class="dc-btn" type="submit" :disabled="busy || !form.username.trim() || !form.password">{{ registering ? 'Continue' : 'Log In' }}</button>
                                <p class="dc-switch">
                                    {{ registering ? 'Already have an account?' : 'Need an account?' }}
                                    <a href="#" @click.prevent="registering = !registering; error = ''">{{ registering ? 'Log In' : 'Register' }}</a>
                                </p>
                            </form>
                        </div>
                        <aside class="dc-members">
                            <p class="dc-cat">RECENT CHATTERS &mdash; {{ members.length }}</p>
                            <div v-for="name in members" :key="name" class="dc-member">
                                <div class="dc-avatar dc-avatar-sm" :style="{ background: color(name) }">{{ name[0].toUpperCase() }}</div>
                                <span class="dc-member-name" :style="{ color: color(name) }">{{ name }}</span>
                            </div>
                            <p v-if="!members.length" class="dc-members-empty">Nobody yet.</p>
                        </aside>
                    </div>
                </section>
            </div>
            <div v-if="viewer" class="dc-viewer" @click="viewer = ''">
                <img :src="viewer" alt="shared image">
            </div>
        </main>
    `,
    data() {
        const saved = load(CHANNEL_KEY);
        return {
            categories: CATEGORIES,
            channel: CHANNELS.some((c) => c.id === saved) ? saved : "general",
            messages: [],
            latest: {},
            mentionLatest: {},
            seen: loadSeen(),
            pending: null,
            viewer: "",
            dragging: false,
            suggest: [],
            suggestIndex: 0,
            suggestToken: null,
            token: load(TOKEN_KEY),
            username: "",
            form: { username: "", password: "" },
            registering: false,
            text: "",
            error: "",
            offline: false,
            sending: false,
            busy: false,
            atBottom: true,
            timer: null,
            store,
        };
    },
    computed: {
        allChannels: () => CHANNELS,
        topic() {
            return CHANNELS.find((c) => c.id === this.channel)?.topic || "";
        },
        grouped() {
            return this.messages.map((m, i) => {
                const prev = this.messages[i - 1];
                const cont = !!prev && prev.name === m.name && m.time - prev.time < GROUP_MS;
                return { ...m, cont };
            });
        },
        members() {
            const names = [];
            for (let i = this.messages.length - 1; i >= 0; i--) {
                if (!names.includes(this.messages[i].name)) names.push(this.messages[i].name);
            }
            return names;
        },
    },
    async mounted() {
        if (this.token) await this.restoreSession();
        await this.poll();
        this.timer = setInterval(this.poll, POLL_MS);
        this.$refs.box.addEventListener("scroll", this.onScroll);
    },
    unmounted() {
        clearInterval(this.timer);
        clearTimeout(this.suggestTimer);
        this.clearPending();
    },
    methods: {
        color(name) {
            let h = 0;
            for (const c of name) h = (h * 31 + c.charCodeAt(0)) % 360;
            return `hsl(${h}, 60%, 65%)`;
        },
        time(ms) {
            return new Date(ms).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        },
        stamp(ms) {
            const today = new Date(ms).toDateString() === new Date().toDateString();
            return `${today ? "Today" : new Date(ms).toLocaleDateString()} at ${this.time(ms)}`;
        },
        isUnread(id) {
            return id !== this.channel && (this.latest[id] || 0) > (this.seen[id] || 0);
        },
        isMentioned(id) {
            return id !== this.channel && (this.mentionLatest[id] || 0) > (this.seen[id] || 0);
        },
        mentionsMe(m) {
            return (
                !!this.username &&
                m.name !== this.username &&
                (m.mentions || []).some((n) => n.toLowerCase() === this.username.toLowerCase())
            );
        },
        parts(m) {
            const known = new Set((m.mentions || []).map((n) => n.toLowerCase()));
            const out = [];
            let last = 0;
            for (const match of m.text.matchAll(MENTION_RE)) {
                const name = match[0].slice(1).toLowerCase();
                if (!known.has(name)) continue;
                if (match.index > last) out.push({ text: m.text.slice(last, match.index) });
                out.push({
                    text: match[0],
                    mention: true,
                    me: !!this.username && name === this.username.toLowerCase(),
                });
                last = match.index + match[0].length;
            }
            if (last < m.text.length) out.push({ text: m.text.slice(last) });
            return out;
        },
        imageUrl: (id) => `${API}/image/${id}`,
        imageStyle(m) {
            return m.w && m.h ? { aspectRatio: `${m.w} / ${m.h}`, width: `${Math.min(m.w, 400)}px` } : {};
        },
        onImageLoad() {
            if (this.atBottom) this.scrollDown();
        },

        // mentions autocomplete
        onInput() {
            const input = this.$refs.input;
            if (!input) return;
            const before = this.text.slice(0, input.selectionStart ?? this.text.length);
            const match = before.match(/(^|\s)@([A-Za-z0-9_]{0,20})$/);
            if (!match) {
                this.suggest = [];
                this.suggestToken = null;
                return;
            }
            const query = match[2];
            this.suggestToken = { start: before.length - query.length - 1, end: before.length };
            const lower = query.toLowerCase();
            const local = this.members.filter(
                (n) => n !== this.username && n.toLowerCase().startsWith(lower),
            );
            this.suggest = local.slice(0, 6);
            this.suggestIndex = 0;
            clearTimeout(this.suggestTimer);
            this.suggestTimer = setTimeout(async () => {
                try {
                    const res = await fetch(`${API}/users?q=${encodeURIComponent(query)}`, {
                        headers: this.headers(),
                    });
                    if (!res.ok || !this.suggestToken) return;
                    const { users } = await res.json();
                    const merged = [...local];
                    for (const u of users) {
                        if (u !== this.username && !merged.includes(u)) merged.push(u);
                    }
                    this.suggest = merged.slice(0, 6);
                } catch {}
            }, 150);
        },
        onKey(e) {
            if (!this.suggest.length) return;
            if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                e.preventDefault();
                const step = e.key === "ArrowDown" ? 1 : -1;
                this.suggestIndex = (this.suggestIndex + step + this.suggest.length) % this.suggest.length;
            } else if (e.key === "Enter" || e.key === "Tab") {
                e.preventDefault();
                this.pickMention(this.suggest[this.suggestIndex]);
            } else if (e.key === "Escape") {
                this.suggest = [];
            }
        },
        pickMention(name) {
            const token = this.suggestToken;
            if (!token) return;
            this.text = `${this.text.slice(0, token.start)}@${name} ${this.text.slice(token.end)}`.slice(0, 300);
            this.suggest = [];
            this.suggestToken = null;
            this.$nextTick(() => {
                const input = this.$refs.input;
                const pos = token.start + name.length + 2;
                input?.focus();
                input?.setSelectionRange(pos, pos);
            });
        },
        insertMention(tag) {
            if (!this.username) return;
            this.text = `${this.text}${this.text && !this.text.endsWith(" ") ? " " : ""}${tag} `.slice(0, 300);
            this.$nextTick(() => this.$refs.input?.focus());
        },

        // image sharing
        async prepareImage(file) {
            if (!file.type.startsWith("image/")) throw new Error("That file is not an image.");
            let bitmap;
            try {
                bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
            } catch {
                throw new Error("Could not read that image.");
            }
            const mime = WEBP ? "image/webp" : "image/jpeg";
            let scale = Math.min(1, MAX_IMAGE_DIM / Math.max(bitmap.width, bitmap.height));
            for (let attempt = 0; attempt < 6; attempt++) {
                const w = Math.max(1, Math.round(bitmap.width * scale));
                const h = Math.max(1, Math.round(bitmap.height * scale));
                const canvas = document.createElement("canvas");
                canvas.width = w;
                canvas.height = h;
                const ctx = canvas.getContext("2d");
                if (!WEBP) {
                    ctx.fillStyle = "#fff";
                    ctx.fillRect(0, 0, w, h);
                }
                ctx.drawImage(bitmap, 0, 0, w, h);
                for (const quality of [0.85, 0.7, 0.55, 0.4]) {
                    const blob = await new Promise((r) => canvas.toBlob(r, mime, quality));
                    if (blob && blob.size <= MAX_IMAGE_BYTES) {
                        return { blob, w, h, url: URL.createObjectURL(blob), name: file.name || "image", size: formatSize(blob.size) };
                    }
                }
                scale *= 0.75;
            }
            throw new Error("That image is too large to share.");
        },
        async attach(file) {
            this.error = "";
            try {
                const prepared = await this.prepareImage(file);
                this.clearPending();
                this.pending = prepared;
                this.$nextTick(() => this.$refs.input?.focus());
            } catch (e) {
                this.error = e.message;
            }
        },
        clearPending() {
            if (this.pending) URL.revokeObjectURL(this.pending.url);
            this.pending = null;
        },
        onFile(e) {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) this.attach(file);
        },
        onPaste(e) {
            const item = [...(e.clipboardData?.items || [])].find((i) => i.type.startsWith("image/"));
            const file = item?.getAsFile();
            if (file) {
                e.preventDefault();
                this.attach(file);
            }
        },
        onDragLeave(e) {
            if (!e.currentTarget.contains(e.relatedTarget)) this.dragging = false;
        },
        onDrop(e) {
            this.dragging = false;
            if (!this.username) return;
            const file = [...(e.dataTransfer?.files || [])].find((f) => f.type.startsWith("image/"));
            if (file) this.attach(file);
        },
        markSeen() {
            const last = this.messages.length ? this.messages[this.messages.length - 1].id : 0;
            if (last > (this.seen[this.channel] || 0)) {
                this.seen = { ...this.seen, [this.channel]: last };
                save(SEEN_KEY, JSON.stringify(this.seen));
            }
        },
        async selectChannel(id) {
            if (id === this.channel) return;
            this.channel = id;
            save(CHANNEL_KEY, id);
            this.messages = [];
            this.error = "";
            this.text = "";
            this.atBottom = true;
            await this.poll();
        },
        onScroll() {
            const box = this.$refs.box;
            this.atBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 40;
        },
        headers() {
            return {
                "content-type": "application/json",
                ...(this.token ? { authorization: `Bearer ${this.token}` } : {}),
            };
        },
        async restoreSession() {
            try {
                const res = await fetch(`${AUTH}/me`, { headers: this.headers() });
                if (res.ok) {
                    this.username = (await res.json()).username;
                } else if (res.status === 401) {
                    this.token = "";
                    save(TOKEN_KEY, "");
                }
            } catch {}
        },
        async authenticate() {
            this.error = "";
            this.busy = true;
            try {
                const res = await fetch(
                    `${AUTH}/${this.registering ? "register" : "login"}`,
                    {
                        method: "POST",
                        headers: { "content-type": "application/json" },
                        body: JSON.stringify(this.form),
                    },
                );
                const data = await res.json().catch(() => ({}));
                if (!res.ok) {
                    this.error = data.error || "Could not log in.";
                } else {
                    this.token = data.token;
                    this.username = data.username;
                    this.form = { username: "", password: "" };
                    save(TOKEN_KEY, data.token);
                }
            } catch {
                this.error = "Could not reach the chat.";
            }
            this.busy = false;
        },
        async logout() {
            try {
                await fetch(`${AUTH}/logout`, { method: "POST", headers: this.headers() });
            } catch {}
            this.token = "";
            this.username = "";
            save(TOKEN_KEY, "");
        },
        async poll() {
            const channel = this.channel;
            const last = this.messages.length ? this.messages[this.messages.length - 1].id : 0;
            try {
                const [res, summary] = await Promise.all([
                    fetch(`${API}?channel=${channel}&after=${last}`, { cache: "no-store" }),
                    fetch(`${API}/summary`, { cache: "no-store", headers: this.headers() }).catch(() => null),
                ]);
                if (!res.ok) throw new Error(res.status);
                const { messages } = await res.json();
                if (summary?.ok) {
                    const data = await summary.json();
                    this.latest = data.latest || {};
                    this.mentionLatest = data.mentions || {};
                }
                this.offline = false;
                if (channel !== this.channel) return;
                const known = new Set(this.messages.map((m) => m.id));
                const fresh = messages.filter((m) => !known.has(m.id));
                if (fresh.length) {
                    const stick = this.atBottom;
                    this.messages.push(...fresh);
                    this.messages = this.messages.slice(-100);
                    if (stick) this.scrollDown();
                }
                this.markSeen();
            } catch {
                this.offline = true;
            }
        },
        async send() {
            if (this.sending || (!this.text.trim() && !this.pending)) return;
            this.error = "";
            this.sending = true;
            try {
                let res;
                if (this.pending) {
                    const { blob, w, h } = this.pending;
                    const query = new URLSearchParams({
                        channel: this.channel,
                        text: this.text.trim(),
                        w,
                        h,
                    });
                    res = await fetch(`${API}/image?${query}`, {
                        method: "POST",
                        headers: this.token ? { authorization: `Bearer ${this.token}` } : {},
                        body: blob,
                    });
                } else {
                    res = await fetch(API, {
                        method: "POST",
                        headers: this.headers(),
                        body: JSON.stringify({ channel: this.channel, text: this.text }),
                    });
                }
                const data = await res.json().catch(() => ({}));
                if (res.status === 401) {
                    this.token = "";
                    this.username = "";
                    save(TOKEN_KEY, "");
                    this.error = data.error || "Please log in again.";
                } else if (!res.ok) {
                    this.error = data.error || "Could not send message.";
                } else {
                    this.text = "";
                    this.clearPending();
                    this.atBottom = true;
                    await this.poll();
                }
            } catch {
                this.error = "Could not reach the chat.";
            }
            this.sending = false;
        },
        scrollDown() {
            this.$nextTick(() => {
                const box = this.$refs.box;
                if (box) box.scrollTop = box.scrollHeight;
            });
        },
    },
};
