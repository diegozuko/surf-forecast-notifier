/**
 * CLI utility – run forecast without Telegram bot.
 * Usage: npx tsx src/cli.ts forecast
 */
import { loadEnv } from './config/env';
import { DEFAULT_SPOTS } from './config/spots';
import { fetchSpotForecast } from './forecast';
import { generateDailyReport } from './scoring/report';
import { formatPlainText } from './messaging/format';
import { generateForecastChart } from './imaging/chart';
import { getDemoForecasts } from './demo';
import { SpotForecast } from './config/types';
import * as fs from 'fs';

async function main() {
  const command = process.argv[2];

  if (command !== 'forecast') {
    console.log('Usage: npx tsx src/cli.ts forecast');
    console.log('  Set DEMO_MODE=true for fixtures');
    process.exit(0);
  }

  const config = loadEnv();
  console.log('🏄‍♂️ Generating forecast...\n');

  let forecasts: SpotForecast[];

  if (config.demoMode) {
    console.log('[Using demo fixtures]\n');
    forecasts = getDemoForecasts();
  } else {
    console.log('[Fetching from Open-Meteo...]\n');
    forecasts = await Promise.all(
      DEFAULT_SPOTS.map(spot => fetchSpotForecast(spot))
    );
  }

  const report = generateDailyReport(forecasts);
  const text = formatPlainText(report);
  console.log(text);

  // Generate chart
  try {
    const chartBuffer = generateForecastChart(report, forecasts);
    const outPath = 'forecast-chart.png';
    fs.writeFileSync(outPath, chartBuffer);
    console.log(`\n📊 Chart saved to ${outPath}`);
  } catch (err) {
    console.error('\n⚠️  Chart generation failed (canvas not available?):', (err as Error).message);
  }
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
