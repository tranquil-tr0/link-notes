package com.anonymous.linknotes

import android.content.Context
import android.util.Log
import org.json.JSONObject

object AsyncStorageHelper {
    private const val TAG = "AsyncStorageHelper"
    private const val PREFS_FILE = "RCTAsyncLocalStorage_V1"
    private const val USER_PREFS_KEY = "user_preferences"
    private const val QUICK_NOTE_URI_KEY = "quickNoteUri"
    
    // Alternative approach: React Native AsyncStorage sometimes uses different key formats
    private const val ALTERNATE_PREFS_FILE = "AsyncStorage"
    private const val RN_STORAGE_KEY = "@react-native-async-storage/async-storage"

    fun getQuickNoteUri(context: Context): String? {
        Log.i(TAG, "=== GETTING QUICK NOTE URI FROM ASYNCSTORAGE ===")
        Log.i(TAG, "Context: ${context.javaClass.simpleName}")
        
        // Try multiple AsyncStorage access methods
        val approaches = listOf(
            "RCTAsyncLocalStorage_V1" to USER_PREFS_KEY,
            "AsyncStorage" to USER_PREFS_KEY,
            RN_STORAGE_KEY to USER_PREFS_KEY,
            PREFS_FILE to "user_preferences"
        )
        
        for ((prefsFile, key) in approaches) {
            Log.i(TAG, "--- Trying approach: prefs file='$prefsFile', key='$key' ---")
            
            try {
                // Step 1: Access SharedPreferences
                Log.d(TAG, "Step 1: Accessing SharedPreferences...")
                val prefs = context.getSharedPreferences(prefsFile, Context.MODE_PRIVATE)
                Log.i(TAG, "SharedPreferences accessed successfully")
                
                // Log all available keys for debugging
                val allKeys = prefs.all.keys
                Log.i(TAG, "Available keys in '$prefsFile': $allKeys")
                Log.i(TAG, "Total keys count: ${allKeys.size}")
                
                // Check if our target key exists
                if (!prefs.contains(key)) {
                    Log.w(TAG, "Key '$key' not found in '$prefsFile', trying next approach...")
                    continue
                }
                
                // Step 2: Get user preferences JSON
                Log.d(TAG, "Step 2: Retrieving user preferences JSON...")
                val userPrefsJson = prefs.getString(key, null)
                Log.i(TAG, "User preferences JSON: ${userPrefsJson ?: "NULL"}")
                
                if (userPrefsJson.isNullOrEmpty()) {
                    Log.w(TAG, "Key '$key' exists but value is null/empty, trying next approach...")
                    continue
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
                
                if (hasQuickNoteKey && !isQuickNoteNull) {
                    val uri = jsonObject.getString(QUICK_NOTE_URI_KEY)
                    Log.i(TAG, "SUCCESS! Found quick note URI: $uri")
                    Log.i(TAG, "URI length: ${uri.length}")
                    Log.i(TAG, "URI type: ${if (uri.startsWith("content://")) "SAF URI" else if (uri.startsWith("file://")) "File URI" else "Unknown"}")
                    Log.i(TAG, "Using approach: prefs file='$prefsFile', key='$key'")
                    return uri
                } else {
                    Log.w(TAG, "quickNoteUri key missing or null in this approach, trying next...")
                    continue
                }
                
            } catch (e: Exception) {
                Log.w(TAG, "Error with approach prefs file='$prefsFile', key='$key': ${e.message}")
                continue
            }
        }
        
        // If we get here, all approaches failed
        Log.e(TAG, "FAILED: All AsyncStorage access approaches failed")
        Log.i(TAG, "=== ASYNCSTORAGE ACCESS COMPLETE ===")
        return null
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
    /**
     * Enhanced method to get quicknote data by checking all possible AsyncStorage patterns
     * This addresses the issue where SharedPreferences are empty by looking for direct keys
     */
    fun getQuickNoteDataEnhanced(context: Context): QuickNoteData? {
        Log.i(TAG, "=== ENHANCED QUICK NOTE DATA RETRIEVAL ===")
        
        // Try the original method first
        val originalUri = getQuickNoteUri(context)
        if (originalUri != null) {
            Log.i(TAG, "Original method succeeded, returning data")
            return QuickNoteData(
                uri = originalUri,
                filename = UriHelper.extractFilenameFromUri(originalUri),
                source = "user_preferences_json"
            )
        }
        
        // If original method failed, try direct key approaches
        Log.i(TAG, "Original method failed, trying direct AsyncStorage key approaches...")
        
        val directKeyApproaches = listOf(
            "RCTAsyncLocalStorage_V1" to "quickNoteUri",
            "AsyncStorage" to "quickNoteUri",
            "RCTAsyncLocalStorage_V1" to "@RNAsyncStorage_quickNoteUri",
            "AsyncStorage" to "@RNAsyncStorage_quickNoteUri"
        )
        
        for ((prefsFile, key) in directKeyApproaches) {
            Log.i(TAG, "--- Trying direct key approach: prefs='$prefsFile', key='$key' ---")
            
            try {
                val prefs = context.getSharedPreferences(prefsFile, Context.MODE_PRIVATE)
                Log.i(TAG, "SharedPreferences accessed, total keys: ${prefs.all.keys.size}")
                
                if (prefs.contains(key)) {
                    val uri = prefs.getString(key, null)
                    if (!uri.isNullOrEmpty()) {
                        Log.i(TAG, "SUCCESS! Found quicknote URI via direct key: $uri")
                        return QuickNoteData(
                            uri = uri,
                            filename = UriHelper.extractFilenameFromUri(uri),
                            source = "direct_key_$key"
                        )
                    }
                }
            } catch (e: Exception) {
                Log.w(TAG, "Error with direct key approach '$prefsFile/$key': ${e.message}")
            }
        }
        
        Log.e(TAG, "All enhanced retrieval methods failed")
        return null
    }
    
    /**
     * Debug method to list ALL keys in ALL SharedPreferences files
     */
    fun debugAllAsyncStorageKeys(context: Context): Map<String, List<String>> {
        Log.i(TAG, "=== DEBUGGING ALL ASYNCSTORAGE KEYS ===")
        
        val result = mutableMapOf<String, List<String>>()
        val prefsFiles = listOf(
            "RCTAsyncLocalStorage_V1",
            "AsyncStorage",
            "ReactNativeAsyncStorage",
            context.packageName + "_preferences"
        )
        
        for (prefsFile in prefsFiles) {
            try {
                val prefs = context.getSharedPreferences(prefsFile, Context.MODE_PRIVATE)
                val allKeys = prefs.all.keys.toList()
                result[prefsFile] = allKeys
                Log.i(TAG, "SharedPreferences '$prefsFile' has ${allKeys.size} keys: $allKeys")
                
                // Log first few values for debugging
                allKeys.take(5).forEach { key ->
                    val value = prefs.getString(key, "N/A")
                    Log.d(TAG, "  $key = ${value?.take(100)}")
                }
            } catch (e: Exception) {
                Log.w(TAG, "Error accessing SharedPreferences '$prefsFile': ${e.message}")
                result[prefsFile] = listOf("ERROR: ${e.message}")
            }
        }
        
        Log.i(TAG, "=== DEBUG COMPLETE ===")
        return result
    }
    
    /**
     * Data class to hold quicknote information with source tracking
     */
    /**
     * Comprehensive method to find ALL SharedPreferences files on the device
     * This will help us locate where AsyncStorage is actually storing data
     */
    fun findAllSharedPreferencesFiles(context: Context): List<String> {
        Log.i(TAG, "=== FINDING ALL SHARED PREFERENCES FILES ===")
        
        val foundFiles = mutableListOf<String>()
        
        // Get the app's SharedPreferences directory
        val prefsDir = context.filesDir.parentFile?.resolve("shared_prefs")
        
        if (prefsDir?.exists() == true && prefsDir.isDirectory) {
            Log.i(TAG, "SharedPreferences directory: ${prefsDir.absolutePath}")
            
            val xmlFiles = prefsDir.listFiles { file -> file.extension == "xml" }
            xmlFiles?.forEach { file ->
                val prefsName = file.nameWithoutExtension
                foundFiles.add(prefsName)
                Log.i(TAG, "Found SharedPreferences file: $prefsName")
                
                // Try to read this preferences file
                try {
                    val prefs = context.getSharedPreferences(prefsName, Context.MODE_PRIVATE)
                    val allKeys = prefs.all.keys
                    Log.i(TAG, "  File '$prefsName' has ${allKeys.size} keys: $allKeys")
                    
                    // Check if any key contains 'user' or 'quick' or 'note'
                    val relevantKeys = allKeys.filter { key ->
                        key.contains("user", ignoreCase = true) ||
                        key.contains("quick", ignoreCase = true) ||
                        key.contains("note", ignoreCase = true) ||
                        key.contains("preferences", ignoreCase = true)
                    }
                    
                    if (relevantKeys.isNotEmpty()) {
                        Log.i(TAG, "  *** RELEVANT KEYS FOUND: $relevantKeys ***")
                        relevantKeys.forEach { key ->
                            val value = prefs.getString(key, null)
                            Log.i(TAG, "    $key = ${value?.take(200)}")
                        }
                    }
                    
                    // Also check for any keys that might contain JSON
                    allKeys.forEach { key ->
                        val value = prefs.getString(key, null)
                        if (value != null && (value.startsWith("{") || value.contains("quickNote"))) {
                            Log.i(TAG, "  *** POTENTIAL JSON KEY: $key ***")
                            Log.i(TAG, "    Value: ${value.take(200)}")
                        }
                    }
                    
                } catch (e: Exception) {
                    Log.w(TAG, "  Error reading preferences file '$prefsName': ${e.message}")
                }
            }
        } else {
            Log.w(TAG, "SharedPreferences directory not found or not accessible")
        }
        
        Log.i(TAG, "=== SHARED PREFERENCES SCAN COMPLETE ===")
        return foundFiles
    }
    
    /**
     * Method to specifically search for quicknote data in all available SharedPreferences
     */
    fun searchForQuickNoteInAllPrefs(context: Context): QuickNoteSearchResult? {
        Log.i(TAG, "=== SEARCHING FOR QUICKNOTE DATA IN ALL PREFERENCES ===")
        
        val allFiles = findAllSharedPreferencesFiles(context)
        
        for (fileName in allFiles) {
            try {
                val prefs = context.getSharedPreferences(fileName, Context.MODE_PRIVATE)
                val allEntries = prefs.all
                
                for ((key, value) in allEntries) {
                    val valueStr = value?.toString()
                    
                    // Check if this could be our quicknote data
                    if (valueStr != null && (
                        valueStr.contains("quickNote", ignoreCase = true) ||
                        valueStr.contains("content://") ||
                        valueStr.contains("file://") ||
                        valueStr.contains(".md") ||
                        (valueStr.startsWith("{") && valueStr.contains("uri", ignoreCase = true))
                    )) {
                        Log.i(TAG, "*** POTENTIAL QUICKNOTE DATA FOUND ***")
                        Log.i(TAG, "File: $fileName")
                        Log.i(TAG, "Key: $key")
                        Log.i(TAG, "Value: $valueStr")
                        
                        return QuickNoteSearchResult(
                            fileName = fileName,
                            key = key,
                            value = valueStr,
                            isJson = valueStr.startsWith("{")
                        )
                    }
                }
            } catch (e: Exception) {
                Log.w(TAG, "Error searching in preferences file '$fileName': ${e.message}")
            }
        }
        
        Log.i(TAG, "No quicknote data found in any SharedPreferences")
        return null
    }
    
    data class QuickNoteData(
        val uri: String,
        val filename: String,
        val source: String
    )
    
    data class QuickNoteSearchResult(
        val fileName: String,
        val key: String,
        val value: String,
        val isJson: Boolean
    )
    
    /**
     * Method specifically designed to access React Native AsyncStorage data
     * This addresses the bridge communication issue between RN and native Android
     */
    fun getQuickNoteUriFromReactNativeAsyncStorage(context: Context): String? {
        Log.i(TAG, "=== ACCESSING REACT NATIVE ASYNCSTORAGE DATA ===")
        
        // React Native AsyncStorage can use different SharedPreferences approaches
        val reactNativeApproaches = listOf(
            // Standard React Native AsyncStorage file
            "RCTAsyncLocalStorage_V1" to "user_preferences",
            // Alternative file names that RN might use
            "AsyncStorage" to "user_preferences",
            // Direct key approach (in case RN stores keys individually)
            "RCTAsyncLocalStorage_V1" to "@user_preferences",
            "AsyncStorage" to "@user_preferences",
            // Package-specific preferences
            "${context.packageName}_preferences" to "user_preferences",
            // Expo-specific storage (since this is an Expo app)
            "expo_async_storage" to "user_preferences",
            "expo.modules.asyncstorage" to "user_preferences"
        )
        
        for ((prefsFile, key) in reactNativeApproaches) {
            Log.i(TAG, "--- Trying React Native approach: file='$prefsFile', key='$key' ---")
            
            try {
                val prefs = context.getSharedPreferences(prefsFile, Context.MODE_PRIVATE)
                Log.i(TAG, "Accessing '$prefsFile' with ${prefs.all.size} total keys")
                
                if (prefs.contains(key)) {
                    val jsonData = prefs.getString(key, null)
                    if (!jsonData.isNullOrEmpty()) {
                        Log.i(TAG, "Found data in '$prefsFile'/'$key': ${jsonData.take(100)}")
                        
                        try {
                            val jsonObject = JSONObject(jsonData)
                            if (jsonObject.has("quickNoteUri") && !jsonObject.isNull("quickNoteUri")) {
                                val uri = jsonObject.getString("quickNoteUri")
                                Log.i(TAG, "SUCCESS! Extracted quickNoteUri: $uri")
                                return uri
                            } else {
                                Log.w(TAG, "JSON found but no quickNoteUri field")
                            }
                        } catch (e: Exception) {
                            Log.w(TAG, "Error parsing JSON: ${e.message}")
                        }
                    }
                } else {
                    // Try to find any keys that might contain our data
                    val allKeys = prefs.all.keys
                    Log.d(TAG, "Keys in '$prefsFile': $allKeys")
                    
                    // Look for keys that might contain user preferences
                    val candidateKeys = allKeys.filter { k ->
                        k.contains("user", ignoreCase = true) ||
                        k.contains("preferences", ignoreCase = true) ||
                        k.contains("quicknote", ignoreCase = true)
                    }
                    
                    if (candidateKeys.isNotEmpty()) {
                        Log.i(TAG, "Found candidate keys in '$prefsFile': $candidateKeys")
                        for (candidateKey in candidateKeys) {
                            val value = prefs.getString(candidateKey, null)
                            if (value != null && value.contains("quickNoteUri")) {
                                Log.i(TAG, "Found quickNoteUri in key '$candidateKey'")
                                try {
                                    val jsonObject = JSONObject(value)
                                    if (jsonObject.has("quickNoteUri") && !jsonObject.isNull("quickNoteUri")) {
                                        val uri = jsonObject.getString("quickNoteUri")
                                        Log.i(TAG, "SUCCESS! Extracted URI from '$candidateKey': $uri")
                                        return uri
                                    }
                                } catch (e: Exception) {
                                    Log.w(TAG, "Error parsing candidate key JSON: ${e.message}")
                                }
                            }
                        }
                    }
                }
            } catch (e: Exception) {
                Log.w(TAG, "Error accessing '$prefsFile': ${e.message}")
            }
        }
        
        Log.e(TAG, "Failed to find quickNoteUri in React Native AsyncStorage")
        return null
    }
    
    /**
     * Enhanced method that combines all approaches for maximum compatibility
     */
    fun getQuickNoteUriComprehensive(context: Context): String? {
        Log.i(TAG, "=== COMPREHENSIVE QUICKNOTE URI RETRIEVAL ===")
        
        // Try original method first
        val originalUri = getQuickNoteUri(context)
        if (originalUri != null) {
            Log.i(TAG, "Original method succeeded")
            return originalUri
        }
        
        // Try React Native specific method
        val rnUri = getQuickNoteUriFromReactNativeAsyncStorage(context)
        if (rnUri != null) {
            Log.i(TAG, "React Native method succeeded")
            return rnUri
        }
        
        // Try enhanced method
        val enhancedResult = getQuickNoteDataEnhanced(context)
        if (enhancedResult != null) {
            Log.i(TAG, "Enhanced method succeeded")
            return enhancedResult.uri
        }
        
        // Try comprehensive search
        val searchResult = searchForQuickNoteInAllPrefs(context)
        if (searchResult != null) {
            Log.i(TAG, "Search method found data")
            if (searchResult.isJson) {
                try {
                    val jsonObject = JSONObject(searchResult.value)
                    if (jsonObject.has("quickNoteUri") && !jsonObject.isNull("quickNoteUri")) {
                        return jsonObject.getString("quickNoteUri")
                    }
                } catch (e: Exception) {
                    Log.w(TAG, "Error parsing search result JSON: ${e.message}")
                }
            }
            
            // If direct URI
            if (searchResult.value.startsWith("content://") ||
                searchResult.value.startsWith("file://")) {
                return searchResult.value
            }
        }
        
        Log.e(TAG, "All comprehensive methods failed")
        return null
    }
}