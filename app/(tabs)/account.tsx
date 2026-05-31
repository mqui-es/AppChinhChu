import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, Image, TouchableOpacity, Alert, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator, Modal } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router'; 
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';

// SVG TỪ LUCIDE
import { Fingerprint, User, Mail, Lock, BellRing, Star, Gem, ChevronRight, CloudDownload, Clock, ShieldCheck, Languages, Palette } from 'lucide-react-native';

import { auth, db } from '../../firebaseConfig';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc, getDoc, onSnapshot } from 'firebase/firestore';
import { COLORS, SIZES, SHADOWS, TXT, useThemeUpdate, notifyThemeChange, loadTheme, loadLanguage, THEME_STYLES } from '../../constants/theme';

const GOOGLE_SHEET_WEBHOOK = "https://script.google.com/macros/s/AKfycbyXnH5KjwQVafxGW_W2KlpDY9KHBx_0TAmaNZBqUaPz9WR8T1PDKwB9un37fNA_YO7pmg/exec";
const ADMIN_EMAIL = "mquitran@gmail.com"; 

interface UserData { fullname?: string; email?: string; coins?: number; vipExpire?: any; }

export default function AccountScreen() {
  useThemeUpdate();
  const router = useRouter(); 
  const styles = getStyles(COLORS);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userData, setUserData] = useState<UserData | null>(null);

  const [fullname, setFullname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [sysPopup, setSysPopup] = useState({ show: false, msg: '' });

  useEffect(() => {
    let unsubDoc: any;
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setIsLoggedIn(true);
        unsubDoc = onSnapshot(doc(db, 'users', user.uid), (docSnap) => {
          if (docSnap.exists()) setUserData(docSnap.data() as UserData);
        });
        const snapConfig = await getDoc(doc(db, 'settings', 'config'));
        if (snapConfig.exists() && snapConfig.data().showPopup) setSysPopup({ show: true, msg: snapConfig.data().popupMsg });
      } else {
        setIsLoggedIn(false); setUserData(null);
        if (unsubDoc) unsubDoc();
      }
      setIsLoading(false);
    });
    return () => { unsubscribeAuth(); if (unsubDoc) unsubDoc(); };
  }, []);

  const handleAuth = async () => {
    if (!email || !password || (isRegisterMode && !fullname)) return Alert.alert(TXT.errorLabel, TXT.langName === 'English' ? 'Please fill in all fields!' : 'Nhập đủ thông tin!');
    setIsLoading(true);
    try {
      if (isRegisterMode) {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        const newUserData = { fullname, email: email.toLowerCase(), coins: 0 };
        await setDoc(doc(db, 'users', cred.user.uid), newUserData);
        fetch(GOOGLE_SHEET_WEBHOOK, { method: 'POST', body: JSON.stringify({ email, action: "Tạo Tài Khoản", amount: "0", status: "Thành công" }) }).catch(()=>{});
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (error: any) { Alert.alert(TXT.errorLabel, TXT.langName === 'English' ? 'Incorrect login credentials!' : 'Thông tin sai!'); }
    finally { setIsLoading(false); }
  };

  const handleLogout = async () => {
    Alert.alert(TXT.confirmLogoutTitle, TXT.confirmLogoutMsg, [{ text: TXT.cancelBtn, style: 'cancel' }, { text: TXT.confirmExit, style: 'destructive', onPress: async () => { setIsLoading(true); await signOut(auth); setPassword(''); }}]);
  };

  const getVipMillis = () => {
    if (!userData?.vipExpire) return 0;
    if (typeof userData.vipExpire.toMillis === 'function') return userData.vipExpire.toMillis();
    if (userData.vipExpire.seconds) return userData.vipExpire.seconds * 1000;
    return Number(userData.vipExpire) || 0;
  };

  const vipMillis = getVipMillis();
  const isVipActive = vipMillis > Date.now();

  const getVipRemainingDays = () => {
    if (!isVipActive) return TXT.noVipStatus;
    const diff = vipMillis - Date.now();
    return Math.ceil(diff / (1000 * 60 * 60 * 24)) + TXT.daysRemaining;
  };

  const renderRow = (IconComponent: any, title: string, value?: string, color: string = '#0A84FF', isLast: boolean = false, onPress?: () => void) => (
    <TouchableOpacity style={styles.row} activeOpacity={0.7} onPress={onPress}>
      <View style={[styles.iconBox, { backgroundColor: color }]}><IconComponent color="#FFF" size={16} strokeWidth={2.5} /></View>
      <View style={[styles.rowContent, !isLast && styles.rowBorder]}>
         <Text style={styles.rowTitle}>{title}</Text>
         <View style={{flexDirection: 'row', alignItems: 'center'}}>{value && <Text style={styles.rowValue}>{value}</Text>}<ChevronRight color={COLORS.textMuted} size={18} /></View>
      </View>
    </TouchableOpacity>
  );

  const isLightMode = COLORS.background === '#F2F2F7';

  if (isLoading && !isLoggedIn && !email) {
    return (
      <LinearGradient colors={COLORS.bgGradient} style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </LinearGradient>
    );
  }

  if (!isLoggedIn) {
    return (
      <LinearGradient colors={COLORS.bgGradient} style={styles.gradientContainer}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.authContainer}>
           <StatusBar style={isLightMode ? 'dark' : 'light'} />
           <View style={[styles.authBox, SHADOWS.glowDark]}>
              <BlurView intensity={25} tint={isLightMode ? 'light' : 'dark'} style={StyleSheet.absoluteFill} />
              <View style={styles.authBoxInside}>
                <View style={[styles.authLogo, SHADOWS.glowBlue]}><Fingerprint color={COLORS.primary} size={42} strokeWidth={2} /></View>
                <Text style={styles.authTitle}>{isRegisterMode ? TXT.authTitleRegister : TXT.authTitleLogin}</Text>
                <Text style={styles.authSub}>{TXT.cloudSystemSub}</Text>
                
                {isRegisterMode && (
                  <View style={styles.inputWrap}>
                    <User color={COLORS.textMuted} size={20} style={styles.inputIcon}/>
                    <TextInput style={styles.input} placeholder={TXT.fullnamePlaceholder} placeholderTextColor={COLORS.textMuted} value={fullname} onChangeText={setFullname} />
                  </View>
                )}
                <View style={styles.inputWrap}>
                  <Mail color={COLORS.textMuted} size={20} style={styles.inputIcon}/>
                  <TextInput style={styles.input} placeholder="Email" placeholderTextColor={COLORS.textMuted} autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
                </View>
                <View style={styles.inputWrap}>
                  <Lock color={COLORS.textMuted} size={20} style={styles.inputIcon}/>
                  <TextInput style={styles.input} placeholder={TXT.passwordPlaceholder} placeholderTextColor={COLORS.textMuted} secureTextEntry value={password} onChangeText={setPassword} />
                </View>
                
                <TouchableOpacity style={styles.authBtn} activeOpacity={0.8} onPress={handleAuth} disabled={isLoading}>
                  <LinearGradient colors={COLORS.primaryGradient} start={{x:0, y:0}} end={{x:1, y:0}} style={styles.authBtnGradient}>
                    {isLoading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.authBtnText}>{isRegisterMode ? TXT.registerBtnText : TXT.loginBtnText}</Text>}
                  </LinearGradient>
                </TouchableOpacity>
                
                <TouchableOpacity style={{marginTop: 24}} onPress={() => setIsRegisterMode(!isRegisterMode)}>
                  <Text style={styles.authSwitchText}>{isRegisterMode ? TXT.switchLoginText : TXT.switchRegisterText}</Text>
                </TouchableOpacity>
              </View>
           </View>
        </KeyboardAvoidingView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={COLORS.bgGradient} style={styles.container}>
      <StatusBar style={isLightMode ? 'dark' : 'light'} />
      <Modal visible={sysPopup.show} transparent animationType="fade">
        <View style={styles.modalBg}>
          <View style={[styles.modalBox, SHADOWS.glowDark]}>
            <BellRing color={COLORS.warning} size={60} strokeWidth={1.5} style={{marginBottom: 10}}/>
            <Text style={styles.modalTitle}>{TXT.systemNotificationTitle}</Text>
            <Text style={styles.modalMsg}>{sysPopup.msg}</Text>
            <TouchableOpacity style={styles.modalBtn} activeOpacity={0.8} onPress={() => setSysPopup({show: false, msg: ''})}><Text style={styles.modalBtnText}>{TXT.understoodBtn}</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      <View style={styles.header}><Text style={styles.largeTitle}>{TXT.profile}</Text></View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* CARD PROFILE */}
        <View style={[styles.profileCard, SHADOWS.glowCard]}>
          <BlurView intensity={20} tint={isLightMode ? 'light' : 'dark'} style={StyleSheet.absoluteFill} />
          <View style={styles.profileCardInside}>
            <Image source={{ uri: `https://ui-avatars.com/api/?name=${encodeURIComponent(userData?.fullname || userData?.email || 'U')}&background=${COLORS.primary.substring(1)}&color=fff&size=512` }} style={styles.avatar} />
            <View style={styles.profileInfo}>
              <Text style={styles.profileName} numberOfLines={1}>{userData?.fullname || TXT.customerGuest}</Text>
              <Text style={styles.profileEmail} numberOfLines={1}>{userData?.email}</Text>
              {isVipActive ? (
                <LinearGradient colors={COLORS.goldGradient} start={{x:0, y:0}} end={{x:1, y:1}} style={styles.vipTag}>
                  <Star color="#000" size={12} fill="#000" style={{marginRight: 4}}/>
                  <Text style={styles.vipTagText}>VIP: {getVipRemainingDays()}</Text>
                </LinearGradient>
              ) : (
                <View style={[styles.vipTag, {backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 0.8, borderColor: 'rgba(255,255,255,0.06)'}]}>
                  <Text style={[styles.vipTagText, {color: COLORS.textMuted}]}>{TXT.vipTagNormal}</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* BANNER NÂNG CẤP */}
        <TouchableOpacity style={[styles.vipBanner, SHADOWS.glowCard]} activeOpacity={0.85} onPress={() => router.push('/buy-vip')}>
          <LinearGradient colors={['rgba(255, 226, 89, 0.1)', 'rgba(255, 167, 81, 0.05)']} start={{x:0, y:0}} end={{x:1, y:1}} style={StyleSheet.absoluteFill} />
          <View style={styles.vipBannerLeft}>
            <Gem color={COLORS.gold} size={30} strokeWidth={1.8} />
            <View style={{marginLeft: 15}}>
              <Text style={[styles.vipBannerTitle, { color: COLORS.gold }]}>{isVipActive ? TXT.vipExtend : TXT.vipUpgrade}</Text>
              <Text style={styles.vipBannerSub}>{TXT.vipSubText}</Text>
            </View>
          </View>
          <ChevronRight color={COLORS.gold} size={22} />
        </TouchableOpacity>

        {/* CÀI ĐẶT ỨNG DỤNG */}
        <Text style={styles.groupTitle}>{TXT.settings}</Text>
        <View style={[styles.group, SHADOWS.glowCard]}>
          <BlurView intensity={20} tint={isLightMode ? 'light' : 'dark'} style={StyleSheet.absoluteFill} />
          <View style={styles.groupInside}>
            {renderRow(Palette, TXT.setupThemeRow, TXT.openLabel, '#BF5AF2', true, () => router.push('/settings'))}
          </View>
        </View>

        <Text style={styles.groupTitle}>{TXT.cloudAccountHeader}</Text>
        <View style={[styles.group, SHADOWS.glowCard]}>
          <BlurView intensity={20} tint={isLightMode ? 'light' : 'dark'} style={StyleSheet.absoluteFill} />
          <View style={styles.groupInside}>
            {renderRow(CloudDownload, TXT.cloudStorage, '5 GB', '#0A84FF', false)}
            {renderRow(Clock, TXT.history, TXT.langName === 'English' ? 'Lookup' : 'Tra cứu', '#32D74B', true)}
          </View>
        </View>

        {userData?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase() && (
          <>
            <Text style={styles.groupTitle}>{TXT.adminArea.toUpperCase()}</Text>
            <View style={[styles.group, SHADOWS.glowCard]}>
              <BlurView intensity={20} tint={isLightMode ? 'light' : 'dark'} style={StyleSheet.absoluteFill} />
              <View style={styles.groupInside}>
                {renderRow(ShieldCheck, TXT.adminArea, TXT.langName === 'English' ? 'Required PIN' : 'Yêu cầu PIN', '#FF453A', true, () => router.push('/admin'))}
              </View>
            </View>
          </>
        )}

        <TouchableOpacity style={styles.logoutBtn} activeOpacity={0.8} onPress={handleLogout}>
          <Text style={styles.logoutText}>{TXT.logout}</Text>
        </TouchableOpacity>
      </ScrollView>
    </LinearGradient>
  );
}

const getStyles = (theme: typeof COLORS) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  gradientContainer: { flex: 1 },
  header: { paddingTop: 60, paddingHorizontal: 20, paddingBottom: 10 },
  largeTitle: { color: theme.text, fontSize: 34, fontWeight: '800', letterSpacing: -0.5 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 160 },
  
  authContainer: { flex: 1, justifyContent: 'center', padding: 16 },
  authBox: { borderRadius: SIZES.radiusSquircle, borderWidth: 0.8, borderColor: theme.border, overflow: 'hidden', backgroundColor: theme.surfaceCard },
  authBoxInside: { padding: 30, alignItems: 'center' },
  authLogo: { width: 80, height: 80, borderRadius: 24, backgroundColor: 'rgba(10, 132, 255, 0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  authTitle: { color: theme.text, fontSize: 28, fontWeight: '800', marginBottom: 6, letterSpacing: -0.5 },
  authSub: { color: theme.textMuted, fontSize: 14, marginBottom: 25 },
  
  inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.background === '#F2F2F7' ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.05)', borderRadius: 16, height: 54, marginBottom: 15, paddingHorizontal: 15, borderWidth: 0.8, borderColor: theme.border },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, color: theme.text, fontSize: 16, height: '100%' },
  
  authBtn: { width: '100%', height: 54, borderRadius: 16, overflow: 'hidden', marginTop: 10 },
  authBtnGradient: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
  authBtnText: { color: '#FFF', fontSize: 16, fontWeight: '800', letterSpacing: 1 },
  authSwitchText: { color: theme.primary, fontSize: 14, fontWeight: '600' },
  
  profileCard: { borderRadius: SIZES.radiusSquircle, marginTop: 10, marginBottom: 20, borderWidth: 0.8, borderColor: theme.border, overflow: 'hidden', backgroundColor: theme.surfaceCard },
  profileCardInside: { flexDirection: 'row', alignItems: 'center', padding: 20 },
  avatar: { width: 70, height: 70, borderRadius: 35, borderWidth: 2, borderColor: theme.border },
  profileInfo: { flex: 1, marginLeft: 16 },
  profileName: { color: theme.text, fontSize: 22, fontWeight: '800', marginBottom: 4, letterSpacing: -0.5 },
  profileEmail: { color: theme.textMuted, fontSize: 14, marginBottom: 8 },
  vipTag: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 9 },
  vipTagText: { color: '#000000', fontSize: 11, fontWeight: '900', letterSpacing: 0.5 },
  
  vipBanner: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    padding: 20, 
    borderRadius: SIZES.radiusCard, 
    marginBottom: 25, 
    borderWidth: 0.8, 
    borderColor: theme.border,
    overflow: 'hidden',
  },
  vipBannerLeft: { flexDirection: 'row', alignItems: 'center' },
  vipBannerTitle: { fontSize: 18, fontWeight: '800', marginBottom: 4, letterSpacing: -0.5 },
  vipBannerSub: { color: theme.background === '#F2F2F7' ? '#8A6D00' : '#FFE259', fontSize: 13, opacity: 0.95 },
  
  groupTitle: { color: theme.textMuted, fontSize: 12, fontWeight: '700', marginLeft: 15, marginBottom: 8, marginTop: 10, letterSpacing: 1 },
  group: { borderRadius: SIZES.radiusCard, overflow: 'hidden', marginBottom: 25, borderWidth: 0.8, borderColor: theme.border, backgroundColor: theme.surfaceCard },
  groupInside: { paddingLeft: 16 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'transparent' },
  iconBox: { width: 30, height: 30, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  rowContent: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 15, paddingRight: 15 },
  rowBorder: { borderBottomWidth: 0.8, borderBottomColor: theme.border },
  rowTitle: { color: theme.text, fontSize: 16, fontWeight: '600' },
  rowValue: { color: theme.textMuted, fontSize: 14, marginRight: 8 },
  
  logoutBtn: { backgroundColor: 'rgba(255, 69, 58, 0.1)', borderRadius: 20, paddingVertical: 16, alignItems: 'center', marginTop: 10, borderWidth: 0.8, borderColor: 'rgba(255, 69, 58, 0.25)' },
  logoutText: { color: theme.danger, fontSize: 16, fontWeight: '700' },
  
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalBox: { backgroundColor: theme.surfaceSolid, width: '100%', borderRadius: 24, padding: 30, alignItems: 'center', borderWidth: 0.8, borderColor: theme.border },
  modalTitle: { color: theme.text, fontSize: 22, fontWeight: '800', marginBottom: 15 },
  modalMsg: { color: theme.textSecondary, fontSize: 16, textAlign: 'center', lineHeight: 24, marginBottom: 25 },
  modalBtn: { backgroundColor: theme.gold, width: '100%', paddingVertical: 14, borderRadius: 16, alignItems: 'center' },
  modalBtnText: { color: '#000', fontSize: 16, fontWeight: '800' }
});