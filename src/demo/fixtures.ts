import { SpotForecast, HourlyForecast } from '../config/types';
import { DEFAULT_SPOTS } from '../config/spots';

/**
 * Demo fixtures – realistic data for testing without API calls.
 * Generates forecasts for all default spots with varying conditions.
 */

function makeHourlyData(
  baseDate: Date,
  startHour: number,
  count: number,
  config: {
    baseWave: number;
    waveDelta: number;
    basePeriod: number;
    baseWind: number;
    windDelta: number;
    windDir: number;
    swellDir: number;
    gustExtra: number;
  },
): HourlyForecast[] {
  const hours: HourlyForecast[] = [];

  for (let i = 0; i < count; i++) {
    const hour = startHour + i;
    const time = new Date(baseDate);
    time.setHours(hour, 0, 0, 0);

    // Vary conditions through the day
    const morningFactor = hour <= 9 ? 0.8 : hour <= 14 ? 1.0 : 1.3;
    const windVariation = Math.sin((hour - 6) * 0.5) * config.windDelta;

    hours.push({
      time,
      localHour: `${String(hour).padStart(2, '0')}:00`,
      waveHeight: Math.max(0.1, config.baseWave + Math.sin(i * 0.3) * config.waveDelta),
      wavePeriod: config.basePeriod + Math.sin(i * 0.2) * 1.5,
      swellDirection: config.swellDir + Math.sin(i * 0.1) * 10,
      windSpeed: Math.max(0, (config.baseWind + windVariation) * morningFactor),
      windGusts: Math.max(0, (config.baseWind + windVariation) * morningFactor + config.gustExtra),
      windDirection: config.windDir + Math.sin(i * 0.15) * 15,
    });
  }

  return hours;
}

// Condition profiles for demo variety
const CONDITIONS = [
  // Good – light offshore wind, nice swell
  { baseWave: 1.0, waveDelta: 0.25, basePeriod: 12, baseWind: 8, windDelta: 4, windDir: 310, swellDir: 150, gustExtra: 5 },
  // Moderate – medium wind, decent swell
  { baseWave: 0.8, waveDelta: 0.3, basePeriod: 10, baseWind: 14, windDelta: 6, windDir: 340, swellDir: 170, gustExtra: 8 },
  // Poor – strong onshore
  { baseWave: 1.5, waveDelta: 0.4, basePeriod: 8, baseWind: 25, windDelta: 8, windDir: 180, swellDir: 160, gustExtra: 15 },
  // Clean & small – glassy but small
  { baseWave: 0.6, waveDelta: 0.15, basePeriod: 11, baseWind: 5, windDelta: 3, windDir: 320, swellDir: 155, gustExtra: 3 },
];

export function getDemoForecasts(): SpotForecast[] {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  return DEFAULT_SPOTS.map((spot, i) => ({
    spot,
    hourly: makeHourlyData(tomorrow, 0, 24, CONDITIONS[i % CONDITIONS.length]),
    fetchedAt: new Date(),
  }));
}
