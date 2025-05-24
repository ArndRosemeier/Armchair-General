// BalloonAnimation.ts
// Animation: Balloons spelling 'Futuremagic-Productions' meander in a snake-like path

const BALLOON_IMAGE_SRC = `${import.meta.env.BASE_URL}Balloon.png`;
const BALLOON_LETTERS = Array.from('Futuremagic-Productions');
const BALLOON_COUNT = BALLOON_LETTERS.length;
const BALLOON_SCALE = 0.18; // Shrink the balloon image
const BALLOON_SPACING = 192; // px between balloons (increased by a factor of 3)
const SNAKE_AMPLITUDE = 48; // px
const SNAKE_WAVELENGTH = 220; // px
const SNAKE_SPEED = 0.12; // radians/sec
const TURN_RADIUS = 80; // px, how sharply the snake can turn
const EDGE_MARGIN = 32; // px, how close to edge before turning
const MOTION_MARGIN = 80;
const ANTICIPATION_MARGIN = MOTION_MARGIN + 80;

export function showBalloonAnimation(
  mapArea: HTMLElement,
  onFinish: () => void
) {
  // Overlay setup
  const overlay = document.createElement('div');
  overlay.style.position = 'absolute';
  overlay.style.left = '0';
  overlay.style.top = '0';
  overlay.style.width = '100%';
  overlay.style.height = '100%';
  overlay.style.zIndex = '10000';
  overlay.style.pointerEvents = 'none';
  overlay.style.overflow = 'hidden';
  mapArea.appendChild(overlay);

  // Canvas setup
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
  const ctx = canvas.getContext('2d')!;

  // Load balloon image
  const balloonImg = new window.Image();
  balloonImg.src = BALLOON_IMAGE_SRC;
  balloonImg.onload = () => {
    startAnimation();
  };

  // Pick a random edge and start fully off-canvas, aiming toward a random point inside the motion margin area
  let snakeCenter: { x: number; y: number };
  let snakeDir: number;
  const side = Math.floor(Math.random() * 4);
  const targetX = MOTION_MARGIN + Math.random() * (canvas.width - 2 * MOTION_MARGIN);
  const targetY = MOTION_MARGIN + Math.random() * (canvas.height - 2 * MOTION_MARGIN);
  if (side === 0) { // left
    snakeCenter = { x: -canvas.width * 0.2, y: targetY };
    snakeDir = Math.atan2(targetY - snakeCenter.y, targetX - snakeCenter.x);
  } else if (side === 1) { // right
    snakeCenter = { x: canvas.width + canvas.width * 0.2, y: targetY };
    snakeDir = Math.atan2(targetY - snakeCenter.y, targetX - snakeCenter.x);
  } else if (side === 2) { // top
    snakeCenter = { x: targetX, y: -canvas.height * 0.2 };
    snakeDir = Math.atan2(targetY - snakeCenter.y, targetX - snakeCenter.x);
  } else { // bottom
    snakeCenter = { x: targetX, y: canvas.height + canvas.height * 0.2 };
    snakeDir = Math.atan2(targetY - snakeCenter.y, targetX - snakeCenter.x);
  }
  let hasEnteredMotionArea = false;
  const snakeSpeed = 1.0; // px per frame, slowed down by a factor of 2
  // Store the path of the head balloon, including fake 3D scale
  const path: { x: number; y: number; dir: number; scale3d: number }[] = [];
  // How many frames to keep in the path (enough for all balloons)
  const maxPathLength = Math.ceil((BALLOON_COUNT + 2) * BALLOON_SPACING);

  // For smoothing and clamping the fake 3D scale
  let lastScale3d = BALLOON_SCALE;
  const maxScaleDelta = 0.002; // Even subtler per-frame change

  function startAnimation() {
    let lastTime = performance.now();
    function animate(now: number) {
      const dt = Math.min(40, now - lastTime);
      lastTime = now;
      // Move snake head
      let edgeTurn = false;
      // If close to edge, steer back
      const margin = EDGE_MARGIN;
      if (
        snakeCenter.x < margin ||
        snakeCenter.x > canvas.width - margin ||
        snakeCenter.y < margin ||
        snakeCenter.y > canvas.height - margin
      ) {
        // Compute angle to center
        const dx = canvas.width / 2 - snakeCenter.x;
        const dy = canvas.height / 2 - snakeCenter.y;
        const targetAngle = Math.atan2(dy, dx);
        // Smoothly turn towards center
        const da = ((targetAngle - snakeDir + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
        snakeDir += da * 0.04;
        edgeTurn = true;
      }
      if (!edgeTurn) {
        // Anticipate border: if close to edge, start turning toward center
        let anticipating = false;
        let anticipationTarget = null;
        if (
          snakeCenter.x < ANTICIPATION_MARGIN ||
          snakeCenter.x > canvas.width - ANTICIPATION_MARGIN ||
          snakeCenter.y < ANTICIPATION_MARGIN ||
          snakeCenter.y > canvas.height - ANTICIPATION_MARGIN
        ) {
          anticipationTarget = {
            x: Math.max(MOTION_MARGIN, Math.min(canvas.width - MOTION_MARGIN, snakeCenter.x)),
            y: Math.max(MOTION_MARGIN, Math.min(canvas.height - MOTION_MARGIN, snakeCenter.y))
          };
          anticipating = true;
        }
        if (anticipating && anticipationTarget) {
          // Turn smoothly toward center of motion area
          const centerX = canvas.width / 2;
          const centerY = canvas.height / 2;
          const targetAngle = Math.atan2(centerY - snakeCenter.y, centerX - snakeCenter.x);
          const da = ((targetAngle - snakeDir + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
          snakeDir += da * 0.04;
        } else {
          // Meander: add gentle, slow sine wave to direction
          const t = now * SNAKE_SPEED * 0.001;
          snakeDir += Math.sin(t * 0.5) * 0.005;
        }
      }
      // Move forward at constant speed
      snakeCenter.x += Math.cos(snakeDir) * snakeSpeed;
      snakeCenter.y += Math.sin(snakeDir) * snakeSpeed;

      // Only clamp head position after the head has entered the motion area for the first time
      if (!hasEnteredMotionArea) {
        if (
          snakeCenter.x >= MOTION_MARGIN && snakeCenter.x <= canvas.width - MOTION_MARGIN &&
          snakeCenter.y >= MOTION_MARGIN && snakeCenter.y <= canvas.height - MOTION_MARGIN
        ) {
          hasEnteredMotionArea = true;
        }
      } else {
        if (snakeCenter.x < MOTION_MARGIN) snakeCenter.x = MOTION_MARGIN;
        if (snakeCenter.x > canvas.width - MOTION_MARGIN) snakeCenter.x = canvas.width - MOTION_MARGIN;
        if (snakeCenter.y < MOTION_MARGIN) snakeCenter.y = MOTION_MARGIN;
        if (snakeCenter.y > canvas.height - MOTION_MARGIN) snakeCenter.y = canvas.height - MOTION_MARGIN;
      }

      // Compute fake 3D scale for this head position
      const t3d = (performance.now() * 0.000012) % 1;
      const phaseA = t3d * Math.PI * 2;
      const phaseB = t3d * Math.PI * 2 * 0.73 + 1.7;
      const phaseC = t3d * Math.PI * 2 * 0.41 + 2.3;
      // Sum of three slow sines for smooth, organic movement
      const erratic = 0.18 * Math.sin(phaseB) + 0.12 * Math.sin(phaseA * 1.31 + 0.9) + 0.09 * Math.sin(phaseC);
      let scale3dTarget = BALLOON_SCALE * (0.7 + 0.6 * (0.5 + 0.5 * Math.sin(phaseA) + erratic));
      // Clamp target before lerp
      let deltaTarget = scale3dTarget - lastScale3d;
      if (Math.abs(deltaTarget) > maxScaleDelta) {
        scale3dTarget = lastScale3d + Math.sign(deltaTarget) * maxScaleDelta;
      }
      // Lerp smoothing
      let scale3d = lastScale3d + (scale3dTarget - lastScale3d) * 0.18;
      // Clamp after lerp
      const delta = scale3d - lastScale3d;
      if (Math.abs(delta) > maxScaleDelta) {
        scale3d = lastScale3d + Math.sign(delta) * maxScaleDelta;
      }
      lastScale3d = scale3d;
      // Store head position and scale in path
      path.unshift({ x: snakeCenter.x, y: snakeCenter.y, dir: snakeDir, scale3d });
      if (path.length > maxPathLength) path.pop();

      // Draw
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // --- Draw rope between balloons ---
      // Collect all balloon positions first
      const balloonPositions: { x: number; y: number }[] = [];
      for (let i = 0; i < BALLOON_COUNT; ++i) {
        const pathIdx = Math.floor(i * BALLOON_SPACING);
        const pos = path[pathIdx] || path[path.length - 1] || { x: snakeCenter.x, y: snakeCenter.y, dir: snakeDir, scale3d: BALLOON_SCALE };
        // Attach rope higher: a bit above the balloon's center (by a fraction of balloon height)
        const scale = pos.scale3d;
        const h = balloonImg.height * scale;
        balloonPositions.push({ x: pos.x, y: pos.y - h * 0.1 });
      }
      // Draw rope as a series of quadratic curves between each pair
      ctx.save();
      ctx.strokeStyle = '#bfa76f';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#fffbe6';
      ctx.shadowBlur = 6;
      ctx.beginPath();
      for (let i = 0; i < balloonPositions.length - 1; ++i) {
        const p0 = balloonPositions[i];
        const p1 = balloonPositions[i + 1];
        // Midpoint between p0 and p1
        const mx = (p0.x + p1.x) / 2;
        const my = (p0.y + p1.y) / 2;
        // Sag amount: proportional to distance, modulated for dynamic effect
        const dist = Math.hypot(p1.x - p0.x, p1.y - p0.y);
        const t = performance.now() * 0.001;
        const dynamicSag = 18 + 12 * Math.sin(t + i * 0.7);
        const sag = dist * 0.18 + dynamicSag;
        // Control point below the midpoint
        const cx = mx;
        const cy = my + sag;
        if (i === 0) {
          ctx.moveTo(p0.x, p0.y);
        }
        ctx.quadraticCurveTo(cx, cy, p1.x, p1.y);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.restore();

      // Collect all balloon render data
      const balloonRenderData = [];
      for (let i = 0; i < BALLOON_COUNT; ++i) {
        const pathIdx = Math.floor(i * BALLOON_SPACING);
        const pos = path[pathIdx] || path[path.length - 1] || { x: snakeCenter.x, y: snakeCenter.y, dir: snakeDir, scale3d: BALLOON_SCALE };
        balloonRenderData.push({
          i,
          x: pos.x,
          y: pos.y,
          scale3d: pos.scale3d
        });
      }
      // Sort by scale3d (smallest first)
      balloonRenderData.sort((a, b) => a.scale3d - b.scale3d);
      // Render in sorted order
      for (const data of balloonRenderData) {
        const { i, x: bx, y: by, scale3d } = data;
        const w = balloonImg.width * scale3d;
        const h = balloonImg.height * scale3d;
        ctx.save();
        ctx.globalAlpha = 0.98;
        ctx.drawImage(balloonImg, bx - w / 2, by - h, w, h);
        // Draw letter
        ctx.font = `bold ${Math.round(256 * scale3d)}px Cinzel, Arial, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = 'orange';
        ctx.strokeStyle = '#fffbe6';
        ctx.lineWidth = 2.2;
        ctx.shadowColor = 'orange';
        ctx.shadowBlur = 24 * scale3d;
        ctx.strokeText(BALLOON_LETTERS[i], bx, by - h * 0.55);
        ctx.fillText(BALLOON_LETTERS[i], bx, by - h * 0.55);
        ctx.shadowBlur = 0;
        ctx.restore();
      }

      requestAnimationFrame(animate);
    }
    requestAnimationFrame(animate);
  }

  // Call onFinish after a set time (e.g., 8 seconds)
  setTimeout(() => {
    onFinish();
    // Optionally remove overlay
    // overlay.remove();
  }, 8000);
} 