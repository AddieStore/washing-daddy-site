package expo.modules.wdcutout

import android.graphics.Bitmap
import android.net.Uri
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.segmentation.subject.SubjectSegmentation
import com.google.mlkit.vision.segmentation.subject.SubjectSegmenterOptions
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File
import java.io.FileOutputStream

// cutout(uri): a PNG of the main subject on a transparent background, trimmed to the subject, or null on any failure.
class WdCutoutModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("WdCutout")

    AsyncFunction("cutout") { uri: String, promise: Promise ->
      try {
        val ctx = appContext.reactContext ?: return@AsyncFunction promise.resolve(null)
        val image = InputImage.fromFilePath(ctx, Uri.parse(uri))
        val segmenter = SubjectSegmentation.getClient(
          SubjectSegmenterOptions.Builder().enableForegroundBitmap().build()
        )
        segmenter.process(image)
          .addOnSuccessListener { result ->
            val fg = result.foregroundBitmap
            if (fg == null) { segmenter.close(); promise.resolve(null); return@addOnSuccessListener }
            Thread {
              try { promise.resolve(trimAndSave(fg, ctx.cacheDir)) } catch (e: Throwable) { promise.resolve(null) }
              finally { segmenter.close() }
            }.start()
          }
          .addOnFailureListener { segmenter.close(); promise.resolve(null) }
      } catch (e: Throwable) {
        promise.resolve(null)
      }
    }
  }

  private fun trimAndSave(fg: Bitmap, dir: File): String? {
    val w = fg.width
    val h = fg.height
    val px = IntArray(w * h)
    fg.getPixels(px, 0, w, 0, 0, w, h)
    var minX = w; var minY = h; var maxX = -1; var maxY = -1
    for (y in 0 until h) {
      for (x in 0 until w) {
        if ((px[y * w + x] ushr 24) > 24) {
          if (x < minX) minX = x
          if (x > maxX) maxX = x
          if (y < minY) minY = y
          if (y > maxY) maxY = y
        }
      }
    }
    if (maxX < 0) return null
    val bw = maxX - minX + 1
    val bh = maxY - minY + 1
    // a speck is not a car: the subject must cover a fair part of the frame
    if (bw.toLong() * bh < w.toLong() * h / 20) return null
    val m = (maxOf(bw, bh) * 0.03).toInt()
    val x0 = maxOf(0, minX - m)
    val y0 = maxOf(0, minY - m)
    val x1 = minOf(w, maxX + 1 + m)
    val y1 = minOf(h, maxY + 1 + m)
    val out = Bitmap.createBitmap(fg, x0, y0, x1 - x0, y1 - y0)
    val f = File(dir, "wd-cutout-" + System.currentTimeMillis() + ".png")
    FileOutputStream(f).use { out.compress(Bitmap.CompressFormat.PNG, 100, it) }
    return "file://" + f.absolutePath
  }
}
