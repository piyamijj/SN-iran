/** Kaynak RSS adreslerini canlı test eder: `npm run check-feeds` (proxy için RSS_PROXY_URL tanımlayın). */
import { fetchFeed } from '../lib/news/fetch-feed';

const FEEDS: [string, string, boolean][] = [
  ['irna', 'https://www.irna.ir/rss', false], ['isna', 'https://www.isna.ir/rss', false], ['mehr', 'https://www.mehrnews.com/rss', false],
  ['tasnim', 'https://www.tasnimnews.com/fa/rss/feed/0/7/0/', true], ['fars', 'https://www.farsnews.ir/rss', true],
  ['khabaronline', 'https://www.khabaronline.ir/rss', false], ['tabnak', 'https://www.tabnak.ir/fa/rss/allnews', false],
];
(async () => {
  for (const [name, url, proxy] of FEEDS) {
    try { const items = await fetchFeed(name, url, proxy); console.log(`OK   ${name}: ${items.length} öğe`); }
    catch (e) { console.log(`FAIL ${name}: ${e instanceof Error ? e.message : e}`); }
  }
})();
