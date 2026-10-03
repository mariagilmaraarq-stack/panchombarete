/**
 * PANCHO MBARATE — APLICAÇÃO CLIENTE PRINCIPAL
 * Mobile-First, Orientado à Conversão com Suporte a Quantidades e Bebidas Geladas
 */
import { APP_CONFIG, getStoreStatus } from './config.js';
import { getActiveProducts, getActiveAddons, getActiveDrinks, formatGs } from './products.js';
import { cart } from './cart.js';
import { openWhatsApp } from './whatsapp.js';
import { createOrderInDB, fetchStoreSettingsFromDB } from './supabase.js';

let activeProductsList = [];
let activeAddonsList = [];
let activeDrinksList = [];
let storeStatus = null;

document.addEventListener('DOMContentLoaded', async () => {
  await initStore();
  renderProducts();
  renderAddons();
  renderDrinks();
  setupEventListeners();
  setupCartListener();
});

/**
 * Inicialização e verificação de status operacional
 */
async function initStore() {
  try {
    const settings = await fetchStoreSettingsFromDB();
    if (settings) {
      if (settings.store_name) APP_CONFIG.STORE_NAME = settings.store_name;
      if (settings.whatsapp_number) APP_CONFIG.WHATSAPP_NUMBER = settings.whatsapp_number;
      if (settings.address) {
        APP_CONFIG.ADDRESS = settings.address;
        const addressEl = document.getElementById('store-address-display');
        if (addressEl) addressEl.textContent = settings.address;
      }
      if (settings.maps_url) {
        APP_CONFIG.GOOGLE_MAPS_URL = settings.maps_url;
        const mapsBtn = document.getElementById('btn-google-maps');
        if (mapsBtn) mapsBtn.href = settings.maps_url;
      }
      if (settings.instagram_url) {
        APP_CONFIG.INSTAGRAM_URL = settings.instagram_url;
        const instaBtn = document.getElementById('footer-instagram');
        if (instaBtn) instaBtn.href = settings.instagram_url;
      }
      if (settings.opening_time) APP_CONFIG.OPENING_TIME = settings.opening_time;
      if (settings.closing_time) APP_CONFIG.CLOSING_TIME = settings.closing_time;
    }
  } catch (e) {
    console.info('Configurações padrão ativas.');
  }

  // Verifica horário de funcionamento
  storeStatus = getStoreStatus(APP_CONFIG.OPENING_TIME, APP_CONFIG.CLOSING_TIME);
  updateStatusBadgeUI(storeStatus);

  // Carrega catálogos
  activeProductsList = await getActiveProducts();
  activeAddonsList = await getActiveAddons();
  activeDrinksList = await getActiveDrinks();
}

/**
 * Atualiza UI do status de abertura
 */
function updateStatusBadgeUI(status) {
  const badgeEl = document.getElementById('store-status-badge');
  const textEl = document.getElementById('store-status-text');
  const closedBanner = document.getElementById('store-closed-banner');
  const reopenTimeEl = document.getElementById('closed-reopen-time');

  if (badgeEl && textEl) {
    textEl.textContent = status.statusBadgeText;
    if (status.isOpen) {
      badgeEl.className = 'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold tracking-wide shadow-sm bg-emerald-500 text-white';
      if (closedBanner) closedBanner.classList.add('hidden');
    } else {
      badgeEl.className = 'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold tracking-wide shadow-sm bg-amber-600 text-white';
      if (closedBanner) {
        closedBanner.classList.remove('hidden');
        if (reopenTimeEl) reopenTimeEl.textContent = status.openingTime;
      }
    }
  }
}

/**
 * Renderiza os produtos com controle individual de quantidade e seleção múltipla
 */
function renderProducts() {
  const container = document.getElementById('products-container');
  if (!container) return;

  container.innerHTML = '';

  activeProductsList.forEach((product) => {
    const qty = cart.getProductQuantity(product.id);
    const isSelected = qty > 0;
    const sausageText = product.sausages_qty === 1 ? '1 Salsicha' : `${product.sausages_qty} Salsichas`;

    const card = document.createElement('article');
    card.id = `product-card-${product.id}`;
    card.className = `pancho-card group relative bg-white rounded-3xl p-4 border-2 transition-all duration-300 card-shadow card-shadow-hover flex flex-col justify-between ${
      isSelected ? 'is-selected border-mustard' : 'border-coffee/5 hover:border-mustard/40'
    }`;
    card.setAttribute('role', 'article');

    card.innerHTML = `
      <div class="space-y-3">
        <!-- Imagem com Aspect Ratio 4:3 e Badges -->
        <div class="relative w-full aspect-[4/3] rounded-2xl overflow-hidden bg-creme-dark cursor-pointer select-pancho-trigger">
          <img src="${product.image_url}" alt="${product.name}" loading="lazy" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300">
          
          <!-- Badge de Destaque -->
          ${product.highlight ? `
            <span class="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-full bg-redSport text-white font-black text-[11px] tracking-wide shadow-md uppercase">
              ${product.highlight}
            </span>
          ` : ''}

          <!-- Badge de Salsichas -->
          <span class="absolute bottom-2.5 right-2.5 px-2.5 py-1 rounded-full bg-coffee/85 backdrop-blur-sm text-mustard font-extrabold text-[11px] shadow-sm">
            🌭 ${sausageText}
          </span>
        </div>

        <!-- Título e Descrição -->
        <div class="cursor-pointer select-pancho-trigger">
          <h3 class="text-lg md:text-xl font-black text-coffee tracking-tight">
            ${product.name}
          </h3>
          <p class="text-xs text-coffee-light mt-1.5 leading-relaxed">
            ${product.description}
          </p>
        </div>
      </div>

      <!-- Preço e Stepper de Quantidade -->
      <div class="mt-4 pt-3 border-t border-coffee/5 flex items-center justify-between gap-2">
        <div>
          <span class="block text-[10px] uppercase font-bold text-coffee-soft tracking-wider">Unidade</span>
          <span class="text-lg md:text-xl font-black text-coffee tracking-tight">
            ${product.promotional_price_gs ? `
              <span class="text-xs text-coffee-soft line-through mr-1 font-semibold">${formatGs(product.price_gs)}</span>
              <span class="text-redSport font-black">${formatGs(product.promotional_price_gs)}</span>
            ` : formatGs(product.price_gs)}
          </span>
        </div>

        <!-- Seletor ou Stepper de Quantidade Individual por Card -->
        <div class="product-action-wrapper">
          ${isSelected ? `
            <div class="flex items-center gap-1.5 bg-mustard px-2 py-1 rounded-full shadow-sm">
              <button type="button" class="btn-card-minus w-7 h-7 rounded-full bg-white hover:bg-creme text-coffee font-black text-xs flex items-center justify-center shadow-sm" aria-label="Diminuir quantidade">-</button>
              <span class="card-qty-display font-black text-xs text-coffee px-2">${qty}</span>
              <button type="button" class="btn-card-plus w-7 h-7 rounded-full bg-white hover:bg-creme text-coffee font-black text-xs flex items-center justify-center shadow-sm" aria-label="Aumentar quantidade">+</button>
            </div>
          ` : `
            <button type="button" class="btn-card-select px-4 py-2 rounded-full font-black text-xs tracking-wide uppercase transition-all shadow-sm bg-mustard hover:bg-mustard-hover text-coffee btn-press flex items-center gap-1">
              <span>+ Escolher</span>
            </button>
          `}
        </div>
      </div>
    `;

    // Listeners do Card
    const triggerSelection = () => {
      if (!cart.isProductSelected(product.id)) {
        cart.setProductQuantity(product, 1);
        renderProducts();
      }
    };

    card.querySelectorAll('.select-pancho-trigger').forEach(el => {
      el.addEventListener('click', triggerSelection);
    });

    const selectBtn = card.querySelector('.btn-card-select');
    if (selectBtn) {
      selectBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        cart.setProductQuantity(product, 1);
        renderProducts();
      });
    }

    const minusBtn = card.querySelector('.btn-card-minus');
    if (minusBtn) {
      minusBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        cart.decrementProduct(product);
        renderProducts();
      });
    }

    const plusBtn = card.querySelector('.btn-card-plus');
    if (plusBtn) {
      plusBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        cart.incrementProduct(product);
        renderProducts();
      });
    }

    container.appendChild(card);
  });
}

/**
 * Renderiza Adicionais Oficiais
 */
function renderAddons() {
  const container = document.getElementById('addons-container');
  if (!container) return;

  container.innerHTML = '';

  activeAddonsList.forEach((addon) => {
    const isChecked = cart.isAddonSelected(addon.id);

    const card = document.createElement('div');
    card.id = `addon-card-${addon.id}`;
    card.className = `addon-card rounded-2xl p-4 bg-white border-2 transition-all duration-200 card-shadow flex items-center justify-between cursor-pointer btn-press select-none ${
      isChecked ? 'is-selected border-mustard bg-amber-50/40' : 'border-coffee/10 hover:border-mustard/40'
    }`;
    card.setAttribute('role', 'checkbox');
    card.setAttribute('aria-checked', isChecked ? 'true' : 'false');
    card.setAttribute('tabindex', '0');

    card.innerHTML = `
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-mustard-light flex items-center justify-center text-xl flex-shrink-0">
          ${addon.icon || '🧀'}
        </div>
        <div>
          <h4 class="font-extrabold text-sm md:text-base text-coffee tracking-tight">
            ${addon.name}
          </h4>
          <span class="text-xs font-bold text-redSport">
            +${formatGs(addon.price_gs)}
          </span>
        </div>
      </div>

      <div class="addon-checkbox w-7 h-7 rounded-lg border-2 flex items-center justify-center transition-colors ${
        isChecked 
          ? 'bg-mustard border-mustard text-coffee' 
          : 'border-coffee/20 bg-white text-transparent'
      }">
        <svg class="w-4 h-4 font-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path>
        </svg>
      </div>
    `;

    const handleToggle = () => {
      cart.toggleAddon(addon);
      renderAddons();
    };

    card.addEventListener('click', handleToggle);
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleToggle();
      }
    });

    container.appendChild(card);
  });
}

/**
 * Renderiza Bebidas Geladas com Seletor de Quantidade
 */
function renderDrinks() {
  const container = document.getElementById('drinks-container');
  if (!container) return;

  container.innerHTML = '';

  activeDrinksList.forEach((drink) => {
    const qty = cart.getDrinkQuantity(drink.id);
    const hasDrink = qty > 0;

    const card = document.createElement('div');
    card.className = `rounded-2xl sm:rounded-3xl p-3 sm:p-4 bg-white border-2 transition-all duration-200 card-shadow flex flex-col justify-between ${
      hasDrink ? 'border-mustard bg-amber-50/30' : 'border-coffee/10 hover:border-mustard/40'
    }`;

    card.innerHTML = `
      <div class="space-y-2 sm:space-y-3">
        <div class="relative w-full aspect-square rounded-xl sm:rounded-2xl overflow-hidden bg-creme-dark">
          <img src="${drink.image_url}" alt="${drink.name}" loading="lazy" class="w-full h-full object-cover">
          <span class="absolute top-1.5 right-1.5 sm:top-2.5 sm:right-2.5 px-2 py-0.5 rounded-full bg-emerald-500 text-white font-extrabold text-[9px] sm:text-[10px] shadow-sm uppercase">
            ❄️ Gelada
          </span>
        </div>

        <div>
          <h4 class="font-black text-xs sm:text-base text-coffee tracking-tight">
            ${drink.name}
          </h4>
          <p class="text-[10px] sm:text-[11px] text-coffee-soft mt-0.5 leading-snug line-clamp-2 sm:line-clamp-none">
            ${drink.description}
          </p>
        </div>
      </div>

      <div class="mt-3 pt-2.5 sm:mt-4 sm:pt-3 border-t border-coffee/5 flex flex-col xs:flex-row items-start xs:items-center justify-between gap-1.5 sm:gap-2">
        <span class="text-xs sm:text-base font-black text-coffee">
          ${drink.promotional_price_gs ? `
            <span class="text-[10px] text-coffee-soft line-through mr-1 font-semibold">${formatGs(drink.price_gs)}</span>
            <span class="text-redSport font-black">${formatGs(drink.promotional_price_gs)}</span>
          ` : formatGs(drink.price_gs)}
        </span>

        <div class="flex items-center gap-1 sm:gap-1.5 bg-creme px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-lg sm:rounded-xl border border-coffee/15 shadow-sm self-end xs:self-auto">
          <button type="button" class="btn-drink-minus w-6 h-6 sm:w-7 sm:h-7 rounded-md sm:rounded-lg bg-white hover:bg-mustard text-coffee font-black text-xs flex items-center justify-center shadow-sm">-</button>
          <span class="drink-qty-display font-black text-xs text-coffee px-1 sm:px-1.5">${qty}</span>
          <button type="button" class="btn-drink-plus w-6 h-6 sm:w-7 sm:h-7 rounded-md sm:rounded-lg bg-white hover:bg-mustard text-coffee font-black text-xs flex items-center justify-center shadow-sm">+</button>
        </div>
      </div>
    `;

    // Listeners do Stepper de Bebida
    const minusBtn = card.querySelector('.btn-drink-minus');
    const plusBtn = card.querySelector('.btn-drink-plus');

    minusBtn.addEventListener('click', () => {
      cart.decrementDrink(drink);
      renderDrinks();
    });

    plusBtn.addEventListener('click', () => {
      cart.incrementDrink(drink);
      renderDrinks();
    });

    container.appendChild(card);
  });
}

/**
 * Sincroniza a barra fixa inferior e o modal com o estado do carrinho
 */
function setupCartListener() {
  window.addEventListener('cart:updated', (e) => {
    const { products, product, productQuantity, totalPanchosCount, addons, drinks, formattedTotal, itemsCount, hasProduct } = e.detail;

    const stickyBar = document.getElementById('sticky-bottom-bar');
    const barItemCount = document.getElementById('bottom-bar-item-count');
    const barTotal = document.getElementById('bottom-bar-total');

    // Sticky Bar
    if (hasProduct || itemsCount > 0) {
      stickyBar.classList.remove('translate-y-full');
      
      let labelParts = [];
      const panchosList = products || cart.getSelectedProductsList();
      const panchosTotal = totalPanchosCount !== undefined ? totalPanchosCount : cart.getTotalPanchosCount();

      if (panchosTotal > 0) {
        if (panchosList.length === 1) {
          labelParts.push(`${panchosList[0].quantity}x ${panchosList[0].product.name}`);
        } else {
          labelParts.push(`${panchosTotal} Panchos`);
        }
      }
      if (drinks && drinks.length > 0) {
        const drinksCount = drinks.reduce((acc, d) => acc + d.quantity, 0);
        labelParts.push(`${drinksCount} Bebida${drinksCount > 1 ? 's' : ''}`);
      }
      
      barItemCount.innerHTML = `<span>🌭</span> ${labelParts.join(' + ') || '1 item selecionado'}`;
      barTotal.textContent = formattedTotal;
    } else {
      stickyBar.classList.add('translate-y-full');
    }

    // Modal de Resumo
    updateModalSummary(products, addons, drinks, formattedTotal);
  });
}

/**
 * Atualiza os campos do modal com os dados do carrinho (suporte a múltiplos produtos)
 */
function updateModalSummary(products, addons, drinks, formattedTotal) {
  const productsWrapper = document.getElementById('summary-products-wrapper');
  const addonsWrapper = document.getElementById('summary-addons-wrapper');
  const drinksWrapper = document.getElementById('summary-drinks-wrapper');
  const totalPrice = document.getElementById('summary-total-price');

  const selectedProductsList = products || cart.getSelectedProductsList();

  if (productsWrapper) {
    productsWrapper.innerHTML = '';

    if (selectedProductsList.length > 0) {
      selectedProductsList.forEach(item => {
        const prod = item.product;
        const unitPrice = (prod.promotional_price_gs !== null && prod.promotional_price_gs !== undefined)
          ? Number(prod.promotional_price_gs)
          : Number(prod.price_gs);
        const itemTotal = unitPrice * item.quantity;
        const sausageText = prod.sausages_qty === 1 ? '1 salsicha' : `${prod.sausages_qty} salsichas`;

        const row = document.createElement('div');
        row.className = 'flex items-center justify-between gap-3 pt-2.5 first:pt-0';
        row.innerHTML = `
          <div class="flex-1 min-w-0">
            <h4 class="font-black text-sm text-coffee truncate">
              ${prod.name}
            </h4>
            <p class="text-[11px] text-coffee-soft">
              ${sausageText} • molhos artesanais
            </p>
          </div>

          <div class="flex items-center gap-1.5 bg-white px-2 py-1 rounded-xl border border-coffee/15 shadow-sm">
            <button type="button" class="btn-summary-prod-minus w-6 h-6 rounded-lg bg-creme hover:bg-mustard-light text-coffee font-black text-xs flex items-center justify-center">-</button>
            <span class="font-black text-xs text-coffee px-1.5">${item.quantity}</span>
            <button type="button" class="btn-summary-prod-plus w-6 h-6 rounded-lg bg-creme hover:bg-mustard-light text-coffee font-black text-xs flex items-center justify-center">+</button>
          </div>

          <span class="font-black text-sm text-coffee flex-shrink-0 text-right">
            ${formatGs(itemTotal)}
          </span>
        `;

        row.querySelector('.btn-summary-prod-minus').addEventListener('click', () => {
          cart.decrementProduct(prod);
          renderProducts();
        });

        row.querySelector('.btn-summary-prod-plus').addEventListener('click', () => {
          cart.incrementProduct(prod);
          renderProducts();
        });

        productsWrapper.appendChild(row);
      });
    } else {
      productsWrapper.innerHTML = `
        <div class="py-1">
          <h4 id="summary-product-name" class="font-black text-sm text-coffee">Nenhum pancho selecionado</h4>
          <p id="summary-product-desc" class="text-xs text-coffee-soft">Selecione um pancho no cardápio</p>
        </div>
      `;
    }
  }

  // Adicionais
  if (addonsWrapper) {
    addonsWrapper.innerHTML = '';
    const totalPanchos = cart.getTotalPanchosCount();
    const multiplier = totalPanchos > 0 ? totalPanchos : 1;
    if (addons && addons.length > 0) {
      addons.forEach(a => {
        const item = document.createElement('div');
        item.className = 'flex items-center justify-between text-xs text-coffee';
        const itemTotal = a.price_gs * multiplier;
        item.innerHTML = `
          <span class="flex items-center gap-1.5 font-medium">
            <span>${a.icon || '🧀'}</span> ${a.name} ${multiplier > 1 ? `(${multiplier}x)` : ''}
          </span>
          <span class="font-bold text-coffee">+${formatGs(itemTotal)}</span>
        `;
        addonsWrapper.appendChild(item);
      });
      addonsWrapper.classList.remove('hidden');
    } else {
      addonsWrapper.classList.add('hidden');
    }
  }

  // Bebidas
  if (drinksWrapper) {
    drinksWrapper.innerHTML = '';
    if (drinks && drinks.length > 0) {
      drinks.forEach(d => {
        const item = document.createElement('div');
        item.className = 'flex items-center justify-between text-xs text-coffee font-medium';
        const drinkPrice = (d.drink.promotional_price_gs !== null && d.drink.promotional_price_gs !== undefined)
          ? Number(d.drink.promotional_price_gs)
          : Number(d.drink.price_gs);
        item.innerHTML = `
          <span class="flex items-center gap-1.5 font-bold text-emerald-800">
            <span>🥤</span> ${d.quantity}x ${d.drink.name}
          </span>
          <span class="font-bold text-coffee">+${formatGs(drinkPrice * d.quantity)}</span>
        `;
        drinksWrapper.appendChild(item);
      });
      drinksWrapper.classList.remove('hidden');
    } else {
      drinksWrapper.classList.add('hidden');
    }
  }

  if (totalPrice) {
    totalPrice.textContent = formattedTotal;
  }
}

/**
 * Configuração de listeners e eventos gerais
 */
function setupEventListeners() {
  const openModalBtn = document.getElementById('btn-open-checkout');
  const barSummaryTrigger = document.getElementById('bar-summary-trigger');
  const closeModalBtn = document.getElementById('btn-close-modal');
  const modal = document.getElementById('checkout-modal');
  const confirmWhatsappBtn = document.getElementById('btn-confirm-whatsapp');
  const nameInput = document.getElementById('customer-name-input');
  const nameError = document.getElementById('name-error-msg');
  const customTimeInput = document.getElementById('custom-time-input');

  const summaryMinusBtn = document.getElementById('summary-btn-minus');
  const summaryPlusBtn = document.getElementById('summary-btn-plus');

  summaryMinusBtn?.addEventListener('click', () => {
    cart.decrementProduct();
    renderProducts();
  });

  summaryPlusBtn?.addEventListener('click', () => {
    cart.incrementProduct();
    renderProducts();
  });

  const openCheckout = () => {
    if (!cart.hasProduct() && cart.getTotalItemsCount() === 0) {
      document.getElementById('cardapio')?.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    setTimeout(() => nameInput.focus(), 100);
  };

  const closeCheckout = () => {
    modal.classList.add('hidden');
    document.body.style.overflow = '';
  };

  const topbarOrderBtn = document.getElementById('topbar-order-btn');
  if (topbarOrderBtn) topbarOrderBtn.addEventListener('click', openCheckout);
  if (openModalBtn) openModalBtn.addEventListener('click', openCheckout);
  if (barSummaryTrigger) barSummaryTrigger.addEventListener('click', openCheckout);
  if (closeModalBtn) closeModalBtn.addEventListener('click', closeCheckout);

  modal?.addEventListener('click', (e) => {
    if (e.target === modal) closeCheckout();
  });

  nameInput?.addEventListener('input', (e) => {
    cart.setCustomerName(e.target.value);
    if (e.target.value.trim().length > 0) {
      nameError.classList.add('hidden');
      nameInput.classList.remove('border-redSport');
    }
  });

  // Chips de horário
  const chips = document.querySelectorAll('.pickup-chip');
  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      chips.forEach(c => {
        c.classList.remove('is-active', 'border-mustard', 'bg-mustard-light', 'font-black');
        c.classList.add('border-coffee/10', 'font-bold');
      });
      chip.classList.add('is-active', 'border-mustard', 'bg-mustard-light', 'font-black');
      chip.classList.remove('border-coffee/10', 'font-bold');

      const timeVal = chip.getAttribute('data-time');
      cart.setPickupTime(timeVal);
      if (customTimeInput) customTimeInput.value = '';
    });
  });

  customTimeInput?.addEventListener('input', (e) => {
    if (e.target.value.trim().length > 0) {
      chips.forEach(c => c.classList.remove('is-active', 'border-mustard', 'bg-mustard-light', 'font-black'));
      cart.setCustomTime(e.target.value);
    }
  });

  // Confirmar Pedido no WhatsApp
  confirmWhatsappBtn?.addEventListener('click', async () => {
    const customerName = nameInput.value.trim();

    if (!customerName) {
      nameError.classList.remove('hidden');
      nameInput.classList.add('border-redSport');
      nameInput.focus();
      return;
    }

    if (!cart.hasProduct() && cart.getTotalItemsCount() === 0) {
      alert('Por favor, selecione um Pancho ou Bebida.');
      closeCheckout();
      return;
    }

    const currentStatus = getStoreStatus(APP_CONFIG.OPENING_TIME, APP_CONFIG.CLOSING_TIME);
    if (!currentStatus.isOpen) {
      const proceed = confirm(`Atenção: O Pancho Mbarate abre às ${currentStatus.openingTime}. Deseja enviar o pedido antecipadamente para agendamento?`);
      if (!proceed) return;
    }

    confirmWhatsappBtn.disabled = true;
    confirmWhatsappBtn.innerHTML = `
      <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      GERANDO PEDIDO...
    `;

    try {
      const orderCode = cart.generateOrderCode();
      const effectivePickup = cart.getEffectivePickupTime();

      const orderPayload = {
        order_code: orderCode,
        customer_name: customerName,
        pickup_time: effectivePickup,
        subtotal_gs: cart.getSubtotalGs(),
        addons_total_gs: cart.getAddonsTotalGs(),
        drinks_total_gs: cart.getDrinksTotalGs(),
        total_gs: cart.getTotalGs(),
        cmv_gs: cart.getCalculatedCmvGs(),
        products: cart.getSelectedProductsList(),
        product: cart.selectedProduct,
        productQuantity: cart.getTotalPanchosCount(),
        totalPanchosCount: cart.getTotalPanchosCount(),
        addons: cart.getSelectedAddonsList(),
        drinks: cart.getSelectedDrinksList()
      };

      await createOrderInDB(orderPayload);

      openWhatsApp({
        orderCode,
        customerName,
        products: cart.getSelectedProductsList(),
        product: cart.selectedProduct,
        productQuantity: cart.getTotalPanchosCount(),
        addons: cart.getSelectedAddonsList(),
        drinks: cart.getSelectedDrinksList(),
        totalGs: cart.getTotalGs(),
        pickupTime: effectivePickup
      });

      closeCheckout();

    } catch (err) {
      console.error('Erro ao processar pedido:', err);
      openWhatsApp({
        orderCode: cart.generateOrderCode(),
        customerName,
        products: cart.getSelectedProductsList(),
        product: cart.selectedProduct,
        productQuantity: cart.getTotalPanchosCount(),
        addons: cart.getSelectedAddonsList(),
        drinks: cart.getSelectedDrinksList(),
        totalGs: cart.getTotalGs(),
        pickupTime: cart.getEffectivePickupTime()
      });
      closeCheckout();
    } finally {
      confirmWhatsappBtn.disabled = false;
      confirmWhatsappBtn.innerHTML = `
        <span>PEDIR NO WHATSAPP</span>
        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766 0-3.18-2.587-5.771-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.007c.106.005.249-.04.39.299.144.347.491 1.2.534 1.288.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.087-.179.182-.077.357.101.174.45 0.742.966 1.202.664.591 1.224.774 1.398.861.173.087.275.072.376-.043.101-.116.433-.506.549-.679.116-.174.231-.145.39-.087s1.011.477 1.184.564c.173.087.289.13.332.202.044.073.044.42-.1 0.825z"/>
        </svg>
      `;
    }
  });
}
