import { useEffect, useState, useRef } from 'react';
import { Plus, Trash2, Loader2, X, GripVertical, Pencil, Check, LayoutDashboard } from 'lucide-react';
import { fetchAreas, createArea, updateArea, deleteArea, reorderAreas } from '@/lib/api';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import type { Area } from '@/types';

const ICON_OPTIONS = [
  { value: 'Car', label: 'Auto' },
  { value: 'TrendingUp', label: 'Tendencia' },
  { value: 'RefreshCw', label: 'Reciclaje' },
  { value: 'Wrench', label: 'Herramienta' },
  { value: 'ShieldCheck', label: 'Escudo' },
  { value: 'Users', label: 'Personas' },
  { value: 'Landmark', label: 'Banco' },
  { value: 'LayoutDashboard', label: 'Tablero' },
];

const COLOR_OPTIONS = [
  '#2563eb', '#059669', '#d97706', '#dc2626', '#0891b2',
  '#7c3aed', '#ea580c', '#0d9488', '#4f46e5', '#db2777',
  '#65a30d', '#ca8a04', '#9333ea', '#f43f5e', '#0284c7',
  '#1e40af', '#166534', '#92400e', '#991b1b', '#115e59',
];

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 50);
}

export function AreaManagement() {
  const [areas, setAreas] = useState<Area[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const dragNode = useRef<HTMLDivElement | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const [fName, setFName] = useState('');
  const [fDesc, setFDesc] = useState('');
  const [fIcon, setFIcon] = useState('LayoutDashboard');
  const [fColor, setFColor] = useState(COLOR_OPTIONS[0]);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const a = await fetchAreas();
      setAreas(a);
    } catch { /* ignore */ }
    setLoading(false);
  };

  const resetForm = () => {
    setFName('');
    setFDesc('');
    setFIcon('LayoutDashboard');
    setFColor(COLOR_OPTIONS[0]);
    setEditingId(null);
    setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (editingId) {
        await updateArea(editingId, {
          name: fName,
          description: fDesc,
          icon: fIcon,
          color: fColor,
        });
      } else {
        await createArea({
          name: fName,
          slug: slugify(fName),
          icon: fIcon,
          description: fDesc,
          color: fColor,
          sort_order: areas.length,
        });
      }
      resetForm();
      await loadData();
    } catch { /* ignore */ }
    setBusy(false);
  };

  const handleEdit = (area: Area) => {
    setEditingId(area.id);
    setFName(area.name);
    setFDesc(area.description);
    setFIcon(area.icon);
    setFColor(area.color || COLOR_OPTIONS[0]);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    setBusy(true);
    try {
      await deleteArea(id);
      setAreas((prev) => prev.filter((a) => a.id !== id));
    } catch { /* ignore */ }
    setBusy(false);
  };

  const confirmDelete = async () => {
    if (!confirmDeleteId) return;
    await handleDelete(confirmDeleteId);
    setConfirmDeleteId(null);
  };

  const handleDragStart = (index: number, e: React.DragEvent) => {
    setDragIndex(index);
    dragNode.current = e.currentTarget as HTMLDivElement;
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragIndex === null) return;
    setDragOverIndex(index);
  };

  const handleDragEnd = async () => {
    if (dragIndex === null || dragOverIndex === null || dragIndex === dragOverIndex) {
      setDragIndex(null);
      setDragOverIndex(null);
      return;
    }
    const reordered = [...areas];
    const [moved] = reordered.splice(dragIndex, 1);
    reordered.splice(dragOverIndex, 0, moved);
    setAreas(reordered);
    setDragIndex(null);
    setDragOverIndex(null);
    try {
      await reorderAreas(reordered.map((a) => a.id));
    } catch { /* ignore */ }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-32"><Loader2 className="w-8 h-8 text-blue-500 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
              <LayoutDashboard className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Gestión de Áreas</h2>
              <p className="text-sm text-gray-500">Creá, editá y ordená las tarjetas del panel. Arrastrá para reordenar.</p>
            </div>
          </div>
          <button onClick={() => { if (editingId) resetForm(); else setShowForm(!showForm); }} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors">
            {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showForm ? 'Cancelar' : 'Nueva área'}
          </button>
        </div>
        <div className="bg-slate-50 rounded-xl p-4 mt-6">
          <p className="text-2xl font-bold text-gray-900">{areas.length}</p>
          <p className="text-xs text-gray-500 mt-1">áreas creadas</p>
        </div>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl border border-blue-200 p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-base font-bold text-gray-900">{editingId ? 'Editar área' : 'Crear nueva área'}</h3>
            <button onClick={resetForm} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"><X className="w-5 h-5" /></button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Nombre del área</label>
                <input type="text" value={fName} onChange={(e) => setFName(e.target.value)} required className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Ventas 0km" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Descripción</label>
                <input type="text" value={fDesc} onChange={(e) => setFDesc(e.target.value)} required className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Indicadores de ventas de autos nuevos" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Ícono</label>
                <select value={fIcon} onChange={(e) => setFIcon(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  {ICON_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Color de la tarjeta</label>
                <div className="flex flex-wrap gap-2">
                  {COLOR_OPTIONS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setFColor(color)}
                      className={`w-8 h-8 rounded-lg transition-all ${fColor === color ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : 'hover:scale-105'}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                  <input
                    type="color"
                    value={fColor}
                    onChange={(e) => setFColor(e.target.value)}
                    className="w-8 h-8 rounded-lg border border-gray-200 cursor-pointer p-0"
                    title="Color personalizado"
                  />
                </div>
              </div>
            </div>

            {/* Preview */}
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">Vista previa de la tarjeta</label>
              <div
                className="rounded-2xl border p-5 relative overflow-hidden"
                style={{ backgroundColor: `${fColor}18`, borderColor: `${fColor}40` }}
              >
                <div className="absolute top-0 left-0 w-full h-1.5" style={{ backgroundColor: fColor }} />
                <div className="flex items-start justify-between mb-4 mt-1">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-sm" style={{ backgroundColor: fColor }}>
                    <LayoutDashboard className="w-6 h-6 text-white" />
                  </div>
                </div>
                <h4 className="text-base font-bold text-gray-900 mb-1">{fName || 'Nombre del área'}</h4>
                <p className="text-xs text-gray-600 leading-relaxed line-clamp-2">{fDesc || 'Descripción del área'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button type="submit" disabled={busy} className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-2.5 rounded-xl text-sm transition-colors disabled:opacity-50 flex items-center gap-2">
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : editingId ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                {editingId ? 'Guardar cambios' : 'Crear área'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="text-base font-bold text-gray-900">Áreas del panel</h3>
          <p className="text-xs text-gray-500 mt-0.5">Arrastrá las áreas para reordenarlas</p>
        </div>
        <div>
          {areas.map((area, index) => {
            const isDragging = dragIndex === index;
            const isDragOver = dragOverIndex === index && dragIndex !== index;
            return (
              <div
                key={area.id}
                draggable
                onDragStart={(e) => handleDragStart(index, e)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                className={`flex items-center gap-3 p-4 border-b border-gray-50 last:border-b-0 transition-all ${
                  isDragging ? 'opacity-40' : ''
                } ${isDragOver ? 'border-t-2 border-t-blue-500' : ''} hover:bg-gray-50 cursor-grab active:cursor-grabbing`}
              >
                <GripVertical className="w-5 h-5 text-gray-300 flex-shrink-0" />
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: area.color || '#2563eb' }}
                >
                  <span className="text-white text-xs font-bold">{index + 1}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{area.name}</p>
                  <p className="text-xs text-gray-400 truncate">{area.description}</p>
                </div>
                <div className="w-6 h-6 rounded-full flex-shrink-0 border border-gray-200" style={{ backgroundColor: area.color || '#2563eb' }} title="Color del área" />
                <button
                  onClick={() => handleEdit(area)}
                  disabled={busy}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors flex-shrink-0"
                  title="Editar"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setConfirmDeleteId(area.id)}
                  disabled={busy}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0"
                  title="Eliminar"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}
          {areas.length === 0 && (
            <div className="p-8 text-center">
              <p className="text-sm text-gray-400">No hay áreas creadas. Creá la primera con el botón de arriba.</p>
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirmDeleteId !== null}
        message="¿Seguro que querés eliminar esta área? Esta acción no se puede deshacer."
        onConfirm={confirmDelete}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  );
}
