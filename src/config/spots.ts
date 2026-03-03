import { Spot } from './types';

/**
 * Default spots in Punta del Este.
 *
 * EDIT HERE to add/change your spots.
 * The offshore wind directions are approximate for each beach orientation.
 *
 * Spot A: Playa Brava – faces SE, offshore wind from NW (~315°)
 * Spot B: La Barra – faces S/SE, offshore from N/NW (~340°)
 * Spot C: José Ignacio – faces S, offshore from N (~360°/0°)
 */
export const DEFAULT_SPOTS: Spot[] = [
  {
    id: 'spot-a',
    name: 'Playa Brava',
    lat: -34.9467,
    lon: -54.9367,
    type: 'beachbreak',
    favorite: true,
    limits: {
      minWave: 0.5,
      maxWave: 1.6,
      minPeriod: 8,
      maxWind: 20,
      windOffshoreDirections: [290, 300, 310, 320, 330],  // NW
      swellPreferredDirections: [120, 130, 140, 150, 160, 170, 180], // S to SE
      tidePreference: 'any',
    },
  },
  {
    id: 'spot-b',
    name: 'La Barra',
    lat: -34.9167,
    lon: -54.8667,
    type: 'beachbreak',
    favorite: true,
    limits: {
      minWave: 0.5,
      maxWave: 1.8,
      minPeriod: 8,
      maxWind: 22,
      windOffshoreDirections: [320, 330, 340, 350, 0],  // N/NW
      swellPreferredDirections: [140, 150, 160, 170, 180, 190], // S
      tidePreference: 'mid',
    },
  },
  {
    id: 'spot-c',
    name: 'José Ignacio',
    lat: -34.8333,
    lon: -54.6333,
    type: 'beachbreak',
    favorite: false,
    limits: {
      minWave: 0.6,
      maxWave: 1.8,
      minPeriod: 9,
      maxWind: 18,
      windOffshoreDirections: [340, 350, 0, 10, 20],  // N
      swellPreferredDirections: [150, 160, 170, 180, 190, 200], // S
      tidePreference: 'any',
    },
  },
];
