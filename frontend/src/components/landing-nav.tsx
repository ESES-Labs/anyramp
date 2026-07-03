import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { StellarIcon } from "@/components/stellar-icon";

const SCROLL_THRESHOLD = 56;

const spring = { type: "spring" as const, stiffness: 420, damping: 34, mass: 0.85 };
const springSnappy = { type: "spring" as const, stiffness: 520, damping: 38, mass: 0.75 };

const navLinks = [
  { href: "#how", label: "How" },
  { href: "#flow", label: "Flow" },
  { href: "#partners", label: "Ecosystem" },
];

export function LandingNav() {
  const [compact, setCompact] = useState(false);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        setCompact(window.scrollY > SCROLL_THRESHOLD);
        ticking = false;
      });
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const tSnappy = reduceMotion ? { duration: 0 } : springSnappy;

  return (
    <motion.div
      className="pointer-events-none fixed inset-x-0 z-50 flex justify-center"
      animate={{
        top: compact ? 14 : 0,
        paddingLeft: compact ? 12 : 0,
        paddingRight: compact ? 12 : 0,
        scale: compact ? [0.94, 1.02, 1] : [0.99, 1],
      }}
      transition={
        reduceMotion
          ? { duration: 0 }
          : {
              top: spring,
              paddingLeft: spring,
              paddingRight: spring,
              scale: { duration: 0.45, ease: [0.34, 1.45, 0.64, 1] },
            }
      }
    >
      <motion.header
        layout
        className="pointer-events-auto relative flex w-full items-center justify-between overflow-hidden text-white"
        initial={false}
        variants={{
          expanded: {
            maxWidth: 2000,
            borderRadius: 0,
            paddingTop: 14,
            paddingBottom: 14,
            paddingLeft: 20,
            paddingRight: 20,
            backgroundColor: "rgba(0,0,0,0.6)",
            boxShadow: "0 0 0 rgba(0,0,0,0)",
            scale: 1,
            y: 0,
          },
          compact: {
            maxWidth: 560,
            borderRadius: 9999,
            paddingTop: 9,
            paddingBottom: 9,
            paddingLeft: 14,
            paddingRight: 14,
            backgroundColor: "rgba(0,0,0,0.88)",
            boxShadow: "0 14px 44px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.1)",
            scale: 1,
            y: 0,
          },
        }}
        animate={compact ? "compact" : "expanded"}
        transition={
          reduceMotion
            ? { duration: 0 }
            : {
                ...spring,
                scale: { type: "spring", stiffness: 560, damping: 26, mass: 0.7 },
              }
        }
        style={{ backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)" }}
      >
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-px origin-center bg-white/10"
          animate={{
            opacity: compact ? 0 : 1,
            scaleX: compact ? 0.4 : 1,
          }}
          transition={tSnappy}
        />

        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-[inherit] ring-1 ring-inset ring-white/10"
          animate={{ opacity: compact ? 1 : 0 }}
          transition={tSnappy}
        />

        <Link to="/" className="relative z-10 flex min-w-0 items-center gap-2">
          <motion.span
            className="grid place-items-center rounded-full bg-white"
            animate={{
              width: compact ? 32 : 28,
              height: compact ? 32 : 28,
              rotate: compact ? 0 : 0,
            }}
            transition={tSnappy}
          >
            <motion.span
              animate={{ scale: compact ? 1.05 : 1 }}
              transition={tSnappy}
            >
              <StellarIcon className={`text-black ${compact ? "size-4" : "size-3.5"}`} />
            </motion.span>
          </motion.span>
          <motion.span
            className="truncate font-semibold tracking-tight"
            animate={{
              fontSize: compact ? "0.9375rem" : "1.125rem",
              opacity: 1,
              x: compact ? 0 : 0,
            }}
            transition={tSnappy}
          >
            Anyramp
          </motion.span>
        </Link>

        <motion.nav
          className="relative z-10 hidden items-center text-white/60 sm:flex"
          animate={{
            gap: compact ? 16 : 28,
            scale: compact ? 0.96 : 1,
            opacity: compact ? 0.9 : 1,
          }}
          transition={tSnappy}
        >
          {navLinks.map((link, i) => (
            <motion.a
              key={link.href}
              href={link.href}
              className="transition-colors hover:text-white"
              animate={{
                fontSize: compact ? "0.75rem" : "0.875rem",
                y: compact ? 0 : 0,
                opacity: 1,
              }}
              transition={{
                ...tSnappy,
                delay: reduceMotion ? 0 : compact ? i * 0.03 : (navLinks.length - 1 - i) * 0.02,
              }}
            >
              {link.label}
            </motion.a>
          ))}
        </motion.nav>

        <motion.a
          href="/app"
          className="group relative z-10 inline-flex shrink-0 items-center rounded-full bg-[#c8f542] font-semibold text-black"
          animate={{
            paddingTop: compact ? 6 : 8,
            paddingBottom: compact ? 6 : 8,
            paddingLeft: compact ? 12 : 16,
            paddingRight: compact ? 12 : 16,
            fontSize: compact ? "0.6875rem" : "0.75rem",
            gap: compact ? 4 : 6,
            scale: 1,
          }}
          whileHover={reduceMotion ? undefined : { scale: 1.04 }}
          whileTap={reduceMotion ? undefined : { scale: 0.96 }}
          transition={tSnappy}
        >
          <motion.span
            key={compact ? "compact-label" : "full-label"}
            initial={reduceMotion ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={tSnappy}
            className={compact ? "hidden min-[420px]:inline" : ""}
          >
            Open app
          </motion.span>
          <motion.span
            key={compact ? "short-label" : "hidden-short"}
            initial={reduceMotion ? false : { opacity: 0, scale: 0.8 }}
            animate={{ opacity: compact ? 1 : 0, scale: compact ? 1 : 0.8 }}
            transition={tSnappy}
            className={compact ? "min-[420px]:hidden" : "hidden"}
          >
            App
          </motion.span>
          <motion.span
            animate={{ x: 0 }}
            whileHover={reduceMotion ? undefined : { x: 2 }}
            transition={tSnappy}
          >
            <ArrowRight className={compact ? "size-3" : "size-3.5"} />
          </motion.span>
        </motion.a>
      </motion.header>
    </motion.div>
  );
}
