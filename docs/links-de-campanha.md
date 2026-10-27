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

Os quatro links curtos aceitam `utm_content` (e qualquer outro `utm_*`) para separar criativos:
`tribbofit.com.br/ig-ads?utm_content=video-03`.

Os links antigos `korahealthhub.com.br/ig`, `/tt`, `/download` e `/android` continuam funcionando:
vão para o mesmo link no tribbofit.com.br e aparecem na contagem com a entrada `ig-kh`, `tt-kh` etc.

## Regras dos nomes

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
  `apps.apple.com/app/apple-store/id6769632514?pt=<token>&ct=instagram_paid_lancamento_video-03&mt=8`.
  No navegador interno do Instagram/TikTok, a página `/download` mostra o botão de copiar o link
  (com a origem) para abrir no Safari.
- **Android** → Google Play com `&referrer=utm_source%3D…` (aparece na Play Console).
- **Computador** → página inicial com as UTMs. Os botões e o QR code levam a mesma origem.

## Criar uma regra nova de link curto (como /ig)

Copie a pasta `ig-ads/` com o novo nome (ex.: `yt/`) e troque no `index.html`:
`data-entrada`, `data-source`, `data-medium` e `data-campaign`. Nada mais.
