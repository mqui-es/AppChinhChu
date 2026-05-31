import { useEffect, useState, useRef } from 'react';
import { StyleSheet, View, Text, Dimensions, Animated, Image, Easing } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { ShieldCheck, Sparkles } from 'lucide-react-native';
import { initAppThemeAndLang } from '../constants/theme';

const { width } = Dimensions.get('window');

export default function RootLayout() {
  const logoScale = useRef(new Animated.Value(0.9)).current; // Phóng to cực kỳ chậm từ 0.9 lên 1.0
  const logoOpacity = useRef(new Animated.Value(0)).current;



  // Slogan & Credits
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textTranslateY = useRef(new Animated.Value(12)).current;
  const authorOpacity = useRef(new Animated.Value(0)).current;

  // Transition biến mất dạng thu nhỏ
  const screenScale = useRef(new Animated.Value(1)).current; 
  const screenOpacity = useRef(new Animated.Value(1)).current;
  const [showIntro, setShowIntro] = useState(true);

  useEffect(() => {
    // 1. Khởi tạo theme và ngôn ngữ
    initAppThemeAndLang();



    // 3. Chuỗi hoạt họa xuất hiện tối giản sang trọng (Apple Style)
    Animated.sequence([
      Animated.parallel([
        // Logo hiện ra rất từ từ bằng Cubic Bezier
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 1800,
          easing: Easing.bezier(0.25, 0.1, 0.25, 1),
          useNativeDriver: true,
        }),
        Animated.timing(logoScale, {
          toValue: 1.0,
          duration: 2000,
          easing: Easing.bezier(0.25, 0.1, 0.25, 1),
          useNativeDriver: true,
        })
      ]),
      // Trượt nhẹ hiện Slogan và Credits
      Animated.parallel([
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: 900,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(textTranslateY, {
          toValue: 0,
          duration: 900,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(authorOpacity, {
          toValue: 1,
          duration: 900,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ])
    ]).start();

    // 4. Biến mất sau 4.0 giây bằng cú thu nhỏ tấm nền (Sheet-Shrink Exit) cực sang
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(screenOpacity, {
          toValue: 0,
          duration: 800,
          easing: Easing.bezier(0.25, 0.1, 0.25, 1),
          useNativeDriver: true,
        }),
        Animated.timing(screenScale, {
          toValue: 0.95, // Thu nhỏ nhẹ tinh tế ra sau
          duration: 800,
          easing: Easing.bezier(0.25, 0.1, 0.25, 1),
          useNativeDriver: true,
        })
      ]).start(() => {
        setShowIntro(false);
      });
    }, 3800);

    return () => {
      clearTimeout(timer);
    };
  }, []);

  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen 
          name="details/[id]" 
          options={{ 
            presentation: 'card', 
            animation: 'default' 
          }} 
        />
      </Stack>

      {showIntro && (
        <Animated.View style={[
          StyleSheet.absoluteFill, 
          styles.splashContainer, 
          { 
            opacity: screenOpacity,
            transform: [{ scale: screenScale }] 
          }
        ]}>
          <LinearGradient
            colors={['#060608', '#0b0b0f', '#060608']}
            style={StyleSheet.absoluteFill}
          />

          <View style={styles.splashContent}>


            {/* Logo VSign Wrapper (Basic & Premium) */}
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
              marginTop: 36,
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
    backgroundColor: '#060608',
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
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  logoImage: {
    width: 180,
    height: 110,
  },
  tagline: {
    fontSize: 9,
    fontWeight: '300',
    color: '#8E8E93',
    letterSpacing: 3.5,
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
    color: '#FFFFFF',
    letterSpacing: 4.5,
  },
});