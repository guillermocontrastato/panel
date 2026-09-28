import { useEffect, useState } from 'react';
import { Loader2, Settings, Save, ToggleLeft, ToggleRight } from 'lucide-react';
import { fetchAllKpis, fetchAreas, fetchApiConnections, fetchFirecrawlConnections, fetchDataSourceConfigs, upsertDataSourceConfig } from '@/lib/api';
import type { Kpi, Area, ApiConnection, FirecrawlConnection, DataSourceConfig, DataSourceType } from '@/types';

export function DataSourceSettings() {
  const [kpis, setKpis] = useState<Kpi[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [apiConns, setApiConns] = useState<ApiConnection[]>([]);
  const [firecrawlConns, setFirecrawlConns] = useState<FirecrawlConnection[]>([]);
  const [configs, setConfigs] = useState<DataSourceConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [expandedArea, setExpandedArea] = useState<string | null>(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const [k, a, api, fc, cfg] = await Promise.all([
        fetchAllKpis(), fetchAreas(), fetchApiConnections(), fetchFirecrawlConnections(), fetchDataSourceConfigs(),
      ]);
      setKpis(k); setAreas(a); setApiConns(api); setFirecrawlConns(fc); setConfigs(cfg);
      if (a.length > 0) setExpandedArea(a[0].id);
    } catch { /* ignore */ }
    setLoading(false);
  };

  const getConfig = (kpiId: string) => configs.find((c) => c.kpi_id === kpiId);

  const handleSourceChange = async (kpiId: string, sourceType: DataSourceType) => {
    setBusy(true);
    const existing = getConfig(kpiId);
    try {
      await upsertDataSourceConfig({
        kpi_id: kpiId,
        source_type: sourceType,
        api_connection_id: existing?.api_connection_id ?? null,
        firecrawl_connection_id: existing?.firecrawl_connection_id ?? null,
      });
      setConfigs((prev) => {
        const idx = prev.findIndex((c) => c.kpi_id === kpiId);
        const newCfg: DataSourceConfig = {
          id: existing?.id ?? crypto.randomUUID(),
          kpi_id: kpiId,
          source_type: sourceType,
          api_connection_id: existing?.api_connection_id ?? null,
          firecrawl_connection_id: existing?.firecrawl_connection_id ?? null,
          created_at: existing?.created_at ?? new Date().toISOString(),
        };
        if (idx >= 0) { const copy = [...prev]; copy[idx] = newCfg; return copy; }
        return [...prev, newCfg];
      });
    } catch { /* ignore */ }
    setBusy(false);
  };

  const handleApiChange = async (kpiId: string, apiId: string) => {
    setBusy(true);
    const existing = getConfig(kpiId);
    try {
      await upsertDataSourceConfig({
        kpi_id: kpiId,
        source_type: existing?.source_type ?? 'external',
        api_connection_id: apiId || null,
        firecrawl_connection_id: existing?.firecrawl_connection_id ?? null,
      });
      setConfigs((prev) => {
        const idx = prev.findIndex((c) => c.kpi_id === kpiId);
        const base: DataSourceConfig = existing ?? { id: crypto.randomUUID(), kpi_id: kpiId, source_type: 'external' as DataSourceType, api_connection_id: null, firecrawl_connection_id: null, created_at: new Date().toISOString() };
        const updated = { ...base, api_connection_id: apiId || null };
        if (idx >= 0) { const copy = [...prev]; copy[idx] = updated; return copy; }
        return [...prev, updated];
      });
    } catch { /* ignore */ }
    setBusy(false);
  };

  const handleFirecrawlChange = async (kpiId: string, fcId: string) => {
    setBusy(true);
    const existing = getConfig(kpiId);
    try {
      await upsertDataSourceConfig({
        kpi_id: kpiId,
        source_type: existing?.source_type ?? 'external',
        api_connection_id: existing?.api_connection_id ?? null,
        firecrawl_connection_id: fcId || null,
      });
      setConfigs((prev) => {
        const idx = prev.findIndex((c) => c.kpi_id === kpiId);
        const base: DataSourceConfig = existing ?? { id: crypto.randomUUID(), kpi_id: kpiId, source_type: 'external' as DataSourceType, api_connection_id: null, firecrawl_connection_id: null, created_at: new Date().toISOString() };
        const updated = { ...base, firecrawl_connection_id: fcId || null };
        if (idx >= 0) { const copy = [...prev]; copy[idx] = updated; return copy; }
        return [...prev, updated];
      });
    } catch { /* ignore */ }
    setBusy(false);
  };

  if (loading) {
    return <div className="flex items-center justify-center py-32"><Loader2 className="w-8 h-8 text-blue-500 animate-spin" /></div>;
  }

  const kpisForArea = (areaId: string) => kpis.filter((k) => k.area_id === areaId);

  const sourceOptions: { value: DataSourceType; label: string }[] = [
    { value: 'operator', label: 'Carga manual de operadores' },
    { value: 'external', label: 'Fuente externa (API / Firecrawl)' },
    { value: 'both', label: 'Ambas fuentes' },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center"><Settings className="w-6 h-6 text-white" /></div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Configuración de Fuentes de Datos</h2>
            <p className="text-sm text-gray-500">Elegí de dónde se alimentan los datos de cada indicador: operadores, sistemas externos, o ambos.</p>
          </div>
        </div>
      </div>

      {apiConns.length === 0 && firecrawlConns.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-700">
          No hay conexiones API ni Firecrawl configuradas. Creá conexiones primero en las secciones correspondientes para poder usar fuentes externas.
        </div>
      )}

      <div className="space-y-3">
        {areas.map((area) => {
          const areaKpis = kpisForArea(area.id);
          const isExpanded = expandedArea === area.id;
          return (
            <div key={area.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <button onClick={() => setExpandedArea(isExpanded ? null : area.id)} className="w-full flex items-center justify-between p-5 hover:bg-gray-50 transition-colors">
                <p className="text-sm font-bold text-gray-900">{area.name}</p>
                <span className="text-xs text-gray-400">{areaKpis.length} indicadores</span>
              </button>
              {isExpanded && (
                <div className="divide-y divide-gray-50 border-t border-gray-100">
                  {areaKpis.map((kpi) => {
                    const cfg = getConfig(kpi.id);
                    const sourceType = cfg?.source_type ?? 'operator';
                    const needsExternal = sourceType === 'external' || sourceType === 'both';
                    return (
                      <div key={kpi.id} className="p-5 space-y-3">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{kpi.name}</p>
                          <p className="text-xs text-gray-400 mt-0.5">Unidad: {kpi.unit}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500 mb-2">Fuente de datos</p>
                          <div className="flex flex-wrap gap-2">
                            {sourceOptions.map((opt) => (
                              <button key={opt.value} onClick={() => handleSourceChange(kpi.id, opt.value)} disabled={busy} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all ${sourceType === opt.value ? 'bg-blue-600 text-white shadow-sm' : 'bg-white border border-gray-200 text-gray-500 hover:border-blue-300'}`}>
                                {sourceType === opt.value ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        </div>
                        {needsExternal && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-1">
                            <div>
                              <label className="text-xs font-medium text-gray-500 mb-1.5 block">Conexión API</label>
                              <select value={cfg?.api_connection_id ?? ''} onChange={(e) => handleApiChange(kpi.id, e.target.value)} disabled={busy} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                                <option value="">Sin conexión API</option>
                                {apiConns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                              </select>
                            </div>
                            <div>
                              <label className="text-xs font-medium text-gray-500 mb-1.5 block">Conexión Firecrawl</label>
                              <select value={cfg?.firecrawl_connection_id ?? ''} onChange={(e) => handleFirecrawlChange(kpi.id, e.target.value)} disabled={busy} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                                <option value="">Sin conexión Firecrawl</option>
                                {firecrawlConns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                              </select>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
