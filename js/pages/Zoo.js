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

                    <section v-if="me && me.quests" class="zoo-quests">
                        <h2>&#128220; Daily quests <small>new ones every day</small></h2>
                        <div class="zoo-quest-row">
                            <div v-for="q in me.quests.list" :key="q.id" class="zoo-quest" :class="{ done: q.done }">
                                <b>{{ q.done ? '&#9989; ' : '' }}{{ q.text }}</b>
                                <div class="zoo-xp"><span :style="{ width: (100 * q.progress / q.goal) + '%' }"></span></div>
                                <small>{{ q.progress }}/{{ q.goal }} &middot; {{ q.reward }}</small>
                            </div>
                        </div>
                        <p class="zoo-muted">All three: {{ me.quests.bonus }}<span v-if="me.quests.bonusPaid"> (paid)</span></p>
                    </section>

                    <section v-if="me" class="zoo-me">
                        <div class="zoo-stat"><b>{{ owned }}/{{ data.animals.length }}</b><span>Species</span></div>
                        <div class="zoo-stat"><b>{{ me.coins }}</b><span>Coins</span></div>
                        <div class="zoo-stat"><b>{{ me.orbs }}</b><span>Orbs</span></div>
                        <div class="zoo-stat"><b>{{ me.wins }}</b><span>Wins</span></div>
                        <div class="zoo-stat"><b>{{ me.losses }}</b><span>Losses</span></div>
                        <div class="zoo-stat"><b>{{ me.streak }}{{ me.dailyDone ? ' &#10003;' : '' }}</b><span>Daily streak</span></div>
                        <div class="zoo-stat"><b>{{ me.autohunt ? me.autohunt.left : 0 }}</b><span>Autohunts left</span></div>
                    </section>
                    <p v-else class="zoo-muted">Log in on the Chat page to see your own collection here. The leaderboards below are public.</p>

                    <p v-if="notice" class="zoo-notice" :class="{ bad: noticeBad }">{{ notice }}</p>

                    <section v-if="me && teamAnimals.length" class="zoo-team">
                        <h2>Your team <small class="zoo-muted">click an animal in the collection to add it, feed it or give it candy</small></h2>
                        <div class="zoo-team-row">
                            <div v-for="a in teamAnimals" :key="a.id" class="zoo-teamcard" :class="'tier-' + a.rarity" @click="selected = a.id">
                                <img v-if="img(a)" :src="img(a)" :alt="a.name"><span v-else class="zoo-glyph">{{ a.glyph }}</span><i v-if="a.rarity === 'boss'" class="flame">&#128293;</i><i v-if="a.rarity === 'boss'" class="flame two">&#128293;</i>
                                <b>{{ a.name }}</b>
                                <small>Level {{ me.levels[a.id] || 1 }}</small>
                                <small v-if="a.ability" class="zoo-ab" :title="data.abilities[a.ability].desc">{{ data.abilities[a.ability].name }}</small>
                                <button v-if="teamAnimals.length > 1" type="button" class="zoo-mini" :disabled="busy" @click.stop="removeFromTeam(a)">Remove</button>
                            </div>
                        </div>
                    </section>

                    <section v-if="me && sel" class="zoo-detail" :class="'tier-' + sel.rarity">
                        <img v-if="img(sel)" :src="img(sel)" :alt="sel.name"><span v-else class="zoo-glyph">{{ sel.glyph }}</span><i v-if="sel.rarity === 'boss'" class="flame">&#128293;</i><i v-if="sel.rarity === 'boss'" class="flame two">&#128293;</i>
                        <div class="zoo-detail-info">
                            <h2>{{ sel.name }} <small>{{ tierLabel(sel) }} &middot; Level {{ me.levels[sel.id] || 1 }}</small>
                                <button type="button" class="zoo-mini ghost" @click="selected = ''">Close</button></h2>
                            <p class="zoo-muted">HP {{ statsAt(sel).hp }} &middot; ATK {{ statsAt(sel).atk }} &middot; DEF {{ statsAt(sel).def }}<span v-if="sel.bonus"> &middot; <b>+{{ sel.bonus.amount }} {{ sel.bonus.stat.toUpperCase() }} maxed</b></span><span v-if="sel.ability"> &middot; <b>{{ data.abilities[sel.ability].name }}</b>: {{ data.abilities[sel.ability].desc }}</span></p>
                            <div class="zoo-xp"><span :style="{ width: xpPct(sel) + '%' }"></span></div>
                            <p class="zoo-muted">{{ (me.levels[sel.id] || 1) >= 50 ? 'Max level' : xpText(sel) }}</p>
                            <div class="zoo-actions">
                                <button v-if="!isTeam(sel) && me.team.length < 3" type="button" class="zoo-btn" :disabled="busy" @click="addToTeam(sel)">Add to team</button>
                                <template v-if="!isTeam(sel) && me.team.length >= 3">
                                    <button v-for="m in teamAnimals" :key="m.id" type="button" class="zoo-btn alt" :disabled="busy" @click="swapIn(m, sel)">Swap with {{ m.name }}</button>
                                </template>
                                <button v-if="isTeam(sel) && me.team.length > 1" type="button" class="zoo-btn alt" :disabled="busy" @click="removeFromTeam(sel)">Remove from team</button>
                                <button type="button" class="zoo-btn" :disabled="busy || !me.items.food" @click="useItem('feed', sel, 1)"><img src="/assets/emojis/item_food.svg" alt=""> Feed +{{ data.items.food.xp }} xp ({{ me.items.food }})</button>
                                <button type="button" class="zoo-btn" :disabled="busy || !me.items.food" @click="useItem('feed', sel, Math.min(5, me.items.food))">Feed x5</button>
                                <button type="button" class="zoo-btn" :disabled="busy || !me.items.candy || (me.levels[sel.id] || 1) >= 50" @click="useItem('candy', sel, 1)"><img src="/assets/emojis/item_candy.svg" alt=""> Level-Up Candy ({{ me.items.candy }})</button>
                            </div>
                        </div>
                    </section>

                    <section v-if="me" class="zoo-items">
                        <h2>Items</h2>
                        <div class="zoo-item-row">
                            <div v-for="(it, key) in data.items" :key="key" class="zoo-item">
                                <img :src="'/assets/emojis/item_' + key + '.svg'" alt="">
                                <div>
                                    <b>{{ it.name }}</b> <small class="zoo-muted">you have {{ me.items[key] }}</small>
                                    <p class="zoo-muted">{{ it.desc }}</p>
                                    <div class="zoo-actions">
                                        <button type="button" class="zoo-btn" :disabled="busy || me.orbs < it.price" @click="buy(key, 1, 'orbs')">Buy 1 &middot; {{ it.price }} orbs</button>
                                        <button type="button" class="zoo-btn" :disabled="busy || me.orbs < it.price * 5" @click="buy(key, 5, 'orbs')">Buy 5 &middot; {{ it.price * 5 }} orbs</button>
                                        <button v-if="!it.orbsOnly" type="button" class="zoo-btn alt" :disabled="busy || me.coins < it.price * 3" @click="buy(key, 1, 'coins')">Buy 1 &middot; {{ it.price * 3 }} coins</button>
                                        <small v-else class="zoo-muted">orbs only</small>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <p class="zoo-muted">Items are also found while hunting and given as boss rewards.</p>
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
                                    :class="['tier-' + a.rarity, { missing: !count(a), team: isTeam(a), selected: selected === a.id, clickable: !!me && !!count(a) }]"
                                    :title="tip(a)"
                                    @click="pick(a)"
                                >
                                    <img v-if="img(a)" :src="img(a)" :alt="a.name" loading="lazy"><span v-else class="zoo-glyph">{{ a.glyph }}</span><i v-if="a.rarity === 'boss' && count(a)" class="flame">&#128293;</i><i v-if="a.rarity === 'boss' && count(a)" class="flame two">&#128293;</i>
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

                    <section v-else-if="tab === 'guild'" class="zoo-guild">
                        <p v-if="!me" class="zoo-muted">Log in on the Chat page to join or start a guild.</p>
                        <template v-else-if="data.guild">
                            <h2>&#128737;&#65039; [{{ data.guild.tag }}] {{ data.guild.name }} <small>{{ data.guild.members.length }}/{{ data.guild.max }} members &middot; {{ data.guild.kills }} boss kills &middot; owner {{ data.guild.owner }}</small></h2>
                            <div class="zoo-boss" :class="{ dead: data.guild.boss.dead }">
                                <img :src="'/assets/emojis/' + data.guild.boss.emoji + '.svg'" :alt="data.guild.boss.title">
                                <div class="zoo-boss-info">
                                    <h2>Guild boss: {{ data.guild.boss.title }}<small v-if="data.guild.boss.ability">{{ data.abilities[data.guild.boss.ability].name }}</small></h2>
                                    <div class="zoo-hp"><span :style="{ width: (100 * data.guild.boss.hp / data.guild.boss.max) + '%' }"></span></div>
                                    <p>
                                        <b>{{ data.guild.boss.hp }}/{{ data.guild.boss.max }} HP</b>
                                        <span v-if="data.guild.boss.dead"> - defeated! A new guild boss arrives in {{ guildLeft }}.</span>
                                        <span v-else> - it leaves in {{ guildLeft }}, a new one comes every hour.</span>
                                    </p>
                                    <div class="zoo-actions">
                                        <button type="button" class="zoo-btn" :disabled="busy || data.guild.boss.dead" @click="attackGuild">Attack the guild boss</button>
                                        <button v-if="data.guild.boss.dead && data.guild.reset" type="button" class="zoo-btn" :disabled="busy || me.coins < data.guild.reset.cost || data.guild.resets >= data.guild.reset.max" @click="resetGuildBoss">Reset the boss ({{ data.guild.reset.cost }} coins, {{ data.guild.resets }}/{{ data.guild.reset.max }} used)</button>
                                        <button type="button" class="zoo-btn alt" :disabled="busy" @click="leaveGuild">Leave guild</button>
                                    </div>
                                    <p class="zoo-muted">Each of your attacks needs a 2 minute rest. Beating the boss pays everyone who fought.</p>
                                </div>
                            </div>
                            <div v-if="data.guild.boss.dead" class="zoo-rewards">
                                <h2>&#127942; Rewards paid for this boss</h2>
                                <table v-if="data.guild.rewards" class="zoo-table">
                                    <tr><th>Player</th><th>Damage</th><th>Coins</th><th>Pet Food</th><th>Candy</th><th>Boss pet</th></tr>
                                    <tr v-for="r in (data.guild.rewards || [])" :key="r.name"><td>{{ r.name }}</td><td>{{ r.damage }}</td><td>+{{ r.coins }}</td><td>+{{ r.food }}</td><td>{{ r.candy ? '+' + r.candy : '-' }}</td><td>{{ r.pet || '-' }}</td></tr>
                                </table>
                                <p v-else class="zoo-muted">Everyone who fought was paid coins and Pet Food, and the top damager got a Level-Up Candy. Check your coins and items above.</p>
                            </div>
                            <h2>Members this hour</h2>
                            <table class="zoo-table">
                                <tr><th>Member</th><th>Damage</th><th>Attacks</th></tr>
                                <tr v-for="m in guildMembers" :key="m.name"><td>{{ m.name }}<span v-if="m.name === data.guild.owner"> &#128081;</span></td><td>{{ m.damage }}</td><td>{{ m.hits }}</td></tr>
                            </table>
                        </template>
                        <template v-else>
                            <h2>Start a guild</h2>
                            <p class="zoo-muted">Costs {{ data.guildRules.cost }} orbs. Up to {{ data.guildRules.max }} players fight a guild boss together, and it resets every hour.</p>
                            <div class="zoo-form">
                                <input type="text" v-model="guildName" maxlength="20" placeholder="Guild name">
                                <input type="text" v-model="guildTag" maxlength="4" placeholder="TAG">
                                <button type="button" class="zoo-btn" :disabled="busy || me.orbs < data.guildRules.cost || guildName.trim().length < 3" @click="createGuild">Create ({{ data.guildRules.cost }} orbs)</button>
                            </div>
                        </template>
                        <template v-if="me && data.guild">
                            <h2>Gift to a guild mate</h2>
                            <div class="zoo-form">
                                <select v-model="giftTo">
                                    <option value="">Pick a member</option>
                                    <option v-for="m in giftTargets" :key="m.name" :value="m.name">{{ m.name }}</option>
                                </select>
                                <select v-model="giftKind">
                                    <option value="coins">Coins</option>
                                    <option value="food">Pet Food</option>
                                    <option value="candy">Level-Up Candy</option>
                                </select>
                                <input type="number" v-model.number="giftAmount" min="1" max="300">
                                <button type="button" class="zoo-btn" :disabled="busy || !giftTo" @click="giftGuild">Send gift</button>
                            </div>
                            <p class="zoo-muted">Daily limits per player: 300 coins, 30 Pet Food, 3 Level-Up Candy.</p>
                        </template>
                        <h2>Top guilds</h2>
                        <p v-if="!data.guilds.length" class="zoo-muted">No guilds yet. Be the first!</p>
                        <table v-else class="zoo-table">
                            <tr><th>#</th><th>Guild</th><th>Boss kills</th><th>Members</th><th v-if="me && !data.guild"></th></tr>
                            <tr v-for="(g, i) in data.guilds" :key="g.id">
                                <td>{{ i + 1 }}</td><td>[{{ g.tag }}] {{ g.name }}</td><td>{{ g.kills }}</td><td>{{ g.members }}/{{ data.guildRules.max }}</td>
                                <td v-if="me && !data.guild"><button type="button" class="zoo-mini" :disabled="busy || g.members >= data.guildRules.max" @click="joinGuild(g)">Join</button></td>
                            </tr>
                        </table>
                    </section>

                    <section v-else-if="tab === 'ranked'" class="zoo-ranked">
                        <template v-if="me && rk && rk.rating !== undefined">
                            <div class="zoo-rankcard">
                                <div class="zoo-rankicon">{{ rk.tier.icon }}</div>
                                <div>
                                    <h2>{{ rk.tier.name }} &middot; {{ rk.rating }} <small>season {{ rk.season }}</small></h2>
                                    <p class="zoo-muted">{{ rk.wins }} wins &middot; {{ rk.losses }} losses &middot; best {{ rk.peak }}</p>
                                    <p v-if="rk.next" class="zoo-muted">{{ rk.next.need }} points to {{ rk.next.icon }} {{ rk.next.name }}</p>
                                    <p v-else class="zoo-muted">You are in the top tier!</p>
                                    <div class="zoo-actions">
                                        <button type="button" class="zoo-btn" :disabled="busy" @click="rankedFight">Find a ranked match</button>
                                    </div>
                                    <p class="zoo-muted">You fight a player near your rating with your current team. Gems do not count in ranked. The season resets every month and pays a coin reward for your tier.</p>
                                </div>
                            </div>
                            <pre v-if="lastFight" class="zoo-fightlog">{{ lastFight }}</pre>
                        </template>
                        <p v-else class="zoo-muted">Log in on the Chat page to play ranked. The ladder below is public.</p>
                        <h2>Tiers</h2>
                        <table class="zoo-table">
                            <tr><th>Tier</th><th>Rating from</th><th>Season reward</th></tr>
                            <tr v-for="tr in rk.tiers" :key="tr.name"><td>{{ tr.icon }} {{ tr.name }}</td><td>{{ tr.min }}</td><td>{{ tr.reward }} coins</td></tr>
                        </table>
                        <h2>Ladder this season</h2>
                        <p v-if="!rk.top.length" class="zoo-muted">Nobody has played ranked yet. Be the first!</p>
                        <table v-else class="zoo-table">
                            <tr><th>#</th><th>Player</th><th>Rating</th><th>W / L</th></tr>
                            <tr v-for="(p, i) in rk.top" :key="p.name"><td>{{ i + 1 }}</td><td>{{ p.name }}</td><td>{{ p.rating }}</td><td>{{ p.wins }} / {{ p.losses }}</td></tr>
                        </table>
                    </section>

                    <section v-else class="zoo-guide">
                        <h2>Getting started</h2>
                        <ol>
                            <li><code>/hunt</code> costs 1 orb and catches a random animal. <code>/daily</code> is a free hunt every day and <code>/autohunt start 20</code> hunts for you while you are away.</li>
                            <li>Open the <b>Collection</b> tab and click an animal to add it to your <b>team</b> (up to 3 fighters).</li>
                            <li>Fight with <code>/battle</code> (wild teams or <code>/battle @user</code>) or climb the <b>Ranked</b> ladder.</li>
                            <li>Make your animals stronger with Pet Food and Level-Up Candy from the <b>Items</b> shop (max level 50).</li>
                            <li>Join a <b>Guild</b> to fight a new boss together every hour, and finish the <b>daily quests</b> above for coins.</li>
                        </ol>
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
                { id: "guild", label: "Guild" },
                { id: "ranked", label: "Ranked" },
                { id: "guide", label: "Guide" },
            ],
            boards: [
                { id: "species", label: "Most species", fmt: (r) => r.species + " species" },
                { id: "score", label: "Collection score", fmt: (r) => r.score + " pts" },
                { id: "wins", label: "Battle wins", fmt: (r) => r.wins + " wins" },
            ],
            timer: null,
            now: Date.now(),
            selected: "",
            guildName: "",
            guildTag: "",
            giftTo: "",
            giftKind: "coins",
            giftAmount: 10,
            lastFight: "",
            busy: false,
            notice: "",
            noticeBad: false,
        };
    },
    computed: {
        me() {
            return this.data?.me || null;
        },
        eventTier() {
            return this.data?.tiers.find((t) => t.id === this.data.event) || null;
        },
        sel() {
            return this.me && this.selected ? this.data.animals.find((a) => a.id === this.selected && this.me.zoo[a.id]) || null : null;
        },
        guildLeft() {
            const left = Math.max(0, (this.data?.guild?.boss?.ends || 0) - this.now);
            return `${Math.floor(left / 60000)}m ${Math.floor((left % 60000) / 1000)}s`;
        },
        rk() {
            return this.data?.ranked || { tiers: [], top: [] };
        },
        giftTargets() {
            const mine = (this.me?.username || "").toLowerCase();
            return (this.data?.guild?.members || []).filter((m) => m.name.toLowerCase() !== mine);
        },
        guildMembers() {
            return this.data?.guild ? this.data.guild.members.slice().sort((a, b) => b.damage - a.damage) : [];
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
        pick(a) {
            if (this.me && this.count(a)) this.selected = a.id;
        },
        tierLabel(a) {
            return this.data.tiers.find((t) => t.id === a.rarity)?.label || a.rarity;
        },
        statsAt(a) {
            const k = 1 + 0.1 * ((this.me.levels[a.id] || 1) - 1);
            const s = { hp: Math.round(a.stats[0] * k), atk: Math.round(a.stats[1] * k), def: Math.round(a.stats[2] * k) };
            if (a.bonus) s[a.bonus.stat] += a.bonus.amount;
            return s;
        },
        xpPct(a) {
            const level = this.me.levels[a.id] || 1;
            if (level >= 50) return 100;
            const base = 20 * (level - 1) ** 2;
            const next = 20 * level ** 2;
            return Math.max(0, Math.min(100, (100 * ((this.me.xp[a.id] || 0) - base)) / (next - base)));
        },
        xpText(a) {
            const level = this.me.levels[a.id] || 1;
            return `${this.me.xp[a.id] || 0} / ${20 * level ** 2} xp for level ${level + 1}`;
        },
        async act(body, okText) {
            const token = readToken();
            if (!token) {
                this.say("Log in on the Chat page first.", true);
                return;
            }
            this.busy = true;
            try {
                const res = await fetch("/api/chat/zoo/action", { method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" }, body: JSON.stringify(body) });
                const out = await res.json().catch(() => ({}));
                if (!res.ok) throw new Error(out.error || "That did not work.");
                this.data = { ...this.data, me: out.me, guild: out.guild, guilds: out.guilds, ranked: out.ranked || this.rk };
                this.say(typeof okText === "function" ? okText(out.result) : okText, false);
            } catch (e) {
                this.say(e.message || "That did not work.", true);
            }
            this.busy = false;
        },
        say(text, bad) {
            this.notice = text;
            this.noticeBad = bad;
            clearTimeout(this.noticeTimer);
            this.noticeTimer = setTimeout(() => (this.notice = ""), 5000);
        },
        addToTeam(a) {
            return this.act({ action: "team", team: [...this.me.team, a.id] }, `${a.name} joined your team.`);
        },
        removeFromTeam(a) {
            return this.act({ action: "team", team: this.me.team.filter((id) => id !== a.id) }, `${a.name} left your team.`);
        },
        swapIn(out, incoming) {
            return this.act({ action: "team", team: this.me.team.map((id) => (id === out.id ? incoming.id : id)) }, `${incoming.name} replaced ${out.name}.`);
        },
        useItem(kind, a, count) {
            return this.act({ action: kind, id: a.id, count }, (r) => `${a.name}: level ${r.before} to ${r.after} (used ${r.used}).`);
        },
        giftGuild() {
            return this.act({ action: "guildGift", to: this.giftTo, kind: this.giftKind, amount: this.giftAmount }, `Gift sent to ${this.giftTo}!`);
        },
        async rankedFight() {
            await this.act({ action: "rankedFight" }, (r) => {
                this.lastFight = r.text;
                return r.line;
            });
        },
        resetGuildBoss() {
            if (!window.confirm(`Pay ${this.data.guild.reset.cost} coins for a new guild boss?`)) return null;
            return this.act({ action: "guildReset" }, "A new guild boss is here! Attack it from the Guild tab.");
        },
        createGuild() {
            return this.act({ action: "guildCreate", name: this.guildName, tag: this.guildTag }, "Guild created!").then(() => (this.guildName = ""));
        },
        joinGuild(g) {
            return this.act({ action: "guildJoin", name: g.name }, `You joined ${g.name}!`);
        },
        leaveGuild() {
            if (!window.confirm("Leave your guild?")) return null;
            return this.act({ action: "guildLeave" }, "You left the guild.");
        },
        attackGuild() {
            return this.act({ action: "guildAttack" }, (r) => (r.defeated ? `You dealt ${r.dealt} damage and the guild boss is defeated! Your reward: ${this.rewardText(r.mine)}` : `You dealt ${r.dealt} damage!`));
        },
        rewardText(m) {
            return m ? `${m.coins} coins, ${m.food} Pet Food${m.candy ? `, ${m.candy} Level-Up Candy` : ""}${m.pet ? `, and the ${m.pet} Boss pet!` : ""}` : "nothing";
        },
        buy(key, count, pay) {
            return this.act({ action: "buy", item: key, count, pay }, (r) => `Bought ${r.amount} ${this.data.items[key].name} for ${r.price} ${pay}.`);
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
            const bonus = a.bonus ? ` | maxed: +${a.bonus.amount} ${a.bonus.stat.toUpperCase()}` : "";
            return `${a.name} - HP ${hp} ATK ${atk} DEF ${def} at level 1${bonus}${ab}${a.by ? ` | added by ${a.by}` : ""}`;
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
            if (this.now - (this.lastLoad || 0) >= 60000) {
                this.lastLoad = this.now;
                this.load();
            }
        }, 1000);
    },
    beforeUnmount() {
        clearInterval(this.timer);
    },
};
