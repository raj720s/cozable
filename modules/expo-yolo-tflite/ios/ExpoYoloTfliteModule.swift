import ExpoModulesCore

public class ExpoYoloTfliteModule: Module {
  public func definition() -> ModuleDefinition {
    Name("ExpoYoloTflite")

    Function("isSupported") {
      return false
    }

    Function("isLoaded") {
      return false
    }

    AsyncFunction("loadModel") { () -> [String: Any] in
      throw Exception("ExpoYoloTflite is Android-only for now (LiteRT).")
    }

    Function("getTensorInfo") { () -> [String: Any] in
      throw Exception("ExpoYoloTflite is Android-only for now (LiteRT).")
    }

    AsyncFunction("detectImageUri") { (_: String) -> [[String: Any]] in
      throw Exception("ExpoYoloTflite is Android-only for now (LiteRT).")
    }

    AsyncFunction("detectRgb") { (_: Data, _: Int, _: Int, _: Int, _: Int, _: Bool) -> [[String: Any]] in
      throw Exception("ExpoYoloTflite is Android-only for now (LiteRT).")
    }

    AsyncFunction("annotateImageUri") { (_: String, _: [[String: Any]]) -> String in
      throw Exception("ExpoYoloTflite is Android-only for now (LiteRT).")
    }

    AsyncFunction("annotateVideoUri") { (_: String, _: [[String: Any]], _: Double) -> String in
      throw Exception("ExpoYoloTflite is Android-only for now (LiteRT).")
    }

    AsyncFunction("unload") { () in
      // no-op
    }
  }
}
