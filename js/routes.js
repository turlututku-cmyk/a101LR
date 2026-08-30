import List from './pages/List.js';
import AILL from './pages/AILL.js';
import Leaderboard from './pages/Leaderboard.js';
import Roulette from './pages/Roulette.js';
import Packs from './pages/Packs.js';

export default [
    { path: '/', component: List },
    { path: '/aill', component: AILL },
    { path: '/leaderboard', component: Leaderboard },
    { path: '/roulette', component: Roulette },
    { path: '/packs', component: Packs },
];
