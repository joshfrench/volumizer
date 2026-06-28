// theme.js — shared high-contrast theme manager
// Light + high-contrast variants live in theme.css.
// Loaded in <head> on both tool pages so theme applies before paint.
(function () {
  const KEY = 'volumizer_settings';
  function load() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } }
  function save(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {} }

  const Theme = {
    isHighContrast() { return !!load().highContrast; },
    setHighContrast(on) { const s = load(); s.highContrast = !!on; save(s); Theme.apply(); },
    apply() { document.documentElement.classList.toggle('high-contrast', Theme.isHighContrast()); }
  };

  Theme.apply();          // apply immediately to avoid flash of wrong theme
  window.Theme = Theme;
})();
