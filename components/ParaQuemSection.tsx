'use client';

import { useRef } from 'react';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(useGSAP, ScrollTrigger);

export default function ParaQuemSection() {
  const ref = useRef<HTMLElement>(null);

  useGSAP(() => {
    gsap.from('.paraquem-title', { opacity: 0, y: 28, duration: 0.65, ease: 'power2.out', scrollTrigger: { trigger: ref.current, start: 'top 80%', once: true } });
    gsap.from('.paraquem-card', { opacity: 0, y: 32, scale: 0.96, duration: 0.6, ease: 'power2.out', stagger: 0.18, scrollTrigger: { trigger: '.paraquem-cards', start: 'top 82%', once: true } });
    gsap.from('.paraquem-check', { opacity: 0, x: -14, duration: 0.45, ease: 'power2.out', stagger: 0.12, scrollTrigger: { trigger: '.paraquem-cards', start: 'top 74%', once: true } });

  }, { scope: ref });

  return (
    <section ref={ref} style={{ padding: '56px 24px', background: 'var(--kora-cream-100)', color: 'var(--kora-ink-900)' }}>
      <div className="paraquem-inner">
      <h2 className="paraquem-title" style={{ fontFamily: 'var(--font-display)', fontSize: 30, lineHeight: 1, fontWeight: 800, letterSpacing: '-0.02em', textTransform: 'uppercase', margin: '0 0 28px', textWrap: 'balance' } as React.CSSProperties}>Feito para o seu momento:</h2>
      <div className="paraquem-cards" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className="paraquem-card" style={{ background: 'var(--kora-ink-900)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 'var(--radius-lg)', padding: 26 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 18, textTransform: 'uppercase', letterSpacing: '-0.03em', marginBottom: 6, color: '#fff', whiteSpace: 'nowrap' }}>Tenho plano de treino e dieta</div>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.55)', lineHeight: 1.55, margin: '0 0 18px' }}>
            Traga seus planos para o Tribbo e acompanhe tudo em um só lugar.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {[
              'Cadastre seu treino e acompanhe séries, cargas e evolução',
              'Organize seu plano alimentar e registre suas refeições',
              'Conecte sua rotina, hábitos e progresso todos os dias',
            ].map((text, i) => (
              <div key={i} className="paraquem-check" style={{
                display: 'flex', alignItems: 'flex-start', gap: 10,
                padding: '11px 0',
                borderBottom: i < 2 ? '1px solid rgba(255,255,255,0.08)' : 'none',
              }}>
                <div style={{
                  width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                  background: '#EDFB6B',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginTop: 2,
                }}>
                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2 6l3 3 5-5"/>
                  </svg>
                </div>
                <span style={{ fontSize: 15, color: 'rgba(255,255,255,0.88)', lineHeight: 1.5, fontFamily: 'var(--font-body)', fontWeight: 500 }}>
                  {text}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="paraquem-card" style={{ background: 'var(--kora-ink-900)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 'var(--radius-lg)', padding: 26 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 20, textTransform: 'uppercase', letterSpacing: '-0.01em', marginBottom: 6, color: '#fff' }}>Quero começar do zero</div>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.55)', lineHeight: 1.55, margin: '0 0 18px' }}>
            Conte seus objetivos e sua rotina. O Tribbo ajuda você a criar seus planos e saber o que fazer todos os dias.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {[
              'Treinos personalizados para seu objetivo e nível',
              'Plano alimentar adaptado às suas metas',
              'Coach IA para orientar e acompanhar sua evolução',
            ].map((text, i) => (
              <div key={i} className="paraquem-check" style={{
                display: 'flex', alignItems: 'flex-start', gap: 10,
                padding: '11px 0',
                borderBottom: i < 2 ? '1px solid rgba(255,255,255,0.08)' : 'none',
              }}>
                <div style={{
                  width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                  background: '#EDFB6B',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginTop: 2,
                }}>
                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2 6l3 3 5-5"/>
                  </svg>
                </div>
                <span style={{ fontSize: 15, color: 'rgba(255,255,255,0.88)', lineHeight: 1.5, fontFamily: 'var(--font-body)', fontWeight: 500 }}>
                  {text}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
      </div>
    </section>
  );
}
