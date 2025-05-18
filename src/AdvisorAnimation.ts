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

// Main function to run the advisor animation
export async function runAdvisorAnimation(gameGui: GameGui, opportunity: Opportunity) {
  const mapArea = document.querySelector('div[style*="flex: 3"]') as HTMLElement;
  if (!mapArea) return;
  // Create overlay canvas for splashes
  let overlay = document.getElementById('advisor-animation-overlay') as HTMLCanvasElement | null;
  if (!overlay) {
    overlay = document.createElement('canvas');
    overlay.id = 'advisor-animation-overlay';
    overlay.width = mapArea.clientWidth;
    overlay.height = mapArea.clientHeight;
    overlay.style.position = 'absolute';
    overlay.style.left = '0';
    overlay.style.top = '0';
    overlay.style.pointerEvents = 'none';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.zIndex = '100';
    mapArea.appendChild(overlay);
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
    // Get center in canvas coordinates
    let [cx, cy] = country.center();
    // If map is scaled, adjust
    const mapCanvas = mapArea.querySelector('canvas');
    if (mapCanvas) {
      const scaleX = mapCanvas.clientWidth / mapCanvas.width;
      const scaleY = mapCanvas.clientHeight / mapCanvas.height;
      cx *= scaleX;
      cy *= scaleY;
    }
    // Draw splash
    const start = performance.now();
    drawRedSplash(ctx, cx, cy, start, 1000);
    // Wait 1 second
    await new Promise(res => setTimeout(res, 1000));
    ctx.clearRect(0, 0, overlay.width, overlay.height);
  }
  // After all, update action buttons with full click history
  gameGui.setClickedCountryNames(history);
  gameGui.updateActionButtons();
  // Remove overlay after animation
  overlay.parentElement?.removeChild(overlay);
} 