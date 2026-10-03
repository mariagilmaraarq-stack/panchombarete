-- ==============================================================================
-- PANCHO MBARATE — MIGRATION: MÓDULO DE PRECIFICAÇÃO E CUSTOS
-- Execute este script no SQL Editor do seu projeto Supabase
-- ==============================================================================

-- 1. TABELA DE CONFIGURAÇÕES GERAIS DE PRECIFICAÇÃO
CREATE TABLE IF NOT EXISTS public.pricing_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    monthly_projected_revenue NUMERIC NOT NULL DEFAULT 35000000 CHECK (monthly_projected_revenue >= 0),
    target_profit_percent NUMERIC NOT NULL DEFAULT 20 CHECK (target_profit_percent >= 0 AND target_profit_percent < 100),
    target_profit_fixed_gs NUMERIC DEFAULT NULL CHECK (target_profit_fixed_gs IS NULL OR target_profit_fixed_gs >= 0),
    use_fixed_profit BOOLEAN NOT NULL DEFAULT false,
    tax_percent NUMERIC NOT NULL DEFAULT 10 CHECK (tax_percent >= 0 AND tax_percent < 100),
    waste_percent NUMERIC NOT NULL DEFAULT 2.5 CHECK (waste_percent >= 0 AND waste_percent < 100),
    maintenance_percent NUMERIC NOT NULL DEFAULT 2 CHECK (maintenance_percent >= 0 AND maintenance_percent < 100),
    other_variable_percent NUMERIC NOT NULL DEFAULT 1.5 CHECK (other_variable_percent >= 0 AND other_variable_percent < 100),
    monthly_projections JSONB DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. TABELA DE CUSTOS FIXOS MENSAIS
CREATE TABLE IF NOT EXISTS public.fixed_costs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    description TEXT NOT NULL,
    monthly_value NUMERIC NOT NULL CHECK (monthly_value >= 0),
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fixed_costs_sort ON public.fixed_costs(sort_order, created_at);

-- 3. TABELA DE CANAIS DE VENDA / FORMAS DE PAGAMENTO
CREATE TABLE IF NOT EXISTS public.sales_channels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    fee_percent NUMERIC NOT NULL DEFAULT 0 CHECK (fee_percent >= 0 AND fee_percent <= 100),
    share_percent NUMERIC NOT NULL DEFAULT 0 CHECK (share_percent >= 0 AND share_percent <= 100),
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sales_channels_sort ON public.sales_channels(sort_order, created_at);

-- 4. ATIVAR ROW LEVEL SECURITY (RLS)
ALTER TABLE public.pricing_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fixed_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_channels ENABLE ROW LEVEL SECURITY;

-- 5. POLÍTICAS DE ACESSO
CREATE POLICY "Admins podem gerenciar pricing_settings"
ON public.pricing_settings FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Admins podem gerenciar fixed_costs"
ON public.fixed_costs FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Admins podem gerenciar sales_channels"
ON public.sales_channels FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Anon pode ler pricing_settings"
ON public.pricing_settings FOR SELECT
TO anon
USING (true);

CREATE POLICY "Anon pode ler fixed_costs"
ON public.fixed_costs FOR SELECT
TO anon
USING (true);

CREATE POLICY "Anon pode ler sales_channels"
ON public.sales_channels FOR SELECT
TO anon
USING (true);

-- 6. SEED DATA OFICIAL
INSERT INTO public.pricing_settings (
    monthly_projected_revenue,
    target_profit_percent,
    target_profit_fixed_gs,
    use_fixed_profit,
    tax_percent,
    waste_percent,
    maintenance_percent,
    other_variable_percent,
    monthly_projections
)
VALUES (
    35000000,
    20.0,
    7000000,
    false,
    10.0,
    2.5,
    2.0,
    1.5,
    '[
      {"month":"Jan","value":30000000},
      {"month":"Fev","value":32000000},
      {"month":"Mar","value":35000000},
      {"month":"Abr","value":34000000},
      {"month":"Mai","value":35000000},
      {"month":"Jun","value":36000000},
      {"month":"Jul","value":38000000},
      {"month":"Ago","value":36000000},
      {"month":"Set","value":35000000},
      {"month":"Out","value":36000000},
      {"month":"Nov","value":37000000},
      {"month":"Dez","value":42000000}
    ]'::jsonb
)
ON CONFLICT DO NOTHING;

INSERT INTO public.fixed_costs (description, monthly_value, sort_order)
VALUES
    ('Pró-labore', 3500000, 1),
    ('Aluguel do Ponto Comercial', 2500000, 2),
    ('Funcionários / Atendentes', 2800000, 3),
    ('Encargos Trabalhistas', 400000, 4),
    ('Luz / Energia Elétrica (ANDE)', 800000, 5),
    ('Gás de Cozinha', 450000, 6),
    ('Contabilidade', 500000, 7),
    ('Manutenção Geral', 300000, 8),
    ('Produtos de Limpeza', 200000, 9),
    ('Internet / Telefone', 180000, 10),
    ('Água e Esgoto (ESSAP)', 150000, 11)
ON CONFLICT DO NOTHING;

INSERT INTO public.sales_channels (name, fee_percent, share_percent, sort_order)
VALUES
    ('Dinheiro', 0.0, 30.0, 1),
    ('PIX', 0.0, 25.0, 2),
    ('Cartão Débito', 1.5, 15.0, 3),
    ('Cartão Crédito', 3.5, 15.0, 4),
    ('Delivery / App', 15.0, 15.0, 5)
ON CONFLICT DO NOTHING;
