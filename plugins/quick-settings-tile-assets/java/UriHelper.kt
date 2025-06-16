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
        Log.i(TAG, "=== EXTRACTING FILENAME FROM URI ===")
        Log.i(TAG, "Input URI: $uri")
        Log.i(TAG, "URI length: ${uri.length}")
        
        return try {
            // Step 1: Determine URI type
            Log.d(TAG, "Step 1: Determining URI type...")
            val uriType = when {
                uri.startsWith("content://") -> "SAF URI"
                uri.startsWith("file://") -> "File URI"
                uri.contains("/") -> "File Path"
                else -> "Unknown"
            }
            Log.i(TAG, "URI type: $uriType")
            
            // Step 2: Extract filename based on type
            Log.d(TAG, "Step 2: Extracting filename based on type...")
            val filename = when {
                uri.startsWith("content://") -> {
                    Log.d(TAG, "Processing SAF URI...")
                    // SAF URI - extract filename from the end
                    val decodedUri = Uri.decode(uri)
                    Log.i(TAG, "Decoded URI: $decodedUri")
                    
                    val parts = decodedUri.split("/")
                    Log.i(TAG, "URI parts: $parts")
                    Log.i(TAG, "Parts count: ${parts.size}")
                    
                    val lastPart = parts.lastOrNull() ?: "untitled"
                    Log.i(TAG, "Last part: $lastPart")
                    
                    // Handle cases where filename might be in different positions
                    if (lastPart.contains(".md")) {
                        Log.i(TAG, "Found .md in last part")
                        lastPart
                    } else {
                        Log.d(TAG, "Searching for .md in all parts...")
                        // Try to find .md file in the URI
                        val mdPart = parts.find { it.contains(".md") }
                        Log.i(TAG, "Found .md part: ${mdPart ?: "NONE"}")
                        mdPart ?: lastPart
                    }
                }
                uri.startsWith("file://") -> {
                    Log.d(TAG, "Processing File URI...")
                    // File URI - extract filename
                    val path = uri.removePrefix("file://")
                    Log.i(TAG, "File path: $path")
                    
                    val parts = path.split("/")
                    Log.i(TAG, "Path parts: $parts")
                    
                    val filename = parts.lastOrNull() ?: "untitled"
                    Log.i(TAG, "Extracted filename: $filename")
                    filename
                }
                else -> {
                    Log.d(TAG, "Processing regular file path...")
                    // Regular file path
                    val parts = uri.split("/")
                    Log.i(TAG, "Path parts: $parts")
                    
                    val filename = parts.lastOrNull() ?: "untitled"
                    Log.i(TAG, "Extracted filename: $filename")
                    filename
                }
            }
            
            Log.i(TAG, "Raw filename: $filename")
            
            // Step 3: Clean filename
            Log.d(TAG, "Step 3: Cleaning filename...")
            val cleanFilename = filename.removeSuffix(".md")
            Log.i(TAG, "Clean filename: $cleanFilename")
            
            if (cleanFilename.isEmpty()) {
                Log.w(TAG, "Clean filename is empty, using 'untitled'")
                "untitled"
            } else {
                cleanFilename
            }
            
        } catch (e: Exception) {
            Log.e(TAG, "CRITICAL ERROR extracting filename from URI: $uri", e)
            Log.e(TAG, "Exception type: ${e.javaClass.simpleName}")
            Log.e(TAG, "Exception message: ${e.message}")
            "untitled"
        } finally {
            Log.i(TAG, "=== FILENAME EXTRACTION COMPLETE ===")
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
            null
        }
    }

    /**
     * Builds a deep link URL for the editor screen
     */
    fun buildEditorDeepLink(filename: String, folderPath: String? = null): String {
        Log.i(TAG, "=== BUILDING EDITOR DEEP LINK ===")
        Log.i(TAG, "Input filename: '$filename'")
        Log.i(TAG, "Input folder path: ${folderPath ?: "NULL"}")
        
        return try {
            // Step 1: Validate inputs
            Log.d(TAG, "Step 1: Validating inputs...")
            if (filename.isEmpty()) {
                Log.w(TAG, "Filename is empty, using 'untitled'")
            }
            
            // Step 2: Encode filename
            Log.d(TAG, "Step 2: Encoding filename...")
            val encodedFilename = Uri.encode(filename)
            Log.i(TAG, "Encoded filename: '$encodedFilename'")
            
            // Step 3: Build base URL
            Log.d(TAG, "Step 3: Building base URL...")
            val baseUrl = "myapp://editor?mode=edit&noteId=$encodedFilename"
            Log.i(TAG, "Base URL: $baseUrl")
            
            // Step 4: Add folder path if present
            Log.d(TAG, "Step 4: Processing folder path...")
            val deepLink = if (folderPath != null) {
                Log.d(TAG, "Adding folder path to deep link...")
                val encodedFolderPath = Uri.encode(folderPath)
                Log.i(TAG, "Encoded folder path: '$encodedFolderPath'")
                val fullUrl = "$baseUrl&folderPath=$encodedFolderPath"
                Log.i(TAG, "Full URL with folder: $fullUrl")
                fullUrl
            } else {
                Log.d(TAG, "No folder path provided, using base URL")
                baseUrl
            }
            
            // Step 5: Validate final deep link
            Log.d(TAG, "Step 5: Validating final deep link...")
            if (deepLink.startsWith("myapp://editor")) {
                Log.i(TAG, "Deep link validation successful")
            } else {
                Log.w(TAG, "Deep link validation warning: doesn't start with expected prefix")
            }
            
            Log.i(TAG, "Final deep link: $deepLink")
            deepLink
            
        } catch (e: Exception) {
            Log.e(TAG, "CRITICAL ERROR building editor deep link", e)
            Log.e(TAG, "Exception type: ${e.javaClass.simpleName}")
            Log.e(TAG, "Exception message: ${e.message}")
            Log.e(TAG, "Input filename: '$filename'")
            Log.e(TAG, "Input folder path: ${folderPath ?: "NULL"}")
            
            val fallbackLink = "myapp://editor?mode=edit&noteId=untitled"
            Log.w(TAG, "Using fallback deep link: $fallbackLink")
            fallbackLink
        } finally {
            Log.i(TAG, "=== DEEP LINK BUILDING COMPLETE ===")
        }
    }

    /**
     * Builds a deep link URL for the settings screen with toast message
     */
    fun buildSettingsDeepLink(message: String): String {
        return try {
            val encodedMessage = Uri.encode(message)
            val deepLink = "myapp://settings?showToast=true&message=$encodedMessage"
            Log.d(TAG, "Built settings deep link: $deepLink")
            deepLink
        } catch (e: Exception) {
            Log.e(TAG, "Error building settings deep link", e)
            "myapp://settings"
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