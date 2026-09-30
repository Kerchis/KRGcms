(() => {
  const toggle = document.querySelector(".m-nav-toggle");
  const inner = document.querySelector(".m-header-inner");
  if (toggle && inner) {
    toggle.addEventListener("click", () => {
      const open = inner.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }

  document.querySelectorAll(".m-tabs").forEach((root) => {
    root.addEventListener("click", (e) => {
      const btn = e.target.closest("[role=tab]");
      if (!btn || !root.contains(btn)) return;
      root.querySelectorAll("[role=tab]").forEach((t) => t.setAttribute("aria-selected", t === btn ? "true" : "false"));
      root.querySelectorAll("[role=tabpanel]").forEach((p) => {
        p.hidden = p.id !== btn.getAttribute("aria-controls");
      });
    });
  });

  document.addEventListener("click", (e) => {
    const a = e.target.closest("a.js-krg-lightbox");
    if (!a) return;
    e.preventDefault();
    const ov = document.createElement("div");
    ov.className = "m-lightbox";
    ov.setAttribute("role", "dialog");
    ov.innerHTML = `<button type="button" class="m-lightbox-x" aria-label="Cerrar">×</button><img src="${a.href}" alt="">`;
    const close = () => ov.remove();
    ov.addEventListener("click", close);
    document.addEventListener("keydown", function onKey(ev) {
      if (ev.key === "Escape") {
        close();
        document.removeEventListener("keydown", onKey);
      }
    });
    document.body.appendChild(ov);
  });

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!reduceMotion) {
    let ticking = false;
    const runParallax = () => {
      ticking = false;
      const vh = window.innerHeight || 1;
      document.querySelectorAll(".m-figure.is-parallax, .m-gallery.is-parallax").forEach((box) => {
        const frame = box.querySelector(".m-gallery-viewport") || box;
        const r = frame.getBoundingClientRect();
        if (r.bottom < -40 || r.top > vh + 40) return;
        const p = (r.top + r.height / 2 - vh / 2) / vh;
        const zoomN = Number(box.getAttribute("data-parallax-zoom"));
        const amtN = Number(box.getAttribute("data-parallax-amount"));
        const dirN = Number(box.getAttribute("data-parallax-dir"));
        const zoom = 1 + (Number.isFinite(zoomN) ? zoomN : 8) / 100;
        const frac = (Number.isFinite(amtN) ? amtN : 10) / 100;
        const dir = dirN === -1 ? -1 : 1;
        const y = (-p * r.height * frac * dir).toFixed(1);
        const t = "translate3d(0," + y + "px,0) scale(" + zoom + ")";
        box.querySelectorAll("img").forEach((img) => { img.style.transform = t; });
      });
    };
    const onParallax = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(runParallax);
      }
    };
    runParallax();
    window.addEventListener("scroll", onParallax, { passive: true });
    window.addEventListener("resize", onParallax);
    document.addEventListener("load", onParallax, true);
  }

  document.querySelectorAll("[data-video]").forEach((box) => {
    const vid = box.querySelector("video");
    if (!vid) {
      box.addEventListener("contextmenu", (e) => e.preventDefault());
      return;
    }
    vid.controls = false;
    vid.removeAttribute("controls");
    vid.setAttribute("controlslist", "nodownload nofullscreen noremoteplayback");
    vid.setAttribute("disablepictureinpicture", "");
    const vol = Math.max(0, Math.min(100, Number(box.getAttribute("data-volume") || 0))) / 100;
    vid.volume = vol;
    const wantSound = vol > 0 && !vid.hasAttribute("autoplay");
    vid.muted = !wantSound;
    const tryPlay = () => {
      const p = vid.play();
      if (p && p.catch) p.catch(() => { vid.muted = true; vid.play().catch(() => {}); });
    };
    if (vid.hasAttribute("autoplay")) tryPlay();
    box.addEventListener("click", () => {
      if (vid.paused) tryPlay();
      else vid.pause();
    });
    box.addEventListener("contextmenu", (e) => e.preventDefault());
    vid.addEventListener("contextmenu", (e) => e.preventDefault());
  });

  document.querySelectorAll("[data-gallery]").forEach((root) => {
    const slides = Array.from(root.querySelectorAll(".m-gallery-slide"));
    const dots = Array.from(root.querySelectorAll(".m-gallery-dot"));
    if (!slides.length) return;
    let i = Math.max(0, slides.findIndex((s) => s.classList.contains("is-on")));
    const go = (n) => {
      i = (n + slides.length) % slides.length;
      slides.forEach((s, j) => s.classList.toggle("is-on", j === i));
      dots.forEach((d, j) => d.classList.toggle("is-on", j === i));
    };
    root.querySelector(".m-gallery-prev")?.addEventListener("click", (e) => { e.preventDefault(); go(i - 1); });
    root.querySelector(".m-gallery-next")?.addEventListener("click", (e) => { e.preventDefault(); go(i + 1); });
    dots.forEach((d) => d.addEventListener("click", () => go(Number(d.getAttribute("data-i") || 0))));
    const onKey = (e) => {
      if (root.getAttribute("data-keys") === "0") return;
      if (e.key === "ArrowLeft") { e.preventDefault(); go(i - 1); }
      if (e.key === "ArrowRight") { e.preventDefault(); go(i + 1); }
    };
    root.addEventListener("keydown", onKey);
    root.addEventListener("mouseenter", () => { root.dataset.hover = "1"; });
    root.addEventListener("mouseleave", () => { delete root.dataset.hover; });
    document.addEventListener("keydown", (e) => {
      if (root.getAttribute("data-keys") === "0") return;
      if (document.activeElement === root || root.dataset.hover === "1") onKey(e);
    });
    const ms = Number(root.getAttribute("data-autoplay") || 0);
    if (ms > 0 && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setInterval(() => go(i + 1), ms);
    }
  });

  document.querySelectorAll(".js-krg-form, .js-meridian-form").forEach((form) => {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const msg = form.querySelector(".m-form-msg");
      const btn = form.querySelector("[type=submit]");
      const fd = new FormData(form);
      fd.append("action", "krg_contact");
      if (btn) btn.disabled = true;
      try {
        const res = await fetch(window.KrgPublic.ajax, { method: "POST", body: fd, credentials: "same-origin" });
        const json = await res.json();
        if (!json.success) throw new Error(json.data?.message || window.KrgPublic.i18n.error);
        if (msg) {
          msg.hidden = false;
          msg.textContent = json.data?.message || msg.dataset.success || window.KrgPublic.i18n.sent;
          msg.classList.remove("m-form-error");
        }
        form.reset();
      } catch (err) {
        if (msg) {
          msg.hidden = false;
          msg.textContent = err.message || window.KrgPublic.i18n.error;
          msg.classList.add("m-form-error");
        }
      } finally {
        if (btn) btn.disabled = false;
      }
    });
  });
})();
