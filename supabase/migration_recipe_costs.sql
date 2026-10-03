-- ==============================================================================
-- PANCHO MBARATE — MIGRATION: MÓDULO DE FICHA TÉCNICA E CUSTO DOS ALIMENTOS (CMV)
-- Execute este script no SQL Editor do seu projeto Supabase
-- ==============================================================================

-- 1. TABELA DE CATÁLOGO DE INSUMOS & PREÇOS BASE (Ingredientes e Embalagens)
CREATE TABLE IF NOT EXISTS public.recipe_ingredients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    category TEXT NOT NULL, -- 'Carnes e Proteínas', 'Panificação', 'Laticínios', 'Mercearia', 'Hortifrúti', 'Embalagens e Descartáveis', 'Temperos e Molhos'
    type TEXT NOT NULL DEFAULT 'ingrediente' CHECK (type IN ('ingrediente', 'embalagem')),
    purchase_quantity NUMERIC NOT NULL CHECK (purchase_quantity > 0),
    purchase_unit TEXT NOT NULL, -- 'kg', 'g', 'l', 'ml', 'un', 'fardo', 'cx', 'pct'
    purchase_price NUMERIC NOT NULL CHECK (purchase_price >= 0),
    base_unit TEXT NOT NULL, -- 'g', 'ml', 'un'
    unit_cost NUMERIC NOT NULL CHECK (unit_cost >= 0),
    default_correction_factor NUMERIC NOT NULL DEFAULT 1.00 CHECK (default_correction_factor >= 1.00),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_cat ON public.recipe_ingredients(category);
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_type ON public.recipe_ingredients(type);

-- 2. TABELA DE FICHAS TÉCNICAS E SUB-RECEITAS
CREATE TABLE IF NOT EXISTS public.recipe_sheets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('sub_recipe', 'final_product')),
    category TEXT NOT NULL DEFAULT 'Lanches', -- 'Sub-Receitas', 'Lanches', 'Sobremesas', 'Porções'
    yield_portions NUMERIC NOT NULL DEFAULT 1 CHECK (yield_portions > 0),
    yield_unit TEXT NOT NULL DEFAULT 'un', -- 'un', 'potinhos', 'g', 'ml', 'porções'
    portion_size_description TEXT, -- ex: '1 pote (145 ml)', '1 lanche de ~280g'
    waste_percent NUMERIC NOT NULL DEFAULT 5.0 CHECK (waste_percent >= 0 AND waste_percent < 100),
    sale_price NUMERIC NOT NULL DEFAULT 0 CHECK (sale_price >= 0),
    suggested_price NUMERIC DEFAULT 0,
    preparation_method TEXT,
    notes TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recipe_sheets_type ON public.recipe_sheets(type);

-- 3. TABELA DE ITENS DA FICHA TÉCNICA (Linhas de Ingredientes e Embalagens)
CREATE TABLE IF NOT EXISTS public.recipe_sheet_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recipe_id UUID NOT NULL REFERENCES public.recipe_sheets(id) ON DELETE CASCADE,
    item_type TEXT NOT NULL CHECK (item_type IN ('ingredient', 'sub_recipe', 'packaging')),
    ingredient_id UUID REFERENCES public.recipe_ingredients(id) ON DELETE SET NULL,
    sub_recipe_id UUID REFERENCES public.recipe_sheets(id) ON DELETE SET NULL,
    item_name TEXT NOT NULL,
    net_quantity NUMERIC NOT NULL CHECK (net_quantity > 0),
    unit TEXT NOT NULL, -- 'g', 'ml', 'un', 'porção'
    correction_factor NUMERIC NOT NULL DEFAULT 1.00 CHECK (correction_factor >= 1.00),
    notes TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recipe_items_recipe ON public.recipe_sheet_items(recipe_id);

-- 4. TABELA DE ESTIMATIVA E SIMULAÇÃO DE VENDAS MENSAIS
CREATE TABLE IF NOT EXISTS public.recipe_sales_simulations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recipe_id UUID NOT NULL UNIQUE REFERENCES public.recipe_sheets(id) ON DELETE CASCADE,
    estimated_monthly_units INTEGER NOT NULL DEFAULT 100 CHECK (estimated_monthly_units >= 0),
    notes TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. ATIVAR ROW LEVEL SECURITY (RLS)
ALTER TABLE public.recipe_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_sheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_sheet_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_sales_simulations ENABLE ROW LEVEL SECURITY;

-- 6. POLÍTICAS DE ACESSO (RLS)
-- Admins autenticados podem gerenciar tudo
CREATE POLICY "Admins podem gerenciar recipe_ingredients"
ON public.recipe_ingredients FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Admins podem gerenciar recipe_sheets"
ON public.recipe_sheets FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Admins podem gerenciar recipe_sheet_items"
ON public.recipe_sheet_items FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Admins podem gerenciar recipe_sales_simulations"
ON public.recipe_sales_simulations FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Leitura anônima para fallback ou relatórios
CREATE POLICY "Anon pode ler recipe_ingredients"
ON public.recipe_ingredients FOR SELECT
TO anon
USING (true);

CREATE POLICY "Anon pode ler recipe_sheets"
ON public.recipe_sheets FOR SELECT
TO anon
USING (true);

CREATE POLICY "Anon pode ler recipe_sheet_items"
ON public.recipe_sheet_items FOR SELECT
TO anon
USING (true);

CREATE POLICY "Anon pode ler recipe_sales_simulations"
ON public.recipe_sales_simulations FOR SELECT
TO anon
USING (true);
