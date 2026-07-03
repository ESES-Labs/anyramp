import { useCreateWallet, useSignRawHash } from "@privy-io/react-auth/extended-chains";
import {
  useLinkWithPasskey,
  useLoginWithPasskey,
  usePrivy,
} from "@privy-io/react-auth";
import { useEffect, useRef } from "react";
import { signStellarXdrWithPrivy } from "@/lib/embedded-signing";
import { isPrivyEnabled } from "./privy-root";

export type PrivyWalletApi = {
  ready: boolean;
  authenticated: boolean;
  email: string | null;
  getAddress: () => string | null;
  loginWithEmail: () => Promise<void>;
  createAccountWithTouchId: () => Promise<void>;
  loginWithPasskey: () => Promise<void>;
  logout: () => Promise<void>;
  ensureStellarWallet: () => Promise<string>;
  signStellarXdr: (unsignedXdr: string, address: string) => Promise<string>;
};

function privyErrorMessage(err: unknown) {
  if (typeof err === "object" && err !== null) {
    if ("message" in err && typeof err.message === "string") return err.message;
    if ("error" in err && typeof err.error === "string") return err.error;
  }
  return String(err);
}

function isPasskeyMethodDisabled(err: unknown) {
  const message = privyErrorMessage(err);
  return (
    message.includes("disallowed_login_method") ||
    message.includes("Signup with passkey not allowed") ||
    message.includes("Passkey not allowed")
  );
}

function stellarChainType(account: Record<string, unknown>) {
  return account.chainType ?? account.chain_type;
}

function findStellarAddress(user: ReturnType<typeof usePrivy>["user"]) {
  if (!user) return null;

  for (const account of user.linkedAccounts) {
    if (account.type !== "wallet") continue;
    const raw = account as unknown as Record<string, unknown>;
    if (stellarChainType(raw) !== "stellar") continue;
    if (typeof raw.address === "string" && raw.address.startsWith("G")) {
      return raw.address;
    }
  }

  return null;
}

function findEmail(user: ReturnType<typeof usePrivy>["user"]) {
  if (!user) return null;
  const emailAccount = user.linkedAccounts.find((account) => account.type === "email");
  return emailAccount && "address" in emailAccount
    ? emailAccount.address
    : (user.email?.address ?? null);
}

export function PrivyWalletBridge({
  apiRef,
  onChange,
}: {
  apiRef: React.MutableRefObject<PrivyWalletApi | null>;
  onChange: () => void;
}) {
  const { login, logout, authenticated, user, ready } = usePrivy();
  const { createWallet } = useCreateWallet();
  const { loginWithPasskey } = useLoginWithPasskey();
  const { linkWithPasskey } = useLinkWithPasskey();
  const { signRawHash } = useSignRawHash();
  const userRef = useRef(user);
  userRef.current = user;
  const authenticatedRef = useRef(authenticated);
  authenticatedRef.current = authenticated;
  const readyRef = useRef(ready);
  readyRef.current = ready;

  useEffect(() => {
    onChange();
  }, [authenticated, ready, user, onChange]);

  useEffect(() => {
    if (!isPrivyEnabled()) return;

    const waitUntilReady = async () => {
      const started = Date.now();
      while (Date.now() - started < 15_000) {
        if (readyRef.current) return;
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
      throw new Error("Privy is still loading.");
    };

    const waitForAuthenticated = async () => {
      const started = Date.now();
      while (Date.now() - started < 120_000) {
        if (authenticatedRef.current && userRef.current) return;
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      throw new Error("Sign-in timed out. Finish email verification in the Privy modal.");
    };

    const ensureStellarWallet = async () => {
      await waitUntilReady();
      await waitForAuthenticated();

      let address = findStellarAddress(userRef.current);
      if (address) return address;

      try {
        const { wallet } = await createWallet({ chainType: "stellar" });
        onChange();
        return wallet.address;
      } catch (err) {
        const message = privyErrorMessage(err);
        if (message.includes("Missing auth token")) {
          throw new Error(
            "Privy session expired. Sign in with email again, then retry.",
          );
        }
        throw err instanceof Error ? err : new Error(message);
      }
    };

    const loginWithEmailFlow = async () => {
      await waitUntilReady();
      await login({ loginMethods: ["email"] });
      await waitForAuthenticated();
    };

    const tryLinkPasskey = async () => {
      try {
        await linkWithPasskey();
      } catch (err) {
        if (isPasskeyMethodDisabled(err)) return;
        throw err instanceof Error ? err : new Error(privyErrorMessage(err));
      }
    };

    apiRef.current = {
      ready,
      authenticated,
      email: findEmail(user),
      getAddress: () => findStellarAddress(userRef.current),
      loginWithEmail: loginWithEmailFlow,
      // Passkey signup is often disabled in Privy dashboard — email first, then optional link.
      createAccountWithTouchId: async () => {
        await loginWithEmailFlow();
        await tryLinkPasskey();
      },
      loginWithPasskey: async () => {
        await waitUntilReady();
        try {
          await loginWithPasskey();
          await waitForAuthenticated();
        } catch (err) {
          if (isPasskeyMethodDisabled(err)) {
            throw new Error(
              "Passkey sign-in is disabled for this app. Use Continue with email instead.",
            );
          }
          throw err instanceof Error ? err : new Error(privyErrorMessage(err));
        }
      },
      logout: async () => {
        await logout();
      },
      ensureStellarWallet,
      signStellarXdr: async (unsignedXdr, address) =>
        signStellarXdrWithPrivy(unsignedXdr, address, signRawHash),
    };
  }, [
    apiRef,
    authenticated,
    createWallet,
    linkWithPasskey,
    login,
    loginWithPasskey,
    logout,
    onChange,
    ready,
    signRawHash,
    user,
  ]);

  return null;
}
