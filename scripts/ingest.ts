import { runIngest } from '../lib/news/ingest';

runIngest().then((s) => { console.log(JSON.stringify(s, null, 2)); process.exit(s.status === 'ok' ? 0 : 1); });
