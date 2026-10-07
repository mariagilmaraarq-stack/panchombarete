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
  SUPABASE_URL: getEnv('SUPABASE_URL') || 'https://vhhjbqkwvkktuahkqiwj.supabase.co',
  SUPABASE_ANON_KEY: getEnv('SUPABASE_ANON_KEY') || getEnv('SUPABASE_PUBLISHABLE_KEY'),
  SUPABASE_PUBLISHABLE_KEY: getEnv('SUPABASE_PUBLISHABLE_KEY') || getEnv('SUPABASE_ANON_KEY'),
  
  // WhatsApp oficial para recebimento de pedidos
  WHATSAPP_NUMBER: getEnv('WHATSAPP_NUMBER') || '595987683714',
  
  // Localização física em Ciudad del Este
  ADDRESS: 'Julio Cesar Riquelme (F8QH+75H) — Ciudad del Este 100169, Paraguay',
  GOOGLE_MAPS_URL: 'https://maps.google.com/?q=-25.51158425546612,-54.6720151',
  INSTAGRAM_URL: 'https://instagram.com/panchombarate',

  // Horários de atendimento (Fuso horário do Paraguai: America/Asuncion)
  OPENING_TIME: '19:00',
  CLOSING_TIME: '23:00',
  DAYS_OPEN: [2, 3, 4, 5, 6], // Terça a Sábado (2=Terça, 3=Quarta, 4=Quinta, 5=Sexta, 6=Sábado; 0=Domingo, 1=Segunda fechados)
  STORE_ACTIVE: true, // Controle manual de abertura/fechamento
  
  // Moeda
  CURRENCY_SYMBOL: 'Gs.',
};

/**
 * Retorna o status de abertura da loja em tempo real (Fuso PY: America/Asuncion)
 */
export function getStoreStatus(customOpening = APP_CONFIG.OPENING_TIME, customClosing = APP_CONFIG.CLOSING_TIME, lang = null) {
  const currentLang = lang || (typeof window !== 'undefined' && localStorage.getItem('pm_lang')) || 'es';
  try {
    const now = new Date();
    // Obter hora local em Assunção/CDE
    const pyTimeString = now.toLocaleTimeString('en-US', {
      timeZone: 'America/Asuncion',
      hour12: false,
      hour: '2-digit',
      minute: '2-digit'
    });

    // Obter dia da semana no fuso de Assunção (0=Dom, 1=Seg, 2=Ter, 3=Qua, 4=Qui, 5=Sex, 6=Sáb)
    const pyIsoDate = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Asuncion',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(now);
    const pyDayOfWeek = new Date(`${pyIsoDate}T12:00:00Z`).getUTCDay();

    const isDayOpen = APP_CONFIG.DAYS_OPEN.includes(pyDayOfWeek);
    const isManuallyClosed = APP_CONFIG.STORE_ACTIVE === false;

    const [currentHour, currentMinute] = pyTimeString.split(':').map(Number);
    const currentTotalMinutes = currentHour * 60 + currentMinute;

    const [openH, openM] = customOpening.split(':').map(Number);
    const openTotalMinutes = openH * 60 + openM;

    const [closeH, closeM] = customClosing.split(':').map(Number);
    const closeTotalMinutes = closeH * 60 + closeM;

    let isWithinHours = false;
    if (closeTotalMinutes >= openTotalMinutes) {
      // Mesma noite (ex: 19:00 às 23:00)
      isWithinHours = currentTotalMinutes >= openTotalMinutes && currentTotalMinutes <= closeTotalMinutes;
    } else {
      // Vira a meia-noite (ex: 19:00 às 02:00)
      isWithinHours = currentTotalMinutes >= openTotalMinutes || currentTotalMinutes <= closeTotalMinutes;
    }

    const isOpen = !isManuallyClosed && isDayOpen && isWithinHours;

    let badgeText = '';
    let statusClass = 'bg-emerald-500 text-white';

    if (isManuallyClosed) {
      badgeText = currentLang === 'es' ? 'CERRADO HOY — No atendemos hoy' : 'FECHADO HOJE — Não abriremos hoje';
      statusClass = 'bg-red-600 text-white';
    } else if (!isDayOpen) {
      badgeText = currentLang === 'es' ? `CERRADO — abre el Martes a las ${customOpening}` : `FECHADO — abre Terça às ${customOpening}`;
      statusClass = 'bg-amber-600 text-white';
    } else if (isOpen) {
      badgeText = currentLang === 'es' ? 'ABIERTO PARA RETIRO' : 'ABERTO PARA RETIRADA';
      statusClass = 'bg-emerald-500 text-white';
    } else {
      badgeText = currentLang === 'es' ? `CERRADO — abre a las ${customOpening}` : `FECHADO — abre às ${customOpening}`;
      statusClass = 'bg-amber-600 text-white';
    }

    return {
      isOpen,
      isManuallyClosed,
      isDayOpen,
      currentTimePy: pyTimeString,
      openingTime: customOpening,
      closingTime: customClosing,
      statusBadgeText: badgeText,
      statusClass
    };
  } catch (e) {
    // Fallback amigável caso haja erro de timezone no browser
    return {
      isOpen: true,
      isManuallyClosed: false,
      isDayOpen: true,
      openingTime: customOpening,
      closingTime: customClosing,
      statusBadgeText: currentLang === 'es' ? 'ABIERTO PARA RETIRO' : 'ABERTO PARA RETIRADA',
      statusClass: 'bg-emerald-500 text-white'
    };
  }
}
