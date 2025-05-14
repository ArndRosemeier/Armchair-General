export function showWinDialog(playerName: string, winPercent: number, onClose?: () => void) {
  let modal = document.getElementById('gamegui-win-modal');
  if (modal) return; // Only one at a time
  modal = document.createElement('div');
  modal.id = 'gamegui-win-modal';
  modal.style.position = 'fixed';
  modal.style.left = '0';
  modal.style.top = '0';
  modal.style.width = '100vw';
  modal.style.height = '100vh';
  modal.style.background = 'rgba(0,0,0,0.85)';
  modal.style.display = 'flex';
  modal.style.alignItems = 'center';
  modal.style.justifyContent = 'center';
  modal.style.zIndex = '99999';
  // Confetti canvas
  const confetti = document.createElement('canvas');
  confetti.width = window.innerWidth;
  confetti.height = window.innerHeight;
  confetti.style.position = 'absolute';
  confetti.style.left = '0';
  confetti.style.top = '0';
  confetti.style.pointerEvents = 'none';
  modal.appendChild(confetti);
  // Message box
  const box = document.createElement('div');
  box.style.background = 'linear-gradient(120deg,#ffd700 0%,#43cea2 100%)';
  box.style.padding = '48px 64px';
  box.style.borderRadius = '24px';
  box.style.boxShadow = '0 4px 32px rgba(0,0,0,0.25)';
  box.style.display = 'flex';
  box.style.flexDirection = 'column';
  box.style.alignItems = 'center';
  box.style.gap = '32px';
  box.style.position = 'relative';
  const msg = document.createElement('div');
  msg.innerHTML = `<div style="font-size:2.5rem;font-weight:bold;color:#222;text-shadow:0 2px 8px #fff">🎉 ${playerName} WINS! 🎉</div><div style="font-size:1.3rem;color:#333;margin-top:18px">has reached ${winPercent.toFixed(0)}% of world income!</div>`;
  box.appendChild(msg);
  const closeBtn = document.createElement('button');
  closeBtn.textContent = 'OK';
  closeBtn.style.marginTop = '24px';
  closeBtn.style.padding = '12px 36px';
  closeBtn.style.fontSize = '1.3rem';
  closeBtn.style.border = 'none';
  closeBtn.style.borderRadius = '8px';
  closeBtn.style.background = 'linear-gradient(90deg,#43cea2 0%,#ffd700 100%)';
  closeBtn.style.color = '#222';
  closeBtn.style.fontWeight = 'bold';
  closeBtn.style.cursor = 'pointer';
  closeBtn.onclick = () => {
    running = false;
    if (modal && modal.parentNode) modal.parentNode.removeChild(modal);
    if (onClose) onClose();
  };
  box.appendChild(closeBtn);
  modal.appendChild(box);
  document.body.appendChild(modal);
  // --- Confetti animation ---
  const ctx = confetti.getContext('2d');
  const pieces = Array.from({length: 180}, () => ({
    x: Math.random() * confetti.width,
    y: Math.random() * -confetti.height,
    r: 6 + Math.random() * 10,
    d: 2 + Math.random() * 4,
    color: `hsl(${Math.random()*360},90%,60%)`,
    tilt: Math.random() * 10,
    tiltAngle: 0,
    tiltAngleInc: 0.05 + Math.random() * 0.07
  }));
  let running = true;
  function drawConfetti() {
    if (!running || !ctx) return;
    ctx.clearRect(0,0,confetti.width,confetti.height);
    for (const p of pieces) {
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, p.r, p.r/2, p.tilt, 0, 2*Math.PI);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = 0.85;
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    for (const p of pieces) {
      p.y += p.d;
      p.tilt += p.tiltAngleInc;
      if (p.y > confetti.height + 20) {
        p.x = Math.random() * confetti.width;
        p.y = -20;
        p.tilt = Math.random() * 10;
      }
    }
    requestAnimationFrame(drawConfetti);
  }
  drawConfetti();
} 