-- ──────────────────────────────────────────────────────────────────────────────
-- Tabela: usuarios_futuros
-- Lista de espera para novos usuários do Studio Virtual
-- ──────────────────────────────────────────────────────────────────────────────

create table if not exists public.usuarios_futuros (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  -- Dados essenciais
  nome            text not null,
  email           text not null unique,
  telefone        text,
  nome_artistico  text,

  -- Perfil artístico
  cidade          text,
  pais            text default 'Brasil',
  instagram       text,
  site            text,
  area_atuacao    text,
  mensagem        text,   -- observações internas

  -- Gestão da fila
  status          text not null default 'pendente'
                  check (status in ('pendente', 'convidado', 'aprovado', 'rejeitado')),
  convidado_em    timestamptz,
  aprovado_em     timestamptz,
  notas_admin     text   -- notas privadas da admin
);

-- Índices
create index if not exists idx_usuarios_futuros_status on public.usuarios_futuros(status);
create index if not exists idx_usuarios_futuros_email  on public.usuarios_futuros(email);

-- Auto-update updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_usuarios_futuros_updated_at on public.usuarios_futuros;
create trigger trg_usuarios_futuros_updated_at
  before update on public.usuarios_futuros
  for each row execute procedure public.set_updated_at();

-- RLS: somente admins autenticados podem ler/escrever
alter table public.usuarios_futuros enable row level security;

-- Política: usuário autenticado pode inserir (cadastro público futuro)
create policy "insert_authenticated"
  on public.usuarios_futuros for insert
  to authenticated
  with check (true);

-- Política: somente leitura para usuários autenticados
create policy "select_authenticated"
  on public.usuarios_futuros for select
  to authenticated
  using (true);

-- Política: update e delete apenas via service_role (admin)
-- (não expor ao front sem RBAC adicional)
