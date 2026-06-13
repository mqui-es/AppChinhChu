import React, { useState, useEffect, useRef, memo } from 'react';
import { 
  StyleSheet, Text, View, ScrollView, Image, TouchableOpacity, 
  ActivityIndicator, Alert, Platform, Dimensions, Modal, Animated, 
  TextInput, FlatList, Clipboard, DeviceEventEmitter 
} from 'react-native';
import { useRouter } from 'expo-router';
import { 
  ArrowLeft, Search, ShoppingCart, ClipboardList, Building2, 
  Copy, Trash2, Tag, Check, X, ShieldCheck, Zap, AlertTriangle,
  ChevronDown, ChevronUp, Filter
} from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth, db } from '../../firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';
import { 
  collection, getDocs, doc, getDoc, setDoc, addDoc, 
  query, where, orderBy, updateDoc, runTransaction, serverTimestamp, 
  onSnapshot 
} from 'firebase/firestore';
import { COLORS, SIZES, SHADOWS, useThemeUpdate, TXT } from '../../constants/theme';
import { TabTransition } from '../../components/ui/TabTransition';
import { SPRINGS, entranceAnim } from '../../constants/animations';

const { width, height } = Dimensions.get('window');

const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyXnH5KjwQVafxGW_W2KlpDY9KHBx_0TAmaNZBqUaPz9WR8T1PDKwB9un37fNA_YO7pmg/exec";
const BANK_ID = "ACB";
const ACCOUNT_NO = "22703611";
const ACCOUNT_NAME = "TRAN NGUYEN MINH QUI";

interface ProductItem {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  category: string;
  description: string;
  iconUrl: string;
  deliveryType: string;
  stock: number;
  credentials?: string[];
}

interface CartItem {
  product: ProductItem;
  quantity: number;
}

interface OrderItem {
  id: string;
  productName: string;
  price: number;
  quantity: number;
  date: any;
  status: string;
  credentials: string[];
}

interface TransactionItem {
  orderId: string;
  amount: number;
  status: string;
  time: string;
}

const MOCK_PRODUCTS_FALLBACK: ProductItem[] = [
  {
    id: "spotify_mock",
    name: "Tài khoản Spotify Premium 1 Năm (Chính Chủ)",
    price: 150000,
    category: "Giải trí",
    description: "Nghe nhạc không quảng cáo chất lượng cao 320kbps trên tài khoản chính chủ của sếp.\nHỗ trợ tải nhạc offline.\nBảo hành 1 đổi 1 trong suốt thời gian sử dụng.",
    iconUrl: "https://upload.wikimedia.org/wikipedia/commons/1/19/Spotify_logo_without_text.svg",
    deliveryType: "Instant",
    stock: 4
  },
  {
    id: "netflix_mock",
    name: "Tài khoản Netflix Premium UltraHD 4K (1 Tháng)",
    price: 100000,
    category: "Giải trí",
    description: "Xem phim độ phân giải UltraHD 4K trên Netflix.\nTài khoản dùng chung (Shared Profile), vui lòng không chỉnh sửa mật khẩu và thông tin tài khoản.\nBảo hành 1 tháng.",
    iconUrl: "https://upload.wikimedia.org/wikipedia/commons/0/08/Netflix_2015_logo.svg",
    deliveryType: "Instant",
    stock: 3
  },
  {
    id: "canva_mock",
    name: "Tài khoản Canva Pro Giáo Dục (Vĩnh Viễn)",
    price: 50000,
    category: "Thiết kế",
    description: "Thiết kế ảnh, banner chuyên nghiệp bằng Canva Pro.\nKhông giới hạn tài nguyên và phông chữ Pro.\nĐăng nhập và nâng cấp trực tiếp.",
    iconUrl: "https://upload.wikimedia.org/wikipedia/commons/0/0e/Canva_logo.svg",
    deliveryType: "Instant",
    stock: 5
  },
  {
    id: "capcut_mock",
    name: "Tài khoản CapCut Pro PC/Mobile (1 Năm)",
    price: 180000,
    category: "Đồ họa",
    description: "Mở khóa toàn bộ tính năng và hiệu ứng Pro trên phần mềm dựng video đỉnh cao CapCut.\nÁp dụng trên cả máy tính lẫn điện thoại.\nBàn giao tài khoản đăng nhập.",
    iconUrl: "https://upload.wikimedia.org/wikipedia/commons/1/1a/Capcut_logo.svg",
    deliveryType: "Instant",
    stock: 3
  }
];

const HTML_ENTITIES: { [key: string]: string } = {
  'amp': '&', 'lt': '<', 'gt': '>', 'quot': '"', 'apos': "'", 'nbsp': ' ',
  'aacute': 'á', 'Aacute': 'Á',
  'agrave': 'à', 'Agrave': 'À',
  'atilde': 'ã', 'Atilde': 'Ã',
  'circum': 'ˆ', 'circumflex': 'ˆ', 'acirc': 'â', 'Acirc': 'Â',
  'eacute': 'é', 'Eacute': 'É',
  'egrave': 'è', 'Egrave': 'È',
  'ecirc': 'ê', 'Ecirc': 'Ê',
  'iacute': 'í', 'Iacute': 'Í',
  'igrave': 'ì', 'Igrave': 'Ì',
  'oacute': 'ó', 'Oacute': 'Ó',
  'ograve': 'ò', 'Ograve': 'Ò',
  'ocirc': 'ô', 'Ocirc': 'Ô',
  'otilde': 'õ', 'Otilde': 'Õ',
  'uacute': 'ú', 'Uacute': 'Ú',
  'ugrave': 'ù', 'Ugrave': 'Ù',
  'yacute': 'ý', 'Yacute': 'Ý',
  'middot': '·',
  'bull': '•',
  'bullet': '•',
  'ndash': '–',
  'mdash': '—',
  'ldquo': '“',
  'rdquo': '”',
  'lsquo': '‘',
  'rsquo': '’',
  'hellip': '…',
  'copy': '©',
  'reg': '®',
  'trade': '™',
  'zwj': '',
  'rarr': '→'
};

const cleanDescription = (str: string): string => {
  if (!str) return "";
  let clean = String(str);

  // 1. Xử lý các chuỗi double escaped như \\n hoặc \\r\\n
  clean = clean.replace(/\\r\\n/g, '\n').replace(/\\n/g, '\n');
  clean = clean.replace(/\\"/g, '"').replace(/\\'/g, "'");

  // 2. Giải mã thực thể HTML lặp lại tối đa 3 lần để xử lý double/triple-escaping
  for (let i = 0; i < 3; i++) {
    const prev = clean;
    
    // Thực thể dạng số
    clean = clean.replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(parseInt(dec, 10)));
    clean = clean.replace(/&#x([0-9a-fA-F]+);/g, (match, hex) => String.fromCharCode(parseInt(hex, 16)));

    // Thực thể dạng chữ sử dụng map đầy đủ
    clean = clean.replace(/&([a-zA-Z0-9]+);/g, (match, entity) => {
      return HTML_ENTITIES[entity] !== undefined ? HTML_ENTITIES[entity] : match;
    });
      
    if (clean === prev) break;
  }

  // 3. Xóa bỏ toàn bộ block <style>...</style> sử dụng vòng lặp an toàn không dùng Regex lazy match
  while (true) {
    const styleStartIndex = clean.toLowerCase().indexOf('<style');
    if (styleStartIndex === -1) break;
    
    const openingTagEndIndex = clean.indexOf('>', styleStartIndex);
    if (openingTagEndIndex === -1) break;
    
    const closingTagStartIndex = clean.toLowerCase().indexOf('</style', openingTagEndIndex);
    if (closingTagStartIndex === -1) {
      clean = clean.substring(0, styleStartIndex);
      break;
    }
    const closingTagEndIndex = clean.indexOf('>', closingTagStartIndex);
    if (closingTagEndIndex === -1) {
      clean = clean.substring(0, styleStartIndex);
      break;
    }
    clean = clean.substring(0, styleStartIndex) + clean.substring(closingTagEndIndex + 1);
  }

  // 4. Xóa bỏ toàn bộ block <script>...</script> sử dụng vòng lặp an toàn
  while (true) {
    const scriptStartIndex = clean.toLowerCase().indexOf('<script');
    if (scriptStartIndex === -1) break;
    
    const openingTagEndIndex = clean.indexOf('>', scriptStartIndex);
    if (openingTagEndIndex === -1) break;
    
    const closingTagStartIndex = clean.toLowerCase().indexOf('</script', openingTagEndIndex);
    if (closingTagStartIndex === -1) {
      clean = clean.substring(0, scriptStartIndex);
      break;
    }
    const closingTagEndIndex = clean.indexOf('>', closingTagStartIndex);
    if (closingTagEndIndex === -1) {
      clean = clean.substring(0, scriptStartIndex);
      break;
    }
    clean = clean.substring(0, scriptStartIndex) + clean.substring(closingTagEndIndex + 1);
  }

  // 5. Xóa bỏ HTML comments
  while (true) {
    const commentStartIndex = clean.indexOf('<!--');
    if (commentStartIndex === -1) break;
    
    const commentEndIndex = clean.indexOf('-->', commentStartIndex);
    if (commentEndIndex === -1) {
      clean = clean.substring(0, commentStartIndex);
      break;
    }
    clean = clean.substring(0, commentStartIndex) + clean.substring(commentEndIndex + 3);
  }

  // 6. Thay thế các thẻ line break thành dấu xuống dòng thực sự
  clean = clean.replace(/<br\s*\/?>/gi, '\n');
  clean = clean.replace(/<p>/gi, '').replace(/<\/p>/gi, '\n');
  
  // 7. Thay thế thẻ <li> thành gạch đầu dòng
  clean = clean.replace(/<li>/gi, '• ');
  clean = clean.replace(/<\/li>/gi, '\n');
  
  // 8. Xóa bỏ tất cả các thẻ HTML còn lại (bây giờ đã lộ ra hoàn toàn)
  clean = clean.replace(/<[^>]*>/g, '');
  
  // 9. Dọn dẹp khoảng trắng thừa và dòng trống liên tiếp
  clean = clean.replace(/\r\n/g, '\n');
  clean = clean.replace(/\n\s*\n+/g, '\n\n');
  
  return clean.trim();
};

const getProductIcon = (name: string, category: string): string => {
  const lowercaseName = name.toLowerCase();
  
  if (lowercaseName.includes('spotify')) {
    return 'https://cdn-icons-png.flaticon.com/512/174/174872.png';
  }
  if (lowercaseName.includes('netflix')) {
    return 'https://cdn-icons-png.flaticon.com/512/732/732228.png';
  }
  if (lowercaseName.includes('canva')) {
    return 'https://cdn-icons-png.flaticon.com/512/5968/5968853.png';
  }
  if (lowercaseName.includes('capcut') || lowercaseName.includes('cap cut')) {
    return 'https://img.utdstc.com/icon/4e7/40e/4e740e53a2072120021c75b060d4b971a17924cc63486c9d747a3f37318ec893:200';
  }
  if (lowercaseName.includes('clip studio') || lowercaseName.includes('csp') || lowercaseName.includes('celsys')) {
    return 'https://cdn.icon-icons.com/icons2/3053/PNG/512/clip_studio_paint_macos_bigsur_icon_190288.png';
  }
  if (lowercaseName.includes('youtube') || lowercaseName.includes('premium')) {
    if (lowercaseName.includes('youtube')) {
      return 'https://cdn-icons-png.flaticon.com/512/1384/1384060.png';
    }
  }
  if (lowercaseName.includes('chatgpt') || lowercaseName.includes('gpt') || lowercaseName.includes('openai')) {
    return 'https://cdn-icons-png.flaticon.com/512/12222/12222588.png';
  }
  if (lowercaseName.includes('claude')) {
    return 'https://cdn.icon-icons.com/icons2/4243/PNG/512/claude_ai_logo_icon_263435.png';
  }
  if (lowercaseName.includes('microsoft') || lowercaseName.includes('office') || lowercaseName.includes('365')) {
    return 'https://cdn-icons-png.flaticon.com/512/732/732221.png';
  }
  if (lowercaseName.includes('zoom')) {
    return 'https://cdn-icons-png.flaticon.com/512/4406/4406167.png';
  }
  if (lowercaseName.includes('google') || lowercaseName.includes('drive') || lowercaseName.includes('gg one')) {
    return 'https://cdn-icons-png.flaticon.com/512/2965/2965306.png';
  }
  if (lowercaseName.includes('steam')) {
    return 'https://cdn-icons-png.flaticon.com/512/220/220223.png';
  }
  if (lowercaseName.includes('adobe') || lowercaseName.includes('photoshop') || lowercaseName.includes('illustrator')) {
    return 'https://cdn-icons-png.flaticon.com/512/732/732168.png';
  }

  // Fallback to UI Avatars with category name or first letter
  return "https://ui-avatars.com/api/?name=" + encodeURIComponent(name) + "&background=random&color=fff";
};

const ProductRowItem = memo(({ item, onSelect, onAddToCart, isLight }: { item: ProductItem; onSelect: () => void; onAddToCart: () => void; isLight: boolean }) => {
  useThemeUpdate();
  const styles = getStyles(COLORS);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, { toValue: 0.95, ...SPRINGS.tap }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, { toValue: 1, ...SPRINGS.bounce }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity 
        style={[styles.productListCard, SHADOWS.glowCard, item.stock === 0 && { opacity: 0.75 }]}
        activeOpacity={1}
        onPress={onSelect}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        {/* LEFT: Image icon */}
        <View style={styles.productIconWrapper}>
          <Image source={{ uri: item.iconUrl }} style={styles.productIcon} resizeMode="contain" />
          {item.stock === 0 && (
            <View style={styles.soldOutOverlayMini}>
              <Text style={styles.soldOutTextMini}>HẾT HÀNG</Text>
            </View>
          )}
        </View>
        
        {/* MIDDLE: Info body */}
        <View style={styles.productBody}>
          <Text style={styles.productTitle} numberOfLines={2}>{item.name}</Text>
          
          {/* Price Row */}
          <View style={styles.priceRow}>
            <Text style={styles.productPriceText}>{item.price.toLocaleString('vi-VN')}đ</Text>
            {item.originalPrice && item.originalPrice > item.price ? (
              <>
                <Text style={styles.originalPriceText}>{item.originalPrice.toLocaleString('vi-VN')}đ</Text>
                <View style={styles.discountBadge}>
                  <Text style={styles.discountBadgeText}>
                    -{Math.round(((item.originalPrice - item.price) / item.originalPrice) * 100)}%
                  </Text>
                </View>
              </>
            ) : null}
          </View>

          {/* Tag badges - Apple Style Bullet Points */}
          <View style={styles.productMetaBulletRow}>
            <Text style={styles.productMetaBulletText} numberOfLines={1}>
              {item.category}  •  {item.deliveryType === 'Instant' ? 'Tự động' : 'Giao tay'}  •  
              <Text style={{ color: item.stock > 0 ? COLORS.success : COLORS.danger, fontWeight: '700' }}>
                {item.stock === 999 ? ' Sẵn hàng' : (item.stock > 0 ? ` Còn ${item.stock}` : ' Hết hàng')}
              </Text>
            </Text>
          </View>
        </View>

        {/* RIGHT: Quick buy button */}
        <View style={styles.productRight}>
          <TouchableOpacity 
            style={[styles.quickBuyBtn, item.stock === 0 && styles.quickBuyBtnDisabled]}
            disabled={item.stock === 0}
            onPress={onAddToCart}
            activeOpacity={0.7}
          >
            <Text style={styles.quickBuyBtnText}>{item.stock > 0 ? 'Mua' : 'Hết'}</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
});

export default function MMOMarketplaceScreen() {
  useThemeUpdate();
  const router = useRouter();
  const styles = getStyles(COLORS);
  const isLight = COLORS.background === '#F4F4F6';

  // 4 Tab chính: 'SHOP' | 'CART' | 'ORDERS' | 'RECHARGE'
  const [activeTab, setActiveTab] = useState<'SHOP' | 'CART' | 'ORDERS' | 'RECHARGE'>('SHOP');

  // Bộ lọc danh mục nâng cao
  const [isCategoryModalVisible, setIsCategoryModalVisible] = useState(false);
  const [categorySearchQuery, setCategorySearchQuery] = useState('');

  // Lọc ra các danh mục hiển thị nhanh ở trang chính
  const getQuickCategories = () => {
    const base = ['Tất cả', 'Claude AI', 'Spotify', 'Netflix', 'Proxy', 'Canva', 'CapCut', 'Khác'];
    const filteredBase = base.filter(c => c === 'Tất cả' || categories.includes(c));
    if (selectedCategory && !filteredBase.includes(selectedCategory)) {
      filteredBase.push(selectedCategory);
    }
    return filteredBase;
  };

  // Page entrance animations
  const headerSlide    = useRef(new Animated.Value(20)).current;
  const headerOpacity  = useRef(new Animated.Value(0)).current;
  const contentSlide   = useRef(new Animated.Value(24)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const backBtnScale   = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.stagger(60, [
      entranceAnim(headerSlide, headerOpacity, 0),
      entranceAnim(contentSlide, contentOpacity, 0),
    ]).start();
  }, []);

  const lastScrollY = useRef(0);
  const isTabBarHidden = useRef(false);

  const handleScroll = (event: any) => {
    const value = event.nativeEvent.contentOffset.y;
    if (value < 0) return;
    const diff = value - lastScrollY.current;
    
    if (diff > 15 && value > 100) {
      if (!isTabBarHidden.current) {
        isTabBarHidden.current = true;
        DeviceEventEmitter.emit('hideTabBar');
      }
    } else if (diff < -15 || value < 20) {
      if (isTabBarHidden.current) {
        isTabBarHidden.current = false;
        DeviceEventEmitter.emit('showTabBar');
      }
    }
    lastScrollY.current = value;
  };

  // Tự động hiển thị lại thanh điều hướng khi chuyển đổi tab phụ
  useEffect(() => {
    isTabBarHidden.current = false;
    DeviceEventEmitter.emit('showTabBar');
  }, [activeTab]);
  
  // Dữ liệu từ Firestore
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [categories, setCategories] = useState<string[]>(['Tất cả']);
  const [selectedCategory, setSelectedCategory] = useState<string>('Tất cả');
  const [isCategoryExpanded, setIsCategoryExpanded] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loadingProducts, setLoadingProducts] = useState<boolean>(true);
  const [userCoins, setUserCoins] = useState<number>(0);

  // Advanced Sorting and Filters
  const [sortBy, setSortBy] = useState<'newest' | 'priceAsc' | 'priceDesc' | 'nameAsc'>('newest');
  const [deliveryFilter, setDeliveryFilter] = useState<'all' | 'Instant' | 'Manual'>('all');

  // Dynamic Recharge/Auto-banking state
  const [rechargeAmount, setRechargeAmount] = useState<number>(50000); // Mặc định gói nạp 50k
  const [rechargeInput, setRechargeInput] = useState<string>('50000');
  const [rechargeOrderId, setRechargeOrderId] = useState<string>('');
  const [isCheckingRecharge, setIsCheckingRecharge] = useState<boolean>(false);

  // Transaction Logs history state
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState<boolean>(false);

  // Giỏ hàng
  const [cart, setCart] = useState<CartItem[]>([]);
  const [couponCode, setCouponCode] = useState<string>('');
  const [couponDiscount, setCouponDiscount] = useState<number>(0); // Phần trăm giảm (0 - 100)
  const [appliedCoupon, setAppliedCoupon] = useState<string>('');
  const [applyingCoupon, setApplyingCoupon] = useState<boolean>(false);
  const [isCheckingOut, setIsCheckingOut] = useState<boolean>(false);

  // Đơn hàng
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [loadingOrders, setLoadingOrders] = useState<boolean>(false);

  // Chi tiết sản phẩm Modal
  const [selectedProduct, setSelectedProduct] = useState<ProductItem | null>(null);
  const [detailQuantity, setDetailQuantity] = useState<number>(1);

  // Animation tab slide
  const tabSlideAnim = useRef(new Animated.Value(0)).current;

  const formatOrderDate = (dateVal: any) => {
    if (!dateVal) return "";
    if (dateVal.seconds !== undefined) {
      return new Date(dateVal.seconds * 1000).toLocaleString("vi-VN");
    }
    const parsed = new Date(dateVal);
    if (!isNaN(parsed.getTime())) {
      return parsed.toLocaleString("vi-VN");
    }
    return String(dateVal);
  };

  // Lắng nghe số dư, auth state & nạp giỏ hàng lúc mở
  useEffect(() => {
    loadCart();
    
    let unsubUser: any;
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        // Tải lại sản phẩm khi người dùng đã đăng nhập thành công
        fetchProductsData();
        
        // Sinh rechargeOrderId mặc định
        const orderId = `MMO${user.uid.substring(0, 4).toUpperCase()}${Date.now().toString().slice(-4)}`;
        setRechargeOrderId(orderId);

        unsubUser = onSnapshot(doc(db, 'users', user.uid), (snap) => {
          if (snap.exists()) {
            setUserCoins(snap.data().coins || 0);
          }
        });
      } else {
        setUserCoins(0);
        // Tải sản phẩm khi không đăng nhập
        fetchProductsData();
      }
    });

    return () => {
      if (unsubUser) unsubUser();
      if (unsubAuth) unsubAuth();
    };
  }, []);

  // Lắng nghe tab thay đổi để fetch đơn hàng và lịch sử nạp
  useEffect(() => {
    if (activeTab === 'ORDERS') {
      fetchUserOrders();
    } else if (activeTab === 'RECHARGE') {
      fetchUserTransactions();
    }
    
    // Tab spring indicator slide
    const tabIndex = ['SHOP', 'CART', 'ORDERS', 'RECHARGE'].indexOf(activeTab);
    Animated.spring(tabSlideAnim, {
      toValue: tabIndex * ((width - 32) / 4),
      stiffness: 180,
      damping: 22,
      mass: 0.8,
      useNativeDriver: true,
    }).start();
  }, [activeTab]);

  // Seeding dữ liệu mẫu nếu Firestore trống
  const seedMockProducts = async () => {
    try {
      const mockProductsToSeed = [
        {
          name: "Tài khoản Spotify Premium 1 Năm (Chính Chủ)",
          price: 150000,
          category: "Giải trí",
          description: "Nghe nhạc không quảng cáo chất lượng cao 320kbps trên tài khoản chính chủ của sếp.\nHỗ trợ tải nhạc offline.\nBảo hành 1 đổi 1 trong suốt thời gian sử dụng.",
          iconUrl: "https://upload.wikimedia.org/wikipedia/commons/1/19/Spotify_logo_without_text.svg",
          deliveryType: "Instant",
          stock: 4,
          credentials: [
            "spotify_acc1@mmo.com|passSpotify123",
            "spotify_acc2@mmo.com|spotifyPass456",
            "spotify_acc3@mmo.com|niceSpotify789",
            "spotify_acc4@mmo.com|superMusic111"
          ]
        },
        {
          name: "Tài khoản Netflix Premium UltraHD 4K (1 Tháng)",
          price: 100000,
          category: "Giải trí",
          description: "Xem phim độ phân giải UltraHD 4K trên Netflix.\nTài khoản dùng chung (Shared Profile), vui lòng không chỉnh sửa mật khẩu và thông tin tài khoản.\nBảo hành 1 tháng.",
          iconUrl: "https://upload.wikimedia.org/wikipedia/commons/0/08/Netflix_2015_logo.svg",
          deliveryType: "Instant",
          stock: 3,
          credentials: [
            "netflix_acc1@mmo.com|passNetflix111|Profile_Sếp_1",
            "netflix_acc2@mmo.com|passNetflix222|Profile_Sếp_2",
            "netflix_acc3@mmo.com|passNetflix333|Profile_Sếp_3"
          ]
        },
        {
          name: "Tài khoản Canva Pro Giáo Dục (Vĩnh Viễn)",
          price: 50000,
          category: "Thiết kế",
          description: "Thiết kế ảnh, banner chuyên nghiệp bằng Canva Pro.\nKhông giới hạn tài nguyên và phông chữ Pro.\nĐăng nhập và nâng cấp trực tiếp.",
          iconUrl: "https://upload.wikimedia.org/wikipedia/commons/0/0e/Canva_logo.svg",
          deliveryType: "Instant",
          stock: 5,
          credentials: [
            "canva_pro_1@mmo.com|canvaPass111",
            "canva_pro_2@mmo.com|canvaPass222",
            "canva_pro_3@mmo.com|canvaPass333",
            "canva_pro_4@mmo.com|canvaPass444",
            "canva_pro_5@mmo.com|canvaPass555"
          ]
        },
        {
          name: "Tài khoản CapCut Pro PC/Mobile (1 Năm)",
          price: 180000,
          category: "Đồ họa",
          description: "Mở khóa toàn bộ tính năng và hiệu ứng Pro trên phần mềm dựng video đỉnh cao CapCut.\nÁp dụng trên cả máy tính lẫn điện thoại.\nBàn giao tài khoản đăng nhập.",
          iconUrl: "https://upload.wikimedia.org/wikipedia/commons/1/1a/Capcut_logo.svg",
          deliveryType: "Instant",
          stock: 3,
          credentials: [
            "capcut_pro_1@mmo.com|capcutPass1",
            "capcut_pro_2@mmo.com|capcutPass2",
            "capcut_pro_3@mmo.com|capcutPass3"
          ]
        }
      ];

      const mockCoupons = [
        { code: "GIAM30", value: 30 },
        { code: "VSIGN", value: 10 }
      ];

      for (const p of mockProductsToSeed) {
        await addDoc(collection(db, "mmo_products"), p);
      }
      for (const c of mockCoupons) {
        await setDoc(doc(db, "mmo_coupons", c.code), { value: c.value });
      }
    } catch (e) {
      console.error("Lỗi seeding mock data:", e);
    }
  };

  const fetchProductsData = async () => {
    const parseStock = (val: any): number => {
      if (val === undefined || val === null || val === '') return 999;
      const num = parseInt(val, 10);
      return isNaN(num) ? 999 : num;
    };
    setLoadingProducts(true);
    try {
      const res = await fetch(`${SCRIPT_URL}?action=get_kingmmo_products`);
      const json = await res.json();
      if (json.success) {
        const list: ProductItem[] = [];
        const cats = new Set<string>();
        const configs = json.configs || {};
        
        // 1. Xử lý sản phẩm KingMMO
        if (json.kingmmoProducts && Array.isArray(json.kingmmoProducts)) {
          for (const kp of json.kingmmoProducts) {
            const cfg = configs[kp.id] || {};
            if (cfg.isHidden === true || cfg.isHidden === 'true') continue;
            
            const price = cfg.price ? parseInt(cfg.price) : kp.price;
            const originalPrice = cfg.originalPrice ? parseInt(cfg.originalPrice) : (kp.originalPrice || Math.round((price * 1.25) / 1000) * 1000);
            // Nếu có config ghi đè stock thì ưu tiên dùng, nếu không thì lấy từ kp.stock.
            // Với KingMMO, nếu kp.stock = 0 thì mặc định là 999 (Sẵn hàng) để cho phép khách mua (Admin bàn giao tay).
            let stock;
            if (cfg.stock !== undefined && cfg.stock !== null && cfg.stock !== "") {
              stock = parseStock(cfg.stock);
            } else {
              stock = kp.stock > 0 ? kp.stock : 999;
            }
            const name = cfg.name || kp.name;
            const category = cfg.cat || kp.cat || "Khác";
            const description = cleanDescription(cfg.desc || kp.desc || "");
            const iconUrl = cfg.icon || getProductIcon(name, category);
            
            list.push({
              id: kp.id,
              name,
              price,
              originalPrice,
              category,
              description,
              iconUrl,
              deliveryType: "Instant",
              stock
            });
            cats.add(category);
          }
        }
        
        // 2. Xử lý sản phẩm custom từ Google Sheet
        if (json.customProducts && Array.isArray(json.customProducts)) {
          for (const cp of json.customProducts) {
            if (cp.isHidden === true || cp.isHidden === 'true') continue;
            
            const category = cp.cat || "Khác";
            const price = cp.price;
            const originalPrice = cp.originalPrice || Math.round((price * 1.25) / 1000) * 1000;
            const iconUrl = cp.icon || getProductIcon(cp.name, category);
            
            list.push({
              id: cp.id,
              name: cp.name,
              price,
              originalPrice,
              category,
              description: cleanDescription(cp.desc || ""),
              iconUrl,
              deliveryType: "Manual",
              stock: parseStock(cp.stock)
            });
            cats.add(category);
          }
        }
        
        setProducts(list);
        setCategories(['Tất cả', ...Array.from(cats)]);
      } else {
        throw new Error(json.error || "Lỗi tải sản phẩm từ Apps Script.");
      }
    } catch (e) {
      console.warn("Lỗi tải products từ Apps Script, dùng dữ liệu dự phòng:", e);
      setProducts(MOCK_PRODUCTS_FALLBACK);
      const cats = new Set<string>();
      MOCK_PRODUCTS_FALLBACK.forEach(p => cats.add(p.category));
      setCategories(['Tất cả', ...Array.from(cats)]);
    } finally {
      setLoadingProducts(false);
    }
  };

  const fetchUserOrders = async () => {
    if (!auth.currentUser) return;
    setLoadingOrders(true);
    try {
      const res = await fetch(`${SCRIPT_URL}?action=get_user_mmo_orders&uid=${auth.currentUser.uid}`);
      const json = await res.json();
      if (json.success && json.data) {
        const list: OrderItem[] = json.data.map((item: any) => {
          const creds = item.accountData ? [item.accountData] : [];
          const product = products.find(p => p.id === item.productId);
          const unitPrice = item.price ? Math.round(item.price / item.amount) : (product ? product.price : 0);
          
          return {
            id: item.orderId,
            productName: item.productName || "Sản phẩm MMO",
            price: unitPrice,
            quantity: item.amount || 1,
            date: item.time,
            status: item.status === "COMPLETED" ? "Hoàn thành" : (item.status === "PENDING" ? "Đang xử lý" : item.status),
            credentials: creds
          };
        });
        setOrders(list);
      }
    } catch (e) {
      console.warn("Lỗi fetch user orders từ Apps Script:", e);
    } finally {
      setLoadingOrders(false);
    }
  };

  // Giỏ hàng lưu trữ AsyncStorage
  const loadCart = async () => {
    try {
      const stored = await AsyncStorage.getItem('@mmo_cart');
      if (stored) {
        setCart(JSON.parse(stored));
      }
    } catch (e) {}
  };

  const saveCart = async (newCart: CartItem[]) => {
    try {
      setCart(newCart);
      await AsyncStorage.setItem('@mmo_cart', JSON.stringify(newCart));
    } catch (e) {}
  };

  const addToCart = (product: ProductItem, quantity: number = 1) => {
    const existing = cart.find(item => item.product.id === product.id);
    let newCart = [];
    if (existing) {
      newCart = cart.map(item => 
        item.product.id === product.id 
          ? { ...item, quantity: Math.min(product.stock, item.quantity + quantity) } 
          : item
      );
    } else {
      newCart = [...cart, { product, quantity }];
    }
    saveCart(newCart);
    Alert.alert("Thành công", `Đã thêm ${product.name} vào giỏ hàng.`);
  };

  const updateCartQty = (prodId: string, delta: number) => {
    const item = cart.find(i => i.product.id === prodId);
    if (!item) return;
    const newQty = item.quantity + delta;
    if (newQty <= 0) {
      // Xóa khỏi giỏ hàng
      const newCart = cart.filter(i => i.product.id !== prodId);
      saveCart(newCart);
    } else {
      const newCart = cart.map(i => 
        i.product.id === prodId 
          ? { ...i, quantity: Math.min(i.product.stock, newQty) } 
          : i
      );
      saveCart(newCart);
    }
  };

  const removeFromCart = (prodId: string) => {
    const newCart = cart.filter(i => i.product.id !== prodId);
    saveCart(newCart);
  };

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setApplyingCoupon(true);
    try {
      const res = await fetch(`${SCRIPT_URL}?action=check_coupon&code=${encodeURIComponent(couponCode.trim().toUpperCase())}`);
      const json = await res.json();
      if (json.success) {
        const val = json.value || 0;
        setCouponDiscount(val);
        setAppliedCoupon(json.code);
        Alert.alert("Thành công", `Áp dụng mã giảm giá thành công! Giảm ${val}%.`);
      } else {
        Alert.alert("Thất bại", json.error || "Mã giảm giá không hợp lệ hoặc đã hết hạn.");
      }
    } catch (e) {
      Alert.alert("Lỗi", "Không thể xác minh mã giảm giá.");
    } finally {
      setApplyingCoupon(false);
    }
  };

  // Tính tổng giỏ hàng
  const getCartSubtotal = () => {
    return cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  };

  const getCartTotal = () => {
    const sub = getCartSubtotal();
    const disc = sub * (couponDiscount / 100);
    return Math.max(0, Math.round(sub - disc));
  };

  // Thanh toán Transaction an toàn tuyệt đối
  const handleCheckout = async () => {
    if (!auth.currentUser) {
      return Alert.alert("Cần Đăng Nhập", "Sếp vui lòng đăng nhập trước khi mua hàng nhé!");
    }
    if (cart.length === 0) return;

    const total = getCartTotal();
    const userRef = doc(db, "users", auth.currentUser.uid);

    // 1. Kiểm tra tài khoản ví người dùng và trừ tiền ví trong Firestore
    setIsCheckingOut(true);
    try {
      await runTransaction(db, async (transaction) => {
        const userSnap = await transaction.get(userRef);
        if (!userSnap.exists()) throw new Error("Không tìm thấy profile người dùng.");
        const curCoins = userSnap.data().coins || 0;
        if (curCoins < total) throw new Error("Số dư tài khoản không đủ.");
        transaction.update(userRef, { coins: curCoins - total });
      });

      // 2. Tạo các đơn hàng MMO trên Google Sheets thông qua Apps Script Webhook
      let checkoutSuccess = true;
      let errorMessage = "";
      const createdOrders = [];

      try {
        for (const item of cart) {
          if (item.product.id.endsWith('_mock')) {
            // Lớp giả lập cho các sản phẩm Mock local để test
            createdOrders.push("MOCK_ORDER_" + Date.now());
            continue;
          }
          const res = await fetch(`${SCRIPT_URL}?action=buy_mmo_pending&uid=${auth.currentUser.uid}&productId=${item.product.id}&productName=${encodeURIComponent(item.product.name)}&price=${item.product.price}&amount=${item.quantity}`);
          const json = await res.json();
          if (json && json.success) {
            createdOrders.push(json.orderId);
          } else {
            checkoutSuccess = false;
            errorMessage = json?.error || "Lỗi tạo đơn hàng trên Google Sheets.";
            break;
          }
        }
      } catch (err: any) {
        checkoutSuccess = false;
        errorMessage = err.message || "Không thể kết nối đến máy chủ Google Sheets.";
      }

      if (!checkoutSuccess) {
        // Hoàn tiền nếu thất bại
        await runTransaction(db, async (transaction) => {
          const userSnap = await transaction.get(userRef);
          const curCoins = userSnap.exists() ? (userSnap.data().coins || 0) : 0;
          transaction.update(userRef, { coins: curCoins + total });
        });
        throw new Error(errorMessage);
      }

      // Thành công
      await saveCart([]); // Xóa giỏ hàng
      setCouponCode('');
      setCouponDiscount(0);
      setAppliedCoupon('');
      Alert.alert(
        "Thành Công!", 
        "Đơn hàng của sếp đã thanh toán hoàn tất. Vui lòng chờ Admin bàn giao tài khoản trong mục Đơn hàng.",
        [
          { text: "Đóng", style: "cancel" },
          { text: "Xem đơn hàng", onPress: () => setActiveTab('ORDERS') }
        ]
      );
      // Tải lại dữ liệu sản phẩm và đơn hàng
      fetchProductsData();
      fetchUserOrders();
    } catch (e: any) {
      Alert.alert("Giao Dịch Thất Bại", e.message || "Đã xảy ra lỗi trong quá trình giao dịch.");
    } finally {
      setIsCheckingOut(false);
    }
  };

  const handleCopy = (text: string) => {
    Clipboard.setString(text);
    Alert.alert("Sao chép", "Đã sao chép thành công!");
  };

  // Sinh QR Code động dựa trên input người dùng nhập vào
  const getRechargeQrUrl = () => {
    const amount = parseInt(rechargeInput, 10) || 10000;
    return `https://img.vietqr.io/image/${BANK_ID}-${ACCOUNT_NO}-compact2.png?amount=${amount}&addInfo=${rechargeOrderId}&accountName=${encodeURIComponent(ACCOUNT_NAME)}`;
  };

  // Kiểm tra thanh toán tự động (gộp đăng ký đơn và check đối soát)
  const handleCheckRecharge = async () => {
    if (!rechargeOrderId) return;
    const amount = parseInt(rechargeInput, 10);
    if (isNaN(amount) || amount < 10000) {
      return Alert.alert("Lỗi", "Số tiền nạp tối thiểu là 10.000đ. Vui lòng nhập số tiền hợp lệ!");
    }

    setIsCheckingRecharge(true);
    try {
      // 1. Đăng ký/cập nhật thông tin đơn hàng lên Google Sheets Webhook trước khi check
      await fetch(`${SCRIPT_URL}?action=create_order&orderId=${rechargeOrderId}&uid=${auth.currentUser!.uid}&amount=${amount}`);

      // 2. Gọi API check giao dịch SieuThiCode
      const res = await fetch(`${SCRIPT_URL}?action=check_stc_payment&orderId=${rechargeOrderId}&amount=${amount}`);
      const json = await res.json();
      if (json.success) {
        const uid = auth.currentUser!.uid;
        const userRef = doc(db, 'users', uid);
        const snap = await getDoc(userRef);
        const currentCoins = snap.exists() ? (snap.data().coins || 0) : 0;
        const addedAmount = parseInt(json.amount) || amount;
        
        await updateDoc(userRef, { coins: currentCoins + addedAmount });
        Alert.alert('🎉 Nạp Tiền Thành Công!', `Tài khoản đã được cộng thêm +${addedAmount.toLocaleString('vi-VN')}đ!`, [
          { text: 'Tuyệt vời', onPress: () => {
              // Sinh mã đơn hàng mới cho lần nạp sau
              const newOrderId = `MMO${auth.currentUser!.uid.substring(0, 4).toUpperCase()}${Date.now().toString().slice(-4)}`;
              setRechargeOrderId(newOrderId);
              fetchUserTransactions();
          }}
        ]);
      } else {
        Alert.alert('Chưa nhận được tiền', json.error || 'Hệ thống chưa ghi nhận giao dịch của bạn. Vui lòng chờ 10-15 giây và thử lại nhé!');
      }
    } catch (error) {
      Alert.alert('Lỗi', 'Mất kết nối đến máy chủ.');
    } finally {
      setIsCheckingRecharge(false);
    }
  };

  // Tải lịch sử nạp tiền từ Google Sheet
  const fetchUserTransactions = async () => {
    if (!auth.currentUser) return;
    setLoadingTransactions(true);
    try {
      const res = await fetch(`${SCRIPT_URL}?action=get_user_transactions&uid=${auth.currentUser.uid}`);
      const json = await res.json();
      if (json.success && json.data) {
        setTransactions(json.data);
      }
    } catch (e) {
      console.warn("Lỗi tải lịch sử giao dịch:", e);
    } finally {
      setLoadingTransactions(false);
    }
  };

  // Lọc & sắp xếp sản phẩm
  const getFilteredProducts = () => {
    let list = products.filter(p => {
      const matchCat = selectedCategory === 'Tất cả' || p.category === selectedCategory;
      const matchQuery = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         p.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchDelivery = deliveryFilter === 'all' || p.deliveryType === deliveryFilter;
      return matchCat && matchQuery && matchDelivery;
    });

    // Ưu tiên xếp sản phẩm còn hàng lên trên, hết hàng xuống dưới
    list.sort((a, b) => {
      const aOut = a.stock === 0 ? 1 : 0;
      const bOut = b.stock === 0 ? 1 : 0;
      
      if (aOut !== bOut) {
        return aOut - bOut; // Còn hàng (0) sẽ đứng trước Hết hàng (1)
      }
      
      // Nếu cùng trạng thái kho, sắp xếp theo tiêu chí sortBy
      if (sortBy === 'priceAsc') {
        return a.price - b.price;
      } else if (sortBy === 'priceDesc') {
        return b.price - a.price;
      } else if (sortBy === 'nameAsc') {
        return a.name.localeCompare(b.name, 'vi');
      } else {
        // Mặc định: mới nhất
        return b.id.localeCompare(a.id);
      }
    });
    return list;
  };

  return (
    <LinearGradient colors={COLORS.bgGradient} style={styles.container}>
      <TabTransition tabPath="/mmo">
      {/* HEADER */}
      <Animated.View style={[styles.header, { transform: [{ translateY: headerSlide }], opacity: headerOpacity }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity 
            style={styles.backBtn} 
            activeOpacity={1} 
            onPress={() => router.back()}
            onPressIn={() => Animated.spring(backBtnScale, { toValue: 0.88, ...SPRINGS.tap }).start()}
            onPressOut={() => Animated.spring(backBtnScale, { toValue: 1, ...SPRINGS.bounce }).start()}
          >
            <Animated.View style={{ transform: [{ scale: backBtnScale }] }}>
              <ArrowLeft size={22} color={COLORS.primary} />
            </Animated.View>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Chợ Việt MMO</Text>
          <View style={styles.balanceContainer}>
            <Text style={styles.balanceText}>{userCoins.toLocaleString('vi-VN')}đ</Text>
          </View>
        </View>

        {/* TAB SEGMENTS */}
        <View style={styles.tabContainer}>
          <Animated.View style={[styles.activeTabPill, { transform: [{ translateX: tabSlideAnim }] }]} />
          
          {(['SHOP', 'CART', 'ORDERS', 'RECHARGE'] as const).map((tab) => {
            const isActive = activeTab === tab;
            const icons: any = {
              SHOP: <Zap size={14} color={isActive ? '#FFFFFF' : COLORS.textMuted} />,
              CART: (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <ShoppingCart size={14} color={isActive ? '#FFFFFF' : COLORS.textMuted} />
                  {cart.length > 0 && <View style={styles.cartCountDot} />}
                </View>
              ),
              ORDERS: <ClipboardList size={14} color={isActive ? '#FFFFFF' : COLORS.textMuted} />,
              RECHARGE: <Building2 size={14} color={isActive ? '#FFFFFF' : COLORS.textMuted} />,
            };
            const labels: any = { SHOP: 'Chợ App', CART: 'Giỏ Hàng', ORDERS: 'Đơn Hàng', RECHARGE: 'Nạp Tiền' };
            return (
              <TouchableOpacity key={tab} style={styles.tabBtn} onPress={() => setActiveTab(tab)} activeOpacity={0.7}>
                {icons[tab]}
                <Text style={[styles.tabBtnText, isActive && styles.tabBtnTextActive]}>{labels[tab]}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </Animated.View>

      {/* BODY VIEW */}
      <Animated.View style={[{ flex: 1 }, { transform: [{ translateY: contentSlide }], opacity: contentOpacity }]}>
        {activeTab === 'SHOP' && (
          <View style={{ flex: 1 }}>
            {/* SEARCH ROW WITH FILTER BUTTON */}
            <View style={styles.searchRow}>
              <View style={[styles.searchBox, SHADOWS.glowCard, { flex: 1 }]}>
                <Search size={18} color={COLORS.textMuted} />
                <TextInput 
                  style={styles.searchInput}
                  placeholder="Tìm tài khoản Premium..."
                  placeholderTextColor={COLORS.textMuted}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                {searchQuery !== '' && (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <X size={18} color={COLORS.textMuted} />
                  </TouchableOpacity>
                )}
              </View>
              <TouchableOpacity 
                style={[styles.filterBtn, SHADOWS.glowCard]} 
                onPress={() => setIsCategoryModalVisible(true)}
                activeOpacity={0.7}
              >
                <Filter size={18} color={COLORS.primary} />
              </TouchableOpacity>
            </View>

            {/* CATEGORIES QUICK SELECT */}
            <View style={styles.categoryContainer}>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false} 
                contentContainerStyle={styles.catScroll}
              >
                {getQuickCategories().map((cat) => {
                  const isSelected = selectedCategory === cat;
                  return (
                    <TouchableOpacity 
                      key={cat} 
                      style={[styles.catBtn, isSelected && styles.catBtnActive]} 
                      onPress={() => setSelectedCategory(cat)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.catText, isSelected && styles.catTextActive]}>
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
                
                <TouchableOpacity 
                  style={[styles.catBtn, { flexDirection: 'row', alignItems: 'center', gap: 4, borderStyle: 'dashed' }]} 
                  onPress={() => setIsCategoryModalVisible(true)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.catText, { color: COLORS.primary }]}>Xem thêm...</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>


            {/* BỘ LỌC & SẮP XẾP NÂNG CAO COMPACT */}
            <View style={styles.compactFilterBar}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.compactFilterScroll}>
                <Text style={styles.compactFilterLabel}>Giao hàng:</Text>
                <TouchableOpacity style={[styles.compactChip, deliveryFilter === 'all' && styles.compactChipActive]} onPress={() => setDeliveryFilter('all')}>
                  <Text style={[styles.compactChipText, deliveryFilter === 'all' && styles.compactChipTextActive]}>Tất cả</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.compactChip, deliveryFilter === 'Instant' && styles.compactChipActive]} onPress={() => setDeliveryFilter('Instant')}>
                  <Text style={[styles.compactChipText, deliveryFilter === 'Instant' && styles.compactChipTextActive]}>Tự động</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.compactChip, deliveryFilter === 'Manual' && styles.compactChipActive]} onPress={() => setDeliveryFilter('Manual')}>
                  <Text style={[styles.compactChipText, deliveryFilter === 'Manual' && styles.compactChipTextActive]}>Trực tiếp</Text>
                </TouchableOpacity>

                <View style={styles.verticalDivider} />

                <Text style={styles.compactFilterLabel}>Sắp xếp:</Text>
                <TouchableOpacity style={[styles.compactChip, sortBy === 'newest' && styles.compactChipActive]} onPress={() => setSortBy('newest')}>
                  <Text style={[styles.compactChipText, sortBy === 'newest' && styles.compactChipTextActive]}>Mới nhất</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.compactChip, sortBy === 'priceAsc' && styles.compactChipActive]} onPress={() => setSortBy('priceAsc')}>
                  <Text style={[styles.compactChipText, sortBy === 'priceAsc' && styles.compactChipTextActive]}>Giá ↑</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.compactChip, sortBy === 'priceDesc' && styles.compactChipActive]} onPress={() => setSortBy('priceDesc')}>
                  <Text style={[styles.compactChipText, sortBy === 'priceDesc' && styles.compactChipTextActive]}>Giá ↓</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.compactChip, sortBy === 'nameAsc' && styles.compactChipActive]} onPress={() => setSortBy('nameAsc')}>
                  <Text style={[styles.compactChipText, sortBy === 'nameAsc' && styles.compactChipTextActive]}>Tên A-Z</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>

            {/* PRODUCTS LIST */}
            {loadingProducts ? (
              <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
              </View>
            ) : getFilteredProducts().length === 0 ? (
              <View style={styles.centerContainer}>
                <AlertTriangle size={32} color={COLORS.textMuted} />
                <Text style={styles.emptyText}>Không tìm thấy sản phẩm nào.</Text>
              </View>
            ) : (
              <FlatList 
                data={getFilteredProducts()}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.productList}
                showsVerticalScrollIndicator={false}
                onScroll={handleScroll}
                scrollEventThrottle={16}
                renderItem={({ item }) => (
                  <ProductRowItem 
                    item={item}
                    isLight={isLight}
                    onSelect={() => {
                      setSelectedProduct(item);
                      setDetailQuantity(1);
                    }}
                    onAddToCart={() => {
                      if (item.stock > 0) {
                        addToCart(item, 1);
                      }
                    }}
                  />
                )}
              />
            )}
          </View>
        )}

        {/* CART TAB */}
        {activeTab === 'CART' && (
          <View style={{ flex: 1 }}>
            {cart.length === 0 ? (
              <View style={styles.centerContainer}>
                <ShoppingCart size={48} color={COLORS.textMuted} />
                <Text style={styles.emptyText}>Giỏ hàng của sếp còn trống.</Text>
                <TouchableOpacity style={styles.shopNowBtn} onPress={() => setActiveTab('SHOP')}>
                  <Text style={styles.shopNowText}>Mua Sắm Ngay</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <ScrollView 
                contentContainerStyle={styles.cartContent} 
                showsVerticalScrollIndicator={false}
                onScroll={handleScroll}
                scrollEventThrottle={16}
              >
                {cart.map((item) => (
                  <View key={item.product.id} style={[styles.cartItemCard, SHADOWS.glowCard]}>
                    <Image source={{ uri: item.product.iconUrl }} style={styles.cartItemIcon} />
                    <View style={styles.cartItemInfo}>
                      <Text style={styles.cartItemName} numberOfLines={1}>{item.product.name}</Text>
                      <Text style={styles.cartItemPrice}>{item.product.price.toLocaleString('vi-VN')}đ / cái</Text>
                    </View>
                    <View style={styles.cartItemActions}>
                      <View style={styles.qtyBox}>
                        <TouchableOpacity style={styles.qtyBtn} onPress={() => updateCartQty(item.product.id, -1)}>
                          <Text style={styles.qtyBtnText}>-</Text>
                        </TouchableOpacity>
                        <Text style={styles.qtyValue}>{item.quantity}</Text>
                        <TouchableOpacity style={styles.qtyBtn} onPress={() => updateCartQty(item.product.id, 1)}>
                          <Text style={styles.qtyBtnText}>+</Text>
                        </TouchableOpacity>
                      </View>
                      <TouchableOpacity style={styles.deleteBtn} onPress={() => removeFromCart(item.product.id)}>
                        <Trash2 size={16} color={COLORS.danger} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}

                {/* COUPON SECTION */}
                <View style={[styles.summaryCard, SHADOWS.glowCard]}>
                  <Text style={styles.summaryTitle}>Khuyến Mãi / Mã Giảm Giá</Text>
                  <View style={styles.couponRow}>
                    <TextInput 
                      style={styles.couponInput}
                      placeholder="Mã coupon (VD: GIAM30)"
                      placeholderTextColor={COLORS.textMuted}
                      value={couponCode}
                      onChangeText={setCouponCode}
                      autoCapitalize="characters"
                    />
                    <TouchableOpacity style={styles.couponApplyBtn} onPress={handleApplyCoupon} disabled={applyingCoupon}>
                      {applyingCoupon ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Text style={styles.couponApplyText}>Áp Dụng</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                  {appliedCoupon !== '' && (
                    <View style={styles.appliedCouponRow}>
                      <Tag size={14} color={COLORS.success} />
                      <Text style={styles.appliedCouponText}>Đã áp dụng mã: {appliedCoupon} (Giảm {couponDiscount}%)</Text>
                    </View>
                  )}
                </View>

                {/* ORDER BILL SUMMARY */}
                <View style={[styles.billCard, SHADOWS.glowCard]}>
                  <Text style={styles.summaryTitle}>Chi Tiết Thanh Toán</Text>
                  <View style={styles.billRow}>
                    <Text style={styles.billLabel}>Tạm tính</Text>
                    <Text style={styles.billValue}>{getCartSubtotal().toLocaleString('vi-VN')}đ</Text>
                  </View>
                  {couponDiscount > 0 && (
                    <View style={styles.billRow}>
                      <Text style={styles.billLabel}>Giảm giá ({couponDiscount}%)</Text>
                      <Text style={[styles.billValue, { color: COLORS.danger }]}>-{Math.round(getCartSubtotal() * couponDiscount / 100).toLocaleString('vi-VN')}đ</Text>
                    </View>
                  )}
                  <View style={styles.billDivider} />
                  <View style={styles.billRow}>
                    <Text style={styles.billTotalLabel}>Tổng số tiền cần trả</Text>
                    <Text style={styles.billTotalValue}>{getCartTotal().toLocaleString('vi-VN')}đ</Text>
                  </View>

                  <TouchableOpacity 
                    style={styles.checkoutBtn}
                    onPress={handleCheckout}
                    disabled={isCheckingOut}
                  >
                    {isCheckingOut ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Zap size={16} color="#FFFFFF" fill="#FFFFFF" />
                        <Text style={styles.checkoutText}>Thanh Toán Ngay ({getCartTotal().toLocaleString('vi-VN')}đ)</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        )}

        {/* ORDERS HISTORY TAB */}
        {activeTab === 'ORDERS' && (
          <View style={{ flex: 1 }}>
            {loadingOrders ? (
              <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
              </View>
            ) : orders.length === 0 ? (
              <View style={styles.centerContainer}>
                <ClipboardList size={48} color={COLORS.textMuted} />
                <Text style={styles.emptyText}>Sếp chưa có đơn hàng nào.</Text>
              </View>
            ) : (
              <FlatList 
                data={orders}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.orderList}
                showsVerticalScrollIndicator={false}
                onScroll={handleScroll}
                scrollEventThrottle={16}
                renderItem={({ item }) => (
                  <View style={[styles.orderCard, SHADOWS.glowCard]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                      <View style={styles.orderIconWrapper}>
                        <Image source={{ uri: getProductIcon(item.productName, "") }} style={styles.orderIcon} resizeMode="contain" />
                      </View>
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <View style={styles.orderHeader}>
                          <Text style={styles.orderId} numberOfLines={1}>Mã ĐH: {item.id}</Text>
                          <View style={styles.statusBadge}>
                            <Check size={12} color={COLORS.success} />
                            <Text style={styles.statusText}>{item.status}</Text>
                          </View>
                        </View>
                        <Text style={styles.orderProdName}>{item.productName}</Text>
                      </View>
                    </View>
                    <View style={styles.orderMeta}>
                      <Text style={styles.orderPrice}>{(item.price || 0).toLocaleString('vi-VN')}đ  x  {item.quantity} cái</Text>
                      <Text style={styles.orderDate}>
                        {formatOrderDate(item.date)}
                      </Text>
                    </View>

                    {item.credentials && item.credentials.length > 0 && (
                      <View style={styles.credentialsContainer}>
                        <View style={styles.credHeader}>
                          <ShieldCheck size={14} color={COLORS.primary} />
                          <Text style={styles.credTitle}>Tài Khoản / Bàn Giao:</Text>
                        </View>
                        {item.credentials.map((cred, idx) => (
                          <View key={idx} style={styles.credRow}>
                            <Text style={styles.credText} numberOfLines={2}>{cred}</Text>
                            <TouchableOpacity style={styles.copyBtn} onPress={() => handleCopy(cred)}>
                              <Copy size={13} color="#FFFFFF" />
                              <Text style={styles.copyBtnText}>Sao chép</Text>
                            </TouchableOpacity>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                )}
              />
            )}
          </View>
        )}

        {/* RECHARGE TAB */}
        {activeTab === 'RECHARGE' && (
          <ScrollView 
            contentContainerStyle={styles.rechargeContent} 
            showsVerticalScrollIndicator={false}
            onScroll={handleScroll}
            scrollEventThrottle={16}
          >
            {auth.currentUser ? (
              <View style={[styles.rechargeCard, SHADOWS.glowCard]}>
                <View style={styles.rechargeHeader}>
                  <Building2 size={24} color={COLORS.primary} />
                  <Text style={styles.rechargeTitle}>Nạp Tiền Tự Động (VietQR)</Text>
                </View>
                
                <Text style={styles.rechargeDesc}>
                  Quét mã QR dưới đây để chuyển khoản nhanh. Hệ thống sẽ tự động cộng tiền vào tài khoản MMO của sếp sau 1-3 phút.
                </Text>

                {/* HIỂN THỊ MÃ QR CHUYỂN KHOẢN */}
                <View style={{ 
                  alignSelf: 'center', 
                  alignItems: 'center', 
                  padding: 12, 
                  backgroundColor: '#FFFFFF', 
                  borderRadius: 16, 
                  marginBottom: 20, 
                  borderWidth: 1, 
                  borderColor: COLORS.border,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.1,
                  shadowRadius: 10,
                  elevation: 4
                }}>
                  <Image source={{ uri: getRechargeQrUrl() }} style={{ width: 200, height: 200, borderRadius: 8 }} />
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#8E8E93', marginTop: 8 }}>
                    QUÉT MÃ ĐỂ THANH TOÁN
                  </Text>
                </View>

                {/* Ô NHẬP SỐ TIỀN TÙY Ý */}
                <View style={{ marginBottom: 15 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 8 }}>
                    Nhập số tiền sếp muốn nạp (đ):
                  </Text>
                  <TextInput
                    style={{
                      backgroundColor: isLight ? '#FFFFFF' : 'rgba(255,255,255,0.02)',
                      borderWidth: 0.8,
                      borderColor: COLORS.border,
                      borderRadius: 10,
                      height: 48,
                      paddingHorizontal: 16,
                      color: COLORS.text,
                      fontSize: 16,
                      fontWeight: '700',
                    }}
                    placeholder="Ví dụ: 11000"
                    placeholderTextColor={COLORS.textMuted}
                    value={rechargeInput}
                    onChangeText={(val) => {
                      const clean = val.replace(/[^0-9]/g, '');
                      setRechargeInput(clean);
                    }}
                    keyboardType="numeric"
                  />
                </View>

                <Text style={{ fontSize: 12, fontWeight: '700', color: COLORS.textMuted, marginBottom: 8 }}>
                  Chọn nhanh gói gợi ý:
                </Text>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingVertical: 5, marginBottom: 20 }}>
                  {[10000, 20000, 50000, 100000, 200000, 500000].map((amount) => {
                    const isSelected = rechargeInput === amount.toString();
                    return (
                      <TouchableOpacity
                        key={amount}
                        style={[styles.rechargePackBtn, isSelected && styles.rechargePackBtnActive]}
                        onPress={() => {
                          setRechargeInput(amount.toString());
                        }}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.rechargePackText, isSelected && styles.rechargePackTextActive]}>
                          {amount.toLocaleString('vi-VN')}đ
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                {/* THÈ CHUYỂN KHOẢN VIETQR (VIRTUAL BANK CARD) */}
                <LinearGradient 
                  colors={['#1E293B', '#0F172A']} 
                  style={styles.virtualCard}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <View style={styles.cardHeader}>
                    <View>
                      <Text style={styles.cardBankLabel}>NGÂN HÀNG THỤ HƯỞNG</Text>
                      <Text style={styles.cardBankValue}>{BANK_ID}</Text>
                    </View>
                    <View style={styles.cardChipWrapper}>
                      <LinearGradient colors={['#FFE259', '#FFA751']} style={styles.cardChip} />
                    </View>
                  </View>

                  <View style={styles.cardBody}>
                    <Text style={styles.cardOwnerLabel}>CHỦ TÀI KHOẢN</Text>
                    <Text style={styles.cardOwnerValue}>{ACCOUNT_NAME}</Text>

                    <Text style={styles.cardNoLabel}>SỐ TÀI KHOẢN</Text>
                    <View style={styles.cardNoRow}>
                      <Text style={styles.cardNoValue}>{ACCOUNT_NO}</Text>
                      <TouchableOpacity style={styles.cardCopyBtn} onPress={() => handleCopy(ACCOUNT_NO)}>
                        <Copy size={14} color="#FFE259" />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.cardDivider} />

                  <View style={styles.cardFooter}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cardInfoLabel}>NỘI DUNG CHUYỂN KHOẢN</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                        <Text style={styles.cardInfoValueHighlight}>{rechargeOrderId}</Text>
                        <TouchableOpacity style={styles.cardCopyBtn} onPress={() => handleCopy(rechargeOrderId)}>
                          <Copy size={12} color="#FFE259" />
                        </TouchableOpacity>
                      </View>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.cardInfoLabel}>SỐ TIỀN CẦN CHUYỂN</Text>
                      <Text style={styles.cardInfoValue}>{(parseInt(rechargeInput, 10) || 10000).toLocaleString('vi-VN')}đ</Text>
                    </View>
                  </View>
                </LinearGradient>

                <View style={styles.warningBox}>
                  <AlertTriangle size={16} color={COLORS.warning} />
                  <Text style={styles.warningText}>
                    ⚠️ Lưu ý quan trọng: Số tiền nạp tối thiểu là 10.000đ để tránh lỗi bank. Số tiền nạp thấp hơn 10.000đ sẽ không được hoàn trả và không được xử lý tự động!
                  </Text>
                </View>

                <TouchableOpacity 
                  style={[styles.checkoutBtn, { marginTop: 20 }]} 
                  onPress={handleCheckRecharge} 
                  disabled={isCheckingRecharge}
                >
                  {isCheckingRecharge ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.checkoutText}>TÔI ĐÃ CHUYỂN KHOẢN</Text>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              <View style={[styles.rechargeCard, SHADOWS.glowCard]}>
                <Text style={styles.emptyText}>Vui lòng đăng nhập để nạp tiền.</Text>
              </View>
            )}

            {/* LỊCH SỬ GIAO DỊCH */}
            <View style={[styles.rechargeCard, { marginTop: 16 }, SHADOWS.glowCard]}>
              <View style={styles.rechargeHeader}>
                <ClipboardList size={20} color={COLORS.primary} />
                <Text style={styles.rechargeTitle}>Lịch Sử Nạp Tiền</Text>
              </View>

              {loadingTransactions ? (
                <ActivityIndicator size="small" color={COLORS.primary} style={{ marginVertical: 20 }} />
              ) : transactions.filter(tx => tx.status === 'CLAIMED').length === 0 ? (
                <Text style={[styles.emptyText, { marginVertical: 15 }]}>Sếp chưa có hóa đơn nạp tiền thành công nào.</Text>
              ) : (
                <View style={{ gap: 10, marginTop: 10 }}>
                  {transactions.filter(tx => tx.status === 'CLAIMED').map((tx) => (
                    <View key={tx.orderId} style={styles.txRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.txId}>{tx.orderId}</Text>
                        <Text style={styles.txTime}>
                          {tx.time ? new Date(tx.time).toLocaleString('vi-VN') : ''}
                        </Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={[styles.txAmount, { color: COLORS.success }]}>
                          +{tx.amount.toLocaleString('vi-VN')}đ
                        </Text>
                        <Text style={[styles.txStatus, { color: COLORS.success }]}>
                          Thành công
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </ScrollView>
        )}
      </Animated.View>
    </TabTransition>

      {/* DETAIL MODAL */}
      <Modal visible={selectedProduct !== null} transparent animationType="slide" statusBarTranslucent>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setSelectedProduct(null)} />
          
          {selectedProduct && (
            <View style={styles.modalBox}>
              <View style={styles.modalHandle} />
              
              <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setSelectedProduct(null)}>
                <X size={20} color={COLORS.text} />
              </TouchableOpacity>

              <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
                <View style={styles.modalHeaderBanner}>
                  <Image source={{ uri: selectedProduct.iconUrl }} style={styles.modalBannerBlur} blurRadius={15} />
                  <View style={styles.modalBannerOverlay} />
                  <View style={styles.modalHeaderIconContainer}>
                    <Image source={{ uri: selectedProduct.iconUrl }} style={styles.modalHeaderIcon} resizeMode="contain" />
                  </View>
                </View>
                
                <View style={styles.modalContent}>
                  <Text style={styles.modalName}>{selectedProduct.name}</Text>
                  
                  <View style={styles.modalPriceRow}>
                    <View>
                      <Text style={styles.modalPriceLabel}>GIÁ BÁN KHUYẾN MÃI</Text>
                      <Text style={styles.modalPrice}>{selectedProduct.price.toLocaleString('vi-VN')}đ</Text>
                    </View>
                    {selectedProduct.originalPrice && selectedProduct.originalPrice > selectedProduct.price ? (
                      <View style={{ marginLeft: 15, justifyContent: 'flex-end', paddingBottom: 2 }}>
                        <Text style={styles.modalOriginalPriceText}>{selectedProduct.originalPrice.toLocaleString('vi-VN')}đ</Text>
                        <Text style={styles.modalDiscountText}>Tiết kiệm -{Math.round(((selectedProduct.originalPrice - selectedProduct.price) / selectedProduct.originalPrice) * 100)}%</Text>
                      </View>
                    ) : null}
                  </View>

                  <View style={styles.modalInfoRow}>
                    <View style={styles.modalInfoBadge}>
                      <Text style={styles.modalInfoBadgeTitle}>Danh mục</Text>
                      <Text style={styles.modalInfoBadgeValue}>{selectedProduct.category}</Text>
                    </View>
                    <View style={styles.modalInfoBadge}>
                      <Text style={styles.modalInfoBadgeTitle}>Kho hàng</Text>
                      <Text style={[styles.modalInfoBadgeValue, { color: selectedProduct.stock > 0 ? COLORS.success : COLORS.danger }]}>
                        {selectedProduct.stock === 999 ? 'Sẵn hàng' : (selectedProduct.stock > 0 ? `${selectedProduct.stock} cái` : 'Hết hàng')}
                      </Text>
                    </View>
                    <View style={styles.modalInfoBadge}>
                      <Text style={styles.modalInfoBadgeTitle}>Giao hàng</Text>
                      <Text style={[styles.modalInfoBadgeValue, { color: COLORS.primary }]}>
                        {selectedProduct.deliveryType === 'Instant' ? 'Tự động' : 'Trực tiếp'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.modalDescContainer}>
                    <Text style={styles.modalSectionTitle}>MÔ TẢ CHI TIẾT SẢN PHẨM</Text>
                    <Text style={styles.modalDesc}>{selectedProduct.description}</Text>
                  </View>
                </View>
              </ScrollView>

              {/* ACTION FOOTER */}
              <View style={styles.modalFooter}>
                {selectedProduct.stock > 0 ? (
                  <View style={styles.modalActionRow}>
                    <View style={styles.modalQtySelector}>
                      <TouchableOpacity 
                        style={styles.modalQtyBtn} 
                        onPress={() => setDetailQuantity(Math.max(1, detailQuantity - 1))}
                      >
                        <Text style={styles.modalQtyText}>-</Text>
                      </TouchableOpacity>
                      <Text style={styles.modalQtyVal}>{detailQuantity}</Text>
                      <TouchableOpacity 
                        style={styles.modalQtyBtn} 
                        onPress={() => setDetailQuantity(Math.min(selectedProduct.stock, detailQuantity + 1))}
                      >
                        <Text style={styles.modalQtyText}>+</Text>
                      </TouchableOpacity>
                    </View>

                    <TouchableOpacity 
                      style={[styles.modalAddCartBtn, SHADOWS.glowBlue]}
                      onPress={() => {
                        addToCart(selectedProduct, detailQuantity);
                        setSelectedProduct(null);
                      }}
                    >
                      <ShoppingCart size={16} color="#FFFFFF" />
                      <Text style={styles.modalAddCartText}>Thêm vào giỏ</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.modalSoldOutBox}>
                    <Text style={styles.modalSoldOutText}>Sản Phẩm Đã Hết Hàng</Text>
                  </View>
                )}
              </View>
            </View>
          )}
        </View>
      </Modal>

      {/* CATEGORY BOTTOM SHEET MODAL */}
      <Modal visible={isCategoryModalVisible} transparent animationType="slide" statusBarTranslucent>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setIsCategoryModalVisible(false)} />
          
          <View style={[styles.modalBox, { height: height * 0.7 }]}>
            <View style={styles.modalHandle} />
            
            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setIsCategoryModalVisible(false)}>
              <X size={20} color={COLORS.text} />
            </TouchableOpacity>

            <View style={{ padding: 20, flex: 1 }}>
              <Text style={{ fontSize: 18, fontWeight: '800', color: COLORS.text, marginBottom: 15 }}>
                Chọn Danh Mục Lọc
              </Text>

              {/* SEARCH INPUT FOR CATEGORIES */}
              <View style={[styles.searchBox, { marginBottom: 15, width: '100%' }]}>
                <Search size={16} color={COLORS.textMuted} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Tìm kiếm danh mục..."
                  placeholderTextColor={COLORS.textMuted}
                  value={categorySearchQuery}
                  onChangeText={setCategorySearchQuery}
                  autoCorrect={false}
                />
                {categorySearchQuery !== '' && (
                  <TouchableOpacity onPress={() => setCategorySearchQuery('')}>
                    <X size={16} color={COLORS.textMuted} />
                  </TouchableOpacity>
                )}
              </View>

              {/* LIST OF CATEGORIES */}
              <FlatList
                data={categories.filter(cat => 
                  cat.toLowerCase().includes(categorySearchQuery.toLowerCase())
                )}
                keyExtractor={(item) => item}
                showsVerticalScrollIndicator={false}
                numColumns={2}
                columnWrapperStyle={{ gap: 10, marginBottom: 10 }}
                renderItem={({ item }) => {
                  const isSelected = selectedCategory === item;
                  return (
                    <TouchableOpacity
                      style={[
                        styles.catModalBtn,
                        isSelected && styles.catModalBtnActive
                      ]}
                      onPress={() => {
                        setSelectedCategory(item);
                        setIsCategoryModalVisible(false);
                        setCategorySearchQuery('');
                      }}
                      activeOpacity={0.7}
                    >
                      <Text 
                        style={[
                          styles.catModalText,
                          isSelected && styles.catModalTextActive
                        ]}
                        numberOfLines={1}
                      >
                        {item}
                      </Text>
                    </TouchableOpacity>
                  );
                }}
                ListEmptyComponent={
                  <View style={{ alignItems: 'center', marginTop: 40 }}>
                    <AlertTriangle size={32} color={COLORS.textMuted} />
                    <Text style={{ color: COLORS.textMuted, fontSize: 13, fontWeight: '600', marginTop: 8 }}>
                      Không tìm thấy danh mục nào.
                    </Text>
                  </View>
                }
              />
            </View>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const getStyles = (theme: typeof COLORS) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  header: { paddingTop: 60, paddingHorizontal: 16, backgroundColor: theme.surfaceSolid, borderBottomWidth: 0.8, borderBottomColor: theme.border },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 15 },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: theme.text, letterSpacing: -0.5 },
  balanceContainer: { backgroundColor: 'rgba(48,209,88,0.12)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 0.5, borderColor: 'rgba(48,209,88,0.2)' },
  balanceText: { color: theme.success, fontSize: 13, fontWeight: '800' },
  
  tabContainer: { flexDirection: 'row', position: 'relative', marginBottom: 10, backgroundColor: theme.background === '#F4F4F6' ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 3 },
  activeTabPill: { position: 'absolute', top: 3, bottom: 3, left: 3, width: ((width - 32) / 4) - 2, backgroundColor: theme.primary, borderRadius: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 3, elevation: 2 },
  tabBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 },
  tabBtnText: { fontSize: 12, fontWeight: '700', color: theme.textMuted },
  tabBtnTextActive: { color: '#FFFFFF' },
  cartCountDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: theme.danger, position: 'absolute', top: -2, right: -2 },

  // SHOP
  searchSection: { paddingHorizontal: 16, marginTop: 15, marginBottom: 8 },
  searchRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginTop: 15, marginBottom: 8, gap: 10 },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.surfaceSolid, borderWidth: 0.8, borderColor: theme.border, borderRadius: 12, height: 42, paddingHorizontal: 12, gap: 10 },
  searchInput: { flex: 1, color: theme.text, fontSize: 14, fontWeight: '600' },
  filterBtn: { width: 42, height: 42, borderRadius: 12, backgroundColor: theme.surfaceSolid, borderWidth: 0.8, borderColor: theme.border, justifyContent: 'center', alignItems: 'center' },
  
  categoryContainer: { borderBottomWidth: 0.8, borderBottomColor: theme.border, paddingBottom: 12, marginBottom: 5, marginTop: 10 },
  catScroll: { paddingHorizontal: 16, gap: 10, alignItems: 'center' },
  catBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 18, backgroundColor: theme.background === '#F4F4F6' ? '#FFFFFF' : 'rgba(255,255,255,0.03)', borderWidth: 0.8, borderColor: theme.border },
  catBtnActive: { backgroundColor: theme.primary, borderColor: 'transparent' },
  catText: { color: theme.textMuted, fontSize: 13, fontWeight: '600' },
  catTextActive: { color: '#FFFFFF', fontWeight: '700' },
  
  catModalBtn: { flex: 1, paddingHorizontal: 12, paddingVertical: 12, borderRadius: 12, backgroundColor: theme.background === '#F4F4F6' ? '#FFFFFF' : 'rgba(255,255,255,0.03)', borderWidth: 0.8, borderColor: theme.border, alignItems: 'center', justifyContent: 'center' },
  catModalBtnActive: { backgroundColor: theme.primary, borderColor: 'transparent' },
  catModalText: { color: theme.text, fontSize: 13, fontWeight: '700', textAlign: 'center' },
  catModalTextActive: { color: '#FFFFFF' },

  productList: { paddingHorizontal: 16, paddingBottom: 140 },
  productListCard: { flexDirection: 'row', backgroundColor: theme.surfaceSolid, borderRadius: 16, borderWidth: 0.8, borderColor: theme.border, padding: 12, marginBottom: 10, alignItems: 'center' },
  productIconWrapper: { width: 68, height: 68, backgroundColor: '#FFFFFF', borderRadius: 14, overflow: 'hidden', justifyContent: 'center', alignItems: 'center', position: 'relative', borderWidth: 0.5, borderColor: theme.border },
  productIcon: { width: 48, height: 48 },
  deliveryBadgeMini: { backgroundColor: theme.background === '#F4F4F6' ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.04)', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6 },
  deliveryBadgeTextMini: { fontSize: 10, fontWeight: '700', color: theme.textMuted },
  soldOutOverlayMini: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', alignItems: 'center', zIndex: 10 },
  soldOutTextMini: { color: '#FFFFFF', fontSize: 9, fontWeight: '900' },
  productBody: { flex: 1, marginLeft: 12, paddingRight: 4 },
  productTitle: { color: theme.text, fontSize: 14, fontWeight: '700', lineHeight: 19 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  originalPriceText: { fontSize: 11, color: theme.textMuted, textDecorationLine: 'line-through' },
  discountBadge: { backgroundColor: 'rgba(255,69,58,0.12)', paddingHorizontal: 4, paddingVertical: 1, borderRadius: 4 },
  discountBadgeText: { color: theme.danger, fontSize: 9, fontWeight: '700' },
  productMetaBulletRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  productMetaBulletText: { fontSize: 11, color: theme.textMuted, fontWeight: '600' },
  productRight: { alignItems: 'flex-end', justifyContent: 'center', minWidth: 64 },
  productPriceText: { color: theme.danger, fontSize: 14.5, fontWeight: '800' },
  quickBuyBtn: { backgroundColor: theme.primary, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, minWidth: 64, alignItems: 'center', justifyContent: 'center' },
  quickBuyBtnDisabled: { backgroundColor: theme.border },
  quickBuyBtnText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' },
  badgeInstant: { backgroundColor: 'rgba(48,209,88,0.12)' },
  badgeManual: { backgroundColor: 'rgba(255,214,10,0.12)' },

  // VIRTUAL CREDIT CARD STYLES
  virtualCard: {
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 15,
    elevation: 8,
    borderWidth: 0.8,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 20,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  cardBankLabel: {
    color: '#8E8E93',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1,
  },
  cardBankValue: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    marginTop: 2,
    letterSpacing: -0.5,
  },
  cardChipWrapper: {
    width: 44,
    height: 32,
    borderRadius: 6,
    overflow: 'hidden',
  },
  cardChip: {
    flex: 1,
  },
  cardBody: {
    marginBottom: 16,
  },
  cardOwnerLabel: {
    color: '#8E8E93',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1,
  },
  cardOwnerValue: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    marginTop: 2,
  },
  cardNoLabel: {
    color: '#8E8E93',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1,
    marginTop: 10,
  },
  cardNoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 10,
  },
  cardNoValue: {
    color: '#FFE259',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 1.5,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  cardCopyBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  cardDivider: {
    height: 0.5,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    marginVertical: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardInfoLabel: {
    color: '#8E8E93',
    fontSize: 8.5,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  cardInfoValueHighlight: {
    color: '#30D158',
    fontSize: 15,
    fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  cardInfoValue: {
    color: '#FF453A',
    fontSize: 16,
    fontWeight: '800',
    marginTop: 2,
  },

  // PREMIUM MODAL STYLES
  modalHeaderBanner: {
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  modalBannerBlur: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.25,
  },
  modalBannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalHeaderIconContainer: {
    width: 90,
    height: 90,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 6,
    borderWidth: 0.5,
    borderColor: theme.border,
  },
  modalHeaderIcon: {
    width: 64,
    height: 64,
  },
  modalPriceRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 20,
  },
  modalPriceLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: theme.textMuted,
    letterSpacing: 0.8,
  },
  modalOriginalPriceText: {
    fontSize: 14,
    color: theme.textMuted,
    textDecorationLine: 'line-through',
    fontWeight: '600',
  },
  modalDiscountText: {
    fontSize: 11,
    color: theme.success,
    fontWeight: '700',
    marginTop: 2,
  },
  modalInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: theme.background === '#F4F4F6' ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.02)',
    borderRadius: 14,
    padding: 12,
    marginBottom: 20,
    borderWidth: 0.5,
    borderColor: theme.border,
  },
  modalInfoBadge: {
    flex: 1,
    alignItems: 'center',
  },
  modalInfoBadgeTitle: {
    fontSize: 9,
    color: theme.textMuted,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  modalInfoBadgeValue: {
    fontSize: 12,
    color: theme.text,
    fontWeight: '800',
  },
  modalDescContainer: {
    backgroundColor: theme.surfaceSolid,
    borderRadius: 16,
    borderWidth: 0.8,
    borderColor: theme.border,
    padding: 16,
    marginBottom: 30,
  },

  // CART
  cartContent: { padding: 16, paddingBottom: 140 },
  cartItemCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.surfaceSolid, borderRadius: 14, borderWidth: 0.8, borderColor: theme.border, padding: 12, marginBottom: 10 },
  cartItemIcon: { width: 44, height: 44, borderRadius: 9, backgroundColor: theme.surfaceSolid, marginRight: 12 },
  cartItemInfo: { flex: 1 },
  cartItemName: { color: theme.text, fontSize: 14, fontWeight: '700' },
  cartItemPrice: { color: theme.danger, fontSize: 12, fontWeight: '800', marginTop: 3 },
  cartItemActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  qtyBox: { flexDirection: 'row', alignItems: 'center', borderWidth: 0.8, borderColor: theme.border, borderRadius: 8, height: 28, overflow: 'hidden' },
  qtyBtn: { width: 24, height: '100%', backgroundColor: theme.background === '#F4F4F6' ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.03)', justifyContent: 'center', alignItems: 'center' },
  qtyBtnText: { color: theme.text, fontSize: 14, fontWeight: '800' },
  qtyValue: { width: 26, textAlign: 'center', fontSize: 12, fontWeight: '800', color: theme.text },
  deleteBtn: { padding: 4 },

  summaryCard: { backgroundColor: theme.surfaceSolid, borderRadius: SIZES.radiusCard, borderWidth: 0.8, borderColor: theme.border, padding: 16, marginBottom: 10 },
  summaryTitle: { color: theme.text, fontSize: 14, fontWeight: '800', marginBottom: 12 },
  couponRow: { flexDirection: 'row', gap: 8 },
  couponInput: { flex: 1, backgroundColor: theme.background === '#F4F4F6' ? '#FFFFFF' : 'rgba(255,255,255,0.02)', borderWidth: 0.8, borderColor: theme.border, borderRadius: 9, height: 38, paddingHorizontal: 12, color: theme.text, fontSize: 13, fontWeight: '600' },
  couponApplyBtn: { height: 38, width: 80, backgroundColor: theme.primary, borderRadius: 9, justifyContent: 'center', alignItems: 'center' },
  couponApplyText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  appliedCouponRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  appliedCouponText: { color: theme.success, fontSize: 12, fontWeight: '700' },

  billCard: { backgroundColor: theme.surfaceSolid, borderRadius: SIZES.radiusCard, borderWidth: 0.8, borderColor: theme.border, padding: 16 },
  billRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  billLabel: { color: theme.textMuted, fontSize: 13, fontWeight: '600' },
  billValue: { color: theme.text, fontSize: 13, fontWeight: '700' },
  billDivider: { height: 0.5, backgroundColor: theme.border, marginVertical: 10 },
  billTotalLabel: { color: theme.text, fontSize: 14, fontWeight: '800' },
  billTotalValue: { color: theme.danger, fontSize: 16, fontWeight: '900' },
  checkoutBtn: { flexDirection: 'row', height: 44, backgroundColor: theme.primary, borderRadius: SIZES.radiusButton, marginTop: 16, justifyContent: 'center', alignItems: 'center', gap: 8 },
  checkoutText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },

  // ORDERS
  orderList: { padding: 16, paddingBottom: 140 },
  orderCard: { backgroundColor: theme.surfaceSolid, borderRadius: SIZES.radiusCard, borderWidth: 0.8, borderColor: theme.border, padding: 14, marginBottom: 12 },
  orderIconWrapper: { width: 44, height: 44, backgroundColor: '#FFFFFF', borderRadius: 10, justifyContent: 'center', alignItems: 'center', borderWidth: 0.5, borderColor: theme.border },
  orderIcon: { width: 32, height: 32 },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  orderId: { fontSize: 10, color: theme.textMuted, fontWeight: '700', flex: 1 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(48,209,88,0.12)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusText: { color: theme.success, fontSize: 10, fontWeight: '800' },
  orderProdName: { color: theme.text, fontSize: 14, fontWeight: '800', marginBottom: 4 },
  orderMeta: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  orderPrice: { color: theme.danger, fontSize: 12, fontWeight: '800' },
  orderDate: { color: theme.textMuted, fontSize: 11, fontWeight: '600' },
  credentialsContainer: { backgroundColor: theme.background === '#F4F4F6' ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.02)', padding: 10, borderRadius: 10, borderWidth: 0.5, borderColor: theme.border },
  credHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  credTitle: { color: theme.text, fontSize: 12, fontWeight: '700' },
  credRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: theme.surfaceSolid, padding: 8, borderRadius: 8, marginBottom: 6, borderWidth: 0.5, borderColor: theme.border },
  credText: { color: theme.textSecondary, fontSize: 11, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', flex: 1, paddingRight: 8 },
  copyBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: theme.primary, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 6 },
  copyBtnText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800' },

  // RECHARGE
  rechargeContent: { padding: 16, paddingBottom: 140 },
  rechargeCard: { backgroundColor: theme.surfaceSolid, borderRadius: SIZES.radiusCard, borderWidth: 0.8, borderColor: theme.border, padding: 16 },
  rechargeHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  rechargeTitle: { color: theme.text, fontSize: 16, fontWeight: '800' },
  rechargeDesc: { color: theme.textSecondary, fontSize: 13, lineHeight: 20, marginBottom: 16 },
  rechargeDetailBox: { backgroundColor: theme.background === '#F4F4F6' ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.02)', padding: 14, borderRadius: 12, gap: 10, borderWidth: 0.5, borderColor: theme.border },
  rechargeRow: { flexDirection: 'row', alignItems: 'center' },
  rechargeLabel: { color: theme.textMuted, fontSize: 13, fontWeight: '600', width: 100 },
  rechargeValue: { color: theme.text, fontSize: 13, fontWeight: '700', flex: 1 },
  rechargeCopy: { padding: 4, marginLeft: 8 },
  warningBox: { flexDirection: 'row', gap: 8, marginTop: 16, backgroundColor: 'rgba(255,214,10,0.1)', padding: 10, borderRadius: 8 },
  warningText: { color: theme.warning, fontSize: 11, fontWeight: '600', flex: 1, lineHeight: 16 },

  // GENERAL
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30, marginTop: 50, gap: 12 },
  emptyText: { color: theme.textMuted, fontSize: 14, fontWeight: '600', textAlign: 'center' },
  shopNowBtn: { backgroundColor: theme.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, marginTop: 8 },
  shopNowText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },

  // MODAL
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox: { width: '100%', height: height * 0.75, backgroundColor: theme.surfaceSolid, borderTopLeftRadius: 20, borderTopRightRadius: 20, overflow: 'hidden' },
  modalHandle: { width: 36, height: 4, backgroundColor: theme.border, borderRadius: 2, alignSelf: 'center', marginTop: 10 },
  modalCloseBtn: { position: 'absolute', top: 12, right: 16, width: 30, height: 30, borderRadius: 15, backgroundColor: theme.background === '#F4F4F6' ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.04)', justifyContent: 'center', alignItems: 'center', zIndex: 10 },
  modalScroll: { flex: 1 },
  modalHeroImage: { width: '100%', height: 160, backgroundColor: theme.background === '#F4F4F6' ? 'rgba(0,0,0,0.01)' : 'rgba(255,255,255,0.01)', alignSelf: 'center', marginTop: 25 },
  modalContent: { padding: 20 },
  modalName: { fontSize: 18, fontWeight: '800', color: theme.text, marginBottom: 8, letterSpacing: -0.3 },
  modalMetaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalPrice: { fontSize: 24, fontWeight: '900', color: theme.danger },
  modalStockBadge: { backgroundColor: theme.background === '#F4F4F6' ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.04)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  modalStockText: { color: theme.textMuted, fontSize: 11, fontWeight: '700' },
  modalDivider: { height: 0.5, backgroundColor: theme.border, marginVertical: 15 },
  modalSectionTitle: { fontSize: 14, fontWeight: '800', color: theme.text, marginBottom: 8 },
  modalDesc: { fontSize: 13.5, color: theme.textSecondary, lineHeight: 22 },
  modalFooter: { padding: 16, borderTopWidth: 0.5, borderTopColor: theme.border, backgroundColor: theme.surfaceSolid },
  modalActionRow: { flexDirection: 'row', gap: 12 },
  modalQtySelector: { flexDirection: 'row', alignItems: 'center', borderWidth: 0.8, borderColor: theme.border, borderRadius: 10, height: 44, overflow: 'hidden' },
  modalQtyBtn: { width: 40, height: '100%', backgroundColor: theme.background === '#F4F4F6' ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.03)', justifyContent: 'center', alignItems: 'center' },
  modalQtyText: { color: theme.text, fontSize: 18, fontWeight: '800' },
  modalQtyVal: { width: 36, textAlign: 'center', fontSize: 14, fontWeight: '800', color: theme.text },
  modalAddCartBtn: { flex: 1, height: 44, backgroundColor: theme.primary, borderRadius: 10, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  modalAddCartText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  modalSoldOutBox: { height: 44, backgroundColor: theme.border, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  modalSoldOutText: { color: theme.textMuted, fontSize: 13, fontWeight: '800' },


  // COMPACT FILTERS
  compactFilterBar: { paddingHorizontal: 16, marginBottom: 12 },
  compactFilterScroll: { alignItems: 'center', gap: 6, paddingRight: 16 },
  compactFilterLabel: { fontSize: 12, fontWeight: '800', color: theme.textSecondary, marginRight: 4 },
  compactChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: theme.surfaceSolid, borderWidth: 0.8, borderColor: theme.border },
  compactChipActive: { backgroundColor: theme.primary, borderColor: 'transparent' },
  compactChipText: { fontSize: 11, color: theme.textSecondary, fontWeight: '600' },
  compactChipTextActive: { color: '#FFFFFF', fontWeight: '700' },
  verticalDivider: { width: 1, height: 16, backgroundColor: theme.border, marginHorizontal: 8 },

  // RECHARGE FIXED PACKAGES
  rechargePackBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, backgroundColor: theme.background === '#F4F4F6' ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: theme.border, minWidth: 80, alignItems: 'center' },
  rechargePackBtnActive: { backgroundColor: theme.primary, borderColor: 'transparent' },
  rechargePackText: { fontSize: 13, fontWeight: '700', color: theme.textSecondary },
  rechargePackTextActive: { color: '#FFFFFF' },

  // TRANSACTION LOGS
  txRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: theme.border },
  txId: { fontSize: 13, fontWeight: '700', color: theme.text },
  txTime: { fontSize: 11, color: theme.textMuted, marginTop: 4 },
  txAmount: { fontSize: 14, fontWeight: '800' },
  txStatus: { fontSize: 11, fontWeight: '700', marginTop: 4 }
});
