-- SN-iran — şema (tek migration). Supabase SQL Editor'de çalıştırın.
create extension if not exists "pgcrypto";
create extension if not exists "vector";

do $$ begin
  if not exists (select 1 from pg_type where typname = 'news_category') then
    create type news_category as enum ('politics','economy','society','culture','sport','tech','world','other');
  end if;
end $$;

-- RSS kaynakları
create table if not exists public.sources (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,          -- iç anahtar
  display_name text not null,         -- kullanıcıya görünen ad (fa)
  display_name_tr text,               -- Türkçe ad
  rss_url text not null unique,
  site_url text,
  region text not null default 'iran' check (region in ('iran','intl')),
  lang text not null default 'fa' check (lang in ('fa','en')),
  use_proxy boolean not null default false, -- yurtdışından engelleniyorsa proxy üzerinden çek
  active boolean not null default true,
  last_fetch_at timestamptz,
  last_fetch_status text,
  created_at timestamptz not null default now()
);

-- Haberler: yalnızca başlık + kısa özet + kaynak linki (tam metin kopyalanmaz)
create table if not exists public.articles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  region text not null default 'iran' check (region in ('iran','intl')),
  category news_category not null default 'other',
  source_id uuid references public.sources(id) on delete set null,
  source_name text not null,
  source_name_tr text,
  source_lang text not null default 'fa',
  source_url text not null unique,    -- kaynağa atıf linki
  image_url text,
  published_at timestamptz not null default now(),
  -- Kaynaktaki özgün metin
  title_src text not null,
  summary_src text not null default '',
  -- Gösterilen metinler (fa kaynakta fa=özgün; tr her zaman çeviri)
  title_fa text,
  summary_fa text,
  title_tr text,
  summary_tr text,
  -- Kaynak başlık/özeti değişirse yeniden çevirmek için parmak izi
  src_fingerprint text not null,
  translated_at timestamptz,
  -- Haberi okurken, istek üzerine üretilip önbelleğe alınan alanlar
  ai_summary_fa text[],
  ai_summary_tr text[],
  full_text_src text,                 -- kullanıcı isteğiyle kaynak sayfadan çekilen metin (önbellek)
  full_text_fa text,
  full_text_tr text,
  full_text_fetched_at timestamptz,
  is_flash boolean not null default false,
  content_hash text not null unique,
  embedding vector(768),
  view_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_articles_pub on public.articles (published_at desc);
create index if not exists idx_articles_region_pub on public.articles (region, published_at desc);
create index if not exists idx_articles_cat_pub on public.articles (category, published_at desc);
create index if not exists idx_articles_flash on public.articles (is_flash) where is_flash;
create index if not exists idx_articles_embedding on public.articles using hnsw (embedding vector_cosine_ops);

create or replace function public.set_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end; $$ language plpgsql;
drop trigger if exists trg_articles_updated on public.articles;
create trigger trg_articles_updated before update on public.articles
  for each row execute function public.set_updated_at();

-- RLS: herkes okur, yalnızca service_role yazar
alter table public.articles enable row level security;
alter table public.sources enable row level security;
drop policy if exists articles_read on public.articles;
create policy articles_read on public.articles for select to anon, authenticated using (true);
drop policy if exists articles_service on public.articles;
create policy articles_service on public.articles for all to service_role using (true) with check (true);
drop policy if exists sources_read on public.sources;
create policy sources_read on public.sources for select to anon, authenticated using (true);
drop policy if exists sources_service on public.sources;
create policy sources_service on public.sources for all to service_role using (true) with check (true);

create or replace function public.increment_view_count(article_id uuid) returns void as $$
begin update public.articles set view_count = view_count + 1 where id = article_id; end;
$$ language plpgsql security definer;

-- Anlamsal mükerrer tespiti
create or replace function public.match_articles_by_embedding(query_embedding vector(768), match_count int default 5)
returns table (id uuid, title text, slug text, distance float)
language sql stable security definer set search_path = public as $$
  select a.id, a.title_src, a.slug, (a.embedding <=> query_embedding)
  from public.articles a where a.embedding is not null
  order by a.embedding <=> query_embedding limit match_count;
$$;

-- RAG chatbot bağlamı (varsayılan son 7 gün)
create or replace function public.match_articles_for_rag(query_embedding vector(768), match_count int default 6, day_range int default 7)
returns table (id uuid, slug text, title_fa text, title_tr text, summary_fa text, summary_tr text,
               title_src text, summary_src text, source_name text, source_name_tr text, source_url text,
               category news_category, published_at timestamptz, distance float)
language sql stable security definer set search_path = public as $$
  select a.id, a.slug, a.title_fa, a.title_tr, a.summary_fa, a.summary_tr, a.title_src, a.summary_src,
         a.source_name, a.source_name_tr, a.source_url, a.category, a.published_at,
         (a.embedding <=> query_embedding)
  from public.articles a
  where a.embedding is not null and a.published_at >= now() - (day_range || ' days')::interval
  order by a.embedding <=> query_embedding limit match_count;
$$;

grant execute on function public.match_articles_by_embedding(vector, int) to anon, authenticated, service_role;
grant execute on function public.match_articles_for_rag(vector, int, int) to anon, authenticated, service_role;

-- Kaynaklar (RSS adresleri canlı olarak test edilmiştir; README'deki doğrulama tablosuna bakın)
insert into public.sources (name, display_name, display_name_tr, rss_url, site_url, region, lang, use_proxy, active) values
 ('irna','ایرنا','IRNA','https://www.irna.ir/rss','https://www.irna.ir','iran','fa',false,true),
 ('isna','ایسنا','ISNA','https://www.isna.ir/rss','https://www.isna.ir','iran','fa',false,true),
 ('mehr','مهر','Mehr','https://www.mehrnews.com/rss','https://www.mehrnews.com','iran','fa',false,true),
 ('khabaronline','خبرآنلاین','Khabaronline','https://www.khabaronline.ir/rss','https://www.khabaronline.ir','iran','fa',false,true),
 ('tabnak','تابناک','Tabnak','https://www.tabnak.ir/fa/rss/allnews','https://www.tabnak.ir','iran','fa',false,true),
 ('hamshahri','همشهری','Hamşehri','https://www.hamshahrionline.ir/rss','https://www.hamshahrionline.ir','iran','fa',false,true),
 ('yjc','باشگاه خبرنگاران جوان','YJC','https://www.yjc.ir/fa/rss/allnews','https://www.yjc.ir','iran','fa',false,true),
 ('donya-e-eqtesad','دنیای اقتصاد','Donya-e Eqtesad','https://donya-e-eqtesad.com/rss','https://donya-e-eqtesad.com','iran','fa',false,true),
 -- Yurtdışından erişilemediği için test sırasında doğrulanamadı: proxy kurulunca active=true yapın
 ('tasnim','تسنیم','Tasnim','https://www.tasnimnews.com/fa/rss/feed/0/7/0/','https://www.tasnimnews.com','iran','fa',true,false),
 ('fars','فارس','Fars','https://www.farsnews.ir/rss','https://www.farsnews.ir','iran','fa',true,false),
 -- Yurtdışı sekmesi
 ('bbc-persian','بی‌بی‌سی فارسی','BBC Farsça','https://feeds.bbci.co.uk/persian/rss.xml','https://www.bbc.com/persian','intl','fa',false,true),
 ('dw-persian','دویچه وله فارسی','DW Farsça','https://rss.dw.com/rdf/rss-per-all','https://www.dw.com/fa-ir','intl','fa',false,true),
 ('euronews-persian','یورونیوز فارسی','Euronews Farsça','https://parsi.euronews.com/rss','https://parsi.euronews.com','intl','fa',false,true),
 ('bbc-world','BBC World','BBC World','https://feeds.bbci.co.uk/news/world/rss.xml','https://www.bbc.com/news/world','intl','en',false,true),
 ('aljazeera-en','Al Jazeera','Al Jazeera','https://www.aljazeera.com/xml/rss/all.xml','https://www.aljazeera.com','intl','en',false,true),
 ('dw-en','DW News','DW News','https://rss.dw.com/rdf/rss-en-world','https://www.dw.com','intl','en',false,true)
on conflict (rss_url) do nothing;
