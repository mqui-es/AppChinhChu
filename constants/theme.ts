import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// HỆ THỐNG PHONG CÁCH GIAO DIỆN (THEME STYLES)
export const THEME_STYLES = {
  obsidian: {
    background: '#07070A', // Đen obsidian vũ trụ
    bgGradient: ['#070708', '#111115', '#070708'] as const,
    surface: 'rgba(28, 28, 30, 0.65)',
    surfaceSolid: '#121215',
    surfaceCard: 'rgba(20, 20, 24, 0.75)',
    surfaceAccent: 'rgba(255, 255, 255, 0.04)',
    primary: '#0A84FF', // Xanh Neon Apple
    primaryLight: '#30B0FF',
    primaryNeon: '#20A0FF',
    primaryGlow: 'rgba(10, 132, 255, 0.25)',
    primaryGradient: ['#0A84FF', '#30B0FF'] as const,
    gold: '#FFE259',
    goldSecondary: '#FFA751',
    goldGradient: ['#FFE259', '#FFA751'] as const,
    goldGlow: 'rgba(255, 215, 0, 0.25)',
    success: '#30D158',
    successGradient: ['#30D158', '#40E0D0'] as const,
    danger: '#FF453A',
    warning: '#FFD60A',
    text: '#FFFFFF',
    textSecondary: '#EBEBF5',
    textMuted: '#8E8E93',
    textDark: '#0A0A0C',
    border: 'rgba(255, 255, 255, 0.08)',
    borderActive: 'rgba(10, 132, 255, 0.3)',
    borderGold: 'rgba(255, 226, 89, 0.25)',
  },
  gold: {
    background: '#090703', // Đen vàng hoàng gia
    bgGradient: ['#090703', '#1A140A', '#090703'] as const,
    surface: 'rgba(34, 28, 18, 0.7)',
    surfaceSolid: '#1E1810',
    surfaceCard: 'rgba(26, 21, 14, 0.8)',
    surfaceAccent: 'rgba(255, 226, 89, 0.04)',
    primary: '#FFE259', // Vàng Gold hoàng gia
    primaryLight: '#FFF090',
    primaryNeon: '#FFD700',
    primaryGlow: 'rgba(255, 226, 89, 0.25)',
    primaryGradient: ['#FFE259', '#FFA751'] as const,
    gold: '#FFE259',
    goldSecondary: '#FFA751',
    goldGradient: ['#FFE259', '#FFA751'] as const,
    goldGlow: 'rgba(255, 215, 0, 0.25)',
    success: '#30D158',
    successGradient: ['#30D158', '#40E0D0'] as const,
    danger: '#FF453A',
    warning: '#FFD60A',
    text: '#FFFFFF',
    textSecondary: '#F5EBE0',
    textMuted: '#C5B49E',
    textDark: '#0A0A0C',
    border: 'rgba(255, 226, 89, 0.15)',
    borderActive: 'rgba(255, 226, 89, 0.4)',
    borderGold: 'rgba(255, 226, 89, 0.3)',
  },
  neon: {
    background: '#030008', // Đen Cyber Neon
    bgGradient: ['#030008', '#0F031C', '#030008'] as const,
    surface: 'rgba(20, 5, 30, 0.7)',
    surfaceSolid: '#130424',
    surfaceCard: 'rgba(22, 6, 40, 0.8)',
    surfaceAccent: 'rgba(255, 0, 127, 0.04)',
    primary: '#FF007F', // Hồng neon sặc sỡ
    primaryLight: '#FF60B5',
    primaryNeon: '#FF00FF',
    primaryGlow: 'rgba(255, 0, 127, 0.25)',
    primaryGradient: ['#FF007F', '#7F00FF'] as const,
    gold: '#FFE259',
    goldSecondary: '#FFA751',
    goldGradient: ['#FFE259', '#FFA751'] as const,
    goldGlow: 'rgba(255, 215, 0, 0.25)',
    success: '#00FFCC',
    successGradient: ['#00FFCC', '#00FF66'] as const,
    danger: '#FF3366',
    warning: '#FFFF33',
    text: '#FFFFFF',
    textSecondary: '#F5E0EB',
    textMuted: '#B59EC5',
    textDark: '#0A0A0C',
    border: 'rgba(255, 0, 127, 0.2)',
    borderActive: 'rgba(255, 0, 127, 0.5)',
    borderGold: 'rgba(255, 226, 89, 0.25)',
  },
  light: {
    background: '#F4F4F6', // Nền xám sáng chuẩn iOS mới
    bgGradient: ['#F4F4F6', '#FAFAFB', '#F4F4F6'] as const,
    surface: 'rgba(255, 255, 255, 0.9)',
    surfaceSolid: '#FFFFFF',
    surfaceCard: '#FFFFFF', // Thẻ màu trắng tinh tế
    surfaceAccent: 'rgba(0, 0, 0, 0.02)',
    primary: '#0E0E10', // Màu chủ đạo đen tối giản sang trọng
    primaryLight: '#27272A',
    primaryNeon: '#000000',
    primaryGlow: 'rgba(14, 14, 16, 0.05)',
    primaryGradient: ['#0E0E10', '#27272A'] as const,
    gold: '#D4AF37', // Vàng gold sang trọng
    goldSecondary: '#AA7C11',
    goldGradient: ['#FFE259', '#FFA751'] as const,
    goldGlow: 'rgba(212, 175, 55, 0.15)',
    success: '#34C759',
    successGradient: ['#34C759', '#30D158'] as const,
    danger: '#FF3B30',
    warning: '#FFCC00',
    text: '#000000', // Chữ đen đậm
    textSecondary: '#3C3C43',
    textMuted: '#8E8E93',
    textDark: '#FFFFFF',
    border: 'rgba(0, 0, 0, 0.05)', // Viền xám siêu mỏng
    borderActive: 'rgba(0, 0, 0, 0.15)',
    borderGold: 'rgba(212, 175, 55, 0.25)',
  },
  aurora: {
    background: '#050D12', // Teal-midnight deep
    bgGradient: ['#050D12', '#0D1A22', '#050D12'] as const,
    surface: 'rgba(10, 30, 40, 0.65)',
    surfaceSolid: '#0A1820',
    surfaceCard: 'rgba(8, 24, 32, 0.80)',
    surfaceAccent: 'rgba(0, 210, 210, 0.04)',
    primary: '#00C9B1',
    primaryLight: '#40DFCC',
    primaryNeon: '#00FFE0',
    primaryGlow: 'rgba(0, 201, 177, 0.25)',
    primaryGradient: ['#00C9B1', '#006EFF'] as const,
    gold: '#FFE259',
    goldSecondary: '#FFA751',
    goldGradient: ['#FFE259', '#FFA751'] as const,
    goldGlow: 'rgba(255, 215, 0, 0.25)',
    success: '#00E096',
    successGradient: ['#00E096', '#00C9B1'] as const,
    danger: '#FF4F6D',
    warning: '#FFD60A',
    text: '#FFFFFF',
    textSecondary: '#E0F0F5',
    textMuted: '#6B9EAA',
    textDark: '#0A0A0C',
    border: 'rgba(0, 201, 177, 0.12)',
    borderActive: 'rgba(0, 201, 177, 0.4)',
    borderGold: 'rgba(255, 226, 89, 0.25)',
  },
  midnight: {
    background: '#01010D',
    bgGradient: ['#01010D', '#060618', '#01010D'] as const,
    surface: 'rgba(6, 6, 28, 0.70)',
    surfaceSolid: '#05051A',
    surfaceCard: 'rgba(5, 5, 22, 0.85)',
    surfaceAccent: 'rgba(88, 86, 214, 0.06)',
    primary: '#5856D6',
    primaryLight: '#7F7DFF',
    primaryNeon: '#8480FF',
    primaryGlow: 'rgba(88, 86, 214, 0.30)',
    primaryGradient: ['#5856D6', '#BF5AF2'] as const,
    gold: '#FFE259',
    goldSecondary: '#FFA751',
    goldGradient: ['#FFE259', '#FFA751'] as const,
    goldGlow: 'rgba(255, 215, 0, 0.25)',
    success: '#30D158',
    successGradient: ['#30D158', '#40E0D0'] as const,
    danger: '#FF453A',
    warning: '#FFD60A',
    text: '#FFFFFF',
    textSecondary: '#EBEBF5',
    textMuted: '#7070A0',
    textDark: '#FFFFFF',
    border: 'rgba(88, 86, 214, 0.15)',
    borderActive: 'rgba(88, 86, 214, 0.5)',
    borderGold: 'rgba(255, 226, 89, 0.25)',
  },
};

// Object màu hiện tại (Sẽ bị ghi đè in-place khi đổi giao diện)
export const COLORS = { ...THEME_STYLES.light };

// TỪ ĐIỂN DỊCH (TRANSLATIONS)
export const TRANSLATIONS = {
  vi: {
    // Tab bar labels
    today: "Hôm nay",
    apps: "Ứng dụng",
    search: "Tìm kiếm",
    library: "Thư viện",
    vip: "Kho VIP",
    profile: "Hồ sơ",

    // Settings screen
    settings: "CÀI ĐẶT ỨNG DỤNG",
    language: "Ngôn ngữ",
    themeStyle: "Phong cách giao diện",
    logout: "Đăng xuất",
    vipTagNormal: "Thành viên thường",
    vipUpgrade: "Nâng Cấp Gói VIP",
    vipExtend: "Gia Hạn Gói VIP",
    vipSubText: "Mở khóa kho ứng dụng Độc quyền",
    cloudStorage: "Kho lưu trữ Đám mây",
    history: "Lịch sử giao dịch",
    adminArea: "Khu vực Admin",
    langName: "Tiếng Việt",

    // Additional labels for client translations
    appStoreTitle: "Kho Ứng Dụng",
    discoverTitle: "Khám Phá",
    suggestedTitle: "Được Đề Xuất",
    searchPlaceholder: "Tìm app, game...",
    searchResult: "Kết quả tìm kiếm",
    noResult: "Không tìm thấy kết quả nào.",
    
    // Sign screen
    signTitle: "Quản Lý Ký App",
    originalIpaTab: "File IPA Gốc",
    signedIpaTab: "App Đã Ký",
    emptyStore: "Kho lưu trữ trống",
    addIpa: "Thêm File IPA",
    manageCert: "Quản Lý Chứng Chỉ",
    selectCert: "CHỌN CHỨNG CHỈ",
    certStore: "KHO CHỨNG CHỈ CỦA BẠN",
    importZip: "Nhập tệp Chứng chỉ (.zip)",
    securedCert: "BẢO MẬT CHỨNG CHỈ",
    pwdPlaceholder: "Mật khẩu file P12...",
    cancel: "HỦY BỎ",
    saveStore: "LƯU VÀO KHO",
    
    // Detail screen
    rating: "ĐÁNH GIÁ",
    size: "DUNG LƯỢNG",
    category: "THỂ LOẠI",
    developer: "Nhà phát triển",
    version: "Phiên bản",
    more: "Thêm",
    collapse: "Thu gọn",
    modFeatures: "Thông tin Mod / Cập nhật",
    install: "CÀI ĐẶT",
    loading: "Đang tải...",
    signing: "Đang ký App...",
    generatingOta: "Tạo OTA...",
    done: "Hoàn tất!",
    verSpecs: "Chi tiết phiên bản",
    clearCache: "Dọn dẹp bộ nhớ đệm",
    certLib: "Thư viện chứng chỉ",
    systemSettings: "THIẾT LẬP HỆ THỐNG",

    // Discover Cards
    topApps: "Top Ứng Dụng",
    topGames: "Top Trò Chơi",
    bestSellers: "Bán Chạy Nhất",
    performance: "Hiệu Suất",

    // New settings fields
    settingsSubtitle: "Tối giản & Đẳng cấp điều khiển thiết bị",
    certificateSection: "CHỨNG CHỈ",
    themeSection: "PHONG CÁCH GIAO DIỆN",
    systemSettingsSection: "THIẾT LẬP HỆ THỐNG",
    infoSection: "THÔNG TIN",
    coreCppEngine: "Nhân C++ lõi:",
    environmentLabel: "Môi trường:",
    closeLabel: "ĐÓNG",
    enterpriseLabel: "Doanh nghiệp:",
    expirationLabel: "Hết hạn:",
    expiredLabel: "(Hết hạn)",
    noCertsLoaded: "Chưa nạp chứng chỉ nào.",
    p12PasswordTitle: "Mật khẩu giải mã",
    p12PasswordSub: "Nhập mật khẩu tệp P12 trong gói:",
    p12PasswordPlaceholder: "Nhập mật khẩu...",
    cancelBtn: "Hủy",
    completeBtn: "Hoàn tất",
    importNewCert: "Nhập chứng chỉ mới (.zip)",
    deleteCertTitle: "Xóa Chứng Chỉ",
    deleteCertConfirm: "Bạn chắc chắn muốn xóa chứng chỉ này khỏi máy?",
    successLabel: "Thành công",
    errorLabel: "Lỗi",

    // New sign fields
    signAppTitle: "Quản Lý Ký App",
    selectIpaCert: "Vui lòng chọn đủ File IPA và Chứng chỉ để ký.",
    readyToInstall: "Sẵn sàng cài đặt",
    safariInstallInstructions: "Trình duyệt sẽ mở ra. Vui lòng bấm Cài Đặt trên web, sau đó QUAY LẠI APP NÀY và giữ màn hình sáng chờ đến khi tải xong.",
    openSafariBtn: "Mở Safari",
    signSuccessTitle: "🎉 KÝ THÀNH CÔNG!",
    signSuccessSub: "File IPA mới đã được tạo và sẵn sàng cài đặt!",
    laterBtn: "Để sau",
    installNowBtn: "Cài Đặt Ngay",
    signFailure: "Quá trình nhúng chứng chỉ thất bại.",
    coreSigningText: "ĐANG ÉP XUNG LÕI IPA...",
    tapToSignNow: "CHẠM ĐỂ KÝ NGAY",
    unzippingText: "Đang tải Tệp...",
    noCertsSavedText: "Chưa có chứng chỉ nào được lưu.",
    shareFile: "Chia sẻ File",
    deleteFile: "Xóa File",
    deleteFileConfirm: "Xóa file này?",
    originalIpaShort: "File IPA Gốc",
    signedIpaShort: "App Đã Ký",

    // New account fields
    authTitleLogin: "Đăng Nhập",
    authTitleRegister: "Đăng Ký",
    cloudSystemSub: "Hệ thống lưu trữ IPAVIET Cloud",
    fullnamePlaceholder: "Tên hiển thị",
    passwordPlaceholder: "Mật khẩu",
    loginBtnText: "VÀO HỆ THỐNG",
    registerBtnText: "TẠO TÀI KHOẢN",
    switchLoginText: "Đã có tài khoản? Đăng nhập",
    switchRegisterText: "Chưa có tài khoản? Đăng ký ngay",
    systemNotificationTitle: "Thông Báo Hệ Thống",
    understoodBtn: "Đã Hiểu",
    customerGuest: "Khách hàng",
    setupThemeRow: "Thiết lập & Giao diện",
    openLabel: "Mở",
    cloudAccountHeader: "TÀI KHOẢN CLOUD",
    noVipStatus: "Chưa có VIP",
    daysRemaining: " ngày",
    confirmLogoutTitle: "Đăng xuất",
    confirmLogoutMsg: "Rời khỏi hệ thống?",
    confirmExit: "Thoát",
    // Background remover translations
    bgRemoverTitle: "TÁCH NỀN HÌNH ẢNH",
    bgRemoverSub: "Tách nền trắng/đen của ảnh làm logo/icon trong suốt",
    selectImageBtn: "Chọn ảnh từ thiết bị",
    removeWhiteBgBtn: "Tách Nền Trắng",
    removeBlackBgBtn: "Tách Nền Đen",
    processingText: "Đang xử lý tách nền...",
    saveShareResultBtn: "Chia sẻ / Lưu ảnh sạch",
    noImageSelected: "Chưa chọn ảnh nào.",
    bgRemoverLabel: "Công cụ Tách Nền",
    utilSection: "CÔNG CỤ TIỆN ÍCH",
    storageManager: "QUẢN LÝ BỘ NHỚ",
    unsignedApps: "File IPA gốc (chưa ký)",
    signedApps: "Ứng dụng đã ký",
    tempFiles: "Bộ nhớ tạm thời",
    allData: "Tất cả dữ liệu & Reset",
    cleanBtn: "Dọn dẹp",
    confirmClean: "Xóa",
    autoTheme: "Tự động theo máy"
  },
  en: {
    // Tab bar labels
    today: "Today",
    apps: "Apps",
    search: "Search",
    library: "Library",
    vip: "VIP Store",
    profile: "Profile",

    // Settings screen
    settings: "APP SETTINGS",
    language: "Language",
    themeStyle: "Aesthetic Theme",
    logout: "Log Out",
    vipTagNormal: "Free Member",
    vipUpgrade: "Upgrade VIP Plan",
    vipExtend: "Renew VIP Plan",
    vipSubText: "Unlock exclusive cloud apps",
    cloudStorage: "Cloud Storage",
    history: "Transaction History",
    adminArea: "Admin Control",
    langName: "English",

    // Additional labels for client translations
    appStoreTitle: "App Store",
    discoverTitle: "Discover",
    suggestedTitle: "Recommended",
    searchPlaceholder: "Search apps, games...",
    searchResult: "Search Results",
    noResult: "No results found.",

    // Sign screen
    signTitle: "Sign App Manager",
    originalIpaTab: "Original IPA Files",
    signedIpaTab: "Signed Apps",
    emptyStore: "Storage is empty",
    addIpa: "Add IPA File",
    manageCert: "Manage Certificates",
    selectCert: "SELECT CERTIFICATE",
    certStore: "YOUR CERTIFICATES",
    importZip: "Import Certificate (.zip)",
    securedCert: "SECURE CERTIFICATE",
    pwdPlaceholder: "P12 file password...",
    cancel: "CANCEL",
    saveStore: "SAVE TO STORE",

    // Detail screen
    rating: "RATING",
    size: "SIZE",
    category: "CATEGORY",
    developer: "Developer",
    version: "Version",
    more: "More",
    collapse: "Collapse",
    modFeatures: "Mod Info / Updates",
    install: "INSTALL",
    loading: "Loading...",
    signing: "Signing App...",
    generatingOta: "Generating OTA...",
    done: "Done!",
    verSpecs: "Version Details",
    clearCache: "Clear Cache",
    certLib: "Certificate Library",
    systemSettings: "SYSTEM SETTINGS",

    // Discover Cards
    topApps: "Top Apps",
    topGames: "Top Games",
    bestSellers: "Best Sellers",
    performance: "Performance",

    // New settings fields
    settingsSubtitle: "Minimal & Premium device control",
    certificateSection: "CERTIFICATE",
    themeSection: "AESTHETIC THEME",
    systemSettingsSection: "SYSTEM SETTINGS",
    infoSection: "INFORMATION",
    coreCppEngine: "C++ Core Engine:",
    environmentLabel: "Environment:",
    closeLabel: "CLOSE",
    enterpriseLabel: "Enterprise:",
    expirationLabel: "Expiration:",
    expiredLabel: "(Expired)",
    noCertsLoaded: "No certificates loaded.",
    p12PasswordTitle: "Decryption Password",
    p12PasswordSub: "Enter P12 password in package:",
    p12PasswordPlaceholder: "Enter password...",
    cancelBtn: "Cancel",
    completeBtn: "Complete",
    importNewCert: "Import new certificate (.zip)",
    deleteCertTitle: "Delete Certificate",
    deleteCertConfirm: "Are you sure you want to delete this certificate from device?",
    successLabel: "Success",
    errorLabel: "Error",

    // New sign fields
    signAppTitle: "Sign App Manager",
    selectIpaCert: "Please select both IPA file and Certificate to sign.",
    readyToInstall: "Ready to Install",
    safariInstallInstructions: "Browser will open. Please click Install on web, then RETURN TO THIS APP and keep screen active until download finishes.",
    openSafariBtn: "Open Safari",
    signSuccessTitle: "🎉 SIGNED SUCCESSFULLY!",
    signSuccessSub: "New IPA file created and ready to install!",
    laterBtn: "Later",
    installNowBtn: "Install Now",
    signFailure: "Certificate injection process failed.",
    coreSigningText: "INJECTING IPA CORE...",
    tapToSignNow: "TAP TO SIGN NOW",
    unzippingText: "Extracting package...",
    noCertsSavedText: "No certificates saved.",
    shareFile: "Share File",
    deleteFile: "Delete File",
    deleteFileConfirm: "Delete this file?",
    originalIpaShort: "Original IPA",
    signedIpaShort: "Signed App",

    // New account fields
    authTitleLogin: "Log In",
    authTitleRegister: "Register",
    cloudSystemSub: "IPAVIET Cloud Storage System",
    fullnamePlaceholder: "Display name",
    passwordPlaceholder: "Password",
    loginBtnText: "ENTER SYSTEM",
    registerBtnText: "CREATE ACCOUNT",
    switchLoginText: "Already have an account? Log In",
    switchRegisterText: "Don't have an account? Register now",
    systemNotificationTitle: "System Notification",
    understoodBtn: "Understood",
    customerGuest: "Guest",
    setupThemeRow: "Settings & Interface",
    openLabel: "Open",
    cloudAccountHeader: "CLOUD ACCOUNT",
    noVipStatus: "No VIP",
    daysRemaining: " days",
    confirmLogoutTitle: "Log Out",
    confirmLogoutMsg: "Are you sure you want to log out?",
    confirmExit: "Exit",
    // Background remover translations
    bgRemoverTitle: "IMAGE BACKGROUND REMOVER",
    bgRemoverSub: "Make white or black backgrounds transparent for clean logos/icons",
    selectImageBtn: "Select image from device",
    removeWhiteBgBtn: "Remove White Background",
    removeBlackBgBtn: "Remove Black Background",
    processingText: "Removing background...",
    saveShareResultBtn: "Share / Save Clean Image",
    noImageSelected: "No image selected.",
    bgRemoverLabel: "Background Remover",
    utilSection: "UTILITY TOOLS",
    storageManager: "STORAGE MANAGEMENT",
    unsignedApps: "Original IPAs (Unsigned)",
    signedApps: "Signed Applications",
    tempFiles: "Temporary Cache Files",
    allData: "All Data & Reset Settings",
    cleanBtn: "Clear",
    confirmClean: "Delete",
    autoTheme: "Auto (System)"
  }
};

// Object dịch hiện tại (Sẽ bị ghi đè in-place khi đổi ngôn ngữ)
export const TXT = { ...TRANSLATIONS.vi };

// Cơ chế thông báo cập nhật giao diện
const listeners = new Set<() => void>();

export const notifyThemeChange = () => {
  listeners.forEach(listener => listener());
};

export const useThemeUpdate = () => {
  const [, setCounter] = useState(0);
  useEffect(() => {
    const listener = () => setCounter(c => c + 1);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);
};

export const loadTheme = async () => {
  try {
    let style = await AsyncStorage.getItem('@app_theme_style');
    if (!style) style = 'light';
    
    if (style === 'auto') {
      const { Appearance } = require('react-native');
      const systemScheme = Appearance.getColorScheme();
      if (systemScheme === 'dark') {
        Object.assign(COLORS, THEME_STYLES.obsidian);
      } else {
        Object.assign(COLORS, THEME_STYLES.light);
      }
    } else if (style && THEME_STYLES[style as keyof typeof THEME_STYLES]) {
      Object.assign(COLORS, THEME_STYLES[style as keyof typeof THEME_STYLES]);
    } else {
      Object.assign(COLORS, THEME_STYLES.light);
    }
  } catch (e) {
    console.error("Lỗi loadTheme:", e);
  }
};

// Đăng ký listener lắng nghe sự thay đổi giao diện hệ thống tự động
try {
  const { Appearance } = require('react-native');
  Appearance.addChangeListener(async () => {
    const style = await AsyncStorage.getItem('@app_theme_style');
    if (style === 'auto') {
      await loadTheme();
      notifyThemeChange();
    }
  });
} catch (e) {
  console.warn("Lỗi Appearance change listener:", e);
}

export const loadLanguage = async () => {
  try {
    const lang = await AsyncStorage.getItem('@app_lang') as keyof typeof TRANSLATIONS;
    if (lang && TRANSLATIONS[lang]) {
      Object.assign(TXT, TRANSLATIONS[lang]);
    } else {
      Object.assign(TXT, TRANSLATIONS.vi);
    }
  } catch (e) {
    console.error("Lỗi loadLanguage:", e);
  }
};

export const initAppThemeAndLang = async () => {
  await Promise.all([loadTheme(), loadLanguage()]);
  notifyThemeChange();
};

export const Colors = {
  light: {
    text: '#111827',
    background: '#fff',
    tint: '#0a7ea4',
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: '#0a7ea4',
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    tint: '#fff',
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: '#fff',
  },
};

export const SIZES = {
  padding: 16,
  radiusSquircle: 28, // Bo tròn squircle chuẩn Apple hiện đại hơn
  radiusCard: 20,     // Bo tròn card trung bình mượt mà hơn
  radiusButton: 16,   // Bo tròn nút
  radiusPill: 99,
};

export const SHADOWS = {
  glowBlue: {
    shadowColor: '#0A84FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  glowGold: {
    shadowColor: '#FFE259',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  glowDark: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  glowCard: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 2,
  }
};

export const SPRING = {
  snappy: { stiffness: 220, damping: 20, mass: 0.8 },
  gentle: { stiffness: 150, damping: 22, mass: 0.8 },
  wobbly: { stiffness: 120, damping: 12, mass: 0.8 },
  stiff: { stiffness: 280, damping: 25, mass: 1 },
  bouncy: { stiffness: 200, damping: 15, mass: 0.9 }
};

export const TYPOGRAPHY = {
  largeTitle: {
    fontSize: 34,
    fontWeight: '800' as const,
    letterSpacing: -1,
  },
  title1: {
    fontSize: 28,
    fontWeight: '700' as const,
    letterSpacing: -0.5,
  },
  title2: {
    fontSize: 22,
    fontWeight: '700' as const,
    letterSpacing: -0.5,
  },
  headline: {
    fontSize: 17,
    fontWeight: '600' as const,
    letterSpacing: -0.4,
  },
  subhead: {
    fontSize: 15,
    fontWeight: '600' as const,
    letterSpacing: -0.2,
  },
  body: {
    fontSize: 15,
    fontWeight: '400' as const,
    letterSpacing: -0.2,
  },
  footnote: {
    fontSize: 13,
    fontWeight: '500' as const,
    letterSpacing: -0.1,
  },
  caption: {
    fontSize: 12,
    fontWeight: '400' as const,
    letterSpacing: 0,
  },
};