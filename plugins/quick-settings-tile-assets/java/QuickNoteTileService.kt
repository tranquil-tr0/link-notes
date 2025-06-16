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
        Log.i(TAG, "=== QUICK SETTINGS TILE CLICKED ===")
        Log.i(TAG, "Timestamp: ${System.currentTimeMillis()}")
        Log.i(TAG, "Thread: ${Thread.currentThread().name}")
        
        try {
            // Step 1: Validate AsyncStorage access
            Log.d(TAG, "Step 1: Validating AsyncStorage access...")
            val asyncStorageValid = AsyncStorageHelper.validateAsyncStorage(this)
            Log.i(TAG, "AsyncStorage validation result: $asyncStorageValid")
            
            // Step 2: Attempt to get quick note URI
            Log.d(TAG, "Step 2: Retrieving quick note URI...")
            val quickNoteUri = getQuickNoteUri()
            Log.i(TAG, "Retrieved quick note URI: ${quickNoteUri ?: "NULL"}")
            
            if (quickNoteUri != null) {
                // Step 3: Validate URI format
                Log.d(TAG, "Step 3: Validating URI format...")
                val isValidUri = UriHelper.isValidUri(quickNoteUri)
                Log.i(TAG, "URI validation result: $isValidUri")
                
                if (isValidUri) {
                    Log.d(TAG, "Step 4: Opening quick note...")
                    openQuickNote(quickNoteUri)
                } else {
                    Log.w(TAG, "Invalid URI format detected, opening settings")
                    openSettingsWithToast()
                }
            } else {
                Log.i(TAG, "No quick note URI found, opening settings")
                openSettingsWithToast()
            }
        } catch (e: Exception) {
            Log.e(TAG, "CRITICAL ERROR handling tile click", e)
            Log.e(TAG, "Exception type: ${e.javaClass.simpleName}")
            Log.e(TAG, "Exception message: ${e.message}")
            Log.e(TAG, "Stack trace: ${e.stackTrace.joinToString("\n")}")
            openSettingsWithToast()
        }
        
        Log.i(TAG, "=== TILE CLICK HANDLING COMPLETE ===")
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
        Log.i(TAG, "=== OPENING QUICK NOTE ===")
        Log.i(TAG, "Input URI: $uri")
        
        try {
            // Step 1: Extract filename from URI
            Log.d(TAG, "Step 1: Extracting filename from URI...")
            val filename = UriHelper.extractFilenameFromUri(uri)
            Log.i(TAG, "Extracted filename: '$filename'")
            
            // Step 2: Extract folder path from URI
            Log.d(TAG, "Step 2: Extracting folder path from URI...")
            val folderPath = UriHelper.extractFolderPathFromUri(uri)
            Log.i(TAG, "Extracted folder path: ${folderPath ?: "NULL"}")
            
            // Step 3: Build deep link
            Log.d(TAG, "Step 3: Building editor deep link...")
            val deepLinkUri = UriHelper.buildEditorDeepLink(filename, folderPath)
            Log.i(TAG, "Built deep link: $deepLinkUri")
            
            // Step 4: Validate deep link format
            Log.d(TAG, "Step 4: Validating deep link format...")
            if (deepLinkUri.startsWith("linknotes://")) {
                Log.i(TAG, "Deep link format is valid")
                
                // Step 5: Attempt to open app
                Log.d(TAG, "Step 5: Opening app with deep link...")
                openApp(deepLinkUri)
            } else {
                Log.e(TAG, "Invalid deep link format: $deepLinkUri")
                openSettingsWithToast()
            }
        } catch (e: Exception) {
            Log.e(TAG, "CRITICAL ERROR opening quick note", e)
            Log.e(TAG, "Exception type: ${e.javaClass.simpleName}")
            Log.e(TAG, "Exception message: ${e.message}")
            Log.e(TAG, "Original URI: $uri")
            openSettingsWithToast()
        }
        
        Log.i(TAG, "=== QUICK NOTE OPENING COMPLETE ===")
    }

    private fun openSettingsWithToast() {
        try {
            val message = "No quick note selected. Please select a note in Settings."
            val encodedMessage = Uri.encode(message)
            val settingsUri = "linknotes://settings?showToast=true&message=$encodedMessage"
            Log.d(TAG, "Opening settings with toast: $settingsUri")
            openApp(settingsUri)
        } catch (e: Exception) {
            Log.e(TAG, "Error opening settings", e)
            // Fallback to main app
            openApp("linknotes://")
        }
    }

    private fun openApp(uri: String) {
        Log.i(TAG, "=== OPENING APP ===")
        Log.i(TAG, "Target URI: $uri")
        Log.i(TAG, "Package name: $packageName")
        
        try {
            // Step 1: Create intent
            Log.d(TAG, "Step 1: Creating intent...")
            val intent = Intent(Intent.ACTION_VIEW, Uri.parse(uri)).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }
            Log.i(TAG, "Intent created successfully")
            Log.i(TAG, "Intent action: ${intent.action}")
            Log.i(TAG, "Intent data: ${intent.data}")
            Log.i(TAG, "Intent flags: ${intent.flags}")
            
            // Step 2: Validate intent can be resolved
            Log.d(TAG, "Step 2: Validating intent resolution...")
            val resolveInfo = packageManager.resolveActivity(intent, 0)
            if (resolveInfo != null) {
                Log.i(TAG, "Intent can be resolved by: ${resolveInfo.activityInfo.packageName}")
            } else {
                Log.w(TAG, "No activity found to handle intent")
            }
            
            // Step 3: Start activity
            Log.d(TAG, "Step 3: Starting activity and collapsing...")
            startActivityAndCollapse(intent)
            Log.i(TAG, "startActivityAndCollapse completed successfully")
            
        } catch (e: Exception) {
            Log.e(TAG, "CRITICAL ERROR starting activity with URI: $uri", e)
            Log.e(TAG, "Exception type: ${e.javaClass.simpleName}")
            Log.e(TAG, "Exception message: ${e.message}")
            
            // Try fallback to main app launcher
            Log.w(TAG, "Attempting fallback to main app launcher...")
            try {
                Log.d(TAG, "Creating fallback intent...")
                val fallbackIntent = packageManager.getLaunchIntentForPackage(packageName)?.apply {
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
                }
                
                if (fallbackIntent != null) {
                    Log.i(TAG, "Fallback intent created: ${fallbackIntent.component}")
                    startActivityAndCollapse(fallbackIntent)
                    Log.i(TAG, "Fallback launch successful")
                } else {
                    Log.e(TAG, "Could not create fallback intent - package manager returned null")
                }
            } catch (fallbackError: Exception) {
                Log.e(TAG, "CRITICAL ERROR with fallback intent", fallbackError)
                Log.e(TAG, "Fallback exception type: ${fallbackError.javaClass.simpleName}")
                Log.e(TAG, "Fallback exception message: ${fallbackError.message}")
            }
        }
        
        Log.i(TAG, "=== APP OPENING COMPLETE ===")
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