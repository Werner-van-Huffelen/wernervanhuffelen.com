/* Contrast · the hero alternatives' own script (heroes.html): a hero starts when it comes into view, Replay runs it
   again, the glass clears under the pointer, B's lines are drawn from where the full stop landed, D leans a little. */
(function () {
  var d = document;
  var $ = function (s, c) { return [].slice.call((c || d).querySelectorAll(s)); };
  var clamp = function (v) { return v < 0 ? 0 : v > 1 ? 1 : v; };

  /* B: the crossing sits on the full stop, measured once the words have landed */
  function cross(sec) {
    var b = sec.querySelector('.body'), s = b && b.querySelector('h1 .stop');
    if (!s) return;
    /* the word may still be on its way up: take its current offset out, so this is where the stop will rest */
    var r = s.getBoundingClientRect(), o = b.getBoundingClientRect(), ty = 0;
    try { ty = new DOMMatrix(getComputedStyle(s.parentNode).transform).m42; } catch (e) { /* no transform: already there */ }
    b.style.setProperty('--sx', (r.left + r.width / 2 - o.left).toFixed(1) + 'px');
    b.style.setProperty('--sy', (r.top + r.height / 2 - ty - o.top).toFixed(1) + 'px');
  }
  function start(sec) {
    sec.classList.add('on');
    var g = sec.querySelector('.glass');
    if (g) setTimeout(function () { g.classList.add('live'); }, 2400);      /* after the ribs have formed, they answer fast */
    if (sec.classList.contains('hx-b')) { cross(sec); setTimeout(function () { cross(sec); }, 1250); }
    if (sec._follow) sec._follow();                                        /* C1: the grid lights up along the dot's way */
  }

  var secs = $('.hx'), picks = $('.hx-pick a');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting && !e.target.classList.contains('on')) start(e.target);
        if (e.isIntersecting) picks.forEach(function (a) { if (a.getAttribute('href') === '#' + e.target.id) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current'); });
      });
    }, { threshold: 0.45 });
    secs.forEach(function (s) { io.observe(s); });
  } else secs.forEach(start);
  /* B's crossing follows the headline: when the webfont arrives or the window changes, the stop has moved */
  var bsec = d.querySelector('.hx-b');
  if (bsec) {
    var again = function () { cross(bsec); };
    if (d.fonts && d.fonts.ready) d.fonts.ready.then(again);
    if ('ResizeObserver' in window) new ResizeObserver(again).observe(bsec.querySelector('h1'));
    addEventListener('resize', again);
  }

  $('[data-replay]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var sec = btn.closest('.hx'), els = $('[data-in]', sec), g = sec.querySelector('.glass');
      sec.classList.remove('on'); els.forEach(function (e) { e.classList.remove('in'); }); if (g) g.classList.remove('live');
      void sec.offsetWidth;
      setTimeout(function () { els.forEach(function (e) { e.classList.add('in'); }); start(sec); }, 350);
    });
  });

  /* A: the ribs near the pointer straighten, so the portrait shows clear there */
  $('[data-glass]').forEach(function (g) {
    var scenes = $('.scene', g), n = scenes.length;
    g.addEventListener('pointermove', function (e) {
      var r = g.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * n;
      scenes.forEach(function (s, i) { var t = clamp(1 - Math.abs(x - (i + 0.5)) / 3.6); t = t * t * (3 - 2 * t); s.style.setProperty('--k', (0.4 + 0.6 * t).toFixed(3)); });
    });
    g.addEventListener('pointerleave', function () { scenes.forEach(function (s) { s.style.removeProperty('--k'); }); });
  });

  /* D: the line and the portrait move a few pixels against each other */
  $('[data-tilt]').forEach(function (p) {
    p.addEventListener('pointermove', function (e) { var r = p.getBoundingClientRect(); p.style.setProperty('--px', (((e.clientX - r.left) / r.width) * 2 - 1).toFixed(3)); });
    p.addEventListener('pointerleave', function () { p.style.setProperty('--px', 0); });
  });
  /* C1: a square of the grid glows and fades. Under the pointer it is the square you are on; along the timeline it is
     the pair the dot is passing between, one above the line and one below, so the dot draws a short trail of light.
     The grid is 2400px tall with the timeline at 1200px, and starts one page margin in (css/heroes-c.css) */
  $('.cx-1').forEach(function (sec) {
    var grid = sec.querySelector('.grid'), dot = sec.querySelector('.ruler .dot'), last = '', run = 0, still = false;
    if (!grid) return;
    try { still = matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { /* keep moving */ }
    function size() {                                                      /* a square: the ruler's travel (the section's content width) over --cols, as css/heroes-c.css draws it (it was read off the grid's tile, which is no longer a tile) */
      var cs = getComputedStyle(sec), m = parseFloat(cs.paddingLeft), w = sec.getBoundingClientRect().width - m - parseFloat(cs.paddingRight);
      return { c: w / (parseFloat(cs.getPropertyValue('--cols')) || 32), m: m, r: grid.getBoundingClientRect() };
    }
    function light(i, j, s) {
      var el = d.createElement('i');
      el.className = 'lit'; el.style.left = (s.m + i * s.c) + 'px'; el.style.top = (1200 + j * s.c) + 'px';
      grid.appendChild(el);
      var gone = function () { if (el.parentNode) el.parentNode.removeChild(el); };
      el.addEventListener('animationend', gone); setTimeout(gone, 1700);
    }

    /* The portrait, on the right, is unseen until squares over it light up: each such square is a tile (.px) that
       holds its own piece of the picture (css/heroes-c.css). Around the pointer the tiles form a round brush, full in
       the middle and thinner towards its rim; a tile the brush has left fades like any lit square. The portrait is n
       squares a side, from column i0, on the n rows above the timeline. */
    var who = sec.querySelector('.who'), pic = who && who.querySelector('img'), tiles = {}, held = [], map = null, n = 0, i0 = 0, gen = 0, made = false;
    var REACH = 3.4, CORE = 1.7;                                           /* the brush, in squares: its rim and its full middle */
    function wipe() { for (var k in tiles) if (tiles[k].el.parentNode) who.removeChild(tiles[k].el); tiles = {}; held = []; }
    function frame(s) {                                                    /* 0 while the portrait is not on the page, or not loaded yet */
      if (!who || !pic || still || !s.c) return 0;
      var w = who.getBoundingClientRect(), k = Math.round(w.width / s.c);
      if (!k || !pic.complete || !pic.naturalWidth) return 0;
      if (k !== n) { wipe(); n = k; map = null; who.style.setProperty('--n', n); }
      if (!map) map = cover(n);
      if (who._src !== pic.currentSrc) { who._src = pic.currentSrc; who.style.setProperty('--img', 'url("' + pic.currentSrc + '")'); }
      i0 = Math.round((w.left - s.r.left - s.m) / s.c);
      return n;
    }
    function has(x, y) { return x >= 0 && y >= 0 && x < n && y < n && map[y * n + x]; }
    function tile(x, y) {
      var k = x + ',' + y, t = tiles[k];
      if (!t) {
        var el = d.createElement('i');
        el.className = 'px'; el.style.setProperty('--x', x); el.style.setProperty('--y', y);
        who.appendChild(el); t = tiles[k] = { el: el, b: 0 }; made = true;
      }
      return t;
    }
    function show(t) {
      var o = t.b;
      if (o > 0.04) { t.el.style.setProperty('--o', o.toFixed(2)); t.el.classList.add('on'); } else t.el.classList.remove('on');
    }
    function brush(fx, fy) {                                               /* the pointer, in squares from the portrait's top left */
      var fresh = [], g = ++gen, x, y, dist, t;
      for (y = Math.max(0, Math.floor(fy - REACH)); y <= Math.min(n - 1, Math.floor(fy + REACH)); y++)
        for (x = Math.max(0, Math.floor(fx - REACH)); x <= Math.min(n - 1, Math.floor(fx + REACH)); x++) {
          dist = Math.sqrt((x + 0.5 - fx) * (x + 0.5 - fx) + (y + 0.5 - fy) * (y + 0.5 - fy));
          if (dist >= REACH || !map[y * n + x]) continue;
          t = tile(x, y); t.b = dist < CORE ? 1 : 1 - (dist - CORE) / (REACH - CORE); t.g = g; fresh.push(t);
        }
      if (made) { void who.offsetWidth; made = false; }                     /* a new tile fades in from nothing */
      held.forEach(function (o) { if (o.g !== g) { o.b = 0; show(o); } });
      fresh.forEach(show); held = fresh;
      return fresh.length;
    }
    /* which squares hold a piece of the picture: it is a cut-out, and a square of its empty surround stays a plain
       square of the grid */
    function cover(k) {
      var m = [], q = 4, x, y, u, v, any;
      try {
        var cv = d.createElement('canvas'), cx, a;
        cv.width = cv.height = k * q; cx = cv.getContext('2d'); cx.drawImage(pic, 0, 0, k * q, k * q);
        a = cx.getImageData(0, 0, k * q, k * q).data;
        for (y = 0; y < k; y++) for (x = 0; x < k; x++) {
          any = false;
          for (v = 0; v < q && !any; v++) for (u = 0; u < q; u++) if (a[((y * q + v) * k * q + x * q + u) * 4 + 3] > 40) { any = true; break; }
          m.push(any);
        }
      } catch (e) { m = []; for (x = 0; x < k * k; x++) m.push(true); }    /* no reading the picture: every square counts */
      return m;
    }
    /* The dot has landed on Shipped: a wave of light runs out from it over the whole grid, square by square, and is
       gone again (2026-11-14, Werner: a wave over the grid that shows the picture briefly, instead of holding it).
       Where the wave crosses the portrait its squares show the picture for as long as the wave is on them, which
       says the portrait is there. It is drawn on one canvas laid over the hero, behind the type like the grid (the
       wave is hundreds of squares deep: too many elements), and the canvas goes when the wave has left. */
    var DEEP = 9, STAY = 15, SPEED = 17;                                   /* the wave: its depth in squares (on the portrait it lingers: STAY), and squares a second */
    function wave(me) {
      var s = size(), ruler = grid.parentNode, cv = d.createElement('canvas'), cx = cv.getContext && cv.getContext('2d');
      if (!s.c || !cx) return;
      var sr = sec.getBoundingClientRect(), W = sr.width, H = sr.height, yl = ruler.getBoundingClientRect().top - sr.top;   /* yl: the timeline */
      var c = s.c, x0 = s.m, k = frame(s), dpr = Math.min(window.devicePixelRatio || 1, 2), src = null, nat = 0;
      var ox = W - x0, oy = yl, B = DEEP * c, far = 0;                      /* it starts where the dot rests */
      [[0, 0], [W, 0], [0, H], [W, H]].forEach(function (p) { far = Math.max(far, Math.sqrt((p[0] - ox) * (p[0] - ox) + (p[1] - oy) * (p[1] - oy))); });
      var cols = Math.round((W - 2 * x0) / c), j0 = -Math.ceil(yl / c), j1 = Math.ceil((H - yl) / c);
      var mx = 0.56 * W, mrx = 0.74 * W, mry = 720;                         /* the grid's own fade (css/heroes-c.css): the wave fades with it */
      var lav = getComputedStyle(d.documentElement).getPropertyValue('--lav').trim() || '#e2dcff';   /* the portrait's ground: light purple, or deep violet on the dark page */
      var drop = function () { if (cv.parentNode) cv.parentNode.removeChild(cv); };
      if (k) {                                                             /* the picture at the size it is shown: a square of it is then nat by nat (an <img>'s own size depends on its srcset) */
        src = d.createElement('canvas'); src.width = src.height = Math.round(k * c * dpr); nat = src.width / k;
        src.getContext('2d').drawImage(pic, 0, 0, src.width, src.height);
      }
      cv.className = 'wave'; cv.setAttribute('aria-hidden', 'true');
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      cv.style.top = (-yl - 1) + 'px'; cv.style.width = W + 'px'; cv.style.height = H + 'px';
      ruler.appendChild(cv);
      var t0 = performance.now();
      (function step(t) {
        var R = (t - t0) / 1000 * SPEED * c, i, j, x, y, dist, u, al, nx, ny, r, px, py, g;
        if (me !== run || R - B > far) { drop(); return; }
        cx.setTransform(dpr, 0, 0, dpr, 0, 0); cx.globalAlpha = 1; cx.clearRect(0, 0, W, H);
        /* a soft light under the squares, where the wave is */
        g = cx.createRadialGradient(ox, oy, Math.max(0, R - B), ox, oy, R + c);
        g.addColorStop(0, 'rgba(124,107,255,0)'); g.addColorStop(0.74, 'rgba(124,107,255,.2)'); g.addColorStop(1, 'rgba(124,107,255,0)');
        cx.fillStyle = g; cx.fillRect(0, 0, W, H);
        cx.save(); cx.globalCompositeOperation = 'destination-in'; cx.translate(mx, yl); cx.scale(mrx, mry);
        g = cx.createRadialGradient(0, 0, 0.3, 0, 0, 1); g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
        cx.fillStyle = g; cx.fillRect(-3, -3, 6, 6); cx.restore();
        /* the squares: each one comes up as the front reaches it and fades behind it */
        cx.lineWidth = 1;
        for (j = j0; j < j1; j++) for (i = -1; i <= cols; i++) {
          x = x0 + i * c; y = yl + j * c;
          dist = Math.sqrt((x + c / 2 - ox) * (x + c / 2 - ox) + (y + c / 2 - oy) * (y + c / 2 - oy));
          if (R <= dist) continue;
          px = i - i0; py = j + k;
          if (k && px >= 0 && py >= 0 && px < k && py < k && map[py * k + px]) {          /* a square of the portrait: as under the pointer */
            u = (R - dist) / (STAY * c);                                                   /* it holds a little longer, so the face is whole for a moment */
            if (u >= 1) continue;
            al = u < 0.08 ? u / 0.08 : u < 0.45 ? 1 : Math.pow(1 - (u - 0.45) / 0.55, 1.4);
            cx.globalAlpha = al;
            cx.fillStyle = lav; cx.fillRect(x, y, c, c);
            cx.drawImage(src, px * nat, py * nat, nat, nat, x, y, c, c);
            cx.fillStyle = 'rgba(124,107,255,.1)'; cx.fillRect(x, y, c, c);
            cx.strokeStyle = 'rgba(124,107,255,.34)'; cx.lineWidth = 0.5; cx.strokeRect(x + 0.25, y + 0.25, c - 0.5, c - 0.5); cx.lineWidth = 1;
          } else {                                                                         /* a square of the grid: as lit by the pointer */
            u = (R - dist) / B;
            if (u >= 1) continue;
            al = u < 0.12 ? u / 0.12 : Math.pow(1 - (u - 0.12) / 0.88, 1.6);
            nx = (x + c / 2 - mx) / mrx; ny = (y + c / 2 - yl) / mry; r = Math.sqrt(nx * nx + ny * ny);
            al *= r <= 0.3 ? 1 : 1 - (r - 0.3) / 0.7;
            if (al < 0.02) continue;
            cx.globalAlpha = al;
            cx.fillStyle = 'rgba(124,107,255,.2)'; cx.fillRect(x, y, c, c);
            cx.strokeStyle = 'rgba(124,107,255,.6)'; cx.strokeRect(x + 0.5, y + 0.5, c - 1, c - 1);
          }
        }
        requestAnimationFrame(step);
      })(t0);
    }

    sec.addEventListener('pointermove', function (e) {
      var s = size();
      if (!s.c) return;
      var gx = (e.clientX - s.r.left - s.m) / s.c, gy = (e.clientY - s.r.top - 1200) / s.c, i = Math.floor(gx), j = Math.floor(gy), key = i + ',' + j;
      var k = e.pointerType === 'touch' ? 0 : frame(s), on = false;       /* a finger does not brush the picture in: only the wave shows it */
      if (k) {
        on = brush(gx - i0, gy + k) > 0 && has(i - i0, j + k);              /* on the picture itself the brush is the light */
        who.style.setProperty('--hx', ((gx - i0) * s.c).toFixed(1) + 'px'); who.style.setProperty('--hy', ((gy + k) * s.c).toFixed(1) + 'px');
        who.classList.toggle('near', held.length > 0);
      }
      if (key === last) return;
      last = key;
      if (!on) light(i, j, s);
    });
    function rest() {                                                      /* the brush lets go of the portrait */
      last = '';
      held.forEach(function (t) { t.b = 0; show(t); }); held = [];
      if (who) who.classList.remove('near');
    }
    sec.addEventListener('pointerleave', rest);
    addEventListener('resize', rest);                                      /* the squares have moved under the pointer */
    /* The small dots. The hero's grid has pins, violet dots where two of its lines cross; they now come and go:
       five at a time, each on a crossing of its own, rising over 3s, resting a few seconds, fading out over 3s, then
       another rises somewhere else (2026-11-15, Werner: "randomly fade in and out on different quadrants, very subtle
       and slowly"). They keep off the headline, the sentence, the portrait and the timeline's own rows, and inside the
       part of the grid its mask leaves visible. With reduced motion the two fixed pins stay as they were (css). */
    if (!still) (function () {
      var seen = true, used = {}, live = [], N = 5;
      function box(el) { if (!el) return null; var r = d.createRange(); r.selectNodeContents(el); var b = r.getBoundingClientRect(); return b.width ? b : null; }
      function spot() {
        var s = size(); if (!s.c) return null;
        var sr = sec.getBoundingClientRect(), line = s.r.top + 1200, keep = [], pad = s.c * 0.55, cols = Math.floor((s.r.width - 2 * s.m) / s.c);
        /* the headline's own words (its lines are a block as wide as the page, and the rolling word's column reaches past its window) */
        var h1 = sec.querySelector('h1'), roll = h1 && h1.querySelector('.roll'), lead = h1 && h1.querySelector('span[aria-hidden]');
        var zero = lead && lead.firstChild && lead.firstChild.nodeType === 3 ? (function () { var r = d.createRange(); r.selectNodeContents(lead.firstChild); return r.getBoundingClientRect(); })() : null;
        [zero, roll && roll.getBoundingClientRect(), box(sec.querySelector('.lede'))].forEach(function (b) { if (b && b.width) keep.push(b); });
        /* the portrait: its square is mostly empty, so only where the person is (the middle for the head, the whole width for the shoulders) */
        /* (below 900px the portrait stands behind the type, unseen until the wave, so the dots may cross it: keeping
           them off it there left them almost nowhere to go, 2026-11-15) */
        var w = who && who.getBoundingClientRect(), behind = !!(window.matchMedia && matchMedia('(max-width: 899px)').matches);
        if (w && w.width && !behind) { keep.push({ left: w.left + w.width * 0.22, right: w.right - w.width * 0.22, top: w.top, bottom: w.bottom }, { left: w.left, right: w.right, top: w.top + w.height * 0.66, bottom: w.bottom }); }
        /* not in the hero's last 110px either, where the grid fades out (css/heroes-c.css, .body::after): a dot there
           would be washed out */
        var jmin = Math.ceil((sr.top + 96 - line) / s.c), jmax = Math.floor((sr.bottom - 124 - line) / s.c), rows = {}, free = [];
        for (var j = jmin; j <= jmax; j++) {
          if (j === 0 || j === 1) continue;
          for (var i = 0; i <= cols; i++) {
            var k = i + ',' + j, x = s.r.left + s.m + i * s.c, y = line + j * s.c;
            if (used[k]) continue;
            var dx = (x - s.r.left - 0.56 * s.r.width) / (0.74 * s.r.width), dy = (y - line) / 720;
            if (dx * dx + dy * dy > 0.72 * 0.72) continue;                      /* where the grid's mask is all but gone */
            if (keep.some(function (b) { return x > b.left - pad && x < b.right + pad && y > b.top - pad && y < b.bottom + pad; })) continue;
            if (live.some(function (o) { return Math.abs(o.x - x) < s.c * 4 && Math.abs(o.y - y) < s.c * 4; })) continue;     /* apart from the others */
            (rows[j] = rows[j] || []).push({ k: k, x: x, y: y, left: s.m + i * s.c, top: 1200 + j * s.c });
          }
        }
        free = Object.keys(rows);
        if (free.length) { var row = rows[free[Math.floor(Math.random() * free.length)]]; return row[Math.floor(Math.random() * row.length)]; }   /* a row first, so a free row with few places is as likely as a wide one */
        return null;
      }
      function drop(o) { if (o.el.parentNode) o.el.parentNode.removeChild(o.el); delete used[o.k]; live = live.filter(function (e) { return e !== o; }); }
      function run(wait) {
        setTimeout(function () {
          if (!seen || d.hidden) return run(2000);
          var p = spot(); if (!p) return run(1500);
          var el = d.createElement('i'), hold = 3200 + 1800 + Math.random() * 2600;
          el.className = 'pin wink'; el.style.left = p.left + 'px'; el.style.top = p.top + 'px';
          var o = { el: el, k: p.k, x: p.x, y: p.y };
          used[p.k] = 1; live.push(o); grid.appendChild(el);
          void el.offsetWidth; el.classList.add('up');
          setTimeout(function () { el.classList.remove('up'); }, hold);
          setTimeout(function () { drop(o); run(500 + Math.random() * 2500); }, hold + 3400);
        }, wait);
      }
      if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { seen = es[es.length - 1].isIntersecting; }).observe(sec);
      addEventListener('resize', function () { live.slice().forEach(drop); });
      for (var n = 0; n < N; n++) run(1400 + n * 1700 + Math.random() * 900);       /* they start one after another, over the first seconds */
    })();

    /* The full stop of the headline's last word ("shipped.") sits on a crossing of the grid (2026-11-15, Werner: "align
       the title so the purple dot on the headline always sits on the quadrant intersection"). Across, the headline's
       size is nudged (the dot moves at most half a square, a few per cent of the size) so the dot meets a vertical
       line while the headline keeps its left edge; down, the headline and the sentence move together by at most half
       a square. Measured where the word comes to rest, whatever the roll is doing at the time, and again when the
       font has arrived or the window changes. */
    var h1 = sec.querySelector('h1'), leadIn = sec.querySelector('.lead-in'), inner = sec.querySelector('.roll > span'), last = sec.querySelector('.roll > span > span:last-child > .stop');
    function restOf() {                                                    /* the dot's middle, with the word at rest */
      var b = last.getBoundingClientRect(), ty = 0;
      try { ty = new DOMMatrix(getComputedStyle(inner).transform).m42; } catch (e) { /* no transform */ }
      return { x: b.left + b.width / 2, y: b.top + b.height / 2 - ty - 0.8 * inner.offsetHeight };
    }
    function snap() {
      if (!h1 || !leadIn || !inner || !last) return;
      h1.style.fontSize = ''; leadIn.style.transform = '';
      var s = size(); if (!s.c) return;
      var x0 = s.r.left + s.m, y0 = s.r.top + 1200, left = h1.getBoundingClientRect().left, p = restOf();
      var tx = x0 + Math.round((p.x - x0) / s.c) * s.c + 0.5;            /* the nearest vertical line's middle */
      for (var n = 0; n < 2 && p.x - left > 1; n++) {                       /* twice: type does not scale quite linearly */
        h1.style.fontSize = (parseFloat(getComputedStyle(h1).fontSize) * (tx - left) / (p.x - left)).toFixed(3) + 'px';
        p = restOf();
      }
      s = size(); y0 = s.r.top + 1200;                                      /* the new size can move the timeline, and the grid with it (a low window) */
      var ty = y0 + Math.round((p.y - y0) / s.c) * s.c + 0.5;
      leadIn.style.transform = 'translateY(' + (ty - p.y).toFixed(2) + 'px)';
    }
    snap();
    if (d.fonts && d.fonts.ready) d.fonts.ready.then(snap);
    var snapT = 0;
    addEventListener('resize', function () { clearTimeout(snapT); snapT = setTimeout(snap, 120); });
    sec._snap = snap;

    /* the dot's trail runs with the timeline (start calls this, and Replay with it), for as long as the dot travels */
    sec._follow = function () {
      if (!dot || still) return;
      var me = ++run, t0 = performance.now(), col = null, swept = false;
      (function step(t) {
        if (me !== run || t - t0 > 6200) return;
        var s = size(), b = dot.getBoundingClientRect(), i = Math.floor((b.left + b.width / 2 - s.r.left - s.m) / s.c + 0.001);
        if (s.c && i !== col) { col = i; light(i, -1, s); light(i, 0, s); }
        if (!swept && t - t0 > 5050) { swept = true; wave(me); }            /* .5s + three legs + .65s: the dot is on Shipped */
        requestAnimationFrame(step);
      })(t0);
    };
  });
})();
