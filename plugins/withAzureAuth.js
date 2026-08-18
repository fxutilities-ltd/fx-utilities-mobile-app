const { withInfoPlist, withAppBuildGradle } = require("@expo/config-plugins");

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

  config = withAppBuildGradle(config, (config) => {
    let contents = config.modResults.contents;

    if (!contents.includes("appAuthRedirectScheme")) {
      contents = contents.replace(
        /(defaultConfig\s*\{)/,
        `$1\n        manifestPlaceholders = [appAuthRedirectScheme: "${redirectUrlScheme}"]`
      );
    }

    if (!contents.includes("androidx.browser:browser:1.5.0")) {
      contents += `\nconfigurations.all {\n    resolutionStrategy {\n        force "androidx.browser:browser:1.5.0"\n    }\n}\n`;
    }

    config.modResults.contents = contents;
    return config;
  });

  return config;
}

module.exports = withAzureAuth;