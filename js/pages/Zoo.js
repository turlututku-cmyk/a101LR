const TOKEN_KEY = "a101lr-chat-token";

const readToken = () => {
    try {
        return localStorage.getItem(TOKEN_KEY) || "";
    } catch {
        return "";
    }
};

export default {
    name: "Zoo",
    template: `
        <main class="page-zoo">
            <div class="zoo-wrap">
                <header class="zoo-head">
                    <div>
                        <h1>&#129409; a101 Zoo</h1>
                        <p class="zoo-sub">Hunt animals in #zoo, level them up and fight with your team. Type <code>/hunt</code> in the chat to start.</p>
                    </div>
                    <router-link class="zoo-chat-link" to="/minigames/chat">Open the chat</router-link>
                </header>

                <p v-if="error" class="zoo-error">{{ error }}</p>
                <p v-else-if="!data" class="zoo-muted">Loading the zoo...</p>

                <template v-if="data">
                    <div v-if="eventTier" class="zoo-event">
                        <img :src="badge(eventTier.code)" alt="">
                        <span><b>Event this hour:</b> {{ eventTier.label }} animals are 3x more likely!</span>
                    </div>

                    <section v-if="data.boss" class="zoo-boss" :class="{ dead: data.boss.dead }">
                        <img :src="'/assets/emojis/' + data.boss.emoji + '.svg'" :alt="data.boss.title">
                        <div class="zoo-boss-info">
                            <h2>&#128121; Boss: {{ data.boss.title }}<small v-if="data.boss.ability">{{ data.abilities[data.boss.ability].name }}</small></h2>
                            <div class="zoo-hp"><span :style="{ width: (100 * data.boss.hp / data.boss.max) + '%' }"></span></div>
                            <p>
                                <b>{{ data.boss.hp }}/{{ data.boss.max }} HP</b>
                                <span v-if="data.boss.dead"> - defeated! A new boss arrives in {{ bossLeft }}.</span>
                                <span v-else> - leaves in {{ bossLeft }}. Everyone fights the same boss with <code>/boss attack</code> in #zoo.</span>
                            </p>
                            <p v-if="me" class="zoo-muted">Your damage: {{ me.bossDamage }}</p>
                            <ol v-if="data.boss.top.length" class="zoo-boss-top">
                                <li v-for="r in data.boss.top" :key="r.name"><span>{{ r.name }}</span><b>{{ r.damage }}</b></li>
                            </ol>
                        </div>
                    </section>

                    <section v-if="me" class="zoo-me">
                        <div class="zoo-stat"><b>{{ owned }}/{{ data.animals.length }}</b><span>Species</span></div>
                        <div class="zoo-stat"><b>{{ me.coins }}</b><span>Coins</span></div>
                        <div class="zoo-stat"><b>{{ me.orbs }}</b><span>Orbs</span></div>
                        <div class="zoo-stat"><b>{{ me.wins }}</b><span>Wins</span></div>
                        <div class="zoo-stat"><b>{{ me.losses }}</b><span>Losses</span></div>
                        <div class="zoo-stat"><b>{{ me.streak }}{{ me.dailyDone ? ' &#10003;' : '' }}</b><span>Daily streak</span></div>
                    </section>
                    <p v-else class="zoo-muted">Log in on the Chat page to see your own collection here. The leaderboards below are public.</p>

                    <section v-if="me && teamAnimals.length" class="zoo-team">
                        <h2>Your team</h2>
                        <div class="zoo-team-row">
                            <div v-for="a in teamAnimals" :key="a.id" class="zoo-teamcard" :class="'tier-' + a.rarity">
                                <img v-if="img(a)" :src="img(a)" :alt="a.name"><span v-else class="zoo-glyph">{{ a.glyph }}</span>
                                <b>{{ a.name }}</b>
                                <small>Level {{ me.levels[a.id] || 1 }}</small>
                                <small v-if="a.ability" class="zoo-ab" :title="data.abilities[a.ability].desc">{{ data.abilities[a.ability].name }}</small>
                            </div>
                        </div>
                    </section>

                    <div class="zoo-tabs">
                        <button v-for="t in tabs" :key="t.id" type="button" :class="{ active: tab === t.id }" @click="tab = t.id">{{ t.label }}</button>
                    </div>

                    <section v-if="tab === 'collection'" class="zoo-collection">
                        <div v-for="t in data.tiers" :key="t.id" class="zoo-tier">
                            <h2>
                                <img :src="tierUnlocked(t) ? badge(t.code) : '/assets/emojis/rarity_locked.svg'" alt="">
                                {{ tierUnlocked(t) ? t.label : 'Hidden tier' }}
                                <small>{{ tierUnlocked(t) ? tierOwned(t) + '/' + tierAnimals(t).length : 'catch one to discover it' }}</small>
                                <small class="zoo-coin">{{ t.coins }} coins each</small>
                            </h2>
                            <div v-if="tierUnlocked(t)" class="zoo-grid">
                                <div
                                    v-for="a in tierAnimals(t)"
                                    :key="a.id"
                                    class="zoo-animal"
                                    :class="['tier-' + a.rarity, { missing: !count(a), team: isTeam(a) }]"
                                    :title="tip(a)"
                                >
                                    <img v-if="img(a)" :src="img(a)" :alt="a.name" loading="lazy"><span v-else class="zoo-glyph">{{ a.glyph }}</span>
                                    <span v-if="count(a)" class="zoo-count">{{ count(a) }}</span>
                                    <span v-if="count(a) && me.levels[a.id]" class="zoo-lvl">L{{ me.levels[a.id] }}</span>
                                    <small>{{ count(a) || !me ? a.name : '???' }}</small>
                                </div>
                            </div>
                            <div v-else class="zoo-grid">
                                <div v-for="n in 4" :key="n" class="zoo-animal missing"><span class="zoo-q">?</span><small>???</small></div>
                            </div>
                        </div>
                    </section>

                    <section v-else-if="tab === 'board'" class="zoo-boards">
                        <div v-for="b in boards" :key="b.id" class="zoo-board">
                            <h2>{{ b.label }}</h2>
                            <ol v-if="data.board[b.id].length">
                                <li v-for="r in data.board[b.id]" :key="r.name"><span>{{ r.name }}</span><b>{{ b.fmt(r) }}</b></li>
                            </ol>
                            <p v-else class="zoo-muted">Nobody yet.</p>
                        </div>
                    </section>

                    <section v-else class="zoo-guide">
                        <h2>Commands (in #zoo)</h2>
                        <ul>
                            <li><code>/hunt</code> costs 1 orb and catches a random animal.</li>
                            <li><code>/daily</code> one free hunt a day, plus coins. Every 7th day in a row gives a Rare Hunting Gem.</li>
                            <li><code>/inventory</code> your collection. <code>/team Fox, Gem Lion, Tiger</code> picks your fighters.</li>
                            <li><code>/battle</code> fights a wild team, <code>/battle @user</code> fights someone's team.</li>
                            <li><code>/sell Fox 3</code> or <code>/sell dupes</code> turns spare animals into coins (you keep one of each).</li>
                            <li><code>/fuse rare</code> turns spare animals of a tier into one of the next tier.</li>
                            <li><code>/gems</code> buys gems with orbs or coins. <code>/zooboard</code> shows the leaderboards.</li>
                        </ul>
                        <h2>Tiers</h2>
                        <table class="zoo-table">
                            <tr><th>Tier</th><th>Coins</th><th>Fuse needs</th></tr>
                            <tr v-for="t in data.tiers" :key="t.id">
                                <td><img :src="tierUnlocked(t) ? badge(t.code) : '/assets/emojis/rarity_locked.svg'" alt=""> {{ tierUnlocked(t) ? t.label : '???' }}</td>
                                <td>{{ t.coins }}</td>
                                <td>{{ t.fuse ? t.fuse + ' spare animals' : '-' }}</td>
                            </tr>
                        </table>
                        <h2>Battle abilities (Rare and above)</h2>
                        <ul>
                            <li v-for="(ab, id) in data.abilities" :key="id"><b>{{ ab.name }}</b>: {{ ab.desc }}</li>
                        </ul>
                        <h2>Your gems</h2>
                        <p v-if="me && Object.keys(me.gems).length" class="zoo-gems">
                            <span v-for="(n, key) in me.gems" :key="key"><img :src="gemImg(key)" alt=""> {{ key.replace('_', ' ') }}: {{ n }}</span>
                        </p>
                        <p v-else class="zoo-muted">No gems yet. Buy them with <code>/gems</code> in the chat.</p>
                    </section>
                </template>
            </div>
        </main>
    `,
    data() {
        return {
            data: null,
            error: "",
            tab: "collection",
            tabs: [
                { id: "collection", label: "Collection" },
                { id: "board", label: "Leaderboards" },
                { id: "guide", label: "Guide" },
            ],
            boards: [
                { id: "species", label: "Most species", fmt: (r) => r.species + " species" },
                { id: "score", label: "Collection score", fmt: (r) => r.score + " pts" },
                { id: "wins", label: "Battle wins", fmt: (r) => r.wins + " wins" },
            ],
            timer: null,
            now: Date.now(),
        };
    },
    computed: {
        me() {
            return this.data?.me || null;
        },
        eventTier() {
            return this.data?.tiers.find((t) => t.id === this.data.event) || null;
        },
        bossLeft() {
            const left = Math.max(0, (this.data?.boss?.ends || 0) - this.now);
            return `${Math.floor(left / 3600000)}h ${Math.floor((left % 3600000) / 60000)}m`;
        },
        owned() {
            return this.me ? this.data.animals.filter((a) => this.me.zoo[a.id]).length : 0;
        },
        teamAnimals() {
            return this.me ? this.me.team.map((id) => this.data.animals.find((a) => a.id === id)).filter(Boolean) : [];
        },
    },
    methods: {
        async load() {
            try {
                const token = readToken();
                const res = await fetch("/api/chat/zoo", { headers: token ? { authorization: `Bearer ${token}` } : {} });
                if (!res.ok) throw new Error("The zoo is not available right now.");
                this.data = await res.json();
                this.error = "";
            } catch (e) {
                this.error = e.message || "Could not load the zoo.";
            }
        },
        img: (a) => a.src || (a.emoji ? `/assets/emojis/${a.emoji}.svg` : ""),
        badge: (code) => `/assets/emojis/rarity_${code.toLowerCase()}.svg`,
        gemImg: (key) => {
            const [type, tier] = key.split("_");
            return `/assets/emojis/item_${type}_${tier[0] === "c" ? "c" : tier[0]}.svg`;
        },
        count(a) {
            return this.me?.zoo[a.id] || 0;
        },
        isTeam(a) {
            return !!this.me?.team.includes(a.id);
        },
        tierAnimals(t) {
            return this.data.animals.filter((a) => a.rarity === t.id);
        },
        tierOwned(t) {
            return this.me ? this.tierAnimals(t).filter((a) => this.me.zoo[a.id]).length : 0;
        },
        tierUnlocked(t) {
            return !t.secret || !this.me || this.tierOwned(t) > 0;
        },
        tip(a) {
            const [hp, atk, def] = a.stats;
            const ab = a.ability ? ` | ${this.data.abilities[a.ability].name}: ${this.data.abilities[a.ability].desc}` : "";
            return `${a.name} - HP ${hp} ATK ${atk} DEF ${def} at level 1${ab}${a.by ? ` | added by ${a.by}` : ""}`;
        },
    },
    async mounted() {
        if (location.hostname === "localhost" || location.hostname === "127.0.0.1") {
            // no Cloudflare here: run the Worker inside the page (see dev/local-api.js)
            try {
                await import("/dev/local-api.js");
            } catch (e) {
                console.warn("Local backend could not start", e);
            }
        }
        this.load();
        this.timer = setInterval(() => {
            this.now = Date.now();
            this.load();
        }, 60000);
    },
    beforeUnmount() {
        clearInterval(this.timer);
    },
};
