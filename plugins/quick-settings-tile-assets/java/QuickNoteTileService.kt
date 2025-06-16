package com.anonymous.linknotes

import android.annotation.TargetApi
import android.app.PendingIntent
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.service.quicksettings.TileService
import android.util.Log

@TargetApi(Build.VERSION_CODES.N)
class QuickNoteTileService : TileService() {
    
    companion object {
        private const val TAG = "QuickNoteTileService"
    }
    
    override fun onClick() {
        Log.d(TAG, "Quick Settings Tile clicked")
        
        // Check if quick note is configured
        val quickNoteUri = AsyncStorageHelper.getQuickNoteUri(this)
        Log.d(TAG, "Retrieved quick note URI: $quickNoteUri")
        
        val deepLinkUri = if (quickNoteUri != null && UriHelper.isValidUri(quickNoteUri)) {
            // Quick note is configured - create editor deep link
            Log.d(TAG, "Quick note is configured, creating editor deep link")
            val filename = UriHelper.extractFilenameFromUri(quickNoteUri)
            val folderPath = UriHelper.extractFolderPathFromUri(quickNoteUri)
            UriHelper.buildEditorDeepLink(filename, folderPath)
        } else {
            // No quick note configured - create settings deep link with toast
            Log.d(TAG, "No quick note configured, creating settings deep link")
            val message = "No quick note selected. Please select a note in Settings."
            UriHelper.buildSettingsDeepLink(message)
        }
        
        Log.d(TAG, "Final deep link URI: $deepLinkUri")
        
        // Create Intent with deep link
        val intent = Intent(Intent.ACTION_VIEW, Uri.parse(deepLinkUri))
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        
        // Create PendingIntent
        val pendingIntent = PendingIntent.getActivity(this, 0, intent, PendingIntent.FLAG_IMMUTABLE)
        
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            startActivityAndCollapse(pendingIntent)
        } else {
            startActivityAndCollapse(intent)
        }
    }
}