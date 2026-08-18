import { PublicClientApplication, MSALConfiguration } from "react-native-msal";
import { appConfig } from "../config/appConfig";

export const msalConfig: MSALConfiguration = {
  auth: {
    clientId: appConfig.clientId,
    authority: `https://login.microsoftonline.com/${appConfig.tenantId}`,
    // react-native-msal picks the right redirect URI per-platform internally
    // based on your native project config; the values in appConfig are for
    // reference when setting up the Entra ID app registration's redirect URIs.
  },
};

export const pca = new PublicClientApplication(msalConfig);

/** Call once at app startup before any sign-in attempt. */
export async function initMsal(): Promise<void> {
  await pca.init();
}
