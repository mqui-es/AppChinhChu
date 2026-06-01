import React, { useState, useEffect, memo, useRef } from 'react';
import { 
  StyleSheet, Text, View, ScrollView, Image, TouchableOpacity, 
  ActivityIndicator, Animated, Dimensions, Platform, Modal 
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchRegularApps, fetchVIPApps, AppItem } from '../../constants/data';
import { COLORS, SIZES, SHADOWS, useThemeUpdate, TXT } from '../../constants/theme';
import { Sparkles, Flame, BellRing, X } from 'lucide-react-native';
import * as Linking from 'expo-linking';
import { db } from '../../firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';

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

  const [announcement, setAnnouncement] = useState<{
    show: boolean;
    title: string;
    msg: string;
    imgUrl?: string;
    actionUrl?: string;
  } | null>(null);
  const [showHomePopup, setShowHomePopup] = useState(false);
  
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

    const checkHomeAnnouncement = async () => {
      try {
        const snap = await getDoc(doc(db, 'settings', 'config'));
        if (snap.exists()) {
          const data = snap.data();
          if (data.homePopupShow) {
            const ann = {
              show: data.homePopupShow,
              title: data.homePopupTitle || 'Thông báo',
              msg: data.homePopupMsg || '',
              imgUrl: data.homePopupImg || '',
              actionUrl: data.homePopupUrl || '',
            };
            setAnnouncement(ann);
            
            // Check if user has already seen this announcement
            const key = `seen_announcement_${data.homePopupTitle}_${data.homePopupMsg}_${data.homePopupImg}`;
            const hasSeen = await AsyncStorage.getItem(key);
            if (!hasSeen) {
              setShowHomePopup(true);
            }
          }
        }
      } catch (e) {
        console.warn("Failed to check home announcement:", e);
      }
    };
    checkHomeAnnouncement();
  }, []);

  const today = new Date().toLocaleDateString('vi-VN', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <LinearGradient colors={COLORS.bgGradient} style={styles.container}>
      <StatusBar style={isLight ? 'dark' : 'light'} />

      <Modal visible={showHomePopup && !!announcement} transparent animationType="fade">
        <View style={styles.homeModalBg}>
          <View style={[styles.homeModalBox, SHADOWS.glowDark]}>
            <TouchableOpacity 
              style={styles.homeModalCloseBtn} 
              onPress={async () => {
                if (announcement) {
                  const key = `seen_announcement_${announcement.title}_${announcement.msg}_${announcement.imgUrl}`;
                  await AsyncStorage.setItem(key, 'true');
                }
                setShowHomePopup(false);
              }}
            >
              <X color="#FFF" size={20} />
            </TouchableOpacity>
            
            {announcement?.imgUrl ? (
              <Image source={{ uri: announcement.imgUrl }} style={styles.homeModalImg} resizeMode="cover" />
            ) : (
              <View style={styles.homeModalIconCircle}>
                <BellRing color={COLORS.primary} size={40} strokeWidth={1.5} />
              </View>
            )}
            
            <Text style={styles.homeModalTitle}>{announcement?.title}</Text>
            <ScrollView style={styles.homeModalScroll} contentContainerStyle={styles.homeModalScrollContent}>
              <Text style={styles.homeModalMsg}>{announcement?.msg}</Text>
            </ScrollView>

            <View style={styles.homeModalButtons}>
              {announcement?.actionUrl ? (
                <TouchableOpacity 
                  style={styles.homeModalActionBtn} 
                  activeOpacity={0.8} 
                  onPress={async () => {
                    if (announcement) {
                      const key = `seen_announcement_${announcement.title}_${announcement.msg}_${announcement.imgUrl}`;
                      await AsyncStorage.setItem(key, 'true');
                    }
                    setShowHomePopup(false);
                    if (announcement?.actionUrl) {
                      Linking.openURL(announcement.actionUrl).catch(() => {});
                    }
                  }}
                >
                  <LinearGradient colors={COLORS.primaryGradient} start={{x:0, y:0}} end={{x:1, y:0}} style={styles.homeModalBtnGradient}>
                    <Text style={styles.homeModalBtnText}>XEM CHI TIẾT</Text>
                  </LinearGradient>
                </TouchableOpacity>
              ) : null}
              
              <TouchableOpacity 
                style={[styles.homeModalBtn, { marginTop: announcement?.actionUrl ? 10 : 0 }]} 
                activeOpacity={0.8} 
                onPress={async () => {
                  if (announcement) {
                    const key = `seen_announcement_${announcement.title}_${announcement.msg}_${announcement.imgUrl}`;
                    await AsyncStorage.setItem(key, 'true');
                  }
                  setShowHomePopup(false);
                }}
              >
                <Text style={styles.homeModalCloseText}>ĐÓNG</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      
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

        {/* ── INLINE ANNOUNCEMENT BANNER ── */}
        {announcement && announcement.msg && (
          <TouchableOpacity 
            style={[styles.announcementBanner, { backgroundColor: COLORS.surfaceCard, borderColor: COLORS.border }, SHADOWS.glowCard]}
            onPress={() => setShowHomePopup(true)}
            activeOpacity={0.8}
          >
            <View style={styles.announcementHeader}>
              <View style={styles.announcementIconBox}>
                <BellRing color={COLORS.primary} size={14} strokeWidth={2.5} />
              </View>
              <Text style={[styles.announcementTitle, { color: COLORS.text }]} numberOfLines={1}>
                {announcement.title}
              </Text>
            </View>
            <Text style={[styles.announcementText, { color: COLORS.textMuted }]} numberOfLines={2}>
              {announcement.msg}
            </Text>
          </TouchableOpacity>
        )}

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
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                  <Sparkles size={20} color={COLORS.gold} fill={COLORS.gold} />
                  <Text style={[styles.sectionTitle, { color: COLORS.gold, marginBottom: 0 }]}>{TXT.vip}</Text>
                </View>
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
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                  <Flame size={20} color={COLORS.text} fill={COLORS.text} />
                  <Text style={[styles.sectionTitle, { color: COLORS.text, marginBottom: 0 }]}>{TXT.langName === 'English' ? 'Newly Updated' : 'Mới Cập Nhật'}</Text>
                </View>
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
  announcementBanner: {
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 20,
    borderWidth: 0.8,
    padding: 16,
  },
  announcementHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  announcementIconBox: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 69, 58, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 69, 58, 0.25)',
  },
  announcementTitle: {
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
  },
  announcementText: {
    fontSize: 13,
    lineHeight: 18,
  },
  homeModalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  homeModalBox: {
    backgroundColor: '#1C1C1E',
    width: '100%',
    maxWidth: 340,
    borderRadius: 28,
    borderWidth: 0.8,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
    alignItems: 'center',
  },
  homeModalCloseBtn: {
    position: 'absolute',
    top: 15,
    right: 15,
    zIndex: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  homeModalImg: {
    width: '100%',
    height: 180,
    backgroundColor: '#000',
  },
  homeModalIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 69, 58, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 35,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 69, 58, 0.2)',
  },
  homeModalTitle: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '800',
    marginTop: 20,
    paddingHorizontal: 20,
    textAlign: 'center',
  },
  homeModalScroll: {
    maxHeight: 180,
    width: '100%',
    marginTop: 12,
    marginBottom: 25,
    paddingHorizontal: 20,
  },
  homeModalScrollContent: {
    paddingBottom: 10,
  },
  homeModalMsg: {
    color: '#D1D1D6',
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
  },
  homeModalButtons: {
    width: '100%',
    paddingHorizontal: 20,
    paddingBottom: 25,
  },
  homeModalActionBtn: {
    width: '100%',
    height: 50,
    borderRadius: 15,
    overflow: 'hidden',
  },
  homeModalBtnGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  homeModalBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  homeModalBtn: {
    width: '100%',
    height: 48,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 0.8,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  homeModalCloseText: {
    color: '#8E8E93',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});