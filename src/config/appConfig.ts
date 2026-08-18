/**
 * Central place for all the tenant-specific values this app needs.
 *
 * Fill these in once you've done the Entra ID app registration and looked up
 * your SharePoint site/list IDs — see README.md for exactly how to find each one.
 */

export const appConfig = {
  // --- From your Entra ID app registration (see README §1) ---
  // Directory (tenant) ID, e.g. "11111111-2222-3333-4444-555555555555"
  tenantId: "ac15f2cd-eead-4c3f-9cf5-999e316fbb4d",

  // Application (client) ID of the app you registered, e.g. "66666666-7777-8888-9999-aaaaaaaaaaaa"
  clientId: "8687cba5-12f4-4038-bc79-50dcebf5f94e",

  // Must match the bundle identifier / package name in app.json
  iosRedirectUri: "msauth.co.uk.fxutilities.mobileapp://auth",
  androidRedirectUri: "msauth://co.uk.fxutilities.mobileapp/CALLBACK_SIGNATURE_HASH_HERE",

  // --- Graph scopes requested at sign-in ---
  // Sites.Selected is recommended for production (admin grants access to just
  // the two sites below). Sites.Read.Write.All is broader and simpler to get
  // started with while you're prototyping. See README §2.
  graphScopes: ["User.Read", "Sites.Read.Write.All"],

  // --- SharePoint site + list IDs (see README §3 for how to find these) ---
  annualLeave: {
    siteId: "fxutilities.sharepoint.com,36a40bac-cf7e-47c4-bea8-98233cad5ba8,819e8bd7-ae4b-411f-8044-eb4ee048527b", // e.g. "contoso.sharepoint.com,GUID,GUID"
    listId: "7892333b-0a2d-4819-a4c9-8d46900fea58",
  },
  purchaseOrders: {
    siteId: "fxutilities.sharepoint.com,e15c6b05-ef62-4769-a157-a8c9afa86e77,819e8bd7-ae4b-411f-8044-eb4ee048527b",
    listId: "ee10bf21-c1de-4954-8a35-5d6a22e60314",
  },
};
