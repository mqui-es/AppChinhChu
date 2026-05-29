import ExpoModulesCore
import Foundation

public class IpaSignerModule: Module {
  public func definition() -> ModuleDefinition {
    // 1. Tên của Lõi (Phải khớp với file JS ở trên)
    Name("IpaSigner")

    // 2. Hàm Ký App Bất Đồng Bộ (Chạy ngầm để không giật lag App)
    AsyncFunction("signAppOffline") { (ipaPath: String, p12Path: String, provPath: String, password: String, promise: Promise) in
      
      // Xóa tiền tố "file://" nếu có để lấy đường dẫn thật của hệ thống
      let cleanIpaPath = ipaPath.replacingOccurrences(of: "file://", with: "")
      let cleanP12Path = p12Path.replacingOccurrences(of: "file://", with: "")
      let cleanProvPath = provPath.replacingOccurrences(of: "file://", with: "")

      // 3. Tạo đường dẫn lưu File IPA mới sau khi Ký xong
      let fileManager = FileManager.default
      let documentDirectory = fileManager.urls(for: .documentDirectory, in: .userDomainMask).first!
      
      // Tên file đầu ra: signed_app_thoigian.ipa
      let outputFilename = "signed_app_\(Int(Date().timeIntervalSince1970)).ipa"
      let outputFilePath = documentDirectory.appendingPathComponent(outputFilename).path

      do {
        // =========================================================
        // 🚀 VŨ KHÍ C++ NẰM Ở ĐÂY (ZSIGN CORE)
        // =========================================================
        // Tại đây, trong dự án thật, chúng ta sẽ gọi thư viện C++ zsign:
        // let result = ZSignWrapper.sign(cleanIpaPath, cleanP12Path, cleanProvPath, password, outputFilePath)
        
        // Hiện tại, vì Sếp đang code trên Windows và chưa gắn thư viện OpenSSL,
        // chúng ta sẽ "Giả lập" việc copy file IPA gốc sang file mới để App không bị crash khi build EAS.
        
        if fileManager.fileExists(atPath: outputFilePath) {
            try fileManager.removeItem(atPath: outputFilePath)
        }
        try fileManager.copyItem(atPath: cleanIpaPath, toPath: outputFilePath)
        
        // 4. Trả kết quả thành công về cho Javascript (App)
        promise.resolve([
          "success": true,
          "outputPath": outputFilePath
        ])
        
      } catch {
        // Nếu lỗi, báo về cho App hiện thông báo đỏ
        promise.reject("SIGN_ERROR", "Lỗi giải nén và mã hóa IPA: \(error.localizedDescription)")
      }
    }
  }
}