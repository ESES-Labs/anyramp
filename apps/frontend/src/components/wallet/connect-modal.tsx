import { createContext, useContext, useState, type ReactNode } from "react";
import { Sheet } from "@/components/sheet";
import { useWallet } from "./wallet-provider";

const ConnectContext = createContext<{ open: () => void } | null>(null);

export function useConnectModal() {
  const ctx = useContext(ConnectContext);
  if (!ctx) throw new Error("useConnectModal must be used within ConnectModalProvider");
  return ctx;
}

export function ConnectModalProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const wallet = useWallet();

  const close = () => setOpen(false);

  const run = async (action: () => Promise<void>) => {
    await action();
    if (!wallet.error) close();
  };

  return (
    <ConnectContext.Provider value={{ open: () => setOpen(true) }}>
      {children}
      <Sheet open={open} onClose={close} title="Connect a wallet">
        <p className="mb-4 text-sm text-muted-foreground">
          Sign in with email or passkey to create a Stellar wallet, or connect Freighter / xBull.
          Your wallet receives USDC after you pay.
        </p>
        <div className="space-y-2">
          {wallet.privyEnabled ? (
            <>
              <button
                type="button"
                disabled={wallet.isConnecting}
                onClick={() => void run(wallet.openPrivyLogin)}
                className="flex w-full items-center justify-between rounded-2xl bg-primary px-4 py-4 text-left text-primary-foreground transition-transform active:scale-[0.99] disabled:opacity-60"
              >
                <div>
                  <p className="text-sm font-medium">Continue with email</p>
                  <p className="text-xs text-primary-foreground/70">Verify OTP · we create a Stellar wallet</p>
                </div>
              </button>
              <button
                type="button"
                disabled={wallet.isConnecting}
                onClick={() => void run(wallet.signupWithTouchId)}
                className="flex w-full items-center justify-between rounded-2xl bg-surface px-4 py-4 text-left ring-1 ring-black/10 transition-transform active:scale-[0.99] disabled:opacity-60"
              >
                <div>
                  <p className="text-sm font-medium">Email + add passkey</p>
                  <p className="text-xs text-muted-foreground">Sign in with email, then link Touch ID if available</p>
                </div>
              </button>
              <button
                type="button"
                disabled={wallet.isConnecting}
                onClick={() => void run(wallet.signInWithTouchId)}
                className="w-full text-center text-xs text-muted-foreground underline disabled:opacity-60"
              >
                Returning user with passkey? Sign in
              </button>
            </>
          ) : null}
          <button
            type="button"
            disabled={wallet.isConnecting}
            onClick={() => void run(wallet.connectExternalWallet)}
            className="flex w-full items-center justify-between rounded-2xl bg-surface px-4 py-4 text-left ring-1 ring-black/10 transition-transform active:scale-[0.99] disabled:opacity-60"
          >
            <div>
              <p className="text-sm font-medium">Connect external wallet</p>
              <p className="text-xs text-muted-foreground">Freighter, xBull, Albedo, Lobstr…</p>
            </div>
            <svg className="size-4 shrink-0" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
              <path d="M6.22 4.22a.75.75 0 0 1 1.06 0l3.25 3.25a.75.75 0 0 1 0 1.06l-3.25 3.25a.75.75 0 1 1-1.06-1.06L8.94 8 6.22 5.28a.75.75 0 0 1 0-1.06Z" />
            </svg>
          </button>
          {wallet.isConnecting && (
            <p className="pt-1 text-center text-xs text-muted-foreground">Connecting…</p>
          )}
          {wallet.error && <p className="pt-1 text-xs text-destructive">{wallet.error}</p>}
        </div>
      </Sheet>
    </ConnectContext.Provider>
  );
}
