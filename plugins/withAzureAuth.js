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

  // --- Android: force MainActivity's launchMode to "singleTask", and make
  // it handle configuration changes itself instead of letting Android
  // recreate it ---
  //
  // singleTask (Expo's own default, set explicitly here as a safeguard) makes
  // sure the OAuth redirect is delivered to the existing MainActivity
  // instance via onNewIntent rather than spinning up a brand new one.
  //
  // configChanges is the fix for a DIFFERENT, narrower problem confirmed via
  // diagnostic logging: Chrome on Android 12+ can show the Microsoft sign-in
  // page as a "partial height" bottom-sheet Custom Tab rather than full
  // screen, which actually resizes the calling app's own window behind it.
  // If MainActivity doesn't declare that it handles that resize itself,
  // Android destroys and recreates the whole Activity in response — with a
  // FRESH component tree (signed out, as if just launched) — while the
  // original instance, still awaiting the sign-in result deep inside
  // react-native-app-auth's authorize(), is orphaned: it still resolves
  // successfully in the background, but nothing is left on screen to receive
  // that result. This is a known, unresolved upstream limitation of
  // react-native-app-auth on Android (see
  // https://github.com/FormidableLabs/react-native-app-auth/issues/773) —
  // the library has no way to recover a lost in-flight sign-in itself, so the
  // fix has to be preventing the recreation from happening in the first
  // place. Declaring the relevant configChanges tells Android "I'll handle
  // this resize myself" instead of tearing the Activity down.
  config = withAndroidManifest(config, (config) => {
    const application = config.modResults.manifest.application?.[0];
    const mainActivity = application?.activity?.find((activity) =>
      activity["$"]?.["android:name"]?.endsWith("MainActivity")
    );
    if (mainActivity) {
      mainActivity["$"]["android:launchMode"] = "singleTask";

      const requiredConfigChanges = [
        "keyboardHidden",
        "orientation",
        "screenSize",
        "screenLayout",
        "uiMode",
        "smallestScreenSize",
        "density",
        "fontScale",
        "layoutDirection",
        "colorMode",
      ];
      const existing = (mainActivity["$"]["android:configChanges"] || "")
        .split("|")
        .map((s) => s.trim())
        .filter(Boolean);
      const merged = Array.from(new Set([...existing, ...requiredConfigChanges]));
      mainActivity["$"]["android:configChanges"] = merged.join("|");
    }
    return config;
  });

  return config;
}

module.exports = withAzureAuth;