import { useEffect, useState, useRef } from 'react';
import { StyleSheet, View, Text, Dimensions, Animated, Image, Easing } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { ShieldCheck, Sparkles } from 'lucide-react-native';
import { initAppThemeAndLang } from '../constants/theme';

const { width } = Dimensions.get('window');

export default function RootLayout() {
  const logoScale = useRef(new Animated.Value(0.95)).current; // Bắt đầu từ 0.95 để scale nhẹ nhàng sang trọng
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textTranslateY = useRef(new Animated.Value(15)).current; // Tịnh tiến nhẹ nhàng 15px
  const authorOpacity = useRef(new Animated.Value(0)).current;
  const screenOpacity = useRef(new Animated.Value(1)).current;
  const [showIntro, setShowIntro] = useState(true);

  useEffect(() => {
    // 1. Khởi tạo theme và ngôn ngữ
    initAppThemeAndLang();

    // 2. Chạy hiệu ứng hoạt họa Intro song song mượt mà chuẩn Apple (Easing Cubic Bezier)
    Animated.parallel([
      // Logo hiện lên
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 1200,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
        useNativeDriver: true,
      }),
      Animated.timing(logoScale, {
        toValue: 1,
        duration: 1400,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
        useNativeDriver: true,
      }),
      // Tagline tịnh tiến và hiện lên
      Animated.timing(textOpacity, {
        toValue: 1,
        duration: 800,
        delay: 500,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
        useNativeDriver: true,
      }),
      Animated.timing(textTranslateY, {
        toValue: 0,
        duration: 800,
        delay: 500,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
        useNativeDriver: true,
      }),
      // Credit nhà sản xuất
      Animated.timing(authorOpacity, {
        toValue: 1,
        duration: 800,
        delay: 1000,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
        useNativeDriver: true,
      }),
    ]).start();

    // 3. Tự động biến mất sau 3.0 giây để trải nghiệm intro được trọn vẹn hơn
    const timer = setTimeout(() => {
      Animated.timing(screenOpacity, {
        toValue: 0,
        duration: 700,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
        useNativeDriver: true,
      }).start(() => {
        setShowIntro(false);
      });
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        {/* Khối 1: Hiển thị thanh Tab ở dưới cùng */}
        <Stack.Screen name="(tabs)" />
        
        {/* Khối 2: Màn hình Chi tiết (ĐÈ BẸP Tab Bar khi được gọi) */}
        <Stack.Screen 
          name="details/[id]" 
          options={{ 
            presentation: 'card', 
            animation: 'default' 
          }} 
        />
      </Stack>

      {showIntro && (
        <Animated.View style={[StyleSheet.absoluteFill, styles.splashContainer, { opacity: screenOpacity }]}>
          <LinearGradient
            colors={['#020204', '#07070A', '#020204']}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.splashContent}>
            {/* Logo VSign dạng trần cực kì tinh tế */}
            <Animated.View style={[
              styles.logoWrapper,
              {
                opacity: logoOpacity,
                transform: [{ scale: logoScale }],
              }
            ]}>
              <Image 
                source={require('../assets/images/vsign_logo_white.png')} 
                style={styles.logoImage}
                resizeMode="contain"
              />
            </Animated.View>

            {/* Tagline chữ mỏng tinh tế và giãn rộng */}
            <Animated.View style={{
              opacity: textOpacity,
              transform: [{ translateY: textTranslateY }],
              alignItems: 'center',
              marginTop: 32,
            }}>
              <Text style={styles.tagline}>HỆ THỐNG KÝ APP NGOẠI TUYẾN CHUYÊN NGHIỆP</Text>
            </Animated.View>

            {/* Đơn vị sản xuất chịu trách nhiệm */}
            <Animated.View style={[styles.authorContainer, { opacity: authorOpacity }]}>
              <Text style={styles.authorLabel}>PRODUCED BY</Text>
              <Text style={styles.authorName}>IPAVIET.SITE</Text>
            </Animated.View>
          </View>
        </Animated.View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  splashContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  splashContent: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    width: '100%',
  },
  logoWrapper: {
    width: 220,
    height: 140,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 18,
    elevation: 4,
  },
  logoImage: {
    width: 180,
    height: 110,
  },
  tagline: {
    fontSize: 9,
    fontWeight: '300', // Đẹp nhẹ nhàng quý phái kiểu Apple
    color: '#8E8E93',
    letterSpacing: 3.5, // Tỷ lệ vàng kéo giãn font chữ
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  authorContainer: {
    position: 'absolute',
    bottom: 60,
    alignItems: 'center',
  },
  authorLabel: {
    fontSize: 8,
    fontWeight: '400',
    color: '#8E8E93',
    letterSpacing: 2.5,
    marginBottom: 4,
  },
  authorName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF', // Trắng tối giản tinh khiết
    letterSpacing: 4.5,
  },
});