import { useEffect, useRef } from "react";

/**
 * A quiet, slow-drifting starfield. Kept subtle deliberately — this is the
 * one bit of visual flourish on the onboarding screen, everything else
 * stays plain so the setup steps stay legible.
 */
export function StarfieldBackdrop() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    const stars = Array.from({ length: 120 }, () => ({
      x: Math.random(),
      y: Math.random(),
      r: Math.random() * 1.2 + 0.2,
      drift: Math.random() * 0.00015 + 0.00003,
    }));

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const draw = (t: number) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const s of stars) {
        const y = prefersReducedMotion ? s.y : (s.y + t * s.drift) % 1;
        ctx.beginPath();
        ctx.arc(s.x * canvas.width, y * canvas.height, s.r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(230, 231, 238, 0.5)";
        ctx.fill();
      }
      if (!prefersReducedMotion) raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none absolute inset-0 z-0"
      style={{
        background:
          "radial-gradient(ellipse at top, #1a1530 0%, #0b0d12 55%, #08090d 100%)",
      }}
    />
  );
}
