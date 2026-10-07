/**
 * PANCHO MBARATE — MÓDULO DE INTERNACIONALIZAÇÃO (i18n)
 * Idioma padrão: Espanhol do Paraguai (es-PY)
 * Suporte a Português do Brasil (pt-BR)
 */

export const SUPPORTED_LANGS = ['es', 'pt'];
export const DEFAULT_LANG = 'es'; // Padrão: Espanhol do Paraguai

// Recupera idioma salvo ou define o padrão em Espanhol
export function getSavedLanguage() {
  if (typeof window !== 'undefined' && window.localStorage) {
    const saved = localStorage.getItem('pm_lang');
    if (saved && SUPPORTED_LANGS.includes(saved)) {
      return saved;
    }
  }
  return DEFAULT_LANG;
}

export let currentLang = getSavedLanguage();

export function setLanguage(lang) {
  if (!SUPPORTED_LANGS.includes(lang)) return;
  currentLang = lang;
  if (typeof window !== 'undefined') {
    localStorage.setItem('pm_lang', lang);
    document.documentElement.lang = lang === 'es' ? 'es-PY' : 'pt-BR';
    applyTranslationsToDOM();
    window.dispatchEvent(new CustomEvent('language:changed', { detail: { lang } }));
  }
}

export function getCurrentLang() {
  return currentLang;
}

export const TRANSLATIONS = {
  es: {
    // Meta & SEO
    page_title: 'Pancho Mbarate | Menú Digital & Pedidos en Ciudad del Este',
    meta_desc: 'Pedí tu Pancho Mbarate en Ciudad del Este. Armá tu pedido con agregados y bebidas bien heladas, envialo por WhatsApp y retirá calentito sin fila.',
    
    // Header & Navegación
    logo_title: 'PANCHO MBARATE — Inicio',
    nav_menu: 'Menú',
    nav_addons: 'Agregados',
    nav_drinks: 'Bebidas',
    nav_location: 'Dónde Estamos',
    btn_order_now: 'Pedir Ahora',
    admin_tooltip: 'Panel Administrativo',
    
    // Estado de la tienda
    status_open: 'ABIERTO PARA RETIRO',
    status_closed: 'CERRADO — abre a las {time}',
    closed_banner_prefix: 'Atención: Estamos temporariamente fuera del horario de atención. El mostrador reabre a las',
    
    // Banner Principal
    hero_title_1: 'Pedí Tus Favoritos',
    hero_title_2: 'en Minutos.',
    hero_desc: 'Pan artesanal calentito, queso fundido, hasta 3 salchichas de primera calidad y bebidas bien heladas listas para retirar sin fila.',
    hero_cta: 'ELEGIR AHORA',
    hero_badge: '🌭 Doble con Queso Fundido y Papas al Hilo',
    
    // Sección Menú / Panchos
    section_menu_tag: 'Menú Oficial',
    section_menu_title: 'NUESTROS PANCHOS',
    section_menu_desc: 'Armá con la cantidad deseada y sumá agregados a tu gusto.',
    section_menu_hint: 'Elegí y ajustá la cantidad (+/-)',
    card_unit: 'Unidad',
    btn_select: '+ Elegir',
    sausage_single: '1 Salchicha',
    sausage_plural: '{n} Salchichas',
    
    // Sección Agregados
    section_addons_step: 'Paso 02 • Potenciar',
    section_addons_title: '¿QUERÉS POTENCIAR TU PANCHO?',
    optional_badge: 'Opcional',
    
    // Sección Bebidas
    section_drinks_step: 'Paso 03 • Bebidas',
    section_drinks_title: 'BEBIDAS BIEN HELADAS PARA ACOMPAÑAR',
    section_drinks_desc: 'Gaseosas en lata bien frías y agua mineral refrescante.',
    drink_badge: '❄️ Bien helada',
    
    // Sección Ubicación
    section_loc_tag: 'Punto de Retiro Oficial',
    section_loc_title: 'Retirá Sin Fila en el Mostrador',
    btn_gmaps: 'Google Maps 🗺️',
    btn_waze: 'Waze 🚗',
    map_pin_badge: 'Mostrador PANCHO MBARATE • Ciudad del Este',
    map_hours_info: '🕒 Horario de Retiro: 17:00 a 23:45',
    map_pickup_info: '📍 Julio Cesar Riquelme • Retiro Rápido',
    
    // Footer
    footer_about: 'El auténtico pancho con verdadero sabor en la Triple Frontera. Pan calentito, queso fundido, salsas artesanales y hasta 3 salchichas de primera calidad.',
    footer_quick_links: 'Enlaces Rápidos',
    footer_hours_title: 'Horario de Atención',
    footer_days_regular: 'Martes a Domingo',
    footer_days_monday: 'Lunes',
    footer_closed_text: 'Cerrado',
    footer_distance_hint: '🛵 Retiro en el mostrador a solo 5 min del Puente de la Amistad en CDE.',
    footer_location_title: 'Ubicación',
    footer_open_maps: 'Abrir Maps',
    footer_rights: '© 2026 sitio desarrollado por GDS Design. Todos los derechos reservados. \'Todo lo puedo en Cristo que me fortalece.\'',
    
    // Barra fija de carrito (Sticky Bar)
    sticky_one_pancho: '1 Pancho seleccionado',
    sticky_plural_panchos: '{n} Panchos',
    sticky_one_drink: '1 Bebida',
    sticky_plural_drinks: '{n} Bebidas',
    sticky_item_selected: '1 item seleccionado',
    btn_sticky_whatsapp: 'PEDIR POR WHATSAPP',
    
    // Modal de Checkout
    modal_title: '¿Listo para retirar? 🔥',
    modal_subtitle: 'Revisá tu pedido completo y confirmá por WhatsApp',
    label_name: 'Tu Nombre',
    placeholder_name: 'Ej: Carlos, María...',
    name_error: 'Por favor, ingresá tu nombre para retirar.',
    label_pickup_time: '¿Cuándo vas a retirar? ⏱️',
    time_now: 'Ahora',
    custom_time_placeholder: 'O escribí un horario específico (ej: 20:30)',
    summary_title: 'TU PEDIDO',
    summary_no_pancho_title: 'Ningún pancho seleccionado',
    summary_no_pancho_desc: 'Seleccioná un pancho del menú',
    summary_total_label: 'TOTAL A PAGAR AL RETIRAR',
    btn_confirm_whatsapp: 'PEDIR POR WHATSAPP',
    btn_loading_order: 'GENERANDO PEDIDO...',
    payment_hint: 'Pago al retirar (Efectivo, PIX o Tarjeta en el mostrador).',
    
    // Alertas y Confirmaciones
    alert_select_product: 'Por favor, seleccioná un Pancho o Bebida.',
    confirm_closed_order: 'Atención: Pancho Mbarate abre a las {time}. ¿Deseás enviar el pedido con anticipación para programarlo?'
  },

  pt: {
    // Meta & SEO
    page_title: 'Pancho Mbarate | Cardápio Digital & Pedidos em Ciudad del Este',
    meta_desc: 'Peça seu Pancho Mbarate em Ciudad del Este. Monte seu pedido com adicionais e bebidas geladas, envie pelo WhatsApp e retire quentinho sem fila.',
    
    // Header & Navegação
    logo_title: 'PANCHO MBARATE — Início',
    nav_menu: 'Cardápio',
    nav_addons: 'Adicionais',
    nav_drinks: 'Bebidas',
    nav_location: 'Onde Estamos',
    btn_order_now: 'Pedir Agora',
    admin_tooltip: 'Painel Administrativo',
    
    // Estado de la tienda
    status_open: 'ABERTO PARA RETIRADA',
    status_closed: 'FECHADO — abre às {time}',
    closed_banner_prefix: 'Atenção: Estamos temporariamente fora do horário de atendimento. O balcão reabre às',
    
    // Banner Principal
    hero_title_1: 'Peça Seus Favoritos',
    hero_title_2: 'em Minutos.',
    hero_desc: 'Pão artesanal quentinho, queijo derretido, até 3 salsichas de primeira linha e bebidas geladas prontas para retirar sem fila.',
    hero_cta: 'ESCOLHER AGORA',
    hero_badge: '🌭 Duplo com Queijo Derretido & Batata Palha',
    
    // Seção Cardápio / Panchos
    section_menu_tag: 'Cardápio Oficial',
    section_menu_title: 'NOSSOS PANCHOS',
    section_menu_desc: 'Monte com a quantidade desejada e adicione extras ao seu gosto.',
    section_menu_hint: 'Escolha e ajuste a quantidade (+/-)',
    card_unit: 'Unidade',
    btn_select: '+ Escolher',
    sausage_single: '1 Salsicha',
    sausage_plural: '{n} Salsichas',
    
    // Seção Adicionais
    section_addons_step: 'Passo 02 • Turbinar',
    section_addons_title: 'QUER TURBINAR SEU PANCHO?',
    optional_badge: 'Opcional',
    
    // Seção Bebidas
    section_drinks_step: 'Passo 03 • Bebidas',
    section_drinks_title: 'BEBIDAS BEM GELADAS PARA ACOMPANHAR',
    section_drinks_desc: 'Refrigerantes em lata trincando de geladas e água mineral.',
    drink_badge: '❄️ Trincando de gelada',
    
    // Seção Localização
    section_loc_tag: 'Ponto de Retirada Oficial',
    section_loc_title: 'Retire Sem Fila no Balcão',
    btn_gmaps: 'Google Maps 🗺️',
    btn_waze: 'Waze 🚗',
    map_pin_badge: 'Balcão PANCHO MBARATE • Ciudad del Este',
    map_hours_info: '🕒 Horário de Retirada: 17:00 às 23:45',
    map_pickup_info: '📍 Julio Cesar Riquelme • Retirada Rápida',
    
    // Footer
    footer_about: 'O autêntico pancho com sabor de verdade na Tríplice Fronteira. Pão quentinho, queijo derretido, molhos artesanais e até 3 salsichas de primeira linha.',
    footer_quick_links: 'Links Rápidos',
    footer_hours_title: 'Horário de Atendimento',
    footer_days_regular: 'Terça a Domingo',
    footer_days_monday: 'Segunda-feira',
    footer_closed_text: 'Fechado',
    footer_distance_hint: '🛵 Retirada no balcão a apenas 5 min da Ponte da Amizade em CDE.',
    footer_location_title: 'Localização',
    footer_open_maps: 'Abrir Maps',
    footer_rights: '© 2026 site desenvolvido por GDS Design. Todos os direitos reservados. \'Tudo posso naquele que me fortalece.\'',
    
    // Barra fixa de carrinho (Sticky Bar)
    sticky_one_pancho: '1 Pancho selecionado',
    sticky_plural_panchos: '{n} Panchos',
    sticky_one_drink: '1 Bebida',
    sticky_plural_drinks: '{n} Bebidas',
    sticky_item_selected: '1 item selecionado',
    btn_sticky_whatsapp: 'PEDIR NO WHATSAPP',
    
    // Modal de Checkout
    modal_title: 'Partiu retirar? 🔥',
    modal_subtitle: 'Revise seu pedido completo e confirme no WhatsApp',
    label_name: 'Seu Nome',
    placeholder_name: 'Ex: Carlos, Maria...',
    name_error: 'Por favor, informe seu nome para a retirada.',
    label_pickup_time: 'Quando vai retirar? ⏱️',
    time_now: 'Agora',
    custom_time_placeholder: 'Ou digite um horário específico (ex: 20:30)',
    summary_title: 'SEU PEDIDO',
    summary_no_pancho_title: 'Nenhum pancho selecionado',
    summary_no_pancho_desc: 'Selecione um pancho no cardápio',
    summary_total_label: 'TOTAL A PAGAR NA RETIRADA',
    btn_confirm_whatsapp: 'PEDIR NO WHATSAPP',
    btn_loading_order: 'GERANDO PEDIDO...',
    payment_hint: 'Pagamento na retirada (Dinheiro, PIX ou Cartão no balcão).',
    
    // Alertas e Confirmações
    alert_select_product: 'Por favor, selecione um Pancho ou Bebida.',
    confirm_closed_order: 'Atenção: O Pancho Mbarate abre às {time}. Deseja enviar o pedido antecipadamente para agendamento?'
  }
};

/**
 * Tradução de Catálogo de Produtos e Insumos
 */
export const PRODUCT_TRANSLATIONS = {
  'pancho-pyaguasu': {
    es: {
      name: "Pancho Py'aguasu",
      description: 'Pan suave calentito, mayonesa artesanal de la casa, 1 salchicha de primera calidad, kétchup, mostaza, arvejas, choclo fresco, vinagreta casera, queso y papas al hilo bien crujientes.',
      highlight: null
    },
    pt: {
      name: "Pancho Py'aguasu",
      description: 'Pão macio aquecido, maionese artesanal da casa, 1 salsicha de primeira linha, ketchup, mostarda, ervilhas, milho fresco, vinagrete caseiro, queijo e batata palha fininha crocante.',
      highlight: null
    }
  },
  'pancho-mbarate': {
    es: {
      name: 'Pancho Mbarate',
      description: 'Pan suave calentito, mayonesa artesanal de la casa, 2 salchichas de primera calidad, kétchup, mostaza, arvejas, choclo fresco, vinagreta casera, queso y papas al hilo bien crujientes.',
      highlight: '🔥 MÁS PEDIDO'
    },
    pt: {
      name: 'Pancho Mbarate',
      description: 'Pão macio aquecido, maionese artesanal da casa, 2 salsichas de primeira linha, ketchup, mostarda, ervilhas, milho fresco, vinagrete caseiro, queijo e batata palha fininha crocante.',
      highlight: '🔥 MAIS PEDIDO'
    }
  },
  'pancho-mbarate-guasu': {
    es: {
      name: 'Pancho Mbarate Guasu',
      description: 'Pan suave calentito, mayonesa artesanal de la casa, 3 salchichas de primera calidad, kétchup, mostaza, arvejas, choclo fresco, vinagreta casera, queso y papas al hilo bien crujientes.',
      highlight: '💪 PARA LOS QUE TIENEN HAMBRE'
    },
    pt: {
      name: 'Pancho Mbarate Guasu',
      description: 'Pão macio aquecido, maionese artesanal da casa, 3 salsichas de primeira linha, ketchup, mostarda, ervilhas, milho fresco, vinagrete caseiro, queijo e batata palha fininha crocante.',
      highlight: '💪 PARA QUEM TEM FOME'
    }
  },
  'coca-cola-350ml': {
    es: {
      name: 'Coca-Cola Original 350ml',
      description: 'Lata 350ml bien helada con gas perfecto.',
      highlight: '❄️ BIEN HELADA'
    },
    pt: {
      name: 'Coca-Cola Original 350ml',
      description: 'Lata gelada de refrigerante tradicional Coca-Cola 350ml.',
      highlight: '❄️ GELADA'
    }
  },
  'guarana-antarctica-350ml': {
    es: {
      name: 'Guaraná Antarctica 350ml',
      description: 'Lata 350ml bien helada de Guaraná Antarctica.',
      highlight: null
    },
    pt: {
      name: 'Guaraná Antarctica 350ml',
      description: 'Lata gelada de Guaraná Antarctica 350ml.',
      highlight: null
    }
  },
  'agua-mineral-500ml': {
    es: {
      name: 'Agua Mineral sin Gas 500ml',
      description: 'Botella de agua mineral pura y refrescante 500ml.',
      highlight: null
    },
    pt: {
      name: 'Água Mineral sem Gás 500ml',
      description: 'Garrafa de água mineral pura e refrescante 500ml.',
      highlight: null
    }
  }
};

export const ADDON_TRANSLATIONS = {
  'Batata Palha Extra': { es: 'Papas al Hilo Extra', pt: 'Batata Palha Extra' },
  'Queijo Cheddar Cremoso': { es: 'Queso Cheddar Cremoso', pt: 'Queijo Cheddar Cremoso' },
  'Queijo Catupiry Original': { es: 'Queso Catupiry Original', pt: 'Queijo Catupiry Original' },
  'Vinagrete da Casa': { es: 'Vinagreta de la Casa', pt: 'Vinagrete da Casa' },
  'Bacon Crocante em Cubos': { es: 'Panceta Crocante en Cubos', pt: 'Bacon Crocante em Cubos' },
  'Salsicha Extra (1 un)': { es: 'Salchicha Extra (1 un)', pt: 'Salsicha Extra (1 un)' },
  'Salsicha Extra': { es: 'Salchicha Extra', pt: 'Salsicha Extra' },
  'Queijo Extra': { es: 'Queso Extra', pt: 'Queijo Extra' }
};

/**
 * Função utilitária para obter tradução com interpolação de variáveis
 */
export function t(key, params = {}) {
  const dict = TRANSLATIONS[currentLang] || TRANSLATIONS.es;
  let text = dict[key] !== undefined ? dict[key] : (TRANSLATIONS.pt[key] || key);
  
  Object.keys(params).forEach(p => {
    text = text.replace(new RegExp(`\\{${p}\\}`, 'g'), params[p]);
  });
  
  return text;
}

/**
 * Traduz item de produto preservando dados de banco e edições do gestor
 */
export function translateProduct(product, lang = currentLang) {
  if (!product) return product;

  const match = PRODUCT_TRANSLATIONS[product.slug] || PRODUCT_TRANSLATIONS[product.id];

  if (lang === 'es') {
    const hasCustomNameEs = product.name_es && product.name_es.trim() !== '';
    const hasCustomDescEs = product.description_es !== undefined && product.description_es !== null && product.description_es.trim() !== '';
    const hasCustomHighlightEs = product.highlight_es !== undefined && product.highlight_es !== null && product.highlight_es.trim() !== '';

    const dictEs = match?.es;

    return {
      ...product,
      name: hasCustomNameEs ? product.name_es.trim() : (dictEs?.name || product.name),
      description: hasCustomDescEs ? product.description_es.trim() : (dictEs?.description !== undefined ? dictEs.description : product.description),
      highlight: hasCustomHighlightEs ? product.highlight_es.trim() : (dictEs?.highlight !== undefined ? dictEs.highlight : product.highlight)
    };
  }

  if (match && match[lang]) {
    // Se o texto for o padrão original de fábrica em PT ou ES, usa a tradução respectiva.
    // Se o gestor editou o nome ou a descrição no painel, PRESERVA o conteúdo customizado!
    const isDefaultName = !product.name || (match.pt && product.name === match.pt.name) || (match.es && product.name === match.es.name);
    const isDefaultDesc = !product.description || (match.pt && product.description === match.pt.description) || (match.es && product.description === match.es.description);

    return {
      ...product,
      name: isDefaultName ? (match[lang].name || product.name) : product.name,
      description: isDefaultDesc ? (match[lang].description || product.description) : product.description,
      highlight: (product.highlight !== undefined && product.highlight !== null && product.highlight !== '') 
        ? product.highlight 
        : (match[lang].highlight !== undefined ? match[lang].highlight : product.highlight)
    };
  }
  return product;
}

/**
 * Traduz adicional preservando preços
 */
export function translateAddon(addon, lang = currentLang) {
  if (!addon) return addon;
  const match = ADDON_TRANSLATIONS[addon.name];
  if (match && match[lang]) {
    return {
      ...addon,
      name: match[lang]
    };
  }
  return addon;
}

/**
 * Aplica traduções a todos os elementos com data-i18n no DOM
 */
export function applyTranslationsToDOM() {
  if (typeof document === 'undefined') return;

  // Title
  document.title = t('page_title');

  // Text content
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const translation = t(key);
    if (translation) {
      el.textContent = translation;
    }
  });

  // HTML content
  document.querySelectorAll('[data-i18n-html]').forEach(el => {
    const key = el.getAttribute('data-i18n-html');
    const translation = t(key);
    if (translation) {
      el.innerHTML = translation;
    }
  });

  // Placeholders
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    const translation = t(key);
    if (translation) {
      el.setAttribute('placeholder', translation);
    }
  });

  // Titles / tooltips
  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    const key = el.getAttribute('data-i18n-title');
    const translation = t(key);
    if (translation) {
      el.setAttribute('title', translation);
    }
  });

  // Atualiza botões ativos do alternador de idiomas
  document.querySelectorAll('.lang-btn').forEach(btn => {
    const btnLang = btn.getAttribute('data-lang');
    if (btnLang === currentLang) {
      btn.classList.add('is-active', 'bg-mustard', 'text-coffee', 'font-black', 'shadow-sm');
      btn.classList.remove('text-coffee/70', 'hover:bg-white/40');
      btn.setAttribute('aria-pressed', 'true');
    } else {
      btn.classList.remove('is-active', 'bg-mustard', 'text-coffee', 'font-black', 'shadow-sm');
      btn.classList.add('text-coffee/70', 'hover:bg-white/40');
      btn.setAttribute('aria-pressed', 'false');
    }
  });
}
