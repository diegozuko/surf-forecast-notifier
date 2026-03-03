# Surf Forecast Notifier – Punta del Este

Bot de Telegram que te envía un reporte diario de surf optimizado para **longboard** en Punta del Este. Analiza olas, viento, período y dirección para encontrar la mejor ventana horaria en tus spots favoritos.

## Features

- **Forecast automático** a las 21:30 (configurable) con recomendación para el día siguiente
- **Scoring inteligente** para longboard (0-100) basado en: altura de ola, período, viento, rachas, dirección offshore/onshore, hora del día
- **Mejor ventana horaria** (bloque continuo de 1.5-3h con score más alto)
- **Imagen tipo chart** con timeline de score, ola y viento (generada con canvas)
- **3 spots preconfigurados** (Playa Brava, La Barra, José Ignacio) – fácil de editar
- **Confidence score** con explicación
- **Demo mode** para probar sin llamar APIs
- **Fallback a cache** si falla el provider

## Arquitectura

```
src/
├── config/        → Spots, env vars, types
├── forecast/      → Open-Meteo Marine + Weather API client
├── scoring/       → score(), bestWindow(), dailyReport()
├── messaging/     → Formato Telegram (MarkdownV2) + plain text
├── imaging/       → Generación de chart PNG (node-canvas)
├── bot/           → Telegram bot (commands + send)
├── scheduler/     → Cron job diario
├── demo/          → Fixtures para testing
├── index.ts       → Entry point (bot + scheduler)
└── cli.ts         → CLI para correr forecast sin bot
```

## Provider: Open-Meteo

Se usa **Open-Meteo Marine API** (olas) + **Open-Meteo Weather API** (viento). Ambas son:
- Gratuitas, sin API key
- Sin rate limiting agresivo
- Cobertura global (incluye Punta del Este)
- Resolución horaria

## Setup

### 1. Prerrequisitos

- Node.js >= 18
- npm

### 2. Crear bot de Telegram

1. Abrí Telegram y buscá **@BotFather**
2. Enviá `/newbot` y seguí las instrucciones
3. Copiá el **token** que te da
4. Para obtener tu **chat_id**: enviá un mensaje al bot, luego visitá `https://api.telegram.org/bot<TU_TOKEN>/getUpdates` y buscá el campo `chat.id`

### 3. Configurar variables de entorno

```bash
cd surf-forecast-notifier
cp .env.example .env
```

Editá `.env` con tus valores:
```
TELEGRAM_BOT_TOKEN=tu-token-aqui
TELEGRAM_CHAT_ID=tu-chat-id-aqui
TZ=America/Montevideo
DEMO_MODE=false
SCHEDULE_TIME=21:30
```

### 4. Instalar y correr

```bash
npm install
npm run dev
```

El bot va a arrancar y vas a poder enviar `/forecast` en Telegram.

### 5. Demo mode (sin APIs)

```bash
DEMO_MODE=true npm run dev
```

O por CLI sin bot:
```bash
DEMO_MODE=true npm run forecast
```

### 6. Tests

```bash
npm test
```

## Comandos del bot

| Comando | Descripción |
|---------|-------------|
| `/start` | Ayuda y lista de comandos |
| `/forecast` | Genera forecast ahora |
| `/spots` | Lista spots configurados |
| `/settime HH:MM` | Cambia hora del reporte diario |
| `/toggleanimation on\|off` | Feature flag de animación (futuro) |

## Editar spots

Editá `src/config/spots.ts`. Cada spot tiene:

```typescript
{
  id: 'mi-spot',
  name: 'Mi Playa',
  lat: -34.95,
  lon: -54.93,
  type: 'beachbreak',     // beachbreak | pointbreak | reefbreak
  favorite: true,
  limits: {
    minWave: 0.5,          // metros
    maxWave: 1.6,          // metros
    minPeriod: 8,          // segundos
    maxWind: 20,           // km/h
    windOffshoreDirections: [300, 310, 320],    // grados
    swellPreferredDirections: [140, 150, 160],  // grados
    tidePreference: 'any', // low | mid | high | any
  },
}
```

## Deploy

### Railway / Render / Fly.io

1. Conectá el repo
2. Set env vars (TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, TZ)
3. Build command: `npm install && npm run build`
4. Start command: `npm start`

### Docker (opcional)

```dockerfile
FROM node:20-slim
RUN apt-get update && apt-get install -y build-essential libcairo2-dev libjpeg-dev libpango1.0-dev libgif-dev librsvg2-dev && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
CMD ["npm", "start"]
```

## Ejemplo de output

```
=== SURF FORECAST – Punta del Este ===
Fecha: lunes, 3 de marzo de 2026

🏄 Mañana el mejor spot es Playa Brava.
Mejor ventana 07:00–10:00 (score promedio: 72/100).
Ola de 1.0m con período de 13s. Viento 7 km/h.

Alternativa: José Ignacio – Mejor ventana 08:00–10:00 (...)

--- Playa Brava ---
Confidence: 78/100 – Condiciones excelentes con alta consistencia
  Ventana: 07:00–10:00 (avg: 72, peak: 81)
    07:00 | Ola 0.9m | Per 12s | Viento 6km/h NW | Score 75
    08:00 | Ola 1.0m | Per 13s | Viento 7km/h NW | Score 81
    09:00 | Ola 1.1m | Per 12s | Viento 9km/h NW | Score 72
```

## Roadmap

- [ ] Animación GIF/MP4 de evolución del viento
- [ ] WhatsApp via Twilio
- [ ] Persistencia SQLite (logs, historial de scores)
- [ ] Mapa estático con tiles OSM + overlay de flechas
- [ ] Tide data integration
- [ ] Machine learning: ajustar scoring con feedback real
