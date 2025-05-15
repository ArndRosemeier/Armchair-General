// FishOverlay.ts
// Overlay animation for fish jumping out of the ocean

export class FishOverlay {
  private overlay: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;
  private fish: FishJump[] = [];
  private running: boolean = false;
  private lastSpawn: number = 0;
  private nextSpawn: number = 0;
  private getOceanPredicate: (x: number, y: number) => boolean;
  private animationFrameId: number | null = null;
  private timeoutId: number | null = null;

  constructor(mapArea: HTMLElement, width: number, height: number, getOceanPredicate: (x: number, y: number) => boolean) {
    this.width = width;
    this.height = height;
    this.getOceanPredicate = getOceanPredicate;
    this.overlay = document.createElement('canvas');
    this.overlay.width = width;
    this.overlay.height = height;
    this.overlay.style.position = 'absolute';
    this.overlay.style.left = '0';
    this.overlay.style.top = '0';
    this.overlay.style.pointerEvents = 'none';
    this.overlay.style.width = '100%';
    this.overlay.style.height = '100%';
    this.overlay.style.zIndex = '20';
    mapArea.appendChild(this.overlay);
    const ctx = this.overlay.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas context for FishOverlay');
    this.ctx = ctx;
    this.scheduleNextSpawn();
    this.start();
  }

  private scheduleNextSpawn() {
    // Next fish in 5-15 seconds
    this.nextSpawn = performance.now() + 5000 + Math.random() * 10000;
  }

  private spawnFish() {
    // Try up to 10 times to find a valid ocean-to-ocean jump
    for (let i = 0; i < 10; i++) {
      const x = Math.floor(Math.random() * this.width);
      const y = Math.floor(this.height * (0.4 + 0.5 * Math.random())); // lower half of map
      const dir = Math.random() < 0.5 ? 1 : -1;
      const arcLen = 32 + Math.random() * 24;
      const x1 = x + dir * arcLen;
      // Both start and end must be ocean
      if (this.getOceanPredicate(x, y) && this.getOceanPredicate(Math.round(x1), y)) {
        const color = '#444'; // not used, but kept for constructor
        this.fish.push(new FishJump(x, y, dir, color));
        break;
      }
    }
  }

  private start() {
    if (this.running) return;
    this.running = true;
    this.animationFrameId = requestAnimationFrame(this.loop);
  }

  public stop() {
    this.running = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    if (this.timeoutId !== null) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }

  public resume() {
    if (!this.running) {
      this.start();
    }
  }

  private loop = (now: number) => {
    // Clear
    this.ctx.clearRect(0, 0, this.width, this.height);
    // Animate fish
    this.fish = this.fish.filter(f => !f.done);
    for (const f of this.fish) {
      f.update(now);
      f.draw(this.ctx);
    }
    // Spawn new fish if time
    if (now > this.nextSpawn) {
      this.spawnFish();
      this.scheduleNextSpawn();
    }
    // Keep animating if any fish or waiting for next spawn
    if (this.fish.length > 0 || this.nextSpawn - now < 2000) {
      this.animationFrameId = requestAnimationFrame(this.loop);
    } else {
      this.running = false;
      // Will restart on next spawn
      this.timeoutId = setTimeout(() => this.start(), this.nextSpawn - now);
    }
  };
}

class FishJump {
  private x0: number;
  private y0: number;
  private x1: number;
  private y1: number;
  private dir: number;
  private color: string = '#444';
  private t0: number;
  private duration: number;
  public done: boolean = false;
  private splash: boolean = false;
  private splashStart: number = 0;
  private splashDuration: number = 1200;

  constructor(x: number, y: number, dir: number, _color: string) {
    this.x0 = x;
    this.y0 = y;
    // Pick a random end point some distance away, same y (for simplicity)
    const arcLen = 32 + Math.random() * 24;
    this.x1 = x + dir * arcLen;
    this.y1 = y;
    this.dir = dir;
    this.t0 = performance.now();
    this.duration = (1200 + Math.random() * 400) / 2; // ms, twice as fast
  }

  update(now: number) {
    const t = (now - this.t0) / this.duration;
    if (!this.splash && t > 0.95) {
      this.splash = true;
      this.splashStart = now;
    }
    // The fish is gone after t > 1, but the splash should continue
    if (t > 1 && this.splash) {
      // Only mark done after splash duration
      if (now - this.splashStart > this.splashDuration) {
        this.done = true;
      }
      return;
    }
    if (t > 1) {
      this.done = true;
      return;
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    const now = performance.now();
    const t = Math.min(1, (now - this.t0) / this.duration);
    // True arc from (x0, y0) to (x1, y1)
    const arcHeight = 18;
    const x = this.x0 + (this.x1 - this.x0) * t;
    // Parabolic arc: y = (1 - 4*(t-0.5)^2) * arcHeight
    const y = this.y0 - (1 - 4 * Math.pow(t - 0.5, 2)) * arcHeight;
    // Animate body/fins: stretch at mid-jump, fins move
    const stretch = 1 + 0.18 * Math.sin(Math.PI * t); // max stretch at top
    const finAngle = 0.5 * Math.sin(Math.PI * t); // fins flap out at top
    // Draw fish only while jumping (t <= 0.95)
    if (t <= 0.95) {
      ctx.save();
      ctx.translate(x, y);
      // Body (almond, top-down, radial gradient)
      const fishScale = 1 / 3;
      const grad = ctx.createRadialGradient(0, 0, 0.3, 0, 0, 7 * stretch * fishScale);
      grad.addColorStop(0, '#222');
      grad.addColorStop(0.7, '#666');
      grad.addColorStop(1, '#bbb');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(0, 0, 7 * stretch * fishScale, 3 * fishScale, 0, 0, 2 * Math.PI);
      ctx.fill();
      // Tail (fan shape, top-down)
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(-7 * stretch * fishScale, 0);
      ctx.lineTo(-11 * stretch * fishScale, -4 * fishScale);
      ctx.lineTo(-11 * stretch * fishScale, 4 * fishScale);
      ctx.closePath();
      ctx.fillStyle = '#222';
      ctx.globalAlpha = 0.8;
      ctx.fill();
      ctx.restore();
      // Side fins (move during jump)
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(-2 * stretch * fishScale, 2.2 * fishScale, 2 * fishScale, 0.7 * fishScale, Math.PI / 4 + finAngle, 0, 2 * Math.PI);
      ctx.ellipse(-2 * stretch * fishScale, -2.2 * fishScale, 2 * fishScale, 0.7 * fishScale, -Math.PI / 4 - finAngle, 0, 2 * Math.PI);
      ctx.fillStyle = '#888';
      ctx.globalAlpha = 0.7;
      ctx.fill();
      ctx.restore();
      ctx.restore();
    }
    // Splash at end: very dark concentric circles expanding and fading
    if (this.splash) {
      const splashT = Math.min(1, (now - this.splashStart) / this.splashDuration);
      for (let i = 0; i < 3; i++) {
        const r = 10 + 12 * splashT + i * 6;
        ctx.save();
        ctx.beginPath();
        ctx.arc(this.x1, this.y1, r, 0, 2 * Math.PI);
        ctx.strokeStyle = `rgba(10,10,10,${0.7 * (1 - splashT)})`;
        ctx.lineWidth = 2.5 - i * 0.5;
        ctx.globalAlpha = 1 * (1 - splashT);
        ctx.stroke();
        ctx.restore();
      }
    }
  }
} 