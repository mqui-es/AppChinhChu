import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, ScrollView, Image, TouchableOpacity, ActivityIndicator, Alert, Platform, Dimensions, Modal, Animated, PanResponder, FlatList } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, Star, Zap, X } from 'lucide-react-native';
import * as Linking from 'expo-linking';
import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { requireNativeModule } from 'expo-modules-core';
import { GlassView } from '../../components/ui/GlassView';
import { LinearGradient } from 'expo-linear-gradient';
import * as Notifications from 'expo-notifications';

import { CACHED_REGULAR_APPS, CACHED_VIP_APPS, fetchRegularApps, fetchVIPApps, AppItem } from '../../constants/data';
import { auth, db } from '../../firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import { COLORS, SIZES, SHADOWS, useThemeUpdate, TXT } from '../../constants/theme';
import { SPRINGS, entranceAnim } from '../../constants/animations';
import { translateText } from '../../utils/translate';

import { startStaticServer } from '../../utils/staticServer';

const { width, height } = Dimensions.get('window');

const IpaSigner = (() => {
  if (Platform.OS === 'web') return null;
  try {
    return requireNativeModule('IpaSigner');
  } catch (e) {
    return null;
  }
})();
const INSTALLER_WORKER_URL = "https://ipaviet-installer.clonene121212.workers.dev";

export default function AppDetailScreen() {
  useThemeUpdate();
  const styles = getStyles(COLORS);
  const isLight = COLORS.background === '#F4F4F6';
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [app, setApp] = useState<AppItem | null>(null);
  
  const [downloadState, setDownloadState] = useState('CÀI ĐẶT');
  const [isFetchingApple, setIsFetchingApple] = useState(false);
  const [isDescExpanded, setIsDescExpanded] = useState(false);

  // States dịch chủ động theo yêu cầu của Sếp
  const [showTranslated, setShowTranslated] = useState(false);
  const [translatedDesc, setTranslatedDesc] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const currentLang = TXT.langName === 'English' ? 'en' : 'vi';

  // State phóng to ảnh chụp màn hình dạng vuốt
  const [activeScreenshotIndex, setActiveScreenshotIndex] = useState<number | null>(null);
  const dragY = useRef(new Animated.Value(0)).current;

  // Springs & Animations — iOS native feel
  const buttonScale     = useRef(new Animated.Value(1)).current;
  const backBtnScale    = useRef(new Animated.Value(1)).current;
  const heroSlide       = useRef(new Animated.Value(28)).current;
  const heroOpacity     = useRef(new Animated.Value(0)).current;
  const infoSlide       = useRef(new Animated.Value(20)).current;
  const infoOpacity     = useRef(new Animated.Value(0)).current;
  const modalTranslateY = useRef(new Animated.Value(height)).current;
  const modalScale      = useRef(new Animated.Value(0.9)).current;
  const combinedTranslateY = Animated.add(modalTranslateY, dragY);

  const handleCloseModal = () => {
    setActiveScreenshotIndex(null);
  };

  const handlePressIn  = () => Animated.spring(buttonScale, { toValue: 0.94, ...SPRINGS.tap }).start();
  const handlePressOut = () => Animated.spring(buttonScale, { toValue: 1,    ...SPRINGS.bounce }).start();
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onStartShouldSetPanResponderCapture: () => false,
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        return Math.abs(gestureState.dy) > Math.abs(gestureState.dx) && Math.abs(gestureState.dy) > 10;
      },
      onMoveShouldSetPanResponderCapture: (evt, gestureState) => {
        return Math.abs(gestureState.dy) > Math.abs(gestureState.dx) && Math.abs(gestureState.dy) > 10;
      },
      onPanResponderMove: (evt, gestureState) => {
        dragY.setValue(gestureState.dy);
      },
      onPanResponderRelease: (evt, gestureState) => {
        if (gestureState.dy > 120) {
          Animated.timing(dragY, {
            toValue: height,
            duration: 250,
            useNativeDriver: true,
          }).start(() => {
            setActiveScreenshotIndex(null);
            dragY.setValue(0);
          });
        } else if (gestureState.dy < -120) {
          Animated.timing(dragY, {
            toValue: -height,
            duration: 250,
            useNativeDriver: true,
          }).start(() => {
            setActiveScreenshotIndex(null);
            dragY.setValue(0);
          });
        } else {
          Animated.spring(dragY, {
            toValue: 0,
            stiffness: 180,
            damping: 22,
            mass: 0.8,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  const backdropOpacity = dragY.interpolate({
    inputRange: [-height, 0, height],
    outputRange: [0.3, 0.95, 0.3],
    extrapolate: 'clamp',
  });

  const imageScale = dragY.interpolate({
    inputRange: [-height, 0, height],
    outputRange: [0.85, 1, 0.85],
    extrapolate: 'clamp',
  });

  useEffect(() => {
    if (activeScreenshotIndex !== null) {
      modalTranslateY.setValue(height);
      modalScale.setValue(0.9);
      Animated.parallel([
        Animated.spring(modalTranslateY, {
          toValue: 0,
          stiffness: 200,
          damping: 20,
          mass: 0.8,
          useNativeDriver: true,
        }),
        Animated.spring(modalScale, {
          toValue: 1,
          stiffness: 200,
          damping: 20,
          mass: 0.8,
          useNativeDriver: true,
        })
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(modalTranslateY, {
          toValue: height,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(modalScale, {
          toValue: 0.9,
          duration: 200,
          useNativeDriver: true,
        })
      ]).start();
    }
  }, [activeScreenshotIndex]);

  useEffect(() => {
    const loadData = async () => {
      let allApps = [...CACHED_REGULAR_APPS, ...CACHED_VIP_APPS];
      let foundApp = allApps.find((a: AppItem) => a.id === id);
      
      if (!foundApp) {
        const [reg, vip] = await Promise.all([fetchRegularApps(), fetchVIPApps()]);
        foundApp = [...reg, ...vip].find((a: AppItem) => a.id === id);
      }
      
      if (foundApp) {
        setApp(foundApp);
        // Staggered entrance when data is ready
        Animated.stagger(80, [
          entranceAnim(heroSlide, heroOpacity, 0),
          entranceAnim(infoSlide, infoOpacity, 0),
        ]).start();
        if (!foundApp.screenshots || foundApp.screenshots.length === 0) fetchAppleData(foundApp);
      } else {
        Alert.alert("Lỗi", "Không tìm thấy dữ liệu ứng dụng!");
        router.back();
      }
    };
    loadData();
  }, [id]);

  // Khởi tạo lại trạng thái dịch khi chuyển ứng dụng
  useEffect(() => {
    setTranslatedDesc('');
    setShowTranslated(false);
  }, [app]);

  const handleTranslateToggle = async () => {
    if (showTranslated) {
      setShowTranslated(false);
      return;
    }
    if (translatedDesc) {
      setShowTranslated(true);
      return;
    }
    if (!app || !app.description) return;

    setIsTranslating(true);
    try {
      const resTrans = await translateText(app.description, currentLang);
      if (resTrans) {
        setTranslatedDesc(resTrans);
        setShowTranslated(true);
      } else {
        Alert.alert(TXT.errorLabel || "Lỗi", "Không thể dịch mô tả lúc này. Sếp vui lòng thử lại sau!");
      }
    } catch (e) {
      Alert.alert(TXT.errorLabel || "Lỗi", "Không thể dịch mô tả lúc này. Sếp vui lòng thử lại sau!");
    } finally {
      setIsTranslating(false);
    }
  };

  const fetchAppleData = async (currentApp: AppItem) => {
    setIsFetchingApple(true);
    try {
      let searchName = currentApp.name.toLowerCase().replace(/(plus|\+|deluxe|lrd|pro|premium|cheat|hack|crack|ipaviet site)/ig, '').trim();
      if (searchName.includes('yt')) searchName = 'youtube';

      const country = currentLang === 'en' ? 'us' : 'vn';
      const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(searchName)}&entity=software&limit=1&country=${country}`);
      const data = await res.json();
      
      if (data.results && data.results.length > 0) {
        const appleData = data.results[0];
        setApp(prev => {
          if (!prev || prev.id !== currentApp.id) return prev;
          return {
            ...prev,
            iconUrl: appleData.artworkUrl512 || prev.iconUrl,
            screenshots: appleData.screenshotUrls || prev.screenshots,
            description: appleData.description || prev.description
          };
        });
      }
    } catch (error) {}
    setIsFetchingApple(false);
  };

  const getVipMillis = (vipExpire: any) => {
    if (!vipExpire) return 0;
    if (typeof vipExpire.toMillis === 'function') return vipExpire.toMillis();
    if (vipExpire.seconds) return vipExpire.seconds * 1000;
    return Number(vipExpire) || 0;
  };

  const handleSecureDownload = async () => {
    if (downloadState !== 'CÀI ĐẶT' && downloadState !== 'LỖI, THỬ LẠI') return;

    if (!auth.currentUser) {
      return Alert.alert(
        TXT.langName === 'English' ? 'Login Required' : 'Cần Đăng Nhập', 
        TXT.langName === 'English' ? 'Please log in to your account before installing applications!' : 'Vui lòng đăng nhập tài khoản trước khi cài đặt ứng dụng!', 
        [
          { text: TXT.cancelBtn || 'Hủy', style: 'cancel' },
          { text: TXT.langName === 'English' ? 'Log In' : 'Đăng nhập', onPress: () => router.push('/account') }
        ]
      );
    }

    try {
      const snap = await getDoc(doc(db, 'users', auth.currentUser.uid));
      if (snap.exists()) {
        const expireMillis = getVipMillis(snap.data().vipExpire);
        if (expireMillis > Date.now()) {
          handleOneClickInstall();
          return;
        }
      }
      
      Alert.alert(
        TXT.langName === 'English' ? 'VIP Privileges Required' : 'Yêu cầu Đặc Quyền VIP', 
        TXT.langName === 'English' ? 'To download exclusive ad-free apps, please upgrade to a VIP plan!' : 'Để tải kho ứng dụng độc quyền và không chứa quảng cáo, Sếp vui lòng nâng cấp gói VIP nhé!', 
        [
          { text: TXT.cancelBtn || 'Hủy', style: 'cancel' }, 
          { text: TXT.langName === 'English' ? 'Upgrade Now' : 'Nâng Cấp Ngay', onPress: () => router.push('/buy-vip') }
        ]
      );
    } catch (e) { Alert.alert(TXT.errorLabel, TXT.langName === 'English' ? 'Could not authenticate.' : 'Không thể xác thực.'); }
  };

  const handleOneClickInstall = async () => {
    if (!app) return;
    if (Platform.OS === 'web') {
      Alert.alert(
        TXT.langName === 'English' ? 'Not Available' : "Không khả dụng", 
        TXT.langName === 'English' ? 'Offline IPA signing and installation is only supported on physical iOS devices.' : "Tính năng ký và cài đặt IPA ngoại tuyến chỉ được hỗ trợ trên thiết bị iOS thực tế."
      );
      return;
    }
    if (!IpaSigner) {
      Alert.alert(
        TXT.langName === 'English' ? 'Expo Go Limitations' : "Hạn chế của Expo Go", 
        TXT.langName === 'English' ? 'Signing and installing IPAs requires a development build because it uses a custom native module. You cannot run this on Expo Go.' : "Tính năng ký và cài đặt IPA yêu cầu bản build phát triển (Development Build) vì sử dụng mô-đun native tự viết. Sếp không thể chạy tính năng này trên Expo Go."
      );
      return;
    }

    const bgMode = await AsyncStorage.getItem('@background_mode') === 'true';
    if (bgMode && IpaSigner) {
      try {
        await IpaSigner.startBackgroundTask();
      } catch (e) {
        console.warn("Failed to start background task before download", e);
      }
    }

    try {
      const certsStr = await AsyncStorage.getItem('@saved_certs');
      const certs = certsStr ? JSON.parse(certsStr) : [];
      if (!certs || certs.length === 0) {
        Alert.alert(
          TXT.langName === 'English' ? "No Certificates" : "Chưa có chứng chỉ", 
          TXT.langName === 'English' ? "You need to add a P12 certificate to your Library before installing apps!" : "Sếp cần thêm chứng chỉ P12 vào Thư viện trước khi cài app!"
        );
        router.push('/sign');
        if (bgMode && IpaSigner) {
          try { await IpaSigner.endBackgroundTask(); } catch (e) {}
        }
        return;
      }
      const activeId = await AsyncStorage.getItem('@active_cert_id');
      let activeCert = certs[0];
      if (activeId) {
        const found = certs.find((c: any) => c.id === activeId);
        if (found) activeCert = found;
      }

      setDownloadState('Đang tải...');
      const safeName = "app_" + Date.now();
      const rawIpaPath = FileSystem.cacheDirectory + safeName + '.ipa';
      
      const ipaLink = (app.ipaUrl || (app as any).link || '').trim();
      
      const dl = FileSystem.createDownloadResumable(
        ipaLink, 
        rawIpaPath, 
        { sessionType: FileSystem.FileSystemSessionType.FOREGROUND }, 
        (p) => {
          const prog = Math.round((p.totalBytesWritten / p.totalBytesExpectedToWrite) * 100);
          setDownloadState(`Tải ${prog}%`);
        }
      );
      await dl.downloadAsync();

      // Kiểm tra tệp tin tải về để tránh lỗi zsign -1 do tải trượt/file HTML lỗi
      const fileInfo = await FileSystem.getInfoAsync(rawIpaPath);
      if (!fileInfo.exists || fileInfo.size < 100 * 1024) {
        throw new Error(currentLang === 'en' ? 'Downloaded file is corrupt or too small. Please verify the download source.' : 'Tệp tải về bị lỗi hoặc quá nhỏ. Sếp vui lòng kiểm tra nguồn tải nhé.');
      }

      // SAO CHÉP FILE GỐC CHƯA KÝ SANG THƯ VIỆN ĐỂ NGƯỜI DÙNG NÂNG CAO DÙNG
      try {
        const cleanAppName = app.name.replace(/[^a-zA-Z0-9_\-\.]/g, "_");
        const unsignedDestPath = FileSystem.documentDirectory + `${cleanAppName}_unsigned_${Date.now()}.ipa`;
        await FileSystem.copyAsync({ from: rawIpaPath, to: unsignedDestPath });
      } catch (e) {
        console.warn("Failed to copy original file to documents", e);
      }

      setDownloadState('Đang ký App...');
      const { signAppOffline } = require('../../modules/ipa-signer');
      const signResult = await signAppOffline(rawIpaPath, activeCert.p12Uri, activeCert.provUri, activeCert.password);
      
      setDownloadState('Tạo OTA...');
      const signedFileName = signResult.outputPath.split('/').pop();
      const signedFileDir = signResult.outputPath.substring(0, signResult.outputPath.lastIndexOf('/'));
      
      const serverUrl = await startStaticServer(signedFileDir);
      
      setDownloadState('Hoàn tất!');
      const localIpaUrl = `${serverUrl}/${signedFileName}`;
      const plistUrl = `${INSTALLER_WORKER_URL}/?plist=true&ipa=${encodeURIComponent(localIpaUrl)}&name=${encodeURIComponent(app.name)}&bundle=${encodeURIComponent(signResult.bundleId || (app as any).bundleId || 'com.ipaviet.app')}&icon=${encodeURIComponent(app.iconUrl)}&version=1.0`;
      const directInstallUrl = `itms-services://?action=download-manifest&url=${encodeURIComponent(plistUrl)}`;
      
      if (bgMode) {
        try {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: TXT.langName === 'English' ? 'App Signed Successfully!' : 'Ký App Thành Công!',
              body: TXT.langName === 'English' 
                ? `"${app.name}" has been signed. Tap to install directly.` 
                : `Ứng dụng "${app.name}" đã được ký xong. Bấm vào đây để cài đặt trực tiếp.`,
              sound: true,
              data: { installUrl: directInstallUrl }
            },
            trigger: null,
          });
        } catch (e) {
          console.warn("Failed to schedule notification", e);
        }
      }

      // TỰ ĐỘNG HIỆN POPUP CÀI ĐẶT CỦA HỆ THỐNG
      try {
        if (IpaSigner) await IpaSigner.startBackgroundTask();
      } catch (e) {
        console.warn("Failed to start background task", e);
      }
      
      Linking.openURL(directInstallUrl);
      setTimeout(() => setDownloadState('CÀI ĐẶT'), 3000);
      
      setTimeout(async () => {
        try {
          if (IpaSigner) await IpaSigner.endBackgroundTask();
        } catch (e) {}
      }, 60000);

    } catch (error: any) {
      if (bgMode) {
        try {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: TXT.langName === 'English' ? 'App Signing Failed' : 'Ký App Thất Bại',
              body: TXT.langName === 'English'
                ? `Could not sign "${app?.name || 'app'}": ${error.message}`
                : `Không thể ký "${app?.name || 'ứng dụng'}": ${error.message}`,
              sound: true,
            },
            trigger: null,
          });
        } catch (e) {
          console.warn("Failed to schedule notification", e);
        }
      }
      if (bgMode && IpaSigner) {
        try { await IpaSigner.endBackgroundTask(); } catch (e) {}
      }

      Alert.alert(TXT.errorLabel, error.message || (TXT.langName === 'English' ? "Installation process failed." : "Quá trình cài đặt thất bại."));
      setDownloadState('LỖI, THỬ LẠI');
    }
  };

  const getStatusText = (status: string) => {
    if (status === 'CÀI ĐẶT') return TXT.install;
    if (status === 'Đang tải...') return TXT.loading;
    if (status === 'Đang ký App...') return TXT.signing;
    if (status === 'Tạo OTA...') return TXT.generatingOta;
    if (status === 'Hoàn tất!') return TXT.done;
    if (status === 'LỖI, THỬ LẠI') return currentLang === 'en' ? 'ERROR, RETRY' : 'LỖI, THỬ LẠI';
    return status;
  };

  if (!app) {
    return ( 
      <LinearGradient colors={COLORS.bgGradient} style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </LinearGradient> 
    );
  }

  const isVipApp = app.id.startsWith('vip_') || app.sub.includes('VIP') || app.sub.includes('Độc Quyền');

  return (
    <LinearGradient colors={COLORS.bgGradient} style={styles.container}>
      <Animated.View style={[styles.navBar, { transform: [{ translateY: heroSlide }], opacity: heroOpacity }]}>
        <TouchableOpacity 
          style={styles.backBtn} 
          onPress={() => router.back()}
          onPressIn={() => Animated.spring(backBtnScale, { toValue: 0.84, ...SPRINGS.tap }).start()}
          onPressOut={() => Animated.spring(backBtnScale, { toValue: 1, ...SPRINGS.bounce }).start()}
          activeOpacity={1}
        >
          <Animated.View style={{ flexDirection: 'row', alignItems: 'center', transform: [{ scale: backBtnScale }] }}>
            <ChevronLeft size={28} color={COLORS.primary} />
            <Text style={styles.backText}>{TXT.apps}</Text>
          </Animated.View>
        </TouchableOpacity>
      </Animated.View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* HEADER BOX */}
        <Animated.View style={[styles.headerBox, { transform: [{ translateY: infoSlide }], opacity: infoOpacity }]}>
          <View style={styles.iconContainer}>
            <Image source={{ uri: app.iconUrl }} style={styles.iconBackdrop} blurRadius={15} />
            <Image source={{ uri: app.iconUrl }} style={styles.bigIcon} />
          </View>
          <View style={styles.headerInfo}>
            <View>
                <Text style={styles.title} numberOfLines={2}>{app.name}</Text>
                <Text style={styles.subtitle}>{app.sub}</Text>
            </View>
            
            <Animated.View style={[styles.actionWrapper, { transform: [{ scale: buttonScale }] }]}>
                <TouchableOpacity 
                  style={[styles.actionBtn, isVipApp ? SHADOWS.glowGold : SHADOWS.glowBlue]} 
                  activeOpacity={1}
                  onPressIn={handlePressIn}
                  onPressOut={handlePressOut}
                  onPress={handleSecureDownload}
                >
                  <LinearGradient
                    colors={isVipApp ? COLORS.goldGradient : COLORS.primaryGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.actionBtnGradient}
                  >
                    <View style={styles.actionInside}>
                      {(downloadState !== 'CÀI ĐẶT' && downloadState !== 'LỖI, THỬ LẠI' && downloadState !== 'Hoàn tất!') && (
                        <ActivityIndicator 
                          size="small" 
                          color={isVipApp ? '#0A0A0C' : '#FFFFFF'} 
                          style={{ marginRight: 6 }} 
                        />
                      )}
                      <Text style={[styles.actionText, isVipApp && { color: '#0A0A0C' }]}>
                        {getStatusText(downloadState)}
                      </Text>
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
            </Animated.View>
          </View>
        </Animated.View>


        {/* STATS VIEW */}
        <View style={[styles.statsWrapper, SHADOWS.glowCard]}>
          <GlassView intensity={15} tint={isLight ? 'light' : 'dark'} style={StyleSheet.absoluteFill} />
          <View style={styles.statsInside}>
            <View style={styles.statBox}>
              <Text style={styles.statTop}>
                {app.rating} <Star size={14} color={COLORS.textMuted} fill={COLORS.textMuted} style={{marginBottom: -2}}/>
              </Text>
              <Text style={styles.statBottom}>{TXT.rating}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statTop}>{app.size}</Text>
              <Text style={styles.statBottom}>{TXT.size}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statTop} numberOfLines={1}>{app.category || 'Tiện ích'}</Text>
              <Text style={styles.statBottom}>{TXT.category}</Text>
            </View>
          </View>
        </View>

        {/* SCREENSHOTS */}
        <View style={styles.section}>
          {isFetchingApple ? (
            <ActivityIndicator color={COLORS.primary} style={{marginTop: 20}}/>
          ) : (
            app.screenshots && app.screenshots.length > 0 && (
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false} 
                contentContainerStyle={styles.screenshotScroll}
                snapToInterval={255}
                decelerationRate="fast"
                snapToAlignment="start"
              >
                {app.screenshots.map((img: string, index: number) => (
                  <TouchableOpacity 
                    key={index} 
                    style={[styles.screenshotBox, SHADOWS.glowCard]} 
                    activeOpacity={0.9} 
                    onPress={() => setActiveScreenshotIndex(index)}
                  >
                    <Image source={{ uri: img }} style={styles.screenshotImg} resizeMode="contain" />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )
          )}
        </View>

        {/* MOD FEATURES & DESCRIPTION */}
        <View style={styles.section}>
          {app.modFeatures ? (
            <View style={[
              styles.modBox, 
              isVipApp ? SHADOWS.glowGold : SHADOWS.glowCard,
              {
                backgroundColor: isVipApp ? 'rgba(255, 226, 89, 0.06)' : (isLight ? 'rgba(0, 122, 255, 0.06)' : 'rgba(255,255,255,0.03)'),
                borderColor: isVipApp ? 'rgba(255, 226, 89, 0.2)' : COLORS.border
              }
            ]}>
               <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 8}}>
                  <Zap size={18} color={isVipApp ? COLORS.gold : (isLight ? COLORS.primary : COLORS.primaryLight)} fill={isVipApp ? COLORS.gold : (isLight ? COLORS.primary : COLORS.primaryLight)} />
                  <Text style={[styles.modTitle, { color: isVipApp ? COLORS.gold : (isLight ? COLORS.primary : '#FFFFFF') }]}>{TXT.modFeatures}</Text>
               </View>
                <Text style={[styles.modText, { color: COLORS.textSecondary }]}>
                  {app.modFeatures || ''}
                </Text>
             </View>
           ) : null}
 
           <Text style={styles.descText} numberOfLines={isDescExpanded ? undefined : 3}>
             {translatedDesc || app.description || ''}
           </Text>
          <TouchableOpacity onPress={() => setIsDescExpanded(!isDescExpanded)} style={{alignSelf: 'flex-end', marginTop: 4}}>
            <Text style={styles.moreText}>{isDescExpanded ? TXT.collapse : TXT.more}</Text>
          </TouchableOpacity>

          <View style={styles.dividerFull} />
          <Text style={styles.devLabel}>{TXT.developer}</Text>
          <Text style={styles.devValue}>{app.developer}</Text>
          <View style={styles.dividerFull} />
          <Text style={styles.devLabel}>{TXT.version}</Text>
          <Text style={styles.devValue}>{app.version}</Text>
        </View>

      </ScrollView>

      {/* MODAL PHÓNG TO ẢNH SCREENSHOT */}
      <Modal visible={activeScreenshotIndex !== null} transparent animationType="fade" statusBarTranslucent>
        <View style={styles.fullscreenOverlay} {...panResponder.panHandlers}>
          <Animated.View style={[
            StyleSheet.absoluteFill, 
            { 
              opacity: backdropOpacity 
            }
          ]}>
            <GlassView intensity={35} tint={isLight ? 'light' : 'dark'} style={StyleSheet.absoluteFill} />
            <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={handleCloseModal} />
          </Animated.View>
          
          <View style={[
            styles.dragHandle,
            { backgroundColor: isLight ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.3)' }
          ]} />

          <TouchableOpacity 
            style={[styles.closeModalBtn, { backgroundColor: isLight ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.1)' }]} 
            activeOpacity={0.7}
            onPress={handleCloseModal}
          >
            <X size={20} color={COLORS.text} />
          </TouchableOpacity>

          {activeScreenshotIndex !== null && app.screenshots && app.screenshots.length > 0 && (
            <Animated.View 
              style={[
                styles.fullscreenWrapper, 
                { 
                  transform: [
                    { translateY: combinedTranslateY }, 
                    { scale: modalScale }
                  ] 
                }
              ]}
            >
              <FlatList
                data={app.screenshots}
                keyExtractor={(item, index) => index.toString()}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                initialScrollIndex={activeScreenshotIndex}
                onScrollToIndexFailed={() => {}}
                getItemLayout={(data, idx) => ({
                  length: width,
                  offset: width * idx,
                  index: idx,
                })}
                renderItem={({ item }) => (
                  <View style={styles.fullscreenImgWrapper}>
                    <Image 
                      source={{ uri: item }} 
                      style={[
                        styles.fullscreenImg,
                        { borderColor: isLight ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.15)' }
                      ]} 
                      resizeMode="contain" 
                    />
                  </View>
                )}
              />
            </Animated.View>
          )}
        </View>
      </Modal>
    </LinearGradient>
  );
}

const getStyles = (theme: typeof COLORS) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  navBar: { paddingTop: 50, paddingBottom: 10, borderBottomWidth: 0 },
  backBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12 },
  backText: { color: theme.primary, fontSize: 17, marginLeft: -4, fontWeight: '600' },
  scrollContent: { paddingBottom: 120 },
  
  headerBox: { flexDirection: 'row', padding: 20 },
  iconContainer: {
    position: 'relative',
    width: 108,
    height: 108,
  },
  iconBackdrop: {
    position: 'absolute',
    top: 6,
    left: 6,
    width: 96,
    height: 96,
    borderRadius: 22,
    opacity: 0.65,
  },
  bigIcon: { width: 108, height: 108, borderRadius: 24, backgroundColor: theme.surfaceSolid, borderWidth: 0.8, borderColor: theme.border },
  headerInfo: { flex: 1, marginLeft: 20, justifyContent: 'space-between' },
  title: { color: theme.text, fontSize: 22, fontWeight: '800', lineHeight: 28, letterSpacing: -0.5 },
  subtitle: { color: theme.textMuted, fontSize: 14, marginTop: 2 },
  
  actionWrapper: { marginTop: 12, alignSelf: 'flex-start' },
  actionBtn: { minWidth: 115, height: 34, borderRadius: 17, overflow: 'hidden' },
  actionBtnGradient: { paddingHorizontal: 12, height: '100%', justifyContent: 'center', alignItems: 'center' },
  actionInside: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' },
  actionText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  
  statsWrapper: {
    marginHorizontal: 20,
    borderRadius: SIZES.radiusCard,
    overflow: 'hidden',
    borderWidth: 0.8,
    borderColor: theme.border,
    backgroundColor: theme.surfaceCard,
    marginVertical: 15,
  },
  statsInside: {
    flexDirection: 'row',
    paddingVertical: 16,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statBox: { alignItems: 'center', justifyContent: 'center', width: '30%' },
  statTop: { color: theme.text, fontSize: 16, fontWeight: '700', marginBottom: 4 },
  statBottom: { color: theme.textMuted, fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  statDivider: { width: 0.8, height: 28, backgroundColor: theme.border },

  section: { paddingHorizontal: 20, marginTop: 10 },
  screenshotScroll: { paddingVertical: 10, paddingRight: 20 },
  screenshotBox: { width: 240, height: 426, marginRight: 15, backgroundColor: theme.surfaceSolid, borderRadius: 18, overflow: 'hidden', borderWidth: 0.8, borderColor: theme.border, justifyContent: 'center' },
  screenshotImg: { width: '100%', height: '100%' },
  
  modBox: { 
    padding: 16, 
    borderRadius: SIZES.radiusCard, 
    marginBottom: 20, 
    borderWidth: 0.8, 
  },
  modTitle: { fontSize: 15, fontWeight: '800', marginLeft: 8, letterSpacing: -0.2 },
  modText: { fontSize: 14, lineHeight: 22, opacity: 0.9 },
  
  descText: { color: theme.textSecondary, fontSize: 15, lineHeight: 22 },
  moreText: { color: theme.primary, fontSize: 15, fontWeight: '600' },
  
  dividerFull: { height: 0.5, backgroundColor: theme.border, marginVertical: 15 },
  devLabel: { color: theme.textMuted, fontSize: 12, marginBottom: 4, fontWeight: '700', letterSpacing: 0.5 },
  devValue: { color: theme.text, fontSize: 15, fontWeight: '500' },
  
  fullscreenOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dragHandle: {
    width: 44,
    height: 5,
    borderRadius: 2.5,
    position: 'absolute',
    top: Platform.OS === 'ios' ? 65 : 45,
    zIndex: 100,
  },
  closeModalBtn: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 55 : 35,
    right: 20,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 110,
  },
  fullscreenWrapper: {
    width: width,
    height: height * 0.8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenImgWrapper: {
    width: width,
    height: height * 0.8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenImg: {
    width: width * 0.85,
    height: height * 0.72,
    borderRadius: 24,
    borderWidth: 0.8,
  }
});
