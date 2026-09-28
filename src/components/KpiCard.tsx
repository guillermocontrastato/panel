import { useEffect, useMemo, useState } from 'react';
import { Calculator, Clock, Hash, Sparkles, Loader2, X } from 'lucide-react';
import type { CustomField, FieldValue, Formula, KpiWithDetails } from '@/types';
import { fetchCustomFieldsByArea, fetchFormulas, fetchLatestFieldValues } from '@/lib/api';
import { parseFormula } from '@/lib/formula-parser';
import { formatValue } from '@/lib/kpi-helpers';
import { supabase } from '@/lib/supabase';

const COLOR_MAP: Record<string, { bg: string; border: string; icon: string; label: string; value: string }> = {
  emerald: { bg: 'bg-emerald-50', border: 'border-emerald-300', icon: 'text-emerald-500', label: 'text-emerald-800', value: 'text-emerald-700' },
  blue: { bg: 'bg-blue-50', border: 'border-blue-300', icon: 'text-blue-500', label: 'text-blue-800', value: 'text-blue-700' },
  red: { bg: 'bg-red-50', border: 'border-red-300', icon: 'text-red-500', label: 'text-red-800', value: 'text-red-700' },
  amber: { bg: 'bg-amber-50', border: 'border-amber-300', icon: 'text-amber-500', label: 'text-amber-800', value: 'text-amber-700' },
  violet: { bg: 'bg-violet-50', border: 'border-violet-300', icon: 'text-violet-500', label: 'text-violet-800', value: 'text-violet-700' },
  cyan: { bg: 'bg-cyan-50', border: 'border-cyan-300', icon: 'text-cyan-500', label: 'text-cyan-800', value: 'text-cyan-700' },
  rose: { bg: 'bg-rose-50', border: 'border-rose-300', icon: 'text-rose-500', label: 'text-rose-800', value: 'text-rose-700' },
  slate: { bg: 'bg-slate-50', border: 'border-slate-300', icon: 'text-slate-500', label: 'text-slate-800', value: 'text-slate-700' },
};

function getColorClasses(color: string) {
  return COLOR_MAP[color] ?? COLOR_MAP.emerald;
}

interface KpiCardProps {
  kpi: KpiWithDetails;
}

export function KpiCard({ kpi }: KpiCardProps) {
  const [fields, setFields] = useState<CustomField[]>([]);
  const [fieldValues, setFieldValues] = useState<Record<string, number | null>>({});
  const [formulas, setFormulas] = useState<Formula[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);

  const MAX_FIELDS_COLLAPSED = 4;

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const [loadedFields, loadedFormulas] = await Promise.all([
          fetchCustomFieldsByArea(kpi.area_id),
          fetchFormulas(kpi.id),
        ]);
        if (cancelled) return;

        const kpiFields = loadedFields.filter((f) => !f.kpi_id || f.kpi_id === kpi.id);
        setFields(kpiFields);
        setFormulas(loadedFormulas);

        const fieldIds = loadedFields
          .filter((field) => field.field_role === 'input')
          .map((field) => field.id);
        if (fieldIds.length === 0) return;

        const values = await fetchLatestFieldValues(fieldIds);
        if (cancelled) return;

        const valueMap: Record<string, number | null> = {};
        for (const fieldValue of values as FieldValue[]) {
          if (!(fieldValue.field_id in valueMap)) {
            valueMap[fieldValue.field_id] = fieldValue.value_number ?? null;
          }
        }
        setFieldValues(valueMap);
      } catch {
        if (!cancelled) {
          setFields([]);
          setFormulas([]);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [kpi.id]);

  const computedResults = useMemo(() => {
    const results: Record<string, number | null> = {};
    const nameToInput = new Map<string, CustomField>();

    for (const field of fields) {
      if (field.field_role === 'input') {
        nameToInput.set(field.name.trim(), field);
      }
    }

    for (const formula of formulas) {
      if (!formula.result_field_id) continue;

      try {
        const parsed = parseFormula(formula.expression);
        const numericValues: Record<string, number> = {};
        let complete = true;

        for (const parsedField of parsed.fields) {
          const inputField = nameToInput.get(parsedField.variable.trim());
          const value = inputField ? fieldValues[inputField.id] : null;
          if (value == null || isNaN(value)) {
            complete = false;
            break;
          }
          numericValues[parsedField.variable] = value;
        }

        results[formula.result_field_id] = complete ? parsed.compute(numericValues) : null;
      } catch {
        results[formula.result_field_id] = null;
      }
    }

    return results;
  }, [fields, formulas, fieldValues]);

  const visibleFields = useMemo(() => {
    return fields
      .filter((field) => !field.hidden_in_dashboard)
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  }, [fields]);

  const shownFields = expanded ? visibleFields : visibleFields.slice(0, MAX_FIELDS_COLLAPSED);
  const hasMore = visibleFields.length > MAX_FIELDS_COLLAPSED;

  const handleAnalyze = async () => {
    if (analyzing) return;
    setAnalyzing(true);
    setAnalysis(null);
    try {
      const fieldSummary = visibleFields.map((f) => ({
        label: f.label,
        name: f.name,
        field_role: f.field_role,
        unit: f.unit ?? '',
        value: f.field_role === 'input'
          ? fieldValues[f.id] ?? null
          : computedResults[f.id] ?? null,
      }));
      const formulaSummary = formulas.map((fm) => ({
        name: fm.name,
        expression: fm.expression,
      }));
      const { data, error } = await supabase.functions.invoke('analyze-kpi', {
        body: {
          kpi: {
            name: kpi.name,
            definition: kpi.definition,
            unit: kpi.unit,
            target_direction: kpi.target_direction,
            data: kpi.data ? {
              current_value: kpi.data.current_value,
              target_value: kpi.data.target_value,
              previous_value: kpi.data.previous_value,
              trend: kpi.data.trend,
            } : undefined,
          },
          fields: fieldSummary,
          formulas: formulaSummary,
        },
      });
      if (error) throw error;
      setAnalysis((data as { suggestions: string }).suggestions);
    } catch {
      setAnalysis('No se pudo generar el análisis en este momento. Intentá nuevamente más tarde.');
    }
    setAnalyzing(false);
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 hover:shadow-lg hover:border-gray-300 transition-all duration-300">
      <div className="mb-4 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-gray-900 leading-snug">{kpi.name}</h3>
          {kpi.definition && (
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">{kpi.definition}</p>
          )}
          {kpi.data?.updated_at && (
            <div className="flex items-center gap-1.5 text-[10px] text-gray-400 mt-1">
              <Clock className="w-3 h-3" />
              <span>Actualizado: {new Date(kpi.data.updated_at).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })}</span>
            </div>
          )}
        </div>
        <button
          onClick={handleAnalyze}
          disabled={analyzing}
          title="Analizar con IA"
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-violet-50 border border-violet-200 text-violet-600 hover:bg-violet-100 hover:border-violet-300 transition-colors flex-shrink-0 disabled:opacity-50"
        >
          {analyzing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
          <span className="text-[11px] font-medium">IA</span>
        </button>
      </div>

      {visibleFields.length > 0 ? (
        <div className="space-y-1.5">
          {shownFields.map((field) => {
            const c = getColorClasses(field.color);
            const isInput = field.field_role === 'input';
            const value = isInput
              ? fieldValues[field.id] ?? null
              : computedResults[field.id] ?? null;
            const Icon = isInput ? Hash : Calculator;
            return (
              <div key={field.id} className={`${c.bg} border ${c.border} rounded-lg px-2.5 py-1.5`}>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Icon className={`w-3 h-3 ${c.icon} flex-shrink-0`} />
                    <p className={`text-[11px] font-semibold ${c.label} leading-snug truncate`}>{field.label}</p>
                  </div>
                  <p className={`text-sm font-bold ${c.value} leading-tight flex-shrink-0`}>
                    {value != null && !isNaN(value) ? formatValue(value, field.unit ?? '%') : '—'}
                  </p>
                </div>
              </div>
            );
          })}
          {hasMore && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="w-full text-center text-[11px] font-medium text-blue-600 hover:text-blue-700 py-1 transition-colors"
            >
              {expanded ? 'Ver menos' : `Ver más (${visibleFields.length - MAX_FIELDS_COLLAPSED} adicionales)`}
            </button>
          )}
        </div>
      ) : (
        <p className="text-sm text-gray-400">No hay campos configurados para mostrar.</p>
      )}

      {analysis && (
        <div className="mt-3 bg-violet-50 border border-violet-200 rounded-xl p-3">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-violet-500 flex-shrink-0" />
              <p className="text-[11px] font-semibold text-violet-800">Sugerencias de la IA</p>
            </div>
            <button onClick={() => setAnalysis(null)} className="p-0.5 rounded text-violet-400 hover:text-violet-700 hover:bg-violet-100 transition-colors">
              <X className="w-3 h-3" />
            </button>
          </div>
          <div className="text-[11px] text-violet-700 leading-relaxed whitespace-pre-line">{analysis}</div>
        </div>
      )}
    </div>
  );
}
