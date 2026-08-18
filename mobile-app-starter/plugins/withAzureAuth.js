const { withInfoPlist, withAndroidManifest } = require("@expo/config-plugins");

/**
 * A small, self-contained Expo config plugin that registers the custom URL
 * scheme react-native-app-auth needs to receive the redirect back from the
 * Microsoft sign-in page, on both iOS and Android.
 *
 * We wrote this ourselves (rather than depending on a third-party package's
 * plugin) because react-native-app-auth doesn't ship one, and hand-rolling
 * this ~30-line plugin is far more reliable than trusting an unmaintained
 * dependency's plugin code — see ARCHITECTURE.md for the story on why.
 *
 * Usage in app.json:
 *   "plugins": [
 *     ["./plugins/withAzureAuth.js", { "redirectUrlScheme": "msauth.co.uk.fxutilities.mobileapp" }]
 *   ]
 */
function withAzureAuth(config, { redirectUrlScheme }) {
  if (!redirectUrlScheme) {
    throw new Error(
      "withAzureAuth: you must pass a redirectUrlScheme, e.g. 'msauth.co.uk.fxutilities.mobileapp'"
    );
  }

  // --- iOS: register the URL scheme in Info.plist ---
  config = withInfoPlist(config, (config) => {
    config.modResults.CFBundleURLTypes = [
      ...(config.modResults.CFBundleURLTypes || []),
      { CFBundleURLSchemes: [redirectUrlScheme] },
    ];
    return config;
  });

  // --- Android: register an intent filter on MainActivity in AndroidManifest.xml ---
  config = withAndroidManifest(config, (config) => {
    const mainApplication = config.modResults.manifest.application?.[0];
    const mainActivity = mainApplication?.activity?.find(
      (activity) => activity.$["android:name"] === ".MainActivity"
    );

    if (mainActivity) {
      mainActivity["intent-filter"] = mainActivity["intent-filter"] || [];
      mainActivity["intent-filter"].push({
        action: [{ $: { "android:name": "android.intent.action.VIEW" } }],
        category: [
          { $: { "android:name": "android.intent.category.DEFAULT" } },
          { $: { "android:name": "android.intent.category.BROWSABLE" } },
        ],
        data: [{ $: { "android:scheme": redirectUrlScheme } }],
      });
    }

    return config;
  });

  return config;
}

module.exports = withAzureAuth;
