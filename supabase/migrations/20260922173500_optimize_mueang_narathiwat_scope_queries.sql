create index if not exists idx_home_search_records_amphoe_id
  on public.home_search_records (amphoe, id);

create index if not exists idx_cctv_locations_area_id
  on public.cctv_locations (area, id);

create index if not exists idx_vehicle_alerts_station_reported
  on public.vehicle_alerts (police_station, reported_at desc);

create index if not exists idx_incidents_district_occurred
  on public.incidents (district, occurred_at desc);

create index if not exists idx_economic_data_coordinates
  on public.economic_data (lat, lng);

create index if not exists idx_risk_person_records_coordinates
  on public.risk_person_records (latitude, longitude);

create index if not exists idx_risk_areas_center_coordinates
  on public.risk_areas (center_lat, center_lng);
