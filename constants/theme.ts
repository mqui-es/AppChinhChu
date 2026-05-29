// BỘ NHẬN DIỆN THƯƠNG HIỆU VÀ GIAO DIỆN iOS 26 - CAO CẤP HÓA TOÀN DIỆN
export const COLORS = {
  background: '#070708', // Đen obsidian vũ trụ (Space Black)
  bgGradient: ['#070708', '#111115', '#070708'] as const, // Gradient nền sâu thẳm
  
  // Bề mặt kính mờ (Glassmorphism)
  surface: 'rgba(28, 28, 30, 0.65)', 
  surfaceSolid: '#121215', 
  surfaceCard: 'rgba(20, 20, 24, 0.75)',
  surfaceAccent: 'rgba(255, 255, 255, 0.04)',
  
  // Xanh Neon Apple Tương Lai
  primary: '#0A84FF', 
  primaryLight: '#30B0FF',
  primaryNeon: '#20A0FF',
  primaryGlow: 'rgba(10, 132, 255, 0.25)',
  primaryGradient: ['#0A84FF', '#30B0FF'] as const,

  // Vàng Gold Hoàng Gia Lỏng (Liquid Royal Gold) cho VIP
  gold: '#FFE259',
  goldSecondary: '#FFA751',
  goldGradient: ['#FFE259', '#FFA751'] as const,
  goldGlow: 'rgba(255, 215, 0, 0.25)',

  // Trạng thái hệ thống
  success: '#30D158', // Xanh lá cây mượt
  successGradient: ['#30D158', '#40E0D0'] as const,
  danger: '#FF453A', // Đỏ san hô
  warning: '#FFD60A',

  // Văn bản & Viền
  text: '#FFFFFF',
  textSecondary: '#EBEBF5',
  textMuted: '#8E8E93',
  textDark: '#0A0A0C',
  
  border: 'rgba(255, 255, 255, 0.08)', // Viền kính cực mỏng
  borderActive: 'rgba(10, 132, 255, 0.3)',
  borderGold: 'rgba(255, 226, 89, 0.25)',
};

// Khớp khả năng tương thích ngược của các component mặc định Expo
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