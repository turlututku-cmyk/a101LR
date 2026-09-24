// https://stackoverflow.com/questions/3452546/how-do-i-get-the-youtube-video-id-from-a-url
export function getYoutubeIdFromUrl(url) {
    return url.match(
        /.*(?:youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=)([^#\&\?]*).*/,
    )?.[1] ?? '';
}

export function embed(video) {
    return `https://www.youtube.com/embed/${getYoutubeIdFromUrl(video)}`;
}

export function localize(num) {
    return num.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

export function getThumbnailFromId(id) {
    return `https://img.youtube.com/vi/${id}/mqdefault.jpg`;
}

export function deviceIcon(device, dark) {
    const icon = device === 'console'
        ? 'game-controller'
        : device === 'mobile'
            ? 'phone-landscape'
            : 'computer';
    return `/assets/${icon}${dark ? '-dark' : ''}.svg`;
}

const difficulties = ['easy', 'medium', 'hard', 'insane', 'extreme'];

export function difficultyOf(level, rank) {
    if (difficulties.includes(level?.difficulty)) return level.difficulty;
    if (rank === undefined || rank <= 1) return 'extreme';
    if (rank <= 25) return 'insane';
    if (rank <= 40) return 'hard';
    if (rank <= 55) return 'medium';
    return 'easy';
}

export function difficultyIcon(level, rank) {
    return `/assets/difficulty/${difficultyOf(level, rank)}.png`;
}

export function difficultyLabel(level, rank) {
    const d = difficultyOf(level, rank);
    return `${d[0].toUpperCase()}${d.slice(1)} Demon`;
}

export function deviceLabel(device) {
    if (device === 'console') return 'Console';
    if (device === 'mobile') return 'Mobile';
    return 'PC';
}

// https://stackoverflow.com/questions/2450954/how-to-randomize-shuffle-a-javascript-array
export function shuffle(array) {
    let currentIndex = array.length, randomIndex;

    // While there remain elements to shuffle.
    while (currentIndex != 0) {
        // Pick a remaining element.
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;

        // And swap it with the current element.
        [array[currentIndex], array[randomIndex]] = [
            array[randomIndex],
            array[currentIndex],
        ];
    }

    return array;
}
