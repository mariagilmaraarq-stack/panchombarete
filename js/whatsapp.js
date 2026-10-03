/**
 * PANCHO MBARATE — FORMATAÇÃO E INTEGRAÇÃO WHATSAPP
 */
import { APP_CONFIG } from './config.js';
import { formatGs } from './products.js';

/**
 * Monta o texto oficial do pedido com suporte a quantidades e bebidas
 */
export function buildWhatsAppMessage({ orderCode, customerName, products = [], product, productQuantity = 1, addons = [], drinks = [], totalGs, pickupTime }) {
  let itemsList = [];
  if (products && products.length > 0) {
    itemsList = products;
  } else if (product) {
    itemsList = [{ product, quantity: productQuantity || 1 }];
  }

  let lancheLine = 'Nenhum';
  if (itemsList.length === 1) {
    lancheLine = `${itemsList[0].quantity}x ${itemsList[0].product.name}`;
  } else if (itemsList.length > 1) {
    lancheLine = '\n' + itemsList.map(item => `  • ${item.quantity}x ${item.product.name}`).join('\n');
  }

  const addonsText = (addons && addons.length > 0)
    ? addons.map(a => `${a.name} (+${formatGs(a.price_gs)})`).join(', ')
    : 'Nenhum';

  const drinksText = (drinks && drinks.length > 0)
    ? drinks.map(d => `${d.quantity}x ${d.drink.name} (+${formatGs(d.drink.price_gs * d.quantity)})`).join(', ')
    : null;

  const cleanTotal = formatGs(totalGs);
  const lancheLabel = itemsList.length > 1 ? '*Lanches:*' : '*Lanche:*';

  let message = 
`*NOVO PEDIDO - PANCHO MBARATE* 🌭🔥
---------------------------------
*Pedido:* ${orderCode}
*Cliente:* ${customerName || 'Cliente'}
${lancheLabel} ${lancheLine}
*Adicionais:* ${addonsText}`;

  if (drinksText) {
    message += `\n*Bebidas:* ${drinksText}`;
  }

  message += `
*Total:* ${cleanTotal}
*Retirada:* ${pickupTime}
---------------------------------
_Pedido gerado pelo cardápio digital. Retirada no balcão._`;

  return message;
}

/**
 * Gera a URL completa e codificada do WhatsApp
 */
export function generateWhatsAppUrl(orderData, customPhone = null) {
  const phone = (customPhone || APP_CONFIG.WHATSAPP_NUMBER || '').replace(/\D/g, '');
  const text = buildWhatsAppMessage(orderData);
  const encodedText = encodeURIComponent(text);
  
  return `https://api.whatsapp.com/send?phone=${phone}&text=${encodedText}`;
}

/**
 * Abre o WhatsApp diretamente
 */
export function openWhatsApp(orderData, customPhone = null) {
  const url = generateWhatsAppUrl(orderData, customPhone);
  window.open(url, '_blank', 'noopener,noreferrer');
}
