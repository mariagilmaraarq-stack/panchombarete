/**
 * PANCHO MBARATE — CONFIGURAÇÃO GLOBAL
 * Ciudad del Este, Paraguay
 */

const getEnv = (key) => {
  if (typeof window !== 'undefined') {
    return window.__ENV__?.[key] || window.localStorage?.getItem('PM_' + key) || '';
  }
  return '';
};

export const APP_CONFIG = {
  STORE_NAME: 'PANCHO MBARATE',
  
  // Supabase Configuration
  SUPABASE_URL: getEnv('SUPABASE_URL'),
  SUPABASE_ANON_KEY: getEnv('SUPABASE_ANON_KEY'),
  
  // WhatsApp oficial para recebimento de pedidos
  WHATSAPP_NUMBER: getEnv('WHATSAPP_NUMBER') || '595983123456',
  
  // Localização física em Ciudad del Este
  ADDRESS: 'Julio Cesar Riquelme (F8QH+75H) — Ciudad del Este 100169, Paraguay',
  GOOGLE_MAPS_URL: 'https://maps.google.com/?q=-25.51158425546612,-54.6720151',
  INSTAGRAM_URL: 'https://instagram.com/panchombarate',

  // Horários de atendimento (Fuso horário do Paraguai: America/Asuncion)
  OPENING_TIME: '17:00',
  CLOSING_TIME: '23:45',
  DAYS_OPEN: [1, 2, 3, 4, 5, 6, 0], // Seg-Dom (0 = Domingo)
  
  // Moeda
  CURRENCY_SYMBOL: 'Gs.',
};

/**
 * Retorna o status de abertura da loja em tempo real (Fuso PY: America/Asuncion)
 */
export function getStoreStatus(customOpening = APP_CONFIG.OPENING_TIME, customClosing = APP_CONFIG.CLOSING_TIME) {
  try {
    const now = new Date();
    // Obter hora local em Assunção/CDE
    const pyTimeString = now.toLocaleTimeString('en-US', {
      timeZone: 'America/Asuncion',
      hour12: false,
      hour: '2-digit',
      minute: '2-digit'
    });

    const [currentHour, currentMinute] = pyTimeString.split(':').map(Number);
    const currentTotalMinutes = currentHour * 60 + currentMinute;

    const [openH, openM] = customOpening.split(':').map(Number);
    const openTotalMinutes = openH * 60 + openM;

    const [closeH, closeM] = customClosing.split(':').map(Number);
    const closeTotalMinutes = closeH * 60 + closeM;

    let isOpen = false;
    if (closeTotalMinutes >= openTotalMinutes) {
      // Mesma noite (ex: 17:00 às 23:45)
      isOpen = currentTotalMinutes >= openTotalMinutes && currentTotalMinutes <= closeTotalMinutes;
    } else {
      // Vira a meia-noite (ex: 17:00 às 02:00)
      isOpen = currentTotalMinutes >= openTotalMinutes || currentTotalMinutes <= closeTotalMinutes;
    }

    return {
      isOpen,
      currentTimePy: pyTimeString,
      openingTime: customOpening,
      closingTime: customClosing,
      statusBadgeText: isOpen ? 'ABERTO PARA RETIRADA' : `FECHADO — abre às ${customOpening}`,
      statusClass: isOpen ? 'bg-emerald-500 text-white' : 'bg-amber-600 text-white'
    };
  } catch (e) {
    // Fallback amigável caso haja erro de timezone no browser
    return {
      isOpen: true,
      openingTime: customOpening,
      closingTime: customClosing,
      statusBadgeText: 'ABERTO PARA RETIRADA',
      statusClass: 'bg-emerald-500 text-white'
    };
  }
}
