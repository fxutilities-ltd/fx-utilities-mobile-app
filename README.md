# FX Utilities Mobile App — Starter

Cross-platform (iOS + Android) React Native/Expo app that signs in with Microsoft 365
and reads/writes the **Annual Leave** and **PO** SharePoint lists via Microsoft Graph.

See `ARCHITECTURE.md` (in the parent folder / project docs) for the full design
rationale. This README is the practical setup checklist.

## 0. Prerequisites

- Node.js 18+ and npm
- An Expo account (free) — https://expo.dev
- `eas-cli`: `npm install -g eas-cli`
- Xcode (for iOS builds) and/or Android Studio (for Android builds)
- An Entra ID (Azure AD) account with permission to register apps in your tenant,
  or an admin who can do this step for you

## 1. Register the app in Entra ID

This is a one-time admin task.

1. Go to https://entra.microsoft.com → **Applications → App registrations → New registration**.
2. Name it something like `FX Utilities Mobile App`.
3. Under **Supported account types**, choose "Accounts in this organizational directory only" (single tenant), unless you need multi-tenant.
4. Under **Redirect URI**, choose platform **"Mobile and desktop applications"** and add:
   - `msauth.co.uk.fxutilities.mobileapp://auth` (adjust if you change the bundle ID / package name in `app.json`)
   - That's the only redirect URI needed — unlike some Microsoft-specific auth libraries, this project's library (`react-native-app-auth`) uses the same plain custom URL scheme on both iOS and Android, so there's no separate Android signature-hash value to generate.
5. Register the app, then copy the **Application (client) ID** and **Directory (tenant) ID** from the Overview page into `src/config/appConfig.ts`.
6. Go to **API permissions → Add a permission → Microsoft Graph → Delegated permissions**, and add:
   - `User.Read`
   - `Sites.Read.Write.All` (simplest to start with) **or** `Sites.Selected` (recommended for production — see step 7)
7. If you used `Sites.Selected`: an admin needs to separately grant this app access to the two specific SharePoint sites (Annual Leave and PO) using either the SharePoint admin center's "Site permissions for Sites.Selected" workflow or a Graph API call — see https://learn.microsoft.com/en-us/sharepoint/dev/solution-guidance/security-apponly-azuread#restricting-sitesselected-permissions.
8. Click **Grant admin consent** for your tenant so users aren't shown a raw permissions consent screen.

## 2. Find your SharePoint site and list IDs

You'll need these for `src/config/appConfig.ts`. Easiest way is Graph Explorer (https://developer.microsoft.com/en-us/graph/graph-explorer), signed in with your work account:

1. Get the site ID:
   `GET https://graph.microsoft.com/v1.0/sites/{your-tenant}.sharepoint.com:/sites/{site-name}`
   → copy the `id` field from the response (looks like `contoso.sharepoint.com,GUID,GUID`).
2. List the lists on that site to find the Annual Leave and PO lists:
   `GET https://graph.microsoft.com/v1.0/sites/{site-id}/lists`
   → copy the `id` of each list you need.
3. Check each list's real column (field) internal names — these can differ from what's shown in the SharePoint UI:
   `GET https://graph.microsoft.com/v1.0/sites/{site-id}/lists/{list-id}/columns`
   → update the field names in `src/services/graphService.ts` (`LeaveRequestFields`, `PurchaseOrderFields`, and the `mapLeaveFields`/`mapPoFields`/submit functions) to match.

## 3. Fill in config

Edit `src/config/appConfig.ts` and replace every `TODO_...` placeholder with the
values from steps 1 and 2.

## 4. Install dependencies

```bash
npm install
```

Then double-check the two auth-related packages are the exact versions Expo
wants for your installed SDK (safer than trusting any hardcoded version
number, including the ones in this starter):

```bash
npx expo install react-native-app-auth expo-secure-store
```

## 5. Why you need a dev client (not Expo Go)

`react-native-app-auth` uses native code (via each platform's system browser,
through Apple's AppAuth-iOS and Google's AppAuth-Android libraries under the
hood), which Expo Go doesn't include. You need a custom **development
build** instead — this is a one-time extra step, not a different framework.

```bash
eas login
eas build:configure
eas build --profile development --platform ios      # or --platform android
```

Install the resulting build on your device/simulator, then run:

```bash
npm start
```

and open the app from your dev build (not Expo Go).

## 6. What to check once it's running

- Sign-in should open the Microsoft login page and return you to the app signed in.
- The Home tab should show your display name (confirms the `User.Read` scope and `/me` call work).
- The Annual Leave and Purchase Orders tabs will error until the `TODO`s in
  `appConfig.ts` and the field names in `graphService.ts` are filled in with
  your real site/list/column details — that's expected for a fresh checkout.

## Project structure

```
App.tsx                          Root component, decides Login vs main app
plugins/withAzureAuth.js         Our own small Expo config plugin (registers the login redirect URL scheme)
src/config/appConfig.ts          All tenant-specific IDs and scopes (fill in TODOs)
src/auth/authConfig.ts           react-native-app-auth OAuth/OIDC config
src/auth/AuthContext.tsx         React context: sign-in/out, token storage, silent refresh
src/services/graphService.ts     Microsoft Graph calls for both SharePoint lists
src/navigation/AppNavigator.tsx  Bottom-tab navigation
src/screens/                     LoginScreen, HomeScreen, AnnualLeaveScreen, PurchaseOrdersScreen
```

## A note on why this isn't using MSAL

The first version of this starter used Microsoft's `react-native-msal` library.
While testing setup, we found its Expo config plugin crashes silently with
current Expo tooling — and it turns out the underlying project is no longer
actively maintained. Rather than fight an unmaintained dependency, this
version uses `react-native-app-auth` (actively maintained, explicitly tested
against Azure AD/Entra ID) plus a small config plugin we wrote ourselves
(`plugins/withAzureAuth.js`) instead of relying on a third party's. Sign-in
still goes through the same Microsoft login page and Entra ID app
registration — nothing about the Entra ID admin setup changes.

## Next steps beyond this starter

- Add proper date pickers instead of free-text date fields on the leave request form.
- Add pull-to-refresh error states / offline handling.
- Consider push notifications for approvals (see ARCHITECTURE.md §8).
- Replace `assets/icon.png` and `assets/adaptive-icon.png` with real branded artwork — these are just simple placeholder images for now (they had to exist for the build to succeed at all, but they're not final).
- Decide on internal distribution (TestFlight / Google Play internal testing, or MDM-based enterprise distribution) before rolling out beyond a pilot group.
