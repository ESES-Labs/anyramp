import { motion } from "framer-motion";

export function AnyrampLogo({ size = 168 }: { size?: number }) {
  return (
    <motion.div
      className="relative"
      style={{ width: size, height: size }}
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.9, ease: [0.22, 0.61, 0.36, 1] }}
    >
      {/* Soft halo */}
      <motion.div
        className="absolute inset-0 rounded-full blur-2xl"
        style={{
          background:
            "radial-gradient(closest-side, color-mix(in oklab, var(--color-accent) 45%, transparent), transparent 70%)",
        }}
        animate={{ scale: [1, 1.08, 1], opacity: [0.55, 0.85, 0.55] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Rotating dashed ring */}
      <motion.div
        className="absolute inset-2 rounded-full"
        style={{
          background:
            "conic-gradient(from 0deg, transparent 0deg, transparent 270deg, color-mix(in oklab, var(--color-accent) 90%, transparent) 320deg, transparent 360deg)",
          WebkitMask:
            "radial-gradient(circle, transparent 58%, #000 59%, #000 64%, transparent 65%)",
          mask: "radial-gradient(circle, transparent 58%, #000 59%, #000 64%, transparent 65%)",
        }}
        animate={{ rotate: 360 }}
        transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
      />

      {/* Outer thin ring */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          boxShadow:
            "inset 0 0 0 1px color-mix(in oklab, var(--color-foreground) 8%, transparent)",
        }}
      />

      {/* Inner diamond */}
      <div className="absolute inset-0 grid place-items-center">
        <motion.div
          className="grid size-[44%] place-items-center rounded-[28%] bg-foreground shadow-[0_18px_40px_-18px_rgba(15,23,42,0.55)]"
          animate={{ rotate: [0, 8, 0, -8, 0] }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
        >
          <motion.span
            className="size-[36%] rotate-45 rounded-[18%] bg-background"
            animate={{ scale: [1, 0.85, 1] }}
            transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
          />
        </motion.div>
      </div>

      {/* Orbiting dots */}
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="absolute inset-0"
          animate={{ rotate: 360 }}
          transition={{
            duration: 10 + i * 4,
            repeat: Infinity,
            ease: "linear",
            delay: i * 0.4,
          }}
        >
          <span
            className="absolute left-1/2 size-1.5 -translate-x-1/2 rounded-full"
            style={{
              top: `${6 + i * 4}%`,
              background:
                i === 0
                  ? "var(--color-foreground)"
                  : "color-mix(in oklab, var(--color-accent) 80%, transparent)",
              boxShadow:
                "0 0 12px color-mix(in oklab, var(--color-accent) 60%, transparent)",
            }}
          />
        </motion.div>
      ))}
    </motion.div>
  );
}
