# Supabase

Objetivo: crear o conectar un proyecto Supabase para el ranking online.

El repo no migra scores. Solo define la tabla, constraints, RLS y policies.

## 1. Crear proyecto

En Supabase Dashboard:

1. Crear un proyecto.
2. Copiar:
   - `Project URL`
   - `anon public key`
   - `Project ref`
   - database password

## 2. Crear la tabla y policies

Forma simple:

1. Abrir `supabase/migrations/20260517000000_create_scores.sql`.
2. Copiar todo el SQL.
3. En Supabase, ir a `SQL Editor`.
4. Pegar y ejecutar.

Ese SQL:

- crea `public.scores` si no existe;
- activa RLS;
- permite leer ranking;
- permite insertar scores validos;
- no borra scores;
- no inserta datos.

## 3. Conectar el juego

Copiar `.env.example` a `.env` y completar:

```txt
SUPABASE_URL=https://tu-project-ref.supabase.co
SUPABASE_ANON_KEY=tu-anon-key-publica
SUPABASE_PROJECT_REF=tu-project-ref
SUPABASE_DB_PASSWORD=tu-password-de-db
```

Generar la config publica:

```powershell
npm run supabase:config
```

Esto actualiza `js/supabase-config.js`.

## 4. Probar

```powershell
npm test
```

Despues abrir el juego, terminar una partida y confirmar que aparece una fila en
`public.scores`.

## Nota

La anon key es publica en una app web. Esta bien mientras RLS este activo y las
policies sean las del SQL versionado.
