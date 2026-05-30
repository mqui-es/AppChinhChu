import React, { useState, useEffect, memo } from 'react';
import { StyleSheet, Text, View, ScrollView, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { fetchRegularApps, fetchVIPApps, AppItem } from '../../constants/data';
import { COLORS, SIZES, SHADOWS, useThemeUpdate, TXT } from '../../constants/theme';

// ==========================================
// THẺ VIP THÔNG MINH: Lướt tới đâu lấy ảnh tới đó
// ==========================================
const SmartVIPCard = memo(({ item }: { item: AppItem }) => {
  useThemeUpdate();
  const router = useRouter();
  const [icon, setIcon] = useState(item.iconUrl);
  const styles = getStyles(COLORS);

  useEffect(() => {
    if (icon.includes('ui-avatars')) {
      let searchName = item.name.toLowerCase().replace(/(plus|\+|deluxe|lrd|pro|premium|cheat|hack|crack|ipaviet site)/ig, '').trim();
      if (searchName.includes('yt')) searchName = 'youtube';

      fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(searchName)}&entity=software&limit=1&country=vn`)
        .then(res => res.json())
        .then(data => {
          if (data.results && data.results.length > 0) {
            setIcon(data.results[0].artworkUrl512);
            item.iconUrl = data.results[0].artworkUrl512;
          }
        }).catch(() => {});
    }
  }, []);

  return (
    <TouchableOpacity 
      style={[styles.hCard, SHADOWS.glowCard]} 
      onPress={() => router.push(`/details/${item.id}`)}
      activeOpacity={0.8}
    >
      <View style={styles.hIconWrapper}>
        <Image source={{uri: icon}} style={styles.hIcon}/>
        <LinearGradient
          colors={COLORS.goldGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hVipBadge}
        >
          <Text style={styles.hVipBadgeText}>VIP</Text>
        </LinearGradient>
      </View>
      <Text style={styles.hName} numberOfLines={1}>{item.name}</Text>
      <Text style={styles.hSub} numberOfLines={1}>{item.category}</Text>
    </TouchableOpacity>
  );
});

export default function HomeScreen() {
  useThemeUpdate();
  const router = useRouter();
  const [featuredApp, setFeaturedApp] = useState<AppItem | null>(null);
  const [vipApps, setVipApps] = useState<AppItem[]>([]);
  const [newApps, setNewApps] = useState<AppItem[]>([]);
  const [loading, setLoading] = useState(true);
  const styles = getStyles(COLORS);

  useEffect(() => {
    Promise.all([fetchRegularApps(), fetchVIPApps()]).then(([regular, vip]) => {
      if (regular.length > 0) setFeaturedApp(regular[Math.floor(Math.random() * Math.min(regular.length, 10))]);
      setVipApps(vip.slice(0, 8)); // Lấy 8 app VIP cho trang chủ
      setNewApps(regular.slice(0, 5));
      setLoading(false);
    });
  }, []);

  const isLightMode = COLORS.background === '#F2F2F7';

  return (
    <LinearGradient colors={COLORS.bgGradient} style={styles.container}>
      <StatusBar style={isLightMode ? 'dark' : 'light'} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{paddingBottom: 140}}>
        
        <View style={styles.header}>
          <Text style={styles.dateText}>{TXT.today.toUpperCase()}</Text>
          <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
            <Text style={styles.largeTitle}>Khám phá</Text>
            <TouchableOpacity style={styles.profileBtn} onPress={() => router.push('/account')}>
              <Image source={{uri: 'https://ui-avatars.com/api/?name=Admin&background=0A84FF&color=fff'}} style={styles.profileImg} />
            </TouchableOpacity>
          </View>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={COLORS.primary} style={{marginTop: 100}}/>
        ) : (
          <>
            {/* THẺ CARD NỔI BẬT TOÀN MÀN HÌNH */}
            {featuredApp && (
              <TouchableOpacity style={[styles.featuredCard, SHADOWS.glowDark]} activeOpacity={0.9} onPress={() => router.push(`/details/${featuredApp.id}`)}>
                <Image source={{ uri: featuredApp.iconUrl }} style={styles.featuredImage} blurRadius={20} />
                
                <View style={styles.featuredCardHeroContainer}>
                  <Image source={{ uri: featuredApp.iconUrl }} style={styles.featuredHeroIcon} />
                </View>

                <View style={styles.featuredOverlay}>
                  <BlurView intensity={30} tint={isLightMode ? 'light' : 'dark'} style={StyleSheet.absoluteFill} />
                  <View style={styles.featuredOverlayContent}>
                    <View style={styles.featuredTextWrapper}>
                      <Text style={styles.featuredSubtitle}>ĐỀ XUẤT CHO BẠN</Text>
                      <Text style={styles.featuredTitle} numberOfLines={1}>{featuredApp.name}</Text>
                      <Text style={styles.featuredDesc} numberOfLines={1}>{featuredApp.description}</Text>
                    </View>
                    <TouchableOpacity style={styles.featuredGetButton} activeOpacity={0.8} onPress={() => router.push(`/details/${featuredApp.id}`)}>
                      <LinearGradient
                        colors={COLORS.primaryGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.featuredGetGradient}
                      >
                        <Text style={styles.featuredGetText}>NHẬN</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            )}

            {/* KHO VIP NỔI BẬT (Sử dụng thẻ thông minh) */}
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, {color: COLORS.gold}]}>Kho VIP Nổi Bật</Text>
              <Text style={styles.sectionSeeAll} onPress={() => router.push('/vip')}>Xem tất cả</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{paddingLeft: 20, marginBottom: 30}}>
              {vipApps.map((app) => (
                <SmartVIPCard key={app.id} item={app} />
              ))}
            </ScrollView>

            {/* DANH SÁCH APP MỚI NHẤT (Kho thường) */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Mới Cập Nhật</Text>
            </View>
            <View style={[styles.listContainer, SHADOWS.glowCard]}>
              <BlurView intensity={20} tint={isLightMode ? 'light' : 'dark'} style={StyleSheet.absoluteFill} />
              <View style={styles.listInside}>
                {newApps.map((app, index) => (
                  <View key={app.id}>
                    <TouchableOpacity style={styles.appRow} activeOpacity={0.7} onPress={() => router.push(`/details/${app.id}`)}>
                      <Image source={{ uri: app.iconUrl }} style={styles.appIconSmall} />
                      <View style={styles.appInfo}>
                        <Text style={styles.appName} numberOfLines={1}>{app.name}</Text>
                        <Text style={styles.appSub} numberOfLines={1}>{app.sub}</Text>
                      </View>
                      <TouchableOpacity style={styles.getButton} activeOpacity={0.8} onPress={() => router.push(`/details/${app.id}`)}>
                        <Text style={styles.getButtonText}>NHẬN</Text>
                      </TouchableOpacity>
                    </TouchableOpacity>
                    {index < newApps.length - 1 && <View style={styles.divider} />}
                  </View>
                ))}
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </LinearGradient>
  );
}

const getStyles = (theme: typeof COLORS) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  header: { paddingTop: 60, paddingHorizontal: 20, marginBottom: 15 },
  dateText: { color: theme.textMuted, fontSize: 13, fontWeight: '700', marginBottom: 5, letterSpacing: 1.5 },
  largeTitle: { color: theme.text, fontSize: 34, fontWeight: '800', letterSpacing: -0.5 },
  profileBtn: { width: 38, height: 38, borderRadius: 19, overflow: 'hidden', borderWidth: 1, borderColor: theme.border },
  profileImg: { width: '100%', height: '100%' },
  
  featuredCard: { 
    marginHorizontal: 20, 
    height: 380, 
    borderRadius: SIZES.radiusSquircle, 
    overflow: 'hidden', 
    marginBottom: 30, 
    backgroundColor: theme.surfaceSolid,
    borderWidth: 0.8,
    borderColor: theme.border,
  },
  featuredImage: { 
    position: 'absolute',
    width: '100%', 
    height: '100%', 
    opacity: 0.35
  },
  featuredCardHeroContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 90,
  },
  featuredHeroIcon: {
    width: 100,
    height: 100,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: theme.border,
  },
  featuredOverlay: { 
    position: 'absolute', 
    bottom: 0, 
    left: 0, 
    right: 0, 
    height: 96, 
    borderTopWidth: 0.8,
    borderColor: theme.border,
    overflow: 'hidden',
  },
  featuredOverlayContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    height: '100%',
    justifyContent: 'space-between',
  },
  featuredTextWrapper: {
    flex: 1,
    marginRight: 15,
  },
  featuredSubtitle: { 
    color: theme.primaryLight, 
    fontSize: 11, 
    fontWeight: '800', 
    marginBottom: 2, 
    letterSpacing: 1.5,
  },
  featuredTitle: { 
    color: theme.text, 
    fontSize: 22, 
    fontWeight: '800', 
    marginBottom: 2,
  },
  featuredDesc: { 
    color: theme.textMuted, 
    fontSize: 13, 
  },
  featuredGetButton: {
    width: 76,
    height: 32,
    borderRadius: 16,
    overflow: 'hidden',
  },
  featuredGetGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  featuredGetText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 15 },
  sectionTitle: { fontSize: 22, fontWeight: '800', color: theme.text, letterSpacing: -0.5 },
  sectionSeeAll: { color: theme.primary, fontSize: 16, fontWeight: '600' },
  
  hCard: { width: 96, marginRight: 16 },
  hIconWrapper: {
    position: 'relative',
    width: 96, 
    height: 96,
    marginBottom: 8,
  },
  hIcon: { 
    width: 96, 
    height: 96, 
    borderRadius: 22, 
    backgroundColor: theme.surfaceSolid, 
    borderWidth: 0.8, 
    borderColor: theme.border 
  },
  hVipBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.background,
  },
  hVipBadgeText: {
    color: '#000000',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  hName: { color: theme.text, fontSize: 13, fontWeight: '600', marginTop: 4 },
  hSub: { color: theme.textMuted, fontSize: 11, marginTop: 1 },

  listContainer: { 
    marginHorizontal: 20, 
    borderRadius: SIZES.radiusSquircle,
    overflow: 'hidden',
    borderWidth: 0.8,
    borderColor: theme.border,
    backgroundColor: theme.surfaceCard,
  },
  listInside: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  appRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  appIconSmall: { width: 56, height: 56, borderRadius: 13, backgroundColor: theme.surfaceSolid, borderWidth: 0.5, borderColor: theme.border },
  appInfo: { flex: 1, marginLeft: 14, justifyContent: 'center' },
  appName: { color: theme.text, fontSize: 15, fontWeight: '600', marginBottom: 3 },
  appSub: { color: theme.textMuted, fontSize: 12 },
  getButton: { backgroundColor: theme.surfaceAccent, paddingHorizontal: 16, paddingVertical: 6, borderRadius: 15, borderWidth: 0.8, borderColor: theme.border },
  getButtonText: { color: theme.primary, fontSize: 13, fontWeight: '800' },
  divider: { height: 0.5, backgroundColor: theme.border, marginLeft: 70 }
});