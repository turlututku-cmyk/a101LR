import routes from './routes.js';

export const store = Vue.reactive({
    dark: JSON.parse(localStorage.getItem('dark')) || false,
    toggleDark() {
        this.dark = !this.dark;
        localStorage.setItem('dark', JSON.stringify(this.dark));
    },
});

const app = Vue.createApp({
    data: () => ({ store, listMenuOpen: false, minigamesMenuOpen: false }),
    computed: {
        listActive() {
            return ['/', '/aill', '/easy-main'].includes(this.$route.path);
        },
        minigamesActive() {
            return ['/roulette', '/minigames'].some((p) => this.$route.path.startsWith(p));
        },
    },
    watch: {
        '$route.path'() {
            this.listMenuOpen = false;
            this.minigamesMenuOpen = false;
        },
    },
    mounted() {
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.nav__menu')) {
                this.listMenuOpen = false;
                this.minigamesMenuOpen = false;
            }
        });
    },
});
const router = VueRouter.createRouter({
    history: VueRouter.createWebHashHistory(),
    routes,
});

app.use(router);

app.mount('#app');
