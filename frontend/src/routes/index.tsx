import { createFileRoute, Link } from "@tanstack/react-router";
import { Shield, ArrowUpRight } from "lucide-react";
import { useEffect, useRef } from "react";

export const Route = createFileRoute("/")({
  component: LandingPage,
});

// ---------- Symbiote blob path builder ----------
type BlobCfg = {
  n: number;          // anchor count (more = spikier)
  baseR: number;      // base radius
  spikeAmp: number;   // high-freq edge spike amplitude
  morphAmp: number;   // low-freq overall morph amplitude
  speed: number;      // animation speed multiplier
};

type Phase = { phase: number; freq: number; amp: number; spikePhase: number };

function makePhases(n: number, morphAmp: number): Phase[] {
  return Array.from({ length: n }, (_, i) => ({
    phase: (i / n) * Math.PI * 2 + Math.random() * 2,
    freq: 0.3 + Math.random() * 0.5,
    amp: morphAmp * (0.6 + Math.random() * 0.6),
    spikePhase: Math.random() * Math.PI * 2,
  }));
}

type Tendril = { angle: number; strength: number; life: number; max: number };

function computeBlob(
  cx: number,
  cy: number,
  cfg: BlobCfg,
  phases: Phase[],
  tendrils: Tendril[],
  mx: number,
  my: number,
  t: number,
) {
  const { n, baseR, spikeAmp } = cfg;
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const p = phases[i];

    // base radius wobble (slow morph)
    const morph =
      Math.sin(t * p.freq * cfg.speed + p.phase) * p.amp +
      Math.sin(t * p.freq * cfg.speed * 1.7 + p.phase * 2) * (p.amp * 0.45);

    // high-frequency spikes along the edge
    const spike =
      Math.sin(t * 2.2 * cfg.speed + a * 6 + p.spikePhase) * spikeAmp * 0.5 +
      Math.sin(t * 3.1 * cfg.speed + a * 11 + p.spikePhase * 2) * spikeAmp * 0.5;

    let r = baseR + morph + spike;

    // tendril shoots — push a localized arc outward
    for (const td of tendrils) {
      let da = a - td.angle;
      while (da > Math.PI) da -= Math.PI * 2;
      while (da < -Math.PI) da += Math.PI * 2;
      const falloff = Math.exp(-(da * da) / 0.06);
      r += td.strength * falloff;
    }

    let x = cx + Math.cos(a) * r;
    let y = cy + Math.sin(a) * r;

    // cursor displacement — symbiote recoils/reaches toward cursor
    if (mx > -9000) {
      const dx = x - mx;
      const dy = y - my;
      const d = Math.sqrt(dx * dx + dy * dy);
      const range = 280;
      if (d < range) {
        // half the points get attracted (reach toward), half pushed (recoil)
        const reach = i % 2 === 0 ? -1 : 1;
        const f = (1 - d / range) ** 2 * 80 * reach;
        x += (dx / (d || 1)) * f;
        y += (dy / (d || 1)) * f;
      }
    }

    pts.push({ x, y });
  }

  // Catmull-Rom -> cubic Bezier, closed
  const tension = 0.32;
  let d = "";
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];
    if (i === 0) d += `M ${p1.x.toFixed(2)} ${p1.y.toFixed(2)} `;
    const c1x = p1.x + (p2.x - p0.x) * tension;
    const c1y = p1.y + (p2.y - p0.y) * tension;
    const c2x = p2.x - (p3.x - p1.x) * tension;
    const c2y = p2.y - (p3.y - p1.y) * tension;
    d += `C ${c1x.toFixed(2)} ${c1y.toFixed(2)}, ${c2x.toFixed(2)} ${c2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)} `;
  }
  d += "Z";
  return d;
}

function LandingPage() {
  const bigPath = useRef<SVGPathElement>(null);
  const smallPath = useRef<SVGPathElement>(null);
  const tendrilPath = useRef<SVGPathElement>(null);
  const bigShine = useRef<SVGEllipseElement>(null);
  const smallShine = useRef<SVGEllipseElement>(null);
  const svgWrap = useRef<HTMLDivElement>(null);
  const mouse = useRef({ x: -9999, y: -9999, inside: false });

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      mouse.current.x = e.clientX;
      mouse.current.y = e.clientY;
      mouse.current.inside = true;
    };
    window.addEventListener("mousemove", onMove);

    // ---- viewBox coords: 1600 x 1000 ----
    const VB_W = 1600;
    const VB_H = 1000;

    const bigCfg: BlobCfg  = { n: 28, baseR: 180, spikeAmp: 14, morphAmp: 36, speed: 1.0 };
    const smallCfg: BlobCfg = { n: 22, baseR: 78,  spikeAmp: 9,  morphAmp: 20, speed: 1.4 };

    const bigPhases   = makePhases(bigCfg.n,   bigCfg.morphAmp);
    const smallPhases = makePhases(smallCfg.n, smallCfg.morphAmp);

    const bigTendrils: Tendril[]   = [];
    const smallTendrils: Tendril[] = [];

    // organic drift state for each blob
    const big   = { x: VB_W * 0.55, y: VB_H * 0.5, vx: 0, vy: 0 };
    const small = { x: VB_W * 0.25, y: VB_H * 0.65, vx: 0, vy: 0 };

    let raf = 0;
    let lastTendrilCheck = 0;
    let lastConnect = 0;

    const tick = () => {
      const t = performance.now() / 1000;

      // ----- organic drift (Perlin-ish via sin sums) -----
      big.x = VB_W * 0.55 + Math.sin(t * 0.13) * 220 + Math.sin(t * 0.07 + 1.4) * 140;
      big.y = VB_H * 0.5  + Math.cos(t * 0.11) * 140 + Math.sin(t * 0.06 + 0.7) * 100;
      small.x = VB_W * 0.3 + Math.sin(t * 0.19 + 2) * 280 + Math.cos(t * 0.09) * 160;
      small.y = VB_H * 0.6 + Math.cos(t * 0.17 + 1) * 180 + Math.sin(t * 0.1 + 0.3) * 110;

      // ----- occasional tendril shoots -----
      if (t - lastTendrilCheck > 0.6) {
        lastTendrilCheck = t;
        if (Math.random() < 0.35) {
          bigTendrils.push({
            angle: Math.random() * Math.PI * 2,
            strength: 0,
            life: 0,
            max: 140 + Math.random() * 120,
          });
        }
        if (Math.random() < 0.45) {
          smallTendrils.push({
            angle: Math.random() * Math.PI * 2,
            strength: 0,
            life: 0,
            max: 70 + Math.random() * 60,
          });
        }
      }

      // animate tendrils: ramp up then retract
      const updateTendrils = (arr: Tendril[]) => {
        for (let i = arr.length - 1; i >= 0; i--) {
          const td = arr[i];
          td.life += 1 / 60;
          // bell curve over ~2.5s
          const phase = Math.min(1, td.life / 2.5);
          td.strength = Math.sin(phase * Math.PI) * td.max;
          if (td.life > 2.5) arr.splice(i, 1);
        }
      };
      updateTendrils(bigTendrils);
      updateTendrils(smallTendrils);

      // mouse in viewBox coords
      const rect = svgWrap.current?.getBoundingClientRect();
      let mx = -9999, my = -9999;
      if (rect && mouse.current.inside) {
        mx = ((mouse.current.x - rect.left) / rect.width) * VB_W;
        my = ((mouse.current.y - rect.top) / rect.height) * VB_H;
      }

      const bigD = computeBlob(big.x, big.y, bigCfg, bigPhases, bigTendrils, mx, my, t);
      const smallD = computeBlob(small.x, small.y, smallCfg, smallPhases, smallTendrils, mx, my, t);
      bigPath.current?.setAttribute("d", bigD);
      smallPath.current?.setAttribute("d", smallD);

      // shine highlights move with each blob
      if (bigShine.current) {
        bigShine.current.setAttribute("cx", (big.x - 40 + Math.sin(t * 0.4) * 18).toFixed(1));
        bigShine.current.setAttribute("cy", (big.y - 110 + Math.cos(t * 0.5) * 12).toFixed(1));
      }
      if (smallShine.current) {
        smallShine.current.setAttribute("cx", (small.x - 20 + Math.sin(t * 0.6) * 10).toFixed(1));
        smallShine.current.setAttribute("cy", (small.y - 50 + Math.cos(t * 0.7) * 8).toFixed(1));
      }

      // ----- tendril connection when blobs are close -----
      const dx = big.x - small.x;
      const dy = big.y - small.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const CONNECT_RANGE = 380;
      if (tendrilPath.current) {
        if (dist < CONNECT_RANGE) {
          // brief tendril, life-based
          if (t - lastConnect > 1.2) lastConnect = t;
          const localT = Math.min(1, (t - lastConnect) / 0.9);
          const alpha = Math.sin(localT * Math.PI) * (1 - dist / CONNECT_RANGE);

          // wobbly midpoint
          const mx2 = (big.x + small.x) / 2 + Math.sin(t * 4) * 30;
          const my2 = (big.y + small.y) / 2 + Math.cos(t * 3.3) * 30;
          const d =
            `M ${big.x.toFixed(1)} ${big.y.toFixed(1)} ` +
            `Q ${mx2.toFixed(1)} ${my2.toFixed(1)}, ${small.x.toFixed(1)} ${small.y.toFixed(1)}`;
          tendrilPath.current.setAttribute("d", d);
          tendrilPath.current.setAttribute("opacity", (alpha * 0.7).toFixed(3));
          tendrilPath.current.setAttribute(
            "stroke-width",
            (3 + Math.sin(t * 6) * 1.5).toFixed(2),
          );
        } else {
          tendrilPath.current.setAttribute("opacity", "0");
        }
      }

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      {/* subtle grid + radial wash */}
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-40" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(255,255,255,0.04),transparent_55%)]" />

      {/* ============ Symbiote blobs (background layer) ============ */}
      <div
        ref={svgWrap}
        className="pointer-events-none absolute inset-0 z-0"
        aria-hidden
      >
        <svg
          viewBox="0 0 1600 1000"
          preserveAspectRatio="xMidYMid slice"
          className="h-full w-full"
        >
          <defs>
            <radialGradient id="symbiote-fill" cx="40%" cy="35%" r="75%">
              <stop offset="0%"   stopColor="#3b0a55" stopOpacity="0.95" />
              <stop offset="45%"  stopColor="#1a0030" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#0a0010" stopOpacity="1" />
            </radialGradient>
            <radialGradient id="symbiote-rim" cx="50%" cy="50%" r="50%">
              <stop offset="80%" stopColor="#1a0030" stopOpacity="0" />
              <stop offset="100%" stopColor="#5b1e8c" stopOpacity="0.4" />
            </radialGradient>
            {/* very subtle organic noise displacement for that wet/uneven look */}
            <filter id="symbiote-warp" x="-15%" y="-15%" width="130%" height="130%">
              <feTurbulence type="fractalNoise" baseFrequency="0.012 0.018" numOctaves="2" seed="7">
                <animate attributeName="seed" values="1;30;1" dur="22s" repeatCount="indefinite" />
              </feTurbulence>
              <feDisplacementMap in="SourceGraphic" scale="14" />
            </filter>
            <radialGradient id="shine-grad" cx="50%" cy="50%" r="50%">
              <stop offset="0%"  stopColor="#ffffff" stopOpacity="0.6" />
              <stop offset="60%" stopColor="#ffffff" stopOpacity="0.1" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* connecting tendril (drawn under blobs) */}
          <path
            ref={tendrilPath}
            fill="none"
            stroke="#1a0030"
            strokeWidth="3"
            strokeLinecap="round"
            opacity="0"
          />

          {/* big blob group */}
          <g filter="url(#symbiote-warp)" opacity="0.55">
            <path ref={bigPath} fill="url(#symbiote-fill)" />
          </g>
          {/* shine highlight on big blob */}
          <ellipse
            ref={bigShine}
            cx="800"
            cy="380"
            rx="90"
            ry="36"
            fill="url(#shine-grad)"
            opacity="0.35"
          />

          {/* small blob group */}
          <g filter="url(#symbiote-warp)" opacity="0.5">
            <path ref={smallPath} fill="url(#symbiote-fill)" />
          </g>
          <ellipse
            ref={smallShine}
            cx="400"
            cy="600"
            rx="42"
            ry="16"
            fill="url(#shine-grad)"
            opacity="0.3"
          />
        </svg>
      </div>

      {/* ============ Foreground content ============ */}
      <header className="relative z-10 px-8 pt-7">
        <div className="mx-auto flex max-w-[1400px] items-center">
          <Link to="/" className="flex items-center gap-2.5 text-lg font-medium tracking-tight">
            <Shield className="size-5 text-accent-purple" />
            Leash
          </Link>

          <nav className="mx-auto hidden items-center gap-10 text-sm text-muted-foreground md:flex">
            <Link to="/experiments" className="transition-colors hover:text-foreground">Experiments</Link>
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <button className="rounded-full bg-surface-elevated px-5 py-2.5 text-sm ring-1 ring-white/5 hover:bg-surface">
              Docs
            </button>
            <Link
              to="/experiments"
              className="rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-transform hover:scale-[1.03]"
            >
              Launch
            </Link>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto flex max-w-[1400px] flex-col items-center px-6 pt-24 text-center">
        <h1 className="anim-fade-up text-[clamp(48px,8vw,112px)] font-semibold leading-[0.95] tracking-tight">
          Watching Agents,
          <br />
          <span className="text-foreground">Helping Humans</span>
        </h1>

        <p
          className="anim-fade-up mt-8 max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg"
          style={{ animationDelay: "100ms" }}
        >
          A safety and comprehension firewall that catches what your AI agent
          missed — and what you almost approved.
        </p>

        <Link
          to="/experiments"
          className="anim-fade-up mt-10 inline-flex items-center gap-2 rounded-full bg-foreground px-8 py-3.5 text-sm font-medium text-background transition-transform hover:scale-[1.04]"
          style={{ animationDelay: "180ms" }}
        >
          Open Experiments
        </Link>

        <div className="pointer-events-none absolute inset-x-0 top-[520px] mx-auto max-w-[1100px]">
          <FloatCard
            className="absolute right-6 top-40 md:right-16 md:top-56"
            label="Block Accuracy"
            value="96%"
            withBar
            delay={340}
          />
        </div>
      </main>

      <footer className="relative z-10 mt-auto px-8 pb-6">
        <div className="mono mx-auto flex max-w-[1400px] items-center justify-between text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
          <span>​</span>
          <span>​</span>
        </div>
      </footer>
    </div>
  );
}

function FloatCard({
  className,
  label,
  title,
  value,
  withBar,
  delay = 0,
}: {
  className?: string;
  label: string;
  title?: string;
  value: string;
  withBar?: boolean;
  delay?: number;
}) {
  return (
    <div
      className={`anim-fade-up pointer-events-auto w-[260px] rounded-2xl bg-surface-elevated/70 p-5 ring-1 ring-white/10 backdrop-blur-md ${className ?? ""}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="grid size-7 place-items-center rounded-full bg-foreground text-background">
          <ArrowUpRight className="size-3.5" />
        </span>
      </div>
      {title && (
        <div className="mt-6 flex items-end justify-between gap-3">
          <div className="text-base font-medium leading-tight">{title}</div>
          <div className="text-sm text-muted-foreground">{value}</div>
        </div>
      )}
      {!title && <div className="mt-6 text-3xl font-semibold tabular-nums">{value}</div>}
      {withBar && (
        <div className="mt-4 h-[2px] w-full overflow-hidden rounded-full bg-white/10">
          <div className="h-full w-[96%] bg-foreground" />
        </div>
      )}
    </div>
  );
}
