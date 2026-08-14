const fileInput = document.getElementById('file-input');
const pagesList = document.getElementById('pages-list');
const placeholder = document.getElementById('placeholder');

const scrollToggle = document.getElementById('scroll-toggle');
const speedRange = document.getElementById('speed-range');
const speedVal = document.getElementById('speed-val');

let isScrolling = false;
let scrollInterval = null;

// Handle File Select (Images or CBZ/ZIP)
fileInput.addEventListener('change', async (e) => {
  const files = Array.from(e.target.files);
  if (!files.length) return;

  pagesList.innerHTML = '';
  placeholder.style.display = 'none';

  const firstFile = files[0];
  const fileName = firstFile.name.toLowerCase();

  if (fileName.endsWith('.cbz') || fileName.endsWith('.zip')) {
    // Process ZIP/CBZ
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
    // Sort pages numerically by filename
    images.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));

    images.forEach(imgData => {
      const img = document.createElement('img');
      img.src = imgData.url;
      pagesList.appendChild(img);
    });

  } else {
    // Process Direct Image Files
    files.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
    files.forEach(file => {
      if (file.type.startsWith('image/')) {
        const img = document.createElement('img');
        img.src = URL.createObjectURL(file);
        pagesList.appendChild(img);
      }
    });
  }
});

// Auto Scroll Logic
scrollToggle.addEventListener('click', () => {
  if (isScrolling) {
    stopAutoScroll();
  } else {
    startAutoScroll();
  }
});

speedRange.addEventListener('input', (e) => {
  speedVal.textContent = `${e.target.value}x`;
  if (isScrolling) {
    startAutoScroll(); // Restart with new speed
  }
});

function startAutoScroll() {
  stopAutoScroll();
  isScrolling = true;
  scrollToggle.textContent = '⏸ অটো-স্ক্রোল বন্ধ';
  scrollToggle.classList.add('active');

  const speed = parseInt(speedRange.value);
  // Interval adjusts based on slider
  const delay = Math.max(10, 60 - speed * 5); 

  scrollInterval = setInterval(() => {
    window.scrollBy(0, 1);
    // Stop at bottom of page
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
