# Beginner's Guide: Setting Up the FX Utilities Mobile App

This guide assumes no prior experience with any of this. Follow it top to bottom, in order — each step depends on the one before it. Where a term might be unfamiliar, it's explained the first time it comes up, and there's a glossary at the end.

Rough total time: 1–2 hours the first time, most of it waiting for things to install/build rather than active work.

---

## Before you start: what you'll need

- **A Microsoft 365 work account** for FX Utilities, with permission to register apps in your organization's Entra ID (this used to be called "Azure AD"). If you're not sure you have this permission, ask whoever manages your IT/Microsoft 365 admin — this is normally an IT admin task, not something every employee can do.
- **A computer** (Mac or Windows) with the ability to install software.
- **About an hour of uninterrupted time** for the first setup — after that, running the app day-to-day is much quicker.

You do **not** need to know how to code to follow this guide. A few steps involve opening a text file and pasting in some values — that's as technical as it gets.

---

## Step 1: Install the tools

Open a terminal (on Mac: search for "Terminal" in Spotlight; on Windows: search for "PowerShell" or "Command Prompt") and type each of these one at a time, pressing Enter after each:

1. Install Node.js — this is what runs the app's code. Go to https://nodejs.org and download the "LTS" version, then run the installer like any other program. (You don't need the terminal for this one, just the website.)
2. Check it worked by typing:
   ```
   node -v
   ```
   You should see a version number appear (e.g. `v20.11.0`). If you see an error instead, restart your computer and try again.
3. Install the Expo build tool:
   ```
   npm install -g eas-cli
   ```
4. Create a free account at https://expo.dev if you don't already have one — you'll need to sign in from the terminal later.

---

## Step 2: Register the app with Microsoft (IT admin step)

This step tells Microsoft "this app is allowed to exist and ask people to sign in." It only needs to be done **once**, by someone with admin rights.

1. Go to https://entra.microsoft.com and sign in with your admin account.
2. In the left-hand menu, find **Applications**, then **App registrations**.
3. Click **New registration**.
4. Give it a name, e.g. `FX Utilities Mobile App`.
5. Under "Supported account types," leave it on the default option (accounts in your organization only) unless you're told otherwise.
6. Under "Redirect URI," change the dropdown to **"Mobile and desktop applications"**, then add this exact address:
   ```
   msauth.co.uk.fxutilities.mobileapp://auth
   ```
   (This is a made-up-looking web address that only this app understands — you don't need to visit it, just paste it in exactly as shown.)
7. Click **Register**.
8. You'll land on an overview page with two long codes you need to save somewhere safe (a notes app or document is fine for now):
   - **Application (client) ID**
   - **Directory (tenant) ID**
   Copy both of these — you'll paste them into the app's settings in Step 4.
9. In the left menu for this app, click **API permissions**, then **Add a permission**, then **Microsoft Graph**, then **Delegated permissions**. Search for and tick:
   - `User.Read`
   - `Sites.Read.Write.All`
   Click **Add permissions**.
10. Still on the API permissions page, click **Grant admin consent for [Your Organization]**, and confirm. This means individual staff won't see a scary permissions pop-up when they first sign in.

That's the admin part done — steps 3 onwards can be done by anyone setting up the app on their computer.

---

## Step 3: Find the two SharePoint lists the app needs

The app needs to know exactly which SharePoint list is "Annual Leave" and which is "Purchase Orders." You'll look this up using a free Microsoft tool called Graph Explorer — think of it as a way to "ask Microsoft a question" about your SharePoint site.

1. Go to https://developer.microsoft.com/en-us/graph/graph-explorer and sign in (top right) with your normal work account.
2. In the address-style box at the top, paste this, replacing `yourtenant` and `your-site-name` with your organization's real details (ask IT if unsure what these are):
   ```
   https://graph.microsoft.com/v1.0/sites/yourtenant.sharepoint.com:/sites/your-site-name
   ```
3. Click **Run query**. In the response at the bottom, find the field called `"id"` — it'll look like a long string with commas in it, e.g. `contoso.sharepoint.com,1111...,2222...`. Copy this whole value — this is your **site ID**.
4. Now paste this into the query box, replacing `SITE_ID` with what you just copied:
   ```
   https://graph.microsoft.com/v1.0/sites/SITE_ID/lists
   ```
5. Run it again. You'll get a list of every SharePoint list on that site, each with a `"displayName"` and an `"id"`. Find the ones named for Annual Leave and for Purchase Orders, and copy each of their `id` values — these are your **list IDs**.

Save these four values (site ID, Annual Leave list ID, PO list ID — note the site ID is likely the same for both if they're on the same SharePoint site) alongside the two IDs from Step 2.

---

## Step 4: Put your values into the app

1. Download and unzip the starter project you were given (`fx-utilities-mobile-app-starter.zip`).
2. Open the folder in any plain text editor. If you don't have one, install [Visual Studio Code](https://code.visualstudio.com) (free) — it makes this much easier to read.
3. Open the file `src/config/appConfig.ts`.
4. You'll see lines with `TODO_...` placeholder text (the site/list ID lines may already be filled in for you if IT already looked those up — only the Entra ID ones typically need doing). Replace each remaining one with the real value you saved earlier:
   - `TODO_TENANT_ID` → your Directory (tenant) ID from Step 2.8
   - `TODO_CLIENT_ID` → your Application (client) ID from Step 2.8
   - `TODO_SITE_ID` (appears twice, if not already filled in) → your site ID from Step 3.3
   - `TODO_ANNUAL_LEAVE_LIST_ID` / `TODO_PO_LIST_ID` (if not already filled in) → the list IDs from Step 3.5
5. Keep the quote marks around each value exactly as they were — just change the text inside them.
6. Save the file (Ctrl+S / Cmd+S).

There's no separate Android-specific redirect value to generate for this project — the same address from Step 2.6 works for both iOS and Android.

---

## Step 5: Install and run the app

Back in your terminal:

1. Move into the project folder:
   ```
   cd path/to/mobile-app-starter
   ```
   (Type `cd ` then drag the unzipped folder into the terminal window — it'll fill in the path for you.)
2. Install everything the app needs:
   ```
   npm install
   ```
   This might take a couple of minutes — that's normal.
3. Log in to Expo:
   ```
   eas login
   ```
4. Set up the build:
   ```
   eas build:configure
   ```
5. Build a version of the app you can actually install on your phone (this happens on Expo's servers, so it takes 10–20 minutes — you can leave it running):
   ```
   eas build --profile development --platform ios
   ```
   (Swap `ios` for `android` if you're testing on an Android phone instead.)
6. When it finishes, Expo gives you a link or QR code — open it on your phone to install the app, just like installing any other app.
7. Back in the terminal, start the app's "server":
   ```
   npm start
   ```
8. Open the app on your phone (the one you just installed, not Expo Go) — it should connect automatically.

---

## Step 6: Try it out

1. Tap **"Sign in with Microsoft 365"** — this opens the normal Microsoft login screen. Sign in as you normally would.
2. Once signed in, you should land on a Home screen showing your name.
3. Tap the **Annual Leave** or **Purchase Orders** tabs. If these show an error instead of a list, it usually means one of the columns in your SharePoint list has a different internal name than the app expects — see "Common problems" below.

---

## Common problems

**"Graph request failed (403)"** — This means Microsoft is saying "you're not allowed to see this." Usually it's because the API permissions from Step 2.9–2.10 weren't granted, or admin consent wasn't given. Ask your IT admin to double check.

**"Graph request failed (404)"** — The site ID or list ID is wrong or mistyped. Go back to Step 3 and re-copy them carefully — these IDs are long and easy to mistype.

**The leave/PO list loads but shows blank or wrong-looking data** — The column names in your real SharePoint list are different from the placeholder ones in the code (`StartDate`, `EndDate`, `Status`, etc.). This needs someone comfortable editing code to open `src/services/graphService.ts` and match the field names to your list's actual internal column names (found via the Graph Explorer query in the README's Step 2.3).

**Sign-in button does nothing / opens and immediately closes** — Double check the redirect URI in Step 2.6 was typed exactly, with no extra spaces, and matches what's in `appConfig.ts`.

**"eas build" fails** — Make sure you ran `eas login` first and that you're connected to the internet. If it still fails, copy the exact error text and share it with whoever is helping you set this up technically.

---

## Glossary

- **Entra ID** — Microsoft's system for managing user accounts and sign-ins for an organization (previously called "Azure AD"). This is what handles the "Sign in with Microsoft 365" button.
- **App registration** — Telling Microsoft "this specific app exists and is allowed to ask people to sign in." A one-time setup step done by an admin.
- **Tenant ID** — A unique code identifying your organization within Microsoft 365.
- **Client ID** — A unique code identifying this specific app.
- **Microsoft Graph** — Microsoft's system for letting an app read/write data (emails, files, SharePoint lists, etc.) on a signed-in user's behalf.
- **SharePoint site ID / list ID** — Unique codes identifying exactly which SharePoint site and which list within it the app should talk to.
- **react-native-app-auth** — The piece of software that handles the actual sign-in process securely (opening the Microsoft login page and exchanging the result for a token). You don't interact with it directly — it works in the background.
- **Expo / EAS Build** — The tools used to turn this project's code into an actual installable app for your phone.
- **Dev client** — A special version of the app (built via EAS) that includes the sign-in software. Needed because the free "Expo Go" app doesn't support it.

---

If you get stuck at any point, note down exactly which step you were on and any error message you saw — that's the fastest way for anyone helping you to figure out what went wrong.
