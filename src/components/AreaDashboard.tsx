import { useState, useEffect } from 'react';
import { getIcon } from '@/lib/icons';
import { getAreaColor } from '@/lib/area-colors';
import { KpiCard } from '@/components/KpiCard';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import {
  createKpi, updateKpi, deleteKpi, fetchKpisByArea,
} from '@/lib/api';
import type { AreaWithKpis, Kpi, KpiWithDetails } from '@/types';
import {
  ArrowLeft, Plus, Pencil, Trash2, X, Save, Loader2,
} from 'lucide-react';

interface AreaDashboardProps {
  area: AreaWithKpis;
  onBack: () => void;
  isAdmin: boolean;
  onKpisChanged: () => void;
}

export function AreaDashboard({ area, onBack, isAdmin, onKpisChanged }: AreaDashboardProps) {
  const Icon = getIcon(area.icon);
  const color = getAreaColor(area.slug);
  const accent = area.color || '#2563eb';

  const [kpis, setKpis] = useState<KpiWithDetails[]>(area.kpis);
  const [showForm, setShowForm] = useState(false);
  const [editingKpi, setEditingKpi] = useState<Kpi | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Form state
  const [kName, setKName] = useState('');
  const [kDefinition, setKDefinition] = useState('');
  const [kFormula, setKFormula] = useState('');
  const [kDecision, setKDecision] = useState('');

  useEffect(() => { setKpis(area.kpis); }, [area.kpis]);

  const resetForm = () => {
    setEditingKpi(null);
    setKName(''); setKDefinition(''); setKFormula(''); setKDecision('');
  };

  const handleEdit = (kpi: Kpi) => {
    setEditingKpi(kpi);
    setKName(kpi.name);
    setKDefinition(kpi.definition ?? '');
    setKFormula(kpi.formula ?? '');
    setKDecision(kpi.decision ?? '');
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kName.trim()) return;
    setBusy(true);
    try {
      if (editingKpi) {
        await updateKpi(editingKpi.id, {
          name: kName,
          definition: kDefinition,
          formula: kFormula,
          decision: kDecision,
        });
      } else {
        await createKpi({
          area_id: area.id,
          name: kName,
          definition: kDefinition,
          formula: kFormula,
          decision: kDecision,
        });
      }
      resetForm();
      setShowForm(false);
      const refreshed = await fetchKpisByArea(area.id);
      const refreshedWithDetails: KpiWithDetails[] = refreshed.map((k) => ({
        ...k,
        data: kpis.find((kd) => kd.id === k.id)?.data,
        breakdowns: kpis.find((kd) => kd.id === k.id)?.breakdowns ?? [],
      }));
      setKpis(refreshedWithDetails);
      onKpisChanged();
    } catch (err) {
      console.error('Error al guardar KPI:', err);
      alert('Error al guardar el indicador: ' + (err instanceof Error ? err.message : String(err)));
    }
    setBusy(false);
  };

  const handleDelete = async (id: string) => {
    setBusy(true);
    try {
      await deleteKpi(id);
      setKpis((prev) => prev.filter((k) => k.id !== id));
      onKpisChanged();
    } catch (err) {
      console.error('Error al eliminar KPI:', err);
      alert('Error al eliminar el indicador: ' + (err instanceof Error ? err.message : String(err)));
    }
    setBusy(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="h-1.5" style={{ backgroundColor: accent }} />
        <div className="p-6">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver al resumen
          </button>
          <div className="flex items-start gap-4">
            <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${color.gradient} flex items-center justify-center flex-shrink-0`}>
              <Icon className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900 tracking-tight">{area.name}</h2>
              <p className="text-sm text-gray-500 mt-1">{area.description}</p>
            </div>
            {isAdmin && (
              <button
                onClick={() => { setShowForm(!showForm); if (!showForm) resetForm(); }}
                className="flex items-center gap-2 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors"
                style={{ backgroundColor: accent }}
              >
                <Plus className="w-4 h-4" /> Nuevo indicador
              </button>
            )}
          </div>
        </div>
      </div>

      {/* KPI Form */}
      {showForm && isAdmin && (
        <div className="bg-white rounded-2xl border p-6" style={{ borderColor: `${accent}40` }}>
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-base font-bold text-gray-900">
              {editingKpi ? 'Editar indicador' : 'Crear indicador'} en {area.name}
            </h3>
            <button onClick={() => { setShowForm(false); resetForm(); }} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">
              <X className="w-5 h-5" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Nombre del indicador</label>
                <input type="text" value={kName} onChange={(e) => setKName(e.target.value)} required
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:border-transparent"
                  style={{ '--tw-ring-color': accent } as React.CSSProperties}
                  placeholder="Cumplimiento del objetivo comercial" />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">Definición</label>
              <textarea value={kDefinition} onChange={(e) => setKDefinition(e.target.value)} rows={2}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:border-transparent resize-none"
                placeholder="Describe qué mide este indicador" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">Fórmula (descripción)</label>
              <input type="text" value={kFormula} onChange={(e) => setKFormula(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:border-transparent"
                placeholder="Unidades reconocidas / Objetivo mensual × 100" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">Decisión que habilita</label>
              <input type="text" value={kDecision} onChange={(e) => setKDecision(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:border-transparent"
                placeholder="Qué acción se toma con este indicador" />
            </div>
            <button type="submit" disabled={busy}
              className="flex items-center gap-2 text-white font-medium px-6 py-2.5 rounded-xl text-sm transition-colors disabled:opacity-50"
              style={{ backgroundColor: accent }}>
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {editingKpi ? 'Guardar cambios' : 'Crear indicador'}
            </button>
          </form>
        </div>
      )}

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {kpis.map((kpi) => (
          <div key={kpi.id} className="relative group">
            <KpiCard kpi={kpi} />
            {isAdmin && (
              <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                <button onClick={() => handleEdit(kpi)} disabled={busy}
                  className="p-1.5 rounded-lg bg-white border border-gray-200 text-gray-400 hover:text-gray-700 hover:border-gray-300 shadow-sm transition-colors">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => setConfirmDeleteId(kpi.id)} disabled={busy}
                  className="p-1.5 rounded-lg bg-white border border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-300 shadow-sm transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        ))}
        {kpis.length === 0 && (
          <div className="col-span-full bg-white rounded-2xl border border-gray-200 p-8 text-center">
            <p className="text-sm text-gray-400">
              {isAdmin ? 'No hay indicadores creados. Hacé clic en "Nuevo indicador" para crear el primero.' : 'No hay indicadores disponibles para esta área.'}
            </p>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmDeleteId !== null}
        message="¿Seguro que querés eliminar este indicador? Se borrarán también sus campos, fórmulas y datos. Esta acción no se puede deshacer."
        onConfirm={() => { if (confirmDeleteId) handleDelete(confirmDeleteId); setConfirmDeleteId(null); }}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  );
}
