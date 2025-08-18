"use client";

import { useEffect, useRef, useState } from "react";

type InputState = { left: boolean; right: boolean; jump: boolean };

export default function Page() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [completed, setCompleted] = useState(false);
  const [started, setStarted] = useState(false);
  const [debugInfo, setDebugInfo] = useState({ jump: false, onGround: false, vy: 0 });
  const [debug, setDebug] = useState(false);
  const inputs = useRef<InputState>({ left: false, right: false, jump: false });
  const jumpRequest = useRef(false);
  const apiRef = useRef<{ reset: () => void } | null>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
    if (!ctx) return;

    // Layout constants
    let pixelRatio = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    let viewW = 0;
    let viewH = 0;

    // Static texture source and separate patterns for background vs arena/actors
    let noiseCanvas: HTMLCanvasElement | null = null;
    let bgPattern: CanvasPattern | null = null;
    let arenaPattern: CanvasPattern | null = null;

    function hexToRgb(hex: string) {
      const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      if (!m) return { r: 255, g: 255, b: 255 };
      return { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) };
    }

    function buildNoiseCanvas(size: number, tintHex: string, contrast = 1, brightness = 1) {
      const off = document.createElement("canvas");
      off.width = size;
      off.height = size;
      const ictx = off.getContext("2d");
      if (!ictx) return null;
      const img = ictx.createImageData(size, size);
      const tint = hexToRgb(tintHex);
      for (let i = 0; i < img.data.length; i += 4) {
        let v = Math.random() * 255; // white noise
        v = (v - 128) * contrast + 128; // apply contrast
        v = v * brightness; // apply brightness
        if (v < 0) v = 0; if (v > 255) v = 255;
        img.data[i] = (v * tint.r) / 255;
        img.data[i + 1] = (v * tint.g) / 255;
        img.data[i + 2] = (v * tint.b) / 255;
        img.data[i + 3] = 255;
      }
      ictx.putImageData(img, 0, 0);
      return off;
    }

    function buildPatterns() {
      // One shared neutral noise; make distinct pattern objects so we can transform independently
      noiseCanvas = buildNoiseCanvas(128, "#bfc5c9", 1.15, 1.0);
      const ctx2d = canvas.getContext("2d");
      if (!noiseCanvas || !ctx2d) return;
      bgPattern = ctx2d.createPattern(noiseCanvas, "repeat");
      arenaPattern = ctx2d.createPattern(noiseCanvas, "repeat");
    }

    function resize() {
      // Target landscape canvas. If portrait, still fit.
      viewW = Math.max(window.innerWidth, window.innerHeight);
      viewH = Math.min(window.innerWidth, window.innerHeight);
      canvas.width = Math.floor(viewW * pixelRatio);
      canvas.height = Math.floor(viewH * pixelRatio);
      canvas.style.width = viewW + "px";
      canvas.style.height = viewH + "px";
      buildPatterns();
    }
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(document.body);

    // Game state
    const world = {
      // Camera scroll X; player fixed near bottom-center
      scrollX: 0,
      gravity: 2400, // px/s^2
      friction: 0.86,
      time: 0,
      finished: false,
    };

    // Player is stationary in screen space, but has worldY for jumping
    const player = {
      radius: 22,
      rotation: 0,
      vy: 0, // height above ground/platform in px
      vv: 0, // vertical velocity in px/s (positive = up)
      onGround: false,
      // screen anchor
      screenX: () => viewW * 0.33,
      screenY: () => viewH * 0.75,
    };

    // Build level geometry (world coordinates)
    // Ground baseline slightly above bottom with gentle slope down to the right
    const baselineY = (x: number) => 0; // base for walls; we will use platforms instead

    type Segment = { x: number; y: number; w: number; h: number; type: "floor" | "wall" | "spike" | "goal" | "ceiling" | "bottom" };
    const segments: Segment[] = [];

    // Dimensions
    const levelStartX = -200;
    const levelWidth = 2400;
    const levelEndX = levelStartX + levelWidth;
    const levelHeight = 220;

    // Floor platform running across whole level (y=0 is the top of floor)
    segments.push({ x: levelStartX, y: 0, w: levelWidth, h: 32, type: "floor" });
    // Outer borders: far left/right fills and a tall ceiling band (appear infinite)
    const INF = 100000;
    segments.push({ x: levelStartX - INF, y: 0, w: INF, h: levelHeight, type: "wall" }); // left fill
    segments.push({ x: levelEndX, y: 0, w: INF, h: levelHeight, type: "wall" }); // right fill
    segments.push({ x: levelStartX - INF, y: 0, w: levelWidth + 2 * INF, h: levelHeight, type: "ceiling" });
    // Fill everything beneath the floor with arena texture
    segments.push({ x: levelStartX - INF, y: 0, w: levelWidth + 2 * INF, h: 4000, type: "bottom" });

    // Two walls to climb over
    segments.push({ x: 400, y: 0, w: 32, h: 140, type: "wall" });
    segments.push({ x: 900, y: 0, w: 32, h: 180, type: "wall" });

    // Spike ramp
    segments.push({ x: 1400, y: 0, w: 80, h: 120, type: "spike" });

    // Removed horizontal bar obstacle near the end

    // Goal area (small floating circle target) - store center via w as diameter proxy
    segments.push({ x: 2000, y: 0, w: 36, h: 90, type: "goal" });

    // Camera target x in world space; we move world to the left/right instead of player
    let cameraX = 0;

    function worldToScreen(x: number, y: number) {
      // y = 0 is top of ground. Player's jump height (player.vy) shifts the world vertically.
      const px = (x - cameraX) * pixelRatio + player.screenX() * pixelRatio;
      const py = (player.screenY() + player.radius - (y - player.vy)) * pixelRatio;
      return { x: px, y: py };
    }

    function draw() {
      const c = ctx as CanvasRenderingContext2D;
      c.save();
      c.clearRect(0, 0, canvas.width, canvas.height);

      // Fill the entire canvas with the background texture (fixed to screen)
      if (bgPattern && (bgPattern as any).setTransform) {
        (bgPattern as any).setTransform(new DOMMatrix());
      }
      c.fillStyle = bgPattern || "#bfc5c9";
      c.fillRect(0, 0, canvas.width, canvas.height);

      // (No boundary lines per design)

      // Draw moving arena + obstacles over the fixed background
      // (we offset the arena pattern transform based on world position so the texture appears attached to the arena)
      for (const s of segments) {
        if (arenaPattern && (arenaPattern as any).setTransform) {
          const anchor = worldToScreen(s.x, s.y);
          (arenaPattern as any).setTransform(new DOMMatrix().translate((anchor.x % 128), (anchor.y % 128)));
        }
        c.fillStyle = arenaPattern || "#bfc5c9";
        if (s.type === "spike") {
          // draw as triangle
          const a = worldToScreen(s.x, s.y);
          const b = worldToScreen(s.x + s.w, s.y);
          const apex = worldToScreen(s.x + s.w * 0.5, s.y + s.h);
          c.beginPath();
          c.moveTo(a.x, a.y);
          c.lineTo(b.x, b.y);
          c.lineTo(apex.x, apex.y);
          c.closePath();
          c.fill();
        } else if (s.type === "goal") {
          // Draw a floating circle target
          const centerX = s.x + s.w * 0.5;
          const centerY = s.h; // height above ground
          const r = 18;
          const gp = worldToScreen(centerX, centerY);
          if (arenaPattern && (arenaPattern as any).setTransform) {
            (arenaPattern as any).setTransform(new DOMMatrix().translate(((gp.x + 37) % 128), ((gp.y + 59) % 128)));
          }
          c.beginPath();
          c.arc(gp.x, gp.y, r * pixelRatio, 0, Math.PI * 2);
          c.fill();
        } else if (s.type === "floor") {
          // Floors extend DOWN from y=0
          const p = worldToScreen(s.x, s.y);
          c.fillRect(p.x, p.y, s.w * pixelRatio, s.h * pixelRatio);
        } else if (s.type === "ceiling") {
          // Fill everything above the arena height with the boundary color
          const p = worldToScreen(s.x, s.h);
          c.fillRect(p.x, p.y, s.w * pixelRatio, -4000 * pixelRatio);
        } else if (s.type === "bottom") {
          // Fill everything below the floor line
          const p = worldToScreen(s.x, s.y);
          c.fillRect(p.x, p.y, s.w * pixelRatio, 4000 * pixelRatio);
        } else {
          // Walls extend UP from y=0
          const p = worldToScreen(s.x, s.y);
          c.fillRect(p.x, p.y - s.h * pixelRatio, s.w * pixelRatio, s.h * pixelRatio);
        }
      }

      // Player circle (fixed on screen; world moves instead)
      const px = player.screenX() * pixelRatio;
      const py = player.screenY() * pixelRatio;
      c.translate(px, py);
      c.rotate(player.rotation);
      if (arenaPattern && (arenaPattern as any).setTransform) {
        (arenaPattern as any).setTransform(new DOMMatrix().translate(((px / pixelRatio + 23) % 128), ((py / pixelRatio + 17) % 128)));
      }
      c.fillStyle = arenaPattern || "#bfc5c9";
      c.beginPath();
      c.arc(0, 0, player.radius * pixelRatio, 0, Math.PI * 2);
      c.fill();
      // No stroke/boundary
      c.restore();

      // Debug outlines
      if (debug) {
        const outline = "#00ffa2";
        c.save();
        c.lineWidth = 2 * pixelRatio;
        c.strokeStyle = outline;
        // Outline arena rectangle
        const leftX = worldToScreen(levelStartX, 0).x;
        const rightX = worldToScreen(levelEndX, 0).x;
        const floorY = worldToScreen(0, 0).y;
        const ceilingY = worldToScreen(0, levelHeight).y;
        const x1 = Math.min(leftX, rightX);
        const x2 = Math.max(leftX, rightX);
        const y1 = Math.min(ceilingY, floorY);
        const y2 = Math.max(ceilingY, floorY);
        c.strokeRect(x1, y1, x2 - x1, y2 - y1);
        // Outline each segment
        for (const s of segments) {
          c.beginPath();
          if (s.type === "spike") {
            const a = worldToScreen(s.x, s.y);
            const b = worldToScreen(s.x + s.w, s.y);
            const apex = worldToScreen(s.x + s.w * 0.5, s.y + s.h);
            c.moveTo(a.x, a.y);
            c.lineTo(b.x, b.y);
            c.lineTo(apex.x, apex.y);
            c.closePath();
          } else if (s.type === "goal") {
            const centerX = s.x + s.w * 0.5;
            const centerY = s.h;
            const r = 18 * pixelRatio;
            const gp = worldToScreen(centerX, centerY);
            c.arc(gp.x, gp.y, r, 0, Math.PI * 2);
          } else if (s.type === "floor") {
            const p = worldToScreen(s.x, s.y);
            c.rect(p.x, p.y, s.w * pixelRatio, s.h * pixelRatio);
          } else if (s.type === "ceiling") {
            const p = worldToScreen(s.x, s.h);
            c.rect(p.x, p.y - 4000 * pixelRatio, s.w * pixelRatio, 4000 * pixelRatio);
          } else {
            const p = worldToScreen(s.x, s.y);
            c.rect(p.x, p.y - s.h * pixelRatio, s.w * pixelRatio, s.h * pixelRatio);
          }
          c.stroke();
        }
        // Outline player
        c.beginPath();
        c.arc(player.screenX() * pixelRatio, player.screenY() * pixelRatio, player.radius * pixelRatio, 0, Math.PI * 2);
        c.stroke();
        c.restore();
      }
    }

    function intersectsSpike(s: Segment, px: number, py: number, r: number) {
      // Triangle spike with base [x, x+w] at y=0 and apex at y=h
      // Convert to local spike space
      const localX = px - s.x;
      const localY = py - s.y;
      if (localX < -r || localX > s.w + r || localY < -r || localY > s.h + r) return false;
      // Distance from line edges using barycentric test
      const ax = 0, ay = 0;
      const bx = s.w, by = 0;
      const cx = s.w * 0.5, cy = s.h;
      const v0x = cx - ax, v0y = cy - ay;
      const v1x = bx - ax, v1y = by - ay;
      const v2x = localX - ax, v2y = localY - ay;
      const dot00 = v0x * v0x + v0y * v0y;
      const dot01 = v0x * v1x + v0y * v1y;
      const dot02 = v0x * v2x + v0y * v2y;
      const dot11 = v1x * v1x + v1y * v1y;
      const dot12 = v1x * v2x + v1y * v2y;
      const invDen = 1 / (dot00 * dot11 - dot01 * dot01);
      const u = (dot11 * dot02 - dot01 * dot12) * invDen;
      const v = (dot00 * dot12 - dot01 * dot02) * invDen;
      const inside = u >= 0 && v >= 0 && u + v <= 1;
      if (!inside) return false;
      // If inside triangle within radius, consider hit
      return true;
    }

    function step(dt: number) {
      if (world.finished || !startedRef.current) return;
      world.time += dt;

      // Horizontal movement via camera scroll (world moves opposite)
      const speed = 320; // px/s in world space
      let desired = cameraX;
      if (inputs.current.left) desired -= speed * dt;
      if (inputs.current.right) desired += speed * dt;

      // Prepare jump input (consumed after contacts are known)
      const jumpPressed = inputs.current.jump || jumpRequest.current;
      jumpRequest.current = false;

      // Compute collisions at the player's world position
      let playerWorldX = desired; // because player is at screen anchor
      let groundY = 0;
      let hitSpike = false;
      let reachedGoal = false;
      let nearLeftWall = false;
      let nearRightWall = false;

      for (const s of segments) {
        if (s.type === "floor") {
          // Floors set ground to 0 within their x-range
          if (playerWorldX > s.x - player.radius && playerWorldX < s.x + s.w + player.radius) {
            groundY = Math.max(groundY, 0);
          }
        } else if (s.type === "wall") {
          // Treat top as a step but block front face unless player is high enough
          const within = playerWorldX > s.x && playerWorldX < s.x + s.w;
          if (within) groundY = Math.max(groundY, s.h);
          const crossingRight = cameraX <= s.x - player.radius && desired > s.x - player.radius;
          const crossingLeft = cameraX >= s.x + s.w + player.radius && desired < s.x + s.w + player.radius;
          const needsJumpHeight = s.h - 12; // must be nearly at top
          if ((crossingRight || crossingLeft) && player.vy < needsJumpHeight) {
            // Block movement at face
            desired = crossingRight ? s.x - player.radius : s.x + s.w + player.radius;
            playerWorldX = desired;
          }
          // Proximity for wall jump (within a few px of the face, below top)
          if (Math.abs(playerWorldX - (s.x - player.radius)) < 4 && player.vy < s.h) nearRightWall = true;
          if (Math.abs(playerWorldX - (s.x + s.w + player.radius)) < 4 && player.vy < s.h) nearLeftWall = true;
        } else if (s.type === "spike") {
          if (intersectsSpike(s, playerWorldX, player.vy, player.radius)) hitSpike = true;
        } else if (s.type === "goal") {
          // Goal as circle at (x + w/2, h)
          const cx = s.x + s.w * 0.5;
          const cy = s.h;
          const dx = playerWorldX - cx;
          const dy = player.vy - cy;
          const r = 18 + player.radius;
          if (dx * dx + dy * dy <= r * r) reachedGoal = true;
        }
      }

      // Apply jumps now that we know contacts
      const jumpSpeed = 900; // px/s
      const wallKick = 220;  // px horizontal impulse
      if (jumpPressed) {
        if (player.onGround) {
          player.vv = jumpSpeed;
        } else if (nearLeftWall) {
          player.vv = jumpSpeed;
          // Only kick if we're actually moving into the wall; otherwise don't pull backwards
          if (desired <= cameraX) desired = cameraX + wallKick * dt;
        } else if (nearRightWall) {
          player.vv = jumpSpeed;
          if (desired >= cameraX) desired = cameraX - wallKick * dt;
        }
      }

      // Integrate vertical physics
      player.vv -= world.gravity * dt;
      player.vy += player.vv * dt;

      // Ground/platform collision and clamp (also block at ceiling)
      if (player.vy <= groundY) {
        player.vy = groundY;
        player.vv = 0;
        player.onGround = true;
      } else {
        player.onGround = false;
      }

      // Hard ceiling at levelHeight
      const ceilingTop = levelHeight; // same as we used to draw ceiling
      if (player.vy > ceilingTop - player.radius * 0.5) {
        player.vy = ceilingTop - player.radius * 0.5;
        if (player.vv > 0) player.vv = 0;
      }

      if (hitSpike) {
        // Reset simple state
        desired = 0;
        player.vy = groundY;
        player.rotation = 0;
      }

      if (reachedGoal) {
        world.finished = true;
        setCompleted(true);
      }

      // Commit camera move and apply roll rotation from net displacement
      const deltaX = desired - cameraX;
      cameraX = desired;
      player.rotation += (deltaX) / (player.radius * 2);

      // Update debug info at end
      setDebugInfo({
        jump: jumpPressed,
        onGround: player.onGround,
        vy: Math.round(player.vy)
      });
    }

    let last = performance.now();
    let raf = 0;
    const loop = (t: number) => {
      const dt = Math.min(0.05, (t - last) / 1000);
      last = t;
      step(dt);
      draw();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    // Expose reset to UI
    apiRef.current = {
      reset: () => {
        cameraX = 0;
        player.vy = 0;
        player.vv = 0;
        player.onGround = true;
        world.finished = false;
        setCompleted(false);
      },
    };

    // Keyboard support
    const down = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" || e.key === "a") inputs.current.left = true;
      if (e.key === "ArrowRight" || e.key === "d") inputs.current.right = true;
      if (e.key === " " || e.key === "ArrowUp" || e.key === "w") inputs.current.jump = true;
    };
    const up = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" || e.key === "a") inputs.current.left = false;
      if (e.key === "ArrowRight" || e.key === "d") inputs.current.right = false;
      if (e.key === " " || e.key === "ArrowUp" || e.key === "w") inputs.current.jump = false;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  // Keep a live ref of `started` for the game loop closure
  useEffect(() => {
    startedRef.current = started;
  }, [started]);

  return (
    <div style={{ width: "100dvw", height: "100dvh", position: "relative", overflow: "hidden" }}>
      <canvas ref={canvasRef} style={{ display: "block" }} />

      <div className="hud">
        {completed && (
          <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>
            <div style={{ background: 'rgba(0,0,0,0.7)', border: '2px solid #22c55e', padding: '24px 28px', borderRadius: 12, textAlign: 'center', color: 'white', width: 'min(90vw, 420px)' }}>
              <div style={{ fontSize: 28, fontWeight: 700, marginBottom: 12 }}>Level complete!</div>
              <button
                className="btn"
                style={{ position: 'static', width: '100%', height: 56, borderRadius: 10, background: '#22c55e', color: '#0b0f14', fontSize: 20, fontWeight: 700 }}
                onClick={() => { apiRef.current?.reset(); setStarted(true); }}
              >
                Play again
              </button>
            </div>
          </div>
        )}
        {!started && !completed && (
          <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>
            <div style={{ background: 'rgba(0,0,0,0.6)', border: '2px solid #3eb1d1', padding: '24px 28px', borderRadius: 12, textAlign: 'center', color: 'white', width: 'min(90vw, 420px)' }} onClick={() => setStarted(true)}>
              <div style={{ fontSize: 26, fontWeight: 700, marginBottom: 10 }}>Rolling Dot</div>
              <div style={{ opacity: 0.8, marginBottom: 16 }}>Hold left/right to move the arena. Tap jump to scale walls and clear spikes.</div>
              <button
                className="btn"
                style={{ position: 'static', width: '100%', height: 56, borderRadius: 10, background: '#3eb1d1', color: '#0b0f14', fontSize: 20, fontWeight: 700 }}
                onClick={(e) => { e.stopPropagation(); setStarted(true); }}
              >
                Start
              </button>
            </div>
          </div>
        )}

        {/* Settings removed */}
        {/* Debug hidden by default (toggle by uncommenting) */}
        {false && (
          <div style={{ position: 'absolute', top: '10px', left: '10px', color: 'white', background: 'rgba(0,0,0,0.5)', padding: '8px', fontSize: '14px', fontFamily: 'monospace' }}>
            Jump: {debugInfo.jump ? 'YES' : 'NO'}<br/>
            OnGround: {debugInfo.onGround ? 'YES' : 'NO'}<br/>
            VY: {debugInfo.vy}
          </div>
        )}
        {/* Invisible on-screen controls (functional) */}
        <div className="controls" aria-hidden>
          <button
            aria-label="Move left"
            className="btn btn-left"
            style={{ opacity: 0, background: 'transparent' }}
            onPointerDown={() => (inputs.current.left = true)}
            onPointerUp={() => (inputs.current.left = false)}
            onPointerCancel={() => (inputs.current.left = false)}
          />
          <button
            aria-label="Move right"
            className="btn btn-right"
            style={{ opacity: 0, background: 'transparent' }}
            onPointerDown={() => (inputs.current.right = true)}
            onPointerUp={() => (inputs.current.right = false)}
            onPointerCancel={() => (inputs.current.right = false)}
          />
          <button
            aria-label="Jump"
            className="btn btn-jump"
            style={{ opacity: 0, background: 'transparent' }}
            onPointerDown={(e) => { e.preventDefault(); inputs.current.jump = true; jumpRequest.current = true; }}
            onPointerUp={(e) => { e.preventDefault(); inputs.current.jump = false; }}
            onPointerCancel={() => (inputs.current.jump = false)}
            onClick={(e) => { e.preventDefault(); jumpRequest.current = true; }}
          />
        </div>
      </div>
    </div>
  );
}


