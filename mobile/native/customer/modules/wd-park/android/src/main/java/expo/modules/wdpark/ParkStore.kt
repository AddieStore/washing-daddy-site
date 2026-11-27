package expo.modules.wdpark

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject

// Everything the receivers need while the app is closed, in one SharedPreferences file.
//   cfg     what the app last sent (configure): {enabled, radiusM, nightFromMin, nightTillMin, cars:[{carId, reg, name, device, homeLat, homeLng}], untilBack:[reg]}
//   parks   the last 30 parks, newest first: {id, carId, reg, name, lat, lng, acc, at, away, distM, asked, cleared}
//   asked   id of the last park the customer was notified about
object ParkStore {
  private const val FILE = "wd_park"
  private fun prefs(ctx: Context) = ctx.getSharedPreferences(FILE, Context.MODE_PRIVATE)

  fun cfg(ctx: Context): JSONObject = try { JSONObject(prefs(ctx).getString("cfg", "{}") ?: "{}") } catch (e: Throwable) { JSONObject() }
  fun setCfg(ctx: Context, json: String) { JSONObject(json); prefs(ctx).edit().putString("cfg", json).apply() }

  fun carForDevice(ctx: Context, address: String): JSONObject? {
    val c = cfg(ctx)
    if (!c.optBoolean("enabled", false)) return null
    val cars = c.optJSONArray("cars") ?: return null
    for (i in 0 until cars.length()) {
      val car = cars.optJSONObject(i) ?: continue
      if (car.optString("device").equals(address, ignoreCase = true)) return car
    }
    return null
  }

  /** the feature is still on and this car is still linked to a Bluetooth device */
  fun carStillOn(ctx: Context, carId: String): Boolean {
    val c = cfg(ctx); if (!c.optBoolean("enabled", false)) return false
    val cars = c.optJSONArray("cars") ?: return false
    return (0 until cars.length()).any { cars.optJSONObject(it)?.optString("carId") == carId }
  }

  @Synchronized fun parks(ctx: Context): JSONArray = try { JSONArray(prefs(ctx).getString("parks", "[]") ?: "[]") } catch (e: Throwable) { JSONArray() }

  @Synchronized fun add(ctx: Context, park: JSONObject) {
    val old = parks(ctx); val next = JSONArray().put(park)
    for (i in 0 until minOf(old.length(), 29)) next.put(old.get(i))
    prefs(ctx).edit().putString("parks", next.toString()).apply()
  }

  @Synchronized fun update(ctx: Context, id: String, f: (JSONObject) -> Unit) {
    val list = parks(ctx)
    for (i in 0 until list.length()) { val p = list.optJSONObject(i) ?: continue; if (p.optString("id") == id) f(p) }
    prefs(ctx).edit().putString("parks", list.toString()).apply()
  }

  fun get(ctx: Context, id: String): JSONObject? {
    val list = parks(ctx)
    for (i in 0 until list.length()) { val p = list.optJSONObject(i) ?: continue; if (p.optString("id") == id) return p }
    return null
  }

  /** the newest park of this car (the list is newest first) */
  fun latestFor(ctx: Context, carId: String): JSONObject? {
    val list = parks(ctx)
    for (i in 0 until list.length()) { val p = list.optJSONObject(i) ?: continue; if (p.optString("carId") == carId) return p }
    return null
  }

  fun setAsked(ctx: Context, id: String) { prefs(ctx).edit().putString("asked", id).apply(); update(ctx, id) { it.put("asked", true) } }
  fun asked(ctx: Context): JSONObject? = prefs(ctx).getString("asked", null)?.let { get(ctx, it) }
}
