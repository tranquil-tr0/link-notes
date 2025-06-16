# Deep Linking Guide for Link Notes

This app supports deep linking to allow users to directly access specific screens and functions without navigating through the app interface.

## URL Scheme
The app uses the custom URL scheme: `linknotes://`

## Supported Deep Links

### 1. Editor Deep Links

#### Open existing note for editing
```
linknotes://editor?mode=edit&noteId=filename.md&folderPath=/path/to/folder
```

**Parameters:**
- `mode=edit` (required): Opens the note in edit mode
- `noteId` (required): The filename of the note to open (e.g., "my-note.md")
- `folderPath` (optional): The path to the folder containing the note

#### Create new note
```
linknotes://editor?mode=create&folderPath=/path/to/folder
```

**Parameters:**
- `mode=create` (required): Opens the editor to create a new note
- `folderPath` (optional): The folder where the new note should be created

### 2. Settings Deep Links

#### Open settings screen
```
linknotes://settings
```

#### Open settings with toast message
```
linknotes://settings?showToast=true&message=Your%20message%20here
```

**Parameters:**
- `showToast=true` (optional): Shows an alert dialog with a message
- `message` (optional): The message to display in the alert (URL encoded)
- `section` (optional): Reserved for future use to navigate to specific settings sections

## Usage Examples

### From command line (Android)
```bash
adb shell am start -W -a android.intent.action.VIEW -d "linknotes://settings?showToast=true&message=Settings%20opened%20via%20deep%20link" com.anonymous.linknotes
```

### From another app
```javascript
// React Native
import { Linking } from 'react-native';

// Open settings
Linking.openURL('linknotes://settings');

// Open editor to create new note
Linking.openURL('linknotes://editor?mode=create');

// Open specific note
Linking.openURL('linknotes://editor?mode=edit&noteId=my-note.md');
```

### From web browser (if app is installed)
Simply navigate to any of the deep link URLs in a web browser on the device.

## Implementation Details

- **Cold Start Support**: Deep links work both when the app is already running and when launching the app from a closed state
- **Parameter Validation**: The app validates required parameters before attempting navigation
- **Error Handling**: Invalid deep links are logged and gracefully ignored
- **URL Encoding**: Messages and paths should be URL encoded for proper handling

## Testing Deep Links

You can test deep links using:
1. ADB commands (Android)
2. Simulator/Device URL schemes
3. QR codes containing the deep link URLs
4. Third-party apps that can trigger URL schemes

## Future Enhancements

The deep linking system is designed to be extensible. Future versions may support:
- Direct navigation to specific settings sections
- Search queries via deep links
- Folder navigation shortcuts
- Note sharing via deep links