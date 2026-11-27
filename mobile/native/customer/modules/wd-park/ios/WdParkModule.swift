import ExpoModulesCore

// iOS cannot learn in the background that the phone left the car's Bluetooth or CarPlay, so parking alerts are
// Android-only for now. The JS layer checks Platform.OS and never relies on these.
public class WdParkModule: Module {
  public func definition() -> ModuleDefinition {
    Name("WdPark")
    Function("configure") { (_: String) in }
    AsyncFunction("bondedDevices") { () -> String in "[]" }
    AsyncFunction("pendingParks") { () -> String in "[]" }
    AsyncFunction("getPark") { (_: String) -> String? in nil }
    AsyncFunction("lastAsked") { () -> String? in nil }
    Function("clearPark") { (_: String) in }
    Function("openBatterySettings") { }
  }
}
