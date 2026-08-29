import { store } from "../main.js";
import { fetchList, fetchPacks } from "../content.js";
import Spinner from "../components/Spinner.js";

export default {
    components: { Spinner },
    template: `
        <main v-if="loading">
            <Spinner></Spinner>
        </main>
        <main v-else class="page-packs">
            <div class="packs-sidebar">
                <div class="packs-sidebar__inner">
                    <button
                        v-for="(pack, i) in packs"
                        :key="pack.name"
                        class="pack-button"
                        :class="{ active: selected === i }"
                        :style="{ '--pack-color': pack.color || 'var(--color-primary)' }"
                        @click="selected = i"
                    >
                        {{ pack.name }}
                    </button>
                </div>
            </div>

            <div class="packs-content" v-if="pack">
                <div class="pack-header" :style="{ '--pack-color': pack.color || 'var(--color-primary)' }">
                    <div>
                        <p class="type-label-md">PACK</p>
                        <h1>{{ pack.name }}</h1>
                        <p>{{ pack.levels.length }} level{{ pack.levels.length === 1 ? '' : 's' }}</p>
                    </div>
                    <div class="pack-badge">{{ selected + 1 }}</div>
                </div>

                <div class="pack-levels">
                    <button
                        v-for="(item, i) in packLevels"
                        :key="item.path || item.error || i"
                        class="pack-level"
                        :class="{ error: item.error }"
                        @click="openLevel(item.path)"
                    >
                        <span class="pack-level__rank">#{{ i + 1 }}</span>
                        <span class="pack-level__name">{{ item.level ? item.level.name : item.error }}</span>
                        <span class="pack-level__arrow">›</span>
                    </button>
                </div>
            </div>

            <div v-else class="packs-empty">
                <p>No packs found.</p>
                <p>Edit <code>data/_packs.json</code> to add one.</p>
            </div>
        </main>
    `,
    data: () => ({
        packs: [],
        list: [],
        loading: true,
        selected: 0,
        store,
    }),
    computed: {
        pack() {
            return this.packs[this.selected];
        },
        packLevels() {
            if (!this.pack) return [];
            const lookup = new Map(
                this.list
                    .filter(([level]) => level)
                    .map(([level]) => [level.path, level]),
            );

            return this.pack.levels.map((path) => ({
                path,
                level: lookup.get(path),
                error: lookup.has(path) ? null : `Missing level: ${path}.json`,
            }));
        },
    },
    async mounted() {
        const [packs, list] = await Promise.all([fetchPacks(), fetchList()]);
        this.packs = packs || [];
        this.list = list || [];
        this.loading = false;
    },
    methods: {
        openLevel(path) {
            if (!path) return;
            this.$router.push({ path: '/', query: { level: path } });
        },
    },
};
