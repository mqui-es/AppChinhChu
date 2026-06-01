import { useEffect, useState, useRef } from 'react';
import { StyleSheet, View, Text, Dimensions, Animated, Image, Easing, Platform, AppState, AppStateStatus, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { ShieldCheck, Sparkles, BellRing } from 'lucide-react-native';
import { initAppThemeAndLang } from '../constants/theme';
import * as Notifications from 'expo-notifications';
import * as Linking from 'expo-linking';
import { auth, db } from '../firebaseConfig';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import Constants from 'expo-constants';

if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    } as any),
  });
}

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

  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);
  const [isCheckingPermission, setIsCheckingPermission] = useState(true);

  const checkNotificationPermission = async () => {
    if (Platform.OS === 'web') {
      setPermissionGranted(true);
      setIsCheckingPermission(false);
      return;
    }

    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      if (existingStatus === 'granted') {
        setPermissionGranted(true);
        setIsCheckingPermission(false);
        registerForPushNotifications();
      } else {
        const { status: askStatus } = await Notifications.requestPermissionsAsync();
        if (askStatus === 'granted') {
          setPermissionGranted(true);
          registerForPushNotifications();
        } else {
          setPermissionGranted(false);
        }
        setIsCheckingPermission(false);
      }
    } catch (error) {
      console.warn("Error checking notification permissions:", error);
      setPermissionGranted(true); // bypass in case of simulator or errors
      setIsCheckingPermission(false);
    }
  };

  const registerForPushNotifications = async () => {
    try {
      if (Platform.OS === 'web') return;
      const projectId = Constants.expoConfig?.extra?.eas?.projectId;
      if (!projectId) {
        console.warn("No EAS projectId found in app.json.");
        return;
      }
      const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
      const token = tokenData.data;
      if (token) {
        await setDoc(doc(db, 'push_tokens', token), {
          token,
          uid: auth.currentUser?.uid || null,
          platform: Platform.OS,
          updatedAt: serverTimestamp(),
        }, { merge: true });
      }
    } catch (e) {
      console.warn("Failed to register push token:", e);
    }
  };

  useEffect(() => {
    if (Platform.OS === 'web') return;
    const subscription = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      if (data && data.installUrl) {
        Linking.openURL(data.installUrl as string).catch(err => {
          console.warn("Failed to open install URL from notification tap", err);
        });
      }
    });
    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    checkNotificationPermission();

    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        checkNotificationPermission();
      }
    };
    const appStateSub = AppState.addEventListener('change', handleAppStateChange);

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      try {
        if (Platform.OS === 'web') return;
        const { status } = await Notifications.getPermissionsAsync();
        if (status === 'granted') {
          const projectId = Constants.expoConfig?.extra?.eas?.projectId;
          if (projectId) {
            const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
            const token = tokenData.data;
            if (token) {
              await setDoc(doc(db, 'push_tokens', token), {
                token,
                uid: user?.uid || null,
                platform: Platform.OS,
                updatedAt: serverTimestamp(),
              }, { merge: true });
            }
          }
        }
      } catch (e) {
        console.warn("Auth change token sync failed:", e);
      }
    });

    return () => {
      appStateSub.remove();
      unsubscribeAuth();
    };
  }, []);

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
      {permissionGranted === false ? (
        <LinearGradient colors={['#0A0A0E', '#12121A', '#0A0A0E']} style={styles.blockContainer}>
          <View style={styles.blockContent}>
            <View style={styles.blockIconCircle}>
              <BellRing color="#FF453A" size={48} strokeWidth={1.5} />
            </View>
            <Text style={styles.blockTitle}>BẮT BUỘC BẬT THÔNG BÁO</Text>
            <Text style={styles.blockMsg}>
              Ứng dụng yêu cầu quyền thông báo để hoạt động ổn định và thông báo cho sếp khi các tác vụ ký app dưới nền hoàn tất.
            </Text>
            
            <TouchableOpacity style={styles.blockBtn} activeOpacity={0.8} onPress={() => Linking.openSettings()}>
              <LinearGradient colors={['#FF3B30', '#FF453A']} start={{x:0, y:0}} end={{x:1, y:0}} style={styles.blockBtnGradient}>
                <Text style={styles.blockBtnText}>MỞ CÀI ĐẶT THIẾT BỊ</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity style={styles.blockRetryBtn} activeOpacity={0.7} onPress={checkNotificationPermission}>
              <Text style={styles.blockRetryText}>THỬ LẠI</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      ) : (
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
      )}

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
  blockContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
    backgroundColor: '#060608',
  },
  blockContent: {
    alignItems: 'center',
    width: '100%',
    maxWidth: 340,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 28,
    paddingVertical: 40,
    paddingHorizontal: 25,
    borderWidth: 0.8,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  blockIconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(255, 69, 58, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 25,
    borderWidth: 1,
    borderColor: 'rgba(255, 69, 58, 0.25)',
  },
  blockTitle: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 12,
    textAlign: 'center',
  },
  blockMsg: {
    color: '#8E8E93',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 35,
  },
  blockBtn: {
    width: '100%',
    height: 52,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 15,
  },
  blockBtnGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  blockBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  blockRetryBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  blockRetryText: {
    color: '#FF453A',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});