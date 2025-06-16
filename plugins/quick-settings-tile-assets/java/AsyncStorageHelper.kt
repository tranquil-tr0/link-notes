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
        Log.i(TAG, "=== GETTING QUICK NOTE URI FROM ASYNCSTORAGE ===")
        Log.i(TAG, "Context: ${context.javaClass.simpleName}")
        Log.i(TAG, "Prefs file: $PREFS_FILE")
        Log.i(TAG, "User prefs key: $USER_PREFS_KEY")
        Log.i(TAG, "Quick note URI key: $QUICK_NOTE_URI_KEY")
        
        return try {
            // Step 1: Access SharedPreferences
            Log.d(TAG, "Step 1: Accessing SharedPreferences...")
            val prefs = context.getSharedPreferences(PREFS_FILE, Context.MODE_PRIVATE)
            Log.i(TAG, "SharedPreferences accessed successfully")
            
            // Log all available keys for debugging
            val allKeys = prefs.all.keys
            Log.i(TAG, "Available keys in SharedPreferences: $allKeys")
            Log.i(TAG, "Total keys count: ${allKeys.size}")
            
            // Step 2: Get user preferences JSON
            Log.d(TAG, "Step 2: Retrieving user preferences JSON...")
            val userPrefsJson = prefs.getString(USER_PREFS_KEY, null)
            Log.i(TAG, "User preferences JSON: ${userPrefsJson ?: "NULL"}")
            
            if (userPrefsJson.isNullOrEmpty()) {
                Log.w(TAG, "No user preferences found in AsyncStorage")
                Log.i(TAG, "Checking if key exists but is empty...")
                val keyExists = prefs.contains(USER_PREFS_KEY)
                Log.i(TAG, "Key '$USER_PREFS_KEY' exists: $keyExists")
                return null
            }
            
            // Step 3: Parse JSON
            Log.d(TAG, "Step 3: Parsing user preferences JSON...")
            val jsonObject = JSONObject(userPrefsJson)
            Log.i(TAG, "JSON parsed successfully")
            Log.i(TAG, "JSON keys: ${jsonObject.keys().asSequence().toList()}")
            
            // Step 4: Extract quick note URI
            Log.d(TAG, "Step 4: Extracting quick note URI...")
            val hasQuickNoteKey = jsonObject.has(QUICK_NOTE_URI_KEY)
            val isQuickNoteNull = jsonObject.isNull(QUICK_NOTE_URI_KEY)
            Log.i(TAG, "Has quickNoteUri key: $hasQuickNoteKey")
            Log.i(TAG, "Is quickNoteUri null: $isQuickNoteNull")
            
            return if (hasQuickNoteKey && !isQuickNoteNull) {
                val uri = jsonObject.getString(QUICK_NOTE_URI_KEY)
                Log.i(TAG, "Successfully extracted quick note URI: $uri")
                Log.i(TAG, "URI length: ${uri.length}")
                Log.i(TAG, "URI type: ${if (uri.startsWith("content://")) "SAF URI" else if (uri.startsWith("file://")) "File URI" else "Unknown"}")
                uri
            } else {
                Log.w(TAG, "No valid quickNoteUri found in user preferences")
                null
            }
        } catch (e: Exception) {
            Log.e(TAG, "CRITICAL ERROR reading quick note URI from AsyncStorage", e)
            Log.e(TAG, "Exception type: ${e.javaClass.simpleName}")
            Log.e(TAG, "Exception message: ${e.message}")
            Log.e(TAG, "Stack trace: ${e.stackTrace.joinToString("\n")}")
            null
        } finally {
            Log.i(TAG, "=== ASYNCSTORAGE ACCESS COMPLETE ===")
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