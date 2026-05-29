import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, Image, TouchableOpacity, ActivityIndicator, Alert, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, Star, Zap } from 'lucide-react-native';
import * as Linking from 'expo-linking';
import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { requireNativeModule } from 'expo-modules-core';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

import { CACHED_REGULAR_APPS, CACHED_VIP_APPS, fetchRegularApps, fetchVIPApps, AppItem } from '../../constants/data';
import { auth, db } from '../../firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import { COLORS, SIZES, SHADOWS, useThemeUpdate } from '../../constants/theme';

const StaticServer = (() => {
  if (Platform.OS === 'web') return null;
  try {
    return require('@dr.pogodin/react-native-static-server').default || require('@dr.pogodin/react-native-static-server');
  } catch (e) {
    return null;
  }
})();

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
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [app, setApp] = useState<AppItem | null>(null);
  
  const [downloadState, setDownloadState] = useState('CÀI ĐẶT');
  const [isFetchingApple, setIsFetchingApple] = useState(false);
  const [isDescExpanded, setIsDescExpanded] = useState(false);

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

  const fetchAppleData = async (currentApp: AppItem) => {
    setIsFetchingApple(true);
    try {
      let searchName = currentApp.name.toLowerCase().replace(/(plus|\+|deluxe|lrd|pro|premium|cheat|hack|crack|ipaviet site)/ig, '').trim();
      if (searchName.includes('yt')) searchName = 'youtube';

      const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(searchName)}&entity=software&limit=1&country=vn`);
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
      return Alert.alert('Cần Đăng Nhập', 'Vui lòng đăng nhập tài khoản trước khi cài đặt ứng dụng!', [
        { text: 'Hủy', style: 'cancel' },
        { text: 'Đăng nhập', onPress: () => router.push('/account') }
      ]);
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
        'Yêu cầu Đặc Quyền VIP', 
        'Để tải kho ứng dụng độc quyền và không chứa quảng cáo, Sếp vui lòng nâng cấp gói VIP nhé!', 
        [{ text: 'Hủy', style: 'cancel' }, { text: 'Nâng Cấp Ngay', onPress: () => router.push('/buy-vip') }]
      );
    } catch (e) { Alert.alert('Lỗi', 'Không thể xác thực.'); }
  };

  const handleOneClickInstall = async () => {
    if (!app) return;
    if (Platform.OS === 'web') {
      Alert.alert("Không khả dụng", "Tính năng ký và cài đặt IPA ngoại tuyến chỉ được hỗ trợ trên thiết bị iOS thực tế.");
      return;
    }
    if (!IpaSigner || !StaticServer) {
      Alert.alert("Hạn chế của Expo Go", "Tính năng ký và cài đặt IPA yêu cầu bản build phát triển (Development Build) vì sử dụng mô-đun native tự viết. Sếp không thể chạy tính năng này trên Expo Go.");
      return;
    }
    try {
      const certsStr = await AsyncStorage.getItem('@saved_certs');
      const certs = certsStr ? JSON.parse(certsStr) : [];
      if (!certs || certs.length === 0) {
        Alert.alert("Chưa có chứng chỉ", "Sếp cần thêm chứng chỉ P12 vào Thư viện trước khi cài app!");
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
      
      const server = new StaticServer({ port: 0, fileDir: signedFileDir, hostname: '127.0.0.1' });
      const serverUrl = await server.start();
      
      setDownloadState('Hoàn tất!');
      const localIpaUrl = `${serverUrl}/${signedFileName}`;
      const workerUrl = `${INSTALLER_WORKER_URL}?ipa=${encodeURIComponent(localIpaUrl)}&name=${encodeURIComponent(app.name)}&bundle=${encodeURIComponent((app as any).bundleId || 'com.ipaviet.app')}&icon=${encodeURIComponent(app.iconUrl)}`;
      
      Alert.alert(
        "Sẵn sàng cài đặt", 
        "Trình duyệt sẽ mở ra. Vui lòng bấm Cài Đặt trên web, sau đó QUAY LẠI APP NÀY và giữ màn hình sáng chờ đến khi tải xong.",
        [{ text: "Mở Safari", onPress: () => {
            Linking.openURL(workerUrl);
            setTimeout(() => setDownloadState('CÀI ĐẶT'), 3000);
        }}]
      );

    } catch (error: any) {
      Alert.alert("Lỗi", error.message || "Quá trình cài đặt thất bại.");
      setDownloadState('LỖI, THỬ LẠI');
    }
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
          <Text style={styles.backText}>Ứng dụng</Text>
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
                    <Text style={[styles.actionText, isVipApp && { color: '#0A0A0C' }]}>{downloadState}</Text>
                  </LinearGradient>
                </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* STATS VIEW */}
        <View style={[styles.statsWrapper, SHADOWS.glowCard]}>
          <BlurView intensity={10} tint="dark" style={StyleSheet.absoluteFill} />
          <View style={styles.statsInside}>
            <View style={styles.statBox}>
              <Text style={styles.statTop}>
                {app.rating} <Star size={14} color={COLORS.textMuted} fill={COLORS.textMuted} style={{marginBottom: -2}}/>
              </Text>
              <Text style={styles.statBottom}>ĐÁNH GIÁ</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statTop}>{app.size}</Text>
              <Text style={styles.statBottom}>DUNG LƯỢNG</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statTop} numberOfLines={1}>{app.category || 'Tiện ích'}</Text>
              <Text style={styles.statBottom}>THỂ LOẠI</Text>
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
                  <View key={index} style={[styles.screenshotBox, SHADOWS.glowCard]}>
                    <Image source={{ uri: img }} style={styles.screenshotImg} resizeMode="contain" />
                  </View>
                ))}
              </ScrollView>
            )
          )}
        </View>

        {/* MOD FEATURES & DESCRIPTION */}
        <View style={styles.section}>
          {app.modFeatures ? (
            <View style={[styles.modBox, isVipApp ? SHADOWS.glowGold : SHADOWS.glowCard]}>
               <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 8}}>
                  <Zap size={18} color={isVipApp ? COLORS.gold : COLORS.primaryLight} fill={isVipApp ? COLORS.gold : COLORS.primaryLight} />
                  <Text style={[styles.modTitle, { color: isVipApp ? COLORS.gold : '#FFFFFF' }]}>Thông tin Mod / Cập nhật</Text>
               </View>
               <Text style={styles.modText}>{app.modFeatures}</Text>
            </View>
          ) : null}

          <Text style={styles.descText} numberOfLines={isDescExpanded ? undefined : 3}>
            {app.description}
          </Text>
          <TouchableOpacity onPress={() => setIsDescExpanded(!isDescExpanded)} style={{alignSelf: 'flex-end', marginTop: 4}}>
            <Text style={styles.moreText}>{isDescExpanded ? 'Thu gọn' : 'Thêm'}</Text>
          </TouchableOpacity>

          <View style={styles.dividerFull} />
          <Text style={styles.devLabel}>Nhà phát triển</Text>
          <Text style={styles.devValue}>{app.developer}</Text>
          <View style={styles.dividerFull} />
          <Text style={styles.devLabel}>Phiên bản</Text>
          <Text style={styles.devValue}>{app.version}</Text>
        </View>

      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  navBar: { paddingTop: 50, paddingBottom: 10, borderBottomWidth: 0 },
  backBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12 },
  backText: { color: COLORS.primary, fontSize: 17, marginLeft: -4, fontWeight: '600' },
  scrollContent: { paddingBottom: 120 },
  
  headerBox: { flexDirection: 'row', padding: 20 },
  bigIcon: { width: 108, height: 108, borderRadius: 24, backgroundColor: COLORS.surfaceSolid, borderWidth: 0.8, borderColor: 'rgba(255,255,255,0.06)' },
  headerInfo: { flex: 1, marginLeft: 20, justifyContent: 'space-between' },
  title: { color: COLORS.text, fontSize: 22, fontWeight: '800', lineHeight: 28, letterSpacing: -0.5 },
  subtitle: { color: COLORS.textMuted, fontSize: 14, marginTop: 2 },
  
  actionWrapper: { marginTop: 12, alignSelf: 'flex-start' },
  actionBtn: { width: 110, height: 34, borderRadius: 17, overflow: 'hidden' },
  actionBtnGradient: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
  actionText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  
  statsWrapper: {
    marginHorizontal: 20,
    borderRadius: SIZES.radiusCard,
    overflow: 'hidden',
    borderWidth: 0.8,
    borderColor: COLORS.border,
    backgroundColor: 'rgba(20, 20, 24, 0.45)',
    marginVertical: 15,
  },
  statsInside: {
    flexDirection: 'row',
    paddingVertical: 16,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statBox: { alignItems: 'center', justifyContent: 'center', width: '30%' },
  statTop: { color: COLORS.text, fontSize: 16, fontWeight: '700', marginBottom: 4 },
  statBottom: { color: COLORS.textMuted, fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  statDivider: { width: 0.8, height: 28, backgroundColor: 'rgba(255,255,255,0.08)' },

  section: { paddingHorizontal: 20, marginTop: 10 },
  screenshotScroll: { paddingVertical: 10, paddingRight: 20 },
  screenshotBox: { width: 240, height: 426, marginRight: 15, backgroundColor: COLORS.surfaceSolid, borderRadius: 18, overflow: 'hidden', borderWidth: 0.8, borderColor: COLORS.border, justifyContent: 'center' },
  screenshotImg: { width: '100%', height: '100%' },
  
  modBox: { 
    backgroundColor: 'rgba(255, 226, 89, 0.06)', 
    padding: 16, 
    borderRadius: SIZES.radiusCard, 
    marginBottom: 20, 
    borderWidth: 0.8, 
    borderColor: 'rgba(255, 226, 89, 0.2)' 
  },
  modTitle: { fontSize: 15, fontWeight: '800', marginLeft: 8, letterSpacing: -0.2 },
  modText: { color: COLORS.textSecondary, fontSize: 14, lineHeight: 22, opacity: 0.9 },
  
  descText: { color: COLORS.textSecondary, fontSize: 15, lineHeight: 22 },
  moreText: { color: COLORS.primary, fontSize: 15, fontWeight: '600' },
  
  dividerFull: { height: 0.5, backgroundColor: 'rgba(255, 255, 255, 0.08)', marginVertical: 15 },
  devLabel: { color: COLORS.textMuted, fontSize: 12, marginBottom: 4, fontWeight: '700', letterSpacing: 0.5 },
  devValue: { color: COLORS.text, fontSize: 15, fontWeight: '500' }
});
