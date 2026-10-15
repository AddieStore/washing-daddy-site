package com.washingdaddy.duty;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.os.Message;
import android.provider.MediaStore;
import android.view.ViewGroup;
import android.view.WindowManager;
import android.webkit.CookieManager;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.Toast;

import androidx.core.content.FileProvider;

import java.io.File;

/**
 * Washing Daddy — ek hi shell, do app.
 *
 * Yeh file dono flavour chalati hai:
 *   washer   → washingdaddy.com/w/   (washer ki duty list)
 *   customer → washingdaddy.com/my/  (customer ka apna car)
 *
 * Kaunsa URL kholna hai aur kaun si feature chahiye, woh flavour ki
 * res/values/ se aata hai — code ek hi rehta hai:
 *   @string/home_url     kaun sa page
 *   @bool/enable_camera   camera chooser chahiye ya nahi
 *   @bool/allow_popups    reCAPTCHA jaisi popup window chahiye ya nahi
 *   @bool/keep_screen_on  screen jagti rahe ya nahi
 *
 * Teen cheezein jo plain WebView mein tooti hui hoti hain:
 *   1. Camera — WebView apne aap <input type="file" capture> nahi khol sakta.
 *      Sirf washer app ko chahiye (customer photo nahi leta).
 *   2. localStorage / IndexedDB — default off. Washer ki offline queue aur
 *      customer ke Firebase OTP session, dono isi par tikay hain. Dono ko chahiye.
 *   3. Third-party cookies aur popup window — Firebase phone OTP ka reCAPTCHA
 *      google.com ke cross-origin iframe mein chalta hai. WebView mein
 *      third-party cookies default se BAND hain, aur window.open kaam hi nahi
 *      karta. Customer app ke sign-in ke liye dono khole gaye hain.
 */
public class MainActivity extends Activity {

  private static final int REQ_FILE = 1001;

  private FrameLayout root;
  private WebView web;
  private WebView popup;                 // reCAPTCHA challenge window, agar aaye
  private ValueCallback<Uri[]> pending;
  private Uri shotUri;

  private boolean cameraOn;
  private boolean popupsOn;

  @SuppressLint("SetJavaScriptEnabled")
  @Override
  protected void onCreate(Bundle saved) {
    super.onCreate(saved);

    cameraOn = getResources().getBoolean(R.bool.enable_camera);
    popupsOn = getResources().getBoolean(R.bool.allow_popups);

    if (getResources().getBoolean(R.bool.keep_screen_on)) {
      // Timer chalte waqt screen band na ho — washer ke haath geele hote hain.
      getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
    }

    root = new FrameLayout(this);
    setContentView(root);

    web = new WebView(this);
    root.addView(web, new FrameLayout.LayoutParams(
        ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));

    applySettings(web);

    // Firebase ka reCAPTCHA google.com ke iframe mein chalta hai — yaani
    // third-party cookie. WebView mein yeh default se band hai, aur band
    // rahe to OTP bhejna chup-chaap fail ho jaata hai.
    CookieManager cm = CookieManager.getInstance();
    cm.setAcceptCookie(true);
    cm.setAcceptThirdPartyCookies(web, true);

    web.setWebViewClient(new WebViewClient() {
      @Override
      public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest req) {
        return routeOut(req.getUrl());
      }
    });

    web.setWebChromeClient(new Chrome());

    web.loadUrl(getString(R.string.home_url));
  }

  private void applySettings(WebView v) {
    WebSettings s = v.getSettings();
    s.setJavaScriptEnabled(true);
    s.setDomStorageEnabled(true);          // localStorage — offline queue aur OTP session isi par
    s.setDatabaseEnabled(true);            // Firebase apni session IndexedDB mein rakhta hai
    s.setUseWideViewPort(true);
    s.setLoadWithOverviewMode(true);
    s.setMediaPlaybackRequiresUserGesture(false);  // time poora hone par beep baj sake
    s.setCacheMode(WebSettings.LOAD_DEFAULT);
    s.setAllowFileAccess(false);
    s.setAllowContentAccess(true);
    s.setSupportZoom(false);
    s.setBuiltInZoomControls(false);

    if (popupsOn) {
      // reCAPTCHA kabhi-kabhi challenge window kholta hai. Yeh dono ke bina
      // woh window banti hi nahi aur sign-in wahin atak jaata hai.
      s.setSupportMultipleWindows(true);
      s.setJavaScriptCanOpenWindowsAutomatically(true);
    }
  }

  /** Apni site app ke andar; baaki sab (WhatsApp, UPI, phone) bahar. */
  private boolean routeOut(Uri u) {
    String host = u.getHost() == null ? "" : u.getHost();
    String scheme = u.getScheme() == null ? "" : u.getScheme();
    if (host.endsWith("washingdaddy.com")) return false;
    // Google ka recaptcha/identitytoolkit andar hi rehna chahiye.
    if (host.endsWith("google.com") || host.endsWith("gstatic.com")
        || host.endsWith("googleapis.com") || host.endsWith("firebaseapp.com")) return false;
    if (scheme.equals("http") || scheme.equals("https")
        || scheme.equals("upi") || scheme.equals("tel")
        || scheme.equals("mailto") || scheme.equals("sms")
        || scheme.equals("intent") || scheme.equals("whatsapp")) {
      try {
        startActivity(new Intent(Intent.ACTION_VIEW, u));
      } catch (Exception e) {
        Toast.makeText(this, getString(R.string.link_failed), Toast.LENGTH_SHORT).show();
      }
      return true;
    }
    return true;
  }

  private class Chrome extends WebChromeClient {

    @Override
    public boolean onShowFileChooser(WebView v, ValueCallback<Uri[]> cb,
                                     FileChooserParams params) {
      if (!cameraOn) return false;   // customer app photo nahi leta
      if (pending != null) pending.onReceiveValue(null);
      pending = cb;
      shotUri = null;

      Intent camera = buildCameraIntent();
      Intent pick = params.createIntent();

      Intent chooser = new Intent(Intent.ACTION_CHOOSER);
      chooser.putExtra(Intent.EXTRA_INTENT, pick);
      chooser.putExtra(Intent.EXTRA_TITLE, getString(R.string.pick_photo));
      if (camera != null) {
        chooser.putExtra(Intent.EXTRA_INITIAL_INTENTS, new Intent[]{camera});
      }

      try {
        startActivityForResult(chooser, REQ_FILE);
      } catch (Exception e) {
        pending = null;
        cb.onReceiveValue(null);
        Toast.makeText(MainActivity.this, getString(R.string.camera_failed), Toast.LENGTH_SHORT).show();
        return false;
      }
      return true;
    }

    /**
     * reCAPTCHA ka challenge window. Bina iske window.open() chup-chaap
     * ignore ho jaata hai aur customer OTP screen par hi phas jaata hai.
     * Window app ke andar hi kholte hain — bahar browser mein bhejne se
     * session toot jaata.
     */
    @Override
    public boolean onCreateWindow(WebView v, boolean dialog, boolean gesture, Message resultMsg) {
      if (!popupsOn) return false;
      closePopup();

      popup = new WebView(MainActivity.this);
      applySettings(popup);
      CookieManager.getInstance().setAcceptThirdPartyCookies(popup, true);

      popup.setWebViewClient(new WebViewClient() {
        @Override
        public boolean shouldOverrideUrlLoading(WebView pv, WebResourceRequest req) {
          String host = req.getUrl().getHost() == null ? "" : req.getUrl().getHost();
          if (host.endsWith("google.com") || host.endsWith("gstatic.com")
              || host.endsWith("googleapis.com") || host.endsWith("firebaseapp.com")
              || host.endsWith("washingdaddy.com")) return false;
          return routeOut(req.getUrl());
        }
      });
      popup.setWebChromeClient(new WebChromeClient() {
        @Override
        public void onCloseWindow(WebView pv) { closePopup(); }
      });

      root.addView(popup, new FrameLayout.LayoutParams(
          ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));

      WebView.WebViewTransport t = (WebView.WebViewTransport) resultMsg.obj;
      t.setWebView(popup);
      resultMsg.sendToTarget();
      return true;
    }

    @Override
    public void onCloseWindow(WebView v) { closePopup(); }
  }

  private void closePopup() {
    if (popup == null) return;
    root.removeView(popup);
    popup.setWebChromeClient(null);
    popup.destroy();
    popup = null;
  }

  /** Camera ka intent, apne cache folder mein photo likhne ke liye. */
  private Intent buildCameraIntent() {
    try {
      File dir = new File(getCacheDir(), "shots");
      if (!dir.exists() && !dir.mkdirs()) return null;
      // Purani photos saaf — phone ki jagah nahi bharni chahiye.
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
      if (data != null && data.getData() != null) {
        out = new Uri[]{ data.getData() };                 // gallery se chuni
      } else if (data != null && data.getClipData() != null && data.getClipData().getItemCount() > 0) {
        out = new Uri[]{ data.getClipData().getItemAt(0).getUri() };
      } else if (shotUri != null) {
        out = new Uri[]{ shotUri };                        // camera se li
      }
    }
    pending.onReceiveValue(out);
    pending = null;
  }

  @Override
  public void onBackPressed() {
    if (popup != null) { closePopup(); return; }
    if (web != null && web.canGoBack()) web.goBack();
    else super.onBackPressed();
  }

  @Override
  protected void onDestroy() {
    closePopup();
    if (web != null) {
      web.setWebChromeClient(null);
      web.destroy();
      web = null;
    }
    super.onDestroy();
  }
}
