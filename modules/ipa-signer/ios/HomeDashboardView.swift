import SwiftUI
import ExpoModulesCore

// MARK: - Data Models
struct AppItem: Identifiable {
    let id = UUID()
    let name: String
    let category: String
    let iconName: String
    var isVIP: Bool = false
    var color: Color = .blue
}

// MARK: - Liquid Glass Modifier & Styling Extensions
struct LiquidGlassModifier: ViewModifier {
    func body(content: Content) -> some View {
        content
            .background(
                RoundedRectangle(cornerRadius: 24)
                    .fill(Color(white: 1.0, opacity: 0.75))
                    .background(VisualEffectBlur(material: .systemUltraThinMaterial, blendMode: .withinWindow))
            )
            .overlay(
                RoundedRectangle(cornerRadius: 24)
                    .stroke(Color(white: 1.0, opacity: 0.45), lineWidth: 0.8)
            )
            .shadow(color: Color.black.opacity(0.06), radius: 12, x: 0, y: 8)
    }
}

extension View {
    /// Áp dụng hiệu ứng kính mờ Liquid Glass đặc trưng của iOS 26
    func glassEffect() -> some View {
        self.modifier(LiquidGlassModifier())
    }
}

// Visual Effect Blur representation for SwiftUI on iOS
struct VisualEffectBlur: UIViewRepresentable {
    var material: UIBlurEffect.Style
    var blendMode: UIVisualEffectView.Filters = .withinWindow

    func makeUIView(context: Context) -> UIVisualEffectView {
        let view = UIVisualEffectView(effect: UIBlurEffect(style: material))
        return view
    }

    func updateUIView(_ uiView: UIVisualEffectView, context: Context) {}
}

extension UIVisualEffectView {
    enum Filters {
        case withinWindow
    }
}

// Giả lập hành vi thu nhỏ Tab Bar khi cuộn trên iOS 26
enum TabBarMinimizeBehavior {
    case onScrollDown
}

extension View {
    func tabBarMinimizeBehavior(_ behavior: TabBarMinimizeBehavior) -> some View {
        // Tương thích ngược/mô phỏng hành vi cuộn mượt mà của hệ thống
        self
    }
}

// MARK: - Main Container View (TabView iOS 26)
struct MainContainerView: View {
    var body: some View {
        TabView {
            HomeDashboardView()
                .tabItem {
                    Label("Trang chủ", systemImage: "house")
                }
            Text("Trang Ký App")
                .tabItem {
                    Label("Ký App", systemImage: "wrench.and.screwdriver")
                }
            Text("Kho Ứng Dụng")
                .tabItem {
                    Label("Kho App", systemImage: "square.grid.2x2")
                }
            Text("Chợ Việt MMO")
                .tabItem {
                    Label("Chợ MMO", systemImage: "cart")
                }
        }
        .tabBarMinimizeBehavior(.onScrollDown)
    }
}

// MARK: - Home Dashboard View
struct HomeDashboardView: View {
    // Mock Data
    let vipApps = [
        AppItem(name: "Threads Pro", category: "Mạng xã hội", iconName: "at", isVIP: true, color: .purple),
        AppItem(name: "Zalo Plus", category: "Nhắn tin", iconName: "message.fill", isVIP: true, color: .blue),
        AppItem(name: "YouTube Vanced", category: "Giải trí", iconName: "play.rectangle.fill", isVIP: true, color: .red),
        AppItem(name: "Spotify Premium", category: "Âm nhạc", iconName: "music.note", isVIP: true, color: .green)
    ]
    
    let newApps = [
        AppItem(name: "Facebook NoAds", category: "Mạng xã hội", iconName: "f.square.fill", isVIP: false, color: .blue),
        AppItem(name: "CapCut Pro PC", category: "Đồ họa", iconName: "video.fill", isVIP: false, color: .black),
        AppItem(name: "Canva Studio", category: "Thiết kế", iconName: "paintpalette.fill", isVIP: false, color: .cyan),
        AppItem(name: "Tiktok Premium", category: "Giải trí", iconName: "music.mic", isVIP: false, color: .pink)
    ]
    
    var body: some View {
        NavigationView {
            ZStack {
                // Background màu xám nhạt cao cấp chuẩn iOS 26
                Color(red: 244/255, green: 244/255, blue: 246/255)
                    .ignoresSafeArea()
                
                ScrollView(.vertical, showsIndicators: false) {
                    VStack(spacing: 20) {
                        
                        // 1. Header Section (Căn chỉnh chuẩn Toolbar)
                        HStack {
                            VStack(alignment: .leading, spacing: 4) {
                                Text("THỨ SÁU, 12 THÁNG 6")
                                    .font(.system(size: 10, weight: .bold))
                                    .foregroundColor(.secondary)
                                    .tracking(1.5)
                                
                                Text("Khám Phá")
                                    .font(.system(size: 34, weight: .black, design: .rounded))
                                    .foregroundColor(.primary)
                            }
                            
                            Spacer()
                            
                            HStack(spacing: 12) {
                                // Nút tìm kiếm tối giản
                                Button(action: {}) {
                                    Image(systemName: "magnifyingglass")
                                        .font(.system(size: 16, weight: .bold))
                                        .foregroundColor(.primary)
                                        .frame(width: 38, height: 38)
                                        .background(Circle().fill(Color.white))
                                        .shadow(color: Color.black.opacity(0.04), radius: 4, x: 0, y: 2)
                                }
                                
                                // Profile Pill (Mua VIP + Avatar mini)
                                Button(action: {}) {
                                    HStack(spacing: 6) {
                                        Image(systemName: "sparkles")
                                            .font(.system(size: 11))
                                            .foregroundColor(.yellow)
                                        Text("Mua VIP")
                                            .font(.system(size: 12, weight: .bold))
                                            .foregroundColor(.primary)
                                        
                                        // Mini Avatar representation
                                        Image(systemName: "person.crop.circle.fill")
                                            .resizable()
                                            .frame(width: 20, height: 20)
                                            .foregroundColor(.gray)
                                    }
                                    .padding(.horizontal, 10)
                                    .padding(.vertical, 8)
                                    .background(Capsule().fill(Color.white))
                                    .shadow(color: Color.black.opacity(0.04), radius: 4, x: 0, y: 2)
                                }
                            }
                        }
                        .padding(.horizontal, 20)
                        .padding(.top, 10)
                        
                        // 2. Main Action Button: "+ Ký IPA mới" (Capsule Đen)
                        Button(action: {}) {
                            HStack {
                                Spacer()
                                Image(systemName: "plus")
                                    .font(.system(size: 14, weight: .bold))
                                Text("Ký IPA mới")
                                    .font(.system(size: 15, weight: .bold))
                                Spacer()
                            }
                            .foregroundColor(.white)
                            .frame(height: 48)
                            .background(Capsule().fill(Color.black))
                            .padding(.horizontal, 20)
                        }
                        
                        // 3. Grid Categories ("Kho Ứng Dụng", "Chợ Việt MMO")
                        HStack(spacing: 12) {
                            CategoryCard(title: "Kho Ứng Dụng", systemImage: "square.grid.2x2.fill", tintColor: .blue)
                            CategoryCard(title: "Chợ Việt MMO", systemImage: "cart.fill", tintColor: .orange)
                        }
                        .padding(.horizontal, 20)
                        
                        // 4. Ads Banner (Liquid Glass Effect)
                        VStack(alignment: .leading, spacing: 6) {
                            HStack {
                                Image(systemName: "cart.circle.fill")
                                    .foregroundColor(.orange)
                                Text("Chợ Tiện Ích")
                                    .font(.system(size: 11, weight: .bold))
                                    .foregroundColor(.secondary)
                            }
                            Text("Chợ Việt MMO")
                                .font(.system(size: 16, weight: .bold))
                                .foregroundColor(.primary)
                            Text("Mua tài khoản Premium Netflix, Spotify giá rẻ tự động 24/7 siêu mượt mà.")
                                .font(.system(size: 12))
                                .foregroundColor(.secondary)
                                .lineLimit(2)
                        }
                        .padding(16)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .glassEffect()
                        .padding(.horizontal, 20)
                        
                        // 5. Kho VIP Section (Cuộn Ngang)
                        VStack(alignment: .leading, spacing: 12) {
                            HStack {
                                Image(systemName: "sparkles")
                                    .foregroundColor(.yellow)
                                Text("Kho VIP")
                                    .font(.system(size: 20, weight: .bold, design: .rounded))
                                Spacer()
                                Button("Xem thêm") {}
                                    .font(.system(size: 13, weight: .semibold))
                                    .foregroundColor(.blue)
                            }
                            .padding(.horizontal, 20)
                            
                            ScrollView(.horizontal, showsIndicators: false) {
                                HStack(spacing: 12) {
                                    ForEach(vipApps) { app in
                                        VipCardView(app: app)
                                    }
                                }
                                .padding(.horizontal, 20)
                            }
                        }
                        
                        // 6. Mới Cập Nhật Section (Danh Sách Dọc)
                        VStack(alignment: .leading, spacing: 12) {
                            HStack {
                                Image(systemName: "flame.fill")
                                    .foregroundColor(.red)
                                Text("Mới Cập Nhật")
                                    .font(.system(size: 20, weight: .bold, design: .rounded))
                                Spacer()
                            }
                            .padding(.horizontal, 20)
                            
                            // App List Container (Card lớn gom các App con)
                            VStack(spacing: 0) {
                                ForEach(Array(newApps.enumerated()), id: \.element.id) { index, app in
                                    AppRowView(app: app)
                                    
                                    if index < newApps.count - 1 {
                                        Divider()
                                            .padding(.leading, 72)
                                    }
                                }
                            }
                            .padding(.vertical, 4)
                            .background(Color.white)
                            .cornerRadius(28)
                            .padding(.horizontal, 20)
                            .shadow(color: Color.black.opacity(0.02), radius: 8, x: 0, y: 4)
                        }
                    }
                    .padding(.bottom, 100) // Tránh đè lên Floating TabBar
                }
            }
            .navigationBarHidden(true)
        }
        .navigationViewStyle(.stack)
    }
}

// MARK: - Subviews
struct CategoryCard: View {
    let title: String
    let systemImage: String
    let tintColor: Color
    
    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: systemImage)
                .font(.system(size: 16))
                .foregroundColor(tintColor)
                .frame(width: 32, height: 32)
                .background(tintColor.opacity(0.12))
                .clipShape(Circle())
            
            Text(title)
                .font(.system(size: 13, weight: .semibold))
                .foregroundColor(.primary)
            
            Spacer()
        }
        .padding(14)
        .background(Color.white)
        .cornerRadius(20)
        .shadow(color: Color.black.opacity(0.02), radius: 6, x: 0, y: 3)
    }
}

struct VipCardView: View {
    let app: AppItem
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            ZStack(alignment: .bottomTrailing) {
                // Icon Mockup
                RoundedRectangle(cornerRadius: 20)
                    .fill(app.color)
                    .frame(width: 84, height: 84)
                    .overlay(
                        Image(systemName: app.iconName)
                            .font(.system(size: 32))
                            .foregroundColor(.white)
                    )
                
                // Badge VIP
                Text("VIP")
                    .font(.system(size: 8, weight: .black))
                    .foregroundColor(.black)
                    .padding(.horizontal, 6)
                    .padding(.vertical, 3)
                    .background(Capsule().fill(Color.yellow))
                    .offset(x: 4, y: 4)
            }
            .padding(.bottom, 4)
            
            Text(app.name)
                .font(.system(size: 12, weight: .bold))
                .foregroundColor(.primary)
                .lineLimit(2)
            
            Text(app.category)
                .font(.system(size: 11))
                .foregroundColor(.secondary)
        }
        .frame(width: 104)
        .padding(10)
        .background(Color.white)
        .cornerRadius(20)
        .shadow(color: Color.black.opacity(0.02), radius: 6, x: 0, y: 3)
    }
}

struct AppRowView: View {
    let app: AppItem
    
    var body: some View {
        HStack(spacing: 14) {
            // Icon
            RoundedRectangle(cornerRadius: 14)
                .fill(app.color)
                .frame(width: 54, height: 54)
                .overlay(
                    Image(systemName: app.iconName)
                        .font(.system(size: 22))
                        .foregroundColor(.white)
                )
            
            // Info
            VStack(alignment: .leading, spacing: 3) {
                Text(app.name)
                    .font(.system(size: 15, weight: .bold))
                    .foregroundColor(.primary)
                
                Text(app.category)
                    .font(.system(size: 11))
                    .foregroundColor(.secondary)
            }
            
            Spacer()
            
            // "NHẬN" Button
            Button(action: {}) {
                Text("NHẬN")
                    .font(.system(size: 12, weight: .bold))
                    .foregroundColor(.blue)
                    .padding(.horizontal, 16)
                    .padding(.vertical, 6)
                    .background(Capsule().fill(Color.blue.opacity(0.08)))
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
    }
}

// MARK: - Previews
struct HomeDashboardView_Previews: PreviewProvider {
    static var previews: some View {
        MainContainerView()
    }
}
