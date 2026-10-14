package com.washingdaddy.duty;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.MediaStore;
import android.view.View;
import android.view.WindowManager;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import androidx.core.content.FileProvider;

import java.io.File;

/**
 * Washing Daddy — washer duty app.
 *
 * Yeh app sirf washingdaddy.com/w/ ko kholta hai. Saara kaam website mein hai,
 * isliye jab bhi website update hoti hai, app apne aap nayi ho jaati hai —
 * washer ko dobara kuch install nahi karna padta.
 *
 * Do cheezein khaas dhyaan se banayi hain:
 *   1. Camera — WebView apne aap <input type="file" capture> nahi khol sakta,
 *      isliye onShowFileChooser() mein camera aur gallery dono ka chooser diya hai.
 *   2. localStorage — iske bina washer ka offline kaam gayab ho jaata.
 */
public class MainActivity extends Activity {

  private static final String HOME = "https://washingdaddy.com/w/";
  private static final int REQ_FILE = 1001;

  private WebView web;
  private ValueCallback<Uri[]> pending;
  private Uri shotUri;

  @SuppressLint("SetJavaScriptEnabled")
  @Override
  protected void onCreate(Bundle saved) {
    super.onCreate(saved);

    // Timer chalte waqt screen band na ho — washer ke haath geele hote hain.
    getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

    web = new WebView(this);
    setContentView(web);

    WebSettings s = web.getSettings();
    s.setJavaScriptEnabled(true);
    s.setDomStorageEnabled(true);          // localStorage — offline queue isi par chalti hai
    s.setDatabaseEnabled(true);
    s.setUseWideViewPort(true);
    s.setLoadWithOverviewMode(true);
    s.setMediaPlaybackRequiresUserGesture(false);  // time poora hone par beep baj sake
    s.setCacheMode(WebSettings.LOAD_DEFAULT);
    s.setAllowFileAccess(false);
    s.setAllowContentAccess(true);
    s.setSupportZoom(false);
    s.setBuiltInZoomControls(false);

    web.setWebViewClient(new WebViewClient() {
      @Override
      public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest req) {
        Uri u = req.getUrl();
        String host = u.getHost() == null ? "" : u.getHost();
        // Apni site app ke andar; baaki sab (WhatsApp, phone) bahar.
        if (host.endsWith("washingdaddy.com")) return false;
        try {
          startActivity(new Intent(Intent.ACTION_VIEW, u));
        } catch (Exception e) {
          Toast.makeText(MainActivity.this, "Yeh link nahi khul paya", Toast.LENGTH_SHORT).show();
        }
        return true;
      }
    });

    web.setWebChromeClient(new WebChromeClient() {
      @Override
      public boolean onShowFileChooser(WebView v, ValueCallback<Uri[]> cb,
                                       FileChooserParams params) {
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
          Toast.makeText(MainActivity.this, "Camera nahi khul paya", Toast.LENGTH_SHORT).show();
          return false;
        }
        return true;
      }
    });

    web.loadUrl(HOME);
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
    if (web != null && web.canGoBack()) web.goBack();
    else super.onBackPressed();
  }

  @Override
  protected void onDestroy() {
    if (web != null) {
      web.setWebChromeClient(null);
      web.destroy();
      web = null;
    }
    super.onDestroy();
  }
}
