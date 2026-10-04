import { store } from "../main.js";
import Spinner from "../components/Spinner.js";

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
                    <div class="tm-column">
                        <h3 class="type-title-md">List</h3>
                        <ol class="tm-list" v-if="resultList.length">
                            <li v-for="(name, i) in resultList" :key="i">
                                <span class="tm-rank">#{{ i + 1 }}</span>
                                <span>{{ name }}</span>
                            </li>
                        </ol>
                        <p v-else class="tm-empty">No list data for this date.</p>
                    </div>

                    <div class="tm-column" v-if="resultAill.length">
                        <h3 class="type-title-md">AILL</h3>
                        <ol class="tm-list">
                            <li v-for="(name, i) in resultAill" :key="i">
                                <span class="tm-rank">#{{ i + 1 }}</span>
                                <span>{{ name }}</span>
                            </li>
                        </ol>
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
    },
    async mounted() {
        try {
            const res = await fetch('/data/_timemachine.json');
            this.archive = await res.json();
        } catch {
            this.archive = {};
        }
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
