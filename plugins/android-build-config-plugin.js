const { withAndroidManifest, withGradleProperties } = require('@expo/config-plugins');

/**
 * Plugin to modify android/app/build.gradle and ensure defaultConfig persists through prebuild
 */
function withAndroidBuildConfig(config) {
  return withGradleProperties(config, (config) => {
    // We'll use a different approach - modify the build.gradle directly
    config = withBuildGradleModification(config);
    return config;
  });
}

function withBuildGradleModification(config) {
  return {
    ...config,
    // Add a custom modification that runs during prebuild
    modifyBuildGradle: true
  };
}

// This function will be called by Expo CLI during prebuild
function withBuildGradlePlugin(config) {
  const fs = require('fs');
  const path = require('path');

  return {
    ...config,
    // Hook into the prebuild process
    hooks: {
      ...config.hooks,
      postPrebuild: async (config) => {
        const buildGradlePath = path.join(config.projectRoot, 'android', 'app', 'build.gradle');
        
        if (fs.existsSync(buildGradlePath)) {
          let buildGradleContent = fs.readFileSync(buildGradlePath, 'utf8');
          
          // Find the defaultConfig block and replace it
          const defaultConfigRegex = /defaultConfig\s*\{[^}]*\}/s;
          
          const newDefaultConfig = `defaultConfig {
        applicationId 'com.anonymous.linknotes'
        minSdkVersion rootProject.ext.minSdkVersion
        targetSdkVersion rootProject.ext.targetSdkVersion
        versionCode 1
        versionName "0.1.0"
        externalNativeBuild {
            cmake {
                arguments "-DCMAKE_MAKE_PROGRAM=C:\\\\ninja\\\\ninja.exe", "-DCMAKE_OBJECT_PATH_MAX=1024"
            }
        }
    }`;
          
          if (defaultConfigRegex.test(buildGradleContent)) {
            buildGradleContent = buildGradleContent.replace(defaultConfigRegex, newDefaultConfig);
            fs.writeFileSync(buildGradlePath, buildGradleContent);
            console.log('✅ Updated android/app/build.gradle defaultConfig with custom configuration');
          } else {
            console.warn('⚠️ Could not find defaultConfig block in build.gradle');
          }
        } else {
          console.warn('⚠️ build.gradle file not found at expected location');
        }
      }
    }
  };
}

// Export the plugin using the newer Expo config plugin format
const { withDangerousMod } = require('@expo/config-plugins');

function withAndroidBuildGradleConfig(config) {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const fs = require('fs');
      const path = require('path');
      
      const buildGradlePath = path.join(config.modRequest.platformProjectRoot, 'app', 'build.gradle');
      
      if (fs.existsSync(buildGradlePath)) {
        let buildGradleContent = fs.readFileSync(buildGradlePath, 'utf8');
        
        // Find the defaultConfig block and replace it
        const defaultConfigRegex = /defaultConfig\s*\{[^}]*\}/s;
        
        const newDefaultConfig = `defaultConfig {
        applicationId 'com.anonymous.linknotes'
        minSdkVersion rootProject.ext.minSdkVersion
        targetSdkVersion rootProject.ext.targetSdkVersion
        versionCode 1
        versionName "0.1.0"
        externalNativeBuild {
            cmake {
                arguments "-DCMAKE_MAKE_PROGRAM=C:\\\\ninja\\\\ninja.exe", "-DCMAKE_OBJECT_PATH_MAX=1024"
            }
        }
    }`;
        
        if (defaultConfigRegex.test(buildGradleContent)) {
          buildGradleContent = buildGradleContent.replace(defaultConfigRegex, newDefaultConfig);
          fs.writeFileSync(buildGradlePath, buildGradleContent);
          console.log('✅ Updated android/app/build.gradle defaultConfig with custom configuration');
        } else {
          console.warn('⚠️ Could not find defaultConfig block in build.gradle');
        }
      }
      
      return config;
    },
  ]);
}

module.exports = withAndroidBuildGradleConfig;