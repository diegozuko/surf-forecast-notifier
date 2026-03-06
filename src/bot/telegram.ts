import TelegramBot from 'node-telegram-bot-api';
import { EnvConfig } from '../config/env';
import { DEFAULT_SPOTS } from '../config/spots';
import { Spot, SpotForecast } from '../config/types';
import { fetchSpotForecast } from '../forecast';
import { generateDailyReport } from '../scoring/report';
import { formatTelegramMessage } from '../messaging/format';
import { generateForecastChart } from '../imaging/chart';
import { getDemoForecasts } from '../demo';
import { startScheduler } from '../scheduler/cron';

let lastForecasts: SpotForecast[] | null = null;

export function createBot(config: EnvConfig): TelegramBot {
  const bot = new TelegramBot(config.telegramBotToken, { polling: true });

  bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, [
      '🏄‍♂️ *Surf Forecast Notifier – Punta del Este*',
      '',
      'Comandos disponibles:',
      '/forecast – Generar forecast ahora',
      '/spots – Ver spots configurados',
      '/settime HH:MM – Cambiar hora del reporte diario',
      '/toggleanimation on|off – Activar/desactivar animación',
      '',
      `Reporte automático diario a las ${config.scheduleTime} hs`,
    ].join('\n'), { parse_mode: 'Markdown' });
  });

  bot.onText(/\/forecast/, async (msg) => {
    const chatId = msg.chat.id;
    await runForecast(bot, chatId, config);
  });

  bot.onText(/\/spots/, (msg) => {
    const chatId = msg.chat.id;
    const lines = DEFAULT_SPOTS.map(s => {
      const fav = s.favorite ? '❤️' : '  ';
      return `${fav} *${s.name}* (${s.type})\n   📍 ${s.lat}, ${s.lon}\n   🌊 ${s.limits.minWave}–${s.limits.maxWave}m | 💨 max ${s.limits.maxWind}km/h`;
    });
    bot.sendMessage(chatId, `📍 *Spots configurados:*\n\n${lines.join('\n\n')}`, {
      parse_mode: 'Markdown',
    });
  });

  bot.onText(/\/settime (.+)/, (msg, match) => {
    const chatId = msg.chat.id;
    const time = match?.[1]?.trim();
    if (time && /^\d{2}:\d{2}$/.test(time)) {
      config.scheduleTime = time;
      startScheduler(bot, config);
      bot.sendMessage(chatId, `⏰ Hora del reporte cambiada a *${time}* y scheduler reiniciado`, { parse_mode: 'Markdown' });
    } else {
      bot.sendMessage(chatId, '❌ Formato inválido. Usá /settime HH:MM (ej: /settime 21:00)');
    }
  });

  bot.onText(/\/toggleanimation (.+)/, (msg, match) => {
    const chatId = msg.chat.id;
    const val = match?.[1]?.trim().toLowerCase();
    if (val === 'on' || val === 'off') {
      config.animationEnabled = val === 'on';
      bot.sendMessage(chatId, `🎬 Animación: *${val === 'on' ? 'activada' : 'desactivada'}*`, {
        parse_mode: 'Markdown',
      });
    } else {
      bot.sendMessage(chatId, '❌ Usá /toggleanimation on o /toggleanimation off');
    }
  });

  console.log('[Bot] Telegram bot started, listening for commands...');
  return bot;
}

/**
 * Run forecast and send to a specific chat.
 */
export async function runForecast(
  bot: TelegramBot,
  chatId: number | string,
  config: EnvConfig,
): Promise<void> {
  try {
    await bot.sendMessage(chatId, '⏳ Generando forecast...');

    // Fetch forecasts
    let forecasts: SpotForecast[];

    if (config.demoMode) {
      console.log('[Forecast] Using demo fixtures');
      forecasts = getDemoForecasts();
    } else {
      console.log('[Forecast] Fetching real data from Open-Meteo...');
      try {
        forecasts = await Promise.all(
          DEFAULT_SPOTS.map(spot => fetchSpotForecast(spot))
        );
      } catch (err) {
        console.error('[Forecast] API error, falling back to cache:', err);
        if (lastForecasts) {
          forecasts = lastForecasts;
          await bot.sendMessage(chatId, '⚠️ Error al obtener datos frescos. Usando último forecast cacheado.');
        } else {
          throw err;
        }
      }
    }

    // Cache
    lastForecasts = forecasts;

    // Generate report
    const report = generateDailyReport(forecasts);

    // Format message
    const message = formatTelegramMessage(report);

    // Generate chart image
    let chartBuffer: Buffer | null = null;
    try {
      chartBuffer = generateForecastChart(report, forecasts);
    } catch (err) {
      console.error('[Imaging] Chart generation failed:', err);
    }

    // Send message
    try {
      await bot.sendMessage(chatId, message, { parse_mode: 'MarkdownV2' });
    } catch {
      // Fallback: send without markdown if parsing fails
      const plain = message.replace(/[\\*_`\[\]()~>#+=|{}.!-]/g, '');
      await bot.sendMessage(chatId, plain);
    }

    // Send chart
    if (chartBuffer) {
      await bot.sendPhoto(chatId, chartBuffer, {
        caption: `📊 Forecast chart – ${report.bestSpot?.spot.name || 'Punta del Este'}`,
      });
    }

    console.log('[Forecast] Report sent successfully');
  } catch (err) {
    console.error('[Forecast] Error generating report:', err);
    await bot.sendMessage(chatId, '❌ Error generando el forecast. Revisá los logs.');
  }
}

/**
 * Send scheduled forecast to the configured chat.
 */
export async function sendScheduledForecast(bot: TelegramBot, config: EnvConfig): Promise<void> {
  const chatId = config.telegramChatId;
  if (!chatId) {
    console.error('[Scheduler] No TELEGRAM_CHAT_ID configured');
    return;
  }
  await runForecast(bot, chatId, config);
}
