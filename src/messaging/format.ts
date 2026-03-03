import { DailyReport, SpotRecommendation, TimeWindow } from '../config/types';

/**
 * Format the daily report as a rich Telegram message (MarkdownV2-safe).
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

  // Per-spot details
  for (const rec of report.recommendations) {
    const isBest = rec === report.bestSpot;
    const isAlt = rec === report.alternativeSpot;
    const label = isBest ? '⭐ RECOMENDADO' : isAlt ? '🔄 ALTERNATIVA' : '';
    const fav = rec.spot.favorite ? '❤️' : '';

    lines.push(`━━━━━━━━━━━━━━━━━━`);
    lines.push(`📍 *${escMd(rec.spot.name)}* ${fav} ${label}`);
    lines.push(`🎯 Confidence: ${rec.confidence}/100 – ${escMd(rec.confidenceReason)}`);
    lines.push('');

    if (rec.bestWindows.length > 0) {
      for (let i = 0; i < rec.bestWindows.length; i++) {
        const w = rec.bestWindows[i];
        lines.push(`🕐 *Ventana ${i + 1}: ${escMd(w.startHour)}–${escMd(w.endHour)}* (avg score: ${w.avgScore})`);
        lines.push(formatWindowTable(w));
        lines.push('');
      }
    } else {
      lines.push(`❌ Sin ventana surfeable`);
      lines.push('');
    }
  }

  // Analysis bullets
  lines.push(`━━━━━━━━━━━━━━━━━━`);
  lines.push('📊 *Análisis:*');
  const bullets = generateAnalysisBullets(report);
  for (const b of bullets) {
    lines.push(`• ${escMd(b)}`);
  }

  lines.push('');
  lines.push('_Generado automáticamente – Surf Forecast Notifier_');

  return lines.join('\n');
}

function formatWindowTable(w: TimeWindow): string {
  const rows: string[] = [];
  rows.push('```');
  rows.push('Hora  | Ola(m) | Per(s) | Viento   | Dir');
  rows.push('------|--------|--------|----------|----');

  for (const sh of w.hours) {
    const h = sh.hour;
    const windDir = degreesToCompass(h.windDirection);
    rows.push(
      `${h.localHour} | ${h.waveHeight.toFixed(1).padStart(5)}  | ${h.wavePeriod.toFixed(0).padStart(5)}  | ${h.windSpeed.toFixed(0).padStart(3)}km/h ${windDir.padStart(3)} | ${degreesToCompass(h.swellDirection)}`
    );
  }

  rows.push('```');
  return rows.join('\n');
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

  for (const rec of report.recommendations) {
    lines.push(`--- ${rec.spot.name} ---`);
    lines.push(`Confidence: ${rec.confidence}/100 – ${rec.confidenceReason}`);
    if (rec.bestWindows.length > 0) {
      for (const w of rec.bestWindows) {
        lines.push(`  Ventana: ${w.startHour}–${w.endHour} (avg: ${w.avgScore}, peak: ${w.peakScore})`);
        for (const sh of w.hours) {
          const h = sh.hour;
          lines.push(`    ${h.localHour} | Ola ${h.waveHeight.toFixed(1)}m | Per ${h.wavePeriod.toFixed(0)}s | Viento ${h.windSpeed.toFixed(0)}km/h ${degreesToCompass(h.windDirection)} | Score ${sh.score}`);
        }
      }
    } else {
      lines.push('  Sin ventana surfeable');
    }
    lines.push('');
  }

  return lines.join('\n');
}
