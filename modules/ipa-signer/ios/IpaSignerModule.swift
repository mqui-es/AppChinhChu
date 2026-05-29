import ExpoModulesCore
import Foundation

// Khai báo liên kết trực tiếp với hàm C++ zsign_wrapper trong ZSignWrapper.mm
@_silgen_name("zsign_wrapper")
func zsign_wrapper(
  _ ipa: UnsafePointer<Int8>,
  _ p12: UnsafePointer<Int8>,
  _ prov: UnsafePointer<Int8>,
  _ pass: UnsafePointer<Int8>,
  _ out: UnsafePointer<Int8>
) -> Int32

public class IpaSignerModule: Module {
  public func definition() -> ModuleDefinition {
    Name("IpaSigner")

    AsyncFunction("signAppOffline") { (ipaPath: String, p12Path: String, provPath: String, password: String, promise: Promise) in
      
      // Xóa tiền tố "file://" nếu có để lấy đường dẫn thật của hệ thống
      let cleanIpaPath = ipaPath.replacingOccurrences(of: "file://", with: "")
      let cleanP12Path = p12Path.replacingOccurrences(of: "file://", with: "")
      let cleanProvPath = provPath.replacingOccurrences(of: "file://", with: "")

      // Tạo đường dẫn lưu File IPA mới sau khi Ký xong
      let fileManager = FileManager.default
      let documentDirectory = fileManager.urls(for: .documentDirectory, in: .userDomainMask).first!
      
      let outputFilename = "signed_app_\(Int(Date().timeIntervalSince1970)).ipa"
      let outputFilePath = documentDirectory.appendingPathComponent(outputFilename).path

      do {
        // Thực thi việc ký bằng C++ zsign
        let result = zsign_wrapper(cleanIpaPath, cleanP12Path, cleanProvPath, password, outputFilePath)
        
        if result != 0 {
          promise.reject("SIGN_ERROR", "Lỗi giải nén và mã hóa IPA (Mã lỗi zsign C++: \(result))")
          return
        }
        
        promise.resolve([
          "success": true,
          "outputPath": outputFilePath
        ])
        
      } catch {
        promise.reject("SIGN_ERROR", "Lỗi bất thường khi ký IPA: \(error.localizedDescription)")
      }
    }
  }
}