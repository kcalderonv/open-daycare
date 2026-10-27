# SPEC 11 — Invitación de padres por correo con Resend y registro con código

> **Status:** Aprovado
> **Depends on:** SPEC 05, SPEC 09, SPEC 10
> **Date:** 2026-10-27
> **Objective:** Enviar por correo, con Resend, una invitación real a un padre y permitir que active su cuenta con ese código, quedando vinculado al niño en `parent_children`.

## Por qué existe esta spec

- SPEC 05 dejó el modal de "Vincular padre" como interfaz pura: el código `7K4P9` es un literal en `app/_data/parent-invite.ts` y "Enviar invitación" cierra sin persistir nada.
- SPEC 09 dejó `/activar-cuenta` con datos precargados de `app/_data/auth.ts` y fuera de alcance el `signUp`, las invitaciones y el alta de padres.
- SPEC 10 dejó `parent_children` e `invitations` explícitamente fuera y `children.parents` siempre en `[]`: hoy ningún niño puede tener un padre real.
- `supabase/README.md` fija dos reglas que esta spec respeta: la app nunca usa `service_role` y todo DDL pasa por el MCP. Por eso el flujo anónimo se resuelve con funciones `security definer`, no con un admin client.

## Estado remoto de partida (verificado el 2026-10-27)

- `public`: `children` (0 filas), `daycares`, `rooms`, `users` (1 fila, `role = 'admin'`).
- Enums en `public`: `child_status`, `user_role`, `user_status`. No existen `relationship_type` ni `invitation_status`.
- `auth.users`: 1 fila. Políticas en `users`: solo `users_select_own`.
- `.env.template` ya declara `RESEND_API_KEY`; no existe `RESEND_FROM_EMAIL` ni `NEXT_PUBLIC_APP_URL`. El paquete `resend` no está instalado.

## Scope

**In:**

- `supabase/migrations/<version>_create_invitation_enums.sql`: enums `public.relationship_type` (`father`, `mother`, `guardian`) y `public.invitation_status` (`pending`, `accepted`, `expired`, `cancelled`) con guarda de re-aplicación, `revoke` y `USAGE` a `service_role`.
- `supabase/migrations/<version>_add_children_id_daycare_key.sql`: `children_id_daycare_key unique (id, daycare_id)`, destino de la FK compuesta de `invitations`.
- `supabase/migrations/<version>_create_invitations.sql`: tabla `public.invitations` con 14 columnas, constraints, índice único parcial, índices, trigger `updated_at`, RLS cerrado y grants a `service_role`.
- `supabase/migrations/<version>_create_parent_children.sql`: tabla `public.parent_children` con `parent_id`, `child_id`, `relationship`, `created_at`, unique `(parent_id, child_id)`, RLS cerrado y grants a `service_role`.
- `supabase/migrations/<version>_open_parent_access.sql`: función `public.current_staff_daycare_id()`, policies de `invitations`, `parent_children` y `users_select_daycare_parents`, más grants y `USAGE` de los dos enums a `authenticated`.
- `supabase/migrations/<version>_create_invitation_activation_rpcs.sql`: `get_invitation_preview(text)` para `anon`, `accept_invitation(text)` para `authenticated` y `email_has_account(text)` para `authenticated`.
- Aplicar las seis migraciones con el MCP `apply_migration` y versionarlas en `supabase/migrations/`.
- `utils/supabase/database.types.ts`: regenerado con `generate_typescript_types` después de las migraciones.
- `package.json`: dependencia `resend`.
- `.env.template`: `RESEND_FROM_EMAIL` y `NEXT_PUBLIC_APP_URL` con placeholders. `.env.local` recibe la key real (no se commitea).
- `app/_lib/invitations.ts`: `normalizeInvitationCode`, `generateInvitationCode`, `INVITATION_CODE_ALPHABET`, `INVITATION_TTL_DAYS`, tipos `InvitationStatus` e `InvitationPreview`.
- `app/_lib/invitation-queries.ts`: DAL con `getInvitationPreview(code)` y `getParentsForChildren(childIds)`.
- `app/_lib/children.ts`: `Parent` y `ParentStatus` no cambian; se agrega `RELATIONSHIP_LABELS` reutilizado por la tarjeta y el formulario.
- `app/_lib/children-queries.ts`: `getChildren` y `getChild` rellenan `parents` con padres activos e invitaciones pendientes.
- `app/_lib/site-url.ts`: `getSiteUrl()` con `NEXT_PUBLIC_APP_URL` y fallback a los headers de la request.
- `app/_lib/email/resend.ts`: cliente perezoso y `sendInvitationEmail(...)` con resultado tipado.
- `app/_lib/email/invitation-email.ts`: asunto y HTML del correo, función pura.
- `app/(app)/ninos/invite-actions.ts`: Server Action `inviteParent(childId, formData)`.
- `app/(auth)/activar-cuenta/actions.ts`: Server Action `activateAccount` con `signUp` + `accept_invitation` + `redirect("/")`.
- `app/(auth)/activar-cuenta/page.tsx`: server component real; lee `?code=` dentro de `<Suspense>` y renderiza o el formulario o el estado de error.
- `app/_components/auth/activation-form.tsx`: client component con `useActionState`, campos y estados de error.
- `app/_components/auth/auth-field.tsx`: soporte visual de `readOnly`.
- `app/_components/auth/invite-summary.tsx`: recibe `firstName` y `roomName` por props en vez de importar el mock.
- `app/_components/auth/consent-checkbox.tsx`: agrega `required` para que el consentimiento viaje en el `FormData`.
- `app/_data/auth.ts`: se elimina.
- `app/_data/parent-invite.ts`: se elimina; el parentesco y el copy de vencimiento pasan a `app/_lib/`.
- `app/_components/children/parent-invite-form.tsx`: valida igual que SPEC 05, llama a la action, muestra error de servidor inline, estado `Enviando…`, cierra al enviar y el panel de código pasa a "Se genera al enviar".
- `app/_components/children/child-parents-card.tsx`: sin cambios estructurales; sigue renderizando `child.parents` con `PARENT_STATUS_COPY`.
- `supabase/README.md`: sección **Invitaciones y vínculo de padres**, más el requisito de tener "Confirm email" desactivado.
- Degradación: el modal y `/activar-cuenta` conservan su comportamiento responsive actual; el aviso de error de servidor usa el ancho completo del formulario.

**Out of scope (para specs futuras):**

- Reenviar o cancelar una invitación desde la tarjeta; la tarjeta solo lista.
- Desvincular a un padre, editar el parentesco y gestionar cuentas desde la app.
- Rate limiting, captcha y bloqueo por intentos en `get_invitation_preview`.
- Recuperar contraseña, cambiar contraseña y confirmar el correo con Supabase.
- Feed real filtrado por hijo y navegación por rol: el padre entra al `/` mock y la sidebar sigue mostrando "Niños".
- Notificaciones por correo cuando se acepta una invitación.
- Trigger `AFTER INSERT` en `auth.users`; el perfil lo crea `accept_invitation`.
- Marcar como `expired` las invitaciones vencidas sin pasar por la app (no hay cron).
- Tests automatizados más allá de la verificación con Playwright y SQL por MCP.

## Data model

### Enums

```sql
-- supabase/migrations/<version>_create_invitation_enums.sql
do $$
begin
  if not exists (
    select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'relationship_type' and n.nspname = 'public'
  ) then
    create type public.relationship_type as enum ('father', 'mother', 'guardian');
  end if;

  if not exists (
    select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'invitation_status' and n.nspname = 'public'
  ) then
    create type public.invitation_status as enum ('pending', 'accepted', 'expired', 'cancelled');
  end if;
end
$$;

revoke all on type public.relationship_type, public.invitation_status
  from public, anon, authenticated;
grant usage on type public.relationship_type, public.invitation_status to service_role;
```

Convenciones:

- Los labels van en inglés y en el orden del diccionario `07-DB-Schema`; la traducción vive en `RELATIONSHIP_LABELS`.
- `relationship_type` reemplaza al union `ParentRelationship` de `children.ts` solo en la base; el tipo de la UI no cambia.

### Unique para la FK compuesta

```sql
-- supabase/migrations/<version>_add_children_id_daycare_key.sql
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.children'::regclass
      and conname = 'children_id_daycare_key'
  ) then
    alter table public.children
      add constraint children_id_daycare_key unique (id, daycare_id);
  end if;
end
$$;
```

- Es el mismo patrón que `rooms_id_daycare_key` de SPEC 10 y evita invitar a un niño de otra guardería.

### Tabla `invitations`

```sql
-- supabase/migrations/<version>_create_invitations.sql
create table public.invitations (
  id           uuid primary key default gen_random_uuid(),
  daycare_id   uuid not null,
  child_id     uuid not null,
  invited_by   uuid not null,
  full_name    text not null,
  email        text not null,
  relationship public.relationship_type not null,
  code         text not null,
  status       public.invitation_status not null default 'pending',
  expires_at   timestamptz not null default now() + interval '7 days',
  sent_at      timestamptz,
  accepted_at  timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  constraint invitations_daycare_fkey foreign key (daycare_id)
    references public.daycares (id) on delete restrict,
  constraint invitations_child_fkey foreign key (child_id, daycare_id)
    references public.children (id, daycare_id) on delete restrict,
  constraint invitations_invited_by_fkey foreign key (invited_by)
    references public.users (id) on delete restrict,
  constraint invitations_code_key unique (code),
  constraint invitations_full_name_length
    check (char_length(btrim(full_name)) between 2 and 120),
  constraint invitations_email_format
    check (
      email = lower(email)
      and char_length(email) <= 254
      and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[a-z]{2,}$'
    ),
  constraint invitations_code_format check (code ~ '^[A-Z0-9]{5}$'),
  constraint invitations_accepted_at
    check ((status = 'accepted') = (accepted_at is not null)),
  constraint invitations_sent_at
    check (sent_at is null or sent_at >= created_at)
);

create unique index invitations_pending_child_email_key
  on public.invitations (child_id, lower(email))
  where status = 'pending';

create index invitations_daycare_status_idx
  on public.invitations (daycare_id, status);
create index invitations_child_id_idx on public.invitations (child_id);

create trigger invitations_set_updated_at
before update on public.invitations
for each row execute function public.set_updated_at();

alter table public.invitations enable row level security;
revoke all on table public.invitations from anon, authenticated;
grant all on table public.invitations to service_role;
```

Convenciones:

- `daycare_id` no está en el diccionario: se agrega para tenencia y para las policies, igual que en `children`.
- `sent_at` es el único indicador de si el correo salió. `null` significa "creada pero no entregada a Resend" y habilita el reintento con el mismo código.
- El índice único parcial permite **una sola pendiente por niño y email**. Como `now()` no es inmutable, el índice no puede excluir vencidas: la action marca `expired` las vencidas antes de insertar.
- `expires_at` usa `interval '7 days'` fijo; el copy "Vence en 7 días" es literal y coincide.
- `email` se guarda en minúsculas; el check lo hace cumplir.
- Sin `deleted_at`: cancelar es `status = 'cancelled'`.

### Tabla `parent_children`

```sql
-- supabase/migrations/<version>_create_parent_children.sql
create table public.parent_children (
  id           uuid primary key default gen_random_uuid(),
  parent_id    uuid not null,
  child_id     uuid not null,
  relationship public.relationship_type not null,
  created_at   timestamptz not null default now(),

  constraint parent_children_parent_fkey foreign key (parent_id)
    references public.users (id) on delete cascade,
  constraint parent_children_child_fkey foreign key (child_id)
    references public.children (id) on delete restrict,
  constraint parent_children_parent_child_key unique (parent_id, child_id)
);

create index parent_children_child_id_idx on public.parent_children (child_id);

alter table public.parent_children enable row level security;
revoke all on table public.parent_children from anon, authenticated;
grant all on table public.parent_children to service_role;
```

Convenciones:

- La forma es la del diccionario: sin `daycare_id`; el daycare se resuelve por `children.daycare_id` en las policies.
- `on delete cascade` en `parent_id`: si se borra el perfil, el vínculo no queda huérfano.
- No hay grants de `insert` para `authenticated`: el vínculo lo crea `accept_invitation`.

### Policies y helper

```sql
-- supabase/migrations/<version>_open_parent_access.sql
create or replace function public.current_staff_daycare_id()
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select u.daycare_id
  from public.users u
  where u.id = (select auth.uid())
    and u.status = 'active'
    and u.role in ('admin', 'staff');
$$;

revoke all on function public.current_staff_daycare_id() from public, anon;
grant execute on function public.current_staff_daycare_id() to authenticated;

drop policy if exists invitations_select_staff on public.invitations;
drop policy if exists invitations_insert_staff on public.invitations;
drop policy if exists invitations_update_staff on public.invitations;

create policy invitations_select_staff
on public.invitations for select to authenticated
using (daycare_id = (select public.current_staff_daycare_id()));

create policy invitations_insert_staff
on public.invitations for insert to authenticated
with check (
  daycare_id = (select public.current_staff_daycare_id())
  and invited_by = (select auth.uid())
  and exists (
    select 1 from public.children c
    where c.id = invitations.child_id
      and c.daycare_id = invitations.daycare_id
      and c.status = 'active'
  )
);

create policy invitations_update_staff
on public.invitations for update to authenticated
using (daycare_id = (select public.current_staff_daycare_id()))
with check (daycare_id = (select public.current_staff_daycare_id()));

drop policy if exists parent_children_select_staff on public.parent_children;
drop policy if exists parent_children_select_own on public.parent_children;

create policy parent_children_select_staff
on public.parent_children for select to authenticated
using (
  exists (
    select 1 from public.children c
    where c.id = parent_children.child_id
      and c.daycare_id = (select public.current_staff_daycare_id())
  )
);

create policy parent_children_select_own
on public.parent_children for select to authenticated
using (parent_id = (select auth.uid()));

drop policy if exists users_select_daycare_parents on public.users;

create policy users_select_daycare_parents
on public.users for select to authenticated
using (
  role = 'parent'
  and daycare_id = (select public.current_staff_daycare_id())
);

grant select, insert, update on table public.invitations to authenticated;
grant select on table public.parent_children to authenticated;
grant usage on type public.relationship_type, public.invitation_status to authenticated;
```

Convenciones:

- `current_staff_daycare_id()` es `security definer` porque una policy sobre `public.users` que consulte `public.users` entra en recursión infinita bajo RLS.
- Las referencias van calificadas (`invitations.child_id`, `c.id`): sin prefijo, un `daycare_id` interno resuelve a `users.daycare_id` y la policy deja de filtrar, como advierte el README.
- `users_select_daycare_parents` es lo que permite que la tarjeta muestre el nombre del padre aceptado; sin ella, el staff solo ve su propia fila.

### RPCs de activación

```sql
-- supabase/migrations/<version>_create_invitation_activation_rpcs.sql
create or replace function public.get_invitation_preview(p_code text)
returns table (
  status text,
  parent_full_name text,
  child_first_name text,
  child_full_name text,
  room_name text,
  email text
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    case
      when i.id is null then 'not_found'
      when i.status = 'pending' and i.expires_at <= now() then 'expired'
      else i.status::text
    end,
    coalesce(i.full_name, ''),
    coalesce(split_part(c.full_name, ' ', 1), ''),
    coalesce(c.full_name, ''),
    coalesce(r.name, ''),
    coalesce(i.email, '')
  from (values (1)) as base(x)
  left join public.invitations i on i.code = upper(btrim(p_code))
  left join public.children c on c.id = i.child_id
  left join public.rooms r on r.id = c.room_id;
$$;

revoke all on function public.get_invitation_preview(text) from public;
grant execute on function public.get_invitation_preview(text) to anon, authenticated;
```

```sql
create or replace function public.accept_invitation(p_code text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id   uuid := (select auth.uid());
  v_email     text := lower(coalesce((select auth.jwt() ->> 'email'), ''));
  v_inv       public.invitations;
  v_full_name text;
begin
  if v_user_id is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  select * into v_inv
  from public.invitations i
  where i.code = upper(btrim(p_code))
  for update;

  if not found
     or v_inv.status <> 'pending'
     or v_inv.expires_at <= now()
     or lower(v_inv.email) <> v_email then
    raise exception 'invitation_not_available' using errcode = 'P0001';
  end if;

  v_full_name := coalesce(
    nullif(btrim((select u.raw_user_meta_data ->> 'full_name'
                  from auth.users u where u.id = v_user_id)), ''),
    v_inv.full_name
  );

  insert into public.users (id, daycare_id, role, status, full_name)
  values (v_user_id, v_inv.daycare_id, 'parent', 'active', v_full_name)
  on conflict (id) do nothing;

  if not exists (
    select 1 from public.users u
    where u.id = v_user_id and u.role = 'parent' and u.status = 'active'
  ) then
    raise exception 'account_not_eligible' using errcode = 'P0001';
  end if;

  insert into public.parent_children (parent_id, child_id, relationship)
  values (v_user_id, v_inv.child_id, v_inv.relationship)
  on conflict (parent_id, child_id) do nothing;

  update public.children
  set photo_consent = true
  where id = v_inv.child_id;

  update public.invitations
  set status = 'accepted', accepted_at = now()
  where id = v_inv.id;
end;
$$;

revoke all on function public.accept_invitation(text) from public;
grant execute on function public.accept_invitation(text) to authenticated;
```

```sql
create or replace function public.email_has_account(p_email text)
returns boolean
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if (select public.current_staff_daycare_id()) is null then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  return exists (
    select 1 from auth.users u
    where lower(u.email) = lower(btrim(p_email))
  );
end;
$$;

revoke all on function public.email_has_account(text) from public, anon;
grant execute on function public.email_has_account(text) to authenticated;
```

Convenciones:

- `get_invitation_preview` devuelve **siempre una fila** (el `left join` sobre `(values (1))`), así el caso "no existe" es un estado y no un array vacío.
- El estado `expired` se calcula: la fila sigue `pending` hasta que la app la normaliza.
- `accept_invitation` valida que el email del JWT coincida con el de la invitación. Es la única defensa contra alguien que adivine el código de un tercero.
- `for update` evita dos activaciones simultáneas del mismo código.
- `on conflict (id) do nothing` + chequeo posterior: si el UUID ya pertenece a un staff, la función falla en vez de degradar el rol.
- `photo_consent = true` en el niño es la consecuencia de la autorización del formulario; el consentimiento es de solo alta en esta spec.
- Ninguna de las tres funciones acepta `service_role`: la app sigue sin usarlo.

### Tipos y contratos

```ts
// app/_lib/invitations.ts
export const INVITATION_CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
export const INVITATION_CODE_LENGTH = 5;
export const INVITATION_TTL_DAYS = 7;

export type InvitationStatus =
  | "pending"
  | "expired"
  | "accepted"
  | "cancelled"
  | "not_found";

export type InvitationPreview = {
  status: InvitationStatus;
  parentFullName: string;
  childFirstName: string;
  childFullName: string;
  roomName: string;
  email: string;
};

export function normalizeInvitationCode(value: string): string;
export function generateInvitationCode(): string;
```

```ts
// app/_lib/children.ts — sin cambios en Parent/ParentStatus
export const RELATIONSHIP_LABELS: Record<ParentRelationship, string> = {
  mother: "Mamá",
  father: "Papá",
  guardian: "Tutor/a",
};
```

```ts
// app/_lib/email/resend.ts — "server-only"
type SendResult = { ok: true } | { ok: false; reason: "config" | "provider" };

export async function sendInvitationEmail(input: {
  to: string;
  parentFullName: string;
  childFullName: string;
  childFirstName: string;
  roomName: string;
  code: string;
  activationUrl: string;
}): Promise<SendResult>;
```

```ts
// app/(app)/ninos/invite-actions.ts — "use server"
export type InviteResult =
  | { ok: true }
  | { ok: false; error: string };

export async function inviteParent(
  childId: string,
  formData: FormData,
): Promise<InviteResult>;
```

```ts
// app/(auth)/activar-cuenta/actions.ts — "use server"
export type ActivationState = { error: string | null };

export async function activateAccount(
  previousState: ActivationState,
  formData: FormData,
): Promise<ActivationState>;
```

```ts
// app/_components/auth/activation-form.tsx — "use client"
type ActivationFormProps = {
  code: string;
  preview: InvitationPreview;
};
```

Convenciones:

- `Child.parents` no cambia de forma: `id` es `parent_children.id` para activos y `invitations.id` para pendientes; `status` sigue `"active" | "pending"`.
- Los padres activos van primero, después los pendientes; dentro de cada grupo, por `created_at`.
- El código se normaliza (trim + uppercase) en la app **y** en SQL: el enlace y el campo aceptan minúsculas.

### Tokens y medidas

No hay tokens nuevos. Se reutilizan `auth-bg`, `border`, `divider`, `muted`, `muted-soft`, `ink`, `consent-bg`, `consent-fg`, `invite-code-label`, `invite-code-border`, `cta-from`/`cta-to`, `shadow-auth-cta`, `shadow-dialog`, `auth-input-border`, `coral`, `error`, `coral-soft`.

Dos cambios visuales, ambos dentro del chrome existente:

- **Panel de código del modal**: se conservan fondo, borde discontinuo, radio, padding, label y nota. La línea del código pasa de `font-display 34px/600 tracking-[7px]` a `font-display text-[20px] font-semibold text-consent-fg` con el texto **"Se genera al enviar"**. La nota sigue siendo **"Vence en 7 días"**.
- **Alerta de error de servidor del modal**: `rounded-xl bg-coral-soft px-4 py-3 text-[13.5px] font-bold text-error`, `role="alert"`, 16px arriba del CTA. Es la misma clase que `ALERT_CLASSES` de `login-form.tsx`.
- **`AuthField` en modo `readOnly`**: `bg-auth-bg text-muted` en lugar de `bg-white text-ink`; conserva borde, radio y padding. Aplica al código y al email de `/activar-cuenta`.

## Reglas de validación y copy

### Modal "Vincular padre"

Se mantienen las reglas de SPEC 05 (`#parent-name` 2–60 y `^[\p{L}\s'’-]+$`; `#parent-email` con `^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$`; un parentesco siempre marcado). Se agregan solo del lado del servidor:

| Condición | Mensaje |
| --- | --- |
| Email ya asociado a una cuenta (`email_has_account`) | Ese email ya tiene una cuenta. Pedile a la guardería que vincule al niño. |
| Resend falla o falta `RESEND_API_KEY` | No pudimos enviar la invitación. Intentá de nuevo en unos minutos. |
| Error de base o del child fuera del daycare | No pudimos crear la invitación. Intentá de nuevo. |

- El error del servidor se muestra en la alerta y el modal **no se cierra**.
- Durante el envío el CTA muestra **"Enviando…"**, queda `disabled` y los chips también.
- Al success: `closeDialog()` + `router.refresh()`, igual que `child-form.tsx`.

### `/activar-cuenta`

| Control | Regla | Mensaje |
| --- | --- | --- |
| código | presente en la URL y normalizable | Necesitás el enlace del correo para activar tu cuenta. |
| `#activation-password` | requerido, mínimo 8 | La contraseña debe tener al menos 8 caracteres. |
| consentimiento | obligatorio | Marcá la autorización para continuar. |
| cuenta | `signUp` devuelve sesión | No pudimos crear tu cuenta. Si ya tenés una, iniciá sesión. |
| vínculo | `accept_invitation` sin error | No pudimos vincular tu cuenta. Pedile a la guardería que te envíe otra invitación. |

Estados de la página, cada uno con un link a `/login`:

| Estado | Copy |
| --- | --- |
| sin `?code=` | Necesitás el enlace que te llegó por correo. |
| `not_found` | No encontramos esa invitación. |
| `expired` | Esa invitación venció. Pedile a la guardería que te envíe una nueva. |
| `accepted` | Esa invitación ya fue usada. Iniciá sesión para entrar. |
| `cancelled` | Esa invitación fue cancelada. Pedile a la guardería que te envíe una nueva. |

- El formulario es `noValidate`; la validación de contraseña y consentimiento es propia, con foco en el primer control inválido.
- El código y el email se muestran `readOnly`; el nombre del padre y el parentesco salen de la invitación y no se editan.
- El CTA pasa a **"Activando…"** mientras `isPending`.

### Asunto y contenido del correo

- Asunto: `Invitación para seguir a {childFirstName} en OpenDayCare`.
- Cuerpo: saludo con el nombre del padre, "La guardería te invitó a seguir el día de {childFullName} ({roomName})", el código en una caja grande con `letter-spacing`, el botón "Activar mi cuenta" a `{siteUrl}/activar-cuenta?code={code}`, y "El código vence en 7 días".
- HTML con estilos inline y sin fuentes externas: Fredoka y Nunito no se pueden embeber, así que la pila cae a `Georgia, serif` para títulos y `Arial, Helvetica, sans-serif` para el cuerpo. Los colores replican los tokens (`#FBF4EC`, `#3F362E`, `#EE8164`).
- El HTML es una función pura: `buildInvitationEmailHtml(input): string`, sin llamadas a red, para poder compararlo en un test manual.

## Convenciones de código

Se mantienen las de SPEC 01–10: identificadores en inglés, copy en español con voseo, named exports, sin `any`, sin `style={{}}` ni hex en el JSX, server components por defecto.

Específicas de esta spec:

- **`"use client"` suma dos archivos:** `activation-form.tsx` y el ya existente `parent-invite-form.tsx`. Total esperado: 8 archivos con la directiva.
- **`app/_lib/email/resend.ts` lleva `import "server-only"`.** La key nunca puede llegar a un cliente component; el paquete `server-only` lo garantiza en build.
- **El cliente de Resend se crea dentro de la función, no en el módulo.** `new Resend(process.env.RESEND_API_KEY)` en el top-level captura `undefined` durante el build.
- **La action genera el código, no la base.** `crypto.randomInt` sobre `INVITATION_CODE_ALPHABET`; si el `insert` choca con `invitations_code_key` (23505) se reintenta hasta 3 veces. Sin `Math.random`.
- **Una sola pendiente por niño y email.** Antes de insertar, la action busca la pendiente del par: si `expires_at <= now()` la pasa a `expired`; si `sent_at` no es nula la pasa a `cancelled`; si `sent_at` es `null` la reutiliza con el mismo código y actualiza nombre y parentesco.
- **`sent_at` se escribe después de Resend.** Si `sendInvitationEmail` devuelve `ok: false`, la fila queda `pending` con `sent_at = null` y el error se muestra inline.
- **Sin `service_role`.** El alta del usuario es `signUp` con la sesión anónima del servidor y el vínculo lo hace `accept_invitation` con el JWT recién creado.
- **`redirect("/")` va fuera de cualquier `try/catch`.** Next lo implementa lanzando una excepción de control.
- **`getSiteUrl()` usa headers de la request.** No se hardcodea `localhost:3000` en el correo; `NEXT_PUBLIC_APP_URL` manda cuando existe.
- **Los estados de la página se resuelven en el server component.** `activation-form.tsx` solo se monta cuando el estado es `pending`.

## Implementación

1. **Preflight y dependencias.** Confirmar en el dashboard de Supabase que "Confirm email" está desactivado; agregar `resend` con `npm install resend`; sumar `RESEND_FROM_EMAIL` y `NEXT_PUBLIC_APP_URL` a `.env.template`; dejar la key real en `.env.local`. Test: `npm run build` sigue pasando.
2. **Enums y unique.** Aplicar `create_invitation_enums` y `add_children_id_daycare_key` con el MCP, versionar los `.sql` y verificar con `list_tables` + `execute_sql`. Test: los dos enums existen y `children_id_daycare_key` aparece en `pg_constraint`.
3. **Tablas.** Aplicar `create_invitations` y `create_parent_children`, versionar y verificar columnas, constraints, `relrowsecurity` y grants. Test: `children` sigue con 0 filas y `insert into public.invitations` sin daycare falla.
4. **Acceso.** Aplicar `open_parent_access` y verificar con SQL que `anon` no tiene privilegios sobre las dos tablas y que `authenticated` tiene exactamente `select, insert, update` en `invitations` y `select` en `parent_children`. Test: build y `/ninos` siguen funcionando.
5. **RPCs.** Aplicar `create_invitation_activation_rpcs` y verificar firmas y grants con `execute_sql`. Test: `select public.get_invitation_preview('XXXXX')` devuelve una fila con `status = 'not_found'`.
6. **Tipos y dominio.** Regenerar `database.types.ts`; crear `_lib/invitations.ts`, `_lib/site-url.ts` y `RELATIONSHIP_LABELS` en `children.ts`; borrar `_data/parent-invite.ts` y actualizar el formulario. Test: `npx tsc --noEmit` limpio y el modal se ve igual salvo el panel.
7. **Correo.** Crear `_lib/email/invitation-email.ts` y `_lib/email/resend.ts`; sin consumidores todavía. Test: `npm run build` y un `console.log` temporal del HTML en un script de Node descartable, borrado antes del commit.
8. **Envío desde el modal.** Crear `invite-actions.ts` y conectar `parent-invite-form.tsx` (pending, alerta, cierre). Test: invitar a un niño real recién creado en `/ninos`; la fila aparece con badge PENDIENTE y `sent_at` no es null.
9. **Padres en la tarjeta y la lista.** Crear `invitation-queries.ts` y rellenar `parents` en `getChild` y `getChildren`. Test: `/ninos` muestra "1 padre invitado" y `/ninos/[id]` lista la pendiente con nombre y parentesco.
10. **Activación.** Reescribir `activar-cuenta/page.tsx`, crear `actions.ts` y `activation-form.tsx`, adaptar `auth-field.tsx` e `invite-summary.tsx`, borrar `_data/auth.ts`. Test: abrir el enlace del correo, activar y aterrizar en `/` con sesión.
11. **Documentación y cierre.** Actualizar `supabase/README.md`; correr `build`, `tsc`, `eslint app`; capturas en `.playwright-mcp/` y comparación con `activar-cuenta.dc.html` y `vincular-padre.dc.html`.

## Acceptance criteria

- [ ] `npm run build` termina sin errores y no registra rutas nuevas.
- [ ] `npx tsc --noEmit` sin errores.
- [ ] `npx eslint app` sin errores.
- [ ] `grep -rln '"use client"' app/` devuelve exactamente 8 archivos: los 6 de SPEC 05 más `auth/activation-form.tsx` y `children/parent-invite-form.tsx`; `_lib/email/resend.ts` no aparece.
- [ ] `app/_lib/email/resend.ts` importa `server-only` y `new Resend(` aparece dentro de una función, no en el top-level del módulo.
- [ ] `public.relationship_type` tiene los labels `father, mother, guardian` y `public.invitation_status` tiene `pending, accepted, expired, cancelled`, en ese orden de `pg_enum.enumsortorder`.
- [ ] `public.invitations` y `public.parent_children` tienen `relrowsecurity = true` y 14 y 5 columnas respectivamente.
- [ ] `has_table_privilege('anon', 'public.invitations', 'select')` y `has_table_privilege('anon', 'public.parent_children', 'select')` devuelven `false`.
- [ ] `has_table_privilege('authenticated', 'public.invitations', 'insert')` devuelve `true` y `has_table_privilege('authenticated', 'public.parent_children', 'insert')` devuelve `false`.
- [ ] Existe el índice único parcial `invitations_pending_child_email_key` con predicado `status = 'pending'`.
- [ ] Existen `current_staff_daycare_id()`, `get_invitation_preview(text)`, `accept_invitation(text)` y `email_has_account(text)` con los grants descritos; `has_function_privilege('anon', 'public.accept_invitation(text)', 'execute')` es `false`.
- [ ] `select public.get_invitation_preview('ZZZZZ')` devuelve una fila con `status = 'not_found'`.
- [ ] En `/ninos` se puede crear un niño y su perfil abre en `/ninos/<uuid>` (requisito para poder invitar).
- [ ] El panel del modal muestra literalmente "CÓDIGO DE INVITACIÓN", "Se genera al enviar" y "Vence en 7 días", y ningún código de 5 caracteres.
- [ ] Con nombre "Diego Fernández", email válido y "Papá", "Enviar invitación" cierra el modal y la tarjeta muestra "Diego Fernández", "Papá · invitación enviada" y el badge PENDIENTE.
- [ ] La fila nueva de `invitations` tiene `code ~ '^[A-Z0-9]{5}$'`, `status = 'pending'`, `relationship = 'father'`, `email` en minúsculas, `expires_at` entre 6 y 7 días después de `created_at` y `sent_at` no nulo.
- [ ] El correo llega a la bandeja del destinatario con el código de la fila, el nombre del niño, la sala y el enlace `/activar-cuenta?code=<CODE>` (verificación manual del usuario, con `RESEND_FROM_EMAIL` apuntando a un remitente aceptado por Resend).
- [ ] Invitar dos veces al mismo email y niño con la primera ya enviada deja la primera en `cancelled` y exactamente una `pending` con código distinto.
- [ ] Invitar a un email que ya tiene cuenta no crea filas, no llama a Resend y muestra inline "Ese email ya tiene una cuenta. Pedile a la guardería que vincule al niño."
- [ ] Con `RESEND_API_KEY` inválida, el modal muestra "No pudimos enviar la invitación. Intentá de nuevo en unos minutos.", la fila queda `pending` con `sent_at` nulo y el modal sigue abierto.
- [ ] Reintentar tras esa falla reutiliza el mismo `id` y el mismo `code`, y al tener éxito escribe `sent_at`.
- [ ] `/activar-cuenta` sin `?code=` muestra "Necesitás el enlace que te llegó por correo." y un link a `/login`.
- [ ] `/activar-cuenta?code=ZZZZZ` muestra "No encontramos esa invitación." con 200, sin datos del niño.
- [ ] Una invitación con `expires_at` en el pasado muestra "Esa invitación venció…" y deja de listarse en la tarjeta.
- [ ] Una invitación con `status = 'cancelled'` muestra "Esa invitación fue cancelada…" y una `accepted` muestra "Esa invitación ya fue usada…".
- [ ] Con código válido, la página muestra el nombre del niño, la sala, el email de la invitación y el código, ambos `readOnly`, y no muestra el campo de nombre.
- [ ] Enviar con contraseña de 7 caracteres bloquea, muestra "La contraseña debe tener al menos 8 caracteres." y enfoca el campo.
- [ ] Enviar sin marcar el consentimiento bloquea y muestra "Marcá la autorización para continuar."
- [ ] Activar con contraseña de 8 o más caracteres y consentimiento marcado redirige a `/` con sesión iniciada y el nombre del padre en la sidebar.
- [ ] Después de activar: `public.users` tiene una fila con `role = 'parent'`, `status = 'active'` y el daycare del niño; `parent_children` tiene una fila con el parentesco de la invitación; la invitación queda `accepted` con `accepted_at` no nulo; `children.photo_consent` es `true`.
- [ ] Reabrir el mismo enlace después de activar muestra "Esa invitación ya fue usada…".
- [ ] Reinvitar al email ya activado muestra el error de cuenta existente.
- [ ] Un padre autenticado no ve niños ajenos: `getChildren` con su sesión devuelve 0 filas y `/ninos` muestra el estado vacío, sin error.
- [ ] La consola del navegador no muestra errores ni warnings de React en el modal, en `/ninos/[id]` después del envío ni en `/activar-cuenta` en ninguno de los estados.
- [ ] `app/` no importa nada de `references/` y no existen `app/_data/auth.ts` ni `app/_data/parent-invite.ts`.
- [ ] `.env.template` contiene `RESEND_FROM_EMAIL` y `NEXT_PUBLIC_APP_URL`; ningún archivo de `app/` contiene `re_` ni la key literal.
- [ ] `/activar-cuenta` a 390px no desborda (`documentElement.scrollWidth <= innerWidth`) y el formulario completo entra con scroll vertical.
- [ ] Capturas en `.playwright-mcp/invite-pending-1440.png`, `.playwright-mcp/activate-form-1440.png`, `.playwright-mcp/activate-form-390.png` y `.playwright-mcp/activate-expired-1440.png`, comparadas con `vincular-padre.dc.html` y `activar-cuenta.dc.html`.
- [ ] Ningún identificador nuevo está en español; el español aparece solo en copy visible.
- [ ] No hay `any`, `@ts-ignore`, `style={{}}` ni hex sueltos en el JSX de `app/`.

## Decisions

- **Sí:** una sola spec para el flujo completo (envío, tablas, activación y vínculo). El usuario lo eligió sobre dividir en 11 y 12; se acepta el costo de un documento largo a cambio de poder verificarlo de punta a punta.
- **Sí:** RPC `security definer` para el tramo anónimo. Es la única forma de validar el código sin exponer `invitations` ni meter `service_role` en la app, que el README prohíbe.
- **Sí:** `get_invitation_preview` devuelve siempre una fila. Convierte "no existe" en un estado tipado y evita que la página tenga que distinguir array vacío de error.
- **No:** policies para `anon` sobre `invitations`. PostgREST no puede expresar "solo si conocés el código" sin permitir enumerar la tabla.
- **No:** admin client con `service_role`. Contradice la regla del README y mete una llave de bypass total en el runtime.
- **Sí:** `signUp` desde el server action con "Confirm email" desactivado. El padre queda con sesión en el acto y no recibe un segundo correo de Supabase.
- **Sí:** código de 5 caracteres del alfabeto sin `0/O/1/I/L`, generado con `crypto.randomInt`, único global y con 7 días de vigencia. Es el formato que ya muestra el mock.
- **Sí:** una sola invitación pendiente por niño y email, garantizada con índice único parcial. La action normaliza vencidas y canceladas antes de insertar porque `now()` no es inmutable y no puede ir en el predicado.
- **Sí:** `sent_at` como marca de entrega. Es lo que distingue "reintentar el mismo código" de "cancelar y generar otro".
- **Sí:** reutilizar la pendiente cuando `sent_at` es nulo. Si el correo nunca salió, el padre no puede tener ese código y crear otro dejaría basura.
- **Sí:** cancelar la pendiente enviada al reenviar. Un solo código válido por niño y email evita que dos correos compitan por el mismo vínculo.
- **Sí:** bloquear emails que ya tienen cuenta, con `email_has_account` como RPC restringido a staff. Vincular cuentas existentes abre la puerta a que alguien se apropie de un niño ajeno.
- **No:** trigger `AFTER INSERT` en `auth.users`. El perfil necesita `daycare_id` y `relationship`, que viven en la invitación; el trigger tendría que leer metadata y duplicar la validación.
- **Sí:** `accept_invitation` valida el email del JWT contra el de la invitación. El código es un bearer secret de 5 caracteres; sin esta validación, adivinarlo alcanza para vincularse a un niño.
- **Sí:** consentimiento de fotos obligatorio que escribe `children.photo_consent = true`. Es el único campo del modelo que el checkbox puede representar y le da efecto real.
- **No:** consentimiento opcional. Obligaría a definir qué pasa con las fotos de ese niño, que es otra spec.
- **Sí:** panel informativo "Se genera al enviar". El código ya no existe antes del envío y mostrar uno ficticio sería mentir; se conserva el diseño y la nota de vencimiento.
- **Sí:** la tarjeta solo lista pendientes. Reenviar y cancelar desde la tarjeta suman dos acciones y dos confirmaciones que el mock no tiene.
- **Sí:** la fila pendiente muestra solo el nombre. Coincide con las filas activas y con el mock; el email ya lo tiene el staff en el correo que envió.
- **Sí:** ocultar vencidas de la tarjeta y del preview con `status = 'expired'`. No se agrega un badge VENCIDA ni se renueva solo.
- **Sí:** HTML propio para el correo, sin React Email. Una función pura no suma dependencias ni un pipeline de render.
- **Sí:** remitente configurable con `onboarding@resend.dev` por defecto. Permite probar hoy y cambiar a dominio propio sin tocar código.
- **Sí:** `NEXT_PUBLIC_APP_URL` con fallback a los headers. El enlace del correo tiene que ser absoluto y no puede hardcodear `localhost`.
- **No:** `maxLength` en los campos. Se mantiene la decisión de SPEC 05.
- **No:** mover la validación de nombre y email al servidor como única fuente. Se mantienen las dos capas: cliente para el feedback, servidor para la verdad.

## Risks

| Risk | Mitigation |
| --- | --- |
| "Confirm email" sigue activo en Supabase y `signUp` no devuelve sesión | Preflight documentado y criterio explícito de "redirige a `/` con sesión"; si falla, la acción muestra el mensaje genérico en vez de romper |
| Carrera entre el preview y `accept_invitation`: se crea el usuario de Auth y el vínculo falla | `accept_invitation` revalida y devuelve un error claro; el usuario huérfano se limpia a mano desde el dashboard, porque la app no tiene `service_role` |
| El código de 5 caracteres es adivinable (33M combinaciones) y el preview expone el email de quien tenga el código | Vigencia de 7 días, sin listado, un solo código por par niño/email; rate limiting queda como spec de hardening |
| El remitente `onboarding@resend.dev` solo entrega al email de la cuenta Resend | `RESEND_FROM_EMAIL` configurable y criterio que exige un remitente aceptado; el 403 se ve como error inline |
| `resend` en el top-level del módulo captura `undefined` en build | Cliente creado dentro de la función y `server-only` en el módulo |
| `redirect` dentro de un `try/catch` se traga la navegación | `redirect("/")` fuera del `try`, después de comprobar el resultado del RPC |
| Policies de `users` que consultan `users` entran en recursión infinita | `current_staff_daycare_id()` es `security definer` y es el único punto que lee `users` desde una policy de `users` |
| `getChildren` ahora hace dos consultas extra por render | Se piden solo las columnas necesarias y se agrupan en un `Map` por `child_id`; el listado sigue paginando por sala en cliente |
| Dos `<dialog>` y una página pública comparten nombres de campo | `photo-consent` es exclusivo de activación; el modal usa `name`/`email`/`relationship` y la activación agrega `password` |
| Borrar `_data/auth.ts` y `_data/parent-invite.ts` deja imports colgados | Paso 6 y paso 10 los eliminan cuando ya no tienen consumidores, con `tsc` como red |
| El padre aterriza en el `/` mock y la sidebar le muestra "Niños" | Fuera de alcance por decisión; el criterio verifica que la RLS le devuelve 0 niños y no rompe la pantalla |

## What is **not** in this spec

- Reenviar o cancelar una invitación desde la tarjeta.
- Desvincular padres, editar el parentesco o gestionar cuentas desde la app.
- Rate limiting, captcha o bloqueo por intentos sobre el código.
- Recuperar o cambiar contraseña, confirmar el correo con Supabase y plantillas de Auth.
- Feed real filtrado por hijo y navegación por rol.
- Correo de aviso al staff cuando se acepta una invitación.
- Marcar `expired` sin pasar por la app.
- Tests automatizados más allá de Playwright y las verificaciones SQL por MCP.

Cada uno de esos, si llega, va en su propia spec.
