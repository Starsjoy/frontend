// Katta yulduz ortidan uzluksiz tarqaladigan oltin yulduzchalar —
// Telegram ilovasidagi "Telegram Stars" ekrani effektiga yaqin. Canvas + rAF, yengil.
import { useEffect, useRef } from "react";

const STAR_PATH =
  "m6.02 4.99 2.21-4.42c.25-.51.86-.72 1.37-.46.2.1.36.27.46.47l2.08 4.26c.17.34.5.58.88.63l4.36.52c.59.08 1.02.62.95 1.22-.03.24-.14.47-.32.65l-3.45 3.42c-.14.13-.2.33-.18.53l.57 4.61c.09.66-.38 1.27-1.03 1.35-.25.03-.5-.02-.72-.14l-3.64-2c-.26-.14-.58-.15-.85-.01l-3.77 1.95c-.53.27-1.18.06-1.45-.48-.11-.2-.14-.43-.11-.65l.3-2.12c.15-1.04.79-1.93 1.71-2.41l4.19-2.15c.11-.06.15-.2.1-.31-.05-.09-.14-.14-.24-.12l-5.12.74c-.78.11-1.58-.11-2.19-.62l-1.71-1.4c-.49-.4-.56-1.12-.17-1.62.19-.22.45-.37.74-.41l4.38-.57c.28-.03.52-.21.65-.46z";

// TgStar (oltin) bilan bir xil ko'rinish — bir marta rasterga aylantiriladi
const STAR_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 21 21" width="84" height="84">
<defs><path id="a" d="${STAR_PATH}"/>
<linearGradient id="b" x1="25%" x2="74.92%" y1=".825%" y2="107.86%"><stop offset="0" stop-color="#ffe45c"/><stop offset=".55" stop-color="#ffcb2e"/><stop offset="1" stop-color="#ffb300"/></linearGradient>
<linearGradient id="c" x1="50%" x2="50%" y1="0%" y2="99.8%"><stop offset="0" stop-color="#f09a00"/><stop offset="1" stop-color="#f07f00"/></linearGradient>
<clipPath id="k"><use href="#a"/></clipPath></defs>
<g fill="none" transform="translate(1.33 1.61)"><use fill="#fff6c8" href="#a"/><g clip-path="url(#k)"><use fill="url(#b)" href="#a" transform="translate(.7 .7)"/></g><use stroke="url(#c)" stroke-width=".8" href="#a"/></g></svg>`;

const MAX = 28;
const rand = (a, b) => a + Math.random() * (b - a);

function spawn(p, w, h, initial) {
  const ang = Math.random() * Math.PI * 2;
  const speed = rand(18, 46); // px/s
  p.x = w / 2 + Math.cos(ang) * rand(4, 18);
  p.y = h / 2 + Math.sin(ang) * rand(4, 14);
  p.vx = Math.cos(ang) * speed;
  p.vy = Math.sin(ang) * speed * 0.8;
  p.size = rand(7, 17);
  p.rot = rand(0, Math.PI * 2);
  p.vr = rand(-0.9, 0.9);
  p.life = rand(2.6, 4.4);
  p.age = initial ? rand(0, p.life) : 0;
}

// src — zarracha rasmi (masalan Premium uchun binafsha yulduz); berilmasa oltin TgStar.
export default function StarBurst({ src } = {}) {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return undefined;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return undefined;
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.src = src || `data:image/svg+xml;charset=utf-8,${encodeURIComponent(STAR_SVG)}`;

    let w = 0;
    let h = 0;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const parts = Array.from({ length: MAX }, () => {
      const p = {};
      spawn(p, w, h, true);
      return p;
    });

    let raf = 0;
    let last = performance.now();
    const tick = (now) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      ctx.clearRect(0, 0, w, h);
      if (img.complete) {
        for (const p of parts) {
          p.age += dt;
          if (p.age >= p.life) spawn(p, w, h, false);
          const t = p.age / p.life;
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.rot += p.vr * dt;
          // paydo bo'ladi → kattalashadi → chekkada so'nadi
          const alpha = t < 0.15 ? t / 0.15 : t > 0.6 ? Math.max(0, (1 - t) / 0.4) : 1;
          const scale = 0.35 + 0.65 * Math.sin(Math.min(t, 1) * Math.PI * 0.75);
          const s = p.size * scale;
          ctx.globalAlpha = alpha * 0.95;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.drawImage(img, -s / 2, -s / 2, s, s);
          ctx.restore();
        }
        ctx.globalAlpha = 1;
      }
      raf = requestAnimationFrame(tick);
    };

    const start = () => {
      if (!raf) {
        last = performance.now();
        raf = requestAnimationFrame(tick);
      }
    };
    const stop = () => {
      cancelAnimationFrame(raf);
      raf = 0;
    };
    const onVis = () => (document.hidden ? stop() : start());

    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", onVis);
    start();
    return () => {
      stop();
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [src]);

  return <canvas ref={ref} className="sjs-burst" aria-hidden="true" />;
}
