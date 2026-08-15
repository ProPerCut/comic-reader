/* =========================================================
   COMIC READER
   ========================================================= */


/* =========================================================
   ELEMENTS
========================================================= */

const fileInput = document.getElementById("file-input");
const folderInput = document.getElementById("folder-input");

const pagesList = document.getElementById("pages-list");
const placeholder = document.getElementById("placeholder");

const readerContainer = document.getElementById("reader-container");

const statusText = document.getElementById("status-text");
const pageCount = document.getElementById("page-count");

const scrollToggle = document.getElementById("scroll-toggle");

const speedRange = document.getElementById("speed-range");
const speedNumber = document.getElementById("speed-number");

const mobileScroll = document.getElementById("mobile-scroll");
const mobileSpeed = document.getElementById("mobile-speed");

const zoomOut = document.getElementById("zoom-out");
const zoomIn = document.getElementById("zoom-in");

const mobileZoomOut = document.getElementById("mobile-zoom-out");
const mobileZoomIn = document.getElementById("mobile-zoom-in");

const zoomVal = document.getElementById("zoom-val");

const fitWidth = document.getElementById("fit-width");

const fullscreenBtn = document.getElementById("fullscreen-btn");

const fullscreenPageBar =
  document.getElementById("fullscreen-page-bar");

const fullscreenPageTrack =
  document.getElementById("fullscreen-page-track");

const fullscreenPageThumb =
  document.getElementById("fullscreen-page-thumb");

const fullscreenPageNumber =
  document.getElementById("fullscreen-page-number");


/* =========================================================
   VARIABLES
========================================================= */

let currentImages = [];

let objectUrls = [];

let isScrolling = false;

let animationFrame = null;

let scrollSpeed = 10;

let zoomLevel = 1;

let fitMode = true;

let currentFileName = "";

let fullscreenControlsTimer = null;

let pageCountTotal = 0;


/* =========================================================
   PDF WORKER
========================================================= */

if (window.pdfjsLib) {

  pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

}


/* =========================================================
   SPEED
========================================================= */

function normalizeSpeed(value) {

  let speed = Number(value);

  if (!Number.isFinite(speed)) {
    speed = 10;
  }

  speed = Math.max(0.5, Math.min(50, speed));

  /*
    Keep values clean.
    Example:
    2.500 -> 2.5
  */

  speed = Math.round(speed * 2) / 2;

  return speed;
}


function setSpeed(value, restart = true) {

  scrollSpeed = normalizeSpeed(value);

  speedRange.value = scrollSpeed;

  speedNumber.value = scrollSpeed;

  mobileSpeed.value = scrollSpeed;

  if (isScrolling && restart) {

    stopAutoScroll();

    startAutoScroll();

  }

}


/* Desktop slider */

speedRange.addEventListener("input", function () {

  setSpeed(this.value);

});


/* Desktop number box */

speedNumber.addEventListener("input", function () {

  setSpeed(this.value, false);

});


speedNumber.addEventListener("change", function () {

  setSpeed(this.value);

});


speedNumber.addEventListener("keydown", function (event) {

  if (event.key === "Enter") {

    setSpeed(this.value);

    this.blur();

  }

});


/* Mobile slider */

mobileSpeed.addEventListener("input", function () {

  setSpeed(this.value);

});


/* =========================================================
   AUTO SCROLL
========================================================= */

function startAutoScroll() {

  stopAutoScroll();

  isScrolling = true;

  scrollToggle.textContent = "⏸ Auto Scroll";

  scrollToggle.classList.add("active");

  mobileScroll.textContent = "⏸";


  let lastTime = performance.now();

  let remainder = 0;


  function scrollLoop(currentTime) {

    if (!isScrolling) {
      return;
    }


    const deltaTime =
      Math.min(currentTime - lastTime, 100);

    lastTime = currentTime;


    /*
      scrollSpeed = pixels per second

      Example:

      0.5 px/s
      1 px/s
      2.5 px/s
      10 px/s
      20 px/s

      Fractional movement is stored in remainder
      so very slow speeds actually work smoothly.
    */

    const pixelsToMove =
      (scrollSpeed * deltaTime) / 1000;

    remainder += pixelsToMove;


    if (remainder >= 0.1) {

      const move =
        Math.floor(remainder * 100) / 100;

      window.scrollBy(0, move);

      remainder -= move;

    }


    const bottomReached =
      window.innerHeight +
      window.scrollY >=
      document.documentElement.scrollHeight - 2;


    if (bottomReached) {

      stopAutoScroll();

      return;

    }


    animationFrame =
      requestAnimationFrame(scrollLoop);

  }


  animationFrame =
    requestAnimationFrame(scrollLoop);

}


function stopAutoScroll() {

  isScrolling = false;

  if (animationFrame !== null) {

    cancelAnimationFrame(animationFrame);

    animationFrame = null;

  }

  scrollToggle.textContent =
    "▶ Auto Scroll";

  scrollToggle.classList.remove("active");

  mobileScroll.textContent = "▶";

}


function toggleAutoScroll() {

  if (isScrolling) {

    stopAutoScroll();

  } else {

    startAutoScroll();

  }

}


scrollToggle.addEventListener(
  "click",
  toggleAutoScroll
);


mobileScroll.addEventListener(
  "click",
  toggleAutoScroll
);


/* =========================================================
   IMAGE FILE CHECK
========================================================= */

function isImageFile(fileName) {

  return /\.(jpg|jpeg|png|webp|gif|bmp|avif)$/i
    .test(fileName);

}


/* =========================================================
   SORT IMAGES
========================================================= */

function sortImages(images) {

  return images.sort((a, b) => {

    return a.name.localeCompare(
      b.name,
      undefined,
      {
        numeric: true,
        sensitivity: "base"
      }
    );

  });

}


/* =========================================================
   CLEAN OLD URLS
========================================================= */

function cleanupObjectUrls() {

  objectUrls.forEach(url => {

    try {

      URL.revokeObjectURL(url);

    } catch (error) {}

  });

  objectUrls = [];

}


/* =========================================================
   RESET READER
========================================================= */

function resetReader() {

  stopAutoScroll();

  cleanupObjectUrls();

  pagesList.innerHTML = "";

  currentImages = [];

  pageCountTotal = 0;

  updatePageCounter();

}


/* =========================================================
   STATUS
========================================================= */

function setStatus(text) {

  statusText.textContent = text;

}


function updatePageCounter() {

  pageCount.textContent =
    `${pageCountTotal} pages`;

  updateFullscreenPage();

}


/* =========================================================
   PROCESS FILES
========================================================= */

async function processFiles(files) {

  if (!files || !files.length) {
    return;
  }


  resetReader();


  placeholder.style.display = "block";

  placeholder.innerHTML = `
    <div class="welcome-icon">⏳</div>
    <h1>Loading...</h1>
    <p>Comic প্রসেস হচ্ছে। একটু অপেক্ষা করুন...</p>
  `;


  const fileArray =
    Array.from(files);


  /*
    If a folder was selected,
    only image files are used.
  */

  const imageFiles =
    fileArray.filter(file =>
      isImageFile(file.name)
    );


  /*
    Folder / multiple images
  */

  if (
    imageFiles.length > 0 &&
    !isArchiveFile(fileArray[0].name) &&
    !isPDFFile(fileArray[0].name)
  ) {

    currentFileName =
      imageFiles[0].webkitRelativePath
      ? imageFiles[0].webkitRelativePath.split("/")[0]
      : "Image Folder";


    const images =
      imageFiles.map(file => {

        const url =
          URL.createObjectURL(file);

        objectUrls.push(url);

        return {
          name:
            file.webkitRelativePath ||
            file.name,

          url: url
        };

      });


    renderImages(images);

    return;
  }


  /*
    Main file
  */

  const file = fileArray[0];

  currentFileName = file.name;


  try {

    if (isPDFFile(file.name)) {

      await processPDF(file);

    }

    else if (isArchiveFile(file.name)) {

      await processArchive(file);

    }

    else if (isImageFile(file.name)) {

      const url =
        URL.createObjectURL(file);

      objectUrls.push(url);

      renderImages([
        {
          name: file.name,
          url: url
        }
      ]);

    }

    else {

      throw new Error(
        "Unsupported file type"
      );

    }

  }

  catch (error) {

    console.error(error);

    placeholder.style.display = "block";

    placeholder.innerHTML = `
      <div class="welcome-icon">❌</div>

      <h1>ফাইল লোড করা যায়নি</h1>

      <p>
        ফাইলটি damaged হতে পারে অথবা
        formatটি supported নয়।
      </p>
    `;

    setStatus("ফাইল লোড করতে সমস্যা হয়েছে");

  }

}


/* =========================================================
   FILE TYPE
========================================================= */

function isArchiveFile(name) {

  return /\.(cbz|cbr|zip|rar)$/i
    .test(name);

}


function isPDFFile(name) {

  return /\.pdf$/i
    .test(name);

}


/* =========================================================
   ARCHIVE PROCESSOR
========================================================= */

async function processArchive(file) {

  setStatus(
    `${file.name} — archive খুলছে...`
  );


  /*
    Make sure Unarchiver.js is available.
  */

  if (
    typeof window.Unarchiver === "undefined"
  ) {

    throw new Error(
      "Unarchiver library not loaded"
    );

  }


  const archive =
    await Unarchiver.open(file);


  const entries =
    archive.entries || [];


  const imageEntries =
    entries.filter(entry => {

      return (
        entry.is_file &&
        isImageFile(entry.name)
      );

    });


  if (!imageEntries.length) {

    throw new Error(
      "No images found inside archive"
    );

  }


  sortImages(imageEntries);


  const images = [];


  /*
    Read images one by one.
    This is more memory-friendly than
    extracting everything simultaneously.
  */

  for (
    let i = 0;
    i < imageEntries.length;
    i++
  ) {

    const entry =
      imageEntries[i];


    setStatus(
      `Loading page ${i + 1} / ${imageEntries.length}`
    );


    const entryFile =
      await entry.read();


    const url =
      URL.createObjectURL(entryFile);


    objectUrls.push(url);


    images.push({

      name: entry.name,

      url: url

    });

  }


  try {

    if (
      typeof Unarchiver.close === "function"
    ) {

      Unarchiver.close(archive);

    }

  } catch (error) {}


  renderImages(images);

}


/* =========================================================
   PDF PROCESSOR
========================================================= */

async function processPDF(file) {

  if (!window.pdfjsLib) {

    throw new Error(
      "PDF.js not loaded"
    );

  }


  setStatus(
    `${file.name} — PDF খুলছে...`
  );


  const arrayBuffer =
    await file.arrayBuffer();


  const pdf =
    await pdfjsLib.getDocument({
      data: arrayBuffer
    }).promise;


  const images = [];


  for (
    let pageNumber = 1;
    pageNumber <= pdf.numPages;
    pageNumber++
  ) {

    setStatus(
      `PDF page ${pageNumber} / ${pdf.numPages}`
    );


    const page =
      await pdf.getPage(pageNumber);


    const viewport =
      page.getViewport({
        scale: 2
      });


    const canvas =
      document.createElement("canvas");


    const context =
      canvas.getContext("2d");


    canvas.width =
      viewport.width;

    canvas.height =
      viewport.height;


    await page.render({

      canvasContext: context,

      viewport: viewport

    }).promise;


    const blob =
      await new Promise(resolve => {

        canvas.toBlob(
          resolve,
          "image/jpeg",
          0.95
        );

      });


    const url =
      URL.createObjectURL(blob);


    objectUrls.push(url);


    images.push({

      name:
        `Page ${String(pageNumber).padStart(5, "0")}`,

      url: url

    });

  }


  renderImages(images);

}


/* =========================================================
   RENDER IMAGES
========================================================= */

function renderImages(images) {

  if (!images || !images.length) {

    placeholder.style.display = "block";

    placeholder.innerHTML = `
      <div class="welcome-icon">❌</div>
      <h1>No Pages</h1>
      <p>ফাইলের মধ্যে কোনো readable image পাওয়া যায়নি।</p>
    `;

    return;

  }


  currentImages =
    sortImages(images);


  pagesList.innerHTML = "";


  placeholder.style.display =
    "none";


  currentImages.forEach(
    (imageData, index) => {

      const wrapper =
        document.createElement("div");


      wrapper.className =
        "page-wrapper";


      wrapper.dataset.page =
        index + 1;


      const img =
        document.createElement("img");


      img.src =
        imageData.url;


      img.alt =
        `Page ${index + 1}`;


      img.loading =
        index < 3
          ? "eager"
          : "lazy";


      img.draggable =
        false;


      wrapper.appendChild(img);


      pagesList.appendChild(wrapper);

    }
  );


  pageCountTotal =
    currentImages.length;


  updatePageCounter();


  setStatus(
    `${currentFileName} • ${pageCountTotal} pages`
  );


  applyZoom();

}


/* =========================================================
   ZOOM
========================================================= */

function applyZoom() {

  if (fitMode) {

    document.body.classList.remove(
      "zoomed"
    );


    zoomVal.textContent =
      "Fit";

    return;

  }


  document.body.classList.add(
    "zoomed"
  );


  const pages =
    document.querySelectorAll(
      ".page-wrapper"
    );


  pages.forEach(page => {

    page.style.width =
      `${zoomLevel * 100}%`;

  });


  zoomVal.textContent =
    `${Math.round(zoomLevel * 100)}%`;

}


function changeZoom(amount) {

  fitMode = false;


  zoomLevel += amount;


  zoomLevel =
    Math.max(
      0.25,
      Math.min(3, zoomLevel)
    );


  applyZoom();

}


zoomIn.addEventListener(
  "click",
  () => changeZoom(0.1)
);


zoomOut.addEventListener(
  "click",
  () => changeZoom(-0.1)
);


mobileZoomIn.addEventListener(
  "click",
  () => changeZoom(0.1)
);


mobileZoomOut.addEventListener(
  "click",
  () => changeZoom(-0.1)
);


/* =========================================================
   FIT WIDTH
========================================================= */

fitWidth.addEventListener(
  "click",
  () => {

    fitMode = true;

    zoomLevel = 1;

    applyZoom();

  }
);


/* =========================================================
   FULLSCREEN
========================================================= */

async function toggleFullscreen() {

  try {

    if (!document.fullscreenElement) {

      await document.documentElement.requestFullscreen();

      document.body.classList.add(
        "fullscreen-mode"
      );

      showFullscreenControls();

    }

    else {

      await document.exitFullscreen();

    }

  }

  catch (error) {

    console.error(
      "Fullscreen error:",
      error
    );

  }

}


fullscreenBtn.addEventListener(
  "click",
  toggleFullscreen
);


document.addEventListener(
  "fullscreenchange",
  () => {

    if (document.fullscreenElement) {

      document.body.classList.add(
        "fullscreen-mode"
      );

      showFullscreenControls();

    }

    else {

      document.body.classList.remove(
        "fullscreen-mode"
      );

      fullscreenPageBar.style.opacity =
        "0";

    }

  }
);


/* =========================================================
   FULLSCREEN CONTROLS AUTO HIDE
========================================================= */

function showFullscreenControls() {

  if (
    !document.fullscreenElement
  ) {
    return;
  }


  fullscreenPageBar.style.opacity =
    "1";


  clearTimeout(
    fullscreenControlsTimer
  );


  fullscreenControlsTimer =
    setTimeout(() => {

      if (!isScrolling) {

        fullscreenPageBar.style.opacity =
          "0";

      }

    }, 2500);

}


/*
  Move mouse toward right side
  to show page scrollbar.
*/

document.addEventListener(
  "mousemove",
  event => {

    if (
      !document.fullscreenElement
    ) {
      return;
    }


    if (
      window.innerWidth - event.clientX < 100
    ) {

      showFullscreenControls();

    }

  }
);


/* =========================================================
   FULLSCREEN PAGE BAR
========================================================= */

function updateFullscreenPage() {

  if (!currentImages.length) {

    fullscreenPageNumber.textContent =
      "Page 0 / 0";

    return;

  }


  const scrollTop =
    window.scrollY;


  const maxScroll =
    document.documentElement.scrollHeight -
    window.innerHeight;


  let percentage = 0;


  if (maxScroll > 0) {

    percentage =
      scrollTop / maxScroll;

  }


  percentage =
    Math.max(
      0,
      Math.min(1, percentage)
    );


  const trackHeight =
    fullscreenPageTrack.clientHeight;


  const thumbHeight =
    fullscreenPageThumb.offsetHeight;


  const available =
    trackHeight - thumbHeight;


  fullscreenPageThumb.style.top =
    `${available * percentage}px`;


  const page =
    getCurrentPage();


  fullscreenPageNumber.textContent =
    `Page ${page} / ${currentImages.length}`;

}


function getCurrentPage() {

  const wrappers =
    document.querySelectorAll(
      ".page-wrapper"
    );


  if (!wrappers.length) {
    return 0;
  }


  const viewportMiddle =
    window.scrollY +
    window.innerHeight / 2;


  let closestPage = 1;

  let closestDistance = Infinity;


  wrappers.forEach(
    (wrapper, index) => {

      const rect =
        wrapper.getBoundingClientRect();


      const center =
        window.scrollY +
        rect.top +
        rect.height / 2;


      const distance =
        Math.abs(
          center - viewportMiddle
        );


      if (
        distance < closestDistance
      ) {

        closestDistance =
          distance;

        closestPage =
          index + 1;

      }

    }
  );


  return closestPage;

}


window.addEventListener(
  "scroll",
  updateFullscreenPage,
  {
    passive: true
  }
);


window.addEventListener(
  "resize",
  updateFullscreenPage
);


/* =========================================================
   CLICK FULLSCREEN PAGE BAR
========================================================= */

fullscreenPageTrack.addEventListener(
  "click",
  event => {

    const rect =
      fullscreenPageTrack.getBoundingClientRect();


    const percentage =
      (
        event.clientY -
        rect.top
      ) / rect.height;


    const maxScroll =
      document.documentElement.scrollHeight -
      window.innerHeight;


    window.scrollTo({

      top:
        maxScroll *
        Math.max(
          0,
          Math.min(1, percentage)
        ),

      behavior: "auto"

    });


    showFullscreenControls();

  }
);


/* =========================================================
   DRAG FULLSCREEN THUMB
========================================================= */

let draggingPageBar = false;


fullscreenPageThumb.addEventListener(
  "mousedown",
  event => {

    draggingPageBar = true;

    event.preventDefault();

  }
);


document.addEventListener(
  "mouseup",
  () => {

    draggingPageBar = false;

  }
);


document.addEventListener(
  "mousemove",
  event => {

    if (!draggingPageBar) {
      return;
    }


    const rect =
      fullscreenPageTrack.getBoundingClientRect();


    let percentage =
      (
        event.clientY -
        rect.top
      ) / rect.height;


    percentage =
      Math.max(
        0,
        Math.min(1, percentage)
      );


    const maxScroll =
      document.documentElement.scrollHeight -
      window.innerHeight;


    window.scrollTo(
      0,
      maxScroll * percentage
    );


    showFullscreenControls();

  }
);


/* =========================================================
   FILE INPUT
========================================================= */

fileInput.addEventListener(
  "change",
  event => {

    processFiles(
      event.target.files
    );

  }
);


/* =========================================================
   FOLDER INPUT
========================================================= */

folderInput.addEventListener(
  "change",
  event => {

    processFiles(
      event.target.files
    );

  }
);


/* =========================================================
   DRAG & DROP
========================================================= */

readerContainer.addEventListener(
  "dragover",
  event => {

    event.preventDefault();

    readerContainer.classList.add(
      "dragging"
    );

  }
);


readerContainer.addEventListener(
  "dragleave",
  () => {

    readerContainer.classList.remove(
      "dragging"
    );

  }
);


readerContainer.addEventListener(
  "drop",
  event => {

    event.preventDefault();

    readerContainer.classList.remove(
      "dragging"
    );


    if (
      event.dataTransfer.files.length
    ) {

      processFiles(
        event.dataTransfer.files
      );

    }

  }
);


/* =========================================================
   KEYBOARD SHORTCUTS
========================================================= */

document.addEventListener(
  "keydown",
  event => {

    /*
      Don't interfere while typing
      in the speed number box.
    */

    if (
      document.activeElement ===
      speedNumber
    ) {

      return;

    }


    if (event.code === "Space") {

      event.preventDefault();

      toggleAutoScroll();

    }


    if (event.key === "+") {

      changeZoom(0.1);

    }


    if (event.key === "-") {

      changeZoom(-0.1);

    }


    if (event.key === "f") {

      toggleFullscreen();

    }

  }
);


/* =========================================================
   INITIAL SPEED
========================================================= */

setSpeed(
  speedRange.value,
  false
);


/* =========================================================
   INITIAL PAGE INDICATOR
========================================================= */

updateFullscreenPage();


/* =========================================================
   READY
========================================================= */

console.log(
  "Comic Reader ready."
);
