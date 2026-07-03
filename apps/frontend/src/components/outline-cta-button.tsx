import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useState, type ReactNode } from "react";

type OutlineCtaButtonProps = {
  href: string;
  children: ReactNode;
  className?: string;
};

const ease = [0.22, 1, 0.36, 1] as const;

export function OutlineCtaButton({ href, children, className = "" }: OutlineCtaButtonProps) {
  const reduceMotion = useReducedMotion();
  const [hovered, setHovered] = useState(false);

  const tFast = reduceMotion ? { duration: 0 } : { duration: 0.24, ease };
  const tSpring = reduceMotion
    ? { duration: 0 }
    : { type: "spring" as const, stiffness: 420, damping: 32, mass: 0.85 };

  return (
    <motion.a
      href={href}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      animate={{
        scale: hovered ? 1.03 : 1,
        backgroundColor: hovered ? "rgba(0,0,0,0)" : "#c8f542",
        borderColor: hovered ? "#c8f542" : "rgba(200,245,66,0)",
        color: hovered ? "#ffffff" : "#000000",
        paddingTop: hovered ? 14 : 8,
        paddingBottom: hovered ? 14 : 8,
        paddingLeft: hovered ? 28 : 24,
        paddingRight: hovered ? 28 : 8,
        gap: hovered ? 10 : 12,
      }}
      whileTap={reduceMotion ? undefined : { scale: 0.97 }}
      transition={tSpring}
      className={`relative inline-flex items-center rounded-full border-2 text-sm font-semibold ${className}`}
    >
      <span className="relative z-10">{children}</span>

      <motion.span
        className="relative z-10 h-10 shrink-0 overflow-hidden"
        animate={{ width: hovered ? 16 : 40 }}
        transition={
          reduceMotion
            ? { duration: 0 }
            : {
                width: {
                  duration: hovered ? 0.28 : 0.32,
                  delay: hovered ? 0.12 : 0,
                  ease,
                },
              }
        }
      >
        <motion.span
          className="absolute inset-y-0 left-0 grid w-10 place-items-center rounded-full bg-black text-white"
          animate={{
            opacity: hovered ? 0 : 1,
            scale: hovered ? 0.55 : 1,
          }}
          transition={tFast}
        >
          <ArrowRight className="size-4" strokeWidth={2.25} />
        </motion.span>

        <motion.span
          className="absolute inset-y-0 left-0 flex w-4 items-center justify-center text-white"
          animate={{
            opacity: hovered ? 1 : 0,
            x: hovered ? 0 : -6,
            scale: hovered ? 1 : 0.85,
          }}
          transition={
            reduceMotion ? { duration: 0 } : { ...tFast, delay: hovered ? 0.1 : 0 }
          }
        >
          <ArrowRight className="size-4" strokeWidth={2.25} aria-hidden />
        </motion.span>
      </motion.span>
    </motion.a>
  );
}
