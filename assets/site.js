/* HEVIX - TECH · Verhalten
   - Fernseher: einschalten (einmal beim Laden), Kanäle wechseln per Knopf, Pfeiltaste, Wischen oder Kanalliste
   - Uhr in der Infoleiste
   - Menü auf dem Handy schließen, E-Mail-Adresse kopieren
   Ohne GSAP oder bei „Bewegung reduzieren“ passiert alles sofort, ohne Animation. */
(function () {
  "use strict";

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  const hasGsap = () => typeof window.gsap !== "undefined";
  const animate = () => hasGsap() && !reduce.matches;

  /* ---------- Fernseher ---------- */

  const screen = document.querySelector(".tv-screen");
  if (screen) {
    const channels = [
      { name: "HEVIX - TECH", now: "Eigene Apps für jeden Bildschirm", progress: 0.32 },
      { name: "Apps", now: "Apps für Handy, Tablet und Fernseher", progress: 0.58 },
      { name: "Zapp", now: "Zapp, bald im App Store", progress: 0.76 },
    ];
    const views = [...screen.querySelectorAll(".channel")];
    const num = screen.querySelector(".ib-num");
    const name = screen.querySelector(".ib-name");
    const now = screen.querySelector(".ib-now");
    const next = screen.querySelector(".ib-next");
    const bar = screen.querySelector(".ib-bar i");
    const logo = screen.querySelector(".ib-logo");
    const titleRow = screen.querySelector(".ib-title");
    const staticLayer = screen.querySelector(".tv-static");
    const power = screen.querySelector(".tv-power");
    const announce = document.getElementById("kanal-ansage");
    const list = document.querySelector(".channel-list");
    const logoMark = logo.innerHTML;
    let current = 0;
    let busy = null;

    // Kanalliste (Punkte unter der Fernbedienung)
    const dots = channels.map((c, i) => {
      const li = document.createElement("li");
      const b = document.createElement("button");
      b.type = "button";
      b.setAttribute("aria-label", `Kanal ${i + 1}: ${c.name}`);
      b.addEventListener("click", () => tune(i));
      li.appendChild(b);
      list.appendChild(li);
      return b;
    });

    function paintInfo(i) {
      const c = channels[i];
      const n = channels[(i + 1) % channels.length];
      num.textContent = String(i + 1);
      name.textContent = c.name;
      now.textContent = `Jetzt: ${c.now}`;
      next.textContent = `Danach: ${n.name}`;
      bar.style.width = `${Math.round(c.progress * 100)}%`;
      logo.innerHTML = c.name === "Zapp"
        ? '<img src="/assets/zapp-icon.png" alt="">'
        : logoMark;
      dots.forEach((d, k) => d.setAttribute("aria-current", k === i ? "true" : "false"));
    }

    function show(i) {
      views.forEach((v, k) => {
        v.hidden = k !== i;
        v.setAttribute("aria-hidden", k === i ? "false" : "true");
      });
    }

    function tune(i) {
      const target = (i + channels.length) % channels.length;
      if (target === current) return;
      current = target;
      announce.textContent = `Kanal ${target + 1}: ${channels[target].name}`;

      if (!animate()) {
        show(target);
        paintInfo(target);
        return;
      }
      if (busy) busy.progress(1).kill();
      const g = window.gsap;
      // Kurzes Rauschen, dann der neue Kanal – wie beim Umschalten am Fernseher
      busy = g.timeline({ onComplete: () => { busy = null; } })
        .set(staticLayer, { autoAlpha: 1, backgroundPosition: () => `${Math.random() * 240}px ${Math.random() * 240}px` })
        .to(staticLayer, { backgroundPosition: () => `${Math.random() * 240}px ${Math.random() * 240}px`, duration: 0.06, repeat: 2, ease: "steps(1)" })
        .add(() => { show(target); paintInfo(target); })
        .fromTo(views[target], { scale: 1.035 }, { scale: 1, duration: 0.45, ease: "power3.out" }, ">")
        .to(staticLayer, { autoAlpha: 0, duration: 0.22, ease: "power1.out" }, "<")
        .fromTo(titleRow, { y: 6, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.3, ease: "power2.out" }, "<0.05");
    }

    const zap = (dir) => tune(current + dir);

    document.querySelectorAll("[data-zap]").forEach((b) =>
      b.addEventListener("click", () => zap(Number(b.dataset.zap)))
    );

    // Pfeiltasten wie auf der Fernbedienung (nur wenn der Fernseher den Fokus hat)
    screen.addEventListener("keydown", (e) => {
      const map = { ArrowUp: 1, ArrowRight: 1, PageUp: 1, ArrowDown: -1, ArrowLeft: -1, PageDown: -1 };
      if (e.key in map) { e.preventDefault(); zap(map[e.key]); }
    });

    // Wischen auf dem Bildschirm (Touch und Maus)
    let startX = null, startY = null;
    screen.addEventListener("pointerdown", (e) => { startX = e.clientX; startY = e.clientY; });
    screen.addEventListener("pointerup", (e) => {
      if (startX === null) return;
      const dx = e.clientX - startX, dy = e.clientY - startY;
      startX = startY = null;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) zap(dx < 0 ? 1 : -1);
    });
    screen.addEventListener("pointercancel", () => { startX = startY = null; });

    // Uhr wie in der Infoleiste von Zapp
    const clock = screen.querySelector(".ib-clock");
    const fmt = new Intl.DateTimeFormat("de-DE", { hour: "2-digit", minute: "2-digit" });
    const tick = () => { const d = new Date(); clock.textContent = fmt.format(d); clock.dateTime = d.toISOString(); };
    tick();
    setInterval(tick, 15000);

    paintInfo(0);

    // Einschalten: einmal beim Laden – die eine große Bewegung auf der Seite
    const powerOn = () => {
      if (!animate()) return;
      const g = window.gsap;
      const inner = [...views, screen.querySelector(".infobar")];
      g.timeline({ defaults: { ease: "power3.out" } })
        .set(inner, { autoAlpha: 0 })
        .set(power, { autoAlpha: 1, scaleX: 0 })
        .to(power, { scaleX: 1, duration: 0.35, ease: "power2.inOut" }, 0.25)
        .to(power, { scaleY: 120, autoAlpha: 0, duration: 0.45, ease: "power2.in" })
        .fromTo(views[0], { autoAlpha: 0, scale: 1.06 }, { autoAlpha: 1, scale: 1, duration: 0.7 }, "-=0.2")
        .fromTo(screen.querySelector(".infobar"), { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.6 }, "-=0.35")
        .set(views.slice(1), { clearProps: "opacity,visibility" });
    };
    if (hasGsap()) powerOn(); else window.addEventListener("load", powerOn, { once: true });
  }

  /* ---------- Menü auf dem Handy: nach Klick schließen ---------- */

  const menu = document.querySelector(".menu");
  if (menu) {
    menu.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => menu.removeAttribute("open")));
    document.addEventListener("click", (e) => { if (!menu.contains(e.target)) menu.removeAttribute("open"); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") menu.removeAttribute("open"); });
  }

  /* ---------- E-Mail-Adresse kopieren ---------- */

  const copy = document.querySelector("[data-copy]");
  const state = document.querySelector(".copy-state");
  if (copy && navigator.clipboard) {
    copy.hidden = false;
    copy.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(copy.dataset.copy);
        state.textContent = "Adresse kopiert.";
      } catch {
        state.textContent = "Kopieren nicht möglich. Bitte die Adresse markieren und kopieren.";
      }
      clearTimeout(copy._t);
      copy._t = setTimeout(() => { state.textContent = ""; }, 3000);
    });
  }
})();
