import { DurableObject } from "cloudflare:workers";

// channel id -> config. `post` limits who can send (by role); omitted = everyone logged in.
const CHANNELS = {
    rules: { post: ["a101"] },
    announcements: { post: ["a101"] },
    general: {},
    "off-topic": {},
    "list-talk": {},
    records: {},
    "level-requests": {},
    minigames: {},
    casino: {},
    zoo: {},
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
    "\u{1FAC2}",
];
const CUSTOM_REACTION_RE = /^:[a-z0-9_]{2,32}:$/;
const MAX_REACTION_TYPES = 12;

const STATUSES = ["online", "idle", "dnd", "invisible"];
const BANNER_COUNT = 12;
const PRESENCE_MS = 75 * 1000;

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
const SESSION_MS = 30 * 24 * 60 * 60 * 1000;
const PBKDF2_ITERATIONS = 100000;
const MAX_FAILS = 5;
const FAIL_WINDOW_MS = 10 * 60 * 1000;
const EMBED_TTL_MS = 60 * 60 * 1000;
const EMBED_PER_MINUTE = 30;

// orbs
const ORB_COOLDOWN_MS = 60 * 1000;
const MIN_ORB_TEXT = 3;

// Nitro: bought with orbs (or gifted by the owner), unlocks extras for 30 days at a time
const NITRO_PRICE = 500;
const NITRO_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_TEXT_NITRO = 500;
const MAX_IMAGE_NITRO = 1536 * 1024;
const MAX_AVATAR_NITRO = 1536 * 1024;
const NITRO_ORBS = 2;
// Nitro Plus: the top tier. Includes everything in Nitro, plus uploadable banners with a custom height
const PLUS_PRICE = 1500;
const PLUS_DAYS = 30;
const PLUS_ORBS = 3;
const MAX_TEXT_PLUS = 1000;
const MAX_IMAGE_PLUS = 1900 * 1024;
const MAX_AVATAR_PLUS = 1900 * 1024;
const MAX_BANNER_PLUS = 1900 * 1024;
const BANNER_H_MIN = 80;
const BANNER_H_MAX = 400;

// Shop: slot -> what it changes. `nitro` items need an active Nitro to buy and to show.
// The look of frames lives in the page's CSS (matched by id); colours and gradients live here.
const SHOP = [
    { id: "nc_crimson", slot: "nameColor", name: "Crimson", price: 10, style: { color: "#ff4d6d" } },
    { id: "nc_ocean", slot: "nameColor", name: "Ocean", price: 10, style: { color: "#3aa3ff" } },
    { id: "nc_mint", slot: "nameColor", name: "Mint", price: 10, style: { color: "#3ddc97" } },
    { id: "nc_gold", slot: "nameColor", name: "Gold", price: 15, style: { color: "#f5c542" } },
    { id: "nc_violet", slot: "nameColor", name: "Violet", price: 15, style: { color: "#b388ff" } },
    { id: "nc_pink", slot: "nameColor", name: "Bubblegum", price: 15, style: { color: "#ff7ac8" } },
    {
        id: "nc_sunset", slot: "nameColor", name: "Sunset", price: 40, nitro: true,
        style: { gradient: "linear-gradient(90deg, #ff512f, #f09819, #ff512f)", animated: true },
    },
    {
        id: "nc_rainbow", slot: "nameColor", name: "Rainbow", price: 60, nitro: true,
        style: { gradient: "linear-gradient(90deg, #ff4d4d, #ffd24d, #4dff88, #4dc3ff, #b84dff, #ff4d4d)", animated: true },
    },
    { id: "fr_gold", slot: "frame", name: "Gold Ring", price: 20 },
    { id: "fr_neon", slot: "frame", name: "Neon Glow", price: 20 },
    { id: "fr_emerald", slot: "frame", name: "Emerald Ring", price: 20 },
    { id: "fr_rose", slot: "frame", name: "Rose Ring", price: 30 },
    { id: "fr_flame", slot: "frame", name: "Flame", price: 50, nitro: true, style: { animated: true } },
    { id: "fr_galaxy", slot: "frame", name: "Galaxy", price: 60, nitro: true, style: { animated: true } },
    { id: "bn_sunset", slot: "banner", name: "Sunset", price: 15, style: { background: "linear-gradient(135deg, #ff7e5f, #feb47b)" } },
    { id: "bn_ocean", slot: "banner", name: "Deep Ocean", price: 15, style: { background: "linear-gradient(135deg, #2193b0, #6dd5ed)" } },
    { id: "bn_forest", slot: "banner", name: "Forest", price: 15, style: { background: "linear-gradient(135deg, #134e5e, #71b280)" } },
    { id: "bn_candy", slot: "banner", name: "Candy", price: 15, style: { background: "linear-gradient(135deg, #ee9ca7, #ffdde1)" } },
    { id: "bn_midnight", slot: "banner", name: "Midnight", price: 25, style: { background: "linear-gradient(135deg, #0f2027, #2c5364)" } },
    {
        id: "bn_aurora", slot: "banner", name: "Aurora", price: 50, nitro: true,
        style: { background: "linear-gradient(120deg, #00c9ff, #92fe9d, #b388ff, #00c9ff)", animated: true },
    },
    {
        id: "bn_lava", slot: "banner", name: "Lava", price: 50, nitro: true,
        style: { background: "linear-gradient(120deg, #f12711, #f5af19, #f12711)", animated: true },
    },
    { id: "bn_void", slot: "banner", name: "Void", price: 60, nitro: true, style: { background: "linear-gradient(120deg, #000000, #1a1a2e, #000000, #2b0a3d, #000000)", animated: true } },
    { id: "bn_neon", slot: "banner", name: "Neon City", price: 60, nitro: true, style: { background: "linear-gradient(120deg, #ff00cc, #3333ff, #00f0ff, #ff00cc)", animated: true } },
    { id: "bn_galaxy", slot: "banner", name: "Galaxy", price: 70, nitro: true, style: { background: "linear-gradient(120deg, #0f0c29, #302b63, #8e2de2, #24243e, #0f0c29)", animated: true } },
    { id: "bn_matrix", slot: "banner", name: "Matrix", price: 60, nitro: true, style: { background: "linear-gradient(120deg, #000000, #003b00, #00ff41, #003b00, #000000)", animated: true } },
    { id: "bn_sakura", slot: "banner", name: "Sakura", price: 60, nitro: true, style: { background: "linear-gradient(120deg, #ffafbd, #ffc3a0, #f8c8ff, #ffafbd)", animated: true } },
    { id: "bn_ice", slot: "banner", name: "Frostbite", price: 60, nitro: true, style: { background: "linear-gradient(120deg, #e0eafc, #74ebd5, #acb6e5, #e0eafc)", animated: true } },
    { id: "bd_fire", slot: "badge", name: "On Fire", price: 20, style: { icon: "\u{1F525}" } },
    { id: "bd_cat", slot: "badge", name: "Cat Lover", price: 20, style: { icon: "\u{1F431}" } },
    { id: "bd_ghost", slot: "badge", name: "Ghost", price: 20, style: { icon: "\u{1F47B}" } },
    { id: "bd_clover", slot: "badge", name: "Lucky", price: 25, style: { icon: "\u{1F340}" } },
    { id: "bd_gamer", slot: "badge", name: "Gamer", price: 25, style: { icon: "\u{1F3AE}" } },
    { id: "bd_rocket", slot: "badge", name: "Speedrunner", price: 30, style: { icon: "\u{1F680}" } },
    { id: "bd_skull", slot: "badge", name: "Demon Slayer", price: 35, style: { icon: "\u{1F480}" } },
    { id: "bd_diamond", slot: "badge", name: "Diamond", price: 50, style: { icon: "\u{1F48E}" } },
    { id: "bd_dragon", slot: "badge", name: "Dragon", price: 80, nitro: true, style: { icon: "\u{1F409}" } },
    { id: "bd_prism", slot: "badge", name: "Prism", price: 80, nitro: true, style: { icon: "\u{1F308}" } },
    { id: "ti_lurker", slot: "title", name: "Professional Lurker", price: 15, style: { text: "Professional Lurker" } },
    { id: "ti_noob", slot: "title", name: "Certified Noob", price: 15, style: { text: "Certified Noob" } },
    { id: "ti_owl", slot: "title", name: "Night Owl", price: 20, style: { text: "Night Owl" } },
    { id: "ti_chaos", slot: "title", name: "Chaos Agent", price: 25, style: { text: "Chaos Agent" } },
    { id: "ti_slayer", slot: "title", name: "Demon Slayer", price: 30, style: { text: "Demon Slayer" } },
    { id: "ti_grinder", slot: "title", name: "Extreme Grinder", price: 30, style: { text: "Extreme Grinder" } },
    { id: "ti_verifier", slot: "title", name: "Verifier", price: 30, style: { text: "Verifier" } },
    { id: "ti_legend", slot: "title", name: "Legend", price: 60, nitro: true, style: { text: "Legend" } },
    { id: "ti_sweat", slot: "title", name: "Tryhard Supreme", price: 60, nitro: true, style: { text: "Tryhard Supreme" } },
    { id: "bu_gold", slot: "bubble", name: "Gold Bar", price: 30, style: { color: "#f5c542" } },
    { id: "bu_neon", slot: "bubble", name: "Neon Bar", price: 30, style: { color: "#00e5ff" } },
    { id: "bu_rose", slot: "bubble", name: "Rose Bar", price: 30, style: { color: "#ff6b9d" } },
    { id: "bu_leaf", slot: "bubble", name: "Leaf Bar", price: 30, style: { color: "#2ecc71" } },
    { id: "bu_rainbow", slot: "bubble", name: "Rainbow Bar", price: 70, nitro: true, style: { color: "#b84dff", animated: true } },
    { id: "bu_fire", slot: "bubble", name: "Flame Bar", price: 70, nitro: true, style: { color: "#ff6a00", animated: true } },
    { id: "ef_sparkle", slot: "effect", name: "Sparkles", price: 40, style: { emoji: "\u2728" } },
    { id: "ef_snow", slot: "effect", name: "Snowfall", price: 40, style: { emoji: "\u2744\uFE0F" } },
    { id: "ef_hearts", slot: "effect", name: "Hearts", price: 40, style: { emoji: "\u{1F496}" } },
    { id: "ef_fire", slot: "effect", name: "Embers", price: 90, nitro: true, style: { emoji: "\u{1F525}" } },
    { id: "ef_stars", slot: "effect", name: "Star Shower", price: 90, nitro: true, style: { emoji: "\u{1F31F}" } },
];
const SLOTS = ["nameColor", "frame", "banner", "badge", "title", "bubble", "effect"];
const BOX_PRICE = 25;

// Orb tasks. Daily ones reset at midnight UTC; achievements are claimed once, ever.
const DAILY_TASKS = [
    { id: "d_chat", name: "Chatterbox", desc: "Send 10 messages", goal: 10, reward: 5, key: "msg" },
    { id: "d_react", name: "Reactor", desc: "React to 3 messages", goal: 3, reward: 3, key: "react" },
    { id: "d_gif", name: "GIF Master", desc: "Send a GIF or sticker", goal: 1, reward: 3, key: "gif" },
    { id: "d_dm", name: "Pen Pal", desc: "Send a direct or group message", goal: 1, reward: 3, key: "dm" },
    { id: "d_explore", name: "Explorer", desc: "Post in 3 different channels", goal: 3, reward: 5, key: "channels" },
    { id: "d_media", name: "Show and Tell", desc: "Share an image or a video", goal: 1, reward: 4, key: "media" },
    { id: "d_liked", name: "Fan Favourite", desc: "Get 3 reactions on your messages", goal: 3, reward: 5, key: "liked" },
];
const ACHIEVEMENTS = [
    { id: "a_first", name: "First Words", desc: "Send your first message", goal: 1, reward: 5, stat: "msgCount" },
    { id: "a_pfp", name: "Say Cheese", desc: "Set a profile picture", goal: 1, reward: 10, stat: "avatar" },
    { id: "a_bio", name: "About Me", desc: "Write something in your bio", goal: 1, reward: 5, stat: "bio" },
    { id: "a_friend", name: "Friend Zone", desc: "Make your first friend", goal: 1, reward: 10, stat: "friends" },
    { id: "a_group", name: "Squad Goals", desc: "Be in a group chat", goal: 1, reward: 10, stat: "groups" },
    { id: "a_shop", name: "Shopper", desc: "Own something from the Orb Shop", goal: 1, reward: 10, stat: "owned" },
    { id: "a_100", name: "Century", desc: "Send 100 messages", goal: 100, reward: 25, stat: "msgCount" },
    { id: "a_social", name: "Popular", desc: "Have 5 friends", goal: 5, reward: 25, stat: "friends" },
    { id: "a_invite", name: "Recruiter", desc: "Invite a friend who starts chatting", goal: 1, reward: 15, stat: "invited" },
];
// bot, moderation, stickers, economy extras
const BOT_NAME = "a101 Bot";
const BOT_TOKEN_HASH = "558cd3b0149c96906bbfc9222f1c74a9f58b6fad7273d190b75a74bf45ebb460";
const MAX_CUSTOM_COMMANDS = 30;
const BUILTIN_COMMANDS = ["help", "rules", "poll", "cf", "roulette", "slots", "dice", "blackjack", "duel", "accept", "decline", "bal", "hunt", "inventory", "gems", "team", "battle", "roll", "flip", "8ball", "choose", "rank", "level", "top", "orbs"];
// a101 Casino: classic orb games (coinflip, roulette, slots, dice, blackjack) and duels. Only in #casino.
const CASINO_NAME = "a101 Casino";
// a101 Zoo: /hunt costs 1 orb and catches a random animal. Only in #zoo.
const ZOO_NAME = "a101 Zoo";
const HUNT_COST = 1;
const RARITIES = [
    { id: "common", code: "C", label: "Common", weight: 620 },
    { id: "uncommon", code: "U", label: "Uncommon", weight: 240 },
    { id: "rare", code: "R", label: "Rare", weight: 95 },
    { id: "epic", code: "E", label: "Epic", weight: 35 },
    // these tiers stay hidden (shown as ??) until the player catches one for the first time
    { id: "legendary", code: "L", label: "Legendary", weight: 10, secret: true },
    { id: "gem", code: "G", label: "Gem", weight: 3, secret: true },
    { id: "crystal", code: "CY", label: "Crystal", weight: 1, secret: true },
];
const BASE_ANIMALS = [
    ["mouse", "\u{1F42D}", "Mouse", "common"], ["rabbit", "\u{1F430}", "Rabbit", "common"], ["chicken", "\u{1F414}", "Chicken", "common"],
    ["frog", "\u{1F438}", "Frog", "common"], ["squirrel", "\u{1F43F}\uFE0F", "Squirrel", "common"], ["duck", "\u{1F986}", "Duck", "common"],
    ["fox", "\u{1F98A}", "Fox", "uncommon"], ["wolf", "\u{1F43A}", "Wolf", "uncommon"], ["deer", "\u{1F98C}", "Deer", "uncommon"],
    ["boar", "\u{1F417}", "Boar", "uncommon"], ["owl", "\u{1F989}", "Owl", "uncommon"],
    ["bear", "\u{1F43B}", "Bear", "rare"], ["lion", "\u{1F981}", "Lion", "rare"], ["tiger", "\u{1F42F}", "Tiger", "rare"],
    ["elephant", "\u{1F418}", "Elephant", "rare"], ["giraffe", "\u{1F992}", "Giraffe", "rare"],
    ["gorilla", "\u{1F98D}", "Gorilla", "epic"], ["crocodile", "\u{1F40A}", "Crocodile", "epic"], ["shark", "\u{1F988}", "Shark", "epic"], ["eagle", "\u{1F985}", "Eagle", "epic"],
    ["dragon", "\u{1F409}", "Dragon", "legendary"], ["unicorn", "\u{1F984}", "Unicorn", "legendary"], ["trex", "\u{1F996}", "T-Rex", "legendary"],
].map(([id, emoji, name, rarity]) => ({ id, emoji: `:${rarity === "legendary" ? "legend" : rarity}_${id}:`, plain: emoji, name, rarity }));
// every animal also exists as a Gem and a Crystal version
const ANIMALS = [
    ...BASE_ANIMALS,
    ...BASE_ANIMALS.map((a) => ({ id: `gem_${a.id}`, emoji: `:gem_${a.id}:`, plain: `\u{1F48E}${a.plain}`, name: `Gem ${a.name}`, rarity: "gem" })),
    ...BASE_ANIMALS.map((a) => ({ id: `crystal_${a.id}`, emoji: `:crystal_${a.id}:`, plain: `\u{1F52E}${a.plain}`, name: `Crystal ${a.name}`, rarity: "crystal" })),
];
const ZOO_COMMANDS = ["hunt", "inventory", "inv", "gems", "team", "battle"];
// gems are items with the same rarity tiers as the animals (C U R E L). They are bought with orbs and use up one charge per hunt / battle.
// You can own several tiers of a gem; the best one that still has charges is used first.
const GEM_TIERS = ["common", "uncommon", "rare", "epic", "legendary"];
const GEMS = {
    hunting: { name: "Hunting Gem", desc: (v) => `+${v} animal${v > 1 ? "s" : ""} on every hunt`, price: [15, 30, 60, 110, 200], uses: [20, 40, 80, 150, 300], power: [1, 1, 2, 3, 4] },
    heart: { name: "Heart Gem", desc: (v) => `${v}x better chance of Gem animals`, price: [25, 40, 80, 150, 300], uses: [20, 40, 80, 150, 300], power: [5, 10, 20, 35, 60] },
    power: { name: "Power Gem", desc: (v) => `+${v}% attack in battles`, price: [15, 25, 50, 90, 160], uses: [10, 20, 40, 75, 150], power: [15, 25, 40, 60, 100] },
};
// durations before rarer gems lasted longer, used once to scale up gems people already own
const OLD_GEM_USES = { hunting: [20, 35, 35, 40, 50], heart: [20, 25, 30, 35, 40], power: [10, 10, 15, 15, 20] };
const gemIcon = (type, tier) => `:item_${type}_${["c", "u", "r", "e", "l"][tier]}:`;
/** The best gem of a type that still has charges: { key, tier, value } or null. */
const activeGem = (gems, type) => {
    for (let t = GEM_TIERS.length - 1; t >= 0; t--) {
        const key = `${type}_${GEM_TIERS[t]}`;
        if ((gems?.[key] || 0) > 0) return { key, tier: t, value: GEMS[type].power[t] };
    }
    return null;
};const TEAM_SIZE = 3;
const MAX_PET_LEVEL = 50;
const MAX_TURNS = 30;
// [hp, attack, defence] at level 1; every level adds 10%
const TIER_STATS = { common: [60, 10, 4], uncommon: [80, 14, 6], rare: [110, 20, 9], epic: [150, 28, 13], legendary: [210, 40, 20], gem: [260, 48, 26], crystal: [330, 60, 34] };
const ENEMY_TIERS = [["common", 40], ["uncommon", 28], ["rare", 16], ["epic", 9], ["legendary", 4], ["gem", 2], ["crystal", 1]];
const GAME_COMMANDS = ["cf", "roulette", "slots", "dice", "blackjack", "duel", "accept", "decline", "bal"];
const GAME_USAGE = { cf: "/cf 10", roulette: "/roulette red 10", slots: "/slots 10", dice: "/dice 10 high", blackjack: "/blackjack 10", duel: "/duel @user 10" };
const MAX_BET = 200;
const MAX_DUEL = 500;
const DUEL_FEE = 0.05;
const DUEL_TTL_MS = 2 * 60 * 1000;
const GAME_COOLDOWN_MS = 4000;
const BJ_TTL_MS = 5 * 60 * 1000;
const RED_NUMBERS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
const SLOT_SYMBOLS = [
    { icon: "\u{1F352}", weight: 40, three: 3 },
    { icon: "\u{1F34B}", weight: 25, three: 8 },
    { icon: "\u{1F347}", weight: 18, three: 20 },
    { icon: "\u{1F514}", weight: 10, three: 60 },
    { icon: "\u{1F48E}", weight: 5, three: 200 },
    { icon: "7\uFE0F\u20E3", weight: 2, three: 1000 },
];
const CARD_RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
const CARD_SUITS = ["\u2660", "\u2665", "\u2666", "\u2663"];
const drawCard = () => `${CARD_RANKS[Math.floor(Math.random() * 13)]}${CARD_SUITS[Math.floor(Math.random() * 4)]}`;
const handValue = (cards) => {
    let total = 0;
    let aces = 0;
    for (const c of cards) {
        const rank = c.slice(0, -1);
        if (rank === "A") {
            total += 11;
            aces++;
        } else {
            total += ["J", "Q", "K"].includes(rank) ? 10 : Number(rank);
        }
    }
    while (total > 21 && aces > 0) {
        total -= 10;
        aces--;
    }
    return total;
};const RULES = [
    "Be respectful. No harassment, hate speech, slurs or personal attacks.",
    "No spam or flooding, and do not beg for orbs, Nitro or roles.",
    "Use the right channel: records in #records, level ideas in #level-requests.",
    "No NSFW, gore or shock content. Keep GIFs, stickers and videos appropriate.",
    "No advertising or self-promotion without permission from a moderator.",
    "Do not share personal information, yours or anyone else's.",
    "No cheating: hacked, botted or edited records get removed from the list.",
    "No impersonating staff, dodging a mute or ban with another account, or abusing bugs. Report problems instead.",
    "Moderators have the final say. Use the flag button on a message to report a problem.",
];
const rulesText = () => RULES.map((r, i) => `${i + 1}. ${r}`).join("\n");
const STICKER_RE = /^(?:[A-Za-z0-9_-]{1,50}\.(?:png|webp|svg|gif|jpg)|u_[0-9a-f]{12})$/;
const POLL_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_POLL_OPTIONS = 6;
const EDIT_WINDOW_MS = 60 * 60 * 1000;
const MAX_BLOCKED = 100;
const REF_REWARD = 10;
const REF_MIN_MESSAGES = 5;
const REF_MAX = 20;
const MAX_COMMUNITY = 100;
const MAX_PENDING = 50;
const SUBMIT_MIN_AGE_MS = 30 * 60 * 1000;
const STICKER_BYTES = 256 * 1024;
const EMOJI_BYTES = 64 * 1024;
const GIF_SUBMIT_BYTES = 1536 * 1024;
const GIF_ID_RE = /^u_[0-9a-f]{12}$/;
const RANK = { member: 0, admin: 1, a101: 2 };
const MAX_REPORTS = 100;
const MAX_MUTE_MINUTES = 60 * 24 * 30;
const TYPING_MS = 5000;
const GIFT_MIN_AGE_MS = 10 * 60 * 1000;
const GIFT_MAX = 100;
const GIFT_DAILY = 300;
const STREAK_BASE = 2;
const STREAK_MAX = 12;
const weekKey = () => {
    const d = new Date();
    const start = Date.UTC(d.getUTCFullYear(), 0, 1);
    return `${d.getUTCFullYear()}-W${Math.floor((Date.now() - start) / (7 * 86400000))}`;
};
const taskDay = () => new Date().toISOString().slice(0, 10);
const nextMidnight = () => {
    const d = new Date();
    return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1);
};

// friends and groups
const MAX_FRIENDS = 200;
const MAX_OUTGOING = 30;
const MAX_INCOMING = 100;
const MAX_GROUP_MEMBERS = 10;
const MAX_GROUPS = 30;

// anti-spam
const COOLDOWN_MS = 2000;
const SPAM_WINDOW_MS = 30 * 1000;
const SPAM_WINDOW_MAX = 8;
const DUP_WINDOW_MS = 30 * 1000;
const MAX_LINKS = 2;
const MAX_MENTIONS = 5;
const NEW_ACCOUNT_MS = 2 * 60 * 1000;
const STRIKE_WINDOW_MS = 10 * 60 * 1000;
const STRIKES_FOR_TIMEOUT = 3;
const TIMEOUT_MS = 5 * 60 * 1000;
const REGISTER_PER_HOUR = 3;
const REACT_PER_10S = 20;
const FRIEND_ACTIONS_PER_MIN = 10;
const GROUPS_PER_HOUR = 3;

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
const NAME_RE = /^[a-z0-9_]{3,20}$/;

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

function sniffGif(b) {
    // "GIF87a" / "GIF89a"
    return b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38 ? "image/gif" : null;
}

/** An animated WebP is a VP8X file with the animation flag (bit 1 of the flags byte) set. */
function isAnimatedWebp(b) {
    return (
        b.length > 21 &&
        b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
        b[12] === 0x56 && b[13] === 0x50 && b[14] === 0x38 && b[15] === 0x58 &&
        (b[20] & 0x02) !== 0
    );
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

const recent = (list, windowMs, now = Date.now()) => (list || []).filter((t) => now - t < windowMs);

export class ChatRoom extends DurableObject {
    constructor(ctx, env) {
        super(ctx, env);
        // in-memory only: resets if the object restarts, which is fine for rate limits and presence
        this.lastSent = new Map();
        this.history = new Map();
        this.lastText = new Map();
        this.strikes = new Map();
        this.timeouts = new Map();
        this.fails = new Map();
        this.embeds = new Map();
        this.embedHits = [];
        this.presence = new Map();
        this.registerHits = new Map();
        this.reactHits = new Map();
        this.friendHits = new Map();
        this.groupHits = new Map();
        this.board = {};
        this.typing = new Map();
        this.modMap = new Map();
        this.modLoaded = false;
        this.origin = "";
        this.levelCache = { time: 0, data: null };
        this.reportHits = new Map();
        this.searchHits = new Map();
        this.commandHits = new Map();
        this.botHits = [];
        this.pollHits = new Map();
        this.gameLast = new Map();
        this.openDuels = new Map();
        this.openRuns = new Map();
        this.editHits = new Map();
        this.submitHits = new Map();
    }

    async fetch(request) {
        const { pathname, searchParams, origin } = new URL(request.url);
        this.origin = origin;
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
        } else if (get && pathname === "/api/chat/leaderboard") {
            return this.leaderboard(searchParams);
        } else if (get && pathname === "/api/chat/search") {
            return this.search(request, searchParams);
        } else if (post && pathname === "/api/chat/typing") {
            return this.typingPing(request);
        } else if (post && pathname === "/api/chat/report") {
            return this.report(request);
        } else if (post && pathname === "/api/chat/ack") {
            return this.ack(request);
        } else if (get && pathname === "/api/chat/mod") {
            return this.modOverview(request);
        } else if (post && pathname === "/api/chat/mod") {
            return this.modAction(request);
        } else if (get && pathname === "/api/chat/bot") {
            return this.botInfo();
        } else if (post && pathname === "/api/chat/bot/say") {
            return this.botSay(request);
        } else if (post && pathname === "/api/chat/bot") {
            return this.botManage(request);
        } else if (post && pathname === "/api/chat/orbs") {
            return this.orbsAction(request);
        } else if (get && pathname === "/api/chat/friends") {
            return this.friends(request);
        } else if (post && pathname === "/api/chat/friends") {
            return this.friendAction(request);
        } else if (post && pathname === "/api/chat/groups") {
            return this.groupAction(request);
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
        } else if (get && pathname === "/api/chat/tasks") {
            return this.tasks(request);
        } else if (post && pathname === "/api/chat/tasks") {
            return this.claimTask(request);
        } else if (get && pathname === "/api/chat/shop") {
            return this.shop(request);
        } else if (post && pathname === "/api/chat/shop") {
            return this.shopAction(request);
        } else if (post && pathname === "/api/chat/duel") {
            return this.duelAction(request);
        } else if (post && pathname === "/api/chat/blackjack") {
            return this.blackjackAction(request);
        } else if (post && pathname === "/api/chat/vote") {
            return this.vote(request);
        } else if (post && pathname === "/api/chat/edit") {
            return this.editMessage(request);
        } else if (post && pathname === "/api/chat/block") {
            return this.blockAction(request);
        } else if (post && pathname === "/api/chat/submit") {
            return this.submitAsset(request, searchParams);
        } else if (get && pathname === "/api/chat/community") {
            return this.community();
        } else if (get && pathname.startsWith("/api/chat/asset/")) {
            return this.getAsset(pathname.slice("/api/chat/asset/".length));
        } else if (post && pathname === "/api/chat/react") {
            return this.react(request);
        } else if (post && pathname === "/api/chat/delete") {
            return this.deleteMessage(request);
        } else if (post && pathname === "/api/chat/avatar") {
            return this.postAvatar(request, searchParams);
        } else if (post && pathname === "/api/chat/banner") {
            return this.postBanner(request, searchParams);
        } else if (get && pathname.startsWith("/api/chat/banner/")) {
            return this.getBanner(pathname.slice("/api/chat/banner/".length));
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
            const username = await this.rawSession(request);
            if (!username) return json({ error: "Not logged in." }, 401);
            await this.loadMod();
            const ban = this.modMap.get(username.toLowerCase())?.banned;
            if (ban) return json({ error: `This account is banned.${ban.reason ? " Reason: " + ban.reason : ""}`, banned: true }, 403);
            this.touch(username);
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

    /** The logged-in user, or null if logged out or banned. */
    async sessionUser(request) {
        const username = await this.rawSession(request);
        if (!username) return null;
        await this.loadMod();
        return this.modMap.get(username.toLowerCase())?.banned ? null : username;
    }

    async loadMod() {
        if (this.modLoaded) return;
        const list = await this.ctx.storage.list({ prefix: "mod:" });
        this.modMap = new Map([...list].map(([k, v]) => [k.slice(4), v]));
        this.modLoaded = true;
    }

    async rawSession(request) {
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

    /** storage.get for any number of keys (a single call is limited to 128). */
    async many(keys) {
        const out = new Map();
        for (let i = 0; i < keys.length; i += 100) {
            const part = await this.ctx.storage.get(keys.slice(i, i + 100));
            for (const [k, v] of part) out.set(k, v);
        }
        return out;
    }

    touch(username) {
        this.presence.set(username.toLowerCase(), { time: Date.now(), name: username });
        if (this.presence.size > 2000) {
            const now = Date.now();
            for (const [k, v] of this.presence) if (now - v.time > PRESENCE_MS) this.presence.delete(k);
        }
    }

    /** online / idle / dnd, or "offline" when invisible or not seen recently. */
    effectiveStatus(lower, user) {
        const seen = this.presence.get(lower);
        if (!seen || Date.now() - seen.time > PRESENCE_MS) return "offline";
        const status = user?.status || "online";
        return status === "invisible" ? "offline" : status;
    }

    async textLimit(username) {
        const user = await this.ctx.storage.get(`u:${username.toLowerCase()}`);
        const role = roleOf(username);
        if (this.hasPlus(user, role)) return MAX_TEXT_PLUS;
        return this.hasNitro(user, role) ? MAX_TEXT_NITRO : MAX_TEXT;
    }

    async imageLimit(username) {
        const user = await this.ctx.storage.get(`u:${username.toLowerCase()}`);
        const role = roleOf(username);
        if (this.hasPlus(user, role)) return MAX_IMAGE_PLUS;
        return this.hasNitro(user, role) ? MAX_IMAGE_NITRO : MAX_IMAGE_BYTES;
    }

    /** Add orbs. `earn` ones also count towards the leaderboards (gifts and refunds do not). */
    addOrbs(user, amount, earn = true) {
        const before = user.orbs || 0;
        // accounts from before lifetime totals existed start from what they already had
        if (user.earned === undefined) user.earned = before;
        user.orbs = before + amount;
        if (!earn) return;
        user.earned += amount;
        const wk = weekKey();
        if (user.weekKey !== wk) {
            user.weekKey = wk;
            user.weekEarned = 0;
        }
        user.weekEarned = (user.weekEarned || 0) + amount;
    }

    /** The owner always has Nitro; everyone else while their paid or gifted time lasts. */
    hasNitro(user, role) {
        return role === "a101" || (user?.nitroUntil || 0) > Date.now() || this.hasPlus(user, role);
    }

    /** Nitro Plus (includes Nitro): the owner always, everyone else while it lasts. */
    hasPlus(user, role) {
        return role === "a101" || (user?.plusUntil || 0) > Date.now();
    }

    /** What is really worn: owned, in the right slot, and Nitro items only while Nitro is active. */
    effectiveEquipped(user, nitro) {
        const owned = user.owned || [];
        const out = {};
        for (const slot of SLOTS) {
            const id = user.equipped?.[slot];
            const item = SHOP.find((i) => i.id === id && i.slot === slot);
            if (item && owned.includes(id) && (!item.nitro || nitro)) out[slot] = id;
        }
        return out;
    }

    badgesOf(user, role, friendCount) {
        const badges = [];
        if (role === "a101") badges.push("owner");
        if (role === "admin") badges.push("staff");
        if (this.hasPlus(user, role)) badges.push("plus");
        else if (this.hasNitro(user, role)) badges.push("nitro");
        if (user.seq && user.seq <= 100) badges.push("early");
        if ((user.msgCount || 0) >= 100) badges.push("chatter");
        const orbs = user.orbs || 0;
        if (orbs >= 500) badges.push("orbmaster");
        else if (orbs >= 50) badges.push("orbs");
        if (friendCount >= 5) badges.push("social");
        if (user.created && Date.now() - user.created >= 30 * 24 * 60 * 60 * 1000) badges.push("veteran");
        return badges;
    }

    makeProfile(user, fr, own = false) {
        const lower = user.username.toLowerCase();
        const role = roleOf(user.username);
        const friendCount = (fr?.friends || []).length;
        const nitro = this.hasNitro(user, role);
        return {
            username: user.username,
            role,
            nitro,
            plus: this.hasPlus(user, role),
            nitroUntil: role === "a101" ? 0 : user.nitroUntil || 0,
            plusUntil: role === "a101" ? 0 : user.plusUntil || 0,
            bannerImg: this.hasPlus(user, role) ? user.bannerImg || 0 : 0,
            bannerH: this.hasPlus(user, role) ? user.bannerH || 0 : 0,
            equipped: this.effectiveEquipped(user, nitro),
            avatarAnimated: !!user.avatarAnimated,
            avatar: user.avatar || 0,
            bio: user.bio || "",
            created: user.created || 0,
            pronouns: user.pronouns || "",
            statusText: user.statusText || "",
            banner: Number.isInteger(user.banner) ? user.banner : -1,
            status: this.effectiveStatus(lower, user),
            chosenStatus: user.status || "online",
            orbs: user.orbs || 0,
            msgCount: user.msgCount || 0,
            friends: friendCount,
            badges: this.badgesOf(user, role, friendCount),
            dmFriendsOnly: !!user.dmFriendsOnly,
            ...(own ? { favGifs: user.favGifs || [], blocked: user.blocked || [], invited: user.refCount || 0 } : {}),
        };
    }

    async publicProfile(username) {
        const lower = username.toLowerCase();
        const user = (await this.ctx.storage.get(`u:${lower}`)) || { username };
        const fr = await this.ctx.storage.get(`fr:${lower}`);
        return this.makeProfile(user, fr, true);
    }

    /** Turn { channel } / { dm } / { group } into a storage key, enforcing who may read or post. */
    async resolveTarget(username, source, forPost) {
        const group = source.group ? String(source.group) : "";
        if (group) {
            if (!username) return { error: json({ error: "Log in to use group chats." }, 401) };
            const meta = /^[0-9a-f]{8}$/.test(group) ? await this.ctx.storage.get(`gm:${group}`) : null;
            if (!meta || !meta.members.includes(username.toLowerCase())) {
                return { error: json({ error: "Group not found." }, 404) };
            }
            return { key: `g:${group}`, isDm: true, group: meta };
        }

        const dm = source.dm ? String(source.dm).trim() : "";
        if (dm) {
            if (!username) return { error: json({ error: "Log in to use direct messages." }, 401) };
            const other = await this.ctx.storage.get(`u:${dm.toLowerCase()}`);
            if (!other) return { error: json({ error: "No such user." }, 404) };
            if (other.username.toLowerCase() === username.toLowerCase()) {
                return { error: json({ error: "You can't message yourself." }, 400) };
            }
            if (forPost && (other.blocked || []).includes(username.toLowerCase())) {
                return { error: json({ error: "You can't message this user." }, 403) };
            }
            if (forPost) {
                const mine = await this.ctx.storage.get(`u:${username.toLowerCase()}`);
                if ((mine?.blocked || []).includes(other.username.toLowerCase())) {
                    return { error: json({ error: "You blocked this user. Unblock them to send messages." }, 403) };
                }
            }
            if (forPost && other.dmFriendsOnly) {
                const fr = await this.ctx.storage.get(`fr:${other.username.toLowerCase()}`);
                if (!(fr?.friends || []).includes(username.toLowerCase())) {
                    return { error: json({ error: "This user only accepts messages from friends." }, 403) };
                }
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

    // ---------- anti-spam ----------

    addStrike(lower) {
        const now = Date.now();
        const list = recent(this.strikes.get(lower), STRIKE_WINDOW_MS, now);
        list.push(now);
        if (list.length >= STRIKES_FOR_TIMEOUT) {
            this.timeouts.set(lower, now + TIMEOUT_MS);
            this.strikes.delete(lower);
        } else {
            this.strikes.set(lower, list);
        }
    }

    /** Cheap checks done before reading any upload: timeout, cooldown, burst limit. */
    rateCheck(username) {
        const lower = username.toLowerCase();
        const now = Date.now();
        const until = this.timeouts.get(lower) || 0;
        if (until > now) {
            return json(
                { error: `You're timed out for spamming. Try again in ${Math.ceil((until - now) / 1000)}s.` },
                429,
            );
        }
        const muted = this.modMap.get(lower);
        if (muted?.mutedUntil > now) {
            return json(
                { error: `You are muted for ${Math.ceil((muted.mutedUntil - now) / 60000)} more minute(s).${muted.muteReason ? " Reason: " + muted.muteReason : ""}` },
                403,
            );
        }
        if (now - (this.lastSent.get(lower) || 0) < COOLDOWN_MS) {
            return json({ error: "Slow down a little." }, 429);
        }
        if (recent(this.history.get(lower), SPAM_WINDOW_MS, now).length >= SPAM_WINDOW_MAX) {
            this.addStrike(lower);
            return json({ error: "You're sending messages too fast." }, 429);
        }
        return null;
    }

    /** Checks on what the message says: links, mentions, repeats. */
    contentCheck(username, text, user, editing = false) {
        if (!text) return null;
        const lower = username.toLowerCase();
        const now = Date.now();
        const links = (text.match(/https?:\/\//gi) || []).length;
        if (links > MAX_LINKS) return json({ error: `Please keep it to ${MAX_LINKS} links per message.` }, 400);
        if (links && user?.created && now - user.created < NEW_ACCOUNT_MS) {
            return json({ error: "New accounts can't post links for a couple of minutes." }, 403);
        }
        if ((text.match(/@[A-Za-z0-9_]{3,20}/g) || []).length > MAX_MENTIONS) {
            return json({ error: `You can mention at most ${MAX_MENTIONS} people per message.` }, 400);
        }
        const normalized = text.toLowerCase().replace(/\s+/g, " ").trim();
        const last = this.lastText.get(lower);
        // bot commands (/hunt, /cf ...) are meant to be repeated; they have their own cooldowns
        if (!editing && !normalized.startsWith("/") && last && last.text === normalized && now - last.time < DUP_WINDOW_MS) {
            this.addStrike(lower);
            return json({ error: "Don't repeat yourself." }, 429);
        }
        return null;
    }

    recordSent(username, text) {
        const lower = username.toLowerCase();
        const now = Date.now();
        this.lastSent.set(lower, now);
        this.history.set(lower, [...recent(this.history.get(lower), SPAM_WINDOW_MS, now), now]);
        if (text) this.lastText.set(lower, { text: text.toLowerCase().replace(/\s+/g, " ").trim(), time: now });
        if (this.lastSent.size > 2000) {
            this.lastSent.clear();
            this.history.clear();
            this.lastText.clear();
        }
    }

    hitLimit(map, key, windowMs, max) {
        const now = Date.now();
        const list = recent(map.get(key), windowMs, now);
        if (list.length >= max) {
            map.set(key, list);
            return true;
        }
        list.push(now);
        map.set(key, list);
        if (map.size > 2000) map.clear();
        return false;
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
        if (this.hitLimit(this.registerHits, ip, 60 * 60 * 1000, REGISTER_PER_HOUR)) {
            return json({ error: "Too many accounts created from your connection. Try again later." }, 429);
        }

        const refName = String(body?.ref ?? "").trim().toLowerCase();
        const inviter = NAME_RE.test(refName) && refName !== lower ? await this.ctx.storage.get(`u:${refName}`) : null;
        const seq = ((await this.ctx.storage.get("useq")) || 0) + 1;
        const salt = crypto.getRandomValues(new Uint8Array(16));
        const user = {
            username,
            salt: toHex(salt),
            hash: await hashPassword(password, salt),
            created: Date.now(),
            seq,
            bio: "",
            avatar: 0,
            orbs: 0,
            msgCount: 0,
            status: "online",
            ...(inviter ? { ref: refName } : {}),
        };
        await this.ctx.storage.put({ [key]: user, useq: seq });
        this.touch(username);
        await this.botMessage("general", { text: `Welcome to the chat, @${username}! Read the rules in #rules and say hi.` }, { mentions: [username] });
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
        await this.loadMod();
        const banned = this.modMap.get(user.username.toLowerCase())?.banned;
        if (banned) {
            return json({ error: `This account is banned.${banned.reason ? " Reason: " + banned.reason : ""}`, banned: true }, 403);
        }
        this.touch(user.username);
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
        const body = (await this.readBody(request)) || {};
        const key = `u:${username.toLowerCase()}`;
        const user = await this.ctx.storage.get(key);
        const clean = (value, max) => String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);

        if ("bio" in body) user.bio = clean(body.bio, MAX_BIO);
        if ("pronouns" in body) user.pronouns = clean(body.pronouns, 20);
        if ("statusText" in body) user.statusText = clean(body.statusText, 40);
        if ("banner" in body) {
            const banner = Number(body.banner);
            user.banner = Number.isInteger(banner) && banner >= 0 && banner < BANNER_COUNT ? banner : undefined;
        }
        if ("bannerH" in body && this.hasPlus(user, roleOf(username))) {
            const h = Math.round(Number(body.bannerH));
            user.bannerH = Number.isFinite(h) && h > 0 ? Math.min(Math.max(h, BANNER_H_MIN), BANNER_H_MAX) : undefined;
        }
        if ("status" in body) {
            if (!STATUSES.includes(body.status)) return json({ error: "Unknown status." }, 400);
            user.status = body.status;
        }
        if ("dmFriendsOnly" in body) user.dmFriendsOnly = !!body.dmFriendsOnly;
        if ("favGifs" in body) {
            const list = Array.isArray(body.favGifs) ? body.favGifs : [];
            user.favGifs = [...new Set(list.map(String).filter((g) => GIF_RE.test(g) || GIF_ID_RE.test(g)))].slice(0, 50);
        }

        await this.ctx.storage.put(key, user);
        this.touch(username);
        return json(await this.publicProfile(username));
    }

    // ---------- profiles & avatars ----------

    async profiles(searchParams) {
        const names = [
            ...new Set(
                String(searchParams.get("names") ?? "")
                    .split(",")
                    .map((n) => n.trim().toLowerCase())
                    .filter((n) => NAME_RE.test(n)),
            ),
        ].slice(0, 40);
        if (!names.length) return json({ profiles: [] });
        const users = await this.many(names.map((n) => `u:${n}`));
        const frs = await this.many(names.map((n) => `fr:${n}`));
        return json({
            profiles: names
                .filter((n) => users.has(`u:${n}`))
                .map((n) => this.makeProfile(users.get(`u:${n}`), frs.get(`fr:${n}`))),
        });
    }

    async leaderboard(searchParams) {
        const type = searchParams.get("type") === "week" ? "week" : "all";
        const now = Date.now();
        const cached = this.board[type];
        if (!cached || now - cached.time > 30000) {
            const list = await this.ctx.storage.list({ prefix: "u:", limit: 2000 });
            const wk = weekKey();
            const score = (u) => (type === "week" ? (u.weekKey === wk ? u.weekEarned || 0 : 0) : u.earned ?? u.orbs ?? 0);
            this.board[type] = {
                time: now,
                data: [...list.values()]
                    .filter((u) => score(u) > 0)
                    .sort((a, b) => score(b) - score(a))
                    .slice(0, 10)
                    .map((u) => ({ username: u.username, orbs: score(u), avatar: u.avatar || 0 })),
            };
        }
        return json({ leaders: this.board[type].data, type });
    }
    async postAvatar(request, searchParams) {
        const username = await this.sessionUser(request);
        if (!username) return json({ error: "Log in first." }, 401);
        const lower = username.toLowerCase();
        const key = `u:${lower}`;
        const user = await this.ctx.storage.get(key);

        if (searchParams.get("remove")) {
            await this.ctx.storage.delete(`av:${lower}`);
            await this.ctx.storage.put(key, { ...user, avatar: 0, avatarAnimated: false });
            return json({ avatar: 0 });
        }

        const nitro = this.hasNitro(user, roleOf(username));
        const max = this.hasPlus(user, roleOf(username)) ? MAX_AVATAR_PLUS : nitro ? MAX_AVATAR_NITRO : MAX_AVATAR_BYTES;
        const declared = Number(request.headers.get("content-length")) || 0;
        const bytes = declared > max ? null : await readLimited(request, max);
        if (!bytes) return json({ error: `Profile picture is too large (max ${max / 1024} KB).` }, 413);
        if (bytes.length === 0) return json({ error: "No image received." }, 400);
        const type = sniffImage(bytes) || sniffGif(bytes);
        if (!type) return json({ error: "Only JPEG, PNG, WebP or GIF images are allowed." }, 415);

        const animated = type === "image/gif" || isAnimatedWebp(bytes);
        if (animated && !nitro) {
            return json({ error: "Animated profile pictures need Nitro.", nitro: true }, 403);
        }

        const version = Date.now();
        await this.ctx.storage.put(`av:${lower}`, { type, bytes: bytes.buffer });
        await this.ctx.storage.put(key, { ...user, avatar: version, avatarAnimated: animated });
        return json({ avatar: version, animated });
    }

    async postBanner(request, searchParams) {
        const username = await this.sessionUser(request);
        if (!username) return json({ error: "Log in first." }, 401);
        const lower = username.toLowerCase();
        const key = `u:${lower}`;
        const user = await this.ctx.storage.get(key);

        if (searchParams.get("remove")) {
            await this.ctx.storage.delete(`bn:${lower}`);
            await this.ctx.storage.put(key, { ...user, bannerImg: 0 });
            return json({ bannerImg: 0 });
        }
        if (!this.hasPlus(user, roleOf(username))) {
            return json({ error: "Uploading a banner needs Nitro Plus.", plus: true }, 403);
        }
        const declared = Number(request.headers.get("content-length")) || 0;
        const bytes = declared > MAX_BANNER_PLUS ? null : await readLimited(request, MAX_BANNER_PLUS);
        if (!bytes) return json({ error: `Banner is too large (max ${MAX_BANNER_PLUS / 1024} KB).` }, 413);
        if (bytes.length === 0) return json({ error: "No image received." }, 400);
        const type = sniffImage(bytes) || sniffGif(bytes);
        if (!type) return json({ error: "Only JPEG, PNG, WebP or GIF images are allowed." }, 415);

        const version = Date.now();
        await this.ctx.storage.put(`bn:${lower}`, { type, bytes: bytes.buffer });
        await this.ctx.storage.put(key, { ...user, bannerImg: version });
        return json({ bannerImg: version });
    }

    async getBanner(name) {
        const lower = name.toLowerCase();
        if (!NAME_RE.test(lower)) return json({ error: "Not found." }, 404);
        const banner = await this.ctx.storage.get(`bn:${lower}`);
        if (!banner) return json({ error: "Not found." }, 404);
        return new Response(banner.bytes, {
            headers: { ...IMAGE_HEADERS(banner.type), "cache-control": "public, max-age=31536000, immutable" },
        });
    }

    async getAvatar(name) {
        const lower = name.toLowerCase();
        if (!NAME_RE.test(lower)) return json({ error: "Not found." }, 404);
        const avatar = await this.ctx.storage.get(`av:${lower}`);
        if (!avatar) return json({ error: "Not found." }, 404);
        return new Response(avatar.bytes, {
            headers: { ...IMAGE_HEADERS(avatar.type), "cache-control": "public, max-age=31536000, immutable" },
        });
    }

    // ---------- shop & nitro ----------

    async shop(request) {
        const username = await this.sessionUser(request);
        const out = { items: SHOP, nitro: { price: NITRO_PRICE, days: NITRO_DAYS, orbsPerMessage: NITRO_ORBS }, plus: { price: PLUS_PRICE, days: PLUS_DAYS, orbsPerMessage: PLUS_ORBS }, box: { price: BOX_PRICE } };
        if (username) {
            const user = await this.ctx.storage.get(`u:${username.toLowerCase()}`);
            const role = roleOf(username);
            const nitro = this.hasNitro(user, role);
            Object.assign(out, {
                orbs: user.orbs || 0,
                owned: user.owned || [],
                equipped: user.equipped || {},
                nitroActive: nitro,
                nitroUntil: role === "a101" ? 0 : user.nitroUntil || 0,
                lifetime: role === "a101",
                plusActive: this.hasPlus(user, role),
                plusUntil: role === "a101" ? 0 : user.plusUntil || 0,
            });
        }
        return json(out);
    }

    async shopAction(request) {
        const username = await this.sessionUser(request);
        if (!username) return json({ error: "Log in first." }, 401);
        const lower = username.toLowerCase();
        const role = roleOf(username);
        const key = `u:${lower}`;
        const user = await this.ctx.storage.get(key);
        const body = (await this.readBody(request)) || {};
        const action = String(body.action ?? "");
        const nitro = this.hasNitro(user, role);
        const item = SHOP.find((i) => i.id === body.item);
        user.owned = user.owned || [];
        user.equipped = user.equipped || {};

        if (action === "buy") {
            if (!item) return json({ error: "That item doesn't exist." }, 404);
            if (user.owned.includes(item.id)) return json({ error: "You already own that." }, 400);
            if (item.nitro && !nitro) return json({ error: "That item needs Nitro.", nitro: true }, 403);
            if ((user.orbs || 0) < item.price) return json({ error: "Not enough orbs." }, 400);
            user.orbs -= item.price;
            user.owned.push(item.id);
            user.equipped[item.slot] = item.id; // wear it straight away
        } else if (action === "equip") {
            if (!item || !user.owned.includes(item.id)) return json({ error: "You don't own that." }, 400);
            if (item.nitro && !nitro) return json({ error: "That item needs Nitro.", nitro: true }, 403);
            user.equipped[item.slot] = item.id;
        } else if (action === "box") {
            if ((user.orbs || 0) < BOX_PRICE) return json({ error: "Not enough orbs." }, 400);
            const pool = SHOP.filter((i) => !user.owned.includes(i.id) && (!i.nitro || nitro));
            if (!pool.length) return json({ error: "You already own everything you can get!" }, 400);
            // cheaper items turn up more often
            const weights = pool.map((i) => 1 / i.price);
            let roll = Math.random() * weights.reduce((a, b) => a + b, 0);
            let won = pool[pool.length - 1];
            for (let n = 0; n < pool.length; n++) {
                roll -= weights[n];
                if (roll <= 0) {
                    won = pool[n];
                    break;
                }
            }
            user.orbs -= BOX_PRICE;
            user.owned.push(won.id);
            if (!user.equipped[won.slot]) user.equipped[won.slot] = won.id;
            await this.ctx.storage.put(key, user);
            return json({ ok: true, won, profile: await this.publicProfile(username) });
        } else if (action === "unequip") {
            if (!SLOTS.includes(body.slot)) return json({ error: "Unknown slot." }, 400);
            delete user.equipped[body.slot];
        } else if (action === "nitro") {
            if (role === "a101") return json({ error: "You already have Nitro forever." }, 400);
            if ((user.orbs || 0) < NITRO_PRICE) return json({ error: "Not enough orbs." }, 400);
            user.orbs -= NITRO_PRICE;
            user.nitroUntil = Math.max(user.nitroUntil || 0, Date.now()) + NITRO_DAYS * DAY_MS;
        } else if (action === "plus") {
            if (role === "a101") return json({ error: "You already have Nitro Plus forever." }, 400);
            if ((user.orbs || 0) < PLUS_PRICE) return json({ error: "Not enough orbs." }, 400);
            user.orbs -= PLUS_PRICE;
            user.plusUntil = Math.max(user.plusUntil || 0, Date.now()) + PLUS_DAYS * DAY_MS;
        } else if (action === "gift") {
            if (role !== "a101") return json({ error: "Only the owner can gift Nitro." }, 403);
            const targetKey = `u:${String(body.user ?? "").trim().toLowerCase()}`;
            const target = await this.ctx.storage.get(targetKey);
            if (!target) return json({ error: "No such user." }, 404);
            const days = Math.min(Math.max(Math.round(Number(body.days) || NITRO_DAYS), 1), 365);
            target.nitroUntil = Math.max(target.nitroUntil || 0, Date.now()) + days * DAY_MS;
            await this.ctx.storage.put(targetKey, target);
            return json({ ok: true, until: target.nitroUntil });
        } else {
            return json({ error: "Unknown action." }, 400);
        }

        await this.ctx.storage.put(key, user);
        return json({ ok: true, profile: await this.publicProfile(username) });
    }

    // ---------- typing, search, reports ----------

    typingNames(key, me) {
        const map = this.typing.get(key);
        if (!map) return [];
        const now = Date.now();
        const exclude = me ? me.toLowerCase() : "";
        const names = [];
        for (const [lower, entry] of map) {
            if (now - entry.time >= TYPING_MS) map.delete(lower);
            else if (lower !== exclude) names.push(entry.name);
        }
        return names.slice(0, 4);
    }

    async typingPing(request) {
        const username = await this.sessionUser(request);
        if (!username) return json({ error: "Log in first." }, 401);
        const body = (await this.readBody(request)) || {};
        const target = await this.resolveTarget(username, body, true);
        if (target.error) return target.error;
        const map = this.typing.get(target.key) || new Map();
        map.set(username.toLowerCase(), { name: username, time: Date.now() });
        this.typing.set(target.key, map);
        if (this.typing.size > 500) this.typing.clear();
        return json({ ok: true });
    }

    async search(request, searchParams) {
        const username = await this.sessionUser(request);
        if (!username) return json({ error: "Log in to search." }, 401);
        if (this.hitLimit(this.searchHits, username.toLowerCase(), 60 * 1000, 12)) {
            return json({ error: "You're searching too fast." }, 429);
        }
        const q = String(searchParams.get("q") ?? "").trim().toLowerCase().slice(0, 50);
        if (q.length < 2) return json({ results: [] });
        const ids = Object.keys(CHANNELS);
        const lists = await this.many(ids.map((c) => `m:${c}`));
        const results = [];
        for (const channel of ids) {
            for (const m of lists.get(`m:${channel}`) || []) {
                if ((m.text || "").toLowerCase().includes(q) || m.name.toLowerCase().includes(q)) {
                    results.push({ channel, id: m.id, name: m.name, text: (m.text || "").slice(0, 200), time: m.time });
                }
            }
        }
        results.sort((a, b) => b.time - a.time);
        return json({ results: results.slice(0, 30) });
    }

    async report(request) {
        const username = await this.sessionUser(request);
        if (!username) return json({ error: "Log in to report." }, 401);
        const lower = username.toLowerCase();
        if (this.hitLimit(this.reportHits, lower, 60 * 60 * 1000, 5)) {
            return json({ error: "You have sent a lot of reports. Try again later." }, 429);
        }
        const body = (await this.readBody(request)) || {};
        const target = await this.resolveTarget(username, body, false);
        if (target.error) return target.error;
        const messages = (await this.ctx.storage.get(`m:${target.key}`)) || [];
        const message = messages.find((m) => m.id === Number(body.id));
        if (!message) return json({ error: "Message not found." }, 404);
        if (message.name.toLowerCase() === lower) return json({ error: "You can't report your own message." }, 400);
        if (message.name === BOT_NAME || message.name === CASINO_NAME || message.name === ZOO_NAME) return json({ error: "That is a bot." }, 400);

        const reports = (await this.ctx.storage.get("reports")) || [];
        if (reports.some((r) => r.reporter === lower && r.key === target.key && r.msgId === message.id)) {
            return json({ error: "You already reported that message." }, 400);
        }
        reports.push({
            id: `${Date.now().toString(36)}${toHex(crypto.getRandomValues(new Uint8Array(2)))}`,
            reporter: username,
            target: message.name,
            text: (message.text || (message.image ? "[image]" : message.video ? "[video]" : message.gif ? "[GIF]" : "")).slice(0, 300),
            where: target.key.startsWith("dm:") ? "a direct message" : target.key.startsWith("g:") ? "a group chat" : `#${target.key}`,
            msgId: message.id,
            key: target.key,
            reason: String(body.reason ?? "").replace(/\s+/g, " ").trim().slice(0, 100),
            time: Date.now(),
        });
        await this.ctx.storage.put("reports", reports.slice(-MAX_REPORTS));
        return json({ ok: true });
    }

    // ---------- moderation ----------

    async requireMod(request) {
        const username = await this.sessionUser(request);
        if (!username) return { error: json({ error: "Log in first." }, 401) };
        if (!MODERATORS.includes(roleOf(username))) return { error: json({ error: "Moderators only." }, 403) };
        return { username };
    }

    async modOverview(request) {
        const who = await this.requireMod(request);
        if (who.error) return who.error;
        const now = Date.now();
        const entries = [...this.modMap];
        const names = await this.many(entries.map(([lower]) => `u:${lower}`));
        const nameOf = (lower) => names.get(`u:${lower}`)?.username || lower;
        return json({
            reports: ((await this.ctx.storage.get("reports")) || []).slice().reverse(),
            muted: entries
                .filter(([, m]) => m.mutedUntil > now)
                .map(([lower, m]) => ({ user: nameOf(lower), until: m.mutedUntil, reason: m.muteReason || "" })),
            banned: entries
                .filter(([, m]) => m.banned)
                .map(([lower, m]) => ({ user: nameOf(lower), by: m.banned.by, reason: m.banned.reason, time: m.banned.time })),
            log: ((await this.ctx.storage.get("modlog")) || []).slice(-30).reverse(),
            submissions: (await this.ctx.storage.get("pending")) || [],
            community: (await this.ctx.storage.get("community")) || [],
        });
    }

    async modAction(request) {
        const who = await this.requireMod(request);
        if (who.error) return who.error;
        const actor = who.username;
        const body = (await this.readBody(request)) || {};
        const action = String(body.action ?? "");
        const reason = String(body.reason ?? "").replace(/\s+/g, " ").trim().slice(0, 100);

        if (action === "asset-approve" || action === "asset-reject" || action === "asset-remove") {
            const pending = (await this.ctx.storage.get("pending")) || [];
            const community = (await this.ctx.storage.get("community")) || [];
            const id = String(body.id ?? "");
            if (action === "asset-remove") {
                if (!community.some((c) => c.id === id)) return json({ error: "Not found." }, 404);
                await this.ctx.storage.put("community", community.filter((c) => c.id !== id));
                await this.ctx.storage.delete(`ca:${id}`);
            } else {
                const item = pending.find((p) => p.id === id);
                if (!item) return json({ error: "Not found." }, 404);
                await this.ctx.storage.put("pending", pending.filter((p) => p.id !== id));
                if (action === "asset-approve") {
                    await this.ctx.storage.put("community", [...community, { id: item.id, kind: item.kind, name: item.name, by: item.by, video: !!item.video }]);
                } else {
                    await this.ctx.storage.delete(`ca:${id}`);
                }
            }
            const log = (await this.ctx.storage.get("modlog")) || [];
            log.push({ time: Date.now(), by: actor, action, user: String(body.name || id), reason: "" });
            await this.ctx.storage.put("modlog", log.slice(-100));
            return json({ ok: true });
        }

        if (action === "resolve") {
            const reports = ((await this.ctx.storage.get("reports")) || []).filter((r) => r.id !== body.id);
            await this.ctx.storage.put("reports", reports);
            return json({ ok: true });
        }

        const target = await this.ctx.storage.get(`u:${String(body.user ?? "").trim().toLowerCase()}`);
        if (!target) return json({ error: "No such user." }, 404);
        const lower = target.username.toLowerCase();
        if (lower === actor.toLowerCase()) return json({ error: "You can't do that to yourself." }, 400);
        if (RANK[roleOf(target.username)] >= RANK[roleOf(actor)]) {
            return json({ error: "You can only act on people below your rank." }, 403);
        }

        await this.loadMod();
        const rec = { ...(this.modMap.get(lower) || {}) };
        const now = Date.now();
        if (action === "mute") {
            const minutes = Math.min(Math.max(Math.round(Number(body.minutes) || 10), 1), MAX_MUTE_MINUTES);
            rec.mutedUntil = now + minutes * 60000;
            rec.muteReason = reason;
        } else if (action === "unmute") {
            delete rec.mutedUntil;
            delete rec.muteReason;
        } else if (action === "ban") {
            rec.banned = { by: actor, reason, time: now };
        } else if (action === "unban") {
            delete rec.banned;
        } else if (action === "warn") {
            if (!reason) return json({ error: "Add a reason for the warning." }, 400);
            rec.warnings = [...(rec.warnings || []), { id: now, by: actor, reason, time: now, ack: false }].slice(-10);
        } else {
            return json({ error: "Unknown action." }, 400);
        }

        this.modMap.set(lower, rec);
        await this.ctx.storage.put(`mod:${lower}`, rec);
        const log = (await this.ctx.storage.get("modlog")) || [];
        log.push({ time: now, by: actor, action, user: target.username, reason });
        await this.ctx.storage.put("modlog", log.slice(-100));
        return json({ ok: true });
    }

    async ack(request) {
        const username = await this.sessionUser(request);
        if (!username) return json({ error: "Log in first." }, 401);
        const body = (await this.readBody(request)) || {};
        const lower = username.toLowerCase();
        const rec = this.modMap.get(lower);
        if (rec?.warnings) {
            rec.warnings = rec.warnings.map((w) => (w.id === Number(body.id) ? { ...w, ack: true } : w));
            await this.ctx.storage.put(`mod:${lower}`, rec);
        }
        return json({ ok: true });
    }

    // ---------- polls, edits, blocks, community stickers and emoji ----------

    async vote(request) {
        const username = await this.sessionUser(request);
        if (!username) return json({ error: "Log in to vote." }, 401);
        if (this.hitLimit(this.reactHits, username.toLowerCase(), 10 * 1000, REACT_PER_10S)) {
            return json({ error: "You're voting too fast." }, 429);
        }
        const body = (await this.readBody(request)) || {};
        const target = await this.resolveTarget(username, body, false);
        if (target.error) return target.error;
        const messages = (await this.ctx.storage.get(`m:${target.key}`)) || [];
        const message = messages.find((m) => m.id === Number(body.id));
        const poll = message?.poll;
        if (!poll) return json({ error: "That poll doesn't exist." }, 404);
        if (Date.now() > poll.ends) return json({ error: "This poll has ended." }, 400);
        const option = Number(body.option);
        if (!Number.isInteger(option) || option < 0 || option >= poll.options.length) {
            return json({ error: "Pick one of the options." }, 400);
        }
        const had = poll.votes[option].includes(username);
        poll.votes = poll.votes.map((list) => list.filter((n) => n !== username));
        if (!had) poll.votes[option].push(username);
        await this.ctx.storage.put(`m:${target.key}`, messages);
        await this.bumpVersion(target.key);
        return json({ ok: true });
    }

    async editMessage(request) {
        const username = await this.sessionUser(request);
        if (!username) return json({ error: "Log in first." }, 401);
        const lower = username.toLowerCase();
        if (this.hitLimit(this.editHits, lower, 60 * 1000, 10)) return json({ error: "You're editing too fast." }, 429);
        const body = (await this.readBody(request)) || {};
        const target = await this.resolveTarget(username, body, true);
        if (target.error) return target.error;
        const messages = (await this.ctx.storage.get(`m:${target.key}`)) || [];
        const message = messages.find((m) => m.id === Number(body.id));
        if (!message) return json({ error: "Message not found." }, 404);
        if (message.name.toLowerCase() !== lower || message.bot) return json({ error: "You can only edit your own messages." }, 403);
        if (Date.now() - message.time > EDIT_WINDOW_MS) return json({ error: "Messages can be edited for an hour after sending." }, 400);

        const text = String(body.text ?? "").trim().slice(0, await this.textLimit(username));
        const hasMedia = !!(message.image || message.video || message.gif || message.sticker);
        if (!text && !hasMedia) return json({ error: "A message can't be empty." }, 400);
        const user = await this.ctx.storage.get(`u:${lower}`);
        const check = text ? this.contentCheck(username, text, user, true) : null;
        if (check) return check;

        message.text = text;
        message.edited = Date.now();
        if (!target.isDm) {
            const mentions = await this.findMentions(text, username);
            const replied = message.replyTo?.name;
            if (replied && replied !== BOT_NAME && replied !== CASINO_NAME && replied !== ZOO_NAME && replied.toLowerCase() !== lower && !mentions.includes(replied)) mentions.push(replied);
            if (mentions.length) message.mentions = mentions;
            else delete message.mentions;
        }
        await this.ctx.storage.put(`m:${target.key}`, messages);
        await this.bumpVersion(target.key);
        return json({ ok: true });
    }

    async blockAction(request) {
        const username = await this.sessionUser(request);
        if (!username) return json({ error: "Log in first." }, 401);
        const me = username.toLowerCase();
        const body = (await this.readBody(request)) || {};
        const target = await this.ctx.storage.get(`u:${String(body.user ?? "").trim().toLowerCase()}`);
        if (!target) return json({ error: "No such user." }, 404);
        const other = target.username.toLowerCase();
        if (other === me) return json({ error: "You can't block yourself." }, 400);
        const user = await this.ctx.storage.get(`u:${me}`);
        const list = (user.blocked || []).filter((n) => n !== other);
        if (body.action === "block") {
            if (list.length >= MAX_BLOCKED) return json({ error: "Your block list is full." }, 400);
            list.push(other);
            // blocking someone also ends any friendship or pending request
            const mine = await this.loadFriends(me);
            const theirs = await this.loadFriends(other);
            const without = (l, n) => l.filter((x) => x !== n);
            mine.friends = without(mine.friends, other);
            mine.incoming = without(mine.incoming, other);
            mine.outgoing = without(mine.outgoing, other);
            theirs.friends = without(theirs.friends, me);
            theirs.incoming = without(theirs.incoming, me);
            theirs.outgoing = without(theirs.outgoing, me);
            await this.ctx.storage.put({ [`fr:${me}`]: mine, [`fr:${other}`]: theirs });
        } else if (body.action !== "unblock") {
            return json({ error: "Unknown action." }, 400);
        }
        user.blocked = list;
        await this.ctx.storage.put(`u:${me}`, user);
        return json({ ok: true, blocked: list });
    }

    async community() {
        const items = (await this.ctx.storage.get("community")) || [];
        return json({ stickers: items.filter((i) => i.kind === "sticker"), emojis: items.filter((i) => i.kind === "emoji"), gifs: items.filter((i) => i.kind === "gif") });
    }

    async getAsset(id) {
        if (!/^u_[0-9a-f]{12}$/.test(id)) return json({ error: "Not found." }, 404);
        const asset = await this.ctx.storage.get(`ca:${id}`);
        if (!asset) return json({ error: "Not found." }, 404);
        return new Response(asset.bytes, {
            headers: { ...IMAGE_HEADERS(asset.type), "cache-control": "public, max-age=31536000, immutable" },
        });
    }

    async submitAsset(request, searchParams) {
        const username = await this.sessionUser(request);
        if (!username) return json({ error: "Log in first." }, 401);
        const lower = username.toLowerCase();
        const user = await this.ctx.storage.get(`u:${lower}`);
        if (Date.now() - (user.created || 0) < SUBMIT_MIN_AGE_MS) {
            return json({ error: "New accounts can submit stickers and emoji after 30 minutes." }, 403);
        }
        // only successful submissions count towards the daily limit
        const todays = recent(this.submitHits.get(lower), 24 * 60 * 60 * 1000);
        if (todays.length >= 3) return json({ error: "You can submit 3 per day." }, 429);
        const kindParam = searchParams.get("kind");
        const kind = kindParam === "emoji" ? "emoji" : kindParam === "gif" ? "gif" : "sticker";
        const raw = String(searchParams.get("name") ?? "").trim();
        const name = kind === "emoji" ? raw.toLowerCase() : raw.replace(/\s+/g, " ").slice(0, 24);
        if (kind === "emoji" && !/^[a-z0-9_]{2,24}$/.test(name)) {
            return json({ error: "Emoji names are 2-24 letters, numbers or underscores." }, 400);
        }
        if (kind !== "emoji" && name.length < 2) return json({ error: `Give the ${kind} a name.` }, 400);

        const taken = new Set(((await this.fetchAsset("/data/_emojis.json")) || []).map((e) => e.name));
        const community = (await this.ctx.storage.get("community")) || [];
        const pending = (await this.ctx.storage.get("pending")) || [];
        if (kind === "emoji" && (taken.has(name) || [...community, ...pending].some((c) => c.kind === "emoji" && c.name === name))) {
            return json({ error: "That emoji name is already taken." }, 409);
        }
        if (pending.length >= MAX_PENDING) return json({ error: "The review queue is full. Try again later." }, 429);
        if (community.filter((c) => c.kind === kind).length >= MAX_COMMUNITY) {
            return json({ error: "The community library is full." }, 400);
        }

        const max = kind === "emoji" ? EMOJI_BYTES : kind === "gif" ? GIF_SUBMIT_BYTES : STICKER_BYTES;
        const declared = Number(request.headers.get("content-length")) || 0;
        const bytes = declared > max ? null : await readLimited(request, max);
        if (!bytes) return json({ error: `That file is too big (max ${max / 1024} KB).` }, 413);
        const type = kind === "gif" ? sniffGif(bytes) || sniffVideo(bytes) : sniffImage(bytes) || sniffGif(bytes);
        if (!type) return json({ error: kind === "gif" ? "GIFs must be .gif, .mp4 or .webm files." : "Only PNG, JPEG, WebP or GIF images." }, 415);

        const id = `u_${toHex(crypto.getRandomValues(new Uint8Array(6)))}`;
        await this.ctx.storage.put({
            [`ca:${id}`]: { type, bytes: bytes.buffer },
            pending: [...pending, { id, kind, name, by: username, time: Date.now(), video: type.startsWith("video/") }],
        });
        this.submitHits.set(lower, [...todays, Date.now()]);
        return json({ ok: true });
    }

    // ---------- bot ----------
    async botMessage(key, content, extra = {}) {
        const messages = (await this.ctx.storage.get(`m:${key}`)) || [];
        const nextId = ((await this.ctx.storage.get(`n:${key}`)) || 0) + 1;
        messages.push({ id: nextId, name: BOT_NAME, bot: true, text: content.text || "", time: Date.now(), ...(content.levelCard ? { levelCard: content.levelCard } : {}), ...(content.poll ? { poll: content.poll } : {}), ...extra });
        const kept = messages.slice(-MAX_MESSAGES);
        const dropped = messages.slice(0, messages.length - kept.length);
        const writes = { [`m:${key}`]: kept, [`n:${key}`]: nextId };
        for (const name of extra.mentions || []) writes[`mn:${key}:${name.toLowerCase()}`] = nextId;
        await this.ctx.storage.put(writes);
        if (dropped.length) await this.purgeMessageAssets(dropped);
        return nextId;
    }

    async fetchAsset(path) {
        const url = this.origin + path;
        try {
            const res = this.env?.ASSETS ? await this.env.ASSETS.fetch(new Request(url)) : await fetch(url);
            return res.ok ? await res.json() : null;
        } catch {
            return null;
        }
    }

    /** Every level on the three lists, from the latest Time Machine snapshot (cached for 5 minutes). */
    async levelIndex() {
        if (this.levelCache.data && Date.now() - this.levelCache.time < 5 * 60 * 1000) return this.levelCache.data;
        const tm = await this.fetchAsset("/data/_timemachine.json");
        const days = tm ? Object.keys(tm).sort() : [];
        const last = days.length ? tm[days[days.length - 1]] : null;
        const levels = [];
        for (const [list, entries] of [["main", last?.list || []], ["aill", last?.aill || []]]) {
            entries.forEach((e, i) => levels.push({ name: e.n, path: e.p, verifier: e.v, list, rank: i + 1 }));
        }
        const atpll = (await this.fetchAsset("/data/_atpll.json")) || [];
        for (let i = 0; i < atpll.length; i++) {
            const level = await this.fetchAsset(`/data/${atpll[i]}.json`);
            if (level) levels.push({ name: level.name, path: atpll[i], verifier: level.verifier, list: "atpll", rank: i + 1 });
        }
        this.levelCache = { time: Date.now(), data: levels };
        return levels;
    }

    findLevel(levels, query) {
        const q = query.trim().toLowerCase();
        if (!q) return null;
        return (
            levels.find((l) => l.name.toLowerCase() === q) ||
            levels.find((l) => l.name.toLowerCase().startsWith(q)) ||
            levels.find((l) => l.name.toLowerCase().includes(q)) ||
            null
        );
    }

    async customCommands() {
        return (await this.ctx.storage.get("cmds")) || [];
    }

    async botInfo() {
        return json({
            name: BOT_NAME,
            builtin: BUILTIN_COMMANDS,
            custom: (await this.customCommands()).map((c) => ({ name: c.name, reply: c.reply })),
        });
    }

    async botManage(request) {
        const who = await this.requireMod(request);
        if (who.error) return who.error;
        const body = (await this.readBody(request)) || {};
        const cmds = await this.customCommands();
        const name = String(body.name ?? "").trim().toLowerCase().replace(/^\//, "");
        if (!/^[a-z0-9_]{2,20}$/.test(name)) return json({ error: "Command names are 2-20 letters, numbers or underscores." }, 400);
        if (body.action === "add") {
            const reply = String(body.reply ?? "").trim().slice(0, 300);
            if (!reply) return json({ error: "Write what the bot should reply." }, 400);
            if (BUILTIN_COMMANDS.includes(name)) return json({ error: "That is a built-in command." }, 400);
            if (!cmds.some((c) => c.name === name) && cmds.length >= MAX_CUSTOM_COMMANDS) {
                return json({ error: "Too many custom commands." }, 400);
            }
            await this.ctx.storage.put("cmds", [...cmds.filter((c) => c.name !== name), { name, reply }]);
        } else if (body.action === "remove") {
            await this.ctx.storage.put("cmds", cmds.filter((c) => c.name !== name));
        } else {
            return json({ error: "Unknown action." }, 400);
        }
        return this.botInfo();
    }

    /** Lets the owner's scripts post as the bot, e.g. to announce new levels. */
    async botSay(request) {
        const header = request.headers.get("authorization") || "";
        const token = header.startsWith("Bot ") ? header.slice(4).trim() : "";
        if (!token || !safeEqual(await sha256(token), BOT_TOKEN_HASH)) return json({ error: "Bad bot token." }, 401);
        const now = Date.now();
        this.botHits = this.botHits.filter((t) => now - t < 60000);
        if (this.botHits.length >= 30) return json({ error: "Slow down." }, 429);
        this.botHits.push(now);

        const body = (await this.readBody(request)) || {};
        const channel = String(body.channel ?? "announcements");
        if (!has(CHANNELS, channel)) return json({ error: "Unknown channel." }, 404);
        const text = String(body.text ?? "").trim().slice(0, 500);
        let levelCard = null;
        if (body.level) {
            const found = this.findLevel(await this.levelIndex(), String(body.level));
            if (found) levelCard = { path: found.path, list: found.list, rank: found.rank, name: found.name };
        }
        if (!text && !levelCard) return json({ error: "Nothing to say." }, 400);
        const id = await this.botMessage(channel, { text, levelCard });
        return json({ ok: true, id });
    }

    async runCommand(username, target, text, messageId) {
        const lower = username.toLowerCase();
        const [head, ...rest] = text.slice(1).trim().split(/\s+/);
        const name = (head || "").toLowerCase();
        // game and zoo commands have their own cooldown, so they are not held to the 8-a-minute limit
        if (!GAME_COMMANDS.includes(name) && !ZOO_COMMANDS.includes(name) && this.hitLimit(this.commandHits, lower, 60 * 1000, 8)) return;
        const args = rest.join(" ").trim();
        if (!name) return;
        const replyTo = { id: messageId, name: username, text: text.slice(0, 80) };
        const say = (content) => this.botMessage(target.key, typeof content === "string" ? { text: content } : content, { replyTo });
        const casino = (content, extra = {}) => this.botMessage(target.key, typeof content === "string" ? { text: content } : content, { replyTo, name: CASINO_NAME, ...extra });
        if (GAME_COMMANDS.includes(name)) return this.runGame(username, target, name, args, casino);
        if (ZOO_COMMANDS.includes(name)) return this.runZoo(username, target, name, args, (content, extra = {}) => this.botMessage(target.key, typeof content === "string" ? { text: content } : content, { replyTo, name: ZOO_NAME, ...extra }));

        if (name === "rules") return say(`Chat rules:\n${rulesText()}`);
        if (name === "poll") {
            const parts = args.split("|").map((p) => p.trim()).filter(Boolean);
            if (parts.length < 3 || parts.length > MAX_POLL_OPTIONS + 1) {
                return say(`Make a poll like /poll Best tier? | Easy | Hard | Extreme (2 to ${MAX_POLL_OPTIONS} options).`);
            }
            if (this.hitLimit(this.pollHits, lower, 60 * 60 * 1000, 3)) return say("You can make 3 polls an hour.");
            const [question, ...options] = parts;
            return say({
                text: "",
                poll: {
                    q: question.slice(0, 150),
                    options: options.map((o) => o.slice(0, 80)),
                    votes: options.map(() => []),
                    by: username,
                    ends: Date.now() + POLL_TTL_MS,
                },
            });
        }
        if (name === "help") {
            const custom = (await this.customCommands()).map((c) => `/${c.name}`);
            return say(`Commands: /rules, /poll q | a | b, games in #casino (/cf /roulette /slots /dice /blackjack /duel /bal), /hunt in #zoo, /roll [2d6], /flip, /8ball <question>, /choose a | b | c, /rank <level>, /level <level>, /top, /orbs [user]${custom.length ? ", " + custom.join(", ") : ""}`);
        }
        if (name === "roll") {
            const m = /^(\d{1,2})?d(\d{1,4})$/i.exec(args || "d6");
            if (!m) return say("Use it like /roll, /roll d20 or /roll 3d6.");
            const count = Number(m[1] || 1);
            const sides = Number(m[2]);
            if (sides < 2 || count < 1) return say("That dice doesn't exist.");
            const rolls = Array.from({ length: count }, () => 1 + Math.floor(Math.random() * sides));
            return say(`${username} rolled ${count}d${sides}: ${rolls.join(" + ")}${count > 1 ? " = " + rolls.reduce((a, b) => a + b, 0) : ""}`);
        }
        if (name === "flip") return say(`${username} flipped a coin: ${Math.random() < 0.5 ? "Heads" : "Tails"}`);
        if (name === "8ball") {
            const answers = ["It is certain.", "Without a doubt.", "Yes, definitely.", "Most likely.", "Ask again later.", "Cannot predict now.", "Don't count on it.", "My sources say no.", "Very doubtful.", "Outlook not so good."];
            return say(`${args ? args + " - " : ""}${answers[Math.floor(Math.random() * answers.length)]}`);
        }
        if (name === "choose") {
            const options = args.split("|").map((o) => o.trim()).filter(Boolean);
            if (options.length < 2) return say("Give me at least two options, like /choose pizza | burgers");
            return say(`I choose: ${options[Math.floor(Math.random() * options.length)]}`);
        }
        if (name === "rank" || name === "level") {
            if (!args) return say(`Tell me a level, like /${name} a101 never beat`);
            const levels = await this.levelIndex();
            const found = this.findLevel(levels, args);
            if (!found) return say(`I couldn't find a level called "${args.slice(0, 40)}".`);
            const where = { main: "the Main list", aill: "AILL", atpll: "ATPLL" }[found.list];
            return say({
                text: `${found.name} is #${found.rank} on ${where}.`,
                levelCard: { path: found.path, list: found.list, rank: found.rank, name: found.name },
            });
        }
        if (name === "top") {
            const top = (await this.levelIndex()).filter((l) => l.list === "main").slice(0, 5);
            return say(top.length ? `Top ${top.length}: ${top.map((l) => `#${l.rank} ${l.name}`).join(" | ")}` : "I can't read the list right now.");
        }
        if (name === "orbs") {
            const who = args ? await this.ctx.storage.get(`u:${args.replace(/^@/, "").toLowerCase()}`) : await this.ctx.storage.get(`u:${lower}`);
            if (!who) return say("I don't know that user.");
            return say(`${who.username} has ${who.orbs || 0} orbs (${who.earned ?? who.orbs ?? 0} earned in total).`);
        }
        if (name === "grant") {
            // owner only and deliberately not in the command list: /grant <user> <orbs>
            if (roleOf(username) !== "a101") return;
            const [who, amountText] = args.split(/\s+/);
            const amount = Math.round(Number(amountText));
            const targetKey = `u:${String(who || "").replace(/^@/, "").toLowerCase()}`;
            const receiver = who ? await this.ctx.storage.get(targetKey) : null;
            if (!receiver || !(amount >= 1 && amount <= 100000)) return say("Use it like /grant cduking 500 (1 to 100000 orbs).");
            this.addOrbs(receiver, amount, false);
            await this.ctx.storage.put(targetKey, receiver);
            return say(`Gave ${amount} orbs to ${receiver.username}. They now have ${receiver.orbs}.`);
        }
        const custom = (await this.customCommands()).find((c) => c.name === name);
        if (custom) return say(custom.reply);
    }

    // ---------- a101 Casino: orb games ----------

    drawSlots() {
        const total = SLOT_SYMBOLS.reduce((n, s) => n + s.weight, 0);
        const pick = () => {
            let roll = Math.random() * total;
            for (const s of SLOT_SYMBOLS) {
                roll -= s.weight;
                if (roll <= 0) return s;
            }
            return SLOT_SYMBOLS[0];
        };
        const reels = [pick(), pick(), pick()];
        let multiplier = 0;
        if (reels[0] === reels[1] && reels[1] === reels[2]) multiplier = reels[0].three;
        else if (reels.filter((r) => r === SLOT_SYMBOLS[0]).length === 2) multiplier = 1.5;
        return { reels, multiplier };
    }

    /** Roulette bets: returns { label, wins(n), pays } where pays is the total multiplier on a win. */
    rouletteBet(word) {
        const w = String(word || "").toLowerCase();
        const colour = (n) => (n === 0 ? "green" : RED_NUMBERS.has(n) ? "red" : "black");
        const table = {
            red: { label: "Red", wins: (n) => colour(n) === "red", pays: 2 },
            black: { label: "Black", wins: (n) => colour(n) === "black", pays: 2 },
            green: { label: "Green (0)", wins: (n) => n === 0, pays: 36 },
            even: { label: "Even", wins: (n) => n > 0 && n % 2 === 0, pays: 2 },
            odd: { label: "Odd", wins: (n) => n % 2 === 1, pays: 2 },
            low: { label: "Low (1-18)", wins: (n) => n >= 1 && n <= 18, pays: 2 },
            high: { label: "High (19-36)", wins: (n) => n >= 19, pays: 2 },
            "1st12": { label: "1st dozen (1-12)", wins: (n) => n >= 1 && n <= 12, pays: 3 },
            "2nd12": { label: "2nd dozen (13-24)", wins: (n) => n >= 13 && n <= 24, pays: 3 },
            "3rd12": { label: "3rd dozen (25-36)", wins: (n) => n >= 25, pays: 3 },
        };
        const alias = { "1-12": "1st12", "13-24": "2nd12", "25-36": "3rd12", "1-18": "low", "19-36": "high", zero: "green", "0": "green" };
        const key = alias[w] || w;
        if (table[key]) return table[key];
        if (/^\d{1,2}$/.test(w) && Number(w) >= 0 && Number(w) <= 36) {
            const pick = Number(w);
            return { label: `Number ${pick}`, wins: (n) => n === pick, pays: 36 };
        }
        return null;
    }

    // ---------- a101 Zoo: /hunt ----------

    async runInventory(username, target, say) {
        if (target.key !== "zoo") return say("Your inventory is in #zoo. Head over there!");
        const userKey = `u:${username.toLowerCase()}`;
        const user = await this.ctx.storage.get(userKey);
        await this.upgradeGems(userKey, user);
        const zoo = user.zoo || {};
        const sup = (n) => String(n).replace(/\d/g, (d) => "\u2070\u00B9\u00B2\u00B3\u2074\u2075\u2076\u2077\u2078\u2079"[d]);
        // one row per tier: the animals with how many you own (0 when none), hidden tiers stay "?" until you catch one
        const rows = RARITIES.map((r) => {
            const tier = ANIMALS.filter((a) => a.rarity === r.id);
            const found = tier.some((a) => zoo[a.id]);
            const icon = `:rarity_${r.code.toLowerCase()}:`;
            if (r.secret && !found) return `:rarity_locked: ${Array(4).fill("\u2753\u2070").join(" ")}`;
            return `${icon} ${tier.map((a) => `${a.emoji}${sup(zoo[a.id] || 0)}`).join(" ")}`;
        });
        const owned = ANIMALS.filter((a) => zoo[a.id]);
        const gemLine = Object.entries(user.gems || {}).filter(([, n]) => n > 0).map(([key, n]) => `${gemIcon(key.split("_")[0], GEM_TIERS.indexOf(key.split("_")[1]))}${n}`).join(" ");
        return say(`\u{1F33F}\u{1F331}\u{1F333} ${username}'s zoo! \u{1F333}\u{1F331}\u{1F33F}\n${rows.join("\n")}\n${owned.length}/${ANIMALS.length} species, ${owned.reduce((n, a) => n + zoo[a.id], 0)} animals${gemLine ? "\nGems: " + gemLine : ""}`);
    }
    async runHunt(username, target, say) {
        if (target.key !== "zoo") return say("Hunting only works in #zoo. Head over there!");
        const lower = username.toLowerCase();
        const now = Date.now();
        if (now - (this.gameLast.get(lower) || 0) < GAME_COOLDOWN_MS) return;
        this.gameLast.set(lower, now);
        if (this.gameLast.size > 2000) this.gameLast.clear();

        const userKey = `u:${lower}`;
        const user = await this.ctx.storage.get(userKey);
        await this.upgradeGems(userKey, user);
        if ((user.orbs || 0) < HUNT_COST) return say(`A hunt costs ${HUNT_COST} orb and you have ${user.orbs || 0}. Chat in other channels to earn more.`);

        // gems: Hunting Gem catches one extra animal, Heart Gem makes Gem animals much more likely
        const gems = (user.gems = user.gems || {});
        const hunt = activeGem(gems, "hunting");
        const heart = activeGem(gems, "heart");
        const catches = 1 + (hunt ? hunt.value : 0);
        const weights = RARITIES.map((r) => (r.id === "gem" && heart ? r.weight * heart.value : r.weight));
        const total = weights.reduce((n, w) => n + w, 0);
        const draw = () => {
            let roll = (crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296) * total;
            let pick = 0;
            for (let n = 0; n < weights.length; n++) {
                roll -= weights[n];
                if (roll < 0) {
                    pick = n;
                    break;
                }
            }
            const rarity = RARITIES[pick];
            const pool = ANIMALS.filter((a) => a.rarity === rarity.id);
            return { animal: pool[crypto.getRandomValues(new Uint32Array(1))[0] % pool.length], rarity };
        };

        this.addOrbs(user, -HUNT_COST, false);
        user.zoo = user.zoo || {};
        const tierOf = (id) => ANIMALS.find((a) => a.id === id)?.rarity;
        const tierSeen = (id) => Object.keys(user.zoo).some((k) => tierOf(k) === id);
        const results = [];
        for (let n = 0; n < catches; n++) {
            const { animal, rarity } = draw();
            const isNew = !user.zoo[animal.id];
            const newTier = !tierSeen(rarity.id);
            user.zoo[animal.id] = (user.zoo[animal.id] || 0) + 1;
            results.push({
                id: animal.id,
                text: `${animal.emoji} ${animal.name} :rarity_${rarity.code.toLowerCase()}: ${rarity.label}`,
                notes: `${isNew ? " NEW!" : ""}${newTier && rarity.secret ? ` \u{1F513} ${rarity.label} tier unlocked!` : ""}`,
            });
        }
        if (hunt) gems[hunt.key] -= 1;
        if (heart) gems[heart.key] -= 1;
        await this.ctx.storage.put(userKey, user);

        const species = Object.keys(user.zoo).length;
        const tiers = RARITIES.map((r) => (!r.secret || tierSeen(r.id) ? `:rarity_${r.code.toLowerCase()}:` : ":rarity_locked:")).join(" ");
        const gemNote = [hunt ? `${RARITIES[hunt.tier].label} Hunting Gem: ${gems[hunt.key]} left` : "", heart ? `${RARITIES[heart.tier].label} Heart Gem: ${gems[heart.key]} left` : ""].filter(Boolean).join(", ");
        const head = results.length === 1
            ? `catches a ${results[0].text}!${results[0].notes}\nYou own ${user.zoo[results[0].id]} of them and `
            : `catches ${results.length} animals!\n${results.map((r) => `\u203A ${r.text}${r.notes}`).join("\n")}\nYou have `;
        return say(`\u{1F3F9} ${username} goes hunting... ${head}${species}/${ANIMALS.length} species. Tiers: ${tiers}. Balance: ${user.orbs}${gemNote ? ` (${gemNote})` : ""}`);
    }

    // ---------- a101 Zoo: gems, team and battles ----------

    /** One time per user: gems bought before rarer gems lasted longer are scaled up to the new durations. */
    async upgradeGems(userKey, user) {
        if (user.gemsV >= 2) return;
        user.gemsV = 2;
        for (const [key, n] of Object.entries(user.gems || {})) {
            const [type, tier] = key.split("_");
            const t = GEM_TIERS.indexOf(tier);
            if (n > 0 && GEMS[type] && t >= 0) user.gems[key] = Math.round((n * GEMS[type].uses[t]) / OLD_GEM_USES[type][t]);
        }
        await this.ctx.storage.put(userKey, user);
    }

    petLevel(xp) {
        return Math.min(MAX_PET_LEVEL, 1 + Math.floor(Math.sqrt((xp || 0) / 20)));
    }

    petStats(animal, level) {
        const [hp, atk, def] = TIER_STATS[animal.rarity];
        const k = 1 + 0.1 * (level - 1);
        return { hp: Math.round(hp * k), atk: Math.round(atk * k), def: Math.round(def * k) };
    }

    /** The saved team (or the best three animals you own when none is set). */
    zooTeam(user) {
        const zoo = user.zoo || {};
        const rank = (a) => RARITIES.findIndex((r) => r.id === a.rarity);
        let team = (user.team || []).map((id) => ANIMALS.find((a) => a.id === id)).filter((a) => a && zoo[a.id]);
        if (!team.length) team = ANIMALS.filter((a) => zoo[a.id]).sort((a, b) => rank(b) - rank(a) || zoo[b.id] - zoo[a.id]).slice(0, TEAM_SIZE);
        return team.slice(0, TEAM_SIZE);
    }

    async runZoo(username, target, name, args, say) {
        if (name === "hunt") return this.runHunt(username, target, say);
        if (name === "inventory" || name === "inv") return this.runInventory(username, target, say);
        if (target.key !== "zoo") return say("The zoo commands only work in #zoo. Head over there!");
        const lower = username.toLowerCase();
        const userKey = `u:${lower}`;
        const user = await this.ctx.storage.get(userKey);
        await this.upgradeGems(userKey, user);
        user.gems = user.gems || {};

        if (name === "gems") {
            const words = args.toLowerCase().split(/\s+/).filter(Boolean);
            if (words[0] === "buy") {
                const type = words[1];
                const gem = GEMS[type];
                if (!gem) return say("Gems: hunting, heart or power. Example: /gems buy hunting rare");
                const wanted = words[2] || "common";
                const tier = GEM_TIERS.findIndex((t) => t === wanted || t[0] === wanted);
                if (tier < 0) return say("Tiers: common, uncommon, rare, epic or legendary (or c u r e l). Example: /gems buy hunting rare");
                const price = gem.price[tier];
                if ((user.orbs || 0) < price) return say(`A ${RARITIES[tier].label} ${gem.name} costs ${price} orbs and you have ${user.orbs || 0}.`);
                this.addOrbs(user, -price, false);
                const key = `${type}_${GEM_TIERS[tier]}`;
                user.gems[key] = (user.gems[key] || 0) + gem.uses[tier];
                await this.ctx.storage.put(userKey, user);
                return say(`${gemIcon(type, tier)} ${username} bought a ${RARITIES[tier].label} ${gem.name}! ${user.gems[key]} uses left. Balance: ${user.orbs}`);
            }
            const lines = Object.entries(GEMS).flatMap(([type, g]) => [
                g.name,
                ...GEM_TIERS.map((t, i) => `${gemIcon(type, i)} ${RARITIES[i].label} - ${g.price[i]} orbs, ${g.uses[i]} uses - ${g.desc(g.power[i])}${user.gems[`${type}_${t}`] ? ` (you have ${user.gems[`${type}_${t}`]} left)` : ""}`),
            ]);
            return say(`\u{1F48E} Gem shop (you have ${user.orbs || 0} orbs)\n${lines.join("\n")}\nBuy with /gems buy <hunting|heart|power> <common|uncommon|rare|epic|legendary>. The best gem you own is used first.`);
        }
        const xp = user.zooXp || {};
        const row = (a) => {
            const lvl = this.petLevel(xp[a.id]);
            const st = this.petStats(a, lvl);
            return `L. ${lvl} ${a.emoji} ${a.name} - HP ${st.hp} ATK ${st.atk} DEF ${st.def}`;
        };

        if (name === "team") {
            if (args) {
                const zoo = user.zoo || {};
                const picked = [];
                for (const word of args.split(/[,|]/).map((w) => w.trim().toLowerCase()).filter(Boolean)) {
                    const found = ANIMALS.find((a) => a.name.toLowerCase() === word);
                    if (!found || !zoo[found.id]) return say(`You don't own "${word.slice(0, 30)}". Use names from /inventory, like /team Fox, Gem Lion, Tiger`);
                    if (!picked.includes(found.id)) picked.push(found.id);
                }
                if (!picked.length) return say("Pick up to 3 animals, like /team Fox, Gem Lion, Tiger");
                user.team = picked.slice(0, TEAM_SIZE);
                await this.ctx.storage.put(userKey, user);
            }
            const team = this.zooTeam(user);
            if (!team.length) return say("You don't have any animals yet. Use /hunt first!");
            return say(`\u{1F43E} ${username}'s team\n${team.map(row).join("\n")}\nChange it with /team Fox, Gem Lion, Tiger. Fight with /battle.`);
        }

        if (name === "battle") {
            const now = Date.now();
            if (now - (this.gameLast.get(lower) || 0) < GAME_COOLDOWN_MS) return;
            this.gameLast.set(lower, now);
            const team = this.zooTeam(user);
            if (!team.length) return say("You need at least one animal to fight. Use /hunt first!");
            user.zooXp = xp;
            const pg = activeGem(user.gems, "power");
            const unit = (a, lvl, side, boost = 1) => {
                const st = this.petStats(a, lvl);
                return { a, lvl, side, hp: st.hp, max: st.hp, atk: Math.round(st.atk * boost), def: st.def };
            };
            const mine = team.map((a) => unit(a, this.petLevel(xp[a.id]), 0, pg ? 1 + pg.value / 100 : 1));
            const avg = Math.round(mine.reduce((n, u) => n + u.lvl, 0) / mine.length);
            const pickTier = () => {
                let roll = Math.random() * ENEMY_TIERS.reduce((n, t) => n + t[1], 0);
                for (const [id, weight] of ENEMY_TIERS) {
                    roll -= weight;
                    if (roll < 0) return id;
                }
                return "common";
            };
            const foes = mine.map(() => {
                const pool = ANIMALS.filter((a) => a.rarity === pickTier());
                const lvl = Math.min(MAX_PET_LEVEL, Math.max(1, avg + Math.floor(Math.random() * 6) - 2));
                return unit(pool[Math.floor(Math.random() * pool.length)], lvl, 1);
            });
            const order = mine.flatMap((u, i) => [u, foes[i]]);
            const alive = (side) => (side ? foes : mine).filter((u) => u.hp > 0);
            let turns = 0;
            while (turns < MAX_TURNS && alive(0).length && alive(1).length) {
                turns += 1;
                for (const u of order) {
                    if (u.hp <= 0) continue;
                    const targets = alive(u.side ? 0 : 1);
                    if (!targets.length) break;
                    const t = targets[Math.floor(Math.random() * targets.length)];
                    t.hp = Math.max(0, t.hp - Math.max(1, Math.round(u.atk * (0.85 + Math.random() * 0.3) - t.def * 0.5)));
                }
            }
            const won = alive(1).length === 0 && alive(0).length > 0;
            const draw = alive(0).length > 0 && alive(1).length > 0;
            const foeAvg = Math.round(foes.reduce((n, u) => n + u.lvl, 0) / foes.length);
            const gain = won ? 50 + 8 * foeAvg : 15;
            const ups = [];
            for (const u of mine) {
                const before = u.lvl;
                xp[u.a.id] = (xp[u.a.id] || 0) + gain;
                const after = this.petLevel(xp[u.a.id]);
                if (after > before) ups.push(`${u.a.name} is now level ${after}!`);
            }
            if (pg) user.gems[pg.key] -= 1;
            await this.ctx.storage.put(userKey, user);
            const show = (u) => `L. ${u.lvl} ${u.a.emoji} ${u.a.name} ${u.hp}/${u.max} HP`;
            const result = won ? `You won in ${turns} turns!` : draw ? `Nobody won in ${MAX_TURNS} turns, it's a draw.` : `You lost in ${turns} turns!`;
            return say(`\u2694\uFE0F ${username} goes into battle!\n${username}'s team\n${mine.map(show).join("\n")}\nWild team\n${foes.map(show).join("\n")}\n${result} | +${gain} xp${pg ? ` (${RARITIES[pg.tier].label} Power Gem: ${user.gems[pg.key]} left)` : ""}${ups.length ? "\n\u2B06\uFE0F " + ups.join(" ") : ""}`);
        }
    }
    async runGame(username, target, name, args, say) {
        if (target.key !== "casino") return say("Games only work in #casino. Head over there to play!");
        const lower = username.toLowerCase();
        const now = Date.now();
        if (now - (this.gameLast.get(lower) || 0) < GAME_COOLDOWN_MS) return;
        this.gameLast.set(lower, now);
        if (this.gameLast.size > 2000) this.gameLast.clear();

        const userKey = `u:${lower}`;
        const user = await this.ctx.storage.get(userKey);
        const orbs = user.orbs || 0;
        const words = args.split(/\s+/).filter(Boolean);
        const parseBet = (word, max) => {
            const w = String(word || "").toLowerCase();
            if (w === "all") return Math.min(orbs, max);
            if (w === "half") return Math.floor(Math.min(orbs, max) / 2);
            return /^\d+$/.test(w) ? Number(w) : 0;
        };
        const checkBet = (bet, max) => {
            if (!(bet >= 1)) return `Tell me how many orbs to bet. Example: ${GAME_USAGE[name] || "/" + name + " 10"}`;
            if (bet > max) return `The most you can bet is ${max} orbs.`;
            if (bet > orbs) return `You only have ${orbs} orbs.`;
            return "";
        };
        const settle = async (net) => {
            this.addOrbs(user, net, false);
            await this.ctx.storage.put(userKey, user);
        };

        if (name === "bal") return say(`${username} has ${orbs} orbs.`);

        if (name === "cf") {
            const bet = parseBet(words[0], MAX_BET);
            const problem = checkBet(bet, MAX_BET);
            if (problem) return say(problem);
            const win = Math.random() < 0.5;
            await settle(win ? bet : -bet);
            return say(`\u{1FA99} ${username} flips a coin for ${bet} orbs... ${win ? `it's a WIN! You get ${bet * 2} back (+${bet}).` : "you lost it."} Balance: ${user.orbs}`);
        }

        if (name === "roulette") {
            let [kind, amount] = words;
            // allow "/roulette 50 red" as well
            if (kind && amount && /^(\d+|all|half)$/i.test(kind) && !/^(\d+|all|half)$/i.test(amount)) [kind, amount] = [amount, kind];
            if (!kind) {
                return say("Roulette: /roulette <red|black|green|even|odd|low|high|1st12|2nd12|3rd12|0-36> <bet>\nRed, black, even, odd, low, high pay x2. Dozens pay x3. A single number or green pays x36. Example: /roulette red 20");
            }
            const bet = parseBet(amount, MAX_BET);
            const problem = checkBet(bet, MAX_BET);
            const choice = this.rouletteBet(kind);
            if (!choice) return say("I don't know that bet. Try red, black, green, even, odd, low, high, 1st12, 2nd12, 3rd12 or a number from 0 to 36.");
            if (problem) return say(problem);
            const ball = crypto.getRandomValues(new Uint32Array(1))[0] % 37;
            const dot = ball === 0 ? "\u{1F7E2}" : RED_NUMBERS.has(ball) ? "\u{1F534}" : "\u26AB";
            const win = choice.wins(ball);
            const payout = win ? bet * choice.pays : 0;
            await settle(payout - bet);
            return say(`\u{1F3A1} The ball lands on ${dot} ${ball}!\n${username} bet ${bet} on ${choice.label}. ${win ? `You win ${payout - bet}! (x${choice.pays})` : `You lose ${bet}.`} Balance: ${user.orbs}`);
        }

        if (name === "slots") {
            const bet = parseBet(words[0], MAX_BET);
            const problem = checkBet(bet, MAX_BET);
            if (problem) return say(problem);
            const { reels, multiplier } = this.drawSlots();
            const payout = Math.floor(bet * multiplier);
            await settle(payout - bet);
            const strip = `\u{1F3B0} | ${reels.map((r) => r.icon).join(" ")} |`;
            const result = payout > bet ? `You win ${payout - bet}! (x${multiplier})` : payout === bet ? "You got your bet back." : "No luck this time.";
            return say(`${strip}\n${username} bet ${bet}. ${result} Balance: ${user.orbs}`);
        }

        if (name === "dice") {
            let [first, second] = words;
            if (first && second && !/^(\d+|all|half)$/i.test(first) && /^(\d+|all|half)$/i.test(second)) [first, second] = [second, first];
            const side = String(second || "").toLowerCase();
            const bet = parseBet(first, MAX_BET);
            const problem = checkBet(bet, MAX_BET);
            if (problem) return say(problem);
            const bets = {
                low: { label: "Low (2-6)", wins: (s) => s <= 6, pays: 2.3 },
                high: { label: "High (8-12)", wins: (s) => s >= 8, pays: 2.3 },
                seven: { label: "Lucky Seven", wins: (s) => s === 7, pays: 5.7 },
            };
            const choice = bets[side];
            if (!choice) return say("Pick low, high or seven. Example: /dice 20 high. Low and high pay x2.3, seven pays x5.7.");
            const rolls = [1 + Math.floor(Math.random() * 6), 1 + Math.floor(Math.random() * 6)];
            const sum = rolls[0] + rolls[1];
            const win = choice.wins(sum);
            const payout = win ? Math.floor(bet * choice.pays) : 0;
            await settle(payout - bet);
            return say(`\u{1F3B2} ${rolls[0]} + ${rolls[1]} = ${sum}\n${username} bet ${bet} on ${choice.label}. ${win ? `You win ${payout - bet}! (x${choice.pays})` : `You lose ${bet}.`} Balance: ${user.orbs}`);
        }

        if (name === "blackjack") {
            const bet = parseBet(words[0], MAX_BET);
            const problem = checkBet(bet, MAX_BET);
            if (problem) return say(problem);
            const open = this.openRuns.get(lower);
            if (open && open.expires > now) return say("You already have a blackjack hand going. Finish it first.");
            const player = [drawCard(), drawCard()];
            const dealer = [drawCard(), drawCard()];
            const playerBJ = handValue(player) === 21;
            const dealerBJ = handValue(dealer) === 21;
            const bj = { owner: username, bet, player, dealer: [dealer[0]], hidden: true, status: "active", expires: now + BJ_TTL_MS };
            let net = -bet;
            if (playerBJ || dealerBJ) {
                bj.dealer = dealer;
                bj.hidden = false;
                bj.status = playerBJ && dealerBJ ? "push" : playerBJ ? "blackjack" : "lost";
                bj.payout = bj.status === "push" ? bet : bj.status === "blackjack" ? Math.floor(bet * 2.5) : 0;
                net = bj.payout - bet;
            } else {
                this.openRuns.set(lower, { expires: bj.expires });
            }
            await settle(net);
            const id = await say({ text: `\u{1F0CF} ${username} sits down at the blackjack table with ${bet} orbs.` }, { bj });
            if (bj.status === "active") await this.ctx.storage.put(`bj:${id}`, { hole: dealer[1] });
            return;
        }

        if (name === "duel") {
            const otherName = String(words[0] || "").replace(/^@/, "").toLowerCase();
            const bet = parseBet(words[1], MAX_DUEL);
            if (!NAME_RE.test(otherName)) return say("Challenge someone like this: /duel @username 50");
            if (otherName === lower) return say("You can't duel yourself.");
            const problem = checkBet(bet, MAX_DUEL);
            if (problem) return say(problem);
            const other = await this.ctx.storage.get(`u:${otherName}`);
            if (!other) return say("I don't know that user.");
            if ((other.blocked || []).includes(lower)) return say("That user can't be challenged.");
            const open = this.openDuels.get(lower);
            if (open && open.expires > now) return say("You already have an open duel. Wait for it to end first.");
            const nextId = ((await this.ctx.storage.get("n:casino")) || 0) + 1;
            const duel = { from: username, to: other.username, amount: bet, expires: now + DUEL_TTL_MS, status: "open" };
            this.openDuels.set(lower, { id: nextId, expires: duel.expires });
            return say({ text: `\u2694\uFE0F ${username} challenges ${other.username} to a duel for ${bet} orbs! ${other.username}, press Accept or type /accept.` }, { duel, mentions: [other.username] });
        }

        // accept / decline the newest open duel aimed at you
        const messages = (await this.ctx.storage.get("m:casino")) || [];
        const found = [...messages].reverse().find((m) => m.duel && m.duel.status === "open" && m.duel.to.toLowerCase() === lower && m.duel.expires > now);
        if (!found) return say("Nobody has challenged you to a duel right now.");
        const result = await this.settleDuel(found.id, lower, name === "accept" ? "accept" : "decline");
        if (result.error) return say(result.error);
    }

    /** Blackjack buttons: hit, stand or double down. Only the player can press them. */
    async blackjackAction(request) {
        const username = await this.sessionUser(request);
        if (!username) return json({ error: "Log in first." }, 401);
        const body = (await this.readBody(request)) || {};
        const target = await this.resolveTarget(username, { channel: "casino" }, true);
        if (target.error) return target.error;
        const lower = username.toLowerCase();
        const messages = (await this.ctx.storage.get("m:casino")) || [];
        const message = messages.find((m) => m.id === Number(body.id));
        const bj = message?.bj;
        if (!bj) return json({ error: "That hand doesn't exist." }, 404);
        if (bj.owner.toLowerCase() !== lower) return json({ error: "That isn't your hand." }, 403);
        if (bj.status !== "active") return json({ error: "That hand is over." }, 400);
        const holeKey = `bj:${message.id}`;
        const stored = await this.ctx.storage.get(holeKey);
        const userKey = `u:${lower}`;
        const user = await this.ctx.storage.get(userKey);
        const finish = (status) => {
            bj.status = status;
            bj.hidden = false;
            this.openRuns.delete(lower);
        };
        const dealerPlays = async () => {
            const dealer = [bj.dealer[0], stored.hole];
            while (handValue(dealer) < 17) dealer.push(drawCard());
            bj.dealer = dealer;
            const p = handValue(bj.player);
            const d = handValue(dealer);
            if (d > 21 || p > d) {
                finish("won");
                bj.payout = bj.bet * 2;
            } else if (p === d) {
                finish("push");
                bj.payout = bj.bet;
            } else {
                finish("lost");
                bj.payout = 0;
            }
        };

        if (bj.expires < Date.now()) {
            bj.dealer = [bj.dealer[0], stored?.hole || bj.dealer[0]];
            finish("expired");
            bj.payout = 0;
        } else if (body.action === "hit") {
            bj.player.push(drawCard());
            const total = handValue(bj.player);
            if (total > 21) {
                bj.dealer = [bj.dealer[0], stored.hole];
                finish("bust");
                bj.payout = 0;
            } else if (total === 21) {
                await dealerPlays();
            }
        } else if (body.action === "stand") {
            await dealerPlays();
        } else if (body.action === "double") {
            if (bj.player.length !== 2) return json({ error: "You can only double on your first two cards." }, 400);
            if ((user.orbs || 0) < bj.bet) return json({ error: "You don't have enough orbs to double." }, 400);
            this.addOrbs(user, -bj.bet, false);
            bj.bet *= 2;
            bj.doubled = true;
            bj.player.push(drawCard());
            if (handValue(bj.player) > 21) {
                bj.dealer = [bj.dealer[0], stored.hole];
                finish("bust");
                bj.payout = 0;
            } else {
                await dealerPlays();
            }
        } else {
            return json({ error: "Unknown action." }, 400);
        }
        if (bj.status !== "active") {
            if (bj.payout) this.addOrbs(user, bj.payout, false);
            await this.ctx.storage.delete(holeKey);
        }
        await this.ctx.storage.put(userKey, user);
        await this.ctx.storage.put("m:casino", messages);
        await this.bumpVersion("casino");
        return json({ ok: true, status: bj.status });
    }
    /** Settle an open duel. Returns { error } or { ok }. Used by the buttons and the /accept command. */
    async settleDuel(messageId, actorLower, action) {
        const messages = (await this.ctx.storage.get("m:casino")) || [];
        const message = messages.find((m) => m.id === Number(messageId));
        const duel = message?.duel;
        if (!duel) return { error: "That duel doesn't exist." };
        const from = duel.from.toLowerCase();
        const to = duel.to.toLowerCase();
        const now = Date.now();
        if (duel.status !== "open") return { error: "That duel is already over." };
        if (duel.expires < now) {
            duel.status = "expired";
        } else if (action === "decline") {
            if (actorLower !== to && actorLower !== from) return { error: "That isn't your duel." };
            duel.status = actorLower === from ? "cancelled" : "declined";
        } else {
            if (actorLower !== to) return { error: "Only the person who was challenged can accept." };
            const a = await this.ctx.storage.get(`u:${from}`);
            const b = await this.ctx.storage.get(`u:${to}`);
            if ((a.orbs || 0) < duel.amount || (b.orbs || 0) < duel.amount) {
                duel.status = "failed";
            } else {
                const winnerIsFrom = crypto.getRandomValues(new Uint32Array(1))[0] % 2 === 0;
                const [winner, loser] = winnerIsFrom ? [a, b] : [b, a];
                const fee = Math.ceil(duel.amount * DUEL_FEE);
                this.addOrbs(winner, duel.amount - fee, false);
                this.addOrbs(loser, -duel.amount, false);
                await this.ctx.storage.put({ [`u:${from}`]: a, [`u:${to}`]: b });
                duel.status = "done";
                duel.winner = winner.username;
                duel.fee = fee;
            }
        }
        this.openDuels.delete(from);
        await this.ctx.storage.put("m:casino", messages);
        await this.bumpVersion("casino");
        const note =
            duel.status === "done"
                ? `\u{1F3C6} ${duel.winner} won the duel and takes ${duel.amount - duel.fee} orbs! (${duel.fee} orbs fee)`
                : duel.status === "failed"
                  ? "The duel was cancelled because someone doesn't have enough orbs."
                  : duel.status === "expired"
                    ? "That duel ran out of time."
                    : `${duel.status === "cancelled" ? duel.from : duel.to} ${duel.status === "cancelled" ? "cancelled" : "declined"} the duel.`;
        await this.botMessage("casino", { text: note }, { name: CASINO_NAME, replyTo: { id: message.id, name: duel.from, text: `duel for ${duel.amount} orbs` } });
        return { ok: true };
    }

    async duelAction(request) {
        const username = await this.sessionUser(request);
        if (!username) return json({ error: "Log in first." }, 401);
        const body = (await this.readBody(request)) || {};
        const target = await this.resolveTarget(username, { channel: "casino" }, true);
        if (target.error) return target.error;
        const result = await this.settleDuel(body.id, username.toLowerCase(), body.action === "accept" ? "accept" : "decline");
        return result.error ? json({ error: result.error }, 400) : json({ ok: true });
    }

    // ---------- orb economy ----------
    async orbsAction(request) {
        const username = await this.sessionUser(request);
        if (!username) return json({ error: "Log in first." }, 401);
        const lower = username.toLowerCase();
        const key = `u:${lower}`;
        const user = await this.ctx.storage.get(key);
        const body = (await this.readBody(request)) || {};
        const today = taskDay();

        if (body.action === "daily") {
            const streak = user.streak || { last: "", count: 0 };
            if (streak.last === today) return json({ error: "You already took today's bonus." }, 400);
            const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
            const count = streak.last === yesterday ? streak.count + 1 : 1;
            const reward = Math.min(STREAK_BASE + count, STREAK_MAX);
            user.streak = { last: today, count };
            this.addOrbs(user, reward);
            await this.ctx.storage.put(key, user);
            return json({ ok: true, reward, streak: count, orbs: user.orbs });
        }

        if (body.action === "gift") {
            if (Date.now() - (user.created || 0) < GIFT_MIN_AGE_MS) {
                return json({ error: "New accounts can gift orbs after 10 minutes." }, 403);
            }
            const amount = Math.round(Number(body.amount));
            if (!(amount >= 1 && amount <= GIFT_MAX)) return json({ error: `Gift between 1 and ${GIFT_MAX} orbs.` }, 400);
            const targetKey = `u:${String(body.user ?? "").trim().toLowerCase()}`;
            const target = await this.ctx.storage.get(targetKey);
            if (!target) return json({ error: "No such user." }, 404);
            if (targetKey === key) return json({ error: "You can't gift orbs to yourself." }, 400);
            if ((user.orbs || 0) < amount) return json({ error: "You don't have that many orbs." }, 400);
            const sentToday = user.giftDay === today ? user.giftSent || 0 : 0;
            if (sentToday + amount > GIFT_DAILY) {
                return json({ error: `You can gift ${GIFT_DAILY} orbs a day. ${GIFT_DAILY - sentToday} left today.` }, 400);
            }
            user.orbs -= amount;
            user.giftDay = today;
            user.giftSent = sentToday + amount;
            this.addOrbs(target, amount, false);
            await this.ctx.storage.put({ [key]: user, [targetKey]: target });
            return json({ ok: true, orbs: user.orbs, to: target.username });
        }
        return json({ error: "Unknown action." }, 400);
    }

    // ---------- orb tasks ----------
    /** Add to today's progress (resets automatically when the day changes). */
    async bumpTasks(lower, events) {
        const key = `tk:${lower}`;
        let rec = (await this.ctx.storage.get(key)) || {};
        if (rec.day !== taskDay()) rec = { day: taskDay(), progress: {}, claimed: {}, ach: rec.ach || {} };
        for (const [k, v] of Object.entries(events)) {
            if (k === "channels") {
                const list = rec.progress.channels || [];
                if (!list.includes(v)) list.push(v);
                rec.progress.channels = list;
            } else {
                rec.progress[k] = (rec.progress[k] || 0) + v;
            }
        }
        await this.ctx.storage.put(key, rec);
    }

    async taskState(username) {
        const lower = username.toLowerCase();
        const user = await this.ctx.storage.get(`u:${lower}`);
        let rec = (await this.ctx.storage.get(`tk:${lower}`)) || {};
        if (rec.day !== taskDay()) rec = { day: taskDay(), progress: {}, claimed: {}, ach: rec.ach || {} };
        const fr = await this.loadFriends(lower);
        const groups = ((await this.ctx.storage.get(`gx:${lower}`)) || []).length;
        const stats = {
            msgCount: user.msgCount || 0,
            avatar: user.avatar ? 1 : 0,
            bio: user.bio ? 1 : 0,
            friends: fr.friends.length,
            groups,
            owned: (user.owned || []).length,
            invited: user.refCount || 0,
        };
        const progressOf = (t) => {
            const raw = rec.progress[t.key];
            return Array.isArray(raw) ? raw.length : raw || 0;
        };
        return {
            user,
            rec,
            lower,
            daily: DAILY_TASKS.map((t) => ({
                ...t,
                progress: Math.min(t.goal, progressOf(t)),
                claimed: !!rec.claimed[t.id],
            })),
            achievements: ACHIEVEMENTS.map((a) => ({
                ...a,
                progress: Math.min(a.goal, stats[a.stat] || 0),
                claimed: !!rec.ach[a.id],
            })),
        };
    }

    async tasks(request) {
        const username = await this.sessionUser(request);
        if (!username) return json({ error: "Log in first." }, 401);
        const state = await this.taskState(username);
        const today = taskDay();
        const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
        const streak = state.user.streak || { last: "", count: 0 };
        const claimable = streak.last !== today;
        const nextCount = streak.last === yesterday ? streak.count + 1 : claimable ? 1 : streak.count;
        return json({
            daily: state.daily,
            achievements: state.achievements,
            resetsAt: nextMidnight(),
            orbs: state.user.orbs || 0,
            bonus: {
                claimable,
                streak: claimable ? streak.count : streak.count,
                reward: Math.min(STREAK_BASE + nextCount, STREAK_MAX),
            },
        });
    }

    async claimTask(request) {
        const username = await this.sessionUser(request);
        if (!username) return json({ error: "Log in first." }, 401);
        const body = (await this.readBody(request)) || {};
        const state = await this.taskState(username);
        const daily = state.daily.find((t) => t.id === body.id);
        const achievement = state.achievements.find((t) => t.id === body.id);
        const task = daily || achievement;
        if (!task) return json({ error: "No such task." }, 404);
        if (task.claimed) return json({ error: "You already claimed that." }, 400);
        if (task.progress < task.goal) return json({ error: "That task isn't finished yet." }, 400);

        if (daily) state.rec.claimed[task.id] = true;
        else state.rec.ach[task.id] = true;
        this.addOrbs(state.user, task.reward);
        await this.ctx.storage.put({ [`tk:${state.lower}`]: state.rec, [`u:${state.lower}`]: state.user });
        return json({ ok: true, reward: task.reward, orbs: state.user.orbs });
    }

    // ---------- friends ----------
    async loadFriends(lower) {
        const fr = (await this.ctx.storage.get(`fr:${lower}`)) || {};
        return { friends: fr.friends || [], incoming: fr.incoming || [], outgoing: fr.outgoing || [] };
    }

    async friends(request) {
        const username = await this.sessionUser(request);
        if (!username) return json({ error: "Log in first." }, 401);
        const fr = await this.loadFriends(username.toLowerCase());
        const all = [...new Set([...fr.friends, ...fr.incoming, ...fr.outgoing])];
        const users = await this.many(all.map((n) => `u:${n}`));
        const info = (n) => {
            const u = users.get(`u:${n}`);
            return u
                ? { user: u.username, status: this.effectiveStatus(n, u), statusText: u.statusText || "" }
                : null;
        };
        return json({
            friends: fr.friends.map(info).filter(Boolean),
            incoming: fr.incoming.map(info).filter(Boolean),
            outgoing: fr.outgoing.map(info).filter(Boolean),
        });
    }

    async friendAction(request) {
        const username = await this.sessionUser(request);
        if (!username) return json({ error: "Log in first." }, 401);
        const me = username.toLowerCase();
        const body = (await this.readBody(request)) || {};
        const action = String(body.action ?? "");
        const target = await this.ctx.storage.get(`u:${String(body.user ?? "").trim().toLowerCase()}`);
        if (!target) return json({ error: "No such user." }, 404);
        const other = target.username.toLowerCase();
        if (other === me) return json({ error: "You can't do that to yourself." }, 400);
        if (this.hitLimit(this.friendHits, me, 60 * 1000, FRIEND_ACTIONS_PER_MIN)) {
            return json({ error: "You're doing that too fast." }, 429);
        }

        const mine = await this.loadFriends(me);
        const theirs = await this.loadFriends(other);
        const without = (list, n) => list.filter((x) => x !== n);
        const save = () =>
            this.ctx.storage.put({
                [`fr:${me}`]: mine,
                [`fr:${other}`]: theirs,
            });
        const makeFriends = () => {
            mine.friends = [...without(mine.friends, other), other];
            theirs.friends = [...without(theirs.friends, me), me];
            mine.incoming = without(mine.incoming, other);
            mine.outgoing = without(mine.outgoing, other);
            theirs.incoming = without(theirs.incoming, me);
            theirs.outgoing = without(theirs.outgoing, me);
        };

        if (action === "request") {
            if ((target.blocked || []).includes(me)) return json({ error: "That user isn't accepting friend requests." }, 403);
            if (mine.friends.includes(other)) return json({ error: "You're already friends." }, 400);
            if (mine.incoming.includes(other)) {
                makeFriends();
            } else {
                if (mine.outgoing.includes(other)) return json({ error: "Request already sent." }, 400);
                if (mine.outgoing.length >= MAX_OUTGOING) return json({ error: "Too many pending requests." }, 400);
                if (theirs.incoming.length >= MAX_INCOMING) return json({ error: "That user has too many requests." }, 400);
                mine.outgoing.push(other);
                theirs.incoming.push(me);
            }
        } else if (action === "accept") {
            if (!mine.incoming.includes(other)) return json({ error: "No request from that user." }, 404);
            if (mine.friends.length >= MAX_FRIENDS || theirs.friends.length >= MAX_FRIENDS) {
                return json({ error: "Friend list is full." }, 400);
            }
            makeFriends();
        } else if (action === "decline") {
            mine.incoming = without(mine.incoming, other);
            theirs.outgoing = without(theirs.outgoing, me);
        } else if (action === "cancel") {
            mine.outgoing = without(mine.outgoing, other);
            theirs.incoming = without(theirs.incoming, me);
        } else if (action === "remove") {
            mine.friends = without(mine.friends, other);
            theirs.friends = without(theirs.friends, me);
        } else {
            return json({ error: "Unknown action." }, 400);
        }

        await save();
        const relation = mine.friends.includes(other)
            ? "friends"
            : mine.incoming.includes(other)
              ? "incoming"
              : mine.outgoing.includes(other)
                ? "outgoing"
                : "none";
        return json({ ok: true, relation });
    }

    // ---------- group chats ----------

    async groupAction(request) {
        const username = await this.sessionUser(request);
        if (!username) return json({ error: "Log in first." }, 401);
        const me = username.toLowerCase();
        const body = (await this.readBody(request)) || {};
        const action = String(body.action ?? "");
        const cleanName = (value) => String(value ?? "").replace(/\s+/g, " ").trim().slice(0, 30);

        const lookup = async (names) => {
            const lowers = [
                ...new Set(
                    (Array.isArray(names) ? names : [])
                        .map((n) => String(n).trim().toLowerCase())
                        .filter((n) => NAME_RE.test(n) && n !== me),
                ),
            ];
            const found = await this.many(lowers.map((n) => `u:${n}`));
            return lowers.filter((n) => found.has(`u:${n}`));
        };
        const addToUser = async (lower, id) => {
            const ids = (await this.ctx.storage.get(`gx:${lower}`)) || [];
            if (!ids.includes(id)) await this.ctx.storage.put(`gx:${lower}`, [...ids, id]);
        };
        const describe = async (meta) => {
            const users = await this.many(meta.members.map((n) => `u:${n}`));
            return {
                id: meta.id,
                name: meta.name,
                owner: users.get(`u:${meta.owner}`)?.username || meta.owner,
                members: meta.members.map((n) => users.get(`u:${n}`)?.username || n),
            };
        };

        if (action === "create") {
            if (this.hitLimit(this.groupHits, me, 60 * 60 * 1000, GROUPS_PER_HOUR)) {
                return json({ error: "You're creating groups too fast." }, 429);
            }
            const members = await lookup(body.members);
            if (members.length < 1 || members.length > MAX_GROUP_MEMBERS - 1) {
                return json({ error: `Pick between 1 and ${MAX_GROUP_MEMBERS - 1} other people.` }, 400);
            }
            const mine = (await this.ctx.storage.get(`gx:${me}`)) || [];
            if (mine.length >= MAX_GROUPS) return json({ error: "You're in too many groups." }, 400);
            const id = toHex(crypto.getRandomValues(new Uint8Array(4)));
            const meta = { id, name: cleanName(body.name), owner: me, members: [me, ...members], created: Date.now() };
            await this.ctx.storage.put(`gm:${id}`, meta);
            for (const n of meta.members) await addToUser(n, id);
            return json({ ok: true, group: await describe(meta) });
        }

        const id = String(body.id ?? "");
        const meta = /^[0-9a-f]{8}$/.test(id) ? await this.ctx.storage.get(`gm:${id}`) : null;
        if (!meta || !meta.members.includes(me)) return json({ error: "Group not found." }, 404);

        if (action === "rename") {
            if (meta.owner !== me) return json({ error: "Only the group owner can rename it." }, 403);
            meta.name = cleanName(body.name);
        } else if (action === "add") {
            if (meta.owner !== me) return json({ error: "Only the group owner can add people." }, 403);
            const added = (await lookup(body.members)).filter((n) => !meta.members.includes(n));
            if (!added.length) return json({ error: "Nobody to add." }, 400);
            if (meta.members.length + added.length > MAX_GROUP_MEMBERS) {
                return json({ error: `Groups can have at most ${MAX_GROUP_MEMBERS} people.` }, 400);
            }
            meta.members.push(...added);
            for (const n of added) await addToUser(n, id);
        } else if (action === "leave") {
            meta.members = meta.members.filter((n) => n !== me);
            const ids = ((await this.ctx.storage.get(`gx:${me}`)) || []).filter((g) => g !== id);
            await this.ctx.storage.put(`gx:${me}`, ids);
            if (!meta.members.length) {
                const messages = (await this.ctx.storage.get(`m:g:${id}`)) || [];
                await this.purgeMessageAssets(messages);
                await this.ctx.storage.delete([`gm:${id}`, `m:g:${id}`, `n:g:${id}`, `ver:g:${id}`]);
                return json({ ok: true });
            }
            if (meta.owner === me) meta.owner = meta.members[0];
        } else {
            return json({ error: "Unknown action." }, 400);
        }

        await this.ctx.storage.put(`gm:${id}`, meta);
        return json({ ok: true, group: await describe(meta) });
    }

    // ---------- messages ----------

    async getMessages(request, searchParams) {
        const source = {
            channel: searchParams.get("channel"),
            dm: searchParams.get("dm"),
            group: searchParams.get("group"),
        };
        const username = source.dm || source.group ? await this.sessionUser(request) : null;
        const target = await this.resolveTarget(username, source, false);
        if (target.error) return target.error;

        const after = Number(searchParams.get("after")) || 0;
        const clientVersion = Number(searchParams.get("v")) || 0;
        const version = (await this.ctx.storage.get(`ver:${target.key}`)) || 0;
        const full = clientVersion !== version;
        const messages = (await this.ctx.storage.get(`m:${target.key}`)) || [];
        const me = username || (await this.sessionUser(request));
        return json({
            messages: full ? messages : messages.filter((m) => m.id > after),
            version,
            full,
            typing: this.typingNames(target.key, me),
        });
    }

    async postMessage(request) {
        const username = await this.sessionUser(request);
        if (!username) return json({ error: "Log in to send messages." }, 401);

        const body = await this.readBody(request);
        const target = await this.resolveTarget(username, body || {}, true);
        if (target.error) return target.error;

        const text = String(body?.text ?? "").trim().slice(0, await this.textLimit(username));
        const gif = body?.gif == null ? "" : String(body.gif);
        if (gif && !GIF_RE.test(gif) && !GIF_ID_RE.test(gif)) return json({ error: "Unknown GIF." }, 400);
        let gifVideo = false;
        if (GIF_ID_RE.test(gif)) {
            const approved = (await this.ctx.storage.get("community")) || [];
            const found = approved.find((a) => a.id === gif && a.kind === "gif");
            if (!found) return json({ error: "Unknown GIF." }, 400);
            gifVideo = !!found.video;
        }
        const sticker = body?.sticker == null ? "" : String(body.sticker);
        if (sticker && !STICKER_RE.test(sticker)) return json({ error: "Unknown sticker." }, 400);
        if (sticker.startsWith("u_")) {
            const approved = (await this.ctx.storage.get("community")) || [];
            if (!approved.some((a) => a.id === sticker && a.kind === "sticker")) return json({ error: "Unknown sticker." }, 400);
        }
        if (!text && !gif && !sticker) return json({ error: "Message is empty." }, 400);

        const extra = {};
        if (gif) extra.gif = gif;
        if (gifVideo) extra.gifVideo = true;
        if (sticker) extra.sticker = sticker;
        const replyTo = await this.buildReply(target.key, body?.reply);
        if (replyTo) extra.replyTo = replyTo;

        const response = await this.storeMessage(username, target, text, extra);
        if (response.status === 200 && !target.isDm && text.startsWith("/")) {
            const stored = await response.clone().json();
            await this.runCommand(username, target, text, stored.id);
        }
        return response;
    }

    async buildReply(key, id) {
        const wanted = Number(id);
        if (!wanted) return null;
        const messages = (await this.ctx.storage.get(`m:${key}`)) || [];
        const found = messages.find((m) => m.id === wanted);
        if (!found) return null;
        const label = found.text || (found.image ? "[image]" : found.video ? "[video]" : found.gif ? "[GIF]" : found.sticker ? "[sticker]" : "");
        return { id: found.id, name: found.name, text: label.replace(/\s+/g, " ").slice(0, 80) };
    }

    sourceFromQuery(searchParams) {
        return {
            channel: searchParams.get("channel"),
            dm: searchParams.get("dm"),
            group: searchParams.get("group"),
        };
    }

    async postImage(request, searchParams) {
        const username = await this.sessionUser(request);
        if (!username) return json({ error: "Log in to send messages." }, 401);

        const target = await this.resolveTarget(username, this.sourceFromQuery(searchParams), true);
        if (target.error) return target.error;
        const text = String(searchParams.get("text") ?? "").trim().slice(0, await this.textLimit(username));

        const limited = this.rateCheck(username);
        if (limited) return limited;

        const maxImage = await this.imageLimit(username);
        const declared = Number(request.headers.get("content-length")) || 0;
        const bytes = declared > maxImage ? null : await readLimited(request, maxImage);
        if (!bytes) return json({ error: `Image is too large (max ${Math.round(maxImage / 1024)} KB).` }, 413);
        if (bytes.length === 0) return json({ error: "No image received." }, 400);
        const type = sniffImage(bytes);
        if (!type) return json({ error: "Only JPEG, PNG or WebP images are allowed." }, 415);

        const dim = (name) => {
            const n = Math.round(Number(searchParams.get(name)));
            return n >= 1 && n <= 4096 ? n : 0;
        };

        const imageId = toHex(crypto.getRandomValues(new Uint8Array(12)));
        await this.ctx.storage.put(`img:${imageId}`, { type, bytes: bytes.buffer });
        const replyTo = await this.buildReply(target.key, searchParams.get("reply"));
        const response = await this.storeMessage(username, target, text, {
            image: imageId,
            w: dim("w"),
            h: dim("h"),
            ...(replyTo ? { replyTo } : {}),
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

        const target = await this.resolveTarget(username, this.sourceFromQuery(searchParams), true);
        if (target.error) return target.error;
        const text = String(searchParams.get("text") ?? "").trim().slice(0, await this.textLimit(username));

        const tooBig = () => json({ error: "Video is too large (max 25 MB)." }, 413);
        const declared = Number(request.headers.get("content-length")) || 0;
        if (declared > MAX_VIDEO_BYTES) return tooBig();
        const limited = this.rateCheck(username);
        if (limited) return limited;
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
        const videoReply = await this.buildReply(target.key, searchParams.get("reply"));
        const response = await this.storeMessage(username, target, text, { video: id, ...(videoReply ? { replyTo: videoReply } : {}) });
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
        const lower = username.toLowerCase();
        const limited = this.rateCheck(username);
        if (limited) return limited;
        const userKey = `u:${lower}`;
        const user = await this.ctx.storage.get(userKey);
        const spam = this.contentCheck(username, text, user);
        if (spam) return spam;
        this.recordSent(username, text);

        const now = Date.now();
        const key = target.key;
        const mentions = target.isDm ? [] : await this.findMentions(text, username);
        const repliedTo = extra.replyTo?.name;
        if (repliedTo && !target.isDm && repliedTo !== BOT_NAME && repliedTo !== CASINO_NAME && repliedTo !== ZOO_NAME && repliedTo.toLowerCase() !== lower && !mentions.includes(repliedTo)) {
            mentions.push(repliedTo);
        }
        this.typing.get(key)?.delete(lower);
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

        // orbs: one per message, at most one a minute, and only for real messages
        let earned = false;
        if (user) {
            user.msgCount = (user.msgCount || 0) + 1;
            if (user.ref && !user.refPaid && user.msgCount >= REF_MIN_MESSAGES) {
                const inviterKey = `u:${user.ref}`;
                const inviter = await this.ctx.storage.get(inviterKey);
                user.refPaid = true;
                if (inviter && (inviter.refCount || 0) < REF_MAX) {
                    this.addOrbs(inviter, REF_REWARD, false);
                    inviter.refCount = (inviter.refCount || 0) + 1;
                    writes[inviterKey] = inviter;
                }
            }
            const worthy = text.length >= MIN_ORB_TEXT || !!(extra.image || extra.video || extra.gif || extra.sticker);
            if (worthy && now - (user.lastOrb || 0) >= ORB_COOLDOWN_MS) {
                this.addOrbs(user, this.hasPlus(user, roleOf(username)) ? PLUS_ORBS : this.hasNitro(user, roleOf(username)) ? NITRO_ORBS : 1);
                user.lastOrb = now;
                earned = true;
            }
            writes[userKey] = user;
        }
        await this.ctx.storage.put(writes);
        if (dropped.length) await this.purgeMessageAssets(dropped);

        const events = { msg: 1 };
        if (extra.gif || extra.sticker) events.gif = 1;
        if (extra.image || extra.video) events.media = 1;
        if (target.isDm) events.dm = 1;
        else events.channels = key;
        await this.bumpTasks(lower, events);

        if (key.startsWith("dm:")) {
            const [a, b] = key.slice(3).split("|");
            for (const [me, other] of [[a, b], [b, a]]) {
                const list = (await this.ctx.storage.get(`dmx:${me}`)) || [];
                if (!list.includes(other)) await this.ctx.storage.put(`dmx:${me}`, [...list, other]);
            }
        }
        this.touch(username);
        return json({ ok: true, id: nextId, orb: earned, orbs: user?.orbs || 0 });
    }

    async findMentions(text, author) {
        const found = [...new Set((text.match(/@[A-Za-z0-9_]{3,20}/g) || []).map((s) => s.slice(1).toLowerCase()))]
            .filter((n) => n !== author.toLowerCase())
            .slice(0, MAX_MENTIONS);
        if (!found.length) return [];
        const users = await this.ctx.storage.get(found.map((n) => `u:${n}`));
        return found.map((n) => users.get(`u:${n}`)?.username).filter(Boolean);
    }

    async react(request) {
        const username = await this.sessionUser(request);
        if (!username) return json({ error: "Log in to react." }, 401);
        if (this.hitLimit(this.reactHits, username.toLowerCase(), 10 * 1000, REACT_PER_10S)) {
            return json({ error: "You're reacting too fast." }, 429);
        }
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
        if (at < 0) {
            await this.bumpTasks(username.toLowerCase(), { react: 1 });
            if (message.name.toLowerCase() !== username.toLowerCase()) {
                await this.bumpTasks(message.name.toLowerCase(), { liked: 1 });
            }
        }
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
        let groups = [];
        let incoming = [];
        if (username) {
            const lower = username.toLowerCase();
            this.touch(username);
            const found = await this.ctx.storage.get(ids.map((c) => `mn:${c}:${lower}`));
            mentions = Object.fromEntries(ids.map((c) => [c, found.get(`mn:${c}:${lower}`) || 0]));

            const partners = ((await this.ctx.storage.get(`dmx:${lower}`)) || []).slice(0, 50);
            if (partners.length) {
                const keys = partners.map((p) => dmKey(lower, p));
                const dmCounts = await this.many(keys.map((k) => `n:${k}`));
                const users = await this.many(partners.map((p) => `u:${p}`));
                dms = partners.map((p, i) => ({
                    user: users.get(`u:${p}`)?.username || p,
                    latest: dmCounts.get(`n:${keys[i]}`) || 0,
                }));
            }

            const groupIds = ((await this.ctx.storage.get(`gx:${lower}`)) || []).slice(0, MAX_GROUPS);
            if (groupIds.length) {
                const metas = await this.many(groupIds.map((g) => `gm:${g}`));
                const gCounts = await this.many(groupIds.map((g) => `n:g:${g}`));
                const memberNames = new Set();
                for (const meta of metas.values()) meta.members.forEach((n) => memberNames.add(n));
                const users = await this.many([...memberNames].map((n) => `u:${n}`));
                groups = groupIds
                    .filter((g) => metas.has(`gm:${g}`))
                    .map((g) => {
                        const meta = metas.get(`gm:${g}`);
                        return {
                            id: g,
                            name: meta.name,
                            owner: users.get(`u:${meta.owner}`)?.username || meta.owner,
                            members: meta.members.map((n) => users.get(`u:${n}`)?.username || n),
                            latest: gCounts.get(`n:g:${g}`) || 0,
                        };
                    });
            }

            const fr = await this.loadFriends(lower);
            if (fr.incoming.length) {
                const users = await this.many(fr.incoming.map((n) => `u:${n}`));
                incoming = fr.incoming.map((n) => users.get(`u:${n}`)?.username || n);
            }
        }

        const now = Date.now();
        const fresh = [...this.presence].filter(([, seen]) => now - seen.time <= PRESENCE_MS).slice(0, 200);
        const presenceUsers = await this.many(fresh.map(([lower]) => `u:${lower}`));
        const online = [];
        for (const [lower, seen] of fresh) {
            const status = this.effectiveStatus(lower, presenceUsers.get(`u:${lower}`));
            if (status !== "offline") online.push({ user: seen.name, status });
        }
        await this.loadMod();
        const warning = username ? (this.modMap.get(username.toLowerCase())?.warnings || []).find((w) => !w.ack) : null;
        const notice = warning ? { id: warning.id, by: warning.by, reason: warning.reason } : null;
        return json({ latest, mentions, dms, groups, incoming, online, notice });
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
