(() => {
  'use strict';

  const canvas = document.querySelector('#hero-canvas');
  const film = document.querySelector('.film');
  const words = [...document.querySelectorAll('.hero-word')];
  const scrollCue = document.querySelector('.scroll-cue');

  const reducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches;

  // ============================================================
  // HERO / CANVAS
  // ============================================================

  if (canvas && film) {
    const ctx = canvas.getContext('2d', {
      alpha: false,
      desynchronized: true
    });

    const TOTAL_FRAMES = 160;
    const FRAME_PATH = 'frames/frame-';
    const MAX_DPR = 2;
    const PRELOAD_CONCURRENCY = 8;

    const frames = new Array(TOTAL_FRAMES);

    let currentFrame = -1;
    let requestedFrame = 0;
    let ticking = false;

    let canvasWidth = 0;
    let canvasHeight = 0;

    let firstFrameReady = false;

    // ==========================================================
    // URL DOS FRAMES
    // ==========================================================

    function frameUrl(index) {
      const number = String(index + 1).padStart(4, '0');

      return `${FRAME_PATH}${number}.webp`;
    }

    // ==========================================================
    // DESENHAR FRAME
    // ==========================================================

    function drawFrame(index) {
      const image = frames[index];

      if (
        !image ||
        !image.complete ||
        image.naturalWidth === 0 ||
        canvasWidth === 0 ||
        canvasHeight === 0
      ) {
        return false;
      }

      /*
       * Mantém o comportamento equivalente a:
       *
       * object-fit: cover;
       */

      const scale = Math.max(
        canvasWidth / image.naturalWidth,
        canvasHeight / image.naturalHeight
      );

      const drawWidth =
        image.naturalWidth * scale;

      const drawHeight =
        image.naturalHeight * scale;

      const x =
        (canvasWidth - drawWidth) / 2;

      const y =
        (canvasHeight - drawHeight) / 2;

      ctx.clearRect(
        0,
        0,
        canvasWidth,
        canvasHeight
      );

      ctx.drawImage(
        image,
        x,
        y,
        drawWidth,
        drawHeight
      );

      currentFrame = index;

      return true;
    }

    // ==========================================================
    // ENCONTRAR FRAME DISPONÍVEL MAIS PRÓXIMO
    // ==========================================================

    function drawNearestAvailable(index) {

      if (drawFrame(index)) {
        return;
      }

      /*
       * Caso o usuário role muito rápido e o frame solicitado
       * ainda não tenha terminado de carregar, usamos o frame
       * disponível mais próximo.
       */

      for (
        let distance = 1;
        distance < TOTAL_FRAMES;
        distance++
      ) {

        const previous =
          index - distance;

        const next =
          index + distance;

        if (
          previous >= 0 &&
          drawFrame(previous)
        ) {
          return;
        }

        if (
          next < TOTAL_FRAMES &&
          drawFrame(next)
        ) {
          return;
        }
      }
    }

    // ==========================================================
    // RESIZE DO CANVAS
    // ==========================================================

    function resizeCanvas() {

      const rect =
        canvas.getBoundingClientRect();

      const dpr =
        Math.min(
          window.devicePixelRatio || 1,
          MAX_DPR
        );

      canvasWidth = rect.width;
      canvasHeight = rect.height;

      canvas.width =
        Math.max(
          1,
          Math.round(canvasWidth * dpr)
        );

      canvas.height =
        Math.max(
          1,
          Math.round(canvasHeight * dpr)
        );

      /*
       * Trabalhamos em pixels CSS,
       * mas o Canvas utiliza DPR para melhorar
       * a nitidez em telas de alta resolução.
       */

      ctx.setTransform(
        dpr,
        0,
        0,
        dpr,
        0,
        0
      );

      if (currentFrame >= 0) {
        drawNearestAvailable(currentFrame);
      }
    }

    // ==========================================================
    // PROGRESSO DO SCROLL
    // ==========================================================

    function getProgress() {

      const rect =
        film.getBoundingClientRect();

      const distance =
        film.offsetHeight -
        window.innerHeight;

      if (distance <= 0) {
        return 0;
      }

      return Math.max(
        0,
        Math.min(
          1,
          -rect.top / distance
        )
      );
    }

    // ==========================================================
    // ATUALIZAR HERO
    // ==========================================================

    function updateHero() {

      const progress =
        getProgress();

      /*
       * Converte:
       *
       * 0% scroll  -> frame 1
       * 50% scroll -> frame 80
       * 100%      -> frame 160
       */

      requestedFrame =
        Math.min(
          TOTAL_FRAMES - 1,
          Math.max(
            0,
            Math.floor(
              progress *
              (TOTAL_FRAMES - 1)
            )
          )
        );

      if (
        requestedFrame !== currentFrame
      ) {
        drawNearestAvailable(
          requestedFrame
        );
      }

      // ========================================================
      // SCROLL CUE
      // ========================================================

      if (scrollCue) {

        const opacity =
          Math.max(
            0,
            Math.min(
              1,
              1 - progress * 4
            )
          );

        scrollCue.style.opacity =
          opacity;

        scrollCue.style.pointerEvents =
          opacity < 0.05
            ? 'none'
            : 'auto';
      }

      // ========================================================
      // TEXTO DO HERO
      // ========================================================

      words.forEach(
        (word, index) => {

          const start =
            0.06 +
            index * 0.22;

          const end =
            start +
            0.28;

          const reveal =
            Math.max(
              0,
              Math.min(
                1,
                (progress - start) /
                (end - start)
              )
            );

          word.style.setProperty(
            '--reveal',
            reveal
          );
        }
      );
    }

    // ==========================================================
    // SCROLL
    // ==========================================================

    function onScroll() {

      if (ticking) {
        return;
      }

      ticking = true;

      requestAnimationFrame(() => {

        updateHero();

        ticking = false;
      });
    }

    // ==========================================================
    // CARREGAMENTO DE FRAME
    // ==========================================================

    function loadFrame(index) {

      return new Promise((resolve) => {

        if (frames[index]) {
          resolve(true);
          return;
        }

        const image =
          new Image();

        image.decoding =
          'async';

        image.onload =
          async () => {

            try {

              if (
                typeof image.decode ===
                'function'
              ) {
                await image.decode();
              }

            } catch (_) {

              /*
               * Mesmo que decode() falhe,
               * o navegador ainda pode desenhar
               * a imagem normalmente.
               */

            }

            frames[index] =
              image;

            // ==================================================
            // PRIMEIRO FRAME
            // ==================================================

            if (
              index === 0 &&
              !firstFrameReady
            ) {

              firstFrameReady =
                true;

              drawFrame(0);

              document.body.classList.add(
                'ready'
              );
            }

            // ==================================================
            // FRAME SOLICITADO
            // ==================================================

            if (
              requestedFrame === index
            ) {

              drawFrame(index);
            }

            resolve(true);
          };

        image.onerror =
          () => {

            console.error(
              `Erro ao carregar ${frameUrl(index)}`
            );

            resolve(false);
          };

        image.src =
          frameUrl(index);
      });
    }

    // ==========================================================
    // PRELOAD DOS FRAMES
    // ==========================================================

    async function preloadFrames() {

      /*
       * Primeiro carregamos o frame 1.
       *
       * Assim o Hero não precisa esperar os 160 frames
       * para começar a aparecer.
       */

      await loadFrame(0);

      let next = 1;

      while (
        next < TOTAL_FRAMES
      ) {

        const batch = [];

        /*
         * Carregamos somente alguns frames por vez.
         *
         * Isso evita disparar 160 downloads/decode
         * simultaneamente.
         */

        for (
          let i = 0;
          i < PRELOAD_CONCURRENCY &&
          next < TOTAL_FRAMES;
          i++,
          next++
        ) {

          batch.push(
            loadFrame(next)
          );
        }

        await Promise.all(
          batch
        );

        /*
         * Devolve o controle ao navegador antes
         * de continuar carregando.
         */

        await new Promise(
          requestAnimationFrame
        );
      }
    }

    // ==========================================================
    // EVENTOS
    // ==========================================================

    window.addEventListener(
      'scroll',
      onScroll,
      {
        passive: true
      }
    );

    window.addEventListener(
      'resize',
      () => {

        resizeCanvas();

        updateHero();

      },
      {
        passive: true
      }
    );

    // ==========================================================
    // INICIALIZAÇÃO
    // ==========================================================

    resizeCanvas();

    updateHero();

    preloadFrames();

    /*
     * Fallback do loader.
     *
     * Mesmo se algum frame apresentar erro,
     * o site não fica preso na tela de loading.
     */

    window.setTimeout(
      () => {

        document.body.classList.add(
          'ready'
        );

      },
      1500
    );

    // ==========================================================
    // REDUCED MOTION
    // ==========================================================

    if (reducedMotion) {

      drawFrame(0);
    }

  } else {

    /*
     * Se o Canvas não existir,
     * libera o site normalmente.
     */

    document.body.classList.add(
      'ready'
    );
  }

  // ============================================================
  // SCROLL REVEAL
  // ============================================================

  const revealElements =
    document.querySelectorAll(
      '.reveal'
    );

  if (
    'IntersectionObserver' in window
  ) {

    const observer =
      new IntersectionObserver(
        (entries) => {

          entries.forEach(
            (entry) => {

              if (
                !entry.isIntersecting
              ) {
                return;
              }

              entry.target.classList.add(
                'visible'
              );

              observer.unobserve(
                entry.target
              );
            }
          );
        },
        {
          threshold: 0.1,

          rootMargin:
            '0px 0px -40px 0px'
        }
      );

    revealElements.forEach(
      (element) => {

        observer.observe(
          element
        );
      }
    );

  } else {

    /*
     * Fallback para navegadores sem
     * IntersectionObserver.
     */

    revealElements.forEach(
      (element) => {

        element.classList.add(
          'visible'
        );
      }
    );
  }

  // ============================================================
  // MENU MOBILE
  // ============================================================

  const toggle =
    document.querySelector(
      '.menu-toggle'
    );

  const menu =
    document.querySelector(
      '.menu'
    );

  if (
    toggle &&
    menu
  ) {

    toggle.addEventListener(
      'click',
      () => {

        const isOpen =
          menu.classList.toggle(
            'open'
          );

        toggle.setAttribute(
          'aria-expanded',
          String(isOpen)
        );
      }
    );

    menu
      .querySelectorAll('a')
      .forEach(
        (link) => {

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
        }
      );

    document.addEventListener(
      'click',
      (event) => {

        if (
          menu.classList.contains(
            'open'
          ) &&
          !menu.contains(
            event.target
          ) &&
          !toggle.contains(
            event.target
          )
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

  // ============================================================
  // LOADER
  // ============================================================

  const removeLoader =
    () => {

      document.body.classList.add(
        'ready'
      );
    };

  if (
    document.readyState ===
    'complete'
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

    window.setTimeout(
      removeLoader,
      1500
    );
  }

})();