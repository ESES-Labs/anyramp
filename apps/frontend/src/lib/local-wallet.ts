export type LocalWalletSession = {
  email: string;
  publicKey: string;
  authMethod: "email" | "passkey";
  createdAt: string;
};

const SESSION_KEY = "anyramp-local-wallet";
const SECRET_KEY = "anyramp-local-wallet-secret";

async function createKeypair() {
  const { Keypair } = await import("@stellar/stellar-sdk");
  return Keypair.random();
}

function readSession(): LocalWalletSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as LocalWalletSession) : null;
  } catch {
    return null;
  }
}

function writeSession(session: LocalWalletSession | null) {
  if (typeof window === "undefined") return;
  if (!session) {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(SECRET_KEY);
    return;
  }
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

async function storeSecret(keypair: Awaited<ReturnType<typeof createKeypair>>) {
  localStorage.setItem(SECRET_KEY, keypair.secret());
}

export function getLocalWalletSession() {
  return readSession();
}

export function clearLocalWallet() {
  writeSession(null);
}

function readSecret(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(SECRET_KEY);
}

export function getLocalWalletSecretForAddress(address: string): string | null {
  const session = readSession();
  if (!session || session.publicKey !== address) return null;
  return readSecret();
}

export async function signXdrWithLocalWallet(unsignedXdr: string, address: string) {
  const secret = getLocalWalletSecretForAddress(address);
  if (!secret) {
    throw new Error("No local signing key for this wallet. Sign in again.");
  }
  const { signStellarXdrWithSecret } = await import("@/lib/embedded-signing");
  return signStellarXdrWithSecret(unsignedXdr, secret);
}

export async function createLocalWalletWithEmail(email: string): Promise<LocalWalletSession> {
  const normalized = email.trim().toLowerCase();
  if (!normalized.includes("@")) {
    throw new Error("Enter a valid email address.");
  }

  const keypair = await createKeypair();
  const session: LocalWalletSession = {
    email: normalized,
    publicKey: keypair.publicKey(),
    authMethod: "email",
    createdAt: new Date().toISOString(),
  };

  await storeSecret(keypair);
  writeSession(session);
  window.dispatchEvent(new Event("anyramp-wallet-updated"));
  return session;
}

function bufferToBase64url(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function isPasskeySupported() {
  return typeof window !== "undefined" && !!window.PublicKeyCredential;
}

export async function createLocalWalletWithPasskey(email: string): Promise<LocalWalletSession> {
  if (!isPasskeySupported()) {
    throw new Error("Passkeys are not supported on this device.");
  }

  const normalized = email.trim().toLowerCase();
  if (!normalized.includes("@")) {
    throw new Error("Enter a valid email address.");
  }

  const keypair = await createKeypair();
  const userId = crypto.getRandomValues(new Uint8Array(16));

  const credential = (await navigator.credentials.create({
    publicKey: {
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      rp: { name: "Anyramp", id: window.location.hostname },
      user: {
        id: userId,
        name: normalized,
        displayName: normalized.split("@")[0] ?? "Anyramp user",
      },
      pubKeyCredParams: [{ type: "public-key", alg: -7 }],
      authenticatorSelection: {
        // "platform" already steers the browser to the on-device (client-device) authenticator;
        // the WebAuthn L3 `hints` field isn't in the current DOM lib types, so we rely on this.
        authenticatorAttachment: "platform",
        residentKey: "required",
        userVerification: "required",
      },
      timeout: 60_000,
    },
  })) as PublicKeyCredential | null;

  if (!credential) {
    throw new Error("Passkey creation was cancelled.");
  }

  const session: LocalWalletSession = {
    email: normalized,
    publicKey: keypair.publicKey(),
    authMethod: "passkey",
    createdAt: new Date().toISOString(),
  };

  await storeSecret(keypair);
  writeSession(session);
  localStorage.setItem(
    `anyramp-passkey:${normalized}`,
    bufferToBase64url(credential.rawId),
  );
  window.dispatchEvent(new Event("anyramp-wallet-updated"));
  return session;
}

export async function signInWithPasskey(email: string): Promise<LocalWalletSession> {
  const normalized = email.trim().toLowerCase();
  const session = readSession();
  if (!session || session.email !== normalized) {
    throw new Error("No passkey wallet found for this email. Create a wallet first.");
  }

  const credentialId = localStorage.getItem(`anyramp-passkey:${normalized}`);
  if (!credentialId) {
    throw new Error("Passkey not registered for this account.");
  }

  const assertion = await navigator.credentials.get({
    publicKey: {
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      allowCredentials: [
        {
          id: Uint8Array.from(atob(credentialId.replace(/-/g, "+").replace(/_/g, "/")), (c) =>
            c.charCodeAt(0),
          ),
          type: "public-key",
        },
      ],
      timeout: 60_000,
      userVerification: "required",
    },
  });

  if (!assertion) {
    throw new Error("Passkey sign-in was cancelled.");
  }

  window.dispatchEvent(new Event("anyramp-wallet-updated"));
  return session;
}
