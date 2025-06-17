const ENABLE_BUILD_PLUGIN = process.env.SHOULD_ENABLE_NINJA_BUILD_PLUGIN === 'true';

export default {
  expo: {
    name: "Link Notes",
    slug: "link-notes",
    version: "0.1.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "linknotes",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    ios: {
      supportsTablet: true,
      infoPlist: {
        "UIViewControllerBasedStatusBarAppearance": false
      }
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/images/icon.png",
        backgroundColor: "#ffffff"
      },
      package: "com.tranquildev.linknotes",
      edgeToEdgeEnabled: true,
      permissions: [
        "android.permission.WRITE_EXTERNAL_STORAGE",
        "android.permission.READ_EXTERNAL_STORAGE",
        "android.permission.MANAGE_EXTERNAL_STORAGE",
        "android.permission.BIND_QUICK_SETTINGS_TILE"
      ]
    },
    web: {
      bundler: "metro",
      output: "single",
      favicon: "./assets/images/favicon.png"
    },
    plugins: [
      "expo-router",
      "expo-font",
      "expo-web-browser",
      "expo-document-picker",
      "./plugins/quick-settings-tile-plugin.js",
      ...(ENABLE_BUILD_PLUGIN ? ["./plugins/android-build-config-plugin.js"] : [])
    ],
    experiments: {
      typedRoutes: true
    },
    extra: {
      router: {},
      eas: {
        projectId: "24722789-7e92-40fe-86dc-9ed9a9f0e5c3"
      }
    }
  }
};
