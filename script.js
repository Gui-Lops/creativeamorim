const video = document.querySelector('#hero-video');
const film = document.querySelector('.film');

window.addEventListener('scroll', () => {

    const rect = film.getBoundingClientRect();

    const distance = film.offsetHeight - window.innerHeight;

    const progress = Math.max(
        0,
        Math.min(
            1,
            -rect.top / distance
        )
    );

    if (video.duration) {
        video.currentTime = progress * video.duration;
    }

    console.log(
        'progress:',
        progress.toFixed(3),
        '| time:',
        video.currentTime.toFixed(2)
    );
});