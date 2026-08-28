(() => {
  const video = document.querySelector('#hero-video');
  const film = document.querySelector('.film');
  const words = [...document.querySelectorAll('.hero-word')];
  const scrollCue = document.querySelector('.scroll-cue');

  if (!video || !film) return;

  const reduced = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches;

  const clamp = (value, min, max) =>
    Math.min(Math.max(value, min), max);

  let videoReady = false;
  let ticking = false;
  let lastTime = -1;

  /*
   * ---------------------------------------------------------
   * PROGRESSO DO SCROLL
   * ---------------------------------------------------------
   *
   * .film é a área longa.
   * .film-sticky permanece preso na viewport.
   *
   * 0%  = começo da .film
   * 100% = final da .film
   */
  function getProgress() {
    const rect = film.getBoundingClientRect();

    const scrollDistance =
      film.offsetHeight - window.innerHeight;

    if (scrollDistance <= 0) {
      return 0;
    }

    return clamp(
      -rect.top / scrollDistance,
      0,
      1
    );
  }

  /*
   * ---------------------------------------------------------
   * INTERFACE
   * ---------------------------------------------------------
   */
  function updateUI(progress) {

    // Scroll cue
    if (scrollCue) {
      const opacity = clamp(
        1 - progress * 4,
        0,
        1
      );

      scrollCue.style.opacity = opacity;

      scrollCue.style.pointerEvents =
        opacity < 0.05
          ? 'none'
          : 'auto';
    }

    // FAZEMOS -> MARCAS -> VIVER.
    words.forEach((word, index) => {

      const start =
        0.06 + index * 0.22;

      const end =
        start + 0.28;

      const reveal = clamp(
        (progress - start) /
          (end - start),
        0,
        1
      );

      word.style.setProperty(
        '--reveal',
        reveal
      );
    });
  }

  /*
   * ---------------------------------------------------------
   * VÍDEO
   * ---------------------------------------------------------
   */
  function updateVideo() {

    if (!videoReady) return;

    if (
      !Number.isFinite(video.duration) ||
      video.duration <= 0
    ) {
      return;
    }

    const progress = getProgress();

    updateUI(progress);

    if (reduced) {
      return;
    }

    /*
     * PROGRESSO 0 → 1
     *
     * vira
     *
     * TEMPO 0 → 8 segundos
     */
    const targetTime =
      progress * video.duration;

    /*
     * Evita seeks idênticos.
     */
    if (
      Math.abs(targetTime - lastTime) < 0.016
    ) {
      return;
    }

    lastTime = targetTime;

    try {
      video.currentTime = targetTime;
    } catch (error) {
      console.warn(
        'Erro ao alterar currentTime:',
        error
      );
    }
  }

  /*
   * ---------------------------------------------------------
   * SCROLL
   * ---------------------------------------------------------
   */
  function handleScroll() {

    if (ticking) return;

    ticking = true;

    requestAnimationFrame(() => {
      updateVideo();
      ticking = false;
    });
  }

  /*
   * ---------------------------------------------------------
   * VIDEO READY
   * ---------------------------------------------------------
   */
  function initVideo() {

    video.muted = true;
    video.playsInline = true;

    /*
     * Importante:
     * queremos usar o vídeo como uma sequência de frames,
     * não como um vídeo tocando.
     */
    video.pause();

    video.preload = 'auto';

    function ready() {

      if (
        Number.isFinite(video.duration) &&
        video.duration > 0
      ) {
        videoReady = true;

        console.log(
          'Scroll video pronto:',
          video.duration + 's'
        );

        /*
         * Começa no frame 0.
         */
        try {
          video.currentTime = 0;
        } catch (e) {}

        updateVideo();
      }
    }

    video.addEventListener(
      'loadedmetadata',
      ready
    );

    video.addEventListener(
      'loadeddata',
      ready
    );

    video.addEventListener(
      'canplay',
      ready
    );

    video.addEventListener(
      'canplaythrough',
      ready
    );

    /*
     * Caso já esteja carregado.
     */
    if (
      video.readyState >= 2 &&
      Number.isFinite(video.duration)
    ) {
      ready();
    }
  }

  /*
   * ---------------------------------------------------------
   * EVITA AUTOPLAY
   * ---------------------------------------------------------
   */
  video.addEventListener(
    'play',
    () => {
      video.pause();
    }
  );

  /*
   * ---------------------------------------------------------
   * RESIZE
   * ---------------------------------------------------------
   */
  window.addEventListener(
    'resize',
    updateVideo
  );

  /*
   * ---------------------------------------------------------
   * SCROLL
   * ---------------------------------------------------------
   */
  window.addEventListener(
    'scroll',
    handleScroll,
    {
      passive: true
    }
  );

  /*
   * ---------------------------------------------------------
   * REVEALS
   * ---------------------------------------------------------
   */
  const observer =
    new IntersectionObserver(
      (entries) => {

        entries.forEach((entry) => {

          if (entry.isIntersecting) {

            entry.target.classList.add(
              'visible'
            );

            observer.unobserve(
              entry.target
            );
          }
        });
      },
      {
        threshold: 0.1,
        rootMargin:
          '0px 0px -40px 0px'
      }
    );

  document
    .querySelectorAll('.reveal')
    .forEach((element) => {
      observer.observe(element);
    });

  /*
   * ---------------------------------------------------------
   * MENU MOBILE
   * ---------------------------------------------------------
   */
  const toggle =
    document.querySelector('.menu-toggle');

  const menu =
    document.querySelector('.menu');

  if (toggle && menu) {

    toggle.addEventListener(
      'click',
      () => {

        const isOpen =
          menu.classList.toggle('open');

        toggle.setAttribute(
          'aria-expanded',
          String(isOpen)
        );
      }
    );

    menu
      .querySelectorAll('a')
      .forEach((link) => {

        link.addEventListener(
          'click',
          () => {

            menu.classList.remove(
              'open'
            );

            toggle.setAttribute(
              'aria-expanded',
              'false'
            );
          }
        );
      });

    document.addEventListener(
      'click',
      (event) => {

        if (
          menu.classList.contains('open') &&
          !menu.contains(event.target) &&
          !toggle.contains(event.target)
        ) {

          menu.classList.remove(
            'open'
          );

          toggle.setAttribute(
            'aria-expanded',
            'false'
          );
        }
      }
    );
  }

  /*
   * ---------------------------------------------------------
   * LOADER
   * ---------------------------------------------------------
   */
  function removeLoader() {
    document.body.classList.add(
      'ready'
    );
  }

  if (
    document.readyState === 'complete'
  ) {

    removeLoader();

  } else {

    window.addEventListener(
      'load',
      removeLoader,
      {
        once: true
      }
    );

    setTimeout(
      removeLoader,
      1500
    );
  }

  /*
   * ---------------------------------------------------------
   * START
   * ---------------------------------------------------------
   */
  initVideo();

})();