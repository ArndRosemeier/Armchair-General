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
  confetti.style.position = 'fixed';
  confetti.style.left = '0';
  confetti.style.top = '0';
  confetti.style.width = '100vw';
  confetti.style.height = '100vh';
  confetti.style.zIndex = '0';
  confetti.style.pointerEvents = 'none';
  modal.appendChild(confetti);
  function resizeConfetti() {
    confetti.width = window.innerWidth;
    confetti.height = window.innerHeight;
  }
  window.addEventListener('resize', resizeConfetti);
  // Message box
  const box = document.createElement('div');
  box.style.width = '50vw';
  box.style.height = '50vh';
  box.style.background = 'url("Won.png") center/cover no-repeat';
  box.style.padding = '48px 64px';
  box.style.borderRadius = '24px';
  box.style.boxShadow = '0 4px 32px rgba(0,0,0,0.25)';
  box.style.display = 'flex';
  box.style.flexDirection = 'column';
  box.style.alignItems = 'center';
  box.style.gap = '32px';
  box.style.position = 'relative';
  box.style.zIndex = '1';
  // Message container in upper right
  const msgContainer = document.createElement('div');
  msgContainer.style.position = 'absolute';
  msgContainer.style.top = '32px';
  msgContainer.style.right = '48px';
  msgContainer.style.display = 'flex';
  msgContainer.style.flexDirection = 'column';
  msgContainer.style.alignItems = 'flex-end';
  msgContainer.style.zIndex = '2';
  msgContainer.style.padding = '12px 24px';
  msgContainer.style.background = 'rgba(255,255,255,0.0)';
  // WINNER text
  const winnerText = document.createElement('div');
  winnerText.textContent = 'WINNER';
  winnerText.style.fontFamily = "'MedievalSharp', 'Times New Roman', serif";
  winnerText.style.fontSize = '2.7rem';
  winnerText.style.fontWeight = 'bold';
  winnerText.style.color = '#222';
  winnerText.style.textShadow = '0 2px 8px #fff,0 0 8px #000';
  msgContainer.appendChild(winnerText);
  // Player name
  const nameText = document.createElement('div');
  nameText.textContent = playerName;
  nameText.style.fontFamily = "'MedievalSharp', 'Times New Roman', serif";
  nameText.style.fontSize = '2.1rem';
  nameText.style.fontWeight = 'bold';
  nameText.style.color = '#fff';
  nameText.style.marginTop = '8px';
  nameText.style.textShadow = '0 0 16px #ffd700, 0 0 32px #43cea2, 0 0 48px #ff00cc, 0 0 64px #00e6e6';
  nameText.style.animation = 'win-glow 2.2s linear infinite';
  // Add keyframes for the glow animation
  const styleSheet = document.createElement('style');
  styleSheet.textContent = `@keyframes win-glow {
    0% { text-shadow: 0 0 16px #ffd700, 0 0 32px #43cea2, 0 0 48px #ff00cc, 0 0 64px #00e6e6; }
    25% { text-shadow: 0 0 24px #43cea2, 0 0 40px #ffd700, 0 0 56px #00e6e6, 0 0 72px #ff00cc; }
    50% { text-shadow: 0 0 32px #ff00cc, 0 0 48px #00e6e6, 0 0 64px #ffd700, 0 0 80px #43cea2; }
    75% { text-shadow: 0 0 24px #00e6e6, 0 0 40px #ff00cc, 0 0 56px #43cea2, 0 0 72px #ffd700; }
    100% { text-shadow: 0 0 16px #ffd700, 0 0 32px #43cea2, 0 0 48px #ff00cc, 0 0 64px #00e6e6; }
  }`;
  document.head.appendChild(styleSheet);
  msgContainer.appendChild(nameText);
  // Button
  const closeBtn = document.createElement('button');
  closeBtn.textContent = 'OK';
  closeBtn.style.marginTop = '18px';
  closeBtn.style.padding = '12px 36px';
  closeBtn.style.fontSize = '1.3rem';
  closeBtn.style.border = 'none';
  closeBtn.style.borderRadius = '8px';
  closeBtn.style.background = 'linear-gradient(90deg,#43cea2 0%,#ffd700 100%)';
  closeBtn.style.color = '#222';
  closeBtn.style.fontWeight = 'bold';
  closeBtn.style.cursor = 'pointer';
  closeBtn.style.textShadow = '0 2px 8px #fff,0 0 8px #000';
  closeBtn.onclick = () => {
    running = false;
    window.removeEventListener('resize', resizeConfetti);
    if (modal && modal.parentNode) modal.parentNode.removeChild(modal);
    if (onClose) onClose();
  };
  msgContainer.appendChild(closeBtn);
  box.appendChild(msgContainer);
  modal.appendChild(box);
  document.body.appendChild(modal);
  // --- Fireworks animation ---
  const ctx = confetti.getContext('2d');
  type Firework = {
    x: number;
    y: number;
    vx: number;
    vy: number;
    color: string;
    exploded: boolean;
    particles: Particle[];
    age: number;
    targetY: number;
  };
  type Particle = {
    x: number;
    y: number;
    vx: number;
    vy: number;
    color: string;
    alpha: number;
    age: number;
  };
  const fireworks: Firework[] = [];
  let highestY = confetti.height;
  function launchFirework() {
    const x = Math.random() * confetti.width * 0.8 + confetti.width * 0.1;
    // Explode at the very top: 2% to 6% of the canvas height
    const targetY = confetti.height * 0.02 + Math.random() * confetti.height * 0.04;
    const vx = (Math.random() - 0.5) * 2;
    const vy = (-8 - Math.random() * 4) * 2;
    const color = `hsl(${Math.random()*360},90%,60%)`;
    fireworks.push({ x, y: confetti.height, vx, vy, color, exploded: false, particles: [], age: 0, targetY });
  }
  function explode(fw: Firework) {
    for (let i = 0; i < 48; i++) {
      const angle = (i / 48) * 2 * Math.PI;
      const speed = 2 + Math.random() * 2.5;
      fw.particles.push({
        x: fw.x,
        y: fw.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: fw.color,
        alpha: 1,
        age: 0
      });
    }
  }
  let running = true;
  function drawFireworks() {
    if (!running || !ctx) return;
    ctx.clearRect(0,0,confetti.width,confetti.height);
    // Launch new fireworks
    if (Math.random() < 0.06 && fireworks.length < 7) launchFirework();
    for (const fw of fireworks) {
      if (!fw.exploded) {
        fw.x += fw.vx;
        fw.y += fw.vy;
        fw.vy += 0.13;
        fw.age++;
        if (fw.y < highestY) highestY = fw.y;
        ctx.save();
        ctx.beginPath();
        ctx.arc(fw.x, fw.y, 4, 0, 2 * Math.PI);
        ctx.fillStyle = fw.color;
        ctx.globalAlpha = 0.9;
        ctx.shadowColor = fw.color;
        ctx.shadowBlur = 16;
        ctx.fill();
        ctx.restore();
        // Explode when reaching the targetY (canvas coordinates)
        if (fw.y <= fw.targetY) {
          fw.exploded = true;
          explode(fw);
        }
      } else {
        for (const p of fw.particles) {
          p.x += p.vx;
          p.y += p.vy;
          p.vy += 0.04;
          p.alpha -= 0.012 + Math.random() * 0.01;
          p.age++;
          ctx.save();
      ctx.beginPath();
          ctx.arc(p.x, p.y, 2.2, 0, 2 * Math.PI);
      ctx.fillStyle = p.color;
          ctx.globalAlpha = Math.max(0, p.alpha);
          ctx.shadowColor = p.color;
          ctx.shadowBlur = 8;
      ctx.fill();
          ctx.restore();
    }
        fw.particles = fw.particles.filter(p => p.alpha > 0.05 && p.age < 90);
      }
    }
    // Remove old fireworks
    for (let i = fireworks.length - 1; i >= 0; i--) {
      if (fireworks[i].exploded && fireworks[i].particles.length === 0) {
        fireworks.splice(i, 1);
      }
    }
    requestAnimationFrame(drawFireworks);
  }
  drawFireworks();
} 