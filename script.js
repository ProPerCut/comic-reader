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
   - Image folders
========================================================= */


/* =========================================================
   ELEMENTS
========================================================= */

const fileInput = document.getElementById("file-input");
const folderInput = document.getElementById("folder-input");

const pagesList = document.getElementById("pages-list");
const placeholder = document.getElementById("placeholder");

const scrollToggle = document.getElementById("scroll-toggle");

const speedRange = document.getElementById("speed-range");
const speedVal = document.getElementById("speed-val");

const zoomIn = document.getElementById("zoom-in");
const zoomOut = document.getElementById("zoom-out");
const zoomVal = document.getElementById("zoom-val");

const fitWidth = document.getElementById("fit-width");
const fullscreenBtn = document.getElementById("fullscreen-btn");

const statusText = document.getElementById("status-text");
const pageCount = document.getElementById("page-count");

const mobileScroll = document.getElementById("mobile-scroll");
const mobileSpeed = document.getElementById("mobile-speed");
const mobileZoomIn = document.getElementById("mobile-zoom-in");
const mobileZoomOut = document.getElementById("mobile-zoom-out");


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

  statusText.textContent = message;

}


/* =========================================================
   LOADING SCREEN
========================================================= */

function showLoading(message = "Comic প্রসেস হচ্ছে...") {

  pagesList.innerHTML = "";

  placeholder.style.display = "block";

  placeholder.innerHTML = `
    <div class="loading-box">
      <div class="loading-icon">⏳</div>
      <h2>${message}</h2>
      <p>একটু অপেক্ষা করুন...</p>
    </div>
  `;

}


/* =========================================================
   ERROR SCREEN
========================================================= */

function showError(message) {

  pagesList.innerHTML = "";

  placeholder.style.display = "block";

  placeholder.innerHTML = `
    <div class="error-box">
      <h2>❌ Comic খোলা যায়নি</h2>
      <br>
      <p>${message}</p>
      <br>
      <p>
        সাধারণত damaged, password-protected বা unsupported
        file হলে এমন হতে পারে।
      </p>
    </div>
  `;

}


/* =========================================================
   CLEAR OLD OBJECT URLS
========================================================= */

function clearObjectURLs() {

  for (const url of currentObjectURLs) {

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

  const url = URL.createObjectURL(file);

  currentObjectURLs.push(url);

  return url;

}


/* =========================================================
   FILE INPUT
========================================================= */

fileInput.addEventListener("change", async function(event) {

  const files = Array.from(event.target.files || []);

  if (!files.length) return;

  await processFiles(files);

  fileInput.value = "";

});


/* =========================================================
   FOLDER INPUT
========================================================= */

folderInput.addEventListener("change", async function(event) {

  const files = Array.from(event.target.files || []);

  if (!files.length) return;

  await processImageFiles(files);

  folderInput.value = "";

});


/* =========================================================
   DRAG & DROP
========================================================= */

document.addEventListener("dragover", function(event) {

  event.preventDefault();

});


document.addEventListener("drop", async function(event) {

  event.preventDefault();

  const files = Array.from(event.dataTransfer.files || []);

  if (!files.length) return;

  await processFiles(files);

});


/* =========================================================
   MAIN FILE PROCESSOR
========================================================= */

async function processFiles(files) {

  const token = ++loadToken;

  stopAutoScroll();

  clearObjectURLs();

  currentArchive = null;

  pagesList.innerHTML = "";

  pageCount.textContent = "0 pages";

  const firstFile = files[0];

  if (!firstFile) return;

  const fileName = firstFile.name.toLowerCase();

  setStatus("Loading: " + firstFile.name);

  showLoading("Comic প্রস্তুত হচ্ছে...");


  try {

    /* -----------------------------------------
       PDF
    ----------------------------------------- */

    if (fileName.endsWith(".pdf")) {

      await processPDF(firstFile, token);

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

      await processArchive(firstFile, token);

      return;
    }


    /* -----------------------------------------
       DIRECT IMAGES
    ----------------------------------------- */

    const imageFiles = files.filter(file => {

      return (
        file.type.startsWith("image/") ||
        isImageFile(file.name)
      );

    });


    if (imageFiles.length > 0) {

      await processImageFiles(imageFiles, token);

      return;
    }


    throw new Error(
      "এই file format এখন support করা হচ্ছে না।"
    );


  } catch (error) {

    console.error(error);

    if (token !== loadToken) return;

    showError(
      error.message ||
      "অজানা কারণে file load করা যায়নি।"
    );

    setStatus("File load failed");

  }

}


/* =========================================================
   IMAGE FILE PROCESSOR
========================================================= */

async function processImageFiles(files, token = loadToken) {

  stopAutoScroll();

  clearObjectURLs();

  pagesList.innerHTML = "";

  const images = files
    .filter(file =>
      file.type.startsWith("image/") ||
      isImageFile(file.name)
    )
    .sort(naturalSort);


  if (!images.length) {

    showError("কোনো image পাওয়া যায়নি।");

    return;
  }


  if (token !== loadToken) return;


  placeholder.style.display = "none";

  setStatus(
    images.length + "টি image পাওয়া গেছে"
  );

  pageCount.textContent =
    images.length + " pages";


  for (let i = 0; i < images.length; i++) {

    if (token !== loadToken) return;

    addImagePage(
      images[i],
      i + 1
    );

  }


  applyZoom();

}


/* =========================================================
   ARCHIVE PROCESSOR
   Uses Unarchiver.js
========================================================= */

async function processArchive(file, token) {

  if (typeof Unarchiver === "undefined") {

    throw new Error(
      "Archive engine load হয়নি। Internet connection check করে আবার চেষ্টা করুন।"
    );

  }


  setStatus(
    "Archive খোলা হচ্ছে: " + file.name
  );


  /* Load archive engine */

  try {

    await Unarchiver.load(["zip", "rar"]);

  } catch (error) {

    console.warn(
      "Preload failed; trying direct open.",
      error
    );

  }


  if (token !== loadToken) return;


  /* Open archive */

  const archive =
    await Unarchiver.open(file);


  currentArchive = archive;


  const entries = archive.entries
    .filter(entry => {

      return (
        entry.is_file &&
        isImageFile(entry.name)
      );

    })
    .sort((a, b) => {

      return a.name.localeCompare(
        b.name,
        undefined,
        {
          numeric: true,
          sensitivity: "base"
        }
      );

    });


  if (!entries.length) {

    throw new Error(
      "Comic archive-এর ভিতরে কোনো supported image পাওয়া যায়নি।"
    );

  }


  placeholder.style.display = "none";


  setStatus(
    file.name +
    " • " +
    entries.length +
    " pages"
  );


  pageCount.textContent =
    entries.length + " pages";


  /* -----------------------------------------
     Read archive pages one by one
     This reduces memory pressure.
  ----------------------------------------- */

  for (let i = 0; i < entries.length; i++) {

    if (token !== loadToken) return;


    setStatus(
      "Page " +
      (i + 1) +
      " / " +
      entries.length +
      " load হচ্ছে..."
    );


    const entryFile =
      await entries[i].read();


    if (token !== loadToken) return;


    const url =
      createObjectURL(entryFile);


    addImagePageFromURL(
      url,
      entries[i].name,
      i + 1
    );


    /*
      Browser-কে মাঝে মাঝে render করার সুযোগ দেওয়া হয়।
      বড় comic-এর ক্ষেত্রে UI freeze কম হবে।
    */

    if (i % 3 === 0) {

      await new Promise(
        resolve => setTimeout(resolve, 0)
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

}


/* =========================================================
   ADD IMAGE PAGE FROM FILE
========================================================= */

function addImagePage(file, pageNumber) {

  const url = createObjectURL(file);

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
    document.createElement("div");

  wrapper.className =
    "page-wrapper";


  const img =
    document.createElement("img");

  img.className =
    "page-image";


  img.loading =
    "lazy";


  img.decoding =
    "async";


  img.alt =
    "Comic page " + pageNumber;


  img.src =
    url;


  img.dataset.page =
    pageNumber;


  img.title =
    fileName;


  wrapper.appendChild(img);

  pagesList.appendChild(wrapper);

}


/* =========================================================
   PDF PROCESSOR
========================================================= */

async function processPDF(file, token) {

  if (typeof pdfjsLib === "undefined") {

    throw new Error(
      "PDF Reader library load হয়নি। Internet connection check করুন।"
    );

  }


  setStatus(
    "PDF পড়া হচ্ছে..."
  );


  const arrayBuffer =
    await file.arrayBuffer();


  if (token !== loadToken) return;


  const pdf =
    await pdfjsLib
      .getDocument({
        data: arrayBuffer
      })
      .promise;


  if (token !== loadToken) return;


  placeholder.style.display = "none";


  pageCount.textContent =
    pdf.numPages + " pages";


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

    if (token !== loadToken) return;


    setStatus(
      "PDF Page " +
      pageNumber +
      " / " +
      pdf.numPages +
      " render হচ্ছে..."
    );


    const page =
      await pdf.getPage(pageNumber);


    /*
      1.5 gives good quality while keeping
      memory usage reasonable.
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
        Math.max(scale, 1),
        2
      );


    const viewport =
      page.getViewport({
        scale: scale
      });


    const wrapper =
      document.createElement("div");

    wrapper.className =
      "page-wrapper";


    const canvas =
      document.createElement("canvas");

    canvas.className =
      "pdf-page";


    canvas.width =
      Math.floor(viewport.width);


    canvas.height =
      Math.floor(viewport.height);


    canvas.dataset.page =
      pageNumber;


    wrapper.appendChild(canvas);

    pagesList.appendChild(wrapper);


    const context =
      canvas.getContext("2d", {
        alpha: false
      });


    await page.render({
      canvasContext: context,
      viewport: viewport
    }).promise;


    /*
      Allow browser to breathe
    */

    if (pageNumber % 2 === 0) {

      await new Promise(
        resolve => setTimeout(resolve, 0)
      );

    }

  }


  setStatus(
    file.name +
    " • PDF ready"
  );

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


  isScrolling = true;


  scrollToggle.textContent =
    "⏸ Stop Scroll";


  scrollToggle.classList.add("active");


  mobileScroll.textContent =
    "⏸";


  let lastTime = performance.now();


  function scrollFrame(currentTime) {

    if (!isScrolling) return;


    const delta =
      currentTime - lastTime;


    lastTime =
      currentTime;


    /*
      Speed is pixels per second.
      This gives smoother scrolling than setInterval.
    */

    const pixels =
      (scrollSpeed * delta) / 1000;


    window.scrollBy(
      0,
      pixels
    );


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

  isScrolling = false;


  if (animationFrame !== null) {

    cancelAnimationFrame(
      animationFrame
    );

    animationFrame = null;

  }


  if (resetButton) {

    scrollToggle.textContent =
      "▶ Auto Scroll";

    scrollToggle.classList.remove(
      "active"
    );

    mobileScroll.textContent =
      "▶";

  }

}


/* =========================================================
   SPEED
========================================================= */

function setScrollSpeed(value) {

  scrollSpeed =
    Number(value);


  speedRange.value =
    scrollSpeed;


  mobileSpeed.value =
    scrollSpeed;


  speedVal.textContent =
    scrollSpeed;


  if (isScrolling) {

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
    ) + "%";


  applyZoom();

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
    [...images, ...canvases];


  all.forEach(element => {

    if (fitWidthMode) {

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

  });

}


/* =========================================================
   ZOOM IN
========================================================= */

function increaseZoom() {

  fitWidthMode = false;

  zoomLevel += 0.1;

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

  fitWidthMode = false;

  zoomLevel -= 0.1;

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

    fitWidthMode = true;

    zoomLevel = 1;

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

    if (!document.fullscreenElement) {

      await document.documentElement.requestFullscreen();

      document.body.classList.add(
        "reader-fullscreen"
      );

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


document.addEventListener(
  "fullscreenchange",
  function() {

    if (document.fullscreenElement) {

      document.body.classList.add(
        "reader-fullscreen"
      );

    } else {

      document.body.classList.remove(
        "reader-fullscreen"
      );

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
   INITIAL STATUS
========================================================= */

setScrollSpeed(150);

setStatus(
  "কোনো Comic খোলা হয়নি"
);
/* =========================================================
   FULLSCREEN AUTO-SCROLL CONTROL AUTO-HIDE
========================================================= */

/*
  যখন fullscreen + auto scroll চালু হবে,
  নিচের control bar automatically hide হবে।
*/

function hideFullscreenControls() {

  if (document.fullscreenElement && isScrolling) {

    document.body.classList.add(
      "controls-hidden"
    );

  }

}


/*
  Auto scroll বন্ধ হলে controls আবার দেখা যাবে।
*/

function showFullscreenControls() {

  document.body.classList.remove(
    "controls-hidden"
  );

}


/*
  Fullscreen অবস্থায় screen-এর যেকোনো জায়গায়
  click করলে controls আবার দেখা যাবে।
*/

document.addEventListener(
  "click",
  function(event) {

    if (
      document.fullscreenElement &&
      isScrolling &&
      document.body.classList.contains(
        "controls-hidden"
      )
    ) {

      /*
        Control bar-এর ভেতরে click হলে
        এই action চালাব না।
      */

      if (
        event.target.closest("#mobile-controls")
      ) {

        return;

      }

      showFullscreenControls();

    }

  }
);


/*
  Auto Scroll শুরু হলে fullscreen check করে
  controls hide করা হবে।
*/

const originalStartAutoScroll =
  startAutoScroll;

startAutoScroll = function() {

  originalStartAutoScroll();

  hideFullscreenControls();

};


/*
  Auto Scroll বন্ধ হলে controls আবার দেখা যাবে।
*/

const originalStopAutoScroll =
  stopAutoScroll;

stopAutoScroll = function(resetButton = true) {

  originalStopAutoScroll(resetButton);

  showFullscreenControls();

};


/*
  Fullscreen থেকে বের হলে controls অবশ্যই
  আবার দেখা যাবে।
*/

document.addEventListener(
  "fullscreenchange",
  function() {

    if (!document.fullscreenElement) {

      showFullscreenControls();

    } else if (isScrolling) {

      hideFullscreenControls();

    }

  }
);
