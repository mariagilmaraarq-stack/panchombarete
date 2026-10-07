/**
 * PANCHO MBARATE — CONTROLADOR DE INTERFACE DO MÓDULO DE FICHAS TÉCNICAS (CMV)
 * Interface ultra moderna, responsiva, reativa e interativa.
 */

import {
  state,
  formatCurrency,
  formatPercent,
  getCurrencySymbol,
  setCurrency,
  setExchangeRate,
  toCurrentCurrencyValue,
  fromCurrentCurrencyValue,
  loadRecipeData,
  saveRecipeData,
  saveStateDebounced,
  updateIngredient,
  addIngredient,
  deleteIngredient,
  updateRecipe,
  updateRecipeItem,
  addRecipeItem,
  removeRecipeItem,
  updateSimulationUnits,
  calculateSubRecipeCost,
  calculateRecipeFinancials,
  calculateSalesSimulation,
  resetToDefaults
} from './recipes.js';
import { getSupabase, isSupabaseConnected } from './supabase.js';

document.addEventListener('DOMContentLoaded', async () => {
  setupAuth();
  setupSidebar();
  setupTabs();
  setupCurrencyToggle();
  setupSearchAndFilters();
  setupModals();
  setupGlobalActions();

  // Carrega os dados e renderiza tudo
  await loadRecipeData();
  renderAll();

  if (window.lucide) {
    window.lucide.createIcons();
  }
});

// ==============================================================================
// 1. AUTENTICAÇÃO E SESSÃO COMPATÍVEL
// ==============================================================================

function setupAuth() {
  const loginScreen = document.getElementById('recipes-login-screen');
  const dashboardContainer = document.getElementById('recipes-dashboard-container');
  const loginForm = document.getElementById('recipes-login-form');
  const demoBtn = document.getElementById('btn-demo-access');
  const logoutBtn = document.getElementById('btn-recipes-logout');
  const errorMsg = document.getElementById('login-error-msg');
  const sessionBadge = document.getElementById('recipes-session-badge');

  const unlockDashboard = (isDemo = false, email = 'panchombarete') => {
    loginScreen?.classList.add('hidden');
    dashboardContainer?.classList.remove('hidden');
    if (sessionBadge) {
      if (isDemo) {
        sessionBadge.textContent = '● Modo Local (Offline)';
        sessionBadge.className = 'px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300';
      } else {
        sessionBadge.textContent = `● Supabase Conectado (${email || 'panchombarete'})`;
        sessionBadge.className = 'px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-300';
      }
    }
  };

  const checkExistingSession = async () => {
    const sb = getSupabase();
    if (sb) {
      try {
        const { data } = await sb.auth.getSession();
        if (data?.session) {
          unlockDashboard(false, data.session.user.email);
          return;
        }
      } catch (err) {
        console.warn('Erro ao checar sessão Supabase:', err);
      }
    }

    if (sessionStorage.getItem('PM_ADMIN_LOGGED') === 'true') {
      const isSb = isSupabaseConnected();
      unlockDashboard(!isSb, 'panchombarete');
      return;
    }

    // Se não estiver logado, exibe tela de login
    loginScreen?.classList.remove('hidden');
    dashboardContainer?.classList.add('hidden');
  };

  loginForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('admin-email')?.value.trim();
    const password = document.getElementById('admin-password')?.value.trim();

    const cleanUser = (email || '').toLowerCase();
    const isMasterUser = (cleanUser === 'panchombarete' || cleanUser === 'panchombarate' || cleanUser === 'admin' || cleanUser === 'pancho' || cleanUser === 'panchombarete@panchombarate.com' || cleanUser === 'admin@panchombarate.com');
    const isMasterPass = (password === '25051995');

    // Validação direta com as credenciais mestras do gestor
    if (isMasterUser && isMasterPass) {
      sessionStorage.setItem('PM_ADMIN_LOGGED', 'true');
      const isSb = isSupabaseConnected();
      unlockDashboard(!isSb, 'panchombarete');
      showToast('Login realizado com sucesso!', 'success');
      return;
    }

    const sb = getSupabase();
    if (sb && email.includes('@')) {
      try {
        const { data, error } = await sb.auth.signInWithPassword({ email, password });
        if (error) throw error;
        sessionStorage.setItem('PM_ADMIN_LOGGED', 'true');
        unlockDashboard(false, data.user?.email || email);
        showToast('Login realizado com sucesso!', 'success');
        return;
      } catch (err) {
        if (isMasterPass) {
          sessionStorage.setItem('PM_ADMIN_LOGGED', 'true');
          const isSb = isSupabaseConnected();
          unlockDashboard(!isSb, email || 'panchombarete');
          showToast('Login realizado com sucesso!', 'success');
          return;
        }
        if (errorMsg) {
          errorMsg.textContent = 'Erro ao autenticar: credenciais inválidas.';
          errorMsg.classList.remove('hidden');
        }
        return;
      }
    }

    // Fallback local
    if (isMasterPass || password === 'admin' || (cleanUser && password.length >= 4)) {
      sessionStorage.setItem('PM_ADMIN_LOGGED', 'true');
      const isSb = isSupabaseConnected();
      unlockDashboard(!isSb, email || 'panchombarete');
      showToast('Login realizado com sucesso!', 'success');
    } else {
      if (errorMsg) {
        errorMsg.textContent = 'Usuário ou senha incorretos.';
        errorMsg.classList.remove('hidden');
      }
    }
  });


  logoutBtn?.addEventListener('click', async () => {
    const sb = getSupabase();
    if (sb) {
      try { await sb.auth.signOut(); } catch (e) {}
    }
    sessionStorage.removeItem('PM_ADMIN_LOGGED');
    window.location.reload();
  });

  checkExistingSession();
}

// ==============================================================================
// 2. SIDEBAR RESPONSIVA E NAVEGAÇÃO
// ==============================================================================

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

// ==============================================================================
// 3. ABAS DA TELA
// ==============================================================================

function setupTabs() {
  const tabs = [
    { id: 'tab-btn-catalog', sectionId: 'section-catalog', tabKey: 'catalog' },
    { id: 'tab-btn-subrecipes', sectionId: 'section-subrecipes', tabKey: 'sub_recipes' },
    { id: 'tab-btn-finalrecipes', sectionId: 'section-finalrecipes', tabKey: 'final_recipes' },
    { id: 'tab-btn-simulation', sectionId: 'section-simulation', tabKey: 'sales_simulation' }
  ];

  tabs.forEach(t => {
    const btn = document.getElementById(t.id);
    btn?.addEventListener('click', () => {
      state.activeTab = t.tabKey;
      tabs.forEach(other => {
        const oBtn = document.getElementById(other.id);
        const oSec = document.getElementById(other.sectionId);
        if (other.tabKey === t.tabKey) {
          oBtn?.classList.remove('bg-creme', 'text-coffee-soft', 'border-transparent');
          oBtn?.classList.add('bg-mustard', 'text-coffee', 'border-mustard', 'shadow-sm', 'font-black');
          oSec?.classList.remove('hidden');
        } else {
          oBtn?.classList.remove('bg-mustard', 'text-coffee', 'border-mustard', 'shadow-sm', 'font-black');
          oBtn?.classList.add('bg-creme', 'text-coffee-soft', 'border-transparent');
          oSec?.classList.add('hidden');
        }
      });
      renderAll();
    });
  });
}

// ==============================================================================
// 4. CONFIGURAÇÃO DE MOEDA (R$ / Gs.)
// ==============================================================================

function setupCurrencyToggle() {
  const btnBrl = document.getElementById('btn-currency-brl');
  const btnPyg = document.getElementById('btn-currency-pyg');
  const rateInput = document.getElementById('input-exchange-rate');

  const updateButtonsStyle = () => {
    if (state.currency === 'PYG') {
      btnPyg?.classList.add('bg-mustard', 'text-coffee', 'font-black', 'shadow-2xs');
      btnPyg?.classList.remove('text-coffee-soft');
      btnBrl?.classList.remove('bg-mustard', 'text-coffee', 'font-black', 'shadow-2xs');
      btnBrl?.classList.add('text-coffee-soft');
    } else {
      btnBrl?.classList.add('bg-mustard', 'text-coffee', 'font-black', 'shadow-2xs');
      btnBrl?.classList.remove('text-coffee-soft');
      btnPyg?.classList.remove('bg-mustard', 'text-coffee', 'font-black', 'shadow-2xs');
      btnPyg?.classList.add('text-coffee-soft');
    }
    if (rateInput) {
      rateInput.value = state.exchangeRateGs;
    }
  };

  updateButtonsStyle();

  btnBrl?.addEventListener('click', () => {
    setCurrency('BRL');
    updateButtonsStyle();
    renderAll();
    showToast('Moeda alterada para Real (R$)', 'info');
  });

  btnPyg?.addEventListener('click', () => {
    setCurrency('PYG');
    updateButtonsStyle();
    renderAll();
    showToast('Moeda alterada para Guaranis (Gs.) 🇵🇾', 'info');
  });

  rateInput?.addEventListener('change', (e) => {
    const newRate = parseFloat(e.target.value) || 1350;
    setExchangeRate(newRate);
    renderAll();
    showToast(`Cotação atualizada: 1 R$ = ${newRate.toLocaleString('pt-BR')} Gs.`, 'success');
  });
}

// ==============================================================================
// 5. FILTROS E PESQUISA NO CATÁLOGO DE INSUMOS
// ==============================================================================

function setupSearchAndFilters() {
  const searchInput = document.getElementById('input-search-ingredients');
  searchInput?.addEventListener('input', (e) => {
    state.searchQuery = e.target.value.toLowerCase().trim();
    renderIngredientsTable();
  });

  const filterChips = document.querySelectorAll('.category-filter-chip');
  filterChips.forEach(chip => {
    chip.addEventListener('click', () => {
      filterChips.forEach(c => {
        c.classList.remove('bg-mustard', 'text-coffee', 'font-black');
        c.classList.add('bg-white', 'text-coffee-soft');
      });
      chip.classList.remove('bg-white', 'text-coffee-soft');
      chip.classList.add('bg-mustard', 'text-coffee', 'font-black');

      state.categoryFilter = chip.getAttribute('data-category') || 'all';
      renderIngredientsTable();
    });
  });
}

// ==============================================================================
// 6. RENDERIZAÇÃO COMPLETA (REACTIVE CASCADE RENDER)
// ==============================================================================

export function renderAll() {
  renderIngredientsTable();
  renderSubRecipesSection();
  renderFinalRecipesSection();
  renderSalesSimulationSection();
  updateTopStats();

  if (window.lucide) {
    window.lucide.createIcons();
  }
}

function updateTopStats() {
  const badgeCount = document.getElementById('badge-count-ingredients');
  if (badgeCount) badgeCount.textContent = state.ingredients.length;

  const badgeSubCount = document.getElementById('badge-count-subrecipes');
  if (badgeSubCount) badgeSubCount.textContent = state.subRecipes.length;

  const badgeRecCount = document.getElementById('badge-count-finalrecipes');
  if (badgeRecCount) badgeRecCount.textContent = state.recipes.length;

  const simCalc = calculateSalesSimulation();
  const topRevenueEl = document.getElementById('stat-top-projected-revenue');
  if (topRevenueEl) topRevenueEl.textContent = formatCurrency(simCalc.totalProjectedRevenue);

  const topMarginEl = document.getElementById('stat-top-projected-margin');
  if (topMarginEl) topMarginEl.textContent = formatCurrency(simCalc.totalProjectedGrossProfit);
}

// ==============================================================================
// 7. ABA 1: CATÁLOGO DE INSUMOS & PREÇOS BASE
// ==============================================================================

function renderIngredientsTable() {
  const tbody = document.getElementById('tbody-ingredients');
  if (!tbody) return;

  let filtered = state.ingredients;

  if (state.categoryFilter !== 'all') {
    filtered = filtered.filter(i => i.category === state.categoryFilter);
  }

  if (state.searchQuery) {
    filtered = filtered.filter(i => 
      i.name.toLowerCase().includes(state.searchQuery) ||
      i.code.toLowerCase().includes(state.searchQuery) ||
      i.category.toLowerCase().includes(state.searchQuery)
    );
  }

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="text-center py-8 text-coffee-soft text-xs font-semibold">
          Nenhum insumo encontrado para os filtros selecionados.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered.map(ing => {
    // Contagem de receitas vinculadas
    const usedInSubs = state.subRecipes.filter(sr => sr.items.some(it => it.ingredient_id === ing.id));
    const usedInRecs = state.recipes.filter(r => r.items.some(it => it.ingredient_id === ing.id));
    const totalLinked = usedInSubs.length + usedInRecs.length;

    const isPackaging = ing.type === 'embalagem';
    const typeBadge = isPackaging 
      ? `<span class="px-2 py-0.5 rounded-full text-[9px] font-black bg-purple-100 text-purple-800 border border-purple-200">Embalagem</span>`
      : `<span class="px-2 py-0.5 rounded-full text-[9px] font-black bg-amber-100 text-amber-800 border border-amber-200">Alimento</span>`;

    return `
      <tr class="hover:bg-creme/40 border-b border-coffee/5 transition-colors group">
        <td class="px-4 py-3 font-mono font-bold text-xs text-coffee-soft">
          ${ing.code}
        </td>
        <td class="px-4 py-3">
          <div class="font-black text-xs text-coffee flex items-center gap-1.5">
            <span>${ing.name}</span>
            ${typeBadge}
          </div>
          <div class="text-[10px] text-coffee-soft line-clamp-1">${ing.notes || ing.category}</div>
        </td>
        <td class="px-4 py-3 text-xs text-coffee-soft font-semibold">
          ${ing.category}
        </td>
        <td class="px-4 py-3">
          <div class="inline-flex items-center gap-1 bg-white border border-coffee/15 rounded-xl px-2 py-1 shadow-2xs focus-within:border-mustard focus-within:ring-2 focus-within:ring-mustard/20">
            <input 
              type="number" 
              step="any" 
              min="0.001" 
              value="${ing.purchase_quantity}"
              data-ingredient-id="${ing.id}"
              data-field="purchase_quantity"
              class="w-16 text-xs font-black font-mono text-coffee focus:outline-none bg-transparent ingredient-inline-pkg-qty text-center"
              title="Quantidade da Embalagem de Compra"
            />
            <select 
              data-ingredient-id="${ing.id}"
              data-field="purchase_unit"
              class="text-[11px] font-black text-coffee-soft bg-transparent focus:outline-none cursor-pointer ingredient-inline-pkg-unit pr-1 border-l border-coffee/10 pl-1.5"
              title="Unidade de Medida da Compra"
            >
              <option value="kg" ${ing.purchase_unit.toLowerCase() === 'kg' ? 'selected' : ''}>kg</option>
              <option value="g" ${ing.purchase_unit.toLowerCase() === 'g' ? 'selected' : ''}>g</option>
              <option value="l" ${ing.purchase_unit.toLowerCase() === 'l' ? 'selected' : ''}>L</option>
              <option value="ml" ${ing.purchase_unit.toLowerCase() === 'ml' ? 'selected' : ''}>ml</option>
              <option value="un" ${ing.purchase_unit.toLowerCase() === 'un' ? 'selected' : ''}>un</option>
              <option value="fardo" ${ing.purchase_unit.toLowerCase() === 'fardo' ? 'selected' : ''}>fardo</option>
              <option value="cx" ${ing.purchase_unit.toLowerCase() === 'cx' ? 'selected' : ''}>cx</option>
              <option value="pct" ${ing.purchase_unit.toLowerCase() === 'pct' ? 'selected' : ''}>pct</option>
            </select>
          </div>
        </td>
        <td class="px-4 py-3">
          <div class="inline-flex items-center gap-1 bg-white border border-coffee/15 rounded-xl px-2 py-1 shadow-2xs focus-within:border-mustard focus-within:ring-2 focus-within:ring-mustard/20">
            <span class="text-[10px] font-bold text-coffee-soft">${getCurrencySymbol()}</span>
            <input 
              type="number" 
              step="${state.currency === 'PYG' ? '100' : '0.01'}" 
              min="0" 
              value="${toCurrentCurrencyValue(ing.purchase_price, state.currency === 'PYG')}"
              data-ingredient-id="${ing.id}"
              data-field="purchase_price"
              class="w-24 text-xs font-black font-mono text-coffee focus:outline-none bg-transparent ingredient-inline-input"
            />
          </div>
        </td>
        <td class="px-4 py-3">
          <div class="font-mono font-black text-xs text-coffee">
            ${formatCurrency(ing.unit_cost)}
          </div>
          <div class="text-[10px] text-coffee-soft">por ${ing.base_unit}</div>
        </td>
        <td class="px-4 py-3 text-center">
          <span class="px-2 py-1 rounded-xl text-xs font-mono font-bold bg-creme border border-coffee/10 text-coffee">
            ${ing.default_correction_factor.toFixed(2)}x
          </span>
        </td>
        <td class="px-4 py-3 text-center">
          <span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold ${totalLinked > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'}">
            ${totalLinked} receita${totalLinked !== 1 ? 's' : ''}
          </span>
        </td>
        <td class="px-4 py-3 text-right">
          <div class="flex items-center justify-end gap-1.5">
            <button 
              type="button" 
              data-action="edit-ing" 
              data-id="${ing.id}"
              class="p-1.5 rounded-lg text-coffee hover:bg-mustard-light hover:text-coffee transition-colors"
              title="Editar Insumo"
            >
              <i data-lucide="edit-3" class="w-3.5 h-3.5"></i>
            </button>
            <button 
              type="button" 
              data-action="delete-ing" 
              data-id="${ing.id}"
              class="p-1.5 rounded-lg text-redSport hover:bg-redSport-light transition-colors"
              title="Excluir Insumo"
            >
              <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  // Eventos de alteração inline de quantidade de embalagem de compra
  tbody.querySelectorAll('.ingredient-inline-pkg-qty').forEach(input => {
    input.addEventListener('change', (e) => {
      const id = e.target.getAttribute('data-ingredient-id');
      const val = parseFloat(e.target.value) || 1;
      updateIngredient(id, { purchase_quantity: Math.max(0.001, val) });
      renderAll();
      showToast('Embalagem de compra atualizada! Custo unitário recalculado.', 'success');
    });
  });

  // Eventos de alteração inline de unidade da embalagem de compra
  tbody.querySelectorAll('.ingredient-inline-pkg-unit').forEach(select => {
    select.addEventListener('change', (e) => {
      const id = e.target.getAttribute('data-ingredient-id');
      const unit = e.target.value;
      updateIngredient(id, { purchase_unit: unit });
      renderAll();
      showToast(`Unidade de compra alterada para "${unit}"! Custo recalculado.`, 'success');
    });
  });

  // Eventos de alteração inline de preço (com efeito cascata imediato!)
  tbody.querySelectorAll('.ingredient-inline-input').forEach(input => {
    input.addEventListener('change', (e) => {
      const id = e.target.getAttribute('data-ingredient-id');
      const rawVal = parseFloat(e.target.value) || 0;
      const val = fromCurrentCurrencyValue(rawVal);
      updateIngredient(id, { purchase_price: val });
      renderAll();
      showToast(`Preço do insumo atualizado (${formatCurrency(val)})! Receitas recalculadas.`, 'success');
    });
  });

  // Eventos de botões de ação
  tbody.querySelectorAll('[data-action="edit-ing"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      openEditIngredientModal(id);
    });
  });

  tbody.querySelectorAll('[data-action="delete-ing"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      const ing = state.ingredients.find(i => i.id === id);
      if (!ing) return;
      if (confirm(`Deseja realmente excluir o insumo "${ing.name}"?`)) {
        const res = deleteIngredient(id);
        if (!res.success) {
          alert(res.message);
        } else {
          renderAll();
          showToast('Insumo excluído com sucesso.', 'info');
        }
      }
    });
  });
}

// ==============================================================================
// 8. ABA 2: SUB-RECEITAS / PREPAROS BASE
// ==============================================================================

function renderSubRecipesSection() {
  const container = document.getElementById('subrecipes-cards-container');
  if (!container) return;

  container.innerHTML = state.subRecipes.map(sub => {
    const calc = calculateSubRecipeCost(sub);

    const itemsHtml = sub.items.map(item => {
      const ing = state.ingredients.find(i => i.id === item.ingredient_id);
      const unitCost = ing ? Number(ing.unit_cost || 0) : 0;
      const netQty = Number(item.net_quantity || 0);
      const fc = Math.max(1.0, Number(item.correction_factor || 1.0));
      const grossQty = netQty * fc;
      const totalCost = grossQty * unitCost;

      return `
        <tr class="border-b border-coffee/5 text-xs hover:bg-creme/30">
          <td class="py-2.5 px-3 font-mono text-[11px] text-coffee-soft">${ing?.code || '--'}</td>
          <td class="py-2.5 px-3 font-bold text-coffee">${item.item_name}</td>
          <td class="py-2.5 px-3">
            <input 
              type="number" 
              step="any" 
              min="0"
              value="${netQty}"
              data-sub-id="${sub.id}"
              data-item-id="${item.id}"
              data-field="net_quantity"
              class="w-16 px-1.5 py-0.5 rounded-lg border border-coffee/15 font-mono font-bold text-xs bg-white focus:border-mustard focus:outline-none sub-item-input"
            />
          </td>
          <td class="py-2.5 px-3 font-mono text-coffee-soft">${item.unit}</td>
          <td class="py-2.5 px-3">
            <input 
              type="number" 
              step="0.01" 
              min="1.00"
              value="${fc.toFixed(2)}"
              data-sub-id="${sub.id}"
              data-item-id="${item.id}"
              data-field="correction_factor"
              class="w-14 px-1.5 py-0.5 rounded-lg border border-coffee/15 font-mono font-bold text-xs bg-white focus:border-mustard focus:outline-none sub-item-input"
            />
          </td>
          <td class="py-2.5 px-3 font-mono font-semibold text-coffee-soft">${grossQty.toFixed(1)} ${item.unit}</td>
          <td class="py-2.5 px-3 font-mono text-coffee-soft">${formatCurrency(unitCost)}</td>
          <td class="py-2.5 px-3 font-mono font-black text-coffee">${formatCurrency(totalCost)}</td>
          <td class="py-2.5 px-2 text-right">
            <button 
              type="button" 
              data-action="remove-sub-item"
              data-sub-id="${sub.id}"
              data-item-id="${item.id}"
              class="text-redSport hover:bg-redSport-light p-1 rounded transition-colors"
              title="Remover linha"
            >
              <i data-lucide="x" class="w-3.5 h-3.5"></i>
            </button>
          </td>
        </tr>
      `;
    }).join('');

    return `
      <div class="bg-white rounded-3xl border border-coffee/10 p-5 sm:p-6 card-shadow space-y-4">
        
        <!-- Cabeçalho do Card da Sub-Receita -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-coffee/10 pb-4">
          <div>
            <div class="flex items-center gap-2">
              <span class="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-mustard-light text-coffee border border-mustard/30 font-mono">
                ${sub.code}
              </span>
              <h3 class="text-base sm:text-lg font-black text-coffee tracking-tight">
                ${sub.name}
              </h3>
            </div>
            <p class="text-xs text-coffee-soft pt-0.5">
              ${sub.portion_size_description || sub.notes}
            </p>
          </div>

          <!-- Indicadores de Custo e Rendimento -->
          <div class="flex flex-wrap items-center gap-2 sm:gap-4 bg-creme/60 p-3 rounded-2xl border border-coffee/10">
            <div>
              <span class="text-[10px] uppercase font-bold text-coffee-soft block">Rendimento Total</span>
              <div class="flex items-center gap-1">
                <input 
                  type="number" 
                  min="1"
                  value="${sub.yield_portions}"
                  data-sub-id="${sub.id}"
                  data-field="yield_portions"
                  class="w-16 px-1.5 py-0.5 rounded-lg border border-coffee/15 font-mono font-black text-xs bg-white sub-prop-input"
                />
                <span class="text-xs font-bold text-coffee">${sub.yield_unit}</span>
              </div>
            </div>

            <div>
              <span class="text-[10px] uppercase font-bold text-coffee-soft block">% Perda</span>
              <div class="flex items-center gap-1">
                <input 
                  type="number" 
                  step="0.5" 
                  min="0"
                  value="${sub.waste_percent}"
                  data-sub-id="${sub.id}"
                  data-field="waste_percent"
                  class="w-14 px-1.5 py-0.5 rounded-lg border border-coffee/15 font-mono font-black text-xs bg-white sub-prop-input"
                />
                <span class="text-xs font-bold text-coffee">%</span>
              </div>
            </div>

            <div class="border-l border-coffee/15 pl-3">
              <span class="text-[10px] uppercase font-bold text-coffee-soft block">Custo Total Lote</span>
              <strong class="font-mono font-black text-sm text-coffee">
                ${formatCurrency(calc.totalCost)}
              </strong>
            </div>

            <div class="border-l border-coffee/15 pl-3 bg-emerald-50 px-2 py-1 rounded-xl border border-emerald-200">
              <span class="text-[10px] uppercase font-bold text-emerald-800 block">Custo Unitário Base</span>
              <strong class="font-mono font-black text-sm text-emerald-700">
                ${formatCurrency(calc.costPerUnit)} <span class="text-[10px] font-normal">/${sub.yield_unit}</span>
              </strong>
            </div>
          </div>
        </div>

        <!-- Tabela Profissional de Ingredientes da Sub-Receita -->
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="border-b border-coffee/10 text-[10px] font-black uppercase tracking-wider text-coffee-soft bg-creme/40">
                <th class="py-2 px-3">Cód</th>
                <th class="py-2 px-3">Ingrediente / Insumo</th>
                <th class="py-2 px-3">Qtd. Líquida</th>
                <th class="py-2 px-3">Und</th>
                <th class="py-2 px-3" title="Fator de Correção (Peso Bruto / Peso Líquido)">F.C.</th>
                <th class="py-2 px-3">Qtd. Bruta</th>
                <th class="py-2 px-3">Custo Unit.</th>
                <th class="py-2 px-3">Custo Total</th>
                <th class="py-2 px-2 text-right"></th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
            <tfoot>
              <tr class="bg-creme/50 font-black text-xs border-t-2 border-coffee/10">
                <td colspan="7" class="py-2.5 px-3 text-right text-coffee-soft">
                  Subtotal Ingredientes:
                </td>
                <td class="py-2.5 px-3 font-mono text-coffee">
                  ${formatCurrency(calc.rawIngredientsCost)}
                </td>
                <td></td>
              </tr>
              <tr class="bg-mustard-light/40 font-black text-xs">
                <td colspan="7" class="py-2 px-3 text-right text-coffee">
                  Custo Total com ${calc.wastePercent}% de Perda Técnica:
                </td>
                <td class="py-2 px-3 font-mono text-redSport font-black text-sm">
                  ${formatCurrency(calc.totalCost)}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>

        <!-- Rodapé do Card: Adicionar Linha e Modo de Preparo -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
          <div class="text-xs text-coffee-soft flex-1">
            <strong>Modo de preparo rápido:</strong> ${sub.preparation_method || 'Não informado.'}
          </div>
          <button 
            type="button" 
            data-action="add-sub-item-btn" 
            data-sub-id="${sub.id}"
            class="px-3 py-1.5 rounded-xl bg-creme hover:bg-mustard-light border border-coffee/15 text-xs font-black text-coffee flex items-center justify-center gap-1.5 transition-colors self-start"
          >
            <i data-lucide="plus" class="w-3.5 h-3.5"></i>
            <span>Adicionar Ingrediente</span>
          </button>
        </div>

      </div>
    `;
  }).join('');

  // Eventos de alteração de itens da sub-receita
  container.querySelectorAll('.sub-item-input').forEach(input => {
    input.addEventListener('change', (e) => {
      const subId = e.target.getAttribute('data-sub-id');
      const itemId = e.target.getAttribute('data-item-id');
      const field = e.target.getAttribute('data-field');
      const val = parseFloat(e.target.value) || 0;

      const sub = state.subRecipes.find(s => s.id === subId);
      if (sub) {
        const item = sub.items.find(it => it.id === itemId);
        if (item) {
          item[field] = val;
          saveStateDebounced();
          renderAll();
          showToast('Sub-receita recalculada!', 'success');
        }
      }
    });
  });

  // Eventos de alteração de propriedades da sub-receita
  container.querySelectorAll('.sub-prop-input').forEach(input => {
    input.addEventListener('change', (e) => {
      const subId = e.target.getAttribute('data-sub-id');
      const field = e.target.getAttribute('data-field');
      const val = parseFloat(e.target.value) || 0;

      const sub = state.subRecipes.find(s => s.id === subId);
      if (sub) {
        sub[field] = val;
        saveStateDebounced();
        renderAll();
        showToast('Parâmetros da sub-receita atualizados!', 'success');
      }
    });
  });

  // Remover item de sub-receita
  container.querySelectorAll('[data-action="remove-sub-item"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const subId = btn.getAttribute('data-sub-id');
      const itemId = btn.getAttribute('data-item-id');
      const sub = state.subRecipes.find(s => s.id === subId);
      if (sub && sub.items.length > 1) {
        sub.items = sub.items.filter(it => it.id !== itemId);
        saveStateDebounced();
        renderAll();
        showToast('Item removido da sub-receita.', 'info');
      } else {
        alert('A sub-receita deve conter pelo menos 1 ingrediente.');
      }
    });
  });

  // Adicionar item de sub-receita
  container.querySelectorAll('[data-action="add-sub-item-btn"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const subId = btn.getAttribute('data-sub-id');
      openAddItemModal(subId, 'sub_recipe');
    });
  });
}

// ==============================================================================
// 9. ABA 3: FICHAS TÉCNICAS DE PRODUTOS FINAIS
// ==============================================================================

function renderFinalRecipesSection() {
  const pillsContainer = document.getElementById('recipe-selection-pills');
  const detailsContainer = document.getElementById('recipe-detail-card-container');
  if (!pillsContainer || !detailsContainer) return;

  // 1. Renderiza os botões/pills de seleção das receitas
  pillsContainer.innerHTML = state.recipes.map(recipe => {
    const isSelected = recipe.id === state.selectedRecipeId;
    const calc = calculateRecipeFinancials(recipe);

    return `
      <button 
        type="button" 
        data-recipe-id="${recipe.id}"
        class="recipe-pill-btn px-4 py-2.5 rounded-2xl text-left border transition-all flex items-center justify-between gap-3 ${
          isSelected 
            ? 'bg-coffee text-white border-coffee shadow-md' 
            : 'bg-white hover:bg-mustard-light/50 border-coffee/15 text-coffee'
        }"
      >
        <div>
          <div class="text-[10px] font-black uppercase tracking-wider ${isSelected ? 'text-mustard' : 'text-coffee-soft'}">
            ${recipe.code}
          </div>
          <div class="font-black text-xs leading-tight">
            ${recipe.name}
          </div>
        </div>
        <div class="text-right">
          <div class="text-[10px] ${isSelected ? 'text-white/70' : 'text-coffee-soft'}">CMV Unit.</div>
          <div class="font-mono font-black text-xs ${isSelected ? 'text-mustard' : 'text-coffee'}">
            ${formatCurrency(calc.costPerPortion)}
          </div>
        </div>
      </button>
    `;
  }).join('');

  pillsContainer.querySelectorAll('.recipe-pill-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      state.selectedRecipeId = btn.getAttribute('data-recipe-id');
      renderFinalRecipesSection();
      if (window.lucide) window.lucide.createIcons();
    });
  });

  // 2. Renderiza a ficha técnica detalhada da receita selecionada
  const activeRecipe = state.recipes.find(r => r.id === state.selectedRecipeId) || state.recipes[0];
  if (!activeRecipe) return;

  const calc = calculateRecipeFinancials(activeRecipe);

  // Separa itens de alimentos e itens de embalagens
  const foodItems = calc.calculatedItems.filter(it => it.item_type !== 'packaging');
  const packagingItems = calc.calculatedItems.filter(it => it.item_type === 'packaging');

  // HTML da tabela de ingredientes
  const foodItemsHtml = foodItems.map(item => {
    const isSub = item.item_type === 'sub_recipe';
    const subBadge = isSub ? `<span class="px-1.5 py-0.2 rounded text-[8px] font-black bg-amber-200 text-amber-900 border border-amber-300">Sub-Receita</span>` : '';

    return `
      <tr class="border-b border-coffee/5 text-xs hover:bg-creme/30 transition-colors">
        <td class="py-2.5 px-3 font-mono text-[11px] text-coffee-soft">${item.item_name ? (item.code || '--') : ''}</td>
        <td class="py-2.5 px-3">
          <div class="font-bold text-coffee flex items-center gap-1.5">
            <span>${item.name}</span>
            ${subBadge}
          </div>
          ${item.notes ? `<div class="text-[10px] text-coffee-soft">${item.notes}</div>` : ''}
        </td>
        <td class="py-2.5 px-3">
          <input 
            type="number" 
            step="any" 
            min="0"
            value="${item.netQty}"
            data-recipe-id="${activeRecipe.id}"
            data-item-id="${item.id}"
            data-field="net_quantity"
            class="w-16 px-1.5 py-0.5 rounded-lg border border-coffee/15 font-mono font-bold text-xs bg-white focus:border-mustard focus:outline-none recipe-item-input"
          />
        </td>
        <td class="py-2.5 px-3 font-mono text-coffee-soft">${item.unit}</td>
        <td class="py-2.5 px-3">
          <input 
            type="number" 
            step="0.01" 
            min="1.00"
            value="${item.fc.toFixed(2)}"
            data-recipe-id="${activeRecipe.id}"
            data-item-id="${item.id}"
            data-field="correction_factor"
            class="w-14 px-1.5 py-0.5 rounded-lg border border-coffee/15 font-mono font-bold text-xs bg-white focus:border-mustard focus:outline-none recipe-item-input"
          />
        </td>
        <td class="py-2.5 px-3 font-mono text-coffee-soft">${item.grossQty.toFixed(1)} ${item.unit}</td>
        <td class="py-2.5 px-3 font-mono text-coffee-soft">${formatCurrency(item.unitCost)}</td>
        <td class="py-2.5 px-3 font-mono font-black text-coffee">${formatCurrency(item.totalCost)}</td>
        <td class="py-2.5 px-2 text-right">
          <button 
            type="button" 
            data-action="remove-recipe-item"
            data-recipe-id="${activeRecipe.id}"
            data-item-id="${item.id}"
            class="text-redSport hover:bg-redSport-light p-1 rounded transition-colors"
            title="Remover linha"
          >
            <i data-lucide="x" class="w-3.5 h-3.5"></i>
          </button>
        </td>
      </tr>
    `;
  }).join('');

  // HTML da tabela de embalagens
  const packagingHtml = packagingItems.map(item => {
    return `
      <tr class="border-b border-coffee/5 text-xs hover:bg-creme/30 transition-colors">
        <td class="py-2.5 px-3 font-mono text-[11px] text-coffee-soft">${item.code || '--'}</td>
        <td class="py-2.5 px-3">
          <div class="font-bold text-coffee">${item.name}</div>
          ${item.notes ? `<div class="text-[10px] text-coffee-soft">${item.notes}</div>` : ''}
        </td>
        <td class="py-2.5 px-3">
          <input 
            type="number" 
            step="any" 
            min="0"
            value="${item.netQty}"
            data-recipe-id="${activeRecipe.id}"
            data-item-id="${item.id}"
            data-field="net_quantity"
            class="w-16 px-1.5 py-0.5 rounded-lg border border-coffee/15 font-mono font-bold text-xs bg-white focus:border-mustard focus:outline-none recipe-item-input"
          />
        </td>
        <td class="py-2.5 px-3 font-mono text-coffee-soft">${item.unit}</td>
        <td class="py-2.5 px-3 font-mono text-coffee-soft">${formatCurrency(item.unitCost)}</td>
        <td class="py-2.5 px-3 font-mono font-black text-coffee">${formatCurrency(item.totalCost)}</td>
        <td class="py-2.5 px-2 text-right">
          <button 
            type="button" 
            data-action="remove-recipe-item"
            data-recipe-id="${activeRecipe.id}"
            data-item-id="${item.id}"
            class="text-redSport hover:bg-redSport-light p-1 rounded transition-colors"
            title="Remover embalagem"
          >
            <i data-lucide="x" class="w-3.5 h-3.5"></i>
          </button>
        </td>
      </tr>
    `;
  }).join('');

  // Status de alinhamento com preço sugerido
  let priceDiffStatusHtml = '';
  const priceDiff = calc.salePrice - calc.suggestedPrice;
  if (calc.salePrice === 0) {
    priceDiffStatusHtml = `<span class="text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded-lg">Defina o preço de venda</span>`;
  } else if (Math.abs(priceDiff) < 1.0) {
    priceDiffStatusHtml = `<span class="text-xs font-black text-emerald-800 bg-emerald-100 px-2 py-1 rounded-lg border border-emerald-300">⚖️ Preço Alinhado com Markup</span>`;
  } else if (priceDiff > 0) {
    priceDiffStatusHtml = `<span class="text-xs font-black text-blue-800 bg-blue-100 px-2 py-1 rounded-lg border border-blue-300">🚀 Acima do Sugerido (+${formatCurrency(priceDiff)})</span>`;
  } else {
    priceDiffStatusHtml = `<span class="text-xs font-black text-rose-800 bg-rose-100 px-2 py-1 rounded-lg border border-rose-300">⚠️ Abaixo do Sugerido (-${formatCurrency(Math.abs(priceDiff))})</span>`;
  }

  // Gráfico de barras simples: Lucro vs Custo da Receita vs Custos Fixos vs Custos Variáveis
  const cmvW = Math.max(0, Math.min(100, calc.cmvPercent));
  const fixedW = Math.max(0, Math.min(100 - cmvW, state.fixedCostPercent));
  const varW = Math.max(0, Math.min(100 - cmvW - fixedW, state.variableCostPercent));
  const profitW = Math.max(0, 100 - cmvW - fixedW - varW);

  detailsContainer.innerHTML = `
    <div class="bg-white rounded-3xl border border-coffee/10 p-5 sm:p-7 card-shadow space-y-6">
      
      <!-- Cabeçalho Principal da Ficha Técnica Profissional -->
      <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-coffee/10 pb-5">
        <div>
          <div class="flex items-center gap-2">
            <span class="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-redSport-light text-redSport border border-redSport/20 font-mono">
              ${activeRecipe.code}
            </span>
            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-creme text-coffee-soft">
              ${activeRecipe.category}
            </span>
          </div>
          <h2 class="text-xl sm:text-2xl font-black text-coffee tracking-tight pt-1">
            ${activeRecipe.name}
          </h2>
          <p class="text-xs text-coffee-soft pt-0.5">
            ${activeRecipe.portion_size_description || 'Ficha técnica oficial de produção gastronômica'}
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <button 
            type="button" 
            id="btn-print-active-sheet"
            class="px-4 py-2 rounded-2xl bg-creme hover:bg-mustard-light border border-coffee/15 text-xs font-black text-coffee flex items-center gap-1.5 transition-all shadow-2xs"
          >
            <i data-lucide="printer" class="w-4 h-4"></i>
            <span>Imprimir Ficha de Cozinha</span>
          </button>
        </div>
      </div>

      <!-- Resumo de Indicadores da Receita (Header KPI Cards) -->
      <div class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 bg-creme/50 p-4 rounded-3xl border border-coffee/10">
        
        <div class="space-y-1">
          <span class="text-[10px] uppercase font-black tracking-wider text-coffee-soft block">Rendimento</span>
          <div class="flex items-center gap-1">
            <input 
              type="number" 
              min="1"
              value="${activeRecipe.yield_portions}"
              data-recipe-id="${activeRecipe.id}"
              data-field="yield_portions"
              class="w-14 px-1.5 py-0.5 rounded-lg border border-coffee/15 font-mono font-black text-xs bg-white recipe-param-input"
            />
            <span class="text-[11px] font-bold text-coffee">${activeRecipe.yield_unit}</span>
          </div>
        </div>

        <div class="space-y-1">
          <span class="text-[10px] uppercase font-black tracking-wider text-coffee-soft block">% Perda Prod.</span>
          <div class="flex items-center gap-1">
            <input 
              type="number" 
              step="0.5" 
              min="0"
              value="${activeRecipe.waste_percent}"
              data-recipe-id="${activeRecipe.id}"
              data-field="waste_percent"
              class="w-12 px-1.5 py-0.5 rounded-lg border border-coffee/15 font-mono font-black text-xs bg-white recipe-param-input"
            />
            <span class="text-[11px] font-bold text-coffee">%</span>
          </div>
        </div>

        <div class="space-y-1">
          <span class="text-[10px] uppercase font-black tracking-wider text-coffee-soft block">Custo Alimentos</span>
          <strong class="font-mono font-black text-xs sm:text-sm text-coffee block">
            ${formatCurrency(calc.ingredientsCostWithWaste)}
          </strong>
        </div>

        <div class="space-y-1">
          <span class="text-[10px] uppercase font-black tracking-wider text-coffee-soft block">Custo Embalagens</span>
          <strong class="font-mono font-black text-xs sm:text-sm text-coffee block">
            ${formatCurrency(calc.packagingCost)}
          </strong>
        </div>

        <div class="space-y-1 bg-amber-100/60 p-2 rounded-2xl border border-amber-300 col-span-2 sm:col-span-1">
          <span class="text-[10px] uppercase font-black tracking-wider text-amber-900 block">Custo Unit. (CMV)</span>
          <strong class="font-mono font-black text-sm text-amber-950 block">
            ${formatCurrency(calc.costPerPortion)}
          </strong>
        </div>

        <div class="space-y-1 col-span-2 sm:col-span-1">
          <span class="text-[10px] uppercase font-black tracking-wider text-coffee-soft block">Preço Venda</span>
          <div class="flex items-center gap-1">
            <span class="text-[10px] font-bold text-coffee-soft">${getCurrencySymbol()}</span>
            <input 
              type="number" 
              step="${state.currency === 'PYG' ? '500' : '0.50'}" 
              min="0" 
              value="${toCurrentCurrencyValue(activeRecipe.sale_price, state.currency === 'PYG')}"
              data-recipe-id="${activeRecipe.id}"
              data-field="sale_price"
              class="w-24 px-2 py-1 rounded-xl border border-coffee/20 font-mono font-black text-xs bg-white focus:border-mustard focus:outline-none recipe-param-input"
            />
          </div>
          ${state.currency === 'PYG' ? `
            <div class="text-[9px] text-coffee-soft font-mono pt-0.5">eq. ${formatCurrency(activeRecipe.sale_price, 'BRL')}</div>
          ` : `
            <div class="text-[9px] text-coffee-soft font-mono pt-0.5">eq. ${formatCurrency(activeRecipe.sale_price, 'PYG')}</div>
          `}
        </div>

        <div class="space-y-1 bg-emerald-50 p-2 rounded-2xl border border-emerald-200 col-span-2">
          <span class="text-[10px] uppercase font-black tracking-wider text-emerald-800 block">Lucro Bruto Unitário</span>
          <div class="flex items-baseline gap-1.5">
            <strong class="font-mono font-black text-sm text-emerald-700">
              ${formatCurrency(calc.grossProfit)}
            </strong>
            <span class="text-xs font-black text-emerald-800">
              (${calc.grossProfitMarginPercent.toFixed(1)}%)
            </span>
          </div>
        </div>

      </div>

      <!-- Tabela 1: Ingredientes e Insumos da Ficha Técnica -->
      <div class="space-y-3">
        <div class="flex items-center justify-between">
          <h3 class="text-sm font-black text-coffee flex items-center gap-2">
            <i data-lucide="beef" class="w-4 h-4 text-mustard"></i>
            <span>Ingredientes e Insumos da Receita</span>
          </h3>
          <button 
            type="button" 
            data-action="add-recipe-food-item"
            data-recipe-id="${activeRecipe.id}"
            class="px-3 py-1 rounded-xl bg-creme hover:bg-mustard-light border border-coffee/15 text-xs font-black text-coffee flex items-center gap-1 transition-colors"
          >
            <i data-lucide="plus" class="w-3.5 h-3.5"></i>
            <span>Adicionar Ingrediente ou Sub-Receita</span>
          </button>
        </div>

        <div class="overflow-x-auto rounded-2xl border border-coffee/10">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="border-b border-coffee/10 text-[10px] font-black uppercase tracking-wider text-coffee-soft bg-creme/50">
                <th class="py-2.5 px-3">Cód</th>
                <th class="py-2.5 px-3">Ingrediente / Insumo</th>
                <th class="py-2.5 px-3">Qtd. Líquida</th>
                <th class="py-2.5 px-3">Und</th>
                <th class="py-2.5 px-3" title="Fator de Correção (Peso Bruto / Peso Líquido)">F.C.</th>
                <th class="py-2.5 px-3">Qtd. Bruta</th>
                <th class="py-2.5 px-3">Custo Unit. Bruto</th>
                <th class="py-2.5 px-3">Custo Total</th>
                <th class="py-2.5 px-2 text-right"></th>
              </tr>
            </thead>
            <tbody>
              ${foodItemsHtml}
            </tbody>
            <tfoot>
              <tr class="bg-creme/60 font-black text-xs border-t border-coffee/10">
                <td colspan="7" class="py-2.5 px-3 text-right text-coffee-soft">
                  Subtotal Ingredientes (Sem Perda):
                </td>
                <td class="py-2.5 px-3 font-mono text-coffee">
                  ${formatCurrency(calc.ingredientsCost)}
                </td>
                <td></td>
              </tr>
              <tr class="bg-mustard-light/50 font-black text-xs">
                <td colspan="7" class="py-2 px-3 text-right text-coffee">
                  Total Ingredientes com ${calc.wastePercent}% Perda de Produção:
                </td>
                <td class="py-2 px-3 font-mono text-coffee font-black">
                  ${formatCurrency(calc.ingredientsCostWithWaste)}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <!-- Tabela 2: Embalagens e Descartáveis Vinculados -->
      <div class="space-y-3">
        <div class="flex items-center justify-between">
          <h3 class="text-sm font-black text-coffee flex items-center gap-2">
            <i data-lucide="package" class="w-4 h-4 text-purple-600"></i>
            <span>Embalagens e Descartáveis Vinculados</span>
          </h3>
          <button 
            type="button" 
            data-action="add-recipe-pkg-item"
            data-recipe-id="${activeRecipe.id}"
            class="px-3 py-1 rounded-xl bg-creme hover:bg-mustard-light border border-coffee/15 text-xs font-black text-coffee flex items-center gap-1 transition-colors"
          >
            <i data-lucide="plus" class="w-3.5 h-3.5"></i>
            <span>Adicionar Embalagem</span>
          </button>
        </div>

        <div class="overflow-x-auto rounded-2xl border border-coffee/10">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="border-b border-coffee/10 text-[10px] font-black uppercase tracking-wider text-coffee-soft bg-creme/50">
                <th class="py-2.5 px-3">Cód</th>
                <th class="py-2.5 px-3">Item de Embalagem / Descartável</th>
                <th class="py-2.5 px-3">Quantidade</th>
                <th class="py-2.5 px-3">Und</th>
                <th class="py-2.5 px-3">Custo Unitário</th>
                <th class="py-2.5 px-3">Custo Total</th>
                <th class="py-2.5 px-2 text-right"></th>
              </tr>
            </thead>
            <tbody>
              ${packagingHtml.length > 0 ? packagingHtml : `
                <tr>
                  <td colspan="7" class="py-4 text-center text-xs text-coffee-soft font-semibold">
                    Nenhuma embalagem adicionada a esta receita ainda.
                  </td>
                </tr>
              `}
            </tbody>
            <tfoot>
              <tr class="bg-creme/60 font-black text-xs border-t border-coffee/10">
                <td colspan="5" class="py-2.5 px-3 text-right text-coffee-soft">
                  Total Embalagens e Descartáveis:
                </td>
                <td class="py-2.5 px-3 font-mono text-purple-900 font-black">
                  ${formatCurrency(calc.packagingCost)}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <!-- Bloco de Precificação & Gráfico de Barras Gastronômico -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-2">
        
        <!-- Card de Precificação Integrada com Markup -->
        <div class="lg:col-span-5 bg-creme/40 border border-coffee/10 rounded-3xl p-5 space-y-4">
          <div class="flex items-center justify-between">
            <h4 class="text-xs font-black uppercase tracking-wider text-coffee flex items-center gap-1.5">
              <i data-lucide="calculator" class="w-4 h-4 text-mustard"></i>
              <span>Formação de Preço (Markup)</span>
            </h4>
            <span class="text-[10px] font-bold text-coffee-soft">Integrado com Precificação</span>
          </div>

          <div class="space-y-2.5 text-xs">
            <div class="flex justify-between py-1 border-b border-coffee/5">
              <span class="text-coffee-soft">Custo Total por Unidade (CMV):</span>
              <strong class="font-mono font-black text-coffee">${formatCurrency(calc.costPerPortion)}</strong>
            </div>

            <div class="flex justify-between py-1 border-b border-coffee/5">
              <span class="text-coffee-soft">Markup Divisor Configurado:</span>
              <strong class="font-mono font-black text-coffee">${calc.markupDivisor.toFixed(2)}x</strong>
            </div>

            <div class="flex justify-between py-1 border-b border-coffee/5">
              <span class="text-coffee-soft">Preço de Venda Sugerido:</span>
              <strong class="font-mono font-black text-emerald-700 text-sm">${formatCurrency(calc.suggestedPrice)}</strong>
            </div>

            <div class="flex justify-between py-1 border-b border-coffee/5 items-center">
              <span class="font-bold text-coffee">Preço Praticado no Cardápio:</span>
              <strong class="font-mono font-black text-coffee text-base">${formatCurrency(calc.salePrice)}</strong>
            </div>

            <div class="pt-1">
              ${priceDiffStatusHtml}
            </div>
          </div>
        </div>

        <!-- Card do Gráfico de Barras: Lucro vs CMV vs Custos Fixos vs Custos Variáveis -->
        <div class="lg:col-span-7 bg-creme/40 border border-coffee/10 rounded-3xl p-5 space-y-4">
          <div class="flex items-center justify-between">
            <h4 class="text-xs font-black uppercase tracking-wider text-coffee flex items-center gap-1.5">
              <i data-lucide="bar-chart-2" class="w-4 h-4 text-emerald-600"></i>
              <span>Composição Financeira do Preço de Venda</span>
            </h4>
            <span class="text-[10px] font-black text-emerald-700">100% da Receita</span>
          </div>

          <!-- Barra Gráfica Empilhada Proporcional -->
          <div class="space-y-2">
            <div class="w-full h-8 rounded-2xl overflow-hidden flex bg-creme border border-coffee/20 p-1 gap-1 text-[10px] font-black shadow-inner">
              <div style="width: ${cmvW}%;" class="bg-amber-500 text-white rounded-xl flex items-center justify-center overflow-hidden transition-all" title="CMV / Ingredientes + Embalagens: ${cmvW.toFixed(1)}%">
                ${cmvW > 12 ? `CMV ${cmvW.toFixed(0)}%` : ''}
              </div>
              <div style="width: ${fixedW}%;" class="bg-blue-500 text-white rounded-xl flex items-center justify-center overflow-hidden transition-all" title="Custos Fixos Prop.: ${fixedW.toFixed(1)}%">
                ${fixedW > 12 ? `Fixos ${fixedW.toFixed(0)}%` : ''}
              </div>
              <div style="width: ${varW}%;" class="bg-purple-500 text-white rounded-xl flex items-center justify-center overflow-hidden transition-all" title="Custos Variáveis Prop.: ${varW.toFixed(1)}%">
                ${varW > 12 ? `Var. ${varW.toFixed(0)}%` : ''}
              </div>
              <div style="width: ${profitW}%;" class="bg-emerald-600 text-white rounded-xl flex items-center justify-center overflow-hidden transition-all" title="Lucro Líquido Real: ${profitW.toFixed(1)}%">
                ${profitW > 14 ? `Lucro ${profitW.toFixed(0)}%` : ''}
              </div>
            </div>

            <!-- Legenda da Barra -->
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] font-bold text-coffee-soft pt-1">
              <div class="flex items-center gap-1.5">
                <span class="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span>
                <span>CMV: ${formatCurrency(calc.costPerPortion)} (${cmvW.toFixed(1)}%)</span>
              </div>
              <div class="flex items-center gap-1.5">
                <span class="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block"></span>
                <span>Fixos: ${formatCurrency(calc.fixedCostShare)} (${fixedW.toFixed(1)}%)</span>
              </div>
              <div class="flex items-center gap-1.5">
                <span class="w-2.5 h-2.5 rounded-full bg-purple-500 inline-block"></span>
                <span>Var.: ${formatCurrency(calc.varCostShare)} (${varW.toFixed(1)}%)</span>
              </div>
              <div class="flex items-center gap-1.5">
                <span class="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block"></span>
                <span class="text-emerald-800 font-black">Lucro: ${formatCurrency(calc.estimatedNetProfit)} (${profitW.toFixed(1)}%)</span>
              </div>
            </div>
          </div>

          <!-- Dica Operacional -->
          <p class="text-[11px] text-coffee-soft border-t border-coffee/5 pt-2">
            💡 <strong>Gestão de CMV:</strong> Para o segmento de lanchonetes e fast-food artesanal, o CMV ideal situa-se entre <strong>25% e 35%</strong>. Esta receita opera atualmente com <strong>${cmvW.toFixed(1)}%</strong>.
          </p>
        </div>

      </div>

      <!-- Modo de Preparo e Observações da Cozinha -->
      <div class="border-t border-coffee/10 pt-4 space-y-2">
        <label class="block text-xs font-black uppercase tracking-wider text-coffee">
          Modo de Preparo e Instruções para a Linha de Montagem
        </label>
        <textarea 
          rows="2"
          data-recipe-id="${activeRecipe.id}"
          data-field="preparation_method"
          class="w-full p-3 rounded-2xl border border-coffee/15 text-xs font-semibold focus:border-mustard focus:outline-none bg-creme/20 recipe-textarea"
          placeholder="Descreva as instruções de montagem passo a passo para a equipe da cozinha..."
        >${activeRecipe.preparation_method || ''}</textarea>
      </div>

    </div>
  `;

  // Eventos de alteração inline de parâmetros da receita
  detailsContainer.querySelectorAll('.recipe-param-input').forEach(input => {
    input.addEventListener('change', (e) => {
      const recId = e.target.getAttribute('data-recipe-id');
      const field = e.target.getAttribute('data-field');
      const rawVal = parseFloat(e.target.value) || 0;
      const val = field === 'sale_price' ? fromCurrentCurrencyValue(rawVal) : rawVal;
      updateRecipe(recId, { [field]: val });
      renderAll();
      showToast('Ficha técnica recalculada!', 'success');
    });
  });

  // Eventos de alteração de itens da receita (quantidade e F.C.)
  detailsContainer.querySelectorAll('.recipe-item-input').forEach(input => {
    input.addEventListener('change', (e) => {
      const recId = e.target.getAttribute('data-recipe-id');
      const itemId = e.target.getAttribute('data-item-id');
      const field = e.target.getAttribute('data-field');
      const val = parseFloat(e.target.value) || 0;
      updateRecipeItem(recId, itemId, { [field]: val });
      renderAll();
      showToast('Item da receita atualizado!', 'success');
    });
  });

  // Evento de alteração de texto do modo de preparo
  detailsContainer.querySelectorAll('.recipe-textarea').forEach(textarea => {
    textarea.addEventListener('change', (e) => {
      const recId = e.target.getAttribute('data-recipe-id');
      const field = e.target.getAttribute('data-field');
      updateRecipe(recId, { [field]: e.target.value });
      showToast('Modo de preparo salvo.', 'info');
    });
  });

  // Botão remover item
  detailsContainer.querySelectorAll('[data-action="remove-recipe-item"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const recId = btn.getAttribute('data-recipe-id');
      const itemId = btn.getAttribute('data-item-id');
      removeRecipeItem(recId, itemId);
      renderAll();
      showToast('Linha removida da ficha técnica.', 'info');
    });
  });

  // Botão adicionar ingrediente à receita
  detailsContainer.querySelectorAll('[data-action="add-recipe-food-item"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const recId = btn.getAttribute('data-recipe-id');
      openAddItemModal(recId, 'final_product_food');
    });
  });

  // Botão adicionar embalagem à receita
  detailsContainer.querySelectorAll('[data-action="add-recipe-pkg-item"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const recId = btn.getAttribute('data-recipe-id');
      openAddItemModal(recId, 'final_product_pkg');
    });
  });

  // Botão de impressão da ficha técnica de cozinha
  document.getElementById('btn-print-active-sheet')?.addEventListener('click', () => {
    openPrintModal(activeRecipe, calc);
  });
}

// ==============================================================================
// 10. ABA 4: RESUMO & SIMULAÇÃO DE VENDAS
// ==============================================================================

function renderSalesSimulationSection() {
  const tbody = document.getElementById('tbody-sales-simulation');
  if (!tbody) return;

  const simCalc = calculateSalesSimulation();

  // Cards de Totais
  const revEl = document.getElementById('sim-stat-total-revenue');
  const cmvEl = document.getElementById('sim-stat-total-cmv');
  const profitEl = document.getElementById('sim-stat-total-profit');
  const marginEl = document.getElementById('sim-stat-avg-margin');

  if (revEl) revEl.textContent = formatCurrency(simCalc.totalProjectedRevenue);
  if (cmvEl) cmvEl.textContent = formatCurrency(simCalc.totalProjectedCmv);
  if (profitEl) profitEl.textContent = formatCurrency(simCalc.totalProjectedGrossProfit);
  if (marginEl) marginEl.textContent = formatPercent(simCalc.overallGrossMarginPercent);

  // Tabela Comparativa de Vendas
  tbody.innerHTML = simCalc.rows.map(row => {
    return `
      <tr class="border-b border-coffee/5 text-xs hover:bg-creme/40 transition-colors">
        <td class="py-3 px-4 font-bold text-coffee">
          <div class="flex items-center gap-1.5">
            <span class="font-mono text-[10px] text-coffee-soft">${row.code}</span>
            <span>${row.name}</span>
          </div>
          <div class="text-[10px] text-coffee-soft">${row.category}</div>
        </td>
        <td class="py-3 px-4 font-mono font-bold text-amber-900">
          ${formatCurrency(row.unitCmv)}
        </td>
        <td class="py-3 px-4 font-mono font-black text-coffee">
          ${formatCurrency(row.salePrice)}
        </td>
        <td class="py-3 px-4 font-mono font-bold text-emerald-700">
          ${formatCurrency(row.unitGrossProfit)}
        </td>
        <td class="py-3 px-4 text-center">
          <span class="px-2 py-0.5 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
            ${row.grossProfitMarginPercent.toFixed(1)}%
          </span>
        </td>
        <td class="py-3 px-4 text-center">
          <div class="inline-flex items-center gap-1 bg-white border border-coffee/20 rounded-xl px-2 py-1 shadow-2xs focus-within:border-mustard focus-within:ring-2 focus-within:ring-mustard/20">
            <input 
              type="number" 
              min="0" 
              step="10"
              value="${row.monthlyUnits}"
              data-recipe-id="${row.recipeId}"
              class="w-20 text-xs font-mono font-black text-coffee text-center focus:outline-none bg-transparent simulation-unit-input"
            />
            <span class="text-[10px] font-bold text-coffee-soft">un/mês</span>
          </div>
        </td>
        <td class="py-3 px-4 font-mono font-black text-coffee">
          ${formatCurrency(row.projectedRevenue)}
        </td>
        <td class="py-3 px-4 font-mono font-black text-emerald-700 text-sm">
          ${formatCurrency(row.projectedGrossProfit)}
        </td>
        <td class="py-3 px-4 text-center">
          <div class="flex items-center justify-center gap-1">
            <div class="w-12 h-2 rounded-full bg-creme overflow-hidden border border-coffee/10">
              <div style="width: ${row.revenueSharePercent}%;" class="h-full bg-mustard rounded-full"></div>
            </div>
            <span class="text-[10px] font-bold font-mono text-coffee-soft">${row.revenueSharePercent.toFixed(1)}%</span>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  // Eventos de alteração dos inputs de vendas estimadas
  tbody.querySelectorAll('.simulation-unit-input').forEach(input => {
    input.addEventListener('change', (e) => {
      const recId = e.target.getAttribute('data-recipe-id');
      const val = parseInt(e.target.value, 10) || 0;
      updateSimulationUnits(recId, val);
      renderSalesSimulationSection();
      updateTopStats();
    });
  });

  // Presets de simulação rápida (+25%, -20%, etc.)
  setupSimulationPresets();
}

function setupSimulationPresets() {
  document.getElementById('btn-sim-preset-conservative')?.addEventListener('click', () => {
    Object.keys(state.simulations).forEach(id => {
      state.simulations[id] = Math.round(state.simulations[id] * 0.8);
    });
    saveStateDebounced();
    renderSalesSimulationSection();
    showToast('Simulação: Modo Conservador (-20% nas vendas)', 'info');
  });

  document.getElementById('btn-sim-preset-standard')?.addEventListener('click', () => {
    state.simulations = { ...INITIAL_SIMULATIONS };
    saveStateDebounced();
    renderSalesSimulationSection();
    showToast('Simulação: Modo Base Restaurado', 'info');
  });

  document.getElementById('btn-sim-preset-aggressive')?.addEventListener('click', () => {
    Object.keys(state.simulations).forEach(id => {
      state.simulations[id] = Math.round(state.simulations[id] * 1.25);
    });
    saveStateDebounced();
    renderSalesSimulationSection();
    showToast('Simulação: Meta Arrojada (+25% nas vendas)', 'info');
  });
}

// ==============================================================================
// 11. MODAIS INTERATIVOS (ADICIONAR INSUMO, ADICIONAR ITEM, IMPRIMIR)
// ==============================================================================

function setupModals() {
  // Modal Novo Insumo
  const modalIng = document.getElementById('modal-add-ingredient');
  const btnOpenIng = document.getElementById('btn-open-add-ingredient');
  const btnCloseIng = document.getElementById('btn-close-modal-ingredient');
  const formIng = document.getElementById('form-add-ingredient');

  btnOpenIng?.addEventListener('click', () => {
    formIng?.reset();
    document.getElementById('modal-ingredient-title').textContent = 'Novo Insumo ou Embalagem';
    document.getElementById('input-ing-id').value = '';
    const labelPrice = document.getElementById('label-ing-purchase-price');
    if (labelPrice) labelPrice.textContent = `Preço Pago (${getCurrencySymbol()})`;
    modalIng?.classList.remove('hidden');
  });

  btnCloseIng?.addEventListener('click', () => {
    modalIng?.classList.add('hidden');
  });

  formIng?.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = document.getElementById('input-ing-id')?.value;
    const name = document.getElementById('input-ing-name')?.value.trim();
    const category = document.getElementById('select-ing-category')?.value;
    const type = document.getElementById('select-ing-type')?.value;
    const purchaseQty = parseFloat(document.getElementById('input-ing-purchase-qty')?.value) || 1;
    const purchaseUnit = document.getElementById('select-ing-purchase-unit')?.value;
    const rawPurchasePrice = parseFloat(document.getElementById('input-ing-purchase-price')?.value) || 0;
    const purchasePrice = fromCurrentCurrencyValue(rawPurchasePrice);
    const baseUnit = document.getElementById('select-ing-base-unit')?.value;
    const fc = parseFloat(document.getElementById('input-ing-fc')?.value) || 1.0;
    const notes = document.getElementById('input-ing-notes')?.value.trim();

    if (!name) {
      alert('Informe o nome do insumo.');
      return;
    }

    if (id) {
      // Edição
      updateIngredient(id, {
        name,
        category,
        type,
        purchase_quantity: purchaseQty,
        purchase_unit: purchaseUnit,
        purchase_price: purchasePrice,
        base_unit: baseUnit,
        default_correction_factor: fc,
        notes
      });
      showToast('Insumo atualizado com sucesso!', 'success');
    } else {
      // Novo
      addIngredient({
        name,
        category,
        type,
        purchase_quantity: purchaseQty,
        purchase_unit: purchaseUnit,
        purchase_price: purchasePrice,
        base_unit: baseUnit,
        default_correction_factor: fc,
        notes
      });
      showToast('Novo insumo cadastrado com sucesso!', 'success');
    }

    modalIng?.classList.add('hidden');
    renderAll();
  });

  // Modal Adicionar Item à Receita
  setupAddItemModal();
}

function openEditIngredientModal(id) {
  const ing = state.ingredients.find(i => i.id === id);
  if (!ing) return;

  const modalIng = document.getElementById('modal-add-ingredient');
  document.getElementById('modal-ingredient-title').textContent = `Editar Insumo: ${ing.name}`;
  document.getElementById('input-ing-id').value = ing.id;
  document.getElementById('input-ing-name').value = ing.name;
  document.getElementById('select-ing-category').value = ing.category;
  document.getElementById('select-ing-type').value = ing.type;
  document.getElementById('input-ing-purchase-qty').value = ing.purchase_quantity;
  document.getElementById('select-ing-purchase-unit').value = ing.purchase_unit;

  const labelPrice = document.getElementById('label-ing-purchase-price');
  if (labelPrice) labelPrice.textContent = `Preço Pago (${getCurrencySymbol()})`;
  document.getElementById('input-ing-purchase-price').value = toCurrentCurrencyValue(ing.purchase_price, state.currency === 'PYG');

  document.getElementById('select-ing-base-unit').value = ing.base_unit;
  document.getElementById('input-ing-fc').value = ing.default_correction_factor;
  document.getElementById('input-ing-notes').value = ing.notes || '';

  modalIng?.classList.remove('hidden');
}

let currentAddTarget = { targetId: null, targetType: null };

function setupAddItemModal() {
  const modalItem = document.getElementById('modal-add-item');
  const btnClose = document.getElementById('btn-close-modal-item');
  const form = document.getElementById('form-add-item');
  const selectItem = document.getElementById('select-item-choice');
  const inputQty = document.getElementById('input-item-net-qty');
  const inputFc = document.getElementById('input-item-fc');
  const unitLabel = document.getElementById('modal-item-unit-label');

  btnClose?.addEventListener('click', () => {
    modalItem?.classList.add('hidden');
  });

  selectItem?.addEventListener('change', () => {
    const val = selectItem.value;
    if (val.startsWith('sub:')) {
      const subId = val.replace('sub:', '');
      const sub = state.subRecipes.find(s => s.id === subId);
      if (unitLabel && sub) unitLabel.textContent = sub.yield_unit;
      if (inputFc) inputFc.value = '1.00';
    } else if (val.startsWith('ing:')) {
      const ingId = val.replace('ing:', '');
      const ing = state.ingredients.find(i => i.id === ingId);
      if (unitLabel && ing) unitLabel.textContent = ing.base_unit;
      if (inputFc && ing) inputFc.value = ing.default_correction_factor.toFixed(2);
    }
  });

  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    const val = selectItem?.value;
    const qty = parseFloat(inputQty?.value) || 1;
    const fc = parseFloat(inputFc?.value) || 1.0;

    if (!val) {
      alert('Selecione um ingrediente ou sub-receita.');
      return;
    }

    if (currentAddTarget.targetType === 'sub_recipe') {
      const sub = state.subRecipes.find(s => s.id === currentAddTarget.targetId);
      const ingId = val.replace('ing:', '');
      const ing = state.ingredients.find(i => i.id === ingId);
      if (sub && ing) {
        sub.items.push({
          id: 'sbi-' + Date.now(),
          item_type: 'ingredient',
          ingredient_id: ing.id,
          item_name: ing.name,
          net_quantity: qty,
          unit: ing.base_unit,
          correction_factor: fc,
          notes: ''
        });
        saveStateDebounced();
        renderAll();
        showToast('Ingrediente adicionado à sub-receita!', 'success');
      }
    } else {
      // Receita Final
      let itemData = null;
      if (val.startsWith('sub:')) {
        const subId = val.replace('sub:', '');
        const sub = state.subRecipes.find(s => s.id === subId);
        if (sub) {
          itemData = {
            item_type: 'sub_recipe',
            sub_recipe_id: sub.id,
            item_name: sub.name,
            net_quantity: qty,
            unit: sub.yield_unit,
            correction_factor: fc
          };
        }
      } else {
        const ingId = val.replace('ing:', '');
        const ing = state.ingredients.find(i => i.id === ingId);
        if (ing) {
          itemData = {
            item_type: ing.type === 'embalagem' ? 'packaging' : 'ingredient',
            ingredient_id: ing.id,
            item_name: ing.name,
            net_quantity: qty,
            unit: ing.base_unit,
            correction_factor: fc
          };
        }
      }

      if (itemData) {
        addRecipeItem(currentAddTarget.targetId, itemData);
        renderAll();
        showToast('Item adicionado à ficha técnica!', 'success');
      }
    }

    modalItem?.classList.add('hidden');
  });
}

function openAddItemModal(targetId, mode) {
  currentAddTarget = { targetId, targetType: mode === 'sub_recipe' ? 'sub_recipe' : 'recipe' };

  const modal = document.getElementById('modal-add-item');
  const select = document.getElementById('select-item-choice');
  const unitLabel = document.getElementById('modal-item-unit-label');
  const inputFc = document.getElementById('input-item-fc');
  const title = document.getElementById('modal-item-title');

  if (!modal || !select) return;

  if (mode === 'sub_recipe') {
    title.textContent = 'Adicionar Insumo à Sub-Receita';
    // Apenas ingredientes que não sejam embalagens
    const available = state.ingredients.filter(i => i.type !== 'embalagem');
    select.innerHTML = `
      <option value="">Selecione um insumo...</option>
      ${available.map(i => `<option value="ing:${i.id}">${i.name} (${i.base_unit})</option>`).join('')}
    `;
  } else if (mode === 'final_product_food') {
    title.textContent = 'Adicionar Ingrediente ou Sub-Receita';
    const subOpts = state.subRecipes.map(s => `<option value="sub:${s.id}">★ Sub-Receita: ${s.name} (${s.yield_unit})</option>`).join('');
    const ingOpts = state.ingredients
      .filter(i => i.type !== 'embalagem')
      .map(i => `<option value="ing:${i.id}">${i.name} (${i.base_unit})</option>`)
      .join('');
    select.innerHTML = `
      <option value="">Selecione...</option>
      <optgroup label="Sub-Receitas Artesanais">${subOpts}</optgroup>
      <optgroup label="Ingredientes Base">${ingOpts}</optgroup>
    `;
  } else {
    // Embalagens
    title.textContent = 'Adicionar Embalagem / Descartável';
    const pkgOpts = state.ingredients
      .filter(i => i.type === 'embalagem')
      .map(i => `<option value="ing:${i.id}">${i.name} (${i.base_unit})</option>`)
      .join('');
    select.innerHTML = `
      <option value="">Selecione a embalagem...</option>
      ${pkgOpts}
    `;
  }

  if (unitLabel) unitLabel.textContent = 'un';
  if (inputFc) inputFc.value = '1.00';

  modal.classList.remove('hidden');
}

function openPrintModal(recipe, calc) {
  const modalPrint = document.getElementById('modal-print-sheet');
  const printContent = document.getElementById('print-sheet-content');
  if (!modalPrint || !printContent) return;

  const foodItems = calc.calculatedItems.filter(it => it.item_type !== 'packaging');
  const pkgItems = calc.calculatedItems.filter(it => it.item_type === 'packaging');

  printContent.innerHTML = `
    <div class="p-6 space-y-6 bg-white text-coffee font-sans">
      <div class="border-b-2 border-coffee pb-4 flex justify-between items-start">
        <div>
          <span class="text-xs font-black uppercase tracking-wider text-redSport font-mono">${recipe.code}</span>
          <h1 class="text-2xl font-black">${recipe.name}</h1>
          <p class="text-xs text-coffee-soft">${recipe.portion_size_description || ''}</p>
        </div>
        <div class="text-right">
          <div class="text-xs font-bold text-coffee-soft">PANCHO MBARATE</div>
          <div class="text-sm font-black">Ficha Técnica Operacional</div>
          <div class="text-[10px] text-coffee-soft">${new Date().toLocaleDateString('pt-BR')}</div>
        </div>
      </div>

      <div class="grid grid-cols-4 gap-3 bg-creme p-3 rounded-xl border border-coffee/20 text-xs font-black">
        <div>Rendimento: <span class="font-normal font-mono">${recipe.yield_portions} ${recipe.yield_unit}</span></div>
        <div>Perda Técnica: <span class="font-normal font-mono">${recipe.waste_percent}%</span></div>
        <div>Custo Unitário (CMV): <span class="font-mono text-redSport">${formatCurrency(calc.costPerPortion)}</span></div>
        <div>Preço de Venda: <span class="font-mono text-emerald-700">${formatCurrency(calc.salePrice)}</span></div>
      </div>

      <div class="space-y-2">
        <h3 class="text-xs font-black uppercase tracking-wider border-b border-coffee/15 pb-1">Ingredientes & Insumos</h3>
        <table class="w-full text-left text-xs border-collapse">
          <thead>
            <tr class="border-b border-coffee/20 text-[10px] uppercase font-black">
              <th class="py-1">Ingrediente</th>
              <th class="py-1">Qtd Líquida</th>
              <th class="py-1">F.C.</th>
              <th class="py-1">Qtd Bruta</th>
              <th class="py-1 text-right">Custo Total</th>
            </tr>
          </thead>
          <tbody>
            ${foodItems.map(it => `
              <tr class="border-b border-coffee/5">
                <td class="py-1.5 font-bold">${it.name}</td>
                <td class="py-1.5 font-mono">${it.netQty} ${it.unit}</td>
                <td class="py-1.5 font-mono">${it.fc.toFixed(2)}</td>
                <td class="py-1.5 font-mono">${it.grossQty.toFixed(1)} ${it.unit}</td>
                <td class="py-1.5 font-mono text-right">${formatCurrency(it.totalCost)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      ${pkgItems.length > 0 ? `
        <div class="space-y-2">
          <h3 class="text-xs font-black uppercase tracking-wider border-b border-coffee/15 pb-1">Embalagens & Descartáveis</h3>
          <table class="w-full text-left text-xs border-collapse">
            <thead>
              <tr class="border-b border-coffee/20 text-[10px] uppercase font-black">
                <th class="py-1">Item</th>
                <th class="py-1">Qtd</th>
                <th class="py-1 text-right">Custo Total</th>
              </tr>
            </thead>
            <tbody>
              ${pkgItems.map(it => `
                <tr class="border-b border-coffee/5">
                  <td class="py-1.5 font-bold">${it.name}</td>
                  <td class="py-1.5 font-mono">${it.netQty} ${it.unit}</td>
                  <td class="py-1.5 font-mono text-right">${formatCurrency(it.totalCost)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      ` : ''}

      <div class="space-y-2 border-t border-coffee/20 pt-3">
        <h3 class="text-xs font-black uppercase tracking-wider">Modo de Preparo e Montagem</h3>
        <p class="text-xs leading-relaxed bg-creme/50 p-3 rounded-xl border border-coffee/10 whitespace-pre-wrap">${recipe.preparation_method || 'Nenhum modo de preparo informado.'}</p>
      </div>
    </div>
  `;

  modalPrint.classList.remove('hidden');

  document.getElementById('btn-close-modal-print')?.addEventListener('click', () => {
    modalPrint.classList.add('hidden');
  });

  document.getElementById('btn-trigger-browser-print')?.addEventListener('click', () => {
    window.print();
  });
}

// ==============================================================================
// 12. AÇÕES GLOBAIS (SALVAR, RESTAURAR, TOAST)
// ==============================================================================

function setupGlobalActions() {
  document.getElementById('btn-save-recipes')?.addEventListener('click', async () => {
    const pill = document.getElementById('save-status-pill');
    const text = document.getElementById('save-status-text');
    if (pill && text) {
      pill.className = 'px-3 py-1 rounded-full text-[11px] font-black bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1.5';
      text.textContent = 'Salvando...';
    }

    await saveRecipeData();

    if (pill && text) {
      pill.className = 'px-3 py-1 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1.5';
      text.textContent = 'Salvo';
    }
    showToast('Fichas técnicas e insumos salvos com sucesso!', 'success');
  });

  document.getElementById('btn-reset-defaults')?.addEventListener('click', () => {
    if (confirm('Deseja restaurar todos os dados padrão de receitas e insumos de fábrica? Todas as alterações manuais serão resetadas.')) {
      resetToDefaults();
      renderAll();
      showToast('Dados padrão restaurados!', 'info');
    }
  });
}

function showToast(message, type = 'info') {
  const toast = document.getElementById('recipes-toast');
  const msgEl = document.getElementById('toast-message');
  const iconEl = document.getElementById('toast-icon');
  if (!toast || !msgEl) return;

  msgEl.textContent = message;
  if (iconEl) {
    iconEl.textContent = type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ';
  }

  toast.classList.remove('translate-y-20', 'opacity-0', 'pointer-events-none');
  setTimeout(() => {
    toast.classList.add('translate-y-20', 'opacity-0', 'pointer-events-none');
  }, 3200);
}
