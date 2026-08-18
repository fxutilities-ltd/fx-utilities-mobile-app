const { withInfoPlist, withAppBuildGradle, withAndroidManifest } = require("@expo/config-plugins");

/**
 * A small, self-contained Expo config plugin that wires up the custom URL
 * scheme react-native-app-auth needs to receive the redirect back from the
 * Microsoft sign-in page, on both iOS and Android.
 *
 * We wrote this ourselves (rather than depending on a third-party package's
 * plugin) because react-native-app-auth doesn't ship one, and hand-rolling
 * this is far more reliable than trusting an unmaintained dependency's
 * plugin code — see ARCHITECTURE.md for the story on why.
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

  config = withAppBuildGradle(config, (config) => {
    let contents = config.modResults.contents;

    // --- Android: react-native-app-auth ships its own RedirectUriReceiverActivity
    // with an intent-filter that references a Gradle manifest placeholder called
    // appAuthRedirectScheme — this is the library's documented way of wiring up
    // the redirect scheme on Android (see FormidableLabs/react-native-app-auth
    // README, "Android setup"). Without this, the build fails at manifest-merge
    // time with "requires a placeholder substitution but no value ... is provided".
    if (!contents.includes("appAuthRedirectScheme")) {
      contents = contents.replace(
        /(defaultConfig\s*\{)/,
        `$1\n        manifestPlaceholders = [appAuthRedirectScheme: "${redirectUrlScheme}"]`
      );
    }

    // NOTE: we do NOT force a specific androidx.browser version here (we
    // tried that — see git history / ARCHITECTURE.md §3 — and it caused a
    // runtime crash instead). react-native-app-auth@8.4.0+ bumped its own
    // dependency to androidx.browser:browser:1.9.0 and started calling
    // CustomTabsIntent.Builder#setEphemeralBrowsingEnabled(), a method that
    // only exists in that newer androidx.browser version. Forcing an older
    // browser version down (e.g. 1.5.0) lets the build compile, but crashes
    // at runtime with "No virtual method setEphemeralBrowsingEnabled..."
    // because the library's own compiled code calls a method the forced-down
    // version doesn't have. androidx.browser 1.9.0 itself requires compileSdk
    // 36 / Android Gradle Plugin 8.9.1+, which this Expo SDK's toolchain
    // (compileSdk 34) doesn't support without a much bigger upgrade. So
    // instead we pin react-native-app-auth itself to 8.3.0 in package.json —
    // the last release before the androidx.browser 1.9.0 requirement was
    // introduced — which brings its own compatible, older androidx.browser
    // dependency automatically. No forcing needed.

    config.modResults.contents = contents;
    return config;
  });

  // --- Android: force MainActivity's launchMode to "singleTask" ---
  // This is Expo's own default for exactly this reason, but we set it
  // explicitly here as a safeguard rather than trusting it stays that way.
  // Without singleTask, when Chrome hands control back to the app after the
  // Microsoft login redirect, Android can spin up a BRAND NEW instance of
  // MainActivity instead of returning to the one that's actually waiting for
  // the sign-in result. That new instance boots up fresh (signed out, as if
  // the app just launched), while the original instance — still holding the
  // in-progress sign-in — is orphaned and never resolves or rejects. The
  // symptom is exactly "sign-in appears to work, then it's back at the login
  // screen" with no error at all, because nothing ever actually throws.
  // singleTask ensures the redirect is delivered to the existing instance
  // via onNewIntent instead of creating a new one.
  config = withAndroidManifest(config, (config) => {
    const application = config.modResults.manifest.application?.[0];
    const mainActivity = application?.activity?.find((activity) =>
      activity["$"]?.["android:name"]?.endsWith("MainActivity")
    );
    if (mainActivity) {
      mainActivity["$"]["android:launchMode"] = "singleTask";
    }
    return config;
  });

  return config;
}

module.exports = withAzureAuth;