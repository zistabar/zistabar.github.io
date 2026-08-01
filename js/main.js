/**
 * Page behaviour: theme switching and the idle "footnote" easter egg.
 */
(function () {
  'use strict';

  var IDLE_SECONDS = 30;

  // ---- Flock ------------------------------------------------------------
  var canvas = document.getElementById('flock');
  if (canvas && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    window.startBoids(canvas, { count: 90, size: 5, speed: 0.6 });
  }

  // ---- Theme ------------------------------------------------------------
  var toggle = document.getElementById('theme-toggle');

  function prefersDark() {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  function currentlyDark() {
    var explicit = document.documentElement.dataset.theme;
    if (explicit === 'dark') return true;
    if (explicit === 'light') return false;
    return prefersDark();
  }

  function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
  }

  toggle.addEventListener('click', function () {
    var next = currentlyDark() ? 'light' : 'dark';
    applyTheme(next);
    localStorage.setItem('color-theme', next);
  });

  // Pick up a theme change made on another page or in another tab.
  window.addEventListener('storage', function (event) {
    if (event.key === 'color-theme' && (event.newValue === 'light' || event.newValue === 'dark')) {
      applyTheme(event.newValue);
    }
  });

  // ---- Idle footnote ----------------------------------------------------
  var footnote = document.getElementById('footnote');
  var closeButton = document.getElementById('footnote-close');
  var lastActivity = Date.now();
  var lastX = null;
  var lastY = null;
  var dismissed = false;

  function markActive(event) {
    // ignore mousemove events that report the same coordinates
    if (event && event.type === 'mousemove') {
      if (event.clientX === lastX && event.clientY === lastY) return;
      lastX = event.clientX;
      lastY = event.clientY;
    }
    lastActivity = Date.now();
  }

  window.addEventListener('mousemove', markActive, { passive: true });
  window.addEventListener('touchstart', markActive, { passive: true });
  window.addEventListener('keydown', markActive);
  window.addEventListener('scroll', markActive, { passive: true });

  closeButton.addEventListener('click', function () {
    dismissed = true;
    footnote.hidden = true;
  });

  // Once shown, the footnote stays until it is dismissed.
  setInterval(function () {
    if (dismissed || !footnote.hidden) return;
    if (Date.now() - lastActivity >= IDLE_SECONDS * 1000) footnote.hidden = false;
  }, 500);
})();
