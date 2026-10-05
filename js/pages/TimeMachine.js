import { store } from "../main.js";
import Spinner from "../components/Spinner.js";

const EASY_VERIFIERS = [
    'cduking', 'cdukinggd', 'ick567', 'gdkegrem', 'xigot', 'lecleercgd', 'must13must',
];

export default {
    components: { Spinner },
    template: `
        <main v-if="loading">
            <Spinner></Spinner>
        </main>
        <main v-else class="page-time-machine">
            <div class="tm-picker">
                <h1>Time Machine</h1>
                <p>Pick a date to see what the list looked like back then.</p>
                <form class="tm-form" novalidate @submit.prevent="go">
                    <input
                        type="date"
                        v-model="inputDate"
                        :min="earliestDate"
                        :max="latestDate"
                    >
                    <button class="btn" type="submit" :disabled="!inputDate">Go</button>
                </form>
                <p class="tm-range" v-if="earliestDate && latestDate">
                    Data available from {{ formatDate(earliestDate) }} to {{ formatDate(latestDate) }}.
                </p>
                <p class="tm-error" v-if="error">{{ error }}</p>
            </div>

            <div class="tm-result" v-if="resultDate">
                <h2>As of {{ formatDate(resultDate) }}</h2>
                <p class="tm-result-sub" v-if="resultDate !== inputDate">
                    No snapshot for {{ formatDate(inputDate) }} &mdash; showing the closest earlier date.
                </p>

                <div class="tm-columns">
                    <div class="tm-column" v-for="col in columns" :key="col.key">
                        <h3 class="type-title-md">{{ col.label }} <span class="tm-count">{{ col.items.length }}</span></h3>
                        <ol class="tm-list" v-if="col.items.length">
                            <li v-for="item in col.items" :key="item.entry.p + item.rank">
                                <a
                                    v-if="item.link"
                                    class="tm-item tm-item--link"
                                    href="#"
                                    @click.prevent="open(item.link)"
                                >
                                    <span class="tm-rank">#{{ item.rank }}</span>
                                    <span>{{ item.entry.n }}</span>
                                    <span class="tm-item__arrow">&rsaquo;</span>
                                </a>
                                <div v-else class="tm-item" title="No longer on the list">
                                    <span class="tm-rank">#{{ item.rank }}</span>
                                    <span>{{ item.entry.n }}</span>
                                </div>
                            </li>
                        </ol>
                        <p v-else class="tm-empty">No levels for this date.</p>
                    </div>
                </div>
            </div>
        </main>
    `,
    data: () => ({
        loading: true,
        archive: {},
        dates: [],
        inputDate: '',
        resultDate: null,
        resultList: [],
        resultAill: [],
        currentMain: [],
        currentAill: [],
        error: '',
        store,
    }),
    computed: {
        earliestDate() {
            return this.dates[0] || '';
        },
        latestDate() {
            const last = this.dates[this.dates.length - 1] || '';
            const now = new Date();
            const pad = (n) => String(n).padStart(2, '0');
            const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
            return today > last ? today : last;
        },
        columns() {
            const withRank = (arr) => arr.map((entry, i) => ({ entry, rank: i + 1 }));
            const main = withRank(this.resultList);
            const easy = main.filter(({ entry }) =>
                EASY_VERIFIERS.includes((entry.v || '').toLowerCase()),
            );
            const aill = withRank(this.resultAill);
            const link = (key) => (item) => ({ ...item, link: this.linkFor(item.entry.p, key) });
            return [
                { key: 'main', label: 'Main', items: main.map(link('main')) },
                { key: 'aill', label: 'AILL', items: aill.map(link('aill')) },
                { key: 'easy', label: 'Easy Main', items: easy.map(link('easy')) },
            ];
        },
    },
    async mounted() {
        const getJson = async (file) => {
            try {
                return await (await fetch(`/data/${file}.json`)).json();
            } catch {
                return [];
            }
        };
        const [archive, main, aill] = await Promise.all([
            getJson('_timemachine'),
            getJson('_list'),
            getJson('_aill'),
        ]);
        this.archive = Array.isArray(archive) ? {} : archive;
        this.currentMain = main;
        this.currentAill = aill;
        this.dates = Object.keys(this.archive).sort();
        this.inputDate = this.latestDate;
        this.loading = false;
        if (this.inputDate) this.go();
    },
    methods: {
        formatDate(d) {
            if (!d) return '';
            const [y, m, day] = d.split('-');
            return new Date(Number(y), Number(m) - 1, Number(day)).toLocaleDateString('en-US', {
                year: 'numeric', month: 'long', day: 'numeric',
            });
        },
        linkFor(path, key) {
            const inMain = this.currentMain.includes(path);
            const inAill = this.currentAill.includes(path);
            if (key === 'aill') {
                if (inAill) return { route: '/aill', path };
                if (inMain) return { route: '/', path };
            } else {
                if (inMain) return { route: '/', path };
                if (inAill) return { route: '/aill', path };
            }
            return null;
        },
        open(link) {
            this.$router.push({ path: link.route, query: { level: link.path } });
        },
        go() {
            this.error = '';
            if (!this.inputDate) return;

            // Find the latest snapshot date <= the picked date
            let match = null;
            for (const d of this.dates) {
                if (d <= this.inputDate) match = d;
                else break;
            }

            if (!match) {
                this.resultDate = null;
                this.resultList = [];
                this.resultAill = [];
                this.error = `No data before ${this.formatDate(this.earliestDate)}.`;
                return;
            }

            this.resultDate = match;
            this.resultList = this.archive[match]?.list || [];
            this.resultAill = this.archive[match]?.aill || [];
        },
    },
};
