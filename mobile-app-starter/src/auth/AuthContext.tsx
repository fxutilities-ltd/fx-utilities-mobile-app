import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import * as SecureStore from "expo-secure-store";
import { authorize, refresh, AuthorizeResult, RefreshResult } from "react-native-app-auth";
import { authConfig } from "./authConfig";

const STORAGE_KEY = "fxUtilities.auth.tokens";

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
  // storage (Android) — the same kind of secure storage MSAL uses internally,
  // we're just managing it ourselves here.
  await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(tokens));
}

async function loadTokens(): Promise<StoredTokens | null> {
  const raw = await SecureStore.getItemAsync(STORAGE_KEY);
  return raw ? (JSON.parse(raw) as StoredTokens) : null;
}

async function clearTokens(): Promise<void> {
  await SecureStore.deleteItemAsync(STORAGE_KEY);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [tokens, setTokens] = useState<StoredTokens | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    (async () => {
      const stored = await loadTokens();
      setTokens(stored);
      setIsInitializing(false);
    })();
  }, []);

  const signIn = async () => {
    const result: AuthorizeResult = await authorize(authConfig);
    const newTokens: StoredTokens = {
      accessToken: result.accessToken,
      accessTokenExpirationDate: result.accessTokenExpirationDate,
      refreshToken: result.refreshToken,
    };
    await saveTokens(newTokens);
    setTokens(newTokens);
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

    const result: RefreshResult = await refresh(authConfig, {
      refreshToken: tokens.refreshToken,
    });
    const newTokens: StoredTokens = {
      accessToken: result.accessToken,
      accessTokenExpirationDate: result.accessTokenExpirationDate,
      // Microsoft doesn't always issue a new refresh token on every refresh —
      // keep the old one if a new one wasn't returned.
      refreshToken: result.refreshToken ?? tokens.refreshToken,
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
