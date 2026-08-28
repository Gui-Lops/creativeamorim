(() => {
  const video = document.querySelector('#hero-video');
  const film = document.querySelector('.film');
  const words = [...document.querySelectorAll('.hero-word')];
  const scrollCue = document.querySelector('.scroll-cue');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, min, max) => Math.min(Math.max(v, min), max);

  if (!video || !film) return;

  video.muted = true;
  video.playsInline = true;
  video.preload = 'auto';

  let targetTime = 0;
  let isReady = false;
  let rafId = null;
  const SMOOTH_FACTOR = 0.18; // Easing factor for smooth scrubbing (0.1-0.3)
  const SEEK_THRESHOLD = 0.05; // Min time diff to trigger seek (seconds)

  // Calculate normalized scroll progress (0.0 to 1.0) through the film section
  function getProgress() {
    const filmTop = film.offsetTop;
    const filmHeight = film.offsetHeight;
    const windowHeight = window.innerHeight;
    const maxScroll = Math.max(filmHeight - windowHeight, 1);
    const scrollY = window.pageYOffset || document.documentElement.scrollTop;

    return clamp((scrollY - filmTop) / maxScroll, 0, 1);
  }

  // Update UI and calculate video target timestamp
  function updateUI() {
    const progress = getProgress();

    // 1. Scroll Cue Fade
    if (scrollCue) {
      const cueOpacity = clamp(1 - progress * 4, 0, 1);
      scrollCue.style.opacity = cueOpacity;
      scrollCue.style.pointerEvents = cueOpacity < 0.05 ? 'none' : 'auto';
    }

    // 2. Sequential Word Reveal: FAZEMOS -> MARCAS -> VIVER.
    words.forEach((word, index) => {
      const start = 0.06 + index * 0.22;
      const end = start + 0.28;
      const wordReveal = clamp((progress - start) / (end - start), 0, 1);
      word.style.setProperty('--reveal', wordReveal);
    });

    // 3. Map progress to video duration
    if (video.duration && !isNaN(video.duration)) {
      const maxVideoTime = Math.max(video.duration - 0.05, 0.1);
      targetTime = progress * maxVideoTime;
    }
  }

  // Smoothed render loop - eases the video's ACTUAL position toward the target.
  // Unlike a runaway local clock, this tracks video.currentTime so seeks always
  // start from where the video really is (both directions) and never race ahead.
  function renderLoop() {
    updateUI();

    if (!reduced && isReady && video.duration && !isNaN(video.duration)) {
      // Skip if a seek is already in flight so we never queue seeks on a stale frame
      if (!video.seeking) {
        const actual = video.currentTime;
        const eased = actual + (targetTime - actual) * SMOOTH_FACTOR;
        if (Math.abs(eased - actual) > SEEK_THRESHOLD) {
          try {
            video.currentTime = eased;
          } catch (e) {
            // ignore: retried on next frame
          }
        }
      }
    }

    rafId = requestAnimationFrame(renderLoop);
  }

  // Initialize and warm up video decoder
  function initVideo() {
    const onLoaded = () => {
      if (video.duration && !isNaN(video.duration)) {
        isReady = true;
        if (video.currentTime === 0) {
          video.currentTime = 0.001; // Render frame 0
        }
        updateUI();
      }
    };

    video.addEventListener('loadedmetadata', onLoaded);
    video.addEventListener('loadeddata', onLoaded);
    video.addEventListener('canplay', onLoaded);

    if (video.readyState >= 2) {
      onLoaded();
    }

    // Warm-up on first user interaction - load video frames without playing
    const warmUp = async () => {
      try {
        video.muted = true;
        // Load first frame without playing
        video.currentTime = 0.001;
        await new Promise(r => setTimeout(r, 50));
        video.currentTime = 0;
        isReady = true;
      } catch (e) {}
    };

    ['wheel', 'touchstart', 'pointerdown', 'scroll'].forEach((evt) => {
      window.addEventListener(evt, warmUp, { once: true, passive: true });
    });

    // Ensure video never plays automatically - only scrub via scroll
    video.addEventListener('play', () => {
      if (!video.seeking) {
        video.pause();
      }
    });
  }

  initVideo();
  rafId = requestAnimationFrame(renderLoop);

  // Throttled scroll/resize handler
  let ticking = false;
  function onScrollOrResize() {
    if (!ticking) {
      requestAnimationFrame(() => {
        updateUI();
        ticking = false;
      });
      ticking = true;
    }
  }

  window.addEventListener('scroll', onScrollOrResize, { passive: true });
  window.addEventListener('resize', onScrollOrResize);

  // Cleanup on page hide
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && rafId) {
      cancelAnimationFrame(rafId);
    } else if (!document.hidden && !rafId) {
      rafId = requestAnimationFrame(renderLoop);
    }
  });

  // Scroll Reveal Observer for other sections
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
  );

  document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));

  // Mobile Navigation Menu Toggle
  const toggle = document.querySelector('.menu-toggle');
  const menu = document.querySelector('.menu');

  if (toggle && menu) {
    toggle.addEventListener('click', () => {
      const isOpen = menu.classList.toggle('open');
      toggle.setAttribute('aria-expanded', isOpen);
    });

    menu.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        menu.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });

    document.addEventListener('click', (e) => {
      if (menu.classList.contains('open') && !menu.contains(e.target) && !toggle.contains(e.target)) {
        menu.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // Loader dismiss
  const removeLoader = () => {
    document.body.classList.add('ready');
  };

  if (document.readyState === 'complete') {
    removeLoader();
  } else {
    window.addEventListener('load', removeLoader);
    setTimeout(removeLoader, 1500);
  }
})();
