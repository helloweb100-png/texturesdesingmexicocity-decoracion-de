(() => {
  "use strict";

  const html = document.documentElement;
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const prefersFinePointer = window.matchMedia("(pointer: fine)").matches;

  /* =========================================================
     PRELOADER
     ========================================================= */
  function initPreloader() {
    const ring = document.querySelector(".preloader-fill");
    const pctEl = document.querySelector(".preloader-pct");
    const CIRC = 301.6;
    let shown = 0;
    let target = 8;

    const setPct = (v) => {
      shown = v;
      if (ring) ring.style.strokeDashoffset = String(CIRC - (CIRC * v) / 100);
      if (pctEl) pctEl.textContent = String(Math.round(v)).padStart(2, "0") + "%";
    };
    setPct(shown);

    let raf;
    const tick = () => {
      shown += (target - shown) * 0.12 + 0.15;
      if (shown > target) shown = target;
      setPct(Math.min(shown, 99));
      if (shown < target - 0.2) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const bump = (v) => { target = Math.max(target, v); };
    bump(35);
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => bump(70));
    } else {
      bump(70);
    }

    const heroBg = new Image();
    heroBg.src = "img/1.jpg";
    const heroReady = new Promise((resolve) => {
      if (heroBg.decode) heroBg.decode().then(resolve).catch(resolve);
      else heroBg.onload = heroBg.onerror = resolve;
    });

    const windowLoaded = new Promise((resolve) => {
      if (document.readyState === "complete") resolve();
      else window.addEventListener("load", resolve, { once: true });
    });

    const minVisible = new Promise((resolve) => setTimeout(resolve, prefersReducedMotion ? 200 : 1100));
    const maxWait = new Promise((resolve) => setTimeout(resolve, 4200));

    Promise.race([Promise.all([heroReady, windowLoaded, minVisible]), maxWait]).then(() => {
      cancelAnimationFrame(raf);
      target = 100;
      setPct(100);
      window.setTimeout(() => {
        html.classList.remove("is-loading");
        window.setTimeout(runHeroEntrance, 500);
      }, 260);
    });
  }

  /* =========================================================
     HERO ENTRANCE (staggered reveal once preloader clears)
     ========================================================= */
  function runHeroEntrance() {
    document.querySelectorAll("[data-hero]").forEach((el, i) => {
      el.style.setProperty("--stagger", i);
      requestAnimationFrame(() => el.classList.add("is-visible"));
    });
  }

  /* =========================================================
     HEADER SCROLL STATE (IntersectionObserver, no scroll listener)
     ========================================================= */
  function initHeaderState() {
    const header = document.querySelector(".site-header");
    const sentinel = document.getElementById("scroll-sentinel");
    if (!header || !sentinel || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(
      ([entry]) => header.classList.toggle("is-scrolled", !entry.isIntersecting),
      { rootMargin: "-1px 0px 0px 0px", threshold: 0 }
    );
    io.observe(sentinel);
  }

  /* =========================================================
     MOBILE NAV
     ========================================================= */
  function initMobileNav() {
    const toggle = document.getElementById("nav-toggle");
    const menu = document.getElementById("mobile-menu");
    if (!toggle || !menu) return;

    const close = () => {
      document.body.classList.remove("nav-open");
      toggle.setAttribute("aria-expanded", "false");
    };
    const open = () => {
      document.body.classList.add("nav-open");
      toggle.setAttribute("aria-expanded", "true");
    };

    toggle.addEventListener("click", () => {
      document.body.classList.contains("nav-open") ? close() : open();
    });
    menu.querySelectorAll("a").forEach((a) => a.addEventListener("click", close));
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") close();
    });
  }

  /* =========================================================
     SCROLL REVEAL
     ========================================================= */
  function initReveal() {
    const groups = document.querySelectorAll("[data-reveal-group]");
    groups.forEach((group) => {
      Array.from(group.querySelectorAll("[data-reveal]")).forEach((el, i) => {
        el.style.setProperty("--stagger", Math.min(i, 6));
      });
    });

    const targets = document.querySelectorAll("[data-reveal]:not([data-hero])");
    if (!("IntersectionObserver" in window)) {
      targets.forEach((el) => el.classList.add("is-visible"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.16, rootMargin: "0px 0px -8% 0px" }
    );
    targets.forEach((el) => io.observe(el));
  }

  /* =========================================================
     HERO PARTICLES (canvas, paused offscreen, off under reduced motion)
     ========================================================= */
  function initParticles() {
    const canvas = document.getElementById("particles-canvas");
    if (!canvas || prefersReducedMotion) return;
    const ctx = canvas.getContext("2d");
    const hero = document.querySelector(".hero");
    let particles = [];
    let w, h, raf, running = false;
    const isSmall = window.matchMedia("(max-width: 720px)").matches;
    const COUNT = isSmall ? 26 : 52;

    function resize() {
      const rect = hero.getBoundingClientRect();
      w = canvas.width = rect.width * devicePixelRatio;
      h = canvas.height = rect.height * devicePixelRatio;
      canvas.style.width = rect.width + "px";
      canvas.style.height = rect.height + "px";
    }

    function makeParticle() {
      return {
        x: Math.random() * w,
        y: Math.random() * h,
        r: (Math.random() * 1.6 + 0.5) * devicePixelRatio,
        vy: -(Math.random() * 0.18 + 0.05) * devicePixelRatio,
        vx: (Math.random() - 0.5) * 0.06 * devicePixelRatio,
        a: Math.random() * 0.5 + 0.15,
      };
    }

    function seed() {
      particles = Array.from({ length: COUNT }, makeParticle);
    }

    function draw() {
      ctx.clearRect(0, 0, w, h);
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.y < -10) { p.y = h + 10; p.x = Math.random() * w; }
        if (p.x < -10) p.x = w + 10;
        if (p.x > w + 10) p.x = -10;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(201,162,78,${p.a})`;
        ctx.fill();
      });
      raf = requestAnimationFrame(draw);
    }

    function start() {
      if (running) return;
      running = true;
      raf = requestAnimationFrame(draw);
    }
    function stop() {
      running = false;
      cancelAnimationFrame(raf);
    }

    resize();
    seed();

    if ("ResizeObserver" in window) {
      new ResizeObserver(() => { resize(); }).observe(hero);
    }

    if ("IntersectionObserver" in window) {
      new IntersectionObserver(
        (entries) => entries.forEach((e) => (e.isIntersecting ? start() : stop())),
        { threshold: 0 }
      ).observe(hero);
    } else {
      start();
    }
  }

  /* =========================================================
     MAGNETIC BUTTONS
     ========================================================= */
  function initMagnetic() {
    if (!prefersFinePointer || prefersReducedMotion) return;
    document.querySelectorAll(".magnetic").forEach((el) => {
      let raf;
      el.addEventListener("pointermove", (e) => {
        const rect = el.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => {
          el.style.transform = `translate(${x * 0.22}px, ${y * 0.32}px)`;
        });
      });
      el.addEventListener("pointerleave", () => {
        cancelAnimationFrame(raf);
        el.style.transform = "";
      });
    });
  }

  /* =========================================================
     BENTO SPOTLIGHT
     ========================================================= */
  function initSpotlight() {
    if (!prefersFinePointer) return;
    document.querySelectorAll(".bento-cell").forEach((cell) => {
      cell.addEventListener("pointermove", (e) => {
        const rect = cell.getBoundingClientRect();
        cell.style.setProperty("--x", ((e.clientX - rect.left) / rect.width) * 100 + "%");
        cell.style.setProperty("--y", ((e.clientY - rect.top) / rect.height) * 100 + "%");
      });
    });
  }

  /* =========================================================
     GALLERY LIGHTBOX
     ========================================================= */
  function initLightbox() {
    const items = Array.from(document.querySelectorAll(".masonry-item"));
    const lightbox = document.getElementById("lightbox");
    if (!items.length || !lightbox) return;

    const imgEl = lightbox.querySelector(".lightbox-frame img");
    const captionEl = lightbox.querySelector(".lightbox-caption");
    const closeBtn = lightbox.querySelector(".lightbox-close");
    const prevBtn = lightbox.querySelector(".lightbox-nav--prev");
    const nextBtn = lightbox.querySelector(".lightbox-nav--next");
    let index = 0;
    let lastFocused = null;

    const show = (i) => {
      index = (i + items.length) % items.length;
      const source = items[index].querySelector("img");
      imgEl.src = source.dataset.full || source.src;
      imgEl.alt = source.alt || "";
      captionEl.textContent = items[index].dataset.caption || "";
    };

    const open = (i, trigger) => {
      lastFocused = trigger;
      show(i);
      lightbox.classList.add("is-active");
      document.body.classList.add("lightbox-open");
      closeBtn.focus();
    };
    const close = () => {
      lightbox.classList.remove("is-active");
      document.body.classList.remove("lightbox-open");
      if (lastFocused) lastFocused.focus();
    };

    items.forEach((item, i) => {
      item.addEventListener("click", () => open(i, item));
      item.setAttribute("tabindex", "0");
      item.setAttribute("role", "button");
      item.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(i, item); }
      });
    });

    closeBtn.addEventListener("click", close);
    prevBtn.addEventListener("click", () => show(index - 1));
    nextBtn.addEventListener("click", () => show(index + 1));
    lightbox.addEventListener("click", (e) => { if (e.target === lightbox) close(); });
    document.addEventListener("keydown", (e) => {
      if (!lightbox.classList.contains("is-active")) return;
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") show(index + 1);
      if (e.key === "ArrowLeft") show(index - 1);
    });
  }

  /* =========================================================
     LIVE OPEN / CLOSED STATUS (America/Mexico_City)
     ========================================================= */
  function initOpenStatus() {
    const el = document.getElementById("open-status");
    if (!el) return;
    const textEl = el.querySelector(".status-text");
    const dow = new Intl.DateTimeFormat("en-US", { timeZone: "America/Mexico_City", weekday: "short" });
    const hr = new Intl.DateTimeFormat("en-US", { timeZone: "America/Mexico_City", hour: "numeric", hour12: false });

    const day = dow.format(new Date());
    const hour = parseInt(hr.format(new Date()), 10);
    const isWeekend = day === "Sat" || day === "Sun";

    if (isWeekend) {
      el.classList.remove("is-open");
      textEl.textContent = "Fin de semana: atendemos con cita";
    } else if (hour >= 10 && hour < 19) {
      el.classList.add("is-open");
      textEl.textContent = "Abierto ahora · cierra 19:00 hrs";
    } else {
      el.classList.remove("is-open");
      textEl.textContent = hour < 10 ? "Cerrado · abre hoy 10:00 hrs" : "Cerrado · abre mañana 10:00 hrs";
    }
  }

  /* =========================================================
     CONTACT FORM -> WHATSAPP
     ========================================================= */
  function initContactForm() {
    const form = document.getElementById("contact-form");
    if (!form) return;
    const WA_NUMBER = "5215549062497";
    const success = document.getElementById("form-success");

    const fields = {
      name: form.querySelector("#field-name"),
      phone: form.querySelector("#field-phone"),
      service: form.querySelector("#field-service"),
      message: form.querySelector("#field-message"),
    };

    const setError = (row, hasError) => {
      row.closest(".form-row").classList.toggle("has-error", hasError);
    };

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      let valid = true;

      [fields.name, fields.phone, fields.message].forEach((input) => {
        const empty = !input.value.trim();
        setError(input, empty);
        input.setAttribute("aria-invalid", String(empty));
        if (empty) valid = false;
      });

      if (!valid) {
        form.querySelector(".has-error input, .has-error textarea")?.focus();
        return;
      }

      const serviceLabel = fields.service.options[fields.service.selectedIndex]?.text || "";
      const lines = [
        `Hola, soy ${fields.name.value.trim()}.`,
        serviceLabel && fields.service.value ? `Me interesa: ${serviceLabel}.` : null,
        `Mi telefono es ${fields.phone.value.trim()}.`,
        fields.message.value.trim(),
      ].filter(Boolean);

      const url = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(lines.join(" "))}`;
      window.open(url, "_blank", "noopener");

      if (success) success.classList.add("is-visible");
      form.reset();
      window.setTimeout(() => success?.classList.remove("is-visible"), 6000);
    });

    [fields.name, fields.phone, fields.message].forEach((input) => {
      input.addEventListener("input", () => setError(input, false));
    });
  }

  /* =========================================================
     MISC
     ========================================================= */
  function initYear() {
    const el = document.getElementById("year");
    if (el) el.textContent = String(new Date().getFullYear());
  }

  function boot() {
    initPreloader();
    initHeaderState();
    initMobileNav();
    initReveal();
    initParticles();
    initMagnetic();
    initSpotlight();
    initLightbox();
    initOpenStatus();
    initContactForm();
    initYear();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
