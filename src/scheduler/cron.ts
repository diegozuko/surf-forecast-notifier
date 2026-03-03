import cron from 'node-cron';
import TelegramBot from 'node-telegram-bot-api';
import { EnvConfig } from '../config/env';
import { sendScheduledForecast } from '../bot/telegram';

/**
 * Start the daily cron job.
 * Default: 21:30 America/Montevideo.
 */
export function startScheduler(bot: TelegramBot, config: EnvConfig): cron.ScheduledTask {
  const [hours, minutes] = config.scheduleTime.split(':').map(Number);

  // Cron format: minute hour * * *
  const cronExpression = `${minutes} ${hours} * * *`;

  console.log(`[Scheduler] Daily forecast scheduled at ${config.scheduleTime} (${cronExpression}) – TZ: ${config.timezone}`);

  const task = cron.schedule(cronExpression, async () => {
    console.log(`[Scheduler] Running daily forecast at ${new Date().toISOString()}`);
    try {
      await sendScheduledForecast(bot, config);
    } catch (err) {
      console.error('[Scheduler] Failed to send scheduled forecast:', err);
    }
  }, {
    timezone: config.timezone,
  });

  return task;
}
