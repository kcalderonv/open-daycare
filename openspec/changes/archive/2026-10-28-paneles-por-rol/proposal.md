# Proposal

## Why

Hoy los tres roles (`admin`, `staff`, `parent`) comparten un único shell y un único conjunto de rutas. Un padre que inicia sesión ve el panel del staff: el nav le ofrece "Niños" y la página responde con un cartel de error porque la RLS no le devuelve filas. La base de datos ya separa los datos por rol y los mockups ya definen dos experiencias distintas (staff y familia); lo que falta es que la app las refleje.

## What Changes

- **Rutas separadas**: las pantallas actuales pasan al grupo `(staff)` y conservan sus URLs (`/`, `/ninos`, `/ninos/[id]`); el panel de familia vive en el segmento `/familia` con su propio layout.
- **Guard por rol**: `requireRole()` en el data access layer redirige al panel propio cuando un usuario entra al que no le corresponde (un padre en `/ninos` → `/familia`; una maestra en `/familia` → `/`). El `proxy.ts` sigue sin consultar la base.
- **Landing por rol**: después del login y de la activación de cuenta, cada rol aterriza en su panel; un `next` que cruce de panel se corrige con el guard.
- **Shells distintos**: marco compartido con navegación por prop. El staff conserva las 4 secciones y "Nueva publicación"; la familia tiene Feed, Resumen del día y Mi cuenta (`#` por ahora, como el staff), sin composer, y su pie muestra el parentesco ("Mamá de Mateo y Sofía").
- **Feed de familia**: encabezado "TU FAMILIA", chips por hijo (`Todos` por defecto, filtro en cliente) y tarjeta con el niño como protagonista, "14:56 · Maestra Caro - Sala Soles", sin "Editar".
- **Modelo de lectura de familia**: RPC `family_overview()` para hijos, sala y parentesco; policies angostas `users_select_staff_of_daycare` y `rooms_select_parent` para resolver autor y sala dentro del feed, más el helper `current_daycare_id()`.
- **Seed demo**: una familia de prueba (Lucía Fernández con Mateo y Sofía) y publicaciones, para poder verificar el panel contra `references/screenshots/parent-feed.png`.
- **BREAKING** (acotado): `/ninos` deja de ser accesible para `parent`; responde con redirect a `/familia`. Las URLs del staff no cambian.

## Capabilities

### New Capabilities

- `paneles-por-rol`: separación de la experiencia por rol — rutas, shells, guards, landing posterior al login y el modelo de lectura que el panel de familia necesita para mostrar hijos, autor y sala sin exponer datos de otros niños.

### Modified Capabilities

Ninguna. El proyecto todavía no tiene capabilities declaradas en OpenSpec; el comportamiento existente se documenta por primera vez en la capability nueva.

## Impact

- `app/_lib/auth.ts`: `requireRole()` y el usuario actual con rol.
- `app/(app)/`: nuevo grupo `(staff)`, nuevo segmento `familia/`, layouts y shells separados.
- `app/_components/`: shell/sidebar parametrizados, tarjeta de publicación con variante de familia, chips.
- `app/_lib/post-queries.ts`: nombres de hijos resueltos con `family_overview()`.
- `supabase/migrations/`: helper `current_daycare_id()`, RPC `family_overview()`, policies `users_select_staff_of_daycare` y `rooms_select_parent`, seed de familia y publicaciones.
- `utils/supabase/database.types.ts`: regeneración por las funciones nuevas.
- Secundario: el seed suma niños y publicaciones, así que las comparaciones visuales de las specs 01, 02 y 12 dejan de coincidir en conteos.
