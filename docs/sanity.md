# Sanity: contenuti, migrazione e pubblicazione

- **Progetto:** `9skjzcft`, dataset `production` (pubblico: la build legge senza token).
- **Studio:** https://rggndr.sanity.studio, codice in `studio/` (pacchetto npm separato, non un workspace).
- **Sito:** legge i contenuti solo in fase di build, da `src/content/` (`fetchQuery` in `source.ts`). Dal browser arrivano solo le immagini, dal CDN di Sanity.

## Da dove legge il sito

| Comando | Sorgente |
|---|---|
| `npm run build`, `npm run dev`, Cloudflare Pages, CI (build di produzione) | Dataset vero, solo documenti pubblicati |
| `npm test`, `npm run test:unit` | Dataset di prova `tests/fixtures/dataset.ndjson` (`CONTENT_SOURCE=fixture`), immagini da `tests/fixtures/assets/` |

`scripts/check-dist.mjs` rifiuta una build di produzione che contiene asset del dataset di prova.

## Schemi e tipi

1. Modifica gli schemi in `studio/schemaTypes/` (e le query in `src/content/queries.ts` se serve).
2. `npm --prefix studio run validate`
3. `npm run typegen`: rigenera `src/content/sanity.types.ts`, che va committato. La CI fallisce se i tipi non sono aggiornati.
4. Per pubblicare lo Studio aggiornato: `cd studio && npx sanity deploy` (pubblica anche lo schema).

Si accede con l'account Sanity di Andrea (`npx sanity login` in `studio/`).

## Migrazione da WordPress

Si può rieseguire finché il WordPress resta online (fino al cambio di dominio, M4).

```sh
npm run migrate:wp -- --out migration/wp.ndjson     # legge rggndr.it e scrive l'NDJSON (cartella ignorata da git)
cd studio && npx sanity dataset import ../migration/wp.ndjson --dataset production --missing
```

- **`--missing`** crea solo i documenti che non esistono. Gli id sono stabili (`siteSettings`, `homePage`, `aboutPage`, `gallery`, `project-<slug>`), quindi i documenti già importati o modificati nello Studio **non vengono sovrascritti**. Un secondo import cambia solo `_rev` di `homePage`: l'importer rimette "forti" i riferimenti ai progetti.
- **`--replace`** sovrascrive i documenti esistenti e **cancella le modifiche fatte nello Studio**. Da usare solo di proposito.
- Le immagini si importano dagli URL di WordPress: le scarica l'import, e Sanity non duplica quelle già presenti.
- Gli avvisi dello script elencano ciò che manca in WordPress. Nel primo import tutte le immagini erano senza alt, quindi l'alt è il titolo della foto o del progetto: da rivedere nello Studio.
- Le righe e le note dell'hero non erano in ACF, quindi lo script le scrive con i testi di oggi.
- I campi ACF arrivano in REST perché i gruppi hanno "Show in REST API" attivo.
- `--record tests/unit/fixtures/wp` aggiorna le risposte registrate usate dai test della migrazione.

## Aggiornamento automatico

Alla pubblicazione nello Studio, un webhook di Sanity chiama il deploy hook di Cloudflare Pages, che ricostruisce il sito.

- **Webhook** (sanity.io/manage → progetto `9skjzcft` → API → Webhooks):
  - dataset `production`;
  - trigger create, update e delete;
  - filtro `!(_id in path("drafts.**"))`, così le bozze non fanno partire build;
  - metodo POST, nessuna proiezione.
- **Deploy hook** (Cloudflare Pages → Settings → Builds → Deploy hooks): l'URL è un segreto e sta solo nel webhook di Sanity, mai nel repository.
- **Tempo misurato il 16/11/2026:** un titolo della gallery pubblicato alle 22:21:51 era online sull'anteprima alle 22:23:08, cioè in circa 77 secondi.
- **Limite:** ogni pubblicazione è una build. Il piano gratuito di Cloudflare ne concede 500 al mese.

### Al merge di M1 in `master`

Durante M1 l'hook punta al branch `feat/m1-sanity`. Dopo il merge:

1. In Cloudflare si crea un deploy hook per `master`.
2. Nel webhook di Sanity si sostituisce l'URL con quello nuovo.
3. Si cancella l'hook di `feat/m1-sanity`.
