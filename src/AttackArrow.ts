import { Country } from './Country';

export interface Point {
  x: number;
  y: number;
}

export class AttackArrow {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  start: Point;
  end: Point;

  constructor(canvas: HTMLCanvasElement, start: Point, end: Point) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas context');
    this.ctx = ctx;
    this.start = start;
    this.end = end;
  }

  draw() {
    const ctx = this.ctx;
    const { start, end } = this;
    // Calculate control point for a nice curve
    const mx = (start.x + end.x) / 2;
    const my = (start.y + end.y) / 2;
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const len = Math.sqrt(dx*dx + dy*dy);
    // Offset perpendicular to the line for the curve
    const offset = 0.25 * len; // adjust for more/less bend
    const perpX = -dy / len * offset;
    const perpY = dx / len * offset;
    const cx = mx + perpX;
    const cy = my + perpY;

    // 3D effect: gradient
    const grad = ctx.createLinearGradient(start.x, start.y, end.x, end.y);
    grad.addColorStop(0, '#fff');
    grad.addColorStop(0.5, '#0ff');
    grad.addColorStop(1, '#00f');

    ctx.save();
    ctx.lineWidth = 8;
    ctx.shadowColor = '#0ff';
    ctx.shadowBlur = 12;
    ctx.strokeStyle = grad;
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.quadraticCurveTo(cx, cy, end.x, end.y);
    ctx.stroke();

    // Draw arrowhead at end, tangent to curve
    const t = 0.95; // near the end
    const arrowPos = this.getQuadraticPoint(start, {x: cx, y: cy}, end, t);
    const arrowDir = this.getQuadraticTangent(start, {x: cx, y: cy}, end, t);
    this.drawArrowhead(arrowPos, arrowDir);
    ctx.restore();
  }

  // Get a point on a quadratic Bezier curve at t
  getQuadraticPoint(p0: Point, p1: Point, p2: Point, t: number): Point {
    const x = (1-t)*(1-t)*p0.x + 2*(1-t)*t*p1.x + t*t*p2.x;
    const y = (1-t)*(1-t)*p0.y + 2*(1-t)*t*p1.y + t*t*p2.y;
    return {x, y};
  }

  // Get the tangent (direction) of a quadratic Bezier at t
  getQuadraticTangent(p0: Point, p1: Point, p2: Point, t: number): Point {
    const x = 2*(1-t)*(p1.x - p0.x) + 2*t*(p2.x - p1.x);
    const y = 2*(1-t)*(p1.y - p0.y) + 2*t*(p2.y - p1.y);
    const len = Math.sqrt(x*x + y*y);
    return {x: x/len, y: y/len};
  }

  // Draw a 3D-looking arrowhead at a given position and direction
  drawArrowhead(pos: Point, dir: Point) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(pos.x, pos.y);
    const angle = Math.atan2(dir.y, dir.x);
    ctx.rotate(angle);
    // 3D effect: shadow and highlight
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-18, 7);
    ctx.lineTo(-12, 0);
    ctx.lineTo(-18, -7);
    ctx.closePath();
    ctx.fillStyle = 'rgba(0,255,255,0.95)';
    ctx.shadowColor = '#fff';
    ctx.shadowBlur = 8;
    ctx.fill();
    ctx.restore();
  }
}

export class AttackAnimation {
  canvas: HTMLCanvasElement;
  attacker: Country;
  defender: Country;
  duration: number;
  startTime: number | null = null;
  animationFrame: number | null = null;

  constructor(canvas: HTMLCanvasElement, attacker: Country, defender: Country, duration: number = 2000) {
    this.canvas = canvas;
    this.attacker = attacker;
    this.defender = defender;
    this.duration = duration;
  }

  start() {
    this.startTime = null;
    this.animationFrame = requestAnimationFrame(this.animate.bind(this));
  }

  stop() {
    if (this.animationFrame !== null) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
  }

  animate(timestamp: number) {
    if (!this.startTime) this.startTime = timestamp;
    const elapsed = timestamp - this.startTime;
    const progress = Math.min(elapsed / this.duration, 1);
    this.draw(progress);
    if (progress < 1) {
      this.animationFrame = requestAnimationFrame(this.animate.bind(this));
    } else {
      this.stop();
    }
  }

  draw(progress: number) {
    const ctx = this.canvas.getContext('2d');
    if (!ctx) return;
    // Clear overlay
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    // Overlay attacker and defender with glows
    this.overlayCountry(this.attacker, 'rgba(255,0,0,0.35)', ctx);
    this.overlayCountry(this.defender, 'rgba(0,128,255,0.35)', ctx);
    // Draw attack arrow (animate head position)
    const [ax, ay] = this.attacker.center();
    const [dx, dy] = this.defender.center();
    const start: Point = { x: ax, y: ay };
    const end: Point = { x: dx, y: dy };
    // Animate arrow progress
    const arrowEnd: Point = {
      x: ax + (dx - ax) * progress,
      y: ay + (dy - ay) * progress
    };
    const arrow = new AttackArrow(this.canvas, start, arrowEnd);
    arrow.draw();
  }

  overlayCountry(country: Country, color: string, ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.globalAlpha = 1.0;
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 16;
    for (const [x, y] of country.coordinates) {
      ctx.fillRect(x, y, 1, 1);
    }
    ctx.restore();
  }
} 