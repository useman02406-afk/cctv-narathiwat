-- Camera categories and shared map marker styles define the visual standard
-- for every module. Only administrators may change them.
drop policy if exists camera_categories_manage_staff on public.camera_categories;
create policy camera_categories_manage_admin
on public.camera_categories
for all
to authenticated
using ((select public.current_app_role()) = 'ADMIN')
with check ((select public.current_app_role()) = 'ADMIN');

drop policy if exists map_marker_categories_manage_staff on public.map_marker_categories;
create policy map_marker_categories_manage_admin
on public.map_marker_categories
for all
to authenticated
using ((select public.current_app_role()) = 'ADMIN')
with check ((select public.current_app_role()) = 'ADMIN');
