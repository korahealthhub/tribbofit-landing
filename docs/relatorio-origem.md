# Relatório semanal: de onde vêm downloads e assinaturas

Toda semana, por origem: **cliques → downloads → assinaturas**.

## 1. Cliques

**Nosso servidor (conta todo mundo, sem cookie)** — Supabase PROD → SQL Editor:

```sql
select * from link_clicks_semanal
where semana >= current_date - interval '8 weeks'
order by semana desc, cliques desc;
```

- `cliques` = `links` (links curtos: /ig, /tt, /download…) + `botoes_site` (botões das lojas nas páginas).
  No computador a mesma pessoa pode aparecer nos dois (entra por /ig e depois clica no botão).
- `ios` / `android` / `desktop`: aparelho de quem clicou.
- `no_app_social`: abriu dentro do Instagram/TikTok. `reabertos`: copiou o link e abriu no navegador
  (fica fora de `cliques` para não contar duas vezes).
- Detalhe por entrada: `select entrada, count(*) from link_clicks where created_at > now() - interval '7 days' group by 1 order by 2 desc;`

**GA4 (só quem aceitou os cookies — sempre menor)** — Explorar → Formato livre:
evento `click_store` e `smart_link_redirect`, dimensões *Origem da sessão / Mídia / Campanha*
(ou os parâmetros `utm_source`, `utm_medium`, `utm_campaign`, `utm_content` do evento, depois de
registrá-los em Administrador → Definições personalizadas).

## 2. Downloads

**Android — Play Console** → Tribbo Fit → *Crescer usuários → Análise da página da loja →
Aquisição pela página da loja* (Store listing acquisition). Filtro *Origem do tráfego:
Indicações de terceiros*; dimensões **Origem UTM** e **Campanha UTM**. Mostra visitantes da página
e quem instalou. Atraso de 1–2 dias.

**iPhone — App Store Connect** → *Analytics → Aquisição → Campanhas*. Por campanha (`ct`):
visualizações da página, primeiros downloads, sessões. Atenção:
- Só conta quem permite compartilhar dados com desenvolvedores (amostra, não o total).
- Campanhas com poucos usuários podem não aparecer.
- Só funciona depois que o `pt` (provider token) estiver em `js/origem.js` (`APPLE_PT`).

## 3. Assinaturas

**iPhone** — mesma tela de *Campanhas* no App Store Connect: **Receita (Proceeds)** e
**Usuários pagantes** por campanha (mesma amostra do item acima).

**Android** — hoje não existe ligação entre origem e assinatura. O máximo é uma estimativa:
assinaturas Android da semana (RevenueCat / `subscription_events`) × fatia de instalações de cada
`utm_source` na Play Console. Para o número real por pessoa, ver `docs/app-origem-android.md`.

## Planilha da semana (sugestão)

| Semana | Origem | Mídia | Campanha | Cliques (servidor) | Cliques (GA4) | Instalações Android (Play) | Downloads iPhone (Apple) | Assinaturas iPhone (Apple) | Assinaturas Android (estimativa) |
|---|---|---|---|---|---|---|---|---|---|
