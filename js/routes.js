import List from './pages/List.js';
import AILL from './pages/AILL.js';
import Leaderboard from './pages/Leaderboard.js';
import Roulette from './pages/Roulette.js';
import Packs from './pages/Packs.js';
import TimeMachine from './pages/TimeMachine.js';
import Minigame from './pages/Minigame.js';

export default [
    { path: '/', component: List },
    { path: '/easy-main', component: List, props: { easyOnly: true } },
    { path: '/aill', component: AILL },
    { path: '/leaderboard', component: Leaderboard },
    { path: '/roulette', component: Roulette },
    { path: '/minigames/higher-lower', component: Minigame, props: { game: 'higher-lower' } },
    { path: '/minigames/verifier', component: Minigame, props: { game: 'verifier' } },
    { path: '/minigames/rank', component: Minigame, props: { game: 'rank' } },
    { path: '/packs', component: Packs },
    { path: '/time-machine', component: TimeMachine },
];
