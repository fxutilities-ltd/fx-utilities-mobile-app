import { appConfig } from "../config/appConfig";

/**
 * expo-auth-session talks to Microsoft's standard OAuth2/OIDC endpoints
 * directly (the "v2.0" Microsoft identity platform endpoints) — same
 * approach as react-native-app-auth before it, just via Expo's own
 * first-party auth library instead of a third-party native module.
 *
 * We switched here after react-native-app-auth turned out to have a known,
 * unresolved Android bug (FormidableLabs/react-native-app-auth#773): if
 * Android recreates the app's Activity while the Microsoft sign-in browser
 * is open (which can happen for reasons entirely outside our control, e.g.
 * a Chrome "partial height" Custom Tab resizing the app's window behind it),
 * the library's in-memory pending sign-in is silently lost — sign-in appears
 * to succeed, then the app is back at the login screen with no error at all.
 * expo-auth-session avoids this because it recovers the redirect via
 * Android's standard deep-link delivery mechanism (which survives Activity
 * recreation) rather than relying purely on an in-memory Promise reference.
 * See ARCHITECTURE.md §3 for the full story.
 */
export const discovery = {
  authorizationEndpoint: `https://login.microsoftonline.com/${appConfig.tenantId}/oauth2/v2.0/authorize`,
  tokenEndpoint: `https://login.microsoftonline.com/${appConfig.tenantId}/oauth2/v2.0/token`,
};

// A plain, hardcoded redirect URI — deliberately NOT using expo-auth-session's
// makeRedirectUri() helper, since that helper's main job is switching between
// Expo Go's proxy redirect and a standalone app's custom scheme, and this
// project only ever runs as a custom dev client / standalone build, never
// Expo Go. Using a fixed string here guarantees it always matches exactly
// what's registered in Entra ID (Authentication → Redirect URIs) and in
// app.json's top-level "scheme" field.
export const redirectUri = appConfig.redirectUri;
