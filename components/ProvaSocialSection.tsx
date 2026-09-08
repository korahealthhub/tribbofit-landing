'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(useGSAP, ScrollTrigger);

const reviews = [
  { name: 'Caio',   title: 'Excelente navegabilidade!',       text: 'Ajudando muito a controlar a rotina.' },
  { name: 'Carol',  title: 'Muito bom app!',                  text: 'Está me ajudando na rotina de dieta e treinos. Parabéns!' },
  { name: 'Andre',  title: 'O melhor que usei até agora!',    text: 'Excelente app!' },
  { name: 'Bianca', title: 'Simplesmente insano!',            text: 'App resolveu todas as dores de cabeça que envolvem o mundo da academia e alimentação.' },
  { name: 'Monica', title: 'Aplicativo excelente',            text: 'Consigo manter minha rotina com mais facilidade. E o mais legal é poder participar da construção das novas versões e melhorias.' },
  { name: 'Carla',  title: 'Muito bom o app',                 text: 'Ansiosa aguardando pela versão que conecta com profissionais e outros usuários.' },
  { name: 'Roberto Rosa', title: 'Larguei 9 anos de banco pelo Tribbo', text: 'Porque eu também não conseguia manter uma rotina e não encontrei nenhum app que resolvesse isso de verdade.', badge: 'Fundador' },
  { name: 'Thiago', title: 'Curti o app!', text: 'Muito bom para treino e acompanhamento de carga, tem algumas melhorias que solicitei, mas nada que me impactou de usar e ter resultados.' },
];

const CARD_W = 272;
const CARD_GAP = 12;

export default function ProvaSocialSection() {
  const ref      = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const goTo = useCallback((idx: number) => {
    setActive(idx);
    trackRef.current?.scrollTo({ left: idx * (CARD_W + CARD_GAP), behavior: 'smooth' });
  }, []);

  // auto-advance
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setActive(prev => {
        const next = (prev + 1) % reviews.length;
        trackRef.current?.scrollTo({ left: next * (CARD_W + CARD_GAP), behavior: 'smooth' });
        return next;
      });
    }, 3400);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  // sync dot on manual swipe
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const onScroll = () => setActive(Math.round(track.scrollLeft / (CARD_W + CARD_GAP)));
    track.addEventListener('scroll', onScroll, { passive: true });
    return () => track.removeEventListener('scroll', onScroll);
  }, []);

  useGSAP(() => {
    gsap.from('.prova-h2',     { opacity: 0, y: 28,  duration: 0.65, ease: 'power2.out', scrollTrigger: { trigger: ref.current,      start: 'top 80%', once: true } });
    gsap.from('.prova-track',  { opacity: 0, y: 24,  duration: 0.60, ease: 'power2.out', scrollTrigger: { trigger: '.prova-track',    start: 'top 86%', once: true } });
  }, { scope: ref });

  return (
    <section ref={ref} className="theme-dark" style={{ padding: '40px 0 64px', background: 'var(--bg)', color: 'var(--text)' }}>

      <div className="prova-inner">
      <h2 className="prova-h2" style={{ fontFamily: 'var(--font-display)', fontSize: 26, lineHeight: 1.05, fontWeight: 800, letterSpacing: '-0.02em', textTransform: 'uppercase', margin: '0 0 22px', textWrap: 'balance' } as React.CSSProperties}>
        O que pessoas como você estão dizendo
      </h2>

      {/* dots */}
      <div className="prova-dots" style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 16 }}>
        {reviews.map((_, i) => (
          <button key={i} onClick={() => goTo(i)} style={{
            width: i === active ? 20 : 7, height: 7,
            borderRadius: 99, border: 'none', cursor: 'pointer', padding: 0,
            background: i === active ? 'var(--kora-teal-400)' : 'rgba(255,255,255,0.22)',
            transition: 'width 0.25s ease, background 0.25s ease',
          }} />
        ))}
      </div>

      {/* carousel */}
      <div
        ref={trackRef}
        className="prova-track"
        style={{
          display: 'flex', gap: CARD_GAP,
          overflowX: 'auto', scrollSnapType: 'x mandatory',
          scrollbarWidth: 'none' as const,
          padding: '4px 24px 8px',
        }}
      >
        {reviews.map((r, i) => (
          <div key={i} style={{
            flexShrink: 0, width: CARD_W,
            scrollSnapAlign: 'start',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            padding: 20,
          }}>
            {/* top row: title + name */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 15, color: '#fff', lineHeight: 1.25, letterSpacing: '-0.01em' }}>
                {r.title}
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', flexShrink: 0, gap: 3 }}>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', fontWeight: 600, fontFamily: 'var(--font-body)' }}>
                  {r.name}
                </span>
                {'badge' in r && r.badge && (
                  <span style={{ fontSize: 10, color: 'var(--kora-teal-300)', fontFamily: 'var(--font-body)', fontWeight: 600, letterSpacing: '0.04em' }}>
                    {r.badge as string}
                  </span>
                )}
              </div>
            </div>
            {/* stars */}
            <div style={{ display: 'flex', gap: 3, marginBottom: 12 }}>
              {Array.from({ length: 5 }).map((_, si) => (
                <svg key={si} width="13" height="13" viewBox="0 0 24 24" fill="#FBBF24" stroke="none">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                </svg>
              ))}
            </div>
            {/* review text */}
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.68)', lineHeight: 1.6, margin: 0 }}>
              "{r.text}"
            </p>
          </div>
        ))}
      </div>
      </div>

    </section>
  );
}
