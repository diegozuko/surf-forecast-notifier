import { describe, it, expect } from 'vitest';
import { formatPlainText, formatTelegramMessage } from '../src/messaging/format';
import { generateDailyReport } from '../src/scoring/report';
import { getDemoForecasts } from '../src/demo/fixtures';

describe('formatPlainText', () => {
  it('should generate a readable plain text report from demo data', () => {
    const forecasts = getDemoForecasts();
    const report = generateDailyReport(forecasts);
    const text = formatPlainText(report);

    // Snapshot-style assertions
    expect(text).toContain('SURF FORECAST');
    expect(text).toContain('Playa Brava');
    expect(text).toContain('La Barra');
    expect(text).toContain('José Ignacio');
    expect(text).toContain('Confidence');
    expect(text).toContain('Ventana');
  });

  it('should contain wave and wind data', () => {
    const forecasts = getDemoForecasts();
    const report = generateDailyReport(forecasts);
    const text = formatPlainText(report);

    // Should have hour entries with data
    expect(text).toMatch(/\d{2}:00/);           // Hour format
    expect(text).toMatch(/Ola \d+\.\d+m/);      // Wave height
    expect(text).toMatch(/Viento \d+km\/h/);     // Wind speed
    expect(text).toMatch(/Per \d+s/);            // Period
  });
});

describe('formatTelegramMessage', () => {
  it('should generate a Telegram-formatted message', () => {
    const forecasts = getDemoForecasts();
    const report = generateDailyReport(forecasts);
    const msg = formatTelegramMessage(report);

    expect(msg).toContain('SURF FORECAST');
    expect(msg).toContain('Playa Brava');
    expect(msg).toContain('Confidence');
    expect(msg).toContain('Análisis');
  });
});

describe('DailyReport', () => {
  it('should pick a best spot from demo fixtures', () => {
    const forecasts = getDemoForecasts();
    const report = generateDailyReport(forecasts);

    expect(report.bestSpot).toBeTruthy();
    expect(report.bestSpot!.bestWindows.length).toBeGreaterThan(0);
    expect(report.bestSpot!.topScore).toBeGreaterThan(0);
  });

  it('should provide an alternative spot', () => {
    const forecasts = getDemoForecasts();
    const report = generateDailyReport(forecasts);

    expect(report.alternativeSpot).toBeTruthy();
  });

  it('should have overall summary', () => {
    const forecasts = getDemoForecasts();
    const report = generateDailyReport(forecasts);

    expect(report.overallSummary).toBeTruthy();
    expect(report.overallSummary.length).toBeGreaterThan(20);
  });
});
