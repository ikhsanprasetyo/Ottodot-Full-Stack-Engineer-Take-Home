export interface MonthlySalesSummary {
  period: {
    month: string;
    startDate: string;
    endDate: string;
  };
  global: {
    totalQty: number;
    averageDailyQty: number;
  };
  ranking: {
    top: ProductMetric[];
    bottom: ProductMetric[];
  };
  products: ProductMetric[];
  dailyTrend: {
    date: string;
    totalQty: number;
  }[];
}

export interface ProductMetric {
  productId: string;
  name: string;
  totalQty: number;
  avgDailyQty: number;
  contributionPercent: number;
  deviationPercent: number;
  status: 'OVER_AVERAGE' | 'UNDER_AVERAGE' | 'NORMAL';
}
