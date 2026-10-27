# SPEC 10 — Mantenimiento de niños: tablas `rooms` y `children` y pantalla `/ninos` real

> **Status:** Aprovado
> **Depends on:** SPEC 02, SPEC 04, SPEC 07, SPEC 08, SPEC 09
> **Date:** 2026-10-27
> **Objective:** Crear `public.rooms` y `public.children` en Supabase con tres salas demo y cero niños, y conectar `/ninos` y `/ninos/[id]` para listar, crear y editar niños reales.

## Por qué existe esta spec

- Hasta hoy `public` solo tiene `daycares` y `users`; todos los datos de niños viven en `app/_data/children.ts` y no se persisten. Esta es la primera pantalla del producto que escribe en la base.
- El diccionario `07-DB-Schema` define `rooms` y `children`, pero también define `parent_children`, `invitations` y `posts`, que no existen todavía. Esta spec materializa solo las dos primeras y deja explícito el resto.
- `/ninos` arrastra mocks en la lista, en el perfil y en el formulario. El formulario de SPEC 04 valida pero no guarda. Sin esta spec no hay forma de que un niño exista de verdad.
- Fija el patrón de escritura desde la app: DAL en `app/_lib/`, Server Action, RLS por daycare y refresco de la vista. Las próximas entidades (`posts`, `invitations`, `parent_children`) lo van a repetir.

## Scope

**In:**

- `supabase/migrations/<version>_create_child_status_enum.sql`: enum `public.child_status` (`active`, `archived`) con guarda de re-aplicación.
- `supabase/migrations/<version>_create_rooms.sql`: tabla `public.rooms` con `daycare_id`, `name`, `slug`, `position`, constraints, índice, RLS cerrado y grants a `service_role`.
- `supabase/migrations/<version>_seed_rooms_demo.sql`: tres salas para `sala-soles` — Soles (posición 1), Lunas (2) y Estrellas (3) — idempotente.
- `supabase/migrations/<version>_create_children.sql`: tabla `public.children` con 12 columnas, FK compuesta a `rooms`, índices, trigger de `updated_at`, RLS cerrado y grants a `service_role`.
- `supabase/migrations/<version>_open_children_and_rooms_access.sql`: policies de lectura para `rooms` y de lectura/alta/edición para `children`, más grants a `authenticated`.
- Aplicar las cinco migraciones con el MCP `apply_migration` y versionarlas en `supabase/migrations/`.
- `utils/supabase/database.types.ts`: regenerado con `generate_typescript_types` después de las migraciones.
- `supabase/README.md`: sección **Niños y salas** con el modelo de acceso y la FK compuesta.
- `app/_lib/children.ts`: dominio puro — tipos `Child`, `Room`, `ChildTone`, `ChildTag`, `Parent`; helpers de edad, fechas, tono, etiquetas de alergia y agrupación por sala.
- `app/_lib/children-queries.ts`: DAL con `getRooms`, `getChildren` y `getChild` contra Supabase y mapeo de filas a `Child`.
- `app/_lib/auth.ts`: `CurrentUser` suma `daycareId` y el `select` lo trae.
- `app/(app)/ninos/page.tsx`: server component con `<Suspense>`, tres secciones de sala, contador y estado vacío por sala.
- `app/(app)/ninos/actions.ts`: Server Actions `createChild` y `updateChild` con validación en servidor.
- `app/(app)/ninos/[id]/page.tsx`: perfil con datos reales por UUID, sin `generateStaticParams` ni mocks.
- `app/_components/children/children-search.tsx`: recibe grupos por sala, filtra en cliente y oculta salas sin coincidencias.
- `app/_components/children/child-card.tsx`, `child-tag.tsx`, `child-avatar.tsx`, `child-allergy-note.tsx`, `child-info-table.tsx`, `child-profile-header.tsx`, `child-parents-card.tsx`, `parent-invite-form.tsx`: pasan a los tipos nuevos y a los datos de la DAL.
- `app/_components/children/child-form.tsx`: recibe las salas reales, conserva la validación de SPEC 04, llama a la action, muestra error inline, estado `Guardando…` y cierra al guardar.
- `app/(app)/ninos/page.tsx` y `app/_components/children/child-profile-header.tsx`: pasan las salas al formulario en modo alta y edición.
- `app/_data/feed-audience.ts`: nuevo archivo con los 8 niños mock que usa el composer de publicaciones (antes en `_data/children.ts`).
- `app/_components/feed/post-form.tsx` y `app/_components/feed/post-composer-provider.tsx`: cambian el import a `_data/feed-audience.ts`.
- `app/_data/children.ts`: se elimina al terminar de migrar sus consumidores.
- `proxy.ts`: el 404 de `/ninos/[id]` valida formato UUID en lugar de la lista de slugs mock.
- Degradación: las tres secciones y el estado vacío funcionan a 390px; el modal y el perfil conservan su comportamiento responsive actual.

**Out of scope (para specs futuras):**

- `parent_children`, `invitations`, padres reales y el conteo real de "padres vinculados".
- Archivar o borrar niños: no hay borrado lógico en la UI ni policy de `delete`.
- Mantenimiento de salas: no hay pantalla de alta, edición o baja de `rooms`.
- Datos reales en el feed y en el composer de publicaciones.
- Fotos del niño, Storage, `photo_consent` editable y subida de imágenes.
- Resumen del día, publicaciones, comentarios y reacciones.
- Toasts, estados de éxito, borradores y notificaciones.
- Tests automatizados más allá de la verificación manual con Playwright.
- Modo oscuro, i18n y rediseño mobile más allá de la degradación descrita.

## Data model

### Enum `child_status`

```sql
-- supabase/migrations/<version>_create_child_status_enum.sql
do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'child_status' and n.nspname = 'public'
  ) then
    create type public.child_status as enum ('active', 'archived');
  end if;
end
$$;

revoke all on type public.child_status from public, anon, authenticated;
grant usage on type public.child_status to service_role;
```

Convenciones:

- Los labels van en inglés y en orden estable `active < archived`; la traducción vive en la UI.
- `create type` no admite `if not exists`: se reutiliza la guarda sobre `pg_type` + `pg_namespace` documentada en `supabase/README.md`.
- `USAGE` se cierra y se vuelve a conceder en la migración de acceso de esta misma spec.

### Tabla `rooms`

```sql
-- supabase/migrations/<version>_create_rooms.sql
create table public.rooms (
  id         uuid primary key default gen_random_uuid(),
  daycare_id uuid not null,
  name       text not null,
  slug       text not null,
  position   smallint not null default 0,
  created_at timestamptz not null default now(),

  constraint rooms_daycare_fkey foreign key (daycare_id)
    references public.daycares (id) on delete restrict,
  constraint rooms_daycare_slug_key unique (daycare_id, slug),
  constraint rooms_id_daycare_key unique (id, daycare_id),
  constraint rooms_name_length check (char_length(btrim(name)) between 2 and 60),
  constraint rooms_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint rooms_position check (position >= 0)
);

create index rooms_daycare_id_idx on public.rooms (daycare_id);

alter table public.rooms enable row level security;
revoke all on table public.rooms from anon, authenticated;
grant all on table public.rooms to service_role;
```

Convenciones:

- `name` es el nombre visible sin prefijo (`Soles`); la UI agrega `SALA ` en mayúsculas.
- `slug` es la clave estable del seed (`soles`, `lunas`, `estrellas`) y se repite entre daycares.
- `position` no está en el diccionario: se agrega para ordenar las salas en `/ninos` de forma estable (Soles, Lunas, Estrellas).
- `unique (id, daycare_id)` es redundante con la PK, pero es el destino obligatorio de la FK compuesta de `children`.
- `on delete restrict`: borrar una sala con niños falla; la baja de salas no existe en esta spec.
- Sin `updated_at`: en esta spec las salas son de solo lectura desde la app.

### Seed de salas

```sql
-- supabase/migrations/<version>_seed_rooms_demo.sql
insert into public.rooms (daycare_id, name, slug, position)
select d.id, v.name, v.slug, v.position
from public.daycares d
cross join (
  values
    ('Soles', 'soles', 1::smallint),
    ('Lunas', 'lunas', 2::smallint),
    ('Estrellas', 'estrellas', 3::smallint)
) as v(name, slug, position)
where d.slug = 'sala-soles'
on conflict (daycare_id, slug) do nothing;
```

- El seed no crea ningún niño: `public.children` queda con 0 filas.
- Si `sala-soles` no existe, inserta 0 filas y el criterio de conteo lo detecta.

### Tabla `children`

```sql
-- supabase/migrations/<version>_create_children.sql
create table public.children (
  id            uuid primary key default gen_random_uuid(),
  daycare_id    uuid not null,
  room_id       uuid,
  full_name     text not null,
  birth_date    date not null,
  enrolled_at   date not null default current_date,
  medical_notes text,
  allergy_tags  text[] not null default '{}',
  photo_consent boolean not null default true,
  status        public.child_status not null default 'active',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  constraint children_daycare_fkey foreign key (daycare_id)
    references public.daycares (id) on delete restrict,
  constraint children_room_fkey foreign key (room_id, daycare_id)
    references public.rooms (id, daycare_id) on delete restrict,
  constraint children_full_name_length
    check (char_length(btrim(full_name)) between 2 and 120),
  constraint children_medical_notes_length
    check (medical_notes is null or char_length(medical_notes) <= 500),
  constraint children_allergy_tags_format
    check (
      array_position(allergy_tags, '') is null
      and coalesce(array_length(allergy_tags, 1), 0) <= 12
    )
);

create index children_daycare_status_idx on public.children (daycare_id, status);
create index children_room_id_idx on public.children (room_id);

create trigger children_set_updated_at
before update on public.children
for each row execute function public.set_updated_at();

alter table public.children enable row level security;
revoke all on table public.children from anon, authenticated;
grant all on table public.children to service_role;
```

Convenciones:

- `daycare_id` no está en el diccionario: se agrega porque las policies y la tenencia no pueden depender de un `room_id` nullable. Un niño sin sala sigue teniendo daycare.
- `room_id` nullable, como pide el diccionario. La FK compuesta `(room_id, daycare_id)` impide asignar una sala de otra guardería; con `room_id` null no se evalúa.
- `full_name` 2–120, igual que `users.full_name`.
- `birth_date` obligatoria. La fecha futura se valida en la action, no con un `check` que dependa de `current_date`.
- `enrolled_at` default `current_date`, `photo_consent` default `true`, `status` default `active`: el formulario no los pide y esta spec no los edita.
- `allergy_tags` es `text[]` en inglés (`peanut`, `lactose`, …), tal como el diccionario. El máximo de 12 y la ausencia de strings vacíos son checks.
- `medical_notes` es el texto libre de "NOTAS MÉDICAS", máximo 500.
- `updated_at` reutiliza `public.set_updated_at()` de SPEC 07.
- Sin `deleted_at`: la baja lógica es `status = 'archived'` y queda fuera de esta spec.

### Policies y grants

```sql
-- supabase/migrations/<version>_open_children_and_rooms_access.sql
drop policy if exists rooms_select_staff on public.rooms;

create policy rooms_select_staff
on public.rooms
for select
to authenticated
using (
  exists (
    select 1
    from public.users u
    where u.id = (select auth.uid())
      and u.status = 'active'
      and u.role in ('admin', 'staff')
      and u.daycare_id = rooms.daycare_id
  )
);

grant select on table public.rooms to authenticated;

drop policy if exists children_select_staff on public.children;
drop policy if exists children_insert_staff on public.children;
drop policy if exists children_update_staff on public.children;

create policy children_select_staff
on public.children
for select
to authenticated
using (
  exists (
    select 1
    from public.users u
    where u.id = (select auth.uid())
      and u.status = 'active'
      and u.role in ('admin', 'staff')
      and u.daycare_id = children.daycare_id
  )
);

create policy children_insert_staff
on public.children
for insert
to authenticated
with check (
  exists (
    select 1
    from public.users u
    where u.id = (select auth.uid())
      and u.status = 'active'
      and u.role in ('admin', 'staff')
      and u.daycare_id = children.daycare_id
  )
);

create policy children_update_staff
on public.children
for update
to authenticated
using (
  exists (
    select 1
    from public.users u
    where u.id = (select auth.uid())
      and u.status = 'active'
      and u.role in ('admin', 'staff')
      and u.daycare_id = children.daycare_id
  )
)
with check (
  exists (
    select 1
    from public.users u
    where u.id = (select auth.uid())
      and u.status = 'active'
      and u.role in ('admin', 'staff')
      and u.daycare_id = children.daycare_id
  )
);

grant select, insert, update on table public.children to authenticated;
grant usage on type public.child_status to authenticated;
```

Convenciones:

- **La referencia al daycare va calificada** (`children.daycare_id`, `rooms.daycare_id`). Sin el prefijo, `daycare_id` dentro del subquery resuelve a `u.daycare_id` y la policy se vuelve un `true` que filtra entre guarderías.
- El subquery sobre `public.users` funciona porque `users_select_own` (SPEC 09) deja al usuario leer su propia fila.
- Solo `admin` y `staff` leen y escriben. Los padres no ven niños hasta que exista `parent_children`; esa restricción va en su propia spec.
- `rooms` no tiene INSERT/UPDATE: no hay UI de salas y el seed corre como `service_role`.
- No hay policy de `delete` ni se concede `DELETE`: la baja lógica no está en esta spec.
- `anon` sigue sin grants. `service_role` conserva acceso completo.

### Contratos de la app

```ts
// app/_lib/children.ts — dominio puro, sin Supabase
export type ChildTone = "sky" | "rose" | "sage" | "sun" | "lilac";

export type ParentRelationship = "mother" | "father" | "guardian";
export type ParentStatus = "active" | "pending";

export type Parent = {
  id: string;
  name: string;
  relationship: ParentRelationship;
  status: ParentStatus;
};

export type Room = {
  id: string;
  name: string; // "Soles"
  slug: string; // "soles"
  position: number;
};

export type Child = {
  id: string; // uuid
  fullName: string;
  firstName: string;
  initial: string;
  tone: ChildTone;
  birthDate: string; // "2022-04-15"
  birthDateLabel: string; // "15 abr 2022"
  birthDateInput: string; // "15/04/2022"
  enrolledAt: string; // "2026-10-27"
  enrolledAtLabel: string; // "oct 2026"
  ageLabel: string; // "4 años"
  roomId: string | null;
  roomName: string | null; // "Soles"
  allergyTags: string[]; // ["peanut", "lactose"]
  allergies: { label: string; note: string }[]; // compatibilidad con la UI
  medicalNotes: string | null;
  status: "active" | "archived";
  parents: Parent[]; // [] hasta que exista parent_children
};

export type ChildTag = { kind: "allergy"; label: string } | { kind: "link-pending" };
export type ChildGroup = { id: string; title: string; children: Child[] };

export function ageLabel(birthDate: string, today?: Date): string;
export function formatLongDate(iso: string): string; // "15 abr 2022"
export function formatMonthYear(iso: string): string; // "oct 2026"
export function toInputDate(iso: string): string; // "15/04/2022"
export function fromInputDate(value: string): string; // "2022-04-15" | ""
export function toneForId(id: string): ChildTone;
export function toAllergyTags(input: string): string[];
export function allergyLabel(tag: string): string;
export function getChildTag(child: Child): ChildTag | null;
export function parentsSummary(count: number): string;
export function groupChildrenByRoom(rooms: Room[], children: Child[]): ChildGroup[];
```

```ts
// app/_lib/children-queries.ts — Server only por uso
export function getRooms(daycareId: string): Promise<Room[]>; // orden: position, name
export function getChildren(daycareId: string): Promise<Child[]>; // status = 'active'
export function getChild(daycareId: string, id: string): Promise<Child | null>;
```

```ts
// app/(app)/ninos/actions.ts
export type ChildMutationResult = { ok: true } | { ok: false; error: string };
export function createChild(formData: FormData): Promise<ChildMutationResult>;
export function updateChild(
  childId: string,
  formData: FormData,
): Promise<ChildMutationResult>;
```

```ts
// app/_lib/auth.ts
export type CurrentUser = {
  id: string;
  fullName: string;
  role: UserRole;
  daycareId: string; // nuevo
};
```

Convenciones:

- `children.ts` no importa `@supabase/*` ni `next/headers`: lo consumen también client components. Las consultas viven en `children-queries.ts`.
- `getRooms` y `getChildren` filtran por `daycare_id` además de la RLS, para que la intención quede en el código.
- `getChild` filtra por `id`, `daycare_id` y `status = 'active'`; si no hay fila devuelve `null`.
- `firstName` es el primer token de `full_name`; `initial` es su primera letra en mayúscula.
- `tone` se deriva del UUID con un hash estable sobre la lista de 5 tonos. No hay columna de color.
- `allergies` se reconstruye desde `allergy_tags` con `allergyLabel(tag)` y la misma `medical_notes` en cada entrada, para no tocar la firma de `ChildAllergyNote`.
- `groupChildrenByRoom` devuelve una entrada por sala en el orden de `rooms` y, solo si hay niños con `room_id` null, una última con `id = "unassigned"` y `title = "SIN SALA"`.
- `getChildTag`: primera alergia → badge con su etiqueta; sin alergias y `parents.length === 0` → `link-pending`; en otro caso `null`. Se conserva el comportamiento de SPEC 02.

### Fechas, edad y alergias

- `formatLongDate` usa `Intl.DateTimeFormat("es-PE", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" })` y quita los puntos del mes: `15 abr 2022`. `es-AR` se descarta porque devuelve `15 de abr de 2022`.
- `formatMonthYear` usa el mismo locale y `timeZone: "UTC"` con `{ month: "short", year: "numeric" }`: `oct 2026`.
- Las fechas `date` se interpretan al mediodía UTC (`${iso}T12:00:00Z`) para que el huso del servidor no corra el día.
- `ageLabel`: años completos comparando año, mes y día contra `today` (por defecto `new Date()`). `0 → "menos de 1 año"`, `1 → "1 año"`, `n → "${n} años"`.
- `fromInputDate` acepta `dd/mm/aaaa` y devuelve `aaaa-mm-dd`; si el día o el mes no existen, devuelve `""`.
- `toAllergyTags` separa por comas, normaliza sin acentos y mapea sinónimos conocidos: `maní/mani → peanut`, `lactosa → lactose`, `gluten → gluten`, `huevo → egg`, `frutos secos → nuts`, `mariscos → shellfish`, `soya → soy`, `pescado → fish`. Lo desconocido se guarda como slug en minúsculas (`colorante → colorante`). Deduplica y corta en 12.
- `allergyLabel` traduce las conocidas a mayúsculas (`peanut → MANÍ`, `lactose → LACTOSA`, …) y devuelve el tag en mayúsculas si no está en el mapa.

### Copy y estados

| Situación | Texto |
| --- | --- |
| Sección de sala | `SALA {NOMBRE}` en mayúsculas |
| Conteo | `1 niño` / `N niños` |
| Sala sin niños | `Todavía no hay niños en esta sala.` |
| Grupo sin sala | `SIN SALA` |
| Búsqueda sin resultados | `No encontramos ningún niño con ese nombre.` |
| Error al listar | `No pudimos cargar los niños. Recargá la página.` |
| Error al abrir el perfil | `No pudimos cargar el perfil. Recargá la página.` |
| Error al guardar | `No pudimos guardar los cambios. Intentá de nuevo.` |
| Guardar pendiente | `Guardando…` |
| Meta de la tarjeta | `{ageLabel} · {parentsSummary(0)}` → `4 años · sin padres vinculados` |
| Subtítulo del perfil | `{ageLabel} · Sala {roomName}` o `{ageLabel} · Sin sala` |
| Panel de alergia | `{etiquetas separadas por ", "}` + ` · ` + `medical_notes` si existe |

## Convenciones de código

Se mantienen las de SPEC 01 a 09: identificadores en inglés, copy en español, named exports, sin `any`, sin `style={{}}`, sin hex en el JSX y sin configs de ruta (`dynamic`, `revalidate`, `fetchCache`, `runtime`, `dynamicParams`).

Específicas de esta spec:

- **Dos módulos de niños**: `app/_lib/children.ts` (puro, importable desde cliente) y `app/_lib/children-queries.ts` (Supabase). Nunca al revés.
- **Server Actions en `app/(app)/ninos/actions.ts`** con `"use server"`. Las páginas y componentes siguen siendo server components salvo los que ya eran cliente (`children-search.tsx`, `child-form.tsx`, `form-dialog.tsx`, `modal-dialog.tsx`).
- **Lectura dentro de `<Suspense>`**: `/ninos` envuelve el contenido que consulta la base en un boundary con skeleton; el perfil conserva el suyo alrededor de `params`.
- **`getCurrentUser` es la única fuente del `daycareId`**: la action no lo lee de un input ni lo adivina.
- **La action valida todo otra vez**: nombre 2–120, fecha real y no futura, `room_id` existente en el daycare del usuario, notas ≤ 500, hasta 12 etiquetas. El cliente puede ser más estricto (60 caracteres de nombre, como SPEC 04).
- **Errores de la action**: `{ ok: false, error }` con los textos de la tabla. Nunca se devuelve el error crudo de Postgres.
- **Mutación desde el cliente con `useTransition`**, no `useActionState`: así el error se limpia con el `reset` del formulario al cerrar el modal y no reaparece en la siguiente apertura.
- **`router.refresh()` después de un guardado exitoso** y `revalidatePath("/ninos", "layout")` en la action. La lista no usa `use cache`: se lee en cada request.
- **`form.reset()` no debe perder el valor inicial**: los `defaultValue` de edición se calculan de `child`, y el reset los restaura.
- **El proxy no consulta la base**: solo valida el formato UUID (decisión de SPEC 09).
- **El composer no cambia de comportamiento**: sus 8 destinatarios mock se mueven a `app/_data/feed-audience.ts`.
- **No se toca el layout de SPEC 04**: el modal conserva labels, placeholders, medidas y orden de campos; solo cambian las opciones de SALA y el submit.

## Implementation plan

1. **Enum.** Aplicar `create_child_status_enum` con `apply_migration`, anotar el `version` y crear el archivo. Test: `enum_range(null::public.child_status)` devuelve `{active,archived}` y `has_type_privilege('anon', …)` es `false`.
2. **Salas.** Aplicar `create_rooms`, crear el archivo. Test: `list_tables` muestra `rooms` con 6 columnas, PK `id`, unique `(daycare_id, slug)` y `relrowsecurity = true`.
3. **Seed de salas.** Aplicar `seed_rooms_demo`, crear el archivo. Test: `select count(*) from public.rooms` = 3 y las tres filas apuntan a `sala-soles` con posiciones 1, 2 y 3.
4. **Niños.** Aplicar `create_children`, crear el archivo. Test: 12 columnas, FK `children_room_fkey` compuesta, trigger `children_set_updated_at` y `count(*) = 0`.
5. **Acceso.** Aplicar `open_children_and_rooms_access`, crear el archivo. Test: 4 policies en `pg_policies`, grants de `authenticated` sin `DELETE`, `anon` sin filas, `USAGE` del enum concedido a `authenticated`.
6. **Tipos.** Correr `generate_typescript_types` y reemplazar `utils/supabase/database.types.ts`. Test: `npx tsc --noEmit` limpio y el archivo incluye `rooms`, `children` y el enum `child_status`.
7. **Dominio puro.** Crear `app/_lib/children.ts` con los tipos y helpers; sumar `daycareId` a `CurrentUser` en `app/_lib/auth.ts`. Test: `npx tsc --noEmit` limpio.
8. **DAL.** Crear `app/_lib/children-queries.ts` con las tres consultas y el mapeo de filas. Test: `npx tsc --noEmit` limpio.
9. **Lista y perfil reales.** Reemplazar los mocks de `/ninos` y `/ninos/[id]`: tres secciones por sala con contador y estado vacío, tarjetas con datos de la DAL, perfil por UUID con fechas formateadas, panel de alergias desde `allergy_tags` + `medical_notes` y padres vacíos. Adaptar `children-search.tsx`, `child-card.tsx`, `child-tag.tsx`, `child-avatar.tsx`, `child-allergy-note.tsx`, `child-info-table.tsx`, `child-profile-header.tsx`, `child-parents-card.tsx`, `parent-invite-form.tsx` y `child-form.tsx` (defaults y salas por props, todavía sin persistir). Cambiar `proxy.ts` a validación UUID y quitar su import de `_data/children`. Test: `/ninos` muestra las tres salas vacías, `/ninos/no-existe` sigue en 404 y `npm run build` compila.
10. **Escritura.** Crear `app/(app)/ninos/actions.ts` con `createChild` y `updateChild`, conectar `child-form.tsx` a las actions con `useTransition`, banner inline, `Guardando…`, cierre y `router.refresh()`. Test: crear "Martina López" desde `/ninos`, ver la tarjeta en SALA SOLES y la fila en la base; editar desde el perfil y ver el cambio en ambas pantallas.
11. **Limpieza de mocks.** Crear `app/_data/feed-audience.ts`, apuntar `post-form.tsx` y `post-composer-provider.tsx` ahí y eliminar `app/_data/children.ts`. Test: el composer abre, "Toda la sala" sigue mostrando los 8 chips y `grep -r "_data/children" app/ proxy.ts` no devuelve nada.
12. **Documentación y cierre.** Agregar la sección **Niños y salas** a `supabase/README.md`; correr `npm run build`, `npx tsc --noEmit`, `npx eslint app`; verificar con Playwright las pantallas a 1440 y 390; borrar el niño de prueba y confirmar que `children` vuelve a 0 filas.

## Acceptance criteria

- [ ] `list_migrations` incluye `create_child_status_enum`, `create_rooms`, `seed_rooms_demo`, `create_children` y `open_children_and_rooms_access`, y los cinco archivos de `supabase/migrations/` tienen el mismo `version`.
- [ ] `list_tables({ schemas: ["public"], verbose: true })` muestra `rooms` con 6 columnas y `children` con 12 columnas, ambas con PK en `id` y `rls_enabled: true`.
- [ ] `enum_range(null::public.child_status)` devuelve exactamente `{active,archived}`.
- [ ] `select count(*) from public.rooms` devuelve `3`.
- [ ] Las tres salas son `Soles`, `Lunas` y `Estrellas`, con `slug` `soles`/`lunas`/`estrellas`, `position` `1`/`2`/`3` y el mismo `daycare_id` que `sala-soles`.
- [ ] `select count(*) from public.children` devuelve `0` al terminar las migraciones.
- [ ] Re-ejecutar el `insert` del seed de salas dentro de una transacción con `rollback` deja el conteo en `3`.
- [ ] `pg_constraint` contiene `rooms_daycare_slug_key`, `rooms_id_daycare_key`, `children_room_fkey` (compuesta `(room_id, daycare_id) → rooms(id, daycare_id)`), `children_full_name_length` y `children_allergy_tags_format`.
- [ ] Existe el trigger `children_set_updated_at` apuntando a `public.set_updated_at()`.
- [ ] Existen las policies `rooms_select_staff`, `children_select_staff`, `children_insert_staff` y `children_update_staff`; no existe ninguna policy de `DELETE` en `rooms` ni en `children`.
- [ ] `information_schema.role_table_grants` no devuelve filas de `anon` para `rooms` ni `children`; `authenticated` tiene `SELECT` en `rooms` y `SELECT, INSERT, UPDATE` en `children`, sin `DELETE`.
- [ ] `has_type_privilege('authenticated', 'public.child_status', 'usage')` es `true` y para `anon` es `false`.
- [ ] `utils/supabase/database.types.ts` incluye `rooms`, `children` y el enum `child_status`.
- [ ] `npm run build` termina sin errores.
- [ ] `npx tsc --noEmit` termina sin errores.
- [ ] `npx eslint app` termina sin errores.
- [ ] La consola del navegador no muestra errores ni warnings de React en `/ninos`, en un perfil ni con el modal abierto y cerrado.
- [ ] Con sesión de staff/admin, `/ninos` muestra tres secciones en orden `SALA SOLES`, `SALA LUNAS`, `SALA ESTRELLAS`, cada una con `0 niños` y el texto `Todavía no hay niños en esta sala.`
- [ ] El `<select>` SALA del modal tiene exactamente tres opciones (`Soles`, `Lunas`, `Estrellas`) cuyos `value` son UUID reales de `public.rooms`, y la opción inicial es Soles.
- [ ] Crear "Martina López", 15/04/2022, sala Soles, alergias "Maní, Lactosa" y notas "Lleva inhalador." desde `/ninos` cierra el modal, deja la tarjeta en `SALA SOLES`, cambia el contador a `1 niño` y muestra el badge `MANÍ` y la meta `{edad calculada} · sin padres vinculados`.
- [ ] Tras ese alta, `select * from public.children` devuelve una fila con `full_name = 'Martina López'`, `birth_date = '2022-04-15'`, `room_id` de Soles, `allergy_tags = {peanut,lactose}`, `medical_notes = 'Lleva inhalador.'`, `enrolled_at = current_date`, `photo_consent = true`, `status = 'active'` y `daycare_id` de `sala-soles`.
- [ ] Hacer clic en la tarjeta navega a `/ninos/{uuid}` y el perfil muestra "Martina López", la edad calculada, "Sala Soles", `15 abr 2022`, `Soles`, el mes y año de ingreso, y el panel "Alergias y notas" con `MANÍ, LACTOSA · Lleva inhalador.`.
- [ ] El perfil de ese niño mantiene "PADRES VINCULADOS" sin filas y con el CTA "Vincular otro padre".
- [ ] "Editar" abre el modal precargado con "Martina López", `15/04/2022`, Soles, "MANÍ, LACTOSA" y "Lleva inhalador.".
- [ ] Cambiar el nombre a "Martina López Ruiz", la sala a Lunas y las alergias a "Gluten", y guardar, actualiza el perfil y mueve la tarjeta a `SALA LUNAS` (Lunas `1 niño`, Soles `0 niños`) sin recargar a mano.
- [ ] Forzar el `<select>` a un UUID inexistente y guardar mantiene el modal abierto, muestra un elemento `role="alert"` con `No pudimos guardar los cambios. Intentá de nuevo.` y no inserta filas.
- [ ] Mientras la action está pendiente, el botón Guardar muestra `Guardando…` y queda deshabilitado (verificado con latencia artificial).
- [ ] "Cancelar" no escribe en la base y, al reabrir el modal en modo alta, los campos están vacíos y SALA vuelve a Soles.
- [ ] La búsqueda sigue funcionando: escribir el nombre deja solo su tarjeta y oculta las salas sin coincidencias; borrar el texto restaura las tres secciones.
- [ ] `GET /ninos/no-existe` responde `404`; `GET /ninos/agregar` responde `404`; un UUID válido inexistente renderiza la UI de 404 de la app (soft 404 con status `200`, documentado).
- [ ] `proxy.ts` no importa `app/_data/children` y `grep -r "_data/children" app/ proxy.ts` no devuelve coincidencias.
- [ ] El composer de publicaciones sigue abriendo y "Toda la sala" sigue expandiendo los mismos 8 chips de audiencia.
- [ ] `CurrentUser` incluye `daycareId` y la sidebar mantiene nombre, inicial y rol sin cambios visuales.
- [ ] A 390px las tres secciones, el estado vacío, el modal y el perfil se ven completos y `documentElement.scrollWidth` no supera `innerWidth`.
- [ ] Las capturas `.playwright-mcp/ninos-empty-1440.png`, `.playwright-mcp/ninos-created-1440.png`, `.playwright-mcp/child-profile-real-1440.png` y `.playwright-mcp/ninos-empty-390.png` muestran la misma jerarquía, colores, tipografía y medidas de tarjeta que la referencia, con las tres salas y el estado vacío nuevos.
- [ ] Ningún identificador nuevo está en español: ni archivos, ni componentes, ni tipos, ni campos, ni variables, ni funciones.
- [ ] No hay `any`, `@ts-ignore`, `style={{}}` ni hex sueltos en el JSX de `app/`; `package.json` y `package-lock.json` no cambian; no se agregan configs de ruta.
- [ ] Al cerrar la verificación, `public.children` vuelve a `0` filas y `public.rooms` sigue en `3`.

## Decisions

- **Sí:** la spec vive en `specs/database/` aunque toque la app. El núcleo es el esquema, las policies y el seed; la pantalla es el primer consumidor.
- **Sí:** tablas `rooms` y `children` en esta spec, y `parent_children` fuera. Sin vínculos de padres, el conteo "sin padres vinculados" es la verdad actual.
- **Sí:** tres salas demo (Soles, Lunas, Estrellas) y cero niños. Es lo que pidió el usuario; la pantalla debe funcionar vacía.
- **Sí:** `position` en `rooms`. `created_at` no garantiza orden dentro de una misma transacción y `name` alfabético pondría Estrellas primero.
- **Sí:** `daycare_id` en `children`. Sin él, un niño sin sala no tiene tenant y la policy dependería de un join nullable.
- **Sí:** FK compuesta `(room_id, daycare_id)`. Impide a nivel de base asignar una sala de otra guardería; el costo es una unique redundante en `rooms`.
- **Sí:** `child_status` como enum nativo. Lo pide el diccionario y es el tercer enum del proyecto; el patrón ya está documentado.
- **Sí:** `allergy_tags text[]` con etiquetas en inglés y máximo 12. Se respeta el diccionario y se evita una tabla de alergias que nadie pidió.
- **Sí:** catálogo de sinónimos + slug de respaldo al guardar alergias. Evita perder datos y mantiene la BD en inglés; la UI traduce lo conocido.
- **Sí:** defaults silenciosos para `enrolled_at`, `photo_consent` y `status`. El mockup no tiene esos campos y el alta no debe inventar UI nueva.
- **Sí:** `Intl` con locale `es-PE` y sin puntos. Medido: `es-AR` produce `15 de abr de 2022`, que no coincide con el mockup; `es-PE` produce `15 abr. 2022`.
- **Sí:** edad calculada desde `birth_date`. Es el primer dato real con fecha; guardar un label sería duplicar información que se desactualiza.
- **Sí:** tono del avatar derivado del UUID. No hay columna de presentación y el color no debe depender del orden de la lista.
- **Sí:** `link-pending` se conserva. Todo niño sin padres vinculados muestra VINCULAR, que es la acción pendiente real; cuando exista `parent_children` el mismo helper deja de mostrarlo.
- **Sí:** `rooms` de solo lectura. No hay pantalla de salas; dar INSERT/UPDATE sería una policy sin caso de uso.
- **Sí:** solo `admin`/`staff` leen y escriben niños. Los padres necesitan `parent_children` para ver solo a los suyos; abrirlos ahora filtraría toda la guardería.
- **Sí:** escribir desde Server Actions con el cliente de cookies, nunca con `service_role` en la app.
- **Sí:** `useTransition` + `router.refresh()` en vez de `useActionState`. Permite limpiar el error con el reset del modal y no deja estado viejo al reabrir.
- **Sí:** `revalidatePath("/ninos", "layout")` en la action. Cubre la lista y el perfil del mismo segmento.
- **Sí:** lista sin `use cache`. Son pocas filas, cambia con cada alta y la frescura vale más que ahorrar una consulta.
- **Sí:** soft 404 para UUID inexistente. El proxy no consulta la base (SPEC 09) y `notFound()` bajo PPR responde 200; se documenta en vez de romper esa regla.
- **Sí:** mover la audiencia mock del composer a `_data/feed-audience.ts`. El feed no es parte de esta spec y sus 8 chips deben seguir funcionando.
- **No:** archivar o borrar niños. No hay control en el mockup ni policy de `delete`; va con la spec de baja.
- **No:** editar `enrolled_at` o `photo_consent`. Sin UI no se tocan.
- **No:** cambiar el layout o los textos del modal de SPEC 04. Solo cambian las opciones de sala y el ciclo de guardado.
- **No:** `date-fns` ni otra dependencia. `Intl` y aritmética de fechas alcanzan.
- **No:** tipos de fila duplicados a mano. Se usan los generados en `Database`.

## Risks

| Risk | Mitigation |
| --- | --- |
| La verificación escribe en la base para probar el alta y la edición | El plan cierra con un `delete` del niño de prueba y un criterio que exige `children = 0`; las salas quedan intactas. |
| No hay render de referencia para tres salas ni para el estado vacío | La comparación con `references/` es estructural (tarjeta, perfil, tipografía, colores y medidas); el estado nuevo se valida por copy y layout, no pixel a pixel. |
| Un `daycare_id` sin calificar dentro de una policy resuelve a `users.daycare_id` y anula el filtro | Todas las referencias al daycare van calificadas (`children.daycare_id`, `rooms.daycare_id`); un criterio revisa las expresiones de `pg_policies`. |
| La policy depende de `users_select_own`; si esa policy cambia, el staff deja de ver niños | La spec de `parent_children` no debe tocar esa policy sin revisar estas cuatro; queda anotado en `supabase/README.md`. |
| La FK compuesta con `on delete restrict` impide borrar una sala con niños | Es intencional: no hay baja de salas. Si llega, se resuelve reasignando niños antes de borrar. |
| `Intl` y el huso del servidor pueden correr un día | Se parsea al mediodía UTC y se formatea con `timeZone: "UTC"`; los criterios comparan contra `15 abr 2022`. |
| Un niño con `room_id` null aparece en `SIN SALA` y el formulario le asigna una sala al editarlo | Es un estado solo alcanzable por base; se documenta y el grupo `SIN SALA` lo hace visible. |
| El modal conserva un error viejo al reabrir | El error vive en estado local y se limpia en `onReset`, que dispara `form.reset()` al cerrar. |
| La action devuelve un error genérico y el usuario no sabe qué campo falló | El cliente valida primero con los mensajes de SPEC 04; el banner cubre fallos de servidor o de red. |
| El DELETE de limpieza se hace con `execute_sql`, que el patrón reserva para lecturas | Es una acción de verificación, no una migración de producto; se documenta en el reporte de la corrida. |
| Turbopack no comparte `.next` entre `dev` y `build` | Detener el dev server antes de `npm run build`, como en las verificaciones anteriores. |

## What is **not** in this spec

- `parent_children`, invitaciones, padres reales y conteo real de padres.
- Archivar, borrar o restaurar niños.
- Alta, edición o baja de salas.
- Fotos del niño, Storage y consentimiento editable.
- Feed, publicaciones, resumen del día, comentarios y reacciones con datos reales.
- Estado `archived` en la UI.
- Toasts, estados de éxito, notificaciones y borradores.
- Tests automatizados, modo oscuro e i18n.

Cada uno de esos, si llega, va en su propia spec.
