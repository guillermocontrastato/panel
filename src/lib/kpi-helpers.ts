import type { KpiWithDetails } from '@/types';

export function getCompliance(kpi: KpiWithDetails): number {
  if (!kpi.data) return 0;
  const { current_value, target_value } = kpi.data;
  const { target_direction } = kpi;
  if (target_value === 0) return 0;

  if (target_direction === 'up') {
    return Math.min(100, (current_value / target_value) * 100);
  }
  if (current_value === 0) return 100;
  return Math.min(100, (target_value / current_value) * 100);
}

export function getTrendDirection(
  kpi: KpiWithDetails
): 'positive' | 'negative' | 'neutral' {
  if (!kpi.data) return 'neutral';
  const { trend } = kpi.data;
  const { target_direction } = kpi;

  if (trend === 'stable') return 'neutral';

  if (target_direction === 'up') {
    return trend === 'up' ? 'positive' : 'negative';
  }
  return trend === 'down' ? 'positive' : 'negative';
}

export function formatValue(value: number, unit: string): string {
  if (!unit) {
    return new Intl.NumberFormat('es-AR', { maximumFractionDigits: 1 }).format(value);
  }
  if (unit === '$') {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      maximumFractionDigits: 0,
    }).format(value * 1000000);
  }
  if (unit === 'd' || unit === 'días') {
    return `${value.toFixed(1)} días`;
  }
  if (unit === 'u' || unit === 'u.') {
    return `${value.toFixed(0)} u.`;
  }
  if (unit === 'u/día') {
    return `${value.toFixed(0)} u/día`;
  }
  if (unit === 'casos') {
    return `${value.toFixed(1)} casos`;
  }
  return `${value.toFixed(1)}%`;
}

export function getComplianceColor(compliance: number): string {
  if (compliance >= 90) return 'text-emerald-600';
  if (compliance >= 70) return 'text-amber-600';
  return 'text-red-600';
}

export function getComplianceBg(compliance: number): string {
  if (compliance >= 90) return 'bg-emerald-500';
  if (compliance >= 70) return 'bg-amber-500';
  return 'bg-red-500';
}
