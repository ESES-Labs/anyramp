import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";

type Connection = {
  from: RefObject<HTMLElement | null>;
  to: RefObject<HTMLElement | null>;
  curvature?: number;
  reverse?: boolean;
  delay?: number;
};

type Path = {
  d: string;
  key: string;
  reverse: boolean;
  delay: number;
};

/**
 * Animated SVG beams connecting refs inside a container.
 * Mobile-friendly: ResizeObserver re-measures on layout changes.
 */
export function AnimatedBeams({
  containerRef,
  connections,
}: {
  containerRef: RefObject<HTMLElement | null>;
  connections: Connection[];
}) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [paths, setPaths] = useState<Path[]>([]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const measure = () => {
      const cRect = container.getBoundingClientRect();
      setSize({ w: cRect.width, h: cRect.height });

      const next: Path[] = [];
      connections.forEach((c, i) => {
        const a = c.from.current;
        const b = c.to.current;
        if (!a || !b) return;
        const ar = a.getBoundingClientRect();
        const br = b.getBoundingClientRect();
        const x1 = ar.left + ar.width / 2 - cRect.left;
        const y1 = ar.top + ar.height / 2 - cRect.top;
        const x2 = br.left + br.width / 2 - cRect.left;
        const y2 = br.top + br.height / 2 - cRect.top;
        const curvature = c.curvature ?? 0;
        const mx = (x1 + x2) / 2;
        const my = (y1 + y2) / 2 - curvature;
        next.push({
          d: `M ${x1},${y1} Q ${mx},${my} ${x2},${y2}`,
          key: `${i}`,
          reverse: !!c.reverse,
          delay: c.delay ?? 0,
        });
      });
      setPaths(next);
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(container);
    window.addEventListener("resize", measure);
    const t = setTimeout(measure, 100);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
      clearTimeout(t);
    };
  }, [containerRef, connections]);

  return (
    <svg
      className="pointer-events-none absolute inset-0"
      width={size.w}
      height={size.h}
      viewBox={`0 0 ${size.w} ${size.h}`}
      fill="none"
    >
      <defs>
        <linearGradient id="beam-grad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0" />
          <stop offset="50%" stopColor="var(--color-accent)" stopOpacity="1" />
          <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {paths.map((p) => (
        <g key={p.key}>
          <path
            d={p.d}
            stroke="currentColor"
            strokeOpacity="0.12"
            strokeWidth="1.2"
            strokeLinecap="round"
            className="text-foreground"
          />
          <path
            d={p.d}
            stroke="url(#beam-grad)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray="60 600"
            style={{
              animation: `beam-dash 3.4s ${p.delay}s linear infinite`,
              animationDirection: p.reverse ? "reverse" : "normal",
            }}
          />
        </g>
      ))}
    </svg>
  );
}

export function BeamNode({
  innerRef,
  children,
  className = "",
  label,
}: {
  innerRef: RefObject<HTMLDivElement | null>;
  children: ReactNode;
  className?: string;
  label?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div
        ref={innerRef}
        className={`relative z-10 grid place-items-center rounded-2xl bg-surface ring-1 ring-black/5 shadow-quiet ${className}`}
      >
        {children}
      </div>
      {label ? (
        <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
          {label}
        </span>
      ) : null}
    </div>
  );
}
