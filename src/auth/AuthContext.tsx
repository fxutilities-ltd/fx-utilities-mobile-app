import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { MSALAccount } from "react-native-msal";
import { pca, initMsal } from "./authConfig";
import { appConfig } from "../config/appConfig";

interface AuthContextValue {
  account: MSALAccount | null;
  isInitializing: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  /** Returns a valid Graph access token, refreshing silently if needed. */
  getAccessToken: () => Promise<string>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [account, setAccount] = useState<MSALAccount | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    (async () => {
      await initMsal();
      const accounts = await pca.getAccounts();
      if (accounts.length > 0) {
        setAccount(accounts[0]);
      }
      setIsInitializing(false);
    })();
  }, []);

  const signIn = async () => {
    const result = await pca.acquireToken({ scopes: appConfig.graphScopes });
    setAccount(result.account);
  };

  const signOut = async () => {
    if (account) {
      await pca.removeAccount(account);
      setAccount(null);
    }
  };

  const getAccessToken = async (): Promise<string> => {
    if (!account) {
      throw new Error("Not signed in");
    }
    // Tries cache/refresh-token silently first; MSAL falls back to an
    // interactive prompt automatically if that's not possible (e.g. the
    // refresh token expired or conditional access requires re-auth).
    const result = await pca.acquireTokenSilent({
      scopes: appConfig.graphScopes,
      account,
    });
    return result.accessToken;
  };

  const value = useMemo(
    () => ({ account, isInitializing, signIn, signOut, getAccessToken }),
    [account, isInitializing]
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
