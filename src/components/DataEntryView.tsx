import { useEffect, useState, useMemo, useCallback } from 'react';
import { Loader2, Save, Trash2, History, Eraser, Calculator, AlertCircle } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import {
  fetchAreas, fetchKpisByArea, fetchCustomFieldsByArea, fetchFormulas,
  createFieldValue, fetchLatestFieldValues,
  createDataEntry, fetchDataEntries, deleteDataEntry, updateKpiDataFromEntry,
  createNotification,
} from '@/lib/api';
import { getIcon } from '@/lib/icons';
import { formatValue } from '@/lib/kpi-helpers';
import { parseFormula } from '@/lib/formula-parser';
import type { Area, Kpi, CustomField, Formula, DataEntryWithProfile } from '@/types';

interface DataEntryViewProps {
  areaSlug: string;
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function DataEntryView({ areaSlug }: DataEntryViewProps) {
  const { profile } = useAuth();
  const [area, setArea] = useState<Area | null>(null);
  const [kpis, setKpis] = useState<Kpi[]>([]);
  const [selectedKpi, setSelectedKpi] = useState<Kpi | null>(null);
  const [fields, setFields] = useState<CustomField[]>([]);
  const [allFormulas, setAllFormulas] = useState<Formula[]>([]);
  const [entries, setEntries] = useState<DataEntryWithProfile[]>([]);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const entryDate = todayStr();

  const inputFields = useMemo(() => fields.filter((f) => f.field_role === 'input' && !f.hidden_in_entry), [fields]);
  const resultFields = useMemo(() => fields.filter((f) => f.field_role === 'result' && !f.hidden_in_entry), [fields]);
  const orderedFields = useMemo(() => fields.filter((f) => !f.hidden_in_entry).sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)), [fields]);

  const kpiFormulas = useMemo(() => {
    if (!selectedKpi) return [];
    return allFormulas.filter((f) => f.kpi_id === selectedKpi.id);
  }, [allFormulas, selectedKpi]);

  const computedResults = useMemo(() => {
    const results: Record<string, number | null> = {};
    // Build a map from field name → field ID for resolving formula placeholders
    // Prioritize input fields so "Contado" (input) wins over "Contado" (result)
    const nameToField = new Map<string, CustomField>();
    for (const f of fields) {
      const key = f.name.trim();
      if (f.field_role === 'input') {
        nameToField.set(key, f); // always overwrite with input
      } else if (!nameToField.has(key)) {
        nameToField.set(key, f); // only if no input with that name
      }
    }

    for (const formula of kpiFormulas) {
      try {
        const parsed = parseFormula(formula.expression);
        const numericValues: Record<string, number> = {};
        let filledCount = 0;
        let totalFields = 0;
        for (const pField of parsed.fields) {
          totalFields++;
          const varName = pField.variable.trim();
          const customField = nameToField.get(varName);
          if (!customField) continue;
          const raw = fieldValues[customField.id];
          if (raw === '' || raw == null) continue;
          const num = parseFloat(raw);
          if (isNaN(num)) continue;
          numericValues[pField.variable] = num;
          filledCount++;
        }
        // Show result if at least one field is filled (partial computation)
        if (filledCount > 0 && filledCount === totalFields) {
          const val = parsed.compute(numericValues);
          if (formula.result_field_id) {
            results[formula.result_field_id] = val;
          } else {
            results[`formula_${formula.id}`] = val;
          }
        } else if (filledCount > 0) {
          // Partial: show what we can compute (fields that are filled)
          // For formulas like a/b*100, if only a is filled, we can't compute yet
          // But we still mark it as "pending" by showing null
          if (formula.result_field_id) {
            results[formula.result_field_id] = null;
          }
        } else if (formula.result_field_id) {
          results[formula.result_field_id] = null;
        }
      } catch { /* ignore formula errors */ }
    }
    return results;
  }, [kpiFormulas, fieldValues, fields]);

  const allFilled = useMemo(() => {
    return inputFields.length > 0 && inputFields.every((f) => {
      const v = fieldValues[f.id];
      return v !== '' && v != null && !isNaN(parseFloat(v));
    });
  }, [inputFields, fieldValues]);

  const loadData = useCallback(async () => {
    try {
      const allAreas = await fetchAreas();
      const matched = allAreas.find((a) => a.slug === areaSlug);
      if (!matched) { setLoading(false); return; }
      setArea(matched);
      const kpiList = await fetchKpisByArea(matched.id);
      setKpis(kpiList);
      if (kpiList.length > 0) {
        setSelectedKpi(kpiList[0]);
        await loadKpiData(kpiList[0], matched.id);
      }
      const formList = await fetchFormulas();
      setAllFormulas(formList);
    } catch { /* ignore */ }
    setLoading(false);
  }, [areaSlug]);

  const loadKpiData = async (kpi: Kpi, areaId: string) => {
    try {
      const areaFields = await fetchCustomFieldsByArea(areaId);
      const kpiFields = areaFields.filter((f) => !f.kpi_id || f.kpi_id === kpi.id);
      setFields(kpiFields);
      const e = await fetchDataEntries(kpi.id);
      setEntries(e);
    } catch { /* ignore */ }
  };

  useEffect(() => { loadData(); }, [loadData]);

  const handleSelectKpi = async (kpi: Kpi) => {
    setSelectedKpi(kpi);
    setFieldValues({});
    setError(null);
    setSuccess(null);
    if (area) await loadKpiData(kpi, area.id);
  };

  const handleClear = () => {
    setFieldValues({});
    setError(null);
    setSuccess(null);
  };

  const handleSave = async () => {
    if (!selectedKpi || !profile || !area) return;
    setError(null);
    setSuccess(null);

    if (!allFilled) {
      setError('Completá todos los campos de entrada antes de guardar.');
      return;
    }

    setBusy(true);
    try {
      const inputsJson: Record<string, { label: string; value: number }> = {};
      const resultsJson: Record<string, { label: string; value: number }> = {};

      for (const cf of inputFields) {
        const raw = fieldValues[cf.id];
        if (raw !== undefined && raw !== '') {
          const num = parseFloat(raw) || 0;
          inputsJson[cf.id] = { label: cf.label, value: num };
          await createFieldValue({
            field_id: cf.id,
            value_text: raw,
            value_number: num,
            entry_date: entryDate,
          });
        }
      }

      for (const rf of resultFields) {
        const val = computedResults[rf.id];
        if (val != null && !isNaN(val)) {
          resultsJson[rf.id] = { label: rf.label, value: val };
          await createFieldValue({
            field_id: rf.id,
            value_text: String(val),
            value_number: val,
            entry_date: entryDate,
          });
        }
      }

      const firstResult = resultFields.length > 0 ? computedResults[resultFields[0].id] : null;
      if (firstResult != null && !isNaN(firstResult)) {
        await createDataEntry({
          kpi_id: selectedKpi.id,
          value: firstResult,
          entry_date: entryDate,
          results_json: resultsJson,
          inputs_json: inputsJson,
        });
        await updateKpiDataFromEntry(selectedKpi.id, firstResult);
      }

      try {
        await createNotification({
          target_role: 'gerente',
          area_id: area.id,
          kpi_id: selectedKpi.id,
          action: 'create',
          message: `cargó datos en "${selectedKpi.name}"`,
        });
        await createNotification({
          target_role: 'admin',
          area_id: area.id,
          kpi_id: selectedKpi.id,
          action: 'create',
          message: `cargó datos en "${selectedKpi.name}"`,
        });
      } catch { /* ignore */ }

      setSuccess('Datos guardados correctamente.');
      setFieldValues({});
      await loadKpiData(selectedKpi, area.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar los datos.');
    }
    setBusy(false);
  };

  const handleDeleteEntry = async (id: string) => {
    setBusy(true);
    try {
      await deleteDataEntry(id);
      if (selectedKpi) {
        const e = await fetchDataEntries(selectedKpi.id);
        setEntries(e);
      }
    } catch { /* ignore */ }
    setBusy(false);
  };

  const confirmDelete = async () => {
    if (!confirmDeleteId) return;
    await handleDeleteEntry(confirmDeleteId);
    setConfirmDeleteId(null);
  };

  if (loading) {
    return <div className="flex items-center justify-center py-32"><Loader2 className="w-8 h-8 text-blue-500 animate-spin" /></div>;
  }

  if (!area) {
    return <div className="text-center py-20 text-gray-400">No tenés acceso a esta área.</div>;
  }

  const Icon = getIcon(area.icon);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center flex-shrink-0">
            <Icon className="w-7 h-7 text-white" />
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">{area.name}</h2>
            <p className="text-sm text-gray-500 mt-1">Completá los campos. El resultado se calcula automáticamente.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* KPI list */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-900">Indicadores</h3>
              <p className="text-xs text-gray-500 mt-0.5">{kpis.length} indicadores</p>
            </div>
            <div className="max-h-[500px] overflow-y-auto">
              {kpis.map((kpi) => (
                <button
                  key={kpi.id}
                  onClick={() => handleSelectKpi(kpi)}
                  className={`w-full text-left px-5 py-3 border-b border-gray-50 transition-colors ${
                    selectedKpi?.id === kpi.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : 'hover:bg-gray-50'
                  }`}
                >
                  <p className="text-sm font-medium text-gray-900 leading-snug">{kpi.name}</p>
                  <p className="text-xs text-gray-400 mt-1">Unidad: {kpi.unit}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Entry form + history */}
        <div className="lg:col-span-2 space-y-6">
          {selectedKpi && (
            <>
              {/* Definition card */}
              <div className="bg-white rounded-2xl border border-gray-200 p-5">
                <h3 className="text-sm font-bold text-gray-900">{selectedKpi.name}</h3>
                {selectedKpi.definition && <p className="text-xs text-gray-500 mt-1 leading-relaxed">{selectedKpi.definition}</p>}
              </div>

              {/* Entry form */}
              <div className="bg-white rounded-2xl border border-gray-200 p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-gray-900">Cargar datos</h3>
                  <p className="text-xs text-gray-400">Fecha: {entryDate}</p>
                </div>

                {/* Unified fields list (ordered as in Formula Builder) */}
                {orderedFields.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5">
                    {orderedFields.map((field) => {
                      const isInput = field.field_role === 'input';
                      if (isInput) {
                        return (
                          <div key={field.id}>
                            <label className="text-xs font-medium text-gray-500 mb-1.5 block">{field.label}</label>
                            <input
                              type="number"
                              step="any"
                              value={fieldValues[field.id] ?? ''}
                              onChange={(e) => setFieldValues((prev) => ({ ...prev, [field.id]: e.target.value }))}
                              className="w-full px-4 py-2.5 rounded-xl border border-blue-200 bg-blue-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder="0"
                            />
                          </div>
                        );
                      }
                      const val = computedResults[field.id];
                      return (
                        <div key={field.id} className="bg-red-50 border-2 border-red-300 rounded-xl p-4">
                          <p className="text-xs font-medium text-red-900 mb-1">{field.label}</p>
                          <p className="text-2xl font-bold text-red-700">
                            {val != null && !isNaN(val) ? formatValue(val, field.unit ?? '%') : '—'}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Formulas display (green) */}
                {kpiFormulas.length > 0 && (
                  <div className="space-y-2 mb-5">
                    <p className="text-[10px] uppercase tracking-wider text-emerald-500 font-semibold">Fórmulas aplicadas</p>
                    {kpiFormulas.map((formula) => {
                      const resultField = formula.result_field_id ? resultFields.find((f) => f.id === formula.result_field_id) : null;
                      return (
                        <div key={formula.id} className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex items-center gap-2">
                          <Calculator className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-emerald-900">{formula.name}</p>
                            <p className="text-xs text-emerald-700 font-mono mt-0.5">{formula.expression}</p>
                            {resultField && <p className="text-[10px] text-emerald-500 mt-0.5">Guarda en: {resultField.label}</p>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {inputFields.length === 0 && resultFields.length === 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                      <p className="text-xs text-amber-700">El administrador aún no creó campos para este indicador. Pedile que configure los campos y fórmulas en el Constructor de Fórmulas.</p>
                    </div>
                  </div>
                )}

                {error && <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-600 mb-4">{error}</div>}
                {success && <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-sm text-emerald-700 mb-4">{success}</div>}

                {/* Action buttons */}
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={handleSave}
                    disabled={busy || !allFilled}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium px-5 py-2.5 rounded-xl text-sm transition-colors disabled:opacity-50"
                  >
                    {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Guardar
                  </button>
                  <button
                    onClick={handleClear}
                    disabled={busy}
                    className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-gray-700 font-medium px-5 py-2.5 rounded-xl text-sm transition-colors disabled:opacity-50"
                  >
                    <Eraser className="w-4 h-4" />
                    Limpiar campos
                  </button>
                </div>
              </div>

              {/* History */}
              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
                  <History className="w-4 h-4 text-gray-400" />
                  <h3 className="text-sm font-bold text-gray-900">Historial</h3>
                  <span className="text-xs text-gray-400 ml-auto">{entries.length} registros</span>
                </div>
                {entries.length === 0 ? (
                  <div className="p-8 text-center">
                    <p className="text-sm text-gray-400">Aún no hay datos cargados.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-50 max-h-96 overflow-y-auto">
                    {entries.map((entry) => (
                      <div key={entry.id} className="p-4 hover:bg-gray-50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-gray-900">{formatValue(entry.value, selectedKpi.unit ?? '%')}</span>
                            <span className="text-xs text-gray-400">·</span>
                            <span className="text-xs text-gray-500">{entry.entry_date}</span>
                          </div>
                          {(entry.user_id === profile?.id || profile?.role === 'admin') && (
                            <button onClick={() => setConfirmDeleteId(entry.id)} disabled={busy} className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">{entry.profiles?.full_name || entry.profiles?.email || 'Usuario'}</p>
                        {entry.results_json && Object.keys(entry.results_json).length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {Object.entries(entry.results_json).map(([fid, data]) => (
                              <span key={fid} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-50 border border-red-200 text-[11px] text-red-700 font-medium">
                                {data.label}: {formatValue(data.value, (resultFields.find((f) => f.id === fid) ?? fields.find((f) => f.id === fid))?.unit ?? '%')}
                              </span>
                            ))}
                          </div>
                        )}
                        {entry.inputs_json && Object.keys(entry.inputs_json).length > 0 && (
                          <div className="mt-1.5 flex flex-wrap gap-1.5">
                            {Object.entries(entry.inputs_json).map(([fid, data]) => (
                              <span key={fid} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 border border-blue-200 text-[11px] text-blue-700 font-medium">
                                {data.label}: {data.value}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirmDeleteId !== null}
        message="¿Seguro que querés eliminar este registro del historial? Esta acción no se puede deshacer."
        onConfirm={confirmDelete}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  );
}
