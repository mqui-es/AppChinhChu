export interface AppItem {
  id: string;
  name: string;
  sub: string;
  version: string;
  developer: string;
  size: string;
  rating: string;
  description: string;
  iconUrl: string;
  ipaUrl: string;
  screenshots: string[];
  category: string;
  modFeatures: string;
}

export let CACHED_REGULAR_APPS: AppItem[] = [];
export let CACHED_VIP_APPS: AppItem[] = [];

const fixImageUrl = (url: string) => {
  if (!url) return '';
  return url.replace('http://', 'https://').replace(/ /g, '%20');
};

const chunkArray = (arr: any[], size: number) => Array.from({ length: Math.ceil(arr.length / size) }, (v, i) => arr.slice(i * size, i * size + size));

// ==========================================
// 1. KHO THƯỜNG (AppTesters)
// ==========================================
export const fetchRegularApps = async (): Promise<AppItem[]> => {
  if (CACHED_REGULAR_APPS.length > 0) return CACHED_REGULAR_APPS;

  try {
    const res = await fetch('https://repository.apptesters.org/');
    const data = await res.json();
    const apps = data.apps || [];

    const finalApps = apps.map((a: any, index: number) => {
      let cat = 'Khác';
      const nameLower = a.name.toLowerCase();
      if (a.category) cat = a.category;
      else if (nameLower.includes('spotify') || nameLower.includes('youtube') || nameLower.includes('tiktok') || nameLower.includes('music') || nameLower.includes('video')) cat = 'Giải Trí';
      else if (nameLower.includes('facebook') || nameLower.includes('zalo') || nameLower.includes('messenger') || nameLower.includes('insta')) cat = 'Mạng Xã Hội';
      else if (nameLower.includes('game') || nameLower.includes('hack') || nameLower.includes('cheat') || nameLower.includes('pubg')) cat = 'Trò Chơi';
      else if (nameLower.includes('capcut') || nameLower.includes('picsart') || nameLower.includes('lightroom')) cat = 'Nhiếp Ảnh';
      else cat = 'Tiện Ích';

      const rawIcon = a.iconURL || '';
      const rawScreenshots = a.screenshotURLs || a.screenshotUrls || [];
      const rawModFeatures = a.versionDescription || a.localizedDescription || 'Đã mở khóa các tính năng Premium/VIP.';

      return {
        id: 'reg_' + index + '_' + Math.random().toString(36).substring(5),
        name: a.name,
        sub: a.developerName || cat,
        version: a.version || '1.0',
        developer: a.developerName || 'AppTesters',
        size: a.size ? (a.size / 1024 / 1024).toFixed(1) + ' MB' : 'Không rõ',
        rating: '4.8',
        description: a.localizedDescription || `Bản mod được cung cấp bởi ${a.developerName || 'AppTesters'}.`,
        iconUrl: fixImageUrl(rawIcon) || `https://ui-avatars.com/api/?name=${encodeURIComponent(a.name)}&background=1C1C1E&color=0A84FF&size=512`,
        ipaUrl: a.downloadURL,
        screenshots: rawScreenshots.map((img: string) => fixImageUrl(img)),
        category: cat,
        modFeatures: rawModFeatures
      };
    });

    CACHED_REGULAR_APPS = finalApps;
    return finalApps;
  } catch (error) {
    return [];
  }
};

// ==========================================
// 2. KHO VIP (Github)
// ==========================================
const PRELOAD_ICONS: Record<string, string> = {
  'youtube': 'https://is1-ssl.mzstatic.com/image/thumb/Purple221/v4/19/d1/b2/19d1b2eb-dbb3-9ebc-25f0-60b8e72782b6/logo_youtube_color-0-0-1x_U007emarketing-0-0-0-6-0-0-sRGB-85-220.png/512x512bb.jpg',
  'spotify': 'https://is1-ssl.mzstatic.com/image/thumb/Purple211/v4/7e/86/e1/7e86e1af-8c87-0da5-4f3b-5136ff4ec81f/AppIcon-0-0-1x_U007emarketing-0-7-0-sRGB-85-220.png/512x512bb.jpg',
  'tiktok': 'https://is1-ssl.mzstatic.com/image/thumb/Purple211/v4/ce/68/a2/ce68a264-bfb7-36e7-5735-86fca55f4c20/AppIcon_TikTok-0-0-1x_U007emarketing-0-7-0-sRGB-85-220.png/512x512bb.jpg',
  'zalo': 'https://is1-ssl.mzstatic.com/image/thumb/Purple221/v4/ab/fc/bc/abfcbcaa-71e8-71e1-1250-936d5e7a9121/AppIcon-0-0-1x_U007emarketing-0-7-0-0-85-220.png/512x512bb.jpg',
  'facebook': 'https://is1-ssl.mzstatic.com/image/thumb/Purple211/v4/a9/37/a9/a937a922-0df1-5122-83b6-cb829ca1efb9/Icon-Production-0-0-1x_U007emarketing-0-7-0-85-220.png/512x512bb.jpg'
};

const cleanAppName = (filename: string) => {
  let name = filename.replace(/\.ipa$/i, '').replace(/^[\d\-_]+/, '').split('_')[0].replace(/\./g, ' ').trim(); 
  let displayName = name.replace(/[- ]*ipaviet site/ig, '').replace(/\s+([vV][\d\s\.]+|\d+)$/g, '').trim(); 
  let searchName = displayName.toLowerCase().replace(/(plus|\+|deluxe|lrd|pro|premium|cheat|hack|crack)/ig, '').trim();

  if (searchName.includes('yt') || searchName.includes('youtube')) searchName = 'youtube';
  else if (searchName.includes('fb') || searchName.includes('facebook')) searchName = 'facebook';
  else if (searchName.includes('tik')) searchName = 'tiktok';
  else if (searchName.includes('pvz')) searchName = 'plants vs zombies';
  else if (searchName.includes('r phim')) searchName = 'cgv';

  return { displayName: displayName || 'Ứng dụng VIP', searchName: searchName || 'app' };
};

export const fetchVIPApps = async (): Promise<AppItem[]> => {
  if (CACHED_VIP_APPS.length > 0) return CACHED_VIP_APPS;
  try {
    const ghRes = await fetch('https://api.github.com/repos/applecert/Backup-IPA/releases/tags/v1.0.0');
    const ghData = await ghRes.json();
    const assets = (ghData.assets || []).filter((a: any) => a.name.endsWith('.ipa'));

    const finalApps = assets.map((asset: any, index: number) => {
      const { displayName, searchName } = cleanAppName(asset.name);
      
      let cat = 'Khác';
      const nameLower = displayName.toLowerCase();
      if (nameLower.includes('spotify') || nameLower.includes('youtube') || nameLower.includes('tiktok') || nameLower.includes('music') || nameLower.includes('video')) cat = 'Giải Trí';
      else if (nameLower.includes('facebook') || nameLower.includes('zalo') || nameLower.includes('messenger') || nameLower.includes('insta')) cat = 'Mạng Xã Hội';
      else if (nameLower.includes('game') || nameLower.includes('hack') || nameLower.includes('cheat') || nameLower.includes('pubg') || nameLower.includes('lien quan') || nameLower.includes('aov')) cat = 'Trò Chơi';
      else if (nameLower.includes('capcut') || nameLower.includes('picsart') || nameLower.includes('lightroom')) cat = 'Nhiếp Ảnh';
      else cat = 'Tiện Ích';

      return {
        id: 'vip_' + asset.id.toString() + '_' + index,
        name: displayName,
        sub: 'IPAVIET Độc Quyền',
        version: 'VIP',
        developer: 'IPAVIET Dev',
        size: (asset.size / 1024 / 1024).toFixed(1) + ' MB',
        rating: '5.0',
        description: 'Đang tải thông tin ứng dụng...',
        iconUrl: PRELOAD_ICONS[searchName] || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=FFD700&color=000&size=512`,
        ipaUrl: asset.browser_download_url,
        screenshots: [], 
        category: cat,
        modFeatures: '💎 Phiên bản VIP Độc Quyền:\n- Nguồn tải tốc độ cao trực tiếp từ Github.\n- Không chứa quảng cáo rác.\n- Tệp tin nguyên bản, đảm bảo cài đặt mượt mà qua TrollStore / ESign.'
      };
    });

    CACHED_VIP_APPS = finalApps;
    return finalApps;
  } catch (error) {
    return [];
  }
};