import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, Image, TextInput, ScrollView, Dimensions, Keyboard, Animated, Platform, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { requireNativeModule } from 'expo-modules-core';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

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

import { CACHED_REGULAR_APPS, CACHED_VIP_APPS, AppItem } from '../../constants/data';
import { COLORS, SIZES, SHADOWS, useThemeUpdate, TXT } from '../../constants/theme';

const { width } = Dimensions.get('window');
const INSTALLER_WORKER_URL = "https://ipaviet-installer.clonene121212.workers.dev";

export const ListDownloadBtn = ({ app }: { app: AppItem }) => {
  const router = useRouter();
  const [status, setStatus] = useState('CÀI ĐẶT');

  const handleOneClickInstall = async () => {
    if (status !== 'CÀI ĐẶT' && status !== 'LỖI, THỬ LẠI') return;
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

      setStatus('Đang ký App...');
      const signResult = await IpaSigner.signAppOffline(rawIpaPath, activeCert.p12Uri, activeCert.provUri, activeCert.password);
      
      setStatus('Tạo OTA...');
      const signedFileName = signResult.outputPath.split('/').pop();
      const signedFileDir = signResult.outputPath.substring(0, signResult.outputPath.lastIndexOf('/'));
      
      const server = new StaticServer({ port: 0, fileDir: signedFileDir, hostname: '127.0.0.1' });
      const serverUrl = await server.start();
      
      setStatus('Hoàn tất!');
      const localIpaUrl = `${serverUrl}/${signedFileName}`;
      const workerUrl = `${INSTALLER_WORKER_URL}?ipa=${encodeURIComponent(localIpaUrl)}&name=${encodeURIComponent(app.name)}&bundle=${encodeURIComponent((app as any).bundleId || 'com.ipaviet.app')}&icon=${encodeURIComponent(app.iconUrl)}`;
      
      Alert.alert(
        "Sẵn sàng cài đặt", 
        "Trình duyệt sẽ mở ra. Vui lòng bấm Cài Đặt trên web, sau đó QUAY LẠI APP NÀY và giữ màn hình sáng chờ đến khi tải xong.",
        [{ text: "Mở Safari", onPress: () => {
            Linking.openURL(workerUrl);
            setTimeout(() => setStatus('CÀI ĐẶT'), 3000);
        }}]
      );

    } catch (e: any) {
      Alert.alert("Lỗi", e.message || "Có lỗi xảy ra trong quá trình ký và cài đặt.");
      setStatus('LỖI, THỬ LẠI');
    }
  };

  return (
    <TouchableOpacity style={styles.getButton} activeOpacity={0.8} onPress={handleOneClickInstall}>
      <Text style={styles.getButtonText}>{status}</Text>
    </TouchableOpacity>
  );
};

const DISCOVER_CARDS = [
  { id: '1', title: 'Top Ứng Dụng', colors: ['#0A84FF', '#0055D4'], icon: 'trophy' },
  { id: '2', title: 'Top Trò Chơi', colors: ['#FF9F0A', '#FF3B30'], icon: 'game-controller' },
  { id: '3', title: 'Bán Chạy Nhất', colors: ['#30D158', '#108040'], icon: 'ribbon' },
  { id: '4', title: 'Hiệu Suất', colors: ['#BF5AF2', '#6200EE'], icon: 'rocket' }
] as const;

export default function SearchScreen() {
  useThemeUpdate();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<AppItem[]>([]);
  const [suggestions, setSuggestions] = useState<AppItem[]>([]);
  const keyboardOffset = useRef(new Animated.Value(110)).current;

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const kbShow = Keyboard.addListener(showEvent, (e) => { Animated.spring(keyboardOffset, { toValue: e.endCoordinates.height + 15, useNativeDriver: false }).start(); });
    const kbHide = Keyboard.addListener(hideEvent, () => { Animated.spring(keyboardOffset, { toValue: 110, useNativeDriver: false }).start(); });
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

  return (
    <LinearGradient colors={COLORS.bgGradient} style={styles.container}>
      <StatusBar style="light" />
      {query.length > 0 ? (
        <View style={{flex: 1}}>
          <View style={styles.headerSmall}><Text style={styles.smallTitle}>Kết quả tìm kiếm</Text></View>
          <FlatList data={results} keyExtractor={(item) => item.id} renderItem={renderResultItem} contentContainerStyle={styles.scrollContent} ListEmptyComponent={<Text style={styles.emptyText}>Không tìm thấy kết quả nào.</Text>} keyboardShouldPersistTaps="handled" onScroll={() => Keyboard.dismiss()} />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.header}><Text style={styles.largeTitle}>Tìm kiếm</Text></View>
          
          <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Được Đề Xuất</Text></View>
          <View style={[styles.cardListWrapper, SHADOWS.glowCard]}>
            <BlurView intensity={15} tint="dark" style={StyleSheet.absoluteFill} />
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

          <View style={[styles.sectionHeader, {marginTop: 35}]}><Text style={styles.sectionTitle}>Khám Phá</Text></View>
          <View style={styles.gridContainer}>
             {DISCOVER_CARDS.map(card => (
               <TouchableOpacity key={card.id} style={[styles.discoverCard, SHADOWS.glowCard]} activeOpacity={0.8}>
                  <LinearGradient
                    colors={card.colors}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  />
                  <Ionicons name={card.icon as any} size={42} color="rgba(255,255,255,0.18)" style={styles.cardIconBg} />
                  <Text style={styles.cardTitle}>{card.title}</Text>
               </TouchableOpacity>
             ))}
          </View>
        </ScrollView>
      )}

      {/* SEARCH BAR CHỒNG LÊN */}
      <Animated.View style={[styles.floatingSearchContainer, { bottom: keyboardOffset }]}>
        <View style={[styles.floatingSearchBarShadow, SHADOWS.glowDark]}>
          <BlurView intensity={35} tint="dark" style={styles.floatingSearchBar}>
            <Ionicons name="search" size={20} color="#8E8E93" style={{marginLeft: 5, marginRight: 10}} />
            <TextInput style={styles.searchInput} placeholder="Tìm app, game..." placeholderTextColor="#8E8E93" value={query} onChangeText={setQuery} autoCapitalize="none" clearButtonMode="while-editing" />
          </BlurView>
        </View>
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { paddingBottom: 200 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 60, paddingHorizontal: 20, marginBottom: 20 },
  largeTitle: { color: COLORS.text, fontSize: 34, fontWeight: '800', letterSpacing: -0.5 },
  headerSmall: { paddingTop: 60, paddingHorizontal: 20, paddingBottom: 15, borderBottomWidth: 0.8, borderColor: COLORS.border },
  smallTitle: { color: COLORS.text, fontSize: 22, fontWeight: '800' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginBottom: 15 },
  sectionTitle: { color: COLORS.text, fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
  
  cardListWrapper: { 
    marginHorizontal: 16, 
    borderRadius: SIZES.radiusSquircle,
    overflow: 'hidden',
    borderWidth: 0.8,
    borderColor: COLORS.border,
    backgroundColor: 'rgba(20, 20, 24, 0.45)',
  },
  cardListContent: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  rowWrapper: {
    marginHorizontal: 16,
  },
  appRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 8 },
  appIconSmall: { width: 58, height: 58, borderRadius: 13, backgroundColor: COLORS.surfaceSolid, borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.06)' },
  appInfo: { flex: 1, marginLeft: 14, justifyContent: 'center' },
  appName: { color: COLORS.text, fontSize: 16, fontWeight: '600', marginBottom: 4 },
  appSub: { color: COLORS.textMuted, fontSize: 12 },
  
  getButton: { 
    backgroundColor: 'rgba(10, 132, 255, 0.1)', 
    paddingHorizontal: 16, 
    paddingVertical: 7, 
    borderRadius: SIZES.radiusPill, 
    minWidth: 80, 
    alignItems: 'center',
    borderWidth: 0.8,
    borderColor: 'rgba(10, 132, 255, 0.25)',
  },
  getButtonText: { color: COLORS.primary, fontSize: 13, fontWeight: '800' },
  divider: { height: 0.5, backgroundColor: 'rgba(255,255,255,0.08)', marginLeft: 72 },
  emptyText: { color: COLORS.textMuted, textAlign: 'center', marginTop: 40, fontSize: 16 },
  
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, justifyContent: 'space-between' },
  discoverCard: { width: (width - 44) / 2, height: 110, borderRadius: SIZES.radiusCard, padding: 18, marginBottom: 15, overflow: 'hidden', justifyContent: 'flex-end', position: 'relative' },
  cardTitle: { color: COLORS.text, fontSize: 16, fontWeight: '800', textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: {width: 0, height: 1}, textShadowRadius: 3 },
  cardIconBg: { position: 'absolute', top: -8, right: -8, transform: [{rotate: '15deg'}] },
  
  floatingSearchContainer: { position: 'absolute', width: '100%', alignItems: 'center', paddingHorizontal: 16, zIndex: 100 },
  floatingSearchBarShadow: {
    width: '100%',
    borderRadius: 22,
    overflow: 'hidden',
  },
  floatingSearchBar: { 
    flexDirection: 'row', 
    backgroundColor: 'rgba(20, 20, 24, 0.65)', 
    width: '100%', 
    height: 54, 
    alignItems: 'center', 
    paddingHorizontal: 16, 
    borderWidth: 0.8, 
    borderColor: 'rgba(255, 255, 255, 0.12)' 
  },
  searchInput: { flex: 1, color: COLORS.text, fontSize: 16, height: '100%' },
});
