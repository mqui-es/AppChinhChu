import React, { useState, useEffect, memo, useRef } from 'react';
import { 
  StyleSheet, Text, View, ScrollView, Image, TouchableOpacity, 
  ActivityIndicator, Animated, Dimensions, Platform 
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { fetchRegularApps, fetchVIPApps, AppItem } from '../../constants/data';
import { COLORS, SIZES, SHADOWS, useThemeUpdate, TXT } from '../../constants/theme';

const { width } = Dimensions.get('window');

// ──────────────────────────────────────────────
// VIP Card với animation nhập cảnh
// ──────────────────────────────────────────────
const SmartVIPCard = memo(({ item, index }: { item: AppItem; index: number }) => {
  useThemeUpdate();
  const router = useRouter();
  const [icon, setIcon] = useState(item.iconUrl);
  const slideAnim = useRef(new Animated.Value(30)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 80,
        friction: 9,
        delay: index * 60,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 350,
        delay: index * 60,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  useEffect(() => {
    if (icon.includes('ui-avatars')) {
      let searchName = item.name.toLowerCase().replace(/(plus|\+|deluxe|lrd|pro|premium|cheat|hack|crack|ipaviet site)/ig, '').trim();
      if (searchName.includes('yt')) searchName = 'youtube';
      fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(searchName)}&entity=software&limit=1&country=vn`)
        .then(res => res.json())
        .then(data => {
          if (data.results?.length > 0) {
            setIcon(data.results[0].artworkUrl512);
            item.iconUrl = data.results[0].artworkUrl512;
          }
        }).catch(() => {});
    }
  }, []);

  return (
    <Animated.View style={[{ transform: [{ translateY: slideAnim }], opacity: opacityAnim }]}>
      <TouchableOpacity
        style={[styles.vipCard, { backgroundColor: COLORS.surfaceCard, borderColor: COLORS.border }]}
        onPress={() => router.push(`/details/${item.id}`)}
        activeOpacity={0.82}
      >
        <View style={styles.vipIconWrapper}>
          <Image source={{ uri: icon }} style={styles.vipIcon} />
          <LinearGradient
            colors={COLORS.goldGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.vipBadge}
          >
            <Text style={styles.vipBadgeText}>VIP</Text>
          </LinearGradient>
        </View>
        <Text style={[styles.vipName, { color: COLORS.text }]} numberOfLines={2}>{item.name}</Text>
        <Text style={[styles.vipSub, { color: COLORS.textMuted }]} numberOfLines={1}>{item.category}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
});

// ──────────────────────────────────────────────
// App row item với thiết kế gọn gàng
// ──────────────────────────────────────────────
const AppRowItem = memo(({ app, onPress, showDivider }: { app: AppItem; onPress: () => void; showDivider: boolean }) => {
  useThemeUpdate();
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => Animated.spring(scaleAnim, { toValue: 0.97, tension: 200, friction: 10, useNativeDriver: true }).start();
  const handlePressOut = () => Animated.spring(scaleAnim, { toValue: 1, tension: 200, friction: 10, useNativeDriver: true }).start();

  return (
    <View>
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <TouchableOpacity 
          style={styles.appRow} 
          activeOpacity={1} 
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
        >
          <Image source={{ uri: app.iconUrl }} style={[styles.appIcon, { borderColor: COLORS.border }]} />
          <View style={styles.appInfo}>
            <Text style={[styles.appName, { color: COLORS.text }]} numberOfLines={1}>{app.name}</Text>
            <Text style={[styles.appSub, { color: COLORS.textMuted }]} numberOfLines={1}>{app.sub || app.category}</Text>
          </View>
          <TouchableOpacity 
            style={[styles.getBtn, { borderColor: COLORS.borderActive, backgroundColor: COLORS.primaryGlow }]} 
            onPress={onPress}
            activeOpacity={0.75}
          >
            <Text style={[styles.getBtnText, { color: COLORS.primary }]}>{TXT.langName === 'English' ? 'GET' : 'NHẬN'}</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </Animated.View>
      {showDivider && <View style={[styles.divider, { backgroundColor: COLORS.border }]} />}
    </View>
  );
});

// ──────────────────────────────────────────────
// Featured Hero Card
// ──────────────────────────────────────────────
const FeaturedCard = memo(({ app, onPress }: { app: AppItem; onPress: () => void }) => {
  useThemeUpdate();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const handlePressIn = () => Animated.spring(scaleAnim, { toValue: 0.985, tension: 200, friction: 10, useNativeDriver: true }).start();
  const handlePressOut = () => Animated.spring(scaleAnim, { toValue: 1, tension: 200, friction: 10, useNativeDriver: true }).start();
  const isLight = COLORS.background === '#F2F2F7';

  return (
    <Animated.View style={[styles.featuredCard, SHADOWS.glowDark, { transform: [{ scale: scaleAnim }] }]}>
      <TouchableOpacity 
        activeOpacity={1} 
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={{ flex: 1 }}
      >
        {/* Background blurred icon */}
        <Image source={{ uri: app.iconUrl }} style={StyleSheet.absoluteFillObject} blurRadius={24} />
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.82)']}
          style={StyleSheet.absoluteFillObject}
          start={{ x: 0, y: 0.3 }}
          end={{ x: 0, y: 1 }}
        />
        
        {/* Center icon */}
        <View style={styles.featuredCenter}>
          <Image source={{ uri: app.iconUrl }} style={styles.featuredHeroIcon} />
        </View>

        {/* Bottom info */}
        <BlurView intensity={20} tint="dark" style={styles.featuredBottom}>
          <View style={styles.featuredBottomContent}>
            <View style={styles.featuredTag}>
              <Text style={styles.featuredTagText}>{TXT.suggestedTitle.toUpperCase()}</Text>
            </View>
            <View style={styles.featuredTextArea}>
              <Text style={styles.featuredTitle} numberOfLines={1}>{app.name}</Text>
              <Text style={styles.featuredDesc} numberOfLines={1}>{app.description}</Text>
            </View>
            <TouchableOpacity style={styles.featuredGetBtn} onPress={onPress} activeOpacity={0.8}>
              <LinearGradient
                colors={COLORS.primaryGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.featuredGetGradient}
              >
                <Text style={styles.featuredGetText}>{TXT.langName === 'English' ? 'GET' : 'NHẬN'}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </BlurView>
      </TouchableOpacity>
    </Animated.View>
  );
});

// ──────────────────────────────────────────────
// MAIN HOME SCREEN
// ──────────────────────────────────────────────
export default function HomeScreen() {
  useThemeUpdate();
  const router = useRouter();
  const [featuredApp, setFeaturedApp] = useState<AppItem | null>(null);
  const [vipApps, setVipApps] = useState<AppItem[]>([]);
  const [newApps, setNewApps] = useState<AppItem[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollY = useRef(new Animated.Value(0)).current;
  const isLight = COLORS.background === '#F2F2F7';
  
  // Header parallax: title fades at top
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 60],
    outputRange: [1, 0.7],
    extrapolate: 'clamp',
  });

  useEffect(() => {
    Promise.all([fetchRegularApps(), fetchVIPApps()]).then(([regular, vip]) => {
      if (regular.length > 0) setFeaturedApp(regular[Math.floor(Math.random() * Math.min(regular.length, 10))]);
      setVipApps(vip.slice(0, 10));
      setNewApps(regular.slice(0, 6));
      setLoading(false);
    });
  }, []);

  // Ngày hôm nay
  const today = new Date().toLocaleDateString('vi-VN', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <LinearGradient colors={COLORS.bgGradient} style={styles.container}>
      <StatusBar style={isLight ? 'dark' : 'light'} />
      
      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        scrollEventThrottle={16}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
      >
        {/* ── HEADER ── */}
        <Animated.View style={[styles.header, { opacity: headerOpacity }]}>
          <Text style={[styles.dateLabel, { color: COLORS.textMuted }]}>{today.toUpperCase()}</Text>
          <View style={styles.headerRow}>
            <Text style={[styles.largeTitle, { color: COLORS.text }]}>{TXT.discoverTitle}</Text>
            <TouchableOpacity 
              style={[styles.avatarBtn, { borderColor: COLORS.border, backgroundColor: COLORS.surface }]} 
              onPress={() => router.push('/account')}
              activeOpacity={0.8}
            >
              <Image 
                source={{ uri: 'https://ui-avatars.com/api/?name=U&background=0A84FF&color=fff&bold=true' }} 
                style={styles.avatarImg} 
              />
            </TouchableOpacity>
          </View>
        </Animated.View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={[styles.loadingText, { color: COLORS.textMuted }]}>{TXT.loading}</Text>
          </View>
        ) : (
          <>
            {/* ── FEATURED HERO ── */}
            {featuredApp && (
              <View style={styles.sectionPad}>
                <FeaturedCard app={featuredApp} onPress={() => router.push(`/details/${featuredApp.id}`)} />
              </View>
            )}

            {/* ── VIP KHO NỔI BẬT ── */}
            <View style={styles.sectionHeader}>
              <View>
                <Text style={[styles.sectionTitle, { color: COLORS.gold }]}>⭐ {TXT.vip}</Text>
                <Text style={[styles.sectionSubtitle, { color: COLORS.textMuted }]}>{TXT.langName === 'English' ? 'Exclusive apps updated weekly' : 'App độc quyền mỗi tuần'}</Text>
              </View>
              <TouchableOpacity onPress={() => router.push('/vip')} activeOpacity={0.7}>
                <Text style={[styles.seeAll, { color: COLORS.primary }]}>{TXT.langName === 'English' ? 'See all →' : 'Xem tất cả →'}</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false} 
              contentContainerStyle={styles.vipScrollContent}
              decelerationRate="fast"
            >
              {vipApps.map((app, i) => (
                <SmartVIPCard key={app.id} item={app} index={i} />
              ))}
            </ScrollView>

            {/* ── MỚI CẬP NHẬT ── */}
            <View style={styles.sectionHeader}>
              <View>
                <Text style={[styles.sectionTitle, { color: COLORS.text }]}>🔥 {TXT.langName === 'English' ? 'Newly Updated' : 'Mới Cập Nhật'}</Text>
                <Text style={[styles.sectionSubtitle, { color: COLORS.textMuted }]}>{TXT.langName === 'English' ? 'Latest free applications' : 'Ứng dụng miễn phí mới nhất'}</Text>
              </View>
            </View>
            
            <View style={[styles.appListCard, { backgroundColor: COLORS.surfaceCard, borderColor: COLORS.border }]}>
              {newApps.map((app, index) => (
                <AppRowItem 
                  key={app.id} 
                  app={app} 
                  onPress={() => router.push(`/details/${app.id}`)}
                  showDivider={index < newApps.length - 1}
                />
              ))}
            </View>
          </>
        )}
      </Animated.ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingBottom: 130 },
  loadingBox: { alignItems: 'center', justifyContent: 'center', marginTop: 120 },
  loadingText: { fontSize: 14, marginTop: 14 },

  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  dateLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.8,
    marginBottom: 6,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  largeTitle: {
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  avatarBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1.5,
  },
  avatarImg: { width: '100%', height: '100%' },

  sectionPad: { paddingHorizontal: 20, marginBottom: 28 },

  // Featured Hero
  featuredCard: {
    height: 360,
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: '#111',
  },
  featuredCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 80,
  },
  featuredHeroIcon: {
    width: 110,
    height: 110,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  featuredBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 0.8,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  featuredBottomContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  featuredTag: {
    backgroundColor: 'rgba(10, 132, 255, 0.25)',
    borderWidth: 0.8,
    borderColor: 'rgba(10, 132, 255, 0.4)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  featuredTagText: {
    color: '#60BFFF',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
  },
  featuredTextArea: { flex: 1 },
  featuredTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },
  featuredDesc: { color: 'rgba(255,255,255,0.55)', fontSize: 12, marginTop: 2 },
  featuredGetBtn: { height: 34, width: 70, borderRadius: 17, overflow: 'hidden' },
  featuredGetGradient: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  featuredGetText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },

  // Section headers
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  sectionTitle: { fontSize: 22, fontWeight: '800', letterSpacing: -0.4 },
  sectionSubtitle: { fontSize: 12, marginTop: 2 },
  seeAll: { fontSize: 14, fontWeight: '600' },

  // VIP Cards
  vipScrollContent: { paddingLeft: 20, paddingRight: 8, marginBottom: 32, gap: 12 },
  vipCard: {
    width: 104,
    borderRadius: 20,
    padding: 10,
    borderWidth: 0.8,
  },
  vipIconWrapper: { position: 'relative', marginBottom: 8 },
  vipIcon: {
    width: 84,
    height: 84,
    borderRadius: 20,
    backgroundColor: '#1A1A1E',
  },
  vipBadge: {
    position: 'absolute',
    bottom: -5,
    right: -5,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
  },
  vipBadgeText: { color: '#000', fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
  vipName: { fontSize: 12, fontWeight: '700', marginTop: 4, lineHeight: 16 },
  vipSub: { fontSize: 11, marginTop: 2 },

  // App list card
  appListCard: {
    marginHorizontal: 20,
    borderRadius: 24,
    borderWidth: 0.8,
    overflow: 'hidden',
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  appRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
  },
  appIcon: {
    width: 54,
    height: 54,
    borderRadius: 13,
    backgroundColor: '#1C1C1E',
    borderWidth: 0.5,
  },
  appInfo: { flex: 1, marginLeft: 14 },
  appName: { fontSize: 15, fontWeight: '600', marginBottom: 3 },
  appSub: { fontSize: 12 },
  getBtn: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 15,
    borderWidth: 1,
  },
  getBtnText: { fontSize: 13, fontWeight: '800' },
  divider: { height: 0.5, marginLeft: 68 },
});