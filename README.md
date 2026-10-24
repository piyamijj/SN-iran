# SN-iran — İran Haberleri (Farsça / Türkçe)

İran'ın haber ajanslarından başlık + kısa özet toplayan, **Farsça (varsayılan, RTL)** ve **Türkçe** sunan, yapay zekâ destekli haber platformu. Next.js 14 (App Router) · Supabase (Postgres + pgvector) · Upstash Redis · Groq · Gemini. [`sn-haber`](https://github.com/piyamijj/sn-haber) projesinden türetilmiştir.

## Özellikler

- **/fa** (varsayılan, RTL, Vazirmatn yazı tipi, Jalali/Hicri-Şemsi tarih ve Fars rakamları) ve **/tr** rotaları; `hreflang`, canonical, çok dilli sitemap ve `/fa/feed.xml`, `/tr/feed.xml`.
- **TR/FA düğmesi**: yalnızca arayüzü değil **haber başlığı ve özetini de** seçilen dilde gösterir. Dil çerezde saklanır.
- **İran / Yurtdışı** sekmeleri; kategori filtreleri (siyaset, ekonomi, toplum, kültür, spor, teknoloji, dünya, diğer).
- **Çeviri**: kaynaktan yalnızca başlık + ≤400 karakter özet alınır; fa→tr (İngilizce kaynaklarda en→fa ve en→tr) **ham çeviri** yapılır (yeniden yazma/özetleme yok). Sonuç DB'de saklanır; her haber **bir kez** çevrilir, yalnızca kaynak başlık/özeti değişirse (parmak izi farkı) yeniden çevrilir. Çevirisi başarısız olanlar sonraki çalıştırmada tamamlanır.
- **Haber okurken**: 3 maddelik **AI hızlı özet** (kullanıcının dilinde, istek üzerine üretilip önbelleğe alınır); **"Haberin tamamını getir ve çevir"** düğmesi (yalnızca kullanıcı isteğiyle kaynak sayfayı çeker, çevirir, önbellekler; IP başına dakikada 5 istek); her zaman kaynak linki ve atıf gösterilir.
- **Sesli okuma (TTS)**: tarayıcı SpeechSynthesis. `tr-TR` sesi Türkçe için; Farsça (`fa-IR`) sesi çoğu cihazda **yoktur** — yoksa düğme yerine açıklayıcı mesaj gösterilir, hata vermez (Türkçeye geçip dinleyebilirsiniz).
- **RAG chatbot**: son 7 günün haberlerinden bağlam çeker, **kullanıcının seçili dilinde** yanıtlar.
- **Piyasa bandı**: USD/IRR, USD/TRY, altın (ons), Brent, BTC — Yahoo Finance (anahtarsız). ⚠ USD/IRR **resmî/bankalararası** kurdur; Tahran serbest piyasası için ücretsiz, kararlı bir API bulunmadığından eklenmemiştir.
- Mükerrer engelleme: içerik hash'i (Redis + DB UNIQUE) + embedding benzerliği (pgvector, çok dilli).

## Telif ve etik

Tam makale kopyalanmaz: yalnızca başlık, kısa özet ve kaynağa link yayımlanır. Tam metin yalnızca kullanıcı tıklamasıyla, kişisel okuma amacıyla çevrilir ve telifin kaynağa ait olduğu belirtilir. Ticari kullanımdan önce kaynakların kullanım koşullarını kontrol edin.

## Kaynak (RSS) doğrulama sonuçları

25 Ekim 2026'da, geliştirme ortamından (yurtdışı IP) canlı test edildi:

| Kaynak | Sonuç |
|---|---|
| IRNA, ISNA, Mehr, Khabaronline, Hamshahri | ✅ 30 öğe |
| Tabnak | ✅ 100 öğe |
| YJC | ✅ 20 öğe |
| Donya-e Eqtesad | ✅ 30 öğe |
| **Tasnim, Fars** | ❌ Bağlantı kurulamadı (yurtdışı IP engeli/zaman aşımı) → `active=false`, `use_proxy=true` olarak eklendi. Proxy kurulunca etkinleştirin |
| Eghtesadonline | ❌ RSS yerine HTML dönüyor (eklenmedi) |
| Yurtdışı: BBC Farsça (29), DW Farsça (21), Euronews Farsça (50), BBC World (31), Al Jazeera (25), DW English (12) | ✅ |
| Iran International, Radio Farda, Press TV | ❌ Kullanılabilir RSS yok / yalnızca 1 öğe (eklenmedi) |

Güncel durumu görmek için: `npm run check-feeds` ve Supabase `sources.last_fetch_status` sütunu.

## İran sitelerinin yurtdışı IP'lerini engellemesi (proxy)

Vercel sunucuları yurtdışındadır; bazı İran siteleri (Tasnim, Fars…) erişimi kesebilir. Çözüm: `sources.use_proxy = true` olan kaynaklar ve tam-metin çekme istekleri `RSS_PROXY_URL` üzerinden gider. Biçim: `GET ${RSS_PROXY_URL}${encodeURIComponent(hedefUrl)}`. Örnek Cloudflare Worker (ücretsiz plan yeterli; **İran IP'li/çıkışlı bir VPS üzerinde de çalıştırılabilir**, Cloudflare çıkışı da engellenebilir):

```js
export default {
  async fetch(req, env) {
    if (env.TOKEN && req.headers.get('x-proxy-token') !== env.TOKEN) return new Response('forbidden', { status: 403 });
    const target = new URL(req.url).searchParams.get('url');
    if (!target || !/^https:\/\/([a-z0-9-]+\.)?(tasnimnews\.com|farsnews\.ir|irna\.ir|isna\.ir|mehrnews\.com)\//.test(target)) return new Response('bad url', { status: 400 });
    return fetch(target, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  },
};
```

Etkinleştirme: Worker'ı yayımlayın → Vercel'e `RSS_PROXY_URL=https://<worker>.workers.dev/?url=` (ve isterseniz `RSS_PROXY_TOKEN`) ekleyin → Supabase'de `update sources set active = true where name in ('tasnim','fars');`.

## Gerekli anahtarlar

| Değişken | Nereden |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Upstash → Redis DB → REST API |
| `GROQ_API_KEY` | console.groq.com/keys |
| `GEMINI_API_KEY` | aistudio.google.com/app/apikey |
| `CRON_SECRET` | Kendiniz üretin (uzun rastgele metin) |
| `NEXT_PUBLIC_DOMAIN` | Yayın alan adı, protokolsüz |
| opsiyonel `RSS_PROXY_URL`, `RSS_PROXY_TOKEN`, `GEMINI_API_KEY_2`, `GROQ_FAST_MODEL`, `GROQ_CHAT_MODEL`, `INGEST_MAX_PER_RUN` | — |

Şablon: `.env.local.example`. Gerçek anahtarları **asla commit etmeyin**.

## Kurulum / Yayın (adım adım)

1. **Supabase**: yeni proje → SQL Editor → `supabase/migrations/0001_init.sql` dosyasının tamamını çalıştırın (tablolar, pgvector, RLS, RPC'ler ve kaynak listesi gelir).
2. **Upstash**: Redis veritabanı oluşturun, REST URL ve token'ı alın.
3. **Vercel**: *Add New → Project → `piyamijj/SN-iran`* içe aktarın, yukarıdaki ortam değişkenlerini ekleyin → Deploy.
4. **Zamanlayıcı** (Vercel Hobby yalnızca günlük cron destekler; `vercel.json` günde 1 kez çalıştırır): sık çekim için repo → Settings → Secrets → Actions içine `SITE_URL` (örn. `https://sn-iran.vercel.app`) ve `CRON_SECRET` ekleyin; `docs/github-workflows/ingest.yml` dosyasını `.github/workflows/` altına kopyalayın (araç token'ında workflow izni olmadığından otomatik eklenemedi); her 10 dakikada endpoint'i tetikler. (Alternatif: cron-job.org ile `Authorization: Bearer <CRON_SECRET>` başlığıyla `GET /api/cron/rss-ingest`.)
5. **İlk çekim**: `curl -H "Authorization: Bearer $CRON_SECRET" https://<alan-adı>/api/cron/rss-ingest` → JSON özet kaynak başına sonuçları gösterir. Çalıştırma başına en fazla 24 yeni haber işlenir (Vercel 60 sn sınırı), birkaç tetiklemede liste dolar.
6. (Opsiyonel) Tasnim/Fars için proxy kurun (yukarıya bakın).

Yerel geliştirme: `npm install && cp .env.local.example .env.local && npm run dev`; elle çekim: `npm run ingest`.

## Yapı

```
app/[lang]/…            sayfalar (fa|tr): ana sayfa, haber, feed.xml
app/api/…               cron/rss-ingest, articles, ai-summary, fulltext, chat, markets
lib/news/…              RSS çekme, ingest pipeline, dedup, tam metin çıkarma, sorgular
lib/ai/…                Groq (çeviri/özet/chat) + Gemini (embedding, yedek LLM)
lib/i18n/…              sözlükler, Jalali/Fars biçimlendirme
supabase/migrations/    şema
```

## Bilinen sınırlar

- Sandbox ortamında Node çalıştırılamadığı için `next build` yerelde çalıştırılamadı; `docs/github-workflows/ci.yml` (tsc + build) şablonunu `.github/workflows/` altına kopyalayarak doğrulayın.
- Farsça TTS cihaza bağlıdır; sunucu taraflı Farsça TTS eklenmemiştir.
- Farsça sayfalarda OG görselinde başlık yerine marka kartı kullanılır (OG motoru Arapça harf birleştirmeyi desteklemez).
- Çeviri kalitesi makine çevirisi düzeyindedir; haberlerde "makine çevirisi" notu ve özgün metin gösterilir.
