import type { ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";

type NavItem = {
  to: "/" | "/history" | "/security" | "/settings";
  label: string;
  icon: ReactNode;
};

const items: NavItem[] = [
  {
    to: "/",
    label: "Home",
    icon: (
      <svg className="size-5" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
        <path d="M8.72 1.45a.75.75 0 0 0-1.44 0L1.3 10.8a.75.75 0 0 0 .72 1h1.23a.75.75 0 0 0 .75-.75V15h8v-3.95a.75.75 0 0 0 .75-.75h1.23a.75.75 0 0 0 .72-1L8.72 1.45Z" />
      </svg>
    ),
  },
  {
    to: "/history",
    label: "History",
    icon: (
      <svg className="size-5" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
        <path
          fillRule="evenodd"
          d="M2 4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V4Zm2-1h8a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z"
          clipRule="evenodd"
        />
        <path d="M5 5.75A.75.75 0 0 1 5.75 5h4.5a.75.75 0 0 1 0 1.5h-4.5A.75.75 0 0 1 5 5.75ZM5 8a.75.75 0 0 1 .75-.75h4.5a.75.75 0 0 1 0 1.5h-4.5A.75.75 0 0 1 5 8ZM5 10.25a.75.75 0 0 1 .75-.75h2.5a.75.75 0 0 1 0 1.5h-2.5a.75.75 0 0 1-.75-.75Z" />
      </svg>
    ),
  },
  {
    to: "/security",
    label: "Security",
    icon: (
      <svg className="size-5" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
        <path d="M8 1.2c-1.6.9-3.3 1.4-5 1.5v5.4c0 3 2 5.4 5 6.7 3-1.3 5-3.7 5-6.7V2.7c-1.7-.1-3.4-.6-5-1.5Z" />
      </svg>
    ),
  },
  {
    to: "/settings",
    label: "Settings",
    icon: (
      <svg className="size-5" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
        <path
          fillRule="evenodd"
          d="M7.07 1.5a.9.9 0 0 1 1.86 0l.15.6c.07.27.27.5.54.6l.58.22a.9.9 0 0 1 .47 1.34l-.32.53a.9.9 0 0 0 0 .94l.32.53a.9.9 0 0 1-.47 1.34l-.58.22a.9.9 0 0 0-.54.6l-.15.6a.9.9 0 0 1-1.86 0l-.15-.6a.9.9 0 0 0-.54-.6l-.58-.22a.9.9 0 0 1-.47-1.34l.32-.53a.9.9 0 0 0 0-.94l-.32-.53a.9.9 0 0 1 .47-1.34l.58-.22a.9.9 0 0 0 .54-.6l.15-.6ZM8 9.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"
          clipRule="evenodd"
        />
      </svg>
    ),
  },
];

export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 mx-auto flex max-w-[480px] items-center justify-between border-t border-zinc-950/5 bg-surface/85 px-6 py-3 backdrop-blur-xl"
      style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
    >
      {items.map((item) => {
        const active = pathname === item.to;
        return (
          <Link
            key={item.to}
            to={item.to}
            className={`flex flex-1 flex-col items-center gap-1 transition-colors ${
              active ? "text-foreground" : "text-muted-foreground"
            }`}
          >
            {item.icon}
            <span className="text-[10px] font-semibold tracking-wide">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
