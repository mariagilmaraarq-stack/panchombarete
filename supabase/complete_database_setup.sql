-- ==============================================================================
-- PANCHO MBARATE — ESQUEMA COMPLETO DE BANCO DE DADOS & RLS (SUPABASE)
-- Ciudad del Este, Paraguay — Projeto: vhhjbqkwvkktuahkqiwj
-- ==============================================================================

-- 0. EXTENSÕES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- 1. TABELAS: CARDÁPIO E PRODUTOS
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    price_gs NUMERIC NOT NULL CHECK (price_gs >= 0),
    promotional_price_gs NUMERIC CHECK (promotional_price_gs IS NULL OR promotional_price_gs >= 0),
    type TEXT NOT NULL DEFAULT 'alimento' CHECK (type IN ('alimento', 'bebida')),
    category TEXT NOT NULL DEFAULT 'Cachorro-quente',
    cmv_gs NUMERIC NOT NULL DEFAULT 0 CHECK (cmv_gs >= 0),
    sausages_qty INTEGER NOT NULL DEFAULT 1,
    image_url TEXT,
    highlight TEXT,
    active BOOLEAN NOT NULL DEFAULT true,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.add_ons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    price_gs NUMERIC NOT NULL CHECK (price_gs >= 0),
    cmv_gs NUMERIC NOT NULL DEFAULT 0 CHECK (cmv_gs >= 0),
    active BOOLEAN NOT NULL DEFAULT true,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 2. TABELAS: PEDIDOS & FLUXO DE VENDAS
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_code TEXT NOT NULL UNIQUE,
    customer_name TEXT NOT NULL,
    pickup_time TEXT NOT NULL,
    subtotal_gs NUMERIC NOT NULL CHECK (subtotal_gs >= 0),
    addons_total_gs NUMERIC NOT NULL DEFAULT 0 CHECK (addons_total_gs >= 0),
    total_gs NUMERIC NOT NULL CHECK (total_gs >= 0),
    cmv_gs NUMERIC NOT NULL DEFAULT 0 CHECK (cmv_gs >= 0),
    status TEXT NOT NULL DEFAULT 'INICIADO' 
        CHECK (status IN ('INICIADO', 'WHATSAPP_ABERTO', 'CONFIRMADO', 'CANCELADO', 'RETIRADO')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL,
    product_name TEXT NOT NULL,
    unit_price_gs NUMERIC NOT NULL CHECK (unit_price_gs >= 0),
    cmv_gs NUMERIC NOT NULL DEFAULT 0 CHECK (cmv_gs >= 0),
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.order_addons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    addon_id TEXT NOT NULL,
    addon_name TEXT NOT NULL,
    unit_price_gs NUMERIC NOT NULL CHECK (unit_price_gs >= 0),
    cmv_gs NUMERIC NOT NULL DEFAULT 0 CHECK (cmv_gs >= 0),
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 3. TABELA: CONFIGURAÇÕES DA LOJA (settings)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_name TEXT NOT NULL DEFAULT 'PANCHO MBARATE',
    whatsapp_number TEXT NOT NULL DEFAULT '595983123456',
    address TEXT NOT NULL DEFAULT 'Julio Cesar Riquelme (F8QH+75H) — Ciudad del Este 100169, Paraguay',
    maps_url TEXT DEFAULT 'https://maps.google.com/?q=-25.51158425546612,-54.6720151',
    instagram_url TEXT DEFAULT 'https://instagram.com/panchombarate',
    opening_time TEXT NOT NULL DEFAULT '17:00',
    closing_time TEXT NOT NULL DEFAULT '23:45',
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 4. TABELAS: PRECIFICAÇÃO E CUSTOS FIXOS
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

CREATE TABLE IF NOT EXISTS public.fixed_costs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    description TEXT NOT NULL,
    monthly_value NUMERIC NOT NULL CHECK (monthly_value >= 0),
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.sales_channels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    fee_percent NUMERIC NOT NULL DEFAULT 0 CHECK (fee_percent >= 0 AND fee_percent <= 100),
    share_percent NUMERIC NOT NULL DEFAULT 0 CHECK (share_percent >= 0 AND share_percent <= 100),
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 5. TABELAS: FICHAS TÉCNICAS E CMV GASTRONÔMICO 360°
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.recipe_ingredients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'ingrediente' CHECK (type IN ('ingrediente', 'embalagem')),
    purchase_quantity NUMERIC NOT NULL CHECK (purchase_quantity > 0),
    purchase_unit TEXT NOT NULL,
    purchase_price NUMERIC NOT NULL CHECK (purchase_price >= 0),
    base_unit TEXT NOT NULL,
    unit_cost NUMERIC NOT NULL CHECK (unit_cost >= 0),
    default_correction_factor NUMERIC NOT NULL DEFAULT 1.00 CHECK (default_correction_factor >= 1.00),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.recipe_sheets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('sub_recipe', 'final_product')),
    category TEXT NOT NULL DEFAULT 'Lanches',
    yield_portions NUMERIC NOT NULL DEFAULT 1 CHECK (yield_portions > 0),
    yield_unit TEXT NOT NULL DEFAULT 'un',
    portion_size_description TEXT,
    waste_percent NUMERIC NOT NULL DEFAULT 5.0 CHECK (waste_percent >= 0 AND waste_percent < 100),
    sale_price NUMERIC NOT NULL DEFAULT 0 CHECK (sale_price >= 0),
    suggested_price NUMERIC DEFAULT 0,
    preparation_method TEXT,
    notes TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.recipe_sheet_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recipe_id UUID NOT NULL REFERENCES public.recipe_sheets(id) ON DELETE CASCADE,
    item_type TEXT NOT NULL CHECK (item_type IN ('ingredient', 'sub_recipe', 'packaging')),
    ingredient_id UUID REFERENCES public.recipe_ingredients(id) ON DELETE SET NULL,
    sub_recipe_id UUID REFERENCES public.recipe_sheets(id) ON DELETE SET NULL,
    item_name TEXT NOT NULL,
    net_quantity NUMERIC NOT NULL CHECK (net_quantity > 0),
    unit TEXT NOT NULL,
    correction_factor NUMERIC NOT NULL DEFAULT 1.00 CHECK (correction_factor >= 1.00),
    notes TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.recipe_sales_simulations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recipe_id UUID NOT NULL UNIQUE REFERENCES public.recipe_sheets(id) ON DELETE CASCADE,
    estimated_monthly_units INTEGER NOT NULL DEFAULT 100 CHECK (estimated_monthly_units >= 0),
    notes TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 6. ÍNDICES DE ALTA PERFORMANCE
-- ==============================================================================

CREATE INDEX IF NOT EXISTS idx_products_active ON public.products(active, sort_order);
CREATE INDEX IF NOT EXISTS idx_addons_active ON public.add_ons(active, sort_order);
CREATE INDEX IF NOT EXISTS idx_orders_created ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_addons_order ON public.order_addons(order_id);
CREATE INDEX IF NOT EXISTS idx_fixed_costs_sort ON public.fixed_costs(sort_order);
CREATE INDEX IF NOT EXISTS idx_sales_channels_sort ON public.sales_channels(sort_order);
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_code ON public.recipe_ingredients(code);
CREATE INDEX IF NOT EXISTS idx_recipe_sheets_type ON public.recipe_sheets(type);
CREATE INDEX IF NOT EXISTS idx_recipe_sheet_items_recipe ON public.recipe_sheet_items(recipe_id);

-- ==============================================================================
-- 7. ATIVAÇÃO DE ROW LEVEL SECURITY (RLS) & POLÍTICAS RESILIENTES
-- ==============================================================================

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.add_ons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_addons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fixed_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_sheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_sheet_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_sales_simulations ENABLE ROW LEVEL SECURITY;

-- Limpar políticas anteriores se existirem
DROP POLICY IF EXISTS "Acesso público e admin a products" ON public.products;
DROP POLICY IF EXISTS "Acesso público e admin a add_ons" ON public.add_ons;
DROP POLICY IF EXISTS "Acesso público e admin a orders" ON public.orders;
DROP POLICY IF EXISTS "Acesso público e admin a order_items" ON public.order_items;
DROP POLICY IF EXISTS "Acesso público e admin a order_addons" ON public.order_addons;
DROP POLICY IF EXISTS "Acesso público e admin a settings" ON public.settings;
DROP POLICY IF EXISTS "Acesso público e admin a pricing_settings" ON public.pricing_settings;
DROP POLICY IF EXISTS "Acesso público e admin a fixed_costs" ON public.fixed_costs;
DROP POLICY IF EXISTS "Acesso público e admin a sales_channels" ON public.sales_channels;
DROP POLICY IF EXISTS "Acesso público e admin a recipe_ingredients" ON public.recipe_ingredients;
DROP POLICY IF EXISTS "Acesso público e admin a recipe_sheets" ON public.recipe_sheets;
DROP POLICY IF EXISTS "Acesso público e admin a recipe_sheet_items" ON public.recipe_sheet_items;
DROP POLICY IF EXISTS "Acesso público e admin a recipe_sales_simulations" ON public.recipe_sales_simulations;

-- Políticas universais para o painel administrativo e cardápio
CREATE POLICY "Acesso público e admin a products" ON public.products FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Acesso público e admin a add_ons" ON public.add_ons FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Acesso público e admin a orders" ON public.orders FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Acesso público e admin a order_items" ON public.order_items FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Acesso público e admin a order_addons" ON public.order_addons FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Acesso público e admin a settings" ON public.settings FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Acesso público e admin a pricing_settings" ON public.pricing_settings FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Acesso público e admin a fixed_costs" ON public.fixed_costs FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Acesso público e admin a sales_channels" ON public.sales_channels FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Acesso público e admin a recipe_ingredients" ON public.recipe_ingredients FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Acesso público e admin a recipe_sheets" ON public.recipe_sheets FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Acesso público e admin a recipe_sheet_items" ON public.recipe_sheet_items FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Acesso público e admin a recipe_sales_simulations" ON public.recipe_sales_simulations FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- ==============================================================================
-- 8. CARGA INICIAL DE DADOS OFICIAIS (SEEDS)
-- ==============================================================================

-- Produtos Oficiais
INSERT INTO public.products (name, slug, description, price_gs, cmv_gs, sausages_qty, type, category, image_url, highlight, active, sort_order)
VALUES
(
    'Pancho Py''aguasu',
    'pancho-pyaguasu',
    'Pão macio aquecido, maionese artesanal da casa, 1 salsicha de primeira linha, ketchup, mostarda, ervilhas, milho fresco, vinagrete caseiro, queijo e batata palha fininha crocante.',
    15000,
    6000,
    1,
    'alimento',
    'Cachorro-quente',
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
    'alimento',
    'Cachorro-quente',
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
    'alimento',
    'Cachorro-quente',
    'assets/images/pancho_mbarate_guasu.jpg',
    '💪 PARA QUEM TEM FOME',
    true,
    3
),
(
    'Coca-Cola Original 350ml',
    'coca-cola-350ml',
    'Lata gelada de refrigerante tradicional Coca-Cola 350ml.',
    7000,
    3200,
    0,
    'bebida',
    'Refrigerante',
    'assets/images/coca_cola.jpg',
    '❄️ GELADA',
    true,
    4
),
(
    'Guaraná Antarctica 350ml',
    'guarana-antarctica-350ml',
    'Lata gelada de Guaraná Antarctica 350ml.',
    7000,
    3000,
    0,
    'bebida',
    'Refrigerante',
    'assets/images/guarana.jpg',
    NULL,
    true,
    5
),
(
    'Água Mineral sem Gás 500ml',
    'agua-mineral-500ml',
    'Garrafa de água mineral pura e refrescante 500ml.',
    5000,
    1500,
    0,
    'bebida',
    'Água',
    'assets/images/mineral_water.jpg',
    NULL,
    true,
    6
)
ON CONFLICT (slug) DO NOTHING;

-- Adicionais
INSERT INTO public.add_ons (name, price_gs, cmv_gs, active, sort_order)
VALUES
    ('Batata Palha Extra', 3000, 1000, true, 1),
    ('Queijo Cheddar Cremoso', 4000, 1500, true, 2),
    ('Queijo Catupiry Original', 4000, 1600, true, 3),
    ('Vinagrete da Casa', 2500, 800, true, 4),
    ('Bacon Crocante em Cubos', 5000, 2200, true, 5),
    ('Salsicha Extra (1 un)', 4000, 1500, true, 6)
ON CONFLICT DO NOTHING;

-- Configurações da Loja
INSERT INTO public.settings (store_name, whatsapp_number, address, maps_url, instagram_url, opening_time, closing_time)
VALUES (
    'PANCHO MBARATE',
    '595983123456',
    'Julio Cesar Riquelme (F8QH+75H) — Ciudad del Este 100169, Paraguay',
    'https://maps.google.com/?q=-25.51158425546612,-54.6720151',
    'https://instagram.com/panchombarate',
    '17:00',
    '23:45'
)
ON CONFLICT DO NOTHING;

-- Precificação
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

-- Custos Fixos
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

-- Canais de Venda
INSERT INTO public.sales_channels (name, fee_percent, share_percent, sort_order)
VALUES
    ('Dinheiro', 0.0, 30.0, 1),
    ('PIX', 0.0, 25.0, 2),
    ('Cartão Débito', 1.5, 15.0, 3),
    ('Cartão Crédito', 3.5, 15.0, 4),
    ('Delivery / App', 15.0, 15.0, 5)
ON CONFLICT DO NOTHING;
