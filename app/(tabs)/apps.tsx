import React, { useState, useEffect, useRef, memo } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, Image, ActivityIndicator, ScrollView, Animated, InteractionManager, Alert, DeviceEventEmitter } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { fetchRegularApps, AppItem } from '../../constants/data';
import { ListDownloadBtn } from '../search';
import { COLORS, SIZES, SHADOWS, SPRING, useThemeUpdate, TXT } from '../../constants/theme';
import { TabTransition } from '../../components/ui/TabTransition';

import { auth, db } from '../../firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';

const getVipMillis = (vipExpire: any) => {
  if (!vipExpire) return 0;
  if (typeof vipExpire.toMillis === 'function') return vipExpire.toMillis();
  if (vipExpire.seconds) return vipExpire.seconds * 1000;
  return Number(vipExpire) || 0;
};

const ShimmerRow = ({ isLight, opacity }: { isLight: boolean; opacity: Animated.Value }) => {
  const styles = getStyles(COLORS);
  return (
    <View style={styles.shimmerRow}>
      <Animated.View style={[styles.shimmerIcon, { backgroundColor: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)', opacity }]} />
      <View style={styles.shimmerTextColumn}>
        <Animated.View style={[styles.shimmerTextLineLong, { backgroundColor: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)', opacity }]} />
        <Animated.View style={[styles.shimmerTextLineShort, { backgroundColor: isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.05)', opacity }]} />
      </View>
      <Animated.View style={[styles.shimmerBtn, { backgroundColor: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)', opacity }]} />
    </View>
  );
};


const RegularAppRow = memo(({ item }: { item: AppItem }) => {
  useThemeUpdate();
  const router = useRouter();
  const styles = getStyles(COLORS);

  const handleDownloadClick = async () => {
    if (!auth.currentUser) {
      return Alert.alert('Yêu cầu Đăng nhập', 'Sếp cần đăng nhập tài khoản trước nhé!', [
        { text: 'Hủy', style: 'cancel' },
        { text: 'Đăng nhập ngay', onPress: () => router.push('/account') }
      ]);
    }

    try {
      const snap = await getDoc(doc(db, 'users', auth.currentUser.uid));
      if (snap.exists()) {
        const expireMillis = getVipMillis(snap.data().vipExpire);
        if (expireMillis > Date.now()) {
          router.push(`/details/${item.id}`);
          return;
        }
      }
      
      Alert.alert(
        'Đặc Quyền VIP', 
        'Để tải ứng dụng siêu mượt không quảng cáo trên App, Sếp vui lòng nâng cấp gói VIP nhé!', 
        [
          { text: 'Hủy', style: 'cancel' },
          { text: 'Nâng Cấp Ngay', onPress: () => router.push('/buy-vip') }
        ]
      );
    } catch (e) {
      Alert.alert('Lỗi', 'Không thể xác thực. Vui lòng thử lại.');
    }
  };

  return (
    <View style={styles.rowWrapper}>
      <TouchableOpacity style={styles.appRow} activeOpacity={0.75} onPress={() => router.push(`/details/${item.id}`)}>
        <Image source={{ uri: item.iconUrl }} style={styles.appIconSmall} />
        <View style={styles.appInfo}>
          <Text style={styles.appName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.appSub}>{item.category || item.sub}</Text>
        </View>
        <TouchableOpacity activeOpacity={0.8} onPress={handleDownloadClick} style={{zIndex: 10}}>
          <View pointerEvents="none"><ListDownloadBtn app={item} /></View>
        </TouchableOpacity>
      </TouchableOpacity>
    </View>
  );
});

export default function AppsScreen() {
  useThemeUpdate();
  const [apps, setApps] = useState<AppItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<string[]>(['Tất cả']);
  const [uiCat, setUiCat] = useState('Tất cả');
  const [listCat, setListCat] = useState('Tất cả');
  const styles = getStyles(COLORS);
  const shimmerOpacity = useRef(new Animated.Value(0.35)).current;

  const lastScrollY = useRef(0);
  const isTabBarHidden = useRef(false);

  const handleScroll = (event: any) => {
    const value = event.nativeEvent.contentOffset.y;
    if (value < 0) return;
    const diff = value - lastScrollY.current;
    
    if (diff > 15 && value > 100) {
      if (!isTabBarHidden.current) {
        isTabBarHidden.current = true;
        DeviceEventEmitter.emit('hideTabBar');
      }
    } else if (diff < -15 || value < 20) {
      if (isTabBarHidden.current) {
        isTabBarHidden.current = false;
        DeviceEventEmitter.emit('showTabBar');
      }
    }
    lastScrollY.current = value;
  };

  const measures = useRef<Record<string, { x: number, width: number }>>({}).current;
  const slideX = useRef(new Animated.Value(0)).current;
  const slideW = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerOpacity, { toValue: 0.7, duration: 900, useNativeDriver: true }),
        Animated.timing(shimmerOpacity, { toValue: 0.35, duration: 900, useNativeDriver: true })
      ])
    ).start();

    fetchRegularApps().then((data) => {
      setApps(data);
      const uniqueCats = Array.from(new Set(data.map(app => app.category))).filter(c => c && c !== 'Khác');
      setCategories(['Tất cả', ...uniqueCats]);
      setLoading(false);
    });
  }, []);

  const handleSelectCategory = (cat: string) => {
    if (cat === uiCat) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setUiCat(cat);
    if (measures[cat]) {
      Animated.parallel([
        Animated.spring(slideX, { toValue: measures[cat].x, useNativeDriver: false, ...SPRING.gentle }),
        Animated.spring(slideW, { toValue: measures[cat].width, useNativeDriver: false, ...SPRING.gentle })
      ]).start();
    }
    InteractionManager.runAfterInteractions(() => { setListCat(cat); });
  };

  const filteredApps = listCat === 'Tất cả' 
    ? apps 
    : apps.filter(a => a.category && a.category.trim().toLowerCase() === listCat.trim().toLowerCase());

  const isLightMode = COLORS.background === '#F4F4F6';

  return (
    <TabTransition tabPath="/apps">
      <LinearGradient colors={COLORS.bgGradient} style={styles.container}>
        <StatusBar style={isLightMode ? 'dark' : 'light'} />
      <View style={styles.header}><Text style={styles.largeTitle}>{TXT.appStoreTitle}</Text></View>

      {loading ? (
        <View style={{ marginHorizontal: 16, backgroundColor: COLORS.surfaceCard, borderRadius: SIZES.radiusSquircle, borderWidth: 0.8, borderColor: COLORS.border, marginTop: 15, paddingHorizontal: 4 }}>
          {[1, 2, 3, 4, 5, 6].map((x, i) => (
            <View key={x}>
              <ShimmerRow isLight={isLightMode} opacity={shimmerOpacity} />
              {i < 5 && <View style={{ height: 0.5, backgroundColor: COLORS.border, marginLeft: 74 }} />}
            </View>
          ))}
        </View>
      ) : (
        <>
          <View style={styles.categoryContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catScroll}>
              <View style={{ flexDirection: 'row', position: 'relative' }}>
                <Animated.View style={[styles.slidingPill, { transform: [{ translateX: slideX }], width: slideW }]} />
                {categories.map((cat) => (
                  <TouchableOpacity
                    key={cat} style={styles.catBtn}
                    onLayout={(e) => {
                      const { x, width } = e.nativeEvent.layout;
                      measures[cat] = { x, width };
                      if (cat === uiCat && slideW as unknown as number === 0) { slideX.setValue(x); slideW.setValue(width); }
                    }}
                    onPress={() => handleSelectCategory(cat)}
                  >
                    <Text style={[styles.catText, uiCat === cat && styles.catTextActive]}>
                      {cat === 'Tất cả' ? (TXT.langName === 'English' ? 'All' : 'Tất cả') : cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          <View style={{ flex: 1, opacity: uiCat !== listCat ? 0.35 : 1 }}>
            <FlatList
              data={filteredApps}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => <RegularAppRow item={item} />}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              removeClippedSubviews={true} 
              initialNumToRender={8}
              maxToRenderPerBatch={5}
              windowSize={3}
              onScroll={handleScroll}
              scrollEventThrottle={16}
            />
          </View>
        </>
      )}
      </LinearGradient>
    </TabTransition>
  );
}

const getStyles = (theme: typeof COLORS) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  scrollContent: { paddingTop: 10, paddingBottom: 140 },
  header: { paddingTop: 60, paddingHorizontal: 20, marginBottom: 5 },
  largeTitle: { color: theme.text, fontSize: 34, fontWeight: '800', letterSpacing: -0.5 },
  
  categoryContainer: { borderBottomWidth: 0.8, borderBottomColor: theme.border, paddingBottom: 12, marginBottom: 5, marginTop: 15 },
  catScroll: { paddingHorizontal: 20 },
  slidingPill: { position: 'absolute', top: 6, bottom: 6, borderRadius: 18, backgroundColor: theme.border },
  catBtn: { paddingHorizontal: 20, paddingVertical: 10, zIndex: 2, justifyContent: 'center' },
  catText: { color: theme.textMuted, fontSize: 16, fontWeight: '600' },
  catTextActive: { color: theme.text, fontWeight: '700' },
  
  rowWrapper: {
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: SIZES.radiusCard,
    backgroundColor: theme.surfaceSolid,
    borderWidth: 0.8,
    borderColor: theme.border,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 1,
  },
  appRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 12 },
  appIconSmall: { width: 56, height: 56, borderRadius: 14, backgroundColor: theme.surfaceSolid, borderWidth: 0.5, borderColor: theme.border },
  appInfo: { flex: 1, marginLeft: 14, justifyContent: 'center' },
  appName: { color: theme.text, fontSize: 15, fontWeight: '700', marginBottom: 4 },
  appSub: { color: theme.textMuted, fontSize: 11 },

  // Shimmer Skeletons
  shimmerRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 12 },
  shimmerIcon: { width: 60, height: 60, borderRadius: SIZES.radiusButton },
  shimmerTextColumn: { flex: 1, marginLeft: 14, gap: 8 },
  shimmerTextLineLong: { height: 14, borderRadius: 4, width: '60%' },
  shimmerTextLineShort: { height: 10, borderRadius: 4, width: '35%' },
  shimmerBtn: { width: 68, height: 28, borderRadius: SIZES.radiusButton },
});
