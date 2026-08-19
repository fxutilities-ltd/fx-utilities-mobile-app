# FX Utilities Mobile App — Architecture & Design Doc

**Author:** Claude (drafted for Chris Walton, FX Utilities Team)
**Date:** 2026-08-17
**Status:** Draft v3 — updated after real-device setup found two problems in turn with the sign-in library: the original (`react-native-msal`) is unmaintained and its Expo plugin crashes; its replacement (`react-native-app-auth`) has a known, unresolved Android bug where the app can lose an in-progress sign-in if Android recreates its Activity mid-flow. Now using `expo-auth-session`. See §3 and §9.

## 1. Goal

A single mobile app (iOS + Android) that:

1. Signs users in with their Microsoft 365 (Entra ID) work account.
2. Lets them view and submit requests against the existing **Annual Leave** system.
3. Lets them view and raise entries in the existing **PO (Purchase Order)** system.

Both existing systems are SharePoint lists, so no new backend needs to be built — the app talks directly to SharePoint through the **Microsoft Graph API**, using the same identity the user already has in Microsoft 365.

## 2. High-level architecture

```
┌─────────────────────────────┐
│   Mobile App (React Native) │
│                              │
│  ┌────────────┐  ┌────────┐ │
│  │ Login       │  │ Screens│ │
│  │ (app-auth)  │  │ - Home │ │
│  └─────┬──────┘  │ - Leave│ │
│        │          │ - PO   │ │
│        │          └───┬────┘ │
│        │              │      │
│        ▼              ▼      │
│  ┌───────────────────────┐   │
│  │  Graph Service layer  │   │
│  └───────────┬───────────┘   │
└──────────────┼───────────────┘
               │ HTTPS + Bearer token
               ▼
      ┌──────────────────────┐
      │  Microsoft Graph API │
      └──────────┬───────────┘
                  ▼
      ┌──────────────────────┐
      │   SharePoint Online   │
      │  - Annual Leave list  │
      │  - PO list            │
      └──────────────────────┘
```

There is no custom middle-tier server. The mobile app authenticates the user directly against Entra ID, gets a token scoped for Microsoft Graph, and calls Graph's SharePoint list endpoints directly. This keeps the system simple and means all access control is inherited from the SharePoint list permissions the user already has (so someone who can't see the PO list in a browser can't see it in the app either).

## 3. Authentication flow (MS365 login)

- **Identity provider:** Microsoft Entra ID (Azure AD), the same tenant as the rest of Microsoft 365.
- **Library:** [`expo-auth-session`](https://docs.expo.dev/versions/latest/sdk/auth-session/) (Expo's own first-party OAuth/OIDC library), talking to the Microsoft identity platform's standard "v2.0" endpoints directly. This is our **second** replacement for the original sign-in library:
  1. We originally spec'd Microsoft's own `react-native-msal` — its Expo config plugin crashed silently with current Expo tooling, and the underlying project turned out to be unmaintained.
  2. We replaced it with `react-native-app-auth` — actively maintained and Azure-AD-tested, but real-device testing (on a Samsung Galaxy S26+) uncovered a known, unresolved Android bug ([FormidableLabs/react-native-app-auth#773](https://github.com/FormidableLabs/react-native-app-auth/issues/773), open, "issue-accepted", no released fix): the library keeps its pending sign-in purely in an in-memory native module variable. If Android recreates the app's Activity while the Microsoft sign-in browser is open — which can happen for reasons outside our control, e.g. a Chrome "partial height" Custom Tab resizing the app's window behind it — that in-memory state is silently lost. Diagnostic logging confirmed this precisely: `authorize()` resolved successfully and `setTokens()` ran, but on a component instance that had already been replaced by a freshly-mounted one, so the user just saw the login screen again with no error. We tried the two standard native mitigations (`android:launchMode="singleTask"`, and declaring `android:configChanges` so Android wouldn't recreate the Activity on that resize) — both correct things to have in place, but neither fixed it, confirming this really was the library's own limitation rather than a config gap.
  3. `expo-auth-session` avoids this because `useAuthRequest`'s `response` is derived from Android's standard deep-link delivery mechanism (the same one `Linking` uses), which is redelivered reliably even to a freshly-recreated Activity — rather than depending on a single in-memory Promise reference tied to one specific component instance. It also needs no custom native config plugin at all (Expo's own `app.json` `"scheme"` field handles the redirect URI registration on both platforms automatically), so the hand-rolled `plugins/withAzureAuth.js` config plugin from the `react-native-app-auth` era has been removed entirely.
- **Flow used:** OAuth 2.0 Authorization Code with PKCE (`AuthSession.exchangeCodeAsync` for the initial code exchange, `AuthSession.refreshAsync` for silent refresh).
- **Scopes requested:** `openid`, `profile`, `offline_access` (needed to get a refresh token), plus `https://graph.microsoft.com/User.Read` and `https://graph.microsoft.com/Sites.ReadWrite.All` (or the narrower `Sites.Selected` — see §6 note on permissions).

Sequence:

1. User opens the app and taps "Sign in with Microsoft 365".
2. `promptAsync()` opens the device's secure system browser to the tenant's login page.
3. User authenticates (including any MFA the org requires).
4. `expo-auth-session` receives the auth code via Android/iOS's deep-link mechanism, and the app exchanges it for an access token + refresh token. The app stores both in OS-level secure storage (Keychain on iOS, Keystore-backed on Android) via `expo-secure-store`.
5. The app calls Microsoft Graph with `Authorization: Bearer <token>`.
6. On subsequent app opens, the stored refresh token is used to silently get a new access token in the background — no re-login needed unless the org's session policy forces it or the refresh token itself expires.

## 4. Data access: Annual Leave & PO systems

Both systems are modeled as SharePoint lists, so both are read/written the same way, via Graph's list-items endpoints:

- Read items: `GET /sites/{site-id}/lists/{list-id}/items?expand=fields`
- Create item (e.g. submit a leave request or raise a PO): `POST /sites/{site-id}/lists/{list-id}/items`
- Update item (e.g. approve/reject): `PATCH /sites/{site-id}/lists/{list-id}/items/{item-id}/fields`
- Delete item: `DELETE /sites/{site-id}/lists/{list-id}/items/{item-id}`

The app needs the **site ID** and **list ID** for each system once, at setup time (these are stable and go into app config, not hardcoded per-user). See the README for how to look these up with Graph Explorer.

The starter code includes a `graphService.ts` with typed functions for both lists (`getLeaveRequests`, `submitLeaveRequest`, `getPurchaseOrders`, `createPurchaseOrder`, etc.) built on a shared authenticated fetch helper. The actual field names (column internal names) in each list need to be filled in once you confirm them — placeholders are marked `TODO` in the code.

## 5. App structure (React Native / Expo)

- **Framework:** Expo (React Native), using a custom **dev client** (not Expo Go) because `expo-secure-store` and other native modules used here require it. Built and distributed via **EAS Build**.
- **Navigation:** React Navigation (stack + bottom tabs).
- **Screens:**
  - `LoginScreen` — MS365 sign-in button, shows spinner during auth.
  - `HomeScreen` — landing dashboard with shortcuts to both systems and the user's profile (name/photo from Graph `/me`).
  - `AnnualLeaveScreen` — list of the user's leave requests + a "request leave" form.
  - `PurchaseOrdersScreen` — list of POs + a "raise PO" form.
- **State:** React Context for auth state (`AuthContext`) holding the signed-in/out flag and a `getAccessToken()` helper the Graph service uses, which silently refreshes the token when it's close to expiring.

## 6. Permissions & security notes

- Use **least-privilege Graph permissions**. `Sites.Selected` (delegated) restricts the app to only the specific SharePoint sites an admin grants, rather than every site in the tenant — recommended over the broader `Sites.ReadWrite.All` for a production rollout. The starter code works with either; switch the scope once IT decides.
- All data access happens under the signed-in user's own permissions (delegated flow) — the app itself has no standing access beyond what each user already has. This means existing list permissions (e.g. only approvers can edit certain fields) continue to apply automatically.
- Tokens are cached only in OS-level secure storage (Keychain/Keystore) via `expo-secure-store`; nothing is stored in plain text or synced elsewhere.
- No secrets are embedded in the mobile app binary beyond the public Client ID and Tenant ID, which are not sensitive (this is standard for public/native OAuth clients — there's no client secret in a mobile app).

## 7. What needs to happen in Entra ID / Microsoft 365 admin (one-time setup)

This part needs an admin with rights to register apps in your tenant (see README for exact steps):

1. Register a new app in Entra ID ("FX Utilities Mobile App" or similar).
2. Set it up as a **public client / native app** (mobile + desktop platform), with a single custom-scheme redirect URI matching `app.json`'s `"scheme"` field (the same one on both iOS and Android — see README §1).
3. Add delegated Graph permissions: `User.Read`, and either `Sites.Selected` (recommended, then grant it access to the two specific SharePoint sites) or `Sites.ReadWrite.All`.
4. Grant admin consent for the tenant (so individual users aren't prompted to consent, or are prompted with a simpler screen).
5. Note down the **Application (client) ID** and **Directory (tenant) ID** — these go into the app's config.

## 8. Open items / decisions still needed

- Confirm exact **site URLs** and **list names/columns** for the Annual Leave and PO lists so the Graph service's field mappings can be finalized (currently placeholders).
- Decide `Sites.Selected` vs broader permission — affects admin consent step above.
- Decide on push notifications for approvals (e.g. manager gets notified when a leave request needs sign-off) — out of scope for this first version but straightforward to add later via Graph webhooks + a small notification relay.
- App branding/icons, and whether this ships via the Apple App Store / Google Play or as an internal/enterprise distribution (Apple Business Manager / Android Enterprise) — internal distribution is usually simpler for an internal-only tool like this.

## 9. What's included in the starter code

- Expo React Native project scaffold with TypeScript.
- `expo-auth-session` sign-in wired up (`src/auth/`) — no custom native config plugin needed; the redirect URL scheme is registered via `app.json`'s top-level `"scheme"` field.
- Graph service layer with the SharePoint list calls described above (`src/services/graphService.ts`).
- The four screens listed in §5 with basic UI and navigation.
- `README.md` with full setup steps, including the Entra ID admin steps and how to find your site/list IDs.

This is a working skeleton, not a finished product — the TODOs in the code mark exactly where your list's real field names and IDs need to go in.
