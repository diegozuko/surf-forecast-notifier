import { describe, it, expect } from 'vitest';
import { scoreHour, findBestWindows, generateSpotRecommendation } from '../src/scoring/score';
import { Spot, HourlyForecast, SpotForecast } from '../src/config/types';

const testSpot: Spot = {
  id: 'test-spot',
  name: 'Test Beach',
  lat: -34.95,
  lon: -54.94,
  type: 'beachbreak',
  favorite: true,
  limits: {
    minWave: 0.5,
    maxWave: 1.6,
    minPeriod: 8,
    maxWind: 20,
    windOffshoreDirections: [300, 310, 320],
    swellPreferredDirections: [140, 150, 160, 170, 180],
    tidePreference: 'any',
  },
};

function makeHour(overrides: Partial<HourlyForecast> = {}): HourlyForecast {
  const time = new Date('2026-03-03T08:00:00');
  return {
    time,
    localHour: '08:00',
    waveHeight: 1.0,
    wavePeriod: 12,
    swellDirection: 160,
    windSpeed: 8,
    windGusts: 12,
    windDirection: 310,
    ...overrides,
  };
}

describe('scoreHour', () => {
  it('should give high score for ideal longboard conditions', () => {
    const hour = makeHour({
      waveHeight: 1.0,
      wavePeriod: 13,
      windSpeed: 6,
      windGusts: 8,
      windDirection: 310,  // offshore
      swellDirection: 160, // ideal
    });

    const result = scoreHour(testSpot, hour);
    expect(result.score).toBeGreaterThanOrEqual(65);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it('should give significantly lower score for strong onshore wind', () => {
    const offshoreHour = makeHour({
      waveHeight: 1.0,
      wavePeriod: 12,
      windSpeed: 8,
      windGusts: 10,
      windDirection: 310, // offshore
    });
    const onshoreHour = makeHour({
      waveHeight: 1.0,
      wavePeriod: 12,
      windSpeed: 30,
      windGusts: 40,
      windDirection: 160, // onshore
    });

    const offshoreResult = scoreHour(testSpot, offshoreHour);
    const onshoreResult = scoreHour(testSpot, onshoreHour);
    // Onshore + strong wind should score much lower than offshore + light wind
    expect(onshoreResult.score).toBeLessThan(offshoreResult.score);
    expect(offshoreResult.score - onshoreResult.score).toBeGreaterThanOrEqual(10);
  });

  it('should give low score for flat conditions', () => {
    const hour = makeHour({
      waveHeight: 0.1,
      wavePeriod: 4,
    });

    const result = scoreHour(testSpot, hour);
    // Flat + short period, even with good wind, should score poorly
    expect(result.score).toBeLessThan(50);
  });

  it('should penalize strong gusts', () => {
    const calmHour = makeHour({
      windSpeed: 10,
      windGusts: 12,
    });
    const gustyHour = makeHour({
      windSpeed: 10,
      windGusts: 30,
    });

    const calmScore = scoreHour(testSpot, calmHour);
    const gustyScore = scoreHour(testSpot, gustyHour);

    expect(gustyScore.score).toBeLessThan(calmScore.score);
    expect(gustyScore.breakdown.gustPenalty).toBeLessThan(0);
  });

  it('should give bonus for dawn patrol hours', () => {
    // Use explicit UTC times that map to local daylight for Montevideo (UTC-3)
    // 11:00 UTC = 08:00 local (dawn patrol), 17:00 UTC = 14:00 local (afternoon)
    const dawnHour = makeHour({
      time: new Date('2026-03-03T11:00:00Z'),
      localHour: '08:00',
    });
    const afternoonHour = makeHour({
      time: new Date('2026-03-03T17:00:00Z'),
      localHour: '14:00',
    });

    const dawnScore = scoreHour(testSpot, dawnHour);
    const afternoonScore = scoreHour(testSpot, afternoonHour);

    // Dawn patrol should get a higher or equal daylight bonus
    expect(dawnScore.breakdown.daylightBonus).toBeGreaterThanOrEqual(afternoonScore.breakdown.daylightBonus);
  });

  it('should score 0-100 range', () => {
    // Perfect conditions
    const perfect = scoreHour(testSpot, makeHour());
    expect(perfect.score).toBeGreaterThanOrEqual(0);
    expect(perfect.score).toBeLessThanOrEqual(100);

    // Worst conditions
    const worst = scoreHour(testSpot, makeHour({
      waveHeight: 0,
      wavePeriod: 2,
      windSpeed: 50,
      windGusts: 70,
      windDirection: 160,
      time: new Date('2026-03-03T02:00:00'),
      localHour: '02:00',
    }));
    expect(worst.score).toBeGreaterThanOrEqual(0);
    expect(worst.score).toBeLessThanOrEqual(100);
  });
});

describe('findBestWindows', () => {
  it('should find a window from consecutive high-scoring hours', () => {
    const hours = [];
    for (let h = 5; h <= 18; h++) {
      const time = new Date('2026-03-03');
      time.setHours(h, 0, 0, 0);

      // Make hours 7-10 the best
      const isGoodHour = h >= 7 && h <= 10;
      hours.push(scoreHour(testSpot, makeHour({
        time,
        localHour: `${String(h).padStart(2, '0')}:00`,
        waveHeight: isGoodHour ? 1.0 : 0.3,
        wavePeriod: isGoodHour ? 13 : 5,
        windSpeed: isGoodHour ? 6 : 25,
        windGusts: isGoodHour ? 8 : 35,
      })));
    }

    const windows = findBestWindows(hours);
    expect(windows.length).toBeGreaterThanOrEqual(1);
    expect(windows[0].avgScore).toBeGreaterThan(40);
  });

  it('should return empty array when no viable hours', () => {
    const hours = [0, 1, 2, 3].map(h => {
      const time = new Date('2026-03-03');
      time.setHours(h, 0, 0, 0);
      return scoreHour(testSpot, makeHour({
        time,
        localHour: `${String(h).padStart(2, '0')}:00`,
        waveHeight: 0.1,
        wavePeriod: 3,
        windSpeed: 40,
        windGusts: 55,
      }));
    });

    const windows = findBestWindows(hours);
    expect(windows.length).toBe(0);
  });
});

describe('generateSpotRecommendation', () => {
  it('should generate a valid recommendation', () => {
    const hours: HourlyForecast[] = [];
    for (let h = 0; h < 24; h++) {
      const time = new Date('2026-03-03');
      time.setHours(h, 0, 0, 0);
      const isGoodHour = h >= 7 && h <= 10;
      hours.push(makeHour({
        time,
        localHour: `${String(h).padStart(2, '0')}:00`,
        waveHeight: isGoodHour ? 1.0 : 0.4,
        wavePeriod: isGoodHour ? 12 : 6,
        windSpeed: isGoodHour ? 8 : 20,
        windGusts: isGoodHour ? 10 : 28,
      }));
    }

    const forecast: SpotForecast = {
      spot: testSpot,
      hourly: hours,
      fetchedAt: new Date(),
    };

    const rec = generateSpotRecommendation(forecast);
    expect(rec.spot.id).toBe('test-spot');
    expect(rec.confidence).toBeGreaterThan(0);
    expect(rec.confidence).toBeLessThanOrEqual(100);
    expect(rec.summary).toBeTruthy();
    expect(rec.bestWindows.length).toBeGreaterThanOrEqual(0);
  });
});
