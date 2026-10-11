// Not part of the bug. Apps built with the iOS 27 SDK trap at launch unless they adopt the
// UIScene lifecycle (expo/expo#46664). Expo ships EXExpoAppSceneDelegate for this, but its
// expo-uiscene-lifecycle config plugin is not on npm yet, so this file makes the same two edits.
const { withAppDelegate, withInfoPlist } = require('expo/config-plugins');

const LEGACY_WINDOW_STARTUP = `#if os(iOS) || os(tvOS)
    window = UIWindow(frame: UIScreen.main.bounds)
    factory.startReactNative(
      withModuleName: "main",
      in: window,
      launchOptions: launchOptions)
#endif
`;

module.exports = (config) => {
  config = withInfoPlist(config, (c) => {
    c.modResults.UIApplicationSceneManifest = {
      UIApplicationSupportsMultipleScenes: false,
      UISceneConfigurations: {
        UIWindowSceneSessionRoleApplication: [
          {
            UISceneConfigurationName: 'Default Configuration',
            UISceneDelegateClassName: 'EXExpoAppSceneDelegate',
          },
        ],
      },
    };
    return c;
  });
  return withAppDelegate(config, (c) => {
    const source = c.modResults.contents;
    if (!source.includes(LEGACY_WINDOW_STARTUP)) {
      throw new Error('with-uiscene-lifecycle: AppDelegate template changed; update the plugin.');
    }
    c.modResults.contents = source
      .replace(LEGACY_WINDOW_STARTUP, '')
      .replace(
        'class AppDelegate: ExpoAppDelegate {',
        'class AppDelegate: ExpoAppDelegate, ExpoReactNativeFactoryProvider {',
      );
    return c;
  });
};
