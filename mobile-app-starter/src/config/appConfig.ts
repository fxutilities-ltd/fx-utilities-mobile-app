/**
 * Central place for all the tenant-specific values this app needs.
 *
 * Fill these in once you've done the Entra ID app registration and looked up
 * your SharePoint site/list IDs — see README.md for exactly how to find each one.
 */

export const appConfig = {
  // --- From your Entra ID app registration (see README §1) ---
  // Directory (tenant) ID, e.g. "11111111-2222-3333-4444-555555555555"
  tenantId: "TODO_TENANT_ID",

  // Application (client) ID of the app you registered, e.g. "66666666-7777-8888-9999-aaaaaaaaaaaa"
  clientId: "TODO_CLIENT_ID",

  // The custom URL scheme registered in Entra ID's "Mobile and desktop
  // applications" redirect URI, and in plugins/withAzureAuth.js /
  // app.json's plugin config (they must all match exactly).
  redirectUri: "msauth.co.uk.fxutilities.mobileapp://auth",

  // --- Scopes requested at sign-in ---
  // openid/profile/offline_access are needed regardless of provider;
  // offline_access is what makes Microsoft issue a refresh token so the
  // user isn't forced to log in again every time the access token expires.
  // Sites.Read.Write.All is the simplest to start with — switch to the
  // narrower Sites.Selected for production (see ARCHITECTURE.md §6).
  graphScopes: [
    "openid",
    "profile",
    "offline_access",
    "https://graph.microsoft.com/User.Read",
    "https://graph.microsoft.com/Sites.Read.Write.All",
  ],

  // --- SharePoint site + list IDs (already looked up via Graph Explorer) ---
  annualLeave: {
    siteId: "fxutilities.sharepoint.com,36a40bac-cf7e-47c4-bea8-98233cad5ba8,819e8bd7-ae4b-411f-8044-eb4ee048527b",
    listId: "7892333b-0a2d-4819-a4c9-8d46900fea58", // "Leave Requests" list
  },
  purchaseOrders: {
    siteId: "fxutilities.sharepoint.com,e15c6b05-ef62-4769-a157-a8c9afa86e77,819e8bd7-ae4b-411f-8044-eb4ee048527b",
    listId: "ee10bf21-c1de-4954-8a35-5d6a22e60314", // "Purchase Orders" list
  },
};
