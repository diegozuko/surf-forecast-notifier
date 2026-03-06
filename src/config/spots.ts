import { Spot } from './types';

/**
 * All surf spots in the Punta del Este area (SW to NE along the coast).
 *
 * Beach orientations:
 * - El Emir to La Plage: face SE, offshore from NW (~300-330°)
 * - Parada 22 to La Desembocadura: face S/SE, offshore from N/NW (~320-350°)
 * - La Barra to Bikini: face S, offshore from N (~340-360°)
 * - José Ignacio: face S, offshore from N (~350-10°)
 */
export const DEFAULT_SPOTS: Spot[] = [
  {
    id: 'el-emir',
    name: 'El Emir',
    lat: -34.9631,
    lon: -54.9409,
    type: 'beachbreak',
    favorite: false,
    limits: {
      minWave: 0.5,
      maxWave: 1.8,
      minPeriod: 7,
      maxWind: 22,
      windOffshoreDirections: [290, 300, 310, 320, 330],  // NW
      swellPreferredDirections: [120, 130, 140, 150, 160, 170, 180], // SE to S
      tidePreference: 'any',
    },
  },
  {
    id: 'playa-brava',
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
      swellPreferredDirections: [120, 130, 140, 150, 160, 170, 180], // SE to S
      tidePreference: 'any',
    },
  },
  {
    id: 'la-olla',
    name: 'La Olla',
    lat: -34.9500,
    lon: -54.9350,
    type: 'beachbreak',
    favorite: false,
    limits: {
      minWave: 0.4,
      maxWave: 1.5,
      minPeriod: 7,
      maxWind: 20,
      windOffshoreDirections: [290, 300, 310, 320, 330],  // NW
      swellPreferredDirections: [120, 130, 140, 150, 160, 170, 180], // SE to S
      tidePreference: 'any',
    },
  },
  {
    id: 'zorba',
    name: 'Zorba',
    lat: -34.9440,
    lon: -54.9200,
    type: 'beachbreak',
    favorite: false,
    limits: {
      minWave: 0.5,
      maxWave: 1.8,
      minPeriod: 7,
      maxWind: 22,
      windOffshoreDirections: [300, 310, 320, 330, 340],  // NNW
      swellPreferredDirections: [130, 140, 150, 160, 170, 180], // SE to S
      tidePreference: 'any',
    },
  },
  {
    id: 'la-plage',
    name: 'La Plage',
    lat: -34.9441,
    lon: -54.9143,
    type: 'beachbreak',
    favorite: false,
    limits: {
      minWave: 0.5,
      maxWave: 1.6,
      minPeriod: 8,
      maxWind: 20,
      windOffshoreDirections: [300, 310, 320, 330, 340],  // NNW
      swellPreferredDirections: [130, 140, 150, 160, 170, 180], // SE to S
      tidePreference: 'any',
    },
  },
  {
    id: 'parada-22',
    name: 'Parada 22',
    lat: -34.9350,
    lon: -54.8950,
    type: 'beachbreak',
    favorite: false,
    limits: {
      minWave: 0.5,
      maxWave: 1.8,
      minPeriod: 8,
      maxWind: 22,
      windOffshoreDirections: [310, 320, 330, 340, 350],  // N/NW
      swellPreferredDirections: [140, 150, 160, 170, 180, 190], // S
      tidePreference: 'any',
    },
  },
  {
    id: 'parada-30',
    name: 'Parada 30',
    lat: -34.9280,
    lon: -54.8800,
    type: 'beachbreak',
    favorite: false,
    limits: {
      minWave: 0.5,
      maxWave: 1.8,
      minPeriod: 8,
      maxWind: 22,
      windOffshoreDirections: [320, 330, 340, 350, 0],  // N/NW
      swellPreferredDirections: [140, 150, 160, 170, 180, 190], // S
      tidePreference: 'any',
    },
  },
  {
    id: 'la-desembocadura',
    name: 'La Desembocadura',
    lat: -34.9170,
    lon: -54.8680,
    type: 'beachbreak',
    favorite: false,
    limits: {
      minWave: 0.5,
      maxWave: 1.8,
      minPeriod: 8,
      maxWind: 22,
      windOffshoreDirections: [320, 330, 340, 350, 0],  // N/NW
      swellPreferredDirections: [140, 150, 160, 170, 180, 190], // S
      tidePreference: 'any',
    },
  },
  {
    id: 'la-barra',
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
    id: 'la-martinez',
    name: 'La Martinez',
    lat: -34.9120,
    lon: -54.8580,
    type: 'beachbreak',
    favorite: false,
    limits: {
      minWave: 0.5,
      maxWave: 1.8,
      minPeriod: 8,
      maxWind: 22,
      windOffshoreDirections: [330, 340, 350, 0, 10],  // N
      swellPreferredDirections: [150, 160, 170, 180, 190], // S
      tidePreference: 'any',
    },
  },
  {
    id: 'la-posta-del-cangrejo',
    name: 'La Posta del Cangrejo',
    lat: -34.9080,
    lon: -54.8480,
    type: 'beachbreak',
    favorite: false,
    limits: {
      minWave: 0.5,
      maxWave: 1.8,
      minPeriod: 8,
      maxWind: 22,
      windOffshoreDirections: [330, 340, 350, 0, 10],  // N
      swellPreferredDirections: [150, 160, 170, 180, 190], // S
      tidePreference: 'any',
    },
  },
  {
    id: 'montoya',
    name: 'Montoya',
    lat: -34.9050,
    lon: -54.8380,
    type: 'beachbreak',
    favorite: false,
    limits: {
      minWave: 0.5,
      maxWave: 2.0,
      minPeriod: 8,
      maxWind: 22,
      windOffshoreDirections: [330, 340, 350, 0, 10],  // N
      swellPreferredDirections: [150, 160, 170, 180, 190, 200], // S to SW
      tidePreference: 'any',
    },
  },
  {
    id: 'bikini',
    name: 'Bikini',
    lat: -34.9050,
    lon: -54.8286,
    type: 'reefbreak',
    favorite: false,
    limits: {
      minWave: 0.6,
      maxWave: 2.0,
      minPeriod: 9,
      maxWind: 20,
      windOffshoreDirections: [330, 340, 350, 0, 10],  // N
      swellPreferredDirections: [150, 160, 170, 180, 190, 200], // S to SW
      tidePreference: 'mid',
    },
  },
  {
    id: 'jose-ignacio',
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
