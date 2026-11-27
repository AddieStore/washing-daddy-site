package expo.modules.wdpark

import android.Manifest
import android.bluetooth.BluetoothManager
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.provider.Settings
import androidx.core.content.ContextCompat
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import org.json.JSONArray
import org.json.JSONObject

// JS side: src/park/index.ts. All payloads are JSON strings.
class WdParkModule : Module() {
  private val ctx: Context get() = appContext.reactContext ?: throw IllegalStateException("no context")

  override fun definition() = ModuleDefinition {
    Name("WdPark")

    Function("configure") { json: String -> ParkStore.setCfg(ctx, json) }

    AsyncFunction("bondedDevices") {
      val out = JSONArray()
      if (Build.VERSION.SDK_INT >= 31 && ContextCompat.checkSelfPermission(ctx, Manifest.permission.BLUETOOTH_CONNECT) != PackageManager.PERMISSION_GRANTED) return@AsyncFunction out.toString()
      try {
        val bt = (ctx.getSystemService(Context.BLUETOOTH_SERVICE) as BluetoothManager).adapter
        bt?.bondedDevices?.forEach { d -> out.put(JSONObject().put("address", d.address).put("name", d.name ?: d.address)) }
      } catch (e: SecurityException) {}
      out.toString()
    }

    AsyncFunction("pendingParks") {
      val all = ParkStore.parks(ctx); val out = JSONArray()
      for (i in 0 until all.length()) { val p = all.optJSONObject(i) ?: continue; if (!p.optBoolean("cleared")) out.put(p) }
      out.toString()
    }

    AsyncFunction("getPark") { id: String -> ParkStore.get(ctx, id)?.toString() }

    AsyncFunction("lastAsked") { ParkStore.asked(ctx)?.takeIf { !it.optBoolean("cleared") }?.toString() }

    Function("clearPark") { id: String -> ParkStore.update(ctx, id) { it.put("cleared", true) } }

    Function("openBatterySettings") {
      val i = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:" + ctx.packageName)).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      ctx.startActivity(i)
    }
  }
}
