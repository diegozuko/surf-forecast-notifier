import * as SunCalc from 'suncalc';
import { SpotForecast, DailyReport, SpotRecommendation } from '../config/types';
import { generateSpotRecommendation } from './score';

/**
 * Filter forecast hours to a relevant time range, keeping only daylight hours
 * (sunrise to sunset). You can't surf at night.
 *
 * - If called in the evening (after 18:00): show tomorrow's daylight hours only
 * - Otherwise: show remaining daylight hours from now onward
 */
function filterRelevantHours(forecasts: SpotForecast[]): SpotForecast[] {
  const now = new Date();
  const currentHour = now.getHours();

  if (currentHour >= 18) {
    // Evening scheduled report: filter to tomorrow daylight only
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const dayAfter = new Date(tomorrow);
    dayAfter.setDate(dayAfter.getDate() + 1);

    return forecasts.map(f => ({
      ...f,
      hourly: f.hourly.filter(h => {
        if (h.time < tomorrow || h.time >= dayAfter) return false;
        return isDaylightHour(h.time, f.spot.lat, f.spot.lon);
      }),
    }));
  }

  // Manual/daytime report: show daylight hours from now onward
  return forecasts.map(f => ({
    ...f,
    hourly: f.hourly.filter(h => {
      if (h.time < now) return false;
      return isDaylightHour(h.time, f.spot.lat, f.spot.lon);
    }),
  }));
}

/**
 * Check if a given hour falls between sunrise and sunset at the given coordinates.
 */
function isDaylightHour(time: Date, lat: number, lon: number): boolean {
  const sunTimes = SunCalc.getTimes(time, lat, lon);
  const ms = time.getTime();
  return ms >= sunTimes.sunrise.getTime() && ms <= sunTimes.sunset.getTime();
}

/**
 * Generate a full daily report from all spot forecasts.
 */
export function generateDailyReport(forecasts: SpotForecast[]): DailyReport {
  const filtered = filterRelevantHours(forecasts);
  const recommendations = filtered.map(f => generateSpotRecommendation(f));

  // Sort by confidence * topScore
  const ranked = [...recommendations].sort(
    (a, b) => (b.confidence * b.topScore) - (a.confidence * a.topScore)
  );

  // Only consider spots with decent conditions (confidence >= 40, has windows)
  const viable = ranked.filter(r => r.bestWindows.length > 0 && r.confidence >= 40);
  const bestSpot = viable[0] ?? null;

  // Find best alternative (different spot, preferring non-favorite)
  let alternativeSpot: SpotRecommendation | null = null;
  if (viable.length > 1) {
    const nonFavAlt = viable.find(r => r !== bestSpot && !r.spot.favorite && r.confidence >= 35);
    alternativeSpot = nonFavAlt ?? viable.find(r => r !== bestSpot) ?? null;
  }

  const dateStr = new Date().toLocaleDateString('es-UY', {
    timeZone: 'America/Montevideo',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Use contextual time reference based on hour of day
  const currentHour = new Date().getHours();
  const timeRef = currentHour >= 18 ? 'Mañana' : 'Hoy';

  // Build overall summary
  let overallSummary = '';
  if (bestSpot) {
    overallSummary = `🏄 ${timeRef} el mejor spot es **${bestSpot.spot.name}**. `;
    overallSummary += bestSpot.summary;
    if (alternativeSpot) {
      overallSummary += `\n\nAlternativa: **${alternativeSpot.spot.name}** – ${alternativeSpot.summary}`;
    }
  } else {
    // No viable spots – be honest about bad conditions
    const topRanked = ranked[0];
    if (topRanked && topRanked.bestWindows.length > 0) {
      overallSummary = `🚫 ${timeRef} las condiciones son malas para longboard. `;
      overallSummary += `El mejor spot sería ${topRanked.spot.name} pero con confianza muy baja (${topRanked.confidence}/100). `;
      overallSummary += 'No parece haber surf mañana – mejor esperar.';
    } else {
      overallSummary = `🚫 ${timeRef} no hay surf. Condiciones pobres en todos los spots monitoreados. `;
      overallSummary += 'Mucho viento, poco swell, o ambos. Mejor esperar al próximo día.';
    }
  }

  return {
    date: dateStr,
    generatedAt: new Date(),
    recommendations,
    bestSpot,
    alternativeSpot,
    overallSummary,
  };
}
