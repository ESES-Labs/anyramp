import { useEffect, useState } from "react";
import { isPasskeySupported } from "@/lib/local-wallet";
import { useWallet } from "./wallet-provider";

export type DestinationChoice = "embedded" | "manual";

type DestinationPickerProps = {
  choice: DestinationChoice;
  onChoiceChange: (choice: DestinationChoice) => void;
  manualAddress: string;
  onManualAddressChange: (address: string) => void;
};

export function DestinationPicker({
  choice,
  onChoiceChange,
  manualAddress,
  onManualAddressChange,
}: DestinationPickerProps) {
  const wallet = useWallet();
  const [email, setEmail] = useState(wallet.embeddedEmail ?? "");
  const passkeySupported = isPasskeySupported();

  useEffect(() => {
    if (
      choice === "manual" &&
      wallet.destination &&
      wallet.destination.mode !== "embedded"
    ) {
      onManualAddressChange(wallet.destination.address);
    }
  }, [choice, onManualAddressChange, wallet.destination]);

  const activeAddress = wallet.destination?.address;

  return (
    <section className="space-y-3">
      <div>
        <h2 className="px-1 text-sm font-medium text-muted-foreground">
          Where should we send your USDC?
        </h2>
        <p className="mt-1 px-1 text-xs text-muted-foreground">
          Connect an existing wallet or create one with email or passkey.
        </p>
      </div>

      <div className="space-y-2">
        <label className="flex cursor-pointer items-start gap-3 rounded-2xl bg-surface p-3 ring-1 ring-black/5">
          <input
            checked={choice === "embedded"}
            className="mt-1"
            name="destination"
            onChange={() => onChoiceChange("embedded")}
            type="radio"
          />
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium">Create wallet for me</span>
            <span className="mt-0.5 block text-xs text-muted-foreground">
              Sign in with email or passkey — we&apos;ll generate a Stellar wallet for you.
            </span>
          </span>
        </label>

        {choice === "embedded" ? (
          <div className="ml-2 space-y-2 rounded-2xl border border-dashed border-border bg-surface-muted/50 p-3">
            {activeAddress && wallet.destination?.mode === "embedded" ? (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">{wallet.destination.label}</p>
                <p className="break-all font-mono text-sm">{activeAddress}</p>
                {wallet.destination.email ? (
                  <p className="text-xs text-muted-foreground">{wallet.destination.email}</p>
                ) : null}
              </div>
            ) : wallet.privyEnabled ? (
              <div className="space-y-2">
                <button
                  className="w-full rounded-full bg-primary px-3 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-60"
                  disabled={wallet.isConnecting}
                  onClick={() => void wallet.signupWithTouchId()}
                  type="button"
                >
                  {wallet.isConnecting ? "Waiting for Touch ID…" : "Create with Touch ID passkey"}
                </button>
                <button
                  className="w-full rounded-full bg-surface px-3 py-2.5 text-sm font-medium ring-1 ring-black/10 disabled:opacity-60"
                  disabled={wallet.isConnecting}
                  onClick={() => void wallet.openPrivyLogin()}
                  type="button"
                >
                  Continue with email
                </button>
                <button
                  className="w-full text-xs text-muted-foreground underline disabled:opacity-60"
                  disabled={wallet.isConnecting}
                  onClick={() => void wallet.signInWithTouchId()}
                  type="button"
                >
                  Already have a passkey? Sign in
                </button>
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  First time? You&apos;ll verify email once, then save Touch ID for future
                  sign-ins. Use Safari or your HTTPS tunnel for best Touch ID support on Mac.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <input
                  autoComplete="email"
                  className="w-full rounded-2xl bg-surface px-3 py-2.5 text-sm outline-none ring-1 ring-black/10"
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@email.com"
                  type="email"
                  value={email}
                />
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <button
                    className="rounded-full bg-surface px-3 py-2 text-sm font-medium ring-1 ring-black/10 disabled:opacity-60"
                    disabled={wallet.isConnecting || !email.trim()}
                    onClick={() => void wallet.createEmbeddedWithEmail(email)}
                    type="button"
                  >
                    Create with email
                  </button>
                  {passkeySupported ? (
                    <button
                      className="rounded-full bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
                      disabled={wallet.isConnecting || !email.trim()}
                      onClick={() => void wallet.createEmbeddedWithPasskey(email)}
                      type="button"
                    >
                      Create with passkey
                    </button>
                  ) : null}
                </div>
                {passkeySupported ? (
                  <button
                    className="text-xs text-muted-foreground underline"
                    disabled={wallet.isConnecting || !email.trim()}
                    onClick={() => void wallet.signInEmbeddedWithPasskey(email)}
                    type="button"
                  >
                    Already have a passkey wallet? Sign in
                  </button>
                ) : null}
              </div>
            )}
          </div>
        ) : null}

        <label className="flex cursor-pointer items-start gap-3 rounded-2xl bg-surface p-3 ring-1 ring-black/5">
          <input
            checked={choice === "manual"}
            className="mt-1"
            name="destination"
            onChange={() => onChoiceChange("manual")}
            type="radio"
          />
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium">Send to Stellar address</span>
            <span className="mt-0.5 block text-xs text-muted-foreground">
              Paste a G… address or connect Freighter, xBull, and other wallets.
            </span>
          </span>
        </label>

        {choice === "manual" ? (
          <div className="ml-2 space-y-2">
            <input
              className="w-full rounded-2xl bg-surface px-3 py-2.5 font-mono text-sm outline-none ring-1 ring-black/10"
              onBlur={() => wallet.setManualDestination(manualAddress)}
              onChange={(event) =>
                onManualAddressChange(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))
              }
              placeholder="G…"
              value={manualAddress}
            />
            <button
              className="w-full rounded-full bg-surface px-3 py-2 text-sm font-medium ring-1 ring-black/10 disabled:opacity-60"
              disabled={wallet.isConnecting}
              onClick={() => void wallet.connectExternalWallet()}
              type="button"
            >
              {wallet.isConnecting ? "Connecting…" : "Connect wallet"}
            </button>
            {activeAddress && wallet.destination?.mode !== "embedded" ? (
              <p className="break-all text-xs text-muted-foreground">
                Destination: {wallet.shorten(activeAddress)}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      {wallet.error ? <p className="px-1 text-xs text-destructive">{wallet.error}</p> : null}
    </section>
  );
}

export function hasValidDestination(
  choice: DestinationChoice,
  wallet: ReturnType<typeof useWallet>,
  manualAddress: string,
) {
  if (choice === "embedded") {
    return Boolean(wallet.destination?.mode === "embedded" && wallet.destination.address);
  }
  return wallet.isValidAddress(manualAddress.trim());
}

export function resolveDestinationAddress(
  choice: DestinationChoice,
  wallet: ReturnType<typeof useWallet>,
  manualAddress: string,
) {
  if (choice === "embedded") {
    return wallet.destination?.mode === "embedded" ? wallet.destination.address : null;
  }
  const trimmed = manualAddress.trim();
  return wallet.isValidAddress(trimmed) ? trimmed : null;
}
