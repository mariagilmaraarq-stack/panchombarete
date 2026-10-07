-- ==============================================================================
-- PANCHO MBARATE — ESQUEMA DE BANCO DE DADOS SUPABASE (POSTGRESQL)
-- Ciudad del Este, Paraguay
-- ==============================================================================

-- Habilita extensão UUID se necessário
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TABELA: PRODUTOS (products)
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    name_es TEXT,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    description_es TEXT,
    price_gs NUMERIC NOT NULL CHECK (price_gs >= 0),
    promotional_price_gs NUMERIC CHECK (promotional_price_gs >= 0),
    type TEXT NOT NULL DEFAULT 'alimento' CHECK (type IN ('alimento', 'bebida', 'combo')),
    category TEXT NOT NULL DEFAULT 'Cachorro-quente',
    cmv_gs NUMERIC NOT NULL DEFAULT 0 CHECK (cmv_gs >= 0),
    sausages_qty INTEGER NOT NULL DEFAULT 1,
    image_url TEXT,
    highlight TEXT,
    highlight_es TEXT,
    active BOOLEAN NOT NULL DEFAULT true,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Migrações incrementais caso a tabela já exista
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'alimento';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'Cachorro-quente';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS promotional_price_gs NUMERIC;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS name_es TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS description_es TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS highlight_es TEXT;
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_type_check;
ALTER TABLE public.products ADD CONSTRAINT products_type_check CHECK (type IN ('alimento', 'bebida', 'combo'));


-- 2. TABELA: ADICIONAIS (add_ons)
CREATE TABLE IF NOT EXISTS public.add_ons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    price_gs INTEGER NOT NULL CHECK (price_gs >= 0),
    cmv_gs INTEGER NOT NULL CHECK (cmv_gs >= 0),
    active BOOLEAN NOT NULL DEFAULT true,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. TABELA: PEDIDOS (orders)
-- Status permitidos: INICIADO, WHATSAPP_ABERTO, CONFIRMADO, CANCELADO, RETIRADO
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_code TEXT NOT NULL UNIQUE,
    customer_name TEXT NOT NULL,
    pickup_time TEXT NOT NULL,
    subtotal_gs INTEGER NOT NULL CHECK (subtotal_gs >= 0),
    addons_total_gs INTEGER NOT NULL DEFAULT 0 CHECK (addons_total_gs >= 0),
    total_gs INTEGER NOT NULL CHECK (total_gs >= 0),
    cmv_gs INTEGER NOT NULL CHECK (cmv_gs >= 0),
    status TEXT NOT NULL DEFAULT 'INICIADO' 
        CHECK (status IN ('INICIADO', 'WHATSAPP_ABERTO', 'CONFIRMADO', 'CANCELADO', 'RETIRADO')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. TABELA: ITENS DO PEDIDO (order_items)
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL,
    product_name TEXT NOT NULL,
    unit_price_gs INTEGER NOT NULL CHECK (unit_price_gs >= 0),
    cmv_gs INTEGER NOT NULL CHECK (cmv_gs >= 0),
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. TABELA: ADICIONAIS DO PEDIDO (order_addons)
CREATE TABLE IF NOT EXISTS public.order_addons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    addon_id TEXT NOT NULL,
    addon_name TEXT NOT NULL,
    unit_price_gs INTEGER NOT NULL CHECK (unit_price_gs >= 0),
    cmv_gs INTEGER NOT NULL CHECK (cmv_gs >= 0),
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. TABELA: CONFIGURAÇÕES DA LOJA (settings)
CREATE TABLE IF NOT EXISTS public.settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_name TEXT NOT NULL DEFAULT 'PANCHO MBARATE',
    whatsapp_number TEXT NOT NULL DEFAULT '595983000000',
    address TEXT NOT NULL,
    maps_url TEXT,
    instagram_url TEXT,
    opening_time TEXT NOT NULL DEFAULT '17:00',
    closing_time TEXT NOT NULL DEFAULT '23:45',
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ÍNDICES DE PERFORMANCE E CONSULTA
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_order_code ON public.orders(order_code);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_addons_order_id ON public.order_addons(order_id);
CREATE INDEX IF NOT EXISTS idx_products_active ON public.products(active, sort_order);
CREATE INDEX IF NOT EXISTS idx_addons_active ON public.add_ons(active, sort_order);

-- SEED DATA OFICIAL (Valores e cardápio oficiais do Pancho Mbarate)
INSERT INTO public.products (name, slug, description, price_gs, cmv_gs, sausages_qty, image_url, highlight, active, sort_order)
VALUES
(
    'Pancho Py''aguasu',
    'pancho-pyaguasu',
    'Pão macio aquecido, maionese artesanal da casa, 1 salsicha de primeira linha, ketchup, mostarda, ervilhas, milho fresco, vinagrete caseiro, queijo e batata palha fininha crocante.',
    15000,
    6000,
    1,
    'assets/images/pancho_pyaguasu.jpg',
    NULL,
    true,
    1
),
(
    'Pancho Mbarate',
    'pancho-mbarate',
    'Pão macio aquecido, maionese artesanal da casa, 2 salsichas de primeira linha, ketchup, mostarda, ervilhas, milho fresco, vinagrete caseiro, queijo e batata palha fininha crocante.',
    20000,
    8500,
    2,
    'assets/images/pancho_mbarate.jpg',
    '🔥 MAIS PEDIDO',
    true,
    2
),
(
    'Pancho Mbarate Guasu',
    'pancho-mbarate-guasu',
    'Pão macio aquecido, maionese artesanal da casa, 3 salsichas de primeira linha, ketchup, mostarda, ervilhas, milho fresco, vinagrete caseiro, queijo e batata palha fininha crocante.',
    22000,
    10500,
    3,
    'assets/images/pancho_mbarate_guasu.jpg',
    '💪 PARA QUEM ESTÁ COM FOME',
    true,
    3
)
ON CONFLICT (slug) DO UPDATE 
SET price_gs = EXCLUDED.price_gs,
    cmv_gs = EXCLUDED.cmv_gs,
    description = EXCLUDED.description;

INSERT INTO public.add_ons (name, price_gs, cmv_gs, active, sort_order)
VALUES
(
    'Salsicha Extra',
    2500,
    1200,
    true,
    1
),
(
    'Queijo Extra',
    6000,
    2500,
    true,
    2
)
ON CONFLICT DO NOTHING;

INSERT INTO public.settings (store_name, whatsapp_number, address, maps_url, instagram_url, opening_time, closing_time, active)
VALUES
(
    'PANCHO MBARATE',
    '595983000000',
    'Av. Adrián Jara c/ Piribebuy, Microcentro — Ciudad del Este, Paraguay',
    'https://maps.google.com/?q=Ciudad+del+Este+Paraguay',
    'https://instagram.com/panchombarate',
    '17:00',
    '23:45',
    true
)
ON CONFLICT DO NOTHING;

-- 7. TABELA: BEBIDAS (drinks)
CREATE TABLE IF NOT EXISTS public.drinks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    price_gs INTEGER NOT NULL CHECK (price_gs >= 0),
    cmv_gs INTEGER NOT NULL CHECK (cmv_gs >= 0),
    image_url TEXT,
    icon TEXT DEFAULT '🥤',
    active BOOLEAN NOT NULL DEFAULT true,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_drinks_active ON public.drinks(active, sort_order);

INSERT INTO public.drinks (name, description, price_gs, cmv_gs, image_url, icon, active, sort_order)
VALUES
(
    'Coca-Cola Original',
    'Lata 350ml geladíssima com gás perfeito',
    7000,
    3500,
    'assets/images/coca_cola.jpg',
    '🥤',
    true,
    1
),
(
    'Guaraná Antarctica',
    'Lata 350ml trincando de gelada',
    7000,
    3500,
    'assets/images/guarana.jpg',
    '⚡',
    true,
    2
),
(
    'Água Mineral Gelada',
    'Garrafa 500ml natural ou refrescante com gelo',
    5000,
    2000,
    'assets/images/mineral_water.jpg',
    '💧',
    true,
    3
)
ON CONFLICT DO NOTHING;

-- ==============================================================================
-- 8. TABELA: CONFIGURAÇÕES DE PRECIFICAÇÃO (pricing_settings)
-- ==============================================================================
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

-- Seed de configurações de precificação
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

-- ==============================================================================
-- 9. TABELA: CUSTOS FIXOS MENSAIS (fixed_costs)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.fixed_costs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    description TEXT NOT NULL,
    monthly_value NUMERIC NOT NULL CHECK (monthly_value >= 0),
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fixed_costs_sort ON public.fixed_costs(sort_order, created_at);

-- Seed de Custos Fixos Oficiais
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

-- ==============================================================================
-- 10. TABELA: CANAIS DE VENDA E FORMAS DE PAGAMENTO (sales_channels)
-- ==============================================================================
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

-- Seed de Canais de Venda Oficiais (Soma das participações = 100%)
INSERT INTO public.sales_channels (name, fee_percent, share_percent, sort_order)
VALUES
    ('Dinheiro', 0.0, 30.0, 1),
    ('PIX', 0.0, 25.0, 2),
    ('Cartão Débito', 1.5, 15.0, 3),
    ('Cartão Crédito', 3.5, 15.0, 4),
    ('Delivery / App', 15.0, 15.0, 5)
ON CONFLICT DO NOTHING;


