'use client';

import { useRef } from 'react';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(useGSAP, ScrollTrigger);

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

const pillars = [
  {
    name: 'Treino', sub: 'Força e movimento', score: 91,
    color: '#FB923C', barColor: 'linear-gradient(90deg,#FB923C,#FED7AA)',
    img: `${BASE}/uploads/pillar-treino.jpg`,
    placeholder: 'linear-gradient(160deg,#1a0800,#3d1800,#5c2a00)',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FB923C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6.5 6.5 11 11"/><path d="m21 21-1-1"/><path d="m3 3 1 1"/><path d="m18 22 4-4"/><path d="m2 6 4-4"/><path d="m3 10 7-7"/><path d="m14 21 7-7"/></svg>,
  },
  {
    name: 'Nutrição', sub: 'Alimentação real', score: 76,
    color: '#FBBF24', barColor: 'linear-gradient(90deg,#FBBF24,#FDE68A)',
    img: `${BASE}/uploads/pillar-alimentacao.jpg`,
    placeholder: 'linear-gradient(160deg,#1a1000,#3d2800,#5c3d00)',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FBBF24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4Z"/><line x1="6" y1="2" x2="6" y2="4"/><line x1="10" y1="2" x2="10" y2="4"/><line x1="14" y1="2" x2="14" y2="4"/></svg>,
  },
  {
    name: 'Sono', sub: 'Qualidade e ritmo', score: 82,
    color: '#A78BFA', barColor: 'linear-gradient(90deg,#A78BFA,#C4B5FD)',
    img: `${BASE}/uploads/pillar-sono.jpg`,
    placeholder: 'linear-gradient(160deg,#1a0533,#3b1a6b,#2d1155)',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#A78BFA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>,
  },
  {
    name: 'Hidratação', sub: 'Água no ritmo', score: 78,
    color: '#38BDF8', barColor: 'linear-gradient(90deg,#38BDF8,#BAE6FD)',
    img: `${BASE}/uploads/pillar-hidratacao.jpg`,
    placeholder: 'linear-gradient(160deg,#000d1a,#001a33,#002244)',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#38BDF8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7Z"/></svg>,
  },
  {
    name: 'Humor', sub: 'Como você se sente', score: 88,
    color: '#F472B6', barColor: 'linear-gradient(90deg,#F472B6,#FBCFE8)',
    img: `${BASE}/uploads/pillar-humor.jpg`,
    placeholder: 'linear-gradient(160deg,#1a001a,#33003d,#4d0033)',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F472B6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>,
  },
  {
    name: 'Disposição', sub: 'Energia do dia', score: 84,
    color: '#34D399', barColor: 'linear-gradient(90deg,#34D399,#A7F3D0)',
    img: `${BASE}/uploads/pillar-disposicao.jpg`,
    placeholder: 'linear-gradient(160deg,#001a0d,#003320,#004d30)',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#34D399" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>,
  },
];

export default function MecanismoSection() {
  const ref = useRef<HTMLElement>(null);

  useGSAP(() => {
    gsap.from('.mec-header', {
      opacity: 0, y: 32, duration: 0.7, ease: 'power2.out',
      scrollTrigger: { trigger: ref.current, start: 'top 80%', once: true },
    });
    gsap.from('.pillar-card', {
      opacity: 0, scale: 0.88, y: 22, duration: 0.55, ease: 'back.out(1.4)',
      stagger: { amount: 0.6, from: 'start' },
      scrollTrigger: { trigger: '.pillars-grid', start: 'top 82%', once: true },
    });
    gsap.to('.mec-glow', {
      y: 60, ease: 'none',
      scrollTrigger: { trigger: ref.current, start: 'top bottom', end: 'bottom top', scrub: 2 },
    });

    /* Hover lift — desktop only (mobile usa CSS :active) */
    const cards = ref.current?.querySelectorAll('.pillar-card') ?? [];
    cards.forEach(card => {
      const enter = () => gsap.to(card, { scale: 1.04, y: -6, duration: 0.3, ease: 'power2.out' });
      const leave = () => gsap.to(card, { scale: 1,    y:  0, duration: 0.4, ease: 'power2.inOut' });
      card.addEventListener('mouseenter', enter);
      card.addEventListener('mouseleave', leave);
    });
  }, { scope: ref });

  return (
    <section
      ref={ref}
      style={{ position: 'relative', padding: '64px 24px', overflow: 'hidden', background: 'var(--kora-cream-100)', color: 'var(--kora-ink-900)' }}
    >
      <div className="mec-glow" style={{ position: 'absolute', top: '40%', left: '50%', transform: 'translateX(-50%)', width: 460, height: 460, background: 'radial-gradient(circle,color-mix(in srgb,#E2F408 13%,transparent),transparent 65%)', pointerEvents: 'none' }} />

      <div className="mec-inner" style={{ position: 'relative' }}>
        <div className="mec-header">
          <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--kora-teal-500)', textTransform: 'uppercase', marginBottom: 14 }}>O mecanismo</div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 30, lineHeight: 1, fontWeight: 800, letterSpacing: '-0.02em', textTransform: 'uppercase', margin: '0 0 12px', textWrap: 'balance' } as React.CSSProperties}>
            Ecossistema de saúde integrada, no seu bolso.
          </h2>
          <p style={{ fontSize: 15, color: 'var(--kora-grey-500)', margin: '0 0 32px', maxWidth: 360, lineHeight: 1.6 }}>
            Você não falha por falta de disciplina. Falha porque trata treino, dieta e sono como projetos separados. O Tribbo conecta os 6 pilares da sua saúde num Score diário de 0 a 100.
          </p>
        </div>

        <div className="pillars-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 0 }}>
          {pillars.map(({ name, sub, score, color, barColor, img, placeholder, icon }, i) => (
            <div
              key={i}
              className="pillar-card"
              style={{
                position: 'relative',
                borderRadius: 18,
                overflow: 'hidden',
                aspectRatio: '3/4',
                background: placeholder,
                cursor: 'default',
              }}
            >
              {/* Photo */}
              <img
                src={img}
                alt={name}
                loading="lazy"
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }}
                onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
              />

              {/* Gradient overlay */}
              <div style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(to bottom, transparent 35%, rgba(0,0,0,0.55) 65%, rgba(0,0,0,0.88) 100%)',
              }} />

              {/* Bottom content */}
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '10px 12px 0' }}>
                {/* Icon + name + score row */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, marginBottom: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <div style={{
                      width: 30, height: 30, borderRadius: '50%',
                      background: `color-mix(in srgb,${color} 22%,rgba(0,0,0,0.5))`,
                      border: `1.5px solid color-mix(in srgb,${color} 55%,transparent)`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      {icon}
                    </div>
                    <div>
                      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, color: '#fff', lineHeight: 1.1, letterSpacing: '-0.01em' }}>{name}</div>
                      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', marginTop: 1 }}>{sub}</div>
                    </div>
                  </div>
                  <div style={{
                    background: `color-mix(in srgb,${color} 22%,rgba(0,0,0,0.5))`,
                    border: `1.5px solid color-mix(in srgb,${color} 50%,transparent)`,
                    borderRadius: 20, padding: '3px 8px',
                    fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 11, color: color,
                    whiteSpace: 'nowrap', flexShrink: 0,
                  }}>
                    {score}/100
                  </div>
                </div>

                {/* Accent bar */}
                <div style={{ height: 3, borderRadius: '2px 2px 0 0', background: barColor, opacity: 0.9 }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
