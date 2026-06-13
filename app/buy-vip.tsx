import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Image, ActivityIndicator, Alert, ScrollView, Platform, Animated } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { GlassView } from '../components/ui/GlassView';
import { LinearGradient } from 'expo-linear-gradient';

// 🔴 SVG TỪ LUCIDE
import { X, Sparkles, CheckCircle, Send, Rocket, Gem } from 'lucide-react-native';

import { auth, db } from '../firebaseConfig';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { COLORS, SIZES, SHADOWS, useThemeUpdate } from '../constants/theme';
import { SPRINGS, entranceAnim } from '../constants/animations';

const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyXnH5KjwQVafxGW_W2KlpDY9KHBx_0TAmaNZBqUaPz9WR8T1PDKwB9un37fNA_YO7pmg/exec";
const BANK_ID = "ACB"; const ACCOUNT_NO = "22703611"; const ACCOUNT_NAME = "TRAN NGUYEN MINH QUI"; 

const PACKAGES = [
  { id: '14D', name: 'Trải Nghiệm', price: 20000, days: 14, icon: Send, badge: '' },
  { id: '30D', name: 'VIP 1 Tháng', price: 40000, days: 30, icon: Rocket, badge: '🔥 ĐỀ XUẤT' },
  { id: '1Y', name: 'VIP 1 Năm', price: 300000, days: 365, icon: Gem, badge: 'TIẾT KIỆM 40%' },
];

const VIP_FEATURES = [
  "Mở khóa toàn bộ Kho Ứng Dụng Độc Quyền",
  "Tốc độ tải ứng dụng cực cao (Không giới hạn)",
  "Không có quảng cáo khó chịu từ hệ thống",
  "Chứng chỉ luôn được gia hạn tự động ổn định",
  "Hỗ trợ cài đặt trực tiếp qua OTA nhanh gọn",
  "Ký và cài đặt file IPA ngoại tuyến của riêng bạn"
];

// ─── PackCard (extracted so hooks work correctly) ───────────────────────────
function PackCard({
  pack, idx, isActive, isBestSeller, isLight, onSelect
}: {
  pack: typeof PACKAGES[0];
  idx: number;
  isActive: boolean;
  isBestSeller: boolean;
  isLight: boolean;
  onSelect: () => void;
}) {
  const cardStyles = getStyles(COLORS);
  const cardScale = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const SvgIcon   = pack.icon;

  useEffect(() => {
    entranceAnim(slideAnim, fadeAnim, idx * 80).start();
  }, []);

  const handlePress = () => {
    Animated.spring(cardScale, { toValue: 0.93, ...SPRINGS.tap }).start(() => {
      Animated.spring(cardScale, { toValue: 1, ...SPRINGS.bounce }).start();
    });
    onSelect();
  };

  return (
    <Animated.View style={{ transform: [{ translateY: slideAnim }, { scale: cardScale }], opacity: fadeAnim }}>
      <TouchableOpacity
        style={[cardStyles.packCard, isActive && cardStyles.packCardActive, isBestSeller && !isActive && cardStyles.packCardHot]}
        onPress={handlePress}
        activeOpacity={0.85}
      >
        {pack.badge ? <View style={[cardStyles.badge, isActive && { backgroundColor: COLORS.danger }]}><Text style={cardStyles.badgeText}>{pack.badge}</Text></View> : null}
        <SvgIcon color={isActive ? COLORS.gold : COLORS.textMuted} size={36} strokeWidth={1.5} style={{ marginBottom: 10 }} />
        <Text style={[cardStyles.packName, isActive && { color: isLight ? COLORS.text : '#FFF' }]}>{pack.name}</Text>
        <Text style={[cardStyles.packPrice, isActive && { color: COLORS.gold, fontSize: 20 }]}>{pack.price.toLocaleString('vi-VN')}đ</Text>
        <Text style={cardStyles.packDays}>Sử dụng {pack.days} ngày</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function BuyVipScreen() {
  useThemeUpdate();
  const styles = getStyles(COLORS);
  const isLight = COLORS.background === '#F4F4F6';
  const router = useRouter();
  const [packages, setPackages] = useState(PACKAGES);
  const [selectedPack, setSelectedPack] = useState(PACKAGES[1]); 
  const [vipFeatures, setVipFeatures] = useState(VIP_FEATURES);
  const [is14DayEnabled, setIs14DayEnabled] = useState(true);
  const [orderId, setOrderId] = useState('');
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [qrUrl, setQrUrl] = useState('');

  const payBtnScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const fetchSettings = async () => {
      const snap = await getDoc(doc(db, 'settings', 'config'));
      if (snap.exists()) {
        const data = snap.data();
        setIs14DayEnabled(data.enable14Days !== false);
        
        // Update package prices dynamically if they exist in DB
        const updatedPacks = PACKAGES.map(p => {
          if (p.id === '14D' && data.vipPrice14D !== undefined) {
            return { ...p, price: Number(data.vipPrice14D) };
          }
          if (p.id === '30D' && data.vipPrice30D !== undefined) {
            return { ...p, price: Number(data.vipPrice30D) };
          }
          if (p.id === '1Y' && data.vipPrice1Y !== undefined) {
            return { ...p, price: Number(data.vipPrice1Y) };
          }
          return p;
        });
        setPackages(updatedPacks);
        
        // Update selected pack to match the updated pack in packages state
        const activePack = updatedPacks.find(p => p.id === '30D');
        if (activePack) setSelectedPack(activePack);

        // Update features list dynamically
        if (data.vipFeaturesText) {
          const lines = data.vipFeaturesText
            .split('\n')
            .map((l: string) => l.trim())
            .filter((l: string) => l.length > 0);
          if (lines.length > 0) {
            setVipFeatures(lines);
          }
        }
      }
    };
    fetchSettings();
  }, []);

  const handleCreateOrder = async () => {
    if (!auth.currentUser) return;
    setIsCreatingOrder(true);
    const newOrderId = `IPA${auth.currentUser.uid.substring(0, 4).toUpperCase()}${Date.now().toString().slice(-4)}`;
    try {
      const res = await fetch(`${SCRIPT_URL}?action=create_order&orderId=${newOrderId}&uid=${auth.currentUser.uid}&amount=${selectedPack.price}&coins=${selectedPack.days}`);
      const json = await res.json();
      if (json.success) {
        setOrderId(newOrderId);
        setQrUrl(`https://img.vietqr.io/image/${BANK_ID}-${ACCOUNT_NO}-compact2.png?amount=${selectedPack.price}&addInfo=${newOrderId}&accountName=${encodeURIComponent(ACCOUNT_NAME)}`);
      } else { Alert.alert('Lỗi tạo đơn', json.error); }
    } catch (error) { Alert.alert('Lỗi mạng', 'Không thể kết nối đến máy chủ.'); }
    setIsCreatingOrder(false);
  };

  const checkAutoBanking = async () => {
    if (!orderId) return;
    setIsChecking(true);
    try {
      const res = await fetch(`${SCRIPT_URL}?action=check_stc_payment&orderId=${orderId}&amount=${selectedPack.price}`);
      const json = await res.json();
      if (json.success) {
        const uid = auth.currentUser!.uid;
        const snap = await getDoc(doc(db, 'users', uid));
        const now = Date.now();
        const currentExpiry = snap.exists() ? (snap.data().vipExpiration || now) : now;
        const addedDays = parseInt(json.coins) || selectedPack.days; 
        const newExpiry = (currentExpiry > now ? currentExpiry : now) + (addedDays * 24 * 60 * 60 * 1000); 

        await updateDoc(doc(db, 'users', uid), { isVip: true, vipExpiration: newExpiry });
        Alert.alert('🎉 Lên VIP Thành Công!', `Tài khoản đã được cộng thêm ${addedDays} ngày VIP!`, [{ text: 'Trải nghiệm ngay', onPress: () => router.back() }]);
      } else { Alert.alert('Chưa nhận được tiền', json.error || 'Vui lòng chờ 10 giây!'); }
    } catch (error) { Alert.alert('Lỗi', 'Mất kết nối.'); }
    setIsChecking(false);
  };

  return (
    <LinearGradient colors={COLORS.bgGradient} style={styles.container}>
      <StatusBar style={isLight ? 'dark' : 'light'} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <X color={COLORS.text} size={20} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>NÂNG CẤP TÀI KHOẢN</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>Chọn gói ưu đãi</Text>
        <View style={styles.packWrapper}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap: 15, paddingVertical: 15}}>
            {packages.filter(p => p.id !== '14D' || is14DayEnabled).map((pack, idx) => (
              <PackCard
                key={pack.id}
                pack={pack}
                idx={idx}
                isActive={selectedPack.id === pack.id}
                isBestSeller={pack.id === '30D'}
                isLight={isLight}
                onSelect={() => { setSelectedPack(pack); setOrderId(''); setQrUrl(''); }}
              />
            ))}
          </ScrollView>
        </View>

        {/* PERKS LIST */}
        <View style={[styles.perkCard, SHADOWS.glowCard]}>
          <GlassView intensity={10} tint={isLight ? 'light' : 'dark'} style={StyleSheet.absoluteFill} />
          <View style={styles.perkInside}>
            <Text style={styles.perkTitle}>Quyền lợi khi là thành viên VIP</Text>
            {vipFeatures.map((feat, idx) => (
              <View key={idx} style={styles.perkRow}>
                 <CheckCircle color={COLORS.gold} size={18} style={{marginRight: 10, marginTop: 2}} />
                 <Text style={styles.perkText}>{feat}</Text>
              </View>
            ))}
          </View>
        </View>

        {!orderId ? (
          <TouchableOpacity 
            style={[styles.createOrderBtn, SHADOWS.glowGold]} 
            onPress={handleCreateOrder}
            onPressIn={() => Animated.spring(payBtnScale, { toValue: 0.94, ...SPRINGS.tap }).start()}
            onPressOut={() => Animated.spring(payBtnScale, { toValue: 1, ...SPRINGS.bounce }).start()}
            disabled={isCreatingOrder}
            activeOpacity={1}
          >
            <Animated.View style={{ transform: [{ scale: payBtnScale }] }}>
              <LinearGradient colors={COLORS.goldGradient} start={{x:0, y:0}} end={{x:1, y:0}} style={styles.createOrderBtnGradient}>
                {isCreatingOrder ? <ActivityIndicator color="#000" /> : <Text style={styles.createOrderText}>THANH TOÁN {selectedPack.price.toLocaleString('vi-VN')}đ</Text>}
              </LinearGradient>
            </Animated.View>
          </TouchableOpacity>
        ) : (
          <View style={[styles.qrBox, SHADOWS.glowDark]}>
            <GlassView intensity={15} tint={isLight ? 'light' : 'dark'} style={StyleSheet.absoluteFill} />
            <View style={styles.qrBoxInside}>
              <Text style={styles.qrTitle}>Mã QR Thanh Toán Tự Động</Text>
              <View style={styles.qrBorder}>{qrUrl ? <Image source={{ uri: qrUrl }} style={styles.qrImage} /> : <ActivityIndicator size="large" color={COLORS.gold} style={{height: 200}} />}</View>
              
              <View style={styles.infoBox}>
                 <View style={styles.infoRow}><Text style={styles.infoLabel}>Ngân hàng:</Text><Text style={styles.infoValue}>{BANK_ID}</Text></View>
                 <View style={styles.infoRow}><Text style={styles.infoLabel}>Chủ TK:</Text><Text style={styles.infoValue}>{ACCOUNT_NAME}</Text></View>
                 <View style={styles.infoRow}><Text style={styles.infoLabel}>Số TK:</Text><Text style={styles.infoValue}>{ACCOUNT_NO}</Text></View>
                 <View style={styles.infoRow}><Text style={styles.infoLabel}>Số tiền:</Text><Text style={[styles.infoValue, { color: COLORS.gold, fontSize: 16 }]}>{selectedPack.price.toLocaleString('vi-VN')} đ</Text></View>
                 <View style={styles.infoRow}><Text style={styles.infoLabel}>Nội dung CK:</Text><Text style={[styles.infoValue, { color: COLORS.success, fontSize: 16 }]}>{orderId}</Text></View>
              </View>
              <Text style={styles.warningText}>⚠️ Ghi ĐÚNG NỘI DUNG CHUYỂN KHOẢN để hệ thống tự động duyệt.</Text>
              <TouchableOpacity style={styles.checkBtn} activeOpacity={0.8} onPress={checkAutoBanking} disabled={isChecking}>
                <LinearGradient colors={['#30D158', '#108040']} start={{x:0, y:0}} end={{x:1, y:0}} style={styles.checkBtnGradient}>
                  {isChecking ? <ActivityIndicator color="#FFF" /> : <Text style={styles.checkBtnText}>TÔI ĐÃ CHUYỂN KHOẢN</Text>}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </LinearGradient>
  );
}

const getStyles = (theme: typeof COLORS) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingTop: Platform.OS === 'ios' ? 50 : 30, 
    paddingHorizontal: 20, 
    paddingBottom: 15, 
    borderBottomWidth: 0.8, 
    borderColor: theme.border,
    height: 100,
  },
  headerTitle: { color: theme.gold, fontSize: 15, fontWeight: '800', letterSpacing: 1 },
  backBtn: { 
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.surfaceSolid,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0.8,
    borderColor: theme.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  content: { padding: 16, paddingBottom: 120 },
  sectionTitle: { color: theme.text, fontSize: 16, fontWeight: '800', marginBottom: 5 },
  packWrapper: { marginBottom: 20 },
  
  packCard: { 
    width: 140, 
    backgroundColor: theme.surfaceSolid, 
    paddingVertical: 24, 
    paddingHorizontal: 16, 
    borderRadius: 20, 
    alignItems: 'center', 
    borderWidth: 0.8, 
    borderColor: theme.border, 
    position: 'relative' 
  },
  packCardHot: { 
    borderColor: theme.borderActive, 
    backgroundColor: theme.background, 
  },
  packCardActive: { 
    backgroundColor: 'rgba(212, 175, 55, 0.1)', 
    borderColor: theme.gold, 
  },
  
  badge: { position: 'absolute', top: -10, backgroundColor: '#FF3B30', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8, zIndex: 2, borderWidth: 0.8, borderColor: 'rgba(255,255,255,0.1)' },
  badgeText: { color: '#FFF', fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
  packName: { color: theme.textMuted, fontSize: 13, fontWeight: '700', marginBottom: 8, textAlign: 'center' },
  packPrice: { color: theme.text, fontSize: 18, fontWeight: '800', marginBottom: 4 },
  packDays: { color: theme.textMuted, fontSize: 11, fontWeight: '500' },
  
  perkCard: { backgroundColor: theme.surfaceSolid, borderRadius: SIZES.radiusSquircle, overflow: 'hidden', borderWidth: 0.8, borderColor: theme.border, marginBottom: 25 },
  perkInside: { padding: 20 },
  perkTitle: { color: theme.text, fontSize: 14, fontWeight: '700', marginBottom: 15, textAlign: 'center' },
  perkRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  perkText: { color: theme.textSecondary, fontSize: 13, flex: 1, lineHeight: 20 },
  
  createOrderBtn: { height: 50, borderRadius: 25, overflow: 'hidden' },
  createOrderBtnGradient: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
  createOrderText: { color: '#000', fontSize: 15, fontWeight: '900', letterSpacing: 0.5 },
  
  qrBox: { backgroundColor: theme.surfaceSolid, borderRadius: SIZES.radiusSquircle, overflow: 'hidden', borderWidth: 0.8, borderColor: theme.border },
  qrBoxInside: { padding: 20, alignItems: 'center' },
  qrTitle: { color: theme.text, fontSize: 15, fontWeight: '700', marginBottom: 20 },
  qrBorder: { padding: 10, backgroundColor: '#FFF', borderRadius: 16, marginBottom: 20 },
  qrImage: { width: 220, height: 220, borderRadius: 8 },
  infoBox: { width: '100%', backgroundColor: theme.background, padding: 15, borderRadius: 12, borderWidth: 0.8, borderColor: theme.border, marginBottom: 15 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  infoLabel: { color: theme.textMuted, fontSize: 13 },
  infoValue: { color: theme.text, fontSize: 13, fontWeight: '700' },
  warningText: { color: theme.danger, fontSize: 11, textAlign: 'center', marginBottom: 20, fontWeight: '600', lineHeight: 16 },
  checkBtn: { width: '100%', height: 50, borderRadius: 25, overflow: 'hidden' },
  checkBtnGradient: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
  checkBtnText: { color: '#FFF', fontSize: 15, fontWeight: '800', letterSpacing: 0.5 }
});