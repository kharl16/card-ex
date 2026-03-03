import { useState, useCallback, useEffect } from "react";

const CREDENTIAL_KEY = "tools_orb_webauthn_credential";
const PIN_HASH_KEY = "tools_orb_pin_hash";
const SESSION_KEY = "tools_orb_unlocked";

/**
 * Simple hash for PIN (client-side only, not cryptographic security)
 */
async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin + "tools_orb_salt_v1");
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

function bufferToBase64(buffer: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)));
}

function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

export type AuthMethod = "biometric" | "pin" | "none";

export interface ToolsAuthState {
  isUnlocked: boolean;
  isSetup: boolean; // Whether any auth method has been configured
  hasBiometric: boolean;
  hasPin: boolean;
  biometricAvailable: boolean;
  loading: boolean;
}

export function useToolsAuth() {
  const [state, setState] = useState<ToolsAuthState>({
    isUnlocked: false,
    isSetup: false,
    hasBiometric: false,
    hasPin: false,
    biometricAvailable: false,
    loading: true,
  });

  // Check current state on mount
  useEffect(() => {
    const checkState = async () => {
      const unlocked = sessionStorage.getItem(SESSION_KEY) === "true";
      const hasBiometric = !!localStorage.getItem(CREDENTIAL_KEY);
      const hasPin = !!localStorage.getItem(PIN_HASH_KEY);
      const isSetup = hasBiometric || hasPin;

      let biometricAvailable = false;
      try {
        biometricAvailable =
          !!window.PublicKeyCredential &&
          (await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable());
      } catch {
        biometricAvailable = false;
      }

      setState({
        isUnlocked: unlocked,
        isSetup,
        hasBiometric,
        hasPin,
        biometricAvailable,
        loading: false,
      });
    };

    checkState();
  }, []);

  const unlock = useCallback(() => {
    sessionStorage.setItem(SESSION_KEY, "true");
    setState((prev) => ({ ...prev, isUnlocked: true }));
  }, []);

  const lock = useCallback(() => {
    sessionStorage.removeItem(SESSION_KEY);
    setState((prev) => ({ ...prev, isUnlocked: false }));
  }, []);

  /**
   * Register a new biometric credential (fingerprint/face)
   */
  const registerBiometric = useCallback(async (): Promise<boolean> => {
    try {
      const challenge = crypto.getRandomValues(new Uint8Array(32));
      const userId = crypto.getRandomValues(new Uint8Array(16));

      const credential = (await navigator.credentials.create({
        publicKey: {
          challenge,
          rp: { name: "Card-Ex Tools", id: window.location.hostname },
          user: {
            id: userId,
            name: "tools-user",
            displayName: "Tools Access",
          },
          pubKeyCredParams: [
            { alg: -7, type: "public-key" },
            { alg: -257, type: "public-key" },
          ],
          authenticatorSelection: {
            authenticatorAttachment: "platform",
            userVerification: "required",
            residentKey: "preferred",
          },
          timeout: 60000,
        },
      })) as PublicKeyCredential | null;

      if (!credential) return false;

      // Store credential ID for future authentication
      const credentialId = bufferToBase64(credential.rawId);
      localStorage.setItem(CREDENTIAL_KEY, credentialId);

      setState((prev) => ({
        ...prev,
        hasBiometric: true,
        isSetup: true,
      }));

      return true;
    } catch (err) {
      console.error("Biometric registration failed:", err);
      return false;
    }
  }, []);

  /**
   * Authenticate using biometric
   */
  const authenticateBiometric = useCallback(async (): Promise<boolean> => {
    try {
      const storedCredId = localStorage.getItem(CREDENTIAL_KEY);
      if (!storedCredId) return false;

      const challenge = crypto.getRandomValues(new Uint8Array(32));

      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge,
          allowCredentials: [
            {
              id: base64ToBuffer(storedCredId),
              type: "public-key",
              transports: ["internal"],
            },
          ],
          userVerification: "required",
          timeout: 60000,
        },
      });

      if (assertion) {
        unlock();
        return true;
      }
      return false;
    } catch (err) {
      console.error("Biometric authentication failed:", err);
      return false;
    }
  }, [unlock]);

  /**
   * Set up a PIN
   */
  const setupPin = useCallback(async (pin: string): Promise<boolean> => {
    if (pin.length < 4) return false;

    const hashed = await hashPin(pin);
    localStorage.setItem(PIN_HASH_KEY, hashed);

    setState((prev) => ({
      ...prev,
      hasPin: true,
      isSetup: true,
    }));

    return true;
  }, []);

  /**
   * Verify a PIN
   */
  const verifyPin = useCallback(
    async (pin: string): Promise<boolean> => {
      const storedHash = localStorage.getItem(PIN_HASH_KEY);
      if (!storedHash) return false;

      const inputHash = await hashPin(pin);
      if (inputHash === storedHash) {
        unlock();
        return true;
      }
      return false;
    },
    [unlock]
  );

  /**
   * Reset all auth settings
   */
  const resetAuth = useCallback(() => {
    localStorage.removeItem(CREDENTIAL_KEY);
    localStorage.removeItem(PIN_HASH_KEY);
    sessionStorage.removeItem(SESSION_KEY);
    setState((prev) => ({
      ...prev,
      isUnlocked: false,
      isSetup: false,
      hasBiometric: false,
      hasPin: false,
    }));
  }, []);

  return {
    ...state,
    unlock,
    lock,
    registerBiometric,
    authenticateBiometric,
    setupPin,
    verifyPin,
    resetAuth,
  };
}
