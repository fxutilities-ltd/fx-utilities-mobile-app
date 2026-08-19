import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import * as SecureStore from "expo-secure-store";
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import { appConfig } from "../config/appConfig";
import { discovery, redirectUri } from "./authConfig";

// Required once, at module scope: lets expo-web-browser correctly resolve
// the pending browser session if the app is still alive in the background
// when the Microsoft sign-in redirect arrives.
WebBrowser.maybeCompleteAuthSession();

// IMPORTANT: SecureStore has a hard 2048-byte-per-item limit on Android
// (there's no such limit on iOS Keychain, which is why this only bit us on
// Android testing). Splitting accessToken/refreshToken/expiry into separate
// keys wasn't enough on its own — Microsoft's refresh tokens in particular
// are routinely well over 2KB all by themselves. So instead of storing each
// field as a single SecureStore value, we split any value bigger than the
// limit into fixed-size chunks stored under their own keys, and stitch them
// back together on read. This works no matter how large Microsoft's tokens
// are. (Tokens are plain ASCII/base64url strings, so 1 JS string character
// here is always 1 byte — no multi-byte character concerns.)
const CHUNK_SIZE = 1800; // comfortably under the 2048-byte limit

async function setSecureItem(key: string, value: string): Promise<void> {
  const chunks: string[] = [];
  for (let i = 0; i < value.length; i += CHUNK_SIZE) {
    chunks.push(value.slice(i, i + CHUNK_SIZE));
  }
  await SecureStore.setItemAsync(`${key}.count`, String(chunks.length));
  await Promise.all(chunks.map((chunk, i) => SecureStore.setItemAsync(`${key}.${i}`, chunk)));
}

async function getSecureItem(key: string): Promise<string | null> {
  const countRaw = await SecureStore.getItemAsync(`${key}.count`);
  if (!countRaw) {
    return null;
  }
  const count = parseInt(countRaw, 10);
  const chunks = await Promise.all(
    Array.from({ length: count }, (_, i) => SecureStore.getItemAsync(`${key}.${i}`))
  );
  if (chunks.some((chunk) => chunk === null)) {
    return null;
  }
  return chunks.join("");
}

async function deleteSecureItem(key: string): Promise<void> {
  const countRaw = await SecureStore.getItemAsync(`${key}.count`);
  if (countRaw) {
    const count = parseInt(countRaw, 10);
    await Promise.all(
      Array.from({ length: count }, (_, i) => SecureStore.deleteItemAsync(`${key}.${i}`))
    );
  }
  await SecureStore.deleteItemAsync(`${key}.count`);
}

const KEYS = {
  accessToken: "fxUtilities.auth.accessToken",
  refreshToken: "fxUtilities.auth.refreshToken",
  expiresAt: "fxUtilities.auth.expiresAt",
};

interface StoredTokens {
  accessToken: string;
  accessTokenExpirationDate: string;
  refreshToken: string;
}

interface AuthContextValue {
  isSignedIn: boolean;
  isInitializing: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  /** Returns a valid Graph access token, refreshing it first if it's expired or close to it. */
  getAccessToken: () => Promise<string>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function saveTokens(tokens: StoredTokens): Promise<void> {
  // expo-secure-store uses the OS Keychain (iOS) / Keystore-backed encrypted
  // storage (Android) — chunked to stay under Android's per-value size limit
  // (see note above setSecureItem).
  await Promise.all([
    setSecureItem(KEYS.accessToken, tokens.accessToken),
    setSecureItem(KEYS.refreshToken, tokens.refreshToken),
    setSecureItem(KEYS.expiresAt, tokens.accessTokenExpirationDate),
  ]);
}

async function loadTokens(): Promise<StoredTokens | null> {
  const [accessToken, refreshToken, accessTokenExpirationDate] = await Promise.all([
    getSecureItem(KEYS.accessToken),
    getSecureItem(KEYS.refreshToken),
    getSecureItem(KEYS.expiresAt),
  ]);

  if (!accessToken || !refreshToken || !accessTokenExpirationDate) {
    return null;
  }

  return { accessToken, refreshToken, accessTokenExpirationDate };
}

async function clearTokens(): Promise<void> {
  await Promise.all([
    deleteSecureItem(KEYS.accessToken),
    deleteSecureItem(KEYS.refreshToken),
    deleteSecureItem(KEYS.expiresAt),
  ]);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [tokens, setTokens] = useState<StoredTokens | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  // useAuthRequest wires up the OAuth 2.0 Authorization Code + PKCE flow.
  // `response` updates via expo-auth-session's own deep-link handling, which
  // is why this survives an Android Activity recreation mid-flow where
  // react-native-app-auth's plain in-memory Promise did not (see
  // authConfig.ts for the full explanation).
  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: appConfig.clientId,
      scopes: appConfig.graphScopes,
      redirectUri,
      responseType: AuthSession.ResponseType.Code,
      usePKCE: true,
    },
    discovery
  );

  useEffect(() => {
    (async () => {
      const stored = await loadTokens();
      setTokens(stored);
      setIsInitializing(false);
    })();
  }, []);

  // Handles the result of the Microsoft sign-in browser once it returns.
  useEffect(() => {
    if (!response) {
      return;
    }

    if (response.type === "success" && request) {
      (async () => {
        try {
          const tokenResult = await AuthSession.exchangeCodeAsync(
            {
              clientId: appConfig.clientId,
              code: response.params.code,
              redirectUri,
              extraParams: request.codeVerifier
                ? { code_verifier: request.codeVerifier }
                : undefined,
            },
            discovery
          );

          const newTokens: StoredTokens = {
            accessToken: tokenResult.accessToken,
            accessTokenExpirationDate: new Date(
              Date.now() + (tokenResult.expiresIn ?? 3600) * 1000
            ).toISOString(),
            refreshToken: tokenResult.refreshToken ?? "",
          };
          await saveTokens(newTokens);
          setTokens(newTokens);
        } catch (err) {
          console.log("[auth] token exchange failed:", err);
        }
      })();
    } else if (response.type === "error") {
      console.log("[auth] sign-in error:", response.error);
    }
    // "cancel"/"dismiss" response types mean the user closed the browser
    // without completing sign-in — nothing to do, they're just still on the
    // login screen.
  }, [response, request]);

  const signIn = async () => {
    await promptAsync();
  };

  const signOut = async () => {
    await clearTokens();
    setTokens(null);
  };

  const getAccessToken = async (): Promise<string> => {
    if (!tokens) {
      throw new Error("Not signed in");
    }

    const expiresAt = new Date(tokens.accessTokenExpirationDate).getTime();
    const isExpiringSoon = expiresAt - Date.now() < 60_000; // refresh a minute early

    if (!isExpiringSoon) {
      return tokens.accessToken;
    }

    if (!tokens.refreshToken) {
      throw new Error("Session expired — please sign in again");
    }

    const refreshed = await AuthSession.refreshAsync(
      {
        clientId: appConfig.clientId,
        refreshToken: tokens.refreshToken,
      },
      discovery
    );

    const newTokens: StoredTokens = {
      accessToken: refreshed.accessToken,
      accessTokenExpirationDate: new Date(
        Date.now() + (refreshed.expiresIn ?? 3600) * 1000
      ).toISOString(),
      // Microsoft doesn't always issue a new refresh token on every refresh —
      // keep the old one if a new one wasn't returned.
      refreshToken: refreshed.refreshToken ?? tokens.refreshToken,
    };
    await saveTokens(newTokens);
    setTokens(newTokens);
    return newTokens.accessToken;
  };

  const value = useMemo(
    () => ({ isSignedIn: !!tokens, isInitializing, signIn, signOut, getAccessToken }),
    [tokens, isInitializing]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
