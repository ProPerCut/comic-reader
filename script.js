const fileInput = document.getElementById('file-input');
const pagesList = document.getElementById('pages-list');
const placeholder = document.getElementById('placeholder');
const readerContainer = document.body;

const scrollToggle = document.getElementById('scroll-toggle');
const speedRange = document.getElementById('speed-range');
const speedVal = document.getElementById('speed-val');

let isScrolling = false;
let scrollInterval = null;

// Dynamically inject unrar library for CBR support
const unrarScript = document.createElement('script');
unrarScript.src = "https://cdn.jsdelivr.net/npm/node-unrar-js@2.0.2/dist/bundle/unrar.js";
document.head.appendChild(unrarScript);

// Process Selected or Dropped Files
async function processFiles(files) {
  if (!files || !files.length) return;

  pagesList.innerHTML = '';
  placeholder.style.display = 'block';
  placeholder.innerHTML = '<h2>ফাইল প্রসেস হচ্ছে... অনুগ্রহ করে একটু অপেক্ষা করুন ⏳</h2>';

  const firstFile = files[0];
  const fileName = firstFile.name.toLowerCase();

  try {
    // 1. Process CBZ / ZIP
    if (fileName.endsWith('.cbz') || fileName.endsWith('.zip')) {
      const zip = await JSZip.loadAsync(firstFile);
      const imagePromises = [];

      zip.forEach((relativePath, zipEntry) => {
        if (!zipEntry.dir && /\.(jpg|jpeg|png|webp|gif)$/i.test(zipEntry.name)) {
          imagePromises.push(
            zipEntry.async('blob').then(blob => ({
              name: zipEntry.name,
              url: URL.createObjectURL(blob)
            }))
          );
        }
      });

      const images = await Promise.all(imagePromises);
      renderImages(images);

    // 2. Process CBR / RAR
    } else if (fileName.endsWith('.cbr') || fileName.endsWith('.rar')) {
      if (typeof unrar === 'undefined') {
        alert("CBR ইঞ্জিন লোড হচ্ছে, ৫ সেকেন্ড অপেক্ষা করে আবার চেষ্টা করুন।");
        placeholder.style.display = 'none';
        return;
      }

      const arrayBuffer = await firstFile.arrayBuffer();
      const extractor = await unrar.createExtractorFromData({ data: arrayBuffer });
      const extracted = extractor.extract();

      const imagePromises = [];
      for (const file of extracted.files) {
        if (!file.fileHeader.flags.directory && /\.(jpg|jpeg|png|webp|gif)$/i.test(file.fileHeader.name)) {
          const blob = new Blob([file.extraction], { type: 'image/jpeg' });
          imagePromises.push({
            name: file.fileHeader.name,
            url: URL.createObjectURL(blob)
          });
        }
      }

      renderImages(imagePromises);

    // 3. Process Image Files directly
    } else {
      const imageFiles = Array.from(files).filter(f => f.type.startsWith('image/') || /\.(jpg|jpeg|png|webp)$/i.test(f.name));
      if (imageFiles.length === 0) {
        placeholder.innerHTML = '<h2>কোনো ছবি বা পড়া যায় এমন ফাইল পাওয়া যায়নি!</h2>';
        return;
      }

      const images = imageFiles.map(file => ({
        name: file.name,
        url: URL.createObjectURL(file)
      }));

      renderImages(images);
    }
  } catch (err) {
    console.error(err);
    alert("ফাইলটি লোড করতে সমস্যা হয়েছে! নিশ্চিত করুন ফাইলটি ড্যামেজ নয়।");
    placeholder.style.display = 'block';
    placeholder.innerHTML = '<h2>ফাইল লোড করা সম্ভব হয়নি!</h2>';
  }
}

// Function to render images on screen
function renderImages(images) {
  if (!images.length) {
    placeholder.style.display = 'block';
    placeholder.innerHTML = '<h2>ফাইলের ভেতরে কোনো ছবি পাওয়া যায়নি!</h2>';
    return;
  }

  // Sort pages numerically (Page 1, Page 2, Page 10...)
  images.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));

  placeholder.style.display = 'none';
  images.forEach(imgData => {
    const img = document.createElement('img');
    img.src = imgData.url;
    pagesList.appendChild(img);
  });
}

// File Button Listener
fileInput.addEventListener('change', (e) => processFiles(e.target.files));

// Drag & Drop Listeners
readerContainer.addEventListener('dragover', (e) => e.preventDefault());
readerContainer.addEventListener('drop', (e) => {
  e.preventDefault();
  if (e.dataTransfer.files.length) {
    processFiles(e.dataTransfer.files);
  }
});

// Auto Scroll Logic
scrollToggle.addEventListener('click', () => {
  if (isScrolling) stopAutoScroll();
  else startAutoScroll();
});

speedRange.addEventListener('input', (e) => {
  speedVal.textContent = `${e.target.value}x`;
  if (isScrolling) startAutoScroll();
});

function startAutoScroll() {
  stopAutoScroll();
  isScrolling = true;
  scrollToggle.textContent = '⏸ অটো-স্ক্রোল বন্ধ';
  scrollToggle.classList.add('active');

  const speed = parseInt(speedRange.value);
  const delay = Math.max(10, 60 - speed * 5); 

  scrollInterval = setInterval(() => {
    window.scrollBy(0, 1);
    if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight) {
      stopAutoScroll();
    }
  }, delay);
}

function stopAutoScroll() {
  isScrolling = false;
  clearInterval(scrollInterval);
  scrollToggle.textContent = '▶ অটো-স্ক্রোল শুরু';
  scrollToggle.classList.remove('active');
}
