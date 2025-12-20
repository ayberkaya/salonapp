export const LOYALTY_LEVELS = {
  BRONZE: {
    name: 'Bronz',
    minVisits: 0,
    maxVisits: 9,
    discount: 10,
    color: '#CD7F32',
    icon: '🥉'
  },
  SILVER: {
    name: 'Gümüş',
    minVisits: 10,
    maxVisits: 19,
    discount: 15,
    color: '#C0C0C0',
    icon: '🥈'
  },
  GOLD: {
    name: 'Altın',
    minVisits: 20,
    maxVisits: 29,
    discount: 20,
    color: '#FFD700',
    icon: '🥇'
  },
  PLATINUM: {
    name: 'Platin',
    minVisits: 30,
    maxVisits: Infinity,
    discount: 25,
    color: '#E5E4E2',
    icon: '💎'
  }
} as const;

export type LoyaltyLevel = keyof typeof LOYALTY_LEVELS;

export function getLoyaltyLevel(visitCount: number): LoyaltyLevel {
  if (visitCount >= 30) return 'PLATINUM';
  if (visitCount >= 20) return 'GOLD';
  if (visitCount >= 10) return 'SILVER';
  return 'BRONZE';
}

export function getLoyaltyDiscount(level: LoyaltyLevel): number {
  return LOYALTY_LEVELS[level].discount;
}

export function getNextLevel(level: LoyaltyLevel): LoyaltyLevel | null {
  switch (level) {
    case 'BRONZE':
      return 'SILVER';
    case 'SILVER':
      return 'GOLD';
    case 'GOLD':
      return 'PLATINUM';
    case 'PLATINUM':
      return null;
    default:
      return null;
  }
}

