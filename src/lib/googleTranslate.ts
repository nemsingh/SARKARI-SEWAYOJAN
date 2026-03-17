// Google Translate free API fallback
export const googleTranslate = async (text: string, targetLang: string = 'hi'): Promise<string> => {
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Google Translate API failed');
    const data = await response.json();
    // data[0] is array of translated segments
    const translated = data[0]?.map((segment: any[]) => segment[0]).join('') || text;
    return translated;
  } catch (error) {
    console.error('Google Translate error:', error);
    return text; // Return original text if everything fails
  }
};
