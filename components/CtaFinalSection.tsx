'use client';

import { useRef, useState } from 'react';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useDownloadUrl } from '@/hooks/useDownloadUrl';

gsap.registerPlugin(useGSAP, ScrollTrigger);

const faqs = [
  { q: 'É grátis mesmo?', a: 'Sim. O Kora está 100% gratuito agora. Algumas features premium chegam em breve, mas tudo que está disponível hoje é grátis.' },
  { q: 'Preciso ter personal ou nutricionista?', a: 'Não. O Kora funciona para quem tem plano profissional e quer centralizá-lo, e para quem não tem nada e quer criar uma rotina do zero.' },
  { q: 'Funciona para treino em casa?', a: 'Sim. O app tem exercícios para academia, casa e peso do corpo. Você escolhe de acordo com o que tem disponível no dia.' },
  { q: 'Funciona para iniciante?', a: 'Sim. Foi feito para quem está começando agora e para quem já treina mas não consegue manter a constância.' },
  { q: 'Como o Coach IA funciona?', a: 'O Coach IA tira dúvidas sobre treino, alimentação e hábitos, registra suas refeições por foto ou mensagem e envia lembretes inteligentes para não deixar você esquecer nada.' },
  { q: 'Ainda tem dúvidas?', a: 'Fala com a gente pelo e-mail atendimento.app.kora@gmail.com. Respondemos o mais rápido possível.' },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  const answerRef  = useRef<HTMLDivElement>(null);
  const chevronRef = useRef<SVGSVGElement>(null);

  const toggle = () => {
    const el = answerRef.current;
    if (!el) return;
    if (!open) {
      gsap.set(el, { height: 'auto', opacity: 1 });
      const h = el.offsetHeight;
      gsap.fromTo(el, { height: 0, opacity: 0 }, { height: h, opacity: 1, duration: 0.3, ease: 'power2.out' });
      gsap.to(chevronRef.current, { rotation: 180, duration: 0.25, ease: 'power2.inOut' });
    } else {
      gsap.to(el, { height: 0, opacity: 0, duration: 0.25, ease: 'power2.in' });
      gsap.to(chevronRef.current, { rotation: 0, duration: 0.25, ease: 'power2.inOut' });
    }
    setOpen(!open);
  };

  return (
    <div style={{ background: 'var(--kora-cream-50)', border: '1px solid var(--kora-cream-300)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
      <button onClick={toggle} style={{ width: '100%', background: 'none', border: 'none', color: 'var(--kora-ink-900)', fontFamily: 'var(--font-body)', textAlign: 'left', padding: '18px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, fontSize: 15, fontWeight: 600 }}>
        <span>{q}</span>
        <svg ref={chevronRef} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--kora-teal-500)" strokeWidth="2.5" strokeLinecap="round" style={{ flexShrink: 0 }}>
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      <div ref={answerRef} style={{ overflow: 'hidden', height: 0, opacity: 0 }}>
        <div style={{ padding: '0 20px 18px', fontSize: 14, color: 'var(--kora-grey-500)', lineHeight: 1.55 }}>{a}</div>
      </div>
    </div>
  );
}

export default function CtaFinalSection() {
  const ref         = useRef<HTMLElement>(null);
  const ctaRef      = useRef<HTMLAnchorElement>(null);
  const downloadUrl = useDownloadUrl();
  const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

  useGSAP(() => {
    gsap.from('.cta-final-h2', { opacity: 0, y: 32, duration: 0.7, ease: 'power2.out', scrollTrigger: { trigger: ref.current, start: 'top 80%', once: true } });
    gsap.from(ctaRef.current, {
      opacity: 0, scale: 0.9, duration: 0.6, ease: 'back.out(1.5)',
      scrollTrigger: { trigger: ref.current, start: 'top 75%', once: true },
    });
    gsap.from('.faq-section', { opacity: 0, y: 24, duration: 0.6, ease: 'power2.out', scrollTrigger: { trigger: '.faq-section', start: 'top 85%', once: true } });
    gsap.from('.calc-section', { opacity: 0, y: 24, duration: 0.6, ease: 'power2.out', scrollTrigger: { trigger: '.calc-section', start: 'top 88%', once: true } });
    gsap.to('.cta-glow', { y: -60, ease: 'none', scrollTrigger: { trigger: ref.current, start: 'top bottom', end: 'bottom top', scrub: 1.5 } });
  }, { scope: ref });

  return (
    <section ref={ref} style={{ position: 'relative', padding: '64px 24px 100px', overflow: 'hidden', background: 'var(--kora-cream-100)', color: 'var(--kora-ink-900)' }}>
      <div className="cta-glow" style={{ position: 'absolute', bottom: '-140px', left: '50%', transform: 'translateX(-50%)', width: 520, height: 520, background: 'radial-gradient(circle,color-mix(in srgb,#3D9E8C 22%,transparent),transparent 65%)', pointerEvents: 'none' }} />

      <div className="cta-inner" style={{ position: 'relative', textAlign: 'center' }}>
        <h2 className="cta-final-h2" style={{ fontFamily: 'var(--font-display)', fontSize: 32, lineHeight: 0.98, fontWeight: 800, letterSpacing: '-0.02em', textTransform: 'uppercase', margin: '0 0 22px', textWrap: 'balance' } as React.CSSProperties}>
          Comece hoje. Grátis por tempo limitado.
        </h2>
        <a
          ref={ctaRef}
          href={downloadUrl}
          className="cta-btn"
          style={{ maxWidth: 340, margin: '0 auto' }}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => {
            if (downloadUrl.includes('apps.apple.com')) {
              (window as any).gtag?.('event', 'click_appstore', { event_category: 'conversion', event_label: 'app_store_ios' });
              (window as any).ttq?.track('ClickButton', { contents: [{ content_id: 'app_store_ios', content_type: 'app', content_name: 'Kora iOS App Store' }] });
            }
          }}
        >
          Baixar Grátis
        </a>
      </div>

      <div className="faq-section" style={{ marginTop: 52 }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 800, letterSpacing: '-0.01em', textTransform: 'uppercase', margin: '0 0 18px', color: 'var(--kora-ink-900)' }}>Perguntas frequentes</h3>
        <div className="faq-grid" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {faqs.map(({ q, a }) => <FaqItem key={q} q={q} a={a} />)}
        </div>
      </div>

      <div className="calc-section" style={{ marginTop: 44, padding: '28px 24px', background: 'var(--kora-ink-900)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 'var(--radius-lg)', textAlign: 'center' }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 20, lineHeight: 1.05, fontWeight: 800, letterSpacing: '-0.01em', textTransform: 'uppercase', margin: '0 0 10px', color: '#fff' }}>Quero receber meu diagnóstico</h3>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.55)', lineHeight: 1.55, margin: '0 auto 20px', maxWidth: 300 }}>Descubra grátis quantas calorias você deve comer por dia. Leva 2 minutos.</p>
        <a
          href="https://korahealthhub.com.br/calculadora/"
          style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'transparent', color: '#fff', fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 13, letterSpacing: '0.06em', textTransform: 'uppercase', padding: '13px 24px', borderRadius: 'var(--radius-pill)', border: '1px solid rgba(255,255,255,0.22)', transition: 'background var(--dur-fast)' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          onClick={() => {
            (window as any).gtag?.('event', 'click_calculadora', { event_category: 'navigation', event_label: 'calculadora' });
            (window as any).ttq?.track('ClickButton', { contents: [{ content_id: 'calculadora', content_type: 'page', content_name: 'Calculadora Kora' }] });
          }}
        >
          Calcular minhas metas →
        </a>
      </div>

      <div style={{ marginTop: 44, paddingTop: 24, borderTop: '1px solid var(--kora-cream-300)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <img src={`${BASE}/uploads/app-icon.jpg`} alt="Kora" style={{ width: 24, height: 24, borderRadius: 8, objectFit: 'cover' }} />
          <img src={`${BASE}/uploads/kora-wordmark.png`} alt="Kora" style={{ height: 11, objectFit: 'contain', filter: 'brightness(0)', opacity: 0.82 }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
          <div style={{ fontSize: 12, color: 'var(--kora-grey-500)' }}>© 2026 Kora Health Hub</div>
          <div style={{ display: 'flex', gap: 10 }}>
            <a href="https://korahealthhub.com.br/termos" style={{ fontSize: 12, color: 'var(--kora-grey-500)', textDecoration: 'underline', textUnderlineOffset: 3 }}>Termos de Uso</a>
            <a href="https://korahealthhub.com.br/privacidade" style={{ fontSize: 12, color: 'var(--kora-grey-500)', textDecoration: 'underline', textUnderlineOffset: 3 }}>Política de Privacidade</a>
          </div>
        </div>
      </div>
    </section>
  );
}
