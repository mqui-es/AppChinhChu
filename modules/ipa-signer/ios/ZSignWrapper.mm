#include <string>
#include <vector>
#include <Foundation/Foundation.h>
#include "fs.h"
#include "archive.h"
#include "bundle.h"

// Nhận diện hàm Lõi của ZSign
extern int zsign_main(int argc, char *argv[]);

// Lấy đường dẫn thư mục tạm thời hợp lệ của iOS (sandbox-safe)
static std::string getIOSTempDir() {
    NSString* tempDir = NSTemporaryDirectory();
    if (tempDir && tempDir.length > 0) {
        std::string dir = [tempDir UTF8String];
        if (!dir.empty() && dir.back() == '/') {
            dir.pop_back();
        }
        return dir;
    }
    NSArray* paths = NSSearchPathForDirectoriesInDomains(NSDocumentDirectory, NSUserDomainMask, YES);
    if (paths.count > 0) {
        return [[paths firstObject] UTF8String];
    }
    return "/tmp";
}

// Cánh cổng tàng hình (C-Linkage) để Swift gọi C++ ký IPA
extern "C" int zsign_wrapper(
    const char* ipa, 
    const char* p12, 
    const char* prov, 
    const char* pass, 
    const char* out,
    const char* bundleId,
    const char* displayName,
    const char* iconPath
) {
    std::vector<std::string> args;
    std::string tempDir = getIOSTempDir();
    
    args.push_back("zsign");
    args.push_back("-k"); args.push_back(p12);
    args.push_back("-p"); args.push_back(pass);
    args.push_back("-m"); args.push_back(prov);
    args.push_back("-t"); args.push_back(tempDir);
    args.push_back("-f"); // Ép buộc ký đè
    
    if (bundleId && strlen(bundleId) > 0) {
        args.push_back("-b"); args.push_back(bundleId);
    }
    if (displayName && strlen(displayName) > 0) {
        args.push_back("-n"); args.push_back(displayName);
    }
    if (iconPath && strlen(iconPath) > 0) {
        args.push_back("-g"); args.push_back(iconPath);
    }
    
    args.push_back("-o"); args.push_back(out);
    args.push_back(ipa);

    // Chuyển đổi ngôn ngữ thành mảng char* argv
    std::vector<char*> argv;
    for (const auto& arg : args) {
        argv.push_back((char*)arg.data());
    }
    
    // Reset getopt state cho mỗi lần gọi
    extern int optind;
    optind = 1;
    
    return zsign_main((int)argv.size(), argv.data());
}

// Cánh cổng để Swift gọi đọc thông tin IPA trước khi ký
extern "C" const char* get_ipa_info_wrapper(const char* ipa, const char* tempDir) {
    static std::string result;
    result = "";
    
    std::string strFolder = std::string(tempDir) + "/zsign_info_temp";
    ZFile::RemoveFolder(strFolder.c_str()); // Xóa sạch thư mục cũ nếu có
    ZFile::CreateFolder(strFolder.c_str());
    
    // Trích xuất IPA
    if (!Zip::Extract(ipa, strFolder.c_str())) {
        ZFile::RemoveFolder(strFolder.c_str());
        return "";
    }
    
    ZBundle bundle;
    string strAppFolder;
    if (bundle.FindAppFolder(strFolder, strAppFolder)) {
        jvalue jvInfo;
        if (jvInfo.read_plist_from_file("%s/Info.plist", strAppFolder.c_str())) {
            string strBundleId = jvInfo["CFBundleIdentifier"];
            string strBundleName = jvInfo["CFBundleDisplayName"];
            if (strBundleName.empty()) {
                strBundleName = jvInfo["CFBundleName"].as_cstr();
            }
            result = strBundleId + "///" + strBundleName;
        }
    }
    
    // Làm sạch thư mục tạm thời
    ZFile::RemoveFolder(strFolder.c_str());
    return result.c_str();
}