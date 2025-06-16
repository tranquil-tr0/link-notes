package com.anonymous.linknotes

import android.annotation.TargetApi
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.service.quicksettings.TileService

@TargetApi(Build.VERSION_CODES.N)
class QuickNoteTileService : TileService() {
    
    override fun onClick() {
        super.onClick()
        
        // // Get the quick note filename from AsyncStorage
        // val quickNoteFilename = AsyncStorageHelper.getQuickNoteUri(this)
        
        // val deepLink = if (quickNoteFilename != null) {
        //     // Extract just the filename from the URI for the noteId parameter
        //     val filename = UriHelper.extractFilenameFromUri(quickNoteFilename)
        //     "linknotes://editor?mode=edit&noteId=$filename"
        // } else {
        //     "linknotes://settings?showToast=true&message=No%20quick%20note%20selected.%20Please%20select%20a%20note%20in%20Settings."
        // }
        
        // // Launch the app with the deep link
        // unlockAndRun {
        //     val intent = Intent(Intent.ACTION_VIEW, Uri.parse(deepLink)).apply {
        //         flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        //         setPackage(packageName)
        //     }
        //     startActivity(intent)
        // }
        unlockAndRun {
            val intent = Intent(Intent.ACTION_VIEW, Uri.parse("pinterest://pin/9/")).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }
            startActivity(intent)
        }
    }
}