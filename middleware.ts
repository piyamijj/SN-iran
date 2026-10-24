import { NextResponse, type NextRequest } from 'next/server';
import { DEFAULT_LANG, isLang } from '@/lib/i18n/config';

/** /fa ve /tr dışındaki yolları tercih edilen dile (çerez > Accept-Language > fa) yönlendirir. */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const first = pathname.split('/')[1];
  if (isLang(first)) {
    const res = NextResponse.next();
    if (request.cookies.get('lang')?.value !== first) res.cookies.set('lang', first, { path: '/', maxAge: 60 * 60 * 24 * 365 });
    return res;
  }
  const cookie = request.cookies.get('lang')?.value;
  const accept = request.headers.get('accept-language')?.toLowerCase() ?? '';
  const lang = isLang(cookie) ? cookie : accept.startsWith('tr') ? 'tr' : DEFAULT_LANG;
  const url = request.nextUrl.clone();
  url.pathname = `/${lang}${pathname === '/' ? '' : pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/((?!api|_next|feed\\.xml|sitemap\\.xml|robots\\.txt|favicon\\.ico|.*\\..*).*)'],
};
