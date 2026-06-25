# RestaurantOS — CLAUDE.md

Plataforma de gestión financiera para restaurantes (mercado hispano en EE.UU.).
Producto **independiente** de Smarter Investment. No importes nada de ese repo:
la fuente de verdad visual es el export de Claude Design "Restaurante CashFlow AI".

---

## ⛔ RESTRICCIONES DE STACK (reglas duras — no negociables)

Estas reglas tienen prioridad sobre cualquier suposición. Si algo en el repo
contradice esto, gana esta lista.

- **Frontend:** Vite + React + TypeScript + Tailwind. NADA de Next.js, CRA ni Webpack manual.
- **Estado / data:** Zustand + TanStack Query.
- **Backend:** **Supabase** (Auth + Postgres gestionado + Storage). **NO Firebase. NO conexión directa a Postgres. NO Prisma a otra DB.**
- **Extracción de facturas:** **Claude Vision API** (Anthropic). **NO OpenAI. NO Tesseract. NO Google Vision.**
- **Pipeline de factura:** upload imagen → Supabase Storage → Claude Vision → JSON estructurado → **pantalla de confirmación humana OBLIGATORIA** antes de guardar.
- **Deploy:** Vercel. Preset = Vite. Build `npm run build`, output `dist`.
- **Serverless functions:** plan Hobby permite **máximo 12** functions en `api/`.
  Consolida endpoints; no crees una function por cada acción. Toda llamada a la
  Claude API o a Supabase service-role va en una function, **nunca** con la key en el cliente.
- **Secrets:** `ANTHROPIC_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY` solo en env del servidor.
  En el cliente solo `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.

---

## 🎨 DESIGN SYSTEM (extraído del diseño — úsalo tal cual)

El diseño usa **estilos inline**; tradúcelos a los tokens de `tailwind.config.ts`
ya generado. No inventes colores nuevos ni reuses la paleta de Smarter Investment.

**Tipografía** (Google Fonts):
- Títulos / cifras: **Space Grotesk** (`font-display`)
- Cuerpo: **DM Sans** (`font-sans`) — NO Inter.

**Paleta** (tokens en el config):
- Fondo `base #070c1a` · superficies `surface #0c1426`, `surface-2 #0a1020`, `elevated #1b2742`
- Marca `brand #3d8bff` (deep `#1f5fe0`, deeper `#1746b0`), acento `cyan #00d4ff`
- Texto `text #e8edf2` → `muted #9fb0c0` → `dim #7c8896` → `faint #5f6b7a`
- Semánticos: `danger #ff4d6d`, `gold #ffb84d`, `violet #a855f7`

**Recetas visuales (consistentes en todo el diseño):**
- **Glassmorphism:** paneles con `bg-glass-panel`, `backdrop-blur-glass` (20px) + `saturate(140%)`, borde `1px solid rgba(125,165,255,0.12)`.
- **Glow neón:** botones de marca y KPIs activos con `shadow-glow`; barras de progreso con `bg-brand-cyan` + `shadow-glow-sm`.
- **Shell de la app:** fondo `bg-base` con overlay `bg-app-halo`.
- **Radios:** tarjetas `rounded-xl`/`rounded-2xl` (14–16px), botones `rounded-lg`.

**Layout:** sidebar fijo de 248px (glass) + main con `max-width: 1280px`, padding `30px 38px`.

---

## 🗂️ PANTALLAS (ya definidas en el diseño)

1. **Dashboard** — KPI row, charts row, sección cashflow + alertas.
2. **Captura** — dropzone de factura (imagen) + panel de campos extraídos (revisión humana).
3. **Ingresos / Caja** — formulario + summary + lista de movimientos.
4. **Facturas** — listado.
5. **Proveedores** — listado.
6. **Asistente IA** — persona Rey Salomón (CFO).

**MVP (aha moment):** posición de caja + cuentas por pagar próximas.
Empieza por Dashboard (solo esas dos cosas) + Captura. El resto va después.

---

## ✅ Reglas de trabajo para Claude Code

- Deriva todos los estilos del diseño + `tailwind.config.ts`. Si hay tokens viejos
  en el repo, **sobrescríbelos**; gana el diseño.
- Antes de implementar una pantalla nueva, declara qué endpoints de `api/` tocas
  y confirma que no superas el límite de 12.
- La extracción de factura SIEMPRE pasa por la pantalla de confirmación antes de persistir.
