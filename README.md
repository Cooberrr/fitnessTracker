# Fitness Tracker

## Team

- Cooper Derr
- Joel Solomon
- Lalith Uriti
- Sravanth Tumma

## Workout tracker UI

The browser app lets you log workouts, review your history, remove an entry, and see total minutes, average session length, and calories for the current week. PostgreSQL schema and validation live in `src/schema.sql`. The app runs PGlite, a PostgreSQL engine in WebAssembly, and saves its database in the browser's IndexedDB. Each browser profile keeps its own local data.

### Run the app

Requires Node.js 20.19+ or 22.12+.

```sh
npm install
npm run dev
```

Open the local URL printed by Vite. Use the form to add a workout. Duration must be from 1 to 480 minutes; calories are optional and default to zero. The weekly cards use the Monday-to-Sunday calendar week.

### SQL milestone programs

- `fitness_datatypes.sql` demonstrates built-in operations on integer, numeric, varchar, and boolean values.
- `fitness_structures.sql` demonstrates arrays, records, a `FOREACH` loop, and conditional logic.
- `fitness_exception handling` demonstrates PL/pgSQL exception handling and batch import error logging.

The included `compose.yaml` starts a standalone PostgreSQL service for running those classroom scripts with `psql`. The UI uses its own local browser database.
