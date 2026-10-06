/**
 * PANCHO MBARATE — CONTROLADOR DO MÓDULO DE PRECIFICAÇÃO E CUSTOS
 * Arquitetura resiliente: integra com Supabase e opera com persistência local caso não configurado.
 */
import { APP_CONFIG } from './config.js';
import { 
  getAllProducts, 
  saveProductLocally, 
  formatGs 
} from './products.js';
import { 
  getSupabase,
  isSupabaseConnected,
  saveProductToSupabase,
  fetchPricingSettingsFromDB,
  savePricingSettingsToDB,
  fetchFixedCostsFromDB,
  saveAllFixedCostsToDB,
  fetchSalesChannelsFromDB,
  saveAllSalesChannelsToDB,
  DEFAULT_PRICING_SETTINGS,
  DEFAULT_FIXED_COSTS,
  DEFAULT_SALES_CHANNELS
} from './supabase.js';

// Estado Reativo do Módulo de Precificação
const state = {
  settings: { ...DEFAULT_PRICING_SETTINGS },
  fixedCosts: [ ...DEFAULT_FIXED_COSTS ],
  salesChannels: [ ...DEFAULT_SALES_CHANNELS ],
  products: [],
  simulatedProduct: {
    id: null,
    name: "Pancho Mbarate (Exemplo)",
    category: "Cachorro-quente",
    cmv_gs: 8500,
    price_gs: 20000,
    isCustom: false
  },
  isDemoMode: false,
  saveTimer: null,
  saveState: 'saved', // 'saving' | 'saved' | 'error'
  lastSavedAt: null,
  pendingApplyProduct: null
};

// Cores para o gráfico Donut de Canais de Venda
const DONUT_COLORS = [
  '#FFB800', // Mustard Pancho
  '#10B981', // Emerald PIX
  '#3B82F6', // Blue Débito
  '#8B5CF6', // Purple Crédito
  '#E51A24', // Red Delivery
  '#F59E0B', // Amber
  '#06B6D4', // Cyan
  '#EC4899'  // Pink
];

document.addEventListener('DOMContentLoaded', async () => {
  setupAuth();
  setupNavigation();
  setupEventListeners();
  if (window.lucide) {
    window.lucide.createIcons();
  }
});

/**
 * 1. AUTENTICAÇÃO E SESSÃO
 */
function setupAuth() {
  const loginScreen = document.getElementById('pricing-login-screen');
  const dashboardContainer = document.getElementById('pricing-dashboard-container');
  const loginForm = document.getElementById('pricing-login-form');
  const demoBtn = document.getElementById('btn-demo-access');
  const logoutBtn = document.getElementById('btn-pricing-logout');
  const errorMsg = document.getElementById('login-error-msg');
  const sessionBadge = document.getElementById('pricing-session-badge');

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

  const unlockDashboard = async (isDemo, email = 'panchombarete') => {
    state.isDemoMode = isDemo;
    loginScreen?.classList.add('hidden');
    dashboardContainer?.classList.remove('hidden');
    if (sessionBadge) {
      if (isDemo) {
        sessionBadge.textContent = '● Modo Local (Offline)';
        sessionBadge.className = 'px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300';
      } else {
        sessionBadge.textContent = `● Supabase Conectado (${email})`;
        sessionBadge.className = 'px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-300';
      }
    }
    await loadInitialData();
  };

  loginForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('admin-email').value.trim();
    const password = document.getElementById('admin-password').value.trim();
    const submitBtn = document.getElementById('btn-login-submit');

    submitBtn.disabled = true;
    submitBtn.textContent = 'Autenticando...';
    errorMsg?.classList.add('hidden');

    const cleanUser = email.toLowerCase();
    const isMasterUser = (cleanUser === 'panchombarete' || cleanUser === 'panchombarate' || cleanUser === 'admin' || cleanUser === 'pancho' || cleanUser === 'panchombarete@panchombarate.com' || cleanUser === 'admin@panchombarate.com');
    const isMasterPass = (password === '25051995');

    // Validação direta com as credenciais mestras do gestor
    if (isMasterUser && isMasterPass) {
      sessionStorage.setItem('PM_ADMIN_LOGGED', 'true');
      const isSb = isSupabaseConnected();
      unlockDashboard(!isSb, 'panchombarete');
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
        if (isMasterPass) {
          sessionStorage.setItem('PM_ADMIN_LOGGED', 'true');
          const isSb = isSupabaseConnected();
          unlockDashboard(!isSb, email || 'panchombarete');
          return;
        }
        if (errorMsg) {
          errorMsg.textContent = 'Credenciais incorretas.';
          errorMsg.classList.remove('hidden');
        }
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'ENTRAR NO PAINEL';
      }
    } else {
      if (isMasterPass || password === 'admin' || (cleanUser && password.length >= 4)) {
        sessionStorage.setItem('PM_ADMIN_LOGGED', 'true');
        const isSb = isSupabaseConnected();
        unlockDashboard(!isSb, email || 'panchombarete');
      } else {
        if (errorMsg) {
          errorMsg.textContent = 'Usuário ou senha incorretos.';
          errorMsg.classList.remove('hidden');
        }
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
    window.location.href = '/admin/';
  });

  checkExistingSession();
}

/**
 * 2. CARREGAMENTO INICIAL DOS DADOS
 */
async function loadInitialData() {
  updateSaveStatus('saving', 'Carregando dados...');

  try {
    // Carrega em paralelo configurações, custos fixos, canais e catálogo de produtos
    const [savedSettings, savedCosts, savedChannels, products] = await Promise.all([
      fetchPricingSettingsFromDB(),
      fetchFixedCostsFromDB(),
      fetchSalesChannelsFromDB(),
      getAllProducts()
    ]);

    if (savedSettings) state.settings = { ...DEFAULT_PRICING_SETTINGS, ...savedSettings };
    if (savedCosts && savedCosts.length > 0) state.fixedCosts = savedCosts;
    if (savedChannels && savedChannels.length > 0) state.salesChannels = savedChannels;
    if (products && products.length > 0) {
      state.products = products;
      // Define produto inicial para o simulador
      const firstActive = products.find(p => p.active) || products[0];
      if (firstActive) {
        state.simulatedProduct = {
          id: firstActive.id,
          name: firstActive.name,
          category: firstActive.category || 'Alimento',
          cmv_gs: Number(firstActive.cmv_gs || 0),
          price_gs: Number(firstActive.promotional_price_gs || firstActive.price_gs || 0),
          isCustom: false
        };
      }
    }

    populateInputsFromState();
    renderFixedCostsTable();
    renderSalesChannelsTable();
    renderProductsDropdown();
    recalculateAll();

    updateSaveStatus('saved', 'Sincronizado');
  } catch (err) {
    console.error('Erro ao carregar dados iniciais de precificação:', err);
    updateSaveStatus('error', 'Erro ao carregar do banco');
    recalculateAll();
  }
}

/**
 * Preenche campos de formulários com o estado atual
 */
function populateInputsFromState() {
  // Faturamento e Projeção
  const revInput = document.getElementById('input-projected-revenue');
  if (revInput) revInput.value = state.settings.monthly_projected_revenue || '';

  // Custos Variáveis
  const taxInput = document.getElementById('input-tax-percent');
  if (taxInput) taxInput.value = state.settings.tax_percent ?? 10;

  const wasteInput = document.getElementById('input-waste-percent');
  if (wasteInput) wasteInput.value = state.settings.waste_percent ?? 2.5;

  const maintInput = document.getElementById('input-maint-percent');
  if (maintInput) maintInput.value = state.settings.maintenance_percent ?? 2;

  const otherVarInput = document.getElementById('input-other-var-percent');
  if (otherVarInput) otherVarInput.value = state.settings.other_variable_percent ?? 1.5;

  // Lucro Desejado
  const profitInput = document.getElementById('input-target-profit');
  if (profitInput) profitInput.value = state.settings.target_profit_percent ?? 20;

  const profitFixedInput = document.getElementById('input-target-profit-fixed');
  if (profitFixedInput) profitFixedInput.value = state.settings.target_profit_fixed_gs || '';

  const useFixedCheckbox = document.getElementById('checkbox-use-fixed-profit');
  if (useFixedCheckbox) useFixedCheckbox.checked = Boolean(state.settings.use_fixed_profit);

  // Projeções mensais
  renderMonthlyProjectionsInputs();

  // Simulador
  populateSimulatorInputs();
}

/**
 * Preenche campos do Simulador de Produto
 */
function populateSimulatorInputs() {
  const prodNameInput = document.getElementById('sim-product-name');
  const prodCostInput = document.getElementById('sim-product-cost');
  const prodPriceInput = document.getElementById('sim-product-price');
  const prodSelect = document.getElementById('sim-product-select');

  if (prodNameInput) prodNameInput.value = state.simulatedProduct.name || '';
  if (prodCostInput) prodCostInput.value = state.simulatedProduct.cmv_gs || '';
  if (prodPriceInput) prodPriceInput.value = state.simulatedProduct.price_gs || '';
  if (prodSelect && state.simulatedProduct.id) {
    prodSelect.value = state.simulatedProduct.id;
  }
}

/**
 * 3. CÁLCULOS PRINCIPAIS EM TEMPO REAL
 */
export function calculateFinancials() {
  // A. Custos Fixos Totais
  const totalFixedCosts = state.fixedCosts.reduce((sum, item) => sum + Number(item.monthly_value || 0), 0);

  // B. Canais de Venda e Taxa Ponderada
  const sumChannelShare = state.salesChannels.reduce((sum, item) => sum + Number(item.share_percent || 0), 0);
  const isShareValid = Math.abs(sumChannelShare - 100) < 0.05;

  let weightedAverageFee = 0;
  if (isShareValid) {
    weightedAverageFee = state.salesChannels.reduce((sum, item) => {
      const fee = Number(item.fee_percent || 0);
      const share = Number(item.share_percent || 0);
      return sum + (fee * share);
    }, 0) / 100;
  }

  // C. Custos Variáveis Totais
  const taxPercent = Number(state.settings.tax_percent || 0);
  const wastePercent = Number(state.settings.waste_percent || 0);
  const maintPercent = Number(state.settings.maintenance_percent || 0);
  const otherVarPercent = Number(state.settings.other_variable_percent || 0);
  
  const totalVariablePercent = taxPercent + wastePercent + maintPercent + otherVarPercent + (isShareValid ? weightedAverageFee : 0);

  // D. Faturamento Mensal Previsto e % Custo Fixo
  const monthlyRevenue = Number(state.settings.monthly_projected_revenue || 0);
  const isRevenueValid = monthlyRevenue > 0;
  const fixedCostPercent = isRevenueValid ? (totalFixedCosts / monthlyRevenue) * 100 : 0;

  // E. Lucro Desejado
  const targetProfitPercent = Number(state.settings.target_profit_percent || 0);

  // F. Soma dos Percentuais para Formação de Preço
  const totalPercent = fixedCostPercent + totalVariablePercent + targetProfitPercent;

  // G. Validação Crítica do Markup (Item 6)
  // Se soma >= 100% ou canais inválidos ou receita inválida
  const isTotalPercentValid = totalPercent < 100;
  const isMarkupValid = isShareValid && isRevenueValid && isTotalPercentValid;

  let maxProductionCostPercent = null;
  let markupDivisor = null;

  if (isMarkupValid) {
    maxProductionCostPercent = 100 - totalPercent;
    // Markup Divisor = 100 / (100 - TotalPercent) ou 1 / (1 - TotalPercent/100)
    markupDivisor = 100 / maxProductionCostPercent;
  }

  // H. Ponto de Equilíbrio (Item 7)
  // Margem de Contribuição % = 100% - % Custo Variável Total
  const contributionMarginPercent = 100 - totalVariablePercent;
  let breakEvenRevenueGs = null;
  if (contributionMarginPercent > 0) {
    // Ponto de Equilíbrio (Gs.) = Total de Custos Fixos / (Margem de Contribuição % / 100)
    breakEvenRevenueGs = totalFixedCosts / (contributionMarginPercent / 100);
  }

  // I. Meta de Faturamento Mensal (Item 8)
  let revenueTargetGs = null;
  if (state.settings.use_fixed_profit && state.settings.target_profit_fixed_gs > 0) {
    // Com Lucro Desejado em Moeda (Gs.): (Custos Fixos + Lucro) / Margem de Contribuição
    if (contributionMarginPercent > 0) {
      revenueTargetGs = (totalFixedCosts + Number(state.settings.target_profit_fixed_gs)) / (contributionMarginPercent / 100);
    }
  } else {
    // Com % de Lucro Desejado: Custos Fixos / (1 - (Custo Variável % + Lucro %) / 100)
    const targetDivisor = (100 - totalVariablePercent - targetProfitPercent) / 100;
    if (targetDivisor > 0) {
      revenueTargetGs = totalFixedCosts / targetDivisor;
    }
  }

  // J. Simulação do Produto Atual (Item 9)
  const prodCost = Number(state.simulatedProduct.cmv_gs || 0);
  const prodPrice = Number(state.simulatedProduct.price_gs || 0);

  let suggestedPrice = null;
  if (isMarkupValid && markupDivisor && prodCost > 0) {
    suggestedPrice = Math.round(prodCost * markupDivisor);
  }

  // Lucro bruto = Preço de venda atual - Custo de produção
  const grossProfitGs = prodPrice > 0 ? (prodPrice - prodCost) : 0;

  // Deduções unitárias proporcionais ao preço de venda
  const unitVarCost = prodPrice * (totalVariablePercent / 100);
  const unitFixedCost = prodPrice * (fixedCostPercent / 100);
  const estimatedNetProfitGs = prodPrice > 0 ? (prodPrice - prodCost - unitVarCost - unitFixedCost) : 0;
  const netMarginPercent = prodPrice > 0 ? (estimatedNetProfitGs / prodPrice) * 100 : 0;

  const priceDiffGs = suggestedPrice !== null ? (prodPrice - suggestedPrice) : 0;
  const priceDiffPercent = (suggestedPrice && suggestedPrice > 0) ? ((prodPrice - suggestedPrice) / suggestedPrice) * 100 : 0;

  // Quantidade necessária para cobrir Ponto de Equilíbrio e Meta
  const unitsForBreakEven = (suggestedPrice && suggestedPrice > 0 && breakEvenRevenueGs) ? Math.ceil(breakEvenRevenueGs / suggestedPrice) : 0;
  const unitsForTarget = (suggestedPrice && suggestedPrice > 0 && revenueTargetGs) ? Math.ceil(revenueTargetGs / suggestedPrice) : 0;

  return {
    totalFixedCosts,
    sumChannelShare,
    isShareValid,
    weightedAverageFee,
    taxPercent,
    wastePercent,
    maintPercent,
    otherVarPercent,
    totalVariablePercent,
    monthlyRevenue,
    isRevenueValid,
    fixedCostPercent,
    targetProfitPercent,
    totalPercent,
    isTotalPercentValid,
    isMarkupValid,
    maxProductionCostPercent,
    markupDivisor,
    contributionMarginPercent,
    breakEvenRevenueGs,
    revenueTargetGs,
    prodCost,
    prodPrice,
    suggestedPrice,
    grossProfitGs,
    estimatedNetProfitGs,
    netMarginPercent,
    priceDiffGs,
    priceDiffPercent,
    unitsForBreakEven,
    unitsForTarget
  };
}

/**
 * 4. ATUALIZAÇÃO DA INTERFACE VISUAL REATIVA
 */
export function recalculateAll() {
  const calc = calculateFinancials();

  // 1. Resumo de Custos Fixos
  const totalFixedEl = document.getElementById('stat-total-fixed-costs');
  if (totalFixedEl) totalFixedEl.textContent = formatGs(calc.totalFixedCosts);

  // 2. Alertas e Métricas dos Canais de Venda
  const shareMeterEl = document.getElementById('channels-share-meter');
  const shareAlertEl = document.getElementById('channels-share-alert');
  const weightedFeeEl = document.getElementById('stat-weighted-average-fee');

  if (weightedFeeEl) {
    weightedFeeEl.textContent = calc.isShareValid ? `${calc.weightedAverageFee.toFixed(2)}%` : '--';
  }

  if (shareMeterEl) {
    shareMeterEl.textContent = `${calc.sumChannelShare.toFixed(1)}%`;
    if (calc.isShareValid) {
      shareMeterEl.className = 'px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1.5';
      shareMeterEl.innerHTML = `<span>✓</span><span>Distribuição 100% Calibrada</span>`;
      shareAlertEl?.classList.add('hidden');
    } else {
      shareMeterEl.className = 'px-3 py-1 rounded-full text-xs font-black bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-1.5';
      shareMeterEl.innerHTML = `<span>⚠️</span><span>Soma: ${calc.sumChannelShare.toFixed(1)}% (Deve ser 100%)</span>`;
      if (shareAlertEl) {
        shareAlertEl.classList.remove('hidden');
        shareAlertEl.innerHTML = `<strong>Atenção:</strong> A soma da participação dos canais está em <strong>${calc.sumChannelShare.toFixed(1)}%</strong>. Ajuste os valores para totalizar exatamente 100,0% para validar os cálculos.`;
      }
    }
  }

  // Renderiza gráfico Donut
  renderDonutChart(calc);

  // 3. Faturamento Previsto & % Custo Fixo
  const fixedCostPercentEl = document.getElementById('stat-fixed-cost-percent');
  const revenueWarningEl = document.getElementById('revenue-zero-warning');

  if (fixedCostPercentEl) {
    fixedCostPercentEl.textContent = calc.isRevenueValid ? `${calc.fixedCostPercent.toFixed(2)}%` : '--';
  }

  if (revenueWarningEl) {
    if (!calc.isRevenueValid) {
      revenueWarningEl.classList.remove('hidden');
      revenueWarningEl.textContent = 'Informe um faturamento mensal previsto maior que zero para calcular o % de custos fixos.';
    } else {
      revenueWarningEl.classList.add('hidden');
    }
  }

  // 4. Resumo Financeiro
  const sumFixedPercentEl = document.getElementById('summary-fixed-percent');
  const sumVarPercentEl = document.getElementById('summary-var-percent');
  const sumProfitPercentEl = document.getElementById('summary-profit-percent');
  const sumTotalPercentEl = document.getElementById('summary-total-percent');

  if (sumFixedPercentEl) sumFixedPercentEl.textContent = calc.isRevenueValid ? `${calc.fixedCostPercent.toFixed(2)}%` : '--';
  if (sumVarPercentEl) sumVarPercentEl.textContent = `${calc.totalVariablePercent.toFixed(2)}%`;
  const sumVarPercentEl2 = document.getElementById('summary-var-percent-2');
  if (sumVarPercentEl2) sumVarPercentEl2.textContent = `${calc.totalVariablePercent.toFixed(2)}%`;
  if (sumProfitPercentEl) sumProfitPercentEl.textContent = `${calc.targetProfitPercent.toFixed(2)}%`;
  if (sumTotalPercentEl) sumTotalPercentEl.textContent = calc.isRevenueValid ? `${calc.totalPercent.toFixed(2)}%` : '--';

  // Barra empilhada visual do Resumo
  renderStackedFinancialBar(calc);

  // 5. Validação Crítica e Exibição do Markup (Itens 5 e 6)
  const markupErrorBox = document.getElementById('markup-critical-error');
  const markupValidBox = document.getElementById('markup-valid-display');
  const markupDivisorEl = document.getElementById('stat-markup-divisor');
  const markupMaxCostEl = document.getElementById('stat-markup-max-cost');
  const statKpiMarkup = document.getElementById('kpi-stat-markup');

  if (!calc.isMarkupValid) {
    markupErrorBox?.classList.remove('hidden');
    markupValidBox?.classList.add('hidden');

    let errorReason = "A soma dos custos e lucro desejado não pode ser igual ou superior a 100%. Ajuste os valores para calcular o preço de venda.";
    if (!calc.isShareValid) {
      errorReason = `A soma das participações dos canais de venda está em ${calc.sumChannelShare.toFixed(1)}%. Ajuste para exatamente 100% para prosseguir.`;
    } else if (!calc.isRevenueValid) {
      errorReason = "Informe um faturamento mensal previsto superior a 0 Gs. para calcular o percentual de custos fixos.";
    } else if (!calc.isTotalPercentValid) {
      errorReason = `A soma dos percentuais atingiu ${calc.totalPercent.toFixed(2)}% (% Custos Fixos: ${calc.fixedCostPercent.toFixed(1)}% + % Custos Variáveis: ${calc.totalVariablePercent.toFixed(1)}% + % Lucro: ${calc.targetProfitPercent.toFixed(1)}%). Ela não pode ser igual ou superior a 100%. Reduza os custos ou a margem de lucro para viabilizar a precificação.`;
    }

    const errorMsgEl = document.getElementById('markup-error-message');
    if (errorMsgEl) errorMsgEl.textContent = errorReason;

    if (statKpiMarkup) statKpiMarkup.textContent = '--';
  } else {
    markupErrorBox?.classList.add('hidden');
    markupValidBox?.classList.remove('hidden');

    const formattedMarkup = `${calc.markupDivisor.toFixed(2)}x`;
    if (markupDivisorEl) markupDivisorEl.textContent = formattedMarkup;
    if (markupMaxCostEl) markupMaxCostEl.textContent = `${calc.maxProductionCostPercent.toFixed(2)}%`;
    if (statKpiMarkup) statKpiMarkup.textContent = formattedMarkup;
  }

  // 6. Ponto de Equilíbrio (Item 7)
  const breakEvenEl = document.getElementById('stat-break-even');
  const contrMarginEl = document.getElementById('stat-contribution-margin');
  const breakEvenDiffEl = document.getElementById('stat-break-even-diff');
  const kpiBreakEven = document.getElementById('kpi-stat-break-even');

  if (contrMarginEl) contrMarginEl.textContent = `${calc.contributionMarginPercent.toFixed(2)}%`;

  if (calc.breakEvenRevenueGs !== null && calc.breakEvenRevenueGs > 0) {
    const formattedBreakEven = formatGs(calc.breakEvenRevenueGs);
    if (breakEvenEl) breakEvenEl.textContent = formattedBreakEven;
    if (kpiBreakEven) kpiBreakEven.textContent = formattedBreakEven;

    if (breakEvenDiffEl && calc.isRevenueValid) {
      const diff = calc.monthlyRevenue - calc.breakEvenRevenueGs;
      if (diff >= 0) {
        breakEvenDiffEl.className = 'text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 inline-flex items-center gap-1.5';
        breakEvenDiffEl.innerHTML = `<span>🛡️ Operação Segura:</span> Faturamento previsto está <strong>${formatGs(diff)}</strong> acima do ponto de equilíbrio.`;
      } else {
        breakEvenDiffEl.className = 'text-xs font-bold text-rose-700 bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-200 inline-flex items-center gap-1.5';
        breakEvenDiffEl.innerHTML = `<span>⚠️ Déficit Operacional:</span> Faturamento previsto está <strong>${formatGs(Math.abs(diff))}</strong> abaixo do ponto de equilíbrio!`;
      }
    }
  } else {
    if (breakEvenEl) breakEvenEl.textContent = '--';
    if (kpiBreakEven) kpiBreakEven.textContent = '--';
    if (breakEvenDiffEl) breakEvenDiffEl.textContent = 'Não foi possível calcular o ponto de equilíbrio com os custos variáveis atuais.';
  }

  // 7. Meta de Faturamento (Item 8)
  const revenueTargetEl = document.getElementById('stat-revenue-target');
  const kpiRevenueTarget = document.getElementById('kpi-stat-revenue-target');
  const targetDiffEl = document.getElementById('stat-target-diff');

  if (calc.revenueTargetGs !== null && calc.revenueTargetGs > 0) {
    const formattedTarget = formatGs(calc.revenueTargetGs);
    if (revenueTargetEl) revenueTargetEl.textContent = formattedTarget;
    if (kpiRevenueTarget) kpiRevenueTarget.textContent = formattedTarget;

    if (targetDiffEl && calc.isRevenueValid) {
      const diff = calc.revenueTargetGs - calc.monthlyRevenue;
      if (diff <= 0) {
        targetDiffEl.className = 'text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 inline-flex items-center gap-1.5';
        targetDiffEl.innerHTML = `<span>🎯 Meta Superada:</span> Faturamento projetado já cobre a meta de lucro desejado com folga de <strong>${formatGs(Math.abs(diff))}</strong>.`;
      } else {
        targetDiffEl.className = 'text-xs font-bold text-amber-800 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200 inline-flex items-center gap-1.5';
        targetDiffEl.innerHTML = `<span>📈 Gap para Meta:</span> Necessário faturar mais <strong>${formatGs(diff)}/mês</strong> para atingir o lucro alvo.`;
      }
    }
  } else {
    if (revenueTargetEl) revenueTargetEl.textContent = '--';
    if (kpiRevenueTarget) kpiRevenueTarget.textContent = '--';
    if (targetDiffEl) targetDiffEl.textContent = 'Parâmetros insuficientes para calcular a meta de faturamento.';
  }

  // 8. Simulação do Produto (Itens 9 e 10)
  const simSuggestedPriceEl = document.getElementById('sim-suggested-price');
  const simMarkupEl = document.getElementById('sim-product-markup');
  const simGrossProfitEl = document.getElementById('sim-gross-profit');
  const simNetProfitEl = document.getElementById('sim-net-profit');
  const simNetMarginEl = document.getElementById('sim-net-margin');
  const simDiffPriceEl = document.getElementById('sim-diff-price');
  const simUnitsTargetEl = document.getElementById('sim-units-target');
  const simUnitsBreakEvenEl = document.getElementById('sim-units-breakeven');
  const simComparisonBadge = document.getElementById('sim-comparison-badge');

  if (calc.isMarkupValid && calc.suggestedPrice !== null) {
    if (simSuggestedPriceEl) simSuggestedPriceEl.textContent = formatGs(calc.suggestedPrice);
    if (simMarkupEl) simMarkupEl.textContent = `${calc.markupDivisor.toFixed(2)}x`;
  } else {
    if (simSuggestedPriceEl) simSuggestedPriceEl.textContent = '--';
    if (simMarkupEl) simMarkupEl.textContent = '--';
  }

  if (simGrossProfitEl) simGrossProfitEl.textContent = formatGs(calc.grossProfitGs);
  if (simNetProfitEl) {
    simNetProfitEl.textContent = formatGs(calc.estimatedNetProfitGs);
    simNetProfitEl.className = `text-lg font-black ${calc.estimatedNetProfitGs >= 0 ? 'text-emerald-600' : 'text-rose-600'}`;
  }
  if (simNetMarginEl) {
    simNetMarginEl.textContent = `${calc.netMarginPercent.toFixed(1)}%`;
    simNetMarginEl.className = `text-xs font-extrabold ${calc.netMarginPercent >= 15 ? 'text-emerald-700' : calc.netMarginPercent > 0 ? 'text-amber-700' : 'text-rose-700'}`;
  }

  if (simDiffPriceEl) {
    if (calc.suggestedPrice !== null && calc.prodPrice > 0) {
      simDiffPriceEl.textContent = `${calc.priceDiffGs >= 0 ? '+' : ''}${formatGs(calc.priceDiffGs)}`;
      simDiffPriceEl.className = `font-black font-mono text-xs ${calc.priceDiffGs >= 0 ? 'text-emerald-700' : 'text-rose-700'}`;
    } else {
      simDiffPriceEl.textContent = '--';
      simDiffPriceEl.className = 'font-black font-mono text-xs text-coffee';
    }
  }

  if (simUnitsTargetEl) simUnitsTargetEl.textContent = calc.unitsForTarget > 0 ? `${calc.unitsForTarget.toLocaleString('pt-BR')} un.` : '--';
  if (simUnitsBreakEvenEl) simUnitsBreakEvenEl.textContent = calc.unitsForBreakEven > 0 ? `${calc.unitsForBreakEven.toLocaleString('pt-BR')} un.` : '--';

  // Comparação Preço Atual x Sugerido
  if (simComparisonBadge && calc.suggestedPrice !== null) {
    if (calc.prodPrice === 0) {
      simComparisonBadge.className = 'px-3 py-1.5 rounded-xl text-xs font-black bg-slate-100 text-slate-700';
      simComparisonBadge.textContent = 'Informe o preço de venda atual';
    } else if (Math.abs(calc.priceDiffGs) < 200) {
      simComparisonBadge.className = 'px-3 py-1.5 rounded-xl text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300';
      simComparisonBadge.innerHTML = '⚖️ Preço perfeitamente alinhado com o Markup sugerido!';
    } else if (calc.priceDiffGs > 0) {
      simComparisonBadge.className = 'px-3 py-1.5 rounded-xl text-xs font-black bg-blue-100 text-blue-800 border border-blue-300';
      simComparisonBadge.innerHTML = `🚀 Preço Atual <strong>${formatGs(calc.priceDiffGs)} (+${calc.priceDiffPercent.toFixed(1)}%)</strong> ACIMA do sugerido (Maior margem).`;
    } else {
      simComparisonBadge.className = 'px-3 py-1.5 rounded-xl text-xs font-black bg-rose-100 text-rose-800 border border-rose-300';
      simComparisonBadge.innerHTML = `⚠️ Preço Atual <strong>${formatGs(Math.abs(calc.priceDiffGs))} (${calc.priceDiffPercent.toFixed(1)}%)</strong> ABAIXO do sugerido (Defasado).`;
    }
  }

  // 9. Atualiza Indicadores Visuais de Saúde (Badges)
  updateHealthBadges(calc);

  if (window.lucide) {
    window.lucide.createIcons();
  }
}

/**
 * 5. INDICADORES VISUAIS E STATUS BADGES (Item 11)
 */
function updateHealthBadges(calc) {
  // Custo Fixo Badge
  const badgeFixed = document.getElementById('badge-kpi-fixed');
  if (badgeFixed) {
    if (!calc.isRevenueValid) {
      setBadge(badgeFixed, 'Atenção', 'Definir receita', 'amber');
    } else if (calc.fixedCostPercent <= 35) {
      setBadge(badgeFixed, 'Saudável', `${calc.fixedCostPercent.toFixed(1)}%`, 'emerald');
    } else if (calc.fixedCostPercent <= 50) {
      setBadge(badgeFixed, 'Atenção', `${calc.fixedCostPercent.toFixed(1)}%`, 'amber');
    } else {
      setBadge(badgeFixed, 'Crítico', `${calc.fixedCostPercent.toFixed(1)}%`, 'rose');
    }
  }

  // Custo Variável Badge
  const badgeVar = document.getElementById('badge-kpi-variable');
  if (badgeVar) {
    if (calc.totalVariablePercent <= 25) {
      setBadge(badgeVar, 'Saudável', `${calc.totalVariablePercent.toFixed(1)}%`, 'emerald');
    } else if (calc.totalVariablePercent <= 40) {
      setBadge(badgeVar, 'Atenção', `${calc.totalVariablePercent.toFixed(1)}%`, 'amber');
    } else {
      setBadge(badgeVar, 'Crítico', `${calc.totalVariablePercent.toFixed(1)}%`, 'rose');
    }
  }

  // Markup / Formação de Preço Badge
  const badgeMarkup = document.getElementById('badge-kpi-markup');
  if (badgeMarkup) {
    if (!calc.isMarkupValid) {
      setBadge(badgeMarkup, 'Crítico', 'Inválido', 'rose');
    } else if (calc.totalPercent <= 75) {
      setBadge(badgeMarkup, 'Saudável', 'Margem Ótima', 'emerald');
    } else if (calc.totalPercent <= 90) {
      setBadge(badgeMarkup, 'Atenção', 'Custo Elevado', 'amber');
    } else {
      setBadge(badgeMarkup, 'Crítico', 'Margem Estreita', 'rose');
    }
  }

  // Ponto de Equilíbrio Badge
  const badgeBreakEven = document.getElementById('badge-kpi-breakeven');
  if (badgeBreakEven) {
    if (!calc.breakEvenRevenueGs || !calc.isRevenueValid) {
      setBadge(badgeBreakEven, 'Atenção', 'Revisar', 'amber');
    } else {
      const ratio = calc.breakEvenRevenueGs / calc.monthlyRevenue;
      if (ratio <= 0.70) {
        setBadge(badgeBreakEven, 'Saudável', `${(ratio * 100).toFixed(0)}% da receita`, 'emerald');
      } else if (ratio <= 1.0) {
        setBadge(badgeBreakEven, 'Atenção', `${(ratio * 100).toFixed(0)}% da receita`, 'amber');
      } else {
        setBadge(badgeBreakEven, 'Crítico', 'Acima da receita', 'rose');
      }
    }
  }
}

function setBadge(element, status, label, color) {
  element.className = `text-[10px] font-black px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${
    color === 'emerald' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
    color === 'amber' ? 'bg-amber-100 text-amber-800 border border-amber-300' :
    'bg-rose-100 text-rose-800 border border-rose-300'
  }`;
  element.innerHTML = `<span>● ${status}</span> <span class="opacity-75 font-semibold">(${label})</span>`;
}

/**
 * Renderiza barra empilhada visual do Resumo Financeiro
 */
function renderStackedFinancialBar(calc) {
  const container = document.getElementById('financial-stacked-bar');
  if (!container) return;

  if (!calc.isRevenueValid || calc.totalPercent >= 100) {
    container.innerHTML = `
      <div class="w-full bg-rose-200 text-rose-800 text-xs font-bold text-center py-2 rounded-xl border border-rose-300">
        Percentuais ultrapassam 100% ou faturamento inválido
      </div>
    `;
    return;
  }

  const fixedW = Math.max(0, Math.min(100, calc.fixedCostPercent));
  const varW = Math.max(0, Math.min(100 - fixedW, calc.totalVariablePercent));
  const profitW = Math.max(0, Math.min(100 - fixedW - varW, calc.targetProfitPercent));
  const maxProdW = Math.max(0, 100 - fixedW - varW - profitW);

  container.innerHTML = `
    <div class="w-full h-8 rounded-2xl overflow-hidden flex bg-creme border border-coffee/20 p-1 gap-1 text-[10px] font-black">
      <div style="width: ${fixedW}%;" class="bg-amber-500 text-white rounded-xl flex items-center justify-center overflow-hidden transition-all" title="Custos Fixos: ${calc.fixedCostPercent.toFixed(1)}%">
        ${fixedW > 12 ? `Fixos ${fixedW.toFixed(0)}%` : ''}
      </div>
      <div style="width: ${varW}%;" class="bg-blue-500 text-white rounded-xl flex items-center justify-center overflow-hidden transition-all" title="Custos Variáveis: ${calc.totalVariablePercent.toFixed(1)}%">
        ${varW > 12 ? `Var. ${varW.toFixed(0)}%` : ''}
      </div>
      <div style="width: ${profitW}%;" class="bg-redSport text-white rounded-xl flex items-center justify-center overflow-hidden transition-all" title="Lucro Desejado: ${calc.targetProfitPercent.toFixed(1)}%">
        ${profitW > 12 ? `Lucro ${profitW.toFixed(0)}%` : ''}
      </div>
      <div style="width: ${maxProdW}%;" class="bg-emerald-600 text-white rounded-xl flex items-center justify-center overflow-hidden transition-all" title="Custo Máx. Produção: ${maxProdW.toFixed(1)}%">
        ${maxProdW > 14 ? `Custo Prod. ${maxProdW.toFixed(0)}%` : ''}
      </div>
    </div>
    <div class="flex flex-wrap items-center justify-between gap-2 text-[10px] font-bold text-coffee-soft pt-1">
      <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span> C. Fixos (${fixedW.toFixed(1)}%)</span>
      <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block"></span> C. Variáveis (${varW.toFixed(1)}%)</span>
      <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-redSport inline-block"></span> Lucro (${profitW.toFixed(1)}%)</span>
      <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block"></span> Margem Produção (${maxProdW.toFixed(1)}%)</span>
    </div>
  `;
}

/**
 * 6. GRÁFICO DONUT DE CANAIS DE VENDA (Item 2)
 * Renderiza gráfico Donut SVG reativo e dinâmico com tooltip e legendas
 */
function renderDonutChart(calc) {
  const chartWrapper = document.getElementById('channels-donut-chart');
  if (!chartWrapper) return;

  const channels = state.salesChannels;
  const total = channels.reduce((sum, c) => sum + Number(c.share_percent || 0), 0);

  if (channels.length === 0 || total === 0) {
    chartWrapper.innerHTML = `
      <div class="text-xs text-coffee-soft font-bold py-6 text-center">Nenhum canal adicionado</div>
    `;
    return;
  }

  // Gera fatias SVG do Donut
  let cumulativeAngle = 0;
  const radius = 55;
  const strokeWidth = 24;
  const center = 75;
  const circumference = 2 * Math.PI * radius;

  let slicesSvg = '';

  channels.forEach((channel, idx) => {
    const share = Number(channel.share_percent || 0);
    if (share <= 0) return;

    const strokeDasharray = `${(share / 100) * circumference} ${circumference}`;
    const strokeDashoffset = -((cumulativeAngle / 100) * circumference);
    const color = DONUT_COLORS[idx % DONUT_COLORS.length];

    slicesSvg += `
      <circle 
        cx="${center}" 
        cy="${center}" 
        r="${radius}" 
        fill="transparent" 
        stroke="${color}" 
        stroke-width="${strokeWidth}" 
        stroke-dasharray="${strokeDasharray}" 
        stroke-dashoffset="${strokeDashoffset}"
        class="transition-all duration-300 hover:opacity-80 cursor-pointer"
        data-channel-name="${channel.name}"
        data-channel-share="${share}%"
        data-channel-fee="${channel.fee_percent}%"
      >
        <title>${channel.name}: ${share}% de vendas (Taxa: ${channel.fee_percent}%)</title>
      </circle>
    `;

    cumulativeAngle += share;
  });

  // Legenda
  const legendHtml = channels.map((c, i) => {
    const color = DONUT_COLORS[i % DONUT_COLORS.length];
    return `
      <div class="flex items-center justify-between text-xs font-bold text-coffee py-1 border-b border-coffee/5 last:border-0">
        <div class="flex items-center gap-2">
          <span class="w-3 h-3 rounded-full flex-shrink-0" style="background-color: ${color};"></span>
          <span>${c.name}</span>
        </div>
        <div class="flex items-center gap-3">
          <span class="text-coffee-soft text-[11px]">Taxa: ${Number(c.fee_percent || 0).toFixed(1)}%</span>
          <span class="font-black px-2 py-0.5 rounded-lg bg-creme">${Number(c.share_percent || 0).toFixed(1)}%</span>
        </div>
      </div>
    `;
  }).join('');

  chartWrapper.innerHTML = `
    <div class="flex flex-col sm:flex-row items-center gap-6 justify-center">
      <div class="relative w-40 h-40 flex-shrink-0">
        <svg viewBox="0 0 150 150" class="w-full h-full -rotate-90 transform">
          <!-- Background track -->
          <circle cx="${center}" cy="${center}" r="${radius}" fill="transparent" stroke="#F5ECD9" stroke-width="${strokeWidth}"></circle>
          ${slicesSvg}
        </svg>
        <div class="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
          <span class="text-[10px] uppercase font-black text-coffee-soft tracking-wider">Taxa Média</span>
          <span class="text-base font-black text-coffee">${calc.isShareValid ? `${calc.weightedAverageFee.toFixed(2)}%` : '--'}</span>
        </div>
      </div>
      <div class="flex-1 w-full space-y-1">
        <div class="text-[11px] font-black uppercase text-coffee-soft tracking-wider pb-1 border-b border-coffee/10">
          Distribuição por Canal
        </div>
        ${legendHtml}
      </div>
    </div>
  `;
}

/**
 * 7. TABELAS EDITÁVEIS: CUSTOS FIXOS E CANAIS
 */
function renderFixedCostsTable() {
  const tbody = document.getElementById('fixed-costs-table-body');
  if (!tbody) return;

  tbody.innerHTML = '';

  if (state.fixedCosts.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="3" class="py-6 text-center text-xs text-coffee-soft font-bold">
          Nenhum custo fixo cadastrado. Clique em "+ Adicionar Custo" para começar.
        </td>
      </tr>
    `;
    return;
  }

  state.fixedCosts.forEach((item, index) => {
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-creme/60 transition-colors group';

    tr.innerHTML = `
      <td class="py-2.5 px-3 font-bold text-coffee text-xs">
        <input type="text" value="${item.description}" class="w-full bg-transparent px-2 py-1.5 rounded-lg border border-transparent hover:border-coffee/20 focus:border-mustard focus:bg-white text-xs font-bold text-coffee focus:outline-none transition-colors" data-fixed-index="${index}" data-field="description">
      </td>
      <td class="py-2.5 px-3 font-mono font-bold text-xs text-coffee w-44">
        <div class="relative flex items-center">
          <input type="number" min="0" step="any" value="${item.monthly_value}" class="w-full px-2.5 py-1.5 rounded-lg border border-coffee/15 bg-creme/40 focus:border-mustard focus:bg-white text-xs font-bold text-coffee focus:outline-none" data-fixed-index="${index}" data-field="monthly_value">
          <span class="absolute right-2.5 text-[10px] text-coffee-soft pointer-events-none">Gs.</span>
        </div>
      </td>
      <td class="py-2.5 px-3 text-right w-20">
        <button type="button" class="p-1.5 rounded-lg text-rose-600 hover:bg-rose-100 transition-colors btn-delete-fixed" data-fixed-index="${index}" title="Remover Custo">
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
        </button>
      </td>
    `;

    tbody.appendChild(tr);
  });

  // Eventos de alteração reativa nos inputs da tabela
  tbody.querySelectorAll('input').forEach(input => {
    input.addEventListener('input', (e) => {
      const idx = Number(e.target.dataset.fixedIndex);
      const field = e.target.dataset.field;
      if (field === 'description') {
        state.fixedCosts[idx].description = e.target.value;
      } else if (field === 'monthly_value') {
        state.fixedCosts[idx].monthly_value = Number(e.target.value || 0);
      }
      recalculateAll();
      triggerAutoSave();
    });
  });

  // Botões de remover
  tbody.querySelectorAll('.btn-delete-fixed').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const btnTarget = e.currentTarget;
      const idx = Number(btnTarget.dataset.fixedIndex);
      const removed = state.fixedCosts[idx]?.description || 'Custo';
      state.fixedCosts.splice(idx, 1);
      renderFixedCostsTable();
      recalculateAll();
      triggerAutoSave();
      showToast(`Custo "${removed}" removido.`, '🗑️');
    });
  });
}

function renderSalesChannelsTable() {
  const tbody = document.getElementById('sales-channels-table-body');
  if (!tbody) return;

  tbody.innerHTML = '';

  state.salesChannels.forEach((item, index) => {
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-creme/60 transition-colors group';

    tr.innerHTML = `
      <td class="py-2.5 px-3 font-bold text-coffee text-xs">
        <div class="flex items-center gap-2">
          <span class="w-2.5 h-2.5 rounded-full flex-shrink-0" style="background-color: ${DONUT_COLORS[index % DONUT_COLORS.length]};"></span>
          <input type="text" value="${item.name}" class="w-full bg-transparent px-2 py-1.5 rounded-lg border border-transparent hover:border-coffee/20 focus:border-mustard focus:bg-white text-xs font-bold text-coffee focus:outline-none transition-colors" data-channel-index="${index}" data-field="name">
        </div>
      </td>
      <td class="py-2.5 px-3 w-32">
        <div class="relative flex items-center">
          <input type="number" min="0" max="100" step="0.1" value="${item.fee_percent}" class="w-full px-2.5 py-1.5 rounded-lg border border-coffee/15 bg-creme/40 focus:border-mustard focus:bg-white text-xs font-bold text-coffee focus:outline-none" data-channel-index="${index}" data-field="fee_percent">
          <span class="absolute right-2.5 text-[10px] text-coffee-soft pointer-events-none">%</span>
        </div>
      </td>
      <td class="py-2.5 px-3 w-32">
        <div class="relative flex items-center">
          <input type="number" min="0" max="100" step="0.1" value="${item.share_percent}" class="w-full px-2.5 py-1.5 rounded-lg border border-coffee/15 bg-creme/40 focus:border-mustard focus:bg-white text-xs font-bold text-coffee focus:outline-none" data-channel-index="${index}" data-field="share_percent">
          <span class="absolute right-2.5 text-[10px] text-coffee-soft pointer-events-none">%</span>
        </div>
      </td>
      <td class="py-2.5 px-3 text-right w-16">
        <button type="button" class="p-1.5 rounded-lg text-rose-600 hover:bg-rose-100 transition-colors btn-delete-channel" data-channel-index="${index}" title="Remover Canal">
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
        </button>
      </td>
    `;

    tbody.appendChild(tr);
  });

  tbody.querySelectorAll('input').forEach(input => {
    input.addEventListener('input', (e) => {
      const idx = Number(e.target.dataset.channelIndex);
      const field = e.target.dataset.field;
      if (field === 'name') {
        state.salesChannels[idx].name = e.target.value;
      } else if (field === 'fee_percent') {
        state.salesChannels[idx].fee_percent = Number(e.target.value || 0);
      } else if (field === 'share_percent') {
        state.salesChannels[idx].share_percent = Number(e.target.value || 0);
      }
      recalculateAll();
      triggerAutoSave();
    });
  });

  tbody.querySelectorAll('.btn-delete-channel').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const idx = Number(e.currentTarget.dataset.channelIndex);
      if (state.salesChannels.length <= 1) {
        showToast('Mantenha ao menos um canal de venda.', '⚠️');
        return;
      }
      state.salesChannels.splice(idx, 1);
      renderSalesChannelsTable();
      recalculateAll();
      triggerAutoSave();
    });
  });
}

/**
 * 8. PROJEÇÃO MÊS A MÊS (Item 3)
 */
function renderMonthlyProjectionsInputs() {
  const container = document.getElementById('monthly-projections-grid');
  if (!container) return;

  const defaultMonths = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  
  if (!state.settings.monthly_projections || state.settings.monthly_projections.length !== 12) {
    state.settings.monthly_projections = defaultMonths.map(m => ({
      month: m,
      value: state.settings.monthly_projected_revenue || 35000000
    }));
  }

  container.innerHTML = state.settings.monthly_projections.map((p, idx) => `
    <div class="space-y-1">
      <label class="block text-[10px] font-black uppercase text-coffee-soft">${p.month}</label>
      <input type="number" min="0" step="any" value="${p.value}" class="w-full px-2.5 py-1.5 rounded-xl border border-coffee/15 bg-creme/40 focus:border-mustard focus:bg-white text-xs font-bold text-coffee focus:outline-none input-projection-month" data-month-index="${idx}">
    </div>
  `).join('');

  container.querySelectorAll('.input-projection-month').forEach(input => {
    input.addEventListener('input', (e) => {
      const idx = Number(e.target.dataset.monthIndex);
      state.settings.monthly_projections[idx].value = Number(e.target.value || 0);
      updateProjectionStats();
      triggerAutoSave();
    });
  });

  updateProjectionStats();
}

function updateProjectionStats() {
  const annualTotalEl = document.getElementById('stat-annual-projection-total');
  const monthlyAvgEl = document.getElementById('stat-monthly-projection-avg');

  const totalAnnual = state.settings.monthly_projections?.reduce((s, m) => s + Number(m.value || 0), 0) || 0;
  const avgMonthly = totalAnnual / 12;

  if (annualTotalEl) annualTotalEl.textContent = formatGs(totalAnnual);
  if (monthlyAvgEl) monthlyAvgEl.textContent = formatGs(avgMonthly);
}

/**
 * 9. DROPDOWN DE PRODUTOS CADASTRADOS (Item 10)
 */
function renderProductsDropdown() {
  const select = document.getElementById('sim-product-select');
  if (!select) return;

  select.innerHTML = '<option value="">-- Selecionar Produto Cadastrado --</option>';

  const foods = state.products.filter(p => p.type !== 'bebida');
  const drinks = state.products.filter(p => p.type === 'bebida');

  if (foods.length > 0) {
    const groupFood = document.createElement('optgroup');
    groupFood.label = '🌭 Lanches & Alimentos';
    foods.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = `${p.name} — ${formatGs(p.price_gs)}`;
      groupFood.appendChild(opt);
    });
    select.appendChild(groupFood);
  }

  if (drinks.length > 0) {
    const groupDrinks = document.createElement('optgroup');
    groupDrinks.label = '🥤 Bebidas';
    drinks.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = `${p.name} — ${formatGs(p.price_gs)}`;
      groupDrinks.appendChild(opt);
    });
    select.appendChild(groupDrinks);
  }

  select.addEventListener('change', (e) => {
    const productId = e.target.value;
    if (!productId) return;

    const product = state.products.find(p => p.id === productId);
    if (product) {
      state.simulatedProduct = {
        id: product.id,
        name: product.name,
        category: product.category || 'Alimento',
        cmv_gs: Number(product.cmv_gs || 0),
        price_gs: Number(product.promotional_price_gs || product.price_gs || 0),
        isCustom: false
      };
      populateSimulatorInputs();
      recalculateAll();
      showToast(`Produto "${product.name}" carregado no simulador!`, '🌭');
    }
  });
}

/**
 * 10. CONFIGURAÇÃO DE EVENTOS GERAIS
 */
function setupEventListeners() {
  // A. Faturamento mensal
  document.getElementById('input-projected-revenue')?.addEventListener('input', (e) => {
    state.settings.monthly_projected_revenue = Number(e.target.value || 0);
    recalculateAll();
    triggerAutoSave();
  });

  // Botão: Aplicar média da projeção ao faturamento mensal
  document.getElementById('btn-apply-projection-avg')?.addEventListener('click', () => {
    const totalAnnual = state.settings.monthly_projections?.reduce((s, m) => s + Number(m.value || 0), 0) || 0;
    const avg = Math.round(totalAnnual / 12);
    state.settings.monthly_projected_revenue = avg;
    const revInput = document.getElementById('input-projected-revenue');
    if (revInput) revInput.value = avg;
    recalculateAll();
    triggerAutoSave();
    showToast(`Faturamento mensal definido como ${formatGs(avg)}!`, '✓');
  });

  // B. Custos Variáveis
  const varInputs = [
    { id: 'input-tax-percent', key: 'tax_percent' },
    { id: 'input-waste-percent', key: 'waste_percent' },
    { id: 'input-maint-percent', key: 'maintenance_percent' },
    { id: 'input-other-var-percent', key: 'other_variable_percent' }
  ];

  varInputs.forEach(({ id, key }) => {
    document.getElementById(id)?.addEventListener('input', (e) => {
      state.settings[key] = Number(e.target.value || 0);
      recalculateAll();
      triggerAutoSave();
    });
  });

  // C. Lucro Desejado (% e Moeda)
  document.getElementById('input-target-profit')?.addEventListener('input', (e) => {
    state.settings.target_profit_percent = Number(e.target.value || 0);
    recalculateAll();
    triggerAutoSave();
  });

  document.getElementById('input-target-profit-fixed')?.addEventListener('input', (e) => {
    state.settings.target_profit_fixed_gs = Number(e.target.value || 0);
    recalculateAll();
    triggerAutoSave();
  });

  document.getElementById('checkbox-use-fixed-profit')?.addEventListener('change', (e) => {
    state.settings.use_fixed_profit = e.target.checked;
    const fixedBox = document.getElementById('target-profit-fixed-container');
    if (fixedBox) {
      if (e.target.checked) fixedBox.classList.remove('hidden');
      else fixedBox.classList.add('hidden');
    }
    recalculateAll();
    triggerAutoSave();
  });

  // D. Adicionar Custo Fixo
  document.getElementById('btn-add-fixed-cost')?.addEventListener('click', () => {
    const modal = document.getElementById('modal-add-fixed-cost');
    modal?.classList.remove('hidden');
    document.getElementById('new-fixed-desc')?.focus();
  });

  document.getElementById('btn-close-fixed-modal')?.addEventListener('click', () => {
    document.getElementById('modal-add-fixed-cost')?.classList.add('hidden');
  });

  document.getElementById('form-add-fixed-cost')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const desc = document.getElementById('new-fixed-desc').value.trim();
    const val = Number(document.getElementById('new-fixed-val').value || 0);

    if (!desc || val <= 0) {
      showToast('Preencha a descrição e um valor positivo.', '⚠️');
      return;
    }

    state.fixedCosts.push({
      id: 'fc-' + Date.now(),
      description: desc,
      monthly_value: val,
      sort_order: state.fixedCosts.length + 1
    });

    renderFixedCostsTable();
    recalculateAll();
    triggerAutoSave();

    document.getElementById('new-fixed-desc').value = '';
    document.getElementById('new-fixed-val').value = '';
    document.getElementById('modal-add-fixed-cost')?.classList.add('hidden');
    showToast(`Custo "${desc}" adicionado com sucesso!`, '✓');
  });

  // E. Adicionar Canal de Venda
  document.getElementById('btn-add-sales-channel')?.addEventListener('click', () => {
    const modal = document.getElementById('modal-add-channel');
    modal?.classList.remove('hidden');
    document.getElementById('new-channel-name')?.focus();
  });

  document.getElementById('btn-close-channel-modal')?.addEventListener('click', () => {
    document.getElementById('modal-add-channel')?.classList.add('hidden');
  });

  document.getElementById('form-add-channel')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('new-channel-name').value.trim();
    const fee = Number(document.getElementById('new-channel-fee').value || 0);
    const share = Number(document.getElementById('new-channel-share').value || 0);

    if (!name) {
      showToast('Digite o nome do canal.', '⚠️');
      return;
    }

    state.salesChannels.push({
      id: 'sc-' + Date.now(),
      name,
      fee_percent: fee,
      share_percent: share,
      sort_order: state.salesChannels.length + 1
    });

    renderSalesChannelsTable();
    recalculateAll();
    triggerAutoSave();

    document.getElementById('new-channel-name').value = '';
    document.getElementById('new-channel-fee').value = '0';
    document.getElementById('new-channel-share').value = '10';
    document.getElementById('modal-add-channel')?.classList.add('hidden');
    showToast(`Canal "${name}" adicionado com sucesso!`, '✓');
  });

  // F. Simulador de Produto (edição direta manual)
  document.getElementById('sim-product-name')?.addEventListener('input', (e) => {
    state.simulatedProduct.name = e.target.value;
  });

  document.getElementById('sim-product-cost')?.addEventListener('input', (e) => {
    state.simulatedProduct.cmv_gs = Number(e.target.value || 0);
    state.simulatedProduct.isCustom = true;
    recalculateAll();
  });

  document.getElementById('sim-product-price')?.addEventListener('input', (e) => {
    state.simulatedProduct.price_gs = Number(e.target.value || 0);
    state.simulatedProduct.isCustom = true;
    recalculateAll();
  });

  // G. Botão "Aplicar preço sugerido ao produto" (Item 10)
  document.getElementById('btn-apply-suggested-price')?.addEventListener('click', () => {
    const calc = calculateFinancials();

    if (!calc.isMarkupValid || calc.suggestedPrice === null) {
      showToast('Não é possível aplicar um preço sugerido inválido.', '⚠️');
      return;
    }

    if (!state.simulatedProduct.id) {
      showToast('Selecione primeiro um produto cadastrado no catálogo para aplicar o preço.', 'ℹ️');
      return;
    }

    // Abre modal de confirmação
    const modal = document.getElementById('modal-confirm-apply-price');
    const nameEl = document.getElementById('apply-product-name');
    const oldPriceEl = document.getElementById('apply-old-price');
    const newPriceEl = document.getElementById('apply-new-price');
    const diffEl = document.getElementById('apply-price-diff');

    if (nameEl) nameEl.textContent = state.simulatedProduct.name;
    if (oldPriceEl) oldPriceEl.textContent = formatGs(state.simulatedProduct.price_gs);
    if (newPriceEl) newPriceEl.textContent = formatGs(calc.suggestedPrice);

    const diff = calc.suggestedPrice - state.simulatedProduct.price_gs;
    if (diffEl) {
      diffEl.textContent = `${diff >= 0 ? '+' : ''}${formatGs(diff)} (${calc.suggestedPrice > 0 ? ((diff / state.simulatedProduct.price_gs) * 100).toFixed(1) : 0}%)`;
      diffEl.className = `font-black ${diff >= 0 ? 'text-emerald-700' : 'text-rose-700'}`;
    }

    modal?.classList.remove('hidden');
  });

  document.getElementById('btn-cancel-apply-price')?.addEventListener('click', () => {
    document.getElementById('modal-confirm-apply-price')?.classList.add('hidden');
  });

  document.getElementById('btn-confirm-apply-price')?.addEventListener('click', async () => {
    const calc = calculateFinancials();
    const btn = document.getElementById('btn-confirm-apply-price');
    if (!state.simulatedProduct.id || calc.suggestedPrice === null) return;

    btn.disabled = true;
    btn.textContent = 'Atualizando produto...';

    try {
      const targetProd = state.products.find(p => p.id === state.simulatedProduct.id);
      if (!targetProd) throw new Error('Produto não encontrado');

      // Atualiza o preço no objeto
      targetProd.price_gs = calc.suggestedPrice;
      targetProd.cmv_gs = Number(state.simulatedProduct.cmv_gs); // atualiza custo de produção caso tenha alterado
      targetProd.updated_at = new Date().toISOString();

      // Salva no banco e localmente
      await saveProductToSupabase(targetProd);
      saveProductLocally(targetProd);

      state.simulatedProduct.price_gs = calc.suggestedPrice;
      const simPriceInput = document.getElementById('sim-product-price');
      if (simPriceInput) simPriceInput.value = calc.suggestedPrice;

      renderProductsDropdown();
      recalculateAll();

      document.getElementById('modal-confirm-apply-price')?.classList.add('hidden');
      showToast(`Preço de "${targetProd.name}" atualizado para ${formatGs(calc.suggestedPrice)}!`, '🎉');
    } catch (err) {
      console.error('Erro ao atualizar preço do produto:', err);
      showToast('Erro ao atualizar preço no cadastro.', '⚠️');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Sim, Atualizar Preço no Cardápio';
    }
  });

  // H. Botão Manual de Salvar Alterações (Item 13)
  document.getElementById('btn-save-pricing')?.addEventListener('click', async () => {
    await persistAllChanges(true);
  });

  // I. Botão Restaurar Padrões Oficiais
  document.getElementById('btn-reset-defaults')?.addEventListener('click', () => {
    if (confirm('Deseja restaurar as configurações padrão de precificação do Pancho Mbarate?')) {
      state.settings = { ...DEFAULT_PRICING_SETTINGS };
      state.fixedCosts = [ ...DEFAULT_FIXED_COSTS ];
      state.salesChannels = [ ...DEFAULT_SALES_CHANNELS ];
      populateInputsFromState();
      renderFixedCostsTable();
      renderSalesChannelsTable();
      recalculateAll();
      triggerAutoSave();
      showToast('Configurações padrão restauradas.', '🔄');
    }
  });
}

/**
 * 11. SISTEMA DE SALVAMENTO AUTOMÁTICO E PERSISTÊNCIA (Itens 12 e 13)
 */
function triggerAutoSave() {
  updateSaveStatus('saving', 'Salvando alterações...');

  if (state.saveTimer) {
    clearTimeout(state.saveTimer);
  }

  state.saveTimer = setTimeout(async () => {
    await persistAllChanges(false);
  }, 1200); // 1.2 segundos de debounce suave
}

async function persistAllChanges(isManual = false) {
  updateSaveStatus('saving', 'Gravando no Supabase...');

  try {
    const [resSettings, resCosts, resChannels] = await Promise.all([
      savePricingSettingsToDB(state.settings),
      saveAllFixedCostsToDB(state.fixedCosts),
      saveAllSalesChannelsToDB(state.salesChannels)
    ]);

    state.lastSavedAt = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    updateSaveStatus('saved', `Salvo às ${state.lastSavedAt}`);

    if (isManual) {
      showToast('Todas as alterações foram salvas com sucesso!', '💾');
    }
  } catch (err) {
    console.error('Erro ao persistir configurações:', err);
    updateSaveStatus('error', 'Erro ao salvar');
    if (isManual) {
      showToast('Houve uma falha ao conectar com o banco. Dados salvos localmente.', '⚠️');
    }
  }
}

function updateSaveStatus(status, text) {
  state.saveState = status;
  const statusPill = document.getElementById('save-status-pill');
  const statusText = document.getElementById('save-status-text');

  if (!statusPill || !statusText) return;

  statusText.textContent = text;

  if (status === 'saving') {
    statusPill.className = 'px-3 py-1 rounded-full text-[11px] font-black bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1.5 transition-all';
  } else if (status === 'saved') {
    statusPill.className = 'px-3 py-1 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1.5 transition-all';
  } else {
    statusPill.className = 'px-3 py-1 rounded-full text-[11px] font-black bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-1.5 transition-all';
  }
}

/**
 * 12. SIDEBAR E NAVEGAÇÃO RESPONSIVA (Item 15)
 */
function setupNavigation() {
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
 * 13. NOTIFICAÇÕES TOAST
 */
function showToast(message, icon = '✓') {
  const toast = document.getElementById('pricing-toast');
  const toastMsg = document.getElementById('toast-message');
  const toastIcon = document.getElementById('toast-icon');

  if (!toast) return;

  if (toastMsg) toastMsg.textContent = message;
  if (toastIcon) toastIcon.textContent = icon;

  toast.classList.remove('translate-y-20', 'opacity-0', 'pointer-events-none');
  toast.classList.add('translate-y-0', 'opacity-100');

  setTimeout(() => {
    toast.classList.add('translate-y-20', 'opacity-0', 'pointer-events-none');
    toast.classList.remove('translate-y-0', 'opacity-100');
  }, 3500);
}
