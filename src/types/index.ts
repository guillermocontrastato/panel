export interface Area {
  id: string;
  slug: string;
  name: string;
  icon: string;
  description: string;
  sort_order: number;
  color: string;
}

export interface Kpi {
  id: string;
  area_id: string;
  name: string;
  definition: string;
  formula: string;
  decision: string;
  unit: string;
  target_direction: 'up' | 'down';
  sort_order: number;
}

export interface SeriesPoint {
  month: string;
  value: number;
}

export interface KpiData {
  id: string;
  kpi_id: string;
  current_value: number;
  target_value: number;
  previous_value: number;
  trend: 'up' | 'down' | 'stable';
  series: SeriesPoint[];
  updated_at: string;
}

export interface KpiBreakdown {
  id: string;
  kpi_id: string;
  label: string;
  value: number;
  target: number | null;
  extra: Record<string, unknown>;
  sort_order: number;
}

export interface KpiWithDetails extends Kpi {
  data?: KpiData;
  breakdowns?: KpiBreakdown[];
}

export interface AreaWithKpis extends Area {
  kpis: KpiWithDetails[];
}

export type UserRole = 'admin' | 'gerente' | 'operador';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  active: boolean;
  created_at: string;
}

export interface UserArea {
  id: string;
  user_id: string;
  area_id: string;
}

export interface DataEntry {
  id: string;
  kpi_id: string;
  user_id: string;
  value: number;
  entry_date: string;
  notes: string;
  results_json: Record<string, { label: string; value: number }> | null;
  inputs_json: Record<string, { label: string; value: number }> | null;
  created_at: string;
}

export interface DataEntryWithProfile extends DataEntry {
  profiles?: { full_name: string; email: string };
  kpis?: { name: string; unit: string };
}

export type FieldType = 'text' | 'numeric' | 'date' | 'datetime' | 'boolean' | 'select' | 'textarea';

export interface CustomField {
  id: string;
  area_id: string;
  kpi_id: string | null;
  name: string;
  label: string;
  field_type: FieldType;
  field_role: 'input' | 'result';
  options: string[];
  color: string;
  unit: string;
  hidden_in_entry: boolean;
  hidden_in_dashboard: boolean;
  sort_order: number;
  created_at: string;
}

export interface FieldValue {
  id: string;
  field_id: string;
  user_id: string;
  value_text: string;
  value_number: number | null;
  value_date: string | null;
  entry_date: string;
  created_at: string;
}

export interface Formula {
  id: string;
  kpi_id: string;
  name: string;
  expression: string;
  field_mapping: Record<string, string>;
  result_field_id: string | null;
  sort_order: number;
  created_at: string;
}

export interface ApiConnection {
  id: string;
  name: string;
  base_url: string;
  auth_type: 'bearer' | 'api_key' | 'basic' | 'none';
  auth_config: Record<string, string>;
  api_key: string | null;
  is_active: boolean;
  created_at: string;
}

export interface FirecrawlConnection {
  id: string;
  name: string;
  target_url: string;
  credentials: Record<string, string>;
  is_active: boolean;
  created_at: string;
}

export type DataSourceType = 'operator' | 'external' | 'both';

export interface DataSourceConfig {
  id: string;
  kpi_id: string;
  source_type: DataSourceType;
  api_connection_id: string | null;
  firecrawl_connection_id: string | null;
  created_at: string;
}

export interface GribaLead {
  id: string;
  external_id: string | null;
  name: string | null;
  email: string | null;
  phone: string | null;
  source: string | null;
  status: string;
  vehicle_interest: string | null;
  notes: string | null;
  raw_data: Record<string, unknown>;
  created_at: string;
  fetched_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  target_role: 'gerente' | 'admin';
  area_id: string | null;
  kpi_id: string | null;
  action: string;
  message: string;
  is_read: boolean;
  created_at: string;
  profiles?: { full_name: string; email: string };
}
