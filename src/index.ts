import { loadEnv } from './config/env';
import { createBot } from './bot/telegram';
import { startScheduler } from './scheduler/cron';

async function main() {
  console.log('🏄‍♂️ Surf Forecast Notifier – Starting...');

  const config = loadEnv();

  // Validate required env
  if (!config.telegramBotToken) {
    console.error('❌ TELEGRAM_BOT_TOKEN is required. Set it in .env');
    process.exit(1);
  }

  if (!config.telegramChatId) {
    console.warn('⚠️  TELEGRAM_CHAT_ID not set – scheduled reports won\'t be sent.');
    console.warn('   Send /forecast in Telegram to get your chat ID from the bot.');
  }

  console.log(`📋 Config:`);
  console.log(`   Demo mode: ${config.demoMode}`);
  console.log(`   Schedule: ${config.scheduleTime} (${config.timezone})`);
  console.log(`   Animation: ${config.animationEnabled}`);
  console.log('');

  // Start bot
  const bot = createBot(config);

  // Start scheduler
  startScheduler(bot, config);

  console.log('✅ Bot is running. Send /start in Telegram to begin.');
  console.log('   Press Ctrl+C to stop.');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
