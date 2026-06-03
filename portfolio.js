/* =========================================================================
   Matteo Trachsel — Portfolio interactions
   ========================================================================= */
(function () {
  'use strict';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- Nav: solid on scroll ------------------------------------------- */
  var nav = document.getElementById('nav');
  function onScroll() {
    if (window.scrollY > 24) nav.classList.add('solid');
    else nav.classList.remove('solid');
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---- Scroll reveal --------------------------------------------------- */
  var revealEls = Array.prototype.slice.call(document.querySelectorAll('.reveal'));
  if (reduce || !('IntersectionObserver' in window)) {
    revealEls.forEach(function (el) { el.classList.add('in'); });
  } else {
    var ro = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); ro.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    revealEls.forEach(function (el) { ro.observe(el); });
  }

  /* ---- Count-up stats -------------------------------------------------- */
  var counters = Array.prototype.slice.call(document.querySelectorAll('[data-count]'));
  function runCount(el) {
    var target = parseInt(el.getAttribute('data-count'), 10);
    if (reduce) { el.textContent = target; return; }
    var start = performance.now(), dur = 1100;
    function tick(now) {
      var p = Math.min(1, (now - start) / dur);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * eased);
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }
  if ('IntersectionObserver' in window) {
    var co = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { runCount(e.target); co.unobserve(e.target); } });
    }, { threshold: 0.6 });
    counters.forEach(function (el) { co.observe(el); });
  } else { counters.forEach(runCount); }

  /* ---- Interactive hero dot field ------------------------------------- */
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

    var SPACING = 40;        // grid gap (px)
    var REPEL = 130;         // mouse influence radius (px)
    var LINK = 150;          // distance under which dots near cursor connect

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
          dots.push({
            hx: hx, hy: hy, x: hx, y: hy,
            col: PAL[(ix + iy * 2) % PAL.length],
            ph: Math.random() * Math.PI * 2,        // idle drift phase
            sp: 0.4 + Math.random() * 0.6           // idle drift speed
          });
        }
      }
    }

    function lerp(a, b, t) { return a + (b - a) * t; }

    function draw(time) {
      raf = 0;
      ctx.clearRect(0, 0, W, H);
      var t = time * 0.001;

      // update positions
      for (var i = 0; i < dots.length; i++) {
        var d = dots[i];
        // gentle idle drift around home
        var dx = Math.cos(t * d.sp + d.ph) * 3;
        var dy = Math.sin(t * d.sp * 0.9 + d.ph) * 3;
        var tx = d.hx + dx, ty = d.hy + dy;

        if (mouse.active) {
          var vx = tx - mouse.x, vy = ty - mouse.y;
          var dist = Math.sqrt(vx * vx + vy * vy);
          if (dist < REPEL && dist > 0.001) {
            var push = (1 - dist / REPEL);
            var force = push * push * 26;          // soft falloff
            tx += (vx / dist) * force;
            ty += (vy / dist) * force;
          }
        }
        // ease toward target
        d.x = lerp(d.x, tx, 0.18);
        d.y = lerp(d.y, ty, 0.18);

        // proximity factor 0..1 (how lit this dot is)
        d.t = 0;
        if (mouse.active) {
          var mdx = d.x - mouse.x, mdy = d.y - mouse.y;
          var md = Math.sqrt(mdx * mdx + mdy * mdy);
          d.t = md < REPEL ? (1 - md / REPEL) : 0;
        }
      }

      // connecting lines near the cursor (constellation web)
      if (mouse.active) {
        for (var j = 0; j < dots.length; j++) {
          var a = dots[j];
          if (a.t <= 0.05) continue;
          // link to right + bottom neighbours only (cheap, no doubles)
          var right = (j % cols !== cols - 1) ? dots[j + 1] : null;
          var down = (j + cols < dots.length) ? dots[j + cols] : null;
          [right, down].forEach(function (b) {
            if (!b || b.t <= 0.05) return;
            var lx = a.x - b.x, ly = a.y - b.y;
            var ld = Math.sqrt(lx * lx + ly * ly);
            if (ld > LINK) return;
            var alpha = Math.min(a.t, b.t) * (1 - ld / LINK) * 0.5;
            ctx.strokeStyle = 'rgba(' + a.col[0] + ',' + a.col[1] + ',' + a.col[2] + ',' + alpha.toFixed(3) + ')';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          });
        }
      }

      // dots
      for (var k = 0; k < dots.length; k++) {
        var p = dots[k];
        var rad = lerp(1.1, 3.4, p.t);
        var baseA = 0.16, litA = 0.95;
        var alpha = lerp(baseA, litA, p.t);
        var c = [
          Math.round(lerp(INK[0], p.col[0], p.t)),
          Math.round(lerp(INK[1], p.col[1], p.t)),
          Math.round(lerp(INK[2], p.col[2], p.t))
        ];
        // glow halo for the most-lit dots
        if (p.t > 0.35) {
          ctx.beginPath();
          ctx.fillStyle = 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + (p.t * 0.12).toFixed(3) + ')';
          ctx.arc(p.x, p.y, rad * 3.2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.beginPath();
        ctx.fillStyle = 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + alpha.toFixed(3) + ')';
        ctx.arc(p.x, p.y, rad, 0, Math.PI * 2);
        ctx.fill();
      }

      if (running) raf = requestAnimationFrame(draw);
    }

    function start() { if (!running) { running = true; raf = requestAnimationFrame(draw); } }
    function stop() { running = false; if (raf) cancelAnimationFrame(raf); raf = 0; }

    // pointer tracking (window-level; canvas is pointer-events:none)
    window.addEventListener('mousemove', function (e) {
      var r = canvas.getBoundingClientRect();
      mouse.x = e.clientX - r.left;
      mouse.y = e.clientY - r.top;
      mouse.active = mouse.y > -REPEL && mouse.y < H + REPEL;
    }, { passive: true });
    window.addEventListener('mouseout', function () { mouse.active = false; });
    window.addEventListener('touchmove', function (e) {
      if (!e.touches[0]) return;
      var r = canvas.getBoundingClientRect();
      mouse.x = e.touches[0].clientX - r.left;
      mouse.y = e.touches[0].clientY - r.top;
      mouse.active = true;
    }, { passive: true });
    window.addEventListener('touchend', function () { mouse.active = false; });

    var rsz;
    window.addEventListener('resize', function () {
      clearTimeout(rsz); rsz = setTimeout(build, 150);
    }, { passive: true });
    // Rebuild whenever the hero's own box changes (svh shifts, font load, etc.)
    if ('ResizeObserver' in window) {
      var lastW = 0, lastH = 0;
      new ResizeObserver(function (entries) {
        var cr = entries[0].contentRect;
        if (Math.abs(cr.width - lastW) > 1 || Math.abs(cr.height - lastH) > 1) {
          lastW = cr.width; lastH = cr.height; build();
        }
      }).observe(hero);
    }

    build();

    if (reduce) {
      // static faint grid, no animation
      ctx.clearRect(0, 0, W, H);
      for (var s = 0; s < dots.length; s++) {
        ctx.beginPath();
        ctx.fillStyle = 'rgba(45,52,54,0.14)';
        ctx.arc(dots[s].hx, dots[s].hy, 1.3, 0, Math.PI * 2);
        ctx.fill();
      }
      return;
    }

    // only animate while hero is on screen
    draw(performance.now()); // paint first frame immediately (don't wait for rAF)
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { e.isIntersecting ? start() : stop(); });
      }, { threshold: 0 });
      io.observe(hero);
    } else { start(); }
  })();

  /* ---- Lazy-load live iframe previews ---------------------------------- */
  var holders = Array.prototype.slice.call(document.querySelectorAll('.frame-holder'));
  function loadFrame(holder) {
    if (holder.dataset.loadStarted) return;
    holder.dataset.loadStarted = '1';
    var src = holder.getAttribute('data-src');
    var iframe = document.createElement('iframe');
    iframe.setAttribute('loading', 'lazy');
    iframe.setAttribute('title', 'Live preview');
    iframe.setAttribute('referrerpolicy', 'no-referrer');
    iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms allow-popups');
    var loaded = false;
    iframe.addEventListener('load', function () { loaded = true; holder.classList.add('loaded'); });
    // Fallback: if it never fires load (blocked), keep the poster as the visual.
    setTimeout(function () { if (!loaded) holder.classList.add('loaded'); }, 4200);
    iframe.src = src;
    holder.insertBefore(iframe, holder.firstChild);
    fitFrame(holder, iframe);
  }
  // Render some apps at a logical desktop/phone width, scaled to fit the frame.
  function fitFrame(holder, iframe) {
    var w = parseFloat(holder.getAttribute('data-w'));
    if (!w) return; // no data-w → iframe simply fills 100%
    iframe.style.transformOrigin = 'top left';
    function size() {
      var cw = holder.clientWidth, ch = holder.clientHeight;
      if (!cw || !ch) return;
      var scale = cw / w;
      iframe.style.width = w + 'px';
      iframe.style.height = Math.ceil(ch / scale) + 'px';
      iframe.style.transform = 'scale(' + scale + ')';
    }
    size();
    if ('ResizeObserver' in window) { new ResizeObserver(size).observe(holder); }
    else { window.addEventListener('resize', size); }
  }
  if ('IntersectionObserver' in window) {
    var fo = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { loadFrame(e.target); fo.unobserve(e.target); }
      });
    }, { rootMargin: '300px 0px' });
    holders.forEach(function (h) { fo.observe(h); });
  } else {
    holders.forEach(loadFrame);
  }

  /* ---- Click-to-interact (prevents scroll trap) ------------------------ */
  holders.forEach(function (holder) {
    var shield = holder.querySelector('.click-shield');
    if (!shield) return;
    shield.addEventListener('click', function () {
      loadFrame(holder);
      holder.classList.add('live');
    });
  });
  // Releasing focus when clicking elsewhere re-arms the shield for safer scrolling
  document.addEventListener('click', function (e) {
    holders.forEach(function (holder) {
      if (holder.classList.contains('live') && !holder.contains(e.target)) {
        holder.classList.remove('live');
      }
    });
  });

  /* ---- Process loop: rotate active node + arc on scroll/timer ---------- */
  var loop = document.getElementById('loop');
  if (loop) {
    var nodes = loop.querySelectorAll('.node');
    var steps = document.querySelectorAll('.loop-steps .ls');
    var arc = document.getElementById('loop-arc');
    var circ = 2 * Math.PI * 150; // r=150
    var cur = 0, timer = null;
    function setStep(i) {
      cur = i % 3;
      nodes.forEach(function (n, idx) { n.classList.toggle('active', idx === cur); });
      steps.forEach(function (s, idx) { s.classList.toggle('active', idx === cur); });
      if (arc && !reduce) {
        // arc sweeps to the active node (each node 120deg apart)
        var seg = circ / 3;
        arc.style.transition = 'stroke-dasharray .7s cubic-bezier(.6,0,.2,1)';
        arc.setAttribute('stroke-dasharray', (seg * (cur + 1)) + ' ' + circ);
      }
    }
    setStep(0);
    function startLoop() { if (timer || reduce) return; timer = setInterval(function () { setStep(cur + 1); }, 2400); }
    function stopLoop() { clearInterval(timer); timer = null; }
    if ('IntersectionObserver' in window) {
      var lo = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { if (e.isIntersecting) startLoop(); else stopLoop(); });
      }, { threshold: 0.4 });
      lo.observe(loop);
    } else { startLoop(); }
    // let users scrub by hovering steps
    steps.forEach(function (s, idx) {
      s.addEventListener('mouseenter', function () { stopLoop(); setStep(idx); });
      s.addEventListener('mouseleave', function () { startLoop(); });
    });
  }

  /* ---- Active nav link highlight -------------------------------------- */
  var sections = ['thesis', 'work', 'process', 'contact']
    .map(function (id) { return document.getElementById(id); })
    .filter(Boolean);
  var navLinks = {};
  document.querySelectorAll('.nav .links a[href^="#"]').forEach(function (a) {
    navLinks[a.getAttribute('href').slice(1)] = a;
  });
  if ('IntersectionObserver' in window && sections.length) {
    var so = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        var link = navLinks[e.target.id];
        if (link && e.isIntersecting) {
          Object.keys(navLinks).forEach(function (k) { navLinks[k].style.color = ''; });
          link.style.color = 'var(--ink)';
        }
      });
    }, { threshold: 0.5 });
    sections.forEach(function (s) { so.observe(s); });
  }

  /* ===================================================================== *
   *  EXTRA SCROLL MOTION
   * ===================================================================== */

  /* ---- Scroll progress bar -------------------------------------------- */
  var bar = document.getElementById('scrollProgress');

  /* ---- Per-word headline reveal --------------------------------------- */
  // Split designated headings into word spans without breaking inline markup
  // (handles nested elements like <span class="em">). Then reveal on scroll.
  function splitWords(el) {
    var words = [];
    (function walk(node, inEm) {
      Array.prototype.slice.call(node.childNodes).forEach(function (child) {
        if (child.nodeType === 3) { // text
          var parts = child.textContent.split(/(\s+)/);
          var frag = document.createDocumentFragment();
          parts.forEach(function (p) {
            if (p === '') return;
            if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(p)); return; }
            var w = document.createElement('span');
            w.className = 'word' + (inEm ? ' em' : '');
            var inner = document.createElement('span');
            inner.textContent = p;
            w.appendChild(inner);
            frag.appendChild(w);
            words.push(w);
          });
          node.replaceChild(frag, child);
        } else if (child.nodeType === 1) {
          walk(child, inEm || child.classList.contains('em'));
        }
      });
    })(el, false);
    return words;
  }

  if (!reduce) {
    document.querySelectorAll('.split, .sec-head h2, .contact h2').forEach(function (h) {
      var words = splitWords(h);
      words.forEach(function (w, i) {
        w.querySelector('span').style.transitionDelay = (i * 0.05) + 's';
      });
      if ('IntersectionObserver' in window) {
        var wo = new IntersectionObserver(function (entries) {
          entries.forEach(function (e) {
            if (e.isIntersecting) {
              words.forEach(function (w) { w.classList.add('in'); });
              wo.disconnect();
            }
          });
        }, { threshold: 0.3 });
        wo.observe(h);
      } else { words.forEach(function (w) { w.classList.add('in'); }); }
    });
  }

  /* ---- Auto-stagger groups -------------------------------------------- */
  if (!reduce && 'IntersectionObserver' in window) {
    var stg = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var kids = e.target.children;
        for (var i = 0; i < kids.length; i++) {
          kids[i].style.transitionDelay = (i * 0.09) + 's';
        }
        e.target.classList.add('in');
        stg.unobserve(e.target);
      });
    }, { threshold: 0.18 });
    document.querySelectorAll('[data-stagger]').forEach(function (g) { stg.observe(g); });
  }

  /* ---- Directional reveals for feature rows --------------------------- */
  // copy slides from the inner side, device drifts up — assigned by layout.
  Array.prototype.slice.call(document.querySelectorAll('.feature')).forEach(function (f) {
    var copy = f.querySelector('.f-copy');
    var prev = f.querySelector('.preview');
    var flipped = f.classList.contains('flip');
    if (copy) copy.classList.add(flipped ? 'from-right' : 'from-left');
    if (prev) prev.setAttribute('data-parallax', '0.06');
  });

  /* ---- rAF scroll loop: parallax + progress + hero fade --------------- */
  var parallaxEls = Array.prototype.slice.call(document.querySelectorAll('[data-parallax]'));
  var driftEls = Array.prototype.slice.call(document.querySelectorAll('[data-drift]'));
  var heroInner = document.querySelector('.hero .wrap');
  var heroEl = document.querySelector('.hero');
  var vh = window.innerHeight;
  window.addEventListener('resize', function () { vh = window.innerHeight; }, { passive: true });

  /* ---- Geometry backstop for reveals (IO-independent) ----------------- */
  // Some environments (unpainted/background iframes) never fire IO callbacks.
  // This checks bounding rects directly so content is never stuck hidden.
  var revealTargets = Array.prototype.slice.call(document.querySelectorAll('.reveal'));
  var staggerTargets = Array.prototype.slice.call(document.querySelectorAll('[data-stagger]'));
  var wordHeads = Array.prototype.slice.call(document.querySelectorAll('.split, .sec-head h2, .contact h2'));
  function inView(el, frac) {
    var r = el.getBoundingClientRect();
    if (r.height === 0 && r.width === 0) return false;
    var trigger = vh * (1 - (frac || 0.12));
    return r.top < trigger && r.bottom > 0;
  }
  function geomReveal() {
    for (var i = revealTargets.length - 1; i >= 0; i--) {
      if (inView(revealTargets[i], 0.08)) { revealTargets[i].classList.add('in'); revealTargets.splice(i, 1); }
    }
    for (var j = staggerTargets.length - 1; j >= 0; j--) {
      if (inView(staggerTargets[j], 0.12)) {
        var kids = staggerTargets[j].children;
        for (var k = 0; k < kids.length; k++) kids[k].style.transitionDelay = (k * 0.09) + 's';
        staggerTargets[j].classList.add('in'); staggerTargets.splice(j, 1);
      }
    }
    for (var w = wordHeads.length - 1; w >= 0; w--) {
      if (inView(wordHeads[w], 0.2)) {
        wordHeads[w].querySelectorAll('.word').forEach(function (el) { el.classList.add('in'); });
        wordHeads.splice(w, 1);
      }
    }
  }

  var ticking = false;
  function frame() {
    ticking = false;
    var y = window.pageYOffset || document.documentElement.scrollTop;

    // Geometry backstop: reveal anything already within viewport, in case
    // IntersectionObserver is throttled/inactive (e.g. unpainted iframe).
    geomReveal();

    // progress bar
    if (bar) {
      var max = document.documentElement.scrollHeight - vh;
      var p = max > 0 ? Math.min(1, y / max) : 0;
      bar.style.transform = 'scaleX(' + p.toFixed(4) + ')';
    }

    // hero parallax + fade out as you scroll past it
    if (heroInner && !reduce) {
      var hp = Math.min(1, y / vh);
      heroInner.style.transform = 'translateY(' + (hp * 60).toFixed(1) + 'px)';
      heroInner.style.opacity = (1 - hp * 0.85).toFixed(3);
    }

    // element parallax — translate relative to viewport center
    if (!reduce) {
      for (var i = 0; i < parallaxEls.length; i++) {
        var el = parallaxEls[i];
        var speed = parseFloat(el.getAttribute('data-parallax')) || 0.1;
        var rect = el.getBoundingClientRect();
        var center = rect.top + rect.height / 2;
        var off = (center - vh / 2);
        el.style.transform = 'translate3d(0,' + (-off * speed).toFixed(1) + 'px,0)';
      }
      // fixed-background blooms drift proportionally to scroll
      for (var j = 0; j < driftEls.length; j++) {
        var d = driftEls[j];
        var ds = parseFloat(d.getAttribute('data-drift')) || 0.05;
        d.style.transform = 'translate3d(0,' + (y * ds).toFixed(1) + 'px,0)';
      }
    }
  }
  function requestFrame() {
    if (!ticking) { ticking = true; requestAnimationFrame(frame); }
  }
  window.addEventListener('scroll', requestFrame, { passive: true });
  window.addEventListener('resize', requestFrame, { passive: true });
  // Direct (non-rAF) passes as a safety net — timers run even if rAF is throttled.
  window.addEventListener('scroll', geomReveal, { passive: true });
  [0, 200, 600, 1200].forEach(function (t) { setTimeout(geomReveal, t); });
  requestFrame();

})();
