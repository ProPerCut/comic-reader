/* =========================================================
   COMIC READER - COMPLETE JAVASCRIPT
   CBZ / CBR / ZIP / RAR / PDF / IMAGE / FOLDER
   AUTO SCROLL / ZOOM / FIT / FULLSCREEN / DRAG & DROP
========================================================= */

document.addEventListener("DOMContentLoaded", () => {

    /* =====================================================
       ELEMENTS
    ===================================================== */

    const fileInput = document.getElementById("file-input");
    const folderInput = document.getElementById("folder-input");

    const pagesList = document.getElementById("pages-list");
    const placeholder = document.getElementById("placeholder");

    const statusText = document.getElementById("status-text");
    const pageCount = document.getElementById("page-count");

    const scrollToggle = document.getElementById("scroll-toggle");
    const speedRange = document.getElementById("speed-range");
    const speedVal = document.getElementById("speed-val");

    const zoomOut = document.getElementById("zoom-out");
    const zoomIn = document.getElementById("zoom-in");
    const zoomVal = document.getElementById("zoom-val");

    const fitWidth = document.getElementById("fit-width");
    const fullscreenBtn = document.getElementById("fullscreen-btn");

    const mobileScroll = document.getElementById("mobile-scroll");
    const mobileSpeed = document.getElementById("mobile-speed");
    const mobileZoomOut = document.getElementById("mobile-zoom-out");
    const mobileZoomIn = document.getElementById("mobile-zoom-in");

    const readerContainer = document.getElementById("reader-container");

    /* =====================================================
       VARIABLES
    ===================================================== */

    let currentObjectURLs = [];

    let isScrolling = false;
    let animationFrame = null;
    let lastScrollTime = null;

    let currentSpeed = 10;

    let zoomLevel = 100;
    const MIN_ZOOM = 25;
    const MAX_ZOOM = 300;
    const ZOOM_STEP = 10;

    let currentPage = 0;
    let totalPages = 0;

    let currentArchive = null;

    /* =====================================================
       SPEED SETTINGS
       Very slow = 1 px/s
       Very fast = 1000 px/s
    ===================================================== */

    function setupSpeedControls() {

        const controls = [speedRange, mobileSpeed];

        controls.forEach(control => {

            if (!control) return;

            control.min = "1";
            control.max = "1000";
            control.step = "1";

            /*
              Existing HTML has value=150.
              We change the starting speed to 10 px/s.
              User can choose 1, 2, 3... etc.
            */

            control.value = "10";
        });

        currentSpeed = 10;

        updateSpeedDisplay();
    }

    function updateSpeedDisplay() {

        if (speedRange) {
            speedRange.value = currentSpeed;
        }

        if (mobileSpeed) {
            mobileSpeed.value = currentSpeed;
        }

        if (speedVal) {
            speedVal.textContent = currentSpeed;
        }
    }

    function setSpeed(value) {

        let speed = Number(value);

        if (!Number.isFinite(speed)) {
            speed = 10;
        }

        speed = Math.round(speed);

        if (speed < 1) speed = 1;
        if (speed > 1000) speed = 1000;

        currentSpeed = speed;

        updateSpeedDisplay();
    }

    /* =====================================================
       INITIALIZE SPEED
    ===================================================== */

    setupSpeedControls();


    /* =====================================================
       FILE INPUT
    ===================================================== */

    if (fileInput) {

        fileInput.addEventListener("change", async (event) => {

            const files = Array.from(event.target.files || []);

            if (files.length) {
                await processFiles(files);
            }

            /*
              Reset input so the same file can be selected again.
            */

            event.target.value = "";
        });
    }


    /* =====================================================
       FOLDER INPUT
    ===================================================== */

    if (folderInput) {

        folderInput.addEventListener("change", async (event) => {

            const files = Array.from(event.target.files || []);

            if (files.length) {
                await processFolder(files);
            }

            event.target.value = "";
        });
    }


    /* =====================================================
       DRAG & DROP
    ===================================================== */

    document.addEventListener("dragover", (event) => {

        event.preventDefault();

        if (event.dataTransfer) {
            event.dataTransfer.dropEffect = "copy";
        }

    });

    document.addEventListener("drop", async (event) => {

        event.preventDefault();

        const files = Array.from(event.dataTransfer?.files || []);

        if (!files.length) return;

        await processFiles(files);

    });


    /* =====================================================
       MAIN FILE PROCESSOR
    ===================================================== */

    async function processFiles(files) {

        if (!files || !files.length) return;

        stopAutoScroll();

        clearReader();

        showLoading("ফাইল লোড হচ্ছে... একটু অপেক্ষা করুন ⏳");

        try {

            /*
              If multiple files are selected and they are images,
              treat them as a comic page sequence.
            */

            const imageFiles = files.filter(isImageFile);

            if (
                files.length > 1 &&
                imageFiles.length === files.length
            ) {

                await processImageFiles(imageFiles);

                return;
            }


            const file = files[0];

            const name = file.name.toLowerCase();


            /* =================================================
               PDF
            ================================================= */

            if (name.endsWith(".pdf")) {

                await processPDF(file);

                return;
            }


            /* =================================================
               CBZ / CBR / ZIP / RAR
            ================================================= */

            if (
                name.endsWith(".cbz") ||
                name.endsWith(".cbr") ||
                name.endsWith(".zip") ||
                name.endsWith(".rar")
            ) {

                await processArchive(file);

                return;
            }


            /* =================================================
               SINGLE IMAGE
            ================================================= */

            if (isImageFile(file)) {

                await processImageFiles([file]);

                return;
            }


            throw new Error(
                "এই ফাইলটি supported format নয়।"
            );

        } catch (error) {

            console.error("Comic Reader Error:", error);

            showError(
                "ফাইল লোড করা যায়নি",
                getFriendlyError(error)
            );

        }

    }


    /* =====================================================
       FOLDER PROCESSOR
    ===================================================== */

    async function processFolder(files) {

        if (!files || !files.length) return;

        stopAutoScroll();

        clearReader();

        showLoading("Folder থেকে pages খোঁজা হচ্ছে... 📂");

        try {

            const images = files.filter(isImageFile);

            if (!images.length) {

                throw new Error(
                    "Folder-এর ভিতরে কোনো supported image পাওয়া যায়নি।"
                );
            }

            await processImageFiles(images);

        } catch (error) {

            console.error(error);

            showError(
                "Folder লোড করা যায়নি",
                getFriendlyError(error)
            );
        }

    }


    /* =====================================================
       IMAGE FILE CHECK
    ===================================================== */

    function isImageFile(file) {

        if (!file) return false;

        const name = file.name.toLowerCase();

        return (
            file.type.startsWith("image/") ||
            /\.(jpg|jpeg|png|webp|gif|bmp)$/i.test(name)
        );
    }


    /* =====================================================
       PROCESS NORMAL IMAGE FILES
    ===================================================== */

    async function processImageFiles(files) {

        if (!files.length) return;

        const images = files.map(file => {

            return {
                name: file.webkitRelativePath || file.name,
                file: file
            };

        });

        images.sort((a, b) => {

            return naturalSort(
                a.name,
                b.name
            );

        });

        renderImages(images);

        updateStatus(
            `${images.length} pages loaded`,
            `${images.length} pages`
        );

    }


    /* =====================================================
       ARCHIVE PROCESSOR
       CBZ / CBR / ZIP / RAR
    ===================================================== */

    async function processArchive(file) {

        if (typeof Unarchiver === "undefined") {

            throw new Error(
                "Unarchiver library load হয়নি। Internet connection check করুন।"
            );
        }

        showLoading(
            "Comic archive খুলছে... ⏳"
        );

        /*
          Unarchiver-এর official browser API:
          Unarchiver.open(file)
        */

        const archive = await Unarchiver.open(file);

        currentArchive = archive;

        if (
            !archive ||
            !archive.entries ||
            !archive.entries.length
        ) {

            throw new Error(
                "Archive-এর ভিতরে কোনো file পাওয়া যায়নি।"
            );
        }

        /*
          শুধুমাত্র image entries নেওয়া হবে।
        */

        const imageEntries = archive.entries.filter(entry => {

            if (!entry || !entry.is_file) {
                return false;
            }

            return /\.(jpg|jpeg|png|webp|gif|bmp)$/i.test(
                entry.name
            );

        });


        if (!imageEntries.length) {

            throw new Error(
                "Comic archive-এর ভিতরে কোনো image page পাওয়া যায়নি।"
            );
        }


        /*
          Page number অনুযায়ী natural sorting.
        */

        imageEntries.sort((a, b) => {

            return naturalSort(
                a.name,
                b.name
            );

        });


        /*
          Archive entry থেকে image তৈরি।
        */

        const images = [];

        for (let i = 0; i < imageEntries.length; i++) {

            const entry = imageEntries[i];

            try {

                showLoading(
                    `Comic page প্রস্তুত হচ্ছে... ${i + 1} / ${imageEntries.length}`
                );

                const entryFile = await entry.read();

                if (!entryFile) continue;

                const url = URL.createObjectURL(entryFile);

                currentObjectURLs.push(url);

                images.push({
                    name: entry.name,
                    url: url
                });

            } catch (entryError) {

                console.warn(
                    "Page skipped:",
                    entry.name,
                    entryError
                );

            }

        }


        if (!images.length) {

            throw new Error(
                "Archive থেকে কোনো image page read করা যায়নি।"
            );
        }


        renderImages(images);


        updateStatus(
            `${file.name}`,
            `${images.length} pages`
        );


        /*
          Archive close করে memory release করার চেষ্টা।
        */

        try {

            if (
                typeof Unarchiver.close === "function"
            ) {

                Unarchiver.close(archive);

            }

        } catch (closeError) {

            console.warn(
                "Archive close warning:",
                closeError
            );
        }

    }


    /* =====================================================
       PDF PROCESSOR
    ===================================================== */

    async function processPDF(file) {

        if (
            typeof pdfjsLib === "undefined"
        ) {

            throw new Error(
                "PDF.js library load হয়নি।"
            );
        }


        /*
          PDF.js worker
        */

        pdfjsLib.GlobalWorkerOptions.workerSrc =
            "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";


        showLoading(
            "PDF খোলা হচ্ছে... ⏳"
        );


        const arrayBuffer = await file.arrayBuffer();


        const pdf = await pdfjsLib.getDocument({
            data: arrayBuffer
        }).promise;


        const images = [];


        for (
            let pageNumber = 1;
            pageNumber <= pdf.numPages;
            pageNumber++
        ) {

            showLoading(
                `PDF page তৈরি হচ্ছে... ${pageNumber} / ${pdf.numPages}`
            );


            const page = await pdf.getPage(
                pageNumber
            );


            /*
              High quality rendering.
            */

            const viewport = page.getViewport({
                scale: 1.5
            });


            const canvas =
                document.createElement("canvas");


            const context =
                canvas.getContext("2d", {
                    alpha: false
                });


            canvas.width =
                Math.floor(viewport.width);

            canvas.height =
                Math.floor(viewport.height);


            await page.render({
                canvasContext: context,
                viewport: viewport
            }).promise;


            const blob =
                await new Promise(resolve => {

                    canvas.toBlob(
                        resolve,
                        "image/jpeg",
                        0.92
                    );

                });


            if (!blob) continue;


            const url =
                URL.createObjectURL(blob);


            currentObjectURLs.push(url);


            images.push({
                name: `Page ${String(pageNumber).padStart(4, "0")}`,
                url: url
            });


            /*
              Canvas memory release.
            */

            canvas.width = 1;
            canvas.height = 1;
        }


        if (!images.length) {

            throw new Error(
                "PDF থেকে কোনো page তৈরি করা যায়নি।"
            );
        }


        renderImages(images);


        updateStatus(
            file.name,
            `${images.length} pages`
        );

    }


    /* =====================================================
       RENDER IMAGES
    ===================================================== */

    function renderImages(images) {

        if (!images || !images.length) {

            throw new Error(
                "কোনো page পাওয়া যায়নি।"
            );
        }


        placeholder.style.display =
            "none";


        pagesList.innerHTML = "";


        /*
          Reset page counter
        */

        currentPage = 0;

        totalPages = images.length;


        updatePageCounter();


        /*
          Create all pages.
        */

        images.forEach((imageData, index) => {

            const wrapper =
                document.createElement("div");


            wrapper.className =
                "comic-page";


            wrapper.dataset.page =
                String(index + 1);


            wrapper.style.width =
                "100%";


            wrapper.style.display =
                "flex";


            wrapper.style.justifyContent =
                "center";


            wrapper.style.position =
                "relative";


            const img =
                document.createElement("img");


            img.className =
                "comic-image";


            img.alt =
                `Page ${index + 1}`;


            img.loading =
                index < 3
                    ? "eager"
                    : "lazy";


            img.decoding =
                "async";


            if (imageData.url) {

                img.src =
                    imageData.url;

            } else if (imageData.file) {

                const url =
                    URL.createObjectURL(
                        imageData.file
                    );

                currentObjectURLs.push(url);

                img.src = url;
            }


            img.style.maxWidth =
                "100%";


            img.style.height =
                "auto";


            img.style.display =
                "block";


            img.style.userSelect =
                "none";


            img.draggable =
                false;


            wrapper.appendChild(img);

            pagesList.appendChild(wrapper);

        });


        /*
          Apply current zoom.
        */

        applyZoom();


        /*
          Update page number while reading.
        */

        setupPageObserver();

    }


    /* =====================================================
       PAGE OBSERVER
    ===================================================== */

    let pageObserver = null;


    function setupPageObserver() {

        if (pageObserver) {

            pageObserver.disconnect();
        }


        const pages =
            document.querySelectorAll(
                ".comic-page"
            );


        if (!pages.length) return;


        pageObserver =
            new IntersectionObserver(
                entries => {

                    let bestEntry = null;

                    for (const entry of entries) {

                        if (!entry.isIntersecting) {
                            continue;
                        }

                        if (
                            !bestEntry ||
                            entry.intersectionRatio >
                            bestEntry.intersectionRatio
                        ) {

                            bestEntry = entry;
                        }
                    }


                    if (bestEntry) {

                        const page =
                            Number(
                                bestEntry.target.dataset.page
                            );

                        if (page) {

                            currentPage =
                                page;

                            updatePageCounter();

                        }
                    }

                },
                {
                    root: null,
                    threshold: [
                        0.1,
                        0.25,
                        0.5,
                        0.75
                    ]
                }
            );


        pages.forEach(page => {

            pageObserver.observe(page);

        });

    }


    /* =====================================================
       PAGE COUNTER
    ===================================================== */

    function updatePageCounter() {

        if (!pageCount) return;


        if (!totalPages) {

            pageCount.textContent =
                "0 pages";

            return;
        }


        pageCount.textContent =
            `${currentPage || 1} / ${totalPages} pages`;
    }


    /* =====================================================
       STATUS
    ===================================================== */

    function updateStatus(
        text,
        count
    ) {

        if (statusText) {

            statusText.textContent =
                text;
        }


        if (pageCount) {

            pageCount.textContent =
                count;
        }

    }


    /* =====================================================
       LOADING SCREEN
    ===================================================== */

    function showLoading(message) {

        placeholder.style.display =
            "flex";

        placeholder.style.flexDirection =
            "column";

        placeholder.style.alignItems =
            "center";

        placeholder.style.justifyContent =
            "center";


        placeholder.innerHTML = `

            <div class="welcome-icon">
                ⏳
            </div>

            <h1>
                ${escapeHTML(message)}
            </h1>

            <p>
                একটু অপেক্ষা করুন...
            </p>

        `;


        if (statusText) {

            statusText.textContent =
                message;
        }


        if (pageCount) {

            pageCount.textContent =
                "Loading...";
        }

    }


    /* =====================================================
       ERROR SCREEN
    ===================================================== */

    function showError(
        title,
        message
    ) {

        placeholder.style.display =
            "flex";

        placeholder.style.flexDirection =
            "column";

        placeholder.style.alignItems =
            "center";

        placeholder.style.justifyContent =
            "center";


        placeholder.innerHTML = `

            <div
                class="welcome-icon"
                style="font-size:70px;"
            >
                ❌
            </div>

            <h1>
                ${escapeHTML(title)}
            </h1>

            <p>
                ${escapeHTML(message)}
            </p>

            <p class="small-help">
                Fileটি valid CBZ/CBR/ZIP/RAR/PDF/Image কিনা
                নিশ্চিত করুন।
            </p>

        `;


        if (statusText) {

            statusText.textContent =
                "ফাইল লোড করতে সমস্যা হয়েছে";
        }


        if (pageCount) {

            pageCount.textContent =
                "0 pages";
        }

    }


    /* =====================================================
       FRIENDLY ERROR
    ===================================================== */

    function getFriendlyError(error) {

        if (!error) {

            return "Unknown error";
        }


        const message =
            String(
                error.message ||
                error
            );


        if (
            /password|encrypted/i.test(
                message
            )
        ) {

            return "এই archive password-protected বা encrypted।";
        }


        if (
            /memory|out of memory/i.test(
                message
            )
        ) {

            return "ফাইলটি অনেক বড়। Browser memory শেষ হয়ে যেতে পারে।";
        }


        if (
            /rar|archive/i.test(
                message
            )
        ) {

            return "Archive formatটি browser-এ পড়তে সমস্যা হয়েছে।";
        }


        return message;
    }


    /* =====================================================
       CLEAR READER
    ===================================================== */

    function clearReader() {

        stopAutoScroll();


        /*
          Old object URLs remove
        */

        currentObjectURLs.forEach(url => {

            try {

                URL.revokeObjectURL(url);

            } catch (error) {}

        });


        currentObjectURLs = [];


        /*
          Close old archive
        */

        if (currentArchive) {

            try {

                if (
                    typeof Unarchiver !== "undefined" &&
                    typeof Unarchiver.close === "function"
                ) {

                    Unarchiver.close(
                        currentArchive
                    );
                }

            } catch (error) {}

            currentArchive = null;
        }


        pagesList.innerHTML = "";


        currentPage = 0;

        totalPages = 0;


        if (pageObserver) {

            pageObserver.disconnect();

            pageObserver = null;
        }


        updatePageCounter();

    }


    /* =====================================================
       AUTO SCROLL
       Accurate PX PER SECOND
    ===================================================== */

    if (scrollToggle) {

        scrollToggle.addEventListener(
            "click",
            () => {

                if (isScrolling) {

                    stopAutoScroll();

                } else {

                    startAutoScroll();

                }

            }
        );

    }


    function startAutoScroll() {

        stopAutoScroll();


        isScrolling = true;

        lastScrollTime =
            performance.now();


        if (scrollToggle) {

            scrollToggle.textContent =
                "⏸ Stop Auto Scroll";

            scrollToggle.classList.add(
                "active"
            );
        }


        if (mobileScroll) {

            mobileScroll.textContent =
                "⏸";

        }


        animationFrame =
            requestAnimationFrame(
                autoScrollLoop
            );

    }


    function autoScrollLoop(timestamp) {

        if (!isScrolling) return;


        if (lastScrollTime === null) {

            lastScrollTime =
                timestamp;
        }


        const delta =
            (timestamp - lastScrollTime) /
            1000;


        lastScrollTime =
            timestamp;


        /*
          Exact px/s movement.

          Example:
          1 px/s  = extremely slow
          10 px/s = very slow
          50 px/s = slow
          100 px/s = normal
          500 px/s = fast
          1000 px/s = very fast
        */

        const movement =
            currentSpeed * delta;


        window.scrollBy(
            0,
            movement
        );


        /*
          Automatically stop at bottom.
        */

        const bottomReached =
            window.innerHeight +
            window.scrollY >=
            document.documentElement.scrollHeight - 2;


        if (bottomReached) {

            stopAutoScroll();

            return;
        }


        animationFrame =
            requestAnimationFrame(
                autoScrollLoop
            );

    }


    function stopAutoScroll() {

        isScrolling = false;

        lastScrollTime = null;


        if (animationFrame !== null) {

            cancelAnimationFrame(
                animationFrame
            );

            animationFrame = null;
        }


        if (scrollToggle) {

            scrollToggle.textContent =
                "▶ Auto Scroll";

            scrollToggle.classList.remove(
                "active"
            );
        }


        if (mobileScroll) {

            mobileScroll.textContent =
                "▶";

        }

    }


    /* =====================================================
       SPEED CONTROL
    ===================================================== */

    if (speedRange) {

        speedRange.addEventListener(
            "input",
            event => {

                setSpeed(
                    event.target.value
                );

            }
        );

    }


    if (mobileSpeed) {

        mobileSpeed.addEventListener(
            "input",
            event => {

                setSpeed(
                    event.target.value
                );

            }
        );

    }


    /* =====================================================
       MOBILE AUTO SCROLL
    ===================================================== */

    if (mobileScroll) {

        mobileScroll.addEventListener(
            "click",
            () => {

                if (isScrolling) {

                    stopAutoScroll();

                } else {

                    startAutoScroll();

                }

            }
        );

    }


    /* =====================================================
       ZOOM
    ===================================================== */

    if (zoomIn) {

        zoomIn.addEventListener(
            "click",
            () => {

                changeZoom(
                    ZOOM_STEP
                );

            }
        );

    }


    if (zoomOut) {

        zoomOut.addEventListener(
            "click",
            () => {

                changeZoom(
                    -ZOOM_STEP
                );

            }
        );

    }


    if (mobileZoomIn) {

        mobileZoomIn.addEventListener(
            "click",
            () => {

                changeZoom(
                    ZOOM_STEP
                );

            }
        );

    }


    if (mobileZoomOut) {

        mobileZoomOut.addEventListener(
            "click",
            () => {

                changeZoom(
                    -ZOOM_STEP
                );

            }
        );

    }


    function changeZoom(amount) {

        zoomLevel += amount;


        if (zoomLevel < MIN_ZOOM) {

            zoomLevel =
                MIN_ZOOM;
        }


        if (zoomLevel > MAX_ZOOM) {

            zoomLevel =
                MAX_ZOOM;
        }


        applyZoom();

    }


    function applyZoom() {

        const images =
            document.querySelectorAll(
                ".comic-image"
            );


        images.forEach(img => {

            img.style.width =
                `${zoomLevel}%`;

            img.style.maxWidth =
                "none";

        });


        if (zoomVal) {

            zoomVal.textContent =
                `${zoomLevel}%`;
        }

    }


    /* =====================================================
       FIT WIDTH
    ===================================================== */

    if (fitWidth) {

        fitWidth.addEventListener(
            "click",
            () => {

                zoomLevel =
                    100;

                const images =
                    document.querySelectorAll(
                        ".comic-image"
                    );


                images.forEach(img => {

                    img.style.width =
                        "100%";

                    img.style.maxWidth =
                        "100%";

                });


                if (zoomVal) {

                    zoomVal.textContent =
                        "100%";
                }

            }
        );

    }


    /* =====================================================
       FULLSCREEN
    ===================================================== */

    if (fullscreenBtn) {

        fullscreenBtn.addEventListener(
            "click",
            async () => {

                try {

                    if (
                        !document.fullscreenElement
                    ) {

                        await document.documentElement.requestFullscreen();

                    } else {

                        await document.exitFullscreen();

                    }

                } catch (error) {

                    console.warn(
                        "Fullscreen error:",
                        error
                    );

                }

            }
        );

    }


    /* =====================================================
       FULLSCREEN BUTTON ICON
    ===================================================== */

    document.addEventListener(
        "fullscreenchange",
        () => {

            if (!fullscreenBtn) return;


            if (
                document.fullscreenElement
            ) {

                fullscreenBtn.textContent =
                    "⛶";

            } else {

                fullscreenBtn.textContent =
                    "⛶";

            }

        }
    );


    /* =====================================================
       KEYBOARD SHORTCUTS
    ===================================================== */

    document.addEventListener(
        "keydown",
        event => {

            /*
              Do not interfere while typing.
            */

            const tag =
                document.activeElement?.tagName;


            if (
                tag === "INPUT" ||
                tag === "TEXTAREA"
            ) {

                return;
            }


            /*
              Space = Auto Scroll
            */

            if (
                event.code === "Space"
            ) {

                event.preventDefault();


                if (isScrolling) {

                    stopAutoScroll();

                } else {

                    startAutoScroll();

                }

            }


            /*
              + = Zoom in
            */

            if (
                event.key === "+" ||
                event.key === "="
            ) {

                changeZoom(
                    ZOOM_STEP
                );

            }


            /*
              - = Zoom out
            */

            if (
                event.key === "-" ||
                event.key === "_"
            ) {

                changeZoom(
                    -ZOOM_STEP
                );

            }


            /*
              F = Fullscreen
            */

            if (
                event.key.toLowerCase() === "f"
            ) {

                if (fullscreenBtn) {

                    fullscreenBtn.click();

                }

            }

        }
    );


    /* =====================================================
       NATURAL SORT
       Page 1
       Page 2
       Page 10
       Page 11
    ===================================================== */

    function naturalSort(a, b) {

        return String(a).localeCompare(
            String(b),
            undefined,
            {
                numeric: true,
                sensitivity: "base"
            }
        );

    }


    /* =====================================================
       HTML ESCAPE
    ===================================================== */

    function escapeHTML(text) {

        return String(text)
            .replace(
                /&/g,
                "&amp;"
            )
            .replace(
                /</g,
                "&lt;"
            )
            .replace(
                />/g,
                "&gt;"
            )
            .replace(
                /"/g,
                "&quot;"
            )
            .replace(
                /'/g,
                "&#039;"
            );

    }


    /* =====================================================
       INITIAL STATUS
    ===================================================== */

    if (statusText) {

        statusText.textContent =
            "কোনো Comic খোলা হয়নি";

    }


    if (pageCount) {

        pageCount.textContent =
            "0 pages";

    }


    console.log(
        "📖 Comic Reader loaded successfully."
    );

});
