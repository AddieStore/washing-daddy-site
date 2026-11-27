package expo.modules.wdpark

import android.Manifest
import android.app.AlarmManager
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.location.Location
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.Looper
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import com.google.android.gms.location.CurrentLocationRequest
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority
import org.json.JSONObject
import java.util.Calendar
import java.util.TimeZone
import java.util.concurrent.atomic.AtomicBoolean

object ParkLogic {
  private val IST: TimeZone = TimeZone.getTimeZone("Asia/Kolkata")
  const val CHANNEL = "park"
  const val ACTION_NIGHT = "com.washingdaddy.park.NIGHT"

  private fun hasFine(ctx: Context) = ContextCompat.checkSelfPermission(ctx, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED

  /** the phone just left this car's Bluetooth: one fix, then decide. Must call done() within ~9 s (goAsync budget). */
  fun onDisconnect(ctx: Context, car: JSONObject, done: () -> Unit) {
    val finished = AtomicBoolean(false)
    val finish = { loc: Location? -> if (finished.compareAndSet(false, true)) { try { if (loc != null) decide(ctx, car, loc) } catch (e: Throwable) {} ; done() } }
    if (!hasFine(ctx)) { finish(null); return }
    Handler(Looper.getMainLooper()).postDelayed({ lastKnown(ctx, finish) }, 8000)
    try {
      val client = LocationServices.getFusedLocationProviderClient(ctx)
      val req = CurrentLocationRequest.Builder().setPriority(Priority.PRIORITY_HIGH_ACCURACY).setDurationMillis(7500).setMaxUpdateAgeMillis(60_000).build()
      client.getCurrentLocation(req, null)
        .addOnSuccessListener { loc -> if (loc != null) finish(loc) else lastKnown(ctx, finish) }
        .addOnFailureListener { lastKnown(ctx, finish) }
    } catch (e: SecurityException) { finish(null) } catch (e: Throwable) { finish(null) }
  }

  /** fallback: a fix from the last 3 minutes is still where the car stopped */
  private fun lastKnown(ctx: Context, finish: (Location?) -> Unit) {
    try {
      LocationServices.getFusedLocationProviderClient(ctx).lastLocation
        .addOnSuccessListener { l -> finish(if (l != null && System.currentTimeMillis() - l.time < 180_000) l else null) }
        .addOnFailureListener { finish(null) }
    } catch (e: Throwable) { finish(null) }
  }

  fun distM(aLat: Double, aLng: Double, bLat: Double, bLng: Double): Double {
    val out = FloatArray(1); Location.distanceBetween(aLat, aLng, bLat, bLng, out); return out[0].toDouble()
  }

  private fun decide(ctx: Context, car: JSONObject, loc: Location) {
    val cfg = ParkStore.cfg(ctx)
    val radius = cfg.optDouble("radiusM", 150.0)
    val hasHome = !car.isNull("homeLat") && !car.isNull("homeLng") && car.has("homeLat")
    val dist = if (hasHome) distM(car.getDouble("homeLat"), car.getDouble("homeLng"), loc.latitude, loc.longitude) else null
    // a poor fix (> 300 m) near home is not trusted to say "away"
    val away = dist == null || (dist > radius && !(loc.accuracy > 300 && dist < radius + loc.accuracy))
    val now = System.currentTimeMillis()
    val park = JSONObject()
      .put("id", "p" + now.toString(36)).put("carId", car.optString("carId")).put("reg", car.optString("reg")).put("name", car.optString("name"))
      .put("lat", loc.latitude).put("lng", loc.longitude).put("acc", loc.accuracy.toDouble()).put("at", now)
      .put("away", away).put("distM", dist?.let { Math.round(it) } ?: JSONObject.NULL).put("asked", false).put("cleared", false)
    ParkStore.add(ctx, park)
    if (!away) { endUntilBack(ctx, car.optString("reg")); return }
    if (inNight(cfg, now)) notify(ctx, park) else scheduleNight(ctx, park, cfg)
  }

  private fun minutesIST(ms: Long): Int { val c = Calendar.getInstance(IST); c.timeInMillis = ms; return c.get(Calendar.HOUR_OF_DAY) * 60 + c.get(Calendar.MINUTE) }
  fun inNight(cfg: JSONObject, ms: Long): Boolean {
    val m = minutesIST(ms); val from = cfg.optInt("nightFromMin", 21 * 60); val till = cfg.optInt("nightTillMin", 5 * 60)
    return m >= from || m < till
  }

  /** daytime away park: look again at 21:00 IST; the customer is asked only if this is still the car's last park */
  fun scheduleNight(ctx: Context, park: JSONObject, cfg: JSONObject = ParkStore.cfg(ctx)) {
    val c = Calendar.getInstance(IST); c.timeInMillis = park.optLong("at")
    val from = cfg.optInt("nightFromMin", 21 * 60)
    c.set(Calendar.HOUR_OF_DAY, from / 60); c.set(Calendar.MINUTE, from % 60); c.set(Calendar.SECOND, 0)
    var at = c.timeInMillis
    if (at <= System.currentTimeMillis()) at = System.currentTimeMillis() + 60_000
    val am = ctx.getSystemService(Context.ALARM_SERVICE) as AlarmManager
    // inexact: needs no exact-alarm permission; Android may deliver it some minutes late, which is fine here
    am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, nightIntent(ctx, park.optString("carId"), park.optString("id")))
  }

  private fun nightIntent(ctx: Context, carId: String, parkId: String): PendingIntent {
    val i = Intent(ctx, NightReceiver::class.java).setAction(ACTION_NIGHT).putExtra("parkId", parkId).setData(Uri.parse("wdpark://night/$carId"))
    return PendingIntent.getBroadcast(ctx, carId.hashCode(), i, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
  }

  /** 21:00 alarm: ask only if this is still the newest park of the car, away, and not asked yet */
  fun onNight(ctx: Context, parkId: String) {
    val p = ParkStore.get(ctx, parkId) ?: return
    val latest = ParkStore.latestFor(ctx, p.optString("carId")) ?: return
    if (latest.optString("id") != parkId || !p.optBoolean("away") || p.optBoolean("asked") || p.optBoolean("cleared")) return
    if (!ParkStore.carStillOn(ctx, p.optString("carId"))) return
    notify(ctx, p)
  }

  /** after a reboot or app update: alarms are gone, so set them again for unanswered daytime parks of today */
  fun reschedule(ctx: Context) {
    val cfg = ParkStore.cfg(ctx); if (!cfg.optBoolean("enabled", false)) return
    val cars = cfg.optJSONArray("cars") ?: return
    for (i in 0 until cars.length()) {
      val p = ParkStore.latestFor(ctx, cars.optJSONObject(i)?.optString("carId") ?: continue) ?: continue
      val ageH = (System.currentTimeMillis() - p.optLong("at")) / 3_600_000.0
      if (p.optBoolean("away") && !p.optBoolean("asked") && !p.optBoolean("cleared") && ageH < 12) scheduleNight(ctx, p, cfg)
    }
  }

  fun notify(ctx: Context, park: JSONObject) {
    val nm = ctx.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    if (Build.VERSION.SDK_INT >= 26 && nm.getNotificationChannel(CHANNEL) == null)
      nm.createNotificationChannel(NotificationChannel(CHANNEL, "Parking alerts", NotificationManager.IMPORTANCE_DEFAULT).apply {
        description = "Asks when your car is parked away from its usual spot" })
    if (!NotificationManagerCompat.from(ctx).areNotificationsEnabled()) return
    val id = park.optString("id")
    val open = Intent(Intent.ACTION_VIEW, Uri.parse("washingdaddy://park?id=$id")).setPackage(ctx.packageName).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    val pi = PendingIntent.getActivity(ctx, id.hashCode(), open, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
    val name = park.optString("name").ifBlank { "car" }
    val n = NotificationCompat.Builder(ctx, CHANNEL)
      .setSmallIcon(android.R.drawable.ic_menu_mylocation)
      .setContentTitle("Parked somewhere new?")
      .setContentText("Your $name is away from its usual spot. Add this spot so your washer can find it.")
      .setStyle(NotificationCompat.BigTextStyle().bigText("Your $name is parked away from its usual spot. Add this spot so your washer can find and wash it tomorrow morning."))
      .setContentIntent(pi).setAutoCancel(true).setCategory(NotificationCompat.CATEGORY_REMINDER)
      .build()
    try { NotificationManagerCompat.from(ctx).notify(park.optString("carId").hashCode(), n); ParkStore.setAsked(ctx, id) } catch (e: SecurityException) {}
  }

  /** back at the usual spot: end this car's "until I'm back" spots in Firestore, if the customer is signed in.
   *  Wrapped whole: a build without Firebase (demo) simply skips it; the app ends them on next open instead. */
  private fun endUntilBack(ctx: Context, reg: String) {
    val list = ParkStore.cfg(ctx).optJSONArray("untilBack") ?: return
    if ((0 until list.length()).none { list.optString(it) == reg }) return
    try {
      if (com.google.firebase.auth.FirebaseAuth.getInstance().currentUser == null) return
      val db = com.google.firebase.firestore.FirebaseFirestore.getInstance()
      val stamp = java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'+05:30'", java.util.Locale.US).apply { timeZone = IST }.format(java.util.Date())
      db.collection("requests").whereEqualTo("reg", reg).get().addOnSuccessListener { snap ->
        for (d in snap.documents) {
          val st = d.getString("status")
          if (d.getString("kind") == "spot" && d.getBoolean("until_back") == true && (st == "open" || st == "seen"))
            d.reference.update(mapOf("status" to "cancelled", "ended_at" to stamp))
        }
      }
    } catch (e: Throwable) {}
  }
}

class ParkReceiver : BroadcastReceiver() {
  override fun onReceive(ctx: Context, intent: Intent) {
    when (intent.action) {
      Intent.ACTION_BOOT_COMPLETED, Intent.ACTION_MY_PACKAGE_REPLACED -> { try { ParkLogic.reschedule(ctx) } catch (e: Throwable) {} }
      android.bluetooth.BluetoothDevice.ACTION_ACL_DISCONNECTED -> {
        val dev: android.bluetooth.BluetoothDevice? = if (Build.VERSION.SDK_INT >= 33)
          intent.getParcelableExtra(android.bluetooth.BluetoothDevice.EXTRA_DEVICE, android.bluetooth.BluetoothDevice::class.java)
        else @Suppress("DEPRECATION") intent.getParcelableExtra(android.bluetooth.BluetoothDevice.EXTRA_DEVICE)
        val address = try { dev?.address } catch (e: SecurityException) { null } ?: return
        val car = ParkStore.carForDevice(ctx, address) ?: return
        val pending = goAsync()
        ParkLogic.onDisconnect(ctx, car) { try { pending.finish() } catch (e: Throwable) {} }
      }
    }
  }
}

class NightReceiver : BroadcastReceiver() {
  override fun onReceive(ctx: Context, intent: Intent) {
    if (intent.action != ParkLogic.ACTION_NIGHT) return
    try { ParkLogic.onNight(ctx, intent.getStringExtra("parkId") ?: return) } catch (e: Throwable) {}
  }
}
