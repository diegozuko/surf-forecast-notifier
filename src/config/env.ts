/**
 * Environment configuration – loaded from process.env
 */
export interface EnvConfig {
  telegramBotToken: string;
  telegramChatId: string;
  timezone: string;
  forecastProviderKey: string;
  demoMode: boolean;
  scheduleTime: string; // HH:MM
  animationEnabled: boolean;
}

export function loadEnv(): EnvConfig {
  const timezone = process.env.TZ || 'America/Montevideo';

  // Ensure Node.js uses the correct timezone for Date parsing.
  // Open-Meteo returns times in local timezone (e.g. "2024-01-15T07:00")
  // without an offset, so new Date() must interpret them in the right TZ.
  if (!process.env.TZ) {
    process.env.TZ = timezone;
  }

  return {
    telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || '',
    telegramChatId: process.env.TELEGRAM_CHAT_ID || '',
    timezone,
    forecastProviderKey: process.env.FORECAST_PROVIDER_KEY || '',
    demoMode: process.env.DEMO_MODE === 'true',
    scheduleTime: process.env.SCHEDULE_TIME || '21:30',
    animationEnabled: process.env.ANIMATION_ENABLED === 'true',
  };
}
