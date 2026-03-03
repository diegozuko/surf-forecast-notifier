/**
 * Core types for the surf forecast notifier.
 */

export interface Spot {
  id: string;
  name: string;
  lat: number;
  lon: number;
  type: 'beachbreak' | 'pointbreak' | 'reefbreak';
  favorite: boolean;
  limits: LongboardLimits;
}

export interface LongboardLimits {
  minWave: number;          // meters
  maxWave: number;          // meters
  minPeriod: number;        // seconds
  maxWind: number;          // km/h
  /** Wind directions considered offshore for this spot (degrees) */
  windOffshoreDirections: number[];
  /** Preferred swell directions (degrees) */
  swellPreferredDirections: number[];
  tidePreference?: 'low' | 'mid' | 'high' | 'any';
}

export interface HourlyForecast {
  time: Date;
  /** Local hour string e.g. "07:00" */
  localHour: string;
  waveHeight: number;       // meters
  wavePeriod: number;       // seconds
  swellDirection: number;   // degrees
  windSpeed: number;        // km/h
  windGusts: number;        // km/h
  windDirection: number;    // degrees
}

export interface SpotForecast {
  spot: Spot;
  hourly: HourlyForecast[];
  fetchedAt: Date;
}

export interface ScoredHour {
  hour: HourlyForecast;
  score: number;            // 0-100
  breakdown: ScoreBreakdown;
}

export interface ScoreBreakdown {
  waveScore: number;
  periodScore: number;
  windScore: number;
  directionScore: number;
  gustPenalty: number;
  daylightBonus: number;
}

export interface TimeWindow {
  start: Date;
  end: Date;
  startHour: string;
  endHour: string;
  avgScore: number;
  peakScore: number;
  hours: ScoredHour[];
}

export interface SpotRecommendation {
  spot: Spot;
  bestWindows: TimeWindow[];
  topScore: number;
  confidence: number;       // 0-100
  confidenceReason: string;
  summary: string;
}

export interface DailyReport {
  date: string;
  generatedAt: Date;
  recommendations: SpotRecommendation[];
  bestSpot: SpotRecommendation | null;
  alternativeSpot: SpotRecommendation | null;
  overallSummary: string;
}
