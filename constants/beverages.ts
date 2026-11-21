export type BeverageType =
  | 'water'
  | 'tea'
  | 'coffee'
  | 'sparkling'
  | 'sport'
  | 'coconut'
  | 'energy'
  | 'juice'
  | 'protein'
  | 'smoothie'
  | 'herbal_tea'
  | 'cocoa'
  | 'beer'
  | 'goat_milk'
  | 'soup'
  | 'wine'
  | 'kombucha'
  | 'lemonade'
  | 'alcohol'
  | 'milk'
  | 'skim_milk'
  | 'soft_drink';

export type BeverageConfig = {
  type: BeverageType;
  label: string;
  shortLabel: string;
  emoji: string;
  hydrationFactor: number;
  defaultVolumeMl: number;
};

export const BEVERAGES: BeverageConfig[] = [
  { type: 'water', label: 'Water', shortLabel: 'Water', emoji: '💧', hydrationFactor: 1.0, defaultVolumeMl: 250 },
  { type: 'tea', label: 'Tea', shortLabel: 'Tea', emoji: '🍵', hydrationFactor: 0.9, defaultVolumeMl: 200 },
  { type: 'coffee', label: 'Coffee', shortLabel: 'Coffee', emoji: '☕', hydrationFactor: 0.8, defaultVolumeMl: 150 },
  {
    type: 'sparkling',
    label: 'Sparkling Water',
    shortLabel: 'Sparkling',
    emoji: '🫧',
    hydrationFactor: 1.0,
    defaultVolumeMl: 250,
  },
  {
    type: 'sport',
    label: 'Sport Drink',
    shortLabel: 'Sport',
    emoji: '🥤',
    hydrationFactor: 0.85,
    defaultVolumeMl: 330,
  },
  {
    type: 'coconut',
    label: 'Coconut Water',
    shortLabel: 'Coconut',
    emoji: '🥥',
    hydrationFactor: 1.0,
    defaultVolumeMl: 250,
  },
  {
    type: 'energy',
    label: 'Energy Drink',
    shortLabel: 'Energy',
    emoji: '🥫',
    hydrationFactor: 0.75,
    defaultVolumeMl: 250,
  },
  { type: 'juice', label: 'Juice', shortLabel: 'Juice', emoji: '🧃', hydrationFactor: 0.85, defaultVolumeMl: 200 },
  {
    type: 'protein',
    label: 'Protein Shake',
    shortLabel: 'Protein',
    emoji: '🥤',
    hydrationFactor: 0.9,
    defaultVolumeMl: 300,
  },
  {
    type: 'smoothie',
    label: 'Smoothie',
    shortLabel: 'Smoothie',
    emoji: '🧋',
    hydrationFactor: 0.85,
    defaultVolumeMl: 300,
  },
  {
    type: 'herbal_tea',
    label: 'Herbal Tea',
    shortLabel: 'Herbal',
    emoji: '🫖',
    hydrationFactor: 0.95,
    defaultVolumeMl: 200,
  },
  { type: 'cocoa', label: 'Cocoa', shortLabel: 'Cocoa', emoji: '🧉', hydrationFactor: 0.8, defaultVolumeMl: 200 },
  { type: 'beer', label: 'Beer', shortLabel: 'Beer', emoji: '🍺', hydrationFactor: 0.6, defaultVolumeMl: 330 },
  {
    type: 'goat_milk',
    label: 'Goat Milk',
    shortLabel: 'Goat',
    emoji: '🥛',
    hydrationFactor: 0.9,
    defaultVolumeMl: 200,
  },
  { type: 'soup', label: 'Soup', shortLabel: 'Soup', emoji: '🍲', hydrationFactor: 0.9, defaultVolumeMl: 250 },
  { type: 'wine', label: 'Wine', shortLabel: 'Wine', emoji: '🍷', hydrationFactor: 0.55, defaultVolumeMl: 150 },
  {
    type: 'kombucha',
    label: 'Kombucha',
    shortLabel: 'Kombucha',
    emoji: '🫙',
    hydrationFactor: 0.9,
    defaultVolumeMl: 250,
  },
  {
    type: 'lemonade',
    label: 'Lemonade',
    shortLabel: 'Lemonade',
    emoji: '🍋',
    hydrationFactor: 0.85,
    defaultVolumeMl: 250,
  },
  {
    type: 'alcohol',
    label: 'Alcohol',
    shortLabel: 'Alcohol',
    emoji: '🥃',
    hydrationFactor: 0.5,
    defaultVolumeMl: 50,
  },
  { type: 'milk', label: 'Milk', shortLabel: 'Milk', emoji: '🥛', hydrationFactor: 0.9, defaultVolumeMl: 200 },
  {
    type: 'skim_milk',
    label: 'Skim Milk',
    shortLabel: 'Skim',
    emoji: '🥛',
    hydrationFactor: 0.92,
    defaultVolumeMl: 200,
  },
  {
    type: 'soft_drink',
    label: 'Soft Drink',
    shortLabel: 'Soda',
    emoji: '🥤',
    hydrationFactor: 0.8,
    defaultVolumeMl: 330,
  },
];

export const DEFAULT_QUICK_DRINKS: BeverageType[] = ['water', 'tea', 'coffee'];

export const BEVERAGE_BY_TYPE = Object.fromEntries(
  BEVERAGES.map((beverage) => [beverage.type, beverage])
) as Record<BeverageType, BeverageConfig>;

export function computeNetHydrationMl(type: BeverageType, volumeMl: number) {
  const factor = BEVERAGE_BY_TYPE[type].hydrationFactor;
  return Math.round(volumeMl * factor);
}
