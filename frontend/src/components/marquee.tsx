import { type ReactNode } from "react";

/**
 * Infinite, pause-on-hover marquee.
 * Renders children twice for a seamless -50% translate loop.
 */
export function Marquee({
  children,
  speed = 38,
  reverse = false,
  className = "",
}: {
  children: ReactNode;
  speed?: number; // seconds per loop
  reverse?: boolean;
  className?: string;
}) {
  return (
    <div className={`group relative flex overflow-hidden ${className}`}>
      <div
        className="flex shrink-0 items-center gap-12 pr-12"
        style={{
          animation: `marquee-scroll ${speed}s linear infinite`,
          animationDirection: reverse ? "reverse" : "normal",
          animationPlayState: "running",
        }}
      >
        {children}
      </div>
      <div
        aria-hidden
        className="flex shrink-0 items-center gap-12 pr-12"
        style={{
          animation: `marquee-scroll ${speed}s linear infinite`,
          animationDirection: reverse ? "reverse" : "normal",
        }}
      >
        {children}
      </div>
    </div>
  );
}
