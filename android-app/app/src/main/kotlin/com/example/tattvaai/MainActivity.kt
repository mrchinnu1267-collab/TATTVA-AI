package com.example.tattvaai

import android.Manifest
import android.annotation.SuppressLint
import android.app.AlertDialog
import android.app.DownloadManager
import android.content.ContentValues
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.media.MediaScannerConnection
import android.net.Uri
import android.net.http.SslError
import android.os.Build
import android.os.Bundle
import android.os.Environment
import android.provider.MediaStore
import android.util.Base64
import android.view.View
import android.view.ViewGroup
import android.webkit.*
import android.widget.*
import androidx.activity.ComponentActivity
import androidx.activity.result.contract.ActivityResultContracts
import java.io.File
import java.io.FileOutputStream

class MainActivity : ComponentActivity() {

    private lateinit var webView: WebView
    private lateinit var progressBar: ProgressBar
    private lateinit var errorLayout: LinearLayout
    private lateinit var errorText: TextView
    private lateinit var btnRetry: Button
    private lateinit var btnSettings: Button

    private var fileUploadCallback: ValueCallback<Array<Uri>>? = null

    companion object {
        private const val PREFS_NAME = "TattvaPrefs"
        private const val KEY_SERVER_URL = "server_url"
        private const val DEFAULT_URL = "https://parade-predictions-bride-delhi.trycloudflare.com"
    }

    private val filePickerLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        if (fileUploadCallback != null) {
            val results: Array<Uri>? = if (result.resultCode == RESULT_OK && result.data != null) {
                val data = result.data
                if (data?.clipData != null) {
                    val count = data.clipData!!.itemCount
                    Array(count) { i -> data.clipData!!.getItemAt(i).uri }
                } else if (data?.data != null) {
                    arrayOf(data.data!!)
                } else null
            } else null
            fileUploadCallback?.onReceiveValue(results)
            fileUploadCallback = null
        }
    }

    private val permissionsLauncher = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { _ ->
        // Continue loading once runtime permissions resolved
    }

    /**
     * JavaScript Interface to reliably bridge file downloads from WebView to Android Downloads
     */
    inner class AndroidBridge {
        @JavascriptInterface
        fun saveBlobOrData(base64OrDataUri: String, filename: String, mimeType: String) {
            saveBase64ToDownloads(base64OrDataUri, filename, mimeType)
        }

        @JavascriptInterface
        fun showToast(message: String) {
            runOnUiThread {
                Toast.makeText(this@MainActivity, message, Toast.LENGTH_SHORT).show()
            }
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Request runtime permissions for voice assistant and attachments
        val requiredPerms = mutableListOf(
            Manifest.permission.RECORD_AUDIO,
            Manifest.permission.CAMERA
        )
        if (Build.VERSION.SDK_INT <= Build.VERSION_CODES.P) {
            requiredPerms.add(Manifest.permission.WRITE_EXTERNAL_STORAGE)
        }
        permissionsLauncher.launch(requiredPerms.toTypedArray())

        val rootLayout = FrameLayout(this).apply {
            layoutParams = ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
            )
        }

        webView = WebView(this).apply {
            layoutParams = FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT
            )
        }

        progressBar = ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal).apply {
            layoutParams = FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                8
            )
            max = 100
            visibility = View.GONE
        }

        errorLayout = createErrorLayout()

        rootLayout.addView(webView)
        rootLayout.addView(progressBar)
        rootLayout.addView(errorLayout)
        setContentView(rootLayout)

        configureWebView()
        loadTattvaApp()
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun configureWebView() {
        val settings = webView.settings
        settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            mediaPlaybackRequiresUserGesture = false // Allows voice assistant replies without extra user tap
            allowFileAccess = true
            allowContentAccess = true
            setSupportZoom(false)
            builtInZoomControls = false
            displayZoomControls = false
            useWideViewPort = true
            loadWithOverviewMode = true
            cacheMode = WebSettings.LOAD_DEFAULT
            mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
            userAgentString = settings.userAgentString + " TattvaAI-Android"
        }

        // Expose AndroidBridge
        webView.addJavascriptInterface(AndroidBridge(), "AndroidBridge")

        webView.webChromeClient = object : WebChromeClient() {
            override fun onPermissionRequest(request: PermissionRequest?) {
                runOnUiThread {
                    request?.grant(request.resources)
                }
            }

            override fun onShowFileChooser(
                webView: WebView?,
                filePathCallback: ValueCallback<Array<Uri>>?,
                fileChooserParams: FileChooserParams?
            ): Boolean {
                fileUploadCallback?.onReceiveValue(null)
                fileUploadCallback = filePathCallback

                val intent = Intent(Intent.ACTION_GET_CONTENT).apply {
                    addCategory(Intent.CATEGORY_OPENABLE)
                    type = "*/*"
                    putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true)
                }
                filePickerLauncher.launch(Intent.createChooser(intent, "Choose Attachment"))
                return true
            }

            override fun onProgressChanged(view: WebView?, newProgress: Int) {
                if (newProgress < 100) {
                    progressBar.visibility = View.VISIBLE
                    progressBar.progress = newProgress
                } else {
                    progressBar.visibility = View.GONE
                }
            }
        }

        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
                val url = request?.url?.toString() ?: return false
                val serverUrl = getServerUrl()
                return if (url.startsWith(serverUrl) ||
                    url.startsWith("http://192.168.") ||
                    url.startsWith("http://10.") ||
                    url.startsWith("http://172.") ||
                    url.startsWith("http://127.0.0.1") ||
                    url.startsWith("http://localhost")
                ) {
                    false
                } else {
                    try {
                        startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)))
                        true
                    } catch (e: Exception) {
                        false
                    }
                }
            }

            override fun onReceivedSslError(view: WebView?, handler: SslErrorHandler?, error: SslError?) {
                handler?.proceed()
            }

            override fun onPageStarted(view: WebView?, url: String?, favicon: Bitmap?) {
                errorLayout.visibility = View.GONE
            }

            override fun onReceivedError(view: WebView?, request: WebResourceRequest?, error: WebResourceError?) {
                if (request?.isForMainFrame == true) {
                    errorLayout.visibility = View.VISIBLE
                    errorText.text = "Unable to connect to TATTVA AI Server:\n" + getServerUrl() + "\n\nPlease make sure your server is running and your Android phone is on the same Wi-Fi network."
                }
            }
        }

        webView.setDownloadListener { url, userAgent, contentDisposition, mimeType, _ ->
            handleDownload(url, userAgent, contentDisposition, mimeType)
        }
    }

    private fun handleDownload(url: String, userAgent: String, contentDisposition: String, mimeType: String) {
        val suggestedFilename = URLUtil.guessFileName(url, contentDisposition, mimeType)

        if (url.startsWith("data:")) {
            saveBase64ToDownloads(url, suggestedFilename, mimeType)
        } else if (url.startsWith("blob:")) {
            val js = """
                (async function() {
                    try {
                        const response = await fetch('$url');
                        const blob = await response.blob();
                        const reader = new FileReader();
                        reader.onloadend = function() {
                            window.AndroidBridge.saveBlobOrData(reader.result, '$suggestedFilename', '$mimeType');
                        };
                        reader.readAsDataURL(blob);
                    } catch(err) {
                        console.error('Blob capture error:', err);
                    }
                })();
            """.trimIndent()
            webView.evaluateJavascript(js, null)
        } else {
            try {
                val request = DownloadManager.Request(Uri.parse(url)).apply {
                    setMimeType(mimeType)
                    addRequestHeader("User-Agent", userAgent)
                    setDescription("Downloading TATTVA AI file...")
                    setTitle(suggestedFilename)
                    setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
                    setDestinationInExternalPublicDir(
                        Environment.DIRECTORY_DOWNLOADS,
                        suggestedFilename
                    )
                }
                val dm = getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager
                dm.enqueue(request)
                Toast.makeText(this, "Download started...", Toast.LENGTH_SHORT).show()
            } catch (e: Exception) {
                Toast.makeText(this, "Download error: " + e.message, Toast.LENGTH_SHORT).show()
            }
        }
    }

    private fun saveBase64ToDownloads(dataUriOrBase64: String, rawFilename: String, mimeType: String) {
        try {
            val base64Clean = if (dataUriOrBase64.contains(",")) {
                dataUriOrBase64.substringAfter(",")
            } else {
                dataUriOrBase64
            }
            val bytes = Base64.decode(base64Clean, Base64.DEFAULT)
            val cleanName = if (rawFilename.isBlank()) "tattva_download_${System.currentTimeMillis()}" else rawFilename
            val resolvedMime = if (mimeType.isBlank()) "application/octet-stream" else mimeType

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                val contentValues = ContentValues().apply {
                    put(MediaStore.MediaColumns.DISPLAY_NAME, cleanName)
                    put(MediaStore.MediaColumns.MIME_TYPE, resolvedMime)
                    put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS)
                }
                val uri = contentResolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, contentValues)
                if (uri != null) {
                    contentResolver.openOutputStream(uri)?.use { os ->
                        os.write(bytes)
                    }
                    runOnUiThread {
                        Toast.makeText(this, "Saved $cleanName to Downloads", Toast.LENGTH_LONG).show()
                    }
                    return
                }
            }

            val dir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS)
            if (!dir.exists()) dir.mkdirs()
            val file = File(dir, cleanName)
            FileOutputStream(file).use { fos ->
                fos.write(bytes)
            }
            MediaScannerConnection.scanFile(this, arrayOf(file.absolutePath), arrayOf(resolvedMime), null)
            runOnUiThread {
                Toast.makeText(this, "Saved $cleanName to Downloads", Toast.LENGTH_LONG).show()
            }
        } catch (e: Exception) {
            runOnUiThread {
                Toast.makeText(this, "Save failed: ${e.message}", Toast.LENGTH_SHORT).show()
            }
        }
    }

    private fun loadTattvaApp() {
        val url = getServerUrl()
        webView.loadUrl(url)
    }

    private fun getServerUrl(): String {
        val prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        return prefs.getString(KEY_SERVER_URL, DEFAULT_URL) ?: DEFAULT_URL
    }

    private fun setServerUrl(url: String) {
        val cleanUrl = if (!url.startsWith("http://") && !url.startsWith("https://")) {
            "http://" + url
        } else url
        getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .edit()
            .putString(KEY_SERVER_URL, cleanUrl.trimEnd('/'))
            .apply()
        loadTattvaApp()
    }

    private fun showServerConfigDialog() {
        val currentUrl = getServerUrl()
        val input = EditText(this).apply {
            setText(currentUrl)
            setSelection(currentUrl.length)
            hint = "e.g. http://192.168.0.207:3000 or https://your-server.com"
        }

        AlertDialog.Builder(this)
            .setTitle("TATTVA AI Server Configuration")
            .setMessage("Set your local Wi-Fi or remote server address:")
            .setView(input)
            .setPositiveButton("Connect") { _, _ ->
                val newUrl = input.text.toString().trim()
                if (newUrl.isNotEmpty()) {
                    setServerUrl(newUrl)
                }
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    private fun createErrorLayout(): LinearLayout {
        return LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = android.view.Gravity.CENTER
            setBackgroundColor(android.graphics.Color.parseColor("#0B0F19"))
            setPadding(48, 48, 48, 48)
            visibility = View.GONE
            layoutParams = FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT
            )

            val titleView = TextView(context).apply {
                text = "TATTVA AI"
                textSize = 28f
                setTextColor(android.graphics.Color.parseColor("#38BDF8"))
                gravity = android.view.Gravity.CENTER
                setTypeface(null, android.graphics.Typeface.BOLD)
            }
            addView(titleView)

            errorText = TextView(context).apply {
                text = "Connecting to TATTVA AI..."
                textSize = 14f
                setTextColor(android.graphics.Color.parseColor("#94A3B8"))
                gravity = android.view.Gravity.CENTER
                setPadding(0, 24, 0, 48)
            }
            addView(errorText)

            btnRetry = Button(context).apply {
                text = "Retry Connection"
                setBackgroundColor(android.graphics.Color.parseColor("#6366F1"))
                setTextColor(android.graphics.Color.WHITE)
                setOnClickListener {
                    errorLayout.visibility = View.GONE
                    loadTattvaApp()
                }
            }
            addView(btnRetry)

            btnSettings = Button(context).apply {
                text = "Configure Server Address"
                setBackgroundColor(android.graphics.Color.parseColor("#1E293B"))
                setTextColor(android.graphics.Color.parseColor("#CBD5E1"))
                setOnClickListener {
                    showServerConfigDialog()
                }
            }
            addView(btnSettings)
        }
    }

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack()
        } else {
            showExitOrSettingsDialog()
        }
    }

    private fun showExitOrSettingsDialog() {
        AlertDialog.Builder(this)
            .setTitle("TATTVA AI")
            .setMessage("Exit application or configure server address?")
            .setPositiveButton("Exit") { _, _ -> finish() }
            .setNeutralButton("Server Settings") { _, _ -> showServerConfigDialog() }
            .setNegativeButton("Stay", null)
            .show()
    }
}
