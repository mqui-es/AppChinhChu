import React, { useState, useCallback, useEffect } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, Alert, ActivityIndicator, Modal, TextInput, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { useFocusEffect, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import JSZip from 'jszip'; 

import { requireNativeModule } from 'expo-modules-core';
const IpaSigner = (() => {
  if (Platform.OS === 'web') return null;
  try {
    return requireNativeModule('IpaSigner');
  } catch (e) {
    return null;
  }
})();

import { FileArchive, Share, Trash2, FolderOpen, Layers, Wrench, X, FileKey, CheckCircle2, Rocket, PlusCircle, ShieldCheck, MoreVertical } from 'lucide-react-native';
import { COLORS, useThemeUpdate, TXT } from '../../constants/theme';
import { startStaticServer } from '../../utils/staticServer';
import * as Linking from 'expo-linking';

const INSTALLER_WORKER_URL = "https://ipaviet-installer.clonene121212.workers.dev";

interface LocalFile { name: string; uri: string; size: string; timestamp: number; }
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

export default function SignScreen() {
  useThemeUpdate();
  const router = useRouter();
  const [localFiles, setLocalFiles] = useState<LocalFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'ipa' | 'installed'>('ipa');
  const [menuVisible, setMenuVisible] = useState(false);
  const [savedCerts, setSavedCerts] = useState<CertItem[]>([]);
  const [selectedCert, setSelectedCert] = useState<CertItem | null>(null);
  const [signModalVisible, setSignModalVisible] = useState(false);
  const [selectedIpa, setSelectedIpa] = useState<LocalFile | null>(null);
  const [isSigning, setIsSigning] = useState(false);
  const [pwdModalVisible, setPwdModalVisible] = useState(false);
  const [tempZipData, setTempZipData] = useState<any>(null);
  const [certPassword, setCertPassword] = useState('');
  const [isUnzipping, setIsUnzipping] = useState(false);

  // 1. ÉP APPLE HIỆN THƯ MỤC: Tạo một file hiển thị rõ ràng
  const forceIOSFolderCreation = async () => {
    try {
      const dummyFile = FileSystem.documentDirectory + 'HuongDan_IPA.txt';
      await FileSystem.writeAsStringAsync(dummyFile, 'Thư mục này dùng để lưu trữ file IPA của bạn.');
    } catch (e) {}
  };

  useFocusEffect(useCallback(() => { 
    forceIOSFolderCreation();
    loadDownloadedFiles(); 
    loadSavedCerts(); 
  }, []));

  const loadDownloadedFiles = async () => {
    setLoading(true);
    try {
      const dir = FileSystem.documentDirectory;
      if (!dir) return;
      const files = await FileSystem.readDirectoryAsync(dir);
      
      const ipaFiles = files.filter(f => f.endsWith('.ipa') && !f.startsWith('signed_')); 
      const signedFiles = files.filter(f => f.startsWith('signed_') && f.endsWith('.ipa')); 

      const fileData = await Promise.all(
        (activeTab === 'ipa' ? ipaFiles : signedFiles).map(async (filename) => {
          const fileUri = dir + filename;
          const info = await FileSystem.getInfoAsync(fileUri);
          return { name: filename, uri: fileUri, size: info.exists ? (info.size / 1024 / 1024).toFixed(1) + ' MB' : '0 MB', timestamp: info.exists ? info.modificationTime : 0 };
        })
      );
      fileData.sort((a, b) => b.timestamp - a.timestamp);
      setLocalFiles(fileData as LocalFile[]);
    } catch (error) {}
    setLoading(false);
  };

  useEffect(() => { loadDownloadedFiles(); }, [activeTab]);

  const handleShare = async (uri: string) => { try { const canShare = await Sharing.isAvailableAsync(); if (canShare) await Sharing.shareAsync(uri); } catch (error) {} };
  
  const handleDelete = (uri: string, name: string) => {
    Alert.alert(TXT.deleteFile, `${TXT.deleteFileConfirm} ${name}?`, [ { text: TXT.cancelBtn || "Hủy", style: "cancel" }, { text: TXT.langName === 'English' ? "Delete" : "Xóa", style: "destructive", onPress: async () => { await FileSystem.deleteAsync(uri); loadDownloadedFiles(); } } ]);
  };

  // Import IPA
  const importIpaFile = () => {
    setMenuVisible(false);
    setTimeout(async () => {
      try {
        const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
        if (result.canceled || !result.assets || result.assets.length === 0) return;
        
        const file = result.assets[0];
        if (!file.name.toLowerCase().endsWith('.ipa')) {
          return Alert.alert(TXT.errorLabel, TXT.langName === 'English' ? "Please select a file with .ipa extension" : "Vui lòng chọn file có đuôi .ipa");
        }

        setLoading(true);
        const newUri = FileSystem.documentDirectory + file.name.replace(/\s+/g, '_'); 
        await FileSystem.copyAsync({ from: file.uri, to: newUri });
        
        Alert.alert(TXT.successLabel, TXT.langName === 'English' ? "IPA file added to storage!" : "Đã thêm file IPA vào kho!");
        loadDownloadedFiles();
      } catch (error: any) {
        Alert.alert(TXT.errorLabel, TXT.langName === 'English' ? "Cannot retrieve file, please try again." : "Không thể lấy file, vui lòng thử lại.");
      } finally {
        setLoading(false);
      }
    }, 500); 
  };

  // Load saved certs and select active cert
  const loadSavedCerts = async () => {
    try {
      const certsJson = await AsyncStorage.getItem('@saved_certs');
      if (certsJson) {
        const certs = JSON.parse(certsJson) as CertItem[];
        setSavedCerts(certs);
        
        const activeId = await AsyncStorage.getItem('@active_cert_id');
        if (activeId) {
          const active = certs.find(c => c.id === activeId);
          if (active) {
            setSelectedCert(active);
            return;
          }
        }
        if (certs.length > 0) {
          setSelectedCert(certs[0]);
        }
      }
    } catch (error) {}
  };

  const importCertFromZip = () => {
    setSignModalVisible(false);
    setTimeout(async () => {
      try {
        const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
        if (result.canceled || !result.assets || result.assets.length === 0) {
          setSignModalVisible(true);
          return;
        }
        
        const file = result.assets[0];
        if (!file.name.toLowerCase().endsWith('.zip')) {
          Alert.alert(TXT.errorLabel, TXT.langName === 'English' ? "Please select a .zip file containing the certificate." : "Vui lòng chọn tệp .zip chứa chứng chỉ.");
          setSignModalVisible(true);
          return;
        }

        setIsUnzipping(true);
        setSignModalVisible(true);
        
        const b64Data = await FileSystem.readAsStringAsync(file.uri, { encoding: FileSystem.EncodingType.Base64 });
        const zip = await JSZip.loadAsync(b64Data, { base64: true });

        let p12Data = null, provData = null, p12Name = '', provName = '';

        for (const [path, zipObj] of Object.entries(zip.files)) {
          if (!zipObj.dir) {
            if (path.toLowerCase().endsWith('.p12')) { p12Data = await zipObj.async('base64'); p12Name = path.split('/').pop() || 'cert.p12'; }
            if (path.toLowerCase().endsWith('.mobileprovision')) { provData = await zipObj.async('base64'); provName = path.split('/').pop() || 'cert.mobileprovision'; }
          }
        }

        if (!p12Data || !provData) {
          setIsUnzipping(false);
          Alert.alert(TXT.langName === 'English' ? 'ZIP Error' : 'Lỗi ZIP', TXT.langName === 'English' ? 'Invalid ZIP file. It must contain at least one .p12 and one .mobileprovision file.' : 'Tệp ZIP không hợp lệ. Bên trong phải chứa ít nhất 1 file .p12 và 1 file .mobileprovision');
          return;
        }

        setTempZipData({ p12Data, provData, p12Name, provName, zipName: file.name.replace('.zip', '') });
        setCertPassword('');
        setIsUnzipping(false);
        setSignModalVisible(false);
        
        setTimeout(() => setPwdModalVisible(true), 500);

      } catch (error: any) {
        setIsUnzipping(false);
        setSignModalVisible(true);
        Alert.alert(TXT.errorLabel, TXT.langName === 'English' ? "Cannot read ZIP file." : "Không thể đọc file ZIP.");
      }
    }, 500);
  };

  const saveCertToStorage = async () => {
    if (!certPassword) return Alert.alert(TXT.langName === 'English' ? 'Missing' : 'Thiếu', TXT.langName === 'English' ? 'Please enter the P12 file password' : "Vui lòng nhập mật khẩu của file P12");
    
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
      
      // Đồng thời đặt làm active certificate
      await AsyncStorage.setItem('@active_cert_id', id);
      setSelectedCert(newCert); 
      
      setTimeout(() => {
        setSignModalVisible(true);
        Alert.alert(TXT.successLabel, TXT.langName === 'English' ? "Certificate loaded!" : "Chứng chỉ đã được nạp!");
      }, 500);
      
    } catch (error) {
      Alert.alert(TXT.errorLabel, TXT.langName === 'English' ? "Cannot save certificate to device." : "Không thể lưu chứng chỉ vào máy.");
    }
  };

  const deleteCert = async (id: string) => {
    Alert.alert(TXT.deleteCertTitle, TXT.deleteCertConfirm, [
      { text: TXT.cancelBtn, style: "cancel" },
      { text: TXT.langName === 'English' ? 'Delete' : 'Xóa', style: "destructive", onPress: async () => {
          const updated = savedCerts.filter(c => c.id !== id);
          setSavedCerts(updated);
          await AsyncStorage.setItem('@saved_certs', JSON.stringify(updated));
          if (selectedCert?.id === id) {
            const nextActive = updated.length > 0 ? updated[0] : null;
            setSelectedCert(nextActive);
            if (nextActive) {
              await AsyncStorage.setItem('@active_cert_id', nextActive.id);
            } else {
              await AsyncStorage.removeItem('@active_cert_id');
            }
          }
      }}
    ]);
  };

  const handleStartSign = async () => {
    if (Platform.OS === 'web') {
      Alert.alert(TXT.langName === 'English' ? 'Not Available' : "Không khả dụng", TXT.langName === 'English' ? 'Offline signing and installation of IPA is only supported on physical iOS devices.' : "Tính năng ký và cài đặt IPA ngoại tuyến chỉ được hỗ trợ trên thiết bị iOS thực tế.");
      return;
    }
    if (!IpaSigner) {
      Alert.alert(TXT.langName === 'English' ? 'Expo Go Limitations' : "Hạn chế của Expo Go", TXT.langName === 'English' ? 'Signing and installing IPAs requires a development build because it uses a custom native module. You cannot run this on Expo Go.' : "Tính năng ký và cài đặt IPA yêu cầu bản build phát triển (Development Build) vì sử dụng mô-đun native tự viết. Sếp không thể chạy tính năng này trên Expo Go.");
      return;
    }
    if (!selectedCert || !selectedIpa) return Alert.alert(TXT.langName === 'English' ? 'Missing' : "Thiếu", TXT.selectIpaCert);
    
    setIsSigning(true);
    try {
      const result = await IpaSigner.signAppOffline(selectedIpa.uri, selectedCert.p12Uri, selectedCert.provUri, selectedCert.password);
      setIsSigning(false);
      setSignModalVisible(false);

      const handleInstallOTA = async () => {
        try {
          const signedFileName = result.outputPath.split('/').pop();
          const signedFileDir = result.outputPath.substring(0, result.outputPath.lastIndexOf('/'));
          
          const serverUrl = await startStaticServer(signedFileDir);
          const localIpaUrl = `${serverUrl}/${signedFileName}`;
          
          const bundleId = result.bundleId || 'com.ipaviet.app';
          const appName = selectedIpa.name.replace(/\.ipa$/i, '');
          const iconUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(appName)}&background=0A84FF&color=fff&size=512`;
          
          const workerUrl = `${INSTALLER_WORKER_URL}?ipa=${encodeURIComponent(localIpaUrl)}&name=${encodeURIComponent(appName)}&bundle=${encodeURIComponent(bundleId)}&icon=${encodeURIComponent(iconUrl)}`;
          
          Alert.alert(
            TXT.readyToInstall, 
            TXT.safariInstallInstructions,
            [{ text: TXT.openSafariBtn, onPress: () => {
                Linking.openURL(workerUrl);
            }}]
          );
        } catch (e: any) {
          Alert.alert(TXT.errorLabel, (TXT.langName === 'English' ? "Could not launch local OTA server: " : "Không thể tạo máy chủ OTA cục bộ: ") + e.message);
        }
      };

      Alert.alert(TXT.signSuccessTitle, TXT.signSuccessSub, [
          { text: TXT.laterBtn, style: "cancel", onPress: () => loadDownloadedFiles() }, 
          { text: TXT.installNowBtn, onPress: () => { handleInstallOTA(); loadDownloadedFiles(); }}
      ]);
    } catch (error: any) {
      setIsSigning(false);
      Alert.alert(TXT.langName === 'English' ? 'Signing Error' : "Lỗi Ký App", error.message || TXT.signFailure);
    }
  };

  const renderItem = ({ item }: { item: LocalFile }) => (
    <View style={[styles.fileCard, { backgroundColor: COLORS.surfaceCard, borderColor: COLORS.border }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View style={[styles.iconBox, { backgroundColor: COLORS.surfaceAccent }]}><FileArchive color={COLORS.primary} size={28} /></View>
        <View style={styles.fileInfo}>
          <Text style={[styles.fileName, { color: COLORS.text }]} numberOfLines={2}>{item.name}</Text>
          <Text style={[styles.fileSize, { color: COLORS.textMuted }]}>{item.size} • {TXT.langName === 'English' ? 'Saved' : 'Đã lưu'}</Text>
        </View>
      </View>
      <View style={[styles.actionGroup, { borderColor: COLORS.border }]}>
        {activeTab === 'ipa' && (
          <TouchableOpacity style={[styles.iconBtn, {backgroundColor: 'rgba(50, 215, 75, 0.15)', borderColor: 'rgba(50, 215, 75, 0.3)', borderWidth: 1}]} onPress={() => { setSelectedIpa(item); setSignModalVisible(true); }}>
            <Wrench color="#32D74B" size={20} />
          </TouchableOpacity>
        )}
        <TouchableOpacity style={[styles.iconBtn, { backgroundColor: COLORS.surface }]} onPress={() => handleShare(item.uri)}><Share color={COLORS.text} size={20} /></TouchableOpacity>
        <TouchableOpacity style={[styles.iconBtn, {backgroundColor: 'rgba(255, 69, 58, 0.15)'}]} onPress={() => handleDelete(item.uri, item.name)}><Trash2 color="#FF453A" size={20} /></TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: COLORS.background }]}>
      <StatusBar style={COLORS.background === '#F2F2F7' ? 'dark' : 'light'} />
      <View style={[styles.header, { borderColor: COLORS.border }]}>
        <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20}}>
          <Text style={[styles.largeTitle, { color: COLORS.text }]}>{TXT.signAppTitle} <Wrench color={COLORS.primary} size={26} strokeWidth={2.5} /></Text>
          <TouchableOpacity style={{padding: 5}} onPress={() => setMenuVisible(true)}>
            <MoreVertical color={COLORS.text} size={28} />
          </TouchableOpacity>
        </View>

        <View style={[styles.tabContainer, { backgroundColor: COLORS.surfaceSolid, borderColor: COLORS.border }]}>
          <TouchableOpacity style={[styles.tab, activeTab === 'ipa' && [styles.tabActive, { backgroundColor: COLORS.surface }]]} onPress={() => setActiveTab('ipa')}><Text style={[styles.tabText, activeTab === 'ipa' && [styles.tabTextActive, { color: COLORS.background === '#F2F2F7' ? COLORS.primary : '#FFFFFF' }]]}>{TXT.originalIpaShort}</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.tab, activeTab === 'installed' && [styles.tabActive, { backgroundColor: COLORS.surface }]]} onPress={() => setActiveTab('installed')}><Text style={[styles.tabText, activeTab === 'installed' && [styles.tabTextActive, { color: COLORS.background === '#F2F2F7' ? COLORS.primary : '#FFFFFF' }]]}>{TXT.signedIpaShort}</Text></TouchableOpacity>
        </View>
      </View>

      {loading ? ( <ActivityIndicator size="large" color={COLORS.primary} style={{marginTop: 50}} /> ) : localFiles.length === 0 ? (
          <View style={styles.centerBox}><FolderOpen color={COLORS.textMuted} size={64} strokeWidth={1.5} /><Text style={[styles.emptyText, { color: COLORS.text }]}>{TXT.emptyStore}</Text></View>
      ) : (
          <FlatList data={localFiles} keyExtractor={(item) => item.uri} renderItem={renderItem} contentContainerStyle={styles.listContent} /> 
      )}

      {/* MODAL MENU 3 CHẤM */}
      <Modal visible={menuVisible} transparent animationType="fade">
        <TouchableOpacity style={styles.menuOverlay} activeOpacity={1} onPress={() => setMenuVisible(false)}>
          <View style={[styles.menuBox, { backgroundColor: COLORS.surfaceSolid, borderColor: COLORS.border }]}>
            <TouchableOpacity style={styles.menuItem} onPress={importIpaFile}>
              <PlusCircle color={COLORS.primary} size={22} />
              <Text style={[styles.menuText, { color: COLORS.text }]}>{TXT.addIpa}</Text>
            </TouchableOpacity>
            <View style={{height: 1, backgroundColor: COLORS.border}} />
            <TouchableOpacity style={styles.menuItem} onPress={() => { setMenuVisible(false); router.push('/settings'); }}>
              <FileKey color="#FFD700" size={22} />
              <Text style={[styles.menuText, { color: COLORS.text }]}>{TXT.manageCert}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* MODAL KÝ APP & CHỨNG CHỈ */}
      <Modal visible={signModalVisible} transparent animationType="slide">
        <View style={styles.modalBg}>
          <View style={[styles.modalBox, { backgroundColor: COLORS.surfaceSolid, borderColor: COLORS.border }]}>
            <TouchableOpacity style={[styles.closeModalBtn, { backgroundColor: COLORS.surface }]} onPress={() => !isSigning && setSignModalVisible(false)}><X color="#888" size={24} /></TouchableOpacity>
            
            <Text style={[styles.modalTitle, { color: COLORS.text }]}>{selectedIpa ? TXT.selectCert : TXT.certStore}</Text>
            {selectedIpa && <Text style={[styles.modalSub, { color: COLORS.primary }]} numberOfLines={1}>{TXT.langName === 'English' ? 'IPA File:' : 'File IPA:'} {selectedIpa.name}</Text>}

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{paddingBottom: 20, paddingTop: 10}} style={{ width: '100%' }}>
              
              <TouchableOpacity 
                style={[
                  styles.addCertBtn, 
                  { 
                    backgroundColor: COLORS.background === '#F2F2F7' ? 'rgba(0,122,255,0.06)' : 'rgba(255,255,255,0.03)', 
                    borderColor: COLORS.primary 
                  }
                ]} 
                onPress={importCertFromZip} 
                disabled={isUnzipping}
              >
                 {isUnzipping ? <ActivityIndicator color={COLORS.primary} /> : <PlusCircle color={COLORS.primary} size={24} />}
                 <Text style={[styles.addCertText, { color: COLORS.primary }]}>{isUnzipping ? TXT.unzippingText : TXT.importZip}</Text>
              </TouchableOpacity>

              {savedCerts.length === 0 && <Text style={{color: COLORS.textMuted, textAlign: 'center', marginTop: 20}}>{TXT.noCertsSavedText}</Text>}
              
              {savedCerts.map((cert) => {
                const isSelected = selectedCert?.id === cert.id;
                return (
                  <TouchableOpacity key={cert.id} style={[styles.certCard, { backgroundColor: COLORS.surfaceCard, borderColor: isSelected ? COLORS.success : COLORS.border }]} onPress={() => setSelectedCert(cert)}>
                    <View style={{flexDirection: 'row', alignItems: 'center', flex: 1}}>
                       {isSelected ? <CheckCircle2 color={COLORS.success} size={24} style={{marginRight: 15}}/> : <FileKey color={COLORS.textMuted} size={24} style={{marginRight: 15}}/>}
                       <View style={{flex: 1}}>
                          <Text style={[styles.certName, { color: isSelected ? COLORS.success : COLORS.text }]}>{cert.profileName || cert.name}</Text>
                          <Text style={[styles.certSub, { color: COLORS.textMuted }]} numberOfLines={1}>{TXT.enterpriseLabel} {cert.teamName || (TXT.langName === 'English' ? 'Unknown' : 'Không rõ')} ({cert.teamId || 'N/A'})</Text>
                          <Text style={[styles.certSub, cert.isExpired ? {color: COLORS.danger} : {color: COLORS.textMuted}]} numberOfLines={1}>{TXT.expirationLabel} {cert.expirationDate || (TXT.langName === 'English' ? 'Unknown' : 'Không rõ')} {cert.isExpired ? (TXT.langName === 'English' ? '(Expired)' : '(Đã hết hạn)') : ''}</Text>
                       </View>
                    </View>
                    <TouchableOpacity style={{padding: 10}} onPress={() => deleteCert(cert.id)}><Trash2 color={COLORS.danger} size={18}/></TouchableOpacity>
                  </TouchableOpacity>
                )
              })}
            </ScrollView>

            {selectedIpa && (
              <View style={{paddingTop: 15, borderTopWidth: 1, borderColor: COLORS.border, width: '100%'}}>
                <TouchableOpacity style={[styles.signBtn, { backgroundColor: COLORS.primary }, (!selectedCert || isSigning) && {opacity: 0.5}]} onPress={handleStartSign} disabled={!selectedCert || isSigning}>
                  {isSigning ? (
                    <View style={{flexDirection: 'row', alignItems: 'center'}}><ActivityIndicator color={COLORS.textDark} style={{marginRight: 10}} /><Text style={[styles.signBtnText, { color: COLORS.textDark }]}>{TXT.coreSigningText}</Text></View>
                  ) : (
                    <View style={{flexDirection: 'row', alignItems: 'center'}}><Rocket color={COLORS.textDark} size={20} style={{marginRight: 8}} /><Text style={[styles.signBtnText, { color: COLORS.textDark }]}>{TXT.tapToSignNow}</Text></View>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* MODAL MẬT KHẨU */}
      <Modal visible={pwdModalVisible} transparent animationType="fade">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalBgCentered}>
          <View style={[styles.pwdBox, { backgroundColor: COLORS.surfaceSolid, borderColor: COLORS.border }]}>
             <ShieldCheck color="#FFD700" size={50} style={{marginBottom: 15}}/>
             <Text style={[styles.pwdTitle, { color: COLORS.text }]}>{TXT.securedCert}</Text>
             <Text style={[styles.pwdSub, { color: COLORS.textMuted }]}>{TXT.p12PasswordSub} {tempZipData?.zipName}</Text>
             <TextInput style={[styles.pwdInput, { backgroundColor: COLORS.background, color: COLORS.text, borderColor: COLORS.border }]} placeholder={TXT.pwdPlaceholder} placeholderTextColor="#555" secureTextEntry value={certPassword} onChangeText={setCertPassword} autoFocus />
             <View style={{flexDirection: 'row', gap: 10, marginTop: 20}}>
               <TouchableOpacity style={styles.pwdBtnCancel} onPress={() => { setPwdModalVisible(false); setTimeout(() => setSignModalVisible(true), 500); }}><Text style={{color: '#FFF', fontWeight: 'bold'}}>{TXT.cancel}</Text></TouchableOpacity>
               <TouchableOpacity style={[styles.pwdBtnSave, { backgroundColor: COLORS.primary }]} onPress={saveCertToStorage}><Text style={{color: COLORS.textDark, fontWeight: '900'}}>{TXT.saveStore}</Text></TouchableOpacity>
             </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 60, paddingHorizontal: 20, paddingBottom: 15, borderBottomWidth: 0.5 },
  largeTitle: { fontSize: 34, fontWeight: '700' },
  tabContainer: { flexDirection: 'row', borderRadius: 12, padding: 4, borderWidth: 1 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  tabActive: { shadowColor: '#000', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.2, shadowRadius: 4, elevation: 3 },
  tabText: { color: '#8E8E93', fontSize: 14, fontWeight: '700' },
  tabTextActive: { color: '#FFFFFF' },
  centerBox: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  emptyText: { fontSize: 20, fontWeight: '600', marginTop: 15 },
  emptySubText: { color: '#8E8E93', fontSize: 14, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  listContent: { paddingHorizontal: 20, paddingTop: 15, paddingBottom: 120 }, 
  fileCard: { flexDirection: 'column', padding: 15, borderRadius: 20, marginBottom: 15, borderWidth: 1 },
  iconBox: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  fileInfo: { flex: 1, marginLeft: 15 },
  fileName: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  fileSize: { fontSize: 13 },
  actionGroup: { flexDirection: 'row', gap: 10, marginTop: 15, justifyContent: 'flex-end', paddingTop: 15, borderTopWidth: 0.5 },
  iconBtn: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  modalBox: { borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 25, paddingBottom: 40, borderWidth: 1, height: '80%', alignItems: 'center' },
  closeModalBtn: { position: 'absolute', top: 20, right: 20, zIndex: 10, padding: 5, borderRadius: 20 },
  modalTitle: { fontSize: 20, fontWeight: '900', letterSpacing: 1, marginBottom: 5 },
  modalSub: { fontSize: 14, fontWeight: '600', marginBottom: 20, paddingRight: 30 },
  addCertBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(10,132,255,0.1)', padding: 18, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(10,132,255,0.3)', borderStyle: 'dashed', marginBottom: 20, width: '100%' },
  addCertText: { fontSize: 15, fontWeight: 'bold', marginLeft: 10 },
  certCard: { flexDirection: 'row', alignItems: 'center', padding: 15, borderRadius: 16, borderWidth: 1, marginBottom: 12, width: '100%', justifyContent: 'space-between' },
  certCardActive: { borderColor: '#32D74B' },
  certName: { fontSize: 16, fontWeight: '700', marginBottom: 2 },
  certSub: { fontSize: 12 },
  signBtn: { height: 60, borderRadius: 16, justifyContent: 'center', alignItems: 'center', width: '100%' },
  signBtnText: { fontSize: 16, fontWeight: '800', letterSpacing: 1 },
  modalBgCentered: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  pwdBox: { width: '100%', padding: 30, borderRadius: 24, alignItems: 'center', borderWidth: 1 },
  pwdTitle: { fontSize: 18, fontWeight: '900', marginBottom: 5 },
  pwdSub: { fontSize: 13, marginBottom: 20, textAlign: 'center' },
  pwdInput: { width: '100%', height: 55, borderRadius: 12, paddingHorizontal: 15, fontSize: 16, borderWidth: 1, textAlign: 'center', fontWeight: 'bold' },
  pwdBtnCancel: { flex: 1, backgroundColor: '#333', height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  pwdBtnSave: { flex: 1, height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  menuOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  menuBox: { position: 'absolute', top: 100, right: 20, borderRadius: 16, width: 220, borderWidth: 1, shadowColor: '#000', shadowOffset: {width: 0, height: 5}, shadowOpacity: 0.5, shadowRadius: 10, overflow: 'hidden' },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 15 },
  menuText: { fontSize: 16, fontWeight: '600' }
});
