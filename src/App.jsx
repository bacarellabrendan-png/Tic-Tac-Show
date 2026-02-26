-- TIC TAC SHOW — Complete Database Setup

-- ── GAMES TABLE ──────────────────────────────────────────────────
create table if not exists public.games (
  id uuid default gen_random_uuid() primary key,
  invite_code text unique not null,
  difficulty text not null,
  cells jsonb not null,
  board jsonb default '["null","null","null","null","null","null","null","null","null"]',
  player1_id uuid references auth.users(id) not null,
  player2_id uuid references auth.users(id),
  player1_name text,
  player2_name text,
  choosing_player text default 'p1',
  active_cell int,
  phase text default 'waiting',
  winner text,
  win_line jsonb default '[]',
  scores jsonb default '{"p1":0,"p2":0}',
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- ── MOVES TABLE ──────────────────────────────────────────────────
create table if not exists public.moves (
  id uuid default gen_random_uuid() primary key,
  game_id uuid references public.games(id) not null,
  cell_index int not null,
  question_key text not null,
  p1_answer text,
  p2_answer text,
  p1_rarity int,
  p2_rarity int,
  p1_valid boolean,
  p2_valid boolean,
  result text,
  created_at timestamp with time zone default now()
);

-- ── ROW LEVEL SECURITY ───────────────────────────────────────────
alter table public.games enable row level security;
alter table public.moves enable row level security;

drop policy if exists "Anyone can read games" on public.games;
drop policy if exists "Authenticated users can create games" on public.games;
drop policy if exists "Players can update their own games" on public.games;
drop policy if exists "Players can read moves for their games" on public.moves;
drop policy if exists "Players can insert moves" on public.moves;
drop policy if exists "Players can update moves" on public.moves;

create policy "Anyone can read games"
  on public.games for select using (true);

create policy "Authenticated users can create games"
  on public.games for insert
  with check (auth.uid() = player1_id);

create policy "Players can update their own games"
  on public.games for update
  using (auth.uid() = player1_id or auth.uid() = player2_id);

create policy "Anyone can read moves"
  on public.moves for select using (true);

create policy "Players can insert moves"
  on public.moves for insert
  with check (
    exists (
      select 1 from public.games
      where games.id = moves.game_id
      and (games.player1_id = auth.uid() or games.player2_id = auth.uid())
    )
  );

create policy "Players can update moves"
  on public.moves for update
  using (
    exists (
      select 1 from public.games
      where games.id = moves.game_id
      and (games.player1_id = auth.uid() or games.player2_id = auth.uid())
    )
  );

-- ── REALTIME ─────────────────────────────────────────────────────
alter publication supabase_realtime add table public.games;
alter publication supabase_realtime add table public.moves;

-- ── AUTO UPDATE TIMESTAMP ────────────────────────────────────────
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists games_updated_at on public.games;
create trigger games_updated_at
  before update on public.games
  for each row execute function update_updated_at();

-- ── VERIFY ───────────────────────────────────────────────────────
select table_name from information_schema.tables
where table_schema = 'public'
order by table_name;
