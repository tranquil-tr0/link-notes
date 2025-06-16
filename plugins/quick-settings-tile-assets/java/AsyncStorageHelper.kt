package com.anonymous.linknotes

import android.content.Context
import android.util.Log
import org.json.JSONException

object AsyncStorageHelper {
    private const val TAG = "AsyncStorageHelper"
    private const val PREFERENCE_NAME = "RCTAsyncLocalStorage_db"
    private const val QUICK_NOTE_URI_KEY = "user_preference_quickNoteUri"
    
    /**
     * Validates AsyncStorage access by checking if SharedPreferences are accessible
     */
    fun validateAsyncStorage(context: Context): Boolean {
        return try {
            val prefs = context.getSharedPreferences(PREFERENCE_NAME, Context.MODE_PRIVATE)
            // Try to read from preferences to validate access
            prefs.getString("test", null)
            Log.d(TAG, "AsyncStorage validation successful")
            true
        } catch (e: Exception) {
            Log.e(TAG, "AsyncStorage validation failed", e)
            false
        }
    }
    
    fun getQuickNoteUri(context: Context): String? {
        return try {
            val prefs = context.getSharedPreferences(PREFERENCE_NAME, Context.MODE_PRIVATE)
            val jsonValue = prefs.getString(QUICK_NOTE_URI_KEY, null)            
            Log.d(TAG, "Retrieved quick note URI JSON: $jsonValue")
            Log.d(TAG, "Quick note URI key: $QUICK_NOTE_URI_KEY")
            // Parse JSON if needed (e.g., if value is a JSON object or array)
            // For this example, let's try to parse as JSONObject and log if it's valid JSON
            try {
                val jsonObj = org.json.JSONObject(jsonValue)
                Log.d(TAG, "Parsed quick note URI as JSONObject: $jsonObj")
            } catch (e: JSONException) {
                Log.d(TAG, "Quick note URI is not a JSONObject")
            }
            Log.d(TAG, "Quick note URI preference name: $PREFERENCE_NAME")
            
            if (jsonValue != null) {
                // The value is stored as JSON string, so we need to parse it
                // Remove quotes from JSON string if it's a simple string value
                when {
                    jsonValue == "null" -> null
                    jsonValue.startsWith("\"") && jsonValue.endsWith("\"") -> {
                        // Remove surrounding quotes for string values
                        jsonValue.substring(1, jsonValue.length - 1)
                    }
                    else -> jsonValue
                }
            } else {
                null
            }
        } catch (e: JSONException) {
            Log.e(TAG, "Error parsing quick note URI JSON", e)
            null
        } catch (e: Exception) {
            Log.e(TAG, "Error reading quick note URI from SharedPreferences", e)
            null
        }
    }
}