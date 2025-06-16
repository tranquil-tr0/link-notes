package com.anonymous.linknotes

import android.annotation.TargetApi
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.service.quicksettings.Tile
import android.service.quicksettings.TileService
import android.util.Log

@TargetApi(Build.VERSION_CODES.N)
class QuickNoteTileService : TileService() {
    companion object {
        private const val TAG = "QuickNoteTileService"
        private const val PREFS_KEY = "user_preferences"
        private const val QUICK_NOTE_URI_KEY = "quickNoteUri"
    }

    override fun onClick() {
        super.onClick()
        Log.d(TAG, "Quick Settings Tile clicked")
        
        try {
            val quickNoteUri = getQuickNoteUri()
            if (quickNoteUri != null) {
                Log.d(TAG, "Opening quick note: $quickNoteUri")
                openQuickNote(quickNoteUri)
            } else {
                Log.d(TAG, "No quick note selected, opening settings")
                openSettingsWithToast()
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error handling tile click", e)
            openSettingsWithToast()
        }
    }

    override fun onTileAdded() {
        super.onTileAdded()
        Log.d(TAG, "Tile added to Quick Settings")
        updateTileState()
    }

    override fun onStartListening() {
        super.onStartListening()
        Log.d(TAG, "Tile listening started")
        updateTileState()
    }

    override fun onStopListening() {
        super.onStopListening()
        Log.d(TAG, "Tile listening stopped")
    }

    private fun getQuickNoteUri(): String? {
        return try {
            AsyncStorageHelper.getQuickNoteUri(this)
        } catch (e: Exception) {
            Log.e(TAG, "Error reading quick note URI", e)
            null
        }
    }

    private fun openQuickNote(uri: String) {
        try {
            val filename = UriHelper.extractFilenameFromUri(uri)
            val folderPath = UriHelper.extractFolderPathFromUri(uri)
            
            val deepLinkUri = UriHelper.buildEditorDeepLink(filename, folderPath)
            Log.d(TAG, "Opening editor with deep link: $deepLinkUri")
            openApp(deepLinkUri)
        } catch (e: Exception) {
            Log.e(TAG, "Error opening quick note", e)
            openSettingsWithToast()
        }
    }

    private fun openSettingsWithToast() {
        try {
            val message = "No quick note selected. Please select a note in Settings."
            val encodedMessage = Uri.encode(message)
            val settingsUri = "myapp://settings?showToast=true&message=$encodedMessage"
            Log.d(TAG, "Opening settings with toast: $settingsUri")
            openApp(settingsUri)
        } catch (e: Exception) {
            Log.e(TAG, "Error opening settings", e)
            // Fallback to main app
            openApp("myapp://")
        }
    }

    private fun openApp(uri: String) {
        try {
            val intent = Intent(Intent.ACTION_VIEW, Uri.parse(uri)).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }
            startActivityAndCollapse(intent)
        } catch (e: Exception) {
            Log.e(TAG, "Error starting activity with URI: $uri", e)
            // Try fallback to main app launcher
            try {
                val fallbackIntent = packageManager.getLaunchIntentForPackage(packageName)?.apply {
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
                }
                if (fallbackIntent != null) {
                    startActivityAndCollapse(fallbackIntent)
                } else {
                    Log.e(TAG, "Could not create fallback intent")
                }
            } catch (fallbackError: Exception) {
                Log.e(TAG, "Error with fallback intent", fallbackError)
            }
        }
    }

    private fun updateTileState() {
        try {
            val tile = qsTile ?: return
            val hasQuickNote = getQuickNoteUri() != null
            
            tile.state = if (hasQuickNote) Tile.STATE_ACTIVE else Tile.STATE_INACTIVE
            tile.label = if (hasQuickNote) "Quick Note" else "No Quick Note"
            tile.contentDescription = if (hasQuickNote) 
                "Open quick note for editing" else 
                "No quick note selected. Tap to open settings."
            
            tile.updateTile()
            Log.d(TAG, "Tile state updated - hasQuickNote: $hasQuickNote")
        } catch (e: Exception) {
            Log.e(TAG, "Error updating tile state", e)
        }
    }
}