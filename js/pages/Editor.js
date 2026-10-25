import { fetchList } from '../content.js';
import Spinner from '../components/Spinner.js';

const OWNER = 'turlututku-cmyk';
const REPO = 'a101LR';
const BRANCH = 'main';
const API = 'https://api.github.com';
const TOKEN_KEY = 'a101lr-gh-token';

const TIER_NAMES = [
    'easy-low', 'easy-mid', 'easy-hard',
    'medium-low', 'medium-mid', 'medium-high',
    'hard-low', 'hard-mid', 'hard-high',
    'insane-low', 'insane-mid', 'insane-high',
    'extreme-low', 'extreme-mid', 'extreme-high',
    'not-humanly-possible', 'not-humanly-possible-plus', 'free-demon',
];

const KNOWN_KEYS = [
    'id', 'name', 'author', 'creators', 'verifier', 'verification',
    'percentToQualify', 'device', 'difficulty', 'featured', 'epic',
];

const stripBom = (text) => text.replace(/^﻿/, '');

function tierLabel(key) {
    if (key === 'not-humanly-possible') return 'Not Humanly Possible';
    if (key === 'not-humanly-possible-plus') return 'Not Humanly Possible +';
    if (key === 'free-demon') return 'Free Demon';
    const [base, part] = key.split('-');
    const word = { low: 'Low', mid: 'Mid', high: 'High', hard: 'High' }[part];
    return word + ' ' + base[0].toUpperCase() + base.slice(1) + ' Demon';
}

// Matches the existing data file style (4 spaces, inline creators, expanded records)
function serializeLevel(level) {
    const keys = Object.keys(level).filter((k) => k !== 'records');
    const items = keys.map((k) => {
        const v = level[k];
        const text = Array.isArray(v)
            ? '[' + v.map((x) => JSON.stringify(x)).join(', ') + ']'
            : JSON.stringify(v);
        return '    ' + JSON.stringify(k) + ': ' + text;
    });
    const records = level.records || [];
    if (records.length === 0) {
        items.push('    "records": [\n    ]');
    } else {
        const blocks = records.map((r) =>
            '        {\n' +
            Object.keys(r).map((k) => '            ' + JSON.stringify(k) + ': ' + JSON.stringify(r[k])).join(',\n') +
            '\n        }',
        );
        items.push('    "records": [\n' + blocks.join(',\n') + '\n    ]');
    }
    return '{\n' + items.join(',\n') + '\n}\n';
}

function serializeNames(names) {
    return '[\n' + names.map((n) => '    ' + JSON.stringify(n)).join(',\n') + '\n]\n';
}

export default {
    components: { Spinner },
    template: `
        <main v-if="loading">
            <Spinner></Spinner>
        </main>
        <main v-else class="page-editor">
            <div class="ed">
                <h1>Level Editor</h1>

                <section class="ed-card">
                    <h2 class="ed-h">GitHub access</h2>
                    <div v-if="user" class="ed-row">
                        <p>Connected as <strong>{{ user }}</strong>. Saving commits straight to <code>main</code>.</p>
                        <button class="ed-btn" type="button" @click="disconnect">Disconnect</button>
                    </div>
                    <form v-else class="ed-connect" @submit.prevent="connect">
                        <p>
                            Paste a GitHub personal access token with write access to this repository
                            (a fine-grained token limited to <code>a101LR</code> with "Contents: Read and write" is enough).
                            It is stored only in this browser and is never sent anywhere except GitHub.
                        </p>
                        <input type="password" v-model="tokenInput" placeholder="github_pat_..." autocomplete="off">
                        <button class="btn" type="submit" :disabled="!tokenInput || busy">Connect</button>
                    </form>
                </section>

                <p v-if="message" class="ed-msg" :class="messageKind">{{ message }}</p>

                <section class="ed-card" v-if="user">
                    <h2 class="ed-h">Choose a level</h2>
                    <div class="ed-pick">
                        <input type="text" v-model="filter" placeholder="Filter by name...">
                        <select v-model="selectedPath" @change="selectLevel">
                            <option value="" disabled>Select a level</option>
                            <optgroup v-for="group in groups" :key="group.label" :label="group.label">
                                <option v-for="e in group.items" :key="group.label + e.path" :value="e.path">
                                    #{{ e.rank }} {{ e.name }}
                                </option>
                            </optgroup>
                        </select>
                    </div>
                </section>

                <template v-if="user && form">
                    <section class="ed-card">
                        <h2 class="ed-h">Info</h2>
                        <div class="ed-grid">
                            <label>ID<input type="text" v-model="form.id"></label>
                            <label>Name<input type="text" v-model="form.name"></label>
                            <label>Author<input type="text" v-model="form.author"></label>
                            <label>Creators (comma separated)<input type="text" v-model="form.creators"></label>
                            <label>Verifier<input type="text" v-model="form.verifier"></label>
                            <label>Verification video<input type="text" v-model="form.verification"></label>
                            <label>Percent to qualify<input type="number" min="1" max="100" v-model="form.percentToQualify"></label>
                            <label>Device
                                <select v-model="form.device">
                                    <option value="pc">PC</option>
                                    <option value="mobile">Mobile</option>
                                    <option value="console">Console</option>
                                </select>
                            </label>
                            <label>Tier
                                <select v-model="form.difficulty">
                                    <option value="">Automatic (by rank)</option>
                                    <option v-for="t in tiers" :key="t" :value="t">{{ tierText(t) }}</option>
                                </select>
                            </label>
                            <div class="ed-checks">
                                <label class="ed-check"><input type="checkbox" v-model="form.featured"> Featured (gold)</label>
                                <label class="ed-check"><input type="checkbox" v-model="form.epic"> Epic (purple)</label>
                            </div>
                        </div>
                    </section>

                    <section class="ed-card">
                        <h2 class="ed-h">Records ({{ form.records.length }})</h2>
                        <p v-if="form.records.length === 0" class="ed-empty">No records on this level.</p>
                        <div v-for="(r, i) in form.records" :key="i" class="ed-record">
                            <input type="text" v-model="r.user" placeholder="Player">
                            <input type="text" v-model="r.link" placeholder="Video link">
                            <input type="number" min="0" max="100" v-model="r.percent" placeholder="%" class="ed-narrow">
                            <input type="number" min="1" v-model="r.hz" placeholder="Hz" class="ed-narrow">
                            <select v-model="r.device" class="ed-narrow">
                                <option value="pc">PC</option>
                                <option value="mobile">Mobile</option>
                                <option value="console">Console</option>
                            </select>
                            <button class="ed-btn ed-danger" type="button" title="Delete this record" @click="removeRecord(i)">Delete</button>
                        </div>
                        <button class="ed-btn" type="button" @click="addRecord">+ Add record</button>
                    </section>

                    <section class="ed-actions">
                        <button class="btn" type="button" :disabled="busy || !dirty" @click="saveLevel">
                            {{ busy ? 'Working...' : 'Save changes' }}
                        </button>
                        <button class="ed-btn" type="button" :disabled="busy || !dirty" @click="resetForm">Reset</button>
                        <span v-if="dirty" class="ed-dirty">Unsaved changes</span>
                        <button class="ed-btn ed-danger ed-right" type="button" :disabled="busy" @click="deleteLevel">Delete level</button>
                    </section>
                </template>
            </div>
        </main>
    `,
    data: () => ({
        loading: true,
        busy: false,
        token: '',
        tokenInput: '',
        user: '',
        message: '',
        messageKind: '',
        entries: [],
        filter: '',
        selectedPath: '',
        form: null,
        original: null,
        originalText: '',
        tiers: TIER_NAMES,
    }),
    computed: {
        groups() {
            const q = this.filter.trim().toLowerCase();
            const match = (e) => !q || e.name.toLowerCase().includes(q);
            const main = this.entries.filter((e) => e.list === 'main' && match(e));
            const aill = this.entries.filter((e) => e.list === 'aill' && match(e));
            const groups = [];
            if (main.length) groups.push({ label: 'Main list', items: main });
            if (aill.length) groups.push({ label: 'AILL', items: aill });
            return groups;
        },
        dirty() {
            if (!this.form) return false;
            try {
                return serializeLevel(this.toJson()) !== this.originalText;
            } catch {
                return true;
            }
        },
    },
    async mounted() {
        this.token = localStorage.getItem(TOKEN_KEY) || '';
        await this.loadIndex();
        this.loading = false;
        if (this.token) await this.verifyToken(this.token, true);
    },
    methods: {
        tierText: tierLabel,
        say(text, kind = 'info') {
            this.message = text;
            this.messageKind = kind;
        },
        async loadIndex() {
            const toEntries = (list, key) => (list || [])
                .map(([level], i) => (level ? { path: level.path, name: level.name, list: key, rank: i + 1 } : null))
                .filter(Boolean);
            const [main, aill] = await Promise.all([fetchList('_list'), fetchList('_aill')]);
            this.entries = [...toEntries(main, 'main'), ...toEntries(aill, 'aill')];
        },
        async gh(path, options = {}) {
            const res = await fetch(API + path, {
                ...options,
                headers: {
                    Accept: 'application/vnd.github+json',
                    Authorization: 'Bearer ' + this.token,
                    'Content-Type': 'application/json',
                    ...(options.headers || {}),
                },
            });
            if (!res.ok) {
                let detail = '';
                try { detail = (await res.json()).message; } catch { /* no body */ }
                throw new Error('GitHub ' + res.status + (detail ? ': ' + detail : ''));
            }
            return res.status === 204 ? null : res.json();
        },
        repoPath(suffix) {
            return '/repos/' + OWNER + '/' + REPO + suffix;
        },
        async readFile(path) {
            const file = await this.gh(this.repoPath('/contents/' + encodeURI(path) + '?ref=' + BRANCH));
            const bin = atob(String(file.content).replace(/\n/g, ''));
            const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
            return stripBom(new TextDecoder().decode(bytes));
        },
        async verifyToken(token, quiet = false) {
            this.token = token;
            try {
                const me = await this.gh('/user');
                const repo = await this.gh(this.repoPath(''));
                if (!repo.permissions || !repo.permissions.push) {
                    throw new Error('This token cannot write to ' + OWNER + '/' + REPO + '.');
                }
                this.user = me.login;
                localStorage.setItem(TOKEN_KEY, token);
                if (!quiet) this.say('Connected as ' + me.login + '.', 'ok');
            } catch (e) {
                this.token = '';
                this.user = '';
                localStorage.removeItem(TOKEN_KEY);
                this.say(quiet ? 'Your saved token no longer works. Please connect again.' : e.message, 'error');
            }
        },
        async connect() {
            this.busy = true;
            await this.verifyToken(this.tokenInput.trim());
            if (this.user) this.tokenInput = '';
            this.busy = false;
        },
        disconnect() {
            localStorage.removeItem(TOKEN_KEY);
            this.token = '';
            this.user = '';
            this.form = null;
            this.selectedPath = '';
            this.say('Disconnected. The token was removed from this browser.', 'info');
        },
        async selectLevel() {
            if (this.dirty && !window.confirm('Discard your unsaved changes?')) {
                return;
            }
            this.busy = true;
            this.say('Loading from GitHub...', 'info');
            try {
                const text = await this.readFile('data/' + this.selectedPath + '.json');
                this.original = JSON.parse(text);
                this.originalText = serializeLevel(this.original);
                this.form = this.toForm(this.original);
                this.say('', 'info');
            } catch (e) {
                this.form = null;
                this.say('Could not load the level: ' + e.message, 'error');
            }
            this.busy = false;
        },
        toForm(o) {
            return {
                id: String(o.id ?? ''),
                name: o.name || '',
                author: o.author || '',
                creators: (o.creators || []).join(', '),
                verifier: o.verifier || '',
                verification: o.verification || '',
                percentToQualify: String(o.percentToQualify ?? '100'),
                device: o.device || 'pc',
                difficulty: o.difficulty || '',
                featured: !!o.featured,
                epic: !!o.epic,
                records: (o.records || []).map((r) => ({
                    user: r.user || '',
                    link: r.link || '',
                    percent: r.percent ?? 100,
                    hz: r.hz ?? '',
                    device: r.device || 'pc',
                })),
            };
        },
        toJson() {
            const f = this.form;
            const out = {};
            const id = String(f.id).trim();
            out.id = /^\d+$/.test(id) ? Number(id) : id;
            out.name = f.name.trim();
            out.author = f.author.trim();
            out.creators = f.creators.split(',').map((s) => s.trim()).filter(Boolean);
            out.verifier = f.verifier.trim();
            out.verification = f.verification.trim();
            out.percentToQualify = String(f.percentToQualify).trim();
            out.device = f.device;
            if (f.difficulty) out.difficulty = f.difficulty;
            if (f.featured) out.featured = true;
            if (f.epic) out.epic = true;
            // keep any extra fields the editor does not know about (password, showcase, ...)
            for (const k of Object.keys(this.original || {})) {
                if (!KNOWN_KEYS.includes(k) && k !== 'records') out[k] = this.original[k];
            }
            out.records = f.records.map((r) => ({
                user: String(r.user).trim(),
                link: String(r.link).trim(),
                percent: Number(r.percent),
                hz: Number(r.hz),
                device: r.device,
            }));
            return out;
        },
        validate(level) {
            if (!level.name) return 'The level needs a name.';
            if (level.id === '' || level.id === undefined) return 'The level needs an ID.';
            if (!level.verification) return 'The level needs a verification video.';
            const pct = Number(level.percentToQualify);
            if (!(pct >= 1 && pct <= 100)) return 'Percent to qualify must be between 1 and 100.';
            for (let i = 0; i < level.records.length; i++) {
                const r = level.records[i];
                const n = i + 1;
                if (!r.user) return 'Record ' + n + ' needs a player name.';
                if (!r.link) return 'Record ' + n + ' needs a video link.';
                if (!(r.percent >= 0 && r.percent <= 100)) return 'Record ' + n + ': percent must be 0-100.';
                if (!(r.hz > 0)) return 'Record ' + n + ': Hz must be a positive number.';
            }
            return '';
        },
        addRecord() {
            this.form.records.push({ user: '', link: '', percent: 100, hz: 240, device: 'pc' });
        },
        removeRecord(i) {
            this.form.records.splice(i, 1);
        },
        resetForm() {
            this.form = this.toForm(this.original);
            this.say('', 'info');
        },
        // One atomic commit for any number of file changes (content: null deletes the file)
        async commit(message, changes) {
            const ref = await this.gh(this.repoPath('/git/ref/heads/' + BRANCH));
            const head = ref.object.sha;
            const headCommit = await this.gh(this.repoPath('/git/commits/' + head));
            const tree = [];
            for (const c of changes) {
                if (c.content === null) {
                    tree.push({ path: c.path, mode: '100644', type: 'blob', sha: null });
                } else {
                    const blob = await this.gh(this.repoPath('/git/blobs'), {
                        method: 'POST',
                        body: JSON.stringify({ content: c.content, encoding: 'utf-8' }),
                    });
                    tree.push({ path: c.path, mode: '100644', type: 'blob', sha: blob.sha });
                }
            }
            const newTree = await this.gh(this.repoPath('/git/trees'), {
                method: 'POST',
                body: JSON.stringify({ base_tree: headCommit.tree.sha, tree }),
            });
            const commit = await this.gh(this.repoPath('/git/commits'), {
                method: 'POST',
                body: JSON.stringify({ message, tree: newTree.sha, parents: [head] }),
            });
            await this.gh(this.repoPath('/git/refs/heads/' + BRANCH), {
                method: 'PATCH',
                body: JSON.stringify({ sha: commit.sha }),
            });
            return commit.sha;
        },
        async saveLevel() {
            const level = this.toJson();
            const problem = this.validate(level);
            if (problem) {
                this.say(problem, 'error');
                return;
            }
            this.busy = true;
            this.say('Saving to GitHub...', 'info');
            try {
                const text = serializeLevel(level);
                const sha = await this.commit('Edit ' + level.name + ' (level editor)', [
                    { path: 'data/' + this.selectedPath + '.json', content: text },
                ]);
                this.original = level;
                this.originalText = text;
                this.form = this.toForm(level);
                const entry = this.entries.find((e) => e.path === this.selectedPath);
                if (entry) entry.name = level.name;
                this.say('Saved (commit ' + sha.slice(0, 7) + '). The live site updates after the next Cloudflare build, usually about a minute.', 'ok');
            } catch (e) {
                this.say('Save failed: ' + e.message, 'error');
            }
            this.busy = false;
        },
        async deleteLevel() {
            const name = this.original.name;
            const path = this.selectedPath;
            const sure = window.confirm(
                'Delete "' + name + '" completely?\n\nThis removes the level file, takes it off the lists and removes it from any packs. It can only be undone through GitHub history.',
            );
            if (!sure) return;
            this.busy = true;
            this.say('Deleting...', 'info');
            try {
                const changes = [{ path: 'data/' + path + '.json', content: null }];
                for (const file of ['_list', '_aill']) {
                    const names = JSON.parse(await this.readFile('data/' + file + '.json'));
                    if (names.includes(path)) {
                        changes.push({
                            path: 'data/' + file + '.json',
                            content: serializeNames(names.filter((n) => n !== path)),
                        });
                    }
                }
                const packs = JSON.parse(await this.readFile('data/_packs.json'));
                let packsChanged = false;
                for (const pack of packs) {
                    if (pack.levels.includes(path)) {
                        pack.levels = pack.levels.filter((n) => n !== path);
                        packsChanged = true;
                    }
                }
                if (packsChanged) {
                    changes.push({ path: 'data/_packs.json', content: JSON.stringify(packs, null, 4) + '\n' });
                }
                const sha = await this.commit('Delete ' + name + ' (level editor)', changes);
                this.entries = this.entries.filter((e) => e.path !== path);
                this.form = null;
                this.selectedPath = '';
                this.say('Deleted "' + name + '" (commit ' + sha.slice(0, 7) + ').', 'ok');
            } catch (e) {
                this.say('Delete failed: ' + e.message, 'error');
            }
            this.busy = false;
        },
    },
};
