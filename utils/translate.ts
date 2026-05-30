const isVietnameseText = (text: string): boolean => {
  const viChars = /[àáảãạâầấẩẫậăằắẳẵặèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđÀÁẢÃẠÂẦẤẨẪẬĂẰẮẲẴẶÈÉẺẼẸÊỀẾỂỄỆÌÍỈĨỊÒÓỎÕỌÔỒỐỔỖỘƠỜỚỞỠỢÙÚỦŨỤƯỪỨỬỮỰỲÝỶỸYĐ]/;
  return viChars.test(text);
};

// Bộ nhớ đệm lưu trữ các bản dịch thành công để tránh spam API
const translationCache: Record<string, string> = {};

// Hàm dịch dự phòng sử dụng API công cộng của MyMemory khi Google chặn (429)
const translateMyMemory = async (text: string, sourceLang: string, targetLang: string): Promise<string> => {
  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${sourceLang}|${targetLang}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000); // 4 giây timeout
    
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    
    if (res.ok) {
      const bodyText = await res.text();
      if (bodyText && !bodyText.trim().startsWith('<')) {
        const data = JSON.parse(bodyText);
        if (data && data.responseData && data.responseData.translatedText) {
          return data.responseData.translatedText;
        }
      }
    }
  } catch (e) {
    // Thất bại trong im lặng
  }
  return '';
};

export const translateText = async (text: string, targetLang: string): Promise<string> => {
  if (!text || text.trim() === '') return '';
  
  const cacheKey = `${targetLang}:${text}`;
  if (translationCache[cacheKey]) {
    return translationCache[cacheKey];
  }
  
  const isVi = isVietnameseText(text);
  if (isVi && targetLang === 'vi') {
    return text;
  }
  if (!isVi && targetLang === 'en') {
    return text;
  }

  const headers = {
    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
    'Accept': '*/*'
  };

  try {
    // Tách văn bản thành các đoạn tối đa 800 ký tự tránh lỗi URI quá dài
    const chunks: string[] = [];
    let remainingText = text;
    while (remainingText.length > 0) {
      if (remainingText.length <= 800) {
        chunks.push(remainingText);
        break;
      }
      let splitIndex = remainingText.lastIndexOf('. ', 800);
      if (splitIndex === -1 || splitIndex < 400) {
        splitIndex = remainingText.lastIndexOf(' ', 800);
      }
      if (splitIndex === -1 || splitIndex < 400) {
        splitIndex = 800;
      }
      chunks.push(remainingText.substring(0, splitIndex));
      remainingText = remainingText.substring(splitIndex).trim();
    }

    // Thực hiện dịch các đoạn song song
    const translatedChunks = await Promise.all(
      chunks.map(async (chunk) => {
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(chunk)}`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);

        try {
          const res = await fetch(url, { 
            headers,
            signal: controller.signal
          });
          clearTimeout(timeoutId);
          if (!res.ok) {
            throw new Error(`HTTP error ${res.status}`);
          }
          const bodyText = await res.text();
          if (!bodyText || bodyText.trim().startsWith('<')) {
            throw new Error('Response is HTML, not JSON');
          }
          let data;
          try {
            data = JSON.parse(bodyText);
          } catch (jsonErr) {
            throw new Error('Failed to parse JSON');
          }
          if (data && data[0]) {
            return data[0]
              .map((item: any) => (item && item[0] ? item[0] : ''))
              .join('');
          }
          return chunk;
        } catch (err) {
          clearTimeout(timeoutId);
          throw err;
        }
      })
    );

    const result = translatedChunks.join(' ');
    translationCache[cacheKey] = result; // Lưu vào cache
    return result;
  } catch (e) {
    // Khi Google chặn (429), tự động chuyển sang dịch bằng API dự phòng MyMemory
    const sourceLang = isVi ? 'vi' : 'en';
    const fallbackText = await translateMyMemory(text, sourceLang, targetLang);
    if (fallbackText && fallbackText.trim() !== '') {
      translationCache[cacheKey] = fallbackText; // Lưu bản dịch dự phòng vào cache
      return fallbackText;
    }
    // Trả về văn bản gốc nếu cả hai cách đều lỗi (không lưu cache lỗi để lần sau tải lại có cơ hội thử tiếp)
    return text;
  }
};
