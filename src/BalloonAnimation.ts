// BalloonAnimation.ts
// Animation: Balloons spelling 'Futuremagic-Productions' meander in a snake-like path

const BALLOON_IMAGE_SRC = `${import.meta.env.BASE_URL}Balloon.png`;
const BALLOON_LETTERS = Array.from('Futuremagic-Productions');
const BALLOON_COUNT = BALLOON_LETTERS.length;
const BALLOON_SCALE = 0.18; // Shrink the balloon image
const BALLOON_SPACING = 64; // px between balloons (increased to avoid overlap)
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
  const snakeSpeed = 2.0; // px per frame, constant speed for all
  // Store the path of the head balloon
  const path: { x: number; y: number; dir: number }[] = [];
  // How many frames to keep in the path (enough for all balloons)
  const maxPathLength = Math.ceil((BALLOON_COUNT + 2) * BALLOON_SPACING);

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

      // Store head position in path
      path.unshift({ x: snakeCenter.x, y: snakeCenter.y, dir: snakeDir });
      if (path.length > maxPathLength) path.pop();

      // Draw
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let i = 0; i < BALLOON_COUNT; ++i) {
        // Each balloon follows the path of the head, offset by spacing
        const pathIdx = Math.floor(i * BALLOON_SPACING);
        const pos = path[pathIdx] || path[path.length - 1] || { x: snakeCenter.x, y: snakeCenter.y, dir: snakeDir };
        const bx = pos.x;
        const by = pos.y;
        const scale = BALLOON_SCALE;
        const w = balloonImg.width * scale;
        const h = balloonImg.height * scale;
        ctx.save();
        ctx.globalAlpha = 0.98;
        ctx.drawImage(balloonImg, bx - w / 2, by - h, w, h);
        // Draw letter
        ctx.font = `bold ${Math.round(256 * scale)}px Cinzel, Arial, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = 'orange';
        ctx.strokeStyle = '#fffbe6';
        ctx.lineWidth = 2.2;
        ctx.shadowColor = 'orange';
        ctx.shadowBlur = 24 * scale;
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