import { requireNativeModule } from 'expo-modules-core';

// Khởi tạo lõi Native
const IpaSigner = requireNativeModule('IpaSigner');

// Mở cổng nhận 4 tham số: File IPA, File P12, File Prov và Mật khẩu
export async function signAppOffline(
  ipaPath: string, 
  p12Path: string, 
  provPath: string, 
  password: string
): Promise<{ outputPath: string; success: boolean }> {
  // Bắn dữ liệu xuống thẳng lõi Swift/C++ của iOS
  return await IpaSigner.signAppOffline(ipaPath, p12Path, provPath, password);
}