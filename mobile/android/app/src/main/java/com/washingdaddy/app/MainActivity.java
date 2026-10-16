package com.washingdaddy.app;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.provider.MediaStore;
import android.util.Log;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.CookieManager;
import android.webkit.JavascriptInterface;
import android.webkit.RenderProcessGoneDetail;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import androidx.core.content.FileProvider;

import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.util.HashMap;
import java.util.Map;

/**
 * Washing Daddy app shell (customer and washer flavors).
 *
 * The web app ships inside the APK under assets/www and is served at
 * https://washingdaddy.com + BuildConfig.SCOPE, so it opens with no signal and has the same
 * origin (localStorage, Firebase) as the website. Live sync goes straight to Firebase.
 *
 * Handled here because a plain WebView gets them wrong:
 *   1. Camera: <input type=file capture> needs onShowFileChooser with a camera intent.
 *   2. localStorage: off by default; the washer's offline queue depends on it.
 *   3. Status bar colour follows the page's theme-color (day/night) via WDNative.setBarColor.
 *   4. Phone sign-in: Firebase checks for robots with an invisible reCAPTCHA from google.com,
 *      which needs third-party cookies in the WebView.
 */
public class MainActivity extends Activity {

  private static final String ORIGIN_HOST = "washingdaddy.com";
  private static final String HOME = "https://" + ORIGIN_HOST + BuildConfig.SCOPE;
  private static final int REQ_FILE = 1001;
  private static final Map<String, String> MIME = new HashMap<>();
  static {
    MIME.put("html", "text/html"); MIME.put("js", "application/javascript"); MIME.put("css", "text/css");
    MIME.put("json", "application/json"); MIME.put("webmanifest", "application/manifest+json");
    MIME.put("png", "image/png"); MIME.put("jpg", "image/jpeg"); MIME.put("webp", "image/webp");
    MIME.put("svg", "image/svg+xml"); MIME.put("woff2", "font/woff2");
  }

  private WebView web;
  private ValueCallback<Uri[]> pending;
  private Uri shotUri;

  @SuppressLint({"SetJavaScriptEnabled", "AddJavascriptInterface"})
  @Override
  protected void onCreate(Bundle saved) {
    super.onCreate(saved);
    if (BuildConfig.KEEP_SCREEN_ON) getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
    setBarColor(BuildConfig.BAR);

    web = new WebView(this);
    web.setBackgroundColor(Color.parseColor(BuildConfig.BAR));
    setContentView(web);
    WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG);

    WebSettings s = web.getSettings();
    s.setJavaScriptEnabled(true);
    s.setDomStorageEnabled(true);
    s.setDatabaseEnabled(true);
    s.setMediaPlaybackRequiresUserGesture(false);
    s.setAllowFileAccess(false);
    s.setAllowContentAccess(true);
    s.setSupportZoom(false);
    s.setBuiltInZoomControls(false);
    s.setTextZoom(100);
    s.setUserAgentString(s.getUserAgentString() + " WashingDaddyApp/" + BuildConfig.VERSION_NAME);

    CookieManager.getInstance().setAcceptCookie(true);
    CookieManager.getInstance().setAcceptThirdPartyCookies(web, true);

    web.addJavascriptInterface(new Object() {
      @JavascriptInterface public void setBarColor(final String c) { runOnUiThread(() -> MainActivity.this.setBarColor(c)); }
    }, "WDNative");

    web.setWebViewClient(new WebViewClient() {
      @Override
      public WebResourceResponse shouldInterceptRequest(WebView v, WebResourceRequest req) {
        Uri u = req.getUrl();
        if (!ORIGIN_HOST.equals(u.getHost()) || !"GET".equals(req.getMethod())) return null;
        String path = u.getPath() == null ? "/" : u.getPath();
        if (!path.startsWith(BuildConfig.SCOPE)) return null;
        String rel = path.substring(BuildConfig.SCOPE.length());
        if (rel.isEmpty() || rel.endsWith("/")) rel += "index.html";
        try {
          InputStream in = getAssets().open("www/" + rel);
          String ext = rel.substring(rel.lastIndexOf('.') + 1).toLowerCase();
          String mime = MIME.containsKey(ext) ? MIME.get(ext) : "application/octet-stream";
          WebResourceResponse r = new WebResourceResponse(mime, "utf-8", in);
          Map<String, String> h = new HashMap<>();
          h.put("Cache-Control", "no-cache");
          r.setResponseHeaders(h);
          return r;
        } catch (IOException e) {
          return null;   // not bundled: let it go to the network
        }
      }

      // If the page's renderer dies (low memory), Android kills the whole app unless we handle it here.
      // Start fresh instead: the apps keep their state in localStorage.
      @Override
      public boolean onRenderProcessGone(WebView v, RenderProcessGoneDetail detail) {
        Log.w("WashingDaddy", "renderer gone, crashed=" + detail.didCrash() + " priority=" + detail.rendererPriorityAtExit());
        if (web == v) {
          web = null;
          ((android.view.ViewGroup) v.getParent()).removeView(v);
          v.destroy();
          recreate();
        }
        return true;
      }

      @Override
      public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest req) {
        Uri u = req.getUrl();
        String path = u.getPath() == null ? "" : u.getPath();
        if (ORIGIN_HOST.equals(u.getHost()) && path.startsWith(BuildConfig.SCOPE)) return false;
        // Everything else (WhatsApp, phone, UPI, other pages of the site) opens outside the app.
        try {
          startActivity(new Intent(Intent.ACTION_VIEW, u));
        } catch (Exception e) {
          Toast.makeText(MainActivity.this, u.toString(), Toast.LENGTH_SHORT).show();
        }
        return true;
      }
    });

    web.setWebChromeClient(new WebChromeClient() {
      @Override
      public boolean onShowFileChooser(WebView v, ValueCallback<Uri[]> cb, FileChooserParams params) {
        if (pending != null) pending.onReceiveValue(null);
        pending = cb;
        shotUri = null;
        Intent camera = buildCameraIntent();
        Intent target;
        if (params.isCaptureEnabled() && camera != null) {
          target = camera;                                   // capture: straight to the camera
        } else {
          Intent chooser = new Intent(Intent.ACTION_CHOOSER);
          chooser.putExtra(Intent.EXTRA_INTENT, params.createIntent());
          chooser.putExtra(Intent.EXTRA_TITLE, getString(R.string.pick_photo));
          if (camera != null) chooser.putExtra(Intent.EXTRA_INITIAL_INTENTS, new Intent[]{camera});
          target = chooser;
        }
        try {
          startActivityForResult(target, REQ_FILE);
        } catch (Exception e) {
          pending = null;
          cb.onReceiveValue(null);
          return false;
        }
        return true;
      }
    });

    if (saved != null) web.restoreState(saved);
    else web.loadUrl(HOME);
  }

  void setBarColor(String c) {
    try {
      int col = Color.parseColor(c.trim());
      Window w = getWindow();
      w.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
      w.setStatusBarColor(col);
      w.setNavigationBarColor(col);
      double lum = (0.299 * Color.red(col) + 0.587 * Color.green(col) + 0.114 * Color.blue(col)) / 255;
      View d = w.getDecorView();
      int f = d.getSystemUiVisibility();
      if (lum > 0.6) f |= View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR | View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
      else f &= ~(View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR | View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR);
      d.setSystemUiVisibility(f);
    } catch (Exception ignored) { }
  }

  /** Camera intent writing into our cache folder, shared through the FileProvider. */
  private Intent buildCameraIntent() {
    try {
      File dir = new File(getCacheDir(), "shots");
      if (!dir.exists() && !dir.mkdirs()) return null;
      File[] old = dir.listFiles();
      if (old != null) {
        long cutoff = System.currentTimeMillis() - 24L * 60 * 60 * 1000;
        for (File f : old) if (f.lastModified() < cutoff) f.delete();
      }
      File out = File.createTempFile("wd_", ".jpg", dir);
      shotUri = FileProvider.getUriForFile(this, getPackageName() + ".files", out);
      Intent i = new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
      i.putExtra(MediaStore.EXTRA_OUTPUT, shotUri);
      i.addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION | Intent.FLAG_GRANT_READ_URI_PERMISSION);
      if (i.resolveActivity(getPackageManager()) == null) { shotUri = null; return null; }
      return i;
    } catch (Exception e) {
      shotUri = null;
      return null;
    }
  }

  @Override
  protected void onActivityResult(int req, int result, Intent data) {
    if (req != REQ_FILE) { super.onActivityResult(req, result, data); return; }
    if (pending == null) return;
    Uri[] out = null;
    if (result == Activity.RESULT_OK) {
      if (data != null && data.getData() != null) out = new Uri[]{ data.getData() };
      else if (data != null && data.getClipData() != null && data.getClipData().getItemCount() > 0)
        out = new Uri[]{ data.getClipData().getItemAt(0).getUri() };
      else if (shotUri != null) out = new Uri[]{ shotUri };
    }
    pending.onReceiveValue(out);
    pending = null;
  }

  @Override
  protected void onSaveInstanceState(Bundle out) {
    super.onSaveInstanceState(out);
    if (web != null) web.saveState(out);
  }

  @Override
  public void onBackPressed() {
    if (web != null && web.canGoBack()) web.goBack();
    else super.onBackPressed();
  }

  @Override
  protected void onDestroy() {
    if (web != null) { web.setWebChromeClient(null); web.destroy(); web = null; }
    super.onDestroy();
  }
}
