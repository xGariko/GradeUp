# GradeUp

GradeUp è una piattaforma digitale per la gestione della carriera universitaria, pensata per studenti, docenti e amministratori. Copre l'intero ciclo accademico in un unico posto: immatricolazione, iscrizione ai corsi e agli appelli, voti e CFU per gli studenti; gestione corsi, materiale didattico ed esami per i docenti.

## Stack

- **Backend**: Node + Express 5, TypeScript, PostgreSQL (`pg`), auth con JWT + bcrypt, validazione con Zod
- **Frontend**: Angular 21 standalone + Ionic 8, Bootstrap 5, SSR abilitato
- **Shared**: pacchetto TypeScript con gli schemi Zod e i tipi di dominio condivisi tra backend e frontend
- **Storage file**: bucket Supabase Storage (`courseware`) per il materiale didattico

## Struttura del repo

Tre workspace npm indipendenti, ognuno con il proprio `package.json` e `node_modules`. Non è un workspace npm unificato: vanno installati e avviati separatamente.

```
GradeUp/
  backend/    API Express + accesso al database
  frontend/   app Angular + Ionic (web e mobile)
  shared/     schemi Zod e tipi condivisi (consumati via path alias)
```

`shared/` non ha uno step di build: viene importato direttamente dai sorgenti via path alias (`@shared/*` dal backend, `$shared/*` dal frontend).

## Prerequisiti

- Node.js 20+ e npm
- Un database PostgreSQL raggiungibile, in una delle due forme:
  - PostgreSQL locale (es. `localhost:5432`)
  - oppure un progetto Supabase (la connection string Postgres funziona; l'SSL viene attivato in automatico quando l'URL contiene `.supabase.`)
- Un progetto Supabase per lo storage del materiale didattico (serve per le funzionalità di upload/download dei file)

## Setup

### 1. Variabili d'ambiente del backend

Copia il file di esempio e compila i valori:

```bash
cd backend
cp .env.example .env
```

Variabili richieste (il backend non parte se ne manca una):

| Variabile                   | Descrizione                                              |
|-----------------------------|----------------------------------------------------------|
| `NODE_ENV`                  | `development` in locale                                  |
| `PORT`                      | Porta dell'API (default `3000`)                          |
| `DATABASE_URL`              | Connection string PostgreSQL                             |
| `JWT_SECRET`                | Segreto per la firma dei token JWT                       |
| `SUPABASE_URL`              | URL del progetto Supabase (per lo storage)               |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key Supabase (per lo storage)               |

Il frontend non richiede variabili d'ambiente: in sviluppo chiama l'API tramite proxy (vedi sotto).

### 2. Database

Crea un database vuoto e applica lo schema iniziale:

```bash
# esempio con un Postgres locale
createdb gradeup
psql -d gradeup -f backend/src/db/migrations/001_initial_schema.sql
```

Lo schema crea gli enum, le tabelle di dominio e i vincoli. Per le migrazioni successive il backend ha `node-pg-migrate` configurato (vedi gli script `db:*`).

### 3. Dipendenze

Installa i pacchetti nei tre workspace:

```bash
cd shared   && npm install
cd ../backend  && npm install
cd ../frontend && npm install
```

## Avvio in locale

Servono due processi. Avvia prima il backend, poi il frontend.

**Backend** (porta `3000`):

```bash
cd backend
npm run dev
```

`tsx watch` ricarica al salvataggio. Controllo rapido: `GET http://localhost:3000/api/health`.

**Frontend** (porta `4200`):

```bash
cd frontend
npm start
```

Apri `http://localhost:4200/`. Il dev server inoltra ogni chiamata `/api` a `http://localhost:3000` tramite `proxy.conf.json`, quindi frontend e backend dialogano senza problemi di CORS.

## Script utili

### Backend

| Comando                  | Cosa fa                                              |
|--------------------------|------------------------------------------------------|
| `npm run dev`            | Avvio in sviluppo con reload (`tsx watch`)           |
| `npm run build`          | Compila TypeScript in `dist/`                        |
| `npm start`              | Esegue la build compilata                            |
| `npm run typecheck`      | Type-check senza emettere file                       |
| `npm run lint`           | ESLint sui sorgenti                                  |
| `npm run db:migrate`     | Applica le migrazioni (`node-pg-migrate up`)         |
| `npm run db:migrate:down`| Rollback dell'ultima migrazione                      |

### Frontend

| Comando         | Cosa fa                                            |
|-----------------|----------------------------------------------------|
| `npm start`     | Dev server Angular su `:4200` con proxy verso l'API|
| `npm run build` | Build di produzione in `dist/`                     |
| `npm run watch` | Build in watch mode (configurazione development)    |
| `npm test`      | Test unitari con Vitest                            |

## Note

- La fonte canonica di tipi e vincoli di dominio sono gli schemi Zod in `shared/src/`. Il file `db_schema.sql` alla root del progetto è un'esportazione grezza dell'ER e non rispecchia il codice: non usarlo come riferimento.
- Materiale di progettazione accanto alla cartella `GradeUp/` (`manifest.pdf`, `db_schema.*`, logo SVG) non fa parte dei sorgenti applicativi.

## Licenza

PolyForm Noncommercial License 1.0.0 (vedi [LICENSE](LICENSE)).
