import { store } from "../main.js";
import { embed, deviceIcon, deviceLabel } from "../util.js";
import { fetchList } from "../content.js";

import Spinner from "../components/Spinner.js";
import LevelAuthors from "../components/List/LevelAuthors.js";

export default {
    components: { Spinner, LevelAuthors },
    template: `
        <main v-if="loading">
            <Spinner></Spinner>
        </main>
        <main v-else class="page-list">
            <div class="list-container">
                <div class="list-search">
                    <input
                        type="text"
                        v-model="search"
                        placeholder="Search levels..."
                    >
                </div>
                <table class="list" v-if="filteredList.length > 0">
                    <tr v-for="[level, err, i] in filteredList">
                        <td class="rank">
                            <p class="type-label-lg">#{{ i + 1 }}</p>
                        </td>
                        <td class="level" :class="{ 'active': selected == i, 'error': !level }">
                            <button @click="selected = i">
                                <span class="type-label-lg">{{ level?.name || \`Error (\${err}.json)\` }}</span>
                            </button>
                        </td>
                    </tr>
                </table>
                <p v-else-if="list.length > 0" class="list-empty">No levels match "{{ search }}".</p>
            </div>
            <div class="level-container">
                <div class="level" v-if="level">
                    <h1>{{ level.name }}</h1>
                    <LevelAuthors :author="level.author" :creators="level.creators" :verifier="level.verifier"></LevelAuthors>
                    <iframe class="video" id="videoframe" :src="video" frameborder="0"></iframe>
                    <ul class="stats">
                        <li>
                            <div class="type-title-sm">ID</div>
                            <p>{{ level.id }}</p>
                        </li>
                        <li>
                            <div class="type-title-sm">Password</div>
                            <p>{{ level.password || 'Free to Copy' }}</p>
                        </li>
                        <li>
                            <div class="type-title-sm">Device</div>
                            <p><img class="device-icon" :src="deviceIcon(level.device)" :alt="deviceLabel(level.device)" :title="deviceLabel(level.device)"></p>
                        </li>
                    </ul>
                    <h2>Records</h2>
                    <p><strong>{{ level.percentToQualify }}%</strong> or better to qualify</p>
                    <table class="records">
                        <tr v-for="record in level.records" class="record">
                            <td class="percent">
                                <p>{{ record.percent }}%</p>
                            </td>
                            <td class="user">
                                <a :href="record.link" target="_blank" class="type-label-lg">{{ record.user }}</a>
                            </td>
                            <td class="device">
                                <img :src="deviceIcon(record.device)" :alt="deviceLabel(record.device)" :title="deviceLabel(record.device)">
                            </td>
                            <td class="hz">
                                <p>{{ record.hz }}Hz</p>
                            </td>
                        </tr>
                    </table>
                </div>
                <div v-else class="level" style="height: 100%; justify-content: center; align-items: center;">
                    <p>(ノಠ益ಠ)ノ彡┻━┻</p>
                </div>
            </div>
            <div class="meta-container">
                <div class="meta">
                    <div class="errors" v-show="errors.length > 0">
                        <p class="error" v-for="error of errors">{{ error }}</p>
                    </div>
                    <div class="og">
                        <p class="type-label-md">AILL is where there is impossible a101 list levels.</p>
                    </div>
                </div>
            </div>
        </main>
    `,
    data: () => ({
        list: [],
        loading: true,
        selected: 0,
        errors: [],
        search: '',
        store
    }),
    computed: {
        filteredList() {
            const query = this.search.trim().toLowerCase();
            return this.list
                .map(([level, err], i) => [level, err, i])
                .filter(([level]) => !query || (level?.name || '').toLowerCase().includes(query));
        },
        level() {
            return this.list[this.selected][0];
        },
        video() {
            if (!this.level.showcase) {
                return embed(this.level.verification);
            }

            return embed(
                this.toggledShowcase
                    ? this.level.showcase
                    : this.level.verification
            );
        },
    },
    async mounted() {
        this.list = await fetchList('_aill');

        if (!this.list) {
            this.errors = [
                "Failed to load AILL. Retry in a few minutes or notify list staff.",
            ];
        } else {
            this.errors.push(
                ...this.list
                    .filter(([_, err]) => err)
                    .map(([_, err]) => {
                        return `Failed to load level. (${err}.json)`;
                    })
            );
        }

        this.loading = false;
    },
    methods: {
        embed,
        deviceIcon: (device) => deviceIcon(device, store.dark),
        deviceLabel,
    },
};
