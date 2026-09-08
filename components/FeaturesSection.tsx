'use client';

import React, { useRef, useState, useEffect } from 'react';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(useGSAP, ScrollTrigger);

const bullets = [
  { label: 'Saiba exatamente o que treinar', sub: 'Academia, casa ou peso do corpo', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6.5 6.5 11 11"/><path d="m21 21-1-1"/><path d="m3 3 1 1"/><path d="m18 22 4-4"/><path d="m2 6 4-4"/><path d="m3 10 7-7"/><path d="m14 21 7-7"/></svg> },
  { label: 'Saiba exatamente o que está comendo', sub: 'Macros e calorias do dia organizados', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg> },
  { label: 'Registre refeições em segundos', sub: 'Só tirando uma foto do prato', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3Z"/><circle cx="12" cy="13" r="3"/></svg> },
  { label: 'Check-in diário em 2 minutos', sub: 'Sono, humor e disposição', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="m9 12 2 2 4-4"/></svg> },
  { label: 'Acompanhe sua evolução', sub: 'Séries, cargas e progresso semanal', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg> },
  { label: 'Coach IA no seu bolso', sub: 'Tira dúvidas e monitora sua rotina', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg> },
];

function ChromaKeyVideo({ src }: { src: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) video.play().catch(() => {}); },
      { threshold: 0.1 }
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  return (
    <div style={{ display: 'flex', justifyContent: 'center', marginTop: 24 }}>
      <video
        ref={videoRef}
        autoPlay loop muted playsInline preload="auto"
        style={{ width: '90%', display: 'block', borderRadius: 16 }}
      >
        <source src={`${src}.mp4`} type="video/mp4" />
      </video>
    </div>
  );
}

const CARD_W = 148;
const CARD_GAP = 10;
const CARD_STEP = CARD_W + CARD_GAP;

function ExerciseCarousel({ gifs }: { gifs: string[] }) {
  const [current, setCurrent] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const userScrolling = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const scrollTo = (idx: number) => {
    scrollRef.current?.scrollTo({ left: idx * CARD_STEP, behavior: 'smooth' });
  };

  const startAuto = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      if (userScrolling.current) return;
      setCurrent(prev => {
        const next = (prev + 1) % gifs.length;
        scrollRef.current?.scrollTo({ left: next * CARD_STEP, behavior: 'smooth' });
        return next;
      });
    }, 2800);
  };

  useEffect(() => {
    startAuto();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [gifs.length]);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const idx = Math.min(
      Math.round(scrollRef.current.scrollLeft / CARD_STEP),
      gifs.length - 1,
    );
    setCurrent(idx);
  };

  const onTouchStart = () => { userScrolling.current = true; };
  const onTouchEnd = () => {
    userScrolling.current = false;
    startAuto();
  };

  return (
    <div className="exercise-carousel-outer" style={{ margin: '20px -24px 0' }}>
      <div
        ref={scrollRef}
        className="exercise-scroll-inner"
        onScroll={handleScroll}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        style={{
          display: 'flex',
          gap: CARD_GAP,
          overflowX: 'auto',
          padding: '0 24px 4px',
          scrollSnapType: 'x mandatory',
          WebkitOverflowScrolling: 'touch',
          msOverflowStyle: 'none',
          scrollbarWidth: 'none',
        } as React.CSSProperties}
      >
        {gifs.map((src, i) => (
          <div
            key={src + i}
            style={{
              flexShrink: 0,
              width: CARD_W,
              height: 175,
              borderRadius: 'var(--radius-md)',
              overflow: 'hidden',
              scrollSnapAlign: 'start',
              background: '#fff',
              border: '1px solid var(--kora-cream-300)',
            }}
          >
            <img
              src={src}
              alt={`Exercício ${i + 1}`}
              loading="lazy"
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          </div>
        ))}
      </div>

      {/* Dots */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 14 }}>
        {gifs.map((_, i) => (
          <button
            key={i}
            onClick={() => { scrollTo(i); setCurrent(i); }}
            style={{
              width: i === current ? 22 : 6,
              height: 6,
              borderRadius: 999,
              background: i === current ? 'var(--kora-teal-400)' : 'var(--kora-cream-300)',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              transition: 'all 0.3s ease',
            }}
          />
        ))}
      </div>
    </div>
  );
}

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

export default function FeaturesSection() {
  const ref = useRef<HTMLElement>(null);

  useGSAP(() => {
    gsap.from('.feat-header', {
      opacity: 0, y: 28, duration: 0.65, ease: 'power2.out',
      scrollTrigger: { trigger: ref.current, start: 'top 80%', once: true },
    });
    document.querySelectorAll('.feat-bullet').forEach((item) => {
      gsap.from(item, {
        opacity: 0, x: -20, duration: 0.5, ease: 'power2.out',
        scrollTrigger: { trigger: item, start: 'top 90%', once: true },
      });
    });
    document.querySelectorAll('.feat-block').forEach((block) => {
      gsap.from(block.querySelector('.feat-block-img'), {
        opacity: 0, y: 40, scale: 0.95, duration: 0.8, ease: 'power2.out',
        scrollTrigger: { trigger: block, start: 'top 84%', once: true },
      });
      gsap.from(block.querySelector('.feat-block-text'), {
        opacity: 0, y: 24, duration: 0.6, ease: 'power2.out', delay: 0.15,
        scrollTrigger: { trigger: block, start: 'top 84%', once: true },
      });
    });
  }, { scope: ref });

  return (
    <section ref={ref} className="feat-section" style={{ color: 'var(--text)' }}>

      {/* ── Bullet list — fundo escuro ── */}
      <div className="theme-dark" style={{ padding: '48px 24px 52px', background: 'var(--kora-ink-900)' }}>
        <div className="feat-inner-dark">
        <div className="feat-header">
          <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--kora-teal-300)', textTransform: 'uppercase', marginBottom: 14 }}>Dentro do app</div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 30, lineHeight: 1, fontWeight: 800, letterSpacing: '-0.02em', textTransform: 'uppercase', margin: '0 0 28px', color: '#fff', textWrap: 'balance' } as React.CSSProperties}>
            Feito pra você manter a constância na rotina
          </h2>
        </div>

        <div className="feat-bullets" style={{ display: 'flex', flexDirection: 'column' }}>
          {bullets.map((b, i) => (
            <div key={i} className="feat-bullet" style={{
              display: 'flex', alignItems: 'center', gap: 14,
              padding: '20px 0',
              borderBottom: i < bullets.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: 9, flexShrink: 0,
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff',
              }}>
                {b.icon}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 700, color: '#fff', letterSpacing: '-0.01em', lineHeight: 1.2 }}>
                  {b.label}
                </span>
                <span style={{ fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 400, color: 'rgba(255,255,255,0.45)', lineHeight: 1.4 }}>
                  {b.sub}
                </span>
              </div>
            </div>
          ))}
        </div>
        </div>
      </div>

      {/* ── Blocos Treino / Alimentação / Coach IA — fundo creme ── */}
      <div style={{ paddingTop: 52, paddingBottom: 64, background: 'var(--kora-cream-100)' }}>
        <div className="feat-inner-cream" style={{ display: 'flex', flexDirection: 'column', gap: 52, padding: '0 24px' }}>
        {[
          {
            src: '',
            tagColor: '#FB923C',
            tag: 'TREINO',
            h3: 'Treine do seu jeito. Onde você estiver.',
            desc: 'Na academia, em casa ou usando apenas o peso do corpo. O Tribbo adapta seu treino à sua rotina, aos equipamentos disponíveis e ao seu objetivo.',
            grad: 'rgba(251,146,60,0.14)',
            photos: [
              { src: `${BASE}/uploads/treino-academia.jpg`, label: 'Academia' },
              { src: `${BASE}/uploads/treino-casa.jpg`,     label: 'Em casa'  },
              { src: `${BASE}/uploads/treino-ar-livre.jpg`, label: 'Ar livre' },
            ] as { src: string; label: string }[],
            exerciseBlock: {
              title: 'Mais de 1.300 exercícios com vídeo. Um plano feito pra você.',
              gifs: [
                `${BASE}/uploads/ex-1350.gif`,
                `${BASE}/uploads/ex-2327.gif`,
                `${BASE}/uploads/ex-3234.gif`,
                `${BASE}/uploads/ex-1258.gif`,
                `${BASE}/uploads/ex-3642.gif`,
                `${BASE}/uploads/ex-0832.gif`,
                `${BASE}/uploads/ex-0466.gif`,
                `${BASE}/uploads/ex-0448.gif`,
                `${BASE}/uploads/ex-3885.gif`,
                `${BASE}/uploads/ex-3666.gif`,
                `${BASE}/uploads/ex-3195.gif`,
                `${BASE}/uploads/ex-3198.gif`,
                `${BASE}/uploads/ex-4241.gif`,
                `${BASE}/uploads/ex-4240.gif`,
              ] as string[],
            },
          },
          {
            src: '',
            mockup: false,
            tagColor: '#FBBF24',
            tag: 'ALIMENTAÇÃO',
            belowImg: `${BASE}/uploads/nutricao-mockup.png`,
            photos: [] as { src: string; label: string }[],
            h3: 'Saiba exatamente o que está comendo, todo dia',
            desc: 'Importa o plano da sua nutricionista ou cria um do zero baseado no seu objetivo. Macros, calorias e refeições organizados.',
            grad: 'rgba(251,191,36,0.14)',
            nutFeatures: [
              {
                text: 'Sua meta de calorias, proteína, carbo e gordura calculada do zero pra você. A quantidade de água também.',
                icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FBBF24" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/></svg>,
              },
              {
                text: 'Registre cada refeição e veja seus macros atualizando em tempo real.',
                icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FBBF24" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="m9 14 2 2 4-4"/></svg>,
              },
            ],
          },
          {
            src: '',
            tagColor: '#EDFB6B',
            tag: 'COACH IA',
            belowVideo: `${BASE}/uploads/coach-ia`,
            coachFeatures: [
              {
                text: 'Registra refeições por foto ou texto',
                icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--kora-teal-400)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3Z"/><circle cx="12" cy="13" r="3"/></svg>,
              },
              {
                text: 'Sugere receitas alinhadas ao seu plano',
                icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--kora-teal-400)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/></svg>,
              },
              {
                text: 'Analisa sua evolução semana a semana',
                icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--kora-teal-400)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>,
              },
              {
                text: 'Responde dúvidas em segundos',
                icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--kora-teal-400)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
              },
              {
                text: 'Conselhos diários e semanais personalizados',
                icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--kora-teal-400)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>,
              },
            ],
            photos: [] as { src: string; label: string }[],
            h3: 'Registre refeições em segundos',
            desc: 'Só tira uma foto do prato. O Coach IA identifica os alimentos, estima as porções e registra por você.',
            grad: 'rgba(226,244,8,0.14)',
          },
        ].map((f) => (
          <div key={f.tag} className="feat-block">
            {f.src && ('mockup' in f && f.mockup ? (
              <div className="feat-block-img" style={{ display: 'flex', justifyContent: 'center', padding: '8px 0' }}>
                <img
                  src={f.src}
                  alt={f.h3}
                  style={{
                    width: '86%',
                    display: 'block',
                    filter: 'drop-shadow(0 24px 48px rgba(0,0,0,0.22))',
                  }}
                />
              </div>
            ) : (
              <div className="feat-block-img" style={{
                borderRadius: 'var(--radius-xl)', overflow: 'hidden',
                background: `linear-gradient(160deg,${f.grad},rgba(226,244,8,0.05))`,
                border: '1px solid var(--kora-cream-300)',
                aspectRatio: '20/23', position: 'relative',
              }}>
                <img src={f.src} alt={f.h3} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              </div>
            ))}
            <div className={`feat-block-text feat-block-${f.tag.toLowerCase()}`}>
              {/* Header — text column (left on desktop) */}
              <div className="feat-block-header">
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', color: f.tagColor, marginTop: 22 }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: f.tagColor }} />{f.tag}
                </div>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', textTransform: 'uppercase', margin: '8px 0', color: 'var(--kora-ink-900)' }}>
                  {f.h3}
                </h3>
                <p style={{ fontSize: 15, color: 'var(--kora-grey-500)', lineHeight: 1.55, margin: 0 }}>
                  {f.desc}
                </p>
                {'nutFeatures' in f && f.nutFeatures && (
                  <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column' }}>
                    {(f.nutFeatures as { icon: React.ReactNode; text: string }[]).map((item, i, arr) => (
                      <div key={i} style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '13px 0',
                        borderBottom: i < arr.length - 1 ? '1px solid var(--kora-cream-300)' : 'none',
                      }}>
                        <div style={{
                          width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                          background: 'rgba(251,191,36,0.10)',
                          border: '1px solid rgba(251,191,36,0.20)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          {item.icon}
                        </div>
                        <span style={{ fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 500, color: 'var(--kora-ink-900)', lineHeight: 1.35 }}>
                          {item.text}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                {'coachFeatures' in f && f.coachFeatures && (
                  <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column' }}>
                    {(f.coachFeatures as { icon: React.ReactNode; text: string }[]).map((item, i, arr) => (
                      <div key={i} style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '13px 0',
                        borderBottom: i < arr.length - 1 ? '1px solid var(--kora-cream-300)' : 'none',
                      }}>
                        <div style={{
                          width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                          background: 'rgba(226,244,8,0.10)',
                          border: '1px solid rgba(226,244,8,0.18)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 16,
                        }}>
                          {item.icon}
                        </div>
                        <span style={{ fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 500, color: 'var(--kora-ink-900)', lineHeight: 1.35 }}>
                          {item.text}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Visual — right column on desktop */}
              <div className="feat-block-visual">
                {'belowImg' in f && f.belowImg && (
                  <div style={{ marginTop: 24, display: 'flex', justifyContent: 'center' }}>
                    <img
                      src={f.belowImg as string}
                      alt={f.h3}
                      loading="lazy"
                      style={{ width: '90%', display: 'block', filter: 'drop-shadow(0 20px 40px rgba(0,0,0,0.20))' }}
                    />
                  </div>
                )}
                {'belowVideo' in f && f.belowVideo && (
                  <ChromaKeyVideo src={f.belowVideo as string} />
                )}
                {f.photos && f.photos.length > 0 && (
                  <div className="feat-photos-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginTop: 20 }}>
                    {f.photos.map((p) => (
                      <div key={p.src} className="feat-photo" style={{ borderRadius: 'var(--radius-md)', overflow: 'hidden', position: 'relative', aspectRatio: '3/4', background: 'var(--kora-cream-200)' }}>
                        <img src={p.src} alt={p.label} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '20px 8px 8px', background: 'linear-gradient(to top, rgba(10,25,32,0.72), transparent)' }}>
                          <span style={{ fontFamily: 'var(--font-body)', fontSize: 11, fontWeight: 700, color: '#fff', letterSpacing: '0.04em', textTransform: 'uppercase' }}>{p.label}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {'exerciseBlock' in f && f.exerciseBlock && (
                  <div style={{ marginTop: 32 }}>
                    <h3 style={{
                      fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 800,
                      letterSpacing: '-0.02em', textTransform: 'uppercase',
                      color: 'var(--kora-ink-900)', margin: '0 0 0', lineHeight: 1.15,
                      textWrap: 'balance',
                    } as React.CSSProperties}>
                      {f.exerciseBlock.title}
                    </h3>
                    <ExerciseCarousel gifs={f.exerciseBlock.gifs} />
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        </div>
      </div>

    </section>
  );
}
