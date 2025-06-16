const {
  withAndroidManifest,
  withStringsXml,
  AndroidConfig,
  createRunOncePlugin,
} = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Expo Config Plugin for Quick Settings Tile
 * Applies native Android modifications during prebuild
 */
const withQuickSettingsTile = (config, props = {}) => {
  // Apply Android manifest modifications
  config = withAndroidManifest(config, (config) => {
    const manifest = config.modResults;
    
    // Add Quick Settings Tile permission if not already present
    if (!manifest.manifest['uses-permission'].find(p => 
      p.$['android:name'] === 'android.permission.BIND_QUICK_SETTINGS_TILE'
    )) {
      manifest.manifest['uses-permission'].push({
        $: { 'android:name': 'android.permission.BIND_QUICK_SETTINGS_TILE' }
      });
    }
    
    // Add Quick Settings Tile service to application
    const application = manifest.manifest.application[0];
    
    // Check if service already exists
    const existingService = application.service?.find(s =>
      s.$['android:name'] === '.QuickNoteTileService'
    );
    
    if (!existingService) {
      if (!application.service) {
        application.service = [];
      }
      
      application.service.push({
        $: {
          'android:name': '.QuickNoteTileService',
          'android:label': 'Quick Note',
          'android:icon': '@drawable/ic_quick_note',
          'android:permission': 'android.permission.BIND_QUICK_SETTINGS_TILE',
          'android:exported': 'true',
        },
        'intent-filter': [{
          action: [{
            $: { 'android:name': 'android.service.quicksettings.action.QS_TILE' }
          }]
        }],
      });
    }
    
    return config;
  });

  // Apply file modifications
  config = withQuickSettingsTileFiles(config);
  
  return config;
};

/**
 * Plugin to copy native Android files during prebuild
 */
const withQuickSettingsTileFiles = (config) => {
  return withAndroidManifest(config, (config) => {
    // This runs during prebuild - copy our native files
    const projectRoot = config.modRequest.projectRoot;
    const androidProjectPath = path.join(projectRoot, 'android');
    
    // Define source and destination paths
    const pluginAssetsDir = path.join(projectRoot, 'plugins', 'quick-settings-tile-assets');
    const javaPackageDir = path.join(androidProjectPath, 'app', 'src', 'main', 'java', 'com', 'anonymous', 'linknotes');
    const drawableDir = path.join(androidProjectPath, 'app', 'src', 'main', 'res', 'drawable');
    
    // Ensure directories exist
    if (!fs.existsSync(javaPackageDir)) {
      fs.mkdirSync(javaPackageDir, { recursive: true });
    }
    if (!fs.existsSync(drawableDir)) {
      fs.mkdirSync(drawableDir, { recursive: true });
    }
    
    // Copy Kotlin/Java files
    const javaFiles = [
      'QuickNoteTileService.kt',
      'AsyncStorageHelper.kt',
      'UriHelper.kt'
    ];
    
    javaFiles.forEach(filename => {
      const sourcePath = path.join(pluginAssetsDir, 'java', filename);
      const destPath = path.join(javaPackageDir, filename);
      
      if (fs.existsSync(sourcePath)) {
        fs.copyFileSync(sourcePath, destPath);
        console.log(`✅ Copied ${filename} to Android project`);
      } else {
        console.warn(`⚠️ Source file not found: ${sourcePath}`);
      }
    });
    
    // Copy drawable icon
    const iconSourcePath = path.join(pluginAssetsDir, 'drawable', 'ic_quick_note.xml');
    const iconDestPath = path.join(drawableDir, 'ic_quick_note.xml');
    
    if (fs.existsSync(iconSourcePath)) {
      fs.copyFileSync(iconSourcePath, iconDestPath);
      console.log('✅ Copied Quick Settings Tile icon');
    } else {
      console.warn(`⚠️ Icon file not found: ${iconSourcePath}`);
    }
    
    return config;
  });
};

// Export as createRunOncePlugin to avoid running multiple times
module.exports = createRunOncePlugin(withQuickSettingsTile, 'quick-settings-tile-plugin', '1.0.0');