package com.example.tattvaai

import android.Manifest
import android.annotation.SuppressLint
import android.app.AlertDialog
import android.app.DownloadManager
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Environment
import android.view.View
import android.view.ViewGroup
import android.webkit.*
import android.widget.*
import androidx.activity.ComponentActivity
import androidx.activity.result.contract.ActivityResultContracts

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
        private const val DEFAULT_URL = "http://192.168.0.207:3000"
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
    ) { permissions ->
        val audioGranted = permissions[Manifest.permission.RECORD_AUDIO] ?: false
        if (!audioGranted) {
            Toast.makeText(this, "Microphone permission is required for voice assistant.", Toast.LENGTH_SHORT).show()
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        requestRequiredPermissions()

        val rootLayout = FrameLayout(this).apply {
            layoutParams = ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
            )
            setBackgroundColor(android.graphics.Color.parseColor("#0B0F19"))
        }

        webView = WebView(this).apply {
            layoutParams = FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT
            )
            setBackgroundColor(android.graphics.Color.TRANSPARENT)
        }

        progressBar = ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal).apply {
            layoutParams = FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                8
            )
            isIndeterminate = false
            max = 100
            visibility = View.GONE
        }

        errorLayout = createErrorLayout()

        rootLayout.addView(webView)
        rootLayout.addView(progressBar)
        rootLayout.addView(errorLayout)

        setContentView(rootLayout)

        setupWebView()
        loadTattvaApp()
    }

    private fun requestRequiredPermissions() {
        val permissions = mutableListOf(
            Manifest.permission.RECORD_AUDIO,
            Manifest.permission.CAMERA
        )
        if (Build.VERSION.SDK_INT <= Build.VERSION_CODES.S_V2) {
            permissions.add(Manifest.permission.READ_EXTERNAL_STORAGE)
            permissions.add(Manifest.permission.WRITE_EXTERNAL_STORAGE)
        }
        permissionsLauncher.launch(permissions.toTypedArray())
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun setupWebView() {
        val settings = webView.settings
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true
        settings.databaseEnabled = true
        settings.allowFileAccess = true
        settings.allowContentAccess = true
        settings.mediaPlaybackRequiresUserGesture = false
        settings.useWideViewPort = true
        settings.loadWithOverviewMode = true
        settings.cacheMode = WebSettings.LOAD_DEFAULT
        settings.mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
        settings.userAgentString = settings.userAgentString + " TATTVA_AI_Android_App/1.0"

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
                return if (url.startsWith(serverUrl) || url.startsWith("http://192.168.") || url.startsWith("http://10.") || url.startsWith("http://localhost")) {
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

            override fun onPageStarted(view: WebView?, url: String?, favicon: Bitmap?) {
                errorLayout.visibility = View.GONE
            }

            override fun onReceivedError(view: WebView?, request: WebResourceRequest?, error: WebResourceError?) {
                if (request?.isForMainFrame == true) {
                    errorLayout.visibility = View.VISIBLE
                    errorText.text = "Unable to connect to TATTVA AI Server:\n" + getServerUrl() + "\n\nPlease make sure your server is running and your phone is connected to the same Wi-Fi network."
                }
            }
        }

        webView.setDownloadListener { url, userAgent, contentDisposition, mimeType, contentLength ->
            try {
                val request = DownloadManager.Request(Uri.parse(url)).apply {
                    setMimeType(mimeType)
                    addRequestHeader("User-Agent", userAgent)
                    setDescription("Downloading TATTVA AI file...")
                    setTitle(URLUtil.guessFileName(url, contentDisposition, mimeType))
                    setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
                    setDestinationInExternalPublicDir(
                        Environment.DIRECTORY_DOWNLOADS,
                        URLUtil.guessFileName(url, contentDisposition, mimeType)
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
            hint = "e.g. http://192.168.0.207:3000 or https://tattva-ai.vercel.app"
        }

        AlertDialog.Builder(this)
            .setTitle("TATTVA AI Server Configuration")
            .setMessage("Set your local Wi-Fi or cloud server address:")
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
