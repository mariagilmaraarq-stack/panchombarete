/**
 * PANCHO MBARATE — GERENCIAMENTO DE CARRINHO COM QUANTIDADE E BEBIDAS
 */
import { formatGs } from './products.js';

class CartState {
  constructor() {
    this.selectedProducts = new Map(); // id -> { product, quantity }
    this.selectedAddons = new Map(); // id -> addon object
    this.selectedDrinks = new Map(); // id -> { drink, quantity }
    this.customerName = '';
    this.pickupTime = '10–15 min';
    this.customTime = '';
  }

  // --- COMPATIBILIDADE COM CÓDIGOS LEGADOS ---
  get selectedProduct() {
    const first = this.selectedProducts.values().next().value;
    return first ? first.product : null;
  }

  get productQuantity() {
    return this.getTotalPanchosCount();
  }

  // --- GERENCIAMENTO DE PRODUTOS/LANCHES MULTIPLOS ---
  setProduct(product, qty = 1) {
    const current = this.getProductQuantity(product.id);
    if (current === 0) {
      this.setProductQuantity(product, Math.max(1, parseInt(qty) || 1));
    }
  }

  setProductQuantity(product, qty) {
    const quantity = Math.max(0, parseInt(qty) || 0);
    if (quantity === 0) {
      this.selectedProducts.delete(product.id);
    } else {
      this.selectedProducts.set(product.id, { product, quantity });
    }
    this.notifyUpdate();
  }

  addProduct(product, qty = 1) {
    const current = this.getProductQuantity(product.id);
    this.setProductQuantity(product, current + (parseInt(qty) || 1));
  }

  incrementProduct(product) {
    const current = this.getProductQuantity(product.id);
    this.setProductQuantity(product, current + 1);
  }

  decrementProduct(product) {
    const current = this.getProductQuantity(product.id);
    if (current > 0) {
      this.setProductQuantity(product, current - 1);
    }
  }

  removeProduct(productId) {
    if (this.selectedProducts.has(productId)) {
      this.selectedProducts.delete(productId);
      this.notifyUpdate();
    }
  }

  getProductQuantity(productId) {
    return this.selectedProducts.get(productId)?.quantity || 0;
  }

  isProductSelected(productId) {
    return this.getProductQuantity(productId) > 0;
  }

  getSelectedProductsList() {
    return Array.from(this.selectedProducts.values());
  }

  getTotalPanchosCount() {
    let count = 0;
    for (const item of this.selectedProducts.values()) {
      count += item.quantity;
    }
    return count;
  }

  toggleAddon(addon) {
    if (this.selectedAddons.has(addon.id)) {
      this.selectedAddons.delete(addon.id);
    } else {
      this.selectedAddons.set(addon.id, addon);
    }
    this.notifyUpdate();
  }

  isAddonSelected(addonId) {
    return this.selectedAddons.has(addonId);
  }

  // --- BEBIDAS GELADAS ---
  setDrinkQuantity(drink, qty) {
    const quantity = Math.max(0, parseInt(qty) || 0);
    if (quantity === 0) {
      this.selectedDrinks.delete(drink.id);
    } else {
      this.selectedDrinks.set(drink.id, { drink, quantity });
    }
    this.notifyUpdate();
  }

  incrementDrink(drink) {
    const current = this.selectedDrinks.get(drink.id)?.quantity || 0;
    this.setDrinkQuantity(drink, current + 1);
  }

  decrementDrink(drink) {
    const current = this.selectedDrinks.get(drink.id)?.quantity || 0;
    if (current > 0) {
      this.setDrinkQuantity(drink, current - 1);
    }
  }

  getDrinkQuantity(drinkId) {
    return this.selectedDrinks.get(drinkId)?.quantity || 0;
  }

  getSelectedDrinksList() {
    return Array.from(this.selectedDrinks.values());
  }

  // --- CLIENTE & HORÁRIO ---
  setCustomerName(name) {
    this.customerName = name.trim();
    this.notifyUpdate();
  }

  setPickupTime(time) {
    this.pickupTime = time;
    this.notifyUpdate();
  }

  setCustomTime(timeStr) {
    this.customTime = timeStr;
    this.pickupTime = timeStr;
    this.notifyUpdate();
  }

  // --- CÁLCULO FINANCEIRO EM GUARANÍES ---
  getSubtotalGs() {
    let sum = 0;
    for (const item of this.selectedProducts.values()) {
      const unitPrice = (item.product.promotional_price_gs !== null && item.product.promotional_price_gs !== undefined)
        ? Number(item.product.promotional_price_gs)
        : Number(item.product.price_gs);
      sum += unitPrice * item.quantity;
    }
    return sum;
  }

  getAddonsTotalGs() {
    let sum = 0;
    for (const addon of this.selectedAddons.values()) {
      sum += Number(addon.price_gs);
    }
    const totalPanchos = this.getTotalPanchosCount();
    // Cada adicional é aplicado por unidade de pancho montado
    return sum * (totalPanchos > 0 ? totalPanchos : 1);
  }

  getDrinksTotalGs() {
    let sum = 0;
    for (const item of this.selectedDrinks.values()) {
      const drinkPrice = (item.drink.promotional_price_gs !== null && item.drink.promotional_price_gs !== undefined)
        ? Number(item.drink.promotional_price_gs)
        : Number(item.drink.price_gs);
      sum += drinkPrice * item.quantity;
    }
    return sum;
  }

  getTotalGs() {
    return this.getSubtotalGs() + this.getAddonsTotalGs() + this.getDrinksTotalGs();
  }

  // CMV Silencioso (estritamente confidencial, não exibido ao cliente)
  getCalculatedCmvGs() {
    let cmvPancho = 0;
    for (const item of this.selectedProducts.values()) {
      cmvPancho += (Number(item.product.cmv_gs) || 0) * item.quantity;
    }
    
    let cmvAddons = 0;
    for (const addon of this.selectedAddons.values()) {
      cmvAddons += (Number(addon.cmv_gs) || 0);
    }
    const totalPanchos = this.getTotalPanchosCount();
    cmvAddons = cmvAddons * (totalPanchos > 0 ? totalPanchos : 1);

    let cmvDrinks = 0;
    for (const item of this.selectedDrinks.values()) {
      cmvDrinks += (Number(item.drink.cmv_gs) || 0) * item.quantity;
    }

    return cmvPancho + cmvAddons + cmvDrinks;
  }

  getFormattedTotal() {
    return formatGs(this.getTotalGs());
  }

  getTotalItemsCount() {
    let count = this.getTotalPanchosCount();
    for (const item of this.selectedDrinks.values()) {
      count += item.quantity;
    }
    return count;
  }

  getEffectivePickupTime() {
    if (this.pickupTime === 'horário específico' && this.customTime) {
      return this.customTime;
    }
    return this.pickupTime || 'Agora';
  }

  getSelectedAddonsList() {
    return Array.from(this.selectedAddons.values());
  }

  hasProduct() {
    return this.selectedProducts.size > 0;
  }

  // Gera ID no padrão oficial: PM-YYYYMMDD-HHMMSS-XXX
  generateOrderCode() {
    const now = new Date();
    const pad = (n, len = 2) => String(n).padStart(len, '0');
    
    const year = now.getFullYear();
    const month = pad(now.getMonth() + 1);
    const day = pad(now.getDate());
    const hours = pad(now.getHours());
    const minutes = pad(now.getMinutes());
    const seconds = pad(now.getSeconds());
    const rand = Math.floor(100 + Math.random() * 900);

    return `PM-${year}${month}${day}-${hours}${minutes}${seconds}-${rand}`;
  }

  notifyUpdate() {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('cart:updated', {
        detail: {
          products: this.getSelectedProductsList(),
          product: this.selectedProduct,
          productQuantity: this.productQuantity,
          totalPanchosCount: this.getTotalPanchosCount(),
          addons: this.getSelectedAddonsList(),
          drinks: this.getSelectedDrinksList(),
          totalGs: this.getTotalGs(),
          formattedTotal: this.getFormattedTotal(),
          itemsCount: this.getTotalItemsCount(),
          hasProduct: this.hasProduct()
        }
      }));
    }
  }
}

export const cart = new CartState();
