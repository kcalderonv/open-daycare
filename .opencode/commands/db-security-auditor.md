---
description: Audita el aislamiento de datos entre niños, padres, staff y guarderías, y las buenas prácticas de Supabase
agent: db-security-auditor
---

Auditá la seguridad de la base de datos en: `$ARGUMENTS`.

Si `$ARGUMENTS` está vacío, hacé la auditoría completa de `public` + `storage` + funciones + configuración observable de Supabase, y confirmá el alcance conmigo antes de empezar.

Seguí tu flujo completo: contexto (specs, migraciones, consumidores en `app/_lib/` y `proxy.ts`), inventario por MCP con advisors, matriz de aislamiento probando cada actor real dentro de `begin … rollback`, revisión de buenas prácticas de Supabase/Postgres con Context7, y reporte con evidencia y pendientes.

Por defecto auditá y reportá. Aplicá correcciones solo si te lo pido explícitamente en el pedido.
