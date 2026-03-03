import { createCanvas, CanvasRenderingContext2D } from 'canvas';
import { DailyReport, SpotRecommendation, ScoredHour } from '../config/types';
import { scoreHour } from '../scoring/score';
import { SpotForecast } from '../config/types';

const WIDTH = 900;
const HEIGHT = 600;
const PADDING = { top: 70, right: 40, bottom: 80, left: 60 };
const CHART_W = WIDTH - PADDING.left - PADDING.right;
const CHART_H = HEIGHT - PADDING.top - PADDING.bottom;

const COLORS = {
  bg: '#1a1a2e',
  grid: '#2a2a4a',
  text: '#e0e0e0',
  textDim: '#8888aa',
  scoreLine: '#00d4ff',
  scoreFill: 'rgba(0, 212, 255, 0.15)',
  waveLine: '#ff6b6b',
  windLine: '#ffd93d',
  windowBg: 'rgba(0, 255, 100, 0.12)',
  windowBorder: '#00ff64',
  good: '#00ff64',
  mid: '#ffd93d',
  bad: '#ff6b6b',
};

/**
 * Generate a forecast chart image as a Buffer (PNG).
 */
export function generateForecastChart(
  report: DailyReport,
  forecasts: SpotForecast[],
): Buffer {
  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Pick the best spot's forecast for the chart
  const bestRec = report.bestSpot;
  if (!bestRec) {
    drawNoDataMessage(ctx);
    return canvas.toBuffer('image/png');
  }

  const forecast = forecasts.find(f => f.spot.id === bestRec.spot.id);
  if (!forecast) {
    drawNoDataMessage(ctx);
    return canvas.toBuffer('image/png');
  }

  // Score all hours
  const scoredHours = forecast.hourly.map(h => scoreHour(forecast.spot, h));

  // Filter to next ~24h and daytime-ish (05:00 to 21:00)
  const filtered = scoredHours.filter(sh => {
    const localHr = parseInt(sh.hour.localHour.split(':')[0]);
    return localHr >= 5 && localHr <= 21;
  }).slice(0, 17); // max 17 hours (5am to 9pm)

  if (filtered.length === 0) {
    drawNoDataMessage(ctx);
    return canvas.toBuffer('image/png');
  }

  // Title
  ctx.fillStyle = COLORS.text;
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText(`📍 ${bestRec.spot.name} – Forecast`, PADDING.left, 35);

  ctx.font = '14px sans-serif';
  ctx.fillStyle = COLORS.textDim;
  ctx.fillText(report.date, PADDING.left, 55);

  // Confidence badge
  const confColor = bestRec.confidence >= 70 ? COLORS.good : bestRec.confidence >= 45 ? COLORS.mid : COLORS.bad;
  ctx.fillStyle = confColor;
  ctx.font = 'bold 16px sans-serif';
  ctx.fillText(`Confidence: ${bestRec.confidence}%`, WIDTH - PADDING.right - 160, 35);

  // Draw grid
  drawGrid(ctx, filtered);

  // Draw recommended window highlight
  for (const w of bestRec.bestWindows) {
    drawWindowHighlight(ctx, filtered, w.startHour, w.endHour);
  }

  // Draw score line
  drawLine(ctx, filtered, sh => sh.score, 100, COLORS.scoreLine, COLORS.scoreFill, 3);

  // Draw wave height (scaled to fit)
  const maxWave = Math.max(...filtered.map(sh => sh.hour.waveHeight), 2);
  drawLine(ctx, filtered, sh => (sh.hour.waveHeight / maxWave) * 100, 100, COLORS.waveLine, undefined, 2);

  // Draw wind speed (scaled)
  const maxWind = Math.max(...filtered.map(sh => sh.hour.windSpeed), 30);
  drawLine(ctx, filtered, sh => (sh.hour.windSpeed / maxWind) * 100, 100, COLORS.windLine, undefined, 2);

  // Draw wind arrows
  drawWindArrows(ctx, filtered);

  // X-axis labels
  ctx.font = '12px sans-serif';
  ctx.fillStyle = COLORS.text;
  ctx.textAlign = 'center';
  for (let i = 0; i < filtered.length; i++) {
    const x = PADDING.left + (i / (filtered.length - 1)) * CHART_W;
    ctx.fillText(filtered[i].hour.localHour, x, HEIGHT - PADDING.bottom + 20);
  }

  // Y-axis labels (score)
  ctx.textAlign = 'right';
  for (let s = 0; s <= 100; s += 25) {
    const y = PADDING.top + CHART_H - (s / 100) * CHART_H;
    ctx.fillStyle = COLORS.textDim;
    ctx.fillText(`${s}`, PADDING.left - 10, y + 4);
  }

  // Legend
  drawLegend(ctx, maxWave, maxWind);

  // Best window annotation
  if (bestRec.bestWindows.length > 0) {
    const bw = bestRec.bestWindows[0];
    ctx.font = 'bold 13px sans-serif';
    ctx.fillStyle = COLORS.good;
    ctx.textAlign = 'center';
    ctx.fillText(
      `⬆ Mejor ventana: ${bw.startHour}–${bw.endHour}`,
      WIDTH / 2,
      HEIGHT - 15
    );
  }

  return canvas.toBuffer('image/png');
}

function drawGrid(ctx: CanvasRenderingContext2D, data: ScoredHour[]) {
  ctx.strokeStyle = COLORS.grid;
  ctx.lineWidth = 0.5;

  // Horizontal lines
  for (let s = 0; s <= 100; s += 25) {
    const y = PADDING.top + CHART_H - (s / 100) * CHART_H;
    ctx.beginPath();
    ctx.moveTo(PADDING.left, y);
    ctx.lineTo(WIDTH - PADDING.right, y);
    ctx.stroke();
  }

  // Vertical lines (per data point)
  for (let i = 0; i < data.length; i++) {
    const x = PADDING.left + (i / (data.length - 1)) * CHART_W;
    ctx.beginPath();
    ctx.moveTo(x, PADDING.top);
    ctx.lineTo(x, PADDING.top + CHART_H);
    ctx.stroke();
  }
}

function drawLine(
  ctx: CanvasRenderingContext2D,
  data: ScoredHour[],
  valueFn: (sh: ScoredHour) => number,
  maxVal: number,
  color: string,
  fillColor?: string,
  lineWidth: number = 2,
) {
  if (data.length === 0) return;

  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineJoin = 'round';

  const points: [number, number][] = data.map((sh, i) => {
    const x = PADDING.left + (i / (data.length - 1)) * CHART_W;
    const val = Math.min(maxVal, Math.max(0, valueFn(sh)));
    const y = PADDING.top + CHART_H - (val / maxVal) * CHART_H;
    return [x, y];
  });

  ctx.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i][0], points[i][1]);
  }
  ctx.stroke();

  // Fill area under curve
  if (fillColor) {
    ctx.fillStyle = fillColor;
    ctx.beginPath();
    ctx.moveTo(points[0][0], PADDING.top + CHART_H);
    for (const [x, y] of points) {
      ctx.lineTo(x, y);
    }
    ctx.lineTo(points[points.length - 1][0], PADDING.top + CHART_H);
    ctx.closePath();
    ctx.fill();
  }
}

function drawWindowHighlight(
  ctx: CanvasRenderingContext2D,
  data: ScoredHour[],
  startHour: string,
  endHour: string,
) {
  const startIdx = data.findIndex(sh => sh.hour.localHour >= startHour);
  let endIdx = data.findIndex(sh => sh.hour.localHour >= endHour);
  if (endIdx === -1) endIdx = data.length - 1;
  if (startIdx === -1) return;

  const x1 = PADDING.left + (startIdx / (data.length - 1)) * CHART_W;
  const x2 = PADDING.left + (endIdx / (data.length - 1)) * CHART_W;

  ctx.fillStyle = COLORS.windowBg;
  ctx.fillRect(x1, PADDING.top, x2 - x1, CHART_H);

  ctx.strokeStyle = COLORS.windowBorder;
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  ctx.strokeRect(x1, PADDING.top, x2 - x1, CHART_H);
  ctx.setLineDash([]);
}

function drawWindArrows(ctx: CanvasRenderingContext2D, data: ScoredHour[]) {
  // Draw a small wind arrow every 2 data points
  for (let i = 0; i < data.length; i += 2) {
    const sh = data[i];
    const x = PADDING.left + (i / (data.length - 1)) * CHART_W;
    const y = PADDING.top + CHART_H + 35;
    const dir = sh.hour.windDirection;
    const speed = sh.hour.windSpeed;
    const len = Math.min(15, 5 + speed / 4);

    // Draw arrow
    const rad = (dir * Math.PI) / 180;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rad);

    ctx.strokeStyle = COLORS.windLine;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, -len);
    ctx.lineTo(0, len);
    ctx.stroke();

    // Arrowhead
    ctx.beginPath();
    ctx.moveTo(0, len);
    ctx.lineTo(-3, len - 5);
    ctx.moveTo(0, len);
    ctx.lineTo(3, len - 5);
    ctx.stroke();

    ctx.restore();

    // Speed label
    ctx.font = '9px sans-serif';
    ctx.fillStyle = COLORS.textDim;
    ctx.textAlign = 'center';
    ctx.fillText(`${sh.hour.windSpeed.toFixed(0)}`, x, y + len + 12);
  }
}

function drawLegend(ctx: CanvasRenderingContext2D, maxWave: number, maxWind: number) {
  const y = HEIGHT - PADDING.bottom + 48;
  ctx.font = '11px sans-serif';

  // Score
  ctx.fillStyle = COLORS.scoreLine;
  ctx.fillRect(PADDING.left, y, 15, 3);
  ctx.fillStyle = COLORS.text;
  ctx.textAlign = 'left';
  ctx.fillText('Score (0-100)', PADDING.left + 20, y + 4);

  // Wave
  const waveX = PADDING.left + 140;
  ctx.fillStyle = COLORS.waveLine;
  ctx.fillRect(waveX, y, 15, 3);
  ctx.fillStyle = COLORS.text;
  ctx.fillText(`Ola (0-${maxWave.toFixed(1)}m)`, waveX + 20, y + 4);

  // Wind
  const windX = PADDING.left + 290;
  ctx.fillStyle = COLORS.windLine;
  ctx.fillRect(windX, y, 15, 3);
  ctx.fillStyle = COLORS.text;
  ctx.fillText(`Viento (0-${maxWind.toFixed(0)}km/h)`, windX + 20, y + 4);

  // Window
  const winX = PADDING.left + 470;
  ctx.fillStyle = COLORS.windowBg;
  ctx.fillRect(winX, y - 4, 15, 10);
  ctx.strokeStyle = COLORS.windowBorder;
  ctx.lineWidth = 1;
  ctx.strokeRect(winX, y - 4, 15, 10);
  ctx.fillStyle = COLORS.text;
  ctx.fillText('Ventana recomendada', winX + 20, y + 4);
}

function drawNoDataMessage(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = COLORS.text;
  ctx.font = 'bold 20px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Sin datos de forecast disponibles', WIDTH / 2, HEIGHT / 2);
}
