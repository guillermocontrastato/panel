import { useEffect, useState } from 'react';
import { Loader2, Trash2, Download, Phone, Mail, Car, Search, AlertCircle, CheckCircle2, Globe, FileText, ChevronRight } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import {
  fetchApiConnections, fetchFirecrawlConnections, fetchGribaLeads,
  fetchGribaDataFromApi, fetchGribaDataViaFirecrawl,
  crawlGribaSite, scrapeGribaPage,
  upsertGribaLeads, deleteGribaLead,
  type GribaSection,
} from '@/lib/api';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import type { ApiConnection, FirecrawlConnection, GribaLead } from '@/types';

const STATUS_COLORS: Record<string, string> = {
  nuevo: 'bg-blue-50 text-blue-700',
  contactado: 'bg-amber-50 text-amber-700',
  calificado: 'bg-purple-50 text-purple-700',
  descartado: 'bg-gray-100 text-gray-500',
  vendido: 'bg-emerald-50 text-emerald-700',
};

export function GribaInfo() {
  const { session } = useAuth();
  const [apiConns, setApiConns] = useState<ApiConnection[]>([]);
  const [firecrawlConns, setFirecrawlConns] = useState<FirecrawlConnection[]>([]);
  const [selectedConn, setSelectedConn] = useState<string>('');
  const [selectedFirecrawl, setSelectedFirecrawl] = useState<string>('');
  const [useFirecrawl, setUseFirecrawl] = useState(false);
  const [endpoint, setEndpoint] = useState('/Oportunidad_ListView');
  const [leads, setLeads] = useState<GribaLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [crawling, setCrawling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sections, setSections] = useState<GribaSection[]>([]);
  const [importingSection, setImportingSection] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const [conns, fcConns, existingLeads] = await Promise.all([fetchApiConnections(), fetchFirecrawlConnections(), fetchGribaLeads()]);
      setApiConns(conns);
      setFirecrawlConns(fcConns);
      setLeads(existingLeads);
      const gribaConn = conns.find((c) => c.name.toLowerCase().includes('griba'));
      if (gribaConn) setSelectedConn(gribaConn.id);
      else if (conns.length > 0) setSelectedConn(conns[0].id);
      if (fcConns.length > 0) setSelectedFirecrawl(fcConns[0].id);
    } catch { /* ignore */ }
    setLoading(false);
  };

  const getAuthParams = () => {
    const conn = apiConns.find((c) => c.id === selectedConn);
    return {
      auth_type: conn?.auth_type,
      auth_config: conn?.auth_config,
    };
  };

  const getFirecrawlKey = () => {
    const fc = firecrawlConns.find((c) => c.id === selectedFirecrawl);
    return fc?.credentials?.api_key || '';
  };

  const getBaseUrl = () => {
    const conn = apiConns.find((c) => c.id === selectedConn);
    return conn ? conn.base_url.replace(/\/+$/, '') : '';
  };

  const handleFetch = async () => {
    if (!session) return;
    if (useFirecrawl && !selectedFirecrawl) return;
    if (!useFirecrawl && !selectedConn) return;
    setFetching(true);
    setError(null);
    setSuccess(null);
    setSections([]);
    try {
      let result: { success: boolean; leads: unknown[]; message?: string };

      if (useFirecrawl) {
        const base = getBaseUrl();
        const targetUrl = base ? `${base}/${endpoint.replace(/^\/+/, '')}` : '';
        result = await fetchGribaDataViaFirecrawl({
          target_url: targetUrl,
          api_key: getFirecrawlKey(),
          ...getAuthParams(),
        }, session.access_token);
      } else {
        const conn = apiConns.find((c) => c.id === selectedConn);
        if (!conn) throw new Error('Conexión no encontrada');
        result = await fetchGribaDataFromApi({
          base_url: conn.base_url,
          auth_type: conn.auth_type,
          auth_config: conn.auth_config ?? {},
          endpoint,
        }, session.access_token);
      }

      if (!result.success) {
        setError(result.message ?? 'Error al conectar con Griba');
      } else if (result.leads.length === 0) {
        setError('La conexión fue exitosa pero no se encontraron prospectos.');
      } else {
        await upsertGribaLeads(result.leads as Array<Record<string, unknown>>);
        const updated = await fetchGribaLeads();
        setLeads(updated);
        setSuccess(`Se importaron ${result.leads.length} prospectos desde Griba.`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al obtener datos de Griba');
    }
    setFetching(false);
  };

  const handleCrawl = async () => {
    if (!session || !selectedFirecrawl) return;
    setCrawling(true);
    setError(null);
    setSuccess(null);
    setSections([]);
    try {
      const base = getBaseUrl();
      const targetUrl = base || firecrawlConns.find((c) => c.id === selectedFirecrawl)?.target_url || '';
      const result = await crawlGribaSite({
        target_url: targetUrl,
        api_key: getFirecrawlKey(),
        ...getAuthParams(),
      }, session.access_token);

      if (!result.success) {
        setError(result.message ?? 'Error al recorrer el sitio de Griba');
      } else if (!result.sections || result.sections.length === 0) {
        setError('Firecrawl recorrió el sitio pero no encontró páginas con datos.');
      } else {
        setSections(result.sections);
        setSuccess(`Se encontraron ${result.sections.length} páginas con datos. Elegí cuáles importar.`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al recorrer el sitio de Griba');
    }
    setCrawling(false);
  };

  const handleImportSection = async (section: GribaSection) => {
    if (!session || !selectedFirecrawl) return;
    setImportingSection(section.id);
    try {
      const result = await scrapeGribaPage({
        target_url: section.url,
        api_key: getFirecrawlKey(),
        ...getAuthParams(),
      }, session.access_token);

      if (!result.success) {
        setError(result.message ?? `Error al importar ${section.title}`);
      } else if (result.leads.length === 0) {
        setError(`No se encontraron datos importables en ${section.title}.`);
      } else {
        await upsertGribaLeads(result.leads as Array<Record<string, unknown>>);
        const updated = await fetchGribaLeads();
        setLeads(updated);
        setSuccess(`Se importaron ${result.leads.length} registros desde "${section.title}".`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al importar la sección');
    }
    setImportingSection(null);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteGribaLead(id);
      setLeads((prev) => prev.filter((l) => l.id !== id));
    } catch { /* ignore */ }
  };

  const confirmDelete = async () => {
    if (!confirmDeleteId) return;
    await handleDelete(confirmDeleteId);
    setConfirmDeleteId(null);
  };

  const filtered = leads.filter((lead) => {
    const matchSearch = !search ||
      lead.name?.toLowerCase().includes(search.toLowerCase()) ||
      lead.email?.toLowerCase().includes(search.toLowerCase()) ||
      lead.phone?.toLowerCase().includes(search.toLowerCase()) ||
      lead.vehicle_interest?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || lead.status === statusFilter;
    return matchSearch && matchStatus;
  });

  if (loading) {
    return <div className="flex items-center justify-center py-32"><Loader2 className="w-8 h-8 text-blue-500 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-cyan-600 flex items-center justify-center">
            <Car className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Info de Griba</h2>
            <p className="text-sm text-gray-500">Prospectos y leads del CRM de Griba sincronizados automáticamente.</p>
          </div>
        </div>

        {/* Fetch controls */}
        <div className="flex flex-col gap-3">
          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-end">
            <div className="flex-1">
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">Conexión API de Griba</label>
              <select value={selectedConn} onChange={(e) => setSelectedConn(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                <option value="">Seleccionar conexión...</option>
                {apiConns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="flex-1">
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">Endpoint de prospectos</label>
              <input type="text" value={endpoint} onChange={(e) => setEndpoint(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="/Oportunidad_ListView" />
            </div>
            <button onClick={handleFetch} disabled={fetching || (!useFirecrawl && !selectedConn) || (useFirecrawl && !selectedFirecrawl)} className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium px-5 py-2.5 rounded-xl text-sm transition-colors disabled:opacity-50 whitespace-nowrap">
              {fetching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              Importar prospectos
            </button>
          </div>

          {/* Firecrawl option */}
          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center pt-2 border-t border-gray-100">
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
              <input type="checkbox" checked={useFirecrawl} onChange={(e) => setUseFirecrawl(e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
              Usar Firecrawl para recorrer la página
            </label>
            {useFirecrawl && (
              <div className="flex-1 flex items-center gap-2">
                <select value={selectedFirecrawl} onChange={(e) => setSelectedFirecrawl(e.target.value)} className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  <option value="">Seleccionar conexión Firecrawl...</option>
                  {firecrawlConns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <button onClick={handleCrawl} disabled={crawling || !selectedFirecrawl} className="flex items-center justify-center gap-2 bg-cyan-600 hover:bg-cyan-700 text-white font-medium px-4 py-2.5 rounded-xl text-sm transition-colors disabled:opacity-50 whitespace-nowrap">
                  {crawling ? <Loader2 className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />}
                  Recorrer todo el sitio
                </button>
              </div>
            )}
          </div>
        </div>

        {apiConns.length === 0 && (
          <div className="mt-4 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-700">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>No hay conexiones API configuradas. Creá una conexión a Griba en la sección "Conexiones API" primero.</span>
          </div>
        )}
        {error && (
          <div className="mt-4 flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-600">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="mt-4 flex items-start gap-2 bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-sm text-emerald-700">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{success}</span>
          </div>
        )}
      </div>

      {/* Discovered sections */}
      {sections.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-cyan-500" />
              <h3 className="text-sm font-bold text-gray-900">Páginas encontradas en Griba</h3>
            </div>
            <span className="text-xs text-gray-400">{sections.length} páginas</span>
          </div>
          <div className="divide-y divide-gray-50">
            {sections.map((section) => (
              <div key={section.id} className="px-5 py-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <FileText className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{section.title}</p>
                      <p className="text-xs text-gray-400 truncate mt-0.5">{section.url}</p>
                      <p className="text-xs text-gray-500 mt-1.5 line-clamp-2">{section.preview}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleImportSection(section)}
                    disabled={importingSection === section.id}
                    className="flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium px-3 py-2 rounded-lg text-xs transition-colors disabled:opacity-50 whitespace-nowrap flex-shrink-0"
                  >
                    {importingSection === section.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                    Importar
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search + filter */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nombre, email, teléfono o vehículo..." className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
            <option value="all">Todos los estados</option>
            <option value="nuevo">Nuevo</option>
            <option value="contactado">Contactado</option>
            <option value="calificado">Calificado</option>
            <option value="descartado">Descartado</option>
            <option value="vendido">Vendido</option>
          </select>
        </div>
      </div>

      {/* Leads table */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-900">Prospectos importados</h3>
          <span className="text-xs text-gray-400">{filtered.length} de {leads.length}</span>
        </div>
        {filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Car className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-400">{leads.length === 0 ? 'No hay prospectos importados. Hacé clic en "Importar prospectos" o "Recorrer todo el sitio" para traer datos desde Griba.' : 'No se encontraron resultados para tu búsqueda.'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Nombre</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider hidden md:table-cell">Contacto</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider hidden lg:table-cell">Vehículo</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Estado</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider hidden lg:table-cell">Origen</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider hidden md:table-cell">Fecha</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((lead) => (
                  <tr key={lead.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-4">
                      <p className="text-sm font-medium text-gray-900">{lead.name || 'Sin nombre'}</p>
                      {lead.external_id && <p className="text-xs text-gray-400 mt-0.5">ID: {lead.external_id}</p>}
                    </td>
                    <td className="px-5 py-4 hidden md:table-cell">
                      <div className="space-y-1">
                        {lead.email && <div className="flex items-center gap-1.5 text-xs text-gray-500"><Mail className="w-3 h-3" />{lead.email}</div>}
                        {lead.phone && <div className="flex items-center gap-1.5 text-xs text-gray-500"><Phone className="w-3 h-3" />{lead.phone}</div>}
                      </div>
                    </td>
                    <td className="px-5 py-4 hidden lg:table-cell">
                      <span className="text-sm text-gray-600">{lead.vehicle_interest || '—'}</span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-lg capitalize ${STATUS_COLORS[lead.status] ?? 'bg-gray-100 text-gray-500'}`}>{lead.status}</span>
                    </td>
                    <td className="px-5 py-4 hidden lg:table-cell">
                      <span className="text-xs text-gray-500">{lead.source || 'Griba'}</span>
                    </td>
                    <td className="px-5 py-4 hidden md:table-cell">
                      <span className="text-xs text-gray-400">{new Date(lead.fetched_at).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button onClick={() => setConfirmDeleteId(lead.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmDeleteId !== null}
        message="¿Seguro que querés eliminar este prospecto? Esta acción no se puede deshacer."
        onConfirm={confirmDelete}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  );
}
