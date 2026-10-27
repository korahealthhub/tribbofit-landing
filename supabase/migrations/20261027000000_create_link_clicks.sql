-- Aplicada no Supabase PROD (jllkcglzajmzqywyuswq) em 2026-10-27 como "create_link_clicks".
-- Cópia aqui só para registro: o site não roda migrations.
create table public.link_clicks (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  source   text not null check (source   ~ '^[a-z0-9_-]{1,40}$'),
  medium   text not null check (medium   ~ '^[a-z0-9_-]{1,40}$'),
  campaign text not null check (campaign ~ '^[a-z0-9_-]{1,40}$'),
  content  text          check (content  ~ '^[a-z0-9_-]{1,40}$'),
  device   text not null check (device in ('ios', 'android', 'desktop')),
  entrada  text not null check (entrada  ~ '^[a-z0-9_-]{1,40}$'),
  in_app   boolean not null default false,
  reaberto boolean not null default false
);

comment on table public.link_clicks is
  'Cliques nos links de download do site (tribbofit.com.br). Sem IP, sem identificador, sem cookie. Só a função track-click (service role) grava.';
comment on column public.link_clicks.entrada is 'Por onde entrou: ig, ig-ads, tt, tt-ads, download, android, botao-site...';
comment on column public.link_clicks.reaberto is 'Link copiado no navegador interno e reaberto no Safari/Chrome: não somar de novo como clique.';

create index link_clicks_created_at_idx on public.link_clicks (created_at);

alter table public.link_clicks enable row level security;
revoke all on public.link_clicks from anon, authenticated;

create view public.link_clicks_semanal
with (security_invoker = true) as
select
  date_trunc('week', created_at at time zone 'America/Sao_Paulo')::date as semana,
  source, medium, campaign, coalesce(content, '') as content,
  count(*) filter (where not reaberto)                       as cliques,
  count(*) filter (where not reaberto and device = 'ios')     as ios,
  count(*) filter (where not reaberto and device = 'android') as android,
  count(*) filter (where not reaberto and device = 'desktop') as desktop,
  count(*) filter (where in_app and not reaberto)             as no_app_social,
  count(*) filter (where reaberto)                            as reabertos
from public.link_clicks
group by 1, 2, 3, 4, 5;

revoke all on public.link_clicks_semanal from anon, authenticated;

-- Aplicada em seguida como "link_clicks_semanal_links_e_botoes": separa links curtos de botões do site.
drop view public.link_clicks_semanal;

create view public.link_clicks_semanal
with (security_invoker = true) as
select
  date_trunc('week', created_at at time zone 'America/Sao_Paulo')::date as semana,
  source, medium, campaign, coalesce(content, '') as content,
  count(*) filter (where not reaberto)                                as cliques,
  count(*) filter (where not reaberto and entrada <> 'botao-site')    as links,
  count(*) filter (where not reaberto and entrada =  'botao-site')    as botoes_site,
  count(*) filter (where not reaberto and device = 'ios')             as ios,
  count(*) filter (where not reaberto and device = 'android')         as android,
  count(*) filter (where not reaberto and device = 'desktop')         as desktop,
  count(*) filter (where not reaberto and in_app)                     as no_app_social,
  count(*) filter (where reaberto)                                    as reabertos
from public.link_clicks
group by 1, 2, 3, 4, 5;

comment on view public.link_clicks_semanal is
  'Cliques por semana (segunda a domingo, horário de Brasília) e origem. links = links curtos (/ig, /tt, /download...), botoes_site = botões das lojas nas páginas. reabertos (link copiado no app e aberto no navegador) ficam fora de cliques.';

revoke all on public.link_clicks_semanal from anon, authenticated;
