# Links de campanha do Tribbo Fit

Todo link que leva alguém a baixar o app passa por `tribbofit.com.br`. O site conta o clique
(sem cookie, sem IP), descobre o aparelho e manda para a loja certa levando a origem junto.

## Links prontos

| Onde usar | Link | Origem / mídia / campanha |
|---|---|---|
| Bio do Instagram | `tribbofit.com.br/ig` | instagram / organic / perfil |
| Anúncios no Instagram | `tribbofit.com.br/ig-ads` | instagram / paid / lancamento |
| Bio do TikTok | `tribbofit.com.br/tt` | tiktok / organic / perfil |
| Anúncios no TikTok | `tribbofit.com.br/tt-ads` | tiktok / paid / lancamento |
| Qualquer outra coisa | `tribbofit.com.br/download?utm_source=…&utm_medium=…&utm_campaign=…&utm_content=…` | o que estiver na URL |

### Links de bio por perfil (desde 25/11/2026)

Um link para cada perfil, com a campanha própria. Funcionam igual ao `/tt` e ao `/ig`, que continuam
no ar sem mudança (`campaign = perfil`).

| Link na bio | Origem / mídia / campanha | `ct` da Apple | Entrada em `link_clicks` |
|---|---|---|---|
| `tribbofit.com.br/tt-a` | tiktok / organic / tt_tribbofit_app | `tiktok_organic_tt_tribbofit_app` | `tt-a` |
| `tribbofit.com.br/tt-b` | tiktok / organic / tt_tribbofit_reels | quiz do site (desde 26/11) | `tt-b` |
| `tribbofit.com.br/tt-c` | tiktok / organic / tt_roberto_rosa | `tiktok_organic_tt_roberto_rosa` | `tt-c` |
| `tribbofit.com.br/tt-d` | tiktok / organic / tt_martin | `tiktok_organic_tt_martin` | `tt-d` |
| `tribbofit.com.br/ig-a` | instagram / organic / ig_tribbofit_app | `instagram_organic_ig_tribbofit_app` | `ig-a` |
| `tribbofit.com.br/ig-b` | instagram / organic / ig_tribbofit_reels | quiz do site (desde 26/11) | `ig-b` |
| `tribbofit.com.br/ig-c` | instagram / organic / ig_betoarosa | `instagram_organic_ig_betoarosa` | `ig-c` |

- Google Play: `referrer=utm_source=…&utm_medium=organic&utm_campaign=<campanha>` (codificado). No Android o app
  grava essa campanha na pessoa (`install_utm_campaign` no PostHog, `acq_campaign` no perfil).
- iPhone: a Apple só mostra números agregados por `ct`, não por pessoa. Na bio do Instagram, que acrescenta
  `utm_content=link_in_bio`, o `ct` fica com a campanha inteira e o conteúdo cortado em 40 caracteres
  (ex.: `instagram_organic_ig_tribbofit_reels_lin`): somar as linhas que começam com o `ct` da tabela.
- Para juntar todos os links de bio de uma rede: `medium = 'organic'` e a `source`; por perfil: `campaign`.
- Linhas com campanha `teste_…` em `link_clicks` (25/11/2026) são do teste destes links: não contar.
- **`/tt-b` e `/ig-b` (perfis de Reels) levam ao quiz, não à loja (desde 26/11/2026).** Destino:
  `/quiz2/?utm_source=tiktok|instagram&utm_medium=organic&utm_campaign=tt_tribbofit_reels|ig_tribbofit_reels`
  (mais o `utm_content` da URL, se houver; no Instagram fica `link_in_bio`). O clique continua em `link_clicks`
  e a origem segue para o lead (`web_leads.utm_*`) e para os eventos do quiz no PostHog (`utm_source` tiktok ou
  instagram, separado dos anúncios, que chegam com `utm_source=FB`). Feito com `data-destino="/quiz2/"` no
  `<script>` da página (`js/origem.js`); sem esse atributo, o link curto vai para a loja como sempre.
  Antes da mudança (25/11 a 26/11) esses dois iam para a loja com o `ct` `tiktok_organic_tt_tribbofit_reels` e
  `instagram_organic_ig_tribbofit_reels`.
- Teste de 26/11/2026: `utm_content` `teste_e2e_…` em `link_clicks`, `web_leads` (e-mail `delivered+bio…@resend.dev`)
  e PostHog. Não contar.

Os links curtos aceitam `utm_content` para separar criativos:
`tribbofit.com.br/ig-ads?utm_content=video-03`.

Nos links curtos, **origem e mídia da página sempre vencem** (o Instagram acrescenta sozinho
`utm_source=ig&utm_medium=social&utm_content=link_in_bio` na bio; o /ig continua gravando
`instagram / organic / perfil`, com `link_in_bio` como conteúdo). `utm_campaign` e `utm_content` da URL
só entram se a página não tiver os seus (todas têm campanha, nenhuma tem conteúdo).
Com `data-destino` (hoje só `/tt-b` e `/ig-b`), o link curto vai para essa página do site com as `utm_*`, sem o
`/download/` de reserva do navegador interno.
Para uma campanha diferente, use `/download?utm_…` ou crie um link curto novo.

Os links antigos `korahealthhub.com.br/ig`, `/tt`, `/download` e `/android` continuam funcionando:
vão para o mesmo link no tribbofit.com.br e aparecem na contagem com a entrada `ig-kh`, `tt-kh` etc.

## Regras dos nomes

- Apelidos viram um nome só, no site e na gravação: `ig`, `instagram.com`, `l.instagram.com` → `instagram`;
  `fb`, `facebook.com`, `m.facebook.com`, `l.facebook.com` → `facebook`; `tt`, `tiktok.com` → `tiktok`;
  mídia `social` → `organic`. Os anúncios da Meta (`utm_source=ig&utm_medium=paid`) gravam `instagram / paid`.
- Tudo em **minúsculas**, **sem acento**, **sem espaço**. Palavras separadas por hífen: `black-friday`.
  (O site corrige sozinho se escapar, mas o painel fica mais limpo se o link já vier certo.)
- Seja curto: a Apple guarda só **40 caracteres** de `origem_midia_campanha_conteudo`.
  Na prática: campanha até ~15 caracteres e conteúdo até ~12.

| Campo | Valores | Exemplos |
|---|---|---|
| `utm_source` (de onde) | `instagram`, `tiktok`, `facebook`, `whatsapp`, `youtube`, `email`, `site`, ou o @ do influenciador sem o @ | `joao-fit` |
| `utm_medium` (como) | `organic` (post/bio), `paid` (anúncio), `story`, `influencer`, `messaging` (WhatsApp/DM), `email`, `qrcode`, `direto` | |
| `utm_campaign` (qual ação) | nome curto da campanha | `lancamento`, `perfil`, `bf-2026`, `verao` |
| `utm_content` (qual peça) | opcional, o criativo ou a posição | `video-03`, `story-1203`, `carrossel-a` |

Quem chega ao site sem UTM e clica em um botão de loja é marcado como `site / direto / nenhuma`.

## Exemplos

```
Story do Instagram com link:      tribbofit.com.br/download?utm_source=instagram&utm_medium=story&utm_campaign=lancamento&utm_content=story-1203
Influenciadora @maria.treina:     tribbofit.com.br/download?utm_source=maria-treina&utm_medium=influencer&utm_campaign=lancamento
Grupo de WhatsApp:                tribbofit.com.br/download?utm_source=whatsapp&utm_medium=messaging&utm_campaign=grupo-vip
Criativo 3 do anúncio no TikTok:  tribbofit.com.br/tt-ads?utm_content=video-03
QR code em material impresso:     tribbofit.com.br/download?utm_source=panfleto&utm_medium=qrcode&utm_campaign=academia-x
```

## O que acontece com cada aparelho

- **iPhone** → App Store com o link de campanha da Apple:
  `apps.apple.com/app/apple-store/id6769632514?pt=128858175&ct=instagram_paid_lancamento_video-03&mt=8`.
- **Android** → Google Play com `&referrer=utm_source%3D…` (aparece na Play Console).
- **Computador** → página inicial com as UTMs. Os botões e o QR code levam a mesma origem.

### Dentro do app do Instagram / TikTok (navegador interno)

1. O link tenta abrir a loja direto, como fora do app. No Android, dentro do Instagram/Facebook, usa
   `intent://` para abrir o app da Play (com o mesmo referrer); no TikTok, o link normal da Play.
2. Se depois de ~2,5 s a página continua na tela (o app bloqueou), ou se a pessoa voltou da loja,
   aparece `/download/?…&f=1` com o botão da loja do aparelho em destaque (o toque costuma passar
   onde o redirecionamento automático é bloqueado). `f=1` não conta o clique de novo.
3. Só se o toque também não abrir a loja aparece "Copiar link e abrir no navegador". O link copiado
   leva `r=1` e, aberto no Safari/Chrome, conta como `reaberto` (fora de `cliques`).

## Criar uma regra nova de link curto (como /ig)

Copie a pasta `ig-ads/` com o novo nome (ex.: `yt/`) e troque no `index.html`:
`data-entrada`, `data-source`, `data-medium` e `data-campaign`. Nada mais.
