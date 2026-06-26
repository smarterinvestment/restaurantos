-- RLS para tablas de notificaciones (ejecutar en Supabase SQL Editor)
-- Las tablas deben existir antes de correr este script.

alter table if exists notifications            enable row level security;
alter table if exists push_subscriptions       enable row level security;
alter table if exists notification_preferences enable row level security;

-- Eliminar policies previas si existen (idempotente)
drop policy if exists "own notifications"    on notifications;
drop policy if exists "own push subs"        on push_subscriptions;
drop policy if exists "own prefs"            on notification_preferences;

-- Cada usuario accede solo a sus propios registros
create policy "own notifications"
  on notifications for all
  using (auth.uid() = user_id);

create policy "own push subs"
  on push_subscriptions for all
  using (auth.uid() = user_id);

create policy "own prefs"
  on notification_preferences for all
  using (auth.uid() = user_id);
