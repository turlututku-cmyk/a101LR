import routes from './routes.js';

export const store = Vue.reactive({
    dark: JSON.parse(localStorage.getItem('dark')) || false,
    toggleDark() {
        this.dark = !this.dark;
        localStorage.setItem('dark', JSON.stringify(this.dark));
    },
});

const app = Vue.createApp({
    data: () => ({ store, listMenuOpen: false }),
    computed: {
        listActive() {
            return ['/', '/aill', '/easy-main'].includes(this.$route.path);
        },
    },
    watch: {
        '$route.path'() {
            this.listMenuOpen = false;
        },
    },
    mounted() {
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.nav__menu')) this.listMenuOpen = false;
        });
    },
});
const router = VueRouter.createRouter({
    history: VueRouter.createWebHashHistory(),
    routes,
});

app.use(router);

app.mount('#app');
