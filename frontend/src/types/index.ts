export interface User {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'reservoir_engineer' | 'field_engineer' | 'ops_manager';
  is_active: boolean;
  created_at?: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  role: 'admin' | 'reservoir_engineer' | 'field_engineer' | 'ops_manager';
  email: string;
  full_name: string;
}

export interface WellSummary {
  id: string;
  name: string;
  field_name: string;
  reservoir_formation: string;
  api_gravity: number;
  reservoir_temp_c: number;
  status: 'active' | 'shut_in' | 'workover';
  current_alert_level: 'normal' | 'warning' | 'critical';
  rod_failure_risk_band: 'low' | 'medium' | 'high';
  latest_classification: 'normal' | 'fluid_pound' | 'gas_interference' | 'pump_off' | 'worn_valve' | 'uncertain';
}

export interface WellListResponse {
  items: WellSummary[];
  total: number;
  page: number;
  page_size: number;
}

export interface AlertListResponse {
  items: Alert[];
  total: number;
  page: number;
  page_size: number;
}

export interface ReservoirState {
  estimated_temp_c: number;
  days_since_last_steam: number;
  estimated_viscosity_cp: number;
  forecast_confidence: 'in_range' | 'field_default' | 'extrapolated';
}

export interface CurrentCycleState {
  id: string | null;
  cycle_number: number;
  status: 'planned' | 'injecting' | 'soaking' | 'producing' | 'completed';
  steam_volume_m3: number;
  soak_time_hours: number;
  cumulative_oil_bbl?: number;
}

export interface SrpState {
  latest_card_id: string | null;
  classification: 'normal' | 'fluid_pound' | 'gas_interference' | 'pump_off' | 'worn_valve' | 'uncertain';
  classification_confidence: number | null;
  estimated_fillage_pct: number;
  current_spm: number;
  stroke_length_in: number;
  vfd_frequency_hz?: number;
}

export interface RodFailureRiskState {
  score: number;
  band: 'low' | 'medium' | 'high';
  factors: string[];
}

export interface OptimizationRun {
  id: string;
  well_id: string;
  run_type: 'css' | 'srp';
  requested_by?: string;
  requested_at: string;
  input_params?: Record<string, any>;
  recommended_params: Record<string, any>;
  predicted_metrics: Record<string, any>;
  status: 'pending' | 'approved' | 'rejected';
  decided_by?: string;
  decided_at?: string;
  rejection_reason?: string;
}

export interface DigitalTwinState {
  well_id: string;
  well_name: string;
  api_gravity: number;
  reservoir_temp_baseline_c: number;
  computed_at: string;
  reservoir: ReservoirState;
  current_cycle: CurrentCycleState | null;
  srp: SrpState;
  rod_failure_risk: RodFailureRiskState;
  pending_recommendations: OptimizationRun[];
}

export interface DynoPoint {
  position_in: number;
  load_lbf: number;
}

export interface DynoCard {
  id: string;
  well_id: string;
  card_time: string;
  points: DynoPoint[];
  pprl_lbf: number;
  mprl_lbf: number;
  card_area: number;
  classification: 'normal' | 'fluid_pound' | 'gas_interference' | 'pump_off' | 'worn_valve' | 'uncertain';
  classification_confidence: number | null;
  is_synthetic: boolean;
}

export interface PredictedSrpImpact {
  est_viscosity_at_start_cp: number;
  recommended_initial_spm: number;
  expected_fillage_pct: number;
}

export interface CssCandidate {
  steam_volume_m3: number;
  soak_time_hours: number;
  predicted_sor: number;
  predicted_cumulative_oil_bbl: number;
  predicted_srp_impact: PredictedSrpImpact;
}

export interface CssOptimizeResponse {
  candidates: CssCandidate[];
  forecast_confidence: 'in_range' | 'field_default' | 'extrapolated';
  warning?: string;
}

export interface SrpOptimizeResponse {
  recommended_spm: number;
  recommended_stroke_length_in: number;
  predicted_fillage_pct: number;
  rod_stress_check: 'within_limit' | 'exceeds_limit';
  predicted_stress_psi: number;
  allowable_stress_psi: number;
  optimization_run_id: string;
  message?: string;
}

export interface Alert {
  id: string;
  well_id: string;
  well_name?: string;
  alert_type: 'fluid_pound' | 'high_risk' | 'sor_trending_up' | 'pump_off';
  severity: 'info' | 'warning' | 'critical';
  message: string;
  created_at: string;
  acknowledged_by?: string;
  acknowledged_at?: string;
}

export interface TrendPoint {
  date: string;
  value: number;
}

export interface FieldSummary {
  period_days: number;
  current_sor: number;
  target_sor: number;
  current_energy_kwh_per_bbl: number;
  target_energy_kwh_per_bbl: number;
  active_wells_count: number;
  high_risk_wells_count: number;
  active_alerts_count: number;
  sor_trend: TrendPoint[];
  energy_per_bbl_trend: TrendPoint[];
  rod_failure_trend: TrendPoint[];
  wells_leaderboard: Array<{
    well_id: string;
    well_name: string;
    status: string;
    api_gravity: number;
    risk_score: number;
    risk_band: 'low' | 'medium' | 'high';
    classification: string;
    sor: number;
  }>;
}
