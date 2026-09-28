import {
  Car,
  TrendingUp,
  RefreshCw,
  Wrench,
  ShieldCheck,
  Users,
  Landmark,
  LayoutDashboard,
  type LucideIcon,
} from 'lucide-react';

const iconMap: Record<string, LucideIcon> = {
  Car,
  TrendingUp,
  RefreshCw,
  Wrench,
  ShieldCheck,
  Users,
  Landmark,
  LayoutDashboard,
};

export function getIcon(name: string): LucideIcon {
  return iconMap[name] ?? LayoutDashboard;
}
