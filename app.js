/* Хвоя&Пар — поведение страниц */
(function () {
  var doc = document.documentElement;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var smooth = reduce ? 'auto' : 'smooth';
  var hdr = document.querySelector('.hdr');
  var dock = document.querySelector('.dock');
  var foot = document.querySelector('.foot');

  /* ---------- заставка с логотипом: создаётся из JS, один раз за сессию, не блокирует ---------- */
  (function () {
    if (reduce || !document.querySelector('.hero')) return;
    var seen = true;
    try { seen = sessionStorage.getItem('hp-intro') === '1'; sessionStorage.setItem('hp-intro', '1'); } catch (e) { seen = true; }
    if (seen) return;
    var c = document.createElement('div');
    c.className = 'intro-curtain'; c.setAttribute('aria-hidden', 'true');
    c.innerHTML = '<img src="assets/logo-light.png" alt="">';
    document.body.appendChild(c);
    setTimeout(function () { c.classList.add('out'); setTimeout(function () { c.remove(); }, 950); }, 1250);
  })();

  /* ---------- появление при прокрутке: прячем только то, что ниже первого экрана ---------- */
  if (!reduce && 'IntersectionObserver' in window) {
    var els = [].slice.call(document.querySelectorAll('.rv,.unveil'));
    var vh0 = innerHeight;
    els.forEach(function (el) { if (el.getBoundingClientRect().top < vh0 * 0.95) el.classList.add('in'); });
    doc.classList.add('js-anim');
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -10% 0px' });
    els.forEach(function (el) { if (!el.classList.contains('in')) io.observe(el); });
    addEventListener('hashchange', function () { els.forEach(function (el) { el.classList.add('in'); }); });
  }

  /* ---------- общий помощник: изолировать фон под слоем ---------- */
  function setInert(on, except) {
    [].forEach.call(document.querySelectorAll('main, footer, .dock, .hdr, .fab-max'), function (el) {
      if (el !== except) el.inert = on;
    });
  }

  /* ---------- мобильное меню ---------- */
  var burger = document.querySelector('.burger');
  var mnav = document.getElementById('mnav');
  function menuOpen() { return doc.classList.contains('menu-open'); }
  function setMenu(open, keepFocus) {
    doc.classList.toggle('menu-open', open);
    if (burger) burger.setAttribute('aria-expanded', String(open));
    if (hdr) hdr.classList.remove('is-hidden');
    [].forEach.call(document.querySelectorAll('main, footer, .dock, .fab-max'), function (el) { el.inert = open; });
    if (mnav) { mnav.inert = !open; mnav.setAttribute('aria-hidden', String(!open)); }
    if (open) { var a = mnav && mnav.querySelector('a'); if (a) setTimeout(function () { a.focus({ preventScroll: true }); }, 60); }
    else if (!keepFocus && burger && getComputedStyle(burger).display !== 'none') burger.focus();
    req();
  }
  if (mnav) { mnav.inert = true; mnav.setAttribute('aria-hidden', 'true'); }
  if (burger) {
    burger.addEventListener('click', function () { setMenu(!menuOpen()); });
    [].forEach.call(mnav.querySelectorAll('a'), function (a) { a.addEventListener('click', function () { setMenu(false, true); }); });
    addEventListener('keydown', function (e) {
      if (!menuOpen()) return;
      if (e.key === 'Escape') { setMenu(false); return; }
      if (e.key === 'Tab') { // цикл фокуса: бургер ↔ пункты меню
        var f = [burger].concat([].slice.call(mnav.querySelectorAll('a,button')));
        var i = f.indexOf(document.activeElement);
        if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
      }
    });
    var desk = matchMedia('(min-width:1101px)');
    var onDesk = function (e) { if (e.matches && menuOpen()) setMenu(false, true); };
    if (desk.addEventListener) desk.addEventListener('change', onDesk); else if (desk.addListener) desk.addListener(onDesk);
  }

  /* ---------- текст «проявляется» по словам ---------- */
  var lead = document.querySelector('[data-words]');
  var words = [];
  if (lead && !reduce) {
    lead.classList.add('words');
    lead.setAttribute('aria-label', lead.textContent.trim());
    lead.innerHTML = lead.textContent.trim().split(/\s+/).map(function (w) { return '<span class="w" aria-hidden="true">' + w + '</span>'; }).join(' ');
    words = [].slice.call(lead.querySelectorAll('.w'));
  }

  /* ---------- параллакс, шапка, док: сначала читаем геометрию, потом пишем ---------- */
  var px = reduce ? [] : [].slice.call(document.querySelectorAll('[data-speed]'));
  var heroIn = document.querySelector('.hero__in');
  var dockAfter = document.querySelector('[data-dock-after]');
  var heroMode = hdr && !hdr.classList.contains('is-solid');
  var mobile = matchMedia('(max-width:860px)');
  var lastY = scrollY, ticking = false;
  function frame() {
    ticking = false;
    var y = scrollY, h = innerHeight, open = menuOpen();
    // чтение
    var dockT = dockAfter ? dockAfter.getBoundingClientRect().bottom < 0 : y > h * 0.6;
    var nearEnd = foot ? foot.getBoundingClientRect().top < h : false;
    var pxData = px.map(function (el) {
      var p = el.parentElement, r = p.getBoundingClientRect();
      if (r.bottom < -200 || r.top > h + 200) return null;
      var reserve = Math.max(0, (el.offsetHeight - p.clientHeight) / 2);
      var want = -(r.top + r.height / 2 - h / 2) * (parseFloat(el.dataset.speed) || 0);
      return Math.max(-reserve, Math.min(reserve, want));
    });
    var leadP = 0;
    if (words.length) { var lr = lead.getBoundingClientRect(); leadP = (h * 0.88 - lr.top) / (lr.height + h * 0.3); }
    // запись
    if (hdr) {
      if (heroMode) hdr.classList.toggle('is-solid', y > 40);
      var hide = y > h && y > lastY + 4 && !open && !hdr.contains(document.activeElement);
      if (hide) hdr.classList.add('is-hidden'); else if (y < lastY - 4 || y < h) hdr.classList.remove('is-hidden');
    }
    lastY = y;
    if (dock) {
      var vis = mobile.matches && dockT && !nearEnd && !open;
      dock.classList.toggle('is-on', vis);
      doc.classList.toggle('dock-on', vis);
      dock.inert = !vis;
      dock.setAttribute('aria-hidden', String(!vis));
    }
    px.forEach(function (el, i) { if (pxData[i] !== null) el.style.transform = 'translate3d(0,' + pxData[i].toFixed(1) + 'px,0)'; });
    if (heroIn && !reduce && y < h) {
      heroIn.style.transform = 'translate3d(0,' + (y * 0.25).toFixed(1) + 'px,0)';
      heroIn.style.opacity = Math.max(0, 1 - y / (h * 0.7)).toFixed(3);
    }
    if (words.length) {
      var n = Math.floor(Math.max(0, Math.min(1, leadP)) * words.length * 1.05);
      words.forEach(function (w, i) { w.classList.toggle('on', i < n); });
    }
  }
  function req() { if (!ticking) { ticking = true; requestAnimationFrame(frame); } }

  /* ---------- лес слегка следует за курсором (только мышь) ---------- */
  var heroEl = document.querySelector('.hero'), forest = document.querySelector('.hero__bg img');
  if (heroEl && forest && !reduce && matchMedia('(hover: hover) and (pointer: fine)').matches) {
    heroEl.addEventListener('pointermove', function (e) {
      var r = heroEl.getBoundingClientRect();
      var dx = (e.clientX - r.left) / r.width - 0.5, dy = (e.clientY - r.top) / r.height - 0.5;
      forest.style.translate = (-dx * 9).toFixed(1) + 'px ' + (-dy * 5).toFixed(1) + 'px';
    });
    heroEl.addEventListener('pointerleave', function () { forest.style.translate = '0 0'; });
  }
  addEventListener('scroll', req, { passive: true });
  addEventListener('resize', req);
  frame();

  /* ---------- лента домов ---------- */
  [].forEach.call(document.querySelectorAll('[data-track]'), function (box) {
    var track = box.querySelector('.track');
    var prog = box.querySelector('.prog i');
    var count = box.querySelector('.count');
    var total = track.querySelectorAll('.card').length;
    var stepPx = 0;
    function step() {
      if (!stepPx) {
        var c = track.querySelector('.card');
        var gap = parseFloat(getComputedStyle(track).columnGap) || 24;
        stepPx = c ? c.getBoundingClientRect().width + gap : 400;
      }
      return stepPx;
    }
    function upd() {
      var max = track.scrollWidth - track.clientWidth;
      var vis = Math.min(1, track.clientWidth / track.scrollWidth);
      var r = max > 0 ? track.scrollLeft / max : 0;
      if (prog) { prog.style.width = (vis * 100) + '%'; prog.style.transform = 'translateX(' + (r * (1 / vis - 1) * 100) + '%)'; }
      if (count) {
        var idx = total ? Math.min(total, Math.max(1, Math.round(track.scrollLeft / step()) + 1)) : 0;
        count.textContent = String(idx).padStart(2, '0') + ' / ' + String(total).padStart(2, '0');
      }
    }
    track.addEventListener('scroll', upd, { passive: true });
    addEventListener('resize', function () { stepPx = 0; upd(); }); upd();
    var nx = box.querySelector('.next'), pv = box.querySelector('.prev');
    if (nx) nx.onclick = function () { track.scrollBy({ left: step(), behavior: smooth }); };
    if (pv) pv.onclick = function () { track.scrollBy({ left: -step(), behavior: smooth }); };
    // перетаскивание мышью
    var down = false, sx = 0, sl = 0, moved = false;
    function cancelDrag() { down = false; track.classList.remove('drag'); }
    track.addEventListener('pointerdown', function (e) { if (e.pointerType !== 'mouse' || e.button !== 0) return; down = true; moved = false; sx = e.clientX; sl = track.scrollLeft; });
    addEventListener('pointermove', function (e) { if (!down) return; var dx = e.clientX - sx; if (Math.abs(dx) > 5) { moved = true; track.classList.add('drag'); } if (moved) track.scrollLeft = sl - dx; });
    addEventListener('pointerup', function () {
      if (!down) return; down = false;
      if (moved) { track.classList.remove('drag'); var s = step(); track.scrollTo({ left: Math.round(track.scrollLeft / s) * s, behavior: smooth }); }
    });
    addEventListener('pointercancel', cancelDrag);
    addEventListener('blur', cancelDrag);
    track.addEventListener('click', function (e) { if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; } }, true);
    track.addEventListener('dragstart', function (e) { e.preventDefault(); });
  });

  /* ---------- дата заезда/выезда по умолчанию (локальная дата, без UTC-сдвига) ---------- */
  var din = document.getElementById('date-in'), dout = document.getElementById('date-out');
  if (din && dout) {
    var iso = function (d) { return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-'); };
    var t = new Date(); t.setHours(12, 0, 0, 0);
    var t2 = new Date(t); t2.setDate(t.getDate() + 1);
    din.min = iso(t); din.value = iso(t); dout.min = iso(t2); dout.value = iso(t2);
    din.addEventListener('change', function () {
      if (!din.value) return;
      var next = new Date(din.value + 'T12:00:00');
      if (!isFinite(next.getTime())) return;
      next.setDate(next.getDate() + 1);
      dout.min = iso(next);
      if (!dout.value || dout.value < dout.min) dout.value = dout.min;
    });
    /* «Показать наличие» → страница брони с датами и гостями (модуль Bnovo ждёт ДД-ММ-ГГГГ) */
    var go = document.getElementById('book-go');
    if (go) {
      var dmy = function (v) { var p = v.split('-'); return p[2] + '-' + p[1] + '-' + p[0]; };
      var toBook = function (ev) {
        ev.preventDefault();
        var q = [], g = document.getElementById('guests');
        if (din.value) q.push('dfrom=' + dmy(din.value));
        if (dout.value) q.push('dto=' + dmy(dout.value));
        if (g && g.value) q.push('adults=' + encodeURIComponent(g.value));
        if (window.ym && window.YM_ID) window.ym(window.YM_ID, 'reachGoal', 'search_dates');
        location.href = go.getAttribute('href') + (q.length ? '?' + q.join('&') : '');
      };
      go.addEventListener('click', toBook);
      if (go.form || go.closest('form')) (go.form || go.closest('form')).addEventListener('submit', toBook);
    }
  }

  /* ---------- цели Яндекс Метрики: звонок, переход в бронь, Max ---------- */
  document.addEventListener('click', function (ev) {
    if (!window.ym || !window.YM_ID) return;
    var a = ev.target.closest && ev.target.closest('a');
    if (!a || a.id === 'book-go') return;
    var h = a.getAttribute('href') || '';
    if (h.indexOf('tel:') === 0) window.ym(window.YM_ID, 'reachGoal', 'call_click');
    else if (/(^|\/)booking(\?|#|$)/.test(h)) window.ym(window.YM_ID, 'reachGoal', 'booking_click');
    else if (h.indexOf('max.ru') > -1) window.ym(window.YM_ID, 'reachGoal', 'max_click');
  }, true);

  /* ---------- галерея и лайтбокс ---------- */
  var lb = document.querySelector('.lb');
  if (lb) {
    var list = JSON.parse(lb.getAttribute('data-imgs'));
    var img = lb.querySelector('.lb__stage img');
    var cnt = lb.querySelector('.lb__count');
    var strip = lb.querySelector('.lb__strip');
    var stage = lb.querySelector('.lb__stage');
    var cur = 0, opener = null, thumbs = [];
    lb.inert = true;
    function buildStrip() {
      if (thumbs.length) return;
      strip.innerHTML = list.map(function (s, i) { return '<button type="button" aria-label="Фото ' + (i + 1) + '"><img src="' + s + '" alt="" loading="lazy"></button>'; }).join('');
      thumbs = [].slice.call(strip.children);
      thumbs.forEach(function (b, k) { b.addEventListener('click', function () { show(k); }); });
    }
    function show(i) {
      cur = (i + list.length) % list.length;
      img.src = list[cur];
      img.alt = lb.getAttribute('aria-label') + ', фото ' + (cur + 1);
      cnt.textContent = (cur + 1) + ' / ' + list.length;
      thumbs.forEach(function (b, k) { b.classList.toggle('on', k === cur); b.setAttribute('aria-current', k === cur ? 'true' : 'false'); });
      var th = thumbs[cur]; if (th) strip.scrollTo({ left: th.offsetLeft - strip.clientWidth / 2 + 26, behavior: smooth });
    }
    function open(i, from) {
      opener = from || null; buildStrip(); show(i);
      lb.inert = false; lb.classList.add('open'); lb.setAttribute('aria-hidden', 'false');
      setInert(true); doc.style.overflow = 'hidden';
      setTimeout(function () { lb.querySelector('.lb__x').focus({ preventScroll: true }); }, 60);
    }
    function close() {
      lb.classList.remove('open'); lb.setAttribute('aria-hidden', 'true'); lb.inert = true;
      setInert(false); doc.style.overflow = ''; req();
      if (opener) opener.focus();
    }
    [].forEach.call(document.querySelectorAll('[data-open]'), function (b) {
      b.addEventListener('click', function () { open(parseInt(b.getAttribute('data-open'), 10), b); });
    });
    lb.querySelector('.lb__x').addEventListener('click', close);
    lb.querySelector('.lb__prev').addEventListener('click', function () { show(cur - 1); });
    lb.querySelector('.lb__next').addEventListener('click', function () { show(cur + 1); });
    addEventListener('keydown', function (e) {
      if (!lb.classList.contains('open')) return;
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowRight') show(cur + 1);
      else if (e.key === 'ArrowLeft') show(cur - 1);
      else if (e.key === 'Tab') {
        var f = [].slice.call(lb.querySelectorAll('button')).filter(function (b) { return b.offsetParent !== null; });
        var i = f.indexOf(document.activeElement);
        if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
      }
    });
    var g = null;
    stage.addEventListener('pointerdown', function (e) {
      if (!e.isPrimary || e.button !== 0 || e.target.closest('button')) return;
      g = { id: e.pointerId, x: e.clientX, y: e.clientY, t: e.target };
    });
    stage.addEventListener('pointerup', function (e) {
      if (!g || g.id !== e.pointerId) return;
      var dx = e.clientX - g.x, dy = e.clientY - g.y, tgt = g.t; g = null;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.3) show(cur + (dx < 0 ? 1 : -1));
      else if (Math.abs(dx) < 6 && Math.abs(dy) < 6 && tgt === stage) close();
    });
    stage.addEventListener('pointercancel', function () { g = null; });
  }
})();

/* ---------- Новый год: редкий медленный снег в блоке (только когда блок на экране) ---------- */
(function () {
  var c = document.querySelector('.ny__snow');
  if (!c || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)) return;
  var ctx = c.getContext('2d'), flakes = [], W = 0, H = 0, dpr = Math.min(2, window.devicePixelRatio || 1), on = false, raf = 0;
  function size() {
    var r = c.getBoundingClientRect(); W = r.width; H = r.height;
    c.width = W * dpr; c.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var n = Math.round(Math.min(110, W * H / 14000));
    flakes = []; for (var i = 0; i < n; i++) flakes.push(make(true));
  }
  function make(any) {
    var z = Math.random();
    return { x: Math.random() * W, y: any ? Math.random() * H : -6, r: .6 + z * 1.6, v: .18 + z * .45, s: Math.random() * 6.28, a: .25 + z * .5 };
  }
  function tick() {
    ctx.clearRect(0, 0, W, H);
    for (var i = 0; i < flakes.length; i++) {
      var f = flakes[i]; f.y += f.v; f.s += .008; f.x += Math.sin(f.s) * .25;
      if (f.y > H + 6) flakes[i] = make(false);
      ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, 6.283); ctx.fillStyle = 'rgba(241,238,228,' + f.a + ')'; ctx.fill();
    }
    if (on) raf = requestAnimationFrame(tick);
  }
  size(); addEventListener('resize', size);
  new IntersectionObserver(function (es) {
    on = es[0].isIntersecting; cancelAnimationFrame(raf); if (on) raf = requestAnimationFrame(tick);
  }).observe(c.parentElement);
})();

/* ---------- лента фото (Новый год): стрелки, свайп, перетаскивание мышью ---------- */
[].forEach.call(document.querySelectorAll('[data-slider]'), function (box) {
  var track = box.querySelector('.ns__track'), slides = track.children, n = slides.length;
  var count = box.querySelector('.ns__count'), dots = box.querySelector('.ns__dots');
  var smooth = matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
  dots.innerHTML = new Array(n + 1).join('<i></i>');
  function idx() { return Math.round(track.scrollLeft / track.clientWidth); }
  function upd() { var i = idx(); count.textContent = (i + 1) + ' / ' + n; [].forEach.call(dots.children, function (d, k) { d.classList.toggle('on', k === i); }); }
  function go(i) { i = (i + n) % n; track.scrollTo({ left: i * track.clientWidth, behavior: smooth }); }
  box.querySelector('.ns__next').onclick = function () { go(idx() + 1); };
  box.querySelector('.ns__prev').onclick = function () { go(idx() - 1); };
  track.addEventListener('keydown', function (e) { if (e.key === 'ArrowRight') { e.preventDefault(); go(idx() + 1); } if (e.key === 'ArrowLeft') { e.preventDefault(); go(idx() - 1); } });
  track.addEventListener('scroll', upd, { passive: true }); addEventListener('resize', upd); upd();
  var down = false, sx = 0, sl = 0;
  track.addEventListener('pointerdown', function (e) { if (e.pointerType !== 'mouse' || e.button !== 0) return; down = true; sx = e.clientX; sl = track.scrollLeft; track.classList.add('drag'); });
  addEventListener('pointermove', function (e) { if (down) track.scrollLeft = sl - (e.clientX - sx); });
  addEventListener('pointerup', function () { if (!down) return; down = false; track.classList.remove('drag'); go(Math.round(track.scrollLeft / track.clientWidth)); });
  track.addEventListener('dragstart', function (e) { e.preventDefault(); });
});
