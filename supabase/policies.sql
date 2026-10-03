-- ==============================================================================
-- PANCHO MBARATE — POLÍTICAS DE SEGURANÇA (ROW LEVEL SECURITY - RLS)
-- ==============================================================================

-- 1. ATIVAR RLS EM TODAS AS TABELAS
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.add_ons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_addons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- 2. POLÍTICAS: PRODUTOS (products)
-- Visitantes públicos podem apenas ler produtos ativos
CREATE POLICY "Public pode ler produtos ativos"
ON public.products FOR SELECT
TO anon, authenticated
USING (active = true);

-- Apenas admins autenticados podem gerenciar produtos (inserir, alterar, deletar)
CREATE POLICY "Admins podem gerenciar produtos"
ON public.products FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- 3. POLÍTICAS: ADICIONAIS (add_ons)
-- Visitantes públicos podem apenas ler adicionais ativos
CREATE POLICY "Public pode ler adicionais ativos"
ON public.add_ons FOR SELECT
TO anon, authenticated
USING (active = true);

CREATE POLICY "Admins podem gerenciar adicionais"
ON public.add_ons FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- 4. POLÍTICAS: CONFIGURAÇÕES (settings)
CREATE POLICY "Public pode ler configuracoes ativas"
ON public.settings FOR SELECT
TO anon, authenticated
USING (active = true);

CREATE POLICY "Admins podem gerenciar configuracoes"
ON public.settings FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- 4.1 POLÍTICAS: BEBIDAS (drinks)
ALTER TABLE public.drinks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public pode ler bebidas ativas"
ON public.drinks FOR SELECT
TO anon, authenticated
USING (active = true);

CREATE POLICY "Admins podem gerenciar bebidas"
ON public.drinks FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- 5. POLÍTICAS: PEDIDOS (orders)
-- Visitantes públicos podem APENAS inserir pedidos com status inicial 'INICIADO'
-- NÃO podem ler livremente os pedidos de outros clientes
CREATE POLICY "Public pode criar pedidos"
ON public.orders FOR INSERT
TO anon, authenticated
WITH CHECK (status = 'INICIADO');

-- Apenas admins autenticados podem ler, atualizar e gerenciar pedidos
CREATE POLICY "Admins tem acesso total aos pedidos"
ON public.orders FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- 6. POLÍTICAS: ITENS DO PEDIDO (order_items)
CREATE POLICY "Public pode inserir itens de pedido"
ON public.order_items FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Admins tem acesso total aos itens do pedido"
ON public.order_items FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- 7. POLÍTICAS: ADICIONAIS DO PEDIDO (order_addons)
CREATE POLICY "Public pode inserir adicionais de pedido"
ON public.order_addons FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Admins tem acesso total aos adicionais do pedido"
ON public.order_addons FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- 8. POLÍTICAS: PRECIFICAÇÃO E CUSTOS
ALTER TABLE public.pricing_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fixed_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_channels ENABLE ROW LEVEL SECURITY;

-- Admins autenticados possuem controle total
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

-- Leitura pública para sincronização operacional caso necessário
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

