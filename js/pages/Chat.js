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
                                <span v-if="isDmUnread(d)" class="dc-dot"></span>
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
                                <span v-if="isGroupUnread(g)" class="dc-dot"></span>
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
                    </header>
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
                                <div v-for="m in grouped" :key="m.id" class="dc-msg" :class="{ cont: m.cont, mine: m.name === username, mentioned: mentionsMe(m) }">
                                    <div class="dc-msg-tools" v-if="username">
                                        <button type="button" title="Add reaction" @click.stop="reactFor = reactFor === m.id ? 0 : m.id">&#x263A;</button>
                                        <button v-if="canDelete(m)" type="button" title="Delete message" class="danger" @click.stop="removeMessage(m)">&#x1F5D1;</button>
                                        <div v-if="reactFor === m.id" class="dc-react-pop" @click.stop>
                                            <button v-for="r in reactionPalette" :key="r" type="button" @click="react(m, r)"><span v-if="r.startsWith(':')"><img class="dc-emoji" :src="emojiMap[r.slice(1, -1)]" :alt="r"></span><span v-else>{{ r }}</span></button>
                                        </div>
                                    </div>
                                    <button v-if="!m.cont" type="button" class="dc-avatar-btn" @click="openProfile(m.name)">
                                        <Avatar :name="m.name" :src="avatarSrc(m.name)" :frame="frameOf(m.name)"></Avatar>
                                    </button>
                                    <span v-else class="dc-msg-time">{{ time(m.time) }}</span>
                                    <div class="dc-msg-body">
                                        <div v-if="!m.cont" class="dc-msg-head">
                                            <button type="button" class="dc-msg-name" :class="nameClass(m.name)" :style="nameStyle(m.name)" @click="openProfile(m.name)">{{ m.name }}</button>
                                            <span v-if="roleOfName(m.name) !== 'member'" class="dc-role" :class="roleOfName(m.name)">{{ roleLabel(roleOfName(m.name)) }}</span>
                                            <span v-for="b in topBadges(m.name)" :key="b" class="dc-badge-icon" :title="badgeInfo(b).label + ' - ' + badgeInfo(b).desc">{{ badgeInfo(b).icon }}</span>
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
                                <button v-for="name in group.names" :key="name" type="button" class="dc-member" :class="{ offline: group.role === 'offline' }" @click="openProfile(name)">
                                    <Avatar class="dc-avatar-sm" :name="name" :src="avatarSrc(name)" :frame="frameOf(name)"><span class="dc-status" :class="statusOf(name)"></span></Avatar>
                                    <span class="dc-member-name" :class="nameClass(name)" :style="nameStyle(name)">{{ name }}</span>
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
                    <div class="dc-card-banner" :class="{ animated: bannerAnimated(card) }" :style="bannerStyle(card)"></div>
                    <Avatar class="dc-avatar-xl dc-card-avatar" :name="card.username" :src="avatarSrc(card.username)" :frame="frameOf(card.username)"><span class="dc-status big" :class="statusOf(card.username)"></span></Avatar>
                    <div class="dc-card-body">
                        <div class="dc-card-top">
                            <span class="dc-card-name" :class="nameClass(card.username)" :style="nameStyle(card.username)">{{ card.username }}</span>
                            <span v-if="card.pronouns" class="dc-card-pronouns">{{ card.pronouns }}</span>
                        </div>
                        <span v-if="card.role !== 'member'" class="dc-role first" :class="card.role">{{ roleLabel(card.role) }}</span>
                        <span v-else class="dc-role first member">Member</span>
                        <div v-if="(card.badges || []).length" class="dc-badges">
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
                            <button v-if="role === 'a101' && username && card.username.toLowerCase() !== username.toLowerCase()" type="button" class="dc-btn nitro" @click="giftNitro(card.username)">&#9889; Gift Nitro</button>
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
                    <p class="dc-hint">{{ me && me.nitro ? 'Nitro: animated GIF or WebP pictures up to 400 KB keep their animation.' : 'A GIF becomes a still picture. Animated pictures need Nitro (see the Orb Shop).' }}</p>
                    <label>BANNER COLOR
                        <span class="dc-swatches">
                            <button v-for="(c, i) in banners" :key="c" type="button" class="dc-swatch" :class="{ active: draft.banner === i }" :style="{ background: c }" @click="draft.banner = i"></button>
                        </span>
                    </label>
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
                            <li>&#127912; <b>Animated profile pictures</b> (GIF or animated WebP, up to 400 KB)</li>
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
                    </div>

                    <div v-else class="dc-shop-grid">
                        <div v-for="it in shopItems" :key="it.id" class="dc-item" :class="{ owned: isOwned(it), worn: isWorn(it) }">
                            <div class="dc-item-preview" :class="'slot-' + it.slot">
                                <span v-if="it.slot === 'nameColor'" class="dc-preview-name" :class="itemNameClass(it)" :style="itemNameStyle(it)">{{ username || 'Username' }}</span>
                                <Avatar v-else-if="it.slot === 'frame'" class="dc-avatar-sm" :name="username || 'U'" :src="avatarSrc(username)" :frame="it.id"></Avatar>
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
                    <p class="dc-hint">Send messages to earn an orb (one per minute).</p>
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
            draft: { bio: "", pronouns: "", statusText: "", banner: -1, dmFriendsOnly: false, blob: null, preview: "", remove: false },
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
            ],
            shop: { items: [], nitro: { price: 400, days: 30, orbsPerMessage: 2 }, orbs: 0, owned: [], equipped: {}, nitroActive: false, nitroUntil: 0, lifetime: false },
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
        maxText() {
            return this.me?.nitro ? 500 : 300;
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
        this.loadShop();
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
            return BANNERS[profile?.banner] || `hsl(${hue(profile?.username || "")}, 55%, 40%)`;
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
            return { background: item ? item.style.background : this.bannerColor(profile) };
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
        async buyNitro() {
            this.busy = true;
            await this.applyShopResult(await this.post(`${API}/shop`, { action: "nitro" }));
            this.busy = false;
        },
        async giftNitro(name) {
            if (!window.confirm(`Gift 30 days of Nitro to ${name}?`)) return;
            const data = await this.post(`${API}/shop`, { action: "gift", user: name, days: 30 });
            if (data) await this.ensureProfiles([name], true), (this.card = this.profileOf(name) || this.card);
        },
        async openBoard() {
            this.error = "";
            try {
                const res = await fetch(`${API}/leaderboard`);
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
                if (this.me?.nitro && animatedType && file.size <= 400 * 1024) {
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
                    body: JSON.stringify({
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
        insertEmoji(e) {
            const space = this.text && !this.text.endsWith(" ") ? " " : "";
            this.text = `${this.text}${space}:${e.name}: `.slice(0, this.maxText);
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
                    if (blob && blob.size <= (this.me?.nitro ? 1400 * 1024 : MAX_IMAGE_BYTES)) {
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
                    this.loadFriends();
                    this.loadShop();
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
                    this.presence = Object.fromEntries((s.online || []).map((o) => [o.user.toLowerCase(), o.status]));
                    this.presenceName = Object.fromEntries((s.online || []).map((o) => [o.user.toLowerCase(), o.user]));
                }
                this.offline = false;
                if (scope !== this.scope) return;

                const known = new Set(this.messages.map((m) => m.id));
                const fresh = data.messages.filter((m) => !known.has(m.id));
                if (this.primed && fresh.some((m) => this.mentionsMe(m) || (this.inConvo && m.name !== this.username))) {
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
                this.ensureProfiles([...this.dms.map((d) => d.user), ...this.groups.flatMap((g) => g.members)]);
                this.pollCount++;
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
                    this.noteOrb(data);
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
