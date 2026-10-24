import type { ReactNode } from 'react';

/**
 * Kesintisiz kayan şerit (saf CSS). İçerik iki kez render edilir; animasyon -50% kayar ve başa sarar.
 * Kapsayıcı dir=ltr tutulur (RTL'de translateX yönü bozulmasın); fa'da şerit sağa doğru akar.
 * Dokununca/üzerine gelince durur. Kasıtlı olarak prefers-reduced-motion ile kapatılmaz:
 * Android "animasyonları kaldır" ayarı açıkken de şeridin kayması beklenir.
 */
export function Marquee({ children, rtl = false, seconds = 40 }: { children: ReactNode; rtl?: boolean; seconds?: number }) {
  return (
    <div className="marquee" dir="ltr">
      <div className={`marquee-track ${rtl ? 'marquee-rtl' : ''}`} style={{ animationDuration: `${seconds}s` }}>
        <div className="marquee-set" dir={rtl ? 'rtl' : 'ltr'}>{children}</div>
        <div className="marquee-set" dir={rtl ? 'rtl' : 'ltr'} aria-hidden="true">{children}</div>
      </div>
    </div>
  );
}
