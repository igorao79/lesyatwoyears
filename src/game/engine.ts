import {
  GameState,
  GameScreen,
  Heart,
  INTERNAL_W,
  INTERNAL_H,
  GROUND_Y,
  PLAYER_SPEED,
  TOTAL_HEARTS,
  HEART_SPACING,
  FIRST_HEART_X,
} from "./types";
import { renderFrame } from "./renderer";

export interface GameEngine {
  start(): void;
  stop(): void;
  setCanvas(canvas: HTMLCanvasElement): void;
  triggerStart(): void;
  triggerContinue(): void;
  onScreenChange?: (screen: GameScreen) => void;
  onMemoryChange?: (memoryIndex: number) => void;
  onHeartsChange?: (collected: number, total: number) => void;
  onMeetingText?: (textIndex: number, exploded: boolean) => void;
}

function createHearts(): Heart[] {
  const hearts: Heart[] = [];
  for (let i = 0; i < TOTAL_HEARTS; i++) {
    hearts.push({
      worldX: FIRST_HEART_X + i * HEART_SPACING,
      memoryIndex: i,
      collected: false,
    });
  }
  return hearts;
}

export function createGameEngine(): GameEngine {
  let canvas: HTMLCanvasElement | null = null;
  let ctx: CanvasRenderingContext2D | null = null;
  let rafId: number = 0;
  let active = false;

  // Audio
  let audio: HTMLAudioElement | null = null;
  let audioStarted = false;

  function initAudio() {
    if (audio) return;
    audio = new Audio("/audio/pyrokinesis-mi-s-toboy-kak-budto.mp3");
    audio.loop = true;
    audio.volume = 0.2;
  }

  function startAudio() {
    if (!audio || audioStarted) return;
    audio.play().then(() => { audioStarted = true; }).catch(() => {});
  }

  function seekAudio(time: number) {
    if (!audio) return;
    audio.currentTime = time;
  }

  // Input state
  let inputRight = false;

  const state: GameState = {
    screen: GameScreen.TITLE,
    playerX: 30,
    playerY: GROUND_Y - 16,
    cameraX: 0,
    animFrame: 0,
    animTimer: 0,
    hearts: createHearts(),
    particles: [],
    currentMemory: 0,
    heartsCollected: 0,
    timer: 0,
    themeIndex: 0,
    running: false,
    meeting: false,
    meetX: 0,
    meetTimer: 0,
    meetTextIndex: -1,
    meetTextTimer: 0,
    heartExploded: false,
    heartRain: [],
  };

  let callbacks: {
    onScreenChange?: (screen: GameScreen) => void;
    onMemoryChange?: (memoryIndex: number) => void;
    onHeartsChange?: (collected: number, total: number) => void;
    onMeetingText?: (textIndex: number, exploded: boolean) => void;
  } = {};

  function setScreen(screen: GameScreen) {
    state.screen = screen;
    callbacks.onScreenChange?.(screen);
  }

  function advanceMeetText() {
    if (state.meetTextIndex < 4) {
      state.meetTextIndex++;
      state.meetTextTimer = 0;
      callbacks.onMeetingText?.(state.meetTextIndex, state.heartExploded);
      // Explode heart on last text
      if (state.meetTextIndex === 4 && !state.heartExploded) {
        state.heartExploded = true;
        callbacks.onMeetingText?.(state.meetTextIndex, true);
        // Spawn explosion particles outward
        for (let i = 0; i < 20; i++) {
          const angle = (Math.PI * 2 * i) / 20;
          const speed = 1.5 + Math.random() * 2;
          state.particles.push({
            x: state.playerX + 15,
            y: GROUND_Y - 38,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 1,
            life: 50,
            maxLife: 50,
            color: i % 3 === 0 ? "#ff2255" : i % 3 === 1 ? "#ff6688" : "#ff88aa",
            size: 2 + Math.random(),
          });
        }
        // Start heart rain
        for (let i = 0; i < 30; i++) {
          state.heartRain.push({
            x: Math.random() * INTERNAL_W,
            y: -10 - Math.random() * 80,
            vy: 0.3 + Math.random() * 0.5,
            size: 2 + Math.random() * 3,
            alpha: 0.4 + Math.random() * 0.5,
            color: ["#ff2255", "#ff6688", "#ff88aa", "#ffaacc"][Math.floor(Math.random() * 4)],
          });
        }
      }
    }
  }

  // ===== INPUT HANDLERS =====
  function onKeyDown(e: KeyboardEvent) {
    if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
      inputRight = true;
    }
    // During meeting, any key advances text
    if (state.meeting && state.meetTimer > 90) {
      advanceMeetText();
    }
  }

  function onKeyUp(e: KeyboardEvent) {
    if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
      inputRight = false;
    }
  }

  function onPointerDown() {
    if (state.meeting && state.meetTimer > 90) {
      advanceMeetText();
      return;
    }
    inputRight = true;
  }

  function onPointerUp() {
    if (state.meeting) return;
    inputRight = false;
  }

  function attachInput() {
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    if (canvas) {
      canvas.addEventListener("pointerdown", onPointerDown);
      canvas.addEventListener("pointerup", onPointerUp);
      canvas.addEventListener("pointerleave", onPointerUp);
      canvas.addEventListener("pointercancel", onPointerUp);
    }
  }

  function detachInput() {
    window.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("keyup", onKeyUp);
    if (canvas) {
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointerleave", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerUp);
    }
  }

  // ===== GAME LOOP =====
  function gameLoop() {
    if (!active || !ctx) return;

    state.timer++;

    switch (state.screen) {
      case GameScreen.TITLE:
        break;

      case GameScreen.RUNNING: {
        // Meeting mode — both stand together
        if (state.meeting) {
          state.meetTimer++;
          state.meetTextTimer++;
          state.animFrame = 0;
          // Auto-show first text line after delay
          if (state.meetTextIndex === -1 && state.meetTimer > 120) {
            state.meetTextIndex = 0;
            state.meetTextTimer = 0;
            callbacks.onMeetingText?.(0, false);
          }
          // Still update camera to center on the couple
          const targetCamX = state.playerX - INTERNAL_W * 0.3;
          state.cameraX += (targetCamX - state.cameraX) * 0.06;
          if (state.cameraX < 0) state.cameraX = 0;
          // Update remaining particles
          for (let i = state.particles.length - 1; i >= 0; i--) {
            const p = state.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.06;
            p.vx *= 0.98;
            p.life--;
            if (p.life <= 0) state.particles.splice(i, 1);
          }
          // Update heart rain
          for (const hr of state.heartRain) {
            hr.y += hr.vy;
            // Reset when off screen
            if (hr.y > INTERNAL_H + 10) {
              hr.y = -10 - Math.random() * 30;
              hr.x = Math.random() * INTERNAL_W;
            }
          }
          break;
        }

        // Player moves right when input is active
        if (state.running && inputRight) {
          state.playerX += PLAYER_SPEED;

          // Run animation
          state.animTimer++;
          if (state.animTimer % 8 === 0) {
            state.animFrame = state.animFrame === 1 ? 2 : 1;
          }
        } else {
          // Idle
          state.animFrame = 0;
          state.animTimer = 0;
        }

        // Camera follows player smoothly
        const targetCamX = state.playerX - INTERNAL_W * 0.3;
        state.cameraX += (targetCamX - state.cameraX) * 0.06;
        if (state.cameraX < 0) state.cameraX = 0;

        // Check heart collision
        if (state.running) {
          for (const heart of state.hearts) {
            if (heart.collected) continue;
            const dx = Math.abs(state.playerX + 8 - heart.worldX);
            if (dx < 18) {
              heart.collected = true;
              state.heartsCollected++;
              state.running = false;
              state.animFrame = 0;

              // Spawn heart particles
              for (let i = 0; i < 14; i++) {
                const angle = (Math.PI * 2 * i) / 14;
                state.particles.push({
                  x: heart.worldX,
                  y: GROUND_Y - 12,
                  vx: Math.cos(angle) * (1.5 + Math.random() * 1.5),
                  vy: Math.sin(angle) * (1.5 + Math.random() * 1.5) - 1.5,
                  life: 45,
                  maxLife: 45,
                  color: i % 3 === 0 ? "#ff4466" : i % 3 === 1 ? "#ff88aa" : "#ffaacc",
                  size: 2 + Math.random(),
                });
              }

              // Last heart = boy meeting
              if (heart.memoryIndex === 5) {
                state.meeting = true;
                state.meetX = heart.worldX;
                state.meetTimer = 0;
                // Change to final theme
                state.themeIndex = 6;
                // Seek music to 0:57
                seekAudio(57.5);
                break;
              }

              // Regular hearts — change theme and show memory
              state.themeIndex = Math.min(state.heartsCollected, 6);

              callbacks.onHeartsChange?.(state.heartsCollected, TOTAL_HEARTS);

              // Show memory after short delay
              setTimeout(() => {
                if (state.screen !== GameScreen.RUNNING) return;
                state.currentMemory = state.heartsCollected - 1;
                callbacks.onMemoryChange?.(state.currentMemory);
                setScreen(GameScreen.MEMORY);
              }, 600);

              break;
            }
          }
        }

        // Update particles
        for (let i = state.particles.length - 1; i >= 0; i--) {
          const p = state.particles[i];
          p.x += p.vx;
          p.y += p.vy;
          p.vy += 0.06;
          p.vx *= 0.98;
          p.life--;
          if (p.life <= 0) state.particles.splice(i, 1);
        }

        break;
      }

      case GameScreen.MEMORY:
        // Update particles that may still be alive
        for (let i = state.particles.length - 1; i >= 0; i--) {
          const p = state.particles[i];
          p.x += p.vx;
          p.y += p.vy;
          p.vy += 0.06;
          p.vx *= 0.98;
          p.life--;
          if (p.life <= 0) state.particles.splice(i, 1);
        }
        break;

      case GameScreen.FINAL:
        break;
    }

    // Render
    renderFrame(ctx, state);

    rafId = requestAnimationFrame(gameLoop);
  }

  const engine: GameEngine = {
    start() {
      if (active) return;
      active = true;
      attachInput();
      setScreen(GameScreen.TITLE);
      rafId = requestAnimationFrame(gameLoop);
    },

    stop() {
      active = false;
      detachInput();
      cancelAnimationFrame(rafId);
      if (audio) { audio.pause(); audio = null; audioStarted = false; }
    },

    setCanvas(c: HTMLCanvasElement) {
      canvas = c;
      canvas.width = INTERNAL_W;
      canvas.height = INTERNAL_H;
      ctx = canvas.getContext("2d");
      if (ctx) ctx.imageSmoothingEnabled = false;
    },

    triggerStart() {
      initAudio();
      startAudio();
      state.running = true;
      setScreen(GameScreen.RUNNING);
    },

    triggerContinue() {
      startAudio();
      if (state.heartsCollected >= TOTAL_HEARTS) {
        setScreen(GameScreen.FINAL);
      } else {
        state.running = true;
        setScreen(GameScreen.RUNNING);
      }
    },

    set onScreenChange(fn: ((screen: GameScreen) => void) | undefined) {
      callbacks.onScreenChange = fn;
    },
    get onScreenChange() {
      return callbacks.onScreenChange;
    },

    set onMemoryChange(fn: ((memoryIndex: number) => void) | undefined) {
      callbacks.onMemoryChange = fn;
    },
    get onMemoryChange() {
      return callbacks.onMemoryChange;
    },

    set onHeartsChange(fn: ((collected: number, total: number) => void) | undefined) {
      callbacks.onHeartsChange = fn;
    },
    get onHeartsChange() {
      return callbacks.onHeartsChange;
    },

    set onMeetingText(fn: ((textIndex: number, exploded: boolean) => void) | undefined) {
      callbacks.onMeetingText = fn;
    },
    get onMeetingText() {
      return callbacks.onMeetingText;
    },
  };

  return engine;
}
