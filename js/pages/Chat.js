import { store } from "../main.js";

const API = "/api/chat";
const AUTH = "/api/auth";
const TOKEN_KEY = "a101lr-chat-token";
const CHANNEL_KEY = "a101lr-chat-channel";
const SEEN_KEY = "a101lr-chat-seen";
const MUTE_KEY = "a101lr-chat-muted";
const POLL_MS = 3000;
const GROUP_MS = 5 * 60 * 1000;
const MAX_IMAGE_BYTES = 480 * 1024;
const MAX_IMAGE_DIM = 1600;
const MAX_VIDEO_BYTES = 25 * 1024 * 1024;
const VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];
const TOKEN_RE = /https?:\/\/[^\s<>"']+|@[A-Za-z0-9_]{3,20}|:[A-Za-z0-9_]{2,32}:/g;
const REACTIONS = ["\u{1F44D}", "❤️", "\u{1F602}", "\u{1F62E}", "\u{1F622}", "\u{1F525}", "\u{1F389}"];
const ROLE_LABEL = { a101: "A101", admin: "Admin", member: "Member" };
const ROLE_ORDER = ["a101", "admin", "member"];
const WEBP =
    typeof document !== "undefined" &&
    document.createElement("canvas").toDataURL("image/webp").startsWith("data:image/webp");

const CATEGORIES = [
    {
        name: "Important",
        channels: [
            { id: "announcements", icon: "\u{1F4E2}", post: ["a101"], topic: "Official news and updates from a101." },
        ],
    },
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
        channels: [{ id: "minigames", topic: "Scores and chat about the site minigames." }],
    },
];
const CHANNELS = CATEGORIES.flatMap((c) => c.channels);

const formatSize = (bytes) => `${Math.max(1, Math.round(bytes / 1024))} KB`;

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

const hue = (name) => {
    let h = 0;
    for (const c of name) h = (h * 31 + c.charCodeAt(0)) % 360;
    return h;
};

let audio = null;
const playPing = () => {
    try {
        audio = audio || new (window.AudioContext || window.webkitAudioContext)();
        if (audio.state === "suspended") audio.resume();
        const t = audio.currentTime;
        [[880, 0], [1318.5, 0.12]].forEach(([freq, delay]) => {
            const osc = audio.createOscillator();
            const gain = audio.createGain();
            osc.type = "sine";
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0.0001, t + delay);
            gain.gain.exponentialRampToValueAtTime(0.25, t + delay + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.0001, t + delay + 0.3);
            osc.connect(gain).connect(audio.destination);
            osc.start(t + delay);
            osc.stop(t + delay + 0.32);
        });
    } catch {}
};

const YT_HOSTS = ["youtube.com", "www.youtube.com", "m.youtube.com", "music.youtube.com", "youtu.be", "www.youtube-nocookie.com"];
const youtubeId = (link) => {
    try {
        const url = new URL(link);
        if (!YT_HOSTS.includes(url.hostname)) return "";
        let id = "";
        if (url.hostname === "youtu.be") id = url.pathname.slice(1).split("/")[0];
        else if (url.pathname === "/watch") id = url.searchParams.get("v") || "";
        else {
            const m = url.pathname.match(/^\/(?:shorts|embed|live|v)\/([^/]+)/);
            id = m ? m[1] : "";
        }
        return /^[A-Za-z0-9_-]{11}$/.test(id) ? id : "";
    } catch {
        return "";
    }
};

const Avatar = {
    props: { name: { type: String, default: "?" }, src: { type: String, default: "" } },
    data: () => ({ failed: false }),
    watch: {
        src() {
            this.failed = false;
        },
    },
    computed: {
        style() {
            return this.src && !this.failed ? {} : { background: `hsl(${hue(this.name)}, 60%, 65%)` };
        },
    },
    template: `
        <div class="dc-avatar" :style="style">
            <img v-if="src && !failed" :src="src" alt="" @error="failed = true">
            <template v-else>{{ (name[0] || '?').toUpperCase() }}</template>
            <slot></slot>
        </div>
    `,
};

export default {
    components: { Avatar },
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
                                :class="{ active: !dm && ch.id === channel, unread: isUnread(ch.id) }"
                                @click="selectChannel(ch.id)"
                            >
                                <span class="dc-hash">{{ ch.icon || '#' }}</span>
                                <span class="dc-channel-name">{{ ch.id }}</span>
                                <span v-if="ch.post && !canPostIn(ch)" class="dc-lock" title="Read only">&#128274;</span>
                                <span v-if="isMentioned(ch.id)" class="dc-badge">@</span>
                                <span v-else-if="isUnread(ch.id)" class="dc-dot"></span>
                            </button>
                        </div>
                        <div v-if="username" class="dc-category">
                            <p class="dc-cat dc-cat-row">
                                <span><span class="dc-arrow">&#9662;</span> Direct Messages</span>
                                <button type="button" class="dc-plus" title="New message" @click="openNewDm">+</button>
                            </p>
                            <button
                                v-for="d in dmList"
                                :key="d.user"
                                type="button"
                                class="dc-channel dc-dm"
                                :class="{ active: dm.toLowerCase() === d.user.toLowerCase(), unread: isDmUnread(d) }"
                                @click="openDm(d.user)"
                            >
                                <Avatar class="dc-avatar-xs" :name="d.user" :src="avatarSrc(d.user)"></Avatar>
                                <span class="dc-channel-name">{{ d.user }}</span>
                                <span v-if="isDmUnread(d)" class="dc-dot"></span>
                            </button>
                            <p v-if="!dmList.length" class="dc-dm-empty">No conversations yet.</p>
                        </div>
                    </nav>
                    <div class="dc-user">
                        <template v-if="username">
                            <button type="button" class="dc-user-btn" title="Your profile" @click="openProfile(username)">
                                <Avatar class="dc-avatar-sm" :name="username" :src="avatarSrc(username)"><span class="dc-status"></span></Avatar>
                                <div class="dc-user-info">
                                    <div class="dc-user-name">{{ username }}</div>
                                    <div class="dc-user-sub">{{ roleLabel(role) }}</div>
                                </div>
                            </button>
                            <button class="dc-icon-btn" type="button" :title="muted ? 'Unmute ping sound' : 'Mute ping sound'" @click="toggleMute">{{ muted ? '&#x1F515;' : '&#x1F514;' }}</button>
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
                        <template v-if="dm">
                            <Avatar class="dc-avatar-xs" :name="dm" :src="avatarSrc(dm)"></Avatar>
                            <span class="dc-header-name">{{ dm }}</span>
                            <span class="dc-divider"></span>
                            <span class="dc-topic">Direct message</span>
                        </template>
                        <template v-else>
                            <span class="dc-hash">{{ current.icon || '#' }}</span>
                            <span class="dc-header-name">{{ channel }}</span>
                            <span class="dc-divider"></span>
                            <span class="dc-topic">{{ topic }}</span>
                        </template>
                    </header>
                    <div class="dc-mobile-channels">
                        <button
                            v-for="ch in allChannels"
                            :key="ch.id"
                            type="button"
                            :class="{ active: !dm && ch.id === channel }"
                            @click="selectChannel(ch.id)"
                        >{{ ch.icon || '#' }} {{ ch.id }}</button>
                        <button v-for="d in dmList" :key="d.user" type="button" :class="{ active: dm.toLowerCase() === d.user.toLowerCase() }" @click="openDm(d.user)">@ {{ d.user }}</button>
                    </div>
                    <div class="dc-body">
                        <div class="dc-chat" @dragover.prevent="dragging = true" @dragleave="onDragLeave" @drop.prevent="onDrop">
                            <div v-if="dragging" class="dc-drop">Drop an image or video to share it</div>
                            <div class="dc-messages" ref="box">
                                <div class="dc-welcome">
                                    <template v-if="dm">
                                        <Avatar class="dc-avatar-xl" :name="dm" :src="avatarSrc(dm)"></Avatar>
                                        <div class="dc-welcome-title">{{ dm }}</div>
                                        <div class="dc-welcome-text">This is the beginning of your direct message history with <b>{{ dm }}</b>.</div>
                                    </template>
                                    <template v-else>
                                        <div class="dc-welcome-icon">{{ current.icon || '#' }}</div>
                                        <div class="dc-welcome-title">Welcome to #{{ channel }}!</div>
                                        <div class="dc-welcome-text">This is the start of the #{{ channel }} channel.</div>
                                    </template>
                                </div>
                                <p v-if="offline" class="dc-notice">Chat is offline right now. Retrying...</p>
                                <div v-for="m in grouped" :key="m.id" class="dc-msg" :class="{ cont: m.cont, mine: m.name === username, mentioned: mentionsMe(m) }">
                                    <div class="dc-msg-tools" v-if="username">
                                        <button type="button" title="Add reaction" @click.stop="reactFor = reactFor === m.id ? 0 : m.id">&#x263A;</button>
                                        <button v-if="canDelete(m)" type="button" title="Delete message" class="danger" @click.stop="removeMessage(m)">&#x1F5D1;</button>
                                        <div v-if="reactFor === m.id" class="dc-react-pop" @click.stop>
                                            <button v-for="r in reactionPalette" :key="r" type="button" @click="react(m, r)"><span v-if="r.startsWith(':')"><img class="dc-emoji" :src="emojiMap[r.slice(1, -1)]" :alt="r"></span><span v-else>{{ r }}</span></button>
                                        </div>
                                    </div>
                                    <button v-if="!m.cont" type="button" class="dc-avatar-btn" @click="openProfile(m.name)">
                                        <Avatar :name="m.name" :src="avatarSrc(m.name)"></Avatar>
                                    </button>
                                    <span v-else class="dc-msg-time">{{ time(m.time) }}</span>
                                    <div class="dc-msg-body">
                                        <div v-if="!m.cont" class="dc-msg-head">
                                            <button type="button" class="dc-msg-name" :style="nameStyle(m.name)" @click="openProfile(m.name)">{{ m.name }}</button>
                                            <span v-if="roleOfName(m.name) !== 'member'" class="dc-role" :class="roleOfName(m.name)">{{ roleLabel(roleOfName(m.name)) }}</span>
                                            <span class="dc-msg-stamp">{{ stamp(m.time) }}</span>
                                        </div>
                                        <div v-if="m.text" class="dc-msg-text"><template v-for="(p, i) in parts(m)" :key="i"><a v-if="p.link" class="dc-link" :href="p.link" target="_blank" rel="noopener noreferrer">{{ p.text }}</a><span v-else-if="p.mention" class="dc-mention" :class="{ me: p.me }" @click="insertMention(p.text)">{{ p.text }}</span><img v-else-if="p.emoji" class="dc-emoji" :class="{ jumbo: p.jumbo }" :src="p.emoji" :alt="p.text" :title="p.text"><template v-else>{{ p.text }}</template></template></div>
                                        <div v-if="embedFor(m)" class="dc-embed">
                                            <div class="dc-embed-body">
                                                <div class="dc-embed-provider">YouTube</div>
                                                <div class="dc-embed-author">{{ embedFor(m).author }}</div>
                                                <a class="dc-embed-title" :href="embedFor(m).url" target="_blank" rel="noopener noreferrer">{{ embedFor(m).title }}</a>
                                                <div class="dc-embed-media">
                                                    <iframe v-if="playing[embedFor(m).id]" :src="embedFor(m).src" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>
                                                    <button v-else type="button" class="dc-embed-thumb" title="Play" @click="playing[embedFor(m).id] = true">
                                                        <img :src="embedFor(m).thumb" alt="" @load="onImageLoad">
                                                        <span class="dc-embed-play"></span>
                                                    </button>
                                                </div>
                                            </div>
                                            <button type="button" class="dc-embed-close" title="Remove embed" @click="dismissed[embedFor(m).key] = true">&#x2715;</button>
                                        </div>
                                        <img v-if="m.image" class="dc-msg-img" :src="imageUrl(m.image)" :style="imageStyle(m)" loading="lazy" alt="shared image" @load="onImageLoad" @click="viewer = imageUrl(m.image)">
                                        <template v-if="m.gif">
                                            <video v-if="m.gif.endsWith('.mp4')" class="dc-msg-gif" :src="gifUrl(m.gif)" autoplay loop muted playsinline @loadeddata="onImageLoad"></video>
                                            <img v-else class="dc-msg-gif" :src="gifUrl(m.gif)" alt="GIF" @load="onImageLoad" @click="viewer = gifUrl(m.gif)">
                                        </template>
                                        <template v-if="m.video">
                                            <p v-if="brokenVideos[m.video]" class="dc-video-gone">This video is no longer available.</p>
                                            <video v-else class="dc-msg-video" :src="videoUrl(m.video)" controls preload="metadata" playsinline @loadedmetadata="onImageLoad" @error="brokenVideos[m.video] = true"></video>
                                        </template>
                                        <div v-if="reactionList(m).length" class="dc-reactions">
                                            <button v-for="r in reactionList(m)" :key="r.key" type="button" class="dc-reaction" :class="{ mine: r.mine }" :disabled="!username" :title="r.users.join(', ')" @click="react(m, r.key)">
                                                <img v-if="r.image" class="dc-emoji" :src="r.image" :alt="r.key">
                                                <span v-else>{{ r.key }}</span>
                                                <b>{{ r.users.length }}</b>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <button v-if="!atBottom" type="button" class="dc-jump" @click="scrollDown(true)">Jump to latest &#8595;</button>
                            <p v-if="error" class="dc-error">{{ error }}</p>
                            <div v-if="username && pending" class="dc-pending">
                                <video v-if="pending.kind === 'video'" :src="pending.url" muted preload="metadata"></video>
                                <img v-else :src="pending.url" alt="">
                                <div class="dc-pending-info">
                                    <span>{{ pending.name }}</span>
                                    <small v-if="sending && uploadPct !== null">Uploading {{ uploadPct }}%</small>
                                    <small v-else>{{ pending.size }}</small>
                                    <div v-if="sending && uploadPct !== null" class="dc-progress"><div :style="{ width: uploadPct + '%' }"></div></div>
                                </div>
                                <button type="button" class="dc-icon-btn" :disabled="sending" title="Remove attachment" @click="clearPending">&#x2715;</button>
                            </div>
                            <div v-if="username && picker && canPost" class="dc-picker">
                                <div class="dc-picker-tabs">
                                    <button type="button" :class="{ active: picker === 'gif' }" @click="picker = 'gif'; pickerSearch = ''">GIFs</button>
                                    <button type="button" :class="{ active: picker === 'emoji' }" @click="picker = 'emoji'; pickerSearch = ''">Emoji</button>
                                    <input type="text" v-model="pickerSearch" :placeholder="picker === 'gif' ? 'Search GIFs' : 'Search emoji'">
                                    <button type="button" class="dc-icon-btn" @click="picker = ''">&#x2715;</button>
                                </div>
                                <div v-if="picker === 'gif'" class="dc-picker-grid gifs">
                                    <button v-for="g in filteredGifs" :key="g.file" type="button" class="dc-gif" :title="g.name" @click="sendGif(g)">
                                        <video v-if="g.file.endsWith('.mp4')" :src="gifUrl(g.file)" autoplay loop muted playsinline></video>
                                        <img v-else :src="gifUrl(g.file)" :alt="g.name" loading="lazy">
                                        <span>{{ g.name }}</span>
                                    </button>
                                    <p v-if="!filteredGifs.length" class="dc-picker-empty">No GIFs found.</p>
                                </div>
                                <div v-else class="dc-picker-grid emojis">
                                    <button v-for="e in filteredEmojis" :key="e.name" type="button" class="dc-emoji-btn" :title="':' + e.name + ':'" @click="insertEmoji(e)">
                                        <img :src="e.src" :alt="e.name">
                                    </button>
                                    <p v-if="!filteredEmojis.length" class="dc-picker-empty">No emoji found.</p>
                                </div>
                            </div>
                            <form v-if="username && canPost" class="dc-composer" @submit.prevent="send">
                                <ul v-if="suggest.length" class="dc-suggest">
                                    <li class="dc-suggest-head">{{ suggestKind === 'emoji' ? 'Emoji' : 'Members' }}</li>
                                    <li
                                        v-for="(item, i) in suggest"
                                        :key="item.name"
                                        :class="{ active: i === suggestIndex }"
                                        @mousedown.prevent="pickSuggest(item)"
                                    >
                                        <img v-if="item.src" class="dc-emoji" :src="item.src" alt="">
                                        <Avatar v-else class="dc-avatar-xs" :name="item.name" :src="avatarSrc(item.name)"></Avatar>
                                        {{ item.src ? ':' + item.name + ':' : item.name }}
                                    </li>
                                </ul>
                                <button type="button" class="dc-attach" title="Share an image or video" @click="$refs.file.click()">+</button>
                                <input ref="file" type="file" accept="image/*,video/mp4,video/webm,video/quicktime" hidden @change="onFile">
                                <input
                                    ref="input"
                                    class="dc-text"
                                    type="text"
                                    v-model="text"
                                    maxlength="300"
                                    :placeholder="dm ? 'Message @' + dm : 'Message #' + channel"
                                    autocomplete="off"
                                    @input="onInput"
                                    @click="onInput"
                                    @keydown="onKey"
                                    @blur="suggest = []"
                                    @paste="onPaste"
                                >
                                <span class="dc-count" :class="{ warn: text.length > 270 }" v-if="text.length > 0">{{ 300 - text.length }}</span>
                                <button type="button" class="dc-tool" :class="{ active: picker === 'gif' }" title="Pick a GIF" @click="togglePicker('gif')">GIF</button>
                                <button type="button" class="dc-tool" :class="{ active: picker === 'emoji' }" title="Custom emoji" @click="togglePicker('emoji')">&#x263A;</button>
                            </form>
                            <div v-else-if="username" class="dc-readonly">&#128274; You do not have permission to send messages in this channel.</div>
                            <form v-else class="dc-login" @submit.prevent="authenticate">
                                <h3>{{ registering ? 'Create an account' : 'Welcome back!' }}</h3>
                                <p>{{ registering ? 'Pick a username to start chatting.' : 'Log in to send messages.' }}</p>
                                <label>USERNAME
                                    <input type="text" v-model="form.username" maxlength="20" autocomplete="username">
                                </label>
                                <label>PASSWORD
                                    <input type="password" v-model="form.password" maxlength="100" :autocomplete="registering ? 'new-password' : 'current-password'">
                                </label>
                                <label v-if="registering && needClaim">CLAIM CODE <small>(this username is reserved)</small>
                                    <input type="text" v-model="form.claim" maxlength="40" autocomplete="off">
                                </label>
                                <button class="dc-btn" type="submit" :disabled="busy || !form.username.trim() || !form.password">{{ registering ? 'Continue' : 'Log In' }}</button>
                                <p class="dc-switch">
                                    {{ registering ? 'Already have an account?' : 'Need an account?' }}
                                    <a href="#" @click.prevent="registering = !registering; error = ''">{{ registering ? 'Log In' : 'Register' }}</a>
                                </p>
                            </form>
                        </div>
                        <aside class="dc-members">
                            <template v-for="group in memberGroups" :key="group.role">
                                <p class="dc-cat">{{ group.label }} &mdash; {{ group.names.length }}</p>
                                <button v-for="name in group.names" :key="name" type="button" class="dc-member" @click="openProfile(name)">
                                    <Avatar class="dc-avatar-sm" :name="name" :src="avatarSrc(name)"></Avatar>
                                    <span class="dc-member-name" :style="nameStyle(name)">{{ name }}</span>
                                </button>
                            </template>
                            <p v-if="!memberGroups.length" class="dc-members-empty">Nobody yet.</p>
                        </aside>
                    </div>
                </section>
            </div>

            <div v-if="viewer" class="dc-viewer" @click="viewer = ''">
                <img :src="viewer" alt="shared image">
            </div>

            <div v-if="card" class="dc-modal" @click.self="card = null">
                <div class="dc-card">
                    <div class="dc-card-banner" :style="{ background: 'hsl(' + hue(card.username) + ', 55%, 40%)' }"></div>
                    <Avatar class="dc-avatar-xl dc-card-avatar" :name="card.username" :src="avatarSrc(card.username)"></Avatar>
                    <div class="dc-card-body">
                        <div class="dc-card-name">{{ card.username }}</div>
                        <span v-if="card.role !== 'member'" class="dc-role" :class="card.role">{{ roleLabel(card.role) }}</span>
                        <span v-else class="dc-role member">Member</span>
                        <div class="dc-card-section">ABOUT ME</div>
                        <p class="dc-card-bio">{{ card.bio || 'This user has not written anything yet.' }}</p>
                        <div class="dc-card-section">MEMBER SINCE</div>
                        <p class="dc-card-bio">{{ formatDate(card.created) }}</p>
                        <div class="dc-card-actions">
                            <button v-if="username && card.username.toLowerCase() !== username.toLowerCase()" type="button" class="dc-btn" @click="messageUser(card.username)">Send Message</button>
                            <button v-if="username && card.username.toLowerCase() === username.toLowerCase()" type="button" class="dc-btn" @click="startEdit">Edit Profile</button>
                            <button type="button" class="dc-btn ghost" @click="card = null">Close</button>
                        </div>
                    </div>
                </div>
            </div>

            <div v-if="editing" class="dc-modal" @click.self="editing = false">
                <form class="dc-card dc-edit" @submit.prevent="saveProfile">
                    <h3>Edit Profile</h3>
                    <div class="dc-edit-row">
                        <Avatar class="dc-avatar-xl" :name="username" :src="draft.preview || (draft.remove ? '' : avatarSrc(username))"></Avatar>
                        <div class="dc-edit-actions">
                            <button type="button" class="dc-btn" @click="$refs.avatarFile.click()">Change picture</button>
                            <button type="button" class="dc-btn ghost" @click="draft.remove = true; draft.blob = null; draft.preview = ''">Remove</button>
                            <input ref="avatarFile" type="file" accept="image/*" hidden @change="onAvatarFile">
                        </div>
                    </div>
                    <label>ABOUT ME
                        <textarea v-model="draft.bio" maxlength="190" rows="4" placeholder="Tell people about yourself"></textarea>
                        <small>{{ 190 - draft.bio.length }} characters left</small>
                    </label>
                    <p v-if="error" class="dc-error">{{ error }}</p>
                    <div class="dc-card-actions">
                        <button type="submit" class="dc-btn" :disabled="busy">Save</button>
                        <button type="button" class="dc-btn ghost" @click="editing = false">Cancel</button>
                    </div>
                </form>
            </div>

            <div v-if="newDm" class="dc-modal" @click.self="newDm = false">
                <div class="dc-card dc-edit">
                    <h3>New Message</h3>
                    <input class="dc-dm-search" type="text" v-model="dmSearch" maxlength="20" placeholder="Search for a username" @input="searchDm" ref="dmInput">
                    <div class="dc-dm-results">
                        <button v-for="u in dmResults" :key="u" type="button" class="dc-member" @click="messageUser(u)">
                            <Avatar class="dc-avatar-sm" :name="u" :src="avatarSrc(u)"></Avatar>
                            <span class="dc-member-name">{{ u }}</span>
                        </button>
                        <p v-if="dmSearch && !dmResults.length" class="dc-members-empty">No users found.</p>
                    </div>
                    <div class="dc-card-actions"><button type="button" class="dc-btn ghost" @click="newDm = false">Close</button></div>
                </div>
            </div>
        </main>
    `,
    data() {
        const saved = load(CHANNEL_KEY);
        return {
            categories: CATEGORIES,
            channel: CHANNELS.some((c) => c.id === saved) ? saved : "general",
            dm: "",
            messages: [],
            version: 0,
            latest: {},
            mentionLatest: {},
            dms: [],
            dmLatest: {},
            muted: load(MUTE_KEY) === "1",
            primed: false,
            seen: loadSeen(),
            profiles: {},
            profileWanted: {},
            pollCount: 0,
            pending: null,
            viewer: "",
            dragging: false,
            suggest: [],
            suggestKind: "mention",
            suggestIndex: 0,
            suggestToken: null,
            gifs: [],
            emojis: [],
            picker: "",
            pickerSearch: "",
            brokenVideos: {},
            uploadPct: null,
            reactFor: 0,
            embedInfo: {},
            playing: {},
            dismissed: {},
            card: null,
            editing: false,
            draft: { bio: "", blob: null, preview: "", remove: false },
            newDm: false,
            dmSearch: "",
            dmResults: [],
            token: load(TOKEN_KEY),
            me: null,
            form: { username: "", password: "", claim: "" },
            needClaim: false,
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
        username() {
            return this.me?.username || "";
        },
        role() {
            return this.me?.role || "member";
        },
        current() {
            return CHANNELS.find((c) => c.id === this.channel) || {};
        },
        topic() {
            return this.current.topic || "";
        },
        canPost() {
            if (!this.username) return false;
            return this.dm ? true : this.canPostIn(this.current);
        },
        reactionPalette() {
            return [...REACTIONS, ...this.emojis.slice(0, 12).map((e) => `:${e.name}:`)];
        },
        emojiMap() {
            return Object.fromEntries(this.emojis.map((e) => [e.name, e.src]));
        },
        filteredGifs() {
            const q = this.pickerSearch.trim().toLowerCase();
            return this.gifs.filter((g) => !q || g.name.toLowerCase().includes(q));
        },
        filteredEmojis() {
            const q = this.pickerSearch.trim().toLowerCase();
            return this.emojis.filter((e) => !q || e.name.toLowerCase().includes(q));
        },
        dmList() {
            const list = this.dms.map((d) => ({ ...d }));
            if (this.dm && !list.some((d) => d.user.toLowerCase() === this.dm.toLowerCase())) {
                list.unshift({ user: this.dm, latest: 0 });
            }
            return list;
        },
        grouped() {
            return this.messages.map((m, i) => {
                const prev = this.messages[i - 1];
                const cont = !!prev && prev.name === m.name && m.time - prev.time < GROUP_MS && !m.reactions;
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
        memberGroups() {
            const names = this.dm ? [this.username, this.dm].filter(Boolean) : [...this.members];
            if (this.username && !this.dm && !names.includes(this.username)) names.push(this.username);
            const groups = ROLE_ORDER.map((role) => ({
                role,
                label: ROLE_LABEL[role].toUpperCase(),
                names: names.filter((n) => this.roleOfName(n) === role),
            }));
            return groups.filter((g) => g.names.length);
        },
        scope() {
            return this.dm ? `dm=${encodeURIComponent(this.dm)}` : `channel=${encodeURIComponent(this.channel)}`;
        },
        seenKey() {
            return this.dm ? `dm:${this.dm.toLowerCase()}` : this.channel;
        },
    },
    async mounted() {
        const manifest = (file) =>
            fetch(`/data/${file}.json`)
                .then((r) => (r.ok ? r.json() : []))
                .catch(() => []);
        manifest("_gifs").then((g) => (this.gifs = Array.isArray(g) ? g : []));
        manifest("_emojis").then((e) => (this.emojis = Array.isArray(e) ? e : []));
        if (this.token) await this.restoreSession();
        await this.poll();
        this.timer = setInterval(this.poll, POLL_MS);
        this.$refs.box.addEventListener("scroll", this.onScroll);
        document.addEventListener("click", this.closePops);
    },
    unmounted() {
        clearInterval(this.timer);
        clearTimeout(this.suggestTimer);
        document.removeEventListener("click", this.closePops);
        this.clearPending();
    },
    methods: {
        hue,
        formatDate: (ms) => (ms ? new Date(ms).toLocaleDateString() : "Unknown"),
        closePops() {
            this.reactFor = 0;
        },
        color(name) {
            return `hsl(${hue(name)}, 60%, 65%)`;
        },
        profileOf(name) {
            return this.profiles[String(name).toLowerCase()];
        },
        roleOfName(name) {
            return this.profileOf(name)?.role || "member";
        },
        roleLabel: (role) => ROLE_LABEL[role] || "Member",
        nameStyle(name) {
            const role = this.roleOfName(name);
            if (role === "a101") return { color: "#f0b232" };
            if (role === "admin") return { color: "#f23f42" };
            return { color: this.color(name) };
        },
        avatarSrc(name) {
            const p = this.profileOf(name);
            return p?.avatar ? `${API}/avatar/${String(name).toLowerCase()}?v=${p.avatar}` : "";
        },
        canPostIn(ch) {
            return !ch.post || (!!this.username && ch.post.includes(this.role));
        },
        time(ms) {
            return new Date(ms).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        },
        stamp(ms) {
            const today = new Date(ms).toDateString() === new Date().toDateString();
            return `${today ? "Today" : new Date(ms).toLocaleDateString()} at ${this.time(ms)}`;
        },
        isUnread(id) {
            return (this.dm || id !== this.channel) && (this.latest[id] || 0) > (this.seen[id] || 0);
        },
        isDmUnread(d) {
            const key = `dm:${d.user.toLowerCase()}`;
            const active = this.dm.toLowerCase() === d.user.toLowerCase();
            return !active && d.latest > (this.seen[key] || 0);
        },
        isMentioned(id) {
            return (this.dm || id !== this.channel) && (this.mentionLatest[id] || 0) > (this.seen[id] || 0);
        },
        toggleMute() {
            this.muted = !this.muted;
            save(MUTE_KEY, this.muted ? "1" : "");
            if (!this.muted) playPing();
        },
        ping() {
            if (!this.muted) playPing();
        },
        mentionsMe(m) {
            return (
                !!this.username &&
                m.name !== this.username &&
                (m.mentions || []).some((n) => n.toLowerCase() === this.username.toLowerCase())
            );
        },

        // ---------- message text ----------
        parts(m) {
            const known = new Set((m.mentions || []).map((n) => n.toLowerCase()));
            const out = [];
            let last = 0;
            for (const match of m.text.matchAll(TOKEN_RE)) {
                let token = match[0];
                let part;
                if (token.startsWith("http")) {
                    token = token.replace(/[.,!?;:)\]]+$/, "");
                    part = { text: token, link: token };
                } else if (token[0] === "@") {
                    const name = token.slice(1).toLowerCase();
                    if (!known.has(name)) continue;
                    part = {
                        text: token,
                        mention: true,
                        me: !!this.username && name === this.username.toLowerCase(),
                    };
                } else {
                    const src = this.emojiMap[token.slice(1, -1).toLowerCase()];
                    if (!src) continue;
                    part = { text: token, emoji: src };
                }
                if (match.index > last) out.push({ text: m.text.slice(last, match.index) });
                out.push(part);
                last = match.index + token.length;
            }
            if (last < m.text.length) out.push({ text: m.text.slice(last) });
            const onlyEmoji = out.length > 0 && out.length <= 20 && out.every((p) => p.emoji || !p.text.trim());
            if (onlyEmoji) out.forEach((p) => (p.jumbo = true));
            return out;
        },
        embedFor(m) {
            if (!m.text) return null;
            for (const match of m.text.matchAll(/https?:\/\/[^\s<>"']+/g)) {
                const id = youtubeId(match[0].replace(/[.,!?;:)\]]+$/, ""));
                if (!id) continue;
                const key = `${m.id}:${id}`;
                const info = this.embedInfo[id];
                if (!info || this.dismissed[key]) return null;
                return {
                    id,
                    key,
                    title: info.title,
                    author: info.author,
                    url: `https://www.youtube.com/watch?v=${id}`,
                    thumb: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
                    src: `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`,
                };
            }
            return null;
        },
        async scanEmbeds(messages) {
            for (const m of messages) {
                for (const match of (m.text || "").matchAll(/https?:\/\/[^\s<>"']+/g)) {
                    const id = youtubeId(match[0].replace(/[.,!?;:)\]]+$/, ""));
                    if (!id || id in this.embedInfo) continue;
                    this.embedInfo[id] = null;
                    fetch(`${API}/embed?v=${id}`)
                        .then((r) => (r.ok ? r.json() : null))
                        .then((info) => {
                            if (info?.title) this.embedInfo[id] = { title: info.title, author: info.author };
                        })
                        .catch(() => {});
                    break;
                }
            }
        },
        gifUrl: (file) => `/assets/gifs/${file}`,
        videoUrl: (id) => `${API}/video/${id}`,
        imageUrl: (id) => `${API}/image/${id}`,
        imageStyle(m) {
            return m.w && m.h ? { aspectRatio: `${m.w} / ${m.h}`, width: `${Math.min(m.w, 400)}px` } : {};
        },
        onImageLoad() {
            if (this.atBottom) this.scrollDown();
        },

        // ---------- reactions & deleting ----------
        reactionList(m) {
            return Object.entries(m.reactions || {}).map(([key, users]) => ({
                key,
                users,
                image: key.startsWith(":") ? this.emojiMap[key.slice(1, -1)] : "",
                mine: !!this.username && users.includes(this.username),
            }));
        },
        async react(m, emoji) {
            this.reactFor = 0;
            if (!this.username) return;
            await this.post(`${API}/react`, { ...this.target(), id: m.id, emoji });
            await this.poll();
        },
        canDelete(m) {
            if (!this.username) return false;
            if (m.name.toLowerCase() === this.username.toLowerCase()) return true;
            return !this.dm && (this.role === "a101" || this.role === "admin");
        },
        async removeMessage(m) {
            if (!window.confirm("Delete this message? This can't be undone.")) return;
            await this.post(`${API}/delete`, { ...this.target(), id: m.id });
            await this.poll();
        },
        target() {
            return this.dm ? { dm: this.dm } : { channel: this.channel };
        },
        async post(url, body) {
            this.error = "";
            try {
                const res = await fetch(url, { method: "POST", headers: this.headers(), body: JSON.stringify(body) });
                const data = await res.json().catch(() => ({}));
                if (!res.ok) this.error = data.error || "Something went wrong.";
                return res.ok;
            } catch {
                this.error = "Could not reach the chat.";
                return false;
            }
        },

        // ---------- profiles ----------
        async ensureProfiles(names, force = false) {
            const lower = [...new Set(names.map((n) => String(n).toLowerCase()))].filter(
                (n) => /^[a-z0-9_]{3,20}$/.test(n) && (force || !(n in this.profileWanted)),
            );
            if (!lower.length) return;
            lower.forEach((n) => (this.profileWanted[n] = true));
            for (let i = 0; i < lower.length; i += 40) {
                try {
                    const res = await fetch(`${API}/profiles?names=${lower.slice(i, i + 40).join(",")}`);
                    if (!res.ok) continue;
                    for (const p of (await res.json()).profiles) this.profiles[p.username.toLowerCase()] = p;
                } catch {}
            }
        },
        async openProfile(name) {
            await this.ensureProfiles([name], true);
            this.card = this.profileOf(name) || { username: name, role: "member", bio: "", created: 0 };
        },
        startEdit() {
            this.card = null;
            this.error = "";
            this.draft = { bio: this.me?.bio || "", blob: null, preview: "", remove: false };
            this.editing = true;
        },
        async onAvatarFile(e) {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file) return;
            try {
                const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
                const size = Math.min(bitmap.width, bitmap.height);
                const canvas = document.createElement("canvas");
                canvas.width = canvas.height = 128;
                const ctx = canvas.getContext("2d");
                if (!WEBP) {
                    ctx.fillStyle = "#fff";
                    ctx.fillRect(0, 0, 128, 128);
                }
                ctx.drawImage(
                    bitmap,
                    (bitmap.width - size) / 2,
                    (bitmap.height - size) / 2,
                    size,
                    size,
                    0,
                    0,
                    128,
                    128,
                );
                const blob = await new Promise((r) => canvas.toBlob(r, WEBP ? "image/webp" : "image/jpeg", 0.88));
                if (this.draft.preview) URL.revokeObjectURL(this.draft.preview);
                this.draft.blob = blob;
                this.draft.preview = URL.createObjectURL(blob);
                this.draft.remove = false;
            } catch {
                this.error = "Could not read that image.";
            }
        },
        async saveProfile() {
            this.busy = true;
            this.error = "";
            try {
                const auth = { authorization: `Bearer ${this.token}` };
                if (this.draft.blob) {
                    const res = await fetch(`${API}/avatar`, { method: "POST", headers: auth, body: this.draft.blob });
                    const data = await res.json().catch(() => ({}));
                    if (!res.ok) throw new Error(data.error || "Could not upload the picture.");
                } else if (this.draft.remove) {
                    await fetch(`${API}/avatar?remove=1`, { method: "POST", headers: auth });
                }
                const res = await fetch(`${AUTH}/profile`, {
                    method: "POST",
                    headers: this.headers(),
                    body: JSON.stringify({ bio: this.draft.bio }),
                });
                const data = await res.json().catch(() => ({}));
                if (!res.ok) throw new Error(data.error || "Could not save your profile.");
                if (this.draft.preview) URL.revokeObjectURL(this.draft.preview);
                await this.ensureProfiles([this.username], true);
                this.me = this.profileOf(this.username) || this.me;
                this.editing = false;
            } catch (e) {
                this.error = e.message || "Could not save your profile.";
            }
            this.busy = false;
        },

        // ---------- direct messages ----------
        openNewDm() {
            this.newDm = true;
            this.dmSearch = "";
            this.dmResults = [];
            this.$nextTick(() => this.$refs.dmInput?.focus());
        },
        searchDm() {
            clearTimeout(this.dmTimer);
            const q = this.dmSearch.trim();
            if (!q) {
                this.dmResults = [];
                return;
            }
            this.dmTimer = setTimeout(async () => {
                try {
                    const res = await fetch(`${API}/users?q=${encodeURIComponent(q)}`, { headers: this.headers() });
                    if (!res.ok) return;
                    this.dmResults = (await res.json()).users.filter(
                        (u) => u.toLowerCase() !== this.username.toLowerCase(),
                    );
                    this.ensureProfiles(this.dmResults);
                } catch {}
            }, 200);
        },
        async messageUser(name) {
            this.card = null;
            this.newDm = false;
            await this.openDm(name);
        },
        async openDm(name) {
            if (!this.username) return;
            if (this.dm.toLowerCase() === name.toLowerCase()) return;
            this.dm = name;
            this.resetConversation();
            await this.poll();
        },
        async selectChannel(id) {
            if (!this.dm && id === this.channel) return;
            this.channel = id;
            this.dm = "";
            save(CHANNEL_KEY, id);
            this.resetConversation();
            await this.poll();
        },
        resetConversation() {
            this.primed = false;
            this.messages = [];
            this.version = 0;
            this.error = "";
            this.text = "";
            this.suggest = [];
            this.picker = "";
            this.atBottom = true;
        },

        // ---------- composer: mentions + emoji autocomplete ----------
        insertMention(tag) {
            if (!this.canPost) return;
            this.text = `${this.text}${this.text && !this.text.endsWith(" ") ? " " : ""}${tag} `.slice(0, 300);
            this.$nextTick(() => this.$refs.input?.focus());
        },
        onInput() {
            const input = this.$refs.input;
            if (!input) return;
            const before = this.text.slice(0, input.selectionStart ?? this.text.length);
            clearTimeout(this.suggestTimer);

            const emoji = before.match(/(^|\s):([A-Za-z0-9_]{2,32})$/);
            if (emoji) {
                const query = emoji[2].toLowerCase();
                this.suggestKind = "emoji";
                this.suggestToken = { start: before.length - query.length - 1, end: before.length };
                this.suggest = this.emojis
                    .filter((e) => e.name.toLowerCase().startsWith(query))
                    .slice(0, 6)
                    .map((e) => ({ name: e.name, src: e.src }));
                this.suggestIndex = 0;
                if (!this.suggest.length) this.suggestToken = null;
                return;
            }

            const match = this.dm ? null : before.match(/(^|\s)@([A-Za-z0-9_]{0,20})$/);
            if (!match) {
                this.suggest = [];
                this.suggestToken = null;
                return;
            }
            const query = match[2];
            this.suggestKind = "mention";
            this.suggestToken = { start: before.length - query.length - 1, end: before.length };
            const lower = query.toLowerCase();
            const local = this.members
                .filter((n) => n !== this.username && n.toLowerCase().startsWith(lower))
                .map((name) => ({ name }));
            this.suggest = local.slice(0, 6);
            this.suggestIndex = 0;
            this.suggestTimer = setTimeout(async () => {
                try {
                    const res = await fetch(`${API}/users?q=${encodeURIComponent(query)}`, {
                        headers: this.headers(),
                    });
                    if (!res.ok || !this.suggestToken || this.suggestKind !== "mention") return;
                    const { users } = await res.json();
                    const merged = [...local];
                    for (const u of users) {
                        if (u !== this.username && !merged.some((x) => x.name === u)) merged.push({ name: u });
                    }
                    this.suggest = merged.slice(0, 6);
                    this.ensureProfiles(this.suggest.map((s) => s.name));
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
                this.pickSuggest(this.suggest[this.suggestIndex]);
            } else if (e.key === "Escape") {
                this.suggest = [];
            }
        },
        pickSuggest(item) {
            const token = this.suggestToken;
            if (!token || !item) return;
            const insert = this.suggestKind === "emoji" ? `:${item.name}: ` : `@${item.name} `;
            this.text = `${this.text.slice(0, token.start)}${insert}${this.text.slice(token.end)}`.slice(0, 300);
            this.suggest = [];
            this.suggestToken = null;
            this.$nextTick(() => {
                const input = this.$refs.input;
                const pos = token.start + insert.length;
                input?.focus();
                input?.setSelectionRange(pos, pos);
            });
        },
        togglePicker(kind) {
            this.picker = this.picker === kind ? "" : kind;
            this.pickerSearch = "";
        },
        insertEmoji(e) {
            const space = this.text && !this.text.endsWith(" ") ? " " : "";
            this.text = `${this.text}${space}:${e.name}: `.slice(0, 300);
            this.$nextTick(() => this.$refs.input?.focus());
        },
        async sendGif(g) {
            if (this.sending) return;
            this.picker = "";
            this.error = "";
            this.sending = true;
            try {
                const res = await fetch(API, {
                    method: "POST",
                    headers: this.headers(),
                    body: JSON.stringify({ ...this.target(), gif: g.file, text: this.text.trim() }),
                });
                const data = await res.json().catch(() => ({}));
                if (res.status === 401) {
                    this.expire(data.error);
                } else if (!res.ok) {
                    this.error = data.error || "Could not send GIF.";
                } else {
                    this.text = "";
                    this.atBottom = true;
                    await this.poll();
                }
            } catch {
                this.error = "Could not reach the chat.";
            }
            this.sending = false;
        },

        // ---------- attachments ----------
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
                if (file.type.startsWith("video/")) {
                    if (!VIDEO_TYPES.includes(file.type)) throw new Error("Only MP4 or WebM videos are supported.");
                    if (file.size > MAX_VIDEO_BYTES) {
                        throw new Error(`That video is ${(file.size / 1048576).toFixed(1)} MB. The limit is 25 MB.`);
                    }
                    this.clearPending();
                    this.pending = {
                        kind: "video",
                        blob: file,
                        url: URL.createObjectURL(file),
                        name: file.name || "video",
                        size: `${(file.size / 1048576).toFixed(1)} MB`,
                    };
                    this.$nextTick(() => this.$refs.input?.focus());
                    return;
                }
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
            const item = [...(e.clipboardData?.items || [])].find(
                (i) => i.type.startsWith("image/") || i.type.startsWith("video/"),
            );
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
            if (!this.canPost) return;
            const file = [...(e.dataTransfer?.files || [])].find(
                (f) => f.type.startsWith("image/") || f.type.startsWith("video/"),
            );
            if (file) this.attach(file);
        },

        // ---------- session ----------
        headers() {
            return {
                "content-type": "application/json",
                ...(this.token ? { authorization: `Bearer ${this.token}` } : {}),
            };
        },
        expire(message) {
            this.token = "";
            this.me = null;
            this.dm = "";
            this.dms = [];
            save(TOKEN_KEY, "");
            this.error = message || "Please log in again.";
        },
        async restoreSession() {
            try {
                const res = await fetch(`${AUTH}/me`, { headers: this.headers() });
                if (res.ok) {
                    this.me = await res.json();
                    this.profiles[this.me.username.toLowerCase()] = this.me;
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
                const res = await fetch(`${AUTH}/${this.registering ? "register" : "login"}`, {
                    method: "POST",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify(this.form),
                });
                const data = await res.json().catch(() => ({}));
                if (!res.ok) {
                    this.error = data.error || "Could not log in.";
                    if (data.claim) this.needClaim = true;
                } else {
                    this.token = data.token;
                    const { token, ...profile } = data;
                    this.me = profile;
                    this.profiles[profile.username.toLowerCase()] = profile;
                    this.form = { username: "", password: "", claim: "" };
                    this.needClaim = false;
                    save(TOKEN_KEY, data.token);
                    this.primed = false;
                    await this.poll();
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
            this.me = null;
            this.dms = [];
            save(TOKEN_KEY, "");
            if (this.dm) {
                this.dm = "";
                this.resetConversation();
                await this.poll();
            }
        },

        // ---------- polling ----------
        markSeen() {
            const last = this.messages.length ? this.messages[this.messages.length - 1].id : 0;
            const key = this.seenKey;
            if (last > (this.seen[key] || 0)) {
                this.seen = { ...this.seen, [key]: last };
                save(SEEN_KEY, JSON.stringify(this.seen));
            }
        },
        onScroll() {
            const box = this.$refs.box;
            this.atBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 40;
        },
        async poll() {
            const scope = this.scope;
            const last = this.messages.length ? this.messages[this.messages.length - 1].id : 0;
            try {
                const [res, summary] = await Promise.all([
                    fetch(`${API}?${scope}&after=${last}&v=${this.version}`, {
                        cache: "no-store",
                        headers: this.headers(),
                    }),
                    fetch(`${API}/summary`, { cache: "no-store", headers: this.headers() }).catch(() => null),
                ]);
                if (res.status === 401 && this.dm) {
                    this.expire("Log in to use direct messages.");
                    return;
                }
                if (!res.ok) throw new Error(res.status);
                const data = await res.json();
                let pinged = false;
                if (summary?.ok) {
                    const s = await summary.json();
                    const next = s.mentions || {};
                    if (this.primed) {
                        pinged = Object.keys(next).some(
                            (c) => (this.dm || c !== this.channel) && next[c] > (this.mentionLatest[c] || 0),
                        );
                        for (const d of s.dms || []) {
                            const active = this.dm.toLowerCase() === d.user.toLowerCase();
                            if (!active && d.latest > (this.dmLatest[d.user.toLowerCase()] || 0)) pinged = true;
                        }
                    }
                    this.latest = s.latest || {};
                    this.mentionLatest = next;
                    this.dms = s.dms || [];
                    this.dmLatest = Object.fromEntries(this.dms.map((d) => [d.user.toLowerCase(), d.latest]));
                }
                this.offline = false;
                if (scope !== this.scope) return;

                const known = new Set(this.messages.map((m) => m.id));
                const fresh = data.messages.filter((m) => !known.has(m.id));
                if (this.primed && fresh.some((m) => this.mentionsMe(m) || (this.dm && m.name !== this.username))) {
                    pinged = true;
                }
                if (pinged) this.ping();
                this.primed = true;

                const stick = this.atBottom;
                if (data.full) {
                    this.messages = data.messages.slice(-100);
                } else if (fresh.length) {
                    this.messages.push(...fresh);
                    this.messages = this.messages.slice(-100);
                }
                this.version = data.version;
                if (data.full || fresh.length) {
                    if (stick) this.scrollDown();
                    this.scanEmbeds(this.messages);
                    this.ensureProfiles([...this.messages.map((m) => m.name), ...(this.dm ? [this.dm] : [])]);
                }
                this.ensureProfiles(this.dms.map((d) => d.user));
                this.pollCount++;
                if (this.pollCount % 10 === 0) {
                    this.ensureProfiles(
                        [...new Set(this.messages.map((m) => m.name)), ...this.dms.map((d) => d.user)],
                        true,
                    );
                }
                this.markSeen();
            } catch {
                this.offline = true;
            }
        },

        // ---------- sending ----------
        async send() {
            if (this.sending || (!this.text.trim() && !this.pending)) return;
            this.error = "";
            this.sending = true;
            try {
                let res;
                const where = this.dm ? { dm: this.dm } : { channel: this.channel };
                if (this.pending?.kind === "video") {
                    const query = new URLSearchParams({ ...where, text: this.text.trim() });
                    this.uploadPct = 0;
                    res = await this.upload(`${API}/video?${query}`, this.pending.blob);
                } else if (this.pending) {
                    const { blob, w, h } = this.pending;
                    const query = new URLSearchParams({ ...where, text: this.text.trim(), w, h });
                    res = await fetch(`${API}/image?${query}`, {
                        method: "POST",
                        headers: this.token ? { authorization: `Bearer ${this.token}` } : {},
                        body: blob,
                    });
                } else {
                    res = await fetch(API, {
                        method: "POST",
                        headers: this.headers(),
                        body: JSON.stringify({ ...where, text: this.text }),
                    });
                }
                const data = await res.json().catch(() => ({}));
                if (res.status === 401) {
                    this.expire(data.error);
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
            this.uploadPct = null;
            this.sending = false;
        },
        upload(url, blob) {
            return new Promise((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                xhr.open("POST", url);
                if (this.token) xhr.setRequestHeader("authorization", `Bearer ${this.token}`);
                xhr.upload.onprogress = (e) => {
                    if (e.lengthComputable) this.uploadPct = Math.round((e.loaded / e.total) * 100);
                };
                xhr.onerror = () => reject(new Error("network"));
                xhr.onload = () =>
                    resolve({
                        ok: xhr.status >= 200 && xhr.status < 300,
                        status: xhr.status,
                        json: async () => JSON.parse(xhr.responseText),
                    });
                xhr.send(blob);
            });
        },
        scrollDown() {
            this.$nextTick(() => {
                const box = this.$refs.box;
                if (box) box.scrollTop = box.scrollHeight;
            });
        },
    },
};
