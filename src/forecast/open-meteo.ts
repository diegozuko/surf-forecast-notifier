import { Spot, HourlyForecast, SpotForecast } from '../config/types';

/**
 * Open-Meteo Marine API + Weather API client.
 *
 * Marine API: wave height, period, swell direction
 * Weather API: wind speed, gusts, direction
 *
 * Both are free, no API key required.
 */

const MARINE_BASE = 'https://marine-api.open-meteo.com/v1/marine';
const WEATHER_BASE = 'https://api.open-meteo.com/v1/forecast';

interface MarineResponse {
  hourly: {
    time: string[];
    wave_height: (number | null)[];
    wave_period: (number | null)[];
    wave_direction: (number | null)[];
  };
}

interface WeatherResponse {
  hourly: {
    time: string[];
    wind_speed_10m: (number | null)[];
    wind_gusts_10m: (number | null)[];
    wind_direction_10m: (number | null)[];
  };
}

export async function fetchSpotForecast(spot: Spot): Promise<SpotForecast> {
  const [marine, weather] = await Promise.all([
    fetchMarine(spot.lat, spot.lon),
    fetchWeather(spot.lat, spot.lon),
  ]);

  const hourly = mergeForecasts(marine, weather);

  return {
    spot,
    hourly,
    fetchedAt: new Date(),
  };
}

async function fetchMarine(lat: number, lon: number): Promise<MarineResponse> {
  const params = new URLSearchParams({
    latitude: lat.toString(),
    longitude: lon.toString(),
    hourly: 'wave_height,wave_period,wave_direction',
    forecast_days: '2',
    timezone: 'America/Montevideo',
  });

  const url = `${MARINE_BASE}?${params}`;
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`Marine API error: ${res.status} ${res.statusText}`);
  }

  return res.json() as Promise<MarineResponse>;
}

async function fetchWeather(lat: number, lon: number): Promise<WeatherResponse> {
  const params = new URLSearchParams({
    latitude: lat.toString(),
    longitude: lon.toString(),
    hourly: 'wind_speed_10m,wind_gusts_10m,wind_direction_10m',
    wind_speed_unit: 'kmh',
    forecast_days: '2',
    timezone: 'America/Montevideo',
  });

  const url = `${WEATHER_BASE}?${params}`;
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`Weather API error: ${res.status} ${res.statusText}`);
  }

  return res.json() as Promise<WeatherResponse>;
}

function mergeForecasts(marine: MarineResponse, weather: WeatherResponse): HourlyForecast[] {
  const hours: HourlyForecast[] = [];

  // Build a map from weather data keyed by ISO time string
  const weatherMap = new Map<string, {
    windSpeed: number;
    windGusts: number;
    windDirection: number;
  }>();

  for (let i = 0; i < weather.hourly.time.length; i++) {
    weatherMap.set(weather.hourly.time[i], {
      windSpeed: weather.hourly.wind_speed_10m[i] ?? 0,
      windGusts: weather.hourly.wind_gusts_10m[i] ?? 0,
      windDirection: weather.hourly.wind_direction_10m[i] ?? 0,
    });
  }

  for (let i = 0; i < marine.hourly.time.length; i++) {
    const timeStr = marine.hourly.time[i];
    const time = new Date(timeStr);
    const wind = weatherMap.get(timeStr);

    hours.push({
      time,
      localHour: timeStr.slice(11, 16), // "HH:MM"
      waveHeight: marine.hourly.wave_height[i] ?? 0,
      wavePeriod: marine.hourly.wave_period[i] ?? 0,
      swellDirection: marine.hourly.wave_direction[i] ?? 0,
      windSpeed: wind?.windSpeed ?? 0,
      windGusts: wind?.windGusts ?? 0,
      windDirection: wind?.windDirection ?? 0,
    });
  }

  return hours;
}
