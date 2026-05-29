require 'json'

package = JSON.parse(File.read(File.join(__dir__, '..', 'package.json')))

Pod::Spec.new do |s|
  s.name           = 'IpaSigner'
  s.version        = package['version']
  s.summary        = package['description']
  s.description    = package['description']
  s.license        = package['license']
  s.author         = package['author']
  s.homepage       = package['homepage']
  s.platform       = :ios, '13.0'
  s.swift_version  = '5.4'
  s.source         = { git: 'https://github.com/expo/expo.git' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'
  s.dependency 'OpenSSL-Universal'
  s.dependency 'SSZipArchive'

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp,c}"
  
  # 🔴 BẢN VÁ LỖI CUỐI CÙNG (Ép kiểu ui64_t)
  s.prepare_command = <<-CMD
    mkdir -p ios/minizip
    echo '#include <stdint.h>' > ios/minizip/ints.h
    echo 'typedef uint64_t ui64_t;' >> ios/minizip/ints.h
    echo 'typedef uint32_t ui32_t;' >> ios/minizip/ints.h
    echo 'typedef uint16_t ui16_t;' >> ios/minizip/ints.h
    echo 'typedef uint8_t ui8_t;' >> ios/minizip/ints.h
    cp ios/minizip/ints.h ios/ints.h || true
  CMD

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule',
    'CLANG_CXX_LANGUAGE_STANDARD' => 'gnu++17',
    'CLANG_CXX_LIBRARY' => 'libc++',
    'OTHER_CPLUSPLUSFLAGS' => '-fobjc-arc',
    'HEADER_SEARCH_PATHS' => '"${PODS_TARGET_SRCROOT}/ios" "${PODS_TARGET_SRCROOT}/ios/minizip"'
  }
end
