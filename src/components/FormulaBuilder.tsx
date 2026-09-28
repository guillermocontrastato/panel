import { useEffect, useRef, useState } from 'react';
import {
  Plus, Trash2, Loader2, X, Calculator, Save, Pencil,
  ChevronDown, FileSpreadsheet, GripVertical,
  Type, Hash, Calendar, Clock, CheckSquare, List, FileText,
} from 'lucide-react';
import {
  fetchAreas, fetchAllKpis, fetchCustomFields, fetchFormulas,
  createFormula, updateFormula, deleteFormula,
  createCustomField, updateCustomField, deleteCustomField,
  reorderCustomFields,
  reorderFormulas,
} from '@/lib/api';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import type { Area, Kpi, CustomField, Formula, FieldType } from '@/types';

const FIELD_TYPES: { value: FieldType; label: string; icon: typeof Type }[] = [
  { value: 'text', label: 'Texto', icon: Type },
  { value: 'numeric', label: 'Numérico', icon: Hash },
  { value: 'date', label: 'Fecha', icon: Calendar },
  { value: 'datetime', label: 'Fecha y hora', icon: Clock },
  { value: 'boolean', label: 'Verdadero/Falso', icon: CheckSquare },
  { value: 'select', label: 'Lista desplegable', icon: List },
  { value: 'textarea', label: 'Texto largo', icon: FileText },
];

const FIELD_COLORS: { value: string; label: string; swatch: string }[] = [
  { value: 'emerald', label: 'Verde', swatch: 'bg-emerald-500' },
  { value: 'blue', label: 'Azul', swatch: 'bg-blue-500' },
  { value: 'red', label: 'Rojo', swatch: 'bg-red-500' },
  { value: 'amber', label: 'Ámbar', swatch: 'bg-amber-500' },
  { value: 'violet', label: 'Violeta', swatch: 'bg-violet-500' },
  { value: 'cyan', label: 'Cian', swatch: 'bg-cyan-500' },
  { value: 'rose', label: 'Rosa', swatch: 'bg-rose-500' },
  { value: 'slate', label: 'Gris', swatch: 'bg-slate-500' },
];

export function FormulaBuilder() {
  const [areas, setAreas] = useState<Area[]>([]);
  const [kpis, setKpis] = useState<Kpi[]>([]);
  const [fields, setFields] = useState<CustomField[]>([]);
  const [formulas, setFormulas] = useState<Formula[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [activeAreaId, setActiveAreaId] = useState('');
  const [showFormulaForm, setShowFormulaForm] = useState(false);
  const [showFieldForm, setShowFieldForm] = useState(false);
  const [editingField, setEditingField] = useState<CustomField | null>(null);
  const [editingFormula, setEditingFormula] = useState<Formula | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ kind: 'field' | 'formula'; id: string } | null>(null);

  // Drag state
  const [dragFieldId, setDragFieldId] = useState<string | null>(null);
  const [dragOverFieldId, setDragOverFieldId] = useState<string | null>(null);
  const [dragFormulaId, setDragFormulaId] = useState<string | null>(null);
  const [dragOverFormulaId, setDragOverFormulaId] = useState<string | null>(null);

  // Formula form state
  const [fId, setFId] = useState('');
  const [fKpiId, setFKpiId] = useState('');
  const [fName, setFName] = useState('');
  const [fExpression, setFExpression] = useState('');
  const [fResultFieldId, setFResultFieldId] = useState('');

  // Field form state
  const [cfId, setCfId] = useState('');
  const [cfName, setCfName] = useState('');
  const [cfLabel, setCfLabel] = useState('');
  const [cfRole, setCfRole] = useState<'input' | 'result'>('input');
  const [cfKpiId, setCfKpiId] = useState('');
  const [cfType, setCfType] = useState<FieldType>('numeric');
  const [cfColor, setCfColor] = useState('emerald');
  const [cfUnit, setCfUnit] = useState('%');
  const [cfHiddenEntry, setCfHiddenEntry] = useState(false);
  const [cfShowDashboard, setCfShowDashboard] = useState(false);
  const topRef = useRef<HTMLDivElement>(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [a, k, f, form] = await Promise.all([fetchAreas(), fetchAllKpis(), fetchCustomFields(), fetchFormulas()]);
      setAreas(a); setKpis(k); setFields(f); setFormulas(form);
      if (a.length > 0 && !activeAreaId) setActiveAreaId(a[0].id);
    } catch { /* ignore */ }
    setLoading(false);
  };

  const kpisForArea = (areaId: string) => kpis.filter((k) => k.area_id === areaId);
  const fieldsForArea = (areaId: string) => fields.filter((f) => f.area_id === areaId);
  const inputFieldsForArea = (areaId: string) => fieldsForArea(areaId).filter((f) => f.field_role === 'input');
  const resultFieldsForArea = (areaId: string) => fieldsForArea(areaId).filter((f) => f.field_role === 'result');
  const formulasForKpi = (kpiId: string) => formulas.filter((f) => f.kpi_id === kpiId);

  const resetFormulaForm = () => {
    setFId(''); setFKpiId(''); setFName(''); setFExpression(''); setFResultFieldId('');
    setEditingFormula(null);
  };

  const resetFieldForm = () => {
    setCfId(''); setCfName(''); setCfLabel(''); setCfKpiId(''); setCfRole('input'); setCfType('numeric'); setCfColor('emerald'); setCfUnit('%'); setCfHiddenEntry(false); setCfShowDashboard(false);
    setEditingField(null);
  };

  const handleCreateOrUpdateFormula = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fKpiId || !fName || !fExpression) return;
    setBusy(true);
    try {
      if (fId) {
        await updateFormula(fId, {
          kpi_id: fKpiId,
          name: fName,
          expression: fExpression,
          result_field_id: fResultFieldId || null,
        });
      } else {
        await createFormula({
          kpi_id: fKpiId,
          name: fName,
          expression: fExpression,
          field_mapping: {},
          result_field_id: fResultFieldId || null,
        });
      }
      resetFormulaForm();
      await loadData();
      setShowFormulaForm(false);
    } catch { /* ignore */ }
    setBusy(false);
  };

  const handleEditFormula = (formula: Formula) => {
    setEditingFormula(formula);
    setFId(formula.id);
    setFKpiId(formula.kpi_id);
    setFName(formula.name);
    setFExpression(formula.expression);
    setFResultFieldId(formula.result_field_id ?? '');
    setShowFormulaForm(true);
    setShowFieldForm(false);
    setTimeout(() => topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  };

  const handleDeleteFormula = async (id: string) => {
    setBusy(true);
    try { await deleteFormula(id); setFormulas((prev) => prev.filter((f) => f.id !== id)); } catch { /* ignore */ }
    setBusy(false);
  };

  const handleDeleteField = async (id: string) => {
    setBusy(true);
    try { await deleteCustomField(id); setFields((prev) => prev.filter((f) => f.id !== id)); } catch { /* ignore */ }
    setBusy(false);
  };

  const handleCreateOrUpdateField = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cfName.trim() || !cfLabel.trim() || !activeAreaId) return;
    setBusy(true);
    try {
      if (cfId) {
        await updateCustomField(cfId, {
          name: cfName.trim(),
          label: cfLabel.trim(),
          field_role: cfRole,
          field_type: cfType,
          color: cfColor,
          unit: cfUnit,
          hidden_in_entry: cfHiddenEntry,
          hidden_in_dashboard: !cfShowDashboard,
          kpi_id: cfKpiId || null,
        });
      } else {
        await createCustomField({
          area_id: activeAreaId,
          kpi_id: cfKpiId || null,
          name: cfName.trim(),
          label: cfLabel.trim(),
          field_type: cfType,
          field_role: cfRole,
          color: cfColor,
          unit: cfUnit,
          hidden_in_entry: cfHiddenEntry,
          hidden_in_dashboard: !cfShowDashboard,
        });
      }
      resetFieldForm();
      await loadData();
      setShowFieldForm(false);
    } catch { /* ignore */ }
    setBusy(false);
  };

  const handleEditField = (field: CustomField) => {
    setEditingField(field);
    setCfId(field.id);
    setCfName(field.name);
    setCfLabel(field.label);
    setCfRole(field.field_role);
    setCfKpiId(field.kpi_id ?? '');
    setCfType(field.field_type);
    setCfColor(field.color ?? 'emerald');
    setCfUnit(field.unit ?? '%');
    setCfHiddenEntry(field.hidden_in_entry ?? false);
    setCfShowDashboard(!(field.hidden_in_dashboard ?? false));
    setShowFieldForm(true);
    setShowFormulaForm(false);
    setTimeout(() => topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  };

  const insertFieldRef = (fieldName: string) => {
    setFExpression((prev) => `${prev}{${fieldName}}`);
  };

  const confirmDeleteAction = async () => {
    if (!confirmDelete) return;
    const { kind, id } = confirmDelete;
    setConfirmDelete(null);
    if (kind === 'formula') await handleDeleteFormula(id);
    else await handleDeleteField(id);
  };

  // Drag-and-drop field reordering
  const handleDragStart = (fieldId: string) => { setDragFieldId(fieldId); };
  const handleDragOver = (e: React.DragEvent, fieldId: string) => {
    e.preventDefault();
    setDragOverFieldId(fieldId);
  };
  const handleDrop = async (e: React.DragEvent, targetFieldId: string) => {
    e.preventDefault();
    if (!dragFieldId || dragFieldId === targetFieldId) {
      setDragFieldId(null);
      setDragOverFieldId(null);
      return;
    }

    const areaFields = fieldsForArea(activeAreaId).sort((a, b) => a.sort_order - b.sort_order);
    const reordered = [...areaFields];
    const fromIdx = reordered.findIndex((f) => f.id === dragFieldId);
    const toIdx = reordered.findIndex((f) => f.id === targetFieldId);
    if (fromIdx === -1 || toIdx === -1) return;

    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, moved);

    const orderedIds = reordered.map((f) => f.id);
    setFields((prev) => {
      const other = prev.filter((f) => f.area_id !== activeAreaId);
      const updated = reordered.map((f, i) => ({ ...f, sort_order: i }));
      return [...other, ...updated];
    });

    setDragFieldId(null);
    setDragOverFieldId(null);
    try { await reorderCustomFields(orderedIds); } catch { /* ignore */ }
  };

  // Drag-and-drop formula reordering
  const handleFormulaDragStart = (formulaId: string) => { setDragFormulaId(formulaId); };
  const handleFormulaDragOver = (e: React.DragEvent, formulaId: string) => {
    e.preventDefault();
    setDragOverFormulaId(formulaId);
  };
  const handleFormulaDrop = async (e: React.DragEvent, targetFormulaId: string, kpiId: string) => {
    e.preventDefault();
    if (!dragFormulaId || dragFormulaId === targetFormulaId) {
      setDragFormulaId(null);
      setDragOverFormulaId(null);
      return;
    }

    const kpiFormulas = formulas
      .filter((f) => f.kpi_id === kpiId)
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    const reordered = [...kpiFormulas];
    const fromIdx = reordered.findIndex((f) => f.id === dragFormulaId);
    const toIdx = reordered.findIndex((f) => f.id === targetFormulaId);
    if (fromIdx === -1 || toIdx === -1) return;

    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, moved);

    const orderedIds = reordered.map((f) => f.id);
    setFormulas((prev) => {
      const other = prev.filter((f) => f.kpi_id !== kpiId);
      const updated = reordered.map((f, i) => ({ ...f, sort_order: i }));
      return [...other, ...updated];
    });

    setDragFormulaId(null);
    setDragOverFormulaId(null);
    try { await reorderFormulas(orderedIds); } catch { /* ignore */ }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-32"><Loader2 className="w-8 h-8 text-blue-500 animate-spin" /></div>;
  }

  const activeArea = areas.find((a) => a.id === activeAreaId);
  const activeKpis = kpisForArea(activeAreaId);
  const activeInputFields = inputFieldsForArea(activeAreaId);
  const activeResultFields = resultFieldsForArea(activeAreaId);

  return (
    <>
    <div ref={topRef} className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center">
            <Calculator className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Constructor de Fórmulas</h2>
            <p className="text-sm text-gray-500">Gestioná campos, fórmulas y resultados por área. Arrastrá los campos para reordenarlos.</p>
          </div>
        </div>
      </div>

      {/* Area Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {areas.map((area) => (
          <button
            key={area.id}
            onClick={() => setActiveAreaId(area.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-sm font-medium transition-colors whitespace-nowrap border-b-2 ${
              activeAreaId === area.id
                ? 'bg-white border-violet-500 text-gray-900'
                : 'bg-slate-100 border-transparent text-gray-500 hover:bg-slate-200'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            {area.name}
          </button>
        ))}
      </div>

      {/* Area content */}
      {activeArea && (
        <div className="space-y-4">
          {/* Action buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => { setShowFieldForm(!showFieldForm); setShowFormulaForm(false); resetFieldForm(); }}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors"
            >
              <Plus className="w-4 h-4" /> Crear campo
            </button>
            <button
              onClick={() => { setShowFormulaForm(!showFormulaForm); setShowFieldForm(false); resetFormulaForm(); }}
              className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors"
            >
              <Calculator className="w-4 h-4" /> Crear fórmula
            </button>
          </div>

          {/* Create/Edit field form */}
          {showFieldForm && (
            <div className="bg-white rounded-2xl border border-blue-200 p-6">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-base font-bold text-gray-900">{editingField ? 'Editar campo' : 'Crear campo'} en {activeArea.name}</h3>
                <button onClick={() => { setShowFieldForm(false); resetFieldForm(); }} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleCreateOrUpdateField} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1.5 block">Nombre del campo (sin espacios)</label>
                    <input type="text" value={cfName} onChange={(e) => setCfName(e.target.value)} required className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="ventas_totales" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1.5 block">Etiqueta visible</label>
                    <input type="text" value={cfLabel} onChange={(e) => setCfLabel(e.target.value)} required className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Ventas totales" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1.5 block">Tipo de campo</label>
                    <div className="grid grid-cols-2 gap-2">
                      {FIELD_TYPES.map(({ value, label, icon: Icon }) => (
                        <button key={value} type="button" onClick={() => setCfType(value)} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all ${cfType === value ? 'bg-blue-600 text-white shadow-sm' : 'bg-white border border-gray-200 text-gray-500 hover:border-blue-300'}`}>
                          <Icon className="w-3.5 h-3.5" /> {label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1.5 block">Rol del campo</label>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => { setCfRole('input'); if (!cfId) setCfShowDashboard(false); }} className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${cfRole === 'input' ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-500'}`}>
                        Entrada
                      </button>
                      <button type="button" onClick={() => { setCfRole('result'); if (!cfId) setCfShowDashboard(true); }} className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${cfRole === 'result' ? 'bg-violet-600 text-white' : 'bg-white border border-gray-200 text-gray-500'}`}>
                        Resultado
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1.5 block">Asignar a indicador (opcional)</label>
                    <select value={cfKpiId} onChange={(e) => setCfKpiId(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                      <option value="">General del área</option>
                      {activeKpis.map((k) => <option key={k.id} value={k.id}>{k.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1.5 block">Color en el dashboard</label>
                    <div className="flex flex-wrap gap-2">
                      {FIELD_COLORS.map((c) => (
                        <button key={c.value} type="button" onClick={() => setCfColor(c.value)} className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-all ${cfColor === c.value ? 'ring-2 ring-offset-1 ring-gray-400' : ''} bg-white border border-gray-200`}>
                          <span className={`w-3.5 h-3.5 rounded-full ${c.swatch}`} />
                          {c.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1.5 block">Unidad de visualización</label>
                    <select value={cfUnit} onChange={(e) => setCfUnit(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                      <option value="%">Porcentaje (%)</option>
                      <option value="$">Pesos ($)</option>
                      <option value="u">Unidades (u)</option>
                      <option value="d">Días (d)</option>
                      <option value="">Sin unidad</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-xs font-medium text-gray-500 mb-1.5 block">Visibilidad</label>
                    <div className="flex flex-wrap gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={!cfHiddenEntry} onChange={(e) => setCfHiddenEntry(!e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                        <span className="text-sm text-gray-700">Mostrar en carga de datos</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={cfShowDashboard} onChange={(e) => setCfShowDashboard(e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                        <span className="text-sm text-gray-700">Mostrar en dashboard</span>
                      </label>
                    </div>
                  </div>
                </div>
                <button type="submit" disabled={busy} className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-2.5 rounded-xl text-sm transition-colors disabled:opacity-50 flex items-center gap-2">
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} {editingField ? 'Guardar cambios' : 'Crear campo'}
                </button>
              </form>
            </div>
          )}

          {/* Create/Edit formula form */}
          {showFormulaForm && (
            <div className="bg-white rounded-2xl border border-violet-200 p-6">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-base font-bold text-gray-900">{editingFormula ? 'Editar fórmula' : 'Crear fórmula'} en {activeArea.name}</h3>
                <button onClick={() => { setShowFormulaForm(false); resetFormulaForm(); }} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleCreateOrUpdateFormula} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1.5 block">Indicador (KPI)</label>
                    <select value={fKpiId} onChange={(e) => setFKpiId(e.target.value)} required className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent">
                      <option value="">Seleccionar indicador...</option>
                      {activeKpis.map((k) => <option key={k.id} value={k.id}>{k.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1.5 block">Nombre de la fórmula</label>
                    <input type="text" value={fName} onChange={(e) => setFName(e.target.value)} required className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent" placeholder="Cálculo de cumplimiento" />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1.5 block">Campos de entrada disponibles (clic para insertar)</label>
                  <div className="flex flex-wrap gap-2">
                    {activeInputFields.map((field) => (
                      <button key={field.id} type="button" onClick={() => insertFieldRef(field.name)} className="px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-xs font-medium text-blue-700 transition-colors border border-blue-200">
                        {field.label}
                      </button>
                    ))}
                    {activeInputFields.length === 0 && <p className="text-xs text-gray-400">No hay campos de entrada creados para esta área.</p>}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1.5 block">Expresión (usá {'{nombre_campo}'} para referenciar campos)</label>
                  <textarea value={fExpression} onChange={(e) => setFExpression(e.target.value)} required rows={3} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-none" placeholder="{ventas} / {objetivo} * 100" />
                  <p className="text-xs text-gray-400 mt-1">Operadores: + - * / y parentesis (). Ej: {'{a} / {b} * 100'}</p>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1.5 block">Guardar resultado en (campo de resultado)</label>
                  <select value={fResultFieldId} onChange={(e) => setFResultFieldId(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent">
                    <option value="">Sin campo de resultado (no guarda el valor)</option>
                    {activeResultFields.map((field) => (
                      <option key={field.id} value={field.id}>{field.label}</option>
                    ))}
                  </select>
                  {activeResultFields.length === 0 && <p className="text-xs text-amber-600 mt-1">No hay campos de resultado creados. Creá un campo de tipo "Resultado" para almacenar el valor calculado.</p>}
                </div>

                <button type="submit" disabled={busy} className="bg-violet-600 hover:bg-violet-700 text-white font-medium px-6 py-2.5 rounded-xl text-sm transition-colors disabled:opacity-50 flex items-center gap-2">
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} {editingFormula ? 'Guardar cambios' : 'Guardar fórmula'}
                </button>
              </form>
            </div>
          )}

          {/* KPI cards with fields and formulas */}
          {activeKpis.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
              <p className="text-sm text-gray-400">No hay indicadores creados para esta área.</p>
            </div>
          ) : (
            activeKpis.map((kpi) => {
              const kpiFields = fieldsForArea(activeAreaId)
                .filter((f) => f.kpi_id === kpi.id || (!f.kpi_id && f.area_id === activeAreaId))
                .sort((a, b) => a.sort_order - b.sort_order);
              const kpiFormulas = formulasForKpi(kpi.id);

              return (
                <div key={kpi.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                  <div className="bg-amber-100 border-l-4 border-l-amber-500 px-5 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-amber-500" />
                      <h3 className="text-sm font-bold text-amber-900">{kpi.name}</h3>
                    </div>
                    {kpi.definition && <p className="text-xs text-amber-700 mt-1 ml-4">{kpi.definition}</p>}
                  </div>

                  <div className="p-5 space-y-4">
                    {/* Unified fields list (drag to reorder) */}
                    {kpiFields.length > 0 && (
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-2">Campos (arrastrar para reordenar)</p>
                        <div className="space-y-1.5">
                          {kpiFields.map((field) => {
                            const typeInfo = FIELD_TYPES.find((t) => t.value === field.field_type);
                            const TypeIcon = typeInfo?.icon ?? Hash;
                            const isResult = field.field_role === 'result';
                            const colorInfo = FIELD_COLORS.find((c) => c.value === (field.color ?? 'emerald'));
                            return (
                              <div
                                key={field.id}
                                draggable
                                onDragStart={() => handleDragStart(field.id)}
                                onDragOver={(e) => handleDragOver(e, field.id)}
                                onDrop={(e) => handleDrop(e, field.id)}
                                onDragEnd={() => { setDragFieldId(null); setDragOverFieldId(null); }}
                                className={`border rounded-lg p-3 flex items-center gap-2 group cursor-grab active:cursor-grabbing transition-all ${
                                  isResult
                                    ? (dragOverFieldId === field.id ? 'bg-violet-50 border-violet-400 ring-2 ring-violet-200' : 'bg-violet-50 border-violet-200')
                                    : (dragOverFieldId === field.id ? 'bg-blue-50 border-blue-400 ring-2 ring-blue-200' : 'bg-blue-50 border-blue-200')
                                } ${dragFieldId === field.id ? 'opacity-40' : ''}`}
                              >
                                <GripVertical className={`w-4 h-4 flex-shrink-0 ${isResult ? 'text-violet-300' : 'text-blue-300'}`} />
                                <TypeIcon className={`w-3.5 h-3.5 flex-shrink-0 ${isResult ? 'text-violet-400' : 'text-blue-400'}`} />
                                <div className="flex-1 min-w-0">
                                  <p className={`text-xs font-medium truncate ${isResult ? 'text-violet-900' : 'text-blue-900'}`}>{field.label}</p>
                                  <p className={`text-[10px] mt-0.5 ${isResult ? 'text-violet-400' : 'text-blue-400'}`}>{field.name} · {typeInfo?.label} · {field.unit ?? '%'} · {isResult ? 'Resultado' : 'Entrada'}</p>
                                </div>
                                {(field.hidden_in_entry || field.hidden_in_dashboard) && (
                                  <div className="flex items-center gap-1 flex-shrink-0">
                                    {field.hidden_in_entry && <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-600 font-medium">no se muestra en carga</span>}
                                    {field.hidden_in_dashboard && <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-600 font-medium">no se muestra en dashboard</span>}
                                  </div>
                                )}
                                <span className={`w-3 h-3 rounded-full ${colorInfo?.swatch ?? 'bg-emerald-500'} flex-shrink-0`} />
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button onClick={() => handleEditField(field)} disabled={busy} className={`p-1 rounded transition-colors ${isResult ? 'text-violet-400 hover:text-violet-700 hover:bg-violet-100' : 'text-blue-400 hover:text-blue-700 hover:bg-blue-100'}`}>
                                    <Pencil className="w-3 h-3" />
                                  </button>
                                  <button onClick={() => setConfirmDelete({ kind: 'field', id: field.id })} disabled={busy} className={`p-1 rounded transition-colors ${isResult ? 'text-violet-300 hover:text-red-500 hover:bg-red-50' : 'text-blue-300 hover:text-red-500 hover:bg-red-50'}`}>
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Formulas */}
                    {kpiFormulas.length > 0 && (
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-emerald-500 font-semibold mb-2">Fórmulas (arrastrar para reordenar)</p>
                        <div className="space-y-2">
                          {kpiFormulas.map((formula) => {
                            const resultField = formula.result_field_id ? fields.find((f) => f.id === formula.result_field_id) : null;
                            return (
                              <div
                                key={formula.id}
                                draggable
                                onDragStart={() => handleFormulaDragStart(formula.id)}
                                onDragOver={(e) => handleFormulaDragOver(e, formula.id)}
                                onDrop={(e) => handleFormulaDrop(e, formula.id, kpi.id)}
                                onDragEnd={() => { setDragFormulaId(null); setDragOverFormulaId(null); }}
                                className={`bg-emerald-50 border rounded-lg p-3 flex items-center justify-between group cursor-grab active:cursor-grabbing transition-all ${
                                  dragOverFormulaId === formula.id ? 'border-emerald-400 ring-2 ring-emerald-200' : 'border-emerald-200'
                                } ${dragFormulaId === formula.id ? 'opacity-40' : ''}`}
                              >
                                <GripVertical className="w-4 h-4 text-emerald-300 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-medium text-emerald-900">{formula.name}</p>
                                  <p className="text-xs text-emerald-700 font-mono mt-0.5">{formula.expression}</p>
                                  {resultField && <p className="text-[10px] text-emerald-500 mt-0.5">Guarda en: {resultField.label}</p>}
                                </div>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button onClick={() => handleEditFormula(formula)} disabled={busy} className="p-1 rounded text-emerald-400 hover:text-emerald-700 hover:bg-emerald-100 transition-colors">
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                  <button onClick={() => setConfirmDelete({ kind: 'formula', id: formula.id })} disabled={busy} className="p-1 rounded text-emerald-300 hover:text-red-500 hover:bg-red-50 transition-colors">
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {kpiFields.length === 0 && kpiFormulas.length === 0 && (
                      <p className="text-xs text-gray-400 text-center py-2">Sin campos ni fórmulas creadas para este indicador.</p>
                    )}
                  </div>
                </div>
              );
            })
          )}

          {/* General area fields */}
          {(() => {
            const generalFields = fieldsForArea(activeAreaId)
              .filter((f) => !f.kpi_id)
              .sort((a, b) => a.sort_order - b.sort_order);
            if (generalFields.length === 0) return null;
            return (
              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <div className="bg-slate-100 border-l-4 border-l-slate-400 px-5 py-4">
                  <h3 className="text-sm font-bold text-gray-700">Campos generales del área</h3>
                </div>
                <div className="p-5">
                  <div className="space-y-1.5">
                    {generalFields.map((field) => (
                      <div
                        key={field.id}
                        draggable
                        onDragStart={() => handleDragStart(field.id)}
                        onDragOver={(e) => handleDragOver(e, field.id)}
                        onDrop={(e) => handleDrop(e, field.id)}
                        onDragEnd={() => { setDragFieldId(null); setDragOverFieldId(null); }}
                        className={`border rounded-lg p-3 flex items-center gap-2 group cursor-grab active:cursor-grabbing transition-all ${
                          field.field_role === 'result' ? 'bg-violet-50 border-violet-200' : 'bg-blue-50 border-blue-200'
                        } ${dragOverFieldId === field.id ? 'ring-2 ring-blue-200' : ''} ${dragFieldId === field.id ? 'opacity-40' : ''}`}
                      >
                        <GripVertical className="w-4 h-4 text-gray-300 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs font-medium truncate ${field.field_role === 'result' ? 'text-violet-900' : 'text-blue-900'}`}>{field.label}</p>
                          <p className="text-[10px] mt-0.5">{field.field_role === 'result' ? 'Resultado' : 'Entrada'}</p>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => handleEditField(field)} disabled={busy} className={`p-1 rounded transition-colors ${field.field_role === 'result' ? 'text-violet-400 hover:text-violet-700 hover:bg-violet-100' : 'text-blue-400 hover:text-blue-700 hover:bg-blue-100'}`}>
                            <Pencil className="w-3 h-3" />
                          </button>
                          <button onClick={() => setConfirmDelete({ kind: 'field', id: field.id })} disabled={busy} className="p-1 rounded text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>

    <ConfirmDialog
      open={confirmDelete !== null}
      message={confirmDelete?.kind === 'formula' ? '¿Seguro que querés eliminar esta fórmula? Esta acción no se puede deshacer.' : '¿Seguro que querés eliminar este campo? Esta acción no se puede deshacer.'}
      onConfirm={confirmDeleteAction}
      onCancel={() => setConfirmDelete(null)}
    />

    </>
  );
}
