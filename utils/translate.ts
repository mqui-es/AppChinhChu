export const translateText = async (text: string, targetLang: string): Promise<string> => {
  if (!text || text.trim() === '') return '';
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `q=${encodeURIComponent(text)}`,
    });
    const data = await res.json();
    if (data && data[0]) {
      return data[0]
        .map((item: any) => (item && item[0] ? item[0] : ''))
        .join('');
    }
    return text;
  } catch (e) {
    console.error("Translation helper error:", e);
    return text;
  }
};
