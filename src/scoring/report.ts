import { SpotForecast, DailyReport, SpotRecommendation } from '../config/types';
import { generateSpotRecommendation } from './score';

/**
 * Generate a full daily report from all spot forecasts.
 */
export function generateDailyReport(forecasts: SpotForecast[]): DailyReport {
  const recommendations = forecasts.map(f => generateSpotRecommendation(f));

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

  // Build overall summary
  let overallSummary = '';
  if (bestSpot && bestSpot.bestWindows.length > 0) {
    overallSummary = `🏄 Mañana el mejor spot es **${bestSpot.spot.name}**. `;
    overallSummary += bestSpot.summary;
    if (alternativeSpot && alternativeSpot.bestWindows.length > 0) {
      overallSummary += `\n\nAlternativa: **${alternativeSpot.spot.name}** – ${alternativeSpot.summary}`;
    }
  } else {
    overallSummary = '😔 Mañana no hay condiciones ideales para longboard en los spots monitoreados. ';
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
