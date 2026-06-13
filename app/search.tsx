import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, Image, TextInput, ScrollView, Dimensions, Keyboard, Animated, Platform, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { Search, Trophy, Gamepad2, Award, Rocket, X, ArrowLeft } from 'lucide-react-native';
import * as Linking from 'expo-linking';
import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { requireNativeModule } from 'expo-modules-core';
import { GlassView } from '../components/ui/GlassView';
import { LinearGradient } from 'expo-linear-gradient';
import * as Notifications from 'expo-notifications';

import { startStaticServer } from '../utils/staticServer';

const IpaSigner = (() => {
  if (Platform.OS === 'web') return null;
  try {
    return requireNativeModule('IpaSigner');
  } catch (e) {
    return null;
  }
})();

import { CACHED_REGULAR_APPS, CACHED_VIP_APPS, AppItem } from '../constants/data';
import { COLORS, SIZES, SHADOWS, useThemeUpdate, TXT } from '../constants/theme';

const { width } = Dimensions.get('window');
const INSTALLER_WORKER_URL = "https://ipaviet-installer.clonene121212.workers.dev";

export const ListDownloadBtn = ({ app }: { app: AppItem }) => {
  useThemeUpdate();
  const router = useRouter();
  const [status, setStatus] = useState('CÀI ĐẶT');
  const styles = getStyles(COLORS);
  const currentLang = TXT.langName === 'English' ? 'en' : 'vi';
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => Animated.spring(scaleAnim, { toValue: 0.93, stiffness: 280, damping: 20, useNativeDriver: true }).start();
  const handlePressOut = () => Animated.spring(scaleAnim, { toValue: 1, stiffness: 280, damping: 20, useNativeDriver: true }).start();

  const handleOneClickInstall = async () => {
    if (status !== 'CÀI ĐẶT' && status !== 'LỖI, THỬ LẠI') return;
    if (Platform.OS === 'web') {
      Alert.alert("Không khả dụng", "Tính năng ký và cài đặt IPA ngoại tuyến chỉ được hỗ trợ trên thiết bị iOS thực tế.");
      return;
    }
    if (!IpaSigner) {
      Alert.alert("Hạn chế của Expo Go", "Tính năng ký và cài đặt IPA yêu cầu bản build phát triển (Development Build) vì sử dụng mô-đun native tự viết. Sếp không thể chạy tính năng này trên Expo Go.");
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
        Alert.alert("Chưa có chứng chỉ", "Sếp cần thêm chứng chỉ P12 vào Thư viện trước khi cài app!");
        router.back();
        setTimeout(() => {
          router.push('/sign');
        }, 120);
        if (bgMode && IpaSigner) {
          try { await IpaSigner.endBackgroundTask(); } catch (e) {}
        }
        return;
      }
      
      // Lấy active certificate ID từ Settings
      const activeId = await AsyncStorage.getItem('@active_cert_id');
      let activeCert = certs[0];
      if (activeId) {
        const found = certs.find((c: any) => c.id === activeId);
        if (found) activeCert = found;
      }

      setStatus('Đang tải...');
      const safeName = "app_" + Date.now();
      const rawIpaPath = FileSystem.cacheDirectory + safeName + '.ipa';
      
      const ipaLink = (app.ipaUrl || (app as any).link || '').trim();
      
      const dl = FileSystem.createDownloadResumable(
        ipaLink, 
        rawIpaPath, 
        { sessionType: FileSystem.FileSystemSessionType.FOREGROUND }, 
        (p) => {
          const prog = Math.round((p.totalBytesWritten / p.totalBytesExpectedToWrite) * 100);
          setStatus(`Tải ${prog}%`);
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

      setStatus('Đang ký App...');
      const { signAppOffline } = require('../../modules/ipa-signer');
      const signResult = await signAppOffline(rawIpaPath, activeCert.p12Uri, activeCert.provUri, activeCert.password);
      
      setStatus('Tạo OTA...');
      const signedFileName = signResult.outputPath.split('/').pop();
      const signedFileDir = signResult.outputPath.substring(0, signResult.outputPath.lastIndexOf('/'));
      
      const serverUrl = await startStaticServer(signedFileDir);
      
      setStatus('Hoàn tất!');
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
      setTimeout(() => setStatus('CÀI ĐẶT'), 3000);
      
      setTimeout(async () => {
        try {
          if (IpaSigner) await IpaSigner.endBackgroundTask();
        } catch (e) {}
      }, 60000);

    } catch (e: any) {
      if (bgMode) {
        try {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: TXT.langName === 'English' ? 'App Signing Failed' : 'Ký App Thất Bại',
              body: TXT.langName === 'English'
                ? `Could not sign "${app?.name || 'app'}": ${e.message}`
                : `Không thể ký "${app?.name || 'ứng dụng'}": ${e.message}`,
              sound: true,
            },
            trigger: null,
          });
        } catch (err) {
          console.warn("Failed to schedule notification", err);
        }
      }
      if (bgMode && IpaSigner) {
        try { await IpaSigner.endBackgroundTask(); } catch (err) {}
      }

      Alert.alert("Lỗi", e.message || "Có lỗi xảy ra trong quá trình ký và cài đặt.");
      setStatus('LỖI, THỬ LẠI');
    }
  };

  const getStatusText = (s: string) => {
    if (s === 'CÀI ĐẶT') return TXT.install;
    if (s === 'Đang tải...') return TXT.loading;
    if (s === 'Đang ký App...') return TXT.signing;
    if (s === 'Tạo OTA...') return TXT.generatingOta;
    if (s === 'Hoàn tất!') return TXT.done;
    if (s === 'LỖI, THỬ LẠI') return currentLang === 'en' ? 'ERROR, RETRY' : 'LỖI, THỬ LẠI';
    return s;
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity 
        style={styles.getButton} 
        activeOpacity={1} 
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={handleOneClickInstall}
      >
        <Text style={styles.getButtonText}>{getStatusText(status)}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

const DISCOVER_CARDS = [
  { id: '1', title: 'Top Ứng Dụng', colors: ['#0A84FF', '#0055D4'], icon: Trophy, key: 'topApps' },
  { id: '2', title: 'Top Trò Chơi', colors: ['#FF9F0A', '#FF3B30'], icon: Gamepad2, key: 'topGames' },
  { id: '3', title: 'Bán Chạy Nhất', colors: ['#30D158', '#108040'], icon: Award, key: 'bestSellers' },
  { id: '4', title: 'Hiệu Suất', colors: ['#BF5AF2', '#6200EE'], icon: Rocket, key: 'performance' }
];

const DiscoverCardItem = ({ card, onPress }: { card: typeof DISCOVER_CARDS[0]; onPress: () => void }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const CardIcon = card.icon;
  const styles = getStyles(COLORS);

  const handlePressIn = () => Animated.spring(scaleAnim, { toValue: 0.95, stiffness: 260, damping: 18, useNativeDriver: true }).start();
  const handlePressOut = () => Animated.spring(scaleAnim, { toValue: 1, stiffness: 260, damping: 18, useNativeDriver: true }).start();

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity 
        style={[styles.discoverCard, SHADOWS.glowCard]} 
        activeOpacity={1}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={onPress}
      >
        <LinearGradient
          colors={card.colors as any}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
        <CardIcon size={42} color="rgba(255,255,255,0.18)" style={styles.cardIconBg} />
        <Text style={styles.cardTitle}>{TXT[card.key as keyof typeof TXT] || card.title}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

export default function SearchScreen() {
  useThemeUpdate();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<AppItem[]>([]);
  const [suggestions, setSuggestions] = useState<AppItem[]>([]);
  const keyboardOffset = useRef(new Animated.Value(110)).current;
  const [isFocused, setIsFocused] = useState(false);
  const focusAnim = useRef(new Animated.Value(0)).current;
  const styles = getStyles(COLORS);

  useEffect(() => {
    Animated.spring(focusAnim, {
      toValue: isFocused ? 1 : 0,
      stiffness: 200,
      damping: 20,
      mass: 0.8,
      useNativeDriver: false,
    }).start();
  }, [isFocused]);

  const searchScale = focusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.015],
  });

  const searchBorderColor = focusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [COLORS.border, COLORS.primary],
  });

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const kbShow = Keyboard.addListener(showEvent, (e) => { Animated.spring(keyboardOffset, { toValue: e.endCoordinates.height + 15, stiffness: 200, damping: 22, mass: 0.8, useNativeDriver: false }).start(); });
    const kbHide = Keyboard.addListener(hideEvent, () => { Animated.spring(keyboardOffset, { toValue: 110, stiffness: 200, damping: 22, mass: 0.8, useNativeDriver: false }).start(); });
    return () => { kbShow.remove(); kbHide.remove(); }
  }, []);

  useEffect(() => {
    const allApps = [...CACHED_REGULAR_APPS, ...CACHED_VIP_APPS];
    if (allApps.length > 0) setSuggestions(allApps.sort(() => 0.5 - Math.random()).slice(0, 3));
  }, []);

  useEffect(() => {
    if (query.length > 1) {
      const allApps = [...CACHED_REGULAR_APPS, ...CACHED_VIP_APPS];
      const filtered = allApps.filter(a => 
        a.name.toLowerCase().includes(query.toLowerCase()) || 
        (a.category && a.category.toLowerCase().includes(query.toLowerCase()))
      );
      setResults(filtered);
    } else {
      setResults([]);
    }
  }, [query]);

  const renderResultItem = ({ item }: { item: AppItem }) => (
    <View style={styles.rowWrapper}>
      <TouchableOpacity style={styles.appRow} activeOpacity={0.7} onPress={() => router.push(`/details/${item.id}`)}>
        <Image source={{ uri: item.iconUrl }} style={styles.appIconSmall} />
        <View style={styles.appInfo}>
          <Text style={styles.appName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.appSub}>{item.category || item.sub}</Text>
        </View>
        <View onStartShouldSetResponder={() => true}><ListDownloadBtn app={item} /></View>
      </TouchableOpacity>
      <View style={styles.divider} />
    </View>
  );

  const isLightMode = COLORS.background === '#F4F4F6';

  return (
    <LinearGradient colors={COLORS.bgGradient} style={styles.container}>
      <StatusBar style={isLightMode ? 'dark' : 'light'} />
      {query.length > 0 ? (
        <View style={{flex: 1}}>
          <View style={[styles.headerSmall, { flexDirection: 'row', alignItems: 'center', gap: 10 }]}>
            <TouchableOpacity style={{ padding: 4 }} onPress={() => router.back()}>
              <ArrowLeft color={COLORS.text} size={22} />
            </TouchableOpacity>
            <Text style={styles.smallTitle}>{TXT.searchResult}</Text>
          </View>
          <FlatList data={results} keyExtractor={(item) => item.id} renderItem={renderResultItem} contentContainerStyle={styles.scrollContent} ListEmptyComponent={<Text style={styles.emptyText}>{TXT.noResult}</Text>} keyboardShouldPersistTaps="handled" onScroll={() => Keyboard.dismiss()} />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text style={styles.largeTitle}>{TXT.search}</Text>
            <TouchableOpacity 
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: COLORS.background === '#F4F4F6' ? '#FFFFFF' : 'rgba(255,255,255,0.06)',
                justifyContent: 'center',
                alignItems: 'center',
                borderWidth: 0.8,
                borderColor: COLORS.border,
              }} 
              activeOpacity={0.7} 
              onPress={() => router.back()}
            >
              <X color={COLORS.text} size={20} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>{TXT.suggestedTitle}</Text></View>
          <View style={[styles.cardListWrapper, SHADOWS.glowCard]}>
            <GlassView intensity={20} tint={isLightMode ? 'light' : 'dark'} style={StyleSheet.absoluteFill} />
            <View style={styles.cardListContent}>
              {suggestions.map((item, index) => (
                <View key={item.id}>
                  <TouchableOpacity style={styles.appRow} activeOpacity={0.7} onPress={() => router.push(`/details/${item.id}`)}>
                    <Image source={{ uri: item.iconUrl }} style={styles.appIconSmall} />
                    <View style={styles.appInfo}>
                      <Text style={styles.appName} numberOfLines={1}>{item.name}</Text>
                      <Text style={styles.appSub}>{item.category || item.sub}</Text>
                    </View>
                    <View onStartShouldSetResponder={() => true}><ListDownloadBtn app={item} /></View>
                  </TouchableOpacity>
                  {index < suggestions.length - 1 && <View style={styles.divider} />}
                </View>
              ))}
            </View>
          </View>

          <View style={[styles.sectionHeader, {marginTop: 35}]}><Text style={styles.sectionTitle}>{TXT.discoverTitle}</Text></View>
          <View style={styles.gridContainer}>
              {DISCOVER_CARDS.map(card => (
                <DiscoverCardItem 
                  key={card.id} 
                  card={card} 
                  onPress={() => {
                    setQuery(TXT[card.key as keyof typeof TXT] || card.title);
                  }} 
                />
              ))}
          </View>
        </ScrollView>
      )}

      {/* SEARCH BAR CHỒNG LÊN */}
      <Animated.View style={[styles.floatingSearchContainer, { bottom: keyboardOffset, transform: [{ scale: searchScale }] }]}>
        <Animated.View style={[styles.floatingSearchBarShadow, SHADOWS.glowDark, { borderColor: searchBorderColor, borderWidth: 0.8 }]}>
          <GlassView intensity={25} tint={isLightMode ? 'light' : 'dark'} style={styles.floatingSearchBar}>
            <Search size={20} color={isFocused ? COLORS.primary : "#8E8E93"} style={{marginLeft: 5, marginRight: 10}} />
            <TextInput 
              style={[styles.searchInput, { color: COLORS.text }]} 
              placeholder={TXT.searchPlaceholder} 
              placeholderTextColor="#8E8E93" 
              value={query} 
              onChangeText={setQuery} 
              autoCapitalize="none" 
              clearButtonMode="while-editing"
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
            />
          </GlassView>
        </Animated.View>
      </Animated.View>
    </LinearGradient>
  );
}

const getStyles = (theme: typeof COLORS) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  scrollContent: { paddingBottom: 200 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 60, paddingHorizontal: 20, marginBottom: 20 },
  largeTitle: { color: theme.text, fontSize: 34, fontWeight: '800', letterSpacing: -0.5 },
  headerSmall: { paddingTop: 60, paddingHorizontal: 20, paddingBottom: 15, borderBottomWidth: 0.8, borderColor: theme.border },
  smallTitle: { color: theme.text, fontSize: 22, fontWeight: '800' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginBottom: 15 },
  sectionTitle: { color: theme.text, fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
  
  cardListWrapper: { 
    marginHorizontal: 16, 
    borderRadius: SIZES.radiusSquircle,
    overflow: 'hidden',
    borderWidth: 0.8,
    borderColor: theme.border,
    backgroundColor: theme.surfaceCard,
  },
  cardListContent: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  rowWrapper: {
    marginHorizontal: 16,
  },
  appRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 8 },
  appIconSmall: { width: 58, height: 58, borderRadius: SIZES.radiusButton, backgroundColor: theme.surfaceSolid, borderWidth: 0.5, borderColor: theme.border },
  appInfo: { flex: 1, marginLeft: 14, justifyContent: 'center' },
  appName: { color: theme.text, fontSize: 16, fontWeight: '600', marginBottom: 4 },
  appSub: { color: theme.textMuted, fontSize: 12 },
  
  getButton: { 
    backgroundColor: theme.border, 
    paddingHorizontal: 16, 
    paddingVertical: 6, 
    borderRadius: 99, 
    minWidth: 80, 
    alignItems: 'center',
  },
  getButtonText: { color: theme.text, fontSize: 12, fontWeight: '800' },
  divider: { height: 0.5, backgroundColor: theme.border, marginLeft: 72 },
  emptyText: { color: theme.textMuted, textAlign: 'center', marginTop: 40, fontSize: 16 },
  
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, justifyContent: 'space-between' },
  discoverCard: { width: (width - 44) / 2, height: 110, borderRadius: SIZES.radiusCard, padding: 18, marginBottom: 15, overflow: 'hidden', justifyContent: 'flex-end', position: 'relative' },
  cardTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '800', textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: {width: 0, height: 1}, textShadowRadius: 3 },
  cardIconBg: { position: 'absolute', top: -8, right: -8, transform: [{rotate: '15deg'}] },
  
  floatingSearchContainer: { position: 'absolute', width: '100%', alignItems: 'center', paddingHorizontal: 16, zIndex: 100 },
  floatingSearchBarShadow: {
    width: '100%',
    borderRadius: SIZES.radiusSquircle,
    overflow: 'hidden',
  },
  floatingSearchBar: { 
    flexDirection: 'row', 
    backgroundColor: theme.surfaceCard, 
    width: '100%', 
    height: 54, 
    alignItems: 'center', 
    paddingHorizontal: 16, 
  },
  searchInput: { flex: 1, fontSize: 16, height: '100%' },
});
