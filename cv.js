/* =========================================================================
   Matteo Trachsel — Interactive CV interactions
   ========================================================================= */
(function () {
  'use strict';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasIO = 'IntersectionObserver' in window;

  /* ---- Reveal on scroll ----------------------------------------------- */
  var revealEls = [].slice.call(document.querySelectorAll('.reveal'));
  if (reduce || !hasIO) {
    revealEls.forEach(function (el) { el.classList.add('in'); });
  } else {
    var ro = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); ro.unobserve(e.target); } });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    revealEls.forEach(function (el) { ro.observe(el); });
    // Safety net: never leave content hidden if IO is throttled.
    setTimeout(function () {
      revealEls.forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.top < window.innerHeight && r.bottom > 0) el.classList.add('in');
      });
    }, 1200);
  }

  /* ---- Stagger groups -------------------------------------------------- */
  function stagger(group) {
    var kids = group.children;
    for (var i = 0; i < kids.length; i++) kids[i].style.transitionDelay = (i * 0.07) + 's';
    group.classList.add('in');
  }
  var staggerEls = [].slice.call(document.querySelectorAll('[data-stagger]'));
  if (reduce || !hasIO) {
    staggerEls.forEach(stagger);
  } else {
    var so = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { stagger(e.target); so.unobserve(e.target); } });
    }, { threshold: 0.15 });
    staggerEls.forEach(function (g) { so.observe(g); });
  }

  /* ---- Skills bars ----------------------------------------------------- */
  var skills = document.getElementById('skills-list');
  if (skills) {
    if (reduce || !hasIO) { skills.classList.add('in'); }
    else {
      var sk = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { if (e.isIntersecting) { skills.classList.add('in'); sk.unobserve(e.target); } });
      }, { threshold: 0.3 });
      sk.observe(skills);
    }
  }

  /* ---- Count-up stats -------------------------------------------------- */
  function runCount(el) {
    var target = parseFloat(el.getAttribute('data-count'));
    var dec = parseInt(el.getAttribute('data-dec') || '0', 10);
    if (reduce) { el.textContent = target.toFixed(dec); return; }
    var start = performance.now(), dur = 1200;
    (function tick(now) {
      var p = Math.min(1, (now - start) / dur);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = (target * eased).toFixed(dec);
      if (p < 1) requestAnimationFrame(tick);
    })(performance.now());
  }
  var counters = [].slice.call(document.querySelectorAll('[data-count]'));
  if (hasIO) {
    var co = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { runCount(e.target); co.unobserve(e.target); } });
    }, { threshold: 0.6 });
    counters.forEach(function (el) { co.observe(el); });
  } else { counters.forEach(runCount); }

  /* ---- Scroll progress + nav state ------------------------------------ */
  var bar = document.getElementById('scrollProgress');
  var nav = document.getElementById('cvNav');
  var vh = window.innerHeight;
  window.addEventListener('resize', function () { vh = window.innerHeight; }, { passive: true });
  var ticking = false;
  function frame() {
    ticking = false;
    var y = window.pageYOffset || document.documentElement.scrollTop;
    if (nav) nav.classList.toggle('solid', y > 20);
    if (bar) {
      var max = document.documentElement.scrollHeight - vh;
      bar.style.transform = 'scaleX(' + (max > 0 ? Math.min(1, y / max).toFixed(4) : 0) + ')';
    }
  }
  window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(frame); } }, { passive: true });
  frame();

  /* ---- Active nav link ------------------------------------------------- */
  var navLinks = {};
  [].forEach.call(document.querySelectorAll('.cv-links a[href^="#"]'), function (a) {
    navLinks[a.getAttribute('href').slice(1)] = a;
  });
  if (hasIO) {
    var na = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        var link = navLinks[e.target.id];
        if (link && e.isIntersecting) {
          Object.keys(navLinks).forEach(function (k) { navLinks[k].classList.remove('active'); });
          link.classList.add('active');
        }
      });
    }, { threshold: 0.45, rootMargin: '-20% 0px -40% 0px' });
    Object.keys(navLinks).forEach(function (id) { var s = document.getElementById(id); if (s) na.observe(s); });
  }

  /* ---- Fit cards: expand/collapse ------------------------------------- */
  [].forEach.call(document.querySelectorAll('.fit-card'), function (card) {
    card.addEventListener('click', function () { card.classList.toggle('open'); });
  });

  /* ---- Experience accordion ------------------------------------------- */
  [].forEach.call(document.querySelectorAll('.xp .xp-head'), function (head) {
    head.addEventListener('click', function () { head.parentElement.classList.toggle('open'); });
  });

  /* ---- Experience theme filter ---------------------------------------- */
  var chips = [].slice.call(document.querySelectorAll('#filterBar .chip'));
  var xps = [].slice.call(document.querySelectorAll('#xpList .xp'));
  chips.forEach(function (chip) {
    chip.addEventListener('click', function () {
      chips.forEach(function (c) { c.classList.remove('active'); });
      chip.classList.add('active');
      var f = chip.getAttribute('data-filter');
      xps.forEach(function (xp) {
        var match = f === 'all' || (xp.getAttribute('data-themes') || '').indexOf(f) !== -1;
        xp.classList.toggle('hidden', !match);
      });
    });
  });

  /* ---- Print / Download PDF ------------------------------------------- */
  var printBtn = document.getElementById('printBtn');
  if (printBtn) {
    printBtn.addEventListener('click', function () {
      // expand everything so the print/PDF is complete
      [].forEach.call(document.querySelectorAll('.xp'), function (x) { x.classList.add('open'); x.classList.remove('hidden'); });
      [].forEach.call(document.querySelectorAll('.fit-card'), function (c) { c.classList.add('open'); });
      window.print();
    });
  }

})();
