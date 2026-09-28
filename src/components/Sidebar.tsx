import { useState } from 'react';
import { LayoutDashboard, Menu, X, TrendingUp, Users, ClipboardList, LogOut, Settings, Calculator, Plug, PanelsTopLeft } from 'lucide-react';
import { getIcon } from '@/lib/icons';
import { useAuth } from '@/lib/auth-context';
import { NotificationBell } from '@/components/NotificationBell';
import type { Area, UserRole } from '@/types';

interface SidebarProps {
  areas: Area[];
  activeView: string;
  onSelect: (view: string) => void;
  userAreaIds: string[];
}

export function Sidebar({ areas, activeView, onSelect, userAreaIds }: SidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { profile, signOut } = useAuth();

  const handleSelect = (view: string) => {
    onSelect(view);
    setMobileOpen(false);
  };

  const role: UserRole = profile?.role ?? 'operador';
  const isAdmin = role === 'admin';
  const isGerente = role === 'gerente';
  const isOperador = role === 'operador';

  const visibleAreas = isOperador
    ? areas.filter((a) => userAreaIds.includes(a.id))
    : areas;

  const navItem = (view: string, icon: typeof LayoutDashboard, label: string) => (
    <button
      onClick={() => handleSelect(view)}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 mb-1 ${
        activeView === view
          ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
      }`}
    >
      {(() => {
        const Icon = icon;
        return <Icon className="w-[18px] h-[18px] flex-shrink-0" />;
      })()}
      <span>{label}</span>
    </button>
  );

  return (
    <>
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="fixed top-4 left-4 z-50 lg:hidden bg-white rounded-lg shadow-lg p-2 border border-gray-200"
        aria-label="Toggle menu"
      >
        {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {mobileOpen && (
        <div className="fixed inset-0 bg-black/30 z-40 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      <aside
        className={`fixed top-0 left-0 h-full w-72 bg-slate-900 text-white z-40 flex flex-col transition-transform duration-300 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}
      >
        <div className="px-6 py-7 border-b border-slate-700/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-base font-bold tracking-tight">Ruiz Automotores</h1>
              <p className="text-xs text-slate-400">Indicadores Gerenciales</p>
            </div>
            <NotificationBell />
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3">
          {(isGerente || isAdmin) && navItem('overview', LayoutDashboard, 'Resumen General')}

          {/* Section: Configuración (admin only) */}
          {isAdmin && (
            <>
              <div className="px-3 py-3 mt-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Configuración</p>
              </div>
              {navItem('users', Users, 'Gestión de Usuarios')}
              {navItem('areas', PanelsTopLeft, 'Gestión de Áreas')}
              {navItem('formulas', Calculator, 'Constructor de Fórmulas')}
              {navItem('api-connections', Plug, 'Conexiones API')}
            </>
          )}

          {/* Section label */}
          {!isOperador && (
            <div className="px-3 py-3 mt-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Áreas</p>
            </div>
          )}

          {visibleAreas.map((area) => {
            const Icon = getIcon(area.icon);
            const isActive = activeView === area.slug;
            return (
              <button
                key={area.id}
                onClick={() => handleSelect(area.slug)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 mb-1 ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                {isOperador ? (
                  <ClipboardList className="w-[18px] h-[18px] flex-shrink-0" />
                ) : (
                  <Icon className="w-[18px] h-[18px] flex-shrink-0" />
                )}
                <span className="truncate">{area.name}</span>
              </button>
            );
          })}
        </nav>

        <div className="px-4 py-4 border-t border-slate-700/50">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center text-sm font-bold text-white">
              {(profile?.full_name || profile?.email || '?')[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{profile?.full_name || 'Sin nombre'}</p>
              <p className="text-xs text-slate-400 capitalize">{role}</p>
            </div>
          </div>
          <button
            onClick={signOut}
            className="w-full flex items-center justify-center gap-2 text-xs text-slate-400 hover:text-white hover:bg-slate-800 py-2 rounded-lg transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Cerrar sesión
          </button>
        </div>
      </aside>
    </>
  );
}
