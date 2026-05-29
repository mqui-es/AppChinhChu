#include <string>
#include <vector>

// Nhận diện hàm Lõi của ZSign (Sếp sẽ nạp ZSign ở Bước 4)
extern int zsign_main(int argc, char *argv[]);

// Cánh cổng tàng hình (C-Linkage) để Swift có thể chui qua gọi C++
extern "C" int zsign_wrapper(const char* ipa, const char* p12, const char* prov, const char* pass, const char* out) {
    std::vector<std::string> args;
    
    // Giả lập gõ lệnh Terminal: zsign -k p12 -p pass -m prov -f -o out ipa
    args.push_back("zsign");
    args.push_back("-k"); args.push_back(p12);
    args.push_back("-p"); args.push_back(pass);
    args.push_back("-m"); args.push_back(prov);
    args.push_back("-f"); // Ép buộc ký đè (Force sign)
    args.push_back("-o"); args.push_back(out);
    args.push_back(ipa);

    // Chuyển đổi ngôn ngữ để bơm vào thuật toán
    std::vector<char*> argv;
    for (const auto& arg : args) {
        argv.push_back((char*)arg.data());
    }
    
    // Kích hoạt ZSign! Nếu trả về 0 là thành công.
    return zsign_main((int)argv.size(), argv.data());
}