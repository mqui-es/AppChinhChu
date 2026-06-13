import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Alert, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform, Switch, Image } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SIZES, SHADOWS, useThemeUpdate } from '../constants/theme';

// 🔴 ĐÃ CẬP NHẬT FULL BỘ ICON TỪ LUCIDE GIỐNG Y HỆT WEB CỦA SẾP
import { X, ShieldCheck, ChevronLeft, CalendarPlus, UserX, LayoutDashboard, Ticket, Banknote, Users, Crown, Gem, Trash2, Box } from 'lucide-react-native';

import { auth, db } from '../firebaseConfig';
// Nhập thêm deleteDoc, serverTimestamp để xử lý Giftcode
import { doc, getDoc, setDoc, collection, getDocs, updateDoc, Timestamp, deleteDoc, serverTimestamp } from 'firebase/firestore';

const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyXnH5KjwQVafxGW_W2KlpDY9KHBx_0TAmaNZBqUaPz9WR8T1PDKwB9un37fNA_YO7pmg/exec";

export default function AdminScreen() {
  useThemeUpdate();
  const styles = getStyles(COLORS);
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pin, setPin] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  
  // 🔴 THÊM TAB DASHBOARD VÀ GIFTCODES
  const [activeTab, setActiveTab] = useState('DASHBOARD'); 

  // Dữ liệu Web & Firebase
  const [usersList, setUsersList] = useState<any[]>([]);
  const [giftcodesList, setGiftcodesList] = useState<any[]>([]);
  const [dataKho, setDataKho] = useState<any[]>([]);
  const [sysConfig, setSysConfig] = useState({ 
    popupMsg: '', 
    showPopup: false, 
    enable14Days: true,
    homePopupShow: false,
    homePopupTitle: '',
    homePopupMsg: '',
    homePopupImg: '',
    homePopupUrl: '',
    forceUpdateShow: false,
    forceUpdateAllowSkip: false,
    forceUpdateMsg: '',
    forceUpdateUrl: '',
    vipPrice14D: 20000,
    vipPrice30D: 40000,
    vipPrice1Y: 300000,
    vipFeaturesText: ''
  });

  // State thông báo máy
  const [pushTitle, setPushTitle] = useState('');
  const [pushBody, setPushBody] = useState('');
  const [pushUrl, setPushUrl] = useState('');
  const [isSendingPush, setIsSendingPush] = useState(false);
  const [registeredDeviceCount, setRegisteredDeviceCount] = useState(0);
  
  // State Hẹn giờ gửi
  const [scheduleDelay, setScheduleDelay] = useState('0'); // '0'=ngay, '5'=5m, '15'=15m, '60'=1h, '180'=3h, '1440'=1d, 'custom'=tự chọn
  const [customDate, setCustomDate] = useState(new Date(Date.now() + 10 * 60 * 1000));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pickerMode, setPickerMode] = useState<'date' | 'time'>('date');
  const [scheduledPushes, setScheduledPushes] = useState<any[]>([]);
  
  // Thống kê
  const [stats, setStats] = useState({ revenue: 0, totalUsers: 0, totalVips: 0, totalCoins: 0 });
  const [invStats, setInvStats] = useState<any>({ 'Spotify': {total: 0, available: 0, sold: 0}, 'Netflix': {total: 0, available: 0, sold: 0}, 'CapCut': {total: 0, available: 0, sold: 0} });

  // State nạp kho
  const [newAccType, setNewAccType] = useState('Spotify');
  const [newAccInfo, setNewAccInfo] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  // State Giftcode
  const [gcName, setGcName] = useState('');
  const [gcType, setGcType] = useState('coins'); // coins, vip, discount
  const [gcValue, setGcValue] = useState('');
  const [gcLimit, setGcLimit] = useState('100');
  const [isCreatingGc, setIsCreatingGc] = useState(false);

  const getVipMillis = (vipExpire: any) => {
    if (!vipExpire) return 0;
    if (typeof vipExpire.toMillis === 'function') return vipExpire.toMillis();
    if (vipExpire.seconds) return vipExpire.seconds * 1000;
    return Number(vipExpire) || 0;
  };

  const handleLoginAdmin = async () => {
    if (!pin) return Alert.alert("Lỗi", "Nhập mã PIN");
    setIsVerifying(true);
    try {
      const res = await fetch(`${SCRIPT_URL}?action=get_admin_data&pin=${encodeURIComponent(pin)}`);
      const json = await res.json();
      if (json.success) { 
        setDataKho(json.dataKho || []); 
        
        // 🔴 BÓC TÁCH DOANH THU & KHO Y HỆT WEB CỦA SẾP
        let totalRev = 0;
        let tempInv = { 'Spotify': {total: 0, available: 0, sold: 0}, 'Netflix': {total: 0, available: 0, sold: 0}, 'CapCut': {total: 0, available: 0, sold: 0} };
        
        if (json.dataThuNgan) {
            for(let i = 1; i < json.dataThuNgan.length; i++) {
                let r = json.dataThuNgan[i];
                if(r[4] === 'CLAIMED' || r[4] === 'PAID') totalRev += (parseInt(r[2]) || 0);
            }
        }
        if (json.dataKho) {
            for(let i = 1; i < json.dataKho.length; i++) {
                let r = json.dataKho[i]; let type = r[0]; let status = r[2];
                if(tempInv[type as keyof typeof tempInv]) {
                    tempInv[type as keyof typeof tempInv].total++;
                    if(status === 'SẴN SÀNG') tempInv[type as keyof typeof tempInv].available++; 
                    else tempInv[type as keyof typeof tempInv].sold++;
                }
            }
        }
        
        setStats(prev => ({ ...prev, revenue: totalRev }));
        setInvStats(tempInv);
        setIsAuthenticated(true); 
        loadFirebaseData(); 
      } else { Alert.alert("Lỗi", "Sai mã PIN!"); }
    } catch (e) { Alert.alert("Lỗi", "Mất kết nối"); }
    setIsVerifying(false);
  };

  const loadFirebaseData = async () => {
    const snapConfig = await getDoc(doc(db, 'settings', 'config'));
    if (snapConfig.exists()) {
      const data = snapConfig.data();
      setSysConfig(prev => ({
        ...prev,
        ...data,
        vipPrice14D: data.vipPrice14D !== undefined ? data.vipPrice14D : 20000,
        vipPrice30D: data.vipPrice30D !== undefined ? data.vipPrice30D : 40000,
        vipPrice1Y: data.vipPrice1Y !== undefined ? data.vipPrice1Y : 300000,
        vipFeaturesText: data.vipFeaturesText !== undefined ? data.vipFeaturesText : `Mở khóa toàn bộ Kho Ứng Dụng Độc Quyền
Tốc độ tải ứng dụng cực cao (Không giới hạn)
Không có quảng cáo khó chịu từ hệ thống
Chứng chỉ luôn được gia hạn tự động ổn định
Hỗ trợ cài đặt trực tiếp qua OTA nhanh gọn
Ký và cài đặt file IPA ngoại tuyến của riêng bạn`
      }));
    }
    
    // Tải Khách hàng & Tính tổng
    const usersSnap = await getDocs(collection(db, 'users'));
    let arr: any[] = [];
    let tUsers = 0, tVips = 0, tCoins = 0;
    
    usersSnap.forEach(d => {
       const uData = d.data();
       arr.push({ id: d.id, ...uData });
       tUsers++;
       tCoins += (uData.coins || 0);
       if (getVipMillis(uData.vipExpire) > Date.now()) tVips++;
    });
    
    arr.sort((a, b) => getVipMillis(b.vipExpire) - getVipMillis(a.vipExpire));
    setUsersList(arr);
    setStats(prev => ({ ...prev, totalUsers: tUsers, totalVips: tVips, totalCoins: tCoins }));

    // Tải Giftcodes
    const gcSnap = await getDocs(collection(db, 'giftcodes'));
    let gcArr: any[] = [];
    gcSnap.forEach(d => gcArr.push({ id: d.id, ...d.data() }));
    setGiftcodesList(gcArr);

    // Tải số lượng thiết bị đăng ký nhận thông báo từ Google Sheet
    try {
      const resCount = await fetch(`${SCRIPT_URL}?action=get_push_tokens_count&pin=${encodeURIComponent(pin)}`);
      const jsonCount = await resCount.json();
      if (jsonCount.success) {
        setRegisteredDeviceCount(jsonCount.count);
      }
    } catch (e) {
      console.warn("Failed to fetch push tokens count:", e);
    }

    // Tải danh sách thông báo đã hẹn giờ
    try {
      const resSched = await fetch(`${SCRIPT_URL}?action=get_scheduled_pushes&pin=${encodeURIComponent(pin)}`);
      const jsonSched = await resSched.json();
      if (jsonSched.success) {
        setScheduledPushes(jsonSched.data || []);
      }
    } catch (e) {
      console.warn("Failed to fetch scheduled pushes:", e);
    }
  };

  const saveSettings = async () => {
    try { await setDoc(doc(db, 'settings', 'config'), sysConfig, { merge: true }); Alert.alert("Thành công", "Đã lưu cài đặt!"); } 
    catch (error) { Alert.alert("Lỗi", "Không thể lưu."); }
  };

  const handleSendPushNotifications = async () => {
    if (!pushTitle.trim() || !pushBody.trim()) {
      return Alert.alert("Lỗi", "Vui lòng nhập đầy đủ tiêu đề và nội dung thông báo đẩy!");
    }

    Alert.alert(
      "Xác nhận gửi",
      `Gửi thông báo đẩy đến tất cả ${registeredDeviceCount} thiết bị ngay bây giờ?`,
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Gửi ngay",
          onPress: async () => {
            setIsSendingPush(true);
            try {
              const res = await fetch(`${SCRIPT_URL}?action=send_push_now&pin=${encodeURIComponent(pin)}&title=${encodeURIComponent(pushTitle)}&body=${encodeURIComponent(pushBody)}&url=${encodeURIComponent(pushUrl)}`);
              const json = await res.json();
              if (json.success) {
                Alert.alert("Thành công", `Đã gửi thông báo tới ${json.count} thiết bị.`);
                setPushTitle('');
                setPushBody('');
                setPushUrl('');
                loadFirebaseData();
              } else {
                Alert.alert("Lỗi", json.error || "Gửi thất bại.");
              }
            } catch (error: any) {
              Alert.alert("Lỗi gửi thông báo", error.message || "Không thể kết nối máy chủ.");
            }
            setIsSendingPush(false);
          }
        }
      ]
    );
  };

  const handleSchedulePush = async () => {
    if (!pushTitle.trim() || !pushBody.trim()) {
      return Alert.alert("Lỗi", "Vui lòng nhập đầy đủ tiêu đề và nội dung thông báo đẩy!");
    }

    // Tính thời gian gửi
    let targetTime = new Date();
    if (scheduleDelay === 'custom') {
      targetTime = new Date(customDate);
      if (targetTime.getTime() <= Date.now()) {
        return Alert.alert("Lỗi", "Thời gian hẹn giờ phải lớn hơn thời gian hiện tại!");
      }
    } else {
      targetTime = new Date(Date.now() + parseInt(scheduleDelay) * 60 * 1000);
    }

    Alert.alert(
      "Xác nhận đặt lịch",
      `Hẹn giờ gửi thông báo vào lúc: ${targetTime.toLocaleString('vi-VN')}?`,
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Đồng ý",
          onPress: async () => {
            setIsSendingPush(true);
            try {
              const res = await fetch(`${SCRIPT_URL}?action=schedule_push&pin=${encodeURIComponent(pin)}&title=${encodeURIComponent(pushTitle)}&body=${encodeURIComponent(pushBody)}&url=${encodeURIComponent(pushUrl)}&time=${encodeURIComponent(targetTime.toISOString())}`);
              const json = await res.json();
              if (json.success) {
                Alert.alert("Thành công", "Đã đặt lịch gửi thông báo đẩy!");
                setPushTitle('');
                setPushBody('');
                setPushUrl('');
                setScheduleDelay('0');
                loadFirebaseData();
              } else {
                Alert.alert("Lỗi", json.error || "Đặt lịch thất bại.");
              }
            } catch (error: any) {
              Alert.alert("Lỗi đặt lịch", error.message || "Không thể kết nối máy chủ.");
            }
            setIsSendingPush(false);
          }
        }
      ]
    );
  };

  const handleDeleteScheduledPush = async (row: number, info: string) => {
    Alert.alert(
      "Xác nhận xóa",
      `Xóa lịch hẹn gửi thông báo [${info}]?`,
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xóa",
          style: "destructive",
          onPress: async () => {
            try {
              const res = await fetch(`${SCRIPT_URL}?action=delete_scheduled_push&pin=${encodeURIComponent(pin)}&row=${row}`);
              const json = await res.json();
              if (json.success) {
                Alert.alert("Thành công", "Đã xóa lịch gửi.");
                loadFirebaseData();
              } else {
                Alert.alert("Lỗi", json.error || "Xóa thất bại.");
              }
            } catch (error: any) {
              Alert.alert("Lỗi kết nối", error.message || "Không thể kết nối máy chủ.");
            }
          }
        }
      ]
    );
  };

  const addVipDays = async (uid: string, currentExpire: any, daysToAdd: number) => {
    if (auth.currentUser?.email !== 'mquitran@gmail.com') return Alert.alert("Cảnh báo", "Chỉ dành cho Admin");
    Alert.alert('Xác nhận', daysToAdd > 0 ? `Cộng ${daysToAdd} ngày VIP?` : `Xóa VIP?`, [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Đồng ý', onPress: async () => {
          try {
            const now = Date.now();
            const currentMillis = getVipMillis(currentExpire);
            const baseTime = currentMillis > now ? currentMillis : now;
            let updateData: any = {};
            if (daysToAdd > 0) updateData.vipExpire = Timestamp.fromMillis(baseTime + (daysToAdd * 24 * 60 * 60 * 1000)); 
            else updateData.vipExpire = null; 
            await updateDoc(doc(db, 'users', uid), updateData);
            Alert.alert("Thành công", "Đã chốt VIP!"); loadFirebaseData();
          } catch (error) { Alert.alert("Lỗi", "Không thể cập nhật."); }
      }}
    ]);
  };

  const handleAddAccount = async () => {
    if (!newAccType || !newAccInfo) return Alert.alert("Lỗi", "Nhập đủ thông tin TK");
    setIsAdding(true);
    try {
      const res = await fetch(`${SCRIPT_URL}?action=add_account&pin=${encodeURIComponent(pin)}&type=${encodeURIComponent(newAccType)}&account=${encodeURIComponent(newAccInfo)}`);
      const json = await res.json();
      if (json.success) { Alert.alert("Xong", "Đã nạp vào Kho!"); setNewAccInfo(''); handleLoginAdmin(); } 
      else { Alert.alert("Lỗi", json.error); }
    } catch (error) { Alert.alert("Lỗi", "Kết nối thất bại."); }
    setIsAdding(false);
  };

  // 🔴 HÀM XỬ LÝ GIFTCODE (TẠO & XÓA)
  const createNewGiftcode = async () => {
    const code = gcName.trim().toUpperCase();
    const val = parseInt(gcValue);
    const limit = parseInt(gcLimit) || 0;
    
    if (!code || isNaN(val)) return Alert.alert("Lỗi", "Vui lòng nhập Tên Mã và Giá trị");
    setIsCreatingGc(true);
    try {
      const docRef = doc(db, 'giftcodes', code);
      const snap = await getDoc(docRef);
      if (snap.exists()) { Alert.alert("Lỗi", "Tên mã này đã tồn tại!"); } 
      else {
        await setDoc(docRef, { type: gcType, value: val, maxUses: limit, usedCount: 0, usedBy: [], createdAt: serverTimestamp() });
        Alert.alert("Thành công", "Đã tạo mã Giftcode!");
        setGcName(''); setGcValue(''); loadFirebaseData();
      }
    } catch (error: any) { Alert.alert("Lỗi", error.message); }
    setIsCreatingGc(false);
  };

  const handleDeleteGiftcode = (code: string) => {
    Alert.alert('Cảnh báo', `Xóa mã [${code}] vĩnh viễn?`, [
       { text: 'Hủy', style: 'cancel' },
       { text: 'Xóa', style: 'destructive', onPress: async () => {
           await deleteDoc(doc(db, 'giftcodes', code)); loadFirebaseData();
       }}
    ])
  };

  if (!isAuthenticated) {
    return (
      <LinearGradient colors={COLORS.bgGradient} style={styles.loginContainer}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, justifyContent: 'center' }}>
           <StatusBar style="light" />
           <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}><X color="#FFF" size={32} /></TouchableOpacity>
           <View style={[styles.loginBox, SHADOWS.glowDark]}>
              <View style={styles.logoCircle}><ShieldCheck color="#FF453A" size={40} /></View>
              <Text style={styles.loginTitle}>Trung Tâm Điều Hành</Text>
              <View style={styles.inputGroup}><TextInput style={styles.input} placeholder="Mã PIN..." placeholderTextColor={COLORS.textMuted} secureTextEntry value={pin} onChangeText={setPin} /></View>
              <TouchableOpacity style={styles.submitBtn} onPress={handleLoginAdmin} disabled={isVerifying}>{isVerifying ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitBtnText}>XÁC NHẬN</Text>}</TouchableOpacity>
           </View>
        </KeyboardAvoidingView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={COLORS.bgGradient} style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}><ChevronLeft color="#FF453A" size={28} /></TouchableOpacity>
        <Text style={styles.headerTitle}>ADMIN WORKSPACE</Text>
        <TouchableOpacity onPress={loadFirebaseData}><Text style={{color: COLORS.primary, fontWeight: 'bold'}}>Tải lại</Text></TouchableOpacity>
      </View>
      
      {/* 🔴 SCROLLVIEW CHO MENU ĐỂ TRÁNH BỊ CHẬT NẾU ĐIỆN THOẠI NHỎ */}
      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabBar}>
          <TouchableOpacity onPress={() => setActiveTab('DASHBOARD')} style={[styles.tabBtn, activeTab === 'DASHBOARD' && styles.tabBtnActive]}><LayoutDashboard color={activeTab === 'DASHBOARD' ? '#FFF' : '#8E8E93'} size={18} style={{marginRight: 6}}/><Text style={[styles.tabText, activeTab === 'DASHBOARD' && {color: '#FFF'}]}>TỔNG QUAN</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => setActiveTab('MEMBERS')} style={[styles.tabBtn, activeTab === 'MEMBERS' && styles.tabBtnActive]}><Users color={activeTab === 'MEMBERS' ? '#FFF' : '#8E8E93'} size={18} style={{marginRight: 6}}/><Text style={[styles.tabText, activeTab === 'MEMBERS' && {color: '#FFF'}]}>KHÁCH</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => setActiveTab('KHOTK')} style={[styles.tabBtn, activeTab === 'KHOTK' && styles.tabBtnActive]}><Box color={activeTab === 'KHOTK' ? '#FFF' : '#8E8E93'} size={18} style={{marginRight: 6}}/><Text style={[styles.tabText, activeTab === 'KHOTK' && {color: '#FFF'}]}>KHO APPLE</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => setActiveTab('GIFTCODES')} style={[styles.tabBtn, activeTab === 'GIFTCODES' && styles.tabBtnActive]}><Ticket color={activeTab === 'GIFTCODES' ? '#FFF' : '#8E8E93'} size={18} style={{marginRight: 6}}/><Text style={[styles.tabText, activeTab === 'GIFTCODES' && {color: '#FFF'}]}>GIFTCODE</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => setActiveTab('SETTINGS')} style={[styles.tabBtn, activeTab === 'SETTINGS' && styles.tabBtnActive]}><Text style={[styles.tabText, activeTab === 'SETTINGS' && {color: '#FFF'}]}>CÀI ĐẶT</Text></TouchableOpacity>
        </ScrollView>
      </View>
      
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* 🔴 TAB 1: DASHBOARD (TỔNG QUAN) */}
        {activeTab === 'DASHBOARD' && (
          <View>
             <Text style={styles.title}>THỐNG KÊ HỆ THỐNG</Text>
             <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20}}>
                <View style={styles.statCard}><View style={[styles.statIconBox, {backgroundColor: 'rgba(50,215,75,0.1)'}]}><Banknote color="#32D74B" size={24}/></View><Text style={styles.statLabel}>DOANH THU</Text><Text style={[styles.statValue, {color: '#32D74B'}]}>{stats.revenue.toLocaleString('vi-VN')}đ</Text></View>
                <View style={styles.statCard}><View style={[styles.statIconBox, {backgroundColor: 'rgba(10,132,255,0.1)'}]}><Users color="#0A84FF" size={24}/></View><Text style={styles.statLabel}>NGƯỜI DÙNG</Text><Text style={styles.statValue}>{stats.totalUsers.toLocaleString()}</Text></View>
                <View style={styles.statCard}><View style={[styles.statIconBox, {backgroundColor: 'rgba(255,215,0,0.1)'}]}><Crown color="#FFD700" size={24}/></View><Text style={styles.statLabel}>KHÁCH VIP</Text><Text style={styles.statValue}>{stats.totalVips.toLocaleString()}</Text></View>
                <View style={styles.statCard}><View style={[styles.statIconBox, {backgroundColor: 'rgba(175,82,222,0.1)'}]}><Gem color="#AF52DE" size={24}/></View><Text style={styles.statLabel}>TỔNG XU</Text><Text style={[styles.statValue, {color: '#AF52DE'}]}>{stats.totalCoins.toLocaleString()}</Text></View>
             </View>

             <Text style={styles.title}>BÁO CÁO KHO TÀI KHOẢN</Text>
             {['Spotify', 'Netflix', 'CapCut'].map(type => {
                const data = invStats[type];
                const percent = data.total > 0 ? Math.round((data.sold / data.total)*100) : 0;
                return (
                  <View key={type} style={styles.invCard}>
                    <View style={{flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10}}>
                      <Text style={{color: '#FFF', fontWeight: 'bold', fontSize: 16}}>{type}</Text>
                      <Text style={{color: '#32D74B', fontWeight: '900', fontSize: 18}}>{data.available} <Text style={{fontSize: 12, color: '#888'}}>Tồn</Text></Text>
                    </View>
                    <View style={{height: 6, backgroundColor: '#333', borderRadius: 3, overflow: 'hidden'}}><View style={{height: '100%', width: `${percent}%`, backgroundColor: '#0A84FF'}} /></View>
                    <Text style={{color: '#888', fontSize: 12, marginTop: 5, textAlign: 'right'}}>Đã bán: {data.sold} / {data.total}</Text>
                  </View>
                )
             })}
          </View>
        )}

        {/* TAB 2: KHÁCH HÀNG */}
        {activeTab === 'MEMBERS' && (
          <View>
            <Text style={styles.title}>CHỈNH SỬA VIP KHÁCH HÀNG ({usersList.length})</Text>
            {usersList.map((u, i) => {
              const expireMillis = getVipMillis(u.vipExpire);
              const isVipActive = expireMillis > Date.now();
              return (
                <View key={i} style={styles.userCard}>
                  <View style={{marginBottom: 12}}>
                    <Text style={styles.userName}>{u.fullname || u.email}</Text>
                    <Text style={styles.userEmail}>{u.email}</Text>
                    <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8}}>
                      {isVipActive ? ( <View style={styles.vipTag}><Text style={styles.vipTagText}>VIP: {new Date(expireMillis).toLocaleDateString('vi-VN')}</Text></View> ) : ( <View style={[styles.vipTag, {backgroundColor: '#333', borderColor: '#555'}]}><Text style={[styles.vipTagText, {color: '#888'}]}>Chưa VIP</Text></View> )}
                      <Text style={{color: '#AF52DE', fontWeight: 'bold'}}><Gem size={12} color="#AF52DE" style={{marginBottom: -2}}/> {(u.coins || 0).toLocaleString()} Xu</Text>
                    </View>
                  </View>
                  <View style={styles.actionRow}>
                      <TouchableOpacity style={styles.actionBtn} onPress={() => addVipDays(u.id, u.vipExpire, 1)}><CalendarPlus color="#32D74B" size={16} style={{marginRight: 4}}/><Text style={styles.actionText}>1 Ngày</Text></TouchableOpacity>
                      <TouchableOpacity style={styles.actionBtn} onPress={() => addVipDays(u.id, u.vipExpire, 7)}><CalendarPlus color="#32D74B" size={16} style={{marginRight: 4}}/><Text style={styles.actionText}>7 Ngày</Text></TouchableOpacity>
                      <TouchableOpacity style={styles.actionBtn} onPress={() => addVipDays(u.id, u.vipExpire, 30)}><CalendarPlus color="#FFD700" size={16} style={{marginRight: 4}}/><Text style={[styles.actionText, {color: '#FFD700'}]}>1 Tháng</Text></TouchableOpacity>
                  </View>
                  <TouchableOpacity style={styles.cancelVipBtn} onPress={() => addVipDays(u.id, u.vipExpire, 0)}><UserX color="#FFF" size={16} style={{marginRight: 6}}/><Text style={{color: '#FFF', fontWeight: 'bold', fontSize: 13}}>Tước quyền VIP</Text></TouchableOpacity>
                </View>
              )
            })}
          </View>
        )}

        {/* TAB 3: KHO APPLE ID */}
        {activeTab === 'KHOTK' && (
          <View>
            <Text style={styles.title}>NẠP KHO APPLE ID</Text>
            <View style={styles.userCard}>
              <View style={{flexDirection: 'row', gap: 10, marginBottom: 15}}>
                {['Spotify', 'Netflix', 'CapCut'].map(t => (
                  <TouchableOpacity key={t} style={[styles.typeBtn, newAccType === t && styles.typeBtnActive]} onPress={() => setNewAccType(t)}><Text style={[styles.typeBtnText, newAccType === t && {color: '#FFF'}]}>{t}</Text></TouchableOpacity>
                ))}
              </View>
              <TextInput style={[styles.addInput, {marginBottom: 15}]} placeholder="Email | Mật khẩu..." placeholderTextColor={COLORS.textMuted} value={newAccInfo} onChangeText={setNewAccInfo} multiline/>
              <TouchableOpacity style={styles.submitBtn} onPress={handleAddAccount} disabled={isAdding}>{isAdding ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitBtnText}>BƠM VÀO KHO HỆ THỐNG</Text>}</TouchableOpacity>
            </View>
            <Text style={styles.title}>KHO GẦN ĐÂY</Text>
            <View style={{backgroundColor: '#111', borderRadius: 16, borderWidth: 1, borderColor: '#222', overflow: 'hidden'}}>
               {dataKho.slice(-5).reverse().map((row, idx) => { if (idx === dataKho.length - 1) return null; return ( <View key={idx} style={{flexDirection: 'row', justifyContent: 'space-between', padding: 15, borderBottomWidth: 1, borderBottomColor: '#222'}}><View><Text style={{color: '#FFF', fontWeight: 'bold'}}>{row[0]}</Text><Text style={{color: '#8E8E93', fontSize: 12, marginTop: 4}}>{row[1]}</Text></View><Text style={{color: row[2] === 'SẴN SÀNG' ? '#32D74B' : '#FF453A', fontSize: 12, fontWeight: 'bold'}}>{row[2]}</Text></View> ) })}
            </View>
          </View>
        )}

        {/* 🔴 TAB 4: MARKETING (GIFTCODE) */}
        {activeTab === 'GIFTCODES' && (
          <View>
            <Text style={styles.title}>TẠO MÃ KHUYẾN MÃI (GIFTCODE)</Text>
            <View style={styles.userCard}>
               <TextInput style={styles.addInput} placeholder="Tên mã (VD: TANG50XU)" placeholderTextColor={COLORS.textMuted} value={gcName} onChangeText={setGcName} autoCapitalize="characters"/>
               
               <View style={{flexDirection: 'row', gap: 10, marginBottom: 10}}>
                 <TouchableOpacity style={[styles.typeBtn, gcType === 'coins' && {borderColor: '#AF52DE', backgroundColor: 'rgba(175,82,222,0.1)'}]} onPress={() => setGcType('coins')}><Gem color={gcType === 'coins' ? '#AF52DE' : '#888'} size={16}/><Text style={[styles.typeBtnText, gcType === 'coins' && {color: '#AF52DE'}]}>Tặng Xu</Text></TouchableOpacity>
                 <TouchableOpacity style={[styles.typeBtn, gcType === 'vip' && {borderColor: '#FFD700', backgroundColor: 'rgba(255,215,0,0.1)'}]} onPress={() => setGcType('vip')}><Crown color={gcType === 'vip' ? '#FFD700' : '#888'} size={16}/><Text style={[styles.typeBtnText, gcType === 'vip' && {color: '#FFD700'}]}>Tặng VIP</Text></TouchableOpacity>
               </View>

               <TextInput style={styles.addInput} placeholder={gcType === 'coins' ? "Số xu tặng (VD: 50)" : "Số ngày VIP tặng (VD: 3)"} placeholderTextColor={COLORS.textMuted} value={gcValue} onChangeText={setGcValue} keyboardType="numeric"/>
               <TextInput style={styles.addInput} placeholder="Giới hạn lượt dùng (0 = Vô hạn)" placeholderTextColor={COLORS.textMuted} value={gcLimit} onChangeText={setGcLimit} keyboardType="numeric"/>
               
               <TouchableOpacity style={[styles.submitBtn, {backgroundColor: '#0A84FF'}]} onPress={createNewGiftcode} disabled={isCreatingGc}>{isCreatingGc ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitBtnText}>PHÁT HÀNH MÃ</Text>}</TouchableOpacity>
            </View>

            <Text style={styles.title}>MÃ ĐANG HOẠT ĐỘNG</Text>
            {giftcodesList.length === 0 && <Text style={{color: '#888', textAlign: 'center', marginTop: 10}}>Chưa có mã nào.</Text>}
            {giftcodesList.map((gc, idx) => (
              <View key={idx} style={styles.gcCard}>
                 <View style={{flex: 1}}>
                    <Text style={{color: '#FFF', fontSize: 18, fontWeight: '900', letterSpacing: 2, marginBottom: 5}}>{gc.id}</Text>
                    <Text style={{color: gc.type === 'coins' ? '#AF52DE' : '#FFD700', fontWeight: 'bold', fontSize: 13}}>
                      {gc.type === 'coins' ? `Tặng ${gc.value} Xu` : `Tặng ${gc.value} Ngày VIP`}
                    </Text>
                    <Text style={{color: '#888', fontSize: 12, marginTop: 5}}>Đã dùng: {gc.usedCount} / {gc.maxUses === 0 ? 'Vô hạn' : gc.maxUses}</Text>
                 </View>
                 <TouchableOpacity style={{padding: 15, backgroundColor: 'rgba(255,69,58,0.1)', borderRadius: 12}} onPress={() => handleDeleteGiftcode(gc.id)}><Trash2 color="#FF453A" size={20}/></TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* TAB 5: HỆ THỐNG */}
        {activeTab === 'SETTINGS' && (
          <View>
            <Text style={styles.title}>CẤU HÌNH HỆ THỐNG APP</Text>
            <View style={styles.userCard}>
              <View style={styles.settingRow}>
                <Text style={styles.settingText}>Bật gói 14 Ngày</Text>
                <Switch 
                  value={sysConfig.enable14Days} 
                  onValueChange={(val) => setSysConfig({...sysConfig, enable14Days: val})} 
                />
              </View>
              <TouchableOpacity style={styles.submitBtn} onPress={saveSettings}>
                <Text style={styles.submitBtnText}>LƯU CẤU HÌNH CHUNG</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.title}>CẤU HÌNH GIÁ VÀ MÔ TẢ GÓI VIP</Text>
            <View style={styles.userCard}>
              <Text style={{color: '#8E8E93', marginBottom: 6, fontSize: 13, fontWeight: '700'}}>Giá gói Trải Nghiệm 14 ngày (đ):</Text>
              <TextInput 
                style={styles.addInput} 
                placeholder="Ví dụ: 20000" 
                placeholderTextColor={COLORS.textMuted} 
                keyboardType="numeric"
                value={String(sysConfig.vipPrice14D ?? 20000)} 
                onChangeText={(txt) => setSysConfig({...sysConfig, vipPrice14D: parseInt(txt) || 0})} 
              />

              <Text style={{color: '#8E8E93', marginTop: 15, marginBottom: 6, fontSize: 13, fontWeight: '700'}}>Giá gói VIP 1 Tháng (đ):</Text>
              <TextInput 
                style={styles.addInput} 
                placeholder="Ví dụ: 40000" 
                placeholderTextColor={COLORS.textMuted} 
                keyboardType="numeric"
                value={String(sysConfig.vipPrice30D ?? 40000)} 
                onChangeText={(txt) => setSysConfig({...sysConfig, vipPrice30D: parseInt(txt) || 0})} 
              />

              <Text style={{color: '#8E8E93', marginTop: 15, marginBottom: 6, fontSize: 13, fontWeight: '700'}}>Giá gói VIP 1 Năm (đ):</Text>
              <TextInput 
                style={styles.addInput} 
                placeholder="Ví dụ: 300000" 
                placeholderTextColor={COLORS.textMuted} 
                keyboardType="numeric"
                value={String(sysConfig.vipPrice1Y ?? 300000)} 
                onChangeText={(txt) => setSysConfig({...sysConfig, vipPrice1Y: parseInt(txt) || 0})} 
              />

              <Text style={{color: '#8E8E93', marginTop: 15, marginBottom: 6, fontSize: 13, fontWeight: '700'}}>Mô tả quyền lợi VIP (mỗi dòng một quyền lợi):</Text>
              <TextInput 
                style={[styles.textArea, { height: 120 }]} 
                placeholder="Nhập danh sách quyền lợi..." 
                placeholderTextColor={COLORS.textMuted} 
                multiline 
                value={sysConfig.vipFeaturesText} 
                onChangeText={(txt) => setSysConfig({...sysConfig, vipFeaturesText: txt})} 
              />

              <TouchableOpacity style={[styles.submitBtn, {marginTop: 20, backgroundColor: '#FFE259'}]} onPress={saveSettings}>
                <Text style={[styles.submitBtnText, {color: '#000'}]}>LƯU CẤU HÌNH GÓI VIP</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.title}>CẤU HÌNH CẬP NHẬT ỨNG DỤNG (FORCE UPDATE)</Text>
            <View style={styles.userCard}>
              <View style={styles.settingRow}>
                <Text style={styles.settingText}>Bắt buộc cập nhật</Text>
                <Switch 
                  value={sysConfig.forceUpdateShow || false} 
                  onValueChange={(val) => setSysConfig({...sysConfig, forceUpdateShow: val})} 
                />
              </View>

              <View style={styles.settingRow}>
                <Text style={styles.settingText}>Cho phép bỏ qua cập nhật</Text>
                <Switch 
                  value={sysConfig.forceUpdateAllowSkip || false} 
                  onValueChange={(val) => setSysConfig({...sysConfig, forceUpdateAllowSkip: val})} 
                />
              </View>
              
              <Text style={{color: '#8E8E93', marginBottom: 6, fontSize: 13, fontWeight: '700'}}>Nội dung thông báo cập nhật:</Text>
              <TextInput 
                style={styles.textArea} 
                placeholder="Nhập nội dung yêu cầu cập nhật..." 
                placeholderTextColor={COLORS.textMuted} 
                multiline 
                value={sysConfig.forceUpdateMsg || ''} 
                onChangeText={(txt) => setSysConfig({...sysConfig, forceUpdateMsg: txt})} 
              />

              <Text style={{color: '#8E8E93', marginTop: 15, marginBottom: 6, fontSize: 13, fontWeight: '700'}}>Đường dẫn cập nhật (URL):</Text>
              <TextInput 
                style={styles.addInput} 
                placeholder="Nhập link cập nhật (VD: https://...)" 
                placeholderTextColor={COLORS.textMuted} 
                value={sysConfig.forceUpdateUrl || ''} 
                onChangeText={(txt) => setSysConfig({...sysConfig, forceUpdateUrl: txt})} 
              />

              <TouchableOpacity style={[styles.submitBtn, {marginTop: 20, backgroundColor: '#FF453A'}]} onPress={saveSettings}>
                <Text style={styles.submitBtnText}>LƯU CẤU HÌNH CẬP NHẬT</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.title}>THÔNG BÁO TRONG APP (TRANG CHỦ)</Text>
            <View style={styles.userCard}>
              <View style={styles.settingRow}>
                <Text style={styles.settingText}>Bật Popup thông báo</Text>
                <Switch 
                  value={sysConfig.homePopupShow} 
                  onValueChange={(val) => setSysConfig({...sysConfig, homePopupShow: val})} 
                />
              </View>
              
              <Text style={{color: '#8E8E93', marginBottom: 6, fontSize: 13, fontWeight: '700'}}>Tiêu đề:</Text>
              <TextInput 
                style={styles.addInput} 
                placeholder="Nhập tiêu đề..." 
                placeholderTextColor={COLORS.textMuted} 
                value={sysConfig.homePopupTitle} 
                onChangeText={(txt) => setSysConfig({...sysConfig, homePopupTitle: txt})} 
              />
              
              <Text style={{color: '#8E8E93', marginBottom: 6, fontSize: 13, fontWeight: '700'}}>Nội dung Popup:</Text>
              <TextInput 
                style={styles.textArea} 
                placeholder="Nhập nội dung..." 
                placeholderTextColor={COLORS.textMuted} 
                multiline 
                value={sysConfig.homePopupMsg} 
                onChangeText={(txt) => setSysConfig({...sysConfig, homePopupMsg: txt})} 
              />

              <Text style={{color: '#8E8E93', marginTop: 15, marginBottom: 6, fontSize: 13, fontWeight: '700'}}>URL Hình ảnh (Banner):</Text>
              <TextInput 
                style={styles.addInput} 
                placeholder="Link hình ảnh (VD: https://...)" 
                placeholderTextColor={COLORS.textMuted} 
                value={sysConfig.homePopupImg} 
                onChangeText={(txt) => setSysConfig({...sysConfig, homePopupImg: txt})} 
              />
              {sysConfig.homePopupImg ? (
                <View style={{ marginTop: 10, borderRadius: 12, overflow: 'hidden', borderWidth: 0.8, borderColor: COLORS.border }}>
                  <Image source={{ uri: sysConfig.homePopupImg }} style={{ width: '100%', height: 120 }} resizeMode="cover" />
                </View>
              ) : null}

              <Text style={{color: '#8E8E93', marginTop: 15, marginBottom: 6, fontSize: 13, fontWeight: '700'}}>URL Hành động (Khi nhấn nút):</Text>
              <TextInput 
                style={styles.addInput} 
                placeholder="Đường dẫn liên kết (VD: https://...)" 
                placeholderTextColor={COLORS.textMuted} 
                value={sysConfig.homePopupUrl} 
                onChangeText={(txt) => setSysConfig({...sysConfig, homePopupUrl: txt})} 
              />

              <TouchableOpacity style={[styles.submitBtn, {marginTop: 20, backgroundColor: '#30D158'}]} onPress={saveSettings}>
                <Text style={styles.submitBtnText}>LƯU THÔNG BÁO TRONG APP</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.title}>GỬI THÔNG BÁO MÁY (PUSH NOTIFICATIONS)</Text>
            <View style={styles.userCard}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, paddingBottom: 10, borderBottomWidth: 0.8, borderColor: COLORS.border }}>
                <Text style={{ color: '#FFF', fontWeight: 'bold' }}>Thiết bị đã đăng ký:</Text>
                <Text style={{ color: COLORS.primary, fontWeight: '900', fontSize: 16 }}>{registeredDeviceCount} thiết bị</Text>
              </View>

              <Text style={{color: '#8E8E93', marginBottom: 6, fontSize: 13, fontWeight: '700'}}>Tiêu đề thông báo đẩy:</Text>
              <TextInput 
                style={styles.addInput} 
                placeholder="Nhập tiêu đề push..." 
                placeholderTextColor={COLORS.textMuted} 
                value={pushTitle} 
                onChangeText={setPushTitle} 
              />

              <Text style={{color: '#8E8E93', marginBottom: 6, fontSize: 13, fontWeight: '700'}}>Nội dung thông báo đẩy:</Text>
              <TextInput 
                style={styles.textArea} 
                placeholder="Nhập nội dung push..." 
                placeholderTextColor={COLORS.textMuted} 
                multiline 
                value={pushBody} 
                onChangeText={setPushBody} 
              />

              <Text style={{color: '#8E8E93', marginTop: 15, marginBottom: 6, fontSize: 13, fontWeight: '700'}}>URL hành động đính kèm (Ví dụ: link tải IPA):</Text>
              <TextInput 
                style={styles.addInput} 
                placeholder="Link hành động (nếu có)..." 
                placeholderTextColor={COLORS.textMuted} 
                value={pushUrl} 
                onChangeText={setPushUrl} 
              />

              <Text style={{color: '#8E8E93', marginTop: 15, marginBottom: 10, fontSize: 13, fontWeight: '700'}}>Hẹn giờ gửi thông báo:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 5 }}>
                {[
                  { label: 'Gửi ngay', value: '0' },
                  { label: '5 Phút', value: '5' },
                  { label: '15 Phút', value: '15' },
                  { label: '1 Giờ', value: '60' },
                  { label: '3 Giờ', value: '180' },
                  { label: '1 Ngày', value: '1440' },
                  { label: 'Tự chọn', value: 'custom' },
                ].map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[
                      styles.typeBtn, 
                      { paddingHorizontal: 12, height: 38 },
                      scheduleDelay === opt.value && { borderColor: COLORS.primary, backgroundColor: 'rgba(255, 69, 58, 0.1)' }
                    ]}
                    onPress={() => setScheduleDelay(opt.value)}
                  >
                    <Text style={[
                      styles.typeBtnText, 
                      { fontSize: 12 },
                      scheduleDelay === opt.value && { color: COLORS.primary }
                    ]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {scheduleDelay === 'custom' ? (
                <View style={[styles.customTimeContainer, { borderColor: COLORS.border }]}>
                  <Text style={{ color: '#8E8E93', marginBottom: 12, fontSize: 13, fontWeight: '700' }}>Tùy chỉnh thời gian hẹn gửi:</Text>
                  
                  {Platform.OS === 'web' ? (
                    <Text style={{ color: '#FFF', textAlign: 'center', marginVertical: 10 }}>Không hỗ trợ chọn ngày trên web</Text>
                  ) : Platform.OS === 'ios' ? (
                    <DateTimePicker
                      value={customDate}
                      mode="datetime"
                      display="inline"
                      themeVariant="dark"
                      minimumDate={new Date()}
                      onChange={(event, date) => {
                        if (date) setCustomDate(date);
                      }}
                      style={{ alignSelf: 'center', marginTop: 10 }}
                    />
                  ) : (
                    <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'center', marginTop: 10 }}>
                      <TouchableOpacity 
                        style={styles.pickerTriggerBtn} 
                        onPress={() => { setPickerMode('date'); setShowDatePicker(true); }}
                      >
                        <Text style={styles.pickerTriggerText}>📅 {customDate.toLocaleDateString('vi-VN')}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={styles.pickerTriggerBtn} 
                        onPress={() => { setPickerMode('time'); setShowDatePicker(true); }}
                      >
                        <Text style={styles.pickerTriggerText}>⏰ {customDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false })}</Text>
                      </TouchableOpacity>
                      
                      {showDatePicker && (
                        <DateTimePicker
                          value={customDate}
                          mode={pickerMode}
                          is24Hour={true}
                          display="default"
                          minimumDate={new Date()}
                          onChange={(event, date) => {
                            setShowDatePicker(false);
                            if (date) setCustomDate(date);
                          }}
                        />
                      )}
                    </View>
                  )}

                  {/* Hiển thị tóm tắt thời gian dự kiến gửi */}
                  <View style={styles.timeSummaryBox}>
                    <Text style={styles.timeSummaryText}>
                      Thời gian dự kiến: <Text style={{ fontWeight: 'bold', color: COLORS.primary }}>
                        {customDate.toLocaleString('vi-VN')}
                      </Text>
                    </Text>
                  </View>
                </View>
              ) : null}

              <TouchableOpacity 
                style={[styles.submitBtn, {marginTop: 20, backgroundColor: scheduleDelay === '0' ? COLORS.danger : '#FF9500'}]} 
                onPress={scheduleDelay === '0' ? handleSendPushNotifications : handleSchedulePush}
                disabled={isSendingPush}
              >
                {isSendingPush ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.submitBtnText}>
                    {scheduleDelay === '0' ? 'PHÁT THÔNG BÁO ĐẨY HÀNG LOẠT' : 'ĐẶT LỊCH HẸN GIỜ GỬI'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>

            <Text style={styles.title}>DANH SÁCH LỊCH HẸN GỬI THÔNG BÁO</Text>
            {scheduledPushes.length === 0 ? (
              <View style={styles.userCard}>
                <Text style={{ color: '#8E8E93', textAlign: 'center', fontSize: 13 }}>Không có lịch hẹn nào đang có.</Text>
              </View>
            ) : (
              scheduledPushes.map((item, idx) => {
                const isPending = item.status === 'PENDING';
                return (
                  <View key={idx} style={[styles.userCard, { padding: 15, marginBottom: 10 }]}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 15, flex: 1, marginRight: 10 }} numberOfLines={1}>
                        {item.title}
                      </Text>
                      <View style={{
                        backgroundColor: isPending ? 'rgba(255, 149, 0, 0.12)' : item.status.startsWith('FAILED') ? 'rgba(255, 69, 58, 0.12)' : 'rgba(48, 209, 88, 0.12)',
                        paddingHorizontal: 8,
                        paddingVertical: 3,
                        borderRadius: 6,
                        borderWidth: 0.5,
                        borderColor: isPending ? 'rgba(255, 149, 0, 0.4)' : item.status.startsWith('FAILED') ? 'rgba(255, 69, 58, 0.4)' : 'rgba(48, 209, 88, 0.4)'
                      }}>
                        <Text style={{ color: isPending ? '#FF9500' : item.status.startsWith('FAILED') ? '#FF453A' : '#30D158', fontSize: 10, fontWeight: 'bold' }}>
                          {item.status}
                        </Text>
                      </View>
                    </View>
                    
                    <Text style={{ color: '#8E8E93', fontSize: 13, marginBottom: 10 }} numberOfLines={2}>
                      {item.body}
                    </Text>

                    {item.url ? (
                      <Text style={{ color: COLORS.primary, fontSize: 11, marginBottom: 10 }} numberOfLines={1}>
                        Liên kết: {item.url}
                      </Text>
                    ) : null}

                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, borderTopWidth: 0.5, borderColor: 'rgba(255, 255, 255, 0.05)' }}>
                      <View>
                        <Text style={{ color: '#555', fontSize: 11 }}>
                          Gửi lúc: {new Date(item.time).toLocaleString('vi-VN')}
                        </Text>
                        {item.sentCount ? (
                          <Text style={{ color: COLORS.success, fontSize: 10, fontWeight: '700', marginTop: 2 }}>
                            Đã gửi: {item.sentCount} thiết bị
                          </Text>
                        ) : null}
                      </View>
                      {isPending ? (
                        <TouchableOpacity 
                          style={{ paddingHorizontal: 12, paddingVertical: 6, backgroundColor: 'rgba(255,69,58,0.1)', borderRadius: 8 }}
                          onPress={() => handleDeleteScheduledPush(item.row, item.title)}
                        >
                          <Text style={{ color: '#FF453A', fontSize: 12, fontWeight: 'bold' }}>Hủy lịch</Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}
      </ScrollView>
    </LinearGradient>
  );
}

const getStyles = (theme: typeof COLORS) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 60, paddingHorizontal: 20, paddingBottom: 15, borderBottomWidth: 0.8, borderColor: theme.border },
  headerTitle: { color: theme.danger, fontSize: 18, fontWeight: '800', letterSpacing: 1 },
  backBtn: { padding: 5, marginLeft: -5 },
  tabBar: { paddingHorizontal: 20, paddingVertical: 15, gap: 10 },
  tabBtn: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10, alignItems: 'center', borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 0.8, borderColor: theme.border },
  tabBtnActive: { backgroundColor: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.2)' },
  tabText: { color: theme.textMuted, fontSize: 12, fontWeight: '800', letterSpacing: 0.5 },
  content: { padding: 20, paddingBottom: 80 },

  loginContainer: { flex: 1, backgroundColor: theme.background, justifyContent: 'center', padding: 20 },
  closeBtn: { position: 'absolute', top: 60, right: 20, zIndex: 10 },
  loginBox: { backgroundColor: theme.surfaceSolid, padding: 30, borderRadius: 24, alignItems: 'center', borderWidth: 0.8, borderColor: theme.border },
  logoCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255, 69, 58, 0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  loginTitle: { color: theme.text, fontSize: 24, fontWeight: '800', marginBottom: 25 },
  inputGroup: { width: '100%', height: 55, backgroundColor: theme.background === '#F4F4F6' ? 'rgba(0,0,0,0.05)' : '#000', borderRadius: 16, marginBottom: 20, paddingHorizontal: 15, borderWidth: 0.8, borderColor: theme.border, justifyContent: 'center' },
  input: { color: theme.text, fontSize: 18, textAlign: 'center', fontWeight: 'bold' },
  submitBtn: { backgroundColor: theme.danger, width: '100%', height: 55, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  submitBtnText: { color: '#FFF', fontSize: 16, fontWeight: '800' },

  title: { color: theme.textMuted, fontSize: 13, fontWeight: '800', marginBottom: 15, letterSpacing: 1 },
  userCard: { backgroundColor: theme.surfaceCard, padding: 20, borderRadius: 16, marginBottom: 15, borderWidth: 0.8, borderColor: theme.border },
  userName: { color: theme.text, fontSize: 18, fontWeight: '700' },
  userEmail: { color: theme.textMuted, fontSize: 14, marginTop: 4 },
  vipTag: { alignSelf: 'flex-start', backgroundColor: 'rgba(48, 209, 88, 0.15)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 0.8, borderColor: 'rgba(48, 209, 88, 0.5)' },
  vipTagText: { color: theme.success, fontSize: 12, fontWeight: 'bold' },
  
  actionRow: { flexDirection: 'row', gap: 8, marginTop: 15 },
  actionBtn: { flex: 1, flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.03)', paddingVertical: 12, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 0.8, borderColor: theme.border },
  actionText: { color: theme.text, fontSize: 12, fontWeight: 'bold' },
  cancelVipBtn: { flexDirection: 'row', marginTop: 8, backgroundColor: theme.danger, paddingVertical: 12, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, paddingBottom: 15, borderBottomWidth: 0.8, borderBottomColor: theme.border },
  settingText: { color: theme.text, fontSize: 16, fontWeight: '600' },
  textArea: { 
    backgroundColor: theme.background === '#F4F4F6' ? 'rgba(0,0,0,0.04)' : 'rgba(0,0,0,0.3)', 
    color: theme.text, 
    padding: 15, 
    borderRadius: 12, 
    height: 120, 
    textAlignVertical: 'top', 
    borderWidth: 0.8, 
    borderColor: theme.border, 
    fontSize: 15 
  },
  addInput: { 
    backgroundColor: theme.background === '#F4F4F6' ? 'rgba(0,0,0,0.04)' : 'rgba(0,0,0,0.3)', 
    borderRadius: 12, 
    height: 50, 
    color: theme.text, 
    paddingHorizontal: 15, 
    marginBottom: 10, 
    borderWidth: 0.8, 
    borderColor: theme.border 
  },

  // Dashbard & Inventory
  statCard: { width: '48%', backgroundColor: theme.surfaceCard, padding: 15, borderRadius: 16, borderWidth: 0.8, borderColor: theme.border },
  statIconBox: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  statLabel: { color: theme.textMuted, fontSize: 10, fontWeight: '900', letterSpacing: 1, marginBottom: 4 },
  statValue: { color: theme.text, fontSize: 22, fontWeight: '900' },
  invCard: { backgroundColor: theme.surfaceCard, padding: 20, borderRadius: 16, borderWidth: 0.8, borderColor: theme.border, marginBottom: 10 },

  typeBtn: { flex: 1, flexDirection: 'row', height: 45, borderRadius: 10, borderWidth: 0.8, borderColor: theme.border, alignItems: 'center', justifyContent: 'center', gap: 6 },
  typeBtnActive: { backgroundColor: 'rgba(255,255,255,0.08)', borderColor: '#FFF' },
  typeBtnText: { color: theme.textMuted, fontSize: 13, fontWeight: 'bold' },

  gcCard: { flexDirection: 'row', backgroundColor: theme.surfaceCard, padding: 20, borderRadius: 16, borderWidth: 0.8, borderColor: theme.border, marginBottom: 10, alignItems: 'center' },

  // Custom Time Selector styles
  customTimeContainer: {
    backgroundColor: 'rgba(0,0,0,0.15)',
    padding: 15,
    borderRadius: 14,
    borderWidth: 0.8,
    marginTop: 10,
    marginBottom: 10,
    gap: 12
  },
  timeSelectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  timeSelectLabel: {
    fontSize: 14,
    fontWeight: '600'
  },
  timeSelectorGroup: {
    flexDirection: 'row',
    gap: 8
  },
  timeChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 0.8,
    borderColor: theme.border,
    backgroundColor: 'rgba(255,255,255,0.02)'
  },
  timeChipActive: {
    backgroundColor: theme.primary,
    borderColor: theme.primary
  },
  timeChipText: {
    color: theme.textMuted,
    fontSize: 12,
    fontWeight: 'bold'
  },
  counterControl: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  counterBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.8,
    borderColor: theme.border
  },
  counterBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold'
  },
  counterValue: {
    fontSize: 16,
    fontWeight: 'bold',
    minWidth: 24,
    textAlign: 'center'
  },
  timeSummaryBox: {
    marginTop: 5,
    paddingTop: 10,
    borderTopWidth: 0.5,
    borderColor: theme.border,
    alignItems: 'center'
  },
  timeSummaryText: {
    color: theme.textMuted,
    fontSize: 12
  },
  pickerTriggerBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 0.8,
    borderColor: theme.border,
    backgroundColor: 'rgba(255,255,255,0.03)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerTriggerText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
  }
});