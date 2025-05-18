import { Opportunity } from './Opportunity';
import { GameGui } from './GameGui';
import { Country } from './Country';

// Draws a red splash (concentric rings) at (x, y) on the given canvas for 1 second
function drawRedSplash(ctx: CanvasRenderingContext2D, x: number, y: number, start: number, duration: number) {
  const animate = () => {
    const now = performance.now();
    const t = Math.min(1, (now - start) / duration);
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    for (let i = 0; i < 5; i++) {
      const r = 18 + 28 * t + i * 12;
      ctx.save();
      ctx.beginPath();
      ctx.arc(x, y, r, 0, 2 * Math.PI);
      // Rainbow: cycle hue for each ring
      const hue = (360 * (i / 5) + 360 * t) % 360;
      ctx.strokeStyle = `hsla(${hue}, 95%, 55%, ${0.85 * (1 - t)})`;
      ctx.lineWidth = 5 - i * 1.2;
      ctx.globalAlpha = 1 * (1 - t);
      ctx.shadowColor = `hsla(${hue}, 95%, 65%, 0.8)`;
      ctx.shadowBlur = 18;
      ctx.stroke();
      ctx.restore();
    }
    if (t < 1) {
      requestAnimationFrame(animate);
    } else {
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    }
  };
  animate();
}

// Draws a rainbow splash (concentric rings) at (x, y) on the given canvas for 1 second
function drawRainbowSplash(ctx: CanvasRenderingContext2D, x: number, y: number, start: number, duration: number) {
  const animate = () => {
    const now = performance.now();
    const t = Math.min(1, (now - start) / duration);
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    for (let i = 0; i < 5; i++) {
      const r = 18 + 28 * t + i * 12;
      ctx.save();
      ctx.beginPath();
      ctx.arc(x, y, r, 0, 2 * Math.PI);
      // Rainbow: cycle hue for each ring
      const hue = (360 * (i / 5) + 360 * t) % 360;
      ctx.strokeStyle = `hsla(${hue}, 95%, 55%, ${0.85 * (1 - t)})`;
      ctx.lineWidth = 5 - i * 1.2;
      ctx.globalAlpha = 1 * (1 - t);
      ctx.shadowColor = `hsla(${hue}, 95%, 65%, 0.8)`;
      ctx.shadowBlur = 18;
      ctx.stroke();
      ctx.restore();
    }
    if (t < 1) {
      requestAnimationFrame(animate);
    } else {
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    }
  };
  animate();
}

// Animate the hand image moving to the center, then play splash and retreat at the same time
async function animateHandAndSplash(ctx: CanvasRenderingContext2D, x: number, y: number, overlay: HTMLCanvasElement) {
  return new Promise<void>((resolve) => {
    const handImg = new window.Image();
    handImg.src = 'Hand.png';
    handImg.onload = () => {
      const handW = handImg.width * 0.5;
      const handH = handImg.height * 0.5;
      // Animation params
      const duration = 500; // ms for hand to move in (faster)
      const handPause = 200; // ms to pause at the country
      const splashDuration = 1000; // ms for splash
      const retreatDuration = 700; // ms for hand to move out
      const totalDuration = duration + splashDuration; // hand and splash start together
      const start = performance.now();
      // Start and end positions for the hand (bottom left corner)
      const startX = x + 100;
      const startY = y - 100;
      const endX = x;
      const endY = y;
      let splashStarted = false;
      let frameCount = 0;
      function drawFrame(now: number) {
        const t = now - start;
        ctx.clearRect(0, 0, overlay.width, overlay.height);
        let handX = startX, handY = startY;
        let handAlpha = 1;
        // Hand moves in
        if (t < duration) {
          const p = t / duration;
          handX = startX + (endX - startX) * p;
          handY = startY + (endY - startY) * p;
          handAlpha = p; // Fade in
        } else if (t < duration + handPause) {
          // Hand is at target, pause, splash starts
          handX = endX;
          handY = endY;
          handAlpha = 1;
        } else {
          // Hand retreats while splash plays
          if (!splashStarted) {
            splashStarted = true;
          }
          const retreatT = Math.min(1, (t - duration - handPause) / retreatDuration);
          handX = endX + (startX - endX) * retreatT;
          handY = endY + (startY - endY) * retreatT;
          handAlpha = 1 - retreatT; // Fade out
        }
        // Clamp handAlpha to a minimum of 0.01
        handAlpha = Math.max(0.01, Math.min(1, handAlpha));
        // Draw splash (starts at duration, lasts splashDuration)
        const splashT = Math.min(1, (t - duration) / splashDuration);
        if (splashT < 1 && t >= duration) {
          for (let i = 0; i < 5; i++) {
            const r = 18 + 28 * splashT + i * 12;
            ctx.save();
            ctx.beginPath();
            ctx.arc(x, y, r, 0, 2 * Math.PI);
            const hue = (360 * (i / 5) + 360 * splashT) % 360;
            ctx.strokeStyle = `hsla(${hue}, 95%, 55%, ${0.85 * (1 - splashT)})`;
            ctx.lineWidth = 5 - i * 1.2;
            ctx.globalAlpha = 1 * (1 - splashT);
            ctx.shadowColor = `hsla(${hue}, 95%, 65%, 0.8)`;
            ctx.shadowBlur = 18;
            ctx.stroke();
            ctx.restore();
          }
        }
        // Draw hand with bottom left at (handX, handY)
        ctx.save();
        ctx.globalAlpha = handAlpha;
        ctx.drawImage(handImg, handX, handY - handH, handW, handH);
        ctx.restore();
        if (t < duration + Math.max(splashDuration, handPause + retreatDuration)) {
          requestAnimationFrame(drawFrame);
        } else {
          ctx.clearRect(0, 0, overlay.width, overlay.height);
          resolve();
        }
      }
      requestAnimationFrame(drawFrame);
    };
  });
}

// Main function to run the advisor animation
export async function runAdvisorAnimation(gameGui: GameGui, opportunity: Opportunity) {
  const mapArea = document.querySelector('div[style*="flex: 3"]') as HTMLElement;
  if (!mapArea) return;
  // Get map area position relative to viewport
  const mapRect = mapArea.getBoundingClientRect();
  // Create overlay canvas for splashes and hand
  let overlay = document.getElementById('advisor-animation-overlay') as HTMLCanvasElement | null;
  if (!overlay) {
    overlay = document.createElement('canvas');
    overlay.id = 'advisor-animation-overlay';
    overlay.width = window.innerWidth;
    overlay.height = window.innerHeight;
    overlay.style.position = 'fixed';
    overlay.style.left = '0';
    overlay.style.top = '0';
    overlay.style.pointerEvents = 'none';
    overlay.style.width = '100vw';
    overlay.style.height = '100vh';
    overlay.style.zIndex = '9999';
    document.body.appendChild(overlay);
  } else {
    overlay.width = window.innerWidth;
    overlay.height = window.innerHeight;
  }
  const ctx = overlay.getContext('2d');
  if (!ctx) return;

  let history: string[] = [];
  for (const country of opportunity.countries) {
    // Accumulate click history
    history.push(country.name);
    gameGui.setClickedCountryNames(history);
    // Update info panel
    const infoPanel = document.getElementById('country-info-panel');
    if (infoPanel && gameGui.currentGame && typeof gameGui.currentGame.gameTurn === 'number') {
      const info = gameGui.currentGame.activePlayer.getCountryInfo(country, gameGui.currentGame.gameTurn);
      infoPanel.innerHTML = `
        <div><b>Name:</b> ${info.name}</div>
        <div><b>Owner:</b> ${info.owner ? info.owner.name : 'None'}</div>
        <div><b>Income:</b> ${info.income !== undefined ? info.income : '?'}</div>
        <div><b>Army:</b> ${info.army !== undefined ? info.army : '?'}</div>
        <div><b>Recency:</b> ${info.recency !== undefined ? info.recency : '?'}</div>
      `;
    }
    // Get center in canvas coordinates (relative to mapArea)
    let [cx, cy] = country.center();
    // If map is scaled, adjust
    const mapCanvas = mapArea.querySelector('canvas');
    if (mapCanvas) {
      const scaleX = mapCanvas.clientWidth / mapCanvas.width;
      const scaleY = mapCanvas.clientHeight / mapCanvas.height;
      cx *= scaleX;
      cy *= scaleY;
    }
    // Offset to viewport coordinates
    cx += mapRect.left;
    cy += mapRect.top;
    // Animate hand and splash
    await animateHandAndSplash(ctx, cx, cy, overlay);
    ctx.clearRect(0, 0, overlay.width, overlay.height);
  }
  // After all, update action buttons with full click history
  gameGui.setClickedCountryNames(history);
  gameGui.updateActionButtons();
  // Remove overlay after animation
  overlay.parentElement?.removeChild(overlay);
} 