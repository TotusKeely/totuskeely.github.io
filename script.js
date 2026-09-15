document.querySelectorAll('[data-gallery]').forEach((gallery) => {
  const slides = Array.from(gallery.querySelectorAll('.gallery-slide'));
  const thumbsContainer = gallery.querySelector('.gallery-thumbs');
  const prev = gallery.querySelector('[data-gallery-prev]');
  const next = gallery.querySelector('[data-gallery-next]');
  const current = gallery.querySelector('[data-gallery-current]');
  const total = gallery.querySelector('[data-gallery-total]');

  if (!slides.length) return;

  const captureVideoThumbnail = (video, thumb, placeholder) => {
    const sourceEl = video.querySelector('source');
    const source = video.currentSrc || sourceEl?.getAttribute('src');
    if (!source) return;

    const preview = document.createElement('video');
    preview.muted = true;
    preview.playsInline = true;
    preview.preload = 'auto';
    preview.src = new URL(source, document.baseURI).href;

    const cleanup = () => {
      preview.removeAttribute('src');
      preview.load();
    };

    preview.addEventListener('loadedmetadata', () => {
      const duration = Number.isFinite(preview.duration) ? preview.duration : 0;
      preview.currentTime = Math.min(1, Math.max(0.1, duration * 0.05 || 0.5));
    }, { once: true });

    preview.addEventListener('seeked', () => {
      try {
        if (!preview.videoWidth || !preview.videoHeight) return;
        const canvas = document.createElement('canvas');
        const maxWidth = 640;
        const scale = Math.min(1, maxWidth / preview.videoWidth);
        canvas.width = Math.max(1, Math.round(preview.videoWidth * scale));
        canvas.height = Math.max(1, Math.round(preview.videoHeight * scale));
        const ctx = canvas.getContext('2d');
        ctx.drawImage(preview, 0, 0, canvas.width, canvas.height);
        const frame = canvas.toDataURL('image/jpeg', 0.78);

        const thumbImage = document.createElement('img');
        thumbImage.src = frame;
        thumbImage.alt = '';
        placeholder.replaceWith(thumbImage);

        // Use the same captured frame as the main video's initial poster without
        // requiring a separate poster image in the repository.
        if (!video.getAttribute('poster')) video.setAttribute('poster', frame);
      } catch (error) {
        // If frame capture is unavailable, keep the VIDEO fallback thumbnail.
      } finally {
        cleanup();
      }
    }, { once: true });

    preview.addEventListener('error', cleanup, { once: true });
  };

  const thumbs = [];
  if (thumbsContainer) {
    thumbsContainer.innerHTML = '';

    slides.forEach((slide, index) => {
      const image = slide.querySelector('img');
      const video = slide.querySelector('video');
      const caption = slide.querySelector('figcaption')?.textContent.trim() || '';
      const labelText = slide.dataset.thumbLabel || caption || `Slide ${index + 1}`;

      const thumb = document.createElement('button');
      thumb.className = 'gallery-thumb';
      thumb.type = 'button';
      thumb.dataset.galleryIndex = String(index);
      thumb.setAttribute('aria-label', `Show ${labelText}`);

      if (image) {
        const thumbImage = document.createElement('img');
        thumbImage.src = image.getAttribute('src') || '';
        thumbImage.alt = '';
        thumb.appendChild(thumbImage);
      } else if (video) {
        const poster = video.getAttribute('poster');
        if (poster) {
          const thumbImage = document.createElement('img');
          thumbImage.src = poster;
          thumbImage.alt = '';
          thumb.appendChild(thumbImage);
        } else {
          const placeholder = document.createElement('div');
          placeholder.className = 'gallery-thumb-video-placeholder';
          placeholder.textContent = 'VIDEO';
          thumb.appendChild(placeholder);
          captureVideoThumbnail(video, thumb, placeholder);
        }

        const playIcon = document.createElement('div');
        playIcon.className = 'gallery-thumb-play';
        playIcon.setAttribute('aria-hidden', 'true');
        playIcon.textContent = '▶';
        thumb.appendChild(playIcon);
      }

      const label = document.createElement('span');
      label.textContent = labelText;
      thumb.appendChild(label);

      thumbsContainer.appendChild(thumb);
      thumbs.push(thumb);
    });
  }

  slides.forEach((slide) => {
    const video = slide.querySelector('video');
    if (!video) return;
    video.setAttribute('playsinline', '');
    if (!video.hasAttribute('preload')) video.setAttribute('preload', 'metadata');
  });

  let activeIndex = Math.max(0, slides.findIndex((slide) => slide.classList.contains('is-active')));
  if (total) total.textContent = String(slides.length);

  const showSlide = (index) => {
    activeIndex = (index + slides.length) % slides.length;

    slides.forEach((slide, i) => {
      const isActive = i === activeIndex;
      slide.classList.toggle('is-active', isActive);
      slide.setAttribute('aria-hidden', String(!isActive));

      if (!isActive) {
        slide.querySelectorAll('video').forEach((video) => video.pause());
      }
    });

    thumbs.forEach((thumb, i) => {
      const isActive = i === activeIndex;
      thumb.classList.toggle('is-active', isActive);
      thumb.setAttribute('aria-current', isActive ? 'true' : 'false');
    });

    const activeHasVideo = Boolean(slides[activeIndex].querySelector('video'));
    gallery.classList.toggle('gallery-video-active', activeHasVideo);

    if (current) current.textContent = String(activeIndex + 1);
  };

  thumbs.forEach((thumb, index) => {
    thumb.addEventListener('click', () => showSlide(index));
  });

  if (prev) prev.addEventListener('click', () => showSlide(activeIndex - 1));
  if (next) next.addEventListener('click', () => showSlide(activeIndex + 1));

  gallery.addEventListener('keydown', (event) => {
    if (event.target.closest('video')) return;
    if (event.key === 'ArrowLeft') showSlide(activeIndex - 1);
    if (event.key === 'ArrowRight') showSlide(activeIndex + 1);
  });

  showSlide(activeIndex);
});
