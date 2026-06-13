import React, { useState, useEffect, memo, useRef, useCallback } from 'react';
import { 
  StyleSheet, Text, View, ScrollView, Image, TouchableOpacity, 
  ActivityIndicator, Animated, Dimensions, Platform, Modal,
  DeviceEventEmitter, Alert
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchRegularApps, fetchVIPApps, AppItem } from '../../constants/data';
import { COLORS, SIZES, SHADOWS, useThemeUpdate, TXT } from '../../constants/theme';
import { SPRINGS, entranceAnim, shimmerLoop } from '../../constants/animations';
import { Sparkles, Flame, BellRing, X, ChevronRight } from 'lucide-react-native';
import { IconSymbol } from '../../components/ui/icon-symbol';
import { TabTransition } from '../../components/ui/TabTransition';
import * as Linking from 'expo-linking';
import { auth, db } from '../../firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

const { width } = Dimensions.get('window');

// ──────────────────────────────────────────────
// VIP Card với animation nhập cảnh
// ──────────────────────────────────────────────
const SmartVIPCard = memo(({ item, index }: { item: AppItem; index: number }) => {
  useThemeUpdate();
  const router = useRouter();
  const [icon, setIcon] = useState(item.iconUrl);
  const slideAnim   = useRef(new Animated.Value(28)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim   = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    entranceAnim(slideAnim, opacityAnim, index * 55).start();
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

  const pressIn  = () => Animated.spring(scaleAnim, { toValue: 0.93, ...SPRINGS.tap }).start();
  const pressOut = () => Animated.spring(scaleAnim, { toValue: 1,    ...SPRINGS.tap }).start();

  return (
    <Animated.View style={[{ transform: [{ translateY: slideAnim }, { scale: scaleAnim }], opacity: opacityAnim }]}>
      <TouchableOpacity
        style={[styles.vipCard, { backgroundColor: COLORS.surfaceCard, borderColor: COLORS.border }]}
        onPress={() => router.push(`/details/${item.id}`)}
        onPressIn={pressIn}
        onPressOut={pressOut}
        activeOpacity={1}
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
const AppRowItem = memo(({ app, onPress, showDivider, index }: { app: AppItem; onPress: () => void; showDivider: boolean; index: number }) => {
  useThemeUpdate();
  const scaleAnim   = useRef(new Animated.Value(1)).current;
  const slideAnim   = useRef(new Animated.Value(22)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const getBtnScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    entranceAnim(slideAnim, opacityAnim, index * 35).start();
  }, []);

  const handlePressIn  = () => Animated.spring(scaleAnim,   { toValue: 0.96, ...SPRINGS.tap }).start();
  const handlePressOut = () => Animated.spring(scaleAnim,   { toValue: 1,    ...SPRINGS.tap }).start();
  const getBtnIn       = () => Animated.spring(getBtnScale, { toValue: 0.88, ...SPRINGS.tap }).start();
  const getBtnOut      = () => Animated.spring(getBtnScale, { toValue: 1,    ...SPRINGS.bounce }).start();

  return (
    <Animated.View style={{ transform: [{ translateY: slideAnim }, { scale: scaleAnim }], opacity: opacityAnim }}>
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
          style={{ zIndex: 10 }}
          onPress={onPress}
          onPressIn={getBtnIn}
          onPressOut={getBtnOut}
          activeOpacity={1}
        >
          <Animated.View style={[styles.getBtn, { borderColor: COLORS.borderActive, backgroundColor: COLORS.primaryGlow, transform: [{ scale: getBtnScale }] }]}>
            <Text style={[styles.getBtnText, { color: COLORS.primary }]}>{TXT.langName === 'English' ? 'GET' : 'NHẬN'}</Text>
          </Animated.View>
        </TouchableOpacity>
      </TouchableOpacity>
      {showDivider && <View style={[styles.divider, { backgroundColor: COLORS.border }]} />}
    </Animated.View>
  );
});



// ──────────────────────────────────────────────
// Shimmer Skeletons for Loading State
// ──────────────────────────────────────────────
const ShimmerRow = ({ isLight, opacity }: { isLight: boolean; opacity: Animated.Value | Animated.AnimatedInterpolation<number> }) => (
  <View style={styles.shimmerRow}>
    <Animated.View style={[styles.shimmerIcon, { backgroundColor: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)', opacity }]} />
    <View style={styles.shimmerTextColumn}>
      <Animated.View style={[styles.shimmerTextLineLong, { backgroundColor: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)', opacity }]} />
      <Animated.View style={[styles.shimmerTextLineShort, { backgroundColor: isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.05)', opacity }]} />
    </View>
    <Animated.View style={[styles.shimmerBtn, { backgroundColor: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)', opacity }]} />
  </View>
);

const ShimmerVipCard = ({ isLight, opacity }: { isLight: boolean; opacity: Animated.Value | Animated.AnimatedInterpolation<number> }) => (
  <View style={[styles.shimmerVipCard, { backgroundColor: isLight ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.02)', borderColor: isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.06)' }]}>
    <Animated.View style={[styles.shimmerVipIcon, { backgroundColor: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)', opacity }]} />
    <Animated.View style={[styles.shimmerVipText1, { backgroundColor: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)', opacity }]} />
    <Animated.View style={[styles.shimmerVipText2, { backgroundColor: isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.05)', opacity }]} />
  </View>
);


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
  const [userData, setUserData] = useState<{ fullname?: string; email?: string } | null>(null);

  const handlePressCreateSign = async () => {
    try {
      const certsStr = await AsyncStorage.getItem('@saved_certs');
      const certs = certsStr ? JSON.parse(certsStr) : [];
      if (!certs || certs.length === 0) {
        Alert.alert(
          TXT.langName === 'English' ? "No Certificate" : "Chưa có chứng chỉ",
          TXT.langName === 'English' 
            ? "You need to import a P12 certificate ZIP before signing apps." 
            : "Sếp cần nạp chứng chỉ ZIP trước khi thực hiện ký app nhé!",
          [
            { text: TXT.langName === 'English' ? "Later" : "Để sau", style: "cancel" },
            { 
              text: TXT.langName === 'English' ? "Import Now" : "Nạp ngay", 
              onPress: () => router.push('/sign?importCert=true') 
            }
          ]
        );
        return;
      }
      router.push('/sign');
    } catch (e) {
      router.push('/sign');
    }
  };

  const getFirstLetter = (name?: string) => {
    if (!name) return 'K';
    return name.charAt(0).toUpperCase();
  };

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const docSnap = await getDoc(doc(db, 'users', user.uid));
          if (docSnap.exists()) {
            setUserData(docSnap.data());
          }
        } catch (e) {
          console.warn("Failed to fetch user data for avatar:", e);
        }
      } else {
        setUserData(null);
      }
    });
    return unsubscribeAuth;
  }, []);
  const scrollY = useRef(new Animated.Value(0)).current;
  const isLight = COLORS.background === '#F4F4F6';

  // ── Staggered entrance animations for page sections ──────────────────────
  const heroSlide   = useRef(new Animated.Value(32)).current;
  const heroOpacity = useRef(new Animated.Value(0)).current;
  const subSlide    = useRef(new Animated.Value(24)).current;
  const subOpacity  = useRef(new Animated.Value(0)).current;
  const cardSlide   = useRef(new Animated.Value(20)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.stagger(80, [
      entranceAnim(heroSlide, heroOpacity, 0),
      entranceAnim(subSlide,  subOpacity,  0),
      entranceAnim(cardSlide, cardOpacity, 0),
    ]).start();
  }, []);

  // ── Press scale refs for action buttons ──────────────────────────────────
  const heroBtnScale    = useRef(new Animated.Value(1)).current;
  const subBtn1Scale    = useRef(new Animated.Value(1)).current;
  const subBtn2Scale    = useRef(new Animated.Value(1)).current;
  const carouselScale   = useRef(new Animated.Value(1)).current;
  const searchBtnScale  = useRef(new Animated.Value(1)).current;
  const avatarBtnScale  = useRef(new Animated.Value(1)).current;

  const lastScrollY = useRef(0);
  const isTabBarHidden = useRef(false);

  useEffect(() => {
    const listenerId = scrollY.addListener(({ value }) => {
      if (value < 0) return;
      
      const diff = value - lastScrollY.current;
      
      if (diff > 12 && value > 80) {
        if (!isTabBarHidden.current) {
          isTabBarHidden.current = true;
          DeviceEventEmitter.emit('hideTabBar');
        }
      } else if (diff < -12 || value < 20) {
        if (isTabBarHidden.current) {
          isTabBarHidden.current = false;
          DeviceEventEmitter.emit('showTabBar');
        }
      }
      
      lastScrollY.current = value;
    });

    return () => {
      scrollY.removeListener(listenerId);
    };
  }, []);

  const [announcement, setAnnouncement] = useState<{
    show: boolean;
    title: string;
    msg: string;
    imgUrl?: string;
    actionUrl?: string;
  } | null>(null);
  const [showHomePopup, setShowHomePopup] = useState(false);
  const shimmerOpacity = useRef(new Animated.Value(0.35)).current;
  
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 60],
    outputRange: [1, 0.7],
    extrapolate: 'clamp',
  });

  useEffect(() => {
    shimmerLoop(shimmerOpacity).start();

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
        <BlurView intensity={25} tint={isLight ? "light" : "dark"} style={styles.homeModalBg}>
          <View style={[styles.homeModalBox, SHADOWS.glowDark, { borderColor: COLORS.border, backgroundColor: isLight ? 'rgba(255, 255, 255, 0.95)' : 'rgba(28, 28, 30, 0.95)' }]}>
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
              <X color={isLight ? "#333" : "#FFF"} size={18} />
            </TouchableOpacity>
            
            {announcement?.imgUrl ? (
              <Image source={{ uri: announcement.imgUrl }} style={styles.homeModalImg} resizeMode="cover" />
            ) : (
              <View style={[styles.homeModalIconCircle, { backgroundColor: isLight ? 'rgba(10, 132, 255, 0.1)' : 'rgba(10, 132, 255, 0.15)', borderColor: COLORS.border }]}>
                <BellRing color={COLORS.primary} size={36} strokeWidth={1.5} />
              </View>
            )}
            
            <Text style={[styles.homeModalTitle, { color: COLORS.text }]}>{announcement?.title}</Text>
            <ScrollView style={styles.homeModalScroll} contentContainerStyle={styles.homeModalScrollContent}>
              <Text style={[styles.homeModalMsg, { color: COLORS.textMuted }]}>{announcement?.msg}</Text>
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
                    <Text style={styles.homeModalBtnText}>{TXT.langName === 'English' ? 'VIEW DETAILS' : 'XEM CHI TIẾT'}</Text>
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
                <Text style={[styles.homeModalCloseText, { color: COLORS.primary }]}>{TXT.langName === 'English' ? 'CLOSE' : 'ĐÓNG'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </BlurView>
      </Modal>

      <TabTransition tabPath="/">
        <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        scrollEventThrottle={16}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
      >
        <Animated.View style={[styles.header, { opacity: headerOpacity }]}>
          <Text style={[styles.dateLabel, { color: COLORS.textMuted }]}>{today.toUpperCase()}</Text>
          <View style={styles.headerRow}>
            <Text style={[styles.largeTitle, { color: COLORS.text }]}>Khám Phá</Text>
            
            <View style={styles.headerRightActions}>
              {/* Search button with press scale */}
              <TouchableOpacity 
                style={{ zIndex: 10 }}
                onPress={() => router.push('/search')}
                onPressIn={() => Animated.spring(searchBtnScale, { toValue: 0.88, ...SPRINGS.tap }).start()}
                onPressOut={() => Animated.spring(searchBtnScale, { toValue: 1, ...SPRINGS.bounce }).start()}
                activeOpacity={1}
              >
                <Animated.View style={[styles.circleActionBtn, { backgroundColor: isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.08)', transform: [{ scale: searchBtnScale }] }]}>
                  <IconSymbol name="magnifyingglass" size={18} color={COLORS.text} />
                </Animated.View>
              </TouchableOpacity>
              
              {/* Avatar button with press scale */}
              <TouchableOpacity 
                style={{ zIndex: 10 }}
                onPress={() => router.push('/account')}
                onPressIn={() => Animated.spring(avatarBtnScale, { toValue: 0.88, ...SPRINGS.tap }).start()}
                onPressOut={() => Animated.spring(avatarBtnScale, { toValue: 1, ...SPRINGS.bounce }).start()}
                activeOpacity={1}
              >
                <Animated.View style={[
                  styles.profileAvatarBtn, 
                  { 
                    backgroundColor: COLORS.surfaceSolid, 
                    borderColor: COLORS.border, 
                    transform: [{ scale: avatarBtnScale }],
                    justifyContent: 'center',
                    alignItems: 'center'
                  }
                ]}>
                  <LinearGradient
                    colors={COLORS.primaryGradient}
                    style={StyleSheet.absoluteFill}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  />
                  <Text style={{ 
                    color: '#FFFFFF', 
                    fontSize: 15, 
                    fontWeight: '800', 
                    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System' 
                  }}>
                    {getFirstLetter(userData?.fullname || userData?.email)}
                  </Text>
                </Animated.View>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>

        {/* Hero CTA Button */}
        <Animated.View style={{ transform: [{ translateY: heroSlide }, { scale: heroBtnScale }], opacity: heroOpacity }}>
          <TouchableOpacity 
            style={[styles.mainCreateBtn, { backgroundColor: COLORS.primary }]} 
            onPress={handlePressCreateSign}
            onPressIn={() => Animated.spring(heroBtnScale, { toValue: 0.95, ...SPRINGS.tap }).start()}
            onPressOut={() => Animated.spring(heroBtnScale, { toValue: 1, ...SPRINGS.bounce }).start()}
            activeOpacity={1}
          >
            <Text style={[styles.mainCreateBtnText, { color: COLORS.textDark }]}>+ Ký IPA mới</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Sub-action pills */}
        <Animated.View style={[styles.subBtnsRow, { transform: [{ translateY: subSlide }], opacity: subOpacity }]}>
          <TouchableOpacity 
            style={{ flex: 1 }}
            onPress={() => router.push('/apps')}
            onPressIn={() => Animated.spring(subBtn1Scale, { toValue: 0.93, ...SPRINGS.tap }).start()}
            onPressOut={() => Animated.spring(subBtn1Scale, { toValue: 1, ...SPRINGS.bounce }).start()}
            activeOpacity={1}
          >
            <Animated.View style={[styles.subBtn, { backgroundColor: COLORS.surfaceSolid, borderColor: COLORS.border, transform: [{ scale: subBtn1Scale }] }]}>
              <IconSymbol name="square.grid.2x2" size={16} color={COLORS.textMuted} />
              <Text style={[styles.subBtnText, { color: COLORS.text }]}>Kho Ứng Dụng</Text>
            </Animated.View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={{ flex: 1 }}
            onPress={() => router.push('/mmo')}
            onPressIn={() => Animated.spring(subBtn2Scale, { toValue: 0.93, ...SPRINGS.tap }).start()}
            onPressOut={() => Animated.spring(subBtn2Scale, { toValue: 1, ...SPRINGS.bounce }).start()}
            activeOpacity={1}
          >
            <Animated.View style={[styles.subBtn, { backgroundColor: COLORS.surfaceSolid, borderColor: COLORS.border, transform: [{ scale: subBtn2Scale }] }]}>
              <IconSymbol name="cart" size={16} color={COLORS.textMuted} />
              <Text style={[styles.subBtnText, { color: COLORS.text }]}>Chợ Việt MMO</Text>
            </Animated.View>
          </TouchableOpacity>
        </Animated.View>

        {/* Carousel card */}
        <Animated.View style={{ transform: [{ translateY: cardSlide }, { scale: carouselScale }], opacity: cardOpacity }}>
          <TouchableOpacity 
            style={[styles.introCarousel, { backgroundColor: COLORS.surfaceSolid, borderColor: COLORS.border }, SHADOWS.glowCard]}
            onPress={() => router.push('/mmo')}
            onPressIn={() => Animated.spring(carouselScale, { toValue: 0.97, ...SPRINGS.tap }).start()}
            onPressOut={() => Animated.spring(carouselScale, { toValue: 1, ...SPRINGS.bounce }).start()}
            activeOpacity={1}
          >
            <View style={styles.carouselContent}>
              <View style={styles.carouselLeft}>
                <Image 
                  source={{ uri: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&auto=format&fit=crop&q=60' }} 
                  style={styles.carouselImg} 
                />
              </View>
              <View style={styles.carouselRight}>
                <Text style={styles.carouselTag}>Chợ Tiện Ích</Text>
                <Text style={[styles.carouselTitle, { color: COLORS.text }]} numberOfLines={1}>Chợ Việt MMO</Text>
                <Text style={[styles.carouselSub, { color: COLORS.textMuted }]} numberOfLines={2}>
                  Mua tài khoản Premium Netflix, Spotify giá rẻ tự động 24/7 siêu mượt mà.
                </Text>
              </View>
            </View>
            <View style={styles.carouselDots}>
              <View style={[styles.dot, styles.activeDot, { backgroundColor: COLORS.text }]} />
              <View style={styles.dot} />
              <View style={styles.dot} />
            </View>
          </TouchableOpacity>
        </Animated.View>

        {announcement && announcement.msg && (
          <TouchableOpacity 
            style={[styles.announcementBanner, { backgroundColor: COLORS.surfaceSolid, borderColor: COLORS.border }, SHADOWS.glowCard]}
            onPress={() => setShowHomePopup(true)}
            activeOpacity={0.8}
          >
            <View style={styles.announcementHeader}>
              <View style={styles.announcementIconBox}>
                <BellRing color={COLORS.gold} size={14} strokeWidth={2.5} />
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
          <View style={styles.skeletonContainer}>
            <View style={styles.sectionHeader}>
              <View style={[styles.shimmerTextLineLong, { width: 120, backgroundColor: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)', height: 20 }]} />
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.vipScrollContent}>
              {[1, 2, 3, 4].map((x) => (
                <ShimmerVipCard key={x} isLight={isLight} opacity={shimmerOpacity} />
              ))}
            </ScrollView>

            <View style={styles.sectionHeader}>
              <View style={[styles.shimmerTextLineLong, { width: 160, backgroundColor: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)', height: 20 }]} />
            </View>
            <View style={[styles.appListCard, { backgroundColor: COLORS.surfaceSolid, borderColor: COLORS.border }]}>
              {[1, 2, 3].map((x, i) => (
                <View key={x}>
                  <ShimmerRow isLight={isLight} opacity={shimmerOpacity} />
                  {i < 2 && <View style={[styles.divider, { backgroundColor: COLORS.border }]} />}
                </View>
              ))}
            </View>
          </View>
        ) : (
          <>
            <View style={styles.sectionHeader}>
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                  <Sparkles size={20} color={COLORS.gold} fill={COLORS.gold} />
                  <Text style={[styles.sectionTitle, { color: COLORS.text, marginBottom: 0 }]}>{TXT.vip}</Text>
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

            <View style={styles.sectionHeader}>
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                  <Flame size={20} color={COLORS.text} fill={COLORS.text} />
                  <Text style={[styles.sectionTitle, { color: COLORS.text, marginBottom: 0 }]}>{TXT.langName === 'English' ? 'Newly Updated' : 'Mới Cập Nhật'}</Text>
                </View>
                <Text style={[styles.sectionSubtitle, { color: COLORS.textMuted }]}>{TXT.langName === 'English' ? 'Latest free applications' : 'Ứng dụng miễn phí mới nhất'}</Text>
              </View>
            </View>
            
            <View style={[styles.appListCard, { backgroundColor: COLORS.surfaceSolid, borderColor: COLORS.border }]}>
              {newApps.map((app, index) => (
                <AppRowItem 
                  key={app.id} 
                  app={app} 
                  onPress={() => router.push(`/details/${app.id}`)}
                  showDivider={index < newApps.length - 1}
                  index={index}
                />
              ))}
            </View>
          </>
        )}
        </Animated.ScrollView>
      </TabTransition>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingBottom: 130 },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  dateLabel: {
    fontSize: 11,
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
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  circleActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.03)',
  },
  profileAvatarBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 0.8,
    overflow: 'hidden',
  },
  profileAvatar: {
    width: '100%',
    height: '100%',
  },
  mainCreateBtn: {
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 12,
    marginTop: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  mainCreateBtnText: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  subBtnsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 20,
    marginBottom: 20,
    gap: 12,
  },
  subBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 46,
    borderRadius: 23,
    borderWidth: 0.8,
  },
  subBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  introCarousel: {
    marginHorizontal: 20,
    borderRadius: SIZES.radiusCard,
    borderWidth: 0.8,
    padding: 14,
    marginBottom: 25,
  },
  carouselContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  carouselLeft: {
    width: 90,
    height: 72,
    borderRadius: 12,
    overflow: 'hidden',
    marginRight: 14,
  },
  carouselImg: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  carouselRight: {
    flex: 1,
  },
  carouselTag: {
    fontSize: 10,
    fontWeight: '800',
    color: '#8E8E93',
    textTransform: 'uppercase',
    marginBottom: 2,
    letterSpacing: 0.5,
  },
  carouselTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  carouselSub: {
    fontSize: 11,
    lineHeight: 16,
  },
  carouselDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginTop: 10,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#E5E5EA',
  },
  activeDot: {
    width: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  sectionTitle: { fontSize: 20, fontWeight: '800', letterSpacing: -0.4 },
  sectionSubtitle: { fontSize: 11, marginTop: 2 },
  seeAll: { fontSize: 13, fontWeight: '600' },
  vipScrollContent: { paddingLeft: 20, paddingRight: 8, marginBottom: 32, gap: 12 },
  vipCard: {
    width: 104,
    borderRadius: SIZES.radiusCard,
    padding: 10,
    borderWidth: 0.8,
  },
  vipIconWrapper: { position: 'relative', marginBottom: 8 },
  vipIcon: {
    width: 84,
    height: 84,
    borderRadius: SIZES.radiusCard,
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
  appListCard: {
    marginHorizontal: 20,
    borderRadius: SIZES.radiusSquircle,
    borderWidth: 0.8,
    overflow: 'hidden',
    paddingHorizontal: 16,
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 12,
    elevation: 1,
  },
  appRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
  },
  appIcon: {
    width: 54,
    height: 54,
    borderRadius: 14,
    backgroundColor: '#1C1C1E',
    borderWidth: 0.5,
  },
  appInfo: { flex: 1, marginLeft: 14 },
  appName: { fontSize: 15, fontWeight: '700', marginBottom: 3 },
  appSub: { fontSize: 11 },
  getBtn: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 99,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  getBtnText: { fontSize: 12, fontWeight: '800' },
  divider: { height: 0.5, marginLeft: 68 },
  announcementBanner: {
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: SIZES.radiusCard,
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
  shimmerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
  },
  shimmerIcon: {
    width: 54,
    height: 54,
    borderRadius: SIZES.radiusButton,
  },
  shimmerTextColumn: {
    flex: 1,
    marginLeft: 14,
    gap: 8,
  },
  shimmerTextLineLong: {
    height: 14,
    borderRadius: 4,
    width: '70%',
  },
  shimmerTextLineShort: {
    height: 10,
    borderRadius: 4,
    width: '40%',
  },
  shimmerBtn: {
    width: 70,
    height: 30,
    borderRadius: 15,
  },
  shimmerVipCard: {
    width: 104,
    borderRadius: SIZES.radiusCard,
    padding: 10,
    borderWidth: 0.8,
    alignItems: 'center',
    gap: 8,
  },
  shimmerVipIcon: {
    width: 84,
    height: 84,
    borderRadius: SIZES.radiusCard,
  },
  shimmerVipText1: {
    height: 12,
    borderRadius: 3,
    width: '80%',
  },
  shimmerVipText2: {
    height: 10,
    borderRadius: 3,
    width: '50%',
  },
  skeletonContainer: {
    marginTop: 10,
  },
  homeModalBg: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  homeModalBox: {
    width: '100%',
    maxWidth: 340,
    borderRadius: SIZES.radiusSquircle,
    borderWidth: 0.8,
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
    backgroundColor: 'rgba(0,0,0,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  homeModalImg: {
    width: '100%',
    height: 180,
    backgroundColor: '#000',
  },
  homeModalIconCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 35,
    marginBottom: 15,
    borderWidth: 1,
  },
  homeModalTitle: {
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
    borderRadius: SIZES.radiusButton,
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
    borderRadius: SIZES.radiusButton,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 0.8,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  homeModalCloseText: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});