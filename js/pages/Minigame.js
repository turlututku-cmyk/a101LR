import { fetchList } from '../content.js';
import { getThumbnailFromId, getYoutubeIdFromUrl, shuffle } from '../util.js';

import Spinner from '../components/Spinner.js';

const ROUNDS = 10;

const GAMES = {
    'higher-lower': {
        title: 'Higher or Lower',
        subtitle: 'Two levels, one is harder. Pick the harder one. One wrong answer ends the run.',
    },
    verifier: {
        title: 'Guess the Verifier',
        subtitle: 'Who verified this level? 10 rounds.',
    },
    rank: {
        title: 'Guess the Rank',
        subtitle: 'Where does this level sit on the list? The closer you are, the more points you get. 5 rounds, 100 points each.',
    },
};

const RANK_ROUNDS = 5;
const RANK_POINTS = 100;
const RANK_PENALTY = 4;
const RANK_GOOD = 5;

export default {
    components: { Spinner },
    props: { game: { type: String, default: 'higher-lower' } },
    template: `
        <main v-if="loading">
            <Spinner></Spinner>
        </main>
        <main v-else class="page-minigame">
            <div class="mg" :class="['mg-' + game, usesEffects ? 'mg-fx' : '']">
                <h1>{{ info.title }}</h1>
                <p class="mg-sub">{{ info.subtitle }}</p>
                <p class="mg-best">Best: {{ best }}<span v-if="bestSuffix">{{ bestSuffix }}</span></p>

                <p v-if="!ready" class="mg-note">Not enough levels on the list to play this yet.</p>

                <template v-else>
                    <div v-if="phase === 'idle'" class="mg-start">
                        <button class="btn" type="button" @click="start">Start</button>
                    </div>

                    <!-- Higher or Lower -->
                    <template v-if="isDuel && phase !== 'idle'">
                        <p class="mg-score">Streak: {{ streak }}</p>
                        <div class="mg-duel">
                            <button
                                v-for="(lv, side) in [left, right]"
                                :key="lv.path"
                                type="button"
                                class="mg-card"
                                :class="cardClass(side)"
                                @click="pickDuel(side)"
                            >
                                <img :src="thumb(lv)" alt="">
                                <span class="type-label-lg">{{ lv.name }}</span>
                                <span class="mg-rank" v-if="revealed">#{{ lv.rank }}</span>
                            </button>
                        </div>
                        <div v-if="phase === 'over'" class="mg-over">
                            <h2>Game over</h2>
                            <p>You reached a streak of {{ streak }}.</p>
                            <button class="btn" type="button" @click="start">Play again</button>
                        </div>
                    </template>

                    <!-- Guess the Rank -->
                    <template v-if="isRank && phase === 'playing'">
                        <p class="mg-score">Round {{ round + 1 }} / {{ rounds }} &middot; Score {{ score }}</p>
                        <div class="mg-question" :class="rankVerdict ? 'is-' + rankVerdict : ''">
                            <img :src="thumb(question.level)" alt="">
                            <h2>Where is {{ question.level.name }} on the list?</h2>
                        </div>
                        <div class="mg-slider">
                            <input type="range" min="1" :max="maxRank" v-model.number="rankGuess" :disabled="!!rankResult">
                            <span class="mg-slider__value">#{{ rankGuess }}</span>
                        </div>
                        <div v-if="!rankResult">
                            <button class="btn" type="button" @click="lockRank">Lock in</button>
                        </div>
                        <div v-else class="mg-rank-result" :class="rankVerdict">
                            <p>It's <strong>#{{ rankResult.actual }}</strong> &mdash; you guessed #{{ rankResult.guess }} (off by {{ rankResult.diff }}).</p>
                            <p class="mg-rank-points">+{{ rankResult.points }} points</p>
                            <button class="btn" type="button" @click="nextRank">{{ round + 1 >= rounds ? 'See results' : 'Next' }}</button>
                        </div>
                    </template>

                    <!-- Guess the Verifier -->
                    <template v-if="isQuiz && phase === 'playing'">
                        <p class="mg-score">Round {{ round + 1 }} / {{ rounds }} &middot; Score {{ score }}</p>
                        <div class="mg-question" :class="verdict ? 'is-' + verdict : ''">
                            <img :src="thumb(question.level)" alt="">
                            <h2>Who verified {{ question.level.name }}?</h2>
                        </div>
                        <div class="mg-options">
                            <button
                                v-for="opt in question.options"
                                :key="opt"
                                type="button"
                                class="mg-option"
                                :class="optionClass(opt)"
                                @click="answer(opt)"
                            >{{ opt }}</button>
                        </div>
                    </template>

                    <div v-if="!isDuel && phase === 'over'" class="mg-over">
                        <h2>{{ score }} / {{ isRank ? rounds * pointsPerRound : rounds }}</h2>
                        <p>{{ score === (isRank ? rounds * pointsPerRound : rounds) ? 'Perfect!' : 'Nice run.' }}</p>
                        <button class="btn" type="button" @click="start">Play again</button>
                    </div>
                </template>
            </div>
        </main>
    `,
    data: () => ({
        loading: true,
        levels: [],
        phase: 'idle', // idle | playing | over
        rounds: ROUNDS,
        best: 0,
        // higher or lower
        left: null,
        right: null,
        revealed: false,
        picked: null,
        streak: 0,
        // quiz
        questions: [],
        question: null,
        round: 0,
        score: 0,
        answered: null,
        timer: null,
        // guess the rank
        rankGuess: 1,
        rankResult: null,
        pointsPerRound: RANK_POINTS,
    }),
    computed: {
        info() {
            return GAMES[this.game] || GAMES['higher-lower'];
        },
        isDuel() {
            return this.game === 'higher-lower';
        },
        isRank() {
            return this.game === 'rank';
        },
        isQuiz() {
            return this.game === 'verifier';
        },
        usesEffects() {
            return this.game === 'verifier' || this.game === 'rank';
        },
        bestSuffix() {
            if (this.isDuel) return '';
            if (this.isRank) return ` / ${RANK_ROUNDS * RANK_POINTS}`;
            return ` / ${this.rounds}`;
        },
        maxRank() {
            return Math.max(...this.levels.map((l) => l.rank), 1);
        },
        rankVerdict() {
            if (!this.rankResult) return '';
            return this.rankResult.diff <= RANK_GOOD ? 'correct' : 'wrong';
        },
        verdict() {
            if (this.answered === null || !this.question) return '';
            return this.answered === this.question.correct ? 'correct' : 'wrong';
        },
        storageKey() {
            return `minigame-best-${this.game}`;
        },
        pool() {
            return this.levels.filter((l) => l.yt);
        },
        verifierPool() {
            const seen = new Map();
            this.levels.forEach((l) => {
                const v = (l.verifier || '').trim();
                if (!v || v.toLowerCase() === 'none') return;
                if (!seen.has(v.toLowerCase())) seen.set(v.toLowerCase(), v);
            });
            return [...seen.values()];
        },
        ready() {
            if (this.game === 'verifier') {
                return this.pool.length >= 4 && this.verifierPool.length >= 4;
            }
            return this.pool.length >= 4;
        },
    },
    async mounted() {
        const list = await fetchList();
        this.levels = (list || [])
            .map(([lv], i) => (lv ? {
                path: lv.path,
                name: lv.name,
                verifier: lv.verifier,
                rank: i + 1,
                yt: getYoutubeIdFromUrl(lv.verification || ''),
            } : null))
            .filter(Boolean);
        this.best = Number(localStorage.getItem(this.storageKey)) || 0;
        this.loading = false;
    },
    beforeUnmount() {
        clearTimeout(this.timer);
    },
    methods: {
        thumb(lv) {
            return getThumbnailFromId(lv.yt);
        },
        updateBest(value) {
            if (value > this.best) {
                this.best = value;
                localStorage.setItem(this.storageKey, String(value));
            }
        },
        start() {
            clearTimeout(this.timer);
            this.phase = 'playing';
            if (this.isDuel) {
                this.streak = 0;
                this.nextDuel();
                return;
            }
            if (this.isRank) {
                this.questions = shuffle([...this.pool]).slice(0, RANK_ROUNDS);
                this.rounds = this.questions.length;
                this.round = 0;
                this.score = 0;
                this.beginRankRound();
                return;
            }
            let source = this.pool;
            if (this.game === 'verifier') {
                source = source.filter((q) => {
                    const v = (q.verifier || '').trim().toLowerCase();
                    return v && v !== 'none';
                });
            }
            this.questions = shuffle([...source]).slice(0, ROUNDS);
            this.rounds = this.questions.length;
            this.round = 0;
            this.score = 0;
            this.buildQuestion();
        },
        // Higher or Lower
        nextDuel() {
            const [a, b] = shuffle([...this.pool]).slice(0, 2);
            this.left = a;
            this.right = b;
            this.revealed = false;
            this.picked = null;
        },
        pickDuel(side) {
            if (this.revealed || this.phase !== 'playing') return;
            const chosen = [this.left, this.right][side];
            const other = [this.left, this.right][1 - side];
            this.picked = side;
            this.revealed = true;
            if (chosen.rank < other.rank) {
                this.streak++;
                this.updateBest(this.streak);
                this.timer = setTimeout(() => {
                    if (this.phase === 'playing') this.nextDuel();
                }, 1100);
            } else {
                this.phase = 'over';
            }
        },
        cardClass(side) {
            if (!this.revealed) return '';
            const mine = [this.left, this.right][side];
            const other = [this.left, this.right][1 - side];
            if (mine.rank < other.rank) return 'correct';
            return this.picked === side ? 'wrong' : '';
        },
        // Guess the Rank
        beginRankRound() {
            this.question = { level: this.questions[this.round] };
            this.rankResult = null;
            this.rankGuess = Math.round(this.maxRank / 2);
        },
        lockRank() {
            if (this.rankResult) return;
            const actual = this.question.level.rank;
            const diff = Math.abs(this.rankGuess - actual);
            const points = Math.max(0, RANK_POINTS - diff * RANK_PENALTY);
            this.score += points;
            this.rankResult = { guess: this.rankGuess, actual, diff, points };
        },
        nextRank() {
            this.round++;
            if (this.round >= this.questions.length) {
                this.updateBest(this.score);
                this.phase = 'over';
            } else {
                this.beginRankRound();
            }
        },
        // Quiz games
        buildQuestion() {
            const level = this.questions[this.round];
            const correct = level.verifier.trim();
            const others = this.verifierPool.filter((v) => v.toLowerCase() !== correct.toLowerCase());
            const options = shuffle([correct, ...shuffle(others).slice(0, 3)]);
            this.question = { level, correct, options };
            this.answered = null;
        },
        answer(opt) {
            if (this.answered !== null) return;
            this.answered = opt;
            if (opt === this.question.correct) this.score++;
            this.timer = setTimeout(() => {
                this.round++;
                if (this.round >= this.questions.length) {
                    this.updateBest(this.score);
                    this.phase = 'over';
                } else {
                    this.buildQuestion();
                }
            }, 1100);
        },
        optionClass(opt) {
            if (this.answered === null) return '';
            if (opt === this.question.correct) return 'correct';
            return opt === this.answered ? 'wrong' : '';
        },
    },
};
