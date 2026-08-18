import { AuthConfiguration } from "react-native-app-auth";
import { appConfig } from "../config/appConfig";

/**
 * react-native-app-auth talks to Microsoft's standard OAuth2/OIDC endpoints
 * directly (the "v2.0" Microsoft identity platform endpoints), rather than
 * going through a Microsoft-specific SDK like MSAL. Functionally this gets
 * you the same sign-in flow — it's just a more generic, actively maintained
 * library. See ARCHITECTURE.md for why we ended up here instead of MSAL.
 */
export const authConfig: AuthConfiguration = {
  issuer: `https://login.microsoftonline.com/${appConfig.tenantId}/v2.0`,
  clientId: appConfig.clientId,
  redirectUrl: appConfig.redirectUri,
  scopes: appConfig.graphScopes,
  serviceConfiguration: {
    authorizationEndpoint: `https://login.microsoftonline.com/${appConfig.tenantId}/oauth2/v2.0/authorize`,
    tokenEndpoint: `https://login.microsoftonline.com/${appConfig.tenantId}/oauth2/v2.0/token`,
  },
};
