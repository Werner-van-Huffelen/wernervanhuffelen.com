/* Contrast · the one script: reveals, the scroll-led effects, the counters and the screens that step
   through their states. Everything here is decoration: without it, or for a visitor who asked for less motion,
   the page reads the same. */
(function () {
  var d = document, reduce = false;
  try { reduce = matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { /* keep moving */ }
  var $ = function (s, c) { return [].slice.call((c || d).querySelectorAll(s)); };
  var clamp = function (v) { return v < 0 ? 0 : v > 1 ? 1 : v; };

  /* 1. reveal once, when a block comes into view */
  var watched = $('[data-in], .stage, .cells, .marq, .xp');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { threshold: 0.1, rootMargin: '0px 0px -5% 0px' });
    watched.forEach(function (el) { io.observe(el); });
  } else watched.forEach(function (el) { el.classList.add('in'); });

  /* 2. (Berlin's time in the nav: taken out 2026-11-15, Werner: "feels a bit gimmicky") */

  /* 2a. light and dark (2026-11-15, Werner: "create a dark mode version"). The page follows the system's setting until
     the nav's button is pressed; the pick is kept for later visits (the script in the head applies it before the first
     paint). Where the browser can, the switch is the hero's wave (Werner, later that day: "the ripple effect from the
     hero when you switch"): the new colours arrive square by square on the hero's grid, from the button outwards,
     with a band of lit squares at the front (css: html.theming, .tw). It was a plain circle at first */
  (function () {
    var btn = d.querySelector('.mode'), r = d.documentElement, mq = null;
    if (!btn) return;
    try { mq = matchMedia('(prefers-color-scheme: dark)'); } catch (e) { /* no system setting: light */ }
    var dark = function () { var t = r.getAttribute('data-theme'); return t ? t === 'dark' : !!(mq && mq.matches); };
    var sync = function () {
      var on = dark();
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      $('meta[name="theme-color"]').forEach(function (m) { m.content = on ? '#100e14' : '#f1f0f3'; });
    };
    sync();
    if (mq && mq.addEventListener) mq.addEventListener('change', sync);
    /* the grid the wave runs on: the hero's own where there is one (its squares and lines, so the wave lands on them),
       otherwise the same squares (1/32 of the width between the margins, 1/16 on a phone) from the left margin */
    var lattice = function () {
      var g = d.querySelector('.cx-1 .grid'), W = r.clientWidth, s, gr, m;
      if (g) {
        s = parseFloat(getComputedStyle(g).backgroundSize); gr = g.getBoundingClientRect(); m = parseFloat(getComputedStyle(g.closest('.cx-1')).paddingLeft);
        if (s > 0) return { c: s, x0: gr.left + m, y0: gr.top + 1200 };
      }
      m = parseFloat(getComputedStyle(d.querySelector('.foot') || d.body).paddingLeft) || 16;
      s = (W - 2 * m) / (W <= 760 ? 16 : 32);
      return { c: s, x0: m, y0: -(scrollY % s) };
    };
    var DUR = 1150, DEEP = 6, wave = 0;                                     /* the switch's length (ms), and the lit band's depth in squares */
    var ease = function (t) { return 1 - (1 - t) * (1 - t); };
    btn.addEventListener('click', function () {
      var to = dark() ? 'light' : 'dark', me = ++wave, cv = null;
      var apply = function () {
        r.setAttribute('data-theme', to); try { localStorage.setItem('theme', to); } catch (e) { /* not kept */ } sync();
        if (cv) d.body.appendChild(cv);
      };
      if (reduce || !d.startViewTransition) { apply(); return; }
      var L = lattice(), c = L.c, W = r.clientWidth, H = innerHeight, b = btn.getBoundingClientRect();
      var ox = b.left + b.width / 2, oy = b.top + b.height / 2, B = DEEP * c;
      var far = Math.sqrt(Math.pow(Math.max(ox, W - ox), 2) + Math.pow(Math.max(oy, H - oy), 2)) + c, end = far + B;
      var i0 = Math.floor(-L.x0 / c) - 1, i1 = Math.ceil((W - L.x0) / c), j0 = Math.floor(-L.y0 / c) - 1, j1 = Math.ceil((H - L.y0) / c);
      /* what has turned at reach R: on each row of squares, the run whose middles are within R of the button (one run a
         row, as a circle crosses a row once), as a path of rectangles */
      var turned = function (R) {
        var p = '', j, y, dy, h, a, z;
        for (j = j0; j <= j1; j++) {
          y = L.y0 + j * c; dy = y + c / 2 - oy;
          if (Math.abs(dy) >= R) continue;
          h = Math.sqrt(R * R - dy * dy);
          a = Math.ceil((ox - h - L.x0 - c / 2) / c); z = Math.floor((ox + h - L.x0 - c / 2) / c);
          if (z < a) continue;
          p += 'M' + (L.x0 + a * c).toFixed(1) + ' ' + y.toFixed(1) + 'h' + ((z - a + 1) * c).toFixed(1) + 'v' + c.toFixed(1) + 'h' + (-(z - a + 1) * c).toFixed(1) + 'Z';
        }
        return 'path("' + (p || 'M0 0Z') + '")';
      };
      var frames = [], n = Math.ceil(DUR / 16), k;
      for (k = 0; k <= n; k++) frames.push({ offset: k / n, clipPath: turned(ease(k / n) * end), easing: 'step-end' });
      /* the lit band, drawn as on the hero (js/heroes.js): a soft light under the front, and each square it has passed
         comes up violet and fades over the band's depth */
      cv = d.createElement('canvas');
      var cx = cv.getContext && cv.getContext('2d'), dpr = Math.min(window.devicePixelRatio || 1, 2);
      cv.className = 'tw'; cv.setAttribute('aria-hidden', 'true');
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); cv.style.width = W + 'px'; cv.style.height = H + 'px';
      var t0 = 0, drop = function () { if (cv.parentNode) cv.parentNode.removeChild(cv); };
      var draw = function (now) {
        if (me !== wave || !cx) { drop(); return; }
        if (!t0) t0 = now;
        var t = Math.min(1, (now - t0) / DUR), R = ease(t) * end, i, j, x, y, dist, u, al, g;
        cx.setTransform(dpr, 0, 0, dpr, 0, 0); cx.globalAlpha = 1; cx.clearRect(0, 0, W, H);
        g = cx.createRadialGradient(ox, oy, Math.max(0, R - B), ox, oy, R + c);
        g.addColorStop(0, 'rgba(124,107,255,0)'); g.addColorStop(0.74, 'rgba(124,107,255,.16)'); g.addColorStop(1, 'rgba(124,107,255,0)');
        cx.fillStyle = g; cx.fillRect(0, 0, W, H);
        for (j = j0; j <= j1; j++) for (i = i0; i <= i1; i++) {
          x = L.x0 + i * c; y = L.y0 + j * c;
          dist = Math.sqrt((x + c / 2 - ox) * (x + c / 2 - ox) + (y + c / 2 - oy) * (y + c / 2 - oy));
          u = (R - dist) / B;
          if (u <= 0 || u >= 1) continue;
          al = u < 0.12 ? u / 0.12 : Math.pow(1 - (u - 0.12) / 0.88, 1.6);
          cx.globalAlpha = al;
          cx.fillStyle = 'rgba(124,107,255,.2)'; cx.fillRect(x, y, c, c);
          cx.strokeStyle = 'rgba(124,107,255,.6)'; cx.strokeRect(x + 0.5, y + 0.5, c - 1, c - 1);
        }
        if (t < 1) requestAnimationFrame(draw); else drop();
      };
      r.classList.add('theming');
      var vt = d.startViewTransition(apply);
      vt.ready.then(function () {
        r.animate(frames, { duration: DUR, pseudoElement: '::view-transition-new(root)' });
        requestAnimationFrame(draw);
      }).catch(function () { drop(); /* skipped: the colours have changed anyway */ });
      var done = function () { if (me === wave) r.classList.remove('theming'); drop(); };
      vt.finished.then(done, done);
    });
  })();

  /* 3. led by the scroll: the nav shrinks, a statement fills in word by word, covered cards step back,
        the service nearest the middle of the screen lights up, the footer name rises */
  var nav = d.querySelector('.nav'), fills = $('[data-fill]'), cards = $('.card'), rows = $('.svc>li'), mark = d.querySelector('.mark');
  var queued = false;
  function frame() {
    queued = false;
    var vh = innerHeight;
    if (nav) nav.classList.toggle('is-small', scrollY > 120);
    fills.forEach(function (el) {
      var r = el.getBoundingClientRect(), ws = el._w || (el._w = $('.w', el));
      var n = reduce ? ws.length : Math.round(clamp((vh * 0.88 - r.top) / (vh * 0.42 + r.height * 0.7)) * ws.length);
      ws.forEach(function (w, i) { w.classList.toggle('on', i < n); });
    });
    if (!reduce) cards.forEach(function (c, i) {
      var nx = cards[i + 1]; if (!nx) return;
      var a = c.getBoundingClientRect(), b = nx.getBoundingClientRect();
      c.style.setProperty('--c', clamp(1 - (b.top - a.top) / a.height).toFixed(3));
    });
    if (rows.length) {
      var best = null, bd = 1e9, open = false;
      rows.forEach(function (r) { var b = r.getBoundingClientRect(), dist = Math.abs(b.top + b.height / 2 - vh * 0.5); if (dist < bd) { bd = dist; best = r; } if (r.classList.contains('is-open')) open = true; });
      rows.forEach(function (r) { r.classList.toggle('is-lit', !open && r === best && bd < vh * 0.42); });   /* an open skill is the lit one */
    }
    if (mark && !reduce) { var m = mark.parentNode.getBoundingClientRect(); mark.style.setProperty('--f', clamp((vh - m.top) / m.height).toFixed(3)); }   /* the footer's own box: the name's moves with it */
  }
  function onScroll() { if (!queued) { queued = true; requestAnimationFrame(frame); } }
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll);
  frame();

  /* 3a. the stack: a card's own height, for the one taller than the window (css: it then sticks by its foot) */
  if ('ResizeObserver' in window) {
    var tall = new ResizeObserver(function (es) { es.forEach(function (e) { e.target.style.setProperty('--h', e.target.offsetHeight + 'px'); }); });
    cards.forEach(function (c) { tall.observe(c); });
  }

  /* 3b. skills: one open at a time, all start closed. With a mouse a row opens when the pointer has rested on it for a
        moment (2026-11-15, Werner: "expand on hover"), and stays open until another one is entered: leaving the list
        does not close it, so text being read does not vanish. A tap opens or closes a row as before, and so does the
        keyboard. A mouse click only opens: it does not undo what the hover has just done. While rows are moving (the
        others slide as one closes and one opens) the pointer is ignored, so they cannot set one another off. */
  var canHover = false, quiet = 0;
  try { canHover = matchMedia('(hover: hover) and (pointer: fine)').matches; } catch (e) { /* touch only */ }
  function openRow(li, open) {
    rows.forEach(function (o) {
      var on = o === li && open, h = o.querySelector('.head');
      o.classList.toggle('is-open', on); if (h) h.setAttribute('aria-expanded', String(on));
    });
    quiet = Date.now() + 750;
    frame();
  }
  rows.forEach(function (li) {
    var b = li.querySelector('.head'), wait = 0;
    if (!b) return;
    b.addEventListener('click', function (e) {
      if (canHover && e.detail > 0) { if (!li.classList.contains('is-open')) openRow(li, true); return; }
      openRow(li, !li.classList.contains('is-open'));
    });
    if (!canHover) return;
    li.addEventListener('pointermove', function (e) {
      if (e.pointerType !== 'mouse' || wait || li.classList.contains('is-open') || Date.now() < quiet) return;
      wait = setTimeout(function () { wait = 0; if (Date.now() >= quiet && li.matches(':hover')) openRow(li, true); }, 140);
    });
    li.addEventListener('pointerleave', function () { clearTimeout(wait); wait = 0; });
  });

  /* 3c. about: the bio's box is as many grid squares tall as its text needs, so that the rules around it fall on the
        grid's lines (css: --n; a square is 1/32 of the content width). Measured at its natural height, then rounded up. */
  $('.about').forEach(function (a) {
    var bio = a.querySelector('.bio'), queued = false;
    if (!bio) return;
    function snap() {
      queued = false;
      if (innerWidth < 900) { bio.style.removeProperty('--n'); return; }
      var cs = getComputedStyle(a), c = (a.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)) / 32;
      if (!(c > 0)) return;
      bio.style.setProperty('--n', '0'); bio.style.alignSelf = 'start';
      var n = Math.ceil(bio.offsetHeight / c - 0.02);
      bio.style.alignSelf = ''; bio.style.setProperty('--n', String(n));
    }
    var later = function () { if (!queued) { queued = true; requestAnimationFrame(snap); } };
    snap(); addEventListener('resize', later);
    if (d.fonts && d.fonts.ready) d.fonts.ready.then(snap);
  });

  /* 4. numbers count up to their value */
  $('[data-count]').forEach(function (el) {
    var to = +el.getAttribute('data-count');
    if (reduce || !('IntersectionObserver' in window)) return;
    el.textContent = '0';
    new IntersectionObserver(function (es, o) {
      if (!es[0].isIntersecting) return;
      o.disconnect();
      var t0 = performance.now(), dur = 1300;
      (function step(t) { var p = clamp((t - t0) / dur), e = 1 - Math.pow(1 - p, 4); el.textContent = Math.round(to * e); if (p < 1) requestAnimationFrame(step); })(t0);
    }, { threshold: 0.6 }).observe(el);
  });

  /* 5. a screen fades in when it arrives; a cell with several states steps through them while in view, and its
        caption lets you pick one (which stops the stepping) */
  $('.frame img').forEach(function (img) {
    if (img.complete) return;
    var done = function () { img.classList.remove('is-loading'); };
    img.classList.add('is-loading'); img.addEventListener('load', done); img.addEventListener('error', done);
  });
  /* a case page's back button (2026-11-15): opened from the homepage, it goes back in the history, so the homepage is
     where it was left; otherwise (a link from outside, or from another case) it follows its link to the case's card */
  $('.back').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var r = null;
      try { r = d.referrer ? new URL(d.referrer) : null; } catch (x) { r = null; }
      if (r && r.origin === location.origin && /(\/|index\.html)$/.test(r.pathname) && history.length > 1) { e.preventDefault(); history.back(); }
    });
  });
  /* a card's cover comes in when the card does (css: .f-cover.in) */
  var covers = $('.f-cover');
  if ('IntersectionObserver' in window) {
    var cio = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); cio.unobserve(e.target); } });
    }, { threshold: 0.45 });
    covers.forEach(function (c) { cio.observe(c); });
  } else covers.forEach(function (c) { c.classList.add('in'); });
  var HOLD = 3000;
  $('[data-flip]').forEach(function (el, n) {
    var frames = $('.frame', el), picks = $('.cap [data-i]', el), step = el.querySelector('.cap [data-step]');
    var i = 0, timer = 0, seen = false, held = false, hold = HOLD;
    function show(k) {
      i = (k + frames.length) % frames.length;
      frames.forEach(function (f, j) { f.classList.toggle('is-on', j === i); });
      picks.forEach(function (b, j) { b.setAttribute('aria-pressed', String(j === i)); });
      if (step) step.textContent = (i + 1) + ' / ' + frames.length;
    }
    function tick() { var img = frames[(i + 1) % frames.length].querySelector('img'); if (!img || img.complete) show(i + 1); }
    function stop() { clearTimeout(timer); timer = 0; }
    function play() {
      if (reduce || held || timer || !seen || d.hidden) return;
      timer = setTimeout(function next() { tick(); timer = setTimeout(next, hold); }, Math.max(700, hold - 900) + (n % 3) * (hold / 5));
    }
    picks.forEach(function (b, j) { b.addEventListener('click', function () { held = true; stop(); show(j); }); });
    if (step) step.addEventListener('click', function () { held = true; stop(); show(i + 1); });
    if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { seen = es[es.length - 1].isIntersecting; if (seen) play(); else stop(); }, { threshold: 0.4 }).observe(el);
    d.addEventListener('visibilitychange', function () { if (d.hidden) stop(); else play(); });
  });

  /* A case page's pictures open large (2026-11-15, Werner: "enlarge the images on the case study pages when you click
     on them, lightbox type view"). Every screen on the page (the cover, the screens up top, the decisions' pictures,
     More screens) is a button; it opens the picture at its full size in a dark layer, with its caption. The arrows
     (and the arrow keys) step through all the page's pictures, the states of a stepping screen included; Esc, the
     cross or a click beside the picture closes it. It shows the smaller copy at once and swaps in the full one. */
  (function () {
    if (!d.querySelector('.chero') || !window.HTMLDialogElement) return;
    var SVG = function (p) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' + p + '"/></svg>'; };
    var items = $('main .mat img[data-full]').map(function (img) {
      var fig = img.closest('figure'), frame = img.closest('.frame'), frames = frame ? $('.frame', frame.parentNode) : [], j = frames.indexOf(frame);
      var pick = fig && j >= 0 ? fig.querySelector('.cap [data-i="' + j + '"]') : null, span = fig && fig.querySelector('.cap > span');
      var dec = img.closest('.dec'), h = dec && dec.querySelector('h3');
      var cap = (pick && pick.textContent) || (span && span.textContent) || (h && h.textContent) || '';
      return { img: img, frame: frame, mat: img.closest('.mat'), full: img.getAttribute('data-full'), bg: img.getAttribute('data-bg'), alt: img.alt, cap: cap.trim() };
    });
    if (!items.length) return;
    var box = d.createElement('dialog'), cur = -1, last = null;
    box.className = 'lb';
    box.setAttribute('aria-label', 'Enlarged picture');
    box.innerHTML = '<figure><img alt="" decoding="async"><figcaption class="mono"></figcaption></figure>' +
      '<button type="button" class="lb-x" aria-label="Close">' + SVG('M6 6l12 12M18 6L6 18') + '</button>' +
      (items.length > 1 ? '<button type="button" class="lb-p" aria-label="Previous picture">' + SVG('M20 12H4M11 5l-7 7 7 7') + '</button><button type="button" class="lb-n" aria-label="Next picture">' + SVG('M4 12h16M13 5l7 7-7 7') + '</button>' : '');
    d.body.appendChild(box);
    var im = box.querySelector('img'), fc = box.querySelector('figcaption'), count = function (k) { return items.length > 1 ? (k + 1) + ' / ' + items.length : ''; };
    function show(k) {
      cur = (k + items.length) % items.length;
      var t = items[cur], thumb = t.img.currentSrc || '';
      im.classList.remove('lb-in'); void im.offsetWidth; im.classList.add('lb-in');
      im.src = thumb || t.full; im.alt = t.alt; im.style.background = t.bg || ''; im.classList.toggle('pad', !!t.bg);   /* a cut-out on its panel's colour */
      fc.textContent = [t.cap, count(cur)].filter(Boolean).join('   ');
      if (thumb && thumb.indexOf(t.full) < 0) { var f = new Image(); f.onload = function () { if (items[cur] === t) im.src = t.full; }; f.src = t.full; }
      var p = items[(cur + 1) % items.length]; if (p) { var q = new Image(); q.src = p.full; }   /* the next one, ready */
    }
    function open(k) { last = d.activeElement; d.documentElement.classList.add('lb-open'); if (!box.open) box.showModal(); show(k); }
    function close() { if (box.open) box.close(); }
    box.addEventListener('close', function () { d.documentElement.classList.remove('lb-open'); im.removeAttribute('src'); if (last && last.focus) last.focus(); });
    box.addEventListener('click', function (e) {
      var b = e.target.closest('button');
      if (b && b.classList.contains('lb-p')) show(cur - 1);
      else if (b && b.classList.contains('lb-n')) show(cur + 1);
      else if (b || e.target !== im) close();
    });
    box.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); show(cur + 1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); show(cur - 1); }
      else if (e.key === 'Escape') { e.preventDefault(); close(); }          /* the dialog's own Esc, made sure of */
    });
    /* each picture's frame becomes the button; a stepping screen opens on the state it shows */
    var mats = [];
    items.forEach(function (t) { if (mats.indexOf(t.mat) < 0) mats.push(t.mat); });
    mats.forEach(function (m) {
      var mine = items.filter(function (t) { return t.mat === m; });
      m.classList.add('zoom'); m.tabIndex = 0; m.setAttribute('role', 'button');
      m.setAttribute('aria-label', 'Enlarge: ' + (mine[0].cap || mine[0].alt || 'picture'));
      var go = function () { var on = mine.filter(function (t) { return !t.frame || t.frame.classList.contains('is-on'); })[0] || mine[0]; open(items.indexOf(on)); };
      m.addEventListener('click', go);
      m.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
    });
  })();

  /* The laptop covers' screens turn to face you (2026-11-15, Werner: "an interaction on the selection where the mac
     screens rotate and are seen from front entirely"). On a card with a laptop (GALVANY, Juno, ClimatePartner) the
     screen's own picture, seen from the front (assets/make-screens.mjs), lies exactly over the laptop's screen. With the
     pointer on the card it turns, corner by corner, until it faces you flat and whole, and the laptop fades back
     behind it; off the card it turns back and lies down on the laptop again. GALVANY's two screens end side by side.
     A mouse only (a tap opens the case), and not with reduced motion. */
  (function () {
    var fine = false;
    try { fine = matchMedia('(hover: hover) and (pointer: fine)').matches; } catch (e) { /* no hover */ }
    if (reduce || !fine) return;
    var BASE = 1000, TURN = 650;                                            /* the picture's own width in px, and ms for a whole turn */
    function hom(w, h, quad) {                                              /* the rectangle w by h onto the quad TL, TR, BR, BL */
      var src = [[0, 0], [w, 0], [w, h], [0, h]], A = [], B = [], c, r, k, p, f, t;
      for (k = 0; k < 4; k++) { var x = src[k][0], y = src[k][1], u = quad[k][0], v = quad[k][1]; A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]); B.push(u); A.push([0, 0, 0, x, y, 1, -v * x, -v * y]); B.push(v); }
      for (c = 0; c < 8; c++) {
        for (p = c, r = c + 1; r < 8; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
        t = A[c]; A[c] = A[p]; A[p] = t; t = B[c]; B[c] = B[p]; B[p] = t;
        for (r = 0; r < 8; r++) if (r !== c) { f = A[r][c] / A[c][c]; for (k = c; k < 8; k++) A[r][k] -= f * A[c][k]; B[r] -= f * B[c]; }
      }
      return B.map(function (v, i) { return v / A[i][i]; }).concat(1);
    }
    function m3d(H) { return 'matrix3d(' + [H[0], H[3], 0, H[6], H[1], H[4], 0, H[7], 0, 0, 1, 0, H[2], H[5], 0, H[8]].map(function (v) { return +v.toFixed(9); }).join(',') + ')'; }
    $('.card .mat[data-screens]').forEach(function (mat) {
      var card = mat.closest('.card'), frame = mat.querySelector('.frame'), cover = frame && frame.querySelector('img'), data;
      try { data = JSON.parse(mat.getAttribute('data-screens')); } catch (e) { return; }
      if (!card || !cover) return;
      var layer = d.createElement('div'), els = [], k = 0, goal = 0, raf = 0, last = 0;
      layer.className = 'turn'; layer.setAttribute('aria-hidden', 'true'); mat.appendChild(layer);
      function make() {                                                     /* the pictures, once the card is near */
        if (els.length) return;
        els = data.s.map(function (s) { var e = d.createElement('img'); e.alt = ''; e.decoding = 'async'; e.src = s.src; e.style.width = BASE + 'px'; e.style.height = (BASE / s.ar) + 'px'; layer.appendChild(e); return e; });
      }
      if ('IntersectionObserver' in window) { var io = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { make(); io.disconnect(); } }, { rootMargin: '300px' }); io.observe(mat); } else make();
      function rest(s) { var sc = cover.offsetWidth / data.cw, x0 = cover.offsetLeft, y0 = cover.offsetTop; return s.q.map(function (p) { return [x0 + p[0] * sc, y0 + p[1] * sc]; }); }
      function front(i, s) {                                                /* where it ends: centred, or side by side for two */
        var W = mat.clientWidth, H = mat.clientHeight, n = data.s.length, w, cx = W / 2, cy = H / 2;
        if (n === 1) w = Math.min(W * 0.8, H * 0.82 * s.ar);
        else { w = Math.min(W * 0.55, H * 0.72 * s.ar); cx = W * (i ? 0.69 : 0.31); cy = H * (i ? 0.56 : 0.44); }   /* a pair, the second a little in front and lower */
        var h = w / s.ar;
        return [[cx - w / 2, cy - h / 2], [cx + w / 2, cy - h / 2], [cx + w / 2, cy + h / 2], [cx - w / 2, cy + h / 2]];
      }
      function draw() {
        var e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;   /* in and out */
        mat.style.setProperty('--k', e.toFixed(3));
        data.s.forEach(function (s, i) {
          var a = rest(s), b = front(i, s), q = a.map(function (p, j) { return [p[0] + (b[j][0] - p[0]) * e, p[1] + (b[j][1] - p[1]) * e]; });
          els[i].style.transform = m3d(hom(BASE, BASE / s.ar, q));
          els[i].style.opacity = k > 0 ? '1' : '0';
        });
      }
      function step(t) {
        var dt = last ? Math.min(64, t - last) : 16; last = t;
        k = goal > k ? Math.min(goal, k + dt / TURN) : Math.max(goal, k - dt / TURN);
        draw();
        if (k !== goal) raf = requestAnimationFrame(step); else { raf = 0; last = 0; }
      }
      function to(g) {
        if (g && (!frame.classList.contains('in') || !els.length)) return;    /* not before the cover has come in */
        goal = g;
        if (!raf && k !== goal) raf = requestAnimationFrame(step);
      }
      card.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') to(1); });
      card.addEventListener('pointerleave', function () { to(0); });
      addEventListener('resize', function () { if (k && els.length) draw(); });
      mat._turn = function (v) { make(); goal = k = v; draw(); };       /* a still at any point of the turn (for checking it) */
    });
  })();
})();
