import { useId } from "react";

export function DotPattern({
  className = "",
  size = 22,
  radius = 1.1,
}: {
  className?: string;
  size?: number;
  radius?: number;
}) {
  const id = useId();
  return (
    <svg
      aria-hidden
      className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}
    >
      <defs>
        <pattern
          id={id}
          width={size}
          height={size}
          patternUnits="userSpaceOnUse"
          x={0}
          y={0}
        >
          <circle cx={size / 2} cy={size / 2} r={radius} fill="currentColor" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  );
}
