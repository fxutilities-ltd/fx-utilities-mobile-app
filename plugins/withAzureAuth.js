const { withInfoPlist, withAndroidManifest, withAppBuildGradle } = require("@expo/config-plugins");

function withAzureAuth(config, { redirectUrlScheme }) {
  if (!redirectUrlScheme) {
    throw new Error(
      "withAzureAuth: you must pass a redirectUrlScheme, e.g. 'msauth.co.uk.fxutilities.mobileapp'"
    );
  }

  config = withInfoPlist(config, (config) => {
    config.modResults.CFBundleURLTypes = [
      ...(config.modResults.CFBundleURLTypes || []),
      { CFBundleURLSchemes: [redirectUrlScheme] },
    ];
    return config;
  });

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

  config = withAppBuildGradle(config, (config) => {
    const forceBlock = `\nconfigurations.all {\n    resolutionStrategy {\n        force "androidx.browser:browser:1.5.0"\n    }\n}\n`;
    if (!config.modResults.contents.includes("androidx.browser:browser")) {
      config.modResults.contents += forceBlock;
    }
    return config;
  });

  return config;
}

module.exports = withAzureAuth;