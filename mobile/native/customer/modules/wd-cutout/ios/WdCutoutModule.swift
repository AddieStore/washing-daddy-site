import ExpoModulesCore

// iOS: no cut-out yet; null makes the app keep the plain JPEG photo.
public class WdCutoutModule: Module {
  public func definition() -> ModuleDefinition {
    Name("WdCutout")
    AsyncFunction("cutout") { (uri: String) -> String? in
      return nil
    }
  }
}
