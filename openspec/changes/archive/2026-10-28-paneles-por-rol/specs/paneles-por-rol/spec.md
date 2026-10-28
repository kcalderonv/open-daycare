# Spec Delta

## Purpose

Permite que el staff de la guardería y las familias usen la misma aplicación con dos experiencias separadas: el staff conserva la gestión y el feed completo, y cada familia accede solo a la información de sus hijos.

## ADDED Requirements

### Requirement: Rutas separadas por panel

El sistema SHALL servir el panel de staff en `/`, `/ninos` y `/ninos/[id]`, y el panel de familia en `/familia`. El panel de familia MUST tener su propio layout y MUST NOT compartir la navegación con el de staff.

#### Scenario: El staff entra al feed

- **WHEN** un usuario con rol `admin` o `staff` abre `/`
- **THEN** ve el feed de la guardería con la navegación de staff
- **AND** conserva las rutas `/ninos` y `/ninos/[id]` para la gestión

#### Scenario: La familia entra a su panel

- **WHEN** un usuario con rol `parent` abre `/familia`
- **THEN** ve el feed de su familia con la navegación de familia

### Requirement: Acceso al panel equivocado

El sistema SHALL redirigir a un usuario autenticado que entra al panel del otro rol hacia el panel que le corresponde, sin mostrar un error ni revelar datos del panel ajeno.

#### Scenario: Un padre intenta abrir la gestión de niños

- **WHEN** un usuario con rol `parent` abre `/ninos` o `/ninos/[id]`
- **THEN** el sistema lo redirige a `/familia`
- **AND** no muestra el error de carga de la gestión

#### Scenario: El staff intenta abrir el panel de familia

- **WHEN** un usuario con rol `admin` o `staff` abre `/familia`
- **THEN** el sistema lo redirige a `/`

### Requirement: Aterrizaje por rol

Después de iniciar sesión o de activar una cuenta, el usuario SHALL llegar al panel de su rol: `/` para `admin` y `staff`, `/familia` para `parent`. Un destino guardado que apunte al panel del otro rol MUST resolverse con la misma regla de acceso, sin bucles de redirección.

#### Scenario: Un padre inicia sesión sin destino guardado

- **WHEN** un usuario con rol `parent` completa el login sin `next`
- **THEN** aterriza en `/familia`

#### Scenario: El staff inicia sesión con un destino guardado

- **WHEN** un usuario con rol `staff` completa el login con `next=/ninos`
- **THEN** aterriza en `/ninos`

#### Scenario: Un padre inicia sesión con un destino del staff

- **WHEN** un usuario con rol `parent` completa el login con `next=/ninos`
- **THEN** el sistema lo redirige a `/familia`

#### Scenario: Activación de una invitación

- **WHEN** una persona acepta una invitación y queda con rol `parent`
- **THEN** aterriza en `/familia`

### Requirement: Navegación del panel de familia

El panel de familia SHALL mostrar las secciones Feed, Resumen del día y Mi cuenta, y MUST NOT mostrar "Niños", "Avisos" ni la acción "Nueva publicación". Resumen del día y Mi cuenta existen como destinos de navegación aunque su contenido no forme parte de esta capacidad.

#### Scenario: El nav de familia no ofrece gestión

- **WHEN** un usuario con rol `parent` abre `/familia`
- **THEN** la navegación muestra Feed, Resumen del día y Mi cuenta
- **AND** no muestra "Niños", "Avisos" ni el botón de nueva publicación

#### Scenario: El staff conserva su nav

- **WHEN** un usuario con rol `staff` abre `/`
- **THEN** la navegación muestra Feed, Niños, Avisos y Mi cuenta
- **AND** muestra la acción "Nueva publicación"

### Requirement: Identidad de familia en el pie del panel

El pie del panel de familia SHALL mostrar el nombre del usuario autenticado y su parentesco con sus hijos. MUST NOT mostrar una etiqueta de rol genérica cuando hay hijos vinculados.

#### Scenario: Una madre con dos hijos

- **WHEN** una usuaria con parentesco de madre tiene dos hijos vinculados
- **THEN** el pie muestra su nombre y "Mamá de Mateo y Sofía"

#### Scenario: Un padre sin hijos vinculados

- **WHEN** un usuario con rol `parent` no tiene hijos vinculados
- **THEN** el pie muestra su nombre y una etiqueta neutra de familia

### Requirement: Feed de familia

El feed de familia SHALL mostrar el encabezado "TU FAMILIA", el saludo "Hola, {nombre}", el subtítulo "Así va el día de hoy" y una sección por fecha con el formato "HOY · MARTES 17 JUN". MUST NOT mostrar el total de niños de la guardería.

#### Scenario: Encabezado del feed de familia

- **WHEN** un usuario con rol `parent` abre `/familia`
- **THEN** ve "TU FAMILIA", "Hola, {nombre}" y "Así va el día de hoy"
- **AND** no ve el conteo total de niños de la guardería

#### Scenario: Familia sin publicaciones

- **WHEN** un usuario con rol `parent` no tiene publicaciones visibles
- **THEN** ve un estado vacío en lugar de una lista

### Requirement: Filtro por hijo

El feed de familia SHALL ofrecer un chip por cada hijo vinculado y un chip "Todos", con "Todos" seleccionado por defecto. El filtro MUST aplicarse sobre las publicaciones ya cargadas, sin recargar la página ni cambiar la URL.

#### Scenario: Filtrar por un hijo

- **WHEN** un usuario con rol `parent` selecciona el chip de uno de sus hijos
- **THEN** solo permanecen visibles las publicaciones dirigidas a ese hijo y los anuncios de su sala
- **AND** la URL no cambia

#### Scenario: Volver a todos

- **WHEN** el usuario selecciona el chip "Todos"
- **THEN** vuelven a verse todas las publicaciones visibles para la familia

### Requirement: Visibilidad de publicaciones para la familia

Un usuario con rol `parent` SHALL ver únicamente las publicaciones dirigidas a sus hijos y los anuncios de la sala de sus hijos. Las publicaciones dirigidas a otros niños de la misma guardería MUST permanecer ocultas.

#### Scenario: Publicación de otro niño

- **WHEN** un usuario con rol `parent` abre el feed
- **THEN** no ve publicaciones dirigidas a niños sin vínculo
- **AND** sí ve los anuncios de la sala de sus hijos

### Requirement: Tarjeta de publicación de familia

La tarjeta del feed de familia SHALL mostrar el nombre del hijo destinatario, la hora, el rol y nombre del autor ("14:56 · Maestra Caro - Sala Soles"), el tipo de publicación, la audiencia ("Para: familia de {hijo}"), el cuerpo y las fotos. MUST NOT ofrecer acciones de edición.

#### Scenario: Publicación de una maestra para un niño

- **WHEN** un usuario con rol `parent` ve una publicación dirigida a su hijo
- **THEN** la tarjeta muestra el nombre del hijo, la hora, la autora y la sala
- **AND** no muestra "Editar" ni "publicado por vos"

### Requirement: Lectura acotada de los hijos

El panel de familia SHALL obtener los datos de sus hijos mediante una lectura acotada que devuelva únicamente el nombre de la guardería y, por hijo, su identificador, primer nombre, sala y parentesco. MUST NOT exponer fichas médicas, alergias, fechas de nacimiento ni datos de niños ajenos.

#### Scenario: Dos hijos vinculados

- **WHEN** un usuario con rol `parent` tiene dos hijos vinculados
- **THEN** la lectura devuelve exactamente esos dos hijos con su sala y parentesco

#### Scenario: Sin hijos vinculados

- **WHEN** un usuario con rol `parent` no tiene hijos vinculados
- **THEN** la lectura devuelve un estado vacío sin error
- **AND** el panel sigue siendo navegable

#### Scenario: Un usuario de staff no obtiene hijos

- **WHEN** un usuario con rol `admin` o `staff` invoca la lectura de familia
- **THEN** no obtiene filas de niños

### Requirement: Autor y sala legibles por la familia

El sistema SHALL permitir a un usuario con rol `parent` leer el nombre y el rol del personal de su propia guardería y el nombre de las salas donde tiene un hijo. MUST NOT permitir leer personal de otra guardería ni salas sin vínculo.

#### Scenario: Personal de la propia guardería

- **WHEN** un usuario con rol `parent` consulta el personal de su guardería
- **THEN** obtiene las filas de rol `admin` y `staff` de esa guardería

#### Scenario: Personal de otra guardería

- **WHEN** un usuario con rol `parent` intenta leer el personal de otra guardería
- **THEN** no obtiene filas

#### Scenario: Sala sin vínculo

- **WHEN** un usuario con rol `parent` intenta leer una sala donde no tiene ningún hijo
- **THEN** no obtiene filas
