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
const REACTIONS = ["\u{1F44D}", "❤️", "\u{1F602}", "\u{1F62E}", "\u{1F622}", "\u{1F525}", "\u{1F389}", "\u{1FAC2}"];
const ROLE_LABEL = { a101: "A101", admin: "Admin", member: "Member" };
const ROLE_ORDER = ["a101", "admin", "member"];
const WEBP =
    typeof document !== "undefined" &&
    document.createElement("canvas").toDataURL("image/webp").startsWith("data:image/webp");

const STATUS_LABEL = { online: "Online", idle: "Idle", dnd: "Do Not Disturb", invisible: "Invisible", offline: "Offline" };
const STATUS_MENU = [
    { id: "online", label: "Online", note: "" },
    { id: "idle", label: "Idle", note: "" },
    { id: "dnd", label: "Do Not Disturb", note: "You will not hear any ping sounds." },
    { id: "invisible", label: "Invisible", note: "You will appear offline." },
];
const BANNERS = [
    "#5865f2", "#eb459e", "#f23f42", "#f0b232", "#23a559", "#00a8fc",
    "#9b59b6", "#e67e22", "#1abc9c", "#e74c3c", "#4a5568", "#fd79a8",
];
const BADGES = {
    owner: { icon: "\u{1F451}", label: "Owner", desc: "Runs the a101 List Reborn" },
    nitro: { icon: "\u26A1", label: "Nitro", desc: "Has a101 Nitro" },
    plus: { icon: "\u{1F451}", label: "Nitro Plus", desc: "Has a101 Nitro Plus" },
    staff: { icon: "\u{1F6E1}️", label: "Staff", desc: "Chat moderator" },
    early: { icon: "\u{1F331}", label: "Early Member", desc: "One of the first 100 members" },
    chatter: { icon: "\u{1F4AC}", label: "Chatterbox", desc: "Sent 100 messages" },
    orbs: { icon: "\u{1F52E}", label: "Orb Collector", desc: "Collected 50 orbs" },
    orbmaster: { icon: "\u{1F31F}", label: "Orb Master", desc: "Collected 500 orbs" },
    social: { icon: "\u{1F91D}", label: "Social Butterfly", desc: "Has 5 friends" },
    veteran: { icon: "\u{1F3C5}", label: "Veteran", desc: "Member for 30 days" },
};

const CATEGORIES = [
    {
        name: "Important",
        channels: [
            { id: "rules", icon: "\u{1F4DC}", post: ["a101"], topic: "Please read these before chatting." },
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
        channels: [
            { id: "minigames", topic: "Scores and chat about the site minigames." },
            { id: "casino", icon: "\u{1F3B0}", topic: "Orb casino: /cf, /roulette, /slots, /dice, /blackjack, /duel, /bal. Games only work in this channel." },
        ],
    },
];
const CHANNELS = CATEGORIES.flatMap((c) => c.channels);
const BOT_MEMBERS = [
    { name: "a101 Bot", icon: "\u{1F916}", desc: "Level info, polls, dice and fun commands. Type / to see them." },
    { name: "a101 Casino", icon: "\u{1F3B0}", desc: "Play with your orbs in #casino: /cf, /roulette, /slots, /dice, /blackjack, /duel." },
];
const CASINO_COMMANDS = ["cf", "roulette", "slots", "dice", "blackjack", "duel", "accept", "decline", "bal"];
const botOf = (name) => (CASINO_COMMANDS.includes(name) ? "a101 Casino" : "a101 Bot");

const UNICODE_EMOJI = {
    smileys: "😀 😃 😄 😁 😆 😅 😂 🤣 😊 😇 🙂 🙃 😉 😍 🥰 😘 😋 😛 😜 🤪 🤗 🤔 🤨 😐 😑 😶 🙄 😏 😬 😮 😯 😲 🥱 😴 😪 😷 🤒 🤕 🤢 🤮 🥵 🥶 😵 🤯 🥳 😎 🤓 😕 😟 🙁 😢 😭 😤 😠 😡 🤬 😱 😨 😰 😥 😓 🥺 😳 🤐 🤫 🤭 🧐",
    people: "👍 👎 👌 ✌️ 🤞 🤟 🤘 🤙 👋 🤚 ✋ 🖐️ 👏 🙌 🤝 🙏 💪 👀 🧠 🫂 💀 👻 👽 🤖 💩 🙈 🙉 🙊 🤡 😈 👿 🦴",
    hearts: "❤️ 🧡 💛 💚 💙 💜 🖤 🤍 🤎 💔 💖 💗 💓 💞 💕 💘 💝 ✨ ⭐ 🌟 💫 🔥 💥 💯 ✅ ❌ ⚠️ ❓ ❗ 💤 🎉 🎊 🎁 🏆 🥇 🥈 🥉 👑 💎 🔔 🔒",
    animals: "🐶 🐱 🐭 🐹 🐰 🦊 🐻 🐼 🐨 🐯 🦁 🐮 🐷 🐸 🐵 🐔 🐧 🐦 🦆 🦉 🐺 🐴 🦄 🐝 🦋 🐢 🐍 🐙 🐬 🐳 🦈 🌸 🌹 🌻 🌲 🍀 🌈 ☀️ 🌙 ⚡ ❄️ 🌊",
    food: "🍎 🍌 🍉 🍇 🍓 🍒 🍑 🍍 🥑 🌽 🥕 🍞 🧀 🍔 🍟 🍕 🌭 🌮 🍣 🍜 🍝 🍰 🎂 🍩 🍪 🍫 🍿 ☕ 🍵 🍺 🥤 🧋",
    play: "🎮 🕹️ 🎯 🎲 ♟️ 🎵 🎶 🎧 🎤 🎸 🥁 ⚽ 🏀 🏈 🎾 🏓 🥊 🚀 ✈️ 🚗 🏁 🧩 🎬 📸 💻 📱 ⌨️ 🖱️ 💡 🔧 🔨 📌 📝 📚",
};
const EMOJI_CATS = [
    { id: "custom", icon: "⭐", label: "Server emoji" },
    { id: "smileys", icon: "😀", label: "Smileys" },
    { id: "people", icon: "👋", label: "People and gestures" },
    { id: "hearts", icon: "❤️", label: "Hearts and symbols" },
    { id: "animals", icon: "🐶", label: "Animals and nature" },
    { id: "food", icon: "🍕", label: "Food and drink" },
    { id: "play", icon: "🎮", label: "Games and objects" },
];

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
    props: {
        name: { type: String, default: "?" },
        src: { type: String, default: "" },
        frame: { type: String, default: "" },
    },
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
        <div class="dc-avatar" :class="frame ? 'frame-' + frame : ''" :style="style">
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
                        <div v-if="username" class="dc-category">
                            <button type="button" class="dc-channel" :class="{ active: view === 'friends' }" @click="openFriends">
                                <span class="dc-hash">&#128101;</span>
                                <span class="dc-channel-name">Friends</span>
                                <span v-if="friendData.incoming.length" class="dc-badge">{{ friendData.incoming.length }}</span>
                            </button>
                            <button type="button" class="dc-channel" @click="inviteOpen = true">
                                <span class="dc-hash">&#128140;</span>
                                <span class="dc-channel-name">Invite friends</span>
                            </button>
                            <button v-if="isMod" type="button" class="dc-channel" @click="openMod">
                                <span class="dc-hash">&#128737;&#65039;</span>
                                <span class="dc-channel-name">Moderation</span>
                                <span v-if="modData && modData.reports.length" class="dc-badge">{{ modData.reports.length }}</span>
                            </button>
                            <button type="button" class="dc-channel" @click="openTasks">
                                <span class="dc-hash">&#128203;</span>
                                <span class="dc-channel-name">Orb Tasks</span>
                                <span v-if="claimable" class="dc-badge">{{ claimable }}</span>
                            </button>
                            <button type="button" class="dc-channel" @click="openShop()">
                                <span class="dc-hash">&#128722;</span>
                                <span class="dc-channel-name">Orb Shop</span>
                                <span v-if="me && me.nitro" class="dc-nitro-tag">&#9889;</span>
                            </button>
                            <button type="button" class="dc-channel" @click="openBoard">
                                <span class="dc-hash">&#127942;</span>
                                <span class="dc-channel-name">Orb Leaderboard</span>
                            </button>
                        </div>
                        <div v-for="cat in categories" :key="cat.name" class="dc-category">
                            <p class="dc-cat"><span class="dc-arrow">&#9662;</span> {{ cat.name }}</p>
                            <button
                                v-for="ch in cat.channels"
                                :key="ch.id"
                                type="button"
                                class="dc-channel"
                                :class="{ active: view === 'chat' && !inConvo && ch.id === channel, unread: isUnread(ch.id) }"
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
                                <button type="button" class="dc-plus" title="New message" @click="openNewDm('new')">+</button>
                            </p>
                            <button
                                v-for="d in dmList"
                                :key="'dm-' + d.user"
                                type="button"
                                class="dc-channel dc-dm"
                                :class="{ active: view === 'chat' && dm.toLowerCase() === d.user.toLowerCase(), unread: isDmUnread(d) }"
                                @click="openDm(d.user)"
                            >
                                <Avatar class="dc-avatar-xs" :name="d.user" :src="avatarSrc(d.user)"><span class="dc-status" :class="statusOf(d.user)"></span></Avatar>
                                <span class="dc-channel-name">{{ d.user }}</span>
                                <span v-if="isDmUnread(d)" class="dc-badge">{{ unreadCount(d.latest, 'dm:' + d.user.toLowerCase()) }}</span>
                            </button>
                            <button
                                v-for="g in groups"
                                :key="'g-' + g.id"
                                type="button"
                                class="dc-channel dc-dm"
                                :class="{ active: view === 'chat' && groupId === g.id, unread: isGroupUnread(g) }"
                                @click="openGroup(g.id)"
                            >
                                <div class="dc-avatar dc-avatar-xs dc-group-icon">{{ g.members.length }}</div>
                                <span class="dc-channel-name">{{ groupLabel(g) }}</span>
                                <span v-if="isGroupUnread(g)" class="dc-badge">{{ unreadCount(g.latest, 'g:' + g.id) }}</span>
                            </button>
                            <p v-if="!dmList.length && !groups.length" class="dc-dm-empty">No conversations yet.</p>
                        </div>
                    </nav>
                    <div class="dc-user">
                        <template v-if="username">
                            <button type="button" class="dc-user-btn" title="Your profile" @click="openProfile(username)">
                                <Avatar class="dc-avatar-sm" :name="username" :src="avatarSrc(username)" :frame="frameOf(username)"><span class="dc-status" :class="myStatus"></span></Avatar>
                                <div class="dc-user-info">
                                    <div class="dc-user-name">{{ username }}</div>
                                    <div class="dc-user-sub" :class="{ pop: orbPop }" :title="statusLabel(myStatus)">{{ me.statusText || shortStatus[myStatus] }} &middot; &#128302; {{ me.orbs || 0 }}<b v-if="orbPop"> +{{ orbGain }}</b></div>
                                </div>
                            </button>
                            <div class="dc-status-wrap">
                                <button class="dc-icon-btn" type="button" title="Set status" @click.stop="statusMenu = !statusMenu"><span class="dc-dot-btn" :class="myStatus"></span></button>
                                <div v-if="statusMenu" class="dc-status-menu" @click.stop>
                                    <button v-for="s in statusOptions" :key="s.id" type="button" :class="{ active: myStatus === s.id }" @click="setStatus(s.id)">
                                        <span class="dc-dot-btn" :class="s.id"></span>
                                        <span class="dc-status-text"><b>{{ s.label }}</b><small v-if="s.note">{{ s.note }}</small></span>
                                    </button>
                                </div>
                            </div>
                            <button class="dc-icon-btn" type="button" :title="notifyOn ? 'Desktop notifications are on' : 'Turn on desktop notifications'" @click="toggleNotify"><span :class="{ dim: !notifyOn }">&#128172;</span></button>
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
                    <header v-show="view === 'chat'" class="dc-header">
                        <template v-if="groupId && group">
                            <div class="dc-avatar dc-avatar-xs dc-group-icon">{{ group.members.length }}</div>
                            <span class="dc-header-name">{{ groupLabel(group) }}</span>
                            <span class="dc-divider"></span>
                            <span class="dc-topic">{{ group.members.length }} members</span>
                            <span class="dc-header-actions">
                                <button v-if="group.owner === username" type="button" @click="openNewDm('add')">Add people</button>
                                <button v-if="group.owner === username" type="button" @click="renameGroup">Rename</button>
                                <button type="button" class="danger" @click="leaveGroup">Leave</button>
                            </span>
                        </template>
                        <template v-else-if="dm">
                            <Avatar class="dc-avatar-xs" :name="dm" :src="avatarSrc(dm)"><span class="dc-status" :class="statusOf(dm)"></span></Avatar>
                            <span class="dc-header-name">{{ dm }}</span>
                            <span class="dc-divider"></span>
                            <span class="dc-topic">{{ statusLabel(statusOf(dm)) }}</span>
                        </template>
                        <template v-else>
                            <span class="dc-hash">{{ current.icon || '#' }}</span>
                            <span class="dc-header-name">{{ channel }}</span>
                            <span class="dc-divider"></span>
                            <span class="dc-topic">{{ topic }}</span>
                        </template>
                        <button v-if="username" type="button" class="dc-search-btn" title="Search messages" @click.stop="openSearch">&#128269;</button>
                    </header>
                    <div v-if="searchOpen" class="dc-search" @click.stop>
                        <input ref="searchInput" type="text" v-model="searchQ" maxlength="50" placeholder="Search messages" @input="runSearch">
                        <div class="dc-search-scope">
                            <button type="button" :class="{ active: searchScope === 'here' }" @click="searchScope = 'here'; runSearch()">This chat</button>
                            <button v-if="!inConvo" type="button" :class="{ active: searchScope === 'all' }" @click="searchScope = 'all'; runSearch()">All channels</button>
                            <button type="button" class="dc-icon-btn" @click="searchOpen = false">&#x2715;</button>
                        </div>
                        <div class="dc-search-results">
                            <button v-for="r in searchResults" :key="r.channel + r.id" type="button" class="dc-search-hit" @click="goToResult(r)">
                                <b>{{ r.name }}</b> <small v-if="r.channel">#{{ r.channel }}</small> <small>{{ stamp(r.time) }}</small>
                                <span>{{ r.text }}</span>
                            </button>
                            <p v-if="searchQ.trim().length >= 2 && !searchResults.length && !searchBusy" class="dc-members-empty">No messages found.</p>
                            <p v-else-if="searchQ.trim().length < 2" class="dc-members-empty">Type at least 2 letters.</p>
                        </div>
                    </div>
                    <div v-show="view === 'chat'" class="dc-mobile-channels">
                        <button
                            v-for="ch in allChannels"
                            :key="ch.id"
                            type="button"
                            :class="{ active: !inConvo && ch.id === channel }"
                            @click="selectChannel(ch.id)"
                        >{{ ch.icon || '#' }} {{ ch.id }}</button>
                        <button v-if="username" type="button" @click="openFriends">&#128101; Friends</button>
                        <button v-for="d in dmList" :key="'m-' + d.user" type="button" :class="{ active: dm.toLowerCase() === d.user.toLowerCase() }" @click="openDm(d.user)">@ {{ d.user }}</button>
                        <button v-for="g in groups" :key="'mg-' + g.id" type="button" :class="{ active: groupId === g.id }" @click="openGroup(g.id)">&#128101; {{ groupLabel(g) }}</button>
                    </div>

                    <section v-show="view === 'friends'" class="dc-friends">
                        <header class="dc-header">
                            <span class="dc-hash">&#128101;</span>
                            <span class="dc-header-name">Friends</span>
                            <span class="dc-divider"></span>
                            <span class="dc-tabs">
                                <button type="button" :class="{ active: friendTab === 'online' }" @click="friendTab = 'online'">Online</button>
                                <button type="button" :class="{ active: friendTab === 'all' }" @click="friendTab = 'all'">All</button>
                                <button type="button" :class="{ active: friendTab === 'pending' }" @click="friendTab = 'pending'">Pending<span v-if="friendData.incoming.length" class="dc-badge">{{ friendData.incoming.length }}</span></button>
                                <button type="button" :class="{ active: friendTab === 'blocked' }" @click="friendTab = 'blocked'">Blocked</button>
                                <button type="button" class="add" :class="{ active: friendTab === 'add' }" @click="friendTab = 'add'">Add Friend</button>
                            </span>
                        </header>
                        <div class="dc-friends-body">
                            <form v-if="friendTab === 'add'" class="dc-add-friend" @submit.prevent="sendFriendRequest">
                                <h3>Add Friend</h3>
                                <p>You can add friends with their a101 chat username.</p>
                                <div class="dc-add-row">
                                    <input type="text" v-model="friendName" maxlength="20" placeholder="Enter a username">
                                    <button type="submit" class="dc-btn" :disabled="!friendName.trim()">Send Friend Request</button>
                                </div>
                                <p v-if="friendMsg" class="dc-friend-msg" :class="{ bad: friendMsgBad }">{{ friendMsg }}</p>
                            </form>
                            <template v-else-if="friendTab === 'blocked'">
                                <p class="dc-cat">Blocked &mdash; {{ blockedNames.length }}</p>
                                <div v-for="n in blockedNames" :key="n" class="dc-friend-row">
                                    <button type="button" class="dc-friend-main" @click="openProfile(n)">
                                        <Avatar class="dc-avatar-sm" :name="n" :src="avatarSrc(n)"></Avatar>
                                        <span class="dc-friend-name">{{ n }}<small>Their messages are hidden</small></span>
                                    </button>
                                    <button type="button" class="dc-btn ghost" @click="toggleBlock(n)">Unblock</button>
                                </div>
                                <p v-if="!blockedNames.length" class="dc-members-empty">You have not blocked anyone.</p>
                            </template>
                            <template v-else-if="friendTab === 'pending'">
                                <p class="dc-cat">Incoming &mdash; {{ friendData.incoming.length }}</p>
                                <div v-for="f in friendData.incoming" :key="'in-' + f.user" class="dc-friend-row">
                                    <button type="button" class="dc-friend-main" @click="openProfile(f.user)">
                                        <Avatar class="dc-avatar-sm" :name="f.user" :src="avatarSrc(f.user)"></Avatar>
                                        <span class="dc-friend-name">{{ f.user }}<small>Incoming friend request</small></span>
                                    </button>
                                    <button type="button" class="dc-round ok" title="Accept" @click="friendAct('accept', f.user)">&#10003;</button>
                                    <button type="button" class="dc-round no" title="Ignore" @click="friendAct('decline', f.user)">&#10005;</button>
                                </div>
                                <p v-if="!friendData.incoming.length" class="dc-members-empty">No incoming requests.</p>
                                <p class="dc-cat">Sent &mdash; {{ friendData.outgoing.length }}</p>
                                <div v-for="f in friendData.outgoing" :key="'out-' + f.user" class="dc-friend-row">
                                    <button type="button" class="dc-friend-main" @click="openProfile(f.user)">
                                        <Avatar class="dc-avatar-sm" :name="f.user" :src="avatarSrc(f.user)"></Avatar>
                                        <span class="dc-friend-name">{{ f.user }}<small>Outgoing friend request</small></span>
                                    </button>
                                    <button type="button" class="dc-round no" title="Cancel" @click="friendAct('cancel', f.user)">&#10005;</button>
                                </div>
                                <p v-if="!friendData.outgoing.length" class="dc-members-empty">No sent requests.</p>
                            </template>
                            <template v-else>
                                <p class="dc-cat">{{ friendTab === 'online' ? 'Online' : 'All friends' }} &mdash; {{ shownFriends.length }}</p>
                                <div v-for="f in shownFriends" :key="f.user" class="dc-friend-row">
                                    <button type="button" class="dc-friend-main" @click="openProfile(f.user)">
                                        <Avatar class="dc-avatar-sm" :name="f.user" :src="avatarSrc(f.user)"><span class="dc-status" :class="statusOf(f.user)"></span></Avatar>
                                        <span class="dc-friend-name">{{ f.user }}<small>{{ f.statusText || statusLabel(statusOf(f.user)) }}</small></span>
                                    </button>
                                    <button type="button" class="dc-round" title="Message" @click="messageUser(f.user)">&#128172;</button>
                                    <button type="button" class="dc-round no" title="Remove friend" @click="removeFriend(f.user)">&#10005;</button>
                                </div>
                                <p v-if="!shownFriends.length" class="dc-members-empty">{{ friendTab === 'online' ? 'None of your friends are online right now.' : 'No friends yet. Use Add Friend to send a request.' }}</p>
                            </template>
                        </div>
                    </section>

                    <div v-show="view === 'chat'" class="dc-body">
                        <div class="dc-chat" @dragover.prevent="dragging = true" @dragleave="onDragLeave" @drop.prevent="onDrop">
                            <div v-if="dragging" class="dc-drop">Drop an image or video to share it</div>
                            <div class="dc-messages" ref="box">
                                <div class="dc-welcome">
                                    <template v-if="groupId && group">
                                        <div class="dc-avatar dc-avatar-xl dc-group-icon">{{ group.members.length }}</div>
                                        <div class="dc-welcome-title">{{ groupLabel(group) }}</div>
                                        <div class="dc-welcome-text">This is the beginning of the group chat with {{ group.members.join(', ') }}.</div>
                                    </template>
                                    <template v-else-if="dm">
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
                                <div v-for="m in grouped" :key="m.id" class="dc-msg" :id="'msg-' + m.id" :class="[{ cont: m.cont, mine: m.name === username, mentioned: mentionsMe(m), flash: flashId === m.id, botmsg: m.bot, blocked: m.hidden }, bubbleClass(m.name)]" :style="bubbleStyle(m.name)">
                                    <div class="dc-msg-tools" v-if="username">
                                        <button type="button" title="Reply" @click.stop="startReply(m)">&#8617;</button>
                                        <button v-if="canEdit(m)" type="button" title="Edit message" @click.stop="startEdit2(m)">&#9998;</button>
                                        <button type="button" title="Add reaction" @click.stop="reactFor = reactFor === m.id ? 0 : m.id">&#x263A;</button>
                                        <button v-if="!m.bot && m.name !== username" type="button" title="Report message" @click.stop="reportMessage(m)">&#9873;</button>
                                        <button v-if="canDelete(m)" type="button" title="Delete message" class="danger" @click.stop="removeMessage(m)">&#x1F5D1;</button>
                                        <div v-if="reactFor === m.id" class="dc-react-pop" @click.stop>
                                            <button v-for="r in reactionPalette" :key="r" type="button" @click="react(m, r)"><span v-if="r.startsWith(':')"><img class="dc-emoji" :src="emojiMap[r.slice(1, -1)]" :alt="r"></span><span v-else>{{ r }}</span></button>
                                        </div>
                                    </div>
                                    <div v-if="!m.cont && m.bot" class="dc-avatar dc-bot-avatar" :class="{ owo: m.name === 'a101 Casino' }">{{ m.name === 'a101 Casino' ? '\u{1F3B0}' : '\u{1F916}' }}</div>
                                    <button v-else-if="!m.cont" type="button" class="dc-avatar-btn" @click="openProfile(m.name)">
                                        <Avatar :name="m.name" :src="avatarSrc(m.name)" :frame="frameOf(m.name)"></Avatar>
                                    </button>
                                    <span v-else class="dc-msg-time">{{ time(m.time) }}</span>
                                    <div class="dc-msg-body">
                                        <div v-if="!m.cont" class="dc-msg-head">
                                            <span v-if="m.bot" class="dc-msg-name dc-bot-name" :class="{ owo: m.name === 'a101 Casino' }">{{ m.name }}</span>
                                            <span v-if="m.bot" class="dc-role bot">BOT</span>
                                            <button v-else type="button" class="dc-msg-name" :class="nameClass(m.name)" :style="nameStyle(m.name)" @click="openProfile(m.name)">{{ m.name }}</button>
                                            <span v-if="roleOfName(m.name) !== 'member'" class="dc-role" :class="roleOfName(m.name)">{{ roleLabel(roleOfName(m.name)) }}</span>
                                            <span v-if="shopBadge(m.name)" class="dc-badge-icon bought" :title="shopBadge(m.name).name">{{ shopBadge(m.name).style.icon }}</span>
                                            <span v-for="b in topBadges(m.name)" :key="b" class="dc-badge-icon" :title="badgeInfo(b).label + ' - ' + badgeInfo(b).desc">{{ badgeInfo(b).icon }}</span>
                                            <span class="dc-msg-stamp">{{ stamp(m.time) }}</span>
                                        </div>
                                        <div v-if="m.replyTo" class="dc-reply" @click="jumpTo(m.replyTo.id)"><span class="dc-reply-arrow">&#8618;</span> <b>{{ m.replyTo.name }}</b> <span>{{ m.replyTo.text }}</span></div>
                                        <input v-if="editingId === m.id" ref="editInput" class="dc-edit-input" type="text" v-model="editText" :maxlength="maxText" @keydown.enter.prevent="saveEdit(m)" @keydown.esc="editingId = 0">
                                        <small v-if="editingId === m.id" class="dc-edit-hint">escape to cancel &middot; enter to save</small>
                                        <div v-if="anims[m.id]" class="dc-anim" :class="'anim-' + anims[m.id].type">
                                            <span class="dc-anim-glyph">{{ animGlyph(m) }}</span>
                                            <small>{{ animLabel(anims[m.id].type) }}</small>
                                        </div>
                                        <div v-if="m.text && editingId !== m.id && !anims[m.id]" class="dc-msg-text" :class="{ 'dc-reveal': revealed[m.id] }"><template v-for="(p, i) in parts(m)" :key="i"><a v-if="p.link" class="dc-link" :href="p.link" target="_blank" rel="noopener noreferrer">{{ p.text }}</a><span v-else-if="p.mention" class="dc-mention" :class="{ me: p.me }" @click="insertMention(p.text)">{{ p.text }}</span><img v-else-if="p.emoji" class="dc-emoji" :class="{ jumbo: p.jumbo }" :src="p.emoji" :alt="p.text" :title="p.text"><template v-else>{{ p.text }}</template></template><small v-if="m.edited" class="dc-edited" :title="stamp(m.edited)"> (edited)</small></div>
                                        <div v-if="m.duel" class="dc-duel" :class="m.duel.status">
                                            <div class="dc-duel-vs"><b>{{ m.duel.from }}</b> <span>&#9876;&#65039;</span> <b>{{ m.duel.to }}</b></div>
                                            <div class="dc-duel-bet">&#128302; {{ m.duel.amount }} orbs on the line</div>
                                            <template v-if="m.duel.status === 'open' && !duelExpired(m)">
                                                <div v-if="username && username === m.duel.to" class="dc-duel-actions">
                                                    <button type="button" class="dc-btn alt" @click="duelAct(m, 'accept')">Accept</button>
                                                    <button type="button" class="dc-btn ghost" @click="duelAct(m, 'decline')">Decline</button>
                                                </div>
                                                <div v-else-if="username && username === m.duel.from" class="dc-duel-actions">
                                                    <small>Waiting for {{ m.duel.to }}...</small>
                                                    <button type="button" class="dc-btn ghost" @click="duelAct(m, 'decline')">Cancel</button>
                                                </div>
                                                <small v-else>Waiting for {{ m.duel.to }}...</small>
                                            </template>
                                            <div v-else class="dc-duel-result">{{ duelResult(m) }}</div>
                                        </div>
                                        <div v-if="m.bj" class="dc-bj" :class="m.bj.status">
                                            <div class="dc-bj-row">
                                                <span class="dc-bj-label">Dealer</span>
                                                <span v-for="(c, i) in m.bj.dealer" :key="'d' + i" class="dc-bjcard" :class="{ red: cardRed(c) }">{{ c }}</span>
                                                <span v-if="m.bj.hidden" class="dc-bjcard back">?</span>
                                                <b v-if="!m.bj.hidden">{{ bjTotal(m.bj.dealer) }}</b>
                                            </div>
                                            <div class="dc-bj-row">
                                                <span class="dc-bj-label">{{ m.bj.owner }}</span>
                                                <span v-for="(c, i) in m.bj.player" :key="'p' + i" class="dc-bjcard" :class="{ red: cardRed(c) }">{{ c }}</span>
                                                <b>{{ bjTotal(m.bj.player) }}</b>
                                            </div>
                                            <div class="dc-bj-bet">&#128302; {{ m.bj.bet }} orbs{{ m.bj.doubled ? ' (doubled)' : '' }}</div>
                                            <div v-if="m.bj.status === 'active' && !bjExpired(m) && username === m.bj.owner" class="dc-duel-actions">
                                                <button type="button" class="dc-btn alt" @click="bjAct(m, 'hit')">Hit</button>
                                                <button type="button" class="dc-btn" @click="bjAct(m, 'stand')">Stand</button>
                                                <button v-if="m.bj.player.length === 2" type="button" class="dc-btn ghost" @click="bjAct(m, 'double')">Double</button>
                                            </div>
                                            <small v-else-if="m.bj.status === 'active' && !bjExpired(m)">{{ m.bj.owner }} is playing...</small>
                                            <div v-else class="dc-duel-result">{{ bjResult(m) }}</div>
                                        </div>
                                        <div v-if="m.poll" class="dc-poll">
                                            <div class="dc-poll-q">&#128202; {{ m.poll.q }}</div>
                                            <button v-for="(o, i) in m.poll.options" :key="i" type="button" class="dc-poll-opt" :class="{ mine: iVoted(m, i) }" :disabled="!username || pollEnded(m)" @click="votePoll(m, i)">
                                                <span class="dc-poll-bar" :style="{ width: pollPct(m, i) + '%' }"></span>
                                                <span class="dc-poll-label">{{ o }}</span>
                                                <b>{{ m.poll.votes[i].length }} &middot; {{ pollPct(m, i) }}%</b>
                                            </button>
                                            <small>{{ pollTotal(m) }} vote{{ pollTotal(m) === 1 ? '' : 's' }} &middot; {{ pollEnded(m) ? 'Poll ended' : 'Ends ' + stamp(m.poll.ends) }}</small>
                                        </div>
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
                                            <video v-if="m.gifVideo || m.gif.endsWith('.mp4')" class="dc-msg-gif" :src="gifUrl(m.gif)" autoplay loop muted playsinline @loadeddata="onImageLoad"></video>
                                            <img v-else class="dc-msg-gif" :src="gifUrl(m.gif)" alt="GIF" @load="onImageLoad" @click="viewer = gifUrl(m.gif)">
                                        </template>
                                        <img v-if="m.sticker" class="dc-sticker" :src="stickerUrl(m.sticker)" alt="sticker" @load="onImageLoad" @click="viewer = stickerUrl(m.sticker)">
                                        <div v-if="m.levelCard" class="dc-level">
                                            <img v-if="levelInfo(m.levelCard)" class="dc-level-tier" :src="levelInfo(m.levelCard).tier" alt="">
                                            <div class="dc-level-body">
                                                <b>{{ m.levelCard.name }}</b>
                                                <small>#{{ m.levelCard.rank }} on {{ listLabel(m.levelCard.list) }}<template v-if="levelInfo(m.levelCard)"> &middot; {{ levelInfo(m.levelCard).tierName }}</template></small>
                                                <small v-if="levelInfo(m.levelCard)">By {{ levelInfo(m.levelCard).creators }} &middot; verified by {{ levelInfo(m.levelCard).verifier }}</small>
                                                <a class="dc-link" :href="listLink(m.levelCard)">Open on the list</a>
                                            </div>
                                            <a v-if="levelInfo(m.levelCard) && levelInfo(m.levelCard).thumb" :href="levelInfo(m.levelCard).video" target="_blank" rel="noopener noreferrer" class="dc-level-thumb"><img :src="levelInfo(m.levelCard).thumb" alt=""></a>
                                        </div>
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
                            <div v-if="username && replyTo" class="dc-replybar">
                                <span>Replying to <b>{{ replyTo.name }}</b> <small>{{ replyTo.text }}</small></span>
                                <button type="button" title="Cancel reply" @click="replyTo = null">&#x2715;</button>
                            </div>
                            <div v-if="typingNames.length" class="dc-typing"><span class="dc-dots"><i></i><i></i><i></i></span> {{ typingText }}</div>
                            <div v-if="username && picker && canPost" class="dc-picker">
                                <div class="dc-picker-tabs">
                                    <button type="button" :class="{ active: picker === 'fav' }" @click="picker = 'fav'; pickerSearch = ''">&#11088; Favourites</button>
                                    <button type="button" :class="{ active: picker === 'gif' }" @click="picker = 'gif'; pickerSearch = ''">GIFs</button>
                                    <button type="button" :class="{ active: picker === 'sticker' }" @click="picker = 'sticker'; pickerSearch = ''">Stickers</button>
                                    <button type="button" :class="{ active: picker === 'emoji' }" @click="picker = 'emoji'; pickerSearch = ''">Emoji</button>
                                    <input type="text" v-model="pickerSearch" :placeholder="picker === 'emoji' ? 'Search emoji' : picker === 'sticker' ? 'Search stickers' : 'Search GIFs'">
                                    <button type="button" class="dc-icon-btn" @click="picker = ''">&#x2715;</button>
                                </div>
                                <div v-if="picker === 'gif' || picker === 'fav'" class="dc-picker-grid gifs">
                                    <div v-for="g in filteredGifs" :key="g.file" class="dc-gif-wrap">
                                        <button type="button" class="dc-gif" :title="g.name" @click="sendGif(g)">
                                            <video v-if="g.video || g.file.endsWith('.mp4')" :src="gifUrl(g.file)" autoplay loop muted playsinline></video>
                                            <img v-else :src="gifUrl(g.file)" :alt="g.name" loading="lazy">
                                            <span>{{ g.name }}</span>
                                        </button>
                                        <button type="button" class="dc-fav" :class="{ on: isFav(g) }" :title="isFav(g) ? 'Remove from favourites' : 'Add to favourites'" @click.stop="toggleFav(g)">{{ isFav(g) ? '\u2605' : '\u2606' }}</button>
                                    </div>
                                    <p v-if="!filteredGifs.length" class="dc-picker-empty">{{ picker === 'fav' ? 'Click the star on a GIF to keep it here.' : 'No GIFs found.' }}</p>
                                    <button v-if="picker === 'gif'" type="button" class="dc-gif dc-submit dc-gif-submit" title="Suggest a GIF for the library" @click="startSubmit('gif')"><b>+</b><span>Submit a GIF</span></button>
                                </div>
                                <div v-else-if="picker === 'sticker'" class="dc-picker-grid stickers">
                                    <button v-for="s in filteredStickers" :key="s.file" type="button" class="dc-stick" :title="s.name" @click="sendSticker(s)">
                                        <img :src="stickerUrl(s.file)" :alt="s.name" loading="lazy" @error="$event.target.closest('.dc-stick').style.display = 'none'">
                                        <span>{{ s.name }}</span>
                                    </button>
                                    <p v-if="!filteredStickers.length" class="dc-picker-empty">No stickers found.</p>
                                    <button type="button" class="dc-stick dc-submit" title="Suggest a sticker for the library" @click="startSubmit('sticker')"><b>+</b><span>Submit a sticker</span></button>
                                </div>
                                <div v-else class="dc-picker-grid emojis">
                                    <div class="dc-emoji-cats">
                                        <button v-for="c in emojiCats" :key="c.id" type="button" :class="{ active: emojiCat === c.id && !pickerSearch.trim() }" :title="c.label" @click="emojiCat = c.id; pickerSearch = ''">{{ c.icon }}</button>
                                    </div>
                                    <template v-if="emojiCat !== 'custom' && !pickerSearch.trim()">
                                        <button v-for="ch in unicodeList" :key="ch" type="button" class="dc-emoji-btn dc-uni" @click="insertUnicode(ch)">{{ ch }}</button>
                                    </template>
                                    <template v-else>
                                    <button v-for="e in filteredEmojis" :key="e.name" type="button" class="dc-emoji-btn" :title="':' + e.name + ':'" @click="insertEmoji(e)">
                                        <img :src="e.src" :alt="e.name">
                                    </button>
                                    <p v-if="!filteredEmojis.length" class="dc-picker-empty">No emoji found.</p>
                                    <button type="button" class="dc-emoji-btn dc-submit" title="Suggest an emoji for the library" @click="startSubmit('emoji')"><b>+</b></button>
                                    </template>
                                </div>
                            </div>
                            <form v-if="username && canPost" class="dc-composer" @submit.prevent="send">
                                <ul v-if="suggest.length" class="dc-suggest">
                                    <li class="dc-suggest-head">{{ suggestKind === 'emoji' ? 'Emoji' : suggestKind === 'command' ? 'Commands' : 'Members' }}</li>
                                    <li
                                        v-for="(item, i) in suggest"
                                        :key="item.name"
                                        :class="{ active: i === suggestIndex }"
                                        @mousedown.prevent="pickSuggest(item)"
                                    >
                                        <span v-if="item.cmd" class="dc-cmd-icon" :class="{ casino: item.bot === 'a101 Casino' }" :title="item.bot">{{ item.bot === 'a101 Casino' ? '\u{1F3B0}' : '\u{1F916}' }}</span>
                                        <img v-else-if="item.src" class="dc-emoji" :src="item.src" alt="">
                                        <Avatar v-else class="dc-avatar-xs" :name="item.name" :src="avatarSrc(item.name)"></Avatar>
                                        {{ item.cmd ? '/' + item.name : item.src ? ':' + item.name + ':' : item.name }} <small v-if="item.desc" class="dc-cmd-desc">{{ item.desc }}</small><small v-if="item.bot" class="dc-cmd-bot" :class="{ casino: item.bot === 'a101 Casino' }">{{ item.bot }}</small>
                                    </li>
                                </ul>
                                <button type="button" class="dc-attach" title="Share an image or video" @click="$refs.file.click()">+</button>
                                <input ref="file" type="file" accept="image/*,video/mp4,video/webm,video/quicktime" hidden @change="onFile">
                                <input
                                    ref="input"
                                    class="dc-text"
                                    type="text"
                                    v-model="text"
                                    :maxlength="maxText"
                                    :placeholder="placeholder"
                                    autocomplete="off"
                                    @input="onInput"
                                    @click="onInput"
                                    @keydown="onKey"
                                    @blur="suggest = []"
                                    @paste="onPaste"
                                >
                                <span class="dc-count" :class="{ warn: text.length > maxText - 30 }" v-if="text.length > 0">{{ maxText - text.length }}</span>
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
                                <p v-if="registering" class="dc-hint">By creating an account you agree to the rules in <b>#rules</b> (or type <code>/rules</code> in chat).</p>
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
                                <template v-if="group.role === 'bots'">
                                    <div v-for="name in group.names" :key="name" class="dc-member dc-bot-member" :title="botInfo(name).desc">
                                        <div class="dc-avatar dc-avatar-sm dc-bot-avatar" :class="{ owo: name === 'a101 Casino' }">{{ botInfo(name).icon }}<span class="dc-status online"></span></div>
                                        <span class="dc-member-name dc-bot-name" :class="{ owo: name === 'a101 Casino' }">{{ name }}</span>
                                        <span class="dc-role bot">BOT</span>
                                    </div>
                                </template>
                                <template v-else>
                                    <button v-for="name in group.names" :key="name" type="button" class="dc-member" :class="{ offline: group.role === 'offline' }" @click="openProfile(name)">
                                        <Avatar class="dc-avatar-sm" :name="name" :src="avatarSrc(name)" :frame="frameOf(name)"><span class="dc-status" :class="statusOf(name)"></span></Avatar>
                                        <span class="dc-member-name" :class="nameClass(name)" :style="nameStyle(name)">{{ name }}</span>
                                    </button>
                                </template>
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
                    <div v-if="effectOf(card.username)" class="dc-fx"><span v-for="n in 9" :key="n" :style="fxStyle(n)">{{ effectOf(card.username) }}</span></div>
                    <div class="dc-card-banner" :class="{ animated: bannerAnimated(card) }" :style="bannerStyle(card)"><img v-if="bannerSrc(card)" class="dc-banner-img" :src="bannerSrc(card)" alt=""></div>
                    <Avatar class="dc-avatar-xl dc-card-avatar" :name="card.username" :src="avatarSrc(card.username)" :frame="frameOf(card.username)"><span class="dc-status big" :class="statusOf(card.username)"></span></Avatar>
                    <div class="dc-card-body">
                        <div class="dc-card-top">
                            <span class="dc-card-name" :class="nameClass(card.username)" :style="nameStyle(card.username)">{{ card.username }}</span>
                            <span v-if="card.pronouns" class="dc-card-pronouns">{{ card.pronouns }}</span>
                        </div>
                        <span v-if="card.role !== 'member'" class="dc-role first" :class="card.role">{{ roleLabel(card.role) }}</span>
                        <span v-else class="dc-role first member">Member</span>
                        <div v-if="titleOf(card.username)" class="dc-card-title">{{ titleOf(card.username) }}</div>
                        <div v-if="(card.badges || []).length || shopBadge(card.username)" class="dc-badges">
                            <span v-if="shopBadge(card.username)" class="dc-badge-pill" title="Bought in the Orb Shop"><i>{{ shopBadge(card.username).style.icon }}</i>{{ shopBadge(card.username).name }}</span>
                            <span v-for="b in card.badges" :key="b" class="dc-badge-pill" :title="badgeInfo(b).desc"><i>{{ badgeInfo(b).icon }}</i>{{ badgeInfo(b).label }}</span>
                        </div>
                        <p v-if="card.statusText" class="dc-card-status">{{ card.statusText }}</p>
                        <div class="dc-stats">
                            <div><b>&#128302; {{ card.orbs || 0 }}</b><small>Orbs</small></div>
                            <div><b>&#128172; {{ card.msgCount || 0 }}</b><small>Messages</small></div>
                            <div><b>&#129309; {{ card.friends || 0 }}</b><small>Friends</small></div>
                        </div>
                        <div class="dc-card-section">ABOUT ME</div>
                        <p class="dc-card-bio">{{ card.bio || 'This user has not written anything yet.' }}</p>
                        <div class="dc-card-section">MEMBER SINCE</div>
                        <p class="dc-card-bio">{{ formatDate(card.created) }}</p>
                        <div class="dc-card-actions">
                            <template v-if="username && card.username.toLowerCase() !== username.toLowerCase()">
                                <button type="button" class="dc-btn" @click="messageUser(card.username)">Send Message</button>
                                <button v-if="cardRelation === 'none'" type="button" class="dc-btn alt" @click="friendAct('request', card.username)">Add Friend</button>
                                <button v-else-if="cardRelation === 'incoming'" type="button" class="dc-btn alt" @click="friendAct('accept', card.username)">Accept Request</button>
                                <button v-else-if="cardRelation === 'outgoing'" type="button" class="dc-btn ghost" @click="friendAct('cancel', card.username)">Cancel Request</button>
                                <button v-else type="button" class="dc-btn ghost" @click="removeFriend(card.username)">Remove Friend</button>
                            </template>
                            <button v-if="username && card.username.toLowerCase() === username.toLowerCase()" type="button" class="dc-btn" @click="startEdit">Edit Profile</button>
                            <button v-if="username && card.username.toLowerCase() !== username.toLowerCase()" type="button" class="dc-btn alt" @click="giftOrbs(card.username)">&#127873; Gift orbs</button>
                            <button v-if="username && card.username.toLowerCase() !== username.toLowerCase()" type="button" class="dc-btn ghost" @click="toggleBlock(card.username)">{{ isBlocked(card.username) ? 'Unblock' : 'Block' }}</button>
                            <button v-if="role === 'a101' && username && card.username.toLowerCase() !== username.toLowerCase()" type="button" class="dc-btn nitro" @click="giftNitro(card.username)">&#9889; Gift Nitro</button>
                            <select v-if="canModerate(card)" class="dc-mod-select" v-model="modPick" @change="modFromCard">
                                <option value="">Moderate...</option>
                                <option value="mute:10">Mute 10 minutes</option>
                                <option value="mute:60">Mute 1 hour</option>
                                <option value="mute:1440">Mute 1 day</option>
                                <option value="unmute">Unmute</option>
                                <option value="warn">Warn...</option>
                                <option value="ban">Ban...</option>
                                <option value="unban">Unban</option>
                            </select>
                            <button type="button" class="dc-btn ghost" @click="card = null">Close</button>
                        </div>
                        <p v-if="error" class="dc-error">{{ error }}</p>
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
                    <p class="dc-hint">{{ me && me.nitro ? 'Nitro: animated GIF or WebP pictures up to 1.5 MB keep their animation.' : 'A GIF becomes a still picture. Animated pictures need Nitro (see the Orb Shop).' }}</p>
                    <label>BANNER COLOR
                        <span class="dc-swatches">
                            <button v-for="(c, i) in banners" :key="c" type="button" class="dc-swatch" :class="{ active: draft.banner === i }" :style="{ background: c }" @click="draft.banner = i"></button>
                        </span>
                    </label>
                    <div class="dc-banner-edit">
                        <div class="dc-banner-preview" :style="{ height: (draft.bannerH || 96) + 'px', background: bannerColor(me) }">
                            <img v-if="draft.bannerPreview || (!draft.bannerRemove && bannerSrc(me))" :src="draft.bannerPreview || bannerSrc(me)" alt="">
                        </div>
                        <template v-if="me && me.plus">
                            <div class="dc-edit-actions">
                                <button type="button" class="dc-btn" @click="$refs.bannerFile.click()">Upload banner</button>
                                <button type="button" class="dc-btn ghost" @click="draft.bannerRemove = true; draft.bannerBlob = null; draft.bannerPreview = ''">Remove</button>
                                <input ref="bannerFile" type="file" accept="image/*" hidden @change="onBannerFile">
                            </div>
                            <label>BANNER HEIGHT: {{ draft.bannerH || 96 }}px
                                <input type="range" min="80" max="260" step="4" :value="draft.bannerH || 96" @input="draft.bannerH = Number($event.target.value)">
                            </label>
                            <p class="dc-hint">Nitro Plus: upload a JPEG, PNG, WebP or GIF (up to 1.9 MB) and pick how tall it is.</p>
                        </template>
                        <p v-else class="dc-hint">&#128081; Nitro Plus lets you upload your own banner (GIFs too) and set its height. See the Orb Shop.</p>
                    </div>
                    <label>PRONOUNS
                        <input type="text" v-model="draft.pronouns" maxlength="20" placeholder="e.g. they/them">
                    </label>
                    <label>CUSTOM STATUS
                        <input type="text" v-model="draft.statusText" maxlength="40" placeholder="What are you up to?">
                    </label>
                    <label>ABOUT ME
                        <textarea v-model="draft.bio" maxlength="190" rows="4" placeholder="Tell people about yourself"></textarea>
                        <small>{{ 190 - draft.bio.length }} characters left</small>
                    </label>
                    <label class="dc-check"><input type="checkbox" v-model="draft.dmFriendsOnly"> Only friends can send me direct messages</label>
                    <p v-if="error" class="dc-error">{{ error }}</p>
                    <div class="dc-card-actions">
                        <button type="submit" class="dc-btn" :disabled="busy">Save</button>
                        <button type="button" class="dc-btn ghost" @click="editing = false">Cancel</button>
                    </div>
                </form>
            </div>

            <div v-if="newDm" class="dc-modal" @click.self="newDm = false">
                <div class="dc-card dc-edit">
                    <h3>{{ dialogMode === 'add' ? 'Add people' : 'New Message' }}</h3>
                    <p class="dc-hint">{{ dialogMode === 'add' ? 'Pick people to add to this group.' : 'Pick one person for a direct message, or several to start a group chat.' }}</p>
                    <div v-if="picked.length" class="dc-chips">
                        <button v-for="u in picked" :key="u" type="button" class="dc-chip" @click="picked = picked.filter((x) => x !== u)">{{ u }} &#10005;</button>
                    </div>
                    <input class="dc-dm-search" type="text" v-model="dmSearch" maxlength="20" placeholder="Search for a username" @input="searchDm" ref="dmInput">
                    <div class="dc-dm-results">
                        <button v-for="u in dmResults" :key="u" type="button" class="dc-member" @click="pickUser(u)">
                            <Avatar class="dc-avatar-sm" :name="u" :src="avatarSrc(u)"></Avatar>
                            <span class="dc-member-name">{{ u }}</span>
                        </button>
                        <p v-if="dmSearch && !dmResults.length" class="dc-members-empty">No users found.</p>
                    </div>
                    <input v-if="dialogMode === 'new' && picked.length > 1" class="dc-dm-search" type="text" v-model="groupName" maxlength="30" placeholder="Group name (optional)">
                    <p v-if="error" class="dc-error">{{ error }}</p>
                    <div class="dc-card-actions">
                        <button type="button" class="dc-btn" :disabled="!picked.length || busy" @click="confirmDialog">{{ dialogMode === 'add' ? 'Add' : picked.length > 1 ? 'Create Group' : 'Open Chat' }}</button>
                        <button type="button" class="dc-btn ghost" @click="newDm = false">Cancel</button>
                    </div>
                </div>
            </div>

            <div v-if="inviteOpen" class="dc-modal" @click.self="inviteOpen = false">
                <div class="dc-card dc-edit">
                    <h3>&#128140; Invite friends</h3>
                    <p class="dc-hint">Share your link. When someone signs up with it and sends {{ 5 }} messages, you get <b>&#128302; 10 orbs</b> (up to 20 invites).</p>
                    <input class="dc-dm-search" type="text" readonly :value="inviteLink" @focus="$event.target.select()">
                    <p class="dc-hint">People you have invited: <b>{{ (me && me.invited) || 0 }}</b></p>
                    <div class="dc-card-actions">
                        <button type="button" class="dc-btn alt" @click="copyInvite">{{ inviteCopied ? 'Copied!' : 'Copy link' }}</button>
                        <button type="button" class="dc-btn ghost" @click="inviteOpen = false">Close</button>
                    </div>
                </div>
            </div>

            <input ref="submitFile" type="file" accept="image/png,image/jpeg,image/webp,image/gif,video/mp4,video/webm" hidden @change="onSubmitFile">

            <div v-if="notice" class="dc-modal">
                <div class="dc-card dc-edit">
                    <h3>&#9888;&#65039; You received a warning</h3>
                    <p class="dc-hint">From <b>{{ notice.by }}</b>: {{ notice.reason }}</p>
                    <p class="dc-hint">Please follow the chat rules. More warnings can lead to a mute or a ban.</p>
                    <div class="dc-card-actions"><button type="button" class="dc-btn" @click="ackNotice">I understand</button></div>
                </div>
            </div>

            <div v-if="modOpen" class="dc-modal" @click.self="modOpen = false">
                <div class="dc-card dc-shop dc-mod">
                    <div class="dc-shop-head"><h3>&#128737;&#65039; Moderation</h3></div>
                    <div class="dc-shop-tabs">
                        <button v-for="t in modTabs" :key="t.id" type="button" :class="{ active: modTab === t.id }" @click="modTab = t.id">{{ t.label }}<span v-if="t.id === 'reports' && modData && modData.reports.length" class="dc-badge">{{ modData.reports.length }}</span></button>
                    </div>
                    <div v-if="modData && modTab === 'reports'" class="dc-mod-list">
                        <div v-for="r in modData.reports" :key="r.id" class="dc-report">
                            <div><b>{{ r.target }}</b> in {{ r.where }} <small>reported by {{ r.reporter }} &middot; {{ stamp(r.time) }}</small></div>
                            <p>&ldquo;{{ r.text || '(no text)' }}&rdquo;</p>
                            <small v-if="r.reason">Reason: {{ r.reason }}</small>
                            <div class="dc-card-actions">
                                <button type="button" class="dc-btn ghost" @click="openProfile(r.target)">View user</button>
                                <button type="button" class="dc-btn alt" @click="modAct({ action: 'resolve', id: r.id })">Resolve</button>
                            </div>
                        </div>
                        <p v-if="!modData.reports.length" class="dc-members-empty">No open reports.</p>
                    </div>
                    <div v-else-if="modData && modTab === 'people'" class="dc-mod-list">
                        <p class="dc-cat">Muted &mdash; {{ modData.muted.length }}</p>
                        <div v-for="m in modData.muted" :key="'m' + m.user" class="dc-report">
                            <div><b>{{ m.user }}</b> <small>until {{ stamp(m.until) }}</small></div>
                            <small v-if="m.reason">{{ m.reason }}</small>
                            <button type="button" class="dc-btn ghost" @click="modAct({ action: 'unmute', user: m.user })">Unmute</button>
                        </div>
                        <p class="dc-cat">Banned &mdash; {{ modData.banned.length }}</p>
                        <div v-for="b in modData.banned" :key="'b' + b.user" class="dc-report">
                            <div><b>{{ b.user }}</b> <small>by {{ b.by }} &middot; {{ stamp(b.time) }}</small></div>
                            <small v-if="b.reason">{{ b.reason }}</small>
                            <button type="button" class="dc-btn ghost" @click="modAct({ action: 'unban', user: b.user })">Unban</button>
                        </div>
                        <p v-if="!modData.muted.length && !modData.banned.length" class="dc-members-empty">Nobody is muted or banned.</p>
                    </div>
                    <div v-else-if="modData && modTab === 'log'" class="dc-mod-list">
                        <div v-for="(l, i) in modData.log" :key="i" class="dc-log"><b>{{ l.by }}</b> {{ l.action }} <b>{{ l.user }}</b> <small>{{ stamp(l.time) }}<template v-if="l.reason"> &middot; {{ l.reason }}</template></small></div>
                        <p v-if="!modData.log.length" class="dc-members-empty">Nothing yet.</p>
                    </div>
                    <div v-else-if="modData && modTab === 'assets'" class="dc-mod-list">
                        <p class="dc-cat">Waiting for review &mdash; {{ (modData.submissions || []).length }}</p>
                        <div v-for="s in modData.submissions" :key="s.id" class="dc-report dc-asset">
                            <video v-if="s.video" :src="assetUrl(s.id)" autoplay loop muted playsinline></video>
                            <img v-else :src="assetUrl(s.id)" alt="">
                            <div class="dc-asset-info"><b>{{ s.kind === 'emoji' ? ':' + s.name + ':' : s.name }}</b><small>{{ s.kind }} by {{ s.by }}</small></div>
                            <button type="button" class="dc-btn alt" @click="modAct({ action: 'asset-approve', id: s.id, name: s.name })">Approve</button>
                            <button type="button" class="dc-btn ghost" @click="modAct({ action: 'asset-reject', id: s.id, name: s.name })">Reject</button>
                        </div>
                        <p v-if="!(modData.submissions || []).length" class="dc-members-empty">Nothing waiting.</p>
                        <p class="dc-cat">Approved &mdash; {{ (modData.community || []).length }}</p>
                        <div v-for="s in modData.community" :key="s.id" class="dc-report dc-asset">
                            <video v-if="s.video" :src="assetUrl(s.id)" autoplay loop muted playsinline></video>
                            <img v-else :src="assetUrl(s.id)" alt="">
                            <div class="dc-asset-info"><b>{{ s.kind === 'emoji' ? ':' + s.name + ':' : s.name }}</b><small>{{ s.kind }} by {{ s.by }}</small></div>
                            <button type="button" class="dc-btn ghost" @click="modAct({ action: 'asset-remove', id: s.id, name: s.name })">Remove</button>
                        </div>
                    </div>
                    <div v-else-if="modTab === 'bot'" class="dc-mod-list">
                        <p class="dc-hint">The bot answers slash commands. Add your own, like <code>/rules</code>. Built in: {{ botCommands.builtin.map((c) => '/' + c).join(', ') }}</p>
                        <form class="dc-bot-form" @submit.prevent="addBotCommand">
                            <input type="text" v-model="botName" maxlength="21" placeholder="command, e.g. rules">
                            <input type="text" v-model="botReply" maxlength="300" placeholder="what the bot replies">
                            <button type="submit" class="dc-btn alt" :disabled="!botName.trim() || !botReply.trim()">Add</button>
                        </form>
                        <div v-for="c in botCommands.custom" :key="c.name" class="dc-report">
                            <div><b>/{{ c.name }}</b></div>
                            <p>{{ c.reply }}</p>
                            <button type="button" class="dc-btn ghost" @click="removeBotCommand(c.name)">Remove</button>
                        </div>
                        <p v-if="!botCommands.custom.length" class="dc-members-empty">No custom commands yet.</p>
                    </div>
                    <p v-else class="dc-members-empty">Loading...</p>
                    <p v-if="error" class="dc-error">{{ error }}</p>
                    <div class="dc-card-actions"><button type="button" class="dc-btn ghost" @click="modOpen = false">Close</button></div>
                </div>
            </div>

            <div v-if="tasksOpen" class="dc-modal" @click.self="tasksOpen = false">
                <div class="dc-card dc-shop dc-tasks">
                    <div class="dc-shop-head">
                        <h3>&#128203; Orb Tasks</h3>
                        <span class="dc-balance">&#128302; {{ (me && me.orbs) || 0 }}</span>
                    </div>
                    <div v-if="tasks" class="dc-task-list">
                        <div v-if="tasks.bonus" class="dc-bonus">
                            <div>
                                <b>&#128293; Daily bonus</b>
                                <small>{{ tasks.bonus.streak ? tasks.bonus.streak + ' day streak' : 'Start a streak today' }}</small>
                            </div>
                            <button type="button" class="dc-btn alt" :disabled="!tasks.bonus.claimable || busy" @click="claimDaily">{{ tasks.bonus.claimable ? '&#128302; +' + tasks.bonus.reward : 'Come back tomorrow' }}</button>
                        </div>
                        <p class="dc-cat">Daily tasks &mdash; resets in {{ resetIn }}</p>
                        <div v-for="t in tasks.daily" :key="t.id" class="dc-task" :class="{ done: t.progress >= t.goal, claimed: t.claimed }">
                            <div class="dc-task-info">
                                <b>{{ t.name }}</b>
                                <small>{{ t.desc }}</small>
                                <div class="dc-progress"><div :style="{ width: (t.progress / t.goal * 100) + '%' }"></div></div>
                            </div>
                            <span class="dc-task-count">{{ t.progress }}/{{ t.goal }}</span>
                            <button v-if="t.claimed" type="button" class="dc-btn ghost" disabled>Claimed</button>
                            <button v-else type="button" class="dc-btn alt" :disabled="t.progress < t.goal || busy" @click="claimTask(t)">&#128302; +{{ t.reward }}</button>
                        </div>
                        <p class="dc-cat">Achievements</p>
                        <div v-for="t in tasks.achievements" :key="t.id" class="dc-task" :class="{ done: t.progress >= t.goal, claimed: t.claimed }">
                            <div class="dc-task-info">
                                <b>{{ t.name }}</b>
                                <small>{{ t.desc }}</small>
                                <div class="dc-progress"><div :style="{ width: (t.progress / t.goal * 100) + '%' }"></div></div>
                            </div>
                            <span class="dc-task-count">{{ t.progress }}/{{ t.goal }}</span>
                            <button v-if="t.claimed" type="button" class="dc-btn ghost" disabled>Claimed</button>
                            <button v-else type="button" class="dc-btn alt" :disabled="t.progress < t.goal || busy" @click="claimTask(t)">&#128302; +{{ t.reward }}</button>
                        </div>
                    </div>
                    <p v-else class="dc-members-empty">Loading...</p>
                    <p v-if="error" class="dc-error">{{ error }}</p>
                    <div class="dc-card-actions"><button type="button" class="dc-btn ghost" @click="tasksOpen = false">Close</button></div>
                </div>
            </div>

            <div v-if="shopOpen" class="dc-modal" @click.self="shopOpen = false">
                <div class="dc-card dc-shop">
                    <div class="dc-shop-head">
                        <h3>&#128722; Orb Shop</h3>
                        <span class="dc-balance">&#128302; {{ shop.orbs || 0 }}</span>
                    </div>
                    <div class="dc-shop-tabs">
                        <button v-for="t in shopTabs" :key="t.id" type="button" :class="{ active: shopTab === t.id }" @click="shopTab = t.id; error = ''">{{ t.label }}</button>
                    </div>

                    <div v-if="shopTab === 'nitro'" class="dc-nitro">
                        <div class="dc-nitro-hero">
                            <span class="dc-nitro-bolt">&#9889;</span>
                            <div>
                                <b>a101 Nitro</b>
                                <small v-if="shop.lifetime">You have Nitro forever as the owner.</small>
                                <small v-else-if="shop.nitroActive">Active until {{ formatDate(shop.nitroUntil) }}</small>
                                <small v-else>Not active</small>
                            </div>
                        </div>
                        <ul class="dc-perks">
                            <li>&#127912; <b>Animated profile pictures</b> (GIF or animated WebP, up to 1.5 MB)</li>
                            <li>&#128302; <b>Double orbs</b> from every message ({{ shop.nitro.orbsPerMessage }} instead of 1)</li>
                            <li>&#128172; <b>500-character messages</b> instead of 300</li>
                            <li>&#128247; <b>Bigger image uploads</b> (1.5 MB instead of 500 KB)</li>
                            <li>&#10024; <b>Nitro-only</b> animated name colours, frames and banners</li>
                            <li>&#9889; A <b>Nitro badge</b> on your profile</li>
                        </ul>
                        <button v-if="!shop.lifetime" type="button" class="dc-btn nitro" :disabled="busy || (shop.orbs || 0) < shop.nitro.price" @click="buyNitro">
                            {{ shop.nitroActive ? 'Add' : 'Get' }} {{ shop.nitro.days }} days of Nitro &mdash; &#128302; {{ shop.nitro.price }}
                        </button>
                        <p v-if="!shop.lifetime && (shop.orbs || 0) < shop.nitro.price" class="dc-hint">You need {{ shop.nitro.price - (shop.orbs || 0) }} more orbs. Send messages to earn them.</p>

                        <div class="dc-nitro-hero plus">
                            <span class="dc-nitro-bolt">&#128081;</span>
                            <div>
                                <b>a101 Nitro Plus</b>
                                <small v-if="shop.lifetime">You have Nitro Plus forever as the owner.</small>
                                <small v-else-if="shop.plusActive">Active until {{ formatDate(shop.plusUntil) }}</small>
                                <small v-else>Not active</small>
                            </div>
                        </div>
                        <ul class="dc-perks">
                            <li>&#9889; <b>Everything in Nitro</b> (it includes it)</li>
                            <li>&#128444; <b>Upload your own banner</b> (GIF, PNG, JPEG, WebP up to 1.9 MB)</li>
                            <li>&#128208; <b>Custom banner size</b> (80 to 260 px tall)</li>
                            <li>&#128302; <b>Triple orbs</b> from every message ({{ shop.plus.orbsPerMessage }})</li>
                            <li>&#128172; <b>1000-character messages</b></li>
                            <li>&#128247; <b>Biggest uploads</b> (1.9 MB images and animated pictures)</li>
                            <li>&#128081; A golden <b>Plus badge</b></li>
                        </ul>
                        <button v-if="!shop.lifetime" type="button" class="dc-btn nitro" :disabled="busy || (shop.orbs || 0) < shop.plus.price" @click="buyPlus">
                            {{ shop.plusActive ? 'Add' : 'Get' }} {{ shop.plus.days }} days of Nitro Plus &mdash; &#128302; {{ shop.plus.price }}
                        </button>
                        <p v-if="!shop.lifetime && (shop.orbs || 0) < shop.plus.price" class="dc-hint">You need {{ shop.plus.price - (shop.orbs || 0) }} more orbs for Plus.</p>
                    </div>

                    <div v-else-if="shopTab === 'box'" class="dc-box">
                        <div class="dc-box-art">&#127873;</div>
                        <p>Open a <b>Lucky Box</b> for <b>&#128302; {{ shop.box.price }}</b> and get a random item you do not own yet. Cheaper items turn up more often.</p>
                        <button type="button" class="dc-btn alt" :disabled="busy || (shop.orbs || 0) < shop.box.price" @click="openBox">Open a box</button>
                        <div v-if="boxResult" class="dc-box-result">
                            <span>You got</span>
                            <b>{{ boxResult.name }}</b>
                            <small>{{ slotLabel(boxResult.slot) }}{{ boxResult.nitro ? ' &middot; Nitro' : '' }}</small>
                        </div>
                    </div>

                    <div v-else class="dc-shop-grid">
                        <div v-for="it in shopItems" :key="it.id" class="dc-item" :class="{ owned: isOwned(it), worn: isWorn(it) }">
                            <div class="dc-item-preview" :class="'slot-' + it.slot">
                                <span v-if="it.slot === 'nameColor'" class="dc-preview-name" :class="itemNameClass(it)" :style="itemNameStyle(it)">{{ username || 'Username' }}</span>
                                <Avatar v-else-if="it.slot === 'frame'" class="dc-avatar-sm" :name="username || 'U'" :src="avatarSrc(username)" :frame="it.id"></Avatar>
                                <span v-else-if="it.slot === 'badge'" class="dc-preview-badge">{{ it.style.icon }}</span>
                                <span v-else-if="it.slot === 'title'" class="dc-preview-title">{{ it.style.text }}</span>
                                <div v-else-if="it.slot === 'bubble'" class="dc-preview-bubble" :class="{ animated: it.style.animated }" :style="{ '--bubble': it.style.color }">Hello there!</div>
                                <div v-else-if="it.slot === 'effect'" class="dc-preview-fx"><span v-for="n in 5" :key="n" :style="fxStyle(n)">{{ it.style.emoji }}</span></div>
                                <div v-else class="dc-preview-banner" :class="{ animated: it.style && it.style.animated }" :style="{ background: it.style.background }"></div>
                            </div>
                            <div class="dc-item-name">{{ it.name }}<span v-if="it.nitro" class="dc-nitro-tag" title="Needs Nitro">&#9889;</span></div>
                            <button v-if="isWorn(it)" type="button" class="dc-btn ghost" @click="shopDo('unequip', it)">Unequip</button>
                            <button v-else-if="isOwned(it)" type="button" class="dc-btn" :disabled="it.nitro && !shop.nitroActive" @click="shopDo('equip', it)">{{ it.nitro && !shop.nitroActive ? 'Needs Nitro' : 'Equip' }}</button>
                            <button v-else type="button" class="dc-btn alt" :disabled="busy || (it.nitro && !shop.nitroActive) || (shop.orbs || 0) < it.price" @click="shopDo('buy', it)">{{ it.nitro && !shop.nitroActive ? 'Needs Nitro' : '&#128302; ' + it.price }}</button>
                        </div>
                    </div>
                    <p v-if="error" class="dc-error">{{ error }}</p>
                    <div class="dc-card-actions"><button type="button" class="dc-btn ghost" @click="shopOpen = false">Close</button></div>
                </div>
            </div>

            <div v-if="board" class="dc-modal" @click.self="board = null">
                <div class="dc-card dc-edit">
                    <h3>&#127942; Orb Leaderboard</h3>
                    <div class="dc-shop-tabs">
                        <button type="button" :class="{ active: boardType === 'week' }" @click="openBoard('week')">This week</button>
                        <button type="button" :class="{ active: boardType === 'all' }" @click="openBoard('all')">All time</button>
                    </div>
                    <p class="dc-hint">Orbs earned by chatting and finishing tasks. Gifts and shop spending do not count.</p>
                    <div v-for="(l, i) in board" :key="l.username" class="dc-leader">
                        <span class="dc-rank">{{ i + 1 }}</span>
                        <Avatar class="dc-avatar-sm" :name="l.username" :src="avatarSrc(l.username)"></Avatar>
                        <button type="button" class="dc-member-name dc-leader-name" @click="board = null; openProfile(l.username)">{{ l.username }}</button>
                        <b>&#128302; {{ l.orbs }}</b>
                    </div>
                    <p v-if="!board.length" class="dc-members-empty">Nobody has earned an orb yet.</p>
                    <div class="dc-card-actions"><button type="button" class="dc-btn ghost" @click="board = null">Close</button></div>
                </div>
            </div>
        </main>
    `,
    data() {
        const saved = load(CHANNEL_KEY);
        return {
            categories: CATEGORIES,
            banners: BANNERS,
            statusOptions: STATUS_MENU,
            shortStatus: { online: "Online", idle: "Idle", dnd: "DND", invisible: "Invisible" },
            view: "chat",
            channel: CHANNELS.some((c) => c.id === saved) ? saved : "general",
            dm: "",
            groupId: "",
            messages: [],
            version: 0,
            latest: {},
            mentionLatest: {},
            dms: [],
            dmLatest: {},
            groups: [],
            groupLatest: {},
            incomingSeen: 0,
            presence: {},
            friendData: { friends: [], incoming: [], outgoing: [] },
            friendTab: "online",
            friendName: "",
            friendMsg: "",
            friendMsgBad: false,
            muted: load(MUTE_KEY) === "1",
            statusMenu: false,
            orbPop: false,
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
            draft: { bio: "", pronouns: "", statusText: "", banner: -1, bannerH: 0, bannerBlob: null, bannerPreview: "", bannerRemove: false, dmFriendsOnly: false, blob: null, preview: "", remove: false },
            newDm: false,
            dialogMode: "new",
            dmSearch: "",
            dmResults: [],
            picked: [],
            groupName: "",
            board: null,
            shopOpen: false,
            shopTab: "nitro",
            shopTabs: [
                { id: "nitro", label: "\u26A1 Nitro" },
                { id: "nameColor", label: "Name colours" },
                { id: "frame", label: "Avatar frames" },
                { id: "banner", label: "Banners" },
                { id: "badge", label: "Badges" },
                { id: "title", label: "Titles" },
                { id: "bubble", label: "Bubbles" },
                { id: "effect", label: "Effects" },
                { id: "box", label: "\u{1F381} Lucky Box" },
            ],
            boxResult: null,
            tasks: null,
            tasksOpen: false,
            anims: {},
            revealed: {},
            animTick: 0,
            stickers: [],
            community: { stickers: [], emojis: [], gifs: [] },
            emojiCat: "custom",
            emojiCats: EMOJI_CATS,
            editingId: 0,
            editText: "",
            inviteOpen: false,
            inviteCopied: false,
            submitKind: "sticker",
            notifyOn: load("a101lr-chat-notify") === "1",
            typingNames: [],
            lastTyping: 0,
            replyTo: null,
            flashId: 0,
            searchOpen: false,
            searchQ: "",
            searchScope: "here",
            searchResults: [],
            searchBusy: false,
            levels: {},
            botCommands: { builtin: [], custom: [] },
            modOpen: false,
            modTab: "reports",
            modTabs: [
                { id: "reports", label: "Reports" },
                { id: "people", label: "Muted & banned" },
                { id: "assets", label: "Stickers & emoji" },
                { id: "log", label: "Log" },
                { id: "bot", label: "Bot commands" },
            ],
            modData: null,
            modPick: "",
            botName: "",
            botReply: "",
            notice: null,
            boardType: "week",
            shop: { items: [], box: { price: 25 }, nitro: { price: 500, days: 30, orbsPerMessage: 2 }, plus: { price: 1500, days: 30, orbsPerMessage: 3 }, plusActive: false, plusUntil: 0, orbs: 0, owned: [], equipped: {}, nitroActive: false, nitroUntil: 0, lifetime: false },
            orbGain: 1,
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
        myStatus() {
            return this.me?.chosenStatus || "online";
        },
        isMod() {
            return this.role === "a101" || this.role === "admin";
        },
        filteredStickers() {
            const q = this.pickerSearch.trim().toLowerCase();
            return this.allStickers.filter((s) => !q || s.name.toLowerCase().includes(q));
        },
        typingText() {
            const n = this.typingNames;
            if (n.length === 1) return `${n[0]} is typing...`;
            if (n.length === 2) return `${n[0]} and ${n[1]} are typing...`;
            return "Several people are typing...";
        },
        claimable() {
            if (!this.tasks) return 0;
            return [...this.tasks.daily, ...this.tasks.achievements].filter((t) => !t.claimed && t.progress >= t.goal).length;
        },
        resetIn() {
            const ms = Math.max(0, (this.tasks?.resetsAt || 0) - Date.now());
            const h = Math.floor(ms / 3600000);
            const m = Math.floor((ms % 3600000) / 60000);
            return h ? `${h}h ${m}m` : `${m}m`;
        },
        maxText() {
            return this.me?.plus ? 1000 : this.me?.nitro ? 500 : 300;
        },
        catalogById() {
            return Object.fromEntries(this.shop.items.map((i) => [i.id, i]));
        },
        shopItems() {
            return this.shop.items.filter((i) => i.slot === this.shopTab);
        },
        inConvo() {
            return !!(this.dm || this.groupId);
        },
        group() {
            return this.groups.find((g) => g.id === this.groupId) || null;
        },
        current() {
            return CHANNELS.find((c) => c.id === this.channel) || {};
        },
        topic() {
            return this.current.topic || "";
        },
        canPost() {
            if (!this.username) return false;
            return this.inConvo ? true : this.canPostIn(this.current);
        },
        placeholder() {
            if (this.groupId && this.group) return `Message ${this.groupLabel(this.group)}`;
            return this.dm ? `Message @${this.dm}` : `Message #${this.channel}`;
        },
        reactionPalette() {
            return [...REACTIONS, ...this.allEmojis.slice(0, 12).map((e) => `:${e.name}:`)];
        },
        allEmojis() {
            return [...this.emojis, ...this.community.emojis.map((e) => ({ name: e.name, src: this.assetUrl(e.id) }))];
        },
        allGifs() {
            return [...this.gifs, ...(this.community.gifs || []).map((g) => ({ name: g.name, file: g.id, video: !!g.video }))];
        },
        allStickers() {
            return [...this.stickers, ...this.community.stickers.map((s) => ({ name: s.name, file: s.id }))];
        },
        unicodeList() {
            return (UNICODE_EMOJI[this.emojiCat] || "").split(" ").filter(Boolean);
        },
        blockedNames() {
            return (this.me?.blocked || []).slice();
        },
        inviteLink() {
            return `${location.origin}/#/minigames/chat?ref=${encodeURIComponent(this.username)}`;
        },
        totalUnread() {
            let n = 0;
            for (const d of this.dmList) if (this.isDmUnread(d)) n += this.unreadCount(d.latest, `dm:${d.user.toLowerCase()}`);
            for (const g of this.groups) if (this.isGroupUnread(g)) n += this.unreadCount(g.latest, `g:${g.id}`);
            for (const c of Object.keys(this.mentionLatest)) if (this.isMentioned(c)) n += 1;
            return n;
        },
        emojiMap() {
            return Object.fromEntries(this.allEmojis.map((e) => [e.name, e.src]));
        },
        filteredGifs() {
            const q = this.pickerSearch.trim().toLowerCase();
            const favs = this.me?.favGifs || [];
            let list = this.allGifs.filter((g) => !q || g.name.toLowerCase().includes(q));
            if (this.picker === "fav") list = list.filter((g) => favs.includes(g.file));
            else list = [...list.filter((g) => favs.includes(g.file)), ...list.filter((g) => !favs.includes(g.file))];
            return list;
        },
        filteredEmojis() {
            const q = this.pickerSearch.trim().toLowerCase();
            return this.allEmojis.filter((e) => !q || e.name.toLowerCase().includes(q));
        },
        dmList() {
            const list = this.dms.map((d) => ({ ...d }));
            if (this.dm && !list.some((d) => d.user.toLowerCase() === this.dm.toLowerCase())) {
                list.unshift({ user: this.dm, latest: 0 });
            }
            return list;
        },
        shownFriends() {
            const all = this.friendData.friends;
            return this.friendTab === 'online' ? all.filter((f) => this.statusOf(f.user) !== 'offline') : all;
        },
        cardRelation() {
            return this.card ? this.relationTo(this.card.username) : "none";
        },
        grouped() {
            return this.messages.map((m, i) => {
                const prev = this.messages[i - 1];
                const cont = !!prev && prev.name === m.name && m.time - prev.time < GROUP_MS && !m.reactions;
                return { ...m, cont, hidden: this.isBlocked(m.name) };
            });
        },
        members() {
            const names = [];
            for (let i = this.messages.length - 1; i >= 0; i--) {
                const m = this.messages[i];
                if (!m.bot && !names.includes(m.name)) names.push(m.name);
            }
            return names;
        },
        memberGroups() {
            let pool;
            if (this.groupId && this.group) pool = [...this.group.members];
            else if (this.dm) pool = [this.username, this.dm].filter(Boolean);
            else {
                pool = [...Object.keys(this.presence).map((k) => this.presenceName[k] || k), ...this.members];
                if (this.username) pool.push(this.username);
            }
            const names = [...new Map(pool.map((n) => [n.toLowerCase(), n])).values()];
            const online = names.filter((n) => this.statusOf(n) !== "offline");
            const offline = names.filter((n) => this.statusOf(n) === "offline");
            const groups = ROLE_ORDER.map((role) => ({
                role,
                label: `${ROLE_LABEL[role].toUpperCase()}`,
                names: online.filter((n) => this.roleOfName(n) === role),
            })).filter((g) => g.names.length);
            if (!this.inConvo) groups.push({ role: "bots", label: "BOTS", names: BOT_MEMBERS.map((b) => b.name) });
            if (offline.length) groups.push({ role: "offline", label: "OFFLINE", names: offline });
            return groups;
        },
        scope() {
            if (this.groupId) return `group=${this.groupId}`;
            return this.dm ? `dm=${encodeURIComponent(this.dm)}` : `channel=${encodeURIComponent(this.channel)}`;
        },
        seenKey() {
            if (this.groupId) return `g:${this.groupId}`;
            return this.dm ? `dm:${this.dm.toLowerCase()}` : this.channel;
        },
    },
    async mounted() {
        if (location.hostname === "localhost" || location.hostname === "127.0.0.1") {
            // no Cloudflare here: run the Worker inside the page (see dev/local-api.js)
            try {
                await import("/dev/local-api.js");
            } catch (e) {
                console.warn("Local chat backend could not start", e);
            }
        }
        const manifest = (file) =>
            fetch(`/data/${file}.json`)
                .then((r) => (r.ok ? r.json() : []))
                .catch(() => []);
        manifest("_gifs").then((g) => (this.gifs = Array.isArray(g) ? g : []));
        manifest("_emojis").then((e) => (this.emojis = Array.isArray(e) ? e : []));
        manifest("_stickers").then((s) => (this.stickers = Array.isArray(s) ? s : []));
        this.loadCommunity();
        this.baseTitle = document.title;
        const ref = this.$route?.query?.ref;
        if (typeof ref === "string" && /^[A-Za-z0-9_]{3,20}$/.test(ref)) save("a101lr-chat-ref", ref);
        this.loadBotInfo();
        this.loadShop();
        if (this.token) await this.restoreSession();
        await this.poll();
        this.timer = setInterval(this.poll, POLL_MS);
        this.$refs.box.addEventListener("scroll", this.onScroll);
        document.addEventListener("click", this.closePops);
    },
    watch: {
        totalUnread(n) {
            document.title = `${n ? `(${n}) ` : ""}${this.baseTitle || "a101 List Reborn"}`;
        },
    },
    unmounted() {
        clearInterval(this.animTimer);
        if (this.baseTitle) document.title = this.baseTitle;
        clearInterval(this.timer);
        clearTimeout(this.suggestTimer);
        document.removeEventListener("click", this.closePops);
        this.clearPending();
    },
    created() {
        this.presenceName = {};
    },
    methods: {
        hue,
        formatDate: (ms) => (ms ? new Date(ms).toLocaleDateString() : "Unknown"),
        closePops() {
            this.reactFor = 0;
            this.statusMenu = false;
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
        statusLabel: (status) => STATUS_LABEL[status] || "Offline",
        badgeInfo: (id) => BADGES[id] || { icon: "", label: id, desc: "" },
        topBadges(name) {
            return (this.profileOf(name)?.badges || []).slice(0, 3);
        },
        bannerColor(profile) {
            return BANNERS[profile?.banner] || "#0b0b0d";
        },
        statusOf(name) {
            const lower = String(name).toLowerCase();
            if (this.username && lower === this.username.toLowerCase()) {
                return this.myStatus === "invisible" ? "offline" : this.myStatus;
            }
            return this.presence[lower] || "offline";
        },
        equippedItem(name, slot) {
            const id = this.profileOf(name)?.equipped?.[slot];
            return id ? this.catalogById[id] || null : null;
        },
        frameOf(name) {
            return this.equippedItem(name, "frame")?.id || "";
        },
        shopBadge(name) {
            return this.equippedItem(name, "badge");
        },
        titleOf(name) {
            return this.equippedItem(name, "title")?.style?.text || "";
        },
        effectOf(name) {
            return this.equippedItem(name, "effect")?.style?.emoji || "";
        },
        bubbleClass(name) {
            const item = this.equippedItem(name, "bubble");
            return item ? ["bubble", { "bubble-anim": !!item.style.animated }] : [];
        },
        bubbleStyle(name) {
            const item = this.equippedItem(name, "bubble");
            return item ? { "--bubble": item.style.color } : {};
        },
        fxStyle(n) {
            return {
                left: `${(n * 37) % 92}%`,
                animationDelay: `${(n * 0.43) % 3}s`,
                animationDuration: `${3 + (n % 3)}s`,
            };
        },
        slotLabel(slot) {
            return { nameColor: "Name colour", frame: "Avatar frame", banner: "Banner", badge: "Badge", title: "Title", bubble: "Chat bubble", effect: "Profile effect" }[slot] || slot;
        },
        itemNameStyle(item) {
            if (item.style?.gradient) return { backgroundImage: item.style.gradient };
            return item.style?.color ? { color: item.style.color } : {};
        },
        itemNameClass(item) {
            return item.style?.gradient ? { "dc-grad": true, animated: !!item.style.animated } : {};
        },
        nameClass(name) {
            const item = this.equippedItem(name, "nameColor");
            return item ? this.itemNameClass(item) : {};
        },
        bannerStyle(profile) {
            const item = this.equippedItem(profile?.username || "", "banner");
            const style = { background: item ? item.style.background : this.bannerColor(profile) };
            if (profile?.bannerH) style.height = `${profile.bannerH}px`;
            return style;
        },
        bannerSrc(profile) {
            return profile?.bannerImg ? `${API}/banner/${String(profile.username).toLowerCase()}?v=${profile.bannerImg}` : "";
        },
        bannerAnimated(profile) {
            return !!this.equippedItem(profile?.username || "", "banner")?.style?.animated;
        },
        nameStyle(name) {
            const item = this.equippedItem(name, "nameColor");
            if (item) return this.itemNameStyle(item);
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
        groupLabel(g) {
            if (g.name) return g.name;
            const others = g.members.filter((n) => n.toLowerCase() !== this.username.toLowerCase());
            return others.join(", ") || "Group";
        },
        time(ms) {
            return new Date(ms).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        },
        stamp(ms) {
            const today = new Date(ms).toDateString() === new Date().toDateString();
            return `${today ? "Today" : new Date(ms).toLocaleDateString()} at ${this.time(ms)}`;
        },
        isUnread(id) {
            return (this.inConvo || this.view !== "chat" || id !== this.channel) && (this.latest[id] || 0) > (this.seen[id] || 0);
        },
        isDmUnread(d) {
            const key = `dm:${d.user.toLowerCase()}`;
            const active = this.view === "chat" && this.dm.toLowerCase() === d.user.toLowerCase();
            return !active && d.latest > (this.seen[key] || 0);
        },
        isGroupUnread(g) {
            const active = this.view === "chat" && this.groupId === g.id;
            return !active && g.latest > (this.seen[`g:${g.id}`] || 0);
        },
        isMentioned(id) {
            return (this.inConvo || this.view !== "chat" || id !== this.channel) && (this.mentionLatest[id] || 0) > (this.seen[id] || 0);
        },
        toggleMute() {
            this.muted = !this.muted;
            save(MUTE_KEY, this.muted ? "1" : "");
            if (!this.muted && this.myStatus !== "dnd") playPing();
        },
        ping() {
            // Do Not Disturb silences everything
            if (!this.muted && this.myStatus !== "dnd") playPing();
        },
        mentionsMe(m) {
            return (
                !!this.username &&
                !this.isBlocked(m.name) &&
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
        gifUrl: (file) => (file.startsWith("u_") ? `/api/chat/asset/${file}` : `/assets/gifs/${file}`),
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
            return !this.inConvo && (this.role === "a101" || this.role === "admin");
        },
        async removeMessage(m) {
            if (!window.confirm("Delete this message? This can't be undone.")) return;
            await this.post(`${API}/delete`, { ...this.target(), id: m.id });
            await this.poll();
        },
        target() {
            if (this.groupId) return { group: this.groupId };
            return this.dm ? { dm: this.dm } : { channel: this.channel };
        },
        async post(url, body) {
            this.error = "";
            try {
                const res = await fetch(url, { method: "POST", headers: this.headers(), body: JSON.stringify(body) });
                const data = await res.json().catch(() => ({}));
                if (!res.ok) this.error = data.error || "Something went wrong.";
                return res.ok ? data : null;
            } catch {
                this.error = "Could not reach the chat.";
                return null;
            }
        },

        // ---------- profiles, status, orbs ----------
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
            if (this.username && this.profiles[this.username.toLowerCase()] && lower.includes(this.username.toLowerCase())) {
                this.me = { ...this.me, ...this.profiles[this.username.toLowerCase()] };
            }
        },
        async openProfile(name) {
            this.error = "";
            await this.ensureProfiles([name], true);
            this.card = this.profileOf(name) || { username: name, role: "member", bio: "", created: 0, badges: [] };
        },
        async setStatus(status) {
            this.statusMenu = false;
            const data = await this.post(`${AUTH}/profile`, { status });
            if (data) this.me = { ...this.me, ...data };
        },
        noteOrb(data) {
            const before = this.me?.orbs || 0;
            if (data?.orbs != null && this.me) this.me = { ...this.me, orbs: data.orbs };
            if (data?.orb) {
                this.orbGain = Math.max(1, (data.orbs || 0) - before);
                this.orbPop = true;
                setTimeout(() => (this.orbPop = false), 2200);
            }
        },
        // ---------- shop & nitro ----------
        async loadShop() {
            try {
                const res = await fetch(`${API}/shop`, { headers: this.headers() });
                if (!res.ok) return;
                this.shop = { ...this.shop, ...(await res.json()) };
                if (this.me && this.shop.orbs != null) this.me = { ...this.me, orbs: this.shop.orbs };
            } catch {}
        },
        async openShop(tab) {
            this.error = "";
            if (tab) this.shopTab = tab;
            this.shopOpen = true;
            this.card = null;
            this.editing = false;
            await this.loadShop();
        },
        isOwned(item) {
            return (this.shop.owned || []).includes(item.id);
        },
        isWorn(item) {
            return this.shop.equipped?.[item.slot] === item.id && (!item.nitro || this.shop.nitroActive);
        },
        async applyShopResult(data) {
            if (!data) return;
            if (data.profile) {
                this.me = { ...this.me, ...data.profile };
                this.profiles[this.username.toLowerCase()] = this.me;
            }
            await this.loadShop();
        },
        async shopDo(action, item) {
            this.busy = true;
            const body = action === "unequip" ? { action, slot: item.slot } : { action, item: item.id };
            await this.applyShopResult(await this.post(`${API}/shop`, body));
            this.busy = false;
        },
        async openBox() {
            this.busy = true;
            this.boxResult = null;
            const data = await this.post(`${API}/shop`, { action: "box" });
            if (data?.won) this.boxResult = data.won;
            await this.applyShopResult(data);
            this.busy = false;
        },
        async buyNitro() {
            this.busy = true;
            await this.applyShopResult(await this.post(`${API}/shop`, { action: "nitro" }));
            this.busy = false;
        },
        async buyPlus() {
            this.busy = true;
            await this.applyShopResult(await this.post(`${API}/shop`, { action: "plus" }));
            this.busy = false;
        },
        async giftNitro(name) {
            if (!window.confirm(`Gift 30 days of Nitro to ${name}?`)) return;
            const data = await this.post(`${API}/shop`, { action: "gift", user: name, days: 30 });
            if (data) await this.ensureProfiles([name], true), (this.card = this.profileOf(name) || this.card);
        },
        botInfo: (name) => BOT_MEMBERS.find((b) => b.name === name) || { icon: "", desc: "" },

        // ---------- command animations ----------
        animType(m) {
            if (!m.bot) return "";
            const text = m.text || "";
            if (m.name === "a101 Casino") {
                if (text.startsWith("\u{1FA99}")) return "coin";
                if (text.startsWith("\u{1F3A1}")) return "roulette";
                if (text.startsWith("\u{1F3B0}")) return "slots";
                if (text.startsWith("\u{1F3B2}")) return "dice";
                return "";
            }
            const cmd = m.replyTo?.text || "";
            if (/^\/flip/i.test(cmd)) return "coin";
            if (/^\/roll/i.test(cmd)) return "dice";
            if (/^\/8ball/i.test(cmd)) return "ball";
            return "";
        },
        startAnim(m) {
            if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
            const type = this.animType(m);
            if (!type) return;
            this.anims = { ...this.anims, [m.id]: { type } };
            if (!this.animTimer) this.animTimer = setInterval(() => (this.animTick += 1), 90);
            setTimeout(() => {
                const next = { ...this.anims };
                delete next[m.id];
                this.anims = next;
                this.revealed = { ...this.revealed, [m.id]: true };
                if (!Object.keys(next).length) {
                    clearInterval(this.animTimer);
                    this.animTimer = null;
                }
                setTimeout(() => {
                    const r = { ...this.revealed };
                    delete r[m.id];
                    this.revealed = r;
                }, 900);
                this.scrollDownIfNeeded();
            }, 1500);
        },
        scrollDownIfNeeded() {
            if (this.atBottom) this.scrollDown();
        },
        animLabel: (type) => ({ coin: "Flipping...", roulette: "The ball is rolling...", slots: "Spinning...", dice: "Rolling...", ball: "Shaking..." }[type] || ""),
        animGlyph(m) {
            const type = this.anims[m.id]?.type;
            const pick = (list, offset = 0) => list[Math.abs(this.animTick * 7 + m.id * 3 + offset * 5) % list.length];
            if (type === "slots") {
                const symbols = ["\u{1F352}", "\u{1F34B}", "\u{1F347}", "\u{1F514}", "\u{1F48E}", "7\uFE0F\u20E3"];
                return `${pick(symbols, 0)} ${pick(symbols, 1)} ${pick(symbols, 2)}`;
            }
            if (type === "dice") {
                const faces = ["\u2680", "\u2681", "\u2682", "\u2683", "\u2684", "\u2685"];
                return `${pick(faces, 0)} ${pick(faces, 1)}`;
            }
            if (type === "roulette") return `\u{1F3A1} ${Math.abs(this.animTick * 11 + m.id) % 37}`;
            if (type === "ball") return "\u{1F3B1}";
            return "\u{1FA99}";
        },

        // ---------- casino ----------
        bjTotal(cards) {
            let total = 0;
            let aces = 0;
            for (const c of cards) {
                const rank = c.slice(0, -1);
                if (rank === "A") {
                    total += 11;
                    aces++;
                } else total += ["J", "Q", "K"].includes(rank) ? 10 : Number(rank);
            }
            while (total > 21 && aces > 0) {
                total -= 10;
                aces--;
            }
            return total;
        },
        cardRed: (c) => c.endsWith("\u2665") || c.endsWith("\u2666"),
        bjExpired: (m) => Date.now() > m.bj.expires,
        bjResult(m) {
            const b = m.bj;
            if (b.status === "blackjack") return `\u{1F0CF} Blackjack! ${b.owner} wins ${b.payout - b.bet} orbs`;
            if (b.status === "won") return `${b.owner} wins ${b.payout - b.bet} orbs`;
            if (b.status === "push") return "Push. Bet returned.";
            if (b.status === "bust") return `Bust! ${b.owner} loses ${b.bet} orbs`;
            if (b.status === "lost") return `Dealer wins. ${b.owner} loses ${b.bet} orbs`;
            return "The hand timed out. Bet lost.";
        },
        async bjAct(m, action) {
            await this.post(`${API}/blackjack`, { id: m.id, action });
            await this.poll();
            setTimeout(() => this.ensureProfiles([this.username], true), 600);
        },
        duelExpired: (m) => Date.now() > m.duel.expires,
        duelResult(m) {
            const d = m.duel;
            if (d.status === "done") return `\u{1F3C6} ${d.winner} won ${d.amount - d.fee} orbs`;
            if (d.status === "declined") return `${d.to} declined`;
            if (d.status === "cancelled") return `${d.from} cancelled the duel`;
            if (d.status === "failed") return "Cancelled: someone did not have enough orbs";
            return "The duel ran out of time";
        },
        async duelAct(m, action) {
            await this.post(`${API}/duel`, { id: m.id, action });
            await this.poll();
            setTimeout(() => this.ensureProfiles([this.username], true), 600);
        },

        // ---------- polls, edits, blocking, community stickers, notifications ----------
        stickerUrl: (file) => (file.startsWith("u_") ? `/api/chat/asset/${file}` : `/assets/stickers/${file}`),
        assetUrl: (id) => `/api/chat/asset/${id}`,
        pollTotal: (m) => m.poll.votes.reduce((n, v) => n + v.length, 0),
        pollEnded: (m) => Date.now() > m.poll.ends,
        pollPct(m, i) {
            const total = this.pollTotal(m);
            return total ? Math.round((m.poll.votes[i].length / total) * 100) : 0;
        },
        iVoted(m, i) {
            return !!this.username && m.poll.votes[i].includes(this.username);
        },
        async votePoll(m, i) {
            await this.post(`${API}/vote`, { ...this.target(), id: m.id, option: i });
            await this.poll();
        },
        canEdit(m) {
            return !!this.username && !m.bot && m.name === this.username && Date.now() - m.time < 60 * 60 * 1000;
        },
        startEdit2(m) {
            this.editingId = m.id;
            this.editText = m.text || "";
            this.$nextTick(() => {
                const el = [].concat(this.$refs.editInput || [])[0];
                el?.focus();
            });
        },
        async saveEdit(m) {
            const text = this.editText.trim();
            if (text === (m.text || "").trim()) {
                this.editingId = 0;
                return;
            }
            const data = await this.post(`${API}/edit`, { ...this.target(), id: m.id, text });
            if (data) this.editingId = 0;
            await this.poll();
        },
        isBlocked(name) {
            return !!this.me && (this.me.blocked || []).includes(String(name).toLowerCase());
        },
        async toggleBlock(name) {
            const blocking = !this.isBlocked(name);
            if (blocking && !window.confirm(`Block ${name}? You will not see their messages and they cannot message you.`)) return;
            const data = await this.post(`${API}/block`, { action: blocking ? "block" : "unblock", user: name });
            if (data) {
                this.me = { ...this.me, blocked: data.blocked };
                if (blocking) await this.loadFriends();
            }
        },
        unreadCount(latest, key) {
            return Math.min(99, Math.max(1, latest - (this.seen[key] || 0)));
        },
        async toggleNotify() {
            if (!("Notification" in window)) {
                window.alert("This browser does not support desktop notifications.");
                return;
            }
            if (this.notifyOn) {
                this.notifyOn = false;
                save("a101lr-chat-notify", "");
                return;
            }
            const permission = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
            this.notifyOn = permission === "granted";
            save("a101lr-chat-notify", this.notifyOn ? "1" : "");
            if (!this.notifyOn) window.alert("Notifications are blocked. Allow them for this site in your browser settings.");
        },
        notifyDesktop(title, body) {
            if (!this.notifyOn || this.myStatus === "dnd" || document.hasFocus()) return;
            try {
                new Notification(title, { body, icon: "/osur.png", tag: "a101-chat" });
            } catch {}
        },
        async loadCommunity() {
            try {
                const res = await fetch(`${API}/community`, { cache: "no-store" });
                if (res.ok) this.community = await res.json();
            } catch {}
        },
        startSubmit(kind) {
            this.submitKind = kind;
            this.$refs.submitFile?.click();
        },
        async onSubmitFile(e) {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file) return;
            const kind = this.submitKind;
            const name = window.prompt(kind === "emoji" ? "Emoji name (letters, numbers and _ only):" : kind === "gif" ? "GIF name:" : "Sticker name:", "");
            if (!name || !name.trim()) return;
            this.error = "";
            try {
                const limit = kind === "emoji" ? 60 * 1024 : 250 * 1024;
                let blob = file;
                if (kind === "gif") {
                    if (!(file.type === "image/gif" || file.type.startsWith("video/"))) throw new Error("GIFs must be .gif, .mp4 or .webm files.");
                    if (file.size > 1536 * 1024) throw new Error(`That file is ${(file.size / 1048576).toFixed(1)} MB. GIFs can be up to 1.5 MB.`);
                } else if (file.type !== "image/gif" || file.size > limit) {
                    blob = await this.shrinkImage(file, kind === "emoji" ? 128 : 512, limit);
                }
                const res = await fetch(`${API}/submit?${new URLSearchParams({ kind, name: name.trim() })}`, {
                    method: "POST",
                    headers: this.token ? { authorization: `Bearer ${this.token}` } : {},
                    body: blob,
                });
                const data = await res.json().catch(() => ({}));
                if (!res.ok) throw new Error(data.error || "Could not submit that.");
                window.alert("Thanks! A moderator will review it before it shows up for everyone.");
            } catch (err) {
                this.error = err.message || "Could not submit that.";
            }
        },
        async shrinkImage(file, maxDim, maxBytes) {
            const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
            let scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
            for (let attempt = 0; attempt < 6; attempt++) {
                const canvas = document.createElement("canvas");
                canvas.width = Math.max(1, Math.round(bitmap.width * scale));
                canvas.height = Math.max(1, Math.round(bitmap.height * scale));
                canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
                for (const quality of [0.9, 0.75, 0.6]) {
                    const blob = await new Promise((r) => canvas.toBlob(r, WEBP ? "image/webp" : "image/png", quality));
                    if (blob && blob.size <= maxBytes) return blob;
                }
                scale *= 0.7;
            }
            throw new Error("That image is too big even after shrinking.");
        },
        async copyInvite() {
            try {
                await navigator.clipboard.writeText(this.inviteLink);
            } catch {
                document.querySelector(".dc-dm-search[readonly]")?.select();
                document.execCommand?.("copy");
            }
            this.inviteCopied = true;
            setTimeout(() => (this.inviteCopied = false), 2000);
        },

        // ---------- replies, search, stickers ----------
        startReply(m) {
            const label = m.text || (m.image ? "[image]" : m.video ? "[video]" : m.gif ? "[GIF]" : m.sticker ? "[sticker]" : "");
            this.replyTo = { id: m.id, name: m.name, text: label.replace(/\s+/g, " ").slice(0, 80) };
            this.$nextTick(() => this.$refs.input?.focus());
        },
        jumpTo(id) {
            const el = document.getElementById(`msg-${id}`);
            if (!el) return;
            el.scrollIntoView({ block: "center", behavior: "smooth" });
            this.flashId = id;
            setTimeout(() => (this.flashId = 0), 1600);
        },
        async sendSticker(s) {
            if (this.sending) return;
            this.picker = "";
            this.error = "";
            this.sending = true;
            try {
                const res = await fetch(API, {
                    method: "POST",
                    headers: this.headers(),
                    body: JSON.stringify({ ...this.target(), sticker: s.file, text: this.text.trim(), reply: this.replyTo?.id }),
                });
                const data = await res.json().catch(() => ({}));
                if (res.status === 401) {
                    this.expire(data.error);
                } else if (!res.ok) {
                    this.error = data.error || "Could not send sticker.";
                } else {
                    this.text = "";
                    this.replyTo = null;
                    this.atBottom = true;
                    this.noteOrb(data);
                    await this.poll();
                }
            } catch {
                this.error = "Could not reach the chat.";
            }
            this.sending = false;
        },
        openSearch() {
            this.searchOpen = !this.searchOpen;
            if (this.searchOpen) this.$nextTick(() => this.$refs.searchInput?.focus());
        },
        runSearch() {
            clearTimeout(this.searchTimer);
            const q = this.searchQ.trim().toLowerCase();
            if (q.length < 2) {
                this.searchResults = [];
                return;
            }
            if (this.searchScope === "here" || this.inConvo) {
                this.searchResults = this.messages
                    .filter((m) => (m.text || "").toLowerCase().includes(q) || m.name.toLowerCase().includes(q))
                    .slice(-30)
                    .reverse()
                    .map((m) => ({ channel: "", id: m.id, name: m.name, text: (m.text || "").slice(0, 200), time: m.time }));
                return;
            }
            this.searchBusy = true;
            this.searchTimer = setTimeout(async () => {
                try {
                    const res = await fetch(`${API}/search?q=${encodeURIComponent(q)}`, { headers: this.headers() });
                    const data = await res.json().catch(() => ({}));
                    this.searchResults = res.ok ? data.results : [];
                    if (!res.ok) this.error = data.error || "Search failed.";
                } catch {
                    this.searchResults = [];
                }
                this.searchBusy = false;
            }, 250);
        },
        async goToResult(r) {
            this.searchOpen = false;
            if (r.channel && (this.inConvo || r.channel !== this.channel)) await this.selectChannel(r.channel, true);
            this.$nextTick(() => setTimeout(() => this.jumpTo(r.id), 150));
        },

        // ---------- bot, level cards ----------
        async loadBotInfo() {
            try {
                const res = await fetch(`${API}/bot`);
                if (res.ok) this.botCommands = await res.json();
            } catch {}
        },
        listLabel: (list) => ({ main: "the Main list", aill: "AILL", atpll: "ATPLL" }[list] || list),
        listLink: (card) => `/#/${{ main: "", aill: "aill", atpll: "atpll" }[card.list] ?? ""}?level=${encodeURIComponent(card.path)}`,
        levelInfo(card) {
            return this.levels[card.path] || null;
        },
        async loadLevels(messages) {
            for (const m of messages) {
                const c = m.levelCard;
                if (!c || c.path in this.levels) continue;
                this.levels[c.path] = null;
                try {
                    const res = await fetch(`/data/${encodeURIComponent(c.path)}.json`);
                    if (!res.ok) continue;
                    const lv = await res.json();
                    const tier = this.levelTier(lv, c);
                    const id = youtubeId(lv.verification || "");
                    this.levels[c.path] = {
                        tier: `/assets/difficulty/${tier}.png`,
                        tierName: tier.split("-").map((w) => w[0].toUpperCase() + w.slice(1)).join(" "),
                        creators: (lv.creators && lv.creators.length ? lv.creators : [lv.author]).join(", "),
                        verifier: lv.verifier,
                        video: lv.verification,
                        thumb: id ? `https://img.youtube.com/vi/${id}/mqdefault.jpg` : "",
                    };
                } catch {}
            }
        },
        levelTier(lv, card) {
            const known = ["easy-hard", "easy-low", "easy-mid", "medium-low", "medium-mid", "medium-high", "hard-low", "hard-mid", "hard-high", "insane-low", "insane-mid", "insane-high", "extreme-low", "extreme-mid", "extreme-high", "not-humanly-possible", "not-humanly-possible-plus", "free-demon"];
            if (known.includes(lv.difficulty)) return lv.difficulty;
            const r = card.rank;
            if (card.list !== "main") return "extreme-high";
            if (r <= 1) return "extreme-low";
            if (r <= 25) return "insane-mid";
            if (r <= 40) return "hard-mid";
            if (r <= 55) return "medium-mid";
            return "easy-hard";
        },

        // ---------- moderation ----------
        async loadMod() {
            if (!this.isMod) return;
            try {
                const res = await fetch(`${API}/mod`, { headers: this.headers(), cache: "no-store" });
                if (res.ok) this.modData = await res.json();
            } catch {}
        },
        async openMod() {
            this.error = "";
            this.modOpen = true;
            await Promise.all([this.loadMod(), this.loadBotInfo()]);
        },
        async modActAsset(body) {
            return this.modAct(body);
        },
        async modAct(body) {
            const data = await this.post(`${API}/mod`, body);
            await this.loadMod();
            return data;
        },
        canModerate(card) {
            const rank = { member: 0, admin: 1, a101: 2 };
            return this.isMod && !!this.username && card.username.toLowerCase() !== this.username.toLowerCase() && rank[card.role || "member"] < rank[this.role];
        },
        async modFromCard() {
            const pick = this.modPick;
            this.modPick = "";
            if (!pick || !this.card) return;
            const user = this.card.username;
            const [action, minutes] = pick.split(":");
            let reason = "";
            if (["mute", "warn", "ban"].includes(action)) {
                reason = window.prompt(`${action === "mute" ? "Mute" : action === "warn" ? "Warn" : "Ban"} ${user} - reason:`, "");
                if (reason === null) return;
                if (action === "warn" && !reason.trim()) return;
            }
            const data = await this.modAct({ action, user, minutes: Number(minutes) || undefined, reason });
            if (data) window.alert(`Done: ${action} ${user}.`);
        },
        async reportMessage(m) {
            const reason = window.prompt("Why are you reporting this message? (optional)", "");
            if (reason === null) return;
            const data = await this.post(`${API}/report`, { ...this.target(), id: m.id, reason });
            if (data) window.alert("Thanks - the moderators will take a look.");
        },
        async ackNotice() {
            const id = this.notice?.id;
            this.notice = null;
            await this.post(`${API}/ack`, { id });
        },
        async addBotCommand() {
            const data = await this.post(`${API}/bot`, { action: "add", name: this.botName, reply: this.botReply });
            if (data) {
                this.botCommands = data;
                this.botName = "";
                this.botReply = "";
            }
        },
        async removeBotCommand(name) {
            const data = await this.post(`${API}/bot`, { action: "remove", name });
            if (data) this.botCommands = data;
        },

        // ---------- orb economy ----------
        async claimDaily() {
            this.busy = true;
            const data = await this.post(`${API}/orbs`, { action: "daily" });
            if (data) {
                this.me = { ...this.me, orbs: data.orbs };
                this.orbGain = data.reward;
                this.orbPop = true;
                setTimeout(() => (this.orbPop = false), 2200);
            }
            await this.loadTasks();
            this.busy = false;
        },
        async giftOrbs(name) {
            const answer = window.prompt(`How many orbs do you want to gift to ${name}? (1-100)`, "10");
            if (answer === null) return;
            const data = await this.post(`${API}/orbs`, { action: "gift", user: name, amount: Number(answer) });
            if (data) {
                this.me = { ...this.me, orbs: data.orbs };
                window.alert(`You gifted ${answer} orbs to ${data.to}!`);
            }
        },

        // ---------- orb tasks ----------
        async loadTasks() {
            if (!this.token) {
                this.tasks = null;
                return;
            }
            try {
                const res = await fetch(`${API}/tasks`, { headers: this.headers(), cache: "no-store" });
                if (res.ok) this.tasks = await res.json();
            } catch {}
        },
        async openTasks() {
            this.error = "";
            this.tasksOpen = true;
            await this.loadTasks();
        },
        async claimTask(task) {
            this.busy = true;
            const data = await this.post(`${API}/tasks`, { id: task.id });
            if (data) {
                this.me = { ...this.me, orbs: data.orbs };
                this.orbGain = data.reward;
                this.orbPop = true;
                setTimeout(() => (this.orbPop = false), 2200);
            }
            await this.loadTasks();
            this.busy = false;
        },
        async openBoard(type) {
            this.error = "";
            if (typeof type === "string") this.boardType = type;
            try {
                const res = await fetch(`${API}/leaderboard?type=${this.boardType}`);
                const leaders = res.ok ? (await res.json()).leaders : [];
                this.ensureProfiles(leaders.map((l) => l.username));
                this.board = leaders;
            } catch {
                this.board = [];
            }
        },
        startEdit() {
            this.card = null;
            this.error = "";
            const me = this.me || {};
            this.draft = {
                bio: me.bio || "",
                pronouns: me.pronouns || "",
                statusText: me.statusText || "",
                banner: Number.isInteger(me.banner) ? me.banner : -1,
                bannerH: me.bannerH || 0,
                bannerBlob: null,
                bannerPreview: "",
                bannerRemove: false,
                dmFriendsOnly: !!me.dmFriendsOnly,
                blob: null,
                preview: "",
                remove: false,
            };
            this.editing = true;
        },
        async onAvatarFile(e) {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file) return;
            try {
                // Nitro keeps GIF / animated WebP pictures as they are; everyone else gets a still crop
                const animatedType = file.type === "image/gif" || file.type === "image/webp";
                if (this.me?.nitro && animatedType && file.size > 1536 * 1024) {
                    this.error = `That picture is ${(file.size / 1048576).toFixed(1)} MB. Animated pictures can be up to 1.5 MB.`;
                    return;
                }
                if (this.me?.nitro && animatedType) {
                    if (this.draft.preview) URL.revokeObjectURL(this.draft.preview);
                    this.draft.blob = file;
                    this.draft.preview = URL.createObjectURL(file);
                    this.draft.remove = false;
                    this.error = "";
                    return;
                }
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
        onBannerFile(e) {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file) return;
            if (!/^image\//.test(file.type)) {
                this.error = "That is not an image.";
                return;
            }
            if (file.size > 1900 * 1024) {
                this.error = `That banner is ${(file.size / 1048576).toFixed(1)} MB. Banners can be up to 1.9 MB.`;
                return;
            }
            if (this.draft.bannerPreview) URL.revokeObjectURL(this.draft.bannerPreview);
            this.draft.bannerBlob = file;
            this.draft.bannerPreview = URL.createObjectURL(file);
            this.draft.bannerRemove = false;
            this.error = "";
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
                if (this.draft.bannerBlob) {
                    const res = await fetch(`${API}/banner`, { method: "POST", headers: auth, body: this.draft.bannerBlob });
                    const data = await res.json().catch(() => ({}));
                    if (!res.ok) throw new Error(data.error || "Could not upload the banner.");
                } else if (this.draft.bannerRemove) {
                    await fetch(`${API}/banner?remove=1`, { method: "POST", headers: auth });
                }
                const res = await fetch(`${AUTH}/profile`, {
                    method: "POST",
                    headers: this.headers(),
                    body: JSON.stringify({
                        bannerH: this.me?.plus ? this.draft.bannerH : undefined,
                        bio: this.draft.bio,
                        pronouns: this.draft.pronouns,
                        statusText: this.draft.statusText,
                        banner: this.draft.banner,
                        dmFriendsOnly: this.draft.dmFriendsOnly,
                    }),
                });
                const data = await res.json().catch(() => ({}));
                if (!res.ok) throw new Error(data.error || "Could not save your profile.");
                if (this.draft.preview) URL.revokeObjectURL(this.draft.preview);
                this.me = { ...this.me, ...data };
                this.profiles[this.username.toLowerCase()] = this.me;
                this.editing = false;
            } catch (e) {
                this.error = e.message || "Could not save your profile.";
            }
            this.busy = false;
        },

        // ---------- friends ----------
        relationTo(name) {
            const lower = String(name).toLowerCase();
            const has = (list) => list.some((f) => f.user.toLowerCase() === lower);
            if (has(this.friendData.friends)) return "friends";
            if (has(this.friendData.incoming)) return "incoming";
            if (has(this.friendData.outgoing)) return "outgoing";
            return "none";
        },
        async loadFriends() {
            if (!this.token) return;
            try {
                const res = await fetch(`${API}/friends`, { headers: this.headers() });
                if (!res.ok) return;
                this.friendData = await res.json();
                this.ensureProfiles(
                    [...this.friendData.friends, ...this.friendData.incoming, ...this.friendData.outgoing].map((f) => f.user),
                );
            } catch {}
        },
        async openFriends() {
            this.view = "friends";
            this.friendMsg = "";
            await this.loadFriends();
        },
        async friendAct(action, name) {
            const data = await this.post(`${API}/friends`, { action, user: name });
            await this.loadFriends();
            if (data && this.card && this.card.username.toLowerCase() === name.toLowerCase()) {
                await this.ensureProfiles([name], true);
                this.card = this.profileOf(name) || this.card;
            }
            return data;
        },
        async removeFriend(name) {
            if (!window.confirm(`Remove ${name} from your friends?`)) return;
            await this.friendAct("remove", name);
        },
        async sendFriendRequest() {
            const name = this.friendName.trim();
            if (!name) return;
            const data = await this.friendAct("request", name);
            this.friendMsgBad = !data;
            this.friendMsg = data
                ? data.relation === "friends"
                    ? `You and ${name} are now friends!`
                    : `Friend request sent to ${name}.`
                : this.error;
            if (data) this.friendName = "";
            this.error = "";
        },

        // ---------- conversations ----------
        openNewDm(mode) {
            this.newDm = true;
            this.dialogMode = mode;
            this.dmSearch = "";
            this.dmResults = [];
            this.picked = [];
            this.groupName = "";
            this.error = "";
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
                    const skip = new Set([this.username.toLowerCase(), ...this.picked.map((p) => p.toLowerCase())]);
                    if (this.dialogMode === "add" && this.group) this.group.members.forEach((m) => skip.add(m.toLowerCase()));
                    this.dmResults = (await res.json()).users.filter((u) => !skip.has(u.toLowerCase()));
                    this.ensureProfiles(this.dmResults);
                } catch {}
            }, 200);
        },
        pickUser(name) {
            if (!this.picked.includes(name) && this.picked.length < 9) this.picked.push(name);
            this.dmSearch = "";
            this.dmResults = [];
            this.$nextTick(() => this.$refs.dmInput?.focus());
        },
        async confirmDialog() {
            if (!this.picked.length) return;
            this.busy = true;
            this.error = "";
            if (this.dialogMode === "add") {
                const data = await this.post(`${API}/groups`, { action: "add", id: this.groupId, members: this.picked });
                if (data) {
                    this.newDm = false;
                    await this.poll();
                }
            } else if (this.picked.length === 1) {
                this.newDm = false;
                await this.openDm(this.picked[0]);
            } else {
                const data = await this.post(`${API}/groups`, {
                    action: "create",
                    name: this.groupName,
                    members: this.picked,
                });
                if (data?.group) {
                    this.newDm = false;
                    await this.poll();
                    await this.openGroup(data.group.id);
                }
            }
            this.busy = false;
        },
        async renameGroup() {
            const name = window.prompt("Group name", this.group?.name || "");
            if (name === null) return;
            await this.post(`${API}/groups`, { action: "rename", id: this.groupId, name });
            await this.poll();
        },
        async leaveGroup() {
            if (!window.confirm("Leave this group chat?")) return;
            const id = this.groupId;
            const data = await this.post(`${API}/groups`, { action: "leave", id });
            if (data) {
                this.groups = this.groups.filter((g) => g.id !== id);
                await this.selectChannel(this.channel, true);
            }
        },
        async messageUser(name) {
            this.card = null;
            this.newDm = false;
            await this.openDm(name);
        },
        async openDm(name) {
            if (!this.username) return;
            this.view = "chat";
            if (this.dm.toLowerCase() === name.toLowerCase() && !this.groupId) return;
            this.dm = name;
            this.groupId = "";
            this.resetConversation();
            await this.poll();
        },
        async openGroup(id) {
            this.view = "chat";
            if (this.groupId === id) return;
            this.groupId = id;
            this.dm = "";
            this.resetConversation();
            await this.poll();
        },
        async selectChannel(id, force = false) {
            this.view = "chat";
            if (!force && !this.inConvo && id === this.channel) return;
            this.channel = id;
            this.dm = "";
            this.groupId = "";
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
            this.typingNames = [];
            this.replyTo = null;
            this.searchOpen = false;
            this.atBottom = true;
        },

        // ---------- composer: mentions + emoji autocomplete ----------
        insertMention(tag) {
            if (!this.canPost) return;
            this.text = `${this.text}${this.text && !this.text.endsWith(" ") ? " " : ""}${tag} `.slice(0, this.maxText);
            this.$nextTick(() => this.$refs.input?.focus());
        },
        onInput() {
            const input = this.$refs.input;
            if (!input) return;
            const before = this.text.slice(0, input.selectionStart ?? this.text.length);
            clearTimeout(this.suggestTimer);

            if (this.canPost && this.text.trim() && !this.text.startsWith("/") && Date.now() - this.lastTyping > 3000) {
                this.lastTyping = Date.now();
                fetch(`${API}/typing`, { method: "POST", headers: this.headers(), body: JSON.stringify(this.target()) }).catch(() => {});
            }

            const slash = !this.inConvo && /^\/([a-z0-9_]*)$/i.exec(this.text);
            if (slash) {
                const q = slash[1].toLowerCase();
                const desc = {
                    help: "list every command",
                    rules: "show the chat rules",
                    poll: "make a poll: /poll question | a | b",
                    cf: "coinflip: /cf <bet>, win = 2x",
                    roulette: "/roulette <red|black|green|even|odd|0-36> <bet>",
                    slots: "spin the slots: /slots <bet>",
                    dice: "/dice <bet> <low|high|seven>",
                    blackjack: "play blackjack: /blackjack <bet>",
                    duel: "challenge someone: /duel @user <bet>",
                    accept: "accept a duel",
                    decline: "decline a duel",
                    bal: "see your orbs",
                    roll: "roll dice, e.g. /roll 2d6",
                    flip: "flip a coin (no bet)",
                    "8ball": "ask the magic 8 ball",
                    choose: "pick one: /choose a | b | c",
                    rank: "find a level on the lists",
                    level: "show a level card",
                    top: "top 5 of the main list",
                    orbs: "see someone's orbs",
                };                const all = [...this.botCommands.builtin.map((name) => ({ name, cmd: true, bot: botOf(name), desc: desc[name] || "" })), ...this.botCommands.custom.map((c) => ({ name: c.name, cmd: true, bot: "a101 Bot", desc: "custom: " + c.reply.slice(0, 40) }))];
                this.suggestKind = "command";
                this.suggestToken = { start: 0, end: this.text.length };
                this.suggest = all.filter((c) => c.name.startsWith(q));
                this.suggestIndex = 0;
                if (!this.suggest.length) this.suggestToken = null;
                return;
            }

            const emoji = before.match(/(^|\s):([A-Za-z0-9_]{2,32})$/);
            if (emoji) {
                const query = emoji[2].toLowerCase();
                this.suggestKind = "emoji";
                this.suggestToken = { start: before.length - query.length - 1, end: before.length };
                this.suggest = this.allEmojis
                    .filter((e) => e.name.toLowerCase().startsWith(query))
                    .slice(0, 6)
                    .map((e) => ({ name: e.name, src: e.src }));
                this.suggestIndex = 0;
                if (!this.suggest.length) this.suggestToken = null;
                return;
            }

            const match = this.inConvo ? null : before.match(/(^|\s)@([A-Za-z0-9_]{0,20})$/);
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
            } else if (e.key === "Enter" && this.suggestKind === "command") {
                this.suggest = [];
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
            const insert = this.suggestKind === "emoji" ? `:${item.name}: ` : this.suggestKind === "command" ? `/${item.name} ` : `@${item.name} `;
            this.text = `${this.text.slice(0, token.start)}${insert}${this.text.slice(token.end)}`.slice(0, this.maxText);
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
        insertUnicode(ch) {
            const space = this.text && !this.text.endsWith(" ") ? " " : "";
            this.text = `${this.text}${space === " " ? "" : ""}${ch}`.slice(0, this.maxText);
            this.$nextTick(() => this.$refs.input?.focus());
        },
        insertEmoji(e) {
            const space = this.text && !this.text.endsWith(" ") ? " " : "";
            this.text = `${this.text}${space}:${e.name}: `.slice(0, this.maxText);
            this.$nextTick(() => this.$refs.input?.focus());
        },
        isFav(g) {
            return (this.me?.favGifs || []).includes(g.file);
        },
        async toggleFav(g) {
            const current = this.me?.favGifs || [];
            const next = current.includes(g.file) ? current.filter((f) => f !== g.file) : [...current, g.file];
            this.me = { ...this.me, favGifs: next };
            const data = await this.post(`${AUTH}/profile`, { favGifs: next });
            if (data) this.me = { ...this.me, favGifs: data.favGifs || next };
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
                    body: JSON.stringify({ ...this.target(), gif: g.file, text: this.text.trim(), reply: this.replyTo?.id }),
                });
                const data = await res.json().catch(() => ({}));
                if (res.status === 401) {
                    this.expire(data.error);
                } else if (!res.ok) {
                    this.error = data.error || "Could not send GIF.";
                } else {
                    this.text = "";
                    this.atBottom = true;
                    this.noteOrb(data);
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
                    if (blob && blob.size <= (this.me?.plus ? 1800 * 1024 : this.me?.nitro ? 1400 * 1024 : MAX_IMAGE_BYTES)) {
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
            this.groupId = "";
            this.dms = [];
            this.groups = [];
            this.view = "chat";
            this.friendData = { friends: [], incoming: [], outgoing: [] };
            save(TOKEN_KEY, "");
            this.error = message || "Please log in again.";
        },
        async restoreSession() {
            try {
                const res = await fetch(`${AUTH}/me`, { headers: this.headers() });
                if (res.ok) {
                    this.me = await res.json();
                    this.profiles[this.me.username.toLowerCase()] = this.me;
                    this.loadFriends();
                    this.loadShop();
                    this.loadTasks();
                } else if (res.status === 401 || res.status === 403) {
                    const d = await res.json().catch(() => ({}));
                    this.token = "";
                    save(TOKEN_KEY, "");
                    if (res.status === 403) this.error = d.error || "This account can't be used.";
                }
            } catch {}
        },
        async authenticate() {
            this.error = "";
            this.busy = true;
            try {
                const payload = this.registering ? { ...this.form, ref: load("a101lr-chat-ref") } : this.form;
                const res = await fetch(`${AUTH}/${this.registering ? "register" : "login"}`, {
                    method: "POST",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify(payload),
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
                    this.loadFriends();
                    this.loadShop();
                    this.loadTasks();
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
            this.groups = [];
            this.friendData = { friends: [], incoming: [], outgoing: [] };
            this.view = "chat";
            save(TOKEN_KEY, "");
            this.shopOpen = false;
            this.tasksOpen = false;
            this.tasks = null;
            this.loadShop();
            if (this.inConvo) {
                this.dm = "";
                this.groupId = "";
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
                if (res.status === 401 && this.inConvo) {
                    this.expire("Log in to use direct messages.");
                    return;
                }
                if (res.status === 404 && this.groupId) {
                    // the group is gone (or we left it)
                    await this.selectChannel(this.channel, true);
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
                            (c) => (this.inConvo || c !== this.channel) && next[c] > (this.mentionLatest[c] || 0),
                        );
                        for (const d of s.dms || []) {
                            const active = this.dm.toLowerCase() === d.user.toLowerCase();
                            if (!active && d.latest > (this.dmLatest[d.user.toLowerCase()] || 0)) pinged = true;
                        }
                        for (const g of s.groups || []) {
                            if (g.id !== this.groupId && g.latest > (this.groupLatest[g.id] || 0)) pinged = true;
                        }
                        const dmUser = (s.dms || []).find((d) => this.dm.toLowerCase() !== d.user.toLowerCase() && d.latest > (this.dmLatest[d.user.toLowerCase()] || 0));
                        if (dmUser) this.notifyDesktop(`Message from ${dmUser.user}`, "Open the chat to read it.");
                        if ((s.incoming || []).length > this.incomingSeen) {
                            pinged = true;
                            this.loadFriends();
                        }
                    }
                    this.latest = s.latest || {};
                    this.mentionLatest = next;
                    this.dms = s.dms || [];
                    this.dmLatest = Object.fromEntries(this.dms.map((d) => [d.user.toLowerCase(), d.latest]));
                    this.groups = s.groups || [];
                    this.groupLatest = Object.fromEntries(this.groups.map((g) => [g.id, g.latest]));
                    this.incomingSeen = (s.incoming || []).length;
                    if (s.notice && !this.notice) this.notice = s.notice;
                    this.presence = Object.fromEntries((s.online || []).map((o) => [o.user.toLowerCase(), o.status]));
                    this.presenceName = Object.fromEntries((s.online || []).map((o) => [o.user.toLowerCase(), o.user]));
                }
                this.offline = false;
                if (scope !== this.scope) return;

                const known = new Set(this.messages.map((m) => m.id));
                const fresh = data.messages.filter((m) => !known.has(m.id));
                const animate = this.primed;
                if (this.primed && fresh.some((m) => this.mentionsMe(m) || (this.inConvo && m.name !== this.username))) {
                    pinged = true;
                }
                if (pinged) {
                    this.ping();
                    const hit = fresh.find((m) => this.mentionsMe(m) || (this.inConvo && m.name !== this.username));
                    this.notifyDesktop(hit ? (this.dm ? `Message from ${hit.name}` : `${hit.name} in ${this.groupId && this.group ? this.groupLabel(this.group) : "#" + this.channel}`) : "a101 chat", hit ? (hit.text || "sent something").slice(0, 120) : "You have a new message");
                }
                this.primed = true;

                const stick = this.atBottom;
                if (data.full) {
                    this.messages = data.messages.slice(-100);
                } else if (fresh.length) {
                    this.messages.push(...fresh);
                    this.messages = this.messages.slice(-100);
                }
                if (animate) fresh.forEach((m) => this.startAnim(m));
                this.version = data.version;
                this.typingNames = data.typing || [];
                if (data.full || fresh.length) {
                    this.loadLevels(this.messages);
                    if (stick) this.scrollDown();
                    this.scanEmbeds(this.messages);
                    this.ensureProfiles([...this.messages.map((m) => m.name), ...(this.dm ? [this.dm] : [])]);
                }
                this.ensureProfiles([...this.dms.map((d) => d.user), ...this.groups.flatMap((g) => g.members)]);
                this.pollCount++;
                if (this.username && this.pollCount % 4 === 0) this.loadTasks();
                if (this.isMod && this.pollCount % 6 === 0) this.loadMod();
                if (this.pollCount % 10 === 0) {
                    this.ensureProfiles(
                        [
                            ...new Set(this.messages.map((m) => m.name)),
                            ...this.dms.map((d) => d.user),
                            ...(this.username ? [this.username] : []),
                        ],
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
                const where = this.target();
                if (this.pending?.kind === "video") {
                    const query = new URLSearchParams({ ...where, text: this.text.trim(), ...(this.replyTo ? { reply: this.replyTo.id } : {}) });
                    this.uploadPct = 0;
                    res = await this.upload(`${API}/video?${query}`, this.pending.blob);
                } else if (this.pending) {
                    const { blob, w, h } = this.pending;
                    const query = new URLSearchParams({ ...where, text: this.text.trim(), w, h, ...(this.replyTo ? { reply: this.replyTo.id } : {}) });
                    res = await fetch(`${API}/image?${query}`, {
                        method: "POST",
                        headers: this.token ? { authorization: `Bearer ${this.token}` } : {},
                        body: blob,
                    });
                } else {
                    res = await fetch(API, {
                        method: "POST",
                        headers: this.headers(),
                        body: JSON.stringify({ ...where, text: this.text, reply: this.replyTo?.id }),
                    });
                }
                const data = await res.json().catch(() => ({}));
                if (res.status === 401) {
                    this.expire(data.error);
                } else if (!res.ok) {
                    this.error = data.error || "Could not send message.";
                } else {
                    const wasCommand = this.text.startsWith("/");
                    this.text = "";
                    this.replyTo = null;
                    this.clearPending();
                    this.atBottom = true;
                    this.noteOrb(data);
                    if (wasCommand) setTimeout(() => this.ensureProfiles([this.username], true), 900);
                    await this.poll();
                }
            } catch {
                this.error = "Could not reach the chat.";
            }
            this.uploadPct = null;
            this.sending = false;
        },
        upload(url, blob) {
            if (window.__devBackend) {
                // the local backend answers through fetch, which has no upload progress
                const headers = this.token ? { authorization: `Bearer ${this.token}` } : {};
                return fetch(url, { method: "POST", headers, body: blob });
            }
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
