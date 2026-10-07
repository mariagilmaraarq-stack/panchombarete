/**
 * PANCHO MBARATE — PRODUTOS, ADICIONAIS E BEBIDAS OFICIAIS
 * Ciudad del Este, Paraguay
 */
import { 
  fetchActiveProductsFromDB, 
  fetchActiveAddonsFromDB, 
  fetchAllProductsFromDB, 
  fetchActiveDrinksFromDB 
} from './supabase.js';

// Categorias Oficiais por Tipo de Produto
export const PRODUCT_CATEGORIES = {
  alimento: [
    'Cachorro-quente',
    'Lanches',
    'Porções',
    'Adicionais',
    'Outros'
  ],
  bebida: [
    'Refrigerante',
    'Água',
    'Suco',
    'Outros'
  ]
};

// Formatação estrita de moeda: ex: 28.500 Gs. ou 28.500,50 Gs.
export function formatGs(value) {
  if (value === null || value === undefined || isNaN(value)) return '0 Gs.';
  const num = Number(value);
  if (Number.isInteger(num)) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ' Gs.';
  }
  const fixed = num.toFixed(2);
  const [intPart, decPart] = fixed.split('.');
  return intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ',' + decPart + ' Gs.';
}

export function generateSlug(text) {
  const base = String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  return base || 'produto-' + Date.now();
}

// Catálogo Oficial Padrão de Panchos (Alimentos)
export const DEFAULT_PRODUCTS = [
  {
    id: 'prod-pyaguasu',
    name: "Pancho Py'aguasu",
    name_es: "Pancho Py'aguasu",
    slug: 'pancho-pyaguasu',
    description: 'Pão macio aquecido, maionese artesanal da casa, 1 salsicha de primeira linha, ketchup, mostarda, ervilhas, milho fresco, vinagrete caseiro, queijo e batata palha fininha crocante.',
    description_es: 'Pan suave calentito, mayonesa artesanal de la casa, 1 salchicha de primera calidad, kétchup, mostaza, arvejas, choclo fresco, vinagreta casera, queso y papas al hilo bien crujientes.',
    price_gs: 15000,
    promotional_price_gs: null,
    cmv_gs: 6000,
    sausages_qty: 1,
    image_url: 'assets/images/pancho_pyaguasu.jpg',
    highlight: null,
    highlight_es: null,
    type: 'alimento',
    category: 'Cachorro-quente',
    active: true,
    sort_order: 1
  },
  {
    id: 'prod-mbarate',
    name: 'Pancho Mbarate',
    name_es: 'Pancho Mbarate',
    slug: 'pancho-mbarate',
    description: 'Pão macio aquecido, maionese artesanal da casa, 2 salsichas de primeira linha, ketchup, mostarda, ervilhas, milho fresco, vinagrete caseiro, queijo e batata palha fininha crocante.',
    description_es: 'Pan suave calentito, mayonesa artesanal de la casa, 2 salchichas de primera calidad, kétchup, mostaza, arvejas, choclo fresco, vinagreta casera, queso y papas al hilo bien crujientes.',
    price_gs: 20000,
    promotional_price_gs: null,
    cmv_gs: 8500,
    sausages_qty: 2,
    image_url: 'assets/images/pancho_mbarate.jpg',
    highlight: '🔥 MAIS PEDIDO',
    highlight_es: '🔥 MÁS PEDIDO',
    type: 'alimento',
    category: 'Cachorro-quente',
    active: true,
    sort_order: 2
  },
  {
    id: 'prod-mbarate-guasu',
    name: 'Pancho Mbarate Guasu',
    name_es: 'Pancho Mbarate Guasu',
    slug: 'pancho-mbarate-guasu',
    description: 'Pão macio aquecido, maionese artesanal da casa, 3 salsichas de primeira linha, ketchup, mostarda, ervilhas, milho fresco, vinagrete caseiro, queijo e batata palha fininha crocante.',
    description_es: 'Pan suave calentito, mayonesa artesanal de la casa, 3 salchichas de primera calidad, kétchup, mostaza, arvejas, choclo fresco, vinagreta casera, queso y papas al hilo bien crujientes.',
    price_gs: 22000,
    promotional_price_gs: null,
    cmv_gs: 10500,
    sausages_qty: 3,
    image_url: 'assets/images/pancho_mbarate_guasu.jpg',
    highlight: '💪 PARA QUEM ESTÁ COM FOME',
    highlight_es: '💪 PARA LOS QUE TIENEN HAMBRE',
    type: 'alimento',
    category: 'Cachorro-quente',
    active: true,
    sort_order: 3
  }
];

// Catálogo Oficial de Adicionais
export const DEFAULT_ADDONS = [
  {
    id: 'addon-salsicha-extra',
    name: 'Salsicha Extra',
    price_gs: 2500,
    cmv_gs: 1200,
    icon: '🌭',
    active: true,
    sort_order: 1
  },
  {
    id: 'addon-queijo-extra',
    name: 'Queijo Extra',
    price_gs: 6000,
    cmv_gs: 2500,
    icon: '🧀',
    active: true,
    sort_order: 2
  }
];

// Catálogo Oficial de Bebidas Geladas
export const DEFAULT_DRINKS = [
  {
    id: 'drink-coca-cola',
    name: 'Coca-Cola Original',
    name_es: 'Coca-Cola Original 350ml',
    slug: 'coca-cola-350ml',
    description: 'Lata 350ml geladíssima com gás perfeito',
    description_es: 'Lata 350ml bien helada con gas perfecto.',
    price_gs: 7000,
    promotional_price_gs: null,
    cmv_gs: 3500,
    image_url: 'assets/images/coca_cola.jpg',
    highlight: '❄️ GELADA',
    highlight_es: '❄️ BIEN HELADA',
    icon: '🥤',
    type: 'bebida',
    category: 'Refrigerante',
    active: true,
    sort_order: 1
  },
  {
    id: 'drink-guarana',
    name: 'Guaraná Antarctica',
    name_es: 'Guaraná Antarctica 350ml',
    slug: 'guarana-antarctica-350ml',
    description: 'Lata 350ml trincando de gelada',
    description_es: 'Lata 350ml bien helada de Guaraná Antarctica.',
    price_gs: 7000,
    promotional_price_gs: null,
    cmv_gs: 3500,
    image_url: 'assets/images/guarana.jpg',
    highlight: null,
    highlight_es: null,
    icon: '⚡',
    type: 'bebida',
    category: 'Refrigerante',
    active: true,
    sort_order: 2
  },
  {
    id: 'drink-water',
    name: 'Água Mineral Gelada',
    name_es: 'Agua Mineral sin Gas 500ml',
    slug: 'agua-mineral-500ml',
    description: 'Garrafa 500ml natural ou refrescante com gelo',
    description_es: 'Botella de agua mineral pura y refrescante 500ml.',
    price_gs: 5000,
    promotional_price_gs: null,
    cmv_gs: 2000,
    image_url: 'assets/images/mineral_water.jpg',
    highlight: null,
    highlight_es: null,
    icon: '💧',
    type: 'bebida',
    category: 'Água',
    active: true,
    sort_order: 3
  }
];

/**
 * Lê produtos do LocalStorage. Se não existirem, inicializa com os padrões oficiais.
 */
export function getLocalProducts() {
  try {
    const raw = localStorage.getItem('PM_PRODUCTS');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Erro ao ler produtos locais:', e);
  }

  // Inicialização padrão
  const initial = [...DEFAULT_PRODUCTS, ...DEFAULT_DRINKS];
  try {
    localStorage.setItem('PM_PRODUCTS', JSON.stringify(initial));
  } catch (e) {
    console.warn('Erro ao salvar produtos padrão locais:', e);
  }
  return initial;
}

/**
 * Salva ou atualiza produto no armazenamento local
 */
export function saveProductLocally(productData) {
  try {
    const list = getLocalProducts();
    const now = new Date().toISOString();

    const priceNum = Number(productData.price_gs);
    const promoNum = productData.promotional_price_gs !== null && productData.promotional_price_gs !== undefined && productData.promotional_price_gs !== ''
      ? Number(productData.promotional_price_gs)
      : null;

    let savedProduct = null;

    if (productData.id) {
      const index = list.findIndex(p => p.id === productData.id);
      if (index !== -1) {
        savedProduct = {
          ...list[index],
          ...productData,
          price_gs: isNaN(priceNum) ? list[index].price_gs : priceNum,
          promotional_price_gs: isNaN(promoNum) ? null : promoNum,
          active: productData.active !== false && productData.active !== 'false',
          updated_at: now
        };
        list[index] = savedProduct;
      }
    }

    if (!savedProduct) {
      const newId = productData.id || ('local-prod-' + Date.now() + '-' + Math.floor(Math.random() * 1000));
      savedProduct = {
        id: newId,
        name: productData.name,
        name_es: productData.name_es !== undefined && productData.name_es !== null && productData.name_es.trim() !== '' ? productData.name_es.trim() : null,
        slug: productData.slug || generateSlug(productData.name),
        description: productData.description || '',
        description_es: productData.description_es !== undefined && productData.description_es !== null && productData.description_es.trim() !== '' ? productData.description_es.trim() : null,
        price_gs: isNaN(priceNum) ? 0 : priceNum,
        promotional_price_gs: isNaN(promoNum) ? null : promoNum,
        type: productData.type || 'alimento',
        category: productData.category || 'Outros',
        image_url: productData.image_url || '',
        highlight: productData.highlight || null,
        highlight_es: productData.highlight_es !== undefined && productData.highlight_es !== null && productData.highlight_es.trim() !== '' ? productData.highlight_es.trim() : null,
        cmv_gs: Number(productData.cmv_gs || 0),
        sausages_qty: Number(productData.sausages_qty || (productData.type === 'alimento' ? 1 : 0)),
        active: productData.active !== false && productData.active !== 'false',
        sort_order: Number(productData.sort_order || list.length + 1),
        created_at: now,
        updated_at: now
      };
      list.push(savedProduct);
    }

    localStorage.setItem('PM_PRODUCTS', JSON.stringify(list));
    return { success: true, product: savedProduct, isLocal: true };
  } catch (err) {
    console.error('Erro ao salvar produto localmente:', err);
    return { success: false, error: err };
  }
}

/**
 * Remove ou desativa produto no armazenamento local
 */
export function deleteProductLocally(productId, softDeleteOnly = false) {
  try {
    const list = getLocalProducts();
    const index = list.findIndex(p => p.id === productId);
    if (index === -1) return { success: false, error: 'Produto não encontrado' };

    if (softDeleteOnly) {
      list[index].active = false;
      list[index].updated_at = new Date().toISOString();
    } else {
      list.splice(index, 1);
    }

    localStorage.setItem('PM_PRODUCTS', JSON.stringify(list));
    return { success: true, softDeleted: softDeleteOnly };
  } catch (err) {
    console.error('Erro ao excluir produto localmente:', err);
    return { success: false, error: err };
  }
}

/**
 * Busca todos os produtos para a gestão no Painel Admin (Alimentos e Bebidas, Ativos e Inativos)
 */
export async function getAllProducts() {
  try {
    const dbProducts = await fetchAllProductsFromDB();
    if (dbProducts && dbProducts.length > 0) return dbProducts;
  } catch (err) {
    console.info('Usando produtos locais para administração.');
  }
  return getLocalProducts();
}

/**
 * Busca alimentos ativos para o cardápio público
 */
export async function getActiveProducts() {
  try {
    const dbProducts = await fetchActiveProductsFromDB();
    if (dbProducts && dbProducts.length > 0) {
      return dbProducts.filter(p => p.type === 'alimento' || !p.type);
    }
  } catch (err) {
    console.info('Usando alimentos locais.');
  }

  const local = getLocalProducts();
  const activeFoods = local.filter(p => p.active !== false && (p.type === 'alimento' || !p.type));
  if (activeFoods.length > 0) return activeFoods;

  return DEFAULT_PRODUCTS;
}

/**
 * Busca adicionais ativos para o cardápio público
 */
export async function getActiveAddons() {
  try {
    const dbAddons = await fetchActiveAddonsFromDB();
    if (dbAddons && dbAddons.length > 0) return dbAddons;
  } catch (err) {
    console.info('Usando adicionais locais padrão.');
  }
  return DEFAULT_ADDONS;
}

/**
 * Busca bebidas ativas para o cardápio público
 */
export async function getActiveDrinks() {
  try {
    const dbDrinks = await fetchActiveDrinksFromDB();
    if (dbDrinks && dbDrinks.length > 0) return dbDrinks;
  } catch (err) {
    console.info('Usando bebidas locais.');
  }

  const local = getLocalProducts();
  const activeDrinks = local.filter(p => p.active !== false && p.type === 'bebida');
  if (activeDrinks.length > 0) return activeDrinks;

  return DEFAULT_DRINKS;
}

