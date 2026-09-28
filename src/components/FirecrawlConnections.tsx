import { useEffect, useState } from 'react';
import { Plus, Trash2, Loader2, X, Globe, Save, Power, Wifi } from 'lucide-react';
import { fetchFirecrawlConnections, createFirecrawlConnection, updateFirecrawlConnection, deleteFirecrawlConnection, testFirecrawlConnection } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import type { FirecrawlConnection } from '@/types';

export function FirecrawlConnections() {
  const [connections, setConnections] = useState<FirecrawlConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<FirecrawlConnection | null>(null);

  const [name, setName] = useState('');
  const [targetUrl, setTargetUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ id: string; success: boolean; message: string } | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const { session } = useAuth();

  useEffect(() => { load(); }, []);

  const load = async () => {
    try { const c = await fetchFirecrawlConnections(); setConnections(c); } catch { /* ignore */ }
    setLoading(false);
  };

  const resetForm = () => {
    setName(''); setTargetUrl(''); setApiKey(''); setUsername(''); setPassword(''); setEditing(null); setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const credentials: Record<string, string> = {};
    if (apiKey) credentials.api_key = apiKey;
    if (username) credentials.username = username;
    if (password) credentials.password = password;
    try {
      if (editing) {
        await updateFirecrawlConnection(editing.id, { name, target_url: targetUrl, credentials });
      } else {
        await createFirecrawlConnection({ name, target_url: targetUrl, credentials });
      }
      resetForm();
      await load();
    } catch { /* ignore */ }
    setBusy(false);
  };

  const handleToggleActive = async (conn: FirecrawlConnection) => {
    setBusy(true);
    try { await updateFirecrawlConnection(conn.id, { is_active: !conn.is_active }); await load(); } catch { /* ignore */ }
    setBusy(false);
  };

  const handleDelete = async (id: string) => {
    setBusy(true);
    try { await deleteFirecrawlConnection(id); setConnections((prev) => prev.filter((c) => c.id !== id)); } catch { /* ignore */ }
    setBusy(false);
  };

  const confirmDelete = async () => {
    if (!confirmDeleteId) return;
    await handleDelete(confirmDeleteId);
    setConfirmDeleteId(null);
  };

  const handleEdit = (conn: FirecrawlConnection) => {
    setEditing(conn);
    setName(conn.name); setTargetUrl(conn.target_url);
    setApiKey(conn.credentials?.api_key ?? '');
    setUsername(conn.credentials?.username ?? '');
    setPassword(conn.credentials?.password ?? '');
    setShowForm(true);
  };

  const handleTest = async (conn: FirecrawlConnection) => {
    setTestingId(conn.id);
    setTestResult(null);
    try {
      if (!session) throw new Error('No hay sesión');
      const result = await testFirecrawlConnection({ target_url: conn.target_url, credentials: conn.credentials ?? {} }, session.access_token);
      setTestResult({ id: conn.id, success: result.success, message: result.message });
    } catch (err) {
      setTestResult({ id: conn.id, success: false, message: err instanceof Error ? err.message : 'Error' });
    }
    setTestingId(null);
  };

  if (loading) {
    return <div className="flex items-center justify-center py-32"><Loader2 className="w-8 h-8 text-blue-500 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center"><Globe className="w-6 h-6 text-white" /></div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Conexiones Firecrawl</h2>
              <p className="text-sm text-gray-500">Extraé datos de sitios web externos usando Firecrawl con tus credenciales.</p>
            </div>
          </div>
          <button onClick={() => { resetForm(); setShowForm(true); }} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors"><Plus className="w-4 h-4" /> Nueva conexión</button>
        </div>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl border border-blue-200 p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-base font-bold text-gray-900">{editing ? 'Editar conexión' : 'Nueva conexión Firecrawl'}</h3>
            <button onClick={resetForm} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"><X className="w-5 h-5" /></button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Nombre</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} required className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Mercado Libre" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1.5 block">URL del sitio</label>
                <input type="url" value={targetUrl} onChange={(e) => setTargetUrl(e.target.value)} required className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="https://www.mercadolibre.com.ar" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1.5 block">API Key de Firecrawl</label>
                <input type="text" value={apiKey} onChange={(e) => setApiKey(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="fc-..." />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Usuario (opcional)</label>
                <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="usuario@ruizautomotores.com" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Contraseña (opcional)</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="••••" />
              </div>
            </div>
            <p className="text-xs text-gray-400">La API Key de Firecrawl se usa para autenticar las solicitudes de extracción. El usuario y contraseña opcionales se usan si el sitio requiere login.</p>
            <button type="submit" disabled={busy} className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-2.5 rounded-xl text-sm transition-colors disabled:opacity-50 flex items-center gap-2">{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} {editing ? 'Guardar cambios' : 'Crear conexión'}</button>
          </form>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100"><h3 className="text-sm font-bold text-gray-900">Conexiones configuradas</h3></div>
        {connections.length === 0 ? (
          <div className="p-8 text-center"><p className="text-sm text-gray-400">No hay conexiones Firecrawl configuradas.</p></div>
        ) : (
          <div className="divide-y divide-gray-100">
            {connections.map((conn) => (
              <div key={conn.id}>
                <div className="flex items-center justify-between p-5 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${conn.is_active ? 'bg-teal-50' : 'bg-slate-100'}`}><Globe className={`w-5 h-5 ${conn.is_active ? 'text-teal-600' : 'text-gray-400'}`} /></div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{conn.name}</p>
                      <p className="text-xs text-gray-400 truncate">{conn.target_url}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-xs font-medium px-2 py-1 rounded-lg ${conn.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>{conn.is_active ? 'Activa' : 'Inactiva'}</span>
                    <button onClick={() => handleTest(conn)} disabled={testingId === conn.id} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-blue-600 hover:bg-blue-50 transition-colors disabled:opacity-50">
                      {testingId === conn.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wifi className="w-3.5 h-3.5" />}
                      Probar
                    </button>
                    <button onClick={() => handleToggleActive(conn)} disabled={busy} className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors" title={conn.is_active ? 'Desactivar' : 'Activar'}><Power className="w-4 h-4" /></button>
                    <button onClick={() => handleEdit(conn)} disabled={busy} className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors text-xs font-medium">Editar</button>
                    <button onClick={() => setConfirmDeleteId(conn.id)} disabled={busy} className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
                {testResult?.id === conn.id && (
                  <div className={`px-5 pb-4 ${testResult.success ? 'text-emerald-600' : 'text-red-600'}`}>
                    <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium ${testResult.success ? 'bg-emerald-50' : 'bg-red-50'}`}>
                      {testResult.success ? <Globe className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                      {testResult.message}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmDeleteId !== null}
        message="¿Seguro que querés eliminar esta conexión Firecrawl? Esta acción no se puede deshacer."
        onConfirm={confirmDelete}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  );
}
