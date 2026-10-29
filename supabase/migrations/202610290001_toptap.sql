-- TopTap data is kept separate from legacy TapFi tables in the same project.
create table if not exists public.toptap_players (
  telegram_id bigint primary key,
  username text,
  first_name text,
  last_name text,
  photo_url text,
  balance bigint not null default 0 check (balance >= 0),
  energy integer not null default 1000 check (energy >= 0),
  max_energy integer not null default 1000 check (max_energy > 0),
  last_energy_update timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.toptap_players enable row level security;
revoke all on table public.toptap_players from anon, authenticated;
create or replace function public.toptap_award(p_telegram_id bigint,p_username text,p_first_name text,p_last_name text,p_photo_url text,p_tap_count integer)
returns table(balance bigint, energy integer, max_energy integer, taps_awarded integer)
language plpgsql security definer set search_path = public, pg_temp
as $$
declare v_player public.toptap_players%rowtype; v_now timestamptz := clock_timestamp(); v_regenerated integer; v_awarded integer;
begin
  if p_telegram_id is null or p_telegram_id <= 0 then raise exception 'Invalid Telegram user'; end if;
  if p_tap_count is null or p_tap_count < 0 or p_tap_count > 20 then raise exception 'Invalid tap count'; end if;
  insert into public.toptap_players (telegram_id, username, first_name, last_name, photo_url)
  values (p_telegram_id, p_username, p_first_name, p_last_name, p_photo_url)
  on conflict (telegram_id) do update set username=excluded.username, first_name=excluded.first_name, last_name=excluded.last_name, photo_url=excluded.photo_url, updated_at=v_now
  returning * into v_player;
  v_regenerated := least(v_player.max_energy-v_player.energy,greatest(0,floor(extract(epoch from (v_now-v_player.last_energy_update))/3)::integer));
  v_player.energy := v_player.energy+v_regenerated;
  if v_player.energy >= v_player.max_energy then v_player.last_energy_update := v_now;
  elsif v_regenerated > 0 then v_player.last_energy_update := v_player.last_energy_update+make_interval(secs=>v_regenerated*3); end if;
  v_awarded := least(p_tap_count,v_player.energy);
  v_player.energy := v_player.energy-v_awarded;
  v_player.balance := v_player.balance+v_awarded;
  v_player.updated_at := v_now;
  update public.toptap_players p set balance=v_player.balance, energy=v_player.energy, last_energy_update=v_player.last_energy_update, updated_at=v_player.updated_at where p.telegram_id=p_telegram_id;
  return query select v_player.balance,v_player.energy,v_player.max_energy,v_awarded;
end; $$;
revoke all on function public.toptap_award(bigint,text,text,text,text,integer) from public, anon, authenticated;
grant execute on function public.toptap_award(bigint,text,text,text,text,integer) to service_role;
