import ExpoModulesCore
import Foundation
import UIKit

// Khai báo liên kết trực tiếp với hàm C++ zsign_wrapper trong ZSignWrapper.mm
@_silgen_name("zsign_wrapper")
func zsign_wrapper(
  _ ipa: UnsafePointer<Int8>,
  _ p12: UnsafePointer<Int8>,
  _ prov: UnsafePointer<Int8>,
  _ pass: UnsafePointer<Int8>,
  _ out: UnsafePointer<Int8>
) -> Int32

// Hàm tiện ích: làm sạch đường dẫn file
private func cleanPath(_ rawPath: String) -> String {
  var path = rawPath
  // Xóa tiền tố "file://" nếu có
  if path.hasPrefix("file://") {
    path = String(path.dropFirst(7))
  }
  // Giải mã ký tự URL encoding (%20, v.v.)
  path = path.removingPercentEncoding ?? path
  return path
}

public class IpaSignerModule: Module {
  public func definition() -> ModuleDefinition {
    Name("IpaSigner")

    AsyncFunction("signAppOffline") { (ipaPath: String, p12Path: String, provPath: String, password: String, promise: Promise) in
      
      // Làm sạch đường dẫn
      let cleanIpaPath = cleanPath(ipaPath)
      let cleanP12Path = cleanPath(p12Path)
      let cleanProvPath = cleanPath(provPath)
      
      // Kiểm tra file tồn tại trước khi ký
      let fm = FileManager.default
      
      guard fm.fileExists(atPath: cleanIpaPath) else {
        promise.reject("FILE_NOT_FOUND", "Không tìm thấy file IPA: \(cleanIpaPath)")
        return
      }
      
      guard fm.fileExists(atPath: cleanP12Path) else {
        promise.reject("FILE_NOT_FOUND", "Không tìm thấy file P12: \(cleanP12Path)")
        return
      }
      
      guard fm.fileExists(atPath: cleanProvPath) else {
        promise.reject("FILE_NOT_FOUND", "Không tìm thấy file MobileProvision: \(cleanProvPath)")
        return
      }
      
      // Tạo đường dẫn output trong Documents directory
      let documentDirectory = fm.urls(for: .documentDirectory, in: .userDomainMask).first!
      let outputFilename = "signed_app_\(Int(Date().timeIntervalSince1970)).ipa"
      let outputFilePath = documentDirectory.appendingPathComponent(outputFilename).path
      
      // Thực thi việc ký bằng C++ zsign (trong background thread để không block UI)
      DispatchQueue.global(qos: .userInitiated).async {
        let result = zsign_wrapper(cleanIpaPath, cleanP12Path, cleanProvPath, password, outputFilePath)
        
        DispatchQueue.main.async {
          if result != 0 {
            let errorMessage: String
            switch result {
            case -1:
              errorMessage = "Lỗi ký IPA (zsign -1): Có thể do file P12 sai mật khẩu, file IPA không hợp lệ, hoặc provisioning profile không khớp với certificate."
            case -2:
              errorMessage = "Lỗi kiểm tra chữ ký (zsign -2): File binary không được ký hoặc chữ ký không hợp lệ."
            default:
              errorMessage = "Lỗi không xác định khi ký IPA (mã lỗi zsign C++: \(result))"
            }
            promise.reject("SIGN_ERROR", errorMessage)
          } else {
            // Kiểm tra file output thực sự được tạo ra
            if fm.fileExists(atPath: outputFilePath) {
              let bundleIdPath = outputFilePath + ".bundleid.txt"
              var bundleId = "com.ipaviet.app"
              if fm.fileExists(atPath: bundleIdPath) {
                if let content = try? String(contentsOfFile: bundleIdPath, encoding: .utf8) {
                  bundleId = content.trimmingCharacters(in: .whitespacesAndNewlines)
                  try? fm.removeItem(atPath: bundleIdPath)
                }
              }
              promise.resolve([
                "success": true,
                "outputPath": outputFilePath,
                "bundleId": bundleId
              ])
            } else {
              promise.reject("SIGN_ERROR", "Ký thành công nhưng không tìm thấy file output: \(outputFilePath)")
            }
          }
        }
      }
    }

    AsyncFunction("removeBackground") { (imagePath: String, mode: String, promise: Promise) in
      let cleanImgPath = cleanPath(imagePath)
      let fm = FileManager.default
      guard fm.fileExists(atPath: cleanImgPath) else {
        promise.reject("FILE_NOT_FOUND", "Không tìm thấy file ảnh: \(cleanImgPath)")
        return
      }
      
      guard let image = UIImage(contentsOfFile: cleanImgPath), let cgImage = image.cgImage else {
        promise.reject("INVALID_IMAGE", "File không phải là ảnh hợp lệ hoặc không thể đọc.")
        return
      }
      
      let width = cgImage.width
      let height = cgImage.height
      let colorSpace = CGColorSpaceCreateDeviceRGB()
      
      var rawData = [UInt8](repeating: 0, count: width * height * 4)
      let bytesPerPixel = 4
      let bytesPerRow = bytesPerPixel * width
      let bitsPerComponent = 8
      
      guard let context = CGContext(
        data: &rawData,
        width: width,
        height: height,
        bitsPerComponent: bitsPerComponent,
        bytesPerRow: bytesPerRow,
        space: colorSpace,
        bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue | CGBitmapInfo.byteOrder32Big.rawValue
      ) else {
        promise.reject("CONTEXT_ERROR", "Không thể tạo đồ họa xử lý ảnh.")
        return
      }
      
      context.draw(cgImage, in: CGRect(x: 0, y: 0, width: width, height: height))
      
      let threshold: Int = 40 // Tự động làm sạch viền
      
      if mode == "white" {
        for y in 0..<height {
          for x in 0..<width {
            let byteIndex = (bytesPerRow * y) + x * bytesPerPixel
            let r = Int(rawData[byteIndex])
            let g = Int(rawData[byteIndex + 1])
            let b = Int(rawData[byteIndex + 2])
            if r >= (255 - threshold) && g >= (255 - threshold) && b >= (255 - threshold) {
              rawData[byteIndex + 3] = 0
            }
          }
        }
      } else if mode == "black" {
        for y in 0..<height {
          for x in 0..<width {
            let byteIndex = (bytesPerRow * y) + x * bytesPerPixel
            let r = Int(rawData[byteIndex])
            let g = Int(rawData[byteIndex + 1])
            let b = Int(rawData[byteIndex + 2])
            if r <= threshold && g <= threshold && b <= threshold {
              rawData[byteIndex + 3] = 0
            }
          }
        }
      }
      
      guard let newCGImage = context.makeImage() else {
        promise.reject("IMAGE_ERROR", "Không thể hoàn thiện ảnh mới.")
        return
      }
      
      let newImage = UIImage(cgImage: newCGImage)
      let documentDirectory = fm.urls(for: .documentDirectory, in: .userDomainMask).first!
      let outputFilename = "nobg_\(Int(Date().timeIntervalSince1970)).png"
      let outputFilePath = documentDirectory.appendingPathComponent(outputFilename).path
      
      if let pngData = newImage.pngData() {
        do {
          try pngData.write(to: URL(fileURLWithPath: outputFilePath))
          promise.resolve([
            "success": true,
            "outputPath": outputFilePath
          ])
        } catch {
          promise.reject("WRITE_ERROR", "Không thể lưu ảnh đã tách nền.")
        }
      } else {
        promise.reject("PNG_ERROR", "Không thể chuyển đổi thành dữ liệu PNG.")
      }
    }
  }
}