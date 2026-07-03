import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState, type ReactNode } from "react";

const SCREEN_W = 393;
const SCREEN_H = 852;

type IphoneMockProps = {
  src?: string;
  alt?: string;
  imageSrc?: string;
  children?: ReactNode;
  className?: string;
  darkStatusBar?: boolean;
};

function IframeScreen({ src }: { src: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const update = () => setScale(el.clientWidth / SCREEN_W);
    update();

    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="relative aspect-[393/852] w-full overflow-hidden bg-background">
      <iframe
        src={src}
        title="Anyramp app preview"
        className="pointer-events-none absolute left-0 top-0 border-0"
        style={{
          width: SCREEN_W,
          height: SCREEN_H,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
        }}
        tabIndex={-1}
        loading="eager"
      />
    </div>
  );
}

function StatusBar({ dark = false }: { dark?: boolean }) {
  const tone = dark ? "text-white" : "text-black/85";

  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-between px-7 pt-3.5 text-[11px] font-semibold tracking-tight ${tone}`}
    >
      <span>9:41</span>
      <div className="flex items-center gap-1.5">
        <svg viewBox="0 0 18 12" className="h-3 w-[18px]" fill="currentColor">
          <rect x="0" y="7" width="3" height="5" rx="0.75" opacity="0.35" />
          <rect x="5" y="5" width="3" height="7" rx="0.75" opacity="0.55" />
          <rect x="10" y="3" width="3" height="9" rx="0.75" opacity="0.75" />
          <rect x="15" y="0" width="3" height="12" rx="0.75" />
        </svg>
        <svg viewBox="0 0 16 12" className="h-3 w-4" fill="currentColor">
          <path d="M8 2.4C10.2 2.4 12.2 3.3 13.7 4.8L15.1 3.4C13.2 1.5 10.7 0.4 8 0.4C5.3 0.4 2.8 1.5 0.9 3.4L2.3 4.8C3.8 3.3 5.8 2.4 8 2.4ZM8 6.4C9.4 6.4 10.7 6.9 11.6 7.8L13 6.4C11.6 5 9.9 4.2 8 4.2C6.1 4.2 4.4 5 3 6.4L4.4 7.8C5.3 6.9 6.6 6.4 8 6.4ZM8 10.4C8.8 10.4 9.5 10.7 10.1 11.3L8 13.4L5.9 11.3C6.5 10.7 7.2 10.4 8 10.4Z" />
        </svg>
        <svg viewBox="0 0 27 13" className="h-3 w-[27px]" fill="none">
          <rect x="0.5" y="0.5" width="22" height="12" rx="3.5" stroke="currentColor" strokeOpacity="0.35" />
          <rect x="2" y="2" width="17" height="9" rx="2.5" fill="currentColor" />
          <path
            d="M24 4.5V8.5C25.1 8 26 7 26 6C26 5 25.1 4 24 4.5Z"
            fill="currentColor"
            fillOpacity="0.4"
          />
        </svg>
      </div>
    </div>
  );
}

export function IphoneMock({
  src = "/app",
  alt = "Anyramp app preview",
  imageSrc,
  children,
  className = "",
  darkStatusBar = false,
}: IphoneMockProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className={`relative mx-auto w-full max-w-[300px] sm:max-w-[320px] ${className}`}
      style={{ perspective: 1400 }}
      whileHover={
        reduceMotion
          ? undefined
          : {
              y: -8,
              rotateX: 4,
              rotateY: -6,
              scale: 1.02,
            }
      }
      transition={{ type: "spring", stiffness: 280, damping: 26, mass: 0.9 }}
    >
      {/* Side buttons */}
      <span
        aria-hidden
        className="absolute -left-[2px] top-[22%] h-7 w-[3px] rounded-l-sm bg-gradient-to-b from-[#d4d4d8] to-[#a1a1aa]"
      />
      <span
        aria-hidden
        className="absolute -left-[2px] top-[30%] h-12 w-[3px] rounded-l-sm bg-gradient-to-b from-[#d4d4d8] to-[#a1a1aa]"
      />
      <span
        aria-hidden
        className="absolute -left-[2px] top-[40%] h-12 w-[3px] rounded-l-sm bg-gradient-to-b from-[#d4d4d8] to-[#a1a1aa]"
      />
      <span
        aria-hidden
        className="absolute -right-[2px] top-[34%] h-16 w-[3px] rounded-r-sm bg-gradient-to-b from-[#d4d4d8] to-[#a1a1aa]"
      />

      {/* Titanium outer shell */}
      <div className="relative rounded-[3.25rem] bg-gradient-to-b from-[#ececee] via-[#d1d1d6] to-[#b4b4bb] p-[2.5px] shadow-[0_50px_100px_-24px_rgba(0,0,0,0.75),0_0_0_1px_rgba(255,255,255,0.2)_inset,0_1px_0_rgba(255,255,255,0.35)_inset]">
        {/* Inner bezel */}
        <div className="rounded-[3.1rem] bg-[#1c1c1e] p-[10px]">
          {/* Screen */}
          <div className="relative overflow-hidden rounded-[2.45rem] bg-black ring-1 ring-black/80">
            {imageSrc ? (
              <img
                src={imageSrc}
                alt={alt}
                className="aspect-[393/852] w-full object-cover object-top"
                width={SCREEN_W}
                height={SCREEN_H}
                loading="eager"
                decoding="async"
              />
            ) : children ? (
              children
            ) : (
              <IframeScreen src={src} />
            )}

            <StatusBar dark={darkStatusBar} />

            {/* Dynamic Island */}
            <div
              aria-hidden
              className="pointer-events-none absolute left-1/2 top-3 z-30 h-[26px] w-[92px] -translate-x-1/2 rounded-full bg-black shadow-[0_0_0_1px_rgba(255,255,255,0.06)_inset,0_2px_8px_rgba(0,0,0,0.45)]"
            />

            {/* Home indicator */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 bottom-2 z-20 flex justify-center"
            >
              <div className="h-[4px] w-[108px] rounded-full bg-white/90" />
            </div>

            {/* Screen glare */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-br from-white/[0.07] via-transparent to-transparent"
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
