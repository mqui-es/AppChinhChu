import { requireNativeModule } from 'expo-modules-core';

// Khởi tạo lõi Native
const IpaSigner = requireNativeModule('IpaSigner');

// Mở cổng nhận 4 tham số: File IPA, File P12, File Prov và Mật khẩu
export async function signAppOffline(
  ipaPath: string, 
  p12Path: string, 
  provPath: string, 
  password: string
): Promise<{ outputPath: string; success: boolean; bundleId?: string }> {
  // Bắn dữ liệu xuống thẳng lõi Swift/C++ của iOS
  return await IpaSigner.signAppOffline(ipaPath, p12Path, provPath, password);
}

// Tính năng Tách nền ảnh bằng xử lý pixel native siêu nhanh
export async function removeBackground(
  imagePath: string,
  mode: 'white' | 'black'
): Promise<{ outputPath: string; success: boolean }> {
  return await IpaSigner.removeBackground(imagePath, mode);
}