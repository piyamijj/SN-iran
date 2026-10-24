import type { Lang } from './config';

export interface Dictionary {
  siteName: string;
  tagline: string;
  description: string;
  navIran: string;
  navIntl: string;
  all: string;
  categories: Record<string, string>;
  flash: string;
  loadMore: string;
  loading: string;
  noNews: string;
  noNewsHint: string;
  readTime: string;
  source: string;
  readAtSource: string;
  aiSummary: string;
  aiSummaryLoading: string;
  aiSummaryFail: string;
  aiDisclaimer: string;
  translatedNote: string;
  originalNote: string;
  fullTextBtn: string;
  fullTextLoading: string;
  fullTextFail: string;
  fullTextNote: string;
  fullTextOriginal: string;
  listen: string;
  pause: string;
  resume: string;
  stop: string;
  ttsUnsupported: string;
  ttsNoVoice: string;
  related: string;
  back: string;
  market: string;
  marketNote: string;
  chatTitle: string;
  chatPlaceholder: string;
  chatWelcome: string;
  chatError: string;
  chatSources: string;
  send: string;
  open: string;
  close: string;
  footer: string;
  switchTo: string;
  notFound: string;
  goHome: string;
}

export const dictionaries: Record<Lang, Dictionary> = {
  fa: {
    siteName: 'اس‌ان ایران',
    tagline: 'خبرهای ایران، فارسی و ترکی',
    description: 'تازه‌ترین خبرهای ایران از خبرگزاری‌های معتبر، با خلاصه هوشمند، ترجمه ترکی و خوانش صوتی.',
    navIran: 'ایران',
    navIntl: 'خارج از کشور',
    all: 'همه',
    categories: { politics: 'سیاسی', economy: 'اقتصادی', society: 'اجتماعی', culture: 'فرهنگی', sport: 'ورزشی', tech: 'فناوری', world: 'جهان', other: 'سایر' },
    flash: 'فوری',
    loadMore: 'نمایش بیشتر',
    loading: 'در حال بارگذاری…',
    noNews: 'هنوز خبری موجود نیست.',
    noNewsHint: 'پس از اولین اجرای دریافت خودکار اخبار، خبرها اینجا نمایش داده می‌شوند.',
    readTime: 'دقیقه مطالعه',
    source: 'منبع',
    readAtSource: 'مطالعه در منبع اصلی',
    aiSummary: 'خلاصه هوشمند',
    aiSummaryLoading: 'در حال تولید خلاصه…',
    aiSummaryFail: 'خلاصه در حال حاضر در دسترس نیست.',
    aiDisclaimer: 'این خلاصه توسط هوش مصنوعی تولید شده و ممکن است خطا داشته باشد.',
    translatedNote: 'ترجمه ماشینی؛ متن اصلی در منبع موجود است.',
    originalNote: 'متن اصلی خبر',
    fullTextBtn: 'دریافت و ترجمه متن کامل',
    fullTextLoading: 'در حال دریافت متن از منبع…',
    fullTextFail: 'دریافت متن کامل ممکن نشد. لطفاً از لینک منبع استفاده کنید.',
    fullTextNote: 'این متن بنا به درخواست شما از صفحه منبع دریافت شده و حق نشر متعلق به منبع است.',
    fullTextOriginal: 'متن کامل (فارسی)',
    listen: 'گوش دادن',
    pause: 'توقف',
    resume: 'ادامه',
    stop: 'پایان',
    ttsUnsupported: 'مرورگر شما خوانش صوتی را پشتیبانی نمی‌کند.',
    ttsNoVoice: 'صدای فارسی روی این دستگاه نصب نیست. برای شنیدن، زبان را روی ترکی بگذارید یا صدای فارسی نصب کنید.',
    related: 'خبرهای مرتبط',
    back: 'بازگشت',
    market: 'بازار',
    marketNote: 'نرخ‌ها از Yahoo Finance؛ نرخ ریال، نرخ رسمی/بین‌بانکی است نه بازار آزاد.',
    chatTitle: 'دستیار خبری',
    chatPlaceholder: 'درباره خبرهای اخیر بپرسید…',
    chatWelcome: 'سلام! درباره خبرهای هفته اخیر ایران از من بپرسید.',
    chatError: 'متأسفانه پاسخی دریافت نشد. دوباره تلاش کنید.',
    chatSources: 'منابع',
    send: 'ارسال',
    open: 'باز کردن دستیار',
    close: 'بستن',
    footer: 'اخبار از خبرگزاری‌های منبع گردآوری می‌شود؛ حق نشر متعلق به منابع است. فقط عنوان، خلاصه کوتاه و لینک منبع نمایش داده می‌شود.',
    switchTo: 'TR',
    notFound: 'صفحه پیدا نشد',
    goHome: 'صفحه اصلی',
  },
  tr: {
    siteName: 'SN İran',
    tagline: 'İran haberleri, Farsça ve Türkçe',
    description: 'İran\'ın güvenilir haber ajanslarından son haberler; yapay zekâ özeti, Türkçe çeviri ve sesli okuma ile.',
    navIran: 'İran',
    navIntl: 'Yurtdışı',
    all: 'Tümü',
    categories: { politics: 'Siyaset', economy: 'Ekonomi', society: 'Toplum', culture: 'Kültür', sport: 'Spor', tech: 'Teknoloji', world: 'Dünya', other: 'Diğer' },
    flash: 'SON DAKİKA',
    loadMore: 'Daha fazla göster',
    loading: 'Yükleniyor…',
    noNews: 'Henüz haber yok.',
    noNewsHint: 'Otomatik haber çekme ilk kez çalıştığında haberler burada görünecek.',
    readTime: 'dk okuma',
    source: 'Kaynak',
    readAtSource: 'Kaynağında oku',
    aiSummary: 'Yapay zekâ özeti',
    aiSummaryLoading: 'Özet hazırlanıyor…',
    aiSummaryFail: 'Özet şu anda alınamadı.',
    aiDisclaimer: 'Bu özet yapay zekâ ile üretilmiştir, hata içerebilir.',
    translatedNote: 'Makine çevirisi (Farsça\'dan); özgün metin kaynağında.',
    originalNote: 'Özgün metin',
    fullTextBtn: 'Haberin tamamını getir ve Türkçeye çevir',
    fullTextLoading: 'Kaynak sayfadan metin alınıyor ve çevriliyor…',
    fullTextFail: 'Tam metin alınamadı. Lütfen kaynak bağlantısını kullanın.',
    fullTextNote: 'Bu metin isteğiniz üzerine kaynak sayfadan alınmış ve çevrilmiştir; telif hakkı kaynağa aittir.',
    fullTextOriginal: 'Tam metin (Türkçe çeviri)',
    listen: 'Dinle',
    pause: 'Duraklat',
    resume: 'Devam',
    stop: 'Durdur',
    ttsUnsupported: 'Tarayıcınız sesli okumayı desteklemiyor.',
    ttsNoVoice: 'Bu cihazda Türkçe ses bulunamadı. Cihaz ayarlarından Türkçe ses paketi yükleyin.',
    related: 'İlgili haberler',
    back: 'Geri',
    market: 'Piyasa',
    marketNote: 'Kurlar Yahoo Finance\'tan; Riyal kuru resmî/bankalararası kurdur, serbest piyasa değildir.',
    chatTitle: 'Haber Asistanı',
    chatPlaceholder: 'Son haberler hakkında sor…',
    chatWelcome: 'Merhaba! Son bir haftanın İran haberleri hakkında bana soru sorabilirsin.',
    chatError: 'Üzgünüm, yanıt alınamadı. Lütfen tekrar dene.',
    chatSources: 'Kaynaklar',
    send: 'Gönder',
    open: 'Asistanı aç',
    close: 'Kapat',
    footer: 'Haberler kaynak ajanslardan derlenir; telif hakkı kaynaklara aittir. Yalnızca başlık, kısa özet ve kaynak bağlantısı gösterilir.',
    switchTo: 'FA',
    notFound: 'Sayfa bulunamadı',
    goHome: 'Ana sayfa',
  },
};

export const getDictionary = (lang: Lang) => dictionaries[lang];
