(() => {
  const video = document.querySelector('#hero-video');
  const film = document.querySelector('.film');
  const words = [...document.querySelectorAll('.hero-word')];
  const scrollCue = document.querySelector('.scroll-cue');

  if (!video || !film) return;

  const clamp = (value, min, max) =>
    Math.min(Math.max(value, min), max);

  let videoReady = false;
  let isSeeking = false;
  let pendingTime = null;
  let ticking = false;
  let lastRequestedTime = -1;

  /*
   * =========================================================
   * PROGRESSO DO SCROLL
   * =========================================================
   */
  function getProgress() {
    const rect = film.getBoundingClientRect();

    const distance =
      film.offsetHeight - window.innerHeight;

    if (distance <= 0) {
      return 0;
    }

    return clamp(
      -rect.top / distance,
      0,
      1
    );
  }

  /*
   * =========================================================
   * UI
   * =========================================================
   */
  function updateUI(progress) {

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
   * =========================================================
   * SOLICITA UM SEEK
   * =========================================================
   */
  function requestSeek(time) {

    if (!videoReady) {
      return;
    }

    /*
     * Guarda SEMPRE o alvo mais recente.
     *
     * Não colocamos vários seeks numa fila.
     */
    pendingTime = time;

    /*
     * Se o navegador ainda está buscando,
     * esperamos o seeked.
     */
    if (isSeeking) {
      return;
    }

    processSeek();
  }

  /*
   * =========================================================
   * PROCESSA O ÚLTIMO SEEK
   * =========================================================
   */
  function processSeek() {

    if (!videoReady) {
      return;
    }

    if (isSeeking) {
      return;
    }

    if (pendingTime === null) {
      return;
    }

    const time = pendingTime;

    pendingTime = null;

    /*
     * Evita seeks praticamente iguais.
     */
    if (
      Math.abs(
        time - lastRequestedTime
      ) < 0.016
    ) {
      return;
    }

    lastRequestedTime = time;
    isSeeking = true;

    try {
      video.currentTime = time;
    } catch (error) {
      isSeeking = false;
      return;
    }
  }

  /*
   * =========================================================
   * QUANDO O SEEK TERMINAR
   * =========================================================
   */
  video.addEventListener(
    'seeked',
    () => {

      isSeeking = false;

      /*
       * Durante o seek o usuário provavelmente
       * continuou rolando.
       *
       * Então processamos SOMENTE o último alvo.
       */
      if (pendingTime !== null) {
        processSeek();
      }
    }
  );

  /*
   * =========================================================
   * ATUALIZA VÍDEO
   * =========================================================
   */
  function updateVideo() {

    const progress = getProgress();

    updateUI(progress);

    if (
      !videoReady ||
      !Number.isFinite(video.duration)
    ) {
      return;
    }

    const time =
      progress * video.duration;

    requestSeek(time);
  }

  /*
   * =========================================================
   * SCROLL
   * =========================================================
   */
  function onScroll() {

    if (ticking) {
      return;
    }

    ticking = true;

    requestAnimationFrame(() => {

      updateVideo();

      ticking = false;
    });
  }

  /*
   * =========================================================
   * RESIZE
   * =========================================================
   */
  function onResize() {
    updateVideo();
  }

  /*
   * =========================================================
   * INICIALIZA VÍDEO
   * =========================================================
   */
  function initVideo() {

    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';

    video.pause();

    function markReady() {

      if (
        Number.isFinite(video.duration) &&
        video.duration > 0
      ) {

        videoReady = true;

        try {
          video.currentTime = 0;
        } catch (e) {}

        updateVideo();
      }
    }

    video.addEventListener(
      'loadedmetadata',
      markReady
    );

    video.addEventListener(
      'loadeddata',
      markReady
    );

    video.addEventListener(
      'canplay',
      markReady
    );

    video.addEventListener(
      'canplaythrough',
      markReady
    );

    if (
      video.readyState >= 2 &&
      Number.isFinite(video.duration)
    ) {
      markReady();
    }
  }

  /*
   * =========================================================
   * EVENTOS
   * =========================================================
   */
  window.addEventListener(
    'scroll',
    onScroll,
    { passive: true }
  );

  window.addEventListener(
    'resize',
    onResize
  );

  /*
   * =========================================================
   * REVEAL
   * =========================================================
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
   * =========================================================
   * MENU MOBILE
   * =========================================================
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

          menu.classList.remove('open');

          toggle.setAttribute(
            'aria-expanded',
            'false'
          );
        }
      }
    );
  }

  /*
   * =========================================================
   * LOADER
   * =========================================================
   */
  const removeLoader = () => {
    document.body.classList.add('ready');
  };

  if (
    document.readyState === 'complete'
  ) {

    removeLoader();

  } else {

    window.addEventListener(
      'load',
      removeLoader,
      { once: true }
    );

    setTimeout(
      removeLoader,
      1500
    );
  }

  /*
   * =========================================================
   * START
   * =========================================================
   */
  initVideo();

})();