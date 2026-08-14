/* =============================================================================
   Offprint — behaviour.
   The theme is applied pre-paint by an inline script in <head>; this file only
   handles the toggle, the modals, and the contents/scrollspy machinery.
   ============================================================================= */

(function () {
  'use strict';

  var root = document.documentElement;

  /* ------------------------------- theme ------------------------------- */

  var themeToggle = document.getElementById('themeToggle');
  var userChose = false;

  function paintToggle() {
    var dark = root.getAttribute('data-theme') === 'dark';
    themeToggle.setAttribute('aria-pressed', dark ? 'true' : 'false');
    themeToggle.setAttribute('aria-label',
      dark ? 'Switch to the light theme' : 'Switch to the dark theme');
  }
  paintToggle();

  themeToggle.addEventListener('click', function () {
    var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    userChose = true;
    paintToggle();
    try { localStorage.setItem('cv-theme', next); } catch (e) { /* private mode */ }
  });

  // Follow the OS only while the visitor has expressed no preference of their
  // own — a click counts as a preference whether or not it could be persisted.
  if (window.matchMedia) {
    var mq = window.matchMedia('(prefers-color-scheme: dark)');
    var onSchemeChange = function (e) {
      var saved = null;
      try { saved = localStorage.getItem('cv-theme'); } catch (err) { /* ignore */ }
      if (saved !== 'dark' && saved !== 'light') saved = null;
      if (!saved && !userChose) {
        root.setAttribute('data-theme', e.matches ? 'dark' : 'light');
        paintToggle();
      }
    };
    if (mq.addEventListener) mq.addEventListener('change', onSchemeChange);
    else if (mq.addListener) mq.addListener(onSchemeChange);
  }

  /* ------------------------------- print ------------------------------- */

  document.getElementById('downloadPdf').addEventListener('click', function () {
    window.print();
  });

  /* ------------------------------- toast ------------------------------- */

  var toast = document.getElementById('toast');
  var toastTimer;

  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toast.classList.remove('show');
      toast.textContent = '';          // do not leave it in the a11y tree
    }, 1900);
  }

  var emailLink = document.getElementById('emailLink');
  emailLink.addEventListener('click', function (e) {
    var address = emailLink.getAttribute('href').replace('mailto:', '');
    if (!navigator.clipboard) return;           // let the mailto: proceed
    e.preventDefault();
    navigator.clipboard.writeText(address).then(
      function () { showToast('Email copied — ' + address); },
      function () { window.location.href = 'mailto:' + address; }
    );
  });

  /* ------------------------------- modals ------------------------------- */

  var FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';
  var lastFocused = null;

  // Keeps Tab inside the overlay. The PDF plugin swallows keys once focus is
  // inside the iframe, which is why the close control sits before it.
  function trap(container) {
    return function (e) {
      if (e.key !== 'Tab') return;
      var items = container.querySelectorAll(FOCUSABLE);
      if (!items.length) return;
      var first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault(); last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault(); first.focus();
      }
    };
  }

  function lockScroll(on) {
    document.body.style.overflow = on ? 'hidden' : '';
  }

  var lightbox = document.getElementById('lightbox');
  var lightboxImg = document.getElementById('lightboxImg');
  var lightboxClose = document.getElementById('lightboxClose');
  var portraitBtn = document.getElementById('portraitBtn');
  var portraitImg = document.getElementById('portraitImg');
  var trapLightbox = trap(lightbox);

  function openLightbox() {
    lastFocused = document.activeElement;
    lightboxImg.src = portraitImg.src;
    lightbox.hidden = false;
    lockScroll(true);
    lightbox.addEventListener('keydown', trapLightbox);
    lightboxClose.focus();
  }
  function closeLightbox() {
    lightbox.hidden = true;
    lightbox.removeEventListener('keydown', trapLightbox);
    lockScroll(false);
    if (lastFocused) lastFocused.focus();
  }

  portraitBtn.addEventListener('click', openLightbox);
  lightboxClose.addEventListener('click', closeLightbox);
  lightbox.addEventListener('click', function (e) {
    if (e.target === lightbox || e.target.classList.contains('lightbox-inner')) {
      closeLightbox();
    }
  });

  var pdfLightbox = document.getElementById('pdfLightbox');
  var pdfFrame = document.getElementById('pdfFrame');
  var pdfDownload = document.getElementById('pdfDownload');
  var pdfClose = document.getElementById('pdfClose');
  var trapPdf = trap(document.querySelector('.pdf-toolbar'));

  function openPdf(url) {
    lastFocused = document.activeElement;
    pdfFrame.src = url;
    pdfDownload.href = url;
    pdfLightbox.hidden = false;
    lockScroll(true);
    pdfLightbox.addEventListener('keydown', trapPdf);
    pdfClose.focus();
  }
  function closePdf() {
    pdfLightbox.hidden = true;
    pdfLightbox.removeEventListener('keydown', trapPdf);
    pdfFrame.src = '';
    lockScroll(false);
    if (lastFocused) lastFocused.focus();
  }

  Array.prototype.forEach.call(document.querySelectorAll('[data-pdf]'), function (el) {
    el.addEventListener('click', function (e) {
      e.preventDefault();
      openPdf(el.getAttribute('data-pdf'));
    });
  });
  pdfClose.addEventListener('click', closePdf);
  pdfLightbox.addEventListener('click', function (e) {
    if (e.target === pdfLightbox) closePdf();
  });

  /* --------------------------- running head --------------------------- */

  var runheadToggle = document.getElementById('runheadToggle');
  var runheadPanel = document.getElementById('runheadPanel');
  var runheadNum = document.getElementById('runheadNum');
  var runheadLabel = document.getElementById('runheadLabel');

  function closePanel() {
    runheadPanel.hidden = true;
    runheadToggle.setAttribute('aria-expanded', 'false');
  }
  function togglePanel() {
    var open = runheadToggle.getAttribute('aria-expanded') === 'true';
    runheadPanel.hidden = open;
    runheadToggle.setAttribute('aria-expanded', open ? 'false' : 'true');
  }

  runheadToggle.addEventListener('click', togglePanel);
  runheadPanel.addEventListener('click', function (e) {
    if (e.target.closest('a')) closePanel();
  });

  // Crossing back to the two-column layout must not leave a stale open panel
  // or a stale aria-expanded behind it.
  if (window.matchMedia) {
    var narrow = window.matchMedia('(max-width: 62rem)');
    var onWidth = function (e) { if (!e.matches) closePanel(); };
    if (narrow.addEventListener) narrow.addEventListener('change', onWidth);
    else if (narrow.addListener) narrow.addListener(onWidth);
  }

  /* ------------------------------ contents ------------------------------ */

  var sections = Array.prototype.slice.call(
    document.querySelectorAll('main .section[id]')
  );

  var linksById = {};
  Array.prototype.forEach.call(
    document.querySelectorAll('#toc a[href^="#"], #runheadPanel a[href^="#"]'),
    function (a) {
      var id = a.getAttribute('href').slice(1);
      (linksById[id] = linksById[id] || []).push(a);
    }
  );

  var content = document.getElementById('content');
  var TAIL = 104;                        // --s8, the resting bottom padding
  var tops = [];
  var currentId;

  function measure() {
    tops = sections.map(function (s) {
      return s.getBoundingClientRect().top + window.scrollY;
    });
  }

  // Every section must be able to scroll to the top of the viewport. Without
  // that, the document bottoms out while the last sections are still mid-screen:
  // their share of the scroll range collapses to nothing (so the highlight skips
  // them) and their anchor links become inert (clicking them moves nothing).
  //
  // Computed WITHOUT first shrinking the padding — collapsing the document even
  // for one frame yanks the reader backwards on every resize and lands deep
  // links short.
  function setRunway() {
    if (!sections.length) return;
    var pad = parseFloat(getComputedStyle(content).paddingBottom) || 0;
    var lastTop = sections[sections.length - 1].getBoundingClientRect().top + window.scrollY;
    var bottom = content.getBoundingClientRect().bottom + window.scrollY;
    var naturalTail = (bottom - pad + TAIL) - lastTop;   // tail if padding were TAIL
    var need = window.innerHeight - naturalTail;
    var px = (need > 0 ? TAIL + Math.ceil(need) : TAIL) + 'px';
    if (content.style.paddingBottom !== px) content.style.paddingBottom = px;
  }

  // Capped rather than purely proportional: on a very tall window a 32%-of-
  // viewport offset would overshoot a short section entirely, so that clicking
  // its link would land the reader on the *next* one.
  function readingOffset() {
    return Math.min(window.innerHeight * 0.32, 260);
  }

  function apply(id) {
    if (id === currentId) return;
    currentId = id;

    Object.keys(linksById).forEach(function (key) {
      var on = key === id;
      linksById[key].forEach(function (a) {
        if (on) a.setAttribute('aria-current', 'true');
        else a.removeAttribute('aria-current');
      });
    });

    sections.forEach(function (s) { s.classList.toggle('is-current', s.id === id); });

    var index = -1;
    for (var i = 0; i < sections.length; i++) {
      if (sections[i].id === id) { index = i; break; }
    }
    if (index >= 0) {
      runheadNum.textContent = (index + 1 < 10 ? '0' : '') + (index + 1);
      var heading = sections[index].querySelector('h2 span');
      runheadLabel.textContent = heading ? heading.textContent : sections[index].id;
    }
  }

  function pick() {
    if (!sections.length) return;
    var line = window.scrollY + readingOffset();
    var id = sections[0].id;   // the contents should never read as inert
    for (var i = 0; i < sections.length; i++) {
      if (tops[i] <= line) id = sections[i].id;
    }
    apply(id);
  }

  function remeasure() { setRunway(); measure(); pick(); }

  // Cheap enough to run unthrottled: pick() only compares cached offsets and
  // never touches layout. No rAF latch that could strand the highlight.
  window.addEventListener('scroll', pick, { passive: true });
  window.addEventListener('resize', remeasure);
  window.addEventListener('load', remeasure);

  // A webfont swap changes every row height after first paint; re-measure.
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(remeasure).catch(function () { /* ignore */ });
  }

  /* ------------------------------- escape ------------------------------- */
  /* Topmost layer only — one Escape must not dismiss three things at once. */

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (!pdfLightbox.hidden) { closePdf(); return; }
    if (!lightbox.hidden) { closeLightbox(); return; }
    if (runheadToggle.getAttribute('aria-expanded') === 'true') {
      closePanel();
      runheadToggle.focus();
    }
  });

  remeasure();
})();
