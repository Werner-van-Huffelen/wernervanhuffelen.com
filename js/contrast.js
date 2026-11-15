/* Contrast · the one script: reveals, the scroll-led effects, the clock, the counters and the screens that step
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

  /* 2. Berlin's time in the nav */
  var clock = d.querySelector('[data-clock]');
  if (clock && window.Intl) {
    var fmt = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Berlin' });
    var tick = function () { clock.textContent = 'Berlin ' + fmt.format(new Date()); };
    tick(); setInterval(tick, 15000);
  }

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
})();
