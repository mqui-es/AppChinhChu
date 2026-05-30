import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Alert, Modal, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator, Dimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import * as DocumentPicker from 'expo-document-picker';
import JSZip from 'jszip';

// SVG TỪ LUCIDE
import { 
  Palette, Languages, ShieldCheck, FileKey, Trash2, PlusCircle, 
  CheckCircle2, X, RefreshCw, Info, ChevronRight, Award, HelpCircle, HardDrive
} from 'lucide-react-native';

import { COLORS, SIZES, SHADOWS, TXT, useThemeUpdate, notifyThemeChange, loadTheme, loadLanguage, THEME_STYLES, TRANSLATIONS } from '../../constants/theme';

const { width } = Dimensions.get('window');

interface CertItem { 
  id: string; 
  name: string; 
  p12Uri: string; 
  provUri: string; 
  password: string;
  profileName?: string;
  teamName?: string;
  teamId?: string;
  uuid?: string;
  expirationDate?: string;
  isExpired?: boolean;
}

// Helper: Chuyển đổi Base64 thành chuỗi nhị phân (Binary String) để tìm Plist XML
const base64ToBinaryString = (base64: string): string => {
  try {
    if (typeof atob === 'function') return atob(base64);
  } catch (e) {}
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const lookup = new Uint8Array(256);
  for (let i = 0; i < chars.length; i++) lookup[chars.charCodeAt(i)] = i;
  const cleanStr = base64.replace(/[^A-Za-z0-9+/]/g, '');
  let binary = '';
  for (let i = 0; i < cleanStr.length; i += 4) {
    const encoded1 = lookup[cleanStr.charCodeAt(i)];
    const encoded2 = lookup[cleanStr.charCodeAt(i + 1)];
    const encoded3 = lookup[cleanStr.charCodeAt(i + 2)];
    const encoded4 = lookup[cleanStr.charCodeAt(i + 3)];
    const bytes1 = (encoded1 << 2) | (encoded2 >> 4);
    const bytes2 = ((encoded2 & 15) << 4) | (encoded3 >> 2);
    const bytes3 = ((encoded3 & 3) << 6) | encoded4;
    binary += String.fromCharCode(bytes1);
    if (cleanStr[i + 2] !== '=' && cleanStr[i + 2] !== undefined) binary += String.fromCharCode(bytes2);
    if (cleanStr[i + 3] !== '=' && cleanStr[i + 3] !== undefined) binary += String.fromCharCode(bytes3);
  }
  return binary;
};

// Helper: Phân tích file MobileProvision để trích xuất thông tin
const parseMobileProvisionData = (base64Data: string) => {
  try {
    const binary = base64ToBinaryString(base64Data);
    const startTag = '<?xml';
    const endTag = '</plist>';
    const startIndex = binary.indexOf(startTag);
    if (startIndex === -1) return null;
    const endIndex = binary.indexOf(endTag, startIndex);
    if (endIndex === -1) return null;
    const xml = binary.substring(startIndex, endIndex + endTag.length);
    
    const parseValue = (key: string): string => {
      const regex = new RegExp(`<key>${key}</key>\\s*<string>([^<]+)</string>`);
      const match = xml.match(regex);
      return match ? match[1] : '';
    };
    
    const parseDate = (key: string): string => {
      const regex = new RegExp(`<key>${key}</key>\\s*<date>([^<]+)</date>`);
      const match = xml.match(regex);
      return match ? match[1] : '';
    };

    const name = parseValue('Name');
    const teamName = parseValue('TeamName');
    const uuid = parseValue('UUID');
    const expDateStr = parseDate('ExpirationDate');
    
    let isExpired = false;
    let formattedDate = 'Không rõ';
    if (expDateStr) {
      const expDate = new Date(expDateStr);
      isExpired = expDate.getTime() < Date.now();
      formattedDate = expDate.toLocaleDateString('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
    }
    
    let teamId = '';
    const teamIdMatch = xml.match(/<key>TeamIdentifier<\/key>\s*<array>\s*<string>([^<]+)<\/string>/);
    if (teamIdMatch) teamId = teamIdMatch[1];

    return {
      profileName: name || 'Không rõ',
      teamName: teamName || 'Không rõ',
      teamId: teamId || 'Không rõ',
      uuid: uuid || '',
      expirationDate: formattedDate,
      isExpired
    };
  } catch (e) {
    console.error("Lỗi parse mobileprovision:", e);
    return null;
  }
};

export default function SettingsScreen() {
  useThemeUpdate();
  const [currentThemeStyle, setCurrentThemeStyle] = useState('light');
  const [currentLang, setCurrentLang] = useState('vi');
  const [savedCerts, setSavedCerts] = useState<CertItem[]>([]);
  const [activeCertId, setActiveCertId] = useState<string | null>(null);
  
  // Modals state
  const [certModalVisible, setCertModalVisible] = useState(false);
  const [themeModalVisible, setThemeModalVisible] = useState(false);
  const [langModalVisible, setLangModalVisible] = useState(false);
  const [infoModalVisible, setInfoModalVisible] = useState(false);
  
  // P12 password state
  const [pwdModalVisible, setPwdModalVisible] = useState(false);
  const [tempZipData, setTempZipData] = useState<any>(null);
  const [certPassword, setCertPassword] = useState('');
  const [isUnzipping, setIsUnzipping] = useState(false);
  const [cacheSize, setCacheSize] = useState('0 MB');

  useEffect(() => {
    fetchSettings();
    loadSavedCerts();
    calculateCacheSize();
  }, []);

  const fetchSettings = async () => {
    const style = await AsyncStorage.getItem('@app_theme_style') || 'light';
    const lang = await AsyncStorage.getItem('@app_lang') || 'vi';
    const activeCert = await AsyncStorage.getItem('@active_cert_id');
    setCurrentThemeStyle(style);
    setCurrentLang(lang);
    setActiveCertId(activeCert);
  };

  const loadSavedCerts = async () => {
    try {
      const certsJson = await AsyncStorage.getItem('@saved_certs');
      if (certsJson) {
        const parsed = JSON.parse(certsJson) as CertItem[];
        setSavedCerts(parsed);
        // Nếu có chứng chỉ nhưng chưa chọn active cert, chọn cái đầu tiên
        const activeCert = await AsyncStorage.getItem('@active_cert_id');
        if (parsed.length > 0 && (!activeCert || !parsed.some(c => c.id === activeCert))) {
          await AsyncStorage.setItem('@active_cert_id', parsed[0].id);
          setActiveCertId(parsed[0].id);
        }
      }
    } catch (error) {}
  };

  const calculateCacheSize = async () => {
    try {
      const cacheDir = FileSystem.cacheDirectory;
      if (!cacheDir) return;
      const files = await FileSystem.readDirectoryAsync(cacheDir);
      let totalSize = 0;
      for (const file of files) {
        const info = await FileSystem.getInfoAsync(cacheDir + file);
        if (info.exists) {
          totalSize += info.size;
        }
      }
      setCacheSize((totalSize / 1024 / 1024).toFixed(1) + ' MB');
    } catch (e) {
      setCacheSize('0 MB');
    }
  };

  const clearCache = async () => {
    try {
      const cacheDir = FileSystem.cacheDirectory;
      if (!cacheDir) return;
      const files = await FileSystem.readDirectoryAsync(cacheDir);
      for (const file of files) {
        await FileSystem.deleteAsync(cacheDir + file, { idempotent: true });
      }
      setCacheSize('0.0 MB');
      Alert.alert('Thành công', 'Đã xóa toàn bộ bộ nhớ đệm tạm thời.');
    } catch (e) {
      Alert.alert('Lỗi', 'Không thể dọn dẹp bộ nhớ đệm.');
    }
  };

  const selectActiveCert = async (id: string) => {
    await AsyncStorage.setItem('@active_cert_id', id);
    setActiveCertId(id);
  };

  const deleteCert = async (id: string) => {
    Alert.alert("Xóa Chứng Chỉ", "Bạn chắc chắn muốn xóa chứng chỉ này khỏi máy?", [
      { text: "Hủy", style: "cancel" },
      { text: "Xóa", style: "destructive", onPress: async () => {
          const updated = savedCerts.filter(c => c.id !== id);
          setSavedCerts(updated);
          await AsyncStorage.setItem('@saved_certs', JSON.stringify(updated));
          
          if (activeCertId === id) {
            const nextActive = updated.length > 0 ? updated[0].id : null;
            if (nextActive) {
              await AsyncStorage.setItem('@active_cert_id', nextActive);
              setActiveCertId(nextActive);
            } else {
              await AsyncStorage.removeItem('@active_cert_id');
              setActiveCertId(null);
            }
          }
      }}
    ]);
  };

  const importCertFromZip = () => {
    setCertModalVisible(false);
    setTimeout(async () => {
      try {
        const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
        if (result.canceled || !result.assets || result.assets.length === 0) {
          setCertModalVisible(true);
          return;
        }
        
        const file = result.assets[0];
        if (!file.name.toLowerCase().endsWith('.zip')) {
          Alert.alert("Lỗi", "Vui lòng chọn tệp .zip chứa chứng chỉ.");
          setCertModalVisible(true);
          return;
        }

        setIsUnzipping(true);
        setCertModalVisible(true);
        
        const b64Data = await FileSystem.readAsStringAsync(file.uri, { encoding: FileSystem.EncodingType.Base64 });
        const zip = await JSZip.loadAsync(b64Data, { base64: true });

        let p12Data = null, provData = null, p12Name = '', provName = '';

        for (const [path, zipObj] of Object.entries(zip.files)) {
          if (!zipObj.dir) {
            if (path.toLowerCase().endsWith('.p12')) { 
              p12Data = await zipObj.async('base64'); 
              p12Name = path.split('/').pop() || 'cert.p12'; 
            }
            if (path.toLowerCase().endsWith('.mobileprovision')) { 
              provData = await zipObj.async('base64'); 
              provName = path.split('/').pop() || 'cert.mobileprovision'; 
            }
          }
        }

        if (!p12Data || !provData) {
          setIsUnzipping(false);
          Alert.alert('Lỗi ZIP', 'Tệp ZIP không hợp lệ. Bên trong phải chứa ít nhất 1 file .p12 và 1 file .mobileprovision');
          return;
        }

        setTempZipData({ p12Data, provData, p12Name, provName, zipName: file.name.replace('.zip', '') });
        setCertPassword('');
        setIsUnzipping(false);
        setCertModalVisible(false);
        
        setTimeout(() => setPwdModalVisible(true), 500);

      } catch (error: any) {
        setIsUnzipping(false);
        setCertModalVisible(true);
        Alert.alert("Lỗi", "Không thể đọc file ZIP.");
      }
    }, 500);
  };

  const saveCertToStorage = async () => {
    if (!certPassword) return Alert.alert("Thiếu", "Vui lòng nhập mật khẩu của file P12");
    
    setPwdModalVisible(false);
    try {
      const certDir = FileSystem.documentDirectory + 'Certs/';
      const dirInfo = await FileSystem.getInfoAsync(certDir);
      if (!dirInfo.exists) await FileSystem.makeDirectoryAsync(certDir, { intermediates: true });

      const id = Date.now().toString();
      const p12Uri = certDir + id + '_' + tempZipData.p12Name;
      const provUri = certDir + id + '_' + tempZipData.provName;

      await FileSystem.writeAsStringAsync(p12Uri, tempZipData.p12Data, { encoding: FileSystem.EncodingType.Base64 });
      await FileSystem.writeAsStringAsync(provUri, tempZipData.provData, { encoding: FileSystem.EncodingType.Base64 });

      const parsed = parseMobileProvisionData(tempZipData.provData);

      const newCert: CertItem = { 
        id, 
        name: tempZipData.zipName, 
        p12Uri, 
        provUri, 
        password: certPassword,
        profileName: parsed?.profileName || tempZipData.zipName,
        teamName: parsed?.teamName || 'Không rõ',
        teamId: parsed?.teamId || 'Không rõ',
        uuid: parsed?.uuid || '',
        expirationDate: parsed?.expirationDate || 'Không rõ',
        isExpired: parsed?.isExpired || false
      };
      
      const updatedCerts = [newCert, ...savedCerts]; 
      setSavedCerts(updatedCerts);
      await AsyncStorage.setItem('@saved_certs', JSON.stringify(updatedCerts));
      
      // Đặt làm active certificate ngay lập tức
      await AsyncStorage.setItem('@active_cert_id', id);
      setActiveCertId(id);
      
      setTimeout(() => {
        setCertModalVisible(true);
        Alert.alert("Thành công", "Chứng chỉ đã được nạp và kích hoạt!");
      }, 500);
      
    } catch (error) {
      Alert.alert("Lỗi", "Không thể lưu chứng chỉ vào máy.");
    }
  };

  const changeTheme = async (themeKey: string) => {
    await AsyncStorage.setItem('@app_theme_style', themeKey);
    setCurrentThemeStyle(themeKey);
    await loadTheme();
    notifyThemeChange();
  };

  const changeLanguage = async (langKey: 'vi' | 'en') => {
    await AsyncStorage.setItem('@app_lang', langKey);
    setCurrentLang(langKey);
    await loadLanguage();
    notifyThemeChange();
    setLangModalVisible(false);
  };

  const getActiveCertName = () => {
    if (!activeCertId || savedCerts.length === 0) return 'Chưa chọn chứng chỉ';
    const active = savedCerts.find(c => c.id === activeCertId);
    return active ? (active.profileName || active.name) : 'Chưa chọn chứng chỉ';
  };

  const getThemeName = (style: string) => {
    if (style === 'obsidian') return 'Obsidian Dark';
    if (style === 'gold') return 'Liquid Gold VIP';
    if (style === 'neon') return 'Cyber Neon';
    if (style === 'light') return 'Classic Light';
    return 'Classic Light';
  };

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: COLORS.background }]} 
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <StatusBar style={currentThemeStyle === 'light' ? 'dark' : 'light'} />
      
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={[styles.largeTitle, { color: COLORS.text }]}>Cài đặt</Text>
        <Text style={[styles.subtitle, { color: COLORS.textMuted }]}>Quản lý cấu hình & Giao diện hệ thống</Text>
      </View>

      {/* SECTION 1: CHỨNG CHỈ (CERTIFICATE SECTION) */}
      <Text style={[styles.sectionTitle, { color: COLORS.textMuted }]}>CHỨNG CHỈ KHÁCH HÀNG</Text>
      <View style={[styles.cardGroup, { backgroundColor: COLORS.surfaceCard, borderColor: COLORS.border }]}>
        <TouchableOpacity style={styles.rowItem} activeOpacity={0.7} onPress={() => setCertModalVisible(true)}>
          <View style={[styles.iconWrap, { backgroundColor: '#FFD700' }]}>
            <FileKey color="#FFF" size={18} strokeWidth={2.5} />
          </View>
          <View style={styles.rowBody}>
            <Text style={[styles.rowLabel, { color: COLORS.text }]}>Quản lý chứng chỉ</Text>
            <Text style={[styles.rowValLabel, { color: COLORS.textMuted }]} numberOfLines={1}>
              {getActiveCertName()}
            </Text>
          </View>
          <ChevronRight color={COLORS.textMuted} size={18} />
        </TouchableOpacity>
      </View>

      {/* SECTION 2: GIAO DIỆN & NGÔN NGỮ */}
      <Text style={[styles.sectionTitle, { color: COLORS.textMuted }]}>GIAO DIỆN & THIẾT LẬP</Text>
      <View style={[styles.cardGroup, { backgroundColor: COLORS.surfaceCard, borderColor: COLORS.border }]}>
        {/* Phong cách giao diện */}
        <TouchableOpacity style={styles.rowItem} activeOpacity={0.7} onPress={() => setThemeModalVisible(true)}>
          <View style={[styles.iconWrap, { backgroundColor: '#BF5AF2' }]}>
            <Palette color="#FFF" size={18} strokeWidth={2.5} />
          </View>
          <View style={styles.rowBody}>
            <Text style={[styles.rowLabel, { color: COLORS.text }]}>Phong cách giao diện</Text>
            <Text style={[styles.rowValLabel, { color: COLORS.textMuted }]}>
              {getThemeName(currentThemeStyle)}
            </Text>
          </View>
          <ChevronRight color={COLORS.textMuted} size={18} />
        </TouchableOpacity>

        <View style={[styles.rowDivider, { backgroundColor: COLORS.border }]} />

        {/* Ngôn ngữ */}
        <TouchableOpacity style={styles.rowItem} activeOpacity={0.7} onPress={() => setLangModalVisible(true)}>
          <View style={[styles.iconWrap, { backgroundColor: '#FF9F0A' }]}>
            <Languages color="#FFF" size={18} strokeWidth={2.5} />
          </View>
          <View style={styles.rowBody}>
            <Text style={[styles.rowLabel, { color: COLORS.text }]}>Ngôn ngữ hiển thị</Text>
            <Text style={[styles.rowValLabel, { color: COLORS.textMuted }]}>
              {currentLang === 'vi' ? 'Tiếng Việt' : 'English'}
            </Text>
          </View>
          <ChevronRight color={COLORS.textMuted} size={18} />
        </TouchableOpacity>
      </View>

      {/* SECTION 3: BỘ NHỚ ĐỆM & HỆ THỐNG */}
      <Text style={[styles.sectionTitle, { color: COLORS.textMuted }]}>DUNG LƯỢNG & BỘ NHỚ</Text>
      <View style={[styles.cardGroup, { backgroundColor: COLORS.surfaceCard, borderColor: COLORS.border }]}>
        <TouchableOpacity style={styles.rowItem} activeOpacity={0.7} onPress={clearCache}>
          <View style={[styles.iconWrap, { backgroundColor: '#FF453A' }]}>
            <HardDrive color="#FFF" size={18} strokeWidth={2.5} />
          </View>
          <View style={styles.rowBody}>
            <Text style={[styles.rowLabel, { color: COLORS.text }]}>Xóa bộ nhớ đệm (Cache)</Text>
            <Text style={[styles.rowValLabel, { color: COLORS.textMuted }]}>{cacheSize}</Text>
          </View>
          <RefreshCw color={COLORS.textMuted} size={16} />
        </TouchableOpacity>
      </View>

      {/* SECTION 4: THÔNG TIN ỨNG DỤNG */}
      <Text style={[styles.sectionTitle, { color: COLORS.textMuted }]}>VỀ ỨNG DỤNG</Text>
      <View style={[styles.cardGroup, { backgroundColor: COLORS.surfaceCard, borderColor: COLORS.border }]}>
        <TouchableOpacity style={styles.rowItem} activeOpacity={0.7} onPress={() => setInfoModalVisible(true)}>
          <View style={[styles.iconWrap, { backgroundColor: '#32D74B' }]}>
            <Info color="#FFF" size={18} strokeWidth={2.5} />
          </View>
          <View style={styles.rowBody}>
            <Text style={[styles.rowLabel, { color: COLORS.text }]}>Thông tin phiên bản</Text>
            <Text style={[styles.rowValLabel, { color: COLORS.textMuted }]}>v1.2.0 (Build C++ offline)</Text>
          </View>
          <ChevronRight color={COLORS.textMuted} size={18} />
        </TouchableOpacity>
      </View>

      {/* MODAL QUẢN LÝ CHỨNG CHỈ */}
      <Modal visible={certModalVisible} transparent animationType="slide">
        <View style={styles.modalBg}>
          <View style={[styles.modalBox, { backgroundColor: COLORS.surfaceSolid, borderColor: COLORS.border }]}>
            <TouchableOpacity style={styles.closeModalBtn} onPress={() => !isUnzipping && setCertModalVisible(false)}>
              <X color="#888" size={22} />
            </TouchableOpacity>
            
            <Text style={[styles.modalTitle, { color: COLORS.text }]}>KHO CHỨNG CHỈ</Text>
            <Text style={[styles.modalSub, { color: COLORS.textMuted }]}>
              Thêm file .zip chứng chỉ để phục vụ ký ngoại tuyến
            </Text>

            <ScrollView showsVerticalScrollIndicator={false} style={{ width: '100%', maxHeight: '70%' }}>
              <TouchableOpacity style={[styles.addCertBtn, { borderColor: COLORS.primary }]} onPress={importCertFromZip} disabled={isUnzipping}>
                {isUnzipping ? (
                  <ActivityIndicator color={COLORS.primary} />
                ) : (
                  <>
                    <PlusCircle color={COLORS.primary} size={22} />
                    <Text style={[styles.addCertText, { color: COLORS.primary }]}>Nhập chứng chỉ mới (.zip)</Text>
                  </>
                )}
              </TouchableOpacity>

              {savedCerts.length === 0 ? (
                <Text style={[styles.emptyText, { color: COLORS.textMuted }]}>Chưa nạp chứng chỉ nào.</Text>
              ) : (
                savedCerts.map((cert) => {
                  const isActive = activeCertId === cert.id;
                  return (
                    <TouchableOpacity 
                      key={cert.id} 
                      style={[
                        styles.certCard, 
                        { backgroundColor: COLORS.surfaceCard, borderColor: isActive ? COLORS.success : COLORS.border }
                      ]} 
                      onPress={() => selectActiveCert(cert.id)}
                    >
                      <View style={styles.certCardBody}>
                        {isActive ? (
                          <CheckCircle2 color={COLORS.success} size={22} style={styles.checkIcon} />
                        ) : (
                          <FileKey color={COLORS.textMuted} size={22} style={styles.checkIcon} />
                        )}
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.certNameText, { color: isActive ? COLORS.success : COLORS.text }]}>
                            {cert.profileName || cert.name}
                          </Text>
                          <Text style={[styles.certDetailText, { color: COLORS.textMuted }]} numberOfLines={1}>
                            Doanh nghiệp: {cert.teamName} ({cert.teamId})
                          </Text>
                          <Text style={[styles.certDetailText, cert.isExpired ? { color: COLORS.danger } : { color: COLORS.textMuted }]}>
                            Hết hạn: {cert.expirationDate} {cert.isExpired ? '(Hết hạn)' : ''}
                          </Text>
                        </View>
                      </View>
                      <TouchableOpacity style={styles.deleteBtn} onPress={() => deleteCert(cert.id)}>
                        <Trash2 color={COLORS.danger} size={18} />
                      </TouchableOpacity>
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MODAL MẬT KHẨU P12 */}
      <Modal visible={pwdModalVisible} transparent animationType="fade">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalBgCentered}>
          <View style={[styles.pwdBox, { backgroundColor: COLORS.surfaceSolid, borderColor: COLORS.border }]}>
            <ShieldCheck color="#FFD700" size={48} style={{ marginBottom: 15 }} />
            <Text style={[styles.pwdTitle, { color: COLORS.text }]}>MẬT KHẨU CHỨNG CHỈ</Text>
            <Text style={[styles.pwdSub, { color: COLORS.textMuted }]}>
              Nhập mật khẩu giải mã tệp P12 trong gói: {tempZipData?.zipName}
            </Text>
            <TextInput 
              style={[styles.pwdInput, { backgroundColor: COLORS.background, color: COLORS.text, borderColor: COLORS.border }]} 
              placeholder="Mật khẩu..." 
              placeholderTextColor="#555" 
              secureTextEntry 
              value={certPassword} 
              onChangeText={setCertPassword} 
              autoFocus 
            />
            <View style={styles.pwdBtnRow}>
              <TouchableOpacity 
                style={styles.pwdBtnCancel} 
                onPress={() => { setPwdModalVisible(false); setTimeout(() => setCertModalVisible(true), 500); }}
              >
                <Text style={{ color: '#FFF', fontWeight: 'bold' }}>HỦY BỎ</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.pwdBtnSave, { backgroundColor: COLORS.primary }]} onPress={saveCertToStorage}>
                <Text style={{ color: COLORS.textDark, fontWeight: '900' }}>HOÀN TẤT</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* MODAL PHONG CÁCH GIAO DIỆN & XEM TRƯỚC (THEME PICKER & LIVE PREVIEW) */}
      <Modal visible={themeModalVisible} transparent animationType="slide">
        <View style={styles.modalBg}>
          <View style={[styles.modalBox, { backgroundColor: COLORS.surfaceSolid, borderColor: COLORS.border }]}>
            <TouchableOpacity style={styles.closeModalBtn} onPress={() => setThemeModalVisible(false)}>
              <X color="#888" size={22} />
            </TouchableOpacity>

            <Text style={[styles.modalTitle, { color: COLORS.text }]}>XEM TRƯỚC GIAO DIỆN</Text>
            <Text style={[styles.modalSub, { color: COLORS.textMuted }]}>
              Chọn phong cách bạn thích để thay đổi toàn bộ ứng dụng
            </Text>

            <ScrollView showsVerticalScrollIndicator={false} style={{ width: '100%' }} contentContainerStyle={{ paddingBottom: 20 }}>
              {Object.entries(THEME_STYLES).map(([key, value]) => {
                const isActive = currentThemeStyle === key;
                return (
                  <TouchableOpacity 
                    key={key}
                    style={[
                      styles.previewCard, 
                      { 
                        backgroundColor: value.background, 
                        borderColor: isActive ? COLORS.primary : value.border,
                        borderWidth: isActive ? 2 : 1
                      }
                    ]}
                    activeOpacity={0.9}
                    onPress={() => changeTheme(key)}
                  >
                    <View style={styles.previewCardHeader}>
                      <Text style={[styles.previewThemeName, { color: value.text }]}>
                        {getThemeName(key)}
                      </Text>
                      {isActive && (
                        <View style={[styles.activeIndicator, { backgroundColor: value.primary }]}>
                          <CheckCircle2 color="#000" size={16} strokeWidth={2.5} />
                        </View>
                      )}
                    </View>

                    {/* MOCKUP PREVIEW ELEMENT */}
                    <View style={[styles.mockupLayout, { backgroundColor: value.surfaceSolid }]}>
                      {/* Header bar mockup */}
                      <View style={styles.mockupHeader}>
                        <View style={[styles.mockupLine, { backgroundColor: value.text, width: 60, height: 8 }]} />
                        <View style={[styles.mockupDot, { backgroundColor: value.primary }]} />
                      </View>
                      {/* Card mockup */}
                      <View style={[styles.mockupCard, { backgroundColor: value.surfaceCard, borderColor: value.border }]}>
                        <View style={styles.mockupCardInside}>
                          <View style={[styles.mockupCircle, { backgroundColor: value.primary }]} />
                          <View style={{ flex: 1, gap: 4 }}>
                            <View style={[styles.mockupLine, { backgroundColor: value.text, width: '70%', height: 6 }]} />
                            <View style={[styles.mockupLine, { backgroundColor: value.textMuted, width: '40%', height: 4 }]} />
                          </View>
                        </View>
                      </View>
                      {/* TabBar Pill mockup */}
                      <View style={{ alignItems: 'center', marginTop: 5 }}>
                        <View style={[styles.mockupPill, { backgroundColor: value.surface, borderColor: value.border }]}>
                          <View style={[styles.mockupPillIcon, { backgroundColor: value.primary }]} />
                          <View style={[styles.mockupPillIcon, { backgroundColor: value.textMuted, opacity: 0.3 }]} />
                          <View style={[styles.mockupPillIcon, { backgroundColor: value.textMuted, opacity: 0.3 }]} />
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MODAL LỰA CHỌN NGÔN NGỮ */}
      <Modal visible={langModalVisible} transparent animationType="fade">
        <View style={styles.modalBgCentered}>
          <View style={[styles.langSelectBox, { backgroundColor: COLORS.surfaceSolid, borderColor: COLORS.border }]}>
            <TouchableOpacity style={styles.closeModalBtn} onPress={() => setLangModalVisible(false)}>
              <X color="#888" size={22} />
            </TouchableOpacity>

            <Languages color={COLORS.primary} size={42} style={{ marginBottom: 15 }} />
            <Text style={[styles.modalTitle, { color: COLORS.text, marginBottom: 20 }]}>CHỌN NGÔN NGỮ</Text>

            <TouchableOpacity 
              style={[
                styles.langOption, 
                { 
                  backgroundColor: COLORS.surfaceCard, 
                  borderColor: currentLang === 'vi' ? COLORS.primary : COLORS.border 
                }
              ]}
              onPress={() => changeLanguage('vi')}
            >
              <Text style={[styles.langLabel, { color: COLORS.text, fontWeight: currentLang === 'vi' ? '900' : 'normal' }]}>
                Tiếng Việt (Vietnamese)
              </Text>
              {currentLang === 'vi' && <CheckCircle2 color={COLORS.primary} size={18} />}
            </TouchableOpacity>

            <TouchableOpacity 
              style={[
                styles.langOption, 
                { 
                  backgroundColor: COLORS.surfaceCard, 
                  borderColor: currentLang === 'en' ? COLORS.primary : COLORS.border,
                  marginTop: 12
                }
              ]}
              onPress={() => changeLanguage('en')}
            >
              <Text style={[styles.langLabel, { color: COLORS.text, fontWeight: currentLang === 'en' ? '900' : 'normal' }]}>
                English (English)
              </Text>
              {currentLang === 'en' && <CheckCircle2 color={COLORS.primary} size={18} />}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL THÔNG TIN PHIÊN BẢN */}
      <Modal visible={infoModalVisible} transparent animationType="fade">
        <View style={styles.modalBgCentered}>
          <View style={[styles.infoBox, { backgroundColor: COLORS.surfaceSolid, borderColor: COLORS.border }]}>
            <Award color={COLORS.primary} size={48} style={{ marginBottom: 15 }} />
            <Text style={[styles.modalTitle, { color: COLORS.text, marginBottom: 5 }]}>IPAVIET SIGNER</Text>
            <Text style={{ color: COLORS.textMuted, fontSize: 13, marginBottom: 20 }}>Phiên bản v1.2.0 Offline C++</Text>

            <View style={{ width: '100%', gap: 12 }}>
              <View style={styles.infoRow}>
                <Text style={{ color: COLORS.textMuted, fontSize: 14 }}>Nhân C++ lõi:</Text>
                <Text style={{ color: COLORS.text, fontSize: 14, fontWeight: '700' }}>zsign v0.7 Stable</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={{ color: COLORS.textMuted, fontSize: 14 }}>OpenSSL:</Text>
                <Text style={{ color: COLORS.text, fontSize: 14, fontWeight: '700' }}>v3.x.x Universal</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={{ color: COLORS.textMuted, fontSize: 14 }}>Môi trường:</Text>
                <Text style={{ color: COLORS.text, fontSize: 14, fontWeight: '700' }}>iOS Sandbox Native</Text>
              </View>
            </View>

            <TouchableOpacity 
              style={[styles.infoCloseBtn, { backgroundColor: COLORS.primary }]}
              onPress={() => setInfoModalVisible(false)}
            >
              <Text style={{ color: COLORS.textDark, fontWeight: '800' }}>ĐÓNG</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingTop: 60, paddingHorizontal: 20, paddingBottom: 150 },
  header: { marginBottom: 25 },
  largeTitle: { fontSize: 34, fontWeight: '800', letterSpacing: -0.5 },
  subtitle: { fontSize: 13, marginTop: 4 },
  sectionTitle: { fontSize: 11, fontWeight: '700', marginLeft: 12, marginBottom: 8, marginTop: 15, letterSpacing: 1 },
  cardGroup: { borderRadius: SIZES.radiusCard, borderWidth: 0.8, overflow: 'hidden', marginBottom: 15 },
  rowItem: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  iconWrap: { width: 30, height: 30, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  rowBody: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingRight: 10 },
  rowLabel: { fontSize: 15, fontWeight: '600' },
  rowValLabel: { fontSize: 14, maxWidth: '60%' },
  rowDivider: { height: 0.8, marginLeft: 58 },
  
  // Cert Modal styles
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  modalBox: { borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 25, paddingBottom: 40, borderWidth: 1, height: '75%', alignItems: 'center' },
  closeModalBtn: { position: 'absolute', top: 20, right: 20, zIndex: 10, padding: 6, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 20 },
  modalTitle: { fontSize: 20, fontWeight: '900', letterSpacing: 1 },
  modalSub: { fontSize: 13, marginTop: 4, marginBottom: 20, textAlign: 'center' },
  addCertBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(10,132,255,0.06)', padding: 16, borderRadius: 16, borderWidth: 1, borderStyle: 'dashed', marginBottom: 20, width: '100%', gap: 10 },
  addCertText: { fontSize: 15, fontWeight: 'bold' },
  emptyText: { textAlign: 'center', marginTop: 40, fontSize: 14 },
  certCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderRadius: 16, borderWidth: 1, marginBottom: 12 },
  certCardBody: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  checkIcon: { marginRight: 12 },
  certNameText: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  certDetailText: { fontSize: 11 },
  deleteBtn: { padding: 8 },

  // Pwd Modal styles
  modalBgCentered: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  pwdBox: { width: '100%', padding: 24, borderRadius: 24, alignItems: 'center', borderWidth: 1 },
  pwdTitle: { fontSize: 18, fontWeight: '900', marginBottom: 5 },
  pwdSub: { fontSize: 13, marginBottom: 20, textAlign: 'center', paddingHorizontal: 10 },
  pwdInput: { width: '100%', height: 50, borderRadius: 12, paddingHorizontal: 15, fontSize: 16, borderWidth: 1, textAlign: 'center', fontWeight: 'bold' },
  pwdBtnRow: { flexDirection: 'row', gap: 12, marginTop: 20 },
  pwdBtnCancel: { flex: 1, backgroundColor: '#333', height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  pwdBtnSave: { flex: 1, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },

  // Lang Modal styles
  langSelectBox: { width: '100%', padding: 24, borderRadius: 24, alignItems: 'center', borderWidth: 1 },
  langOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderRadius: 16, borderWidth: 1, width: '100%' },
  langLabel: { fontSize: 15 },

  // Info Modal styles
  infoBox: { width: '100%', padding: 24, borderRadius: 24, alignItems: 'center', borderWidth: 1 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', paddingVertical: 6 },
  infoCloseBtn: { width: '100%', height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 24 },

  // Theme preview styles
  previewCard: { borderRadius: 20, padding: 15, marginBottom: 15, width: '100%', borderStyle: 'solid' },
  previewCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  previewThemeName: { fontSize: 16, fontWeight: '800' },
  activeIndicator: { width: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center' },
  mockupLayout: { borderRadius: 12, padding: 12, gap: 10 },
  mockupHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 6 },
  mockupLine: { borderRadius: 4 },
  mockupDot: { width: 8, height: 8, borderRadius: 4 },
  mockupCard: { borderRadius: 8, borderWidth: 0.8, padding: 8 },
  mockupCardInside: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  mockupCircle: { width: 14, height: 14, borderRadius: 7 },
  mockupPill: { flexDirection: 'row', borderRadius: 12, borderWidth: 0.8, paddingVertical: 4, paddingHorizontal: 12, gap: 12 },
  mockupPillIcon: { width: 8, height: 8, borderRadius: 4 }
});
