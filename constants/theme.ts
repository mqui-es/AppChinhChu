import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// HỆ THỐNG PHONG CÁCH GIAO DIỆN (THEME STYLES)
export const THEME_STYLES = {
  obsidian: {
    background: '#070708', // Đen obsidian vũ trụ
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
    background: '#F2F2F7', // Giao diện sáng chuẩn iOS
    bgGradient: ['#F2F2F7', '#FFFFFF', '#F2F2F7'] as const,
    surface: 'rgba(255, 255, 255, 0.85)',
    surfaceSolid: '#FFFFFF',
    surfaceCard: 'rgba(255, 255, 255, 0.95)',
    surfaceAccent: 'rgba(0, 0, 0, 0.02)',
    primary: '#007AFF', // Xanh dương classic
    primaryLight: '#4396FF',
    primaryNeon: '#007AFF',
    primaryGlow: 'rgba(0, 122, 255, 0.15)',
    primaryGradient: ['#007AFF', '#0A84FF'] as const,
    gold: '#B39200',
    goldSecondary: '#9A7B00',
    goldGradient: ['#B39200', '#9A7B00'] as const,
    goldGlow: 'rgba(179, 146, 0, 0.15)',
    success: '#34C759',
    successGradient: ['#34C759', '#30D158'] as const,
    danger: '#FF3B30',
    warning: '#FFCC00',
    text: '#000000',
    textSecondary: '#3C3C43',
    textMuted: '#8E8E93',
    textDark: '#FFFFFF',
    border: 'rgba(0, 0, 0, 0.08)',
    borderActive: 'rgba(0, 122, 255, 0.4)',
    borderGold: 'rgba(179, 146, 0, 0.2)',
  }
};

// Object màu hiện tại (Sẽ bị ghi đè in-place khi đổi giao diện)
export const COLORS = { ...THEME_STYLES.obsidian };

// TỪ ĐIỂN DỊCH (TRANSLATIONS)
export const TRANSLATIONS = {
  vi: {
    today: "Hôm nay",
    apps: "Ứng dụng",
    search: "Tìm kiếm",
    library: "Thư viện",
    vip: "Kho VIP",
    profile: "Hồ sơ",
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
  },
  en: {
    today: "Today",
    apps: "Apps",
    search: "Search",
    library: "Library",
    vip: "VIP Store",
    profile: "Profile",
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
    const style = await AsyncStorage.getItem('@app_theme_style') as keyof typeof THEME_STYLES;
    if (style && THEME_STYLES[style]) {
      Object.assign(COLORS, THEME_STYLES[style]);
    } else {
      Object.assign(COLORS, THEME_STYLES.obsidian);
    }
  } catch (e) {
    console.error("Lỗi loadTheme:", e);
  }
};

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
  padding: 20,
  radiusSquircle: 24, // Bo tròn squircle Apple sâu
  radiusCard: 20,
  radiusButton: 16,
  radiusPill: 99,
};

export const SHADOWS = {
  glowBlue: {
    shadowColor: '#0A84FF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  glowGold: {
    shadowColor: '#FFE259',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 15,
    elevation: 10,
  },
  glowDark: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 15,
  },
  glowCard: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  }
};