import { PrivyProvider } from "@privy-io/react-auth";
import type { ReactNode } from "react";

const PRIVY_APP_ID = import.meta.env.VITE_PRIVY_APP_ID?.trim() ?? "";

export function isPrivyEnabled() {
  return PRIVY_APP_ID.length > 0;
}

export function PrivyRoot({ children }: { children: ReactNode }) {
  if (!isPrivyEnabled()) {
    return children;
  }

  return (
    <PrivyProvider
      appId={PRIVY_APP_ID}
      config={{
        loginMethods: ["passkey", "email"],
        loginMethodsAndOrder: {
          primary: ["passkey", "email"],
        },
        appearance: {
          theme: "light",
          accentColor: "#1a1f2e",
          logo: undefined,
        },
        embeddedWallets: {
          showWalletUIs: false,
        },
        passkeys: {
          registration: {
            hints: ["client-device"],
          },
        },
      }}
    >
      {children}
    </PrivyProvider>
  );
}
