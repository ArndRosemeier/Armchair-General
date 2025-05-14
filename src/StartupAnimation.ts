// StartupAnimation.ts
export function showStartupAnimation(mapArea: HTMLElement, onFinish: () => void) {
  // Create overlay container for the map area only
  const overlay = document.createElement('div');
  overlay.style.position = 'absolute';
  overlay.style.left = '0';
  overlay.style.top = '0';
  overlay.style.width = '100%';
  overlay.style.height = '100%';
  overlay.style.zIndex = '10000';
  overlay.style.display = 'flex';
  overlay.style.alignItems = 'center';
  overlay.style.justifyContent = 'center';
  overlay.style.pointerEvents = 'none';
  overlay.style.overflow = 'hidden';
  // No background or semi-transparent overlay!

  // 'Armchair' above, 'General' below, both slide in horizontally
  const armchairText = document.createElement('div');
  armchairText.innerText = 'Armchair';
  armchairText.style.position = 'relative';
  armchairText.style.color = '#fffbe6';
  armchairText.style.fontFamily = '"Cinzel Decorative", "Old English Text MT", "UnifrakturCook", "Times New Roman", serif';
  armchairText.style.fontSize = '6vw';
  armchairText.style.fontWeight = 'bold';
  armchairText.style.textShadow = '0 0 60px #b22222, 0 0 16px #fffbe6, 0 0 8px #bfa76f, 0 0 2px #fff, 0 4px 24px #b22222, 0 0 32px #ffd700';
  armchairText.style.letterSpacing = '0.18em';
  armchairText.style.opacity = '0';
  armchairText.style.transform = 'translateX(-120%) skew(-12deg)';
  armchairText.style.transition = 'opacity 0.7s, transform 1.7s cubic-bezier(0.22,1,0.36,1)';
  armchairText.style.filter = 'drop-shadow(0 0 12px #fffbe6)';
  armchairText.style.background = '';
  armchairText.style.webkitBackgroundClip = '';
  armchairText.style.backgroundClip = '';
  armchairText.style.webkitTextFillColor = '';

  const generalText = document.createElement('div');
  generalText.innerText = 'General';
  generalText.style.position = 'relative';
  generalText.style.color = '#fffbe6';
  generalText.style.fontFamily = '"Cinzel Decorative", "Old English Text MT", "UnifrakturCook", "Times New Roman", serif';
  generalText.style.fontSize = '6vw';
  generalText.style.fontWeight = 'bold';
  generalText.style.textShadow = '0 0 60px #b22222, 0 0 16px #fffbe6, 0 0 8px #bfa76f, 0 0 2px #fff, 0 4px 24px #b22222, 0 0 32px #ffd700';
  generalText.style.letterSpacing = '0.18em';
  generalText.style.opacity = '0';
  generalText.style.transform = 'translateX(120%) skew(12deg)';
  generalText.style.transition = 'opacity 0.7s, transform 1.7s cubic-bezier(0.22,1,0.36,1)';
  generalText.style.filter = 'drop-shadow(0 0 12px #fffbe6)';
  generalText.style.background = '';
  generalText.style.webkitBackgroundClip = '';
  generalText.style.backgroundClip = '';
  generalText.style.webkitTextFillColor = '';

  // Container for the two lines, stacked vertically
  const textContainer = document.createElement('div');
  textContainer.style.display = 'flex';
  textContainer.style.flexDirection = 'column';
  textContainer.style.alignItems = 'center';
  textContainer.style.justifyContent = 'center';
  textContainer.style.gap = '1vw';
  textContainer.style.pointerEvents = 'none';
  textContainer.appendChild(armchairText);
  textContainer.appendChild(generalText);
  overlay.appendChild(textContainer);

  // Add overlay to map area
  mapArea.appendChild(overlay);

  // --- Cannonball Animation ---
  // Create a canvas for the cannonball and explosion animation
  const canvas = document.createElement('canvas');
  canvas.width = mapArea.offsetWidth || 800;
  canvas.height = mapArea.offsetHeight || 600;
  canvas.style.position = 'absolute';
  canvas.style.left = '0';
  canvas.style.top = '0';
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.pointerEvents = 'none';
  overlay.appendChild(canvas);
  const ctx = canvas.getContext('2d');

  // Cannonball parameters
  type CannonBall = {
    startX: number;
    startY: number;
    endX: number;
    endY: number;
    duration: number;
    startTime: number | null;
    exploded: boolean;
    explosionTime: number | null;
    arcHeight: number;
  };
  const numBalls = 10;
  const balls: CannonBall[] = [];
  const centerX = canvas.width / 2;
  const baseY = canvas.height * 0.8;
  for (let i = 0; i < numBalls; i++) {
    // Alternate left/right
    const fromLeft = i % 2 === 0;
    const startX = fromLeft ? canvas.width * 0.05 : canvas.width * 0.95;
    // Land more randomly across the lower half
    const endX = canvas.width * (0.15 + 0.7 * Math.random());
    const startY = baseY - canvas.height * 0.25 + Math.random() * canvas.height * 0.1;
    const endY = baseY - canvas.height * 0.05 + Math.random() * canvas.height * 0.18;
    const duration = 1200 + Math.random() * 400;
    const arcHeight = canvas.height * (0.32 + Math.random() * 0.12); // high arc
    balls.push({
      startX,
      startY,
      endX,
      endY,
      duration,
      startTime: null,
      exploded: false,
      explosionTime: null,
      arcHeight
    });
  }

  function drawCannonball(x: number, y: number, scale: number) {
    if (!ctx) return;
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, 18 * scale, 0, 2 * Math.PI);
    ctx.fillStyle = 'rgba(40,40,40,0.95)';
    ctx.shadowColor = '#222';
    ctx.shadowBlur = 12 * scale;
    ctx.fill();
    ctx.restore();
    // Add a metallic highlight
    ctx.save();
    ctx.beginPath();
    ctx.arc(x - 6 * scale, y - 6 * scale, 5 * scale, 0, 2 * Math.PI);
    ctx.fillStyle = 'rgba(200,200,200,0.18)';
    ctx.fill();
    ctx.restore();
  }

  function drawExplosion(x: number, y: number, t: number) {
    if (!ctx) return;
    // t: 0 (start) to 1 (end)
    // More realistic: flash, fireball, smoke
    // Flash (very quick, at start)
    if (t < 0.15) {
      const r = 38 + 60 * t;
      ctx.save();
      ctx.beginPath();
      ctx.arc(x, y, r, 0, 2 * Math.PI);
      ctx.fillStyle = `rgba(255,255,220,${0.7 * (1-t/0.15)})`;
      ctx.shadowColor = '#fffbe6';
      ctx.shadowBlur = 48;
      ctx.fill();
      ctx.restore();
    }
    // Fireball (expands, then fades)
    if (t < 0.6) {
      const r = 32 + 80 * t;
      ctx.save();
      ctx.beginPath();
      ctx.arc(x, y, r, 0, 2 * Math.PI);
      ctx.fillStyle = `rgba(255,120,40,${0.5 * (1-t/0.6)})`;
      ctx.shadowColor = '#ffae42';
      ctx.shadowBlur = 32;
      ctx.fill();
      ctx.restore();
      // Inner core
      ctx.save();
      ctx.beginPath();
      ctx.arc(x, y, r * 0.5, 0, 2 * Math.PI);
      ctx.fillStyle = `rgba(255,220,120,${0.7 * (1-t/0.6)})`;
      ctx.shadowColor = '#fffbe6';
      ctx.shadowBlur = 16;
      ctx.fill();
      ctx.restore();
    }
    // Smoke (lingers)
    if (t > 0.2) {
      const smokeT = (t - 0.2) / 0.8;
      for (let i = 0; i < 4; i++) {
        const angle = Math.PI * 2 * (i / 4) + Math.random() * 0.2;
        const r = 38 + 60 * t + Math.random() * 10;
        const sx = x + Math.cos(angle) * r * 0.7 * smokeT;
        const sy = y + Math.sin(angle) * r * 0.5 * smokeT + 10 * smokeT;
        ctx.save();
        ctx.beginPath();
        ctx.arc(sx, sy, 18 + 18 * smokeT, 0, 2 * Math.PI);
        ctx.fillStyle = `rgba(80,60,40,${0.18 * (1-smokeT)})`;
        ctx.shadowColor = '#222';
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.restore();
      }
    }
  }

  function animateCannonballs(ts: number) {
    ctx!.clearRect(0, 0, canvas.width, canvas.height);
    let allExploded = true;
    for (const ball of balls) {
      if (!ball.startTime) ball.startTime = ts;
      const elapsed = ts - ball.startTime;
      if (!ball.exploded) {
        allExploded = false;
        // Side-to-center high arc
        const t = Math.min(elapsed / ball.duration, 1);
        const x = ball.startX + (ball.endX - ball.startX) * t;
        // Parabolic arc: y = (1-t)*startY + t*endY - arcHeight * 4 * t * (1-t)
        const y = (1 - t) * ball.startY + t * ball.endY - ball.arcHeight * 4 * t * (1 - t);
        const scale = 0.9 + 0.3 * (1 - Math.abs(2 * t - 1));
        drawCannonball(x, y, scale);
        if (t >= 1) {
          ball.exploded = true;
          ball.explosionTime = ts;
        }
      } else if (ball.explosionTime && ts - ball.explosionTime < 700) {
        // Draw explosion
        const tExp = (ts - ball.explosionTime) / 700;
        drawExplosion(ball.endX, ball.endY, tExp);
        allExploded = false;
      }
    }
    if (!allExploded) {
      requestAnimationFrame(animateCannonballs);
    }
  }
  requestAnimationFrame(animateCannonballs);

  // Animate text lines sliding in horizontally
  setTimeout(() => {
    armchairText.style.opacity = '1';
    armchairText.style.transform = 'translateX(0) skew(0)';
    generalText.style.opacity = '1';
    generalText.style.transform = 'translateX(0) skew(0)';
  }, 400);

  // No more sparkles!

  // Do NOT remove the overlay at the end of the animation; leave it visible
  // Just call onFinish after the animation delay
  setTimeout(() => {
    onFinish();
  }, 3200);

  // Load web fonts for extra fanciness
  const fontLink1 = document.createElement('link');
  fontLink1.rel = 'stylesheet';
  fontLink1.href = 'https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@700&family=UnifrakturCook:wght@700&display=swap';
  document.head.appendChild(fontLink1);
} 