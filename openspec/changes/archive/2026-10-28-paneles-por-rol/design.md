# Design

## Context

Ver `proposal.md` — Why. El estado actual que condiciona el enfoque:

- Un solo grupo `app/(app)` con un único `AppShell`; el rol solo se usa para ocultar el compositor (`app/(app)/layout.tsx:29`, `app/(app)/page.tsx:35`).
- La RLS ya separa los datos: `children` y `rooms` son staff-only (`20261027054516_open_children_and_rooms_access.sql`), las publicaciones tienen `posts_select_parent` acotada a los hijos del padre y a los anuncios de su sala (`20261028025723_open_post_access.sql`).
- Un padre **no puede** leer `children` (fichas), ni `rooms`, ni las filas de `users` del personal. Por eso `getFeedPosts()` ya devuelve `author` y `room` en `null` para un padre.
- `proxy.ts` refresca la sesión pero por convención del repo no consulta la base; los claims de Supabase no incluyen el rol de producto (`user_role`).
- `cacheComponents` + PPR están activos: los datos de request van dentro de `<Suspense>` y no se usan route configs (`dynamic`, `revalidate`, `runtime`).

## Goals / Non-Goals

**Goals:**

- Dos paneles con rutas, layouts, navegación y guards propios, sin duplicar el marco visual.
- Un modelo de lectura mínimo y explícito para el panel de familia: hijos, autor y sala.
- Datos demo suficientes para verificar el feed contra `references/screenshots/parent-feed.png`.

**Non-Goals:**

- Contenido de "Resumen del día" (no existe modelo de comidas, siestas ni ánimo) y de "Mi cuenta" de familia.
- "Avisos", comentarios, likes funcionales y edición de publicaciones.
- Navegación móvil propia para familia (bottom nav); el mockup no la define.
- Cambiar el flujo de invitaciones o el registro de padres.

## Decisions

### D1. `(staff)` como grupo y `familia` como segmento literal

```
app/(app)/layout.tsx            sesión + Suspense (sin shell)
app/(app)/(staff)/layout.tsx    shell de staff
app/(app)/(staff)/page.tsx      /
app/(app)/(staff)/ninos/...     /ninos, /ninos/[id]
app/(app)/familia/layout.tsx    shell de familia
app/(app)/familia/page.tsx      /familia
```

El grupo `(staff)` conserva las URLs actuales (no rompe specs 01, 02, 12 ni enlaces guardados). `familia` es un segmento literal, así que su layout anida y no compite por `/` con el grupo. Alternativas descartadas: un shell único que cambia por rol (obliga a ramificar cada página y el skeleton) y `/staff/*` (renombra rutas ya verificadas).

### D2. El guard de rol vive en el data access layer

`app/_lib/auth.ts` suma `requireRole(roles)` sobre `getCurrentUser()` —que ya está cacheado por request— y redirige al panel propio. El `proxy.ts` mantiene su rol optimista de sesión: consultar el rol ahí exigiría una query por request, contra la regla del repo y el costo de PPR.

Consecuencia: con PPR el redirect puede resolverse después del primer byte (soft redirect). Se acepta porque `getCurrentUser()` ya usa ese mecanismo para `/login` y la UX es la misma. Alternativa futura: un Custom Access Token Hook que agregue `user_role` al JWT y permita decidir en el proxy; no hace falta ahora y agrega configuración de Auth.

### D3. `family_overview()` en lugar de abrir `children`

Una función `security definer` que devuelve el nombre del daycare y, por hijo vinculado, `child_id`, primer nombre, sala y parentesco. Patrón de `get_invitation_preview`: siempre al menos una fila, "sin hijos" es un estado, no un error.

```sql
-- forma, no SQL final
select d.name, c.id, split_part(c.full_name, ' ', 1), r.name, px.relationship
from public.users u
join public.daycares d on d.id = u.daycare_id
left join public.parent_children px on px.parent_id = u.id
left join public.children c on c.id = px.child_id
left join public.rooms r on r.id = c.room_id
where u.id = (select auth.uid()) and u.role = 'parent' and u.status = 'active';
```

Descartado: policy `children_select_parent` de fila completa (el padre leería notas médicas, alergias y fecha de nacimiento de sus hijos) y grants por columna (Postgres no permite RLS por columna; el grant de tabla ya es amplio y habría que revocarlo, rompiendo `getCurrentUser`).

### D4. Policies angostas para autor y sala, no un RPC de feed

- `current_daycare_id()`: helper `security definer` que devuelve el daycare del usuario activo **sin** filtrar por rol. `current_staff_daycare_id()` no sirve: devuelve `null` para padres por diseño.
- `users_select_staff_of_daycare`: permite leer filas `admin`/`staff` del propio daycare. Necesario para "Maestra Caro".
- `rooms_select_parent`: permite leer las salas donde el usuario tiene un hijo. Necesario para "Sala Soles" y para los anuncios de sala.

Así `getFeedPosts()` sigue siendo el único camino de lectura del feed para ambos roles. Descartado `family_feed()` como RPC: duplicaría la consulta, la paginación y el firmado de fotos. Descartado abrir `children`: ya resuelto por D3.

Trade-off aceptado: un padre pasa a leer columnas no sensibles de las filas de staff (`notify_on_post`, `daily_summary_enabled`, `avatar_url`). La tabla no tiene email ni datos personales.

### D5. Una sola consulta de feed con nombres resueltos en dos fuentes

`getFeedPosts()` selecciona `post_children(child_id, children(full_name))`. Para staff, el join embebido resuelve el nombre; para familia viene `null` (RLS) y se completa con el mapa de `family_overview()`. La etiqueta de audiencia ("familia de Mateo") y el nombre del hijo en la tarjeta usan el mismo mapa. Un solo camino, sin ramas por rol en la consulta.

### D6. Aterrizaje por rol en login y activación

`login` y `activateAccount` redirigen a `/familia` cuando el perfil es `parent` y no hay `next`. Si hay `next`, se conserva `resolveNextPath()` y el guard de D2 corrige el cruce de panel. No se toca la sanitización existente.

### D7. Marco de shell compartido, navegación como dato

Se extrae el marco visual (ancho del aside, barra superior, `main` con scroll) y se parametriza con `navItems`, acción principal y pie. `AppShell` (staff) y `FamilyShell` quedan finos y sin duplicar estilos. El pie recibe un subtítulo ya resuelto: rol para staff, "Mamá de Mateo y Sofía" para familia.

### D8. Filtro de chips en cliente, anuncios siempre visibles para la sala

Los chips filtran el array de publicaciones ya cargado (`FEED_PAGE_SIZE`), sin URL ni refetch, con "Todos" por defecto. Una publicación se considera del hijo si `post_children` incluye su id; un anuncio de sala se muestra cuando el hijo seleccionado pertenece a esa sala. Descartado el filtro por query param: suma Suspense y una recarga por chip sin necesidad con este volumen.

### D9. Seed de familia separado y omitible

Migración de seed independiente (como `seed_users_demo`): usuario de Auth + `users` para Lucía, dos niños y sus vínculos, y publicaciones dirigidas a ellos más un anuncio de sala. Sin publicaciones no hay nada que comparar visualmente: hoy `public.posts` está vacío.

### D10. Tipos generados

`utils/supabase/database.types.ts` se regenera después de las migraciones (RPC y enum de parentesco) y se commitea; no se edita a mano.

## Risks / Trade-offs

- **Redirect suave bajo PPR** → el guard puede resolverse del lado del cliente; se verifica con Playwright que no haya bucle con `/login?error=no-account` y que la URL final sea la esperada.
- **`users_select_staff_of_daycare` amplía lectura** → limitada a filas de staff/admin del propio daycare; se documenta en `supabase/README.md` junto al resto de policies.
- **Recursión de RLS en `users`** → `current_daycare_id()` es `security definer` con `search_path` fijo, igual que `current_staff_daycare_id()`.
- **El seed cambia conteos visibles** → el listado del staff y el "12 niños" de las capturas de referencia dejan de coincidir; se anota en la verificación, no es una regresión.
- **Padres con hijos en salas distintas** → los anuncios de ambas salas se muestran; es el comportamiento correcto y se cubre con un escenario del spec.
- **Dos shells que se desalinean visualmente** → el marco y los tokens viven en un solo componente; la verificación compara ambas capturas.
- **Credenciales demo en migraciones** → ya es el patrón del repo; la de familia se documenta en `README.md` y se omite al promover.

## Migration Plan

1. Aplicar por MCP, en orden y con verificación entre pasos: `current_daycare_id()`, policies, `family_overview()`, seed de familia y publicaciones.
2. Regenerar tipos y confirmar que el build los consume.
3. Desplegar la UI en un solo cambio: el grupo `(staff)` no altera URLs de staff, y `/familia` es nuevo.
4. Rollback: revertir el commit de UI y luego `drop function family_overview()`, `drop function current_daycare_id()` y las dos policies; el seed se revierte borrando las filas con los UUID fijos.

## Open Questions

- Copy del estado vacío de familia (el mockup no lo define); se reutiliza el del feed de staff hasta que producto lo defina.
- Si una publicación dirigida a dos hijos debe mostrar ambos nombres o el del hijo filtrado; por ahora se muestra el nombre del hijo filtrado y, en "Todos", el primero.
