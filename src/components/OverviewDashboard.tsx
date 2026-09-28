import { getIcon } from '@/lib/icons';
import { getAreaColor } from '@/lib/area-colors';
import type { AreaWithKpis } from '@/types';
import { ChevronRight } from 'lucide-react';

interface OverviewDashboardProps {
  areas: AreaWithKpis[];
  onSelectArea: (slug: string) => void;
}

export function OverviewDashboard({ areas, onSelectArea }: OverviewDashboardProps) {
  return (
    <div className="space-y-6">
      {/* Area cards */}
      <div>
        <h3 className="text-lg font-bold text-gray-900 mb-4 px-1">Áreas de Gestión</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {areas.map((area, i) => {
            const Icon = getIcon(area.icon);
            const color = getAreaColor(area.slug, i);
            const accent = area.color || '#2563eb';
            return (
              <button
                key={area.id}
                onClick={() => onSelectArea(area.slug)}
                className="rounded-2xl border p-5 text-left hover:shadow-lg transition-all duration-300 group relative overflow-hidden"
                style={{ backgroundColor: `${accent}30`, borderColor: `${accent}80` }}
              >
                <div
                  className="absolute top-0 left-0 w-full h-1.5"
                  style={{ backgroundColor: accent }}
                />
                <div className="flex items-start justify-between mb-4 mt-1">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${color.gradient} flex items-center justify-center shadow-sm`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <ChevronRight className={`w-5 h-5 ${color.chevron} ${color.chevronHover} group-hover:translate-x-1 transition-all`} />
                </div>

                <h4 className="text-base font-bold text-gray-900 mb-1">{area.name}</h4>
                <p className="text-xs text-gray-700 leading-relaxed">
                  {area.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
