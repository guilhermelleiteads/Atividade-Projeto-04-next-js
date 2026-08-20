"use client";

import { useEffect, useRef, useState } from "react";

type Rect = { x: number; y: number; w: number; h: number };
type Spike = { x: number; y: number; w: number; h: number };

const WORLD_W = 7200;
const WORLD_H = 520;
const PLAYER_W = 30;
const PLAYER_H = 42;
const GROUND_Y = 410;

const platforms: Rect[] = [
  { x: 0, y: GROUND_Y, w: 620, h: 110 },
  { x: 700, y: GROUND_Y, w: 560, h: 110 },
  { x: 1320, y: GROUND_Y, w: 500, h: 110 },
  { x: 1880, y: GROUND_Y, w: 650, h: 110 },
  { x: 2600, y: GROUND_Y, w: 360, h: 110 },
  { x: 3070, y: GROUND_Y, w: 560, h: 110 },
  { x: 3740, y: GROUND_Y, w: 430, h: 110 },
  { x: 4300, y: GROUND_Y, w: 560, h: 110 },
  { x: 5000, y: GROUND_Y, w: 300, h: 110 },
  { x: 5450, y: GROUND_Y, w: 500, h: 110 },
  { x: 6100, y: GROUND_Y, w: 1100, h: 110 },

  // Plataformas elevadas.
  { x: 1420, y: 320, w: 150, h: 24 },
  { x: 2160, y: 300, w: 170, h: 24 },
  { x: 3240, y: 320, w: 160, h: 24 },
  { x: 4420, y: 300, w: 160, h: 24 },
  { x: 5650, y: 310, w: 170, h: 24 }
];

const spikes: Spike[] = [
  { x: 480, y: GROUND_Y - 26, w: 52, h: 26 },
  { x: 820, y: GROUND_Y - 26, w: 78, h: 26 },
  { x: 1110, y: GROUND_Y - 26, w: 52, h: 26 },
  { x: 1510, y: GROUND_Y - 26, w: 78, h: 26 },
  { x: 2010, y: GROUND_Y - 26, w: 104, h: 26 },
  { x: 2410, y: GROUND_Y - 26, w: 52, h: 26 },
  { x: 2730, y: GROUND_Y - 26, w: 104, h: 26 },
  { x: 3440, y: GROUND_Y - 26, w: 78, h: 26 },
  { x: 3890, y: GROUND_Y - 26, w: 104, h: 26 },
  { x: 4550, y: GROUND_Y - 26, w: 78, h: 26 },
  { x: 5170, y: GROUND_Y - 26, w: 52, h: 26 },
  { x: 5780, y: GROUND_Y - 26, w: 104, h: 26 },
  { x: 6460, y: GROUND_Y - 26, w: 78, h: 26 }
];

const start = () => ({
  x: 80,
  y: GROUND_Y - PLAYER_H,
  vx: 0,
  vy: 0,
  grounded: false
});

function intersects(a: Rect, b: Rect) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export default function Game() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<{
    player: ReturnType<typeof start>;
    keys: Set<string>;
    deaths: number;
    mode: "playing" | "dead" | "won";
    startedAt: number;
    elapsed: number;
  } | null>(null);

  const [mode, setMode] = useState<"playing" | "dead" | "won">("playing");
  const [deaths, setDeaths] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  if (!stateRef.current) {
    stateRef.current = {
      player: start(),
      keys: new Set(),
      deaths: 0,
      mode: "playing",
      startedAt: performance.now(),
      elapsed: 0
    };
  }

  const reset = () => {
    const s = stateRef.current!;
    s.player = start();
    s.mode = "playing";
    s.startedAt = performance.now();
    s.elapsed = 0;
    setMode("playing");
    setElapsed(0);
  };

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const s = stateRef.current!;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(canvas.clientWidth * dpr);
      canvas.height = Math.floor(canvas.clientHeight * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const down = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (["arrowleft", "arrowright", "a", "d", " ", "r"].includes(key)) e.preventDefault();
      s.keys.add(key);
      if (key === "r" && s.mode !== "playing") reset();
    };
    const up = (e: KeyboardEvent) => s.keys.delete(e.key.toLowerCase());
    window.addEventListener("keydown", down, { passive: false });
    window.addEventListener("keyup", up);

    let raf = 0;
    let last = performance.now();

    const die = () => {
      s.deaths += 1;
      s.mode = "dead";
      setDeaths(s.deaths);
      setMode("dead");
    };

    const update = (dt: number) => {
      if (s.mode !== "playing") return;

      const p = s.player;
      const left = s.keys.has("arrowleft") || s.keys.has("a");
      const right = s.keys.has("arrowright") || s.keys.has("d");
      const jump = s.keys.has(" ") || s.keys.has("arrowup") || s.keys.has("w");

      if (left) p.vx -= 1100 * dt;
      if (right) p.vx += 1100 * dt;
      if (!left && !right) p.vx *= Math.pow(0.001, dt);
      p.vx = Math.max(-280, Math.min(280, p.vx));

      if (jump && p.grounded) {
        p.vy = -610;
        p.grounded = false;
      }

      p.vy += 1500 * dt;
      const oldY = p.y;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.grounded = false;

      const box: Rect = { x: p.x, y: p.y, w: PLAYER_W, h: PLAYER_H };
      const oldBottom = oldY + PLAYER_H;

      for (const platform of platforms) {
        const landing =
          p.vy >= 0 &&
          oldBottom <= platform.y + 8 &&
          p.y + PLAYER_H >= platform.y &&
          p.x + PLAYER_W > platform.x &&
          p.x < platform.x + platform.w;

        if (landing) {
          p.y = platform.y - PLAYER_H;
          p.vy = 0;
          p.grounded = true;
        }
      }

      const currentBox: Rect = { x: p.x, y: p.y, w: PLAYER_W, h: PLAYER_H };
      if (spikes.some(sp => intersects(currentBox, sp))) die();
      if (p.y > WORLD_H + 50) die();

      if (p.x + PLAYER_W >= WORLD_W - 180) {
        s.mode = "won";
        s.elapsed = (performance.now() - s.startedAt) / 1000;
        setElapsed(s.elapsed);
        setMode("won");
      }
    };

    const draw = () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      const p = s.player;

      const camera = Math.max(0, Math.min(WORLD_W - w, p.x - w * 0.35));
      const groundY = GROUND_Y;

      // Fundo.
      const sky = ctx.createLinearGradient(0, 0, 0, h);
      sky.addColorStop(0, "#8bd8ff");
      sky.addColorStop(1, "#e8f8ff");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, h);

      // Sol e nuvens.
      ctx.fillStyle = "#ffd86b";
      ctx.beginPath();
      ctx.arc(w - 100, 85, 38, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "rgba(255,255,255,.72)";
      for (const cloud of [{x:130,y:80,s:1},{x:450,y:135,s:.75},{x:760,y:70,s:1.2}]) {
        ctx.beginPath();
        ctx.arc(cloud.x, cloud.y, 25 * cloud.s, 0, Math.PI * 2);
        ctx.arc(cloud.x + 30 * cloud.s, cloud.y - 8 * cloud.s, 32 * cloud.s, 0, Math.PI * 2);
        ctx.arc(cloud.x + 65 * cloud.s, cloud.y, 25 * cloud.s, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.save();
      ctx.translate(-camera, 0);

      // Silhueta distante.
      ctx.fillStyle = "#b6d8b0";
      for (let x = -200; x < WORLD_W; x += 320) {
        ctx.beginPath();
        ctx.moveTo(x, groundY);
        ctx.lineTo(x + 160, 250);
        ctx.lineTo(x + 320, groundY);
        ctx.closePath();
        ctx.fill();
      }

      // Plataformas.
      for (const platform of platforms) {
        ctx.fillStyle = "#365b42";
        ctx.fillRect(platform.x, platform.y, platform.w, platform.h);
        ctx.fillStyle = "#65c466";
        ctx.fillRect(platform.x, platform.y, platform.w, 10);
      }

      // Espinhos.
      ctx.fillStyle = "#e84a5f";
      for (const sp of spikes) {
        const count = Math.max(1, Math.floor(sp.w / 26));
        for (let i = 0; i < count; i++) {
          const x = sp.x + i * (sp.w / count);
          ctx.beginPath();
          ctx.moveTo(x, sp.y + sp.h);
          ctx.lineTo(x + sp.w / count / 2, sp.y);
          ctx.lineTo(x + sp.w / count, sp.y + sp.h);
          ctx.closePath();
          ctx.fill();
        }
      }

      // Chegada.
      ctx.fillStyle = "#222";
      ctx.fillRect(WORLD_W - 170, 235, 8, 175);
      ctx.fillStyle = "#ffcc4d";
      ctx.beginPath();
      ctx.moveTo(WORLD_W - 162, 240);
      ctx.lineTo(WORLD_W - 45, 270);
      ctx.lineTo(WORLD_W - 162, 300);
      ctx.closePath();
      ctx.fill();

      // Jogador.
      const bob = p.grounded && Math.abs(p.vx) > 20 ? Math.sin(performance.now() / 80) * 2 : 0;
      ctx.fillStyle = "#5b4bff";
      ctx.fillRect(p.x, p.y + bob, PLAYER_W, PLAYER_H);
      ctx.fillStyle = "#fff";
      ctx.fillRect(p.x + 6, p.y + 9 + bob, 7, 7);
      ctx.fillRect(p.x + 18, p.y + 9 + bob, 7, 7);
      ctx.fillStyle = "#1c1c38";
      ctx.fillRect(p.x + 9, p.y + 12 + bob, 3, 3);
      ctx.fillRect(p.x + 21, p.y + 12 + bob, 3, 3);

      ctx.restore();

      // Barra de progresso.
      const progress = Math.max(0, Math.min(1, p.x / (WORLD_W - 180)));
      ctx.fillStyle = "rgba(255,255,255,.65)";
      ctx.fillRect(20, 18, Math.max(120, w - 40), 8);
      ctx.fillStyle = "#5b4bff";
      ctx.fillRect(20, 18, Math.max(120, w - 40) * progress, 8);
    };

    const loop = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.032);
      last = now;
      update(dt);
      if (s.mode === "playing") {
        s.elapsed = (now - s.startedAt) / 1000;
        if (Math.floor(s.elapsed) !== Math.floor(s.elapsed - dt)) setElapsed(s.elapsed);
      }
      draw();
      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  const mobileKey = (key: string, pressed: boolean) => {
    const s = stateRef.current!;
    if (pressed) s.keys.add(key);
    else s.keys.delete(key);
  };

  return (
    <div style={{
      width: "min(1200px, 100%)",
      position: "relative",
      color: "#fff"
    }}>
      <div style={{
        position: "absolute", zIndex: 2, top: 14, left: 20, right: 20,
        display: "flex", justifyContent: "space-between", alignItems: "center",
        pointerEvents: "none", textShadow: "0 2px 4px rgba(0,0,0,.35)"
      }}>
        <strong style={{fontSize: 22}}>TINY RUNNER</strong>
        <span>Mortes: {deaths} · {Math.floor(elapsed)}s</span>
        <span style={{fontSize: 14}}>← → / A D · ESPAÇO = Pular</span>
      </div>

      <canvas
        ref={canvasRef}
        style={{
          width: "100%", height: "min(72vh, 560px)", display: "block",
          borderRadius: 18, boxShadow: "0 18px 50px rgba(0,0,0,.3)",
          touchAction: "none", background: "#8bd8ff"
        }}
      />

      <div style={{
        display: "none",
        position: "absolute", left: 0, right: 0, bottom: 18,
        justifyContent: "space-between", padding: "0 18px",
        pointerEvents: "none"
      }} className="mobile-controls">
        <div style={{display:"flex", gap:10}}>
          <button onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); mobileKey("arrowleft", true); }} onPointerUp={() => mobileKey("arrowleft", false)} onPointerCancel={() => mobileKey("arrowleft", false)}>◀</button>
          <button onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); mobileKey("arrowright", true); }} onPointerUp={() => mobileKey("arrowright", false)} onPointerCancel={() => mobileKey("arrowright", false)}>▶</button>
        </div>
        <button onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); mobileKey(" ", true); }} onPointerUp={() => mobileKey(" ", false)} onPointerCancel={() => mobileKey(" ", false)}>JUMP</button>
      </div>

      {mode !== "playing" && (
        <div style={{
          position: "absolute", inset: 0, display: "grid", placeItems: "center",
          background: "rgba(9,16,30,.62)", borderRadius: 18
        }}>
          <div style={{
            width: "min(380px, 88%)", padding: 30, borderRadius: 20,
            background: "#fff", color: "#172033", textAlign: "center",
            boxShadow: "0 20px 60px rgba(0,0,0,.3)"
          }}>
            <div style={{fontSize: 42, marginBottom: 8}}>{mode === "won" ? "🏁" : "💥"}</div>
            <h1 style={{margin: "0 0 8px"}}>{mode === "won" ? "Fase concluída!" : "Você perdeu"}</h1>
            <p style={{margin: "0 0 20px", color: "#596579"}}>
              {mode === "won"
                ? `Tempo: ${Math.floor(elapsed)}s · Mortes: ${deaths}`
                : `Mortes: ${deaths}`}
            </p>
            <button
              onClick={reset}
              style={{
                border: 0, borderRadius: 12, padding: "13px 24px",
                background: "#5b4bff", color: "#fff", fontWeight: 700, cursor: "pointer"
              }}
            >
              {mode === "won" ? "Jogar novamente" : "Tentar novamente"}
            </button>
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 700px) {
          .mobile-controls {
            display: flex !important;
            pointer-events: auto !important;
          }
          .mobile-controls button {
            width: 62px;
            height: 62px;
            border: 0;
            border-radius: 50%;
            background: rgba(17,24,39,.75);
            color: white;
            font-weight: 800;
            touch-action: none;
          }
          .mobile-controls button:last-child {
            width: 82px;
            border-radius: 18px;
          }
        }
      `}</style>
    </div>
  );
}