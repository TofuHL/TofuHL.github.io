// Soft animated particle field drawn behind the planner.
// Dots drift slowly, link up with faint lines when close, and lean gently
// away from the mouse. Colours come from the current theme. The animation
// pauses in hidden tabs and is replaced by a still frame for anyone whose
// device asks for reduced motion.

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  hue: 0 | 1 | 2;
  phase: number;
}

export function initParticles(canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let particles: Particle[] = [];
  let width = 0;
  let height = 0;
  let dpr = 1;
  let colors: [string, string, string] = ['#6366f1', '#ec4899', '#06b6d4'];
  let lineColor = '99, 102, 241';
  let lineAlpha = 0.14;
  let dotAlpha = 0.55;
  const mouse = { x: -9999, y: -9999 };
  let frame = 0;
  let running = false;

  function readTheme(): void {
    const css = getComputedStyle(document.documentElement);
    const get = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback;
    colors = [get('--p1', '#6366f1'), get('--p2', '#ec4899'), get('--p3', '#06b6d4')];
    lineColor = get('--p-line', '99, 102, 241');
    lineAlpha = Number(get('--p-line-alpha', '0.14'));
    dotAlpha = Number(get('--p-dot-alpha', '0.55'));
  }

  function resize(): void {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);

    // About one particle per 14,000 px², capped so phones stay smooth.
    const target = Math.max(28, Math.min(110, Math.round((width * height) / 14000)));
    while (particles.length < target) particles.push(spawn());
    particles.length = target;
    for (const p of particles) {
      if (p.x > width) p.x = Math.random() * width;
      if (p.y > height) p.y = Math.random() * height;
    }
  }

  function spawn(): Particle {
    const speed = 0.08 + Math.random() * 0.22;
    const angle = Math.random() * Math.PI * 2;
    return {
      x: Math.random() * (width || window.innerWidth),
      y: Math.random() * (height || window.innerHeight),
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      r: 0.8 + Math.random() * 2.2,
      hue: Math.floor(Math.random() * 3) as 0 | 1 | 2,
      phase: Math.random() * Math.PI * 2,
    };
  }

  function draw(time: number, move: boolean): void {
    ctx!.clearRect(0, 0, width, height);
    const linkDist = width < 700 ? 90 : 130;
    const linkDist2 = linkDist * linkDist;

    for (const p of particles) {
      if (move) {
        // Lean away from the pointer.
        const dx = p.x - mouse.x;
        const dy = p.y - mouse.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < 140 * 140 && d2 > 0.01) {
          const f = (1 - Math.sqrt(d2) / 140) * 0.6;
          p.x += (dx / Math.sqrt(d2)) * f;
          p.y += (dy / Math.sqrt(d2)) * f;
        }
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < -20) p.x = width + 20;
        if (p.x > width + 20) p.x = -20;
        if (p.y < -20) p.y = height + 20;
        if (p.y > height + 20) p.y = -20;
      }
    }

    // Faint lines between neighbours.
    ctx!.lineWidth = 1;
    for (let i = 0; i < particles.length; i++) {
      const a = particles[i]!;
      for (let j = i + 1; j < particles.length; j++) {
        const b = particles[j]!;
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < linkDist2) {
          ctx!.strokeStyle = `rgba(${lineColor}, ${(1 - d2 / linkDist2) * lineAlpha})`;
          ctx!.beginPath();
          ctx!.moveTo(a.x, a.y);
          ctx!.lineTo(b.x, b.y);
          ctx!.stroke();
        }
      }
    }

    // Glowing dots that twinkle slowly.
    for (const p of particles) {
      const twinkle = 0.65 + 0.35 * Math.sin(time / 1400 + p.phase);
      ctx!.globalAlpha = dotAlpha * twinkle;
      ctx!.fillStyle = colors[p.hue];
      ctx!.shadowColor = colors[p.hue];
      ctx!.shadowBlur = p.r * 4;
      ctx!.beginPath();
      ctx!.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx!.fill();
    }
    ctx!.globalAlpha = 1;
    ctx!.shadowBlur = 0;
  }

  function loop(time: number): void {
    draw(time, true);
    frame = requestAnimationFrame(loop);
  }

  function start(): void {
    if (running || reduceMotion.matches || document.hidden) return;
    running = true;
    frame = requestAnimationFrame(loop);
  }

  function stop(): void {
    running = false;
    cancelAnimationFrame(frame);
  }

  function still(): void {
    draw(0, false);
  }

  readTheme();
  resize();
  if (reduceMotion.matches) still();
  else start();

  window.addEventListener('resize', () => {
    resize();
    if (!running) still();
  });
  window.addEventListener('pointermove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  });
  document.addEventListener('pointerleave', () => {
    mouse.x = -9999;
    mouse.y = -9999;
  });
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
  reduceMotion.addEventListener('change', () => {
    if (reduceMotion.matches) {
      stop();
      still();
    } else start();
  });
  const onTheme = () => {
    readTheme();
    if (!running) still();
  };
  window.addEventListener('planner:theme', onTheme);
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', onTheme);
}
