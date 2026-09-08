'use client';

import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useDownloadUrl } from '@/hooks/useDownloadUrl';

gsap.registerPlugin(ScrollTrigger);

export default function StickyBar() {
  const barRef      = useRef<HTMLDivElement>(null);
  const downloadUrl = useDownloadUrl();
  const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;
    gsap.set(bar, { y: 80, opacity: 0 });
    ScrollTrigger.create({
      start: 560,
      onEnter:     () => gsap.to(bar, { y: 0, opacity: 1, duration: 0.4, ease: 'power2.out' }),
      onLeaveBack: () => gsap.to(bar, { y: 80, opacity: 0, duration: 0.3, ease: 'power2.in' }),
    });
  }, []);

  return (
    <div ref={barRef} style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 440, background: 'var(--kora-ink-900)', borderTop: '1px solid rgba(255,255,255,0.08)', padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 100 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <img src={`${BASE}/uploads/app-icon.jpg`} alt="Tribbo Fit" style={{ width: 36, height: 36, borderRadius: 9, objectFit: 'cover' }} />
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, color: 'var(--kora-cream-100)', letterSpacing: '-0.01em' }}>Tribbo</div>
        </div>
      </div>
      <a
        href={downloadUrl}
        target="_blank"
        rel="noopener noreferrer"
        style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'var(--kora-teal-400)', color: '#fff', fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 13, letterSpacing: '0.04em', padding: '10px 18px', borderRadius: 'var(--radius-pill)', textDecoration: 'none', whiteSpace: 'nowrap' }}
        onMouseEnter={e => (e.currentTarget.style.background = 'var(--kora-teal-300)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'var(--kora-teal-400)')}
        onClick={() => {
          if (downloadUrl.includes('apps.apple.com')) {
            (window as any).gtag?.('event', 'click_appstore', { event_category: 'conversion', event_label: 'app_store_ios' });
            (window as any).ttq?.track('ClickButton', { contents: [{ content_id: 'app_store_ios', content_type: 'app', content_name: 'Kora iOS App Store' }] });
          }
        }}
      >
        Download Grátis
      </a>
    </div>
  );
}
