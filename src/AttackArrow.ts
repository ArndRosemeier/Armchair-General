import { Country } from './Country';
import { Renderer } from './Renderer';
import { Game } from './Game';

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

  constructor(canvas: HTMLCanvasElement, attacker: Country, defender: Country) {
    this.canvas = canvas;
    this.attacker = attacker;
    this.defender = defender;
  }

  async start(): Promise<void> {
    const ctx = this.canvas.getContext('2d');
    if (!ctx) return;
    const [ax, ay] = this.attacker.center();
    const [dx, dy] = this.defender.center();
    const start = { x: ax, y: ay };
    const end = { x: dx, y: dy };
    const arrow = new AttackArrow(this.canvas, start, end);
    const duration = 500; // 0.5 second (twice as fast)
    const attacker = this.attacker;
    const defender = this.defender;
    return new Promise<void>((resolve) => {
      const animate = (startTime: number) => {
        const now = performance.now();
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        // Draw attacker country with deep red glow
        this.drawCountry(ctx, attacker, 'attacker');
        // Draw defender country with deep blue glow
        this.drawCountry(ctx, defender, 'defender');
        // Animate the arrow: draw only up to progress
        this.drawAnimatedArrow(ctx, start, end, progress);
        if (progress < 1) {
          requestAnimationFrame(() => animate(startTime));
        } else {
          resolve();
        }
      };
      requestAnimationFrame((t) => animate(t));
    });
  }

  drawAnimatedArrow(ctx: CanvasRenderingContext2D, start: Point, end: Point, progress: number) {
    // Calculate control point for a nice curve
    const mx = (start.x + end.x) / 2;
    const my = (start.y + end.y) / 2;
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const len = Math.sqrt(dx*dx + dy*dy);
    const offset = 0.25 * len;
    const perpX = -dy / len * offset;
    const perpY = dx / len * offset;
    const cx = mx + perpX;
    const cy = my + perpY;
    // Gradient
    const grad = ctx.createLinearGradient(start.x, start.y, end.x, end.y);
    grad.addColorStop(0, '#fff');
    grad.addColorStop(0.5, '#0ff');
    grad.addColorStop(1, '#00f');
    ctx.save();
    ctx.lineWidth = 8;
    ctx.shadowColor = '#0ff';
    ctx.shadowBlur = 16;
    ctx.strokeStyle = grad;
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    // Animate the curve by drawing up to t=progress
    // Quadratic Bezier: interpolate points
    const steps = 60;
    for (let i = 1; i <= Math.floor(steps * progress); ++i) {
      const t = i / steps;
      const pt = this.getQuadraticPoint(start, {x: cx, y: cy}, end, t);
      ctx.lineTo(pt.x, pt.y);
    }
    ctx.stroke();
    // Draw arrowhead at the tip
    if (progress > 0.05) {
      const t = progress;
      const arrowPos = this.getQuadraticPoint(start, {x: cx, y: cy}, end, t);
      const arrowDir = this.getQuadraticTangent(start, {x: cx, y: cy}, end, t);
      this.drawArrowhead(ctx, arrowPos, arrowDir);
    }
    ctx.restore();
  }

  drawCountry(ctx: CanvasRenderingContext2D, country: Country, color: string) {
    // Use the glow effect instead of flat color
    let colorStart: [number, number, number];
    if (color === 'attacker') {
      colorStart = [180, 0, 0]; // deep red
    } else if (color === 'defender') {
      colorStart = [0, 0, 180]; // deep blue
    } else {
      // fallback: parse color string or use country.color
      colorStart = country.color || [200, 200, 200];
    }
    Renderer.drawCountryGlow(ctx, country, colorStart, country.color);
    // --- Draw country name and armies on top of glow ---
    const [cx, cy] = country.center ? country.center() : [0, 0];
    const displayName = country.fortified ? '🛡️ ' + country.name : country.name;
    ctx.save();
    ctx.font = 'bold 10px Verdana, Geneva, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'black';
    ctx.strokeText(displayName, cx, cy);
    ctx.fillStyle = 'white';
    ctx.fillText(displayName, cx, cy);
    if (typeof country.armies === 'number' && Game.showArmies) {
      const armiesText = `${Math.round(country.armies / 1000)}k`;
      ctx.font = 'bold 9px Verdana, Geneva, sans-serif';
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'black';
      ctx.strokeText(armiesText, cx, cy + 13);
      ctx.fillStyle = '#FFD700';
      ctx.fillText(armiesText, cx, cy + 13);
    }
    ctx.restore();
  }

  // Add these helper methods to AttackAnimation for animation
  getQuadraticPoint(p0: Point, p1: Point, p2: Point, t: number): Point {
    const x = (1-t)*(1-t)*p0.x + 2*(1-t)*t*p1.x + t*t*p2.x;
    const y = (1-t)*(1-t)*p0.y + 2*(1-t)*t*p1.y + t*t*p2.y;
    return {x, y};
  }

  getQuadraticTangent(p0: Point, p1: Point, p2: Point, t: number): Point {
    const x = 2*(1-t)*(p1.x - p0.x) + 2*t*(p2.x - p1.x);
    const y = 2*(1-t)*(p1.y - p0.y) + 2*t*(p2.y - p1.y);
    const len = Math.sqrt(x*x + y*y);
    return {x: x/len, y: y/len};
  }

  drawArrowhead(ctx: CanvasRenderingContext2D, pos: Point, dir: Point) {
    ctx.save();
    ctx.translate(pos.x, pos.y);
    const angle = Math.atan2(dir.y, dir.x);
    ctx.rotate(angle);
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