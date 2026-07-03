import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  clearLocalWallet,
  createLocalWalletWithEmail,
  createLocalWalletWithPasskey,
  getLocalWalletSession,
  signInWithPasskey,
  signXdrWithLocalWallet,
} from "@/lib/local-wallet";
import { isValidStellarAddress, shortenAddress } from "@/lib/stellar-address";
import { waitForPrivyApi } from "@/lib/wait-for-privy";
import { isPrivyEnabled, PrivyRoot } from "./privy-root";
import { PrivyWalletBridge, type PrivyWalletApi } from "./privy-wallet-bridge";

export type WalletMode = "embedded" | "external" | "manual";

export type WalletDestination = {
  address: string;
  mode: WalletMode;
  label: string;
  email?: string | null;
};

type WalletContextValue = {
  destination: WalletDestination | null;
  privyEnabled: boolean;
  isConnecting: boolean;
  error: string | null;
  setManualDestination: (address: string) => void;
  connectExternalWallet: () => Promise<void>;
  createEmbeddedWithEmail: (email: string) => Promise<void>;
  createEmbeddedWithPasskey: (email: string) => Promise<void>;
  signInEmbeddedWithPasskey: (email: string) => Promise<void>;
  openPrivyLogin: () => Promise<void>;
  signupWithTouchId: () => Promise<void>;
  signInWithTouchId: () => Promise<void>;
  clearDestination: () => void;
  disconnectAll: () => Promise<void>;
  shorten: (address: string) => string;
  isValidAddress: (address: string) => boolean;
  embeddedAddress: string | null;
  embeddedEmail: string | null;
  signEmbeddedXdr: (unsignedXdr: string, address: string) => Promise<string>;
};

const WalletContext = createContext<WalletContextValue | null>(null);

function readEmbeddedFromStorage(): WalletDestination | null {
  const session = getLocalWalletSession();
  if (!session) return null;
  return {
    address: session.publicKey,
    mode: "embedded",
    label: session.authMethod === "passkey" ? "Passkey wallet" : "Email wallet",
    email: session.email,
  };
}

function WalletProviderInner({ children }: { children: ReactNode }) {
  const privyRef = useRef<PrivyWalletApi | null>(null);
  const [destination, setDestination] = useState<WalletDestination | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localEmbedded, setLocalEmbedded] = useState<WalletDestination | null>(null);
  const [privyVersion, setPrivyVersion] = useState(0);
  const bumpPrivy = useCallback(() => setPrivyVersion((v) => v + 1), []);

  const syncLocalEmbedded = useCallback(() => {
    setLocalEmbedded(readEmbeddedFromStorage());
  }, []);

  useEffect(() => {
    syncLocalEmbedded();
    const embedded = readEmbeddedFromStorage();
    if (embedded) {
      setDestination((current) => current ?? embedded);
    }
    const onUpdate = () => syncLocalEmbedded();
    window.addEventListener("anyramp-wallet-updated", onUpdate);
    window.addEventListener("storage", onUpdate);
    return () => {
      window.removeEventListener("anyramp-wallet-updated", onUpdate);
      window.removeEventListener("storage", onUpdate);
    };
  }, [syncLocalEmbedded]);

  useEffect(() => {
    if (!isPrivyEnabled()) return;
    const api = privyRef.current;
    if (!api?.authenticated || !api.getAddress()) return;

    setDestination((current) => {
      if (current?.mode === "external" || current?.mode === "manual") return current;
      const address = api.getAddress();
      if (!address) return current;
      return {
        address,
        mode: "embedded",
        label: "Privy wallet",
        email: api.email,
      };
    });
  }, [privyVersion]);

  const privyEmbedded = useMemo(() => {
    if (!isPrivyEnabled() || !privyRef.current?.authenticated) return null;
    const address = privyRef.current.getAddress();
    if (!address) return null;
    return {
      address,
      mode: "embedded" as const,
      label: "Privy wallet",
      email: privyRef.current.email,
    };
  }, [destination, localEmbedded, privyVersion]);

  const embeddedAddress = privyEmbedded?.address ?? localEmbedded?.address ?? null;
  const embeddedEmail = privyEmbedded?.email ?? localEmbedded?.email ?? null;

  const setDestinationSafe = useCallback((next: WalletDestination | null) => {
    setError(null);
    setDestination(next);
  }, []);

  const setManualDestination = useCallback((address: string) => {
    const trimmed = address.trim();
    if (!trimmed) {
      setDestinationSafe(null);
      return;
    }
    if (!isValidStellarAddress(trimmed)) {
      setError("Enter a valid Stellar address (starts with G).");
      return;
    }
    setDestinationSafe({
      address: trimmed,
      mode: "manual",
      label: "Stellar address",
    });
  }, [setDestinationSafe]);

  const signEmbeddedXdr = useCallback(async (unsignedXdr: string, address: string) => {
    if (isPrivyEnabled()) {
      try {
        const api = await waitForPrivyApi(() => privyRef.current);
        if (api.authenticated && api.getAddress() === address) {
          return api.signStellarXdr(unsignedXdr, address);
        }
      } catch {
        // fall through to local wallet signing
      }
    }
    return signXdrWithLocalWallet(unsignedXdr, address);
  }, []);

  const connectExternalWallet = useCallback(async () => {
    setIsConnecting(true);
    setError(null);
    try {
      const { connectExternalStellarWallet } = await import("@/lib/stellar-kit");
      const address = await connectExternalStellarWallet();
      setDestinationSafe({
        address,
        mode: "external",
        label: "Connected wallet",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not connect wallet.");
    } finally {
      setIsConnecting(false);
    }
  }, [setDestinationSafe]);

  const createEmbeddedWithEmail = useCallback(async (email: string) => {
    setIsConnecting(true);
    setError(null);
    try {
      if (isPrivyEnabled()) {
        const api = await waitForPrivyApi(() => privyRef.current);
        await api.loginWithEmail();
        bumpPrivy();
        const address = await api.ensureStellarWallet();
        if (!address) throw new Error("Could not create embedded wallet.");
        setDestinationSafe({
          address,
          mode: "embedded",
          label: "Privy wallet",
          email: api.email ?? email,
        });
        return;
      }

      const session = await createLocalWalletWithEmail(email);
      setDestinationSafe({
        address: session.publicKey,
        mode: "embedded",
        label: "Email wallet",
        email: session.email,
      });
      syncLocalEmbedded();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create wallet.");
    } finally {
      setIsConnecting(false);
    }
  }, [bumpPrivy, setDestinationSafe, syncLocalEmbedded]);

  const createEmbeddedWithPasskey = useCallback(async (email: string) => {
    setIsConnecting(true);
    setError(null);
    try {
      if (isPrivyEnabled()) {
        const api = await waitForPrivyApi(() => privyRef.current);
        await api.createAccountWithTouchId();
        bumpPrivy();
        const address = await api.ensureStellarWallet();
        setDestinationSafe({
          address,
          mode: "embedded",
          label: "Privy wallet",
          email: api.email ?? email,
        });
        return;
      }

      const session = await createLocalWalletWithPasskey(email);
      setDestinationSafe({
        address: session.publicKey,
        mode: "embedded",
        label: "Passkey wallet",
        email: session.email,
      });
      syncLocalEmbedded();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create passkey wallet.");
    } finally {
      setIsConnecting(false);
    }
  }, [bumpPrivy, setDestinationSafe, syncLocalEmbedded]);

  const signInEmbeddedWithPasskey = useCallback(async (email: string) => {
    setIsConnecting(true);
    setError(null);
    try {
      if (isPrivyEnabled()) {
        const api = await waitForPrivyApi(() => privyRef.current);
        await api.loginWithPasskey();
        bumpPrivy();
        const address = await api.ensureStellarWallet();
        setDestinationSafe({
          address,
          mode: "embedded",
          label: "Privy wallet",
          email: api.email ?? email,
        });
        return;
      }

      const session = await signInWithPasskey(email);
      setDestinationSafe({
        address: session.publicKey,
        mode: "embedded",
        label: "Passkey wallet",
        email: session.email,
      });
      syncLocalEmbedded();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Passkey sign-in failed.");
    } finally {
      setIsConnecting(false);
    }
  }, [bumpPrivy, setDestinationSafe, syncLocalEmbedded]);

  const openPrivyLogin = useCallback(async () => {
    if (!isPrivyEnabled()) {
      throw new Error("Privy is not configured.");
    }
    setIsConnecting(true);
    setError(null);
    try {
      const api = await waitForPrivyApi(() => privyRef.current);
      await api.loginWithEmail();
      bumpPrivy();
      const address = await api.ensureStellarWallet();
      setDestinationSafe({
        address,
        mode: "embedded",
        label: "Privy wallet",
        email: api.email,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed.");
    } finally {
      setIsConnecting(false);
    }
  }, [bumpPrivy, setDestinationSafe]);

  const signupWithTouchId = useCallback(async () => {
    if (!isPrivyEnabled()) {
      throw new Error("Privy is not configured.");
    }
    setIsConnecting(true);
    setError(null);
    try {
      const api = await waitForPrivyApi(() => privyRef.current);
      await api.createAccountWithTouchId();
      bumpPrivy();
      const address = await api.ensureStellarWallet();
      setDestinationSafe({
        address,
        mode: "embedded",
        label: "Privy wallet",
        email: api.email,
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not create wallet. Try Continue with email instead.",
      );
    } finally {
      setIsConnecting(false);
    }
  }, [bumpPrivy, setDestinationSafe]);

  const signInWithTouchId = useCallback(async () => {
    if (!isPrivyEnabled()) {
      throw new Error("Privy is not configured.");
    }
    setIsConnecting(true);
    setError(null);
    try {
      const api = await waitForPrivyApi(() => privyRef.current);
      await api.loginWithPasskey();
      bumpPrivy();
      const address = await api.ensureStellarWallet();
      setDestinationSafe({
        address,
        mode: "embedded",
        label: "Privy wallet",
        email: api.email,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Passkey sign-in failed.");
    } finally {
      setIsConnecting(false);
    }
  }, [bumpPrivy, setDestinationSafe]);

  const clearDestination = useCallback(() => {
    setDestinationSafe(null);
  }, [setDestinationSafe]);

  const disconnectAll = useCallback(async () => {
    const { disconnectExternalStellarWallet } = await import("@/lib/stellar-kit");
    disconnectExternalStellarWallet().catch(() => {});
    clearLocalWallet();
    syncLocalEmbedded();
    if (isPrivyEnabled() && privyRef.current?.authenticated) {
      await privyRef.current.logout();
    }
    setDestinationSafe(null);
  }, [setDestinationSafe, syncLocalEmbedded]);

  const value = useMemo<WalletContextValue>(
    () => ({
      destination,
      privyEnabled: isPrivyEnabled(),
      isConnecting,
      error,
      setManualDestination,
      connectExternalWallet,
      createEmbeddedWithEmail,
      createEmbeddedWithPasskey,
      signInEmbeddedWithPasskey,
      openPrivyLogin,
      signupWithTouchId,
      signInWithTouchId,
      clearDestination,
      disconnectAll,
      shorten: shortenAddress,
      isValidAddress: isValidStellarAddress,
      embeddedAddress,
      embeddedEmail,
      signEmbeddedXdr,
    }),
    [
      destination,
      isConnecting,
      error,
      setManualDestination,
      connectExternalWallet,
      createEmbeddedWithEmail,
      createEmbeddedWithPasskey,
      signInEmbeddedWithPasskey,
      openPrivyLogin,
      signupWithTouchId,
      signInWithTouchId,
      clearDestination,
      disconnectAll,
      embeddedAddress,
      embeddedEmail,
      signEmbeddedXdr,
    ],
  );

  return (
    <WalletContext.Provider value={value}>
      {isPrivyEnabled() ? <PrivyWalletBridge apiRef={privyRef} onChange={bumpPrivy} /> : null}
      {children}
    </WalletContext.Provider>
  );
}

export function WalletProvider({ children }: { children: ReactNode }) {
  return (
    <PrivyRoot>
      <WalletProviderInner>{children}</WalletProviderInner>
    </PrivyRoot>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error("useWallet must be used within WalletProvider.");
  }
  return context;
}

const noopAsync = async () => {};

const noopSign = async () => "";

const SSR_WALLET_STUB: WalletContextValue = {
  destination: null,
  privyEnabled: false,
  isConnecting: false,
  error: null,
  setManualDestination: () => {},
  connectExternalWallet: noopAsync,
  createEmbeddedWithEmail: noopAsync,
  createEmbeddedWithPasskey: noopAsync,
  signInEmbeddedWithPasskey: noopAsync,
  openPrivyLogin: noopAsync,
  signupWithTouchId: noopAsync,
  signInWithTouchId: noopAsync,
  clearDestination: () => {},
  disconnectAll: noopAsync,
  shorten: shortenAddress,
  isValidAddress: isValidStellarAddress,
  embeddedAddress: null,
  embeddedEmail: null,
  signEmbeddedXdr: noopSign,
};

export function ClientWalletProvider({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) {
    return <WalletContext.Provider value={SSR_WALLET_STUB}>{children}</WalletContext.Provider>;
  }
  return <WalletProvider>{children}</WalletProvider>;
}
