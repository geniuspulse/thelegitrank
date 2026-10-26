// app.js — language toggle, star rating input
(function () {
  // ---------- language toggle with persistence ----------
  var NY = false;
  try { NY = localStorage.getItem('lr_lang') === 'ny'; } catch (e) {}

  function applyLang() {
    document.documentElement.lang = NY ? 'ny' : 'en';
    var btn = document.getElementById('langBtn');
    if (btn) btn.textContent = NY ? 'English' : 'Chichewa';
    document.querySelectorAll('[data-en]').forEach(function (el) {
      var t = NY ? el.getAttribute('data-ny') : el.getAttribute('data-en');
      if (t !== null) el.textContent = t;
    });
  }
  window.toggleLang = function () {
    NY = !NY;
    try { localStorage.setItem('lr_lang', NY ? 'ny' : 'en'); } catch (e) {}
    applyLang();
  };
  document.addEventListener('DOMContentLoaded', applyLang);
  var lb = document.getElementById('langBtn');
  if (lb) lb.addEventListener('click', window.toggleLang);

  // ---------- star rating input ----------
  document.addEventListener('DOMContentLoaded', function () {
    var wrap = document.querySelector('.stars-input');
    if (!wrap) return;
    var hidden = document.getElementById('ratingVal');
    function paint(v) {
      wrap.querySelectorAll('.star-btn').forEach(function (b) {
        b.classList.toggle('on', Number(b.dataset.v) <= v);
      });
    }
    wrap.querySelectorAll('.star-btn').forEach(function (btn) {
      function go() { paint(Number(btn.dataset.v)); if (hidden) hidden.value = btn.dataset.v; }
      btn.addEventListener('mouseenter', function () { paint(Number(btn.dataset.v)); });
      btn.addEventListener('mouseleave', function () { paint(Number(hidden.value)); });
      btn.addEventListener('click', go);
      // keyboard: 1-5
      btn.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
    });
  });
})();
