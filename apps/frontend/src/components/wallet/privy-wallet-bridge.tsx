import { useCreateWallet } from "@privy-io/react-auth/extended-chains";
import {
  useLinkWithPasskey,
  useLoginWithPasskey,
  usePrivy,
  useSignupWithPasskey,
} from "@privy-io/react-auth";
import { useEffect, useRef } from "react";
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
};

function isPrivyError(err: unknown, code: string) {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code: string }).code === code
  );
}

function findStellarAddress(user: ReturnType<typeof usePrivy>["user"]) {
  if (!user) return null;
  const wallet = user.linkedAccounts.find(
    (account) =>
      account.type === "wallet" &&
      "chainType" in account &&
      account.chainType === "stellar",
  );
  return wallet && "address" in wallet ? wallet.address : null;
}

function findEmail(user: ReturnType<typeof usePrivy>["user"]) {
  if (!user) return null;
  const emailAccount = user.linkedAccounts.find((account) => account.type === "email");
  return emailAccount && "address" in emailAccount ? emailAccount.address : user.email?.address ?? null;
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
  const { signupWithPasskey } = useSignupWithPasskey();
  const { loginWithPasskey } = useLoginWithPasskey();
  const { linkWithPasskey } = useLinkWithPasskey();
  const userRef = useRef(user);
  userRef.current = user;

  useEffect(() => {
    onChange();
  }, [authenticated, ready, user, onChange]);

  useEffect(() => {
    if (!isPrivyEnabled()) return;

    const ensureStellarWallet = async () => {
      let address = findStellarAddress(userRef.current);
      if (address) return address;
      const { wallet } = await createWallet({ chainType: "stellar" });
      return wallet.address;
    };

    apiRef.current = {
      ready,
      authenticated,
      email: findEmail(user),
      getAddress: () => findStellarAddress(userRef.current),
      loginWithEmail: async () => {
        await login({ loginMethods: ["email"] });
      },
      createAccountWithTouchId: async () => {
        try {
          await signupWithPasskey();
          return;
        } catch (err) {
          if (!isPrivyError(err, "disallowed_login_method")) {
            throw err;
          }
        }

        // Passkey signup is off in Privy dashboard — verify email, then register Touch ID.
        await login({ loginMethods: ["email"] });
        await linkWithPasskey();
      },
      loginWithPasskey: async () => {
        await loginWithPasskey();
      },
      logout: async () => {
        await logout();
      },
      ensureStellarWallet,
    };
  }, [
    apiRef,
    authenticated,
    createWallet,
    login,
    linkWithPasskey,
    loginWithPasskey,
    logout,
    ready,
    signupWithPasskey,
    user,
  ]);

  return null;
}
