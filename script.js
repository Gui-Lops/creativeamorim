(() => {
    const canvas = document.querySelector('#hero-canvas');
    const film = document.querySelector('.film');

    const words = [
        ...document.querySelectorAll('.hero-word')
    ];

    const scrollCue =
        document.querySelector('.scroll-cue');

    if (!canvas || !film) {
        document.body.classList.add('ready');
        return;
    }

    const ctx = canvas.getContext('2d');

    const TOTAL_FRAMES = 160;
    const FRAME_PATH = 'frames/frame-';

    const frames = [];
    let currentFrame = -1;
    let loadedFrames = 0;
    let ticking = false;

    /*
     * =========================================================
     * CARREGAMENTO DOS FRAMES
     * =========================================================
     */

    function loadFrames() {

        for (let i = 1; i <= TOTAL_FRAMES; i++) {

            const image = new Image();

            const number =
                String(i).padStart(4, '0');

            image.src =
                `${FRAME_PATH}${number}.webp`;

            image.onload = () => {

                loadedFrames++;

                /*
                 * Primeiro frame disponível:
                 * desenha imediatamente.
                 */
                if (i === 1) {
                    drawFrame(0);
                }
            };

            image.onerror = () => {
                console.error(
                    `Erro ao carregar frame ${number}`
                );
            };

            frames.push(image);
        }
    }

    /*
     * =========================================================
     * CANVAS
     * =========================================================
     */

    function resizeCanvas() {

        const rect =
            canvas.getBoundingClientRect();

        const dpr =
            Math.min(window.devicePixelRatio || 1, 2);

        canvas.width =
            Math.round(rect.width * dpr);

        canvas.height =
            Math.round(rect.height * dpr);

        ctx.setTransform(
            dpr,
            0,
            0,
            dpr,
            0,
            0
        );

        /*
         * Redesenha o frame atual depois do resize.
         */
        if (currentFrame >= 0) {
            drawFrame(currentFrame);
        }
    }

    /*
     * =========================================================
     * DESENHAR FRAME
     * =========================================================
     */

    function drawFrame(index) {

        const image = frames[index];

        if (
            !image ||
            !image.complete ||
            image.naturalWidth === 0
        ) {
            return;
        }

        const width =
            canvas.clientWidth;

        const height =
            canvas.clientHeight;

        /*
         * Equivalente ao object-fit: cover.
         */
        const scale =
            Math.max(
                width / image.naturalWidth,
                height / image.naturalHeight
            );

        const drawWidth =
            image.naturalWidth * scale;

        const drawHeight =
            image.naturalHeight * scale;

        const x =
            (width - drawWidth) / 2;

        const y =
            (height - drawHeight) / 2;

        ctx.clearRect(
            0,
            0,
            width,
            height
        );

        ctx.drawImage(
            image,
            x,
            y,
            drawWidth,
            drawHeight
        );

        currentFrame = index;
    }

    /*
     * =========================================================
     * PROGRESSO DO SCROLL
     * =========================================================
     */

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

    /*
     * =========================================================
     * ATUALIZAÇÃO
     * =========================================================
     */

    function update() {

        const progress =
            getProgress();

        /*
         * Scroll → frame
         */
        const frameIndex =
            Math.min(
                TOTAL_FRAMES - 1,
                Math.floor(
                    progress *
                    (TOTAL_FRAMES - 1)
                )
            );

        if (
            frameIndex !== currentFrame
        ) {
            drawFrame(frameIndex);
        }

        /*
         * Scroll cue
         */
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
        }

        /*
         * Textos
         */
        words.forEach(
            (word, index) => {

                const start =
                    0.06 + index * 0.22;

                const end =
                    start + 0.28;

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

            update();

            ticking = false;
        });
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
        () => {

            resizeCanvas();
            update();

        }
    );

    /*
     * =========================================================
     * INICIALIZAÇÃO
     * =========================================================
     */

    resizeCanvas();

    loadFrames();

    update();

    /*
     * Loader independente dos frames.
     */
    document.body.classList.add('ready');

})();