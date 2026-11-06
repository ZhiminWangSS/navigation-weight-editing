/* Article-only enhancements; experiment and replay modules remain independent. */
(() => {
  'use strict';

  function initializeBlog() {
    const page = document.querySelector('body.blog-page');
    if (!page || page.dataset.blogInitialized === 'true') return;
    page.dataset.blogInitialized = 'true';

    const article = page.querySelector('.blog-article');
    const outline = page.querySelector('.blog-outline');
    const entries = outline
      ? Array.from(outline.querySelectorAll('.outline-link[href^="#"]'))
          .map(link => ({ link, section: document.getElementById(link.hash.slice(1)) }))
          .filter(entry => entry.section && article && article.contains(entry.section))
      : [];

    if (entries.length) {
      let pendingFrame = false;
      let currentSection = null;

      function updateOutline() {
        pendingFrame = false;
        let current = entries[0];
        // Track the heading that has passed the reading line, including long sections.
        const readingLine = Math.min(120, window.innerHeight * 0.2);
        for (const entry of entries) {
          if (entry.section.getBoundingClientRect().top <= readingLine) current = entry;
        }
        const root = document.documentElement;
        if (root.scrollHeight > window.innerHeight &&
            window.scrollY + window.innerHeight >= root.scrollHeight - 3) {
          current = entries[entries.length - 1];
        }
        if (currentSection === current.section) return;
        currentSection = current.section;
        for (const entry of entries) {
          const active = entry === current;
          entry.link.classList.toggle('is-current', active);
          if (active) entry.link.setAttribute('aria-current', 'location');
          else entry.link.removeAttribute('aria-current');
        }
      }

      function scheduleOutlineUpdate() {
        if (pendingFrame) return;
        pendingFrame = true;
        window.requestAnimationFrame(updateOutline);
      }

      window.addEventListener('scroll', scheduleOutlineUpdate, { passive: true });
      window.addEventListener('resize', scheduleOutlineUpdate, { passive: true });
      window.addEventListener('hashchange', scheduleOutlineUpdate);
      window.addEventListener('pageshow', scheduleOutlineUpdate);
      if ('ResizeObserver' in window) {
        new ResizeObserver(scheduleOutlineUpdate).observe(article);
      }
      updateOutline();
    }

    if (!article) return;
    for (const button of article.querySelectorAll('button[data-copy-bibtex]')) {
      const card = button.closest('.citation-card') || article;
      let status = card.querySelector('[data-copy-status]');
      if (!status) {
        status = document.createElement('p');
        status.setAttribute('data-copy-status', '');
        card.appendChild(status);
      }
      status.setAttribute('role', 'status');
      status.setAttribute('aria-live', 'polite');
      status.setAttribute('aria-atomic', 'true');

      button.addEventListener('click', async () => {
        const source = document.getElementById(button.dataset.copyBibtex);
        if (!source || !article.contains(source) || !source.textContent.trim()) {
          status.textContent = 'The citation text is unavailable. Please use the download link.';
          return;
        }

        // Reading the visible citation does not require the Clipboard API or HTTPS.
        const citation = source.textContent.trim();
        button.disabled = true;
        let copied = false;
        try {
          if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
            await navigator.clipboard.writeText(citation);
            copied = true;
          }
        } catch (_) {
          // Permission denial and insecure contexts share the manual-copy fallback.
        } finally {
          button.disabled = false;
        }

        if (copied) {
          button.dataset.copyState = 'copied';
          status.textContent = 'BibTeX copied to your clipboard.';
          return;
        }

        let selected = false;
        try {
          const selection = window.getSelection();
          if (selection) {
            const range = document.createRange();
            range.selectNodeContents(source);
            selection.removeAllRanges();
            selection.addRange(range);
            selected = true;
          }
        } catch (_) {
          // The complete citation and its download link stay available without selection.
        }
        button.dataset.copyState = 'manual';
        status.textContent = selected
          ? 'Automatic copy is unavailable. Citation selected: press Ctrl+C or ⌘C to copy, or use the download link.'
          : 'Automatic copy is unavailable. Select and copy the citation below, or use the download link.';
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeBlog, { once: true });
  } else {
    initializeBlog();
  }
})();
