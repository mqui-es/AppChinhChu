import { useEffect, useState, useRef } from 'react';
import { StyleSheet, View, Text, Dimensions, Animated } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { ShieldCheck, Sparkles } from 'lucide-react-native';
import { initAppThemeAndLang } from '../constants/theme';

const { width } = Dimensions.get('window');

export default function RootLayout() {
  const logoScale = useRef(new Animated.Value(0.3)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textTranslateY = useRef(new Animated.Value(20)).current;
  const authorOpacity = useRef(new Animated.Value(0)).current;
  const screenOpacity = useRef(new Animated.Value(1)).current;
  const [showIntro, setShowIntro] = useState(true);

  useEffect(() => {
    // 1. Khởi tạo theme và ngôn ngữ
    initAppThemeAndLang();

    // 2. Chạy chuỗi hiệu ứng hoạt họa Intro
    Animated.sequence([
      // Logo nở ra và hiện lên
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1,
          friction: 6,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
      // Tên app dịch chuyển lên và hiện lên
      Animated.parallel([
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(textTranslateY, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
      // Tên tác giả hiện lên cuối cùng
      Animated.timing(authorOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();

    // 3. Tự động biến mất sau 2.5 giây
    const timer = setTimeout(() => {
      Animated.timing(screenOpacity, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }).start(() => {
        setShowIntro(false);
      });
    }, 2500);

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
            colors={['#07070A', '#0F0F14', '#07070A']}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.splashContent}>
            {/* Logo Squircle với hiệu ứng phát sáng */}
            <Animated.View style={[
              styles.logoSquircle,
              {
                opacity: logoOpacity,
                transform: [{ scale: logoScale }],
              }
            ]}>
              <LinearGradient
                colors={['#0A84FF', '#30B0FF']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <ShieldCheck color="#FFFFFF" size={54} strokeWidth={2} />
              <View style={styles.sparkleOverlay}>
                <Sparkles color="#FFFFFF" size={16} />
              </View>
            </Animated.View>

            {/* Tên ứng dụng */}
            <Animated.View style={{
              opacity: textOpacity,
              transform: [{ translateY: textTranslateY }],
              alignItems: 'center',
              marginTop: 24,
            }}>
              <Text style={styles.appName}>VSign</Text>
              <Text style={styles.tagline}>KÝ APP NGOẠI TUYẾN CHUYÊN NGHIỆP</Text>
            </Animated.View>

            {/* Chữ tác giả ở dưới cùng */}
            <Animated.View style={[styles.authorContainer, { opacity: authorOpacity }]}>
              <Text style={styles.authorLabel}>DESIGNED & DEVELOPED BY</Text>
              <Text style={styles.authorName}>VTN vuthanhnghi</Text>
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
  logoSquircle: {
    width: 104,
    height: 104,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#0A84FF',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 10,
    position: 'relative',
  },
  sparkleOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  appName: {
    fontSize: 44,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -1,
  },
  tagline: {
    fontSize: 10,
    fontWeight: '800',
    color: '#8E8E93',
    letterSpacing: 2.2,
    marginTop: 8,
  },
  authorContainer: {
    position: 'absolute',
    bottom: 60,
    alignItems: 'center',
  },
  authorLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#8E8E93',
    letterSpacing: 2,
    marginBottom: 4,
  },
  authorName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFE259', // Vàng hoàng gia xịn sò
    letterSpacing: 0.5,
  },
});