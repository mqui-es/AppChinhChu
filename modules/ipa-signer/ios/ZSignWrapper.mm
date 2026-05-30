#include <string>
#include <vector>
#include <Foundation/Foundation.h>

// Nhận diện hàm Lõi của ZSign (Sếp sẽ nạp ZSign ở Bước 4)
extern int zsign_main(int argc, char *argv[]);

// Lấy đường dẫn thư mục tạm thời hợp lệ của iOS (sandbox-safe)
static std::string getIOSTempDir() {
    // Trên iOS, /tmp không thể truy cập trong app sandbox
    // Phải dùng NSTemporaryDirectory() để lấy đường dẫn đúng
    NSString* tempDir = NSTemporaryDirectory();
    if (tempDir && tempDir.length > 0) {
        // Xoá dấu / cuối nếu có
        std::string dir = [tempDir UTF8String];
        if (!dir.empty() && dir.back() == '/') {
            dir.pop_back();
        }
        return dir;
    }
    // Fallback: dùng Documents directory của app
    NSArray* paths = NSSearchPathForDirectoriesInDomains(NSDocumentDirectory, NSUserDomainMask, YES);
    if (paths.count > 0) {
        return [[paths firstObject] UTF8String];
    }
    return "/tmp";
}

// Cánh cổng tàng hình (C-Linkage) để Swift có thể chui qua gọi C++
extern "C" int zsign_wrapper(const char* ipa, const char* p12, const char* prov, const char* pass, const char* out) {
    std::vector<std::string> args;
    
    // Lấy đường dẫn temp hợp lệ cho iOS
    std::string tempDir = getIOSTempDir();
    
    // Giả lập gõ lệnh Terminal: zsign -k p12 -p pass -m prov -t tempDir -f -o out ipa
    args.push_back("zsign");
    args.push_back("-k"); args.push_back(p12);
    args.push_back("-p"); args.push_back(pass);
    args.push_back("-m"); args.push_back(prov);
    args.push_back("-t"); args.push_back(tempDir);  // 🔑 FIX QUAN TRỌNG: truyền iOS temp dir
    args.push_back("-f"); // Ép buộc ký đè (Force sign)
    args.push_back("-o"); args.push_back(out);
    args.push_back(ipa);

    // Chuyển đổi ngôn ngữ để bơm vào thuật toán
    std::vector<char*> argv;
    for (const auto& arg : args) {
        argv.push_back((char*)arg.data());
    }
    
    // Reset getopt state cho mỗi lần gọi (quan trọng vì gọi nhiều lần)
    extern int optind;
    optind = 1;
    
    // Kích hoạt ZSign! Nếu trả về 0 là thành công.
    return zsign_main((int)argv.size(), argv.data());
}