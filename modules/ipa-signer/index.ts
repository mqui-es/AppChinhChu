import { requireNativeModule } from 'expo-modules-core';

// Khởi tạo lõi Native
const IpaSigner = requireNativeModule('IpaSigner');

// Mở cổng nhận các tham số ký IPA ngoại tuyến tùy biến
export async function signAppOffline(
  ipaPath: string, 
  p12Path: string, 
  provPath: string, 
  password: string,
  newBundleId?: string,
  newAppName?: string,
  newIconPath?: string
): Promise<{ outputPath: string; success: boolean; bundleId?: string }> {
  // Gửi xuống thẳng lõi Swift/C++ của iOS với các cấu hình tùy biến
  return await IpaSigner.signAppOffline(
    ipaPath, 
    p12Path, 
    provPath, 
    password, 
    newBundleId || '', 
    newAppName || '', 
    newIconPath || ''
  );
}

// Hàm đọc siêu dữ liệu IPA (BundleID, AppName) trước khi ký
export async function getIpaInfo(
  ipaPath: string
): Promise<{ bundleId: string; appName: string }> {
  return await IpaSigner.getIpaInfo(ipaPath);
}