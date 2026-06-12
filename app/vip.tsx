import React, { useState, useEffect, useRef, memo } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, Image, ActivityIndicator, ScrollView, Animated, InteractionManager, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { Sparkles, ChevronLeft } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { fetchVIPApps, AppItem } from '../constants/data';
import { ListDownloadBtn } from './search';
import { COLORS, SIZES, SHADOWS, useThemeUpdate, TXT } from '../constants/theme';

import { auth, db } from '../firebaseConfig';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';

const SmartVIPRow = memo(({ item, index, onAccessDenied }: { item: AppItem; index: number; onAccessDenied: () => void }) => {
  useThemeUpdate();
  const [icon, setIcon] = useState(item.iconUrl);
  const styles = getStyles(COLORS);
  
  useEffect(() => {
    if (icon.includes('ui-avatars')) {
      let searchName = item.name.toLowerCase().replace(/(plus|\+|deluxe|lrd|pro|premium|cheat|hack|crack|ipaviet site)/ig, '').trim();
      if (searchName.includes('yt')) searchName = 'youtube';
      fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(searchName)}&entity=software&limit=1&country=vn`)
        .then(res => res.json())
        .then(data => { if (data.results && data.results.length > 0) { setIcon(data.results[0].artworkUrl512); item.iconUrl = data.results[0].artworkUrl512; } }).catch(() => {});
    }
  }, []);

  const getRankColors = (idx: number): readonly [string, string, ...string[]] => {
    if (idx === 0) return COLORS.goldGradient;
    if (idx === 1) return ['#E2E2E2', '#8E8E93'] as const;
    if (idx === 2) return ['#CD7F32', '#A0522D'] as const;
    return ['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.05)'] as const;
  };

  const isTopRank = index < 3;

  return (
    <View style={styles.rowWrapper}>
      <TouchableOpacity style={styles.appRow} activeOpacity={0.75} onPress={onAccessDenied}>
        <View style={styles.rankBadgeWrapper}>
          <LinearGradient
            colors={getRankColors(index)}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.rankBadge, !isTopRank && { borderWidth: 1, borderColor: COLORS.border }]}
          >
            <Text style={[styles.rankNumber, { color: isTopRank ? '#0A0A0C' : '#8E8E93' }]}>{index + 1}</Text>
          </LinearGradient>
        </View>
        <Image source={{ uri: icon }} style={styles.appIconSmall} />
        <View style={styles.appInfo}>
          <Text style={styles.appName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.appSub}>{item.category} • Độc Quyền</Text>
        </View>
        <View pointerEvents="none"><ListDownloadBtn app={item} /></View>
      </TouchableOpacity>
      <View style={styles.divider} />
    </View>
  );
});

export default function VIPScreen() {
  useThemeUpdate();
  const router = useRouter();
  const [apps, setApps] = useState<AppItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<string[]>(['Tất cả']);
  const [uiCat, setUiCat] = useState('Tất cả');
  const [listCat, setListCat] = useState('Tất cả');
  const [isUserVip, setIsUserVip] = useState(false);
  const styles = getStyles(COLORS);

  const measures = useRef<Record<string, { x: number, width: number }>>({}).current;
  const slideX = useRef(new Animated.Value(0)).current;
  const slideW = useRef(new Animated.Value(0)).current;

  const checkVipStatus = (vipExpireData: any) => {
    if (!vipExpireData) return false;
    let millis = 0;
    if (typeof vipExpireData.toMillis === 'function') millis = vipExpireData.toMillis();
    else if (vipExpireData.seconds) millis = vipExpireData.seconds * 1000;
    else millis = Number(vipExpireData) || 0;
    return millis > Date.now();
  };

  useEffect(() => {
    fetchVIPApps().then((data) => {
      setApps(data);
      const uniqueCats = Array.from(new Set(data.map(app => app.category))).filter(c => c && c !== 'Khác');
      setCategories(['Tất cả', ...uniqueCats]); 
      setLoading(false);
    });

    let unsubDoc: any;
    if (auth.currentUser) {
      unsubDoc = onSnapshot(doc(db, 'users', auth.currentUser.uid), (snap) => {
        if (snap.exists() && checkVipStatus(snap.data().vipExpire)) {
          setIsUserVip(true);
        } else {
          setIsUserVip(false);
        }
      });
    }
    return () => { if (unsubDoc) unsubDoc(); };
  }, []);

  const handleSelectCategory = (cat: string) => {
    if (cat === uiCat) return;
    setUiCat(cat); 
    if (measures[cat]) {
      Animated.parallel([
        Animated.spring(slideX, { toValue: measures[cat].x, useNativeDriver: false, stiffness: 180, damping: 22, mass: 0.8 }),
        Animated.spring(slideW, { toValue: measures[cat].width, useNativeDriver: false, stiffness: 180, damping: 22, mass: 0.8 })
      ]).start();
    }
    InteractionManager.runAfterInteractions(() => { setListCat(cat); });
  };

  const checkFirewall = async (appId: string) => {
    if (!auth.currentUser) return Alert.alert('Cần đăng nhập', 'Đăng nhập để xem Kho VIP!', [{ text: 'Hủy', style: 'cancel' }, { text: 'Đăng nhập', onPress: () => router.push('/account') }]);
    
    const snap = await getDoc(doc(db, 'users', auth.currentUser.uid));
    if (snap.exists() && checkVipStatus(snap.data().vipExpire)) {
         router.push(`/details/${appId}`);
         return;
    }
    Alert.alert('Chỉ dành cho VIP', 'Mở khóa VIP để tải ứng dụng độc quyền!', [{ text: 'Hủy', style: 'cancel' }, { text: 'Nâng Cấp Ngay', onPress: () => router.push('/buy-vip') }]);
  };

  const filteredApps = listCat === 'Tất cả' 
    ? apps 
    : apps.filter(a => a.category && a.category.trim().toLowerCase() === listCat.trim().toLowerCase());

  const isLightMode = COLORS.background === '#F4F4F6';

  return (
    <LinearGradient colors={COLORS.bgGradient} style={styles.container}>
      <StatusBar style={isLightMode ? 'dark' : 'light'} />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} activeOpacity={0.7} onPress={() => router.back()}>
          <ChevronLeft size={24} color={COLORS.primary} />
          <Text style={[styles.backText, { color: COLORS.primary }]}>Quay lại</Text>
        </TouchableOpacity>
        <View style={[styles.titleWrapper, { marginTop: 12 }]}>
          <Text style={styles.largeTitle}>Kho VIP</Text>
          <Sparkles color={COLORS.gold} size={28} strokeWidth={2.5} />
        </View>
        <Text style={styles.desc}>Nguồn tải tốc độ cao từ Server riêng biệt</Text>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}><ActivityIndicator size="large" color={COLORS.gold} /></View>
      ) : (
        <>
          <View style={styles.categoryContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catScroll}>
              <View style={{ flexDirection: 'row', position: 'relative' }}>
                <Animated.View style={[styles.slidingPill, { transform: [{ translateX: slideX }], width: slideW }]}>
                  <LinearGradient
                    colors={COLORS.goldGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={StyleSheet.absoluteFill}
                  />
                </Animated.View>
                {categories.map((cat) => (
                  <TouchableOpacity 
                    key={cat} 
                    style={styles.catBtn} 
                    onLayout={(e) => { 
                      const { x, width } = e.nativeEvent.layout; 
                      measures[cat] = { x, width }; 
                      if (cat === uiCat && slideW as unknown as number === 0) { 
                        slideX.setValue(x); 
                        slideW.setValue(width); 
                      } 
                    }} 
                    onPress={() => handleSelectCategory(cat)}
                  >
                    <Text style={[styles.catText, uiCat === cat && styles.catTextActive]}>{cat}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
          <View style={{ flex: 1, opacity: uiCat !== listCat ? 0.3 : 1 }}>
            <FlatList 
              data={filteredApps} 
              keyExtractor={(item) => item.id} 
              renderItem={({ item, index }) => <SmartVIPRow item={item} index={index} onAccessDenied={() => checkFirewall(item.id)} />} 
              contentContainerStyle={styles.scrollContent} 
              showsVerticalScrollIndicator={false} 
              removeClippedSubviews={true} 
              initialNumToRender={8} 
              maxToRenderPerBatch={5} 
              windowSize={3} 
            />
          </View>
        </>
      )}
    </LinearGradient>
  );
}

const getStyles = (theme: typeof COLORS) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  scrollContent: { paddingTop: 10, paddingBottom: 140 },
  header: { paddingTop: 60, paddingHorizontal: 20, marginBottom: 5 },
  backBtn: { flexDirection: 'row', alignItems: 'center', marginLeft: -8 },
  backText: { fontSize: 16, fontWeight: '500' },
  titleWrapper: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  largeTitle: { color: theme.gold, fontSize: 34, fontWeight: '800', letterSpacing: -0.5 },
  desc: { color: theme.textMuted, fontSize: 14, marginTop: 4 },
  
  categoryContainer: { borderBottomWidth: 0.8, borderBottomColor: theme.border, paddingBottom: 12, marginBottom: 5, marginTop: 15 },
  catScroll: { paddingHorizontal: 20 },
  slidingPill: { position: 'absolute', top: 0, bottom: 0, borderRadius: 20, overflow: 'hidden' },
  catBtn: { paddingHorizontal: 20, paddingVertical: 10, zIndex: 2, justifyContent: 'center' },
  catText: { color: theme.textMuted, fontSize: 16, fontWeight: '600' },
  catTextActive: { color: '#000000', fontWeight: '700' }, 
  
  loadingContainer: { alignItems: 'center', marginTop: 100 },
  rowWrapper: {
    marginHorizontal: 16,
    borderRadius: SIZES.radiusCard,
    overflow: 'hidden',
  },
  appRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 12 },
  rankBadgeWrapper: { width: 32, height: 32, marginRight: 10, justifyContent: 'center', alignItems: 'center' },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankNumber: { fontSize: 14, fontWeight: '800' },
  appIconSmall: { width: 58, height: 58, borderRadius: 13, backgroundColor: theme.surfaceSolid, borderWidth: 0.5, borderColor: theme.border },
  appInfo: { flex: 1, marginLeft: 14, justifyContent: 'center' },
  appName: { color: theme.text, fontSize: 16, fontWeight: '600', marginBottom: 4 },
  appSub: { color: theme.textMuted, fontSize: 12 },
  divider: { height: 0.5, backgroundColor: theme.border, marginLeft: 114 }
});
