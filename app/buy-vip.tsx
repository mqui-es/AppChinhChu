import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Image, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

// 🔴 SVG TỪ LUCIDE
import { X, Sparkles, CheckCircle, Send, Rocket, Gem } from 'lucide-react-native';

import { auth, db } from '../firebaseConfig';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { COLORS, SIZES, SHADOWS } from '../constants/theme';

const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyXnH5KjwQVafxGW_W2KlpDY9KHBx_0TAmaNZBqUaPz9WR8T1PDKwB9un37fNA_YO7pmg/exec";
const BANK_ID = "ACB"; const ACCOUNT_NO = "22703611"; const ACCOUNT_NAME = "TRAN NGUYEN MINH QUI"; 

const PACKAGES = [
  { id: '14D', name: 'Trải Nghiệm', price: 20000, days: 14, icon: Send, badge: '' },
  { id: '30D', name: 'VIP 1 Tháng', price: 40000, days: 30, icon: Rocket, badge: '🔥 ĐỀ XUẤT' },
  { id: '1Y', name: 'VIP 1 Năm', price: 300000, days: 365, icon: Gem, badge: 'TIẾT KIỆM 40%' },
];

const VIP_FEATURES = [
  "Mở khóa toàn bộ Kho Ứng Dụng Độc Quyền",
  "Tải App với tốc độ Max Speed không giới hạn",
  "Xóa sạch quảng cáo, không chuyển hướng link",
  "Bảo hành chứng chỉ (Cert) & Hỗ trợ kỹ thuật 24/7"
];

export default function BuyVipScreen() {
  const router = useRouter();
  const [selectedPack, setSelectedPack] = useState(PACKAGES[1]); 
  const [is14DayEnabled, setIs14DayEnabled] = useState(true);
  const [orderId, setOrderId] = useState('');
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [qrUrl, setQrUrl] = useState('');

  useEffect(() => {
    const fetchSettings = async () => {
      const snap = await getDoc(doc(db, 'settings', 'config'));
      if (snap.exists()) setIs14DayEnabled(snap.data().enable14Days !== false);
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
      <StatusBar style="light" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}><X color="#FFF" size={28} /></TouchableOpacity>
        <Text style={styles.headerTitle}>NÂNG CẤP TÀI KHOẢN</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>Chọn gói ưu đãi</Text>
        <View style={styles.packWrapper}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap: 15, paddingVertical: 15}}>
            {PACKAGES.filter(p => p.id !== '14D' || is14DayEnabled).map(pack => {
              const isActive = selectedPack.id === pack.id;
              const isBestSeller = pack.id === '30D';
              const SvgIcon = pack.icon; 
              return (
                <TouchableOpacity 
                  key={pack.id} 
                  style={[styles.packCard, isActive && styles.packCardActive, isBestSeller && !isActive && styles.packCardHot]} 
                  onPress={() => { setSelectedPack(pack); setOrderId(''); setQrUrl(''); }} 
                  activeOpacity={0.8}
                >
                  {pack.badge ? <View style={[styles.badge, isActive && {backgroundColor: COLORS.danger}]}><Text style={styles.badgeText}>{pack.badge}</Text></View> : null}
                  <SvgIcon color={isActive ? COLORS.gold : COLORS.textMuted} size={36} strokeWidth={1.5} style={{marginBottom: 10}} />
                  <Text style={[styles.packName, isActive && { color: '#FFF' }]}>{pack.name}</Text>
                  <Text style={[styles.packPrice, isActive && { color: COLORS.gold, fontSize: 20 }]}>{pack.price.toLocaleString('vi-VN')}đ</Text>
                  <Text style={styles.packDays}>Sử dụng {pack.days} ngày</Text>
                </TouchableOpacity>
              )
            })}
          </ScrollView>
        </View>

        {/* PERKS LIST */}
        <View style={[styles.perkCard, SHADOWS.glowCard]}>
          <BlurView intensity={10} tint="dark" style={StyleSheet.absoluteFill} />
          <View style={styles.perkInside}>
            <Text style={styles.perkTitle}>Quyền lợi khi là thành viên VIP</Text>
            {VIP_FEATURES.map((feat, idx) => (
              <View key={idx} style={styles.perkRow}>
                 <CheckCircle color={COLORS.gold} size={18} style={{marginRight: 10, marginTop: 2}} />
                 <Text style={styles.perkText}>{feat}</Text>
              </View>
            ))}
          </View>
        </View>

        {!orderId ? (
          <TouchableOpacity style={[styles.createOrderBtn, SHADOWS.glowGold]} activeOpacity={0.8} onPress={handleCreateOrder} disabled={isCreatingOrder}>
            <LinearGradient colors={COLORS.goldGradient} start={{x:0, y:0}} end={{x:1, y:0}} style={styles.createOrderBtnGradient}>
              {isCreatingOrder ? <ActivityIndicator color="#000" /> : <Text style={styles.createOrderText}>THANH TOÁN {selectedPack.price.toLocaleString('vi-VN')}đ</Text>}
            </LinearGradient>
          </TouchableOpacity>
        ) : (
          <View style={[styles.qrBox, SHADOWS.glowDark]}>
            <BlurView intensity={15} tint="dark" style={StyleSheet.absoluteFill} />
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 60, paddingHorizontal: 20, paddingBottom: 15, borderBottomWidth: 0.8, borderColor: COLORS.border },
  headerTitle: { color: COLORS.gold, fontSize: 16, fontWeight: '800', letterSpacing: 1 },
  backBtn: { padding: 5, marginLeft: -5 },
  content: { padding: 16, paddingBottom: 120 },
  sectionTitle: { color: COLORS.text, fontSize: 18, fontWeight: '800', marginBottom: 5 },
  packWrapper: { marginBottom: 20 },
  
  packCard: { 
    width: 140, 
    backgroundColor: 'rgba(255,255,255,0.03)', 
    paddingVertical: 24, 
    paddingHorizontal: 16, 
    borderRadius: 20, 
    alignItems: 'center', 
    borderWidth: 0.8, 
    borderColor: 'rgba(255,255,255,0.06)', 
    position: 'relative' 
  },
  packCardHot: { borderColor: 'rgba(255,255,255,0.15)', backgroundColor: 'rgba(255,255,255,0.05)' },
  packCardActive: { 
    backgroundColor: 'rgba(255, 226, 89, 0.1)', 
    borderColor: COLORS.gold, 
    transform: [{scale: 1.05}], 
  },
  
  badge: { position: 'absolute', top: -10, backgroundColor: '#FF3B30', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8, zIndex: 2, borderWidth: 0.8, borderColor: 'rgba(255,255,255,0.1)' },
  badgeText: { color: '#FFF', fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
  packName: { color: COLORS.textMuted, fontSize: 14, fontWeight: '700', marginBottom: 8, textAlign: 'center' },
  packPrice: { color: COLORS.text, fontSize: 18, fontWeight: '800', marginBottom: 4 },
  packDays: { color: COLORS.textMuted, fontSize: 12, fontWeight: '500' },
  
  perkCard: { backgroundColor: 'rgba(20, 20, 24, 0.45)', borderRadius: SIZES.radiusSquircle, overflow: 'hidden', borderWidth: 0.8, borderColor: COLORS.border, marginBottom: 25 },
  perkInside: { padding: 20 },
  perkTitle: { color: COLORS.text, fontSize: 15, fontWeight: '700', marginBottom: 15, textAlign: 'center' },
  perkRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  perkText: { color: COLORS.textSecondary, fontSize: 14, flex: 1, lineHeight: 22 },
  
  createOrderBtn: { height: 56, borderRadius: 16, overflow: 'hidden' },
  createOrderBtnGradient: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
  createOrderText: { color: '#000', fontSize: 16, fontWeight: '900', letterSpacing: 1 },
  
  qrBox: { backgroundColor: 'rgba(20, 20, 24, 0.45)', borderRadius: SIZES.radiusSquircle, overflow: 'hidden', borderWidth: 0.8, borderColor: COLORS.border },
  qrBoxInside: { padding: 20, alignItems: 'center' },
  qrTitle: { color: COLORS.text, fontSize: 16, fontWeight: '700', marginBottom: 20 },
  qrBorder: { padding: 10, backgroundColor: '#FFF', borderRadius: 16, marginBottom: 20 },
  qrImage: { width: 220, height: 220, borderRadius: 8 },
  infoBox: { width: '100%', backgroundColor: '#070708', padding: 15, borderRadius: 12, borderWidth: 0.8, borderColor: COLORS.border, marginBottom: 15 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  infoLabel: { color: COLORS.textMuted, fontSize: 14 },
  infoValue: { color: COLORS.text, fontSize: 14, fontWeight: '700' },
  warningText: { color: COLORS.danger, fontSize: 12, textAlign: 'center', marginBottom: 20, fontWeight: '600', lineHeight: 18 },
  checkBtn: { width: '100%', height: 56, borderRadius: 16, overflow: 'hidden' },
  checkBtnGradient: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
  checkBtnText: { color: '#FFF', fontSize: 16, fontWeight: '800', letterSpacing: 1 }
});