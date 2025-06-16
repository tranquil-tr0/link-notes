package com.anonymous.linknotes

import android.content.Context
import android.database.sqlite.SQLiteDatabase
import android.util.Log
import org.json.JSONException
import java.io.File

object AsyncStorageHelper {
    private const val TAG = "AsyncStorageHelper"
    private const val DATABASE_NAME = "RKStorage"
    private const val QUICK_NOTE_URI_KEY = "user_preference_quickNoteUri"
    
    /**
     * Validates AsyncStorage access by checking if RKStorage database is accessible
     */
    fun validateAsyncStorage(context: Context): Boolean {
        return try {
            val dbPath = getDatabasePath(context)
            val dbFile = File(dbPath)
            
            if (!dbFile.exists()) {
                Log.w(TAG, "RKStorage database does not exist at: $dbPath")
                return false
            }
            
            val db = SQLiteDatabase.openDatabase(dbPath, null, SQLiteDatabase.OPEN_READONLY)
            db.use {
                // Try to query the database to validate access
                val cursor = it.rawQuery("SELECT name FROM sqlite_master WHERE type='table' AND name='catalystLocalStorage'", null)
                cursor.use { c ->
                    val hasTable = c.moveToFirst()
                    Log.d(TAG, "AsyncStorage validation successful, catalystLocalStorage table exists: $hasTable")
                    hasTable
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "AsyncStorage validation failed", e)
            false
        }
    }
    
    /**
     * Get the path to the RKStorage database
     */
    private fun getDatabasePath(context: Context): String {
        return File(context.getDatabasePath("dummy").parent, DATABASE_NAME).absolutePath
    }
    
    fun getQuickNoteUri(context: Context): String? {
        return try {
            val dbPath = getDatabasePath(context)
            val dbFile = File(dbPath)
            
            if (!dbFile.exists()) {
                Log.w(TAG, "RKStorage database does not exist at: $dbPath")
                return null
            }
            
            Log.d(TAG, "Opening RKStorage database at: $dbPath")
            
            val db = SQLiteDatabase.openDatabase(dbPath, null, SQLiteDatabase.OPEN_READONLY)
            db.use {
                val cursor = it.rawQuery(
                    "SELECT value FROM catalystLocalStorage WHERE key = ?",
                    arrayOf(QUICK_NOTE_URI_KEY)
                )
                
                cursor.use { c ->
                    if (c.moveToFirst()) {
                        val jsonValue = c.getString(0)
                        Log.d(TAG, "Retrieved quick note URI from database: $jsonValue")
                        
                        if (jsonValue != null) {
                            // The value is stored as JSON string, so we need to parse it
                            when {
                                jsonValue == "null" -> {
                                    Log.d(TAG, "Quick note URI is null")
                                    null
                                }
                                jsonValue.startsWith("\"") && jsonValue.endsWith("\"") -> {
                                    // Remove surrounding quotes for string values
                                    val uri = jsonValue.substring(1, jsonValue.length - 1)
                                    Log.d(TAG, "Parsed quick note URI: $uri")
                                    uri
                                }
                                else -> {
                                    Log.d(TAG, "Quick note URI (raw): $jsonValue")
                                    jsonValue
                                }
                            }
                        } else {
                            Log.d(TAG, "Quick note URI value is null in database")
                            null
                        }
                    } else {
                        Log.d(TAG, "Quick note URI key not found in database")
                        null
                    }
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error reading quick note URI from RKStorage database", e)
            null
        }
    }
}