---
description: Audita accesibilidad WCAG 2.2 AA en el archivo o carpeta indicada
agent: accessibility-checker
---

Revisá la accesibilidad WCAG 2.2 AA de: `$ARGUMENTS`.

Si `$ARGUMENTS` está vacío, preguntame qué archivo, carpeta o glob querés revisar y detenete. No audites el repo por tu cuenta.

Seguí tu flujo completo: contexto real (archivo, consumidores, tokens de `app/globals.css` y layout), auditoría estática con número de criterio, contraste medido sobre el DOM, runtime con Playwright (axe si está disponible, teclado, foco, modales, reflow, reduced motion y forced colors), criterios nuevos de WCAG 2.2, y reporte con evidencia y pendientes.

Por defecto auditá y reportá. Aplicá correcciones solo si te lo pido explícitamente en el pedido.
