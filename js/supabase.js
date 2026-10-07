/**
 * PANCHO MBARATE — CLIENTE SUPABASE & PERSISTÊNCIA
 * Arquitetura resiliente: conecta ao Supabase ou opera com persistência local caso não configurado.
 */
import { APP_CONFIG } from './config.js';

let supabaseClient = null;

export function resetSupabaseClient() {
  supabaseClient = null;
}

export function getSupabase() {
  if (supabaseClient) return supabaseClient;

  const url = APP_CONFIG.SUPABASE_URL || localStorage.getItem('PM_SUPABASE_URL') || 'https://vhhjbqkwvkktuahkqiwj.supabase.co';
  
  // Prioriza JWT anon key para o supabase-js v2 UMD client no navegador
  const anonKey = (APP_CONFIG.SUPABASE_ANON_KEY && APP_CONFIG.SUPABASE_ANON_KEY.startsWith('eyJ'))
    ? APP_CONFIG.SUPABASE_ANON_KEY
    : (typeof localStorage !== 'undefined' && localStorage.getItem('PM_SUPABASE_ANON_KEY') && localStorage.getItem('PM_SUPABASE_ANON_KEY').startsWith('eyJ'))
      ? localStorage.getItem('PM_SUPABASE_ANON_KEY')
      : APP_CONFIG.SUPABASE_ANON_KEY || APP_CONFIG.SUPABASE_PUBLISHABLE_KEY || (typeof localStorage !== 'undefined' ? (localStorage.getItem('PM_SUPABASE_ANON_KEY') || localStorage.getItem('PM_SUPABASE_PUBLISHABLE_KEY')) : null);

  if (url && anonKey && typeof window !== 'undefined' && window.supabase) {
    try {
      supabaseClient = window.supabase.createClient(url, anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true
        }
      });
      return supabaseClient;
    } catch (e) {
      console.warn('Erro ao inicializar Supabase:', e);
    }
  }
  return null;
}

export function isSupabaseConnected() {
  return getSupabase() !== null;
}

/**
 * Testa ativamente a conexão com o Supabase
 */
export async function testSupabaseConnection() {
  const sb = getSupabase();
  if (!sb) {
    return { 
      connected: false, 
      message: 'Supabase não inicializado. Verifique se a URL e a Chave Anônima (anon_key) foram preenchidas.' 
    };
  }

  try {
    // Tenta uma consulta leve em products ou settings
    const { error: err1 } = await sb.from('products').select('id').limit(1);
    if (!err1) {
      return { connected: true, message: 'Conectado com sucesso ao Supabase!' };
    }

    const { error: err2 } = await sb.from('settings').select('id').limit(1);
    if (!err2) {
      return { connected: true, message: 'Conectado com sucesso ao Supabase!' };
    }

    if (err1 && err1.message) {
      return { connected: false, message: `Erro ao consultar Supabase: ${err1.message}` };
    }

    return { connected: false, message: 'Falha ao comunicar com o banco Supabase.' };
  } catch (e) {
    return { connected: false, message: e.message || 'Erro inesperado ao conectar.' };
  }
}

/**
 * Busca produtos ativos
 */
export async function fetchActiveProductsFromDB() {
  const sb = getSupabase();
  if (!sb) return null;

  try {
    const { data, error } = await sb
      .from('products')
      .select('*')
      .eq('active', true)
      .order('sort_order', { ascending: true });

    if (error) throw error;
    return data;
  } catch (e) {
    console.warn('Erro ao buscar produtos ativos do Supabase:', e);
    return null;
  }
}

/**
 * Busca todos os produtos (ativos e inativos) para o painel administrativo
 */
export async function fetchAllProductsFromDB() {
  const sb = getSupabase();
  if (!sb) return null;

  try {
    const { data, error } = await sb
      .from('products')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  } catch (e) {
    console.warn('Erro ao buscar todos os produtos do Supabase:', e);
    return null;
  }
}

/**
 * Busca bebidas ativas do Supabase
 */
export async function fetchActiveDrinksFromDB() {
  const sb = getSupabase();
  if (!sb) return null;

  try {
    const { data, error } = await sb
      .from('products')
      .select('*')
      .eq('active', true)
      .eq('type', 'bebida')
      .order('sort_order', { ascending: true });

    if (!error && data && data.length > 0) return data;
  } catch (e) {
    console.warn('Erro ao buscar bebidas ativas do Supabase:', e);
  }
  return null;
}

/**
 * Salva ou atualiza produto no Supabase
 */
export async function saveProductToSupabase(productData) {
  const sb = getSupabase();
  if (!sb) return { success: false, error: 'Supabase não conectado' };

  try {
    const payload = {
      name: productData.name,
      name_es: productData.name_es !== undefined && productData.name_es !== null && productData.name_es.trim() !== '' ? productData.name_es.trim() : null,
      slug: productData.slug,
      description: productData.description || '',
      description_es: productData.description_es !== undefined && productData.description_es !== null && productData.description_es.trim() !== '' ? productData.description_es.trim() : null,
      price_gs: Number(productData.price_gs),
      promotional_price_gs: productData.promotional_price_gs !== null && productData.promotional_price_gs !== undefined && productData.promotional_price_gs !== '' ? Number(productData.promotional_price_gs) : null,
      type: productData.type || 'alimento',
      category: productData.category || 'Outros',
      active: productData.active !== false,
      image_url: productData.image_url || '',
      highlight: productData.highlight || null,
      highlight_es: productData.highlight_es !== undefined && productData.highlight_es !== null && productData.highlight_es.trim() !== '' ? productData.highlight_es.trim() : null,
      cmv_gs: Number(productData.cmv_gs || 0),
      sausages_qty: Number(productData.sausages_qty || (productData.type === 'alimento' ? 1 : 0)),
      updated_at: new Date().toISOString()
    };

    if (productData.id && !productData.id.startsWith('local-')) {
      const { data, error } = await sb
        .from('products')
        .update(payload)
        .eq('id', productData.id)
        .select()
        .single();
      if (error) throw error;
      return { success: true, product: data };
    } else {
      payload.created_at = new Date().toISOString();
      const { data, error } = await sb
        .from('products')
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return { success: true, product: data };
    }
  } catch (err) {
    console.warn('Erro ao salvar produto no Supabase:', err);
    return { success: false, error: err };
  }
}

/**
 * Exclui ou inativa produto no Supabase
 */
export async function deleteProductFromSupabase(productId, softDeleteOnly = false) {
  const sb = getSupabase();
  if (!sb || !productId || productId.startsWith('local-')) return { success: true };

  try {
    if (softDeleteOnly) {
      const { error } = await sb
        .from('products')
        .update({ active: false, updated_at: new Date().toISOString() })
        .eq('id', productId);
      if (error) throw error;
    } else {
      const { error } = await sb
        .from('products')
        .delete()
        .eq('id', productId);
      if (error) throw error;
    }
    return { success: true };
  } catch (err) {
    console.warn('Erro ao excluir produto no Supabase:', err);
    return { success: false, error: err };
  }
}


/**
 * Busca adicionais ativos
 */
export async function fetchActiveAddonsFromDB() {
  const sb = getSupabase();
  if (!sb) return null;

  const { data, error } = await sb
    .from('add_ons')
    .select('*')
    .eq('active', true)
    .order('sort_order', { ascending: true });

  if (error) throw error;
  return data;
}

/**
 * Busca configurações da loja
 */
export async function fetchStoreSettingsFromDB() {
  const sb = getSupabase();
  if (!sb) return null;

  try {
    const { data, error } = await sb
      .from('settings')
      .select('*')
      .eq('active', true)
      .limit(1)
      .maybeSingle();

    if (!error && data) {
      // Sincroniza estado de APP_CONFIG com o banco
      if (data.whatsapp_number) APP_CONFIG.WHATSAPP_NUMBER = data.whatsapp_number;
      if (data.opening_time) APP_CONFIG.OPENING_TIME = data.opening_time;
      if (data.closing_time) APP_CONFIG.CLOSING_TIME = data.closing_time;
      if (data.address) APP_CONFIG.ADDRESS = data.address;
      if (data.maps_url) APP_CONFIG.GOOGLE_MAPS_URL = data.maps_url;
      if (data.instagram_url) APP_CONFIG.INSTAGRAM_URL = data.instagram_url;
      if (typeof data.active === 'boolean') APP_CONFIG.STORE_ACTIVE = data.active;
      return data;
    }
  } catch (err) {
    console.warn('Erro ao ler settings do Supabase:', err);
  }
  return null;
}

/**
 * Alterna manualmente o status de atendimento da loja (Aberta / Fechada)
 */
export async function toggleStoreActiveInDB(isActive) {
  const sb = getSupabase();
  APP_CONFIG.STORE_ACTIVE = isActive;
  if (sb) {
    try {
      const { data: existing } = await sb.from('settings').select('id').limit(1).maybeSingle();
      if (existing?.id) {
        const { data, error } = await sb
          .from('settings')
          .update({ active: isActive, updated_at: new Date().toISOString() })
          .eq('id', existing.id)
          .select()
          .single();
        if (error) throw error;
        return { success: true, active: isActive, data };
      }
    } catch (e) {
      console.warn('Erro ao alterar status da loja no Supabase:', e);
    }
  }
  return { success: true, active: isActive };
}

/**
 * Salva configurações da loja no Supabase (usado no painel administrativo)
 */
export async function saveStoreSettingsToDB(settings) {
  const sb = getSupabase();

  const payload = {
    store_name: settings.store_name || APP_CONFIG.STORE_NAME || 'PANCHO MBARATE',
    whatsapp_number: settings.whatsapp_number || APP_CONFIG.WHATSAPP_NUMBER,
    opening_time: settings.opening_time || APP_CONFIG.OPENING_TIME,
    closing_time: settings.closing_time || APP_CONFIG.CLOSING_TIME,
    address: settings.address || APP_CONFIG.ADDRESS,
    maps_url: settings.maps_url || APP_CONFIG.GOOGLE_MAPS_URL,
    instagram_url: settings.instagram_url || APP_CONFIG.INSTAGRAM_URL,
    active: typeof settings.active === 'boolean' ? settings.active : (typeof APP_CONFIG.STORE_ACTIVE === 'boolean' ? APP_CONFIG.STORE_ACTIVE : true),
    updated_at: new Date().toISOString()
  };

  // Atualiza APP_CONFIG local imediatamente
  if (payload.whatsapp_number) APP_CONFIG.WHATSAPP_NUMBER = payload.whatsapp_number;
  if (payload.opening_time) APP_CONFIG.OPENING_TIME = payload.opening_time;
  if (payload.closing_time) APP_CONFIG.CLOSING_TIME = payload.closing_time;
  if (payload.address) APP_CONFIG.ADDRESS = payload.address;
  if (payload.maps_url) APP_CONFIG.GOOGLE_MAPS_URL = payload.maps_url;
  if (typeof payload.active === 'boolean') APP_CONFIG.STORE_ACTIVE = payload.active;

  if (sb) {
    try {
      const { data: existing } = await sb.from('settings').select('id').limit(1).maybeSingle();
      if (existing?.id) {
        const { data, error } = await sb
          .from('settings')
          .update(payload)
          .eq('id', existing.id)
          .select()
          .single();
        if (error) throw error;
        return { success: true, data };
      } else {
        payload.created_at = new Date().toISOString();
        const { data, error } = await sb
          .from('settings')
          .insert(payload)
          .select()
          .single();
        if (error) throw error;
        return { success: true, data };
      }
    } catch (err) {
      console.warn('Erro ao salvar settings no Supabase:', err);
      return { success: false, error: err, isLocal: true };
    }
  }

  return { success: true, data: payload, isLocal: true };
}

/**
 * Salva pedido no banco de dados com recálculo seguro
 * Cria registros em `orders`, `order_items`, `order_addons`.
 */
export async function createOrderInDB(orderPayload) {
  const sb = getSupabase();

  if (sb) {
    try {
      // 1. Inserir pedido
      const { data: order, error: orderErr } = await sb
        .from('orders')
        .insert({
          order_code: orderPayload.order_code,
          customer_name: orderPayload.customer_name,
          pickup_time: orderPayload.pickup_time,
          subtotal_gs: orderPayload.subtotal_gs,
          addons_total_gs: orderPayload.addons_total_gs,
          total_gs: orderPayload.total_gs,
          cmv_gs: orderPayload.cmv_gs,
          status: 'INICIADO'
        })
        .select()
        .single();

      if (orderErr) throw orderErr;

      // 2. Inserir lanches (suporte a múltiplos produtos)
      const panchoInserts = (orderPayload.products && orderPayload.products.length > 0)
        ? orderPayload.products.map(item => ({
            order_id: order.id,
            product_id: item.product.id,
            product_name: item.product.name,
            unit_price_gs: item.product.promotional_price_gs || item.product.price_gs,
            cmv_gs: item.product.cmv_gs || 0,
            quantity: item.quantity
          }))
        : (orderPayload.product ? [{
            order_id: order.id,
            product_id: orderPayload.product.id,
            product_name: orderPayload.product.name,
            unit_price_gs: orderPayload.product.promotional_price_gs || orderPayload.product.price_gs,
            cmv_gs: orderPayload.product.cmv_gs || 0,
            quantity: orderPayload.productQuantity || 1
          }] : []);

      if (panchoInserts.length > 0) {
        const { error: itemErr } = await sb
          .from('order_items')
          .insert(panchoInserts);
        if (itemErr) console.warn('Erro ao inserir order_items (panchos):', itemErr);
      }

      // 3. Inserir bebidas
      if (orderPayload.drinks && orderPayload.drinks.length > 0) {
        const drinkInserts = orderPayload.drinks.map(d => ({
          order_id: order.id,
          product_id: d.drink.id,
          product_name: d.drink.name,
          unit_price_gs: d.drink.promotional_price_gs || d.drink.price_gs,
          cmv_gs: d.drink.cmv_gs || 0,
          quantity: d.quantity
        }));
        await sb.from('order_items').insert(drinkInserts);
      }

      // 4. Inserir adicionais
      if (orderPayload.addons && orderPayload.addons.length > 0) {
        const totalPanchos = orderPayload.totalPanchosCount || orderPayload.productQuantity || 1;
        const addonInserts = orderPayload.addons.map(a => ({
          order_id: order.id,
          addon_id: a.id,
          addon_name: a.name,
          unit_price_gs: a.price_gs,
          cmv_gs: a.cmv_gs,
          quantity: totalPanchos
        }));

        await sb.from('order_addons').insert(addonInserts);
      }

      return { success: true, order, isLocal: false };
    } catch (dbError) {
      console.warn('Falha na persistência Supabase, salvando localmente:', dbError);
    }
  }

  // Fallback Local Seguro (localStorage)
  return saveOrderLocally(orderPayload);
}

/**
 * Persistência Local para modo offline/demonstração
 */
function saveOrderLocally(orderPayload) {
  try {
    const localOrders = JSON.parse(localStorage.getItem('PM_LOCAL_ORDERS') || '[]');
    const newOrder = {
      id: 'local-' + Date.now(),
      order_code: orderPayload.order_code,
      customer_name: orderPayload.customer_name,
      pickup_time: orderPayload.pickup_time,
      subtotal_gs: orderPayload.subtotal_gs,
      addons_total_gs: orderPayload.addons_total_gs,
      drinks_total_gs: orderPayload.drinks_total_gs || 0,
      total_gs: orderPayload.total_gs,
      cmv_gs: orderPayload.cmv_gs,
      status: 'INICIADO',
      created_at: new Date().toISOString(),
      products: orderPayload.products || (orderPayload.product ? [{ product: orderPayload.product, quantity: orderPayload.productQuantity || 1 }] : []),
      product: orderPayload.product || (orderPayload.products?.[0]?.product || null),
      productQuantity: orderPayload.productQuantity || (orderPayload.products?.reduce((s, p) => s + p.quantity, 0) || 1),
      totalPanchosCount: orderPayload.totalPanchosCount || orderPayload.productQuantity || 1,
      addons: orderPayload.addons,
      drinks: orderPayload.drinks
    };
    localOrders.unshift(newOrder);
    localStorage.setItem('PM_LOCAL_ORDERS', JSON.stringify(localOrders.slice(0, 100)));
    return { success: true, order: newOrder, isLocal: true };
  } catch (err) {
    console.error('Erro ao salvar localmente:', err);
    return { success: false, error: err };
  }
}

/**
 * Atualiza status do pedido (usado no painel Admin)
 */
export async function updateOrderStatusInDB(orderId, newStatus) {
  const sb = getSupabase();
  if (sb && !orderId.startsWith('local-')) {
    const { data, error } = await sb
      .from('orders')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', orderId)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  // Fallback Local
  const localOrders = JSON.parse(localStorage.getItem('PM_LOCAL_ORDERS') || '[]');
  const index = localOrders.findIndex(o => o.id === orderId);
  if (index !== -1) {
    localOrders[index].status = newStatus;
    localOrders[index].updated_at = new Date().toISOString();
    localStorage.setItem('PM_LOCAL_ORDERS', JSON.stringify(localOrders));
    return localOrders[index];
  }
  return null;
}

/**
 * Obtém pedidos para o painel Admin
 */
export async function getAdminOrders() {
  const sb = getSupabase();
  if (sb) {
    try {
      const { data, error } = await sb
        .from('orders')
        .select(`
          *,
          order_items (*),
          order_addons (*)
        `)
        .order('created_at', { ascending: false })
        .limit(150);

      if (!error && data) return data;
    } catch (e) {
      console.warn('Erro ao ler pedidos do Supabase, lendo pedidos locais:', e);
    }
  }

  // Fallback Local
  return JSON.parse(localStorage.getItem('PM_LOCAL_ORDERS') || '[]');
}

/**
 * ==============================================================================
 * MÓDULO DE PRECIFICAÇÃO E CUSTOS — MÉTODOS SUPABASE E RESILIÊNCIA LOCAL
 * ==============================================================================
 */

export const DEFAULT_PRICING_SETTINGS = {
  monthly_projected_revenue: 35000000,
  target_profit_percent: 20,
  target_profit_fixed_gs: 7000000,
  use_fixed_profit: false,
  tax_percent: 10,
  waste_percent: 2.5,
  maintenance_percent: 2,
  other_variable_percent: 1.5,
  monthly_projections: [
    { month: 'Jan', value: 30000000 },
    { month: 'Fev', value: 32000000 },
    { month: 'Mar', value: 35000000 },
    { month: 'Abr', value: 34000000 },
    { month: 'Mai', value: 35000000 },
    { month: 'Jun', value: 36000000 },
    { month: 'Jul', value: 38000000 },
    { month: 'Ago', value: 36000000 },
    { month: 'Set', value: 35000000 },
    { month: 'Out', value: 36000000 },
    { month: 'Nov', value: 37000000 },
    { month: 'Dez', value: 42000000 }
  ]
};

export const DEFAULT_FIXED_COSTS = [
  { id: 'fc-1', description: 'Pró-labore', monthly_value: 3500000, sort_order: 1 },
  { id: 'fc-2', description: 'Aluguel do Ponto Comercial', monthly_value: 2500000, sort_order: 2 },
  { id: 'fc-3', description: 'Funcionários / Atendentes', monthly_value: 2800000, sort_order: 3 },
  { id: 'fc-4', description: 'Encargos Trabalhistas', monthly_value: 400000, sort_order: 4 },
  { id: 'fc-5', description: 'Luz / Energia Elétrica (ANDE)', monthly_value: 800000, sort_order: 5 },
  { id: 'fc-6', description: 'Gás de Cozinha', monthly_value: 450000, sort_order: 6 },
  { id: 'fc-7', description: 'Contabilidade', monthly_value: 500000, sort_order: 7 },
  { id: 'fc-8', description: 'Manutenção Geral', monthly_value: 300000, sort_order: 8 },
  { id: 'fc-9', description: 'Produtos de Limpeza', monthly_value: 200000, sort_order: 9 },
  { id: 'fc-10', description: 'Internet / Telefone', monthly_value: 180000, sort_order: 10 },
  { id: 'fc-11', description: 'Água e Esgoto (ESSAP)', monthly_value: 150000, sort_order: 11 }
];

export const DEFAULT_SALES_CHANNELS = [
  { id: 'sc-1', name: 'Dinheiro', fee_percent: 0.0, share_percent: 30.0, sort_order: 1 },
  { id: 'sc-2', name: 'PIX', fee_percent: 0.0, share_percent: 25.0, sort_order: 2 },
  { id: 'sc-3', name: 'Cartão Débito', fee_percent: 1.5, share_percent: 15.0, sort_order: 3 },
  { id: 'sc-4', name: 'Cartão Crédito', fee_percent: 3.5, share_percent: 15.0, sort_order: 4 },
  { id: 'sc-5', name: 'Delivery / App', fee_percent: 15.0, share_percent: 15.0, sort_order: 5 }
];

/**
 * Busca configurações de precificação
 */
export async function fetchPricingSettingsFromDB() {
  const sb = getSupabase();
  if (sb) {
    try {
      const { data, error } = await sb
        .from('pricing_settings')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        localStorage.setItem('PM_PRICING_SETTINGS', JSON.stringify(data));
        return data;
      }
    } catch (e) {
      console.warn('Erro ao ler pricing_settings do Supabase:', e);
    }
  }

  // Fallback Local
  const local = localStorage.getItem('PM_PRICING_SETTINGS');
  if (local) {
    try { return JSON.parse(local); } catch (e) {}
  }
  return { ...DEFAULT_PRICING_SETTINGS };
}

/**
 * Salva configurações de precificação
 */
export async function savePricingSettingsToDB(settings) {
  // Salva cópia local imediata
  localStorage.setItem('PM_PRICING_SETTINGS', JSON.stringify(settings));

  const sb = getSupabase();
  if (sb) {
    try {
      const payload = {
        monthly_projected_revenue: Number(settings.monthly_projected_revenue || 0),
        target_profit_percent: Number(settings.target_profit_percent || 0),
        target_profit_fixed_gs: settings.target_profit_fixed_gs !== null && settings.target_profit_fixed_gs !== undefined ? Number(settings.target_profit_fixed_gs) : null,
        use_fixed_profit: Boolean(settings.use_fixed_profit),
        tax_percent: Number(settings.tax_percent || 0),
        waste_percent: Number(settings.waste_percent || 0),
        maintenance_percent: Number(settings.maintenance_percent || 0),
        other_variable_percent: Number(settings.other_variable_percent || 0),
        monthly_projections: settings.monthly_projections || null,
        updated_at: new Date().toISOString()
      };

      if (settings.id && !settings.id.startsWith('local-')) {
        const { data, error } = await sb
          .from('pricing_settings')
          .update(payload)
          .eq('id', settings.id)
          .select()
          .single();
        if (error) throw error;
        localStorage.setItem('PM_PRICING_SETTINGS', JSON.stringify(data));
        return { success: true, data };
      } else {
        // Tenta obter ID existente
        const { data: existing } = await sb.from('pricing_settings').select('id').limit(1).maybeSingle();
        if (existing?.id) {
          const { data, error } = await sb
            .from('pricing_settings')
            .update(payload)
            .eq('id', existing.id)
            .select()
            .single();
          if (error) throw error;
          localStorage.setItem('PM_PRICING_SETTINGS', JSON.stringify(data));
          return { success: true, data };
        } else {
          payload.created_at = new Date().toISOString();
          const { data, error } = await sb
            .from('pricing_settings')
            .insert(payload)
            .select()
            .single();
          if (error) throw error;
          localStorage.setItem('PM_PRICING_SETTINGS', JSON.stringify(data));
          return { success: true, data };
        }
      }
    } catch (e) {
      console.warn('Erro ao salvar pricing_settings no Supabase:', e);
      return { success: false, error: e, isLocal: true };
    }
  }

  return { success: true, data: settings, isLocal: true };
}

/**
 * Busca custos fixos
 */
export async function fetchFixedCostsFromDB() {
  const sb = getSupabase();
  if (sb) {
    try {
      const { data, error } = await sb
        .from('fixed_costs')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true });

      if (!error && data && data.length > 0) {
        localStorage.setItem('PM_FIXED_COSTS', JSON.stringify(data));
        return data;
      }
    } catch (e) {
      console.warn('Erro ao ler fixed_costs do Supabase:', e);
    }
  }

  // Fallback Local
  const local = localStorage.getItem('PM_FIXED_COSTS');
  if (local) {
    try {
      const parsed = JSON.parse(local);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch (e) {}
  }
  return [...DEFAULT_FIXED_COSTS];
}

/**
 * Salva toda a lista de custos fixos (sincronização em massa)
 */
export async function saveAllFixedCostsToDB(costsArray) {
  localStorage.setItem('PM_FIXED_COSTS', JSON.stringify(costsArray));

  const sb = getSupabase();
  if (sb) {
    try {
      // Deleta itens que não estão mais na lista
      const validDbIds = costsArray.filter(c => c.id && !c.id.startsWith('fc-') && !c.id.startsWith('local-')).map(c => c.id);
      
      const { data: currentDbItems } = await sb.from('fixed_costs').select('id');
      if (currentDbItems) {
        const toDelete = currentDbItems.filter(item => !validDbIds.includes(item.id)).map(i => i.id);
        if (toDelete.length > 0) {
          await sb.from('fixed_costs').delete().in('id', toDelete);
        }
      }

      // Upsert dos itens
      for (let i = 0; i < costsArray.length; i++) {
        const item = costsArray[i];
        const payload = {
          description: item.description,
          monthly_value: Number(item.monthly_value || 0),
          sort_order: i + 1,
          updated_at: new Date().toISOString()
        };

        if (item.id && !item.id.startsWith('fc-') && !item.id.startsWith('local-')) {
          await sb.from('fixed_costs').update(payload).eq('id', item.id);
        } else {
          payload.created_at = new Date().toISOString();
          const { data: inserted } = await sb.from('fixed_costs').insert(payload).select().single();
          if (inserted) {
            costsArray[i].id = inserted.id;
          }
        }
      }

      localStorage.setItem('PM_FIXED_COSTS', JSON.stringify(costsArray));
      return { success: true, data: costsArray };
    } catch (e) {
      console.warn('Erro ao salvar fixed_costs no Supabase:', e);
      return { success: false, error: e, isLocal: true };
    }
  }

  return { success: true, data: costsArray, isLocal: true };
}

/**
 * Busca canais de venda
 */
export async function fetchSalesChannelsFromDB() {
  const sb = getSupabase();
  if (sb) {
    try {
      const { data, error } = await sb
        .from('sales_channels')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true });

      if (!error && data && data.length > 0) {
        localStorage.setItem('PM_SALES_CHANNELS', JSON.stringify(data));
        return data;
      }
    } catch (e) {
      console.warn('Erro ao ler sales_channels do Supabase:', e);
    }
  }

  // Fallback Local
  const local = localStorage.getItem('PM_SALES_CHANNELS');
  if (local) {
    try {
      const parsed = JSON.parse(local);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch (e) {}
  }
  return [...DEFAULT_SALES_CHANNELS];
}

/**
 * Salva canais de venda em massa
 */
export async function saveAllSalesChannelsToDB(channelsArray) {
  localStorage.setItem('PM_SALES_CHANNELS', JSON.stringify(channelsArray));

  const sb = getSupabase();
  if (sb) {
    try {
      const validDbIds = channelsArray.filter(c => c.id && !c.id.startsWith('sc-') && !c.id.startsWith('local-')).map(c => c.id);
      
      const { data: currentDbItems } = await sb.from('sales_channels').select('id');
      if (currentDbItems) {
        const toDelete = currentDbItems.filter(item => !validDbIds.includes(item.id)).map(i => i.id);
        if (toDelete.length > 0) {
          await sb.from('sales_channels').delete().in('id', toDelete);
        }
      }

      for (let i = 0; i < channelsArray.length; i++) {
        const item = channelsArray[i];
        const payload = {
          name: item.name,
          fee_percent: Number(item.fee_percent || 0),
          share_percent: Number(item.share_percent || 0),
          sort_order: i + 1,
          updated_at: new Date().toISOString()
        };

        if (item.id && !item.id.startsWith('sc-') && !item.id.startsWith('local-')) {
          await sb.from('sales_channels').update(payload).eq('id', item.id);
        } else {
          payload.created_at = new Date().toISOString();
          const { data: inserted } = await sb.from('sales_channels').insert(payload).select().single();
          if (inserted) {
            channelsArray[i].id = inserted.id;
          }
        }
      }

      localStorage.setItem('PM_SALES_CHANNELS', JSON.stringify(channelsArray));
      return { success: true, data: channelsArray };
    } catch (e) {
      console.warn('Erro ao salvar sales_channels no Supabase:', e);
      return { success: false, error: e, isLocal: true };
    }
  }

  return { success: true, data: channelsArray, isLocal: true };
}

/**
 * ==============================================================================
 * MÓDULO DE FICHAS TÉCNICAS E CMV — SINCRONIZAÇÃO COMPLETA COM O SUPABASE
 * Salva insumos, sub-receitas, fichas técnicas, itens e simulações de vendas
 * ==============================================================================
 */

/**
 * Salva todos os dados de receitas no Supabase
 */
export async function saveAllRecipeDataToSupabase(recipeState) {
  const sb = getSupabase();
  if (!sb) {
    return { success: false, error: 'Supabase não conectado', isLocal: true };
  }

  try {
    // 1. INSUMOS (recipe_ingredients)
    const ingPayload = (recipeState.ingredients || []).map(i => ({
      code: i.code,
      name: i.name,
      category: i.category,
      type: i.type || 'ingrediente',
      purchase_quantity: Number(i.purchase_quantity || 1),
      purchase_unit: i.purchase_unit || 'un',
      purchase_price: Number(i.purchase_price || 0),
      base_unit: i.base_unit || 'un',
      unit_cost: Number(i.unit_cost || 0),
      default_correction_factor: Number(i.default_correction_factor || 1.0),
      notes: i.notes || '',
      updated_at: new Date().toISOString()
    }));

    let savedIngredients = [];
    if (ingPayload.length > 0) {
      const { data: upsertedIngs, error: ingErr } = await sb
        .from('recipe_ingredients')
        .upsert(ingPayload, { onConflict: 'code' })
        .select();

      if (ingErr) {
        console.warn('Erro ao sincronizar recipe_ingredients:', ingErr);
      } else if (upsertedIngs) {
        savedIngredients = upsertedIngs;
        // Mapeia IDs do banco de volta para o estado local
        upsertedIngs.forEach(dbIng => {
          const localIng = recipeState.ingredients.find(i => i.code === dbIng.code);
          if (localIng) localIng.id = dbIng.id;
        });
      }
    }

    // 2. FICHAS TÉCNICAS E SUB-RECEITAS (recipe_sheets)
    const allSheets = [
      ...(recipeState.subRecipes || []).map(s => ({ ...s, type: 'sub_recipe' })),
      ...(recipeState.recipes || []).map(r => ({ ...r, type: 'final_product' }))
    ];

    const sheetsPayload = allSheets.map((s, idx) => ({
      code: s.code,
      name: s.name,
      type: s.type,
      category: s.category || (s.type === 'sub_recipe' ? 'Sub-Receitas' : 'Lanches'),
      yield_portions: Number(s.yield_portions || 1),
      yield_unit: s.yield_unit || 'un',
      portion_size_description: s.portion_size_description || '',
      waste_percent: Number(s.waste_percent || 0),
      sale_price: Number(s.sale_price || 0),
      suggested_price: Number(s.suggested_price || 0),
      preparation_method: s.preparation_method || '',
      notes: s.notes || '',
      sort_order: Number(s.sort_order || idx + 1),
      updated_at: new Date().toISOString()
    }));

    let savedSheets = [];
    if (sheetsPayload.length > 0) {
      const { data: upsertedSheets, error: sheetErr } = await sb
        .from('recipe_sheets')
        .upsert(sheetsPayload, { onConflict: 'code' })
        .select();

      if (sheetErr) {
        console.warn('Erro ao sincronizar recipe_sheets:', sheetErr);
      } else if (upsertedSheets) {
        savedSheets = upsertedSheets;
        upsertedSheets.forEach(dbSheet => {
          const localSub = recipeState.subRecipes?.find(s => s.code === dbSheet.code);
          if (localSub) localSub.id = dbSheet.id;
          const localRec = recipeState.recipes?.find(r => r.code === dbSheet.code);
          if (localRec) localRec.id = dbSheet.id;
        });
      }
    }

    // 3. ITENS DAS FICHAS TÉCNICAS (recipe_sheet_items)
    if (savedSheets.length > 0) {
      const allSheetItems = [];

      allSheets.forEach(sheet => {
        const dbSheet = savedSheets.find(s => s.code === sheet.code);
        if (!dbSheet) return;

        (sheet.items || []).forEach((item, itemIdx) => {
          // Resolve ID do ingrediente ou sub-receita
          let resolvedIngId = null;
          let resolvedSubId = null;

          if (item.ingredient_id) {
            const matchedIng = savedIngredients.find(i => i.id === item.ingredient_id || i.code === item.ingredient_code);
            resolvedIngId = matchedIng?.id || (item.ingredient_id.startsWith('ing-') ? null : item.ingredient_id);
          }

          if (item.sub_recipe_id) {
            const matchedSub = savedSheets.find(s => s.id === item.sub_recipe_id || s.code === item.sub_recipe_code);
            resolvedSubId = matchedSub?.id || (item.sub_recipe_id.startsWith('sub-') ? null : item.sub_recipe_id);
          }

          allSheetItems.push({
            recipe_id: dbSheet.id,
            item_type: item.item_type || (resolvedSubId ? 'sub_recipe' : (item.type === 'embalagem' ? 'packaging' : 'ingredient')),
            ingredient_id: resolvedIngId,
            sub_recipe_id: resolvedSubId,
            item_name: item.item_name || 'Item',
            net_quantity: Number(item.net_quantity || 0),
            unit: item.unit || 'un',
            correction_factor: Number(item.correction_factor || 1.0),
            notes: item.notes || '',
            sort_order: itemIdx + 1,
            updated_at: new Date().toISOString()
          });
        });
      });

      const sheetIds = savedSheets.map(s => s.id);
      // Remove itens antigos das receitas salvas e reinsere os atualizados
      await sb.from('recipe_sheet_items').delete().in('recipe_id', sheetIds);
      if (allSheetItems.length > 0) {
        const { error: itemsErr } = await sb.from('recipe_sheet_items').insert(allSheetItems);
        if (itemsErr) console.warn('Erro ao inserir recipe_sheet_items:', itemsErr);
      }
    }

    // 4. SIMULAÇÃO DE VENDAS (recipe_sales_simulations)
    if (savedSheets.length > 0 && recipeState.simulations) {
      const simPayload = [];
      (recipeState.recipes || []).forEach(r => {
        const dbSheet = savedSheets.find(s => s.code === r.code);
        if (dbSheet) {
          const units = recipeState.simulations[r.id] ?? recipeState.simulations[r.code] ?? 100;
          simPayload.push({
            recipe_id: dbSheet.id,
            estimated_monthly_units: Number(units || 0),
            updated_at: new Date().toISOString()
          });
        }
      });

      if (simPayload.length > 0) {
        await sb.from('recipe_sales_simulations').upsert(simPayload, { onConflict: 'recipe_id' });
      }
    }

    return { success: true };
  } catch (err) {
    console.warn('Erro completo ao salvar receitas no Supabase:', err);
    return { success: false, error: err };
  }
}

/**
 * Lê todos os dados de receitas do Supabase
 */
export async function fetchRecipeDataFromSupabase() {
  const sb = getSupabase();
  if (!sb) return null;

  try {
    const [resIng, resRec, resSim] = await Promise.all([
      sb.from('recipe_ingredients').select('*').order('code', { ascending: true }),
      sb.from('recipe_sheets').select('*, recipe_sheet_items(*)').order('sort_order', { ascending: true }),
      sb.from('recipe_sales_simulations').select('*')
    ]);

    if (resIng.error && resRec.error) return null;

    const ingredients = resIng.data || [];
    const subRecipes = [];
    const recipes = [];
    const simulations = {};

    if (resRec.data) {
      resRec.data.forEach(r => {
        const formatted = {
          ...r,
          items: (r.recipe_sheet_items || []).map(it => ({
            ...it,
            net_quantity: Number(it.net_quantity),
            correction_factor: Number(it.correction_factor || 1.0)
          }))
        };
        if (r.type === 'sub_recipe') {
          subRecipes.push(formatted);
        } else {
          recipes.push(formatted);
        }
      });
    }

    if (resSim.data) {
      resSim.data.forEach(s => {
        simulations[s.recipe_id] = s.estimated_monthly_units;
      });
    }

    return { ingredients, subRecipes, recipes, simulations };
  } catch (err) {
    console.warn('Erro ao ler receitas do Supabase:', err);
    return null;
  }
}

/**
 * Exclui um insumo do Supabase
 */
export async function deleteIngredientFromSupabase(ingredientId, code) {
  const sb = getSupabase();
  if (!sb) return { success: true };

  try {
    if (ingredientId && !ingredientId.startsWith('ing-')) {
      await sb.from('recipe_ingredients').delete().eq('id', ingredientId);
    } else if (code) {
      await sb.from('recipe_ingredients').delete().eq('code', code);
    }
    return { success: true };
  } catch (err) {
    console.warn('Erro ao excluir ingrediente do Supabase:', err);
    return { success: false, error: err };
  }
}

/**
 * Exclui uma ficha técnica ou sub-receita do Supabase
 */
export async function deleteRecipeFromSupabase(recipeId, code) {
  const sb = getSupabase();
  if (!sb) return { success: true };

  try {
    if (recipeId && !recipeId.startsWith('rec-') && !recipeId.startsWith('sub-')) {
      await sb.from('recipe_sheets').delete().eq('id', recipeId);
    } else if (code) {
      await sb.from('recipe_sheets').delete().eq('code', code);
    }
    return { success: true };
  } catch (err) {
    console.warn('Erro ao excluir ficha técnica do Supabase:', err);
    return { success: false, error: err };
  }
}

