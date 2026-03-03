import * as SunCalc from 'suncalc';
import {
  Spot,
  HourlyForecast,
  ScoredHour,
  ScoreBreakdown,
  TimeWindow,
  SpotRecommendation,
  SpotForecast,
} from '../config/types';

/**
 * Score a single hour for longboard suitability at a given spot.
 * Returns 0-100.
 */
export function scoreHour(spot: Spot, hour: HourlyForecast): ScoredHour {
  const limits = spot.limits;

  // --- Wave height score (0-30) ---
  let waveScore = 0;
  const { waveHeight } = hour;
  const idealMin = limits.minWave;
  const idealMax = limits.maxWave;
  const toleranceMax = idealMax + 0.3; // tolerate a bit above if wind is low

  if (waveHeight >= idealMin && waveHeight <= idealMax) {
    // Perfect range – scale based on how centered
    const center = (idealMin + idealMax) / 2;
    const dist = Math.abs(waveHeight - center) / ((idealMax - idealMin) / 2);
    waveScore = 30 * (1 - dist * 0.3); // slight penalty for edges
  } else if (waveHeight < idealMin) {
    // Too small
    const ratio = waveHeight / idealMin;
    waveScore = 30 * Math.max(0, ratio - 0.2);
  } else if (waveHeight <= toleranceMax && hour.windSpeed < 15) {
    // Above ideal but tolerable with low wind
    waveScore = 30 * 0.6;
  } else {
    // Too big
    const excess = waveHeight - idealMax;
    waveScore = Math.max(0, 30 * (1 - excess / 1.5));
  }

  // --- Period score (0-25) ---
  let periodScore = 0;
  const { wavePeriod } = hour;
  if (wavePeriod >= 12 && wavePeriod <= 16) {
    periodScore = 25;
  } else if (wavePeriod >= limits.minPeriod) {
    const factor = Math.min(1, (wavePeriod - limits.minPeriod) / (12 - limits.minPeriod));
    periodScore = 15 + factor * 10;
  } else if (wavePeriod >= limits.minPeriod - 2) {
    periodScore = 10 * (wavePeriod / limits.minPeriod);
  } else {
    periodScore = Math.max(0, 5 * (wavePeriod / limits.minPeriod));
  }

  // --- Wind speed score (0-25) ---
  let windScore = 0;
  const { windSpeed } = hour;
  if (windSpeed <= 8) {
    windScore = 25; // glassy
  } else if (windSpeed <= 15) {
    windScore = 25 * (1 - (windSpeed - 8) / 20);
  } else if (windSpeed <= limits.maxWind) {
    windScore = 25 * (1 - (windSpeed - 8) / 25);
  } else {
    const excess = windSpeed - limits.maxWind;
    windScore = Math.max(0, 10 * (1 - excess / 15));
  }

  // --- Wind direction score (0-15) ---
  let directionScore = 0;
  const offshoreAngles = limits.windOffshoreDirections;
  const minAngleDiff = offshoreAngles.reduce((min, offshore) => {
    const diff = angleDifference(hour.windDirection, offshore);
    return Math.min(min, diff);
  }, 360);

  if (minAngleDiff <= 30) {
    directionScore = 15; // offshore
  } else if (minAngleDiff <= 60) {
    directionScore = 10; // cross-offshore
  } else if (minAngleDiff >= 150) {
    directionScore = 0;  // dead onshore
  } else {
    directionScore = 15 * (1 - (minAngleDiff - 30) / 120);
  }

  // --- Swell direction bonus (within direction score) ---
  const swellAngles = limits.swellPreferredDirections;
  const minSwellDiff = swellAngles.reduce((min, pref) => {
    const diff = angleDifference(hour.swellDirection, pref);
    return Math.min(min, diff);
  }, 360);
  if (minSwellDiff <= 20) {
    directionScore = Math.min(15, directionScore + 3);
  } else if (minSwellDiff > 60) {
    directionScore = Math.max(0, directionScore - 3);
  }

  // --- Gust penalty (0 to -10) ---
  let gustPenalty = 0;
  const gustDiff = hour.windGusts - hour.windSpeed;
  if (gustDiff > 15) {
    gustPenalty = -10;
  } else if (gustDiff > 8) {
    gustPenalty = -5 * ((gustDiff - 8) / 7);
  }

  // --- Daylight bonus (0-5) ---
  let daylightBonus = 0;
  const sunTimes = SunCalc.getTimes(hour.time, spot.lat, spot.lon);
  const hourMs = hour.time.getTime();
  if (hourMs >= sunTimes.sunrise.getTime() && hourMs <= sunTimes.sunset.getTime()) {
    // During daylight – bonus for early morning / golden hours
    const sunriseMs = sunTimes.sunrise.getTime();
    const hoursSinceSunrise = (hourMs - sunriseMs) / 3600000;
    if (hoursSinceSunrise <= 3) {
      daylightBonus = 5; // dawn patrol bonus
    } else {
      daylightBonus = 3;
    }
  }

  const breakdown: ScoreBreakdown = {
    waveScore: Math.round(waveScore * 10) / 10,
    periodScore: Math.round(periodScore * 10) / 10,
    windScore: Math.round(windScore * 10) / 10,
    directionScore: Math.round(directionScore * 10) / 10,
    gustPenalty: Math.round(gustPenalty * 10) / 10,
    daylightBonus,
  };

  const totalRaw = waveScore + periodScore + windScore + directionScore + gustPenalty + daylightBonus;
  const total = Math.max(0, Math.min(100, Math.round(totalRaw)));

  return {
    hour,
    score: total,
    breakdown,
  };
}

/**
 * Find the best continuous window of surfable hours for a spot.
 */
export function findBestWindows(
  scoredHours: ScoredHour[],
  minWindowHours: number = 1.5,
  maxWindowHours: number = 3,
): TimeWindow[] {
  // Filter to daylight hours with score > 20
  const viable = scoredHours.filter(sh => sh.score >= 20);
  if (viable.length === 0) return [];

  const minSlots = Math.ceil(minWindowHours);
  const maxSlots = Math.floor(maxWindowHours) + 1;

  const windows: TimeWindow[] = [];

  // Sliding window approach
  for (let start = 0; start <= viable.length - minSlots; start++) {
    for (let len = minSlots; len <= Math.min(maxSlots, viable.length - start); len++) {
      const windowHours = viable.slice(start, start + len);

      // Check continuity (hours should be consecutive)
      let continuous = true;
      for (let i = 1; i < windowHours.length; i++) {
        const diff = windowHours[i].hour.time.getTime() - windowHours[i - 1].hour.time.getTime();
        if (diff > 3600000 * 1.5) { // allow up to 1.5h gap (for 1h resolution)
          continuous = false;
          break;
        }
      }
      if (!continuous) continue;

      const avgScore = windowHours.reduce((s, h) => s + h.score, 0) / windowHours.length;
      const peakScore = Math.max(...windowHours.map(h => h.score));

      windows.push({
        start: windowHours[0].hour.time,
        end: windowHours[windowHours.length - 1].hour.time,
        startHour: windowHours[0].hour.localHour,
        endHour: addOneHour(windowHours[windowHours.length - 1].hour.localHour),
        avgScore: Math.round(avgScore),
        peakScore,
        hours: windowHours,
      });
    }
  }

  // Sort by avg score descending, return top 2
  windows.sort((a, b) => b.avgScore - a.avgScore);

  // Remove overlapping windows – keep top non-overlapping
  const selected: TimeWindow[] = [];
  for (const w of windows) {
    const overlaps = selected.some(s =>
      w.start.getTime() < s.end.getTime() + 3600000 &&
      w.end.getTime() > s.start.getTime() - 3600000
    );
    if (!overlaps) {
      selected.push(w);
    }
    if (selected.length >= 2) break;
  }

  return selected;
}

/**
 * Generate a full recommendation for a spot.
 */
export function generateSpotRecommendation(forecast: SpotForecast): SpotRecommendation {
  const scoredHours = forecast.hourly.map(h => scoreHour(forecast.spot, h));
  const bestWindows = findBestWindows(scoredHours);

  const topScore = scoredHours.reduce((max, sh) => Math.max(max, sh.score), 0);

  // Confidence calculation
  let confidence = 0;
  let confidenceReason = '';

  if (bestWindows.length === 0) {
    confidence = 10;
    confidenceReason = 'No ventana surfeable encontrada';
  } else {
    const bestAvg = bestWindows[0].avgScore;
    if (bestAvg >= 70) {
      confidence = 85 + Math.min(15, (bestAvg - 70) / 2);
      confidenceReason = 'Condiciones excelentes con alta consistencia';
    } else if (bestAvg >= 50) {
      confidence = 55 + (bestAvg - 50);
      confidenceReason = 'Condiciones buenas, algunas variables subóptimas';
    } else if (bestAvg >= 35) {
      confidence = 35 + (bestAvg - 35);
      confidenceReason = 'Condiciones marginales, puede mejorar o empeorar';
    } else {
      confidence = 15 + bestAvg;
      confidenceReason = 'Condiciones difíciles, baja previsibilidad';
    }
  }
  confidence = Math.round(Math.min(100, Math.max(0, confidence)));

  // Summary
  let summary = '';
  if (bestWindows.length > 0) {
    const w = bestWindows[0];
    const bestHour = w.hours.reduce((best, h) => h.score > best.score ? h : best, w.hours[0]);
    summary = `Mejor ventana ${w.startHour}–${w.endHour} (score promedio: ${w.avgScore}/100). `;
    summary += `Ola de ${bestHour.hour.waveHeight.toFixed(1)}m con período de ${bestHour.hour.wavePeriod.toFixed(0)}s. `;
    summary += `Viento ${bestHour.hour.windSpeed.toFixed(0)} km/h.`;
  } else {
    summary = 'Sin condiciones surfeables en las próximas horas.';
  }

  return {
    spot: forecast.spot,
    bestWindows,
    topScore,
    confidence,
    confidenceReason,
    summary,
  };
}

// --- Helpers ---

function angleDifference(a: number, b: number): number {
  let diff = Math.abs(a - b) % 360;
  if (diff > 180) diff = 360 - diff;
  return diff;
}

function addOneHour(hourStr: string): string {
  const [h, m] = hourStr.split(':').map(Number);
  const newH = (h + 1) % 24;
  return `${String(newH).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
