package com.anonymous.linknotes

import android.net.Uri
import android.util.Log

object UriHelper {
    private const val TAG = "UriHelper"
    
    /**
     * Extracts filename from various URI formats
     * Handles both SAF URIs (content://) and regular file paths
     */
    fun extractFilenameFromUri(uri: String): String {
        Log.d(TAG, "Extracting filename from URI: $uri")
        
        return try {
            val filename = when {
                uri.startsWith("content://") -> {
                    // SAF URI - extract filename from the end
                    val decodedUri = Uri.decode(uri)
                    val parts = decodedUri.split("/")
                    val lastPart = parts.lastOrNull() ?: "untitled"
                    
                    // Handle cases where filename might be in different positions
                    if (lastPart.contains(".md")) {
                        lastPart
                    } else {
                        // Try to find .md file in the URI
                        parts.find { it.contains(".md") } ?: lastPart
                    }
                }
                uri.startsWith("file://") -> {
                    // File URI - extract filename
                    val path = uri.removePrefix("file://")
                    path.split("/").lastOrNull() ?: "untitled"
                }
                else -> {
                    // Regular file path
                    uri.split("/").lastOrNull() ?: "untitled"
                }
            }
            
            // Clean filename by removing .md extension
            val cleanFilename = filename.removeSuffix(".md")
            if (cleanFilename.isEmpty()) "untitled" else cleanFilename
            
        } catch (e: Exception) {
            Log.e(TAG, "Error extracting filename from URI: $uri", e)
            "untitled"
        }
    }

    /**
     * Extracts folder path from URI if applicable
     * Returns null if no folder path can be determined
     */
    fun extractFolderPathFromUri(uri: String): String? {
        return try {
            Log.d(TAG, "Extracting folder path from URI: $uri")
            
            val folderPath = when {
                uri.startsWith("content://") -> {
                    // For SAF URIs, folder path extraction is complex and may not be reliable
                    // We'll keep it simple and return null for now
                    null
                }
                uri.startsWith("file://") -> {
                    // File URI - extract directory path
                    val path = uri.removePrefix("file://")
                    val lastSlash = path.lastIndexOf("/")
                    if (lastSlash > 0) path.substring(0, lastSlash) else null
                }
                else -> {
                    // Regular file path - extract directory
                    val lastSlash = uri.lastIndexOf("/")
                    if (lastSlash > 0) uri.substring(0, lastSlash) else null
                }
            }
            
            Log.d(TAG, "Extracted folder path: $folderPath")
            folderPath
            
        } catch (e: Exception) {
            Log.e(TAG, "Error extracting folder path from URI: $uri", e)
            null        }
    }

    /**
     * Builds a deep link URL for the editor screen
     */
    fun buildEditorDeepLink(filename: String, folderPath: String? = null): String {
        Log.d(TAG, "Building editor deep link for: $filename, folder: $folderPath")
        
        return try {
            val encodedFilename = Uri.encode(filename.ifEmpty { "untitled" })
            val baseUrl = "linknotes://editor?mode=edit&noteId=$encodedFilename"
            
            val deepLink = if (folderPath != null) {
                val encodedFolderPath = Uri.encode(folderPath)
                "$baseUrl&folderPath=$encodedFolderPath"
            } else {
                baseUrl
            }
            
            Log.d(TAG, "Generated deep link: $deepLink")
            deepLink
            
        } catch (e: Exception) {
            Log.e(TAG, "Error building editor deep link", e)
            val fallbackLink = "linknotes://editor?mode=edit&noteId=untitled"
            Log.w(TAG, "Using fallback deep link: $fallbackLink")
            fallbackLink
        }
    }

    /**
     * Builds a deep link URL for the settings screen with toast message
     */
    fun buildSettingsDeepLink(message: String): String {
        return try {
            val encodedMessage = Uri.encode(message)
            val deepLink = "linknotes://settings?showToast=true&message=$encodedMessage"
            Log.d(TAG, "Built settings deep link: $deepLink")
            deepLink
        } catch (e: Exception) {
            Log.e(TAG, "Error building settings deep link", e)
            "linknotes://settings"
        }
    }

    /**
     * Validates if a URI string is properly formatted
     */
    fun isValidUri(uri: String?): Boolean {
        if (uri.isNullOrEmpty()) return false
        
        return try {
            when {
                uri.startsWith("content://") -> {
                    Uri.parse(uri) != null
                }
                uri.startsWith("file://") -> {
                    Uri.parse(uri) != null
                }
                uri.contains("/") -> {
                    // Regular path - basic validation
                    uri.isNotBlank()
                }
                else -> false
            }
        } catch (e: Exception) {
            Log.e(TAG, "URI validation failed for: $uri", e)
            false
        }
    }
}