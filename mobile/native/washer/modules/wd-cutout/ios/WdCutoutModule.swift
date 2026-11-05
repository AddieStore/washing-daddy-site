import ExpoModulesCore

// iOS: no cut-out yet; null makes the app keep the plain photo.
public class WdCutoutModule: Module {
  public func definition() -> ModuleDefinition {
    Name("WdCutout")
    AsyncFunction("cutout") { (uri: String) -> String? in
      return nil
    }
    AsyncFunction("portrait") { (uri: String, bg: String, size: Int) -> String? in
      return nil
    }
  }
}
