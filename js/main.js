/* Aariz personal portfolio — interactions */
(function () {
  "use strict";
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* header + mobile menu */
  var hdr = document.getElementById("hdr");
  function onScroll() { if (hdr) hdr.classList.toggle("stuck", window.scrollY > 12); }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  var burger = document.getElementById("burger"), nav = document.getElementById("nav");
  function closeNav() { document.body.classList.remove("nav-open"); burger.setAttribute("aria-expanded", "false"); }
  if (burger && nav) {
    burger.addEventListener("click", function () {
      var open = document.body.classList.toggle("nav-open");
      burger.setAttribute("aria-expanded", open ? "true" : "false");
    });
    nav.addEventListener("click", function (e) { if (e.target.closest("a")) closeNav(); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && document.body.classList.contains("nav-open")) { closeNav(); burger.focus(); }
    });
  }

  /* gentle reveal, only where a page asks for it */
  var els = document.querySelectorAll(".rv");
  function showAll() { els.forEach(function (el) { el.classList.add("in"); }); }
  if (els.length && "IntersectionObserver" in window && !reduce) {
    var io = new IntersectionObserver(function (en) {
      en.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
    }, { threshold: 0.1, rootMargin: "0px 0px -50px 0px" });
    els.forEach(function (el) { io.observe(el); });
    setTimeout(showAll, 1800);
  } else { showAll(); }

  var yr = document.getElementById("yr");
  if (yr) yr.textContent = String(new Date().getFullYear());

  shipLog();
  projectFilters();
  peek();

  /* ---------------------------------------------------------
     Ship log: one signal line across the hero. Each thing I
     shipped is a marker, and the line rises at each one.
     --------------------------------------------------------- */
  function shipLog() {
    var box = document.querySelector(".shiplog");
    if (!box) return;
    var cv = box.querySelector("canvas"), ctx = cv.getContext("2d");
    var items = [].map.call(box.querySelectorAll("ol li"), function (li) {
      return { when: li.getAttribute("data-when"), name: li.getAttribute("data-name"), what: li.textContent.trim() };
    });
    var outWhen = box.querySelector(".what i"), outName = box.querySelector(".what b"), outHow = box.querySelector(".how");
    if (!items.length) return;

    var css = getComputedStyle(document.documentElement);
    function v(name) { return css.getPropertyValue(name).trim(); }
    var C = { amber: v("--amber"), sage: v("--sage"), ink: v("--ink"), ink2: v("--ink-2"), ink3: v("--ink-3") };

    var W = 0, H = 0, dpr = 1, xs = [];
    var t = 0, start = 0, progress = reduce ? 1 : 0, pointerX = null, keyIndex = null, active = items.length - 1;
    var running = false, raf = 0, visible = true, shown = -1;

    function size() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = cv.clientWidth; H = cv.clientHeight;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var pad = Math.max(28, W * 0.05);
      xs = items.map(function (_, i) { return pad + (W - 2 * pad) * (items.length === 1 ? 0.5 : i / (items.length - 1)); });
    }

    var base = function () { return H * 0.7; };
    function lift(i) { return H * (0.14 + 0.3 * (items.length === 1 ? 1 : i / (items.length - 1))); }
    function y(x) {
      var amp = H * 0.03;
      var n = Math.sin(x * 0.017 + t * 0.9) * 0.5 + Math.sin(x * 0.041 - t * 1.25) * 0.3 + Math.sin(x * 0.103 + t * 2.0) * 0.2;
      var gap = xs.length > 1 ? xs[1] - xs[0] : W;
      var s = 0, sig = Math.max(8, Math.min(34, gap * 0.2));
      for (var i = 0; i < xs.length; i++) { var d = x - xs[i]; s += lift(i) * Math.exp(-(d * d) / (2 * sig * sig)); }
      return base() - n * amp - s;
    }

    function setActive(i) {
      active = i;
      if (shown === i) return;
      shown = i;
      var it = items[i];
      outWhen.textContent = it.when;
      outName.textContent = it.name;
      outHow.textContent = it.what;
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);
      var headX = progress * W;

      // marker guides
      var i;
      for (i = 0; i < xs.length; i++) {
        if (xs[i] > headX) break;
        ctx.strokeStyle = i === active ? "rgba(232,174,69,.5)" : "rgba(245,240,228,.12)";
        ctx.setLineDash([3, 5]); ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(xs[i], 40); ctx.lineTo(xs[i], base()); ctx.stroke();
      }
      ctx.setLineDash([]);

      // labels: the active one always shows; others only where they fit without touching
      ctx.font = "500 12px Inter, system-ui, sans-serif";
      var taken = [], order = [active];
      for (i = xs.length - 1; i >= 0; i--) if (i !== active) order.push(i);
      order.forEach(function (k) {
        if (xs[k] > headX) return;
        var w = ctx.measureText(items[k].name).width;
        var align = k === 0 ? "left" : (k === xs.length - 1 ? "right" : "center");
        var lx = k === 0 ? xs[k] - 6 : (k === xs.length - 1 ? xs[k] + 6 : xs[k]);
        var a = align === "left" ? lx : (align === "right" ? lx - w : lx - w / 2), b = a + w;
        var clash = taken.some(function (r) { return a < r[1] + 14 && b > r[0] - 14; });
        if (k !== active && clash) return;
        taken.push([a, b]);
        ctx.fillStyle = k === active ? C.ink : C.ink3;
        ctx.textAlign = align;
        ctx.fillText(items[k].name, lx, 26);
      });

      // the signal
      var step = 3, x;
      var grad = ctx.createLinearGradient(0, H * 0.2, 0, H);
      grad.addColorStop(0, "rgba(232,174,69,.16)"); grad.addColorStop(1, "rgba(232,174,69,0)");
      ctx.beginPath(); ctx.moveTo(0, H);
      for (x = 0; x <= headX; x += step) ctx.lineTo(x, y(x));
      ctx.lineTo(Math.min(headX, W), H); ctx.closePath();
      ctx.fillStyle = grad; ctx.fill();

      ctx.beginPath();
      for (x = 0; x <= headX; x += step) { if (x === 0) ctx.moveTo(x, y(x)); else ctx.lineTo(x, y(x)); }
      ctx.strokeStyle = C.amber; ctx.lineWidth = 2; ctx.lineJoin = "round"; ctx.stroke();

      // markers
      for (i = 0; i < xs.length; i++) {
        if (xs[i] > headX) break;
        var my = y(xs[i]);
        if (i === active) {
          ctx.fillStyle = "rgba(232,174,69,.18)"; ctx.beginPath(); ctx.arc(xs[i], my, 13, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = C.amber; ctx.beginPath(); ctx.arc(xs[i], my, 6, 0, Math.PI * 2); ctx.fill();
        } else {
          ctx.fillStyle = "#0E0D0B"; ctx.beginPath(); ctx.arc(xs[i], my, 5, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = C.sage; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(xs[i], my, 5, 0, Math.PI * 2); ctx.stroke();
        }
      }

      // pointer crosshair
      if (pointerX !== null && progress >= 1) {
        ctx.strokeStyle = "rgba(245,240,228,.22)"; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(pointerX, 0); ctx.lineTo(pointerX, H); ctx.stroke();
      }

      // the drawing head during the intro
      if (progress < 1) {
        var hy = y(headX);
        ctx.fillStyle = C.amber; ctx.beginPath(); ctx.arc(headX, hy, 3.5, 0, Math.PI * 2); ctx.fill();
      }
    }

    function nearest(px) {
      var best = 0;
      for (var i = 1; i < xs.length; i++) if (Math.abs(xs[i] - px) < Math.abs(xs[best] - px)) best = i;
      return best;
    }

    function frame(now) {
      if (!start) start = now;
      if (progress < 1) {
        var p = Math.min(1, (now - start) / 2200);
        progress = 1 - Math.pow(1 - p, 3);
        var passed = -1;
        for (var i = 0; i < xs.length; i++) if (xs[i] <= progress * W) passed = i;
        if (passed >= 0) setActive(passed);
      }
      t += 0.012;
      draw();
      raf = running ? requestAnimationFrame(frame) : 0;
    }

    function run(on) {
      if (reduce) { running = false; draw(); return; }
      if (on && !running) { running = true; raf = requestAnimationFrame(frame); }
      else if (!on) { running = false; if (raf) cancelAnimationFrame(raf); raf = 0; }
    }
    function redraw() { if (!running) draw(); }

    cv.addEventListener("pointermove", function (e) {
      var r = cv.getBoundingClientRect();
      pointerX = e.clientX - r.left;
      keyIndex = null;
      if (progress >= 1) setActive(nearest(pointerX));
      redraw();
    });
    cv.addEventListener("pointerdown", function (e) {
      var r = cv.getBoundingClientRect();
      pointerX = e.clientX - r.left;
      if (progress >= 1) setActive(nearest(pointerX));
      redraw();
    });
    cv.addEventListener("pointerleave", function () { pointerX = null; redraw(); });
    cv.addEventListener("keydown", function (e) {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft" && e.key !== "Home" && e.key !== "End") return;
      e.preventDefault();
      progress = 1;
      var i = keyIndex === null ? active : keyIndex;
      if (e.key === "ArrowRight") i = Math.min(items.length - 1, i + 1);
      if (e.key === "ArrowLeft") i = Math.max(0, i - 1);
      if (e.key === "Home") i = 0;
      if (e.key === "End") i = items.length - 1;
      keyIndex = i; pointerX = xs[i]; setActive(i); redraw();
    });

    size(); setActive(active);
    if ("ResizeObserver" in window) new ResizeObserver(function () { size(); redraw(); }).observe(cv);
    else window.addEventListener("resize", function () { size(); redraw(); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(redraw);

    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (en) { visible = en[0].isIntersecting; run(visible && !document.hidden); }).observe(box);
    } else { run(true); }
    document.addEventListener("visibilitychange", function () { run(visible && !document.hidden); });
  }

  /* ---------------------------------------------------------
     Projects: filter by kind
     --------------------------------------------------------- */
  function projectFilters() {
    var bar = document.querySelector(".filters");
    if (!bar) return;
    var rows = [].slice.call(document.querySelectorAll("#projects .proj[data-cat]"));
    var status = document.getElementById("filter-status");
    var buttons = [].slice.call(bar.querySelectorAll("button"));
    buttons.forEach(function (b) {
      var f = b.getAttribute("data-filter");
      var n = f === "all" ? rows.length : rows.filter(function (r) { return r.getAttribute("data-cat") === f; }).length;
      var span = b.querySelector(".n");
      if (span) span.textContent = String(n);
      b.addEventListener("click", function () {
        buttons.forEach(function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
        var shown = 0;
        rows.forEach(function (r) {
          var on = f === "all" || r.getAttribute("data-cat") === f;
          r.hidden = !on;
          if (on) shown++;
        });
        if (status) status.textContent = "Showing " + shown + (shown === 1 ? " project" : " projects");
      });
    });
  }

  /* ---------------------------------------------------------
     Projects: a screenshot that follows the cursor over any
     project with a live site
     --------------------------------------------------------- */
  function peek() {
    var el = document.querySelector(".peek");
    if (!el || reduce || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    var img = el.querySelector("img");
    var tx = 0, ty = 0, cx = 0, cy = 0, on = false, raf = 0;
    var PW = 340, PH = 212;

    function place() {
      cx += (tx - cx) * 0.2; cy += (ty - cy) * 0.2;
      var x = cx + 28, y = cy - PH / 2;
      if (x + PW > window.innerWidth - 12) x = cx - PW - 28;
      y = Math.max(76, Math.min(window.innerHeight - PH - 12, y));
      el.style.transform = "translate3d(" + x + "px," + y + "px,0)";
      raf = (on || Math.abs(tx - cx) > 0.5 || Math.abs(ty - cy) > 0.5) ? requestAnimationFrame(place) : 0;
    }

    document.querySelectorAll("[data-shot]").forEach(function (row) {
      row.addEventListener("pointerenter", function (e) {
        if (img.getAttribute("src") !== row.getAttribute("data-shot")) img.src = row.getAttribute("data-shot");
        if (!on) { cx = tx = e.clientX; cy = ty = e.clientY; }
        on = true; el.classList.add("on");
        if (!raf) raf = requestAnimationFrame(place);
      });
      row.addEventListener("pointermove", function (e) { tx = e.clientX; ty = e.clientY; });
      row.addEventListener("pointerleave", function () { on = false; el.classList.remove("on"); });
    });
  }
})();

/* ChangeWatch case study: step-through replay of the recorded run (tabs, arrow keys) */
(function () {
  "use strict";
  document.querySelectorAll("[data-replay]").forEach(function (root) {
    var tabs = Array.prototype.slice.call(root.querySelectorAll('[role="tab"]'));
    function show(i, focus) {
      tabs.forEach(function (t, k) {
        var on = k === i;
        t.setAttribute("aria-selected", on ? "true" : "false");
        t.tabIndex = on ? 0 : -1;
        document.getElementById(t.getAttribute("aria-controls")).hidden = !on;
      });
      if (focus) tabs[i].focus();
    }
    tabs.forEach(function (t, i) {
      t.addEventListener("click", function () { show(i, false); });
      t.addEventListener("keydown", function (e) {
        var n = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
        if (e.key === "Home") n = -i; else if (e.key === "End") n = tabs.length - 1 - i;
        if (n === undefined) return;
        e.preventDefault();
        show((i + n + tabs.length) % tabs.length, true);
      });
    });
    show(0, false);
  });
})();
