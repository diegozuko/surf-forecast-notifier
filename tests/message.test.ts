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
    expect(text).toContain('Confianza');
    expect(text).toContain('Ventana');
    // Should contain best spot and alternative
    expect(report.bestSpot).toBeTruthy();
    expect(text).toContain(report.bestSpot!.spot.name);
    if (report.alternativeSpot) {
      expect(text).toContain(report.alternativeSpot.spot.name);
    }
  });

  it('should contain wave and wind data', () => {
    const forecasts = getDemoForecasts();
    const report = generateDailyReport(forecasts);
    const text = formatPlainText(report);

    // Should have summary data in the concise format
    expect(text).toMatch(/\d{2}:\d{2}/);            // Time format
    expect(text).toMatch(/Ola: \d+\.\d+m/);         // Wave height
    expect(text).toMatch(/Viento: \d+km\/h/);       // Wind speed
    expect(text).toMatch(/Per: \d+s/);              // Period
  });
});

describe('formatTelegramMessage', () => {
  it('should generate a Telegram-formatted message', () => {
    const forecasts = getDemoForecasts();
    const report = generateDailyReport(forecasts);
    const msg = formatTelegramMessage(report);

    expect(msg).toContain('SURF FORECAST');
    expect(msg).toContain('Confianza');
    expect(msg).toContain('Análisis');
    // Should contain best spot
    expect(report.bestSpot).toBeTruthy();
    expect(msg).toContain(report.bestSpot!.spot.name);
  });

  it('should be under Telegram message limit', () => {
    const forecasts = getDemoForecasts();
    const report = generateDailyReport(forecasts);
    const msg = formatTelegramMessage(report);

    // Telegram limit is 4096 characters
    expect(msg.length).toBeLessThan(4096);
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
