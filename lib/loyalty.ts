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
    maxVisits: 39,
    discount: 25,
    color: '#E5E4E2',
    icon: '💎'
  },
  VIP: {
    name: 'VIP',
    minVisits: 40,
    maxVisits: Infinity,
    discount: 30,
    color: '#9D00FF',
    icon: '👑'
  }
} as const;

export type LoyaltyLevel = keyof typeof LOYALTY_LEVELS;

export function getLoyaltyLevel(
  visitCount: number,
  salonThresholds?: {
    loyalty_silver_min_visits?: number | null
    loyalty_gold_min_visits?: number | null
    loyalty_platinum_min_visits?: number | null
    loyalty_vip_min_visits?: number | null
  }
): LoyaltyLevel {
  const vipThreshold = salonThresholds?.loyalty_vip_min_visits ?? 40
  const platinumThreshold = salonThresholds?.loyalty_platinum_min_visits ?? 30
  const goldThreshold = salonThresholds?.loyalty_gold_min_visits ?? 20
  const silverThreshold = salonThresholds?.loyalty_silver_min_visits ?? 10

  if (visitCount >= vipThreshold) return 'VIP'
  if (visitCount >= platinumThreshold) return 'PLATINUM'
  if (visitCount >= goldThreshold) return 'GOLD'
  if (visitCount >= silverThreshold) return 'SILVER'
  return 'BRONZE'
}

export function getLoyaltyDiscount(level: LoyaltyLevel, salonDiscounts?: {
  loyalty_bronze_discount?: number | null
  loyalty_silver_discount?: number | null
  loyalty_gold_discount?: number | null
  loyalty_platinum_discount?: number | null
  loyalty_vip_discount?: number | null
}): number {
  if (salonDiscounts) {
    switch (level) {
      case 'BRONZE':
        return salonDiscounts.loyalty_bronze_discount ?? LOYALTY_LEVELS.BRONZE.discount
      case 'SILVER':
        return salonDiscounts.loyalty_silver_discount ?? LOYALTY_LEVELS.SILVER.discount
      case 'GOLD':
        return salonDiscounts.loyalty_gold_discount ?? LOYALTY_LEVELS.GOLD.discount
      case 'PLATINUM':
        return salonDiscounts.loyalty_platinum_discount ?? LOYALTY_LEVELS.PLATINUM.discount
      case 'VIP':
        return salonDiscounts.loyalty_vip_discount ?? LOYALTY_LEVELS.VIP.discount
      default:
        return LOYALTY_LEVELS[level as LoyaltyLevel].discount
    }
  }
  return LOYALTY_LEVELS[level].discount;
}

export function getLoyaltyLevelInfo(
  level: LoyaltyLevel,
  salonDiscounts?: {
    loyalty_bronze_discount?: number | null
    loyalty_silver_discount?: number | null
    loyalty_gold_discount?: number | null
    loyalty_platinum_discount?: number | null
    loyalty_vip_discount?: number | null
  },
  salonThresholds?: {
    loyalty_silver_min_visits?: number | null
    loyalty_gold_min_visits?: number | null
    loyalty_platinum_min_visits?: number | null
    loyalty_vip_min_visits?: number | null
  }
) {
  const baseInfo = LOYALTY_LEVELS[level]
  const discount = getLoyaltyDiscount(level, salonDiscounts)
  
  // Calculate minVisits based on salon thresholds
  let minVisits: number = baseInfo.minVisits
  if (salonThresholds) {
    switch (level) {
      case 'SILVER':
        minVisits = salonThresholds.loyalty_silver_min_visits ?? baseInfo.minVisits
        break
      case 'GOLD':
        minVisits = salonThresholds.loyalty_gold_min_visits ?? baseInfo.minVisits
        break
      case 'PLATINUM':
        minVisits = salonThresholds.loyalty_platinum_min_visits ?? baseInfo.minVisits
        break
      case 'VIP':
        minVisits = salonThresholds.loyalty_vip_min_visits ?? baseInfo.minVisits
        break
    }
  }
  
  // Calculate maxVisits based on next level's minVisits
  let maxVisits: number = baseInfo.maxVisits
  if (salonThresholds && maxVisits !== Infinity) {
    const nextLevel = getNextLevel(level)
    if (nextLevel) {
      switch (nextLevel) {
        case 'SILVER':
          maxVisits = (salonThresholds.loyalty_silver_min_visits ?? 10) - 1
          break
        case 'GOLD':
          maxVisits = (salonThresholds.loyalty_gold_min_visits ?? 20) - 1
          break
        case 'PLATINUM':
          maxVisits = (salonThresholds.loyalty_platinum_min_visits ?? 30) - 1
          break
        case 'VIP':
          maxVisits = (salonThresholds.loyalty_vip_min_visits ?? 40) - 1
          break
      }
    }
  }
  
  return {
    ...baseInfo,
    discount,
    minVisits,
    maxVisits
  }
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
      return 'VIP';
    case 'VIP':
      return null;
    default:
      return null;
  }
}

