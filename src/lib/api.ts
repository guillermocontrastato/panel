import { supabase } from '@/lib/supabase';
import type {
  Area, Kpi, KpiData, KpiBreakdown, AreaWithKpis, KpiWithDetails,
  Profile, UserArea, DataEntry, DataEntryWithProfile, UserRole,
  CustomField, FieldValue, Formula, ApiConnection, FirecrawlConnection, DataSourceConfig,
  GribaLead, Notification,
} from '@/types';

// === Areas & KPIs ===

export async function fetchAreas(): Promise<Area[]> {
  const { data, error } = await supabase.from('areas').select('*').order('sort_order');
  if (error) throw error;
  return data as Area[];
}

export async function createArea(area: {
  name: string;
  slug: string;
  icon: string;
  description: string;
  color: string;
  sort_order?: number;
}): Promise<void> {
  const { error } = await supabase.from('areas').insert({
    ...area,
    sort_order: area.sort_order ?? 0,
  });
  if (error) throw error;
}

export async function updateArea(id: string, updates: Partial<Area>): Promise<void> {
  const { error } = await supabase.from('areas').update(updates).eq('id', id);
  if (error) throw error;
}

export async function deleteArea(id: string): Promise<void> {
  const { error } = await supabase.from('areas').delete().eq('id', id);
  if (error) throw error;
}

export async function reorderAreas(orderedIds: string[]): Promise<void> {
  for (let i = 0; i < orderedIds.length; i++) {
    const { error } = await supabase.from('areas').update({ sort_order: i }).eq('id', orderedIds[i]);
    if (error) throw error;
  }
}

export async function fetchKpisByArea(areaId: string): Promise<Kpi[]> {
  const { data, error } = await supabase.from('kpis').select('*').eq('area_id', areaId).order('sort_order');
  if (error) throw error;
  return data as Kpi[];
}

export async function fetchAllKpis(): Promise<Kpi[]> {
  const { data, error } = await supabase.from('kpis').select('*').order('area_id, sort_order');
  if (error) throw error;
  return data as Kpi[];
}

export async function createKpi(kpi: {
  area_id: string;
  name: string;
  definition?: string;
  formula?: string;
  decision?: string;
  unit?: string;
  target_value?: number;
  sort_order?: number;
}): Promise<string> {
  const { data, error } = await supabase.from('kpis').insert({
    area_id: kpi.area_id,
    name: kpi.name,
    definition: kpi.definition ?? '',
    formula: kpi.formula ?? '',
    decision: kpi.decision ?? '',
    unit: kpi.unit ?? '%',
    sort_order: kpi.sort_order ?? 0,
  }).select('id').single();
  if (error) throw error;
  return (data as { id: string }).id;
}

export async function updateKpi(id: string, updates: Partial<Kpi>): Promise<void> {
  const { error } = await supabase.from('kpis').update(updates).eq('id', id);
  if (error) throw error;
}

export async function deleteKpi(id: string): Promise<void> {
  await supabase.from('kpi_data').delete().eq('kpi_id', id);
  await supabase.from('kpi_breakdowns').delete().eq('kpi_id', id);
  await supabase.from('formulas').delete().eq('kpi_id', id);
  await supabase.from('custom_fields').delete().eq('kpi_id', id);
  await supabase.from('data_entries').delete().eq('kpi_id', id);
  const { error } = await supabase.from('kpis').delete().eq('id', id);
  if (error) throw error;
}

export async function fetchFormulasByArea(areaId: string): Promise<Formula[]> {
  const kpis = await fetchKpisByArea(areaId);
  const kpiIds = kpis.map((k) => k.id);
  if (kpiIds.length === 0) return [];
  const { data, error } = await supabase.from('formulas').select('*').in('kpi_id', kpiIds).order('sort_order');
  if (error) throw error;
  return data as Formula[];
}

export async function fetchKpiData(kpiId: string): Promise<KpiData | null> {
  const { data, error } = await supabase.from('kpi_data').select('*').eq('kpi_id', kpiId).maybeSingle();
  if (error) throw error;
  return data as KpiData | null;
}

export async function fetchKpiBreakdowns(kpiId: string): Promise<KpiBreakdown[]> {
  const { data, error } = await supabase.from('kpi_breakdowns').select('*').eq('kpi_id', kpiId).order('sort_order');
  if (error) throw error;
  return data as KpiBreakdown[];
}

export async function fetchAreaWithKpis(areaId: string): Promise<AreaWithKpis | null> {
  const areas = await fetchAreas();
  const area = areas.find((a) => a.id === areaId);
  if (!area) return null;
  const kpis = await fetchKpisByArea(areaId);
  const kpisWithDetails = await Promise.all(
    kpis.map(async (kpi) => {
      const [data, breakdowns] = await Promise.all([fetchKpiData(kpi.id), fetchKpiBreakdowns(kpi.id)]);
      return { ...kpi, data: data ?? undefined, breakdowns: breakdowns ?? [] };
    })
  );
  return { ...area, kpis: kpisWithDetails };
}

export async function fetchAllAreasWithKpis(): Promise<AreaWithKpis[]> {
  const areas = await fetchAreas();
  const result: AreaWithKpis[] = [];
  for (const area of areas) {
    const awk = await fetchAreaWithKpis(area.id);
    if (awk) result.push(awk);
  }
  return result;
}

// === Profiles ===

export async function fetchProfiles(): Promise<Profile[]> {
  const { data, error } = await supabase.from('profiles').select('*').order('created_at');
  if (error) throw error;
  return data as Profile[];
}

export async function updateProfileRole(userId: string, role: UserRole): Promise<void> {
  const { error } = await supabase.from('profiles').update({ role }).eq('id', userId);
  if (error) throw error;
}

export async function updateProfileActive(userId: string, active: boolean): Promise<void> {
  const { error } = await supabase.from('profiles').update({ active }).eq('id', userId);
  if (error) throw error;
}

export async function updateProfileName(userId: string, fullName: string): Promise<void> {
  const { error } = await supabase.from('profiles').update({ full_name: fullName }).eq('id', userId);
  if (error) throw error;
}

// === User management edge function ===

export async function adminCreateUser(params: {
  email: string;
  password: string;
  full_name: string;
  role: UserRole;
  area_ids: string[];
}, token: string): Promise<void> {
  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ action: 'create', ...params }),
    }
  );
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Error al crear usuario');
}

export async function adminUpdatePassword(userId: string, password: string, token: string): Promise<void> {
  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ action: 'update_password', user_id: userId, password }),
    }
  );
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Error al cambiar contraseña');
}

export async function adminDeleteUser(userId: string, token: string): Promise<void> {
  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ action: 'delete', user_id: userId }),
    }
  );
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Error al eliminar usuario');
}

// === User Areas (permissions) ===

export async function fetchUserAreas(userId: string): Promise<UserArea[]> {
  const { data, error } = await supabase.from('user_areas').select('*').eq('user_id', userId);
  if (error) throw error;
  return data as UserArea[];
}

export async function fetchAllUserAreas(): Promise<UserArea[]> {
  const { data, error } = await supabase.from('user_areas').select('*');
  if (error) throw error;
  return data as UserArea[];
}

export async function addUserArea(userId: string, areaId: string): Promise<void> {
  const { error } = await supabase.from('user_areas').insert({ user_id: userId, area_id: areaId });
  if (error) throw error;
}

export async function removeUserArea(userId: string, areaId: string): Promise<void> {
  const { error } = await supabase.from('user_areas')
    .delete()
    .eq('user_id', userId)
    .eq('area_id', areaId);
  if (error) throw error;
}

// === Data Entries ===

export async function fetchDataEntries(kpiId: string): Promise<DataEntryWithProfile[]> {
  const { data, error } = await supabase
    .from('data_entries')
    .select('*, profiles(full_name, email), kpis(name, unit)')
    .eq('kpi_id', kpiId)
    .order('entry_date', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as DataEntryWithProfile[];
}

export async function createDataEntry(entry: {
  kpi_id: string;
  value: number;
  entry_date: string;
  notes?: string;
  results_json?: Record<string, { label: string; value: number }>;
  inputs_json?: Record<string, { label: string; value: number }>;
}): Promise<void> {
  const { error } = await supabase.from('data_entries').insert(entry);
  if (error) throw error;
}

export async function deleteDataEntry(id: string): Promise<void> {
  const { error } = await supabase.from('data_entries').delete().eq('id', id);
  if (error) throw error;
}

// === KPI Data update ===

export async function updateKpiDataFromEntry(kpiId: string, value: number): Promise<void> {
  const { data: existing } = await supabase.from('kpi_data').select('*').eq('kpi_id', kpiId).maybeSingle();

  if (existing) {
    const prev = (existing as KpiData).current_value;
    const series = (existing as KpiData).series ?? [];
    const months = ['Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep'];
    const newSeries = series.length >= 6
      ? [...series.slice(1), { month: months[5], value }]
      : [...series, { month: months[series.length] ?? 'Sep', value }];

    const trend = value > prev ? 'up' : value < prev ? 'down' : 'stable';

    const { error } = await supabase
      .from('kpi_data')
      .update({
        previous_value: prev,
        current_value: value,
        trend,
        series: newSeries,
        updated_at: new Date().toISOString(),
      })
      .eq('kpi_id', kpiId);
    if (error) throw error;
  } else {
    const { data: kpi } = await supabase.from('kpis').select('*').eq('id', kpiId).maybeSingle();
    if (!kpi) return;
    const months = ['Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep'];
    const series = months.map((m) => ({ month: m, value: value * (0.8 + Math.random() * 0.4) }));

    const { error } = await supabase.from('kpi_data').insert({
      kpi_id: kpiId,
      current_value: value,
      target_value: 85,
      previous_value: value * 0.95,
      trend: 'up',
      series,
    });
    if (error) throw error;
  }
}

// === Custom Fields ===

export async function fetchCustomFields(areaId?: string): Promise<CustomField[]> {
  let query = supabase.from('custom_fields').select('*').order('sort_order');
  if (areaId) query = query.eq('area_id', areaId);
  const { data, error } = await query;
  if (error) throw error;
  return (data as CustomField[]).map((f) => ({ ...f, options: f.options ?? [] }));
}

export async function fetchCustomFieldsByKpi(kpiId: string): Promise<CustomField[]> {
  const { data, error } = await supabase.from('custom_fields').select('*').eq('kpi_id', kpiId).order('sort_order');
  if (error) throw error;
  return (data as CustomField[]).map((f) => ({ ...f, options: f.options ?? [] }));
}

export async function fetchCustomFieldsByArea(areaId: string): Promise<CustomField[]> {
  const { data, error } = await supabase.from('custom_fields').select('*').eq('area_id', areaId).order('sort_order');
  if (error) throw error;
  return (data as CustomField[]).map((f) => ({ ...f, options: f.options ?? [] }));
}

export async function createCustomField(field: {
  area_id: string;
  kpi_id: string | null;
  name: string;
  label: string;
  field_type: string;
  field_role?: 'input' | 'result';
  options?: string[];
  color?: string;
  unit?: string;
  hidden_in_entry?: boolean;
  hidden_in_dashboard?: boolean;
  sort_order?: number;
}): Promise<void> {
  const { error } = await supabase.from('custom_fields').insert({
    ...field,
    field_role: field.field_role ?? 'input',
    options: field.options ?? [],
    color: field.color ?? 'emerald',
    unit: field.unit ?? '%',
    hidden_in_entry: field.hidden_in_entry ?? false,
    hidden_in_dashboard: field.hidden_in_dashboard ?? false,
    sort_order: field.sort_order ?? 0,
  });
  if (error) throw error;
}

export async function updateCustomField(id: string, updates: Partial<CustomField>): Promise<void> {
  const { error } = await supabase.from('custom_fields').update(updates).eq('id', id);
  if (error) throw error;
}

export async function deleteCustomField(id: string): Promise<void> {
  const { error } = await supabase.from('custom_fields').delete().eq('id', id);
  if (error) throw error;
}

export async function reorderCustomFields(orderedIds: string[]): Promise<void> {
  for (let i = 0; i < orderedIds.length; i++) {
    const { error } = await supabase.from('custom_fields').update({ sort_order: i }).eq('id', orderedIds[i]);
    if (error) throw error;
  }
}

export async function reorderFormulas(orderedIds: string[]): Promise<void> {
  for (let i = 0; i < orderedIds.length; i++) {
    const { error } = await supabase.from('formulas').update({ sort_order: i }).eq('id', orderedIds[i]);
    if (error) throw error;
  }
}

// === Field Values ===

export async function fetchFieldValues(fieldId: string): Promise<FieldValue[]> {
  const { data, error } = await supabase.from('field_values').select('*').eq('field_id', fieldId).order('created_at', { ascending: false });
  if (error) throw error;
  return data as FieldValue[];
}

export async function fetchLatestFieldValues(fieldIds: string[]): Promise<FieldValue[]> {
  if (fieldIds.length === 0) return [];
  const { data, error } = await supabase.from('field_values').select('*').in('field_id', fieldIds).order('created_at', { ascending: false });
  if (error) throw error;
  return data as FieldValue[];
}

export async function createFieldValue(value: {
  field_id: string;
  value_text?: string;
  value_number?: number | null;
  value_date?: string | null;
  entry_date?: string;
}): Promise<void> {
  const { error } = await supabase.from('field_values').insert(value);
  if (error) throw error;
}

export async function deleteFieldValuesByDate(entryDate: string, fieldIds: string[]): Promise<void> {
  if (fieldIds.length === 0) return;
  const { error } = await supabase
    .from('field_values')
    .delete()
    .in('field_id', fieldIds)
    .eq('entry_date', entryDate);
  if (error) throw error;
}

// === Formulas ===

export async function fetchFormulas(kpiId?: string): Promise<Formula[]> {
  let query = supabase.from('formulas').select('*').order('sort_order');
  if (kpiId) query = query.eq('kpi_id', kpiId);
  const { data, error } = await query;
  if (error) throw error;
  return data as Formula[];
}

export async function createFormula(formula: {
  kpi_id: string;
  name: string;
  expression: string;
  field_mapping: Record<string, string>;
  result_field_id?: string | null;
  sort_order?: number;
}): Promise<void> {
  const { error } = await supabase.from('formulas').insert({
    ...formula,
    result_field_id: formula.result_field_id ?? null,
    sort_order: formula.sort_order ?? 0,
  });
  if (error) throw error;
}

export async function updateFormula(id: string, updates: Partial<Formula>): Promise<void> {
  const { error } = await supabase.from('formulas').update(updates).eq('id', id);
  if (error) throw error;
}

export async function deleteFormula(id: string): Promise<void> {
  const { error } = await supabase.from('formulas').delete().eq('id', id);
  if (error) throw error;
}

// === API Connections ===

export async function fetchApiConnections(): Promise<ApiConnection[]> {
  const { data, error } = await supabase.from('api_connections').select('*').order('created_at');
  if (error) throw error;
  return data as ApiConnection[];
}

export async function createApiConnection(conn: {
  name: string;
  base_url: string;
  auth_type: string;
  auth_config: Record<string, string>;
  api_key?: string | null;
}): Promise<void> {
  const { error } = await supabase.from('api_connections').insert(conn);
  if (error) throw error;
}

export async function updateApiConnection(id: string, updates: Partial<ApiConnection>): Promise<void> {
  const { error } = await supabase.from('api_connections').update(updates).eq('id', id);
  if (error) throw error;
}

export async function deleteApiConnection(id: string): Promise<void> {
  const { error } = await supabase.from('api_connections').delete().eq('id', id);
  if (error) throw error;
}

// === Firecrawl Connections ===

export async function fetchFirecrawlConnections(): Promise<FirecrawlConnection[]> {
  const { data, error } = await supabase.from('firecrawl_connections').select('*').order('created_at');
  if (error) throw error;
  return data as FirecrawlConnection[];
}

export async function createFirecrawlConnection(conn: {
  name: string;
  target_url: string;
  credentials: Record<string, string>;
}): Promise<void> {
  const { error } = await supabase.from('firecrawl_connections').insert(conn);
  if (error) throw error;
}

export async function updateFirecrawlConnection(id: string, updates: Partial<FirecrawlConnection>): Promise<void> {
  const { error } = await supabase.from('firecrawl_connections').update(updates).eq('id', id);
  if (error) throw error;
}

export async function deleteFirecrawlConnection(id: string): Promise<void> {
  const { error } = await supabase.from('firecrawl_connections').delete().eq('id', id);
  if (error) throw error;
}

// === Data Source Config ===

export async function fetchDataSourceConfigs(): Promise<DataSourceConfig[]> {
  const { data, error } = await supabase.from('data_source_config').select('*');
  if (error) throw error;
  return data as DataSourceConfig[];
}

export async function upsertDataSourceConfig(config: {
  kpi_id: string;
  source_type: string;
  api_connection_id?: string | null;
  firecrawl_connection_id?: string | null;
}): Promise<void> {
  const { error } = await supabase.from('data_source_config').upsert(config, { onConflict: 'kpi_id' });
  if (error) throw error;
}

// === Test Connections (edge function) ===

export async function testApiConnection(conn: {
  base_url: string;
  auth_type: string;
  auth_config: Record<string, string>;
}, _token: string): Promise<{ success: boolean; message: string }> {
  const { data, error } = await supabase.functions.invoke('test-connection', {
    body: { action: 'test_api', ...conn },
  });
  if (error) return { success: false, message: 'No se pudo verificar la conexión API.' };
  return { success: Boolean(data?.success), message: data?.message ?? 'No se pudo verificar la conexión API.' };
}

export async function testFirecrawlConnection(conn: {
  target_url: string;
  credentials: Record<string, string>;
}, _token: string): Promise<{ success: boolean; message: string }> {
  const { data, error } = await supabase.functions.invoke('test-connection', {
    body: { action: 'test_firecrawl', ...conn },
  });
  if (error) return { success: false, message: 'No se pudo verificar la conexión Firecrawl.' };
  return { success: Boolean(data?.success), message: data?.message ?? 'No se pudo verificar la conexión Firecrawl.' };
}

// === Griba Leads ===

export async function fetchGribaLeads(): Promise<GribaLead[]> {
  const { data, error } = await supabase.from('griba_leads').select('*').order('fetched_at', { ascending: false });
  if (error) throw error;
  return data as GribaLead[];
}

export async function fetchGribaDataFromApi(conn: {
  base_url: string;
  auth_type: string;
  auth_config: Record<string, string>;
  endpoint?: string;
}, _token: string): Promise<{ success: boolean; leads: unknown[]; message?: string }> {
  const { data, error } = await supabase.functions.invoke('test-connection', {
    body: { action: 'fetch_griba', ...conn },
  });
  if (error) return { success: false, leads: [], message: 'No se pudo conectar con Griba.' };
  return { success: Boolean(data?.success), leads: Array.isArray(data?.leads) ? data.leads : [], message: data?.message };
}

export async function fetchGribaDataViaFirecrawl(params: {
  target_url: string;
  api_key: string;
  auth_type?: string;
  auth_config?: Record<string, string>;
}, _token: string): Promise<{ success: boolean; leads: unknown[]; message?: string }> {
  const { data, error } = await supabase.functions.invoke('test-connection', {
    body: { action: 'fetch_griba_firecrawl', ...params },
  });
  if (error) return { success: false, leads: [], message: 'No se pudo conectar con Firecrawl.' };
  return { success: Boolean(data?.success), leads: Array.isArray(data?.leads) ? data.leads : [], message: data?.message };
}

export interface GribaSection {
  id: string;
  title: string;
  url: string;
  preview: string;
  dataCount: number;
  hasData: boolean;
  markdown: string;
}

export async function crawlGribaSite(params: {
  target_url: string;
  api_key: string;
  auth_type?: string;
  auth_config?: Record<string, string>;
}, _token: string): Promise<{ success: boolean; sections?: GribaSection[]; message?: string }> {
  const { data, error } = await supabase.functions.invoke('test-connection', {
    body: { action: 'crawl_griba_firecrawl', ...params },
  });
  if (error) return { success: false, message: 'No se pudo conectar con Firecrawl.' };
  return { success: Boolean(data?.success), sections: Array.isArray(data?.sections) ? data.sections : [], message: data?.message };
}

export async function scrapeGribaPage(params: {
  target_url: string;
  api_key: string;
  auth_type?: string;
  auth_config?: Record<string, string>;
}, _token: string): Promise<{ success: boolean; leads: unknown[]; message?: string; title?: string }> {
  const { data, error } = await supabase.functions.invoke('test-connection', {
    body: { action: 'scrape_griba_page', ...params },
  });
  if (error) return { success: false, leads: [], message: 'No se pudo conectar con Firecrawl.' };
  return { success: Boolean(data?.success), leads: Array.isArray(data?.leads) ? data.leads : [], message: data?.message, title: data?.title };
}

export async function upsertGribaLeads(leads: Array<Record<string, unknown>>): Promise<void> {
  if (leads.length === 0) return;
  const rows = leads.map((lead) => ({
    external_id: String(lead.id ?? lead.external_id ?? ''),
    name: String(lead.name ?? lead.nombre ?? ''),
    email: String(lead.email ?? lead.correo ?? ''),
    phone: String(lead.phone ?? lead.telefono ?? lead.celular ?? ''),
    source: String(lead.source ?? lead.origen ?? 'Griba'),
    status: String(lead.status ?? lead.estado ?? 'nuevo'),
    vehicle_interest: String(lead.vehicle_interest ?? lead.vehiculo ?? lead.modelo ?? ''),
    notes: String(lead.notes ?? lead.observaciones ?? ''),
    raw_data: lead,
    fetched_at: new Date().toISOString(),
  }));
  const { error } = await supabase.from('griba_leads').upsert(rows, { onConflict: 'external_id' });
  if (error) throw error;
}

export async function deleteGribaLead(id: string): Promise<void> {
  const { error } = await supabase.from('griba_leads').delete().eq('id', id);
  if (error) throw error;
}

// === Notifications ===

export async function fetchNotifications(targetRole: 'gerente' | 'admin'): Promise<Notification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('target_role', targetRole)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  const notifs = data as Notification[];
  // Fetch profiles separately since FK references auth.users (cross-schema, not joinable by PostgREST)
  const userIds = [...new Set(notifs.map((n) => n.user_id).filter(Boolean))] as string[];
  if (userIds.length > 0) {
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .in('id', userIds);
    const profileMap = new Map((profilesData ?? []).map((p) => [p.id, p]));
    for (const n of notifs) {
      const p = profileMap.get(n.user_id);
      (n as Notification & { profiles?: { full_name?: string; email?: string } }).profiles = p
        ? { full_name: p.full_name, email: p.email }
        : undefined;
    }
  }
  return notifs;
}

export async function createNotification(notif: {
  target_role: 'gerente' | 'admin';
  area_id?: string | null;
  kpi_id?: string | null;
  action: string;
  message: string;
}): Promise<void> {
  const { error } = await supabase.from('notifications').insert(notif);
  if (error) throw error;
}

export async function markNotificationRead(id: string): Promise<void> {
  const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', id);
  if (error) throw error;
}

export async function deleteNotification(id: string): Promise<void> {
  const { error } = await supabase.from('notifications').delete().eq('id', id);
  if (error) throw error;
}

export async function deleteReadNotifications(targetRole: 'gerente' | 'admin'): Promise<void> {
  const { error } = await supabase.from('notifications').delete().eq('is_read', true).eq('target_role', targetRole);
  if (error) throw error;
}
