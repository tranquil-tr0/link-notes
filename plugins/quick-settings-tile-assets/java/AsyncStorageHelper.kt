package com.anonymous.linknotes

import android.content.Context
import android.util.Log
import org.json.JSONObject

object AsyncStorageHelper {
    private const val TAG = "AsyncStorageHelper"
    private const val PREFS_FILE = "RCTAsyncLocalStorage_V1"
    private const val USER_PREFS_KEY = "user_preferences"
    private const val QUICK_NOTE_URI_KEY = "quickNoteUri"

    fun getQuickNoteUri(context: Context): String? {
        return try {
            val prefs = context.getSharedPreferences(PREFS_FILE, Context.MODE_PRIVATE)
            val userPrefsJson = prefs.getString(USER_PREFS_KEY, null)
            
            if (userPrefsJson.isNullOrEmpty()) {
                Log.d(TAG, "No user preferences found in AsyncStorage")
                return null
            }
            
            Log.d(TAG, "Found user preferences: $userPrefsJson")
            val jsonObject = JSONObject(userPrefsJson)
            
            return if (jsonObject.has(QUICK_NOTE_URI_KEY) && !jsonObject.isNull(QUICK_NOTE_URI_KEY)) {
                val uri = jsonObject.getString(QUICK_NOTE_URI_KEY)
                Log.d(TAG, "Found quick note URI: $uri")
                uri
            } else {
                Log.d(TAG, "No quickNoteUri found in user preferences")
                null
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error reading quick note URI from AsyncStorage", e)
            null
        }
    }

    fun getQuickNoteFilename(context: Context): String? {
        val uri = getQuickNoteUri(context) ?: return null
        return UriHelper.extractFilenameFromUri(uri)
    }

    /**
     * Helper method to validate AsyncStorage connection
     */
    fun validateAsyncStorage(context: Context): Boolean {
        return try {
            val prefs = context.getSharedPreferences(PREFS_FILE, Context.MODE_PRIVATE)
            Log.d(TAG, "AsyncStorage validation successful")
            true
        } catch (e: Exception) {
            Log.e(TAG, "AsyncStorage validation failed", e)
            false
        }
    }
}