/* =========================================================
   COMIC READER
   Supports:
   - CBZ
   - CBR
   - ZIP
   - RAR
   - PDF
   - JPG
   - JPEG
   - PNG
   - WEBP
   - GIF
   - BMP
   - AVIF
   - Image folders

   Features:
   - Auto Scroll
   - Adjustable Scroll Speed
   - Zoom In / Out
   - Fit Width
   - Fullscreen
   - Fullscreen Auto-Hide Controls
   - Custom Fullscreen Scrollbar
   - Page Number while dragging scrollbar
   - Keyboard Shortcuts
========================================================= */


/* =========================================================
   ELEMENTS
========================================================= */

const fileInput =
  document.getElementById("file-input");

const folderInput =
  document.getElementById("folder-input");

const pagesList =
  document.getElementById("pages-list");

const placeholder =
  document.getElementById("placeholder");

const scrollToggle =
  document.getElementById("scroll-toggle");

const speedRange =
  document.getElementById("speed-range");

const speedVal =
  document.getElementById("speed-val");

const zoomIn =
  document.getElementById("zoom-in");

const zoomOut =
  document.getElementById("zoom-out");

const zoomVal =
  document.getElementById("zoom-val");

const fitWidth =
  document.getElementById("fit-width");

const fullscreenBtn =
  document.getElementById("fullscreen-btn");

const statusText =
  document.getElementById("status-text");

const pageCount =
  document.getElementById("page-count");

const mobileScroll =
  document.getElementById("mobile-scroll");

const mobileSpeed =
  document.getElementById("mobile-speed");

const mobileZoomIn =
  document.getElementById("mobile-zoom-in");

const mobileZoomOut =
  document.getElementById("mobile-zoom-out");


/* =========================================================
   VARIABLES
========================================================= */

let isScrolling = false;

let animationFrame = null;

let scrollSpeed = 150;

let zoomLevel = 1;

let fitWidthMode = true;

let currentObjectURLs = [];

let currentArchive = null;

let loadToken = 0;


/* =========================================================
   PDF.JS WORKER
========================================================= */

if (typeof pdfjsLib !== "undefined") {

  pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

}


/* =========================================================
   SUPPORTED IMAGE
========================================================= */

function isImageFile(name) {

  return /\.(jpg|jpeg|png|webp|gif|bmp|avif)$/i.test(name);

}


/* =========================================================
   FILE SORT
========================================================= */

function naturalSort(a, b) {

  return a.name.localeCompare(
    b.name,
    undefined,
    {
      numeric: true,
      sensitivity: "base"
    }
  );

}


/* =========================================================
   STATUS
========================================================= */

function setStatus(message) {

  if (statusText) {

    statusText.textContent =
      message;

  }

}


/* =========================================================
   LOADING SCREEN
========================================================= */

function showLoading(
  message = "Comic প্রসেস হচ্ছে..."
) {

  pagesList.innerHTML = "";

  placeholder.style.display =
    "block";

  placeholder.innerHTML = `
    <div class="loading-box">

      <div class="loading-icon">
        ⏳
      </div>

      <h2>
        ${message}
      </h2>

      <p>
        একটু অপেক্ষা করুন...
      </p>

    </div>
  `;

}


/* =========================================================
   ERROR SCREEN
========================================================= */

function showError(message) {

  pagesList.innerHTML = "";

  placeholder.style.display =
    "block";

  placeholder.innerHTML = `
    <div class="error-box">

      <h2>
        ❌ Comic খোলা যায়নি
      </h2>

      <br>

      <p>
        ${message}
      </p>

      <br>

      <p>
        সাধারণত damaged, password-protected
        বা unsupported file হলে এমন হতে পারে।
      </p>

    </div>
  `;

}


/* =========================================================
   CLEAR OLD OBJECT URLS
========================================================= */

function clearObjectURLs() {

  for (
    const url of currentObjectURLs
  ) {

    try {

      URL.revokeObjectURL(url);

    } catch (e) {}

  }

  currentObjectURLs = [];

}


/* =========================================================
   SAVE OBJECT URL
========================================================= */

function createObjectURL(file) {

  const url =
    URL.createObjectURL(file);

  currentObjectURLs.push(url);

  return url;

}


/* =========================================================
   FILE INPUT
========================================================= */

fileInput.addEventListener(
  "change",
  async function(event) {

    const files =
      Array.from(
        event.target.files || []
      );

    if (!files.length) return;

    await processFiles(files);

    fileInput.value = "";

  }
);


/* =========================================================
   FOLDER INPUT
========================================================= */

folderInput.addEventListener(
  "change",
  async function(event) {

    const files =
      Array.from(
        event.target.files || []
      );

    if (!files.length) return;

    await processImageFiles(files);

    folderInput.value = "";

  }
);


/* =========================================================
   DRAG & DROP
========================================================= */

document.addEventListener(
  "dragover",
  function(event) {

    event.preventDefault();

  }
);


document.addEventListener(
  "drop",
  async function(event) {

    event.preventDefault();

    const files =
      Array.from(
        event.dataTransfer.files || []
      );

    if (!files.length) return;

    await processFiles(files);

  }
);


/* =========================================================
   MAIN FILE PROCESSOR
========================================================= */

async function processFiles(files) {

  const token =
    ++loadToken;


  stopAutoScroll();


  clearObjectURLs();


  currentArchive =
    null;


  pagesList.innerHTML =
    "";


  pageCount.textContent =
    "0 pages";


  const firstFile =
    files[0];


  if (!firstFile) return;


  const fileName =
    firstFile.name.toLowerCase();


  setStatus(
    "Loading: " +
    firstFile.name
  );


  showLoading(
    "Comic প্রস্তুত হচ্ছে..."
  );


  try {

    /* -----------------------------------------
       PDF
    ----------------------------------------- */

    if (
      fileName.endsWith(".pdf")
    ) {

      await processPDF(
        firstFile,
        token
      );

      return;

    }


    /* -----------------------------------------
       ARCHIVE
       CBZ / CBR / ZIP / RAR
    ----------------------------------------- */

    if (
      fileName.endsWith(".cbz") ||
      fileName.endsWith(".cbr") ||
      fileName.endsWith(".zip") ||
      fileName.endsWith(".rar")
    ) {

      await processArchive(
        firstFile,
        token
      );

      return;

    }


    /* -----------------------------------------
       DIRECT IMAGES
    ----------------------------------------- */

    const imageFiles =
      files.filter(
        file => {

          return (
            file.type.startsWith("image/") ||
            isImageFile(file.name)
          );

        }
      );


    if (
      imageFiles.length > 0
    ) {

      await processImageFiles(
        imageFiles,
        token
      );

      return;

    }


    throw new Error(
      "এই file format এখন support করা হচ্ছে না।"
    );


  } catch (error) {

    console.error(error);


    if (
      token !== loadToken
    ) {

      return;

    }


    showError(
      error.message ||
      "অজানা কারণে file load করা যায়নি।"
    );


    setStatus(
      "File load failed"
    );

  }

}


/* =========================================================
   IMAGE FILE PROCESSOR
========================================================= */

async function processImageFiles(
  files,
  token = loadToken
) {

  stopAutoScroll();


  clearObjectURLs();


  pagesList.innerHTML =
    "";


  const images =
    files
      .filter(
        file =>
          file.type.startsWith("image/") ||
          isImageFile(file.name)
      )
      .sort(naturalSort);


  if (
    !images.length
  ) {

    showError(
      "কোনো image পাওয়া যায়নি।"
    );

    return;

  }


  if (
    token !== loadToken
  ) {

    return;

  }


  placeholder.style.display =
    "none";


  setStatus(
    images.length +
    "টি image পাওয়া গেছে"
  );


  pageCount.textContent =
    images.length +
    " pages";


  for (
    let i = 0;
    i < images.length;
    i++
  ) {

    if (
      token !== loadToken
    ) {

      return;

    }


    addImagePage(
      images[i],
      i + 1
    );

  }


  applyZoom();


  updateCustomScrollbar();

}


/* =========================================================
   ARCHIVE PROCESSOR
   Uses Unarchiver.js
========================================================= */

async function processArchive(
  file,
  token
) {

  if (
    typeof Unarchiver ===
    "undefined"
  ) {

    throw new Error(
      "Archive engine load হয়নি। Internet connection check করে আবার চেষ্টা করুন।"
    );

  }


  setStatus(
    "Archive খোলা হচ্ছে: " +
    file.name
  );


  /* Load archive engine */

  try {

    await Unarchiver.load(
      [
        "zip",
        "rar"
      ]
    );

  } catch (error) {

    console.warn(
      "Preload failed; trying direct open.",
      error
    );

  }


  if (
    token !== loadToken
  ) {

    return;

  }


  /* Open archive */

  const archive =
    await Unarchiver.open(
      file
    );


  currentArchive =
    archive;


  const entries =
    archive.entries
      .filter(
        entry => {

          return (
            entry.is_file &&
            isImageFile(entry.name)
          );

        }
      )
      .sort(
        (a, b) => {

          return a.name.localeCompare(
            b.name,
            undefined,
            {
              numeric: true,
              sensitivity: "base"
            }
          );

        }
      );


  if (
    !entries.length
  ) {

    throw new Error(
      "Comic archive-এর ভিতরে কোনো supported image পাওয়া যায়নি।"
    );

  }


  placeholder.style.display =
    "none";


  setStatus(
    file.name +
    " • " +
    entries.length +
    " pages"
  );


  pageCount.textContent =
    entries.length +
    " pages";


  /* -----------------------------------------
     Read archive pages one by one
     This reduces memory pressure.
  ----------------------------------------- */

  for (
    let i = 0;
    i < entries.length;
    i++
  ) {

    if (
      token !== loadToken
    ) {

      return;

    }


    setStatus(
      "Page " +
      (i + 1) +
      " / " +
      entries.length +
      " load হচ্ছে..."
    );


    const entryFile =
      await entries[i].read();


    if (
      token !== loadToken
    ) {

      return;

    }


    const url =
      createObjectURL(
        entryFile
      );


    addImagePageFromURL(
      url,
      entries[i].name,
      i + 1
    );


    /*
      Browser-কে মাঝে মাঝে render করার
      সুযোগ দেওয়া হয়।
    */

    if (
      i % 3 === 0
    ) {

      await new Promise(
        resolve =>
          setTimeout(
            resolve,
            0
          )
      );

    }

  }


  setStatus(
    file.name +
    " • " +
    entries.length +
    " pages"
  );


  applyZoom();


  updateCustomScrollbar();

}


/* =========================================================
   ADD IMAGE PAGE FROM FILE
========================================================= */

function addImagePage(
  file,
  pageNumber
) {

  const url =
    createObjectURL(
      file
    );


  addImagePageFromURL(
    url,
    file.name,
    pageNumber
  );

}


/* =========================================================
   ADD IMAGE PAGE FROM URL
========================================================= */

function addImagePageFromURL(
  url,
  fileName,
  pageNumber
) {

  const wrapper =
    document.createElement(
      "div"
    );


  wrapper.className =
    "page-wrapper";


  const img =
    document.createElement(
      "img"
    );


  img.className =
    "page-image";


  img.loading =
    "lazy";


  img.decoding =
    "async";


  img.alt =
    "Comic page " +
    pageNumber;


  img.src =
    url;


  img.dataset.page =
    pageNumber;


  img.title =
    fileName;


  wrapper.appendChild(
    img
  );


  pagesList.appendChild(
    wrapper
  );

}


/* =========================================================
   PDF PROCESSOR
========================================================= */

async function processPDF(
  file,
  token
) {

  if (
    typeof pdfjsLib ===
    "undefined"
  ) {

    throw new Error(
      "PDF Reader library load হয়নি। Internet connection check করুন।"
    );

  }


  setStatus(
    "PDF পড়া হচ্ছে..."
  );


  const arrayBuffer =
    await file.arrayBuffer();


  if (
    token !== loadToken
  ) {

    return;

  }


  const pdf =
    await pdfjsLib
      .getDocument({
        data: arrayBuffer
      })
      .promise;


  if (
    token !== loadToken
  ) {

    return;

  }


  placeholder.style.display =
    "none";


  pageCount.textContent =
    pdf.numPages +
    " pages";


  setStatus(
    file.name +
    " • " +
    pdf.numPages +
    " pages"
  );


  /*
    Render PDF pages
  */

  for (
    let pageNumber = 1;
    pageNumber <= pdf.numPages;
    pageNumber++
  ) {

    if (
      token !== loadToken
    ) {

      return;

    }


    setStatus(
      "PDF Page " +
      pageNumber +
      " / " +
      pdf.numPages +
      " render হচ্ছে..."
    );


    const page =
      await pdf.getPage(
        pageNumber
      );


    /*
      Base viewport
    */

    const baseViewport =
      page.getViewport({
        scale: 1
      });


    const readerWidth =
      Math.min(
        window.innerWidth,
        1100
      );


    let scale =
      readerWidth /
      baseViewport.width;


    /*
      Don't render absurdly huge canvases.
    */

    scale =
      Math.min(
        Math.max(
          scale,
          1
        ),
        2
      );


    const viewport =
      page.getViewport({
        scale: scale
      });


    const wrapper =
      document.createElement(
        "div"
      );


    wrapper.className =
      "page-wrapper";


    const canvas =
      document.createElement(
        "canvas"
      );


    canvas.className =
      "pdf-page";


    canvas.width =
      Math.floor(
        viewport.width
      );


    canvas.height =
      Math.floor(
        viewport.height
      );


    canvas.dataset.page =
      pageNumber;


    wrapper.appendChild(
      canvas
    );


    pagesList.appendChild(
      wrapper
    );


    const context =
      canvas.getContext(
        "2d",
        {
          alpha: false
        }
      );


    await page.render({
      canvasContext: context,
      viewport: viewport
    }).promise;


    /*
      Allow browser to breathe
    */

    if (
      pageNumber % 2 === 0
    ) {

      await new Promise(
        resolve =>
          setTimeout(
            resolve,
            0
          )
      );

    }

  }


  setStatus(
    file.name +
    " • PDF ready"
  );


  applyZoom();


  updateCustomScrollbar();

}


/* =========================================================
   AUTO SCROLL
========================================================= */

scrollToggle.addEventListener(
  "click",
  toggleAutoScroll
);


mobileScroll.addEventListener(
  "click",
  toggleAutoScroll
);


function toggleAutoScroll() {

  if (isScrolling) {

    stopAutoScroll();

  } else {

    startAutoScroll();

  }

}


/* =========================================================
   START AUTO SCROLL
========================================================= */

function startAutoScroll() {

  if (
    document.documentElement.scrollHeight <=
    window.innerHeight + 5
  ) {

    return;

  }


  stopAutoScroll(false);


  isScrolling =
    true;


  scrollToggle.textContent =
    "⏸ Stop Scroll";


  scrollToggle.classList.add(
    "active"
  );


  mobileScroll.textContent =
    "⏸";


  /*
    NEW:
    Fullscreen + Auto Scroll
    হলে controls hide হবে।
  */

  if (
    document.fullscreenElement
  ) {

    hideFullscreenControls();

  }


  let lastTime =
    performance.now();


  function scrollFrame(
    currentTime
  ) {

    if (
      !isScrolling
    ) {

      return;

    }


    const delta =
      currentTime -
      lastTime;


    lastTime =
      currentTime;


    /*
      Speed is pixels per second.
      This gives smoother scrolling
      than setInterval.
    */

    const pixels =
      (
        scrollSpeed *
        delta
      ) / 1000;


    window.scrollBy(
      0,
      pixels
    );


    const bottomReached =
      window.innerHeight +
      window.scrollY >=
      document.documentElement.scrollHeight -
      2;


    updateCustomScrollbar();


    if (
      bottomReached
    ) {

      stopAutoScroll();

      return;

    }


    animationFrame =
      requestAnimationFrame(
        scrollFrame
      );

  }


  animationFrame =
    requestAnimationFrame(
      scrollFrame
    );

}


/* =========================================================
   STOP AUTO SCROLL
========================================================= */

function stopAutoScroll(
  resetButton = true
) {

  isScrolling =
    false;


  if (
    animationFrame !== null
  ) {

    cancelAnimationFrame(
      animationFrame
    );


    animationFrame =
      null;

  }


  if (
    resetButton
  ) {

    scrollToggle.textContent =
      "▶ Auto Scroll";


    scrollToggle.classList.remove(
      "active"
    );


    mobileScroll.textContent =
      "▶";

  }


  /*
    Auto Scroll বন্ধ হলে
    controls আবার দেখা যাবে।
  */

  showFullscreenControls();

}


/* =========================================================
   SPEED
========================================================= */

function setScrollSpeed(
  value
) {

  scrollSpeed =
    Number(value);


  speedRange.value =
    scrollSpeed;


  mobileSpeed.value =
    scrollSpeed;


  speedVal.textContent =
    scrollSpeed;


  if (
    isScrolling
  ) {

    stopAutoScroll();

    startAutoScroll();

  }

}


speedRange.addEventListener(
  "input",
  function() {

    setScrollSpeed(
      this.value
    );

  }
);


mobileSpeed.addEventListener(
  "input",
  function() {

    setScrollSpeed(
      this.value
    );

  }
);


/* =========================================================
   ZOOM
========================================================= */

function updateZoom() {

  zoomLevel =
    Math.max(
      0.5,
      Math.min(
        zoomLevel,
        3
      )
    );


  zoomVal.textContent =
    Math.round(
      zoomLevel * 100
    ) +
    "%";


  applyZoom();


  setTimeout(
    updateCustomScrollbar,
    50
  );

}


/* =========================================================
   APPLY ZOOM
========================================================= */

function applyZoom() {

  const images =
    document.querySelectorAll(
      ".page-image"
    );


  const canvases =
    document.querySelectorAll(
      ".pdf-page"
    );


  const all =
    [
      ...images,
      ...canvases
    ];


  all.forEach(
    element => {

      if (
        fitWidthMode
      ) {

        element.style.width =
          "100%";


        element.style.maxWidth =
          "100%";

      } else {

        element.style.width =
          `${zoomLevel * 100}%`;


        element.style.maxWidth =
          "none";

      }

    }
  );

}


/* =========================================================
   ZOOM IN
========================================================= */

function increaseZoom() {

  fitWidthMode =
    false;


  zoomLevel +=
    0.1;


  updateZoom();

}


zoomIn.addEventListener(
  "click",
  increaseZoom
);


mobileZoomIn.addEventListener(
  "click",
  increaseZoom
);


/* =========================================================
   ZOOM OUT
========================================================= */

function decreaseZoom() {

  fitWidthMode =
    false;


  zoomLevel -=
    0.1;


  updateZoom();

}


zoomOut.addEventListener(
  "click",
  decreaseZoom
);


mobileZoomOut.addEventListener(
  "click",
  decreaseZoom
);


/* =========================================================
   FIT WIDTH
========================================================= */

fitWidth.addEventListener(
  "click",
  function() {

    fitWidthMode =
      true;


    zoomLevel =
      1;


    updateZoom();

  }
);


/* =========================================================
   FULLSCREEN
========================================================= */

fullscreenBtn.addEventListener(
  "click",
  toggleFullscreen
);


async function toggleFullscreen() {

  try {

    if (
      !document.fullscreenElement
    ) {

      await document.documentElement
        .requestFullscreen();


      document.body.classList.add(
        "reader-fullscreen"
      );


      updateCustomScrollbar();


    } else {

      await document.exitFullscreen();

    }

  } catch (error) {

    console.error(
      "Fullscreen error:",
      error
    );

  }

}


/* =========================================================
   FULLSCREEN CHANGE
========================================================= */

document.addEventListener(
  "fullscreenchange",
  function() {

    if (
      document.fullscreenElement
    ) {

      document.body.classList.add(
        "reader-fullscreen"
      );


      createCustomScrollbar();


      setTimeout(
        function() {

          updateCustomScrollbar();

          if (
            isScrolling
          ) {

            hideFullscreenControls();

          }

        },
        100
      );


    } else {

      document.body.classList.remove(
        "reader-fullscreen"
      );


      showFullscreenControls();


      hideCustomScrollbar();

    }

  }
);


/* =========================================================
   KEYBOARD SHORTCUTS
========================================================= */

document.addEventListener(
  "keydown",
  function(event) {

    /*
      Space = Auto Scroll
    */

    if (
      event.code === "Space" &&
      event.target.tagName !== "INPUT"
    ) {

      event.preventDefault();

      toggleAutoScroll();

    }


    /*
      + = Zoom in
    */

    if (
      event.key === "+" ||
      event.key === "="
    ) {

      increaseZoom();

    }


    /*
      - = Zoom out
    */

    if (
      event.key === "-"
    ) {

      decreaseZoom();

    }


    /*
      F = Fullscreen
    */

    if (
      event.key.toLowerCase() === "f"
    ) {

      toggleFullscreen();

    }

  }
);


/* =========================================================
   PAGE VISIBILITY
   Stop auto-scroll when tab is hidden.
========================================================= */

document.addEventListener(
  "visibilitychange",
  function() {

    if (
      document.hidden &&
      isScrolling
    ) {

      stopAutoScroll();

    }

  }
);


/* =========================================================
   FULLSCREEN CONTROL AUTO-HIDE
========================================================= */

let controlHideTimer =
  null;


/*
  Find all existing reader controls.
  We don't change their normal appearance.
*/

function getReaderControls() {

  const controls = [];


  const desktopControl =
    document.querySelector(
      ".control-bar"
    );


  const mobileControl =
    document.querySelector(
      "#mobile-controls"
    );


  if (
    desktopControl
  ) {

    controls.push(
      desktopControl
    );

  }


  if (
    mobileControl &&
    mobileControl !== desktopControl
  ) {

    controls.push(
      mobileControl
    );

  }


  return controls;

}


/* =========================================================
   HIDE CONTROLS
========================================================= */

function hideFullscreenControls() {

  if (
    !document.fullscreenElement ||
    !isScrolling
  ) {

    return;

  }


  const controls =
    getReaderControls();


  controls.forEach(
    control => {

      control.classList.add(
        "controls-hidden"
      );

    }
  );


  clearTimeout(
    controlHideTimer
  );

}


/* =========================================================
   SHOW CONTROLS
========================================================= */

function showFullscreenControls() {

  const controls =
    getReaderControls();


  controls.forEach(
    control => {

      control.classList.remove(
        "controls-hidden"
      );

    }
  );

}


/* =========================================================
   SCREEN CLICK = SHOW CONTROLS
========================================================= */

document.addEventListener(
  "click",
  function(event) {

    if (
      !document.fullscreenElement
    ) {

      return;

    }


    /*
      If controls are hidden and user clicks
      the comic screen, show them again.
    */

    if (
      isScrolling
    ) {

      const controls =
        getReaderControls();


      const areHidden =
        controls.some(
          control =>
            control.classList.contains(
              "controls-hidden"
            )
        );


      if (
        areHidden
      ) {

        showFullscreenControls();


        /*
          Hide again after a short time.
          This keeps screen recording clean.
        */

        clearTimeout(
          controlHideTimer
        );


        controlHideTimer =
          setTimeout(
            function() {

              if (
                document.fullscreenElement &&
                isScrolling
              ) {

                hideFullscreenControls();

              }

            },
            2500
          );

      }

    }

  }
);


/* =========================================================
   CUSTOM SCROLLBAR
========================================================= */

let customScrollbar =
  null;

let customScrollbarTrack =
  null;

let customScrollbarThumb =
  null;

let scrollPageIndicator =
  null;

let scrollbarDragging =
  false;

let scrollbarDragOffset =
  0;

let scrollbarHideTimer =
  null;


/* =========================================================
   CUSTOM SCROLLBAR CSS
========================================================= */

function injectScrollbarCSS() {

  if (
    document.getElementById(
      "comic-custom-scrollbar-style"
    )
  ) {

    return;

  }


  const style =
    document.createElement(
      "style"
    );


  style.id =
    "comic-custom-scrollbar-style";


  style.textContent = `

    /* -----------------------------------------
       HIDE NATIVE SCROLLBAR IN FULLSCREEN
    ----------------------------------------- */

    body.reader-fullscreen {

      scrollbar-width: none;

      -ms-overflow-style: none;

    }


    body.reader-fullscreen::-webkit-scrollbar {

      width: 0 !important;

      height: 0 !important;

      display: none !important;

    }


    /* -----------------------------------------
       HIDE ORIGINAL CONTROLS
    ----------------------------------------- */

    body.reader-fullscreen
    .controls-hidden {

      opacity: 0 !important;

      visibility: hidden !important;

      pointer-events: none !important;

      transform: translateY(10px) !important;

    }


    /* -----------------------------------------
       CUSTOM SCROLLBAR
    ----------------------------------------- */

    #comic-custom-scrollbar {

      position: fixed;

      top: 0;

      right: 0;

      width: 28px;

      height: 100vh;

      z-index: 2147483640;

      display: none;

      pointer-events: none;

    }


    #comic-custom-scrollbar.active {

      display: block;

    }


    /* -----------------------------------------
       INVISIBLE MOUSE AREA
    ----------------------------------------- */

    #comic-custom-scrollbar::before {

      content: "";

      position: absolute;

      top: 0;

      right: 0;

      width: 32px;

      height: 100%;

      pointer-events: auto;

    }


    /* -----------------------------------------
       TRACK
    ----------------------------------------- */

    #comic-custom-scrollbar-track {

      position: absolute;

      top: 8px;

      right: 5px;

      width: 5px;

      height: calc(100% - 16px);

      border-radius: 10px;

      background: rgba(
        255,
        255,
        255,
        0.12
      );

      opacity: 0;

      transition:
        opacity 0.18s ease;

      pointer-events: auto;

    }


    #comic-custom-scrollbar.visible
    #comic-custom-scrollbar-track {

      opacity: 1;

    }


    /* -----------------------------------------
       THUMB
    ----------------------------------------- */

    #comic-custom-scrollbar-thumb {

      position: absolute;

      top: 0;

      right: 0;

      width: 5px;

      min-height: 45px;

      border-radius: 10px;

      background: rgba(
        255,
        255,
        255,
        0.62
      );

      cursor: grab;

      transition:
        width 0.12s ease,
        background 0.12s ease;

      pointer-events: auto;

    }


    #comic-custom-scrollbar-thumb:hover {

      width: 7px;

      background: rgba(
        255,
        255,
        255,
        0.9
      );

    }


    #comic-custom-scrollbar-thumb.dragging {

      width: 8px;

      background: #ffffff;

      cursor: grabbing;

    }


    /* -----------------------------------------
       PAGE INDICATOR
    ----------------------------------------- */

    #comic-scroll-page-indicator {

      position: fixed;

      right: 35px;

      padding: 7px 11px;

      border-radius: 7px;

      background: rgba(
        15,
        15,
        15,
        0.94
      );

      border: 1px solid rgba(
        255,
        255,
        255,
        0.18
      );

      color: #ffffff;

      font-family:
        Arial,
        sans-serif;

      font-size: 13px;

      font-weight: bold;

      white-space: nowrap;

      opacity: 0;

      transform:
        translateY(-50%);

      transition:
        opacity 0.15s ease;

      pointer-events: none;

      z-index: 2147483641;

    }


    #comic-scroll-page-indicator.show {

      opacity: 1;

    }

  `;


  document.head.appendChild(
    style
  );

}


/* =========================================================
   CREATE CUSTOM SCROLLBAR
========================================================= */

function createCustomScrollbar() {

  injectScrollbarCSS();


  if (
    customScrollbar
  ) {

    return;

  }


  customScrollbar =
    document.createElement(
      "div"
    );


  customScrollbar.id =
    "comic-custom-scrollbar";


  customScrollbarTrack =
    document.createElement(
      "div"
    );


  customScrollbarTrack.id =
    "comic-custom-scrollbar-track";


  customScrollbarThumb =
    document.createElement(
      "div"
    );


  customScrollbarThumb.id =
    "comic-custom-scrollbar-thumb";


  scrollPageIndicator =
    document.createElement(
      "div"
    );


  scrollPageIndicator.id =
    "comic-scroll-page-indicator";


  customScrollbarTrack.appendChild(
    customScrollbarThumb
  );


  customScrollbar.appendChild(
    customScrollbarTrack
  );


  document.body.appendChild(
    customScrollbar
  );


  document.body.appendChild(
    scrollPageIndicator
  );


  setupCustomScrollbarEvents();

}


/* =========================================================
   HIDE CUSTOM SCROLLBAR
========================================================= */

function hideCustomScrollbar() {

  if (
    customScrollbar
  ) {

    customScrollbar.classList.remove(
      "active"
    );

    customScrollbar.classList.remove(
      "visible"
    );

  }


  if (
    scrollPageIndicator
  ) {

    scrollPageIndicator.classList.remove(
      "show"
    );

  }

}


/* =========================================================
   SHOW CUSTOM SCROLLBAR
========================================================= */

function showCustomScrollbar() {

  if (
    !document.fullscreenElement
  ) {

    return;

  }


  createCustomScrollbar();


  customScrollbar.classList.add(
    "active"
  );


  customScrollbar.classList.add(
    "visible"
  );


  clearTimeout(
    scrollbarHideTimer
  );


  scrollbarHideTimer =
    setTimeout(
      function() {

        if (
          !scrollbarDragging
        ) {

          customScrollbar.classList.remove(
            "visible"
          );

        }

      },
      1800
    );

}


/* =========================================================
   GET SCROLL INFO
========================================================= */

function getScrollInfo() {

  const scrollTop =
    window.scrollY;


  const viewportHeight =
    window.innerHeight;


  const documentHeight =
    Math.max(
      document.documentElement.scrollHeight,
      document.body.scrollHeight
    );


  const trackHeight =
    customScrollbarTrack
      ? customScrollbarTrack.clientHeight
      : Math.max(
          0,
          viewportHeight - 16
        );


  const thumbHeight =
    Math.max(
      45,
      (
        viewportHeight /
        Math.max(
          viewportHeight,
          documentHeight
        )
      ) * trackHeight
    );


  const maxScroll =
    Math.max(
      1,
      documentHeight -
      viewportHeight
    );


  const maxThumbTop =
    Math.max(
      0,
      trackHeight -
      thumbHeight
    );


  const thumbTop =
    (
      scrollTop /
      maxScroll
    ) *
    maxThumbTop;


  return {

    scrollTop,

    viewportHeight,

    documentHeight,

    trackHeight,

    thumbHeight,

    maxScroll,

    maxThumbTop,

    thumbTop

  };

}


/* =========================================================
   UPDATE CUSTOM SCROLLBAR
========================================================= */

function updateCustomScrollbar() {

  if (
    !document.fullscreenElement
  ) {

    return;

  }


  createCustomScrollbar();


  const info =
    getScrollInfo();


  customScrollbarThumb.style.height =
    `${info.thumbHeight}px`;


  customScrollbarThumb.style.transform =
    `translateY(${info.thumbTop}px)`;


  updateCurrentPageIndicator();

}


/* =========================================================
   GET CURRENT PAGE
========================================================= */

function getCurrentPageNumber() {

  const pages =
    document.querySelectorAll(
      ".page-wrapper"
    );


  if (
    !pages.length
  ) {

    return {

      current: 0,

      total: 0

    };

  }


  const currentPosition =
    window.scrollY +
    (
      window.innerHeight /
      2
    );


  let currentPage =
    1;


  pages.forEach(
    function(page, index) {

      const top =
        page.offsetTop;


      const bottom =
        top +
        page.offsetHeight;


      if (
        currentPosition >= top &&
        currentPosition <= bottom
      ) {

        currentPage =
          index + 1;

      }

    }
  );


  /*
    If we're near the very bottom,
    make sure last page is selected.
  */

  if (
    window.scrollY >=
    pages[
      pages.length - 1
    ].offsetTop
  ) {

    currentPage =
      pages.length;

  }


  return {

    current:
      currentPage,

    total:
      pages.length

  };

}


/* =========================================================
   UPDATE PAGE INDICATOR
========================================================= */

function updateCurrentPageIndicator() {

  if (
    !scrollPageIndicator
  ) {

    return;

  }


  const page =
    getCurrentPageNumber();


  if (
    !page.total
  ) {

    return;

  }


  scrollPageIndicator.textContent =
    "Page " +
    page.current +
    " / " +
    page.total;


  const info =
    getScrollInfo();


  const indicatorTop =
    info.thumbTop +
    (
      info.thumbHeight /
      2
    );


  scrollPageIndicator.style.top =
    `${indicatorTop + 8}px`;

}


/* =========================================================
   MOUSE NEAR RIGHT EDGE
========================================================= */

document.addEventListener(
  "mousemove",
  function(event) {

    if (
      !document.fullscreenElement
    ) {

      return;

    }


    /*
      Only activate scrollbar when
      mouse comes close to right edge.
    */

    if (
      event.clientX >=
      window.innerWidth - 45
    ) {

      showCustomScrollbar();

    }

  }
);


/* =========================================================
   SCROLLBAR HOVER
========================================================= */

function setupCustomScrollbarEvents() {

  /*
    Mouse enters scrollbar
  */

  customScrollbar.addEventListener(
    "mouseenter",
    function() {

      showCustomScrollbar();

    }
  );


  /*
    Mouse leaves scrollbar
  */

  customScrollbar.addEventListener(
    "mouseleave",
    function() {

      if (
        !scrollbarDragging
      ) {

        clearTimeout(
          scrollbarHideTimer
        );


        scrollbarHideTimer =
          setTimeout(
            function() {

              customScrollbar.classList.remove(
                "visible"
              );

            },
            600
          );

      }

    }
  );


  /*
    Start dragging thumb
  */

  customScrollbarThumb.addEventListener(
    "mousedown",
    function(event) {

      if (
        !document.fullscreenElement
      ) {

        return;

      }


      event.preventDefault();


      event.stopPropagation();


      scrollbarDragging =
        true;


      customScrollbarThumb.classList.add(
        "dragging"
      );


      customScrollbar.classList.add(
        "visible"
      );


      scrollPageIndicator.classList.add(
        "show"
      );


      const thumbRect =
        customScrollbarThumb.getBoundingClientRect();


      scrollbarDragOffset =
        event.clientY -
        thumbRect.top;


      updateCurrentPageIndicator();

    }
  );


  /*
    Click track to jump
  */

  customScrollbarTrack.addEventListener(
    "click",
    function(event) {

      if (
        event.target ===
        customScrollbarThumb
      ) {

        return;

      }


      const rect =
        customScrollbarTrack.getBoundingClientRect();


      const info =
        getScrollInfo();


      let mouseY =
        event.clientY -
        rect.top;


      let thumbTop =
        mouseY -
        (
          info.thumbHeight /
          2
        );


      thumbTop =
        Math.max(
          0,
          Math.min(
            thumbTop,
            info.maxThumbTop
          )
        );


      const percentage =
        info.maxThumbTop > 0

          ? thumbTop /
            info.maxThumbTop

          : 0;


      window.scrollTo(
        0,
        percentage *
        info.maxScroll
      );


      updateCustomScrollbar();


      scrollPageIndicator.classList.add(
        "show"
      );


      setTimeout(
        function() {

          if (
            !scrollbarDragging
          ) {

            scrollPageIndicator.classList.remove(
              "show"
            );

          }

        },
        1000
      );

    }
  );

}


/* =========================================================
   GLOBAL MOUSE DRAG
========================================================= */

document.addEventListener(
  "mousemove",
  function(event) {

    if (
      !scrollbarDragging
    ) {

      return;

    }


    if (
      !document.fullscreenElement
    ) {

      return;

    }


    const info =
      getScrollInfo();


    const trackRect =
      customScrollbarTrack.getBoundingClientRect();


    let thumbTop =
      event.clientY -
      trackRect.top -
      scrollbarDragOffset;


    thumbTop =
      Math.max(
        0,
        Math.min(
          thumbTop,
          info.maxThumbTop
        )
      );


    const percentage =
      info.maxThumbTop > 0

        ? thumbTop /
          info.maxThumbTop

        : 0;


    const newScrollTop =
      percentage *
      info.maxScroll;


    window.scrollTo(
      0,
      newScrollTop
    );


    updateCustomScrollbar();


    scrollPageIndicator.classList.add(
      "show"
    );

  }
);


/* =========================================================
   END DRAG
========================================================= */

document.addEventListener(
  "mouseup",
  function() {

    if (
      !scrollbarDragging
    ) {

      return;

    }


    scrollbarDragging =
      false;


    customScrollbarThumb.classList.remove(
      "dragging"
    );


    updateCurrentPageIndicator();


    setTimeout(
      function() {

        scrollPageIndicator.classList.remove(
          "show"
        );

      },
      1200
    );


    showCustomScrollbar();

  }
);


/* =========================================================
   NORMAL SCROLL UPDATE
========================================================= */

window.addEventListener(
  "scroll",
  function() {

    if (
      document.fullscreenElement
    ) {

      updateCustomScrollbar();

    }

  },
  {
    passive: true
  }
);


/* =========================================================
   RESIZE UPDATE
========================================================= */

window.addEventListener(
  "resize",
  function() {

    if (
      document.fullscreenElement
    ) {

      updateCustomScrollbar();

    }

  }
);


/* =========================================================
   IMAGE LOAD UPDATE
========================================================= */

document.addEventListener(
  "load",
  function(event) {

    if (
      event.target &&
      (
        event.target.classList.contains(
          "page-image"
        ) ||
        event.target.classList.contains(
          "pdf-page"
        )
      )
    ) {

      if (
        document.fullscreenElement
      ) {

        updateCustomScrollbar();

      }

    }

  },
  true
);


/* =========================================================
   INITIALIZE CUSTOM SYSTEM
========================================================= */

injectScrollbarCSS();

createCustomScrollbar();


/* =========================================================
   INITIAL STATUS
========================================================= */

setScrollSpeed(150);

setStatus(
  "কোনো Comic খোলা হয়নি"
);
