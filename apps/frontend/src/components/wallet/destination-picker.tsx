import { useEffect, useRef, useState } from "react";
import { isPasskeySupported } from "@/lib/local-wallet";
import { useWallet } from "./wallet-provider";

export type DestinationChoice = "connected" | "embedded" | "manual";

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

  // A wallet the user has already connected (Freighter/xBull, Privy, or a local
  // embedded wallet). A manually-pasted address is NOT a connected wallet.
  const connectedWallet =
    wallet.destination && wallet.destination.mode !== "manual" ? wallet.destination : null;

  // When a wallet connects, default to sending there; when it disconnects, fall
  // back to the create-a-wallet flow. Manual ("send to another address") is a
  // deliberate choice, so we never override it.
  const wasConnected = useRef(false);
  useEffect(() => {
    const isConnected = Boolean(connectedWallet);
    if (isConnected && !wasConnected.current) {
      onChoiceChange("connected");
    } else if (!isConnected && wasConnected.current && choice === "connected") {
      onChoiceChange("manual");
    }
    wasConnected.current = isConnected;
  }, [connectedWallet, choice, onChoiceChange]);

  // Restore a previously-pasted address only when no wallet is connected — when a
  // wallet IS connected, "send to another address" should start blank.
  useEffect(() => {
    if (choice === "manual" && !connectedWallet && wallet.destination?.mode === "manual") {
      onManualAddressChange(wallet.destination.address);
    }
  }, [choice, connectedWallet, onManualAddressChange, wallet.destination]);

  const manualValid = wallet.isValidAddress(manualAddress.trim());

  return (
    <section className="space-y-3">
      <div>
        <h2 className="px-1 text-sm font-medium text-muted-foreground">
          Where should we send your USDC?
        </h2>
        <p className="mt-1 px-1 text-xs text-muted-foreground">
          {connectedWallet
            ? "We'll send it to your connected wallet, or you can use another Stellar address."
            : "Paste any Stellar G… address — connecting a wallet is optional."}
        </p>
      </div>

      <div className="space-y-2">
        <label className="flex cursor-pointer items-start gap-3 rounded-2xl bg-surface p-3 ring-1 ring-black/5">
          <input
            checked={choice === "manual"}
            className="mt-1"
            name="destination"
            onChange={() => onChoiceChange("manual")}
            type="radio"
          />
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium">
              {connectedWallet ? "Send to another Stellar address" : "Send to Stellar address"}
            </span>
            <span className="mt-0.5 block text-xs text-muted-foreground">
              {connectedWallet
                ? "Paste a different G… address to send there instead."
                : "Paste the destination wallet — no sign-in required."}
            </span>
          </span>
        </label>

        {choice === "manual" ? (
          <div className="ml-2 space-y-2">
            <input
              className="w-full rounded-2xl bg-surface px-3 py-2.5 font-mono text-sm outline-none ring-1 ring-black/10"
              onBlur={() => {
                if (!connectedWallet) wallet.setManualDestination(manualAddress);
              }}
              onChange={(event) =>
                onManualAddressChange(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))
              }
              placeholder="G…"
              value={manualAddress}
            />
            {connectedWallet ? null : (
              <button
                className="w-full text-xs text-muted-foreground underline disabled:opacity-60"
                disabled={wallet.isConnecting}
                onClick={() => void wallet.connectExternalWallet()}
                type="button"
              >
                {wallet.isConnecting ? "Connecting…" : "Or connect Freighter / xBull (optional)"}
              </button>
            )}
            {manualValid ? (
              <p className="break-all text-xs text-muted-foreground">
                Destination: {wallet.shorten(manualAddress.trim())}
              </p>
            ) : null}
          </div>
        ) : null}

        {connectedWallet ? (
          <label className="flex cursor-pointer items-start gap-3 rounded-2xl bg-surface p-3 ring-1 ring-black/5">
            <input
              checked={choice === "connected"}
              className="mt-1"
              name="destination"
              onChange={() => onChoiceChange("connected")}
              type="radio"
            />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium">Send to your connected wallet</span>
              <span className="mt-0.5 block break-all font-mono text-xs text-muted-foreground">
                {connectedWallet.address}
              </span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                {connectedWallet.label}
                {connectedWallet.email ? ` · ${connectedWallet.email}` : ""}
              </span>
            </span>
          </label>
        ) : (
          <>
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
                  Optional — sign in with email or passkey and we&apos;ll generate a Stellar wallet.
                </span>
              </span>
            </label>

            {choice === "embedded" ? (
              <div className="ml-2 space-y-2 rounded-2xl border border-dashed border-border bg-surface-muted/50 p-3">
                {wallet.privyEnabled ? (
                  <div className="space-y-2">
                    <button
                      className="w-full rounded-full bg-primary px-3 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-60"
                      disabled={wallet.isConnecting}
                      onClick={() => void wallet.openPrivyLogin()}
                      type="button"
                    >
                      {wallet.isConnecting ? "Waiting for verification…" : "Continue with email"}
                    </button>
                    <button
                      className="w-full rounded-full bg-surface px-3 py-2.5 text-sm font-medium ring-1 ring-black/10 disabled:opacity-60"
                      disabled={wallet.isConnecting}
                      onClick={() => void wallet.signupWithTouchId()}
                      type="button"
                    >
                      Email + add passkey (optional)
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
                      Finish the email OTP in the Privy popup. A Stellar wallet is created after
                      you verify.
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
          </>
        )}
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
  if (choice === "connected") {
    return Boolean(wallet.destination?.address && wallet.destination.mode !== "manual");
  }
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
  if (choice === "connected") {
    return wallet.destination && wallet.destination.mode !== "manual"
      ? wallet.destination.address
      : null;
  }
  if (choice === "embedded") {
    return wallet.destination?.mode === "embedded" ? wallet.destination.address : null;
  }
  const trimmed = manualAddress.trim();
  return wallet.isValidAddress(trimmed) ? trimmed : null;
}
