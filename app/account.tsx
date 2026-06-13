import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, ScrollView, Image, TouchableOpacity, Alert, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator, Modal, Dimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router'; 
import { GlassView } from '../components/ui/GlassView';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';

// SVG TỪ LUCIDE
import { 
  Fingerprint, User, Mail, Lock, BellRing, Star, Gem, ChevronRight, 
  CloudDownload, Clock, ShieldCheck, Languages, Palette, X, Database, 
  HelpCircle, MessageSquare, FileText, Shield, Instagram, Facebook, 
  Share2, RefreshCw
} from 'lucide-react-native';

import { auth, db } from '../firebaseConfig';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc, getDoc, onSnapshot } from 'firebase/firestore';
import { COLORS, SIZES, SHADOWS, TXT, useThemeUpdate, THEME_STYLES } from '../constants/theme';
import * as Linking from 'expo-linking';

const { width } = Dimensions.get('window');
const GOOGLE_SHEET_WEBHOOK = "https://script.google.com/macros/s/AKfycbyXnH5KjwQVafxGW_W2KlpDY9KHBx_0TAmaNZBqUaPz9WR8T1PDKwB9un37fNA_YO7pmg/exec";
const ADMIN_EMAIL = "mquitran@gmail.com"; 

interface UserData { fullname?: string; email?: string; coins?: number; vipExpire?: any; }

export default function AccountScreen() {
  useThemeUpdate();
  const router = useRouter(); 
  const navigateFromModal = (targetPath: string) => {
    router.back();
    setTimeout(() => {
      router.push(targetPath as any);
    }, 120);
  };
  const isLight = COLORS.background === '#F4F4F6';
  const styles = getStyles(COLORS, isLight);
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
        const newUserData = { fullname, email: email.toLowerCase(), coins: 10000 };
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

  const handleDeleteAccount = () => {
    Alert.alert(
      TXT.langName === 'English' ? 'Delete Account' : 'Xóa tài khoản',
      TXT.langName === 'English' ? 'WARNING: This action is permanent and cannot be undone!' : 'CẢNH BÁO: Hành động này sẽ xóa vĩnh viễn tài khoản của bạn và không thể khôi phục!',
      [
        { text: TXT.cancelBtn, style: 'cancel' },
        { 
          text: TXT.langName === 'English' ? 'Delete' : 'Xóa', 
          style: 'destructive', 
          onPress: async () => {
            setIsLoading(true);
            try {
              if (auth.currentUser) {
                await setDoc(doc(db, 'users', auth.currentUser.uid), {}, { merge: false });
                await auth.currentUser.delete();
                Alert.alert(TXT.successLabel, TXT.langName === 'English' ? 'Account deleted successfully!' : 'Đã xóa tài khoản thành công!');
              }
            } catch (error: any) {
              Alert.alert(TXT.errorLabel, TXT.langName === 'English' ? 'Failed to delete account. Please log in again.' : 'Không thể xóa tài khoản. Vui lòng đăng nhập lại.');
            } finally {
              setIsLoading(false);
            }
          }
        }
      ]
    );
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

  const renderRow = (IconComponent: any, title: string, value?: string, color: string = '#8E8E93', isLast: boolean = false, isExternal: boolean = false, onPress?: () => void) => (
    <TouchableOpacity style={styles.row} activeOpacity={0.7} onPress={onPress}>
      <View style={styles.iconBox}><IconComponent color={color} size={18} strokeWidth={2.2} /></View>
      <View style={[styles.rowContent, !isLast && styles.rowBorder]}>
         <Text style={styles.rowTitle}>{title}</Text>
         <View style={{flexDirection: 'row', alignItems: 'center'}}>
           {value && <Text style={styles.rowValue}>{value}</Text>}
           <ChevronRight color={COLORS.textMuted} size={16} style={{ transform: [{ rotate: isExternal ? '-45deg' : '0deg' }] }} />
         </View>
      </View>
    </TouchableOpacity>
  );

  const getFirstLetter = (name?: string) => {
    if (!name) return 'K';
    return name.charAt(0).toUpperCase();
  };

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
           <StatusBar style={isLight ? 'dark' : 'light'} />
           
           {/* BACK/CLOSE BUTTON */}
           <TouchableOpacity 
             style={{
               position: 'absolute',
               top: Platform.OS === 'ios' ? 60 : 30,
               right: 20,
               width: 36,
               height: 36,
               borderRadius: 18,
               backgroundColor: isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.08)',
               justifyContent: 'center',
               alignItems: 'center',
               zIndex: 9999,
               borderWidth: 0.8,
               borderColor: COLORS.border,
             }} 
             activeOpacity={0.7} 
             onPress={() => router.back()}
           >
             <X color={COLORS.text} size={20} />
           </TouchableOpacity>

           <View style={[styles.authBox, SHADOWS.glowDark]}>
              <GlassView intensity={25} tint={isLight ? 'light' : 'dark'} style={StyleSheet.absoluteFill} />
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

  const workspaceName = `${userData?.fullname || 'Khách'}'s Workspace`;

  return (
    <LinearGradient colors={COLORS.bgGradient} style={styles.container}>
      <StatusBar style={isLight ? 'dark' : 'light'} />
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

      {/* TOP CLOSE BUTTON */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.closeBtn} activeOpacity={0.7} onPress={() => router.back()}>
          <X color={COLORS.text} size={20} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* CENTER PROFILE HEADER */}
        <View style={styles.profileHeaderSection}>
          <View style={[styles.avatarWrapper, SHADOWS.glowCard, { justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }]}>
            <LinearGradient
              colors={COLORS.primaryGradient}
              style={StyleSheet.absoluteFill}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
            <Text style={{ 
              color: '#FFFFFF', 
              fontSize: 36, 
              fontWeight: '800', 
              fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'System' 
            }}>
              {getFirstLetter(userData?.fullname || userData?.email)}
            </Text>
          </View>
          
          <TouchableOpacity style={styles.workspacePill} activeOpacity={0.8}>
            <View style={styles.workspaceLetterBadge}>
              <Text style={styles.workspaceLetter}>{getFirstLetter(userData?.fullname || userData?.email)}</Text>
            </View>
            <Text style={styles.workspaceText} numberOfLines={1}>{workspaceName}</Text>
            <ChevronRight color={COLORS.textMuted} size={12} style={{ transform: [{ rotate: '90deg' }], marginLeft: 2 }} />
          </TouchableOpacity>

          <Text style={styles.profileName}>{userData?.fullname || TXT.customerGuest}</Text>
          <Text style={styles.profileEmail}>{userData?.email}</Text>
          
          <Text style={styles.creditsText}>• {userData?.coins ? userData.coins.toLocaleString('vi-VN') : '10.000'} credits</Text>
        </View>

        {/* MODERN UPGRADE CARD */}
        <View style={[styles.upgradeCard, SHADOWS.glowCard]}>
          {/* Top Gradient Box */}
          <LinearGradient 
            colors={['#FF4B2B', '#FF416C', '#8A2387']} 
            start={{ x: 0, y: 0 }} 
            end={{ x: 1, y: 1 }} 
            style={styles.upgradeGradientBg}
          >
            <View style={styles.creatorPill}>
              <Text style={styles.creatorPillText}>{isVipActive ? 'VIP Member' : 'Creator'}</Text>
            </View>
          </LinearGradient>
          
          {/* Upgrade Content Info */}
          <View style={styles.upgradeContent}>
            <Text style={styles.upgradeTitle}>
              {isVipActive ? TXT.vipExtend : TXT.vipUpgrade}
            </Text>
            <Text style={styles.upgradeDesc}>
              {isVipActive 
                ? `VIP của sếp còn lại ${getVipRemainingDays()}. Hãy gia hạn để duy trì đặc quyền tải tốc độ cao!`
                : 'Mở khóa kho ứng dụng Độc quyền, Ký file IPA ngoại tuyến và tải trực tiếp qua OTA tốc độ cực đại!'
              }
            </Text>
            
            <TouchableOpacity 
              style={styles.upgradeBlackBtn} 
              activeOpacity={0.85} 
              onPress={() => navigateFromModal('/buy-vip')}
            >
              <Text style={styles.upgradeBlackBtnText}>{isVipActive ? 'Gia hạn gói' : 'Nâng cấp ngay'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ACCOUNT INFO GROUP */}
        <View style={[styles.groupCard, SHADOWS.glowCard]}>
          <View style={styles.groupInside}>
            <View style={styles.detailRow}>
              <View style={styles.detailRowLabelGroup}>
                <Mail color="#8E8E93" size={18} strokeWidth={2.2} />
                <Text style={styles.detailRowLabel}>Email</Text>
              </View>
              <Text style={styles.detailRowValue} numberOfLines={1}>{userData?.email}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.detailRow}>
              <View style={styles.detailRowLabelGroup}>
                <User color="#8E8E93" size={18} strokeWidth={2.2} />
                <Text style={styles.detailRowLabel}>Tên hiển thị</Text>
              </View>
              <Text style={styles.detailRowValue} numberOfLines={1}>{userData?.fullname || TXT.customerGuest}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.detailRow}>
              <View style={styles.detailRowLabelGroup}>
                <Gem color="#8E8E93" size={18} strokeWidth={2.2} />
                <Text style={styles.detailRowLabel}>Gói hiện tại</Text>
              </View>
              <Text style={[styles.detailRowValue, isVipActive && { color: COLORS.gold, fontWeight: '700' }]}>
                {isVipActive ? 'VIP Pro' : 'Free Plan'}
              </Text>
            </View>
          </View>
        </View>

        {/* SETTINGS ACTIONS GROUP */}
        <View style={[styles.groupCard, SHADOWS.glowCard]}>
          <View style={styles.groupInside}>
            {renderRow(RefreshCw, 'Restore purchases', undefined, '#8E8E93', false, false, () => {
              Alert.alert('Khôi phục giao dịch', 'Giao dịch mua của sếp đã được đồng bộ tự động với hệ thống iCloud.');
            })}
            <View style={styles.divider} />
            {renderRow(Share2, 'Share to Explore', undefined, '#8E8E93', false, false, () => {
              Alert.alert('Chia sẻ ứng dụng', 'Cảm ơn sếp đã ủng hộ ứng dụng AppChinhChu!');
            })}
            <View style={styles.divider} />
            {renderRow(Database, 'Data controls', undefined, '#8E8E93', true, false, () => {
              navigateFromModal('/settings');
            })}
          </View>
        </View>

        {/* SYSTEM SETTINGS & UTILITIES */}
        <Text style={styles.sectionTitle}>HỆ THỐNG & TIỆN ÍCH</Text>
        <View style={[styles.groupCard, SHADOWS.glowCard]}>
          <View style={styles.groupInside}>
            {renderRow(Palette, TXT.setupThemeRow, TXT.openLabel, '#8E8E93', false, false, () => navigateFromModal('/settings'))}
            <View style={styles.divider} />
            {renderRow(CloudDownload, TXT.cloudStorage, '5 GB', '#8E8E93', false, false)}
            <View style={styles.divider} />
            {renderRow(Clock, TXT.history, TXT.langName === 'English' ? 'Lookup' : 'Tra cứu', '#8E8E93', true, false)}
          </View>
        </View>

        {/* FAQ, TERMS AND EXTERNAL LINKS */}
        <Text style={styles.sectionTitle}>TÀI LIỆU & PHÁP LÝ</Text>
        <View style={[styles.groupCard, SHADOWS.glowCard]}>
          <View style={styles.groupInside}>
            {renderRow(HelpCircle, 'Frequently asked questions', undefined, '#8E8E93', false, true, () => Linking.openURL('https://t.me/mqui_dev'))}
            <View style={styles.divider} />
            {renderRow(MessageSquare, 'Give feedback', undefined, '#8E8E93', false, true, () => Linking.openURL('https://t.me/mqui_dev'))}
            <View style={styles.divider} />
            {renderRow(FileText, 'Terms of Service', undefined, '#8E8E93', false, true, () => Linking.openURL('https://t.me/mqui_dev'))}
            <View style={styles.divider} />
            {renderRow(Shield, 'Privacy Policy', undefined, '#8E8E93', true, true, () => Linking.openURL('https://t.me/mqui_dev'))}
          </View>
        </View>

        {/* SOCIAL LINKS */}
        <Text style={styles.sectionTitle}>MẠNG XÃ HỘI</Text>
        <View style={[styles.groupCard, SHADOWS.glowCard]}>
          <View style={styles.groupInside}>
            {renderRow(Instagram, 'Instagram', undefined, '#8E8E93', false, true, () => Linking.openURL('https://instagram.com/'))}
            <View style={styles.divider} />
            {renderRow(Facebook, 'Facebook', undefined, '#8E8E93', false, true, () => Linking.openURL('https://facebook.com/'))}
            <View style={styles.divider} />
            {renderRow(MessageSquare, 'Discord', undefined, '#8E8E93', true, true, () => Linking.openURL('https://discord.com/'))}
          </View>
        </View>

        {/* ADMIN AREA */}
        {userData?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase() && (
          <>
            <Text style={styles.sectionTitle}>{TXT.adminArea.toUpperCase()}</Text>
            <View style={[styles.groupCard, SHADOWS.glowCard]}>
              <View style={styles.groupInside}>
                {renderRow(ShieldCheck, TXT.adminArea, TXT.langName === 'English' ? 'Required PIN' : 'Yêu cầu PIN', '#FF453A', true, false, () => navigateFromModal('/admin'))}
              </View>
            </View>
          </>
        )}

        {/* EXIT BUTTONS */}
        <View style={styles.exitActionsContainer}>
          <TouchableOpacity style={styles.logoutRowBtn} activeOpacity={0.7} onPress={handleLogout}>
            <Text style={styles.logoutRowText}>{TXT.logout}</Text>
          </TouchableOpacity>
          <View style={styles.exitDivider} />
          <TouchableOpacity style={styles.deleteRowBtn} activeOpacity={0.7} onPress={handleDeleteAccount}>
            <Text style={styles.deleteRowText}>Delete account</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </LinearGradient>
  );
}

function getStyles(theme: typeof COLORS, isLight: boolean) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    gradientContainer: { flex: 1 },
    
    // Top Close Button Header
    topBar: {
      paddingTop: Platform.OS === 'ios' ? 50 : 30,
      paddingHorizontal: 20,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-start',
      height: 70,
    },
    closeBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: isLight ? '#FFFFFF' : 'rgba(255,255,255,0.06)',
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 0.8,
      borderColor: isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.08)',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 4,
      elevation: 1,
    },

    scrollContent: { paddingHorizontal: 20, paddingBottom: 160, paddingTop: 10 },
    
    // Profile Header Section
    profileHeaderSection: {
      alignItems: 'center',
      marginBottom: 25,
    },
    avatarWrapper: {
      width: 90,
      height: 90,
      borderRadius: 45,
      borderWidth: 3,
      borderColor: '#FFFFFF',
      overflow: 'hidden',
      backgroundColor: '#E5E5EA',
      marginBottom: 12,
    },
    avatar: { width: '100%', height: '100%' },
    
    workspacePill: {
      flexDirection: 'row',
      alignItems: 'center',
      height: 30,
      borderRadius: 15,
      backgroundColor: isLight ? '#FFFFFF' : 'rgba(255,255,255,0.06)',
      borderWidth: 0.8,
      borderColor: theme.border,
      paddingLeft: 6,
      paddingRight: 10,
      marginBottom: 12,
    },
    workspaceLetterBadge: {
      width: 18,
      height: 18,
      borderRadius: 9,
      backgroundColor: '#5856D6',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 6,
    },
    workspaceLetter: {
      color: '#FFFFFF',
      fontSize: 10,
      fontWeight: '800',
    },
    workspaceText: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.text,
      maxWidth: 150,
    },
    
    profileName: { 
      color: theme.text, 
      fontSize: 24, 
      fontWeight: '800', 
      letterSpacing: -0.5,
      marginBottom: 4,
    },
    profileEmail: { 
      color: theme.textMuted, 
      fontSize: 14, 
      marginBottom: 10,
    },
    creditsText: {
      color: theme.textMuted,
      fontSize: 13,
      fontWeight: '600',
    },

    // Modern Upgrade Card
    upgradeCard: {
      backgroundColor: theme.surfaceSolid,
      borderRadius: SIZES.radiusCard,
      overflow: 'hidden',
      borderWidth: 0.8,
      borderColor: theme.border,
      marginBottom: 25,
    },
    upgradeGradientBg: {
      height: 110,
      justifyContent: 'center',
      alignItems: 'center',
    },
    creatorPill: {
      backgroundColor: '#FFFFFF',
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 20,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
    },
    creatorPillText: {
      fontSize: 14,
      fontWeight: '800',
      color: '#000000',
      letterSpacing: 0.2,
    },
    upgradeContent: {
      padding: 20,
      alignItems: 'center',
    },
    upgradeTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: theme.text,
      marginBottom: 6,
    },
    upgradeDesc: {
      fontSize: 12,
      color: theme.textMuted,
      lineHeight: 18,
      textAlign: 'center',
      marginBottom: 16,
    },
    upgradeBlackBtn: {
      backgroundColor: '#0E0E10',
      width: '100%',
      height: 46,
      borderRadius: 23,
      justifyContent: 'center',
      alignItems: 'center',
    },
    upgradeBlackBtnText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '700',
    },

    // Group cards (white/light grey containers)
    groupCard: {
      borderRadius: SIZES.radiusCard,
      borderWidth: 0.8,
      borderColor: theme.border,
      backgroundColor: theme.surfaceSolid,
      overflow: 'hidden',
      marginBottom: 20,
    },
    groupInside: {
      paddingLeft: 16,
    },

    // Detail rows (Email, Name, Current Plan)
    detailRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 15,
      paddingRight: 16,
    },
    detailRowLabelGroup: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    detailRowLabel: {
      color: theme.text,
      fontSize: 14,
      fontWeight: '600',
    },
    detailRowValue: {
      color: theme.textMuted,
      fontSize: 14,
      fontWeight: '500',
      maxWidth: '60%',
    },

    // Settings actions rows
    row: { flexDirection: 'row', alignItems: 'center' },
    iconBox: { width: 22, height: 22, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    rowContent: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 15, paddingRight: 16 },
    rowBorder: { borderBottomWidth: 0.8, borderBottomColor: theme.border },
    rowTitle: { color: theme.text, fontSize: 14, fontWeight: '600' },
    rowValue: { color: theme.textMuted, fontSize: 13, marginRight: 6 },
    divider: { height: 0.8, backgroundColor: theme.border },

    // Sections
    sectionTitle: { 
      color: theme.textMuted, 
      fontSize: 10, 
      fontWeight: '800', 
      marginLeft: 15, 
      marginBottom: 8, 
      marginTop: 15, 
      letterSpacing: 1.5,
      textTransform: 'uppercase',
    },

    // Exit rows at bottom
    exitActionsContainer: {
      borderRadius: SIZES.radiusCard,
      borderWidth: 0.8,
      borderColor: theme.border,
      backgroundColor: theme.surfaceSolid,
      overflow: 'hidden',
      marginTop: 20,
      paddingLeft: 16,
    },
    logoutRowBtn: {
      paddingVertical: 16,
      justifyContent: 'center',
    },
    logoutRowText: {
      color: theme.text,
      fontSize: 14,
      fontWeight: '700',
    },
    exitDivider: {
      height: 0.8,
      backgroundColor: theme.border,
    },
    deleteRowBtn: {
      paddingVertical: 16,
      justifyContent: 'center',
    },
    deleteRowText: {
      color: '#FF3B30',
      fontSize: 14,
      fontWeight: '700',
    },
    
    // Auth screens
    authContainer: { flex: 1, justifyContent: 'center', padding: 16 },
    authBox: { borderRadius: SIZES.radiusSquircle, borderWidth: 0.8, borderColor: theme.border, overflow: 'hidden', backgroundColor: theme.surfaceCard },
    authBoxInside: { padding: 30, alignItems: 'center' },
    authLogo: { width: 80, height: 80, borderRadius: 24, backgroundColor: 'rgba(14, 14, 16, 0.05)', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
    authTitle: { color: theme.text, fontSize: 28, fontWeight: '800', marginBottom: 6, letterSpacing: -0.5 },
    authSub: { color: theme.textMuted, fontSize: 14, marginBottom: 25 },
    inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.05)', borderRadius: SIZES.radiusButton, height: 54, marginBottom: 15, paddingHorizontal: 15, borderWidth: 0.8, borderColor: theme.border },
    inputIcon: { marginRight: 10 },
    input: { flex: 1, color: theme.text, fontSize: 16, height: '100%' },
    authBtn: { width: '100%', height: 54, borderRadius: SIZES.radiusButton, overflow: 'hidden', marginTop: 10 },
    authBtnGradient: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
    authBtnText: { color: '#FFF', fontSize: 16, fontWeight: '800', letterSpacing: 1 },
    authSwitchText: { color: theme.primary, fontSize: 14, fontWeight: '600' },
    
    modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 20 },
    modalBox: { backgroundColor: theme.surfaceSolid, width: '100%', borderRadius: SIZES.radiusSquircle, padding: 30, alignItems: 'center', borderWidth: 0.8, borderColor: theme.border },
    modalTitle: { color: theme.text, fontSize: 22, fontWeight: '800', marginBottom: 15 },
    modalMsg: { color: theme.textSecondary, fontSize: 16, textAlign: 'center', lineHeight: 24, marginBottom: 25 },
    modalBtn: { backgroundColor: theme.gold, width: '100%', paddingVertical: 14, borderRadius: SIZES.radiusButton, alignItems: 'center' },
    modalBtnText: { color: '#000', fontSize: 16, fontWeight: '800' }
  });
}