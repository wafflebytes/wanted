/**
 * iOS 27 stops apps built with the 27 SDK at launch unless they adopt the UIScene life cycle
 * (UIKit's NoSceneLifecycleAdoption trap). Expo ships ExpoAppSceneDelegate for this, but the SDK 57
 * prebuild template still starts React Native from the app delegate. This plugin declares the
 * scene manifest and hands window creation to Expo's scene delegate.
 */
const { withAppDelegate, withInfoPlist } = require('expo/config-plugins');

const START_IN_APP_DELEGATE = /\n#if os\(iOS\) \|\| os\(tvOS\)\n\s*window = UIWindow\(frame: UIScreen\.main\.bounds\)\n\s*factory\.startReactNative\([\s\S]*?\)\n#endif\n/;

module.exports = function withSceneLifecycle(config) {
  config = withInfoPlist(config, (c) => {
    c.modResults.UIApplicationSceneManifest = {
      UIApplicationSupportsMultipleScenes: false,
      UISceneConfigurations: {
        UIWindowSceneSessionRoleApplication: [{ UISceneConfigurationName: 'Default Configuration', UISceneDelegateClassName: 'EXExpoAppSceneDelegate' }],
      },
    };
    return c;
  });
  return withAppDelegate(config, (c) => {
    if (c.modResults.language !== 'swift') throw new Error('withSceneLifecycle expects a Swift AppDelegate');
    let src = c.modResults.contents;
    if (!src.includes('ExpoReactNativeFactoryProvider')) {
      src = src.replace('class AppDelegate: ExpoAppDelegate {', 'class AppDelegate: ExpoAppDelegate, ExpoReactNativeFactoryProvider {');
    }
    // The scene delegate creates the window and starts React Native into it.
    src = src.replace(START_IN_APP_DELEGATE, '\n');
    if (!src.includes('ExpoReactNativeFactoryProvider') || src.includes('UIWindow(frame: UIScreen.main.bounds)')) {
      throw new Error('withSceneLifecycle: AppDelegate template changed; update the plugin');
    }
    c.modResults.contents = src;
    return c;
  });
};
