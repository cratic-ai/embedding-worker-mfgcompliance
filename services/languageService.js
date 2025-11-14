const franc = require('franc');

// Language code mapping (franc uses ISO 639-3 → we map to ISO 639-1)
const LANGUAGE_MAP = {
  'eng': 'en', // English
  'spa': 'es', // Spanish
  'fra': 'fr', // French
  'deu': 'de', // German
  'cmn': 'zh', // Chinese (Mandarin)
  'jpn': 'ja', // Japanese
  'por': 'pt', // Portuguese
  'ita': 'it', // Italian
  'rus': 'ru', // Russian
  'ara': 'ar', // Arabic
  'hin': 'hi', // Hindi
  'tam': 'ta', // Tamil
  'ben': 'bn', // Bengali
  'sin': 'si', // Sinhala
  'urd': 'ur', // Urdu
  'nep': 'ne', // Nepali
  'div': 'dv', // Dhivehi (Maldives)
  'msa': 'ms', // Malay
  'ind': 'id', // Indonesian
  'tgl': 'tl', // Tagalog / Filipino
  'tha': 'th', // Thai
  'vie': 'vi', // Vietnamese
  'khm': 'km', // Khmer (Cambodia)
  'mya': 'my', // Burmese (Myanmar)
  'kor': 'ko', // Korean
  'nld': 'nl', // Dutch
  'pol': 'pl', // Polish
  'tur': 'tr', // Turkish
  'swe': 'sv', // Swedish
  'dan': 'da', // Danish
  'fin': 'fi', // Finnish
  'nor': 'no', // Norwegian
  'ces': 'cs', // Czech
  'hun': 'hu', // Hungarian
  'ron': 'ro', // Romanian
  'ukr': 'uk', // Ukrainian
  'heb': 'he', // Hebrew
  'ell': 'el'  // Greek
};

// Supported languages for the chatbot
const SUPPORTED_LANGUAGES = {
  'en': { name: 'English', nativeName: 'English', flag: '🇬🇧' },
  'es': { name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
  'fr': { name: 'French', nativeName: 'Français', flag: '🇫🇷' },
  'de': { name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
  'zh': { name: 'Chinese', nativeName: '中文', flag: '🇨🇳' },
  'ja': { name: 'Japanese', nativeName: '日本語', flag: '🇯🇵' },
  'pt': { name: 'Portuguese', nativeName: 'Português', flag: '🇵🇹' },
  'it': { name: 'Italian', nativeName: 'Italiano', flag: '🇮🇹' },
  'ru': { name: 'Russian', nativeName: 'Русский', flag: '🇷🇺' },
  'ar': { name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦' },
  'hi': { name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳' },
  'ta': { name: 'Tamil', nativeName: 'தமிழ்', flag: '🇮🇳' },
  'bn': { name: 'Bengali', nativeName: 'বাংলা', flag: '🇧🇩' },
  'si': { name: 'Sinhala', nativeName: 'සිංහල', flag: '🇱🇰' },
  'ur': { name: 'Urdu', nativeName: 'اردو', flag: '🇵🇰' },
  'ne': { name: 'Nepali', nativeName: 'नेपाली', flag: '🇳🇵' },
  'dv': { name: 'Dhivehi', nativeName: 'ދިވެހި', flag: '🇲🇻' },
  'ms': { name: 'Malay', nativeName: 'Bahasa Melayu', flag: '🇲🇾' },
  'id': { name: 'Indonesian', nativeName: 'Bahasa Indonesia', flag: '🇮🇩' },
  'tl': { name: 'Filipino', nativeName: 'Tagalog', flag: '🇵🇭' },
  'th': { name: 'Thai', nativeName: 'ไทย', flag: '🇹🇭' },
  'vi': { name: 'Vietnamese', nativeName: 'Tiếng Việt', flag: '🇻🇳' },
  'km': { name: 'Khmer', nativeName: 'ភាសាខ្មែរ', flag: '🇰🇭' },
  'my': { name: 'Burmese', nativeName: 'ဗမာစာ', flag: '🇲🇲' },
  'ko': { name: 'Korean', nativeName: '한국어', flag: '🇰🇷' },
  'tr': { name: 'Turkish', nativeName: 'Türkçe', flag: '🇹🇷' },
  'nl': { name: 'Dutch', nativeName: 'Nederlands', flag: '🇳🇱' },
  'pl': { name: 'Polish', nativeName: 'Polski', flag: '🇵🇱' },
  'sv': { name: 'Swedish', nativeName: 'Svenska', flag: '🇸🇪' },
  'da': { name: 'Danish', nativeName: 'Dansk', flag: '🇩🇰' },
  'fi': { name: 'Finnish', nativeName: 'Suomi', flag: '🇫🇮' },
  'no': { name: 'Norwegian', nativeName: 'Norsk', flag: '🇳🇴' },
  'cs': { name: 'Czech', nativeName: 'Čeština', flag: '🇨🇿' },
  'hu': { name: 'Hungarian', nativeName: 'Magyar', flag: '🇭🇺' },
  'ro': { name: 'Romanian', nativeName: 'Română', flag: '🇷🇴' },
  'uk': { name: 'Ukrainian', nativeName: 'Українська', flag: '🇺🇦' },
  'he': { name: 'Hebrew', nativeName: 'עברית', flag: '🇮🇱' },
  'el': { name: 'Greek', nativeName: 'Ελληνικά', flag: '🇬🇷' }
};


/**
 * Detect language from text
 * @param {string} text - Text to analyze
 * @returns {string} - ISO 639-1 language code (e.g., 'en', 'es')
 */
const detectLanguage = (text) => {
  try {
    // franc requires at least some text
    if (!text || text.trim().length < 10) {
      console.log('Text too short for language detection, defaulting to English');
      return 'en';
    }

    // Detect language using franc (returns ISO 639-3)
    const detected = franc(text);
    console.log('Franc detected language:', detected);

    // franc returns 'und' if undetermined
    if (detected === 'und') {
      console.log('Language undetermined, defaulting to English');
      return 'en';
    }

    // Convert to ISO 639-1
    const langCode = LANGUAGE_MAP[detected] || 'en';
    console.log('Converted to ISO 639-1:', langCode);

    return langCode;
  } catch (error) {
    console.error('Language detection error:', error.message);
    return 'en'; // Default to English on error
  }
};

/**
 * Get language name and metadata
 * @param {string} langCode - ISO 639-1 language code
 * @returns {object} - Language metadata
 */
const getLanguageInfo = (langCode) => {
  return SUPPORTED_LANGUAGES[langCode] || SUPPORTED_LANGUAGES['en'];
};

/**
 * Check if language is supported
 * @param {string} langCode - ISO 639-1 language code
 * @returns {boolean}
 */
const isLanguageSupported = (langCode) => {
  return Object.keys(SUPPORTED_LANGUAGES).includes(langCode);
};

/**
 * Get all supported languages
 * @returns {array} - Array of language objects
 */
const getSupportedLanguages = () => {
  return Object.entries(SUPPORTED_LANGUAGES).map(([code, info]) => ({
    code,
    ...info
  }));
};

/**
 * Get manufacturing compliance prompt in different languages
 * @param {string} langCode - Language code
 * @returns {string} - System prompt in specified language
 */
const getSystemPrompt = (langCode) => {
const prompts = {
  'en': 'You are a Manufacturing Compliance Assistant. Help users understand regulatory requirements, quality standards, and compliance documentation. Always cite page numbers when referencing documents.',
  'es': 'Eres un Asistente de Cumplimiento de Manufactura. Ayuda a los usuarios a comprender los requisitos regulatorios, estándares de calidad y documentación de cumplimiento. Siempre cita los números de página al hacer referencia a documentos.',
  'fr': 'Vous êtes un Assistant de Conformité de Fabrication. Aidez les utilisateurs à comprendre les exigences réglementaires, les normes de qualité et la documentation de conformité. Citez toujours les numéros de page lors de la référence aux documents.',
  'de': 'Sie sind ein Fertigungs-Compliance-Assistent. Helfen Sie Benutzern, regulatorische Anforderungen, Qualitätsstandards und Compliance-Dokumentation zu verstehen. Geben Sie immer Seitenzahlen an, wenn Sie auf Dokumente verweisen.',
  'zh': '您是制造合规助手。帮助用户理解监管要求、质量标准和合规文档。在引用文档时始终引用页码。',
  'ja': 'あなたは製造コンプライアンスアシスタントです。ユーザーが規制要件、品質基準、コンプライアンス文書を理解できるように支援します。文書を参照する際は常にページ番号を引用してください。',
  'pt': 'Você é um Assistente de Conformidade de Fabricação. Ajude os usuários a entender requisitos regulatórios, padrões de qualidade e documentação de conformidade. Sempre cite os números de página ao fazer referência a documentos.',
  'it': 'Sei un Assistente di Conformità alla Produzione. Aiuta gli utenti a comprendere i requisiti normativi, gli standard di qualità e la documentazione di conformità. Cita sempre i numeri di pagina quando fai riferimento ai documenti.',
  'ru': 'Вы - Помощник по Соблюдению Требований в Производстве. Помогайте пользователям понимать нормативные требования, стандарты качества и документацию по соблюдению требований. Всегда указывайте номера страниц при ссылке на документы.',
  'ar': 'أنت مساعد الامتثال التصنيعي. ساعد المستخدمين على فهم المتطلبات التنظيمية ومعايير الجودة ووثائق الامتثال. قم دائمًا بالاستشهاد بأرقام الصفحات عند الإشارة إلى المستندات.',
  'hi': 'आप एक विनिर्माण अनुपालन सहायक हैं। उपयोगकर्ताओं को नियामक आवश्यकताओं, गुणवत्ता मानकों और अनुपालन दस्तावेज़ीकरण को समझने में मदद करें। दस्तावेज़ों का संदर्भ देते समय हमेशा पृष्ठ संख्याओं का हवाला दें।',
  'ko': '귀하는 제조 규정 준수 도우미입니다. 사용자가 규제 요구 사항, 품질 표준 및 규정 준수 문서를 이해하도록 도와주세요. 문서를 참조할 때는 항상 페이지 번호를 인용하세요.',

  // ✅ South Asian + Southeast Asian languages
  'ms': 'Anda ialah Pembantu Pematuhan Pembuatan. Bantu pengguna memahami keperluan kawal selia, piawaian kualiti dan dokumentasi pematuhan. Sentiasa nyatakan nombor halaman apabila merujuk dokumen.',
  'id': 'Anda adalah Asisten Kepatuhan Manufaktur. Bantu pengguna memahami persyaratan peraturan, standar kualitas, dan dokumentasi kepatuhan. Selalu cantumkan nomor halaman saat merujuk dokumen.',
  'tl': 'Ikaw ay isang Manufacturing Compliance Assistant. Tulungan ang mga gumagamit na maunawaan ang mga regulasyong kinakailangan, pamantayan ng kalidad, at mga dokumento ng pagsunod. Laging banggitin ang mga numero ng pahina kapag tumutukoy sa mga dokumento.',
  'th': 'คุณเป็นผู้ช่วยด้านการปฏิบัติตามข้อกำหนดการผลิต ช่วยให้ผู้ใช้เข้าใจข้อกำหนดตามกฎระเบียบ มาตรฐานคุณภาพ และเอกสารการปฏิบัติตามข้อกำหนด ระบุหมายเลขหน้าทุกครั้งเมื่ออ้างอิงเอกสาร',
  'vi': 'Bạn là Trợ lý Tuân thủ Sản xuất. Hỗ trợ người dùng hiểu các yêu cầu quy định, tiêu chuẩn chất lượng và tài liệu tuân thủ. Luôn trích dẫn số trang khi tham chiếu tài liệu.',
  'ta': 'நீங்கள் ஒரு உற்பத்தி இணக்கம் உதவியாளர். ஒழுங்குமுறை தேவைகள், தரநிலைகள் மற்றும் இணக்கம் ஆவணங்களைப் பயனர்கள் புரிந்துகொள்ள உதவுங்கள். ஆவணங்களை மேற்கோள் காட்டும் போது எப்போதும் பக்க எண்களை குறிப்பிடுங்கள்.',
  'bn': 'আপনি একজন ম্যানুফ্যাকচারিং কমপ্লায়েন্স অ্যাসিস্ট্যান্ট। ব্যবহারকারীদের নিয়ন্ত্রক প্রয়োজনীয়তা, মানের মানদণ্ড এবং কমপ্লায়েন্স ডকুমেন্টেশন বুঝতে সহায়তা করুন। নথির রেফারেন্স করার সময় সর্বদা পৃষ্ঠার নম্বর উল্লেখ করুন।',
  'si': 'ඔබ නිෂ්පාදන අනුකූලතා උපකාරකයෙකි. පරිශීලකයින්ට නියාමන අවශ්‍යතා, තත්ත්ව ප්‍රමිතීන් සහ අනුකූලතා ලේඛන තේරුම් ගැනීමට උපකාරය කරන්න. ලේඛන සඳහන් කරන විට සැමවිටම පිටු අංක සඳහන් කරන්න.',
  'ur': 'آپ ایک مینوفیکچرنگ کمپلائنس اسسٹنٹ ہیں۔ صارفین کو ضوابطی تقاضوں، معیار کے معیارات، اور کمپلائنس دستاویزات کو سمجھنے میں مدد کریں۔ دستاویزات کا حوالہ دیتے وقت ہمیشہ صفحہ نمبر بتائیں۔',
  'ne': 'तपाईं उत्पादन अनुपालन सहायक हुनुहुन्छ। प्रयोगकर्तालाई नियामक आवश्यकताहरू, गुणस्तर मापदण्डहरू र अनुपालन दस्तावेजहरू बुझ्न सहयोग गर्नुहोस्। कागजात सन्दर्भ गर्दा सधैं पृष्ठ संख्या उद्धृत गर्नुहोस्।',
  'dv': 'ތިޔަ މެނިފެކްޗަރިންގ ކޮމްޕްލައިންސް އެސިސްޓަންޓްކަށް ކޮށްފިން. މަސްދަރު ބަޔާންކޮށް ރެފަރެންސްކޮށްގެން ސަފީޙާގެ ނަންބަރު ފަހަރު ލިބުން ކުރަން ކުރެވޭނެ.'
};

return prompts[langCode] || prompts['en'];
};


/**
 * Format response based on language (for special formatting needs)
 * @param {string} text - Text to format
 * @param {string} langCode - Language code
 * @returns {string} - Formatted text
 */
const formatResponse = (text, langCode) => {
  // Add any language-specific formatting here
  // For example, right-to-left languages might need special handling

  if (langCode === 'ar' || langCode === 'he') {
    // Add RTL marker if needed
    return `\u202B${text}\u202C`;
  }

  return text;
};

module.exports = {
  detectLanguage,
  getLanguageInfo,
  isLanguageSupported,
  getSupportedLanguages,
  getSystemPrompt,
  formatResponse,
  SUPPORTED_LANGUAGES
};