# Para uma próxima build do app: origem por pessoa (Android)

Anotação — nada disso foi feito no repositório do app.

O site já manda para a Google Play `&referrer=utm_source%3D…%26utm_medium%3D…%26utm_campaign%3D…%26utm_content%3D…`.
A Play guarda esse texto e entrega ao app instalado pelo **Install Referrer**. Com ele dá para ligar
origem → pessoa → assinatura.

## O que entra na build

1. **Ler o referenciador uma vez (só Android)**, no primeiro uso, antes ou logo depois do login:
   - Expo: `import * as Application from 'expo-application'` → `await Application.getInstallReferrerAsync()`
     (ou `react-native-play-install-referrer`).
   - Fazer `decodeURIComponent` e ler `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`.
     Sem UTM (instalação pela busca da Play): `utm_source=google-play`, `utm_medium=organic`.
   - Guardar no AsyncStorage `install_referrer_sent = true` para não repetir.

2. **PostHog**: um evento e propriedades fixas na pessoa:
   ```js
   posthog.capture('install_attributed', {
     install_utm_source, install_utm_medium, install_utm_campaign, install_utm_content,
     $set_once: { install_utm_source, install_utm_medium, install_utm_campaign, install_utm_content },
   });
   ```
   Se o evento sair antes do `identify`, o PostHog junta tudo na pessoa quando ela fizer login.
   Depois: funil *install_attributed → assinatura* quebrado por `install_utm_source`.

3. **Perfil no Supabase**: colunas novas em `profiles`
   `acq_source`, `acq_medium`, `acq_campaign`, `acq_content`, `acq_at` — gravadas só se estiverem vazias
   (primeira origem vale). Migration + `update profiles set … where id = auth.uid() and acq_source is null`.

4. **Assinatura**: `subscription_events` (webhook da RevenueCat) já tem o usuário. O relatório fica:
   ```sql
   select p.acq_source, p.acq_medium, p.acq_campaign, count(distinct s.app_user_id) as assinantes
   from subscription_events s join profiles p on p.id::text = s.app_user_id
   where s.type = 'INITIAL_PURCHASE' group by 1,2,3;
   ```
   (conferir os nomes reais das colunas de `subscription_events`; existe também a função
   `my_subscription_origin()`, vale ver o que ela já guarda antes de duplicar.)
   Opcional: mandar a origem para a RevenueCat como atributo (`Purchases.setAttributes({ $mediaSource, $campaign })`).

## iPhone

A Apple não entrega a origem por pessoa (só os números agregados por campanha no App Store Connect).
O app já pergunta "como você conheceu o Tribbo" no cadastro (vai para o perfil e para o PostHog, segundo a
Política de Privacidade). Essa resposta declarada é o único dado por pessoa no iPhone; no Android, comparar
com o referenciador ajuda a medir o quanto a resposta declarada acerta.

## Privacidade

Ligar origem à conta é dado pessoal: citar na Política de Privacidade (a seção de origem/rastreamento
da versão atual) que a origem da instalação fica associada à conta para medir campanhas.
