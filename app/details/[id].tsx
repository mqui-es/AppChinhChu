import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, Image, TouchableOpacity, ActivityIndicator, Alert, Platform, Dimensions, Modal } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, Star, Zap, X } from 'lucide-react-native';
import * as Linking from 'expo-linking';
import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { requireNativeModule } from 'expo-modules-core';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

import { CACHED_REGULAR_APPS, CACHED_VIP_APPS, fetchRegularApps, fetchVIPApps, AppItem } from '../../constants/data';
import { auth, db } from '../../firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import { COLORS, SIZES, SHADOWS, useThemeUpdate, TXT } from '../../constants/theme';
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
  const isLight = COLORS.background === '#F2F2F7';
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [app, setApp] = useState<AppItem | null>(null);
  
  const [downloadState, setDownloadState] = useState('CÀI ĐẶT');
  const [isFetchingApple, setIsFetchingApple] = useState(false);
  const [isDescExpanded, setIsDescExpanded] = useState(false);

  // States dịch động
  const [translatedDesc, setTranslatedDesc] = useState('');
  const [translatedMod, setTranslatedMod] = useState('');
  const [translating, setTranslating] = useState(false);
  const currentLang = TXT.langName === 'English' ? 'en' : 'vi';

  // State phóng to ảnh
  const [activeScreenshot, setActiveScreenshot] = useState<string | null>(null);

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
        if (!foundApp.screenshots || foundApp.screenshots.length === 0) fetchAppleData(foundApp);
      } else {
        Alert.alert("Lỗi", "Không tìm thấy dữ liệu ứng dụng!");
        router.back();
      }
    };
    loadData();
  }, [id]);

  // Thực hiện dịch động khi app được tải hoặc khi đổi ngôn ngữ
  useEffect(() => {
    if (!app) return;
    const performTranslation = async () => {
      setTranslating(true);
      if (app.description) {
        const descTrans = await translateText(app.description, currentLang);
        setTranslatedDesc(descTrans);
      } else {
        setTranslatedDesc('');
      }
      if (app.modFeatures) {
        const modTrans = await translateText(app.modFeatures, currentLang);
        setTranslatedMod(modTrans);
      } else {
        setTranslatedMod('');
      }
      setTranslating(false);
    };
    performTranslation();
  }, [app, currentLang]);

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
        setApp(prev => prev ? {
            ...prev,
            iconUrl: appleData.artworkUrl512 || prev.iconUrl,
            screenshots: appleData.screenshotUrls || prev.screenshots,
            description: appleData.description || prev.description
        } : null);
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
    try {
      const certsStr = await AsyncStorage.getItem('@saved_certs');
      const certs = certsStr ? JSON.parse(certsStr) : [];
      if (!certs || certs.length === 0) {
        Alert.alert(
          TXT.langName === 'English' ? "No Certificates" : "Chưa có chứng chỉ", 
          TXT.langName === 'English' ? "You need to add a P12 certificate to your Library before installing apps!" : "Sếp cần thêm chứng chỉ P12 vào Thư viện trước khi cài app!"
        );
        router.push('/sign');
        return;
      }
      const activeCert = certs[0];

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

      setDownloadState('Đang ký App...');
      const signResult = await IpaSigner.signAppOffline(rawIpaPath, activeCert.p12Uri, activeCert.provUri, activeCert.password);
      
      setDownloadState('Tạo OTA...');
      const signedFileName = signResult.outputPath.split('/').pop();
      const signedFileDir = signResult.outputPath.substring(0, signResult.outputPath.lastIndexOf('/'));
      
      const serverUrl = await startStaticServer(signedFileDir);
      
      setDownloadState('Hoàn tất!');
      const localIpaUrl = `${serverUrl}/${signedFileName}`;
      const workerUrl = `${INSTALLER_WORKER_URL}?ipa=${encodeURIComponent(localIpaUrl)}&name=${encodeURIComponent(app.name)}&bundle=${encodeURIComponent(signResult.bundleId || (app as any).bundleId || 'com.ipaviet.app')}&icon=${encodeURIComponent(app.iconUrl)}`;
      
      Alert.alert(
        TXT.readyToInstall, 
        TXT.safariInstallInstructions,
        [{ text: TXT.openSafariBtn, onPress: () => {
            Linking.openURL(workerUrl);
            setTimeout(() => setDownloadState('CÀI ĐẶT'), 3000);
        }}]
      );

    } catch (error: any) {
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
      <View style={styles.navBar}>
        <TouchableOpacity style={styles.backBtn} activeOpacity={0.7} onPress={() => router.back()}>
          <ChevronLeft size={28} color={COLORS.primary} />
          <Text style={styles.backText}>{TXT.apps}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* HEADER BOX */}
        <View style={styles.headerBox}>
          <Image source={{ uri: app.iconUrl }} style={styles.bigIcon} />
          <View style={styles.headerInfo}>
            <View>
                <Text style={styles.title} numberOfLines={2}>{app.name}</Text>
                <Text style={styles.subtitle}>{app.sub}</Text>
            </View>
            
            <View style={styles.actionWrapper}>
                <TouchableOpacity style={[styles.actionBtn, SHADOWS.glowBlue]} activeOpacity={0.8} onPress={handleSecureDownload}>
                  <LinearGradient
                    colors={isVipApp ? COLORS.goldGradient : COLORS.primaryGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.actionBtnGradient}
                  >
                    <Text style={[styles.actionText, isVipApp && { color: '#0A0A0C' }]}>{getStatusText(downloadState)}</Text>
                  </LinearGradient>
                </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* STATS VIEW */}
        <View style={[styles.statsWrapper, SHADOWS.glowCard]}>
          <BlurView intensity={15} tint={isLight ? 'light' : 'dark'} style={StyleSheet.absoluteFill} />
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
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.screenshotScroll}>
                {app.screenshots.map((img: string, index: number) => (
                  <TouchableOpacity 
                    key={index} 
                    style={[styles.screenshotBox, SHADOWS.glowCard]} 
                    activeOpacity={0.9} 
                    onPress={() => setActiveScreenshot(img)}
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
                 {translating ? TXT.loading : (translatedMod || app.modFeatures)}
               </Text>
            </View>
          ) : null}

          <Text style={styles.descText} numberOfLines={isDescExpanded ? undefined : 3}>
            {translating ? TXT.loading : (translatedDesc || app.description)}
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
      <Modal visible={activeScreenshot !== null} transparent animationType="fade" statusBarTranslucent>
        <View style={styles.fullscreenOverlay}>
          <BlurView intensity={35} tint="dark" style={StyleSheet.absoluteFill} />
          <TouchableOpacity style={styles.closeFullscreenBtn} onPress={() => setActiveScreenshot(null)}>
            <X color="#FFFFFF" size={24} />
          </TouchableOpacity>
          {activeScreenshot && (
            <Image 
              source={{ uri: activeScreenshot }} 
              style={styles.fullscreenImg} 
              resizeMode="contain" 
            />
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
  bigIcon: { width: 108, height: 108, borderRadius: 24, backgroundColor: theme.surfaceSolid, borderWidth: 0.8, borderColor: theme.border },
  headerInfo: { flex: 1, marginLeft: 20, justifyContent: 'space-between' },
  title: { color: theme.text, fontSize: 22, fontWeight: '800', lineHeight: 28, letterSpacing: -0.5 },
  subtitle: { color: theme.textMuted, fontSize: 14, marginTop: 2 },
  
  actionWrapper: { marginTop: 12, alignSelf: 'flex-start' },
  actionBtn: { width: 110, height: 34, borderRadius: 17, overflow: 'hidden' },
  actionBtnGradient: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
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
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeFullscreenBtn: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    right: 20,
    zIndex: 100,
    backgroundColor: 'rgba(255,255,255,0.15)',
    padding: 10,
    borderRadius: 25,
  },
  fullscreenImg: {
    width: width * 0.95,
    height: height * 0.85,
  }
});
