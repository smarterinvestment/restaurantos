# BUILD_PROMPT.md — RestaurantOS (handoff a Claude Code)

> Pega esto como primer mensaje en Claude Code, con este kit ya copiado en la raíz del repo.
> Construye por FASES. No avances de fase sin que la anterior compile y corra.

---

## Contexto

Vas a construir **RestaurantOS**: gestión de cash flow para restaurantes (mercado
hispano en EE.UU.). El diseño visual ya existe y es la **fuente de verdad**: está
reflejado en `tailwind.config.ts` y en `src/index.css`. Lee `CLAUDE.md` antes de tocar nada.

**Regla de oro:** las restricciones de stack del `CLAUDE.md` son DURAS. Supabase (no Firebase),
Claude Vision (no OpenAI), Vite + React + TS, deploy en Vercel, máximo 12 functions en `api/`.
Si encuentras tokens o config previos que contradigan el diseño, **gana el diseño**.

---

## FASE 0 — Scaffold

1. Inicializa Vite + React + TS si el repo está vacío.
2. Instala dependencias (ver `package.json` incluido): React, react-router-dom, zustand,
   @tanstack/react-query, @supabase/supabase-js, recharts (o chart.js), tailwindcss, lucide-react.
3. Conserva los archivos del kit ya copiados: `tailwind.config.ts`, `src/index.css`,
   `index.html`, `src/lib/supabase.ts`, `api/extract-invoice.ts`, `.env.example`,
   `supabase/schema.sql`. NO los regeneres con otros valores.
4. Configura Tailwind (postcss) y verifica que `npm run dev` levante con el shell oscuro y las fuentes.

Criterio de fin: la app arranca, fondo navy `#070c1a`, fuentes Space Grotesk + DM Sans cargadas.

## FASE 1 — Shell + navegación

Reproduce el layout del diseño:
- **Sidebar** fijo 248px, glassmorphism (`bg-glass-panel`, `backdrop-blur-glass`, borde sutil).
  Logo "CashFlow AI", card "Salud financiera", bloque de usuario abajo.
- Items de navegación: **Dashboard, Captura, Ingresos/Caja, Facturas, Proveedores, Asistente IA**.
- **Main** con `max-w-[1280px]`, padding `30px 38px`, fondo con `bg-app-halo`.
- Routing con react-router. Cada ruta por ahora puede ser un placeholder salvo Dashboard.

## FASE 2 — Supabase + Auth

1. Corre `supabase/schema.sql` en tu proyecto Supabase (tablas + RLS).
2. Auth de Supabase (email/password para empezar). Protege las rutas.
3. `src/lib/supabase.ts` ya tiene el cliente; úsalo con las env `VITE_SUPABASE_*`.

## FASE 3 — Dashboard MVP (el "aha moment")

Solo dos cosas, bien hechas, con datos reales de Supabase:
1. **Posición de caja**: saldo actual = saldo inicial (`cash_accounts.starting_balance`)
   + suma de `cash_movements` (income − expense).
2. **Cuentas por pagar próximas**: `invoices` con `status = 'pending'` ordenadas por `due_date`,
   mostrando cuánto se debe y en cuántos días.
Usa los KPI cards y el estilo de charts del diseño. Nada de datos mock una vez conectado.

## FASE 4 — Captura de factura (pipeline)

Flujo EXACTO (no lo cambies):
`subir imagen → Supabase Storage → POST /api/extract-invoice → JSON estructurado →
PANTALLA DE CONFIRMACIÓN HUMANA (editable) → guardar en invoices + invoice_items + cash_movement`.

- La función `api/extract-invoice.ts` ya está hecha y usa Claude Vision. No la cambies a otro proveedor.
- El usuario SIEMPRE revisa y confirma los campos extraídos antes de persistir.
- Al confirmar, crea el `invoice` (status pending) y un `cash_movement` tipo expense con el due_date.

## FASES POSTERIORES (no en el MVP)

- **Facturas / Proveedores**: listados y CRUD.
- **Ingresos/Caja**: formulario de movimientos manuales.
- **Asistente IA "Rey Salomón"**: persona CFO (acento dorado `gold`). Una sola function en `api/`
  que llame a la Claude API con el contexto financiero del restaurante. Cuida el límite de 12 functions:
  reutiliza/consolida endpoints.

---

## Recordatorios al construir

- Claves: `ANTHROPIC_API_KEY` y `SUPABASE_SERVICE_ROLE_KEY` SOLO en functions del servidor.
- Antes de crear una nueva function en `api/`, cuenta cuántas hay (límite 12 en Hobby).
- Deploy: Vercel, preset Vite, build `npm run build`, output `dist`, + env vars del `.env.example`.
