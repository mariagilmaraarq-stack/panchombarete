/**
 * PANCHO MBARATE — CONTROLADOR DO PAINEL ADMINISTRATIVO
 */
import { APP_CONFIG } from './config.js';
import { 
  getAllProducts, 
  getActiveProducts, 
  getActiveAddons, 
  getActiveDrinks, 
  formatGs, 
  generateSlug,
  saveProductLocally,
  deleteProductLocally,
  PRODUCT_CATEGORIES,
  DEFAULT_PRODUCTS, 
  DEFAULT_ADDONS, 
  DEFAULT_DRINKS 
} from './products.js';
import { 
  getSupabase, 
  getAdminOrders, 
  updateOrderStatusInDB,
  saveProductToSupabase,
  deleteProductFromSupabase 
} from './supabase.js';

let currentOrders = [];
let allProducts = [];
let allAddons = [];
let allDrinks = [];
let isDemoMode = false;
let pendingDeleteProduct = null;
let pendingHasOrders = false;


document.addEventListener('DOMContentLoaded', async () => {
  setupSidebar();
  setupAuth();
  setupTabs();
  setupSettingsForm();
  setupProductsManagement();
  window.lucide?.createIcons();
});

/**
 * Autenticação Supabase Auth ou Modo Demo
 */
function setupAuth() {
  const loginScreen = document.getElementById('admin-login-screen');
  const dashboardContainer = document.getElementById('admin-dashboard-container');
  const loginForm = document.getElementById('admin-login-form');
  const demoBtn = document.getElementById('btn-demo-access');
  const logoutBtn = document.getElementById('btn-admin-logout');
  const errorMsg = document.getElementById('login-error-msg');
  const sessionBadge = document.getElementById('admin-session-badge');

  const checkExistingSession = async () => {
    const sb = getSupabase();
    if (sb) {
      const { data } = await sb.auth.getSession();
      if (data?.session) {
        unlockDashboard(false, data.session.user.email);
        return;
      }
    }

    if (sessionStorage.getItem('PM_ADMIN_LOGGED') === 'true') {
      unlockDashboard(true, 'Admin Demo Local');
    }
  };

  const unlockDashboard = async (isDemo, email = 'admin@panchombarate.com') => {
    isDemoMode = isDemo;
    loginScreen.classList.add('hidden');
    dashboardContainer.classList.remove('hidden');
    if (sessionBadge) {
      sessionBadge.textContent = isDemo ? '● Modo Local (Demo)' : `● ${email}`;
    }
    window.lucide?.createIcons();
    await loadDashboardData();
    window.lucide?.createIcons();
  };

  loginForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('admin-email').value.trim();
    const password = document.getElementById('admin-password').value.trim();
    const submitBtn = document.getElementById('btn-login-submit');

    submitBtn.disabled = true;
    submitBtn.textContent = 'Autenticando...';
    errorMsg.classList.add('hidden');

    const cleanUser = email.toLowerCase();
    const isMasterUser = (cleanUser === 'panchombarete' || cleanUser === 'panchombarate' || cleanUser === 'admin' || cleanUser === 'pancho' || cleanUser === 'panchombarete@panchombarate.com' || cleanUser === 'admin@panchombarate.com');
    const isMasterPass = (password === '25051995');

    // Validação direta com as credenciais mestras do gestor
    if (isMasterUser && isMasterPass) {
      sessionStorage.setItem('PM_ADMIN_LOGGED', 'true');
      unlockDashboard(true, 'panchombarete');
      submitBtn.disabled = false;
      submitBtn.textContent = 'ENTRAR NO PAINEL';
      return;
    }

    const sb = getSupabase();
    if (sb && email.includes('@')) {
      try {
        const { data, error } = await sb.auth.signInWithPassword({ email, password });
        if (error) throw error;
        sessionStorage.setItem('PM_ADMIN_LOGGED', 'true');
        unlockDashboard(false, data.user.email);
        return;
      } catch (err) {
        // Fallback se não bater no Supabase
        if (isMasterPass) {
          sessionStorage.setItem('PM_ADMIN_LOGGED', 'true');
          unlockDashboard(true, email || 'panchombarete');
          return;
        }
        errorMsg.textContent = 'Credenciais incorretas.';
        errorMsg.classList.remove('hidden');
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'ENTRAR NO PAINEL';
      }
    } else {
      if (isMasterPass || password === 'admin' || (cleanUser && password.length >= 4)) {
        sessionStorage.setItem('PM_ADMIN_LOGGED', 'true');
        unlockDashboard(true, email || 'panchombarete');
      } else {
        errorMsg.textContent = 'Usuário ou senha incorretos.';
        errorMsg.classList.remove('hidden');
      }
      submitBtn.disabled = false;
      submitBtn.textContent = 'ENTRAR NO PAINEL';
    }
  });

  demoBtn?.addEventListener('click', () => {
    sessionStorage.setItem('PM_ADMIN_LOGGED', 'true');
    unlockDashboard(true, 'Admin Demo Local');
  });

  logoutBtn?.addEventListener('click', async () => {
    const sb = getSupabase();
    if (sb) {
      await sb.auth.signOut();
    }
    sessionStorage.removeItem('PM_ADMIN_LOGGED');
    window.location.reload();
  });

  checkExistingSession();
}

/**
 * Carrega dados de pedidos, métricas e produtos
 */
async function loadDashboardData() {
  allProducts = await getAllProducts();
  allAddons = await getActiveAddons();
  allDrinks = await getActiveDrinks();
  currentOrders = await getAdminOrders();

  if (!currentOrders || currentOrders.length === 0) {
    seedInitialDemoOrders();
    currentOrders = await getAdminOrders();
  }

  updateMetrics();
  renderOrdersTable();
  renderBreakdowns();
  renderProductsTable();
  updateProductKpis();
  populateFilterCategories();
}

/**
 * Cria pedidos de demonstração com lanches, quantidades e bebidas
 */
function seedInitialDemoOrders() {
  const sampleOrders = [
    {
      id: 'local-demo-1',
      order_code: 'PM-20260924-101500-101',
      customer_name: 'Alejandro Benítez',
      pickup_time: '10–15 min',
      subtotal_gs: 40000,
      addons_total_gs: 12000,
      drinks_total_gs: 7000,
      total_gs: 59000,
      cmv_gs: 25500,
      status: 'CONFIRMADO',
      created_at: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
      product: DEFAULT_PRODUCTS[1], // Pancho Mbarate
      productQuantity: 2,
      addons: [DEFAULT_ADDONS[1]], // Queijo Extra
      drinks: [{ drink: DEFAULT_DRINKS[0], quantity: 1 }] // Coca-Cola
    },
    {
      id: 'local-demo-2',
      order_code: 'PM-20260924-103000-202',
      customer_name: 'Gabriela Duarte',
      pickup_time: 'Agora',
      subtotal_gs: 22000,
      addons_total_gs: 2500,
      drinks_total_gs: 7000,
      total_gs: 31500,
      cmv_gs: 15200,
      status: 'RETIRADO',
      created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      product: DEFAULT_PRODUCTS[2], // Pancho Mbarate Guasu
      productQuantity: 1,
      addons: [DEFAULT_ADDONS[0]], // Salsicha Extra
      drinks: [{ drink: DEFAULT_DRINKS[1], quantity: 1 }] // Guaraná
    },
    {
      id: 'local-demo-3',
      order_code: 'PM-20260924-104500-303',
      customer_name: 'Rodrigo Romero',
      pickup_time: '20–30 min',
      subtotal_gs: 15000,
      addons_total_gs: 0,
      drinks_total_gs: 5000,
      total_gs: 20000,
      cmv_gs: 8000,
      status: 'INICIADO',
      created_at: new Date().toISOString(),
      product: DEFAULT_PRODUCTS[0], // Pancho Py'aguasu
      productQuantity: 1,
      addons: [],
      drinks: [{ drink: DEFAULT_DRINKS[2], quantity: 1 }] // Água Mineral
    }
  ];

  localStorage.setItem('PM_LOCAL_ORDERS', JSON.stringify(sampleOrders));
}

/**
 * Atualiza métricas financeiras
 */
function updateMetrics() {
  const statTodayOrders = document.getElementById('stat-today-orders');
  const statConfirmedRev = document.getElementById('stat-confirmed-revenue');
  const statConfirmedCmv = document.getElementById('stat-confirmed-cmv');
  const statConfirmedProfit = document.getElementById('stat-confirmed-profit');
  const statPendingLabel = document.getElementById('stat-pending-label');

  let totalOrdersCount = currentOrders.length;
  let pendingOrdersCount = 0;
  let confirmedRevenue = 0;
  let confirmedCmv = 0;

  currentOrders.forEach((o) => {
    if (o.status === 'INICIADO' || o.status === 'WHATSAPP_ABERTO') {
      pendingOrdersCount++;
    }

    if (o.status === 'CONFIRMADO' || o.status === 'RETIRADO') {
      confirmedRevenue += Number(o.total_gs || 0);
      confirmedCmv += Number(o.cmv_gs || 0);
    }
  });

  const estimatedProfit = confirmedRevenue - confirmedCmv;

  if (statTodayOrders) statTodayOrders.textContent = totalOrdersCount;
  if (statPendingLabel) statPendingLabel.textContent = `${pendingOrdersCount} aguardando`;
  if (statConfirmedRev) statConfirmedRev.textContent = formatGs(confirmedRevenue);
  if (statConfirmedCmv) statConfirmedCmv.textContent = formatGs(confirmedCmv);
  if (statConfirmedProfit) statConfirmedProfit.textContent = formatGs(estimatedProfit);
}

/**
 * Renderiza tabela de pedidos com suporte a quantidades e bebidas
 */
function renderOrdersTable() {
  const tbody = document.getElementById('orders-table-body');
  const emptyState = document.getElementById('orders-empty-state');
  const filterSelect = document.getElementById('filter-order-status');
  const currentFilter = filterSelect?.value || 'ALL';

  if (!tbody) return;
  tbody.innerHTML = '';

  const filteredOrders = currentOrders.filter(o => {
    if (currentFilter === 'ALL') return true;
    return o.status === currentFilter;
  });

  if (filteredOrders.length === 0) {
    emptyState?.classList.remove('hidden');
    return;
  }
  emptyState?.classList.add('hidden');

  filteredOrders.forEach(order => {
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-creme/50 transition-colors';

    let statusClass = 'bg-slate-100 text-slate-700';
    if (order.status === 'INICIADO') statusClass = 'bg-amber-100 text-amber-800';
    if (order.status === 'WHATSAPP_ABERTO') statusClass = 'bg-blue-100 text-blue-800';
    if (order.status === 'CONFIRMADO') statusClass = 'bg-emerald-100 text-emerald-800';
    if (order.status === 'RETIRADO') statusClass = 'bg-purple-100 text-purple-800';
    if (order.status === 'CANCELADO') statusClass = 'bg-rose-100 text-rose-800';

    // Itens info
    let panchoLabels = [];
    if (order.products && order.products.length > 0) {
      panchoLabels = order.products.map(p => `${p.quantity}x ${p.product.name}`);
    } else if (order.order_items && order.order_items.length > 0) {
      const panchoItems = order.order_items.filter(item => {
        return !order.drinks?.some(d => d.drink?.id === item.product_id || d.drink?.name === item.product_name);
      });
      if (panchoItems.length > 0) {
        panchoLabels = panchoItems.map(i => `${i.quantity}x ${i.product_name}`);
      }
    }
    if (panchoLabels.length === 0 && order.product) {
      const qty = order.productQuantity || 1;
      panchoLabels = [`${qty > 1 ? qty + 'x ' : ''}${order.product.name}`];
    }
    const panchoLabel = panchoLabels.join(', ') || 'Nenhum Pancho';

    const addonsList = order.addons?.map(a => a.name) || order.order_addons?.map(a => a.addon_name) || [];
    const addonsString = addonsList.length > 0 ? `+ ${addonsList.join(', ')}` : '';

    const drinksList = order.drinks?.map(d => `${d.quantity}x ${d.drink?.name || d.name}`) || [];
    const drinksString = drinksList.length > 0 ? `🥤 ${drinksList.join(', ')}` : '';

    const timeFormatted = order.created_at ? new Date(order.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '--:--';

    tr.innerHTML = `
      <td class="py-3 px-3 font-mono font-bold text-[11px] text-coffee">
        ${order.order_code}
        <span class="block text-[10px] text-coffee-soft font-normal">${timeFormatted}</span>
      </td>
      <td class="py-3 px-3 font-extrabold text-coffee">
        ${order.customer_name}
      </td>
      <td class="py-3 px-3">
        <span class="font-extrabold text-coffee block">${panchoLabel}</span>
        ${addonsString ? `<span class="text-[10px] text-coffee-soft block">${addonsString}</span>` : ''}
        ${drinksString ? `<span class="text-[10px] text-emerald-700 font-bold block">${drinksString}</span>` : ''}
      </td>
      <td class="py-3 px-3 font-bold text-coffee">
        ⏱️ ${order.pickup_time}
      </td>
      <td class="py-3 px-3 font-black text-coffee">
        ${formatGs(order.total_gs)}
      </td>
      <td class="py-3 px-3 font-medium text-coffee-soft">
        ${formatGs(order.cmv_gs)}
      </td>
      <td class="py-3 px-3">
        <select class="order-status-select px-2.5 py-1.5 rounded-lg text-xs font-black border border-coffee/10 ${statusClass}" data-order-id="${order.id}">
          <option value="INICIADO" ${order.status === 'INICIADO' ? 'selected' : ''}>INICIADO</option>
          <option value="WHATSAPP_ABERTO" ${order.status === 'WHATSAPP_ABERTO' ? 'selected' : ''}>WHATSAPP_ABERTO</option>
          <option value="CONFIRMADO" ${order.status === 'CONFIRMADO' ? 'selected' : ''}>CONFIRMADO</option>
          <option value="RETIRADO" ${order.status === 'RETIRADO' ? 'selected' : ''}>RETIRADO</option>
          <option value="CANCELADO" ${order.status === 'CANCELADO' ? 'selected' : ''}>CANCELADO</option>
        </select>
      </td>
      <td class="py-3 px-3">
        <button class="btn-direct-chat px-2 py-1 rounded bg-whatsapp/15 text-whatsapp hover:bg-whatsapp hover:text-white transition-colors text-xs font-bold" title="Abrir WhatsApp">
          📲 Chat
        </button>
      </td>
    `;

    const select = tr.querySelector('.order-status-select');
    select.addEventListener('change', async (e) => {
      const newStatus = e.target.value;
      await updateOrderStatusInDB(order.id, newStatus);
      order.status = newStatus;
      updateMetrics();
      renderOrdersTable();
    });

    tbody.appendChild(tr);
  });
}

/**
 * Renderiza ranking de produtos e bebidas vendidas
 */
function renderBreakdowns() {
  const prodContainer = document.getElementById('products-breakdown-list');
  const addonContainer = document.getElementById('addons-breakdown-list');

  if (!prodContainer || !addonContainer) return;

  const productCounts = {
    "Pancho Py'aguasu": 0,
    "Pancho Mbarate": 0,
    "Pancho Mbarate Guasu": 0
  };

  const addonCounts = {
    "Salsicha Extra": 0,
    "Queijo Extra": 0
  };

  const drinkCounts = {
    "Coca-Cola Original": 0,
    "Guaraná Antarctica": 0,
    "Água Mineral Gelada": 0
  };

  currentOrders.forEach(o => {
    if (o.products && o.products.length > 0) {
      o.products.forEach(p => {
        const pName = p.product?.name;
        if (pName && productCounts[pName] !== undefined) {
          productCounts[pName] += p.quantity;
        }
      });
    } else {
      const pName = o.product?.name || o.order_items?.[0]?.product_name;
      const qty = o.productQuantity || 1;
      if (pName && productCounts[pName] !== undefined) {
        productCounts[pName] += qty;
      }
    }

    const aList = o.addons || o.order_addons || [];
    aList.forEach(a => {
      const aName = a.name || a.addon_name;
      if (aName && addonCounts[aName] !== undefined) {
        addonCounts[aName] += qty;
      }
    });

    const dList = o.drinks || [];
    dList.forEach(d => {
      const dName = d.drink?.name || d.name;
      if (dName && drinkCounts[dName] !== undefined) {
        drinkCounts[dName] += (d.quantity || 1);
      }
    });
  });

  // Render produtos
  prodContainer.innerHTML = Object.entries(productCounts).map(([name, count]) => `
    <div class="flex items-center justify-between p-3 rounded-2xl bg-creme border border-coffee/10">
      <span class="font-extrabold text-xs text-coffee">${name}</span>
      <span class="px-2.5 py-1 rounded-lg bg-mustard font-black text-xs text-coffee">${count} unidades</span>
    </div>
  `).join('');

  // Render adicionais e bebidas combinados
  let addonsAndDrinksHtml = Object.entries(addonCounts).map(([name, count]) => `
    <div class="flex items-center justify-between p-3 rounded-2xl bg-creme border border-coffee/10">
      <span class="font-extrabold text-xs text-coffee">🧀 ${name}</span>
      <span class="px-2.5 py-1 rounded-lg bg-redSport font-black text-xs text-white">${count} extras</span>
    </div>
  `).join('');

  addonsAndDrinksHtml += Object.entries(drinkCounts).map(([name, count]) => `
    <div class="flex items-center justify-between p-3 rounded-2xl bg-creme border border-coffee/10">
      <span class="font-extrabold text-xs text-coffee">🥤 ${name}</span>
      <span class="px-2.5 py-1 rounded-lg bg-emerald-600 font-black text-xs text-white">${count} vendidas</span>
    </div>
  `).join('');

  addonContainer.innerHTML = addonsAndDrinksHtml;
}

/**
 * Converte URLs de imagem relativas para o caminho correto no admin
 */
function resolveImageUrl(url) {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:') || url.startsWith('/')) {
    return url;
  }
  return '../' + url.replace(/^\.\//, '');
}

/**
 * Exibe notificação flutuante de feedback
 */
function showToast(message, icon = '✓') {
  const toast = document.getElementById('admin-toast');
  const msgEl = document.getElementById('toast-message');
  const iconEl = document.getElementById('toast-icon');
  if (!toast) return;

  if (msgEl) msgEl.textContent = message;
  if (iconEl) iconEl.textContent = icon;

  toast.classList.remove('translate-y-20', 'opacity-0', 'pointer-events-none');
  clearTimeout(window.__toastTimeout);
  window.__toastTimeout = setTimeout(() => {
    toast.classList.add('translate-y-20', 'opacity-0', 'pointer-events-none');
  }, 3500);
}

/**
 * Atualiza indicadores de resumo (KPIs) de produtos
 */
function updateProductKpis() {
  const totalEl = document.getElementById('stat-products-total');
  const foodsEl = document.getElementById('stat-products-foods');
  const drinksEl = document.getElementById('stat-products-drinks');
  const activeEl = document.getElementById('stat-products-active');
  const inactiveEl = document.getElementById('stat-products-inactive');

  const total = allProducts.length;
  const foods = allProducts.filter(p => p.type === 'alimento' || !p.type).length;
  const drinks = allProducts.filter(p => p.type === 'bebida').length;
  const active = allProducts.filter(p => p.active !== false).length;
  const inactive = allProducts.filter(p => p.active === false).length;

  if (totalEl) totalEl.textContent = total;
  if (foodsEl) foodsEl.textContent = foods;
  if (drinksEl) drinksEl.textContent = drinks;
  if (activeEl) activeEl.textContent = active;
  if (inactiveEl) inactiveEl.textContent = `${inactive} inativo(s)`;
}

/**
 * Popula filtro de categorias na barra de ferramentas
 */
function populateFilterCategories() {
  const catSelect = document.getElementById('filter-product-category');
  if (!catSelect) return;

  const currentVal = catSelect.value || 'ALL';
  const categories = new Set();

  allProducts.forEach(p => {
    if (p.category) categories.add(p.category);
  });

  PRODUCT_CATEGORIES.alimento.forEach(c => categories.add(c));
  PRODUCT_CATEGORIES.bebida.forEach(c => categories.add(c));

  const optionsHtml = ['<option value="ALL">Todas as Categorias</option>'];
  Array.from(categories).sort().forEach(cat => {
    optionsHtml.push(`<option value="${cat}" ${cat === currentVal ? 'selected' : ''}>${cat}</option>`);
  });

  catSelect.innerHTML = optionsHtml.join('');
}

/**
 * Popula categorias no formulário modal conforme o tipo selecionado
 */
function populateFormCategories(type, selectedCategory = '') {
  const catSelect = document.getElementById('product-category');
  if (!catSelect) return;

  const baseList = PRODUCT_CATEGORIES[type] || PRODUCT_CATEGORIES.alimento;
  const categories = new Set(baseList);

  allProducts.forEach(p => {
    if ((p.type === type || (!p.type && type === 'alimento')) && p.category) {
      categories.add(p.category);
    }
  });

  catSelect.innerHTML = Array.from(categories).map(cat => `
    <option value="${cat}" ${cat === selectedCategory ? 'selected' : ''}>${cat}</option>
  `).join('');

  if (selectedCategory && categories.has(selectedCategory)) {
    catSelect.value = selectedCategory;
  } else if (catSelect.options.length > 0) {
    catSelect.selectedIndex = 0;
  }
}

/**
 * Renderiza a tabela de produtos cadastrados com busca, filtros e ações
 */
export function renderProductsTable() {
  const tbody = document.getElementById('products-table-body');
  const emptyState = document.getElementById('products-empty-state');
  if (!tbody) return;

  const searchQuery = (document.getElementById('filter-product-search')?.value || '').toLowerCase().trim();
  const typeFilter = document.getElementById('filter-product-type')?.value || 'ALL';
  const categoryFilter = document.getElementById('filter-product-category')?.value || 'ALL';
  const statusFilter = document.getElementById('filter-product-status')?.value || 'ALL';

  const filtered = allProducts.filter(p => {
    // Filtro de busca
    if (searchQuery) {
      const nameMatch = (p.name || '').toLowerCase().includes(searchQuery);
      const catMatch = (p.category || '').toLowerCase().includes(searchQuery);
      const descMatch = (p.description || '').toLowerCase().includes(searchQuery);
      if (!nameMatch && !catMatch && !descMatch) return false;
    }

    // Filtro de tipo
    if (typeFilter !== 'ALL') {
      const pType = p.type || 'alimento';
      if (pType !== typeFilter) return false;
    }

    // Filtro de categoria
    if (categoryFilter !== 'ALL') {
      if (p.category !== categoryFilter) return false;
    }

    // Filtro de status
    if (statusFilter === 'active' && p.active === false) return false;
    if (statusFilter === 'inactive' && p.active !== false) return false;

    return true;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = '';
    emptyState?.classList.remove('hidden');
    return;
  }

  emptyState?.classList.add('hidden');
  tbody.innerHTML = '';

  filtered.forEach(product => {
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-creme/50 transition-colors';

    const isFood = product.type === 'alimento' || !product.type;
    const defaultIcon = isFood ? '🌭' : '🥤';
    const typeLabel = isFood ? '🌭 Alimento' : '🥤 Bebida';
    const typeBadgeClass = isFood ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800';

    const imageMarkup = product.image_url
      ? `<img src="${resolveImageUrl(product.image_url)}" alt="${product.name}" class="w-12 h-12 rounded-xl object-cover border border-coffee/10 bg-white shadow-sm" onerror="this.onerror=null; this.parentElement.innerHTML='<span class=\\'text-2xl\\'>${defaultIcon}</span>'">`
      : `<span class="text-2xl">${defaultIcon}</span>`;

    const priceMarkup = product.promotional_price_gs
      ? `<div>
           <span class="font-black text-xs text-redSport block">${formatGs(product.promotional_price_gs)}</span>
           <span class="text-[10px] text-coffee-soft line-through block font-medium">${formatGs(product.price_gs)}</span>
         </div>`
      : `<span class="font-black text-xs text-coffee">${formatGs(product.price_gs)}</span>`;

    const statusBadge = product.active !== false
      ? `<button type="button" class="btn-toggle-status px-2.5 py-1 rounded-full bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-black text-[10px] transition-colors" data-id="${product.id}" title="Clique para inativar">
           ● Ativo
         </button>`
      : `<button type="button" class="btn-toggle-status px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-black text-[10px] transition-colors" data-id="${product.id}" title="Clique para ativar">
           ○ Inativo
         </button>`;

    tr.innerHTML = `
      <td class="py-3 px-3">
        <div class="w-12 h-12 rounded-xl bg-creme border border-coffee/10 flex items-center justify-center overflow-hidden flex-shrink-0">
          ${imageMarkup}
        </div>
      </td>
      <td class="py-3 px-3">
        <div class="space-y-0.5">
          <div class="flex items-center gap-1.5 flex-wrap">
            <span class="font-black text-xs sm:text-sm text-coffee">${product.name}</span>
            ${product.highlight ? `<span class="px-2 py-0.5 rounded-full bg-redSport-light text-redSport font-black text-[9px] uppercase tracking-wider">${product.highlight}</span>` : ''}
          </div>
          ${product.description ? `<p class="text-[11px] text-coffee-soft line-clamp-1 max-w-xs sm:max-w-md">${product.description}</p>` : ''}
        </div>
      </td>
      <td class="py-3 px-3">
        <span class="px-2.5 py-1 rounded-xl bg-creme border border-coffee/15 text-coffee font-black text-[11px] inline-block">
          ${product.category || (isFood ? 'Cachorro-quente' : 'Bebida')}
        </span>
      </td>
      <td class="py-3 px-3">
        <span class="px-2 py-1 rounded-xl ${typeBadgeClass} font-extrabold text-[11px] inline-block">
          ${typeLabel}
        </span>
      </td>
      <td class="py-3 px-3">
        ${priceMarkup}
      </td>
      <td class="py-3 px-3">
        ${statusBadge}
      </td>
      <td class="py-3 px-3 text-right">
        <div class="flex items-center justify-end gap-1.5">
          <button type="button" class="btn-edit-product px-2.5 py-1.5 rounded-xl bg-creme hover:bg-mustard-light border border-coffee/15 text-coffee font-extrabold text-xs transition-colors flex items-center gap-1" data-id="${product.id}" title="Editar Produto">
            <span>✏️</span>
            <span class="hidden sm:inline">Editar</span>
          </button>
          <button type="button" class="btn-delete-product px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-redSport font-extrabold text-xs transition-colors flex items-center gap-1" data-id="${product.id}" title="Excluir Produto">
            <span>🗑️</span>
            <span class="hidden sm:inline">Excluir</span>
          </button>
        </div>
      </td>
    `;

    tbody.appendChild(tr);
  });

  // Attach event handlers para toggle, editar e excluir
  tbody.querySelectorAll('.btn-toggle-status').forEach(btn => {
    btn.addEventListener('click', async () => {
      const prodId = btn.dataset.id;
      const prod = allProducts.find(p => p.id === prodId);
      if (!prod) return;

      const newStatus = !(prod.active !== false);
      prod.active = newStatus;

      saveProductLocally(prod);
      saveProductToSupabase(prod);

      updateProductKpis();
      renderProductsTable();
      showToast(`Status de "${prod.name}" alterado para ${newStatus ? 'Ativo' : 'Inativo'}.`);
    });
  });

  tbody.querySelectorAll('.btn-edit-product').forEach(btn => {
    btn.addEventListener('click', () => {
      openEditProductModal(btn.dataset.id);
    });
  });

  tbody.querySelectorAll('.btn-delete-product').forEach(btn => {
    btn.addEventListener('click', () => {
      openDeleteProductModal(btn.dataset.id);
    });
  });
}

/**
 * Abre o modal para cadastro de novo produto
 */
function openAddProductModal() {
  const modal = document.getElementById('product-modal');
  const form = document.getElementById('product-form');
  const errorBox = document.getElementById('product-form-error');
  const title = document.getElementById('product-modal-title');
  const idInput = document.getElementById('product-form-id');
  const imgPreview = document.getElementById('product-image-preview');
  const imgPlaceholder = document.getElementById('product-image-placeholder');
  const btnClearImg = document.getElementById('btn-clear-image');

  if (!modal || !form) return;

  form.reset();
  if (idInput) idInput.value = '';
  if (title) title.textContent = 'Adicionar Produto';
  if (errorBox) {
    errorBox.textContent = '';
    errorBox.classList.add('hidden');
  }

  // Predefinições
  const foodRadio = form.querySelector('input[name="product_type"][value="alimento"]');
  if (foodRadio) foodRadio.checked = true;
  populateFormCategories('alimento');

  const statusActive = form.querySelector('input[name="product_status"][value="true"]');
  if (statusActive) statusActive.checked = true;

  // Imagem
  if (imgPreview) {
    imgPreview.src = '';
    imgPreview.classList.add('hidden');
  }
  if (imgPlaceholder) imgPlaceholder.classList.remove('hidden');
  if (btnClearImg) btnClearImg.classList.add('hidden');

  modal.classList.remove('hidden');
}

/**
 * Abre o modal de edição preenchido com dados do produto
 */
function openEditProductModal(productId) {
  const product = allProducts.find(p => p.id === productId);
  if (!product) return;

  const modal = document.getElementById('product-modal');
  const form = document.getElementById('product-form');
  const errorBox = document.getElementById('product-form-error');
  const title = document.getElementById('product-modal-title');

  if (!modal || !form) return;

  if (title) title.textContent = `Editar Produto: ${product.name}`;
  if (errorBox) {
    errorBox.textContent = '';
    errorBox.classList.add('hidden');
  }

  // ID
  document.getElementById('product-form-id').value = product.id;

  // Tipo
  const type = product.type || 'alimento';
  const typeRadio = form.querySelector(`input[name="product_type"][value="${type}"]`);
  if (typeRadio) typeRadio.checked = true;

  // Categorias para o tipo
  populateFormCategories(type, product.category || '');

  // Campos básicos
  document.getElementById('product-name').value = product.name || '';
  document.getElementById('product-description').value = product.description || '';
  document.getElementById('product-price').value = product.price_gs ?? '';
  document.getElementById('product-promotional-price').value = product.promotional_price_gs ?? '';

  // Foto
  const urlInput = document.getElementById('product-image-url');
  const imgPreview = document.getElementById('product-image-preview');
  const imgPlaceholder = document.getElementById('product-image-placeholder');
  const btnClearImg = document.getElementById('btn-clear-image');

  if (urlInput) urlInput.value = product.image_url || '';
  if (product.image_url) {
    if (imgPreview) {
      imgPreview.src = resolveImageUrl(product.image_url);
      imgPreview.classList.remove('hidden');
    }
    if (imgPlaceholder) imgPlaceholder.classList.add('hidden');
    if (btnClearImg) btnClearImg.classList.remove('hidden');
  } else {
    if (imgPreview) {
      imgPreview.src = '';
      imgPreview.classList.add('hidden');
    }
    if (imgPlaceholder) imgPlaceholder.classList.remove('hidden');
    if (btnClearImg) btnClearImg.classList.add('hidden');
  }

  // Status
  const isActive = product.active !== false;
  const statusRadio = form.querySelector(`input[name="product_status"][value="${isActive ? 'true' : 'false'}"]`);
  if (statusRadio) statusRadio.checked = true;

  // Opções extras
  const highlightInput = document.getElementById('product-highlight');
  const cmvInput = document.getElementById('product-cmv');
  const sausagesInput = document.getElementById('product-sausages');

  if (highlightInput) highlightInput.value = product.highlight || '';
  if (cmvInput) cmvInput.value = product.cmv_gs ?? '';
  if (sausagesInput) sausagesInput.value = product.sausages_qty ?? 1;

  modal.classList.remove('hidden');
}

/**
 * Abre o modal de exclusão com checagem de histórico
 */
function openDeleteProductModal(productId) {
  const product = allProducts.find(p => p.id === productId);
  if (!product) return;

  pendingDeleteProduct = product;

  // Checa se o produto foi pedido em algum momento no histórico
  pendingHasOrders = currentOrders.some(order => {
    if (order.products?.some(p => p.product?.id === product.id || p.product?.name === product.name)) return true;
    if (order.product?.id === product.id || order.product?.name === product.name) return true;
    if (order.order_items?.some(i => i.product_id === product.id || i.product_name === product.name)) return true;
    if (order.drinks?.some(d => d.drink?.id === product.id || d.drink?.name === product.name || d.name === product.name)) return true;
    return false;
  });

  const modal = document.getElementById('product-delete-modal');
  const nameEl = document.getElementById('delete-modal-product-name');
  const warningEl = document.getElementById('delete-modal-warning');
  const confirmBtn = document.getElementById('btn-confirm-delete');

  if (nameEl) nameEl.textContent = `"${product.name}" (${product.category || product.type})`;

  if (pendingHasOrders) {
    warningEl?.classList.remove('hidden');
    if (confirmBtn) confirmBtn.textContent = 'Desativar Produto (Inativo)';
  } else {
    warningEl?.classList.add('hidden');
    if (confirmBtn) confirmBtn.textContent = 'Confirmar Exclusão';
  }

  modal?.classList.remove('hidden');
}

/**
 * Configuração dos formulários, modais e eventos de produtos
 */
function setupProductsManagement() {
  const modal = document.getElementById('product-modal');
  const form = document.getElementById('product-form');
  const btnCloseModal = document.getElementById('btn-close-product-modal');
  const btnCancelModal = document.getElementById('btn-cancel-product-modal');
  const btnOpenAdd = document.getElementById('btn-open-add-product');
  const btnEmptyAdd = document.getElementById('btn-empty-add-product');

  // Abertura do modal
  btnOpenAdd?.addEventListener('click', openAddProductModal);
  btnEmptyAdd?.addEventListener('click', openAddProductModal);

  // Fechamento do modal
  const closeModal = () => modal?.classList.add('hidden');
  btnCloseModal?.addEventListener('click', closeModal);
  btnCancelModal?.addEventListener('click', closeModal);

  // Fechar ao clicar fora
  modal?.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  // Alternância do Tipo de Produto (Alimento / Bebida) altera categorias
  form?.querySelectorAll('input[name="product_type"]').forEach(radio => {
    radio.addEventListener('change', () => {
      populateFormCategories(radio.value);
    });
  });

  // Upload e Pré-visualização de imagem
  const fileInput = document.getElementById('product-image-file');
  const urlInput = document.getElementById('product-image-url');
  const imgPreview = document.getElementById('product-image-preview');
  const imgPlaceholder = document.getElementById('product-image-placeholder');
  const btnClearImg = document.getElementById('btn-clear-image');

  const updatePreview = (src) => {
    if (src && imgPreview && imgPlaceholder) {
      imgPreview.src = src;
      imgPreview.classList.remove('hidden');
      imgPlaceholder.classList.add('hidden');
      btnClearImg?.classList.remove('hidden');
    } else if (imgPreview && imgPlaceholder) {
      imgPreview.src = '';
      imgPreview.classList.add('hidden');
      imgPlaceholder.classList.remove('hidden');
      btnClearImg?.classList.add('hidden');
    }
  };

  urlInput?.addEventListener('input', () => {
    const val = urlInput.value.trim();
    updatePreview(val ? resolveImageUrl(val) : '');
  });

  fileInput?.addEventListener('change', () => {
    const file = fileInput.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        showToast('Selecione um arquivo de imagem válido (JPG, PNG, WebP).', '⚠️');
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target.result;
        if (urlInput) urlInput.value = dataUrl;
        updatePreview(dataUrl);
      };
      reader.readAsDataURL(file);
    }
  });

  btnClearImg?.addEventListener('click', () => {
    if (urlInput) urlInput.value = '';
    if (fileInput) fileInput.value = '';
    updatePreview('');
  });

  // Submissão do Formulário de Produto
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorBox = document.getElementById('product-form-error');
    const submitBtn = document.getElementById('btn-save-product-submit');

    if (errorBox) {
      errorBox.textContent = '';
      errorBox.classList.add('hidden');
    }

    const formId = document.getElementById('product-form-id').value.trim();
    const name = document.getElementById('product-name').value.trim();
    const description = document.getElementById('product-description').value.trim();
    const category = document.getElementById('product-category').value.trim();
    const type = form.querySelector('input[name="product_type"]:checked')?.value || 'alimento';
    const priceStr = document.getElementById('product-price').value.trim();
    const promoStr = document.getElementById('product-promotional-price').value.trim();
    const statusBool = (form.querySelector('input[name="product_status"]:checked')?.value || 'true') === 'true';
    const imageUrl = document.getElementById('product-image-url').value.trim();
    const highlight = document.getElementById('product-highlight')?.value.trim() || null;
    const cmvStr = document.getElementById('product-cmv')?.value.trim() || '0';
    const sausagesStr = document.getElementById('product-sausages')?.value.trim() || (type === 'alimento' ? '1' : '0');

    // Validações obrigatórias
    if (!name) {
      if (errorBox) {
        errorBox.textContent = 'O nome do produto é obrigatório.';
        errorBox.classList.remove('hidden');
      }
      return;
    }

    if (!priceStr || isNaN(Number(priceStr))) {
      if (errorBox) {
        errorBox.textContent = 'Informe um preço válido para o produto.';
        errorBox.classList.remove('hidden');
      }
      return;
    }

    const priceNum = Number(priceStr);
    if (priceNum < 0) {
      if (errorBox) {
        errorBox.textContent = 'O preço não pode ser negativo.';
        errorBox.classList.remove('hidden');
      }
      return;
    }

    let promoNum = null;
    if (promoStr !== '') {
      if (isNaN(Number(promoStr)) || Number(promoStr) < 0) {
        if (errorBox) {
          errorBox.textContent = 'O preço promocional deve ser igual ou maior que zero.';
          errorBox.classList.remove('hidden');
        }
        return;
      }
      promoNum = Number(promoStr);
    }

    // Processamento
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Salvando...';
    }

    const payload = {
      id: formId || undefined,
      name,
      slug: generateSlug(name),
      description,
      type,
      category: category || (type === 'bebida' ? 'Outros' : 'Outros'),
      price_gs: priceNum,
      promotional_price_gs: promoNum,
      active: statusBool,
      image_url: imageUrl,
      highlight,
      cmv_gs: Number(cmvStr) || 0,
      sausages_qty: Number(sausagesStr) || (type === 'alimento' ? 1 : 0)
    };

    try {
      // Salva localmente (garantia de persistência imediata)
      saveProductLocally(payload);

      // Sincroniza com Supabase se configurado
      await saveProductToSupabase(payload);

      // Atualiza estado local da aplicação
      allProducts = await getAllProducts();

      renderProductsTable();
      updateProductKpis();
      populateFilterCategories();

      closeModal();
      showToast('Produto salvo com sucesso no cardápio!', '✓');
    } catch (err) {
      console.error('Erro ao salvar produto:', err);
      if (errorBox) {
        errorBox.textContent = 'Erro ao salvar produto: ' + (err.message || 'Tente novamente.');
        errorBox.classList.remove('hidden');
      }
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Salvar Produto';
      }
    }
  });

  // Modal de Exclusão de Produto
  const deleteModal = document.getElementById('product-delete-modal');
  const btnCancelDelete = document.getElementById('btn-cancel-delete');
  const btnConfirmDelete = document.getElementById('btn-confirm-delete');

  const closeDeleteModal = () => deleteModal?.classList.add('hidden');
  btnCancelDelete?.addEventListener('click', closeDeleteModal);

  deleteModal?.addEventListener('click', (e) => {
    if (e.target === deleteModal) closeDeleteModal();
  });

  btnConfirmDelete?.addEventListener('click', async () => {
    if (!pendingDeleteProduct) return;

    if (btnConfirmDelete) {
      btnConfirmDelete.disabled = true;
      btnConfirmDelete.textContent = 'Excluindo...';
    }

    try {
      if (pendingHasOrders) {
        // Soft delete para preservar histórico de pedidos
        deleteProductLocally(pendingDeleteProduct.id, true);
        await deleteProductFromSupabase(pendingDeleteProduct.id, true);
        showToast(`"${pendingDeleteProduct.name}" foi inativado para preservar o histórico de pedidos.`, 'ℹ️');
      } else {
        // Hard delete físico seguro
        deleteProductLocally(pendingDeleteProduct.id, false);
        await deleteProductFromSupabase(pendingDeleteProduct.id, false);
        showToast(`"${pendingDeleteProduct.name}" foi excluído com sucesso!`, '🗑️');
      }

      allProducts = await getAllProducts();
      renderProductsTable();
      updateProductKpis();
      populateFilterCategories();
      closeDeleteModal();
    } catch (err) {
      console.error('Erro ao excluir:', err);
      showToast('Erro ao processar exclusão.', '⚠️');
    } finally {
      if (btnConfirmDelete) {
        btnConfirmDelete.disabled = false;
        btnConfirmDelete.textContent = 'Confirmar Exclusão';
      }
    }
  });

  // Filtros e busca reativos
  document.getElementById('filter-product-search')?.addEventListener('input', renderProductsTable);
  document.getElementById('filter-product-type')?.addEventListener('change', () => {
    renderProductsTable();
  });
  document.getElementById('filter-product-category')?.addEventListener('change', renderProductsTable);
  document.getElementById('filter-product-status')?.addEventListener('change', renderProductsTable);

  document.getElementById('btn-refresh-products')?.addEventListener('click', async () => {
    allProducts = await getAllProducts();
    updateProductKpis();
    populateFilterCategories();
    renderProductsTable();
    showToast('Lista de produtos atualizada!', '🔄');
  });
}


/**
 * Gerenciador da Barra Lateral Responsiva
 */
function setupSidebar() {
  const toggleBtn = document.getElementById('btn-toggle-mobile-sidebar');
  const closeBtn = document.getElementById('btn-close-mobile-sidebar');
  const sidebar = document.getElementById('admin-sidebar');
  const backdrop = document.getElementById('sidebar-backdrop');

  const openSidebar = () => {
    sidebar?.classList.remove('-translate-x-full');
    backdrop?.classList.remove('hidden');
  };

  const closeSidebar = () => {
    sidebar?.classList.add('-translate-x-full');
    backdrop?.classList.add('hidden');
  };

  toggleBtn?.addEventListener('click', openSidebar);
  closeBtn?.addEventListener('click', closeSidebar);
  backdrop?.addEventListener('click', closeSidebar);
}

/**
 * Configuração das Abas e Navegação da Sidebar
 */
const TAB_CONFIGS = {
  'orders': {
    navId: 'nav-item-orders',
    secId: 'tab-section-orders',
    title: 'Pedidos em Tempo Real',
    badge: 'Ao Vivo',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    subtitle: 'Acompanhe e despache pedidos em tempo real no balcão'
  },
  'metrics': {
    navId: 'nav-item-metrics',
    secId: 'tab-section-metrics',
    title: 'Métricas & Vendas',
    badge: 'Financeiro',
    badgeClass: 'bg-blue-100 text-blue-800 border-blue-300',
    subtitle: 'Ranking de produtos mais vendidos e faturamento'
  },
  'products': {
    navId: 'nav-item-products',
    secId: 'tab-section-products',
    title: 'Catálogo de Produtos',
    badge: 'Cardápio',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-300',
    subtitle: 'Cadastre e gerencie alimentos e bebidas vendidos no estabelecimento'
  },
  'settings': {
    navId: 'nav-item-settings',
    secId: 'tab-section-settings',
    title: 'Configurações & Loja',
    badge: 'Sistema',
    badgeClass: 'bg-purple-100 text-purple-800 border-purple-300',
    subtitle: 'WhatsApp, horários de atendimento e credenciais Supabase'
  }
};

function switchAdminTab(tabKey) {
  const activeKey = TAB_CONFIGS[tabKey] ? tabKey : 'orders';
  const target = TAB_CONFIGS[activeKey];

  // Atualiza título e badge do cabeçalho
  const titleEl = document.getElementById('page-title');
  const badgeEl = document.getElementById('page-badge');
  const subtitleEl = document.getElementById('page-subtitle');

  if (titleEl) titleEl.textContent = target.title;
  if (subtitleEl) subtitleEl.textContent = target.subtitle;
  if (badgeEl) {
    badgeEl.textContent = target.badge;
    badgeEl.className = `px-2 py-0.5 rounded-full text-[10px] font-black border hidden sm:inline-block ${target.badgeClass}`;
  }

  // Esconde todas as seções e exibe a selecionada
  Object.values(TAB_CONFIGS).forEach(cfg => {
    document.getElementById(cfg.secId)?.classList.add('hidden');
  });
  document.getElementById(target.secId)?.classList.remove('hidden');

  // Atualiza estilo dos itens na sidebar
  Object.entries(TAB_CONFIGS).forEach(([key, cfg]) => {
    const navItem = document.getElementById(cfg.navId);
    if (!navItem) return;

    const dot = navItem.querySelector('.nav-active-dot');
    const icon = navItem.querySelector('[data-lucide], svg');

    if (key === activeKey) {
      navItem.className = 'admin-nav-item flex items-center justify-between px-3 py-2.5 rounded-2xl bg-mustard text-coffee shadow-sm font-black transition-all';
      if (dot) dot.classList.remove('hidden');
      if (icon) icon.setAttribute('class', 'w-4 h-4 text-coffee');
    } else {
      navItem.className = 'admin-nav-item flex items-center justify-between px-3 py-2.5 rounded-2xl text-coffee hover:bg-creme hover:text-coffee transition-all group';
      if (dot) dot.classList.add('hidden');
      if (icon) icon.setAttribute('class', 'w-4 h-4 text-coffee-soft group-hover:text-coffee');
    }
  });

  // Renderizações específicas de cada aba
  if (activeKey === 'products') {
    renderProductsTable();
    updateProductKpis();
  } else if (activeKey === 'metrics') {
    updateMetrics();
    renderBreakdowns();
  } else if (activeKey === 'orders') {
    renderOrdersTable();
  }

  // Fecha menu lateral no mobile após navegação
  document.getElementById('admin-sidebar')?.classList.add('-translate-x-full');
  document.getElementById('sidebar-backdrop')?.classList.add('hidden');

  window.lucide?.createIcons();
}

/**
 * Abas e Filtros
 */
function setupTabs() {
  // Event listeners nos itens da sidebar
  Object.keys(TAB_CONFIGS).forEach(key => {
    const navItem = document.getElementById(TAB_CONFIGS[key].navId);
    navItem?.addEventListener('click', (e) => {
      e.preventDefault();
      if (window.location.hash === `#${key}`) {
        switchAdminTab(key);
      } else {
        window.location.hash = key;
      }
    });
  });

  // Ativação por hash na URL (ex: #products, #metrics, #orders, #settings)
  const applyHashTab = () => {
    const hash = window.location.hash.replace('#', '').toLowerCase();
    switchAdminTab(hash || 'orders');
  };

  applyHashTab();
  window.addEventListener('hashchange', applyHashTab);

  // Filtro de status de pedidos
  document.getElementById('filter-order-status')?.addEventListener('change', () => {
    renderOrdersTable();
  });

  // Botão de atualizar pedidos na aba
  document.getElementById('btn-refresh-orders')?.addEventListener('click', async () => {
    currentOrders = await getAdminOrders();
    updateMetrics();
    renderOrdersTable();
    renderBreakdowns();
    showToast('Fila de pedidos atualizada!', '📋');
  });

  // Botão de atualizar geral no header
  document.getElementById('btn-header-refresh')?.addEventListener('click', async () => {
    const icon = document.querySelector('#btn-header-refresh [data-lucide], #btn-header-refresh svg');
    icon?.classList.add('animate-spin');
    try {
      currentOrders = await getAdminOrders();
      allProducts = await getAllProducts();
      allAddons = await getActiveAddons();
      allDrinks = await getActiveDrinks();
      updateMetrics();
      renderOrdersTable();
      renderBreakdowns();
      renderProductsTable();
      updateProductKpis();
      showToast('Dados atualizados com sucesso!', '🔄');
    } finally {
      setTimeout(() => icon?.classList.remove('animate-spin'), 600);
    }
  });
}

/**
 * Formulário de Configurações
 */
function setupSettingsForm() {
  const form = document.getElementById('settings-form');
  const feedback = document.getElementById('settings-save-feedback');

  const whatsappInput = document.getElementById('setting-whatsapp');
  const openingInput = document.getElementById('setting-opening');
  const closingInput = document.getElementById('setting-closing');
  const addressInput = document.getElementById('setting-address');
  const mapsInput = document.getElementById('setting-maps');
  const sbUrlInput = document.getElementById('setting-sb-url');
  const sbKeyInput = document.getElementById('setting-sb-key');

  if (whatsappInput) whatsappInput.value = APP_CONFIG.WHATSAPP_NUMBER;
  if (openingInput) openingInput.value = APP_CONFIG.OPENING_TIME;
  if (closingInput) closingInput.value = APP_CONFIG.CLOSING_TIME;
  if (addressInput) addressInput.value = APP_CONFIG.ADDRESS;
  if (mapsInput) mapsInput.value = APP_CONFIG.GOOGLE_MAPS_URL;
  if (sbUrlInput) sbUrlInput.value = APP_CONFIG.SUPABASE_URL;
  if (sbKeyInput) sbKeyInput.value = APP_CONFIG.SUPABASE_ANON_KEY;

  form?.addEventListener('submit', (e) => {
    e.preventDefault();

    const newPhone = whatsappInput.value.trim().replace(/\D/g, '');
    const newOpening = openingInput.value;
    const newClosing = closingInput.value;
    const newAddress = addressInput.value.trim();
    const newMaps = mapsInput.value.trim();
    const newSbUrl = sbUrlInput.value.trim();
    const newSbKey = sbKeyInput.value.trim();

    if (newPhone) {
      APP_CONFIG.WHATSAPP_NUMBER = newPhone;
      localStorage.setItem('PM_WHATSAPP_NUMBER', newPhone);
    }
    if (newOpening) APP_CONFIG.OPENING_TIME = newOpening;
    if (newClosing) APP_CONFIG.CLOSING_TIME = newClosing;
    if (newAddress) APP_CONFIG.ADDRESS = newAddress;
    if (newMaps) APP_CONFIG.GOOGLE_MAPS_URL = newMaps;
    if (newSbUrl) localStorage.setItem('PM_SUPABASE_URL', newSbUrl);
    if (newSbKey) localStorage.setItem('PM_SUPABASE_ANON_KEY', newSbKey);

    feedback?.classList.remove('hidden');
    setTimeout(() => feedback?.classList.add('hidden'), 3000);
  });
}
