# Tasks

## 1. Base de datos: lectura de familia

- [x] 1.1 Crear la migración de `public.current_daycare_id()` (`security definer`, `search_path` fijo, sin filtro de rol) y verificar con `execute_sql` que devuelve el daycare del usuario activo, `null` sin sesión y no es ejecutable por `anon`.
- [x] 1.2 Crear las policies `users_select_staff_of_daycare` y `rooms_select_parent` en la misma migración y verificar en transacción con rol `authenticated` y claims de Lucía que lee al personal de Soles, que no lee al de otra guardería y que no lee una sala donde no tiene hijos.
- [x] 1.3 Crear la migración de `public.family_overview()` (daycare + hijo, primer nombre, sala y parentesco; una fila aun sin hijos) y verificar con `execute_sql` los casos: dos hijos, cero hijos y usuario staff sin filas.
- [x] 1.4 Documentar en `supabase/README.md` las tres funciones/policies nuevas con su justificación de seguridad, y verificar que el texto describe el SQL aplicado.
- [x] 1.5 Regenerar `utils/supabase/database.types.ts` con la CLI y verificar que `npx tsc --noEmit` pasa sin editar el archivo a mano.

## 2. Seed demo de familia

- [x] 2.1 Crear la migración de seed con el usuario de Auth y `users` de Lucía Fernández (`parent`, `active`, Sala Soles) y verificar el login con sus credenciales documentadas.
- [x] 2.2 Agregar a la misma migración dos niños (Mateo y Sofía) en Soles, sus dos vínculos en `parent_children` con parentesco `mother` y verificar la idempotencia re-ejecutando el seed en una transacción con `rollback`.
- [x] 2.3 Agregar publicaciones demo dirigidas a Mateo y Sofía y un anuncio de sala, y verificar que Lucía ve las tres y que un niño sin vínculo no aparece en ninguna.
- [x] 2.4 Anotar las credenciales demo de familia en `README.md` y verificar que la sección de usuario demo sigue siendo coherente.

## 3. Rutas y guards por rol

- [x] 3.1 Mover `/`, `/ninos` y `/ninos/[id]` al grupo `(staff)`, dejar `(app)/layout.tsx` sin shell y verificar que las tres URLs siguen respondiendo con el mismo contenido para el staff.
- [x] 3.2 Implementar `requireRole(roles)` en `app/_lib/auth.ts` y montarlo en los layouts de `(staff)` y `familia`, verificando con Playwright que un padre en `/ninos` termina en `/familia` y una maestra en `/familia` termina en `/`.
- [x] 3.3 Ajustar `login` y `activateAccount` para aterrizar en `/familia` cuando el perfil es `parent` sin `next`, y verificar los cuatro casos del spec (padre sin `next`, staff con `next`, padre con `next` de staff, activación).
- [x] 3.4 Crear `app/(app)/familia/layout.tsx` y `page.tsx` mínimos y verificar que `/familia` responde 200 para Lucía y 200 con redirect para el staff, sin bucles con `/login?error=no-account`.

## 4. Shells y navegación

- [x] 4.1 Extraer el marco compartido de `app-shell.tsx` con navegación, acción principal y pie como props, y verificar que el feed de staff queda idéntico a `references/screenshots/feed.png`.
- [x] 4.2 Implementar el shell de familia con Feed, Resumen del día y Mi cuenta (`#`), sin "Niños", "Avisos" ni "Nueva publicación", y verificar los items con Playwright en `/familia`.
- [x] 4.3 Resolver el pie de familia desde `family_overview()` con el parentesco ("Mamá de Mateo y Sofía") y verificar el caso sin hijos con la etiqueta neutra.

## 5. Feed de familia

- [x] 5.1 Agregar en `app/_lib` la lectura de `family_overview()` y su tipo, y verificar con `npx tsc --noEmit` que el panel consume el tipo generado.
- [x] 5.2 Implementar el encabezado "TU FAMILIA" / "Hola, {nombre}" / "Así va el día de hoy" y la sección con formato "HOY · MARTES 17 JUN", verificando que no se muestra el conteo total de niños.
- [x] 5.3 Implementar los chips por hijo con "Todos" por defecto y filtro en cliente, y verificar con Playwright que filtrar por Mateo no cambia la URL y vuelve a todos al seleccionar "Todos".
- [x] 5.4 Implementar la tarjeta de familia (hijo, hora, autor y sala, tipo, audiencia, cuerpo, fotos, sin "Editar") y verificar con Playwright que una publicación de staff se ve como en `references/screenshots/parent-feed.png`.
- [x] 5.5 Ajustar `getFeedPosts()` para resolver el nombre del hijo desde el join o desde el mapa de `family_overview()`, y verificar que el feed de staff conserva sus nombres y etiquetas de audiencia.
- [x] 5.6 Implementar el estado vacío de familia y verificar el caso de un padre sin publicaciones visibles.

## 6. Verificación e integración

- [x] 6.1 Correr `npm run build`, `npx tsc --noEmit` y `npx eslint app`, y verificar que los tres terminan sin errores.
- [x] 6.2 Comparar con Playwright `/` y `/familia` contra `references/screenshots/feed.png` y `parent-feed.png`, guardando capturas en `.playwright-mcp/`, y verificar layout, copy y ausencia de scroll horizontal.
- [x] 6.3 Revisar con Playwright que el staff conserva compositor, "Niños", "Avisos" y "Mi cuenta", y que la familia no ve ninguna acción de gestión.

## Workflow follow-up

- Revisar el change con el equipo y aprobarlo antes de implementar.
- Archivar el change y sincronizar la capability `paneles-por-rol` una vez implementado y verificado.
