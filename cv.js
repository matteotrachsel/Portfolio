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

  /* ---- Interactive hero dot field (same mesh as the portfolio) -------- */
  (function dotField() {
    var canvas = document.getElementById('dotField');
    if (!canvas) return;
    var hero = canvas.parentElement;
    var ctx = canvas.getContext('2d');
    var dpr = Math.min(window.devicePixelRatio || 1, 2);

    // Refined near-monochrome palette: a single sage accent + soft neutrals.
    var PAL = [
      [90, 154, 130],   // sage-dark accent
      [124, 184, 160],  // sage
      [120, 128, 128],  // warm grey
      [150, 158, 156]   // light grey
    ];
    var INK = [45, 52, 54];

    var SPACING = 40, REPEL = 130, LINK = 150;
    var dots = [], cols = 0, rows = 0, W = 0, H = 0;
    var mouse = { x: -9999, y: -9999, active: false };
    var running = false, raf = 0;

    function build() {
      var r = hero.getBoundingClientRect();
      W = r.width; H = r.height;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cols = Math.ceil(W / SPACING) + 1;
      rows = Math.ceil(H / SPACING) + 1;
      dots = [];
      var ox = (W - (cols - 1) * SPACING) / 2;
      var oy = (H - (rows - 1) * SPACING) / 2;
      for (var iy = 0; iy < rows; iy++) {
        for (var ix = 0; ix < cols; ix++) {
          var hx = ox + ix * SPACING, hy = oy + iy * SPACING;
          dots.push({ hx: hx, hy: hy, x: hx, y: hy, col: PAL[(ix + iy * 2) % PAL.length], ph: Math.random() * Math.PI * 2, sp: 0.4 + Math.random() * 0.6 });
        }
      }
    }
    function lerp(a, b, t) { return a + (b - a) * t; }

    function draw(time) {
      raf = 0;
      ctx.clearRect(0, 0, W, H);
      var t = time * 0.001;
      for (var i = 0; i < dots.length; i++) {
        var d = dots[i];
        var tx = d.hx + Math.cos(t * d.sp + d.ph) * 3, ty = d.hy + Math.sin(t * d.sp * 0.9 + d.ph) * 3;
        if (mouse.active) {
          var vx = tx - mouse.x, vy = ty - mouse.y, dist = Math.sqrt(vx * vx + vy * vy);
          if (dist < REPEL && dist > 0.001) {
            var push = (1 - dist / REPEL), force = push * push * 26;
            tx += (vx / dist) * force; ty += (vy / dist) * force;
          }
        }
        d.x = lerp(d.x, tx, 0.18); d.y = lerp(d.y, ty, 0.18);
        d.t = 0;
        if (mouse.active) {
          var mdx = d.x - mouse.x, mdy = d.y - mouse.y, md = Math.sqrt(mdx * mdx + mdy * mdy);
          d.t = md < REPEL ? (1 - md / REPEL) : 0;
        }
      }
      if (mouse.active) {
        for (var j = 0; j < dots.length; j++) {
          var a = dots[j];
          if (a.t <= 0.05) continue;
          var right = (j % cols !== cols - 1) ? dots[j + 1] : null;
          var down = (j + cols < dots.length) ? dots[j + cols] : null;
          [right, down].forEach(function (b) {
            if (!b || b.t <= 0.05) return;
            var lx = a.x - b.x, ly = a.y - b.y, ld = Math.sqrt(lx * lx + ly * ly);
            if (ld > LINK) return;
            var alpha = Math.min(a.t, b.t) * (1 - ld / LINK) * 0.5;
            ctx.strokeStyle = 'rgba(' + a.col[0] + ',' + a.col[1] + ',' + a.col[2] + ',' + alpha.toFixed(3) + ')';
            ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          });
        }
      }
      for (var k = 0; k < dots.length; k++) {
        var p = dots[k];
        var rad = lerp(1.1, 3.4, p.t), alpha = lerp(0.16, 0.95, p.t);
        var c = [Math.round(lerp(INK[0], p.col[0], p.t)), Math.round(lerp(INK[1], p.col[1], p.t)), Math.round(lerp(INK[2], p.col[2], p.t))];
        if (p.t > 0.35) {
          ctx.beginPath();
          ctx.fillStyle = 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + (p.t * 0.12).toFixed(3) + ')';
          ctx.arc(p.x, p.y, rad * 3.2, 0, Math.PI * 2); ctx.fill();
        }
        ctx.beginPath();
        ctx.fillStyle = 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + alpha.toFixed(3) + ')';
        ctx.arc(p.x, p.y, rad, 0, Math.PI * 2); ctx.fill();
      }
      if (running) raf = requestAnimationFrame(draw);
    }
    function startField() { if (!running) { running = true; raf = requestAnimationFrame(draw); } }
    function stopField() { running = false; if (raf) cancelAnimationFrame(raf); raf = 0; }

    window.addEventListener('mousemove', function (e) {
      var r = canvas.getBoundingClientRect();
      mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top;
      mouse.active = mouse.y > -REPEL && mouse.y < H + REPEL;
    }, { passive: true });
    window.addEventListener('mouseout', function () { mouse.active = false; });
    window.addEventListener('touchmove', function (e) {
      if (!e.touches[0]) return;
      var r = canvas.getBoundingClientRect();
      mouse.x = e.touches[0].clientX - r.left; mouse.y = e.touches[0].clientY - r.top; mouse.active = true;
    }, { passive: true });
    window.addEventListener('touchend', function () { mouse.active = false; });

    var rsz;
    window.addEventListener('resize', function () { clearTimeout(rsz); rsz = setTimeout(build, 150); }, { passive: true });
    if ('ResizeObserver' in window) {
      var lastW = 0, lastH = 0;
      new ResizeObserver(function (entries) {
        var cr = entries[0].contentRect;
        if (Math.abs(cr.width - lastW) > 1 || Math.abs(cr.height - lastH) > 1) { lastW = cr.width; lastH = cr.height; build(); }
      }).observe(hero);
    }

    build();
    if (reduce) {
      ctx.clearRect(0, 0, W, H);
      for (var s = 0; s < dots.length; s++) { ctx.beginPath(); ctx.fillStyle = 'rgba(45,52,54,0.14)'; ctx.arc(dots[s].hx, dots[s].hy, 1.3, 0, Math.PI * 2); ctx.fill(); }
      return;
    }
    draw(performance.now());
    if (hasIO) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { e.isIntersecting ? startField() : stopField(); });
      }, { threshold: 0 });
      io.observe(hero);
    } else { startField(); }
  })();

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

  /* ---- Company logos: reveal real logo, else keep monogram ------------ */
  [].forEach.call(document.querySelectorAll('.xp-logo img'), function (img) {
    function ok() { img.parentElement.classList.add('has-logo'); }
    if (img.complete && img.naturalWidth) ok();
    else img.addEventListener('load', ok);
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
