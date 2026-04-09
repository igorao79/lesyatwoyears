import {
  GameState, GameScreen, INTERNAL_W, INTERNAL_H, GROUND_Y,
} from "./types";
import { drawSprite, playerSprite, heartSprite, boySprite } from "./sprites";

// ===== MEETING TEXT LINES =====
const MEET_LINES = [
  "Леся...",
  "Я очень тебя люблю",
  "Спасибо за эти 2 года",
  "Ты — моё счастье",
  "С годовщиной!",
];
const MEET_HINT = "нажми...";

// ===== CRISP PIXEL TEXT — render at 4x then downscale =====
const SCALE = 4;
const textCache = new Map<string, { canvas: HTMLCanvasElement; w: number; h: number }>();

function drawPixelText(
  ctx: CanvasRenderingContext2D, text: string,
  x: number, y: number, fontSize: number, color: string,
  align: "left" | "center" = "center",
  shadow = true,
) {
  const key = `${text}_${fontSize}_${color}_${shadow}`;
  let cached = textCache.get(key);

  if (!cached) {
    const bigSize = fontSize * SCALE;
    const off = document.createElement("canvas");
    const oc = off.getContext("2d")!;
    oc.font = `${bigSize}px "Press Start 2P", monospace`;
    const m = oc.measureText(text);
    const w = Math.ceil(m.width) + SCALE * 4;
    const h = Math.ceil(bigSize * 1.5) + SCALE * 4;
    off.width = w;
    off.height = h;

    oc.font = `${bigSize}px "Press Start 2P", monospace`;
    oc.textBaseline = "top";
    oc.imageSmoothingEnabled = false;

    // Shadow
    if (shadow) {
      oc.fillStyle = "#000000";
      oc.fillText(text, SCALE + SCALE, SCALE + SCALE);
    }

    // Main text
    oc.fillStyle = color;
    oc.fillText(text, SCALE, SCALE);

    // Hard threshold — kill all anti-aliasing
    const id = oc.getImageData(0, 0, w, h);
    for (let i = 3; i < id.data.length; i += 4) {
      id.data[i] = id.data[i] > 100 ? 255 : 0;
    }
    oc.putImageData(id, 0, 0);

    const finalW = Math.ceil(w / SCALE);
    const finalH = Math.ceil(h / SCALE);
    cached = { canvas: off, w: finalW, h: finalH };
    textCache.set(key, cached);
  }

  const dx = align === "center" ? Math.floor(x - cached.w / 2) : Math.floor(x);
  const prev = ctx.imageSmoothingEnabled;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(cached.canvas, 0, 0, cached.canvas.width, cached.canvas.height,
    dx, Math.floor(y), cached.w, cached.h);
  ctx.imageSmoothingEnabled = prev;
}

// ===== MAIN RENDER =====
export function renderFrame(ctx: CanvasRenderingContext2D, state: GameState) {
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, INTERNAL_W, INTERNAL_H);

  switch (state.screen) {
    case GameScreen.TITLE:
      drawTitleBg(ctx, state.timer);
      break;
    case GameScreen.RUNNING:
    case GameScreen.MEMORY:
      drawGameWorld(ctx, state);
      break;
    case GameScreen.FINAL:
      drawFinalBg(ctx, state.timer);
      break;
  }
}

// ===== GAME WORLD =====
function drawGameWorld(ctx: CanvasRenderingContext2D, state: GameState) {
  const camX = Math.round(state.cameraX);
  const t = state.timer;

  // Scene background
  switch (state.themeIndex) {
    case 0: sceneMeadow(ctx, camX, t); break;
    case 1: sceneBeach(ctx, camX, t); break;
    case 2: sceneNightCity(ctx, camX, t); break;
    case 3: sceneAutumn(ctx, camX, t); break;
    case 4: sceneSnow(ctx, camX, t); break;
    case 5: sceneMoonlight(ctx, camX, t); break;
    default: sceneSunset(ctx, camX, t); break;
  }

  // Hearts (last one = boy sprite, unless meeting)
  for (const heart of state.hearts) {
    if (heart.collected) continue;
    const sx = heart.worldX - camX;
    if (sx < -16 || sx > INTERNAL_W + 16) continue;

    if (heart.memoryIndex === 5) {
      // Boy character standing (facing left toward Lesya)
      drawSprite(ctx, boySprite, 0, sx - 8, GROUND_Y - 17, 1, true);
    } else {
      const bobY = Math.sin(t * 0.06 + heart.memoryIndex * 2) * 3;
      drawSprite(ctx, heartSprite, Math.floor(t / 20) % 2, sx - 10, GROUND_Y - 18 + bobY);
      // Glow
      ctx.globalAlpha = 0.12 + Math.sin(t * 0.08) * 0.06;
      ctx.fillStyle = "#ff4466";
      ctx.beginPath();
      ctx.arc(sx - 4, GROUND_Y - 12 + bobY, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  // Player
  drawSprite(ctx, playerSprite, state.animFrame,
    Math.floor(state.playerX - camX), Math.floor(state.playerY));

  // Meeting scene — boy and girl side by side
  if (state.meeting) {
    const px = Math.floor(state.playerX - camX);
    // Boy stands right next to Lesya (2px gap), feet at ground
    const bx = px + 14;
    drawSprite(ctx, boySprite, 0, bx, GROUND_Y - 17, 1, true);
    // Floating heart (hide after explosion)
    if (!state.heartExploded) {
      const heartBob = Math.sin(t * 0.05) * 3;
      const midX = Math.floor((px + 8 + bx + 8) / 2 - 6);
      drawSprite(ctx, heartSprite, Math.floor(t / 20) % 2,
        midX, Math.floor(GROUND_Y - 38 + heartBob));
    }

    // Heart rain
    for (const hr of state.heartRain) {
      ctx.globalAlpha = hr.alpha;
      ctx.fillStyle = hr.color;
      const s = Math.floor(hr.size);
      // Mini pixel heart
      ctx.fillRect(hr.x, hr.y + 1, s, s - 1);
      ctx.fillRect(hr.x - 1, hr.y, Math.ceil(s / 2), Math.ceil(s / 2));
      ctx.fillRect(hr.x + Math.floor(s / 2), hr.y, Math.ceil(s / 2) + 1, Math.ceil(s / 2));
    }
    ctx.globalAlpha = 1;

    // Meeting text (crisp pixel text on canvas)
    if (state.meetTextIndex >= 0 && state.meetTextIndex < MEET_LINES.length) {
      const line = MEET_LINES[state.meetTextIndex];
      const isLast = state.meetTextIndex === MEET_LINES.length - 1;
      const fontSize = isLast ? 7 : 6;
      const color = isLast ? "#ff6688" : "#ffffff";

      // Fade in: use meetTextTimer
      const alpha = Math.min(1, state.meetTextTimer / 30);
      ctx.globalAlpha = alpha;
      drawPixelText(ctx, line, INTERNAL_W / 2, 18, fontSize, color, "center");

      // Hint text
      if (!isLast && state.meetTextTimer > 60) {
        ctx.globalAlpha = 0.5 + Math.sin(state.timer * 0.08) * 0.3;
        drawPixelText(ctx, MEET_HINT, INTERNAL_W / 2, 34, 5, "#aaaaaa", "center", false);
      }
      ctx.globalAlpha = 1;
    }
  }

  // Particles
  for (const p of state.particles) {
    ctx.globalAlpha = p.life / p.maxLife;
    ctx.fillStyle = p.color;
    ctx.fillRect(Math.floor(p.x - camX), Math.floor(p.y), Math.ceil(p.size), Math.ceil(p.size));
  }
  ctx.globalAlpha = 1;

  // Dim during memory
  if (state.screen === GameScreen.MEMORY) {
    ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
    ctx.fillRect(0, 0, INTERNAL_W, INTERNAL_H);
  }
}

// ============================================================
//  SCENE 0 — MEADOW (green field, blue sky, clouds)
// ============================================================
function sceneMeadow(ctx: CanvasRenderingContext2D, camX: number, t: number) {
  skyGrad(ctx, "#87ceeb", "#c8e6c9");

  // Clouds
  for (let i = 0; i < 5; i++) {
    const cx = ((i * 127 + 20 - camX * 0.08) % (INTERNAL_W + 60)) - 30;
    const cy = 15 + i * 14;
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.fillRect(cx, cy, 24 + i * 4, 4);
    ctx.fillRect(cx + 4, cy - 2, 16 + i * 2, 2);
  }

  // Birds (V-shapes in sky)
  for (let i = 0; i < 3; i++) {
    const bx = ((i * 110 + t * 0.3 - camX * 0.05) % (INTERNAL_W + 40)) - 20;
    const by = 25 + i * 18;
    ctx.fillStyle = "#555";
    ctx.fillRect(bx - 2, by, 1, 1);
    ctx.fillRect(bx - 1, by - 1, 1, 1);
    ctx.fillRect(bx + 1, by - 1, 1, 1);
    ctx.fillRect(bx + 2, by, 1, 1);
  }

  // Hills
  hills(ctx, camX * 0.15, 20, "#6ab06a");
  hills(ctx, camX * 0.4, 14, "#4a9a4a");

  // Ground
  ground(ctx, "#4caf50", "#8b6914");

  // Flowers
  const ws = Math.floor(camX / 10) * 10;
  for (let wx = ws; wx < ws + INTERNAL_W + 20; wx += 10) {
    const s = hash(wx, 5);
    if (s > 0.7) {
      const colors = ["#ff88aa", "#ffaa66", "#ffff88", "#88aaff"];
      ctx.fillStyle = colors[(wx * 7) & 3];
      ctx.fillRect(wx - camX, GROUND_Y - 3, 2, 2);
      ctx.fillStyle = "#3a8a3a";
      ctx.fillRect(wx - camX, GROUND_Y - 1, 1, 1);
    }
  }

  // Butterflies
  for (let i = 0; i < 4; i++) {
    const bfx = ((i * 87 + Math.sin(t * 0.03 + i) * 15 - camX * 0.5) % (INTERNAL_W + 30));
    const bfy = GROUND_Y - 20 - Math.sin(t * 0.04 + i * 2) * 8;
    const wing = Math.sin(t * 0.15 + i) > 0 ? 2 : 1;
    ctx.fillStyle = i % 2 === 0 ? "#ff88cc" : "#88ccff";
    ctx.fillRect(bfx - wing, bfy, wing, 2);
    ctx.fillRect(bfx + 1, bfy, wing, 2);
  }

  // Grass tufts
  const gs = Math.floor(camX / 15) * 15;
  for (let gx = gs; gx < gs + INTERNAL_W + 20; gx += 15) {
    if (hash(gx, 22) > 0.5) continue;
    const sx = gx - camX;
    ctx.fillStyle = "#3a8a3a";
    ctx.fillRect(sx, GROUND_Y - 2, 1, 2);
    ctx.fillRect(sx + 1, GROUND_Y - 3, 1, 3);
    ctx.fillRect(sx + 2, GROUND_Y - 2, 1, 2);
  }
}

// ============================================================
//  SCENE 1 — BEACH (sand, ocean, palm trees)
// ============================================================
function sceneBeach(ctx: CanvasRenderingContext2D, camX: number, t: number) {
  skyGrad(ctx, "#4fc3f7", "#81d4fa");

  // Sun
  ctx.fillStyle = "#fff59d";
  ctx.beginPath();
  ctx.arc(260, 30, 14, 0, Math.PI * 2);
  ctx.fill();

  // Ocean
  ctx.fillStyle = "#0288d1";
  ctx.fillRect(0, GROUND_Y - 28, INTERNAL_W, 20);
  // Waves
  ctx.fillStyle = "#4fc3f7";
  for (let x = 0; x < INTERNAL_W; x++) {
    const wy = Math.sin((x + camX * 0.3 + t * 0.6) * 0.07) * 2;
    ctx.fillRect(x, GROUND_Y - 28 + wy, 1, 2);
  }
  // Foam
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  for (let x = 0; x < INTERNAL_W; x++) {
    const fy = Math.sin((x + camX * 0.3 + t * 0.4) * 0.09) * 1.5;
    ctx.fillRect(x, GROUND_Y - 9 + fy, 1, 1);
  }

  // Sand ground
  ground(ctx, "#e8c170", "#d4a84b");

  // Seashells on sand
  const shs = Math.floor(camX / 25) * 25;
  for (let sx = shs; sx < shs + INTERNAL_W + 30; sx += 25) {
    if (hash(sx, 31) > 0.4) continue;
    const xx = sx - camX;
    ctx.fillStyle = hash(sx, 32) > 0.5 ? "#f5deb3" : "#e8b8a0";
    ctx.fillRect(xx, GROUND_Y + 1, 3, 2);
    ctx.fillRect(xx + 1, GROUND_Y, 1, 1);
  }

  // Seagulls
  for (let i = 0; i < 3; i++) {
    const gx = ((i * 130 + t * 0.5) % (INTERNAL_W + 40)) - 20;
    const gy = 15 + i * 12 + Math.sin(t * 0.04 + i) * 3;
    ctx.fillStyle = "#fff";
    ctx.fillRect(gx - 3, gy, 1, 1);
    ctx.fillRect(gx - 2, gy - 1, 1, 1);
    ctx.fillRect(gx, gy - 1, 1, 1);
    ctx.fillRect(gx + 1, gy, 1, 1);
  }

  // Palm trees
  const ws = Math.floor(camX / 90) * 90;
  for (let wx = ws; wx < ws + INTERNAL_W + 100; wx += 90) {
    const s = hash(wx, 9);
    if (s > 0.5) continue;
    const sx = wx - camX;
    const lean = (s - 0.25) * 6;
    for (let ty = 0; ty < 32; ty++) {
      const curve = lean * (ty / 32) * (ty / 32);
      const w = ty < 4 ? 2 : ty < 28 ? 3 : 4;
      ctx.fillStyle = ty % 4 < 2 ? "#8d6e63" : "#7d5e53";
      ctx.fillRect(sx + 3 + curve - w / 2, GROUND_Y - 32 + ty, w, 1);
    }
    ctx.fillStyle = "#5d4037";
    ctx.fillRect(sx + 3 + lean - 1, GROUND_Y - 33, 3, 3);
    const angles = [-2.2, -1.6, -0.9, -0.2, 0.4, 1.0];
    for (const a of angles) {
      for (let l = 0; l < 18; l++) {
        const droop = l * l * 0.008;
        const lx = sx + 3 + lean + Math.cos(a) * l;
        const ly = GROUND_Y - 34 + Math.sin(a) * l + droop;
        ctx.fillStyle = l < 12 ? "#2e7d32" : "#4caf50";
        ctx.fillRect(lx, ly, 2, 1);
        if (l > 4 && l % 3 === 0) {
          ctx.fillStyle = "#1b5e20";
          ctx.fillRect(lx, ly + 1, 1, 2);
        }
      }
    }
  }

  // Crabs on sand
  for (let i = 0; i < 2; i++) {
    const cx = ((i * 180 + 60 - camX) % (INTERNAL_W + 40));
    if (cx < -10 || cx > INTERNAL_W + 10) continue;
    const wobble = Math.sin(t * 0.1 + i) * 1;
    ctx.fillStyle = "#d45030";
    ctx.fillRect(cx + wobble, GROUND_Y + 2, 3, 2);
    ctx.fillRect(cx - 1 + wobble, GROUND_Y + 2, 1, 1);
    ctx.fillRect(cx + 3 + wobble, GROUND_Y + 2, 1, 1);
  }
}

// ============================================================
//  SCENE 2 — NIGHT CITY (dark sky, skyline, lights)
// ============================================================
function sceneNightCity(ctx: CanvasRenderingContext2D, camX: number, t: number) {
  skyGrad(ctx, "#0d1b2a", "#1b2838");

  // Stars
  for (let i = 0; i < 25; i++) {
    const sx = ((i * 53 + 10) % INTERNAL_W);
    const sy = ((i * 37 + 5) % 80);
    ctx.globalAlpha = 0.4 + 0.6 * Math.abs(Math.sin(t * 0.03 + i * 1.3));
    ctx.fillStyle = "#f5d78e";
    ctx.fillRect(sx, sy, 1, 1);
  }
  ctx.globalAlpha = 1;

  // Buildings (parallax)
  const bws = Math.floor(camX * 0.2 / 30) * 30;
  for (let wx = bws; wx < bws + INTERNAL_W + 60; wx += 30) {
    const s = hash(wx, 11);
    const bh = 30 + s * 50;
    const bw = 14 + (s * 10) | 0;
    const sx = wx - camX * 0.2;
    const ssx = ((sx % (INTERNAL_W + 60)) + INTERNAL_W + 60) % (INTERNAL_W + 60) - 30;
    ctx.fillStyle = "#1a2333";
    ctx.fillRect(ssx, GROUND_Y - bh, bw, bh);
    // Windows
    ctx.fillStyle = "#ffeb3b";
    for (let wy = 4; wy < bh - 4; wy += 6) {
      for (let wxx = 3; wxx < bw - 3; wxx += 5) {
        if (hash(wx + wxx, wy) > 0.4) {
          ctx.globalAlpha = 0.5 + hash(wx + wxx, wy + t * 0.01) * 0.5;
          ctx.fillRect(ssx + wxx, GROUND_Y - bh + wy, 2, 3);
        }
      }
    }
    ctx.globalAlpha = 1;
  }

  // Ground (asphalt)
  ground(ctx, "#546e7a", "#37474f");

  // Road markings (dashed line)
  ctx.fillStyle = "#7a8a90";
  const rms = Math.floor(camX / 20) * 20;
  for (let rx = rms; rx < rms + INTERNAL_W + 30; rx += 20) {
    ctx.fillRect(rx - camX, GROUND_Y + 4, 8, 1);
  }

  // Puddle reflections
  const pws = Math.floor(camX / 100) * 100;
  for (let px = pws; px < pws + INTERNAL_W + 120; px += 100) {
    if (hash(px, 41) > 0.5) continue;
    const psx = px - camX;
    ctx.globalAlpha = 0.15;
    ctx.fillStyle = "#4fc3f7";
    ctx.fillRect(psx, GROUND_Y + 2, 12, 2);
    // Reflect window light
    ctx.fillStyle = "#ffeb3b";
    ctx.globalAlpha = 0.08;
    ctx.fillRect(psx + 2, GROUND_Y + 2, 3, 1);
    ctx.globalAlpha = 1;
  }

  // Street lights
  const lws = Math.floor(camX / 70) * 70;
  for (let wx = lws; wx < lws + INTERNAL_W + 80; wx += 70) {
    const sx = wx - camX;
    ctx.fillStyle = "#546068";
    ctx.fillRect(sx, GROUND_Y - 26, 2, 26);
    ctx.fillRect(sx - 1, GROUND_Y - 26, 6, 1);
    ctx.fillRect(sx + 4, GROUND_Y - 27, 1, 2);
    ctx.fillStyle = "#37474f";
    ctx.fillRect(sx + 2, GROUND_Y - 29, 4, 3);
    ctx.fillStyle = "#fff9c4";
    ctx.globalAlpha = 0.15;
    ctx.beginPath();
    ctx.moveTo(sx + 2, GROUND_Y - 26);
    ctx.lineTo(sx - 4, GROUND_Y);
    ctx.lineTo(sx + 10, GROUND_Y);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.arc(sx + 4, GROUND_Y - 28, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#37474f";
    ctx.fillRect(sx - 1, GROUND_Y - 2, 4, 2);
  }

}

// ============================================================
//  SCENE 3 — AUTUMN FOREST (orange trees, falling leaves)
// ============================================================
function sceneAutumn(ctx: CanvasRenderingContext2D, camX: number, t: number) {
  skyGrad(ctx, "#ff8a65", "#ffcc80");

  // Hills
  hills(ctx, camX * 0.15, 18, "#c77a40");
  hills(ctx, camX * 0.4, 12, "#a0522d");

  // Trees
  const ws = Math.floor(camX / 35) * 35;
  for (let wx = ws; wx < ws + INTERNAL_W + 50; wx += 35) {
    const s = hash(wx, 13);
    if (s > 0.6) continue;
    const sx = wx - camX;
    const th = 14 + (s * 10) | 0;
    // Trunk
    ctx.fillStyle = "#5d4037";
    ctx.fillRect(sx + 2, GROUND_Y - 5, 3, 5);
    // Canopy — orange/red
    const colors = ["#e65100", "#ff6d00", "#dd2c00", "#bf360c"];
    ctx.fillStyle = colors[(wx * 3) & 3];
    ctx.fillRect(sx - 2, GROUND_Y - th, 11, th - 5);
    ctx.fillRect(sx, GROUND_Y - th - 3, 7, 3);
  }

  // Ground
  ground(ctx, "#a1887f", "#6d4c41");

  // Mushrooms
  const mws = Math.floor(camX / 50) * 50;
  for (let mx = mws; mx < mws + INTERNAL_W + 60; mx += 50) {
    if (hash(mx, 61) > 0.4) continue;
    const msx = mx - camX;
    ctx.fillStyle = "#e8d5b0";
    ctx.fillRect(msx + 1, GROUND_Y - 2, 1, 2); // stem
    ctx.fillStyle = hash(mx, 62) > 0.5 ? "#cc2200" : "#dd6600";
    ctx.fillRect(msx, GROUND_Y - 4, 3, 2); // cap
    ctx.fillStyle = "#fff";
    ctx.fillRect(msx + 1, GROUND_Y - 4, 1, 1); // dot
  }

  // Acorns on ground
  const aws = Math.floor(camX / 30) * 30;
  for (let ax = aws; ax < aws + INTERNAL_W + 40; ax += 30) {
    if (hash(ax, 63) > 0.35) continue;
    const asx = ax - camX;
    ctx.fillStyle = "#8d6e43";
    ctx.fillRect(asx, GROUND_Y, 2, 2);
    ctx.fillStyle = "#5d4037";
    ctx.fillRect(asx, GROUND_Y - 1, 2, 1);
  }

  // Falling leaves (more varied)
  const leafColors = ["#e65100", "#ff6d00", "#dd2c00", "#ff8f00", "#f9a825"];
  for (let i = 0; i < 16; i++) {
    const lx = ((i * 47 + t * 0.4 + Math.sin(t * 0.02 + i) * 8) % (INTERNAL_W + 20)) - 10;
    const ly = ((i * 31 + t * 0.7) % (GROUND_Y + 10));
    ctx.globalAlpha = 0.7;
    ctx.fillStyle = leafColors[i % leafColors.length];
    ctx.fillRect(lx, ly, 2, 2);
  }
  ctx.globalAlpha = 1;

}

// ============================================================
//  SCENE 4 — SNOW (mountains, snowflakes, white ground)
// ============================================================
function sceneSnow(ctx: CanvasRenderingContext2D, camX: number, t: number) {
  skyGrad(ctx, "#b0bec5", "#e0e8ec");

  // Background mountains (far, lighter)
  for (let i = 0; i < 3; i++) {
    const mx = ((i * 150 - camX * 0.05 + 30) % (INTERNAL_W + 160)) - 80;
    const mh = 60 + i * 12;
    const hw = 50 + i * 10;
    ctx.fillStyle = "#90a4ae";
    ctx.beginPath();
    ctx.moveTo(mx, GROUND_Y);
    ctx.lineTo(mx + hw, GROUND_Y - mh);
    ctx.lineTo(mx + hw * 2, GROUND_Y);
    ctx.fill();
    // Snow cap — gentle curve
    ctx.fillStyle = "#eceff1";
    const capH = mh * 0.3;
    ctx.beginPath();
    ctx.moveTo(mx + hw - capH * 0.8, GROUND_Y - mh + capH);
    ctx.lineTo(mx + hw - 2, GROUND_Y - mh);
    ctx.lineTo(mx + hw + 2, GROUND_Y - mh);
    ctx.lineTo(mx + hw + capH * 0.8, GROUND_Y - mh + capH);
    // Drip edge
    ctx.lineTo(mx + hw + capH * 0.4, GROUND_Y - mh + capH + 3);
    ctx.lineTo(mx + hw, GROUND_Y - mh + capH - 1);
    ctx.lineTo(mx + hw - capH * 0.4, GROUND_Y - mh + capH + 3);
    ctx.closePath();
    ctx.fill();
  }

  // Foreground mountains (closer, darker)
  for (let i = 0; i < 3; i++) {
    const mx = ((i * 120 - camX * 0.12 + 80) % (INTERNAL_W + 140)) - 70;
    const mh = 40 + i * 8;
    ctx.fillStyle = "#78909c";
    ctx.beginPath();
    ctx.moveTo(mx, GROUND_Y);
    ctx.lineTo(mx + 35, GROUND_Y - mh);
    ctx.lineTo(mx + 70, GROUND_Y);
    ctx.fill();
    ctx.fillStyle = "#e8eef2";
    const capH2 = mh * 0.25;
    ctx.beginPath();
    ctx.moveTo(mx + 35 - capH2 * 0.7, GROUND_Y - mh + capH2);
    ctx.lineTo(mx + 35, GROUND_Y - mh);
    ctx.lineTo(mx + 35 + capH2 * 0.7, GROUND_Y - mh + capH2);
    ctx.lineTo(mx + 35, GROUND_Y - mh + capH2 + 2);
    ctx.closePath();
    ctx.fill();
  }

  // Pine trees — proper triangle layers connected to trunk
  const ws = Math.floor(camX / 35) * 35;
  for (let wx = ws; wx < ws + INTERNAL_W + 50; wx += 35) {
    const s = hash(wx, 17);
    if (s > 0.55) continue;
    const sx = wx - camX;
    const cx = sx + 4; // center X of tree
    // Trunk — centered under canopy, goes into first layer
    ctx.fillStyle = "#5d4037";
    ctx.fillRect(cx - 1, GROUND_Y - 6, 2, 6);
    // 3 triangle layers, each overlapping the trunk
    for (let r = 0; r < 3; r++) {
      const w = 12 - r * 3;
      const baseY = GROUND_Y - 4 - r * 6;
      const tipY = baseY - 8;
      ctx.fillStyle = r === 0 ? "#1b5e20" : r === 1 ? "#2e7d32" : "#388e3c";
      ctx.beginPath();
      ctx.moveTo(cx, tipY);
      ctx.lineTo(cx - w / 2, baseY);
      ctx.lineTo(cx + w / 2, baseY);
      ctx.closePath();
      ctx.fill();
      // Snow on tips
      ctx.fillStyle = "#eceff1";
      ctx.fillRect(cx - 1, tipY, 2, 1);
      ctx.fillRect(cx - w / 2 + 1, baseY - 1, 2, 1);
      ctx.fillRect(cx + w / 2 - 3, baseY - 1, 2, 1);
    }
  }

  // Snow ground
  ground(ctx, "#eceff1", "#cfd8dc");

  // Snowman
  const smx = ((200 - camX) % (INTERNAL_W + 60));
  if (smx > -15 && smx < INTERNAL_W + 15) {
    ctx.fillStyle = "#eceff1";
    // bottom ball
    ctx.beginPath(); ctx.arc(smx, GROUND_Y - 3, 4, 0, Math.PI * 2); ctx.fill();
    // top ball
    ctx.beginPath(); ctx.arc(smx, GROUND_Y - 9, 3, 0, Math.PI * 2); ctx.fill();
    // eyes
    ctx.fillStyle = "#222";
    ctx.fillRect(smx - 1, GROUND_Y - 10, 1, 1);
    ctx.fillRect(smx + 1, GROUND_Y - 10, 1, 1);
    // carrot nose
    ctx.fillStyle = "#ff8a00";
    ctx.fillRect(smx, GROUND_Y - 9, 2, 1);
  }

  // Footprints in snow
  const fps = Math.floor(camX / 12) * 12;
  for (let fx = fps; fx < fps + INTERNAL_W + 20; fx += 12) {
    if (hash(fx, 71) > 0.3) continue;
    ctx.fillStyle = "#cdd8dc";
    ctx.fillRect(fx - camX, GROUND_Y + 1, 2, 1);
  }

  // Snowflakes — varied sizes
  for (let i = 0; i < 30; i++) {
    const fx = ((i * 41 + t * (0.2 + hash(i, 33) * 0.3)) % (INTERNAL_W + 10)) - 5;
    const fy = ((i * 67 + t * (0.3 + hash(i, 44) * 0.4)) % (GROUND_Y + 20));
    const sz = hash(i, 55) > 0.5 ? 2 : 1;
    ctx.globalAlpha = 0.5 + hash(i, 99) * 0.4;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(fx, fy, sz, sz);
  }
  ctx.globalAlpha = 1;
}

// ============================================================
//  SCENE 5 — MOONLIGHT (dark field, big moon, stars, fireflies)
// ============================================================
function sceneMoonlight(ctx: CanvasRenderingContext2D, camX: number, t: number) {
  skyGrad(ctx, "#0a0e1a", "#1a2040");

  // Moon
  ctx.fillStyle = "#e8e8d0";
  ctx.beginPath();
  ctx.arc(240, 35, 18, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#d0d0b8";
  ctx.beginPath();
  ctx.arc(235, 32, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(245, 40, 3, 0, Math.PI * 2);
  ctx.fill();

  // Stars
  for (let i = 0; i < 35; i++) {
    const sx = (i * 43 + 7) % INTERNAL_W;
    const sy = (i * 29 + 3) % 90;
    ctx.globalAlpha = 0.3 + 0.7 * Math.abs(Math.sin(t * 0.02 + i * 1.9));
    ctx.fillStyle = "#f5f5dc";
    ctx.fillRect(sx, sy, 1, 1);
  }
  ctx.globalAlpha = 1;

  // Shooting stars
  for (let i = 0; i < 2; i++) {
    const phase = (t * 0.005 + i * 3.7) % 6;
    if (phase < 1) {
      const ssx = 50 + i * 120 + phase * 40;
      const ssy = 10 + i * 20 + phase * 15;
      ctx.globalAlpha = 1 - phase;
      ctx.fillStyle = "#ffffcc";
      for (let d = 0; d < 6; d++) {
        ctx.globalAlpha = (1 - phase) * (1 - d / 6);
        ctx.fillRect(ssx - d * 3, ssy - d * 1.5, 2, 1);
      }
      ctx.globalAlpha = 1;
    }
  }

  // Dark hills
  hills(ctx, camX * 0.15, 22, "#0a1520");
  hills(ctx, camX * 0.4, 14, "#0d1a28");

  // Ground
  ground(ctx, "#1b3020", "#0d1a14");

  // Tall grass silhouettes
  const gws = Math.floor(camX / 8) * 8;
  for (let gx = gws; gx < gws + INTERNAL_W + 10; gx += 8) {
    if (hash(gx, 81) > 0.6) continue;
    const gsx = gx - camX;
    const gh = 3 + (hash(gx, 82) * 4) | 0;
    const sway = Math.sin(t * 0.03 + gx * 0.1) * 1;
    ctx.fillStyle = "#1a3520";
    ctx.fillRect(gsx + sway, GROUND_Y - gh, 1, gh);
    ctx.fillRect(gsx + 1, GROUND_Y - gh + 1, 1, gh - 1);
  }

  // Fireflies
  for (let i = 0; i < 12; i++) {
    const fx = ((i * 73 + Math.sin(t * 0.02 + i) * 20) % INTERNAL_W + INTERNAL_W) % INTERNAL_W;
    const fy = 80 + Math.sin(t * 0.03 + i * 2) * 25;
    ctx.globalAlpha = 0.3 + 0.7 * Math.abs(Math.sin(t * 0.05 + i * 1.5));
    ctx.fillStyle = "#c8e680";
    ctx.fillRect(fx, fy, 2, 2);
    // Glow
    ctx.globalAlpha *= 0.2;
    ctx.fillRect(fx - 1, fy - 1, 4, 4);
  }
  ctx.globalAlpha = 1;

  // Moon reflection glow on ground
  ctx.globalAlpha = 0.05;
  ctx.fillStyle = "#e8e8d0";
  ctx.fillRect(220, GROUND_Y + 1, 40, 2);
  ctx.globalAlpha = 1;
}

// ============================================================
//  SCENE 6 — SUNSET (warm sky, large sun, silhouette hills)
// ============================================================
function sceneSunset(ctx: CanvasRenderingContext2D, camX: number, _t: number) {
  const grad = ctx.createLinearGradient(0, 0, 0, INTERNAL_H);
  grad.addColorStop(0, "#e85050");
  grad.addColorStop(0.4, "#f5a050");
  grad.addColorStop(0.7, "#f5c478");
  grad.addColorStop(1, "#7a5a3a");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, INTERNAL_W, INTERNAL_H);

  // Sun
  ctx.fillStyle = "#ffe082";
  ctx.beginPath();
  ctx.arc(INTERNAL_W / 2, GROUND_Y - 10, 20, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 0.3;
  ctx.beginPath();
  ctx.arc(INTERNAL_W / 2, GROUND_Y - 10, 30, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  // Silhouette hills
  ctx.fillStyle = "#3a2010";
  for (let x = 0; x < INTERNAL_W; x++) {
    const wx = x + camX * 0.15;
    const h = 18 + Math.sin(wx * 0.01) * 10 + Math.sin(wx * 0.025) * 5;
    ctx.fillRect(x, GROUND_Y - h, 1, h);
  }

  // Ground
  ground(ctx, "#5a3a20", "#3a2010");
}

// ============================================================
//  SHARED HELPERS
// ============================================================
function skyGrad(ctx: CanvasRenderingContext2D, top: string, bottom: string) {
  const g = ctx.createLinearGradient(0, 0, 0, INTERNAL_H);
  g.addColorStop(0, top);
  g.addColorStop(1, bottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, INTERNAL_W, INTERNAL_H);
}

function ground(ctx: CanvasRenderingContext2D, topColor: string, bodyColor: string) {
  ctx.fillStyle = topColor;
  ctx.fillRect(0, GROUND_Y, INTERNAL_W, 3);
  ctx.fillStyle = bodyColor;
  ctx.fillRect(0, GROUND_Y + 3, INTERNAL_W, INTERNAL_H - GROUND_Y - 3);
}

function hills(ctx: CanvasRenderingContext2D, scrollX: number, maxH: number, color: string) {
  ctx.fillStyle = color;
  for (let x = 0; x < INTERNAL_W; x++) {
    const wx = x + scrollX;
    const h = maxH * 0.6 + Math.sin(wx * 0.008) * maxH * 0.3 + Math.sin(wx * 0.02) * maxH * 0.15;
    ctx.fillRect(x, GROUND_Y - h, 1, h);
  }
}

function hash(x: number, seed: number): number {
  return (((x * 2654435761 + seed * 340573321) >>> 0) & 0xFF) / 255;
}

// ===== TITLE =====
function drawTitleBg(ctx: CanvasRenderingContext2D, t: number) {
  skyGrad(ctx, "#0d0a14", "#1a1025");
  for (let i = 0; i < 15; i++) {
    ctx.globalAlpha = 0.3 + 0.7 * Math.abs(Math.sin(t * 0.03 + i * 1.5));
    ctx.fillStyle = "#f5d78e";
    ctx.fillRect((i * 43 + 10) % INTERNAL_W, (i * 29 + 12) % 100, 2, 2);
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = "#0a0710";
  ctx.fillRect(0, INTERNAL_H - 20, INTERNAL_W, 20);
  for (let x = 0; x < INTERNAL_W; x++) {
    const h = 8 + Math.sin(x * 0.02) * 5 + Math.sin(x * 0.05) * 3;
    ctx.fillRect(x, INTERNAL_H - 20 - h, 1, h);
  }
}

// ===== FINAL =====
function drawFinalBg(ctx: CanvasRenderingContext2D, t: number) {
  const g = ctx.createLinearGradient(0, 0, 0, INTERNAL_H);
  g.addColorStop(0, "#1a0a2e");
  g.addColorStop(0.3, "#4a1942");
  g.addColorStop(0.6, "#e8836b");
  g.addColorStop(0.8, "#f5c478");
  g.addColorStop(1, "#2a1a10");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, INTERNAL_W, INTERNAL_H);

  // Sun
  ctx.fillStyle = "#f5d78e";
  const sy = INTERNAL_H * 0.55 + Math.sin(t * 0.01) * 2;
  for (let dy = -12; dy <= 12; dy++) {
    for (let dx = -12; dx <= 12; dx++) {
      if (dx * dx + dy * dy <= 144) {
        ctx.globalAlpha = 0.8 - (dx * dx + dy * dy) / 200;
        ctx.fillRect(INTERNAL_W / 2 + dx, sy + dy, 1, 1);
      }
    }
  }
  ctx.globalAlpha = 1;

  ctx.fillStyle = "#1a0e08";
  ctx.fillRect(0, INTERNAL_H - 25, INTERNAL_W, 25);
  for (let x = 0; x < INTERNAL_W; x++) {
    const h = 3 + Math.sin(x * 0.03) * 4 + Math.sin(x * 0.07) * 2;
    ctx.fillRect(x, INTERNAL_H - 25 - h, 1, h);
  }

  // Two silhouettes
  const cx = INTERNAL_W / 2, cy = INTERNAL_H - 32;
  ctx.fillStyle = "#1a0e08";
  ctx.fillRect(cx - 6, cy - 12, 4, 4);
  ctx.fillRect(cx - 7, cy - 8, 6, 7);
  ctx.fillRect(cx - 7, cy - 1, 2, 5);
  ctx.fillRect(cx - 3, cy - 1, 2, 5);
  ctx.fillRect(cx + 3, cy - 8, 6, 7);
  ctx.fillRect(cx + 2, cy - 1, 2, 5);
  ctx.fillRect(cx + 6, cy - 1, 2, 5);
  ctx.fillStyle = "#3a9080";
  ctx.fillRect(cx + 2, cy - 15, 6, 3);
  ctx.fillRect(cx + 1, cy - 13, 8, 3);
  ctx.fillStyle = "#5cb8a5";
  ctx.fillRect(cx + 3, cy - 14, 4, 2);
  ctx.fillStyle = "#1a0e08";
  ctx.fillRect(cx + 3, cy - 12, 4, 4);
  ctx.fillRect(cx - 1, cy - 6, 4, 2);

  ctx.fillStyle = "#ff4466";
  ctx.globalAlpha = 0.6 + Math.sin(t * 0.05) * 0.2;
  const hx = cx - 2, hy = cy - 20 + Math.sin(t * 0.03) * 2;
  ctx.fillRect(hx - 1, hy, 2, 1);
  ctx.fillRect(hx + 2, hy, 2, 1);
  ctx.fillRect(hx - 2, hy + 1, 7, 1);
  ctx.fillRect(hx - 1, hy + 2, 5, 1);
  ctx.fillRect(hx, hy + 3, 3, 1);
  ctx.fillRect(hx + 1, hy + 4, 1, 1);
  ctx.globalAlpha = 1;
}
