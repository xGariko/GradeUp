# ADR-0001 - Framework di migrazioni Postgres

- Status: Accepted
- Data: 2026-05-19
- Decisori: utente, Claude (proponente)
- Decisione finale: opzione B, node-pg-migrate con migrazioni in SQL puro

## Contesto

Il backend usa `pg` direttamente con query parametriche (vedi `auth.controller.ts`). La fonte di verita' dello schema vive in `shared/src/types/*.ts` come schemi Zod (vedi `.claude/memory/source-of-truth.md`). Il file `db_schema.sql` alla root del progetto e' un'esportazione grezza obsoleta e non va usata.

Serve un meccanismo per:

1. Tradurre gli schemi Zod in DDL Postgres coerente (tabelle, FK, indici, CHECK, enum)
2. Versionare i cambi di schema in modo riproducibile (idempotente, ordinato)
3. Eseguire le migrazioni sia in dev (locale, su container) sia in CI/prod

L'esecuzione e' sempre lato backend, prima dell'avvio dell'app oppure tramite comando dedicato.

## Vincoli e regole del progetto

- Niente over-engineering: si preferiscono soluzioni semplici e leggibili
- Niente duplicazione: se nasce una "seconda fonte di verita'" rispetto agli Zod, va giustificata
- Backend ordinato per entita': CRUD + service, niente magia ORM diffusa
- Il backend usa `pg` con query SQL parametriche, scelta che vogliamo preservare

## Opzioni valutate

### A. DDL SQL manuale + runner casalingo

File `.sql` numerati in `backend/db/migrations/` (es. `001_init.sql`, `002_admin.sql`) eseguiti da uno script Node che tiene una tabella `_migrations` con lo storico.

- Pro
  - Zero dipendenze nuove, zero astrazioni
  - Lo schema e' SQL nativo, leggibile da chiunque conosca Postgres
  - Compatibile al 100% con l'attuale uso di `pg` parametrico
  - Nessuna "seconda fonte" oltre agli Zod
- Contro
  - Devo scrivere a mano il runner (gestione transazione, ordering, idempotency, comando status)
  - Niente down migration "gratis" (vanno scritte a mano se servono)
  - Sincronizzazione Zod <-> DDL e' manuale (regola comunque vera in tutte le opzioni che non generano DDL da Zod)

### B. node-pg-migrate (SQL puro o JS API, runner maturo)

Libreria con runner pronto: comandi `up`/`down`/`redo`, supporto sia a migrazioni `.sql` sia `.ts/.js`, tabella di tracking gia' inclusa.

- Pro
  - Runner maturo, robusto, transazionale
  - Comandi standard (`up`, `down`, `create`, `redo`)
  - Permette di scrivere migrazioni in SQL puro (utile per la 001) o in JS (utile per migrazioni programmatiche)
  - Una dipendenza, configurazione minima
- Contro
  - Una libreria in piu' (ma molto stabile e specifica)
  - Niente generazione automatica da Zod (manuale come in A)

### C. Drizzle ORM/Kit

Schema dichiarato in TS (`drizzle-orm`), `drizzle-kit` genera migrazioni dal diff di schema, query builder type-safe.

- Pro
  - Type-safety end-to-end fino al DB
  - Generazione automatica di migrazioni dai cambi di schema
- Contro
  - Introduce una seconda fonte di verita': schema Drizzle in TS *e* schemi Zod gia' presenti
  - Tendenza ad attrarre l'uso del query builder ovunque (cambia l'attuale stile `pg` parametrico)
  - Drizzle e Zod hanno modi diversi di esprimere vincoli: tenerli allineati e' lavoro
  - Astrazione che il progetto al momento non sta chiedendo

### D. Kysely + kysely-migrate (+ kysely-codegen)

Query builder TS type-safe sopra SQL puro, runner di migrazioni dedicato, tipi generati da DB esistente con `kysely-codegen`.

- Pro
  - Type-safety sul query builder
  - SQL resta "primo cittadino" (a differenza di Drizzle)
- Contro
  - Migrazioni vivono in TS con DSL Kysely, non in SQL puro: meno leggibili per chi guarda lo schema
  - I tipi DB generati da `kysely-codegen` rischiano di divergere dagli Zod
  - Spinge a sostituire le query `pg` con il builder: cambio di stile non necessario ora

### E. Prisma

ORM completo, schema in `schema.prisma`, migrazioni autogenerate, client tipato.

- Pro
  - Maturita', tooling, generazione tipi
- Contro
  - Triplice fonte di verita' (Prisma schema, Zod, eventuali tipi runtime)
  - Reinventa il livello dato del backend e cambia drasticamente lo stile attuale
  - Overhead di runtime, generated client da gestire
  - Overkill per il progetto

## Raccomandazione

**Opzione B: node-pg-migrate**, con migrazioni scritte in **SQL puro**.

Motivazione sintetica:

1. Preserva lo stile attuale: backend continua a usare `pg` con query parametriche, lo schema vive in `.sql` leggibili
2. Nessuna seconda fonte di verita' oltre agli Zod: la coerenza Zod <-> DDL resta manuale (come in tutte le opzioni che non generano da Zod), ma non aggiungiamo un terzo livello
3. Risparmia il tempo di scrivere un runner casalingo (opzione A), dandoci `up`/`down`/`status`/`create` da subito
4. Una sola dipendenza nuova, mirata, niente lock-in significativo: se domani volessimo togliere il runner, le migrazioni SQL restano valide

L'allineamento Zod <-> DDL si tiene aggiungendo nei review check incrociato. Quando lo schema diventera' grande e l'allineamento manuale costera' troppo, si potra' valutare di generare lo schema Zod *dal* DB (con introspezione) o viceversa, ma e' una decisione che possiamo prendere dopo, quando avremo evidenza del problema.

## Conseguenze

Se approvata l'opzione B:

- Si installa `node-pg-migrate` in `backend/`
- Si introduce `backend/db/migrations/` con migrazioni SQL numerate
- Si aggiungono npm script `db:migrate`, `db:migrate:down`, `db:migrate:status`, `db:migrate:create`
- L'ordine delle migrazioni e' definito dal nome file (timestamp o numero progressivo, da decidere in E1-S2)
- La regola operativa: prima si aggiorna lo schema Zod, poi si scrive la migrazione SQL coerente nella stessa PR

## Domanda aperta per l'utente

Confermi l'opzione B (node-pg-migrate con SQL puro)? Se preferisci A (runner casalingo) o un'altra opzione, dimmelo: in particolare l'opzione A e' praticabile se vogliamo evitare anche questa dipendenza.
