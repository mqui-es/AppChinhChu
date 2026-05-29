import React, { useState, useEffect, useRef, memo } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, Image, ActivityIndicator, ScrollView, Animated, InteractionManager, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { fetchRegularApps, AppItem } from '../../constants/data';
import { ListDownloadBtn } from './search';
import { COLORS, SIZES, SHADOWS } from '../../constants/theme';

import { auth, db } from '../../firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';

const getVipMillis = (vipExpire: any) => {
  if (!vipExpire) return 0;
  if (typeof vipExpire.toMillis === 'function') return vipExpire.toMillis();
  if (vipExpire.seconds) return vipExpire.seconds * 1000;
  return Number(vipExpire) || 0;
};

const RegularAppRow = memo(({ item }: { item: AppItem }) => {
  const router = useRouter();

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
      <View style={styles.divider} />
    </View>
  );
});

export default function AppsScreen() {
  const [apps, setApps] = useState<AppItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<string[]>(['Tất cả']);
  const [uiCat, setUiCat] = useState('Tất cả');
  const [listCat, setListCat] = useState('Tất cả');

  const measures = useRef<Record<string, { x: number, width: number }>>({}).current;
  const slideX = useRef(new Animated.Value(0)).current;
  const slideW = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fetchRegularApps().then((data) => {
      setApps(data);
      const uniqueCats = Array.from(new Set(data.map(app => app.category))).filter(c => c && c !== 'Khác');
      setCategories(['Tất cả', ...uniqueCats]);
      setLoading(false);
    });
  }, []);

  const handleSelectCategory = (cat: string) => {
    if (cat === uiCat) return;
    setUiCat(cat);
    if (measures[cat]) {
      Animated.parallel([
        Animated.spring(slideX, { toValue: measures[cat].x, useNativeDriver: false, friction: 8, tension: 60 }),
        Animated.spring(slideW, { toValue: measures[cat].width, useNativeDriver: false, friction: 8, tension: 60 })
      ]).start();
    }
    InteractionManager.runAfterInteractions(() => { setListCat(cat); });
  };

  const filteredApps = listCat === 'Tất cả' 
    ? apps 
    : apps.filter(a => a.category && a.category.trim().toLowerCase() === listCat.trim().toLowerCase());

  return (
    <LinearGradient colors={COLORS.bgGradient} style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.header}><Text style={styles.largeTitle}>Kho Ứng Dụng</Text></View>

      {loading ? (
        <View style={styles.loadingContainer}><ActivityIndicator size="large" color={COLORS.primary} /></View>
      ) : (
        <>
          <View style={styles.categoryContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catScroll}>
              <View style={{ flexDirection: 'row', position: 'relative' }}>
                <Animated.View style={[styles.slidingPill, { transform: [{ translateX: slideX }], width: slideW }]}>
                  <LinearGradient
                    colors={COLORS.primaryGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={StyleSheet.absoluteFill}
                  />
                </Animated.View>
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
              renderItem={({ item }) => <RegularAppRow item={item} />}
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { paddingTop: 10, paddingBottom: 140 },
  header: { paddingTop: 60, paddingHorizontal: 20, marginBottom: 5 },
  largeTitle: { color: COLORS.text, fontSize: 34, fontWeight: '800', letterSpacing: -0.5 },
  
  categoryContainer: { borderBottomWidth: 0.8, borderBottomColor: COLORS.border, paddingBottom: 12, marginBottom: 5, marginTop: 15 },
  catScroll: { paddingHorizontal: 20 },
  slidingPill: { position: 'absolute', top: 0, bottom: 0, borderRadius: 20, overflow: 'hidden' },
  catBtn: { paddingHorizontal: 20, paddingVertical: 10, zIndex: 2, justifyContent: 'center' },
  catText: { color: COLORS.textMuted, fontSize: 16, fontWeight: '600' },
  catTextActive: { color: '#FFFFFF', fontWeight: '700' },
  
  loadingContainer: { alignItems: 'center', marginTop: 100 },
  rowWrapper: {
    marginHorizontal: 16,
    borderRadius: SIZES.radiusCard,
    overflow: 'hidden',
  },
  appRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 12 },
  appIconSmall: { width: 60, height: 60, borderRadius: 13, backgroundColor: COLORS.surfaceSolid, borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.06)' },
  appInfo: { flex: 1, marginLeft: 14, justifyContent: 'center' },
  appName: { color: COLORS.text, fontSize: 16, fontWeight: '600', marginBottom: 4 },
  appSub: { color: COLORS.textMuted, fontSize: 12 },
  divider: { height: 0.5, backgroundColor: 'rgba(255, 255, 255, 0.08)', marginLeft: 74 }
});
