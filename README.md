# Tradios - Tradie Management App

App para tradespeople Australianos (electricistas, plomeros, constructores, paisajistas).

## Stack

- **Next.js 16** (App Router)
- **Supabase** (Auth + Database + Storage)
- **Tailwind CSS** (Dark theme)
- **OpenRouter AI** (Asistente de cotizaciones)

## Setup Rápido

### 1. Crear proyecto en Supabase

1. Ve a [supabase.com](https://supabase.com) → New Project
2. Copia tu **Project URL** y **anon key** de Settings → API
3. En Supabase SQL Editor, pega y ejecuta el contenido de `supabase-schema.sql`

### 2. Configurar variables de entorno

Crea `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
OPENROUTER_API_KEY=tu-openrouter-key  # Opcional, para cotizaciones con IA
```

### 3. Instalar y correr

```bash
npm install
npm run dev
```

### 4. Deploy a Vercel

```bash
npm run build
npx vercel --prod
```

## Funcionalidades

| Módulo | Descripción |
|--------|-------------|
| 👥 **Clientes** | CRM completo con búsqueda y gestión |
| 📄 **Cotizaciones** | Cotizador con mano de obra + materiales + GST auto-calculado |
| 🤖 **IA Asistente** | Genera sugerencias de cotización con OpenRouter |
| 📊 **Dashboard** | Estadísticas: clientes, cotizaciones activas, visitas, tasa de ganancia |
| 📅 **Visitas** | Programación y gestión de visitas en sitio |
| 📸 **Galería** | Portafolio de trabajos realizados |
| 💬 **Mensajes** | Historial de SMS/Email por cliente |
| 📄 **PDF** | Cotizaciones profesionales en PDF |
