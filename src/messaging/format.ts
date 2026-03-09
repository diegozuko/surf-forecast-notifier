import { DailyReport } from '../config/types';

/**
 * Format the daily report as a concise Telegram message (MarkdownV2-safe).
 * Only shows the recommended spot and one alternative – no per-hour tables.
 */
export function formatTelegramMessage(report: DailyReport): string {
  const lines: string[] = [];

  // Header
  lines.push(`🏄‍♂️ *SURF FORECAST – Punta del Este*`);
  lines.push(`📅 ${escMd(report.date)}`);
  lines.push('');

  // Overall summary
  lines.push(escMd(report.overallSummary.replace(/\*\*/g, '')));
  lines.push('');

  // Best spot summary (only if conditions are decent)
  const best = report.bestSpot;
  if (best && best.bestWindows.length > 0 && best.confidence >= 40) {
    const bw = best.bestWindows[0];
    const peak = bw.hours.reduce((a, b) => a.score > b.score ? a : b, bw.hours[0]);
    const fav = best.spot.favorite ? ' ❤️' : '';
    lines.push(`⭐ *${escMd(best.spot.name)}*${fav}`);
    lines.push(escMd(`🎯 Confianza: ${best.confidence}/100`));
    lines.push(escMd(`🕐 Ventana: ${bw.startHour}–${bw.endHour}`));
    lines.push(escMd(`🌊 Ola: ${peak.hour.waveHeight.toFixed(1)}m · Per: ${peak.hour.wavePeriod.toFixed(0)}s`));
    lines.push(escMd(`💨 Viento: ${peak.hour.windSpeed.toFixed(0)}km/h ${degreesToCompass(peak.hour.windDirection)}`));
    lines.push('');

    // Alternative spot summary
    const alt = report.alternativeSpot;
    if (alt && alt.bestWindows.length > 0 && alt.confidence >= 35) {
      const aw = alt.bestWindows[0];
      const peakAlt = aw.hours.reduce((a, b) => a.score > b.score ? a : b, aw.hours[0]);
      const favAlt = alt.spot.favorite ? ' ❤️' : '';
      lines.push(`🔄 *Alternativa: ${escMd(alt.spot.name)}*${favAlt}`);
      lines.push(escMd(`🎯 Confianza: ${alt.confidence}/100`));
      lines.push(escMd(`🕐 Ventana: ${aw.startHour}–${aw.endHour}`));
      lines.push(escMd(`🌊 Ola: ${peakAlt.hour.waveHeight.toFixed(1)}m · Per: ${peakAlt.hour.wavePeriod.toFixed(0)}s`));
      lines.push(escMd(`💨 Viento: ${peakAlt.hour.windSpeed.toFixed(0)}km/h ${degreesToCompass(peakAlt.hour.windDirection)}`));
      lines.push('');
    }
  }

  // Brief analysis
  const bullets = generateAnalysisBullets(report);
  if (bullets.length > 0) {
    lines.push('📊 *Análisis:*');
    for (const b of bullets) {
      lines.push(`• ${escMd(b)}`);
    }
    lines.push('');
  }

  lines.push('_Generado automáticamente – Surf Forecast Notifier_');

  return lines.join('\n');
}

function generateAnalysisBullets(report: DailyReport): string[] {
  const bullets: string[] = [];
  const best = report.bestSpot;

  if (!best || best.bestWindows.length === 0) {
    bullets.push('No hay condiciones surfeables mañana para longboard.');
    bullets.push('El swell o el viento no cooperan en ningún spot monitoreado.');
    bullets.push('Revisá de nuevo el día siguiente o esperá al próximo swell.');
    return bullets;
  }

  const bw = best.bestWindows[0];
  const peakHour = bw.hours.reduce((a, b) => a.score > b.score ? a : b, bw.hours[0]);

  // Wave analysis
  if (peakHour.hour.waveHeight >= 0.8 && peakHour.hour.waveHeight <= 1.4) {
    bullets.push(`Tamaño ideal para longboard: ${peakHour.hour.waveHeight.toFixed(1)}m – perfecto para relajar.`);
  } else if (peakHour.hour.waveHeight < 0.6) {
    bullets.push(`Ola chica (${peakHour.hour.waveHeight.toFixed(1)}m) – necesitás tabla grande y paciencia.`);
  } else {
    bullets.push(`Ola de ${peakHour.hour.waveHeight.toFixed(1)}m – algo grande para longboard, elegí bien las series.`);
  }

  // Period analysis
  if (peakHour.hour.wavePeriod >= 12) {
    bullets.push(`Período largo (${peakHour.hour.wavePeriod.toFixed(0)}s) – olas bien formadas y fuerza.`);
  } else if (peakHour.hour.wavePeriod >= 9) {
    bullets.push(`Período aceptable (${peakHour.hour.wavePeriod.toFixed(0)}s) – olas razonables.`);
  } else {
    bullets.push(`Período corto (${peakHour.hour.wavePeriod.toFixed(0)}s) – windchop probable.`);
  }

  // Wind analysis
  if (peakHour.hour.windSpeed <= 10) {
    bullets.push(`Viento suave (${peakHour.hour.windSpeed.toFixed(0)} km/h) – condiciones limpias esperadas.`);
  } else if (peakHour.hour.windSpeed <= 18) {
    bullets.push(`Viento moderado (${peakHour.hour.windSpeed.toFixed(0)} km/h) – surfeable pero con chop.`);
  } else {
    bullets.push(`Viento fuerte (${peakHour.hour.windSpeed.toFixed(0)} km/h) – condiciones difíciles.`);
  }

  // Gusts
  const gustDiff = peakHour.hour.windGusts - peakHour.hour.windSpeed;
  if (gustDiff > 12) {
    bullets.push(`Ojo: rachas fuertes (hasta ${peakHour.hour.windGusts.toFixed(0)} km/h), puede cambiar rápido.`);
  }

  // Recommendation timing
  bullets.push(`Ventana recomendada: ${bw.startHour}–${bw.endHour} – aprovechá temprano.`);

  // Confidence
  if (best.confidence >= 75) {
    bullets.push(`Alta confianza (${best.confidence}%) – condiciones bastante seguras.`);
  } else if (best.confidence >= 50) {
    bullets.push(`Confianza media (${best.confidence}%) – chequeá updates de última hora.`);
  } else {
    bullets.push(`Baja confianza (${best.confidence}%) – las condiciones podrían variar.`);
  }

  return bullets;
}

function degreesToCompass(deg: number): string {
  const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
                'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const idx = Math.round(deg / 22.5) % 16;
  return dirs[idx];
}

/** Escape characters for Telegram MarkdownV2 */
function escMd(text: string): string {
  // In MarkdownV2, these chars must be escaped: _ * [ ] ( ) ~ ` > # + - = | { } . !
  // But we want to keep our own * for bold, so only escape dangerous ones
  return text.replace(/([_\[\]()~`>#+=|{}.!\\-])/g, '\\$1');
}

/**
 * Format as plain text (for demo/testing).
 */
export function formatPlainText(report: DailyReport): string {
  const lines: string[] = [];
  lines.push('=== SURF FORECAST – Punta del Este ===');
  lines.push(`Fecha: ${report.date}`);
  lines.push('');
  lines.push(report.overallSummary);
  lines.push('');

  const best = report.bestSpot;
  if (best && best.bestWindows.length > 0) {
    const bw = best.bestWindows[0];
    const peak = bw.hours.reduce((a, b) => a.score > b.score ? a : b, bw.hours[0]);
    lines.push(`⭐ ${best.spot.name}`);
    lines.push(`  Confianza: ${best.confidence}/100`);
    lines.push(`  Ventana: ${bw.startHour}–${bw.endHour}`);
    lines.push(`  Ola: ${peak.hour.waveHeight.toFixed(1)}m | Per: ${peak.hour.wavePeriod.toFixed(0)}s | Viento: ${peak.hour.windSpeed.toFixed(0)}km/h ${degreesToCompass(peak.hour.windDirection)}`);
    lines.push('');
  }

  const alt = report.alternativeSpot;
  if (alt && alt.bestWindows.length > 0) {
    const aw = alt.bestWindows[0];
    const peakAlt = aw.hours.reduce((a, b) => a.score > b.score ? a : b, aw.hours[0]);
    lines.push(`🔄 Alternativa: ${alt.spot.name}`);
    lines.push(`  Confianza: ${alt.confidence}/100`);
    lines.push(`  Ventana: ${aw.startHour}–${aw.endHour}`);
    lines.push(`  Ola: ${peakAlt.hour.waveHeight.toFixed(1)}m | Per: ${peakAlt.hour.wavePeriod.toFixed(0)}s | Viento: ${peakAlt.hour.windSpeed.toFixed(0)}km/h ${degreesToCompass(peakAlt.hour.windDirection)}`);
    lines.push('');
  }

  const bullets = generateAnalysisBullets(report);
  if (bullets.length > 0) {
    lines.push('Análisis:');
    for (const b of bullets) {
      lines.push(`  • ${b}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}
