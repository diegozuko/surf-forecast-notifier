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
  return {
    telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || '',
    telegramChatId: process.env.TELEGRAM_CHAT_ID || '',
    timezone: process.env.TZ || 'America/Montevideo',
    forecastProviderKey: process.env.FORECAST_PROVIDER_KEY || '',
    demoMode: process.env.DEMO_MODE === 'true',
    scheduleTime: process.env.SCHEDULE_TIME || '21:30',
    animationEnabled: process.env.ANIMATION_ENABLED === 'true',
  };
}
