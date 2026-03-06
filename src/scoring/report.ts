import { SpotForecast, DailyReport, SpotRecommendation } from '../config/types';
import { generateSpotRecommendation } from './score';

/**
 * Filter forecast hours to a relevant time range.
 * - If called in the evening (after 18:00): show tomorrow's hours only
 * - Otherwise: show remaining hours from now onward (today + tomorrow)
 */
function filterRelevantHours(forecasts: SpotForecast[]): SpotForecast[] {
  const now = new Date();
  const currentHour = now.getHours();

  if (currentHour >= 18) {
    // Evening scheduled report: filter to tomorrow only
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const dayAfter = new Date(tomorrow);
    dayAfter.setDate(dayAfter.getDate() + 1);

    return forecasts.map(f => ({
      ...f,
      hourly: f.hourly.filter(h => h.time >= tomorrow && h.time < dayAfter),
    }));
  }

  // Manual/daytime report: show hours from now onward
  return forecasts.map(f => ({
    ...f,
    hourly: f.hourly.filter(h => h.time >= now),
  }));
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

  const bestSpot = ranked[0] ?? null;

  // Find best alternative (different spot, preferring non-favorite)
  let alternativeSpot: SpotRecommendation | null = null;
  if (ranked.length > 1) {
    // Prefer a non-favorite alternative if available with decent score
    const nonFavAlt = ranked.find(r => r !== bestSpot && !r.spot.favorite && r.topScore > 30);
    alternativeSpot = nonFavAlt ?? ranked.find(r => r !== bestSpot) ?? null;
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
  if (bestSpot && bestSpot.bestWindows.length > 0) {
    overallSummary = `🏄 ${timeRef} el mejor spot es **${bestSpot.spot.name}**. `;
    overallSummary += bestSpot.summary;
    if (alternativeSpot && alternativeSpot.bestWindows.length > 0) {
      overallSummary += `\n\nAlternativa: **${alternativeSpot.spot.name}** – ${alternativeSpot.summary}`;
    }
  } else {
    overallSummary = `😔 ${timeRef} no hay condiciones ideales para longboard en los spots monitoreados. `;
    overallSummary += 'Mantenete atento, las condiciones pueden cambiar.';
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
