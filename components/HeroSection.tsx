'use client';

import { useRef, useEffect, useState } from 'react';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useDownloadUrl } from '@/hooks/useDownloadUrl';

gsap.registerPlugin(useGSAP, ScrollTrigger);


export default function HeroSection() {
  const ref         = useRef<HTMLElement>(null);
  const mockupRef   = useRef<HTMLDivElement>(null);
  const videoRef    = useRef<HTMLVideoElement>(null);
  const downloadUrl = useDownloadUrl();
  const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

  // Começa como true (imagem) e só troca para false (vídeo) após confirmar que não é TikTok.
  // Evita que o TikTok in-app browser capture o elemento <video> no render inicial.
  const [showVideo, setShowVideo] = useState(false);
  useEffect(() => {
    const isTikTok = /musical_ly|TikTok|BytedanceWebview|ByteLocale|aweme/i.test(navigator.userAgent);
    if (!isTikTok) setShowVideo(true);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.play().catch(() => {});
    const onVisibility = () => { if (document.visibilityState === 'visible') video.play().catch(() => {}); };
    document.addEventListener('visibilitychange', onVisibility);
    // iOS às vezes pausa ao voltar ao foco — força play no touchstart também
    const onTouch = () => { if (video.paused) video.play().catch(() => {}); };
    document.addEventListener('touchstart', onTouch, { once: true });
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      document.removeEventListener('touchstart', onTouch);
    };
  }, []);

  useGSAP(() => {
    /* Video subtle zoom-out on scroll */
    gsap.fromTo(videoRef.current,
      { scale: 1.08 },
      {
        scale: 1.0, ease: 'none',
        scrollTrigger: { trigger: ref.current, start: 'top top', end: 'bottom top', scrub: 1.2 },
      }
    );

    /* Content entrance */
    const tl = gsap.timeline({ defaults: { ease: 'power2.out' } });
    tl.from('.hero-eyebrow', { opacity: 0, y: 16, duration: 0.5 })
      .from('.hero-h1',      { opacity: 0, y: 28, duration: 0.65 }, '-=0.2')
      .from('.hero-sub',     { opacity: 0, y: 20, duration: 0.5  }, '-=0.3')
      .from('.hero-cta',     { opacity: 0, scale: 0.88, duration: 0.55, ease: 'back.out(1.6)' }, '-=0.2')
      .from('.hero-meta',    { opacity: 0, y: 10, duration: 0.4 }, '-=0.1')
      .from(mockupRef.current, { opacity: 0, y: 44, scale: 0.92, duration: 0.9, ease: 'power3.out' }, '-=0.5');

    /* Float loop */
    gsap.to(mockupRef.current, {
      y: -10, yoyo: true, repeat: -1, duration: 3.2, ease: 'sine.inOut', delay: 1.4,
      force3D: true,
    });
  }, { scope: ref });

  return (
    <section
      ref={ref}
      className="theme-dark"
      style={{ position: 'relative', minHeight: '100svh', overflow: 'hidden', color: '#fff' }}
    >
      {/* ── Background: imagem por padrão; vídeo só após confirmar que não é TikTok ── */}
      <img
        src={`${BASE}/uploads/hero-poster.jpg`}
        alt=""
        aria-hidden="true"
        style={{
          position: 'absolute', inset: 0,
          width: '100%', height: '100%',
          objectFit: 'cover',
          zIndex: 0,
        }}
      />
      {showVideo && (
        <video
          ref={videoRef}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          disablePictureInPicture
          controlsList="nodownload nofullscreen noremoteplayback"
          style={{
            position: 'absolute', inset: 0,
            width: '100%', height: '100%',
            objectFit: 'cover',
            transformOrigin: 'center center',
            zIndex: 0,
            pointerEvents: 'none',
          }}
        >
          <source src={`${BASE}/uploads/hero-video.mp4`} type="video/mp4" />
        </video>
      )}

      {/* ── Layered overlays for depth + readability ── */}
      {/* 1. Base dark wash */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 1, background: 'rgba(10,25,32,0.52)', pointerEvents: 'none' }} />
      {/* 2. Teal tint at top (brand identity) */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 1, background: 'linear-gradient(160deg, rgba(226,244,8,0.14) 0%, transparent 50%)', pointerEvents: 'none' }} />
      {/* 3. Bottom fade to next section */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 160, zIndex: 1, background: 'linear-gradient(to bottom, transparent, var(--kora-cream-100))', pointerEvents: 'none' }} />

      {/* ── Content ── */}
      <div style={{ position: 'relative', zIndex: 2 }}>

        {/* Eyebrow / logo row */}
        <div className="hero-eyebrow" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '52px 24px 0', marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <img src={`${BASE}/uploads/app-icon.jpg`} alt="Tribbo Fit" style={{ width: 30, height: 30, borderRadius: 8, objectFit: 'cover' }} />
            <img src={`${BASE}/uploads/nome-kora.jpg`} alt="Tribbo Fit" style={{ height: 13, objectFit: 'contain', mixBlendMode: 'screen', filter: 'brightness(1.4)' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {[
              { href: 'https://tribbofit.com.br', label: 'Início', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z"/><path d="M9 21V12h6v9"/></svg> },
              { href: 'https://www.instagram.com/meu.kora/', label: 'Instagram', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="0.5" fill="#fff" stroke="none"/></svg> },
              { href: 'https://www.tiktok.com/@meu.kora?lang=pt-BR', label: 'TikTok', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="#fff" stroke="none"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.17 8.17 0 0 0 4.78 1.52V6.75a4.85 4.85 0 0 1-1.01-.06z"/></svg> },
            ].map(({ href, label, icon }) => (
              <a key={label} href={href} target={href === '#' ? undefined : '_blank'} rel="noopener noreferrer" aria-label={label} style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>
                {icon}
              </a>
            ))}
          </div>
        </div>

        {/* Hero body — 2-col grid on desktop */}
        <div className="hero-body" style={{ padding: '28px 24px 48px' }}>

          {/* Text column */}
          <div className="hero-text">
            <h1
              className="hero-h1"
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 38, lineHeight: 0.95,
                fontWeight: 800, letterSpacing: '-0.03em',
                textTransform: 'uppercase',
                margin: '0 0 18px',
                textWrap: 'balance',
                textShadow: '0 2px 24px rgba(0,0,0,0.4)',
              } as React.CSSProperties}
            >
              Pare de recomeçar toda segunda.
            </h1>

            <p
              className="hero-sub"
              style={{
                fontSize: 17, color: 'rgba(255,255,255,0.72)',
                lineHeight: 1.6, margin: '0 0 28px', maxWidth: 320,
                fontFamily: 'var(--font-body)',
              }}
            >
              Treino, alimentação, hidratação, sono, humor e disposição em um só lugar. Com um Coach IA que não deixa você parar.
            </p>

            <a
              href={downloadUrl}
              className="hero-cta cta-btn"
              style={{ maxWidth: 300, margin: '0 auto' }}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                if (downloadUrl.includes('apps.apple.com')) {
                  (window as any).gtag?.('event', 'click_appstore', { event_category: 'conversion', event_label: 'app_store_ios' });
                  (window as any).ttq?.track('ClickButton', { contents: [{ content_id: 'app_store_ios', content_type: 'app', content_name: 'Kora iOS App Store' }] });
                }
              }}
            >
              Baixar grátis
            </a>

            <div className="hero-meta" style={{ display: 'flex', gap: 20, marginTop: 20, alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: 'var(--font-body)' }}>Nota dos usuários</span>
                <span style={{ fontSize: 22, fontWeight: 800, color: '#fff', fontFamily: 'var(--font-display)', letterSpacing: '-0.02em', lineHeight: 1 }}>4.9 / 5.0</span>
                <div style={{ display: 'flex', gap: 2 }}>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <span key={i} style={{ fontSize: 13, color: '#FBBF24' }}>★</span>
                  ))}
                </div>
              </div>
              <div style={{ width: 1, height: 48, background: 'rgba(255,255,255,0.12)' }} />
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: 'var(--font-body)' }}>Usuários ativos</span>
                <span style={{ fontSize: 22, fontWeight: 800, color: '#fff', fontFamily: 'var(--font-display)', letterSpacing: '-0.02em', lineHeight: 1 }}>10k+</span>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-body)' }}>e crescendo</span>
              </div>
            </div>
          </div>

          {/* Mockup column */}
          <div ref={mockupRef} className="hero-mockup" style={{ marginTop: 32, display: 'flex', justifyContent: 'center' }}>
            <img
              src={`${BASE}/uploads/iphone-mockup.png`}
              alt="Tribbo app"
              style={{
                width: '88%',
                maxWidth: 320,
                display: 'block',
                filter: 'drop-shadow(0 32px 64px rgba(0,0,0,0.5))',
              }}
            />
          </div>

        </div>
      </div>
    </section>
  );
}
