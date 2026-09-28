import { Component, useEffect, useState, useRef, type ReactNode } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { OverviewDashboard } from '@/components/OverviewDashboard';
import { AreaDashboard } from '@/components/AreaDashboard';
import { UserManagement } from '@/components/UserManagement';
import { DataEntryView } from '@/components/DataEntryView';
import { AreaManagement } from '@/components/AreaManagement';
import { FormulaBuilder } from '@/components/FormulaBuilder';
import { ApiConnections } from '@/components/ApiConnections';
import { AuthProvider, useAuth } from '@/lib/auth-context';
import { SignInScreen } from '@/components/SignInScreen';
import { fetchAllAreasWithKpis, fetchAreas, fetchAllUserAreas } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import type { AreaWithKpis, Area, UserArea } from '@/types';
import { Loader2, AlertCircle } from 'lucide-react';

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; message: string }> {
  state = { hasError: false, message: '' };
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, message: error.message };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="text-center max-w-md">
            <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-4" />
            <p className="text-red-600 font-semibold mb-2">Ocurrió un error inesperado</p>
            <p className="text-sm text-gray-500 mb-4">{this.state.message}</p>
            <button
              onClick={() => window.location.reload()}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-5 py-2.5 rounded-xl text-sm transition-colors"
            >
              Recargar página
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function DashboardInner() {
  const { profile, loading: authLoading, isPasswordRecovery } = useAuth();
  const [areas, setAreas] = useState<AreaWithKpis[]>([]);
  const [allAreas, setAllAreas] = useState<Area[]>([]);
  const [userAreaIds, setUserAreaIds] = useState<string[]>([]);
  const [activeView, setActiveView] = useState<string>('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const initializedRef = useRef(false);
  const profileIdRef = useRef<string | null>(null);

  const refreshAreas = async () => {
    try {
      const [allAreaList, areasWithKpis] = await Promise.all([
        fetchAreas(), fetchAllAreasWithKpis(),
      ]);
      setAllAreas(allAreaList);
      setAreas(areasWithKpis);
    } catch { /* ignore */ }
  };

  useEffect(() => {
    if (authLoading || !profile) return;
    if (profileIdRef.current === profile.id && initializedRef.current) return;
    profileIdRef.current = profile.id;

    let cancelled = false;
    (async () => {
      try {
        const [allAreaList, areasWithKpis] = await Promise.all([
          fetchAreas(), fetchAllAreasWithKpis(),
        ]);
        if (cancelled) return;
        setAllAreas(allAreaList);
        setAreas(areasWithKpis);

        // Fetch user areas separately so it doesn't block the whole page
        fetchAllUserAreas().then((allUserAreas) => {
          if (cancelled) return;
          if (profile.role === 'operador') {
            const assigned = allUserAreas.filter((ua) => ua.user_id === profile.id);
            setUserAreaIds(assigned.map((ua) => ua.area_id));
          }
        }).catch(() => { /* ignore - non-admin may not have access */ });

        if (profile.role === 'operador') {
          // For operators, try to get their areas - use a separate fetch
          try {
            const { data: userAreasData } = await supabase
              .from('user_areas')
              .select('*')
              .eq('user_id', profile.id);
            if (cancelled) return;
            const assigned = (userAreasData as UserArea[]) ?? [];
            setUserAreaIds(assigned.map((ua) => ua.area_id));
            if (!initializedRef.current) {
              if (assigned.length > 0) {
                const firstArea = allAreaList.find((a) => a.id === assigned[0].area_id);
                if (firstArea) setActiveView(firstArea.slug);
              } else if (allAreaList.length > 0) {
                setActiveView(allAreaList[0].slug);
              }
            }
          } catch {
            if (!initializedRef.current && allAreaList.length > 0) {
              setActiveView(allAreaList[0].slug);
            }
          }
        } else {
          if (!initializedRef.current) {
            setActiveView('overview');
          }
        }
        initializedRef.current = true;
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Error');
      }
      if (!cancelled) setLoading(false);
    })();

    const timeout = setTimeout(() => {
      if (!cancelled) setLoading(false);
    }, 8000);

    return () => { cancelled = true; clearTimeout(timeout); };
  }, [profile, authLoading]);

  // Realtime: refetch areas when any change happens to the areas table
  useEffect(() => {
    if (!profile) return;

    const channel = supabase
      .channel('areas-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'areas' }, refreshAreas)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'kpis' }, refreshAreas)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'kpi_data' }, refreshAreas)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'kpi_breakdowns' }, refreshAreas)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'custom_fields' }, refreshAreas)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'formulas' }, refreshAreas)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_areas' }, refreshAreas)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [profile]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (!profile || isPasswordRecovery) {
    return <SignInScreen />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          <p className="text-sm text-gray-500">Cargando indicadores...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <p className="text-red-600 font-semibold mb-2">Error al cargar los datos</p>
          <p className="text-sm text-gray-500">{error}</p>
        </div>
      </div>
    );
  }

  const role = profile.role;
  const activeArea = areas.find((a) => a.slug === activeView);

  let content: React.ReactNode = null;

  if (activeView === 'users' && role === 'admin') {
    content = <UserManagement />;
  } else if (activeView === 'areas' && role === 'admin') {
    content = <AreaManagement />;
  } else if (activeView === 'formulas' && role === 'admin') {
    content = <FormulaBuilder />;
  } else if (activeView === 'api-connections' && role === 'admin') {
    content = <ApiConnections />;
  } else if (activeView === 'overview' && (role === 'gerente' || role === 'admin')) {
    content = <OverviewDashboard areas={areas} onSelectArea={setActiveView} />;
  } else if (activeArea) {
    if (role === 'operador') {
      content = <DataEntryView areaSlug={activeView} />;
    } else {
      content = <AreaDashboard area={activeArea} onBack={() => setActiveView('overview')} isAdmin={profile?.role === 'admin'} onKpisChanged={refreshAreas} />;
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar
        areas={allAreas}
        activeView={activeView}
        onSelect={setActiveView}
        userAreaIds={userAreaIds}
      />
      <main className="lg:ml-72 min-h-screen">
        <div className="p-4 md:p-8 pt-16 lg:pt-8 max-w-[1600px] mx-auto">
          {content}
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <DashboardInner />
      </AuthProvider>
    </ErrorBoundary>
  );
}
