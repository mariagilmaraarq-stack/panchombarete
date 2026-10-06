/**
 * PANCHO MBARATE — MÓDULO DE FICHAS TÉCNICAS E CUSTO DOS ALIMENTOS (CMV)
 * Gestão profissional gastronômica: Insumos, Sub-Receitas, Fichas Técnicas e Simulação de Vendas.
 * Arquitetura resiliente com Supabase e persistência local (LocalStorage).
 */

import { 
  getSupabase, 
  saveAllRecipeDataToSupabase, 
  fetchRecipeDataFromSupabase, 
  deleteIngredientFromSupabase, 
  deleteRecipeFromSupabase 
} from './supabase.js';

// ==============================================================================
// 1. DADOS INICIAIS PRÉ-CADASTRADOS (SEEDS OFICIAIS)
// ==============================================================================

export const INITIAL_INGREDIENTS = [
  // --- Carnes & Proteínas ---
  {
    id: 'ing-1',
    code: 'INS-001',
    name: 'Salsicha Hot Dog Especial',
    category: 'Carnes e Proteínas',
    type: 'ingrediente',
    purchase_quantity: 1,
    purchase_unit: 'kg', // 1 kg = 20 salsichas de 50g
    purchase_price: 18.00,
    base_unit: 'g',
    unit_cost: 0.0180, // R$ 0,018/g -> R$ 0,90 por salsicha de 50g
    default_correction_factor: 1.00,
    notes: 'Pacote 1kg com 20 unidades (~50g cada)'
  },
  // --- Panificação ---
  {
    id: 'ing-2',
    code: 'INS-002',
    name: 'Pão de Hot Dog Tradicional',
    category: 'Panificação',
    type: 'ingrediente',
    purchase_quantity: 20,
    purchase_unit: 'un',
    purchase_price: 14.00,
    base_unit: 'un',
    unit_cost: 0.7000, // R$ 0,70 por pão
    default_correction_factor: 1.00,
    notes: 'Pacote fardo com 20 pães macios de 18cm'
  },
  // --- Mercearia & Óleos ---
  {
    id: 'ing-3',
    code: 'INS-003',
    name: 'Óleo de Soja Refinado',
    category: 'Mercearia e Secos',
    type: 'ingrediente',
    purchase_quantity: 900,
    purchase_unit: 'ml',
    purchase_price: 6.30,
    base_unit: 'ml',
    unit_cost: 0.0070, // R$ 0,007/ml (R$ 7,00/L)
    default_correction_factor: 1.00,
    notes: 'Garrafa pet 900 ml'
  },
  {
    id: 'ing-4',
    code: 'INS-004',
    name: 'Ovos Frescos Tipo Grande',
    category: 'Mercearia e Secos',
    type: 'ingrediente',
    purchase_quantity: 30,
    purchase_unit: 'un',
    purchase_price: 21.00,
    base_unit: 'un',
    unit_cost: 0.7000, // R$ 0,70 por ovo
    default_correction_factor: 1.10, // 10% perda de casca
    notes: 'Bandeja com 30 ovos selecionados'
  },
  {
    id: 'ing-5',
    code: 'INS-005',
    name: 'Suco de Limão / Vinagre',
    category: 'Mercearia e Secos',
    type: 'ingrediente',
    purchase_quantity: 750,
    purchase_unit: 'ml',
    purchase_price: 4.50,
    base_unit: 'ml',
    unit_cost: 0.0060,
    default_correction_factor: 1.00,
    notes: 'Frasco 750 ml para tempero e emulsão'
  },
  {
    id: 'ing-6',
    code: 'INS-006',
    name: 'Temperos Especiais & Sal',
    category: 'Temperos e Molhos',
    type: 'ingrediente',
    purchase_quantity: 500,
    purchase_unit: 'g',
    purchase_price: 5.00,
    base_unit: 'g',
    unit_cost: 0.0100,
    default_correction_factor: 1.00,
    notes: 'Mix de sal, alho desidratado e condimentos'
  },
  {
    id: 'ing-7',
    code: 'INS-007',
    name: 'Açúcar Cristal / Refinado',
    category: 'Mercearia e Secos',
    type: 'ingrediente',
    purchase_quantity: 1,
    purchase_unit: 'kg',
    purchase_price: 4.50,
    base_unit: 'g',
    unit_cost: 0.0045, // R$ 4,50/kg -> R$ 0,0045/g
    default_correction_factor: 1.00,
    notes: 'Pacote 1 kg'
  },
  {
    id: 'ing-8',
    code: 'INS-008',
    name: 'Água Filtrada',
    category: 'Mercearia e Secos',
    type: 'ingrediente',
    purchase_quantity: 20,
    purchase_unit: 'l',
    purchase_price: 1.00,
    base_unit: 'ml',
    unit_cost: 0.0001,
    default_correction_factor: 1.00,
    notes: 'Água potável filtrada'
  },
  // --- Ingredientes Pudim ---
  {
    id: 'ing-9',
    code: 'INS-009',
    name: 'Gelatina em Pó Sem Sabor',
    category: 'Mercearia e Secos',
    type: 'ingrediente',
    purchase_quantity: 24,
    purchase_unit: 'g', // 2 envelopes de 12g
    purchase_price: 4.80,
    base_unit: 'g',
    unit_cost: 0.2000, // R$ 0,20/g
    default_correction_factor: 1.00,
    notes: 'Caixa com 2 envelopes de 12g (24g)'
  },
  {
    id: 'ing-10',
    code: 'INS-010',
    name: 'Creme de Leite UHT (200g)',
    category: 'Laticínios',
    type: 'ingrediente',
    purchase_quantity: 200,
    purchase_unit: 'g',
    purchase_price: 3.60,
    base_unit: 'g',
    unit_cost: 0.0180, // R$ 0,018/g (R$ 3,60 a caixinha)
    default_correction_factor: 1.00,
    notes: 'Caixa tetra pak 200g'
  },
  {
    id: 'ing-11',
    code: 'INS-011',
    name: 'Leite Condensado (395g)',
    category: 'Laticínios',
    type: 'ingrediente',
    purchase_quantity: 395,
    purchase_unit: 'g',
    purchase_price: 5.80,
    base_unit: 'g',
    unit_cost: 0.01468, // R$ 0,01468/g (R$ 5,80 a caixinha)
    default_correction_factor: 1.00,
    notes: 'Caixa tetra pak 395g'
  },
  {
    id: 'ing-12',
    code: 'INS-012',
    name: 'Leite em Pó Integral',
    category: 'Laticínios',
    type: 'ingrediente',
    purchase_quantity: 400,
    purchase_unit: 'g',
    purchase_price: 16.00,
    base_unit: 'g',
    unit_cost: 0.0400, // R$ 0,04/g
    default_correction_factor: 1.00,
    notes: 'Pacote 400g instantâneo'
  },
  {
    id: 'ing-13',
    code: 'INS-013',
    name: 'Leite Integral Líquido',
    category: 'Laticínios',
    type: 'ingrediente',
    purchase_quantity: 1000,
    purchase_unit: 'ml',
    purchase_price: 5.00,
    base_unit: 'ml',
    unit_cost: 0.0050, // R$ 0,005/ml (R$ 5,00/L)
    default_correction_factor: 1.00,
    notes: 'Caixa tetra pak 1 Litro'
  },
  // --- Molhos e Complementos ---
  {
    id: 'ing-14',
    code: 'INS-014',
    name: 'Ketchup Profissional',
    category: 'Temperos e Molhos',
    type: 'ingrediente',
    purchase_quantity: 1000,
    purchase_unit: 'g',
    purchase_price: 12.00,
    base_unit: 'g',
    unit_cost: 0.0120, // R$ 0,012/g
    default_correction_factor: 1.02,
    notes: 'Bisnaga/bag 1 kg para lanches'
  },
  {
    id: 'ing-15',
    code: 'INS-015',
    name: 'Mostarda Amarela Suave',
    category: 'Temperos e Molhos',
    type: 'ingrediente',
    purchase_quantity: 1000,
    purchase_unit: 'g',
    purchase_price: 11.00,
    base_unit: 'g',
    unit_cost: 0.0110, // R$ 0,011/g
    default_correction_factor: 1.02,
    notes: 'Bisnaga/bag 1 kg para lanches'
  },
  {
    id: 'ing-16',
    code: 'INS-016',
    name: 'Milho Verde em Conserva',
    category: 'Mercearia e Secos',
    type: 'ingrediente',
    purchase_quantity: 1700,
    purchase_unit: 'g', // peso drenado
    purchase_price: 15.30,
    base_unit: 'g',
    unit_cost: 0.0090, // R$ 0,009/g
    default_correction_factor: 1.05,
    notes: 'Lata food service 1,7kg drenado'
  },
  {
    id: 'ing-17',
    code: 'INS-017',
    name: 'Batata Palha Crocante Extrafina',
    category: 'Mercearia e Secos',
    type: 'ingrediente',
    purchase_quantity: 500,
    purchase_unit: 'g',
    purchase_price: 12.50,
    base_unit: 'g',
    unit_cost: 0.0250, // R$ 0,025/g
    default_correction_factor: 1.02,
    notes: 'Pacote 500g extra crocante'
  },
  // --- Embalagens & Descartáveis ---
  {
    id: 'ing-18',
    code: 'EMB-001',
    name: 'Caixinha de Hot Dog Kraft com Tampa',
    category: 'Embalagens e Descartáveis',
    type: 'embalagem',
    purchase_quantity: 100,
    purchase_unit: 'un',
    purchase_price: 38.00,
    base_unit: 'un',
    unit_cost: 0.3800,
    default_correction_factor: 1.00,
    notes: 'Fardo com 100 unidades resinadas antifuga'
  },
  {
    id: 'ing-19',
    code: 'EMB-002',
    name: 'Saco Kraft de Entrega (Delivery)',
    category: 'Embalagens e Descartáveis',
    type: 'embalagem',
    purchase_quantity: 100,
    purchase_unit: 'un',
    purchase_price: 45.00,
    base_unit: 'un',
    unit_cost: 0.4500,
    default_correction_factor: 1.00,
    notes: 'Fardo com 100 sacos kraft tamanho P/M'
  },
  {
    id: 'ing-20',
    code: 'EMB-003',
    name: 'Guardanapos de Papel Folha Dupla',
    category: 'Embalagens e Descartáveis',
    type: 'embalagem',
    purchase_quantity: 500,
    purchase_unit: 'un',
    purchase_price: 10.00,
    base_unit: 'un',
    unit_cost: 0.0200,
    default_correction_factor: 1.00,
    notes: 'Pacote com 500 guardanapos absorventes'
  },
  {
    id: 'ing-21',
    code: 'EMB-004',
    name: 'Sachês de Molho Individual (Ketchup/Maio)',
    category: 'Embalagens e Descartáveis',
    type: 'embalagem',
    purchase_quantity: 200,
    purchase_unit: 'un',
    purchase_price: 36.00,
    base_unit: 'un',
    unit_cost: 0.1800,
    default_correction_factor: 1.00,
    notes: 'Caixa com 200 sachês'
  },
  {
    id: 'ing-22',
    code: 'EMB-005',
    name: 'Potinho Plástico com Tampa 145 ml',
    category: 'Embalagens e Descartáveis',
    type: 'embalagem',
    purchase_quantity: 100,
    purchase_unit: 'un',
    purchase_price: 48.00,
    base_unit: 'un',
    unit_cost: 0.4800,
    default_correction_factor: 1.00,
    notes: 'Fardo com 100 potes e tampas herméticas 145ml'
  },
  {
    id: 'ing-23',
    code: 'EMB-006',
    name: 'Colherzinha de Sobremesa Descartável',
    category: 'Embalagens e Descartáveis',
    type: 'embalagem',
    purchase_quantity: 100,
    purchase_unit: 'un',
    purchase_price: 12.00,
    base_unit: 'un',
    unit_cost: 0.1200,
    default_correction_factor: 1.00,
    notes: 'Pacote com 100 colherzinhas plásticas reforçadas'
  }
];

export const INITIAL_SUB_RECIPES = [
  {
    id: 'sub-1',
    code: 'SUB-001',
    name: 'Maionese Caseira Especial',
    type: 'sub_recipe',
    category: 'Sub-Receitas',
    yield_portions: 500, // Rendimento em gramas
    yield_unit: 'g',
    portion_size_description: '500g (~16 a 17 porções de 30g)',
    waste_percent: 4.0, // 4% de perda de batedeira/emulsão
    sale_price: 0,
    suggested_price: 0,
    preparation_method: 'Bater os ovos com tempero e suco de limão/vinagre no liquidificador. Em fio constante, adicionar o óleo até atingir ponto de maionese consistente.',
    notes: 'Base artesanal para todos os lanches Pancho Mbarate. Validade 48h refrigerada.',
    items: [
      {
        id: 'sbi-1',
        item_type: 'ingredient',
        ingredient_id: 'ing-3',
        item_name: 'Óleo de Soja Refinado',
        net_quantity: 350,
        unit: 'ml',
        correction_factor: 1.00,
        notes: 'Adicionar em fio lento'
      },
      {
        id: 'sbi-2',
        item_type: 'ingredient',
        ingredient_id: 'ing-4',
        item_name: 'Ovos Frescos Tipo Grande',
        net_quantity: 2,
        unit: 'un',
        correction_factor: 1.10,
        notes: 'Sem casca'
      },
      {
        id: 'sbi-3',
        item_type: 'ingredient',
        ingredient_id: 'ing-5',
        item_name: 'Suco de Limão / Vinagre',
        net_quantity: 15,
        unit: 'ml',
        correction_factor: 1.00,
        notes: 'Para acidificação e estabilização'
      },
      {
        id: 'sbi-4',
        item_type: 'ingredient',
        ingredient_id: 'ing-6',
        item_name: 'Temperos Especiais & Sal',
        net_quantity: 10,
        unit: 'g',
        correction_factor: 1.00,
        notes: 'Alho, pimenta do reino e sal'
      }
    ]
  },
  {
    id: 'sub-2',
    code: 'SUB-002',
    name: 'Calda Caramelizada para Pudim',
    type: 'sub_recipe',
    category: 'Sub-Receitas',
    yield_portions: 16, // Suficiente para 16 potinhos (25g por potinho)
    yield_unit: 'porções',
    portion_size_description: 'Calda para 16 potinhos (~25g por pote)',
    waste_percent: 3.0,
    sale_price: 0,
    suggested_price: 0,
    preparation_method: 'Derreter 2 xícaras de açúcar em fogo brando até ponto de caramelo âmbar dourado. Acrescentar 200 ml de água quente aos poucos até dissolver totalmente.',
    notes: 'Rendimento exato rateado para 16 potinhos de 145 ml.',
    items: [
      {
        id: 'sbi-5',
        item_type: 'ingredient',
        ingredient_id: 'ing-7',
        item_name: 'Açúcar Cristal / Refinado',
        net_quantity: 400, // 2 xícaras de chá ~400g
        unit: 'g',
        correction_factor: 1.00,
        notes: '2 xícaras de chá (~400g)'
      },
      {
        id: 'sbi-6',
        item_type: 'ingredient',
        ingredient_id: 'ing-8',
        item_name: 'Água Filtrada',
        net_quantity: 200,
        unit: 'ml',
        correction_factor: 1.00,
        notes: '200 ml água morna/quente'
      }
    ]
  }
];

export const INITIAL_FINAL_RECIPES = [
  // 1. Cachorro-Quente 1 Salsicha
  {
    id: 'rec-1',
    code: 'HOT-001',
    name: 'Cachorro-Quente 1 Salsicha',
    type: 'final_product',
    category: 'Lanches',
    yield_portions: 1,
    yield_unit: 'un',
    portion_size_description: '1 Lanche montado (~280g)',
    waste_percent: 5.0, // 5% de perda operacional de montagem
    sale_price: 15.00,
    preparation_method: 'Aquecer o pão no vapor/grill. Aplicar a maionese caseira artesanal. Acomodar 1 salsicha aquecida. Finalizar com ketchup, mostarda, milho verde e batata palha fininha crocante. Embalar na caixinha.',
    notes: 'Pancho clássico de 1 salsicha com ingredientes de primeira linha.',
    items: [
      // Ingredientes
      {
        id: 'item-1',
        item_type: 'ingredient',
        ingredient_id: 'ing-2',
        item_name: 'Pão de Hot Dog Tradicional',
        net_quantity: 1,
        unit: 'un',
        correction_factor: 1.00,
        notes: '1 unidade macia'
      },
      {
        id: 'item-2',
        item_type: 'ingredient',
        ingredient_id: 'ing-1',
        item_name: 'Salsicha Hot Dog Especial',
        net_quantity: 50,
        unit: 'g',
        correction_factor: 1.00,
        notes: '1 salsicha (~50g)'
      },
      {
        id: 'item-3',
        item_type: 'sub_recipe',
        sub_recipe_id: 'sub-1',
        item_name: 'Maionese Caseira Especial',
        net_quantity: 30,
        unit: 'g',
        correction_factor: 1.00,
        notes: 'Porção generosa de 30g'
      },
      {
        id: 'item-4',
        item_type: 'ingredient',
        ingredient_id: 'ing-14',
        item_name: 'Ketchup Profissional',
        net_quantity: 15,
        unit: 'g',
        correction_factor: 1.00,
        notes: '15g'
      },
      {
        id: 'item-5',
        item_type: 'ingredient',
        ingredient_id: 'ing-15',
        item_name: 'Mostarda Amarela Suave',
        net_quantity: 10,
        unit: 'g',
        correction_factor: 1.00,
        notes: '10g'
      },
      {
        id: 'item-6',
        item_type: 'ingredient',
        ingredient_id: 'ing-16',
        item_name: 'Milho Verde em Conserva',
        net_quantity: 20,
        unit: 'g',
        correction_factor: 1.00,
        notes: '20g'
      },
      {
        id: 'item-7',
        item_type: 'ingredient',
        ingredient_id: 'ing-17',
        item_name: 'Batata Palha Crocante Extrafina',
        net_quantity: 20,
        unit: 'g',
        correction_factor: 1.00,
        notes: '20g de cobertura'
      },
      // Embalagens
      {
        id: 'item-8',
        item_type: 'packaging',
        ingredient_id: 'ing-18',
        item_name: 'Caixinha de Hot Dog Kraft com Tampa',
        net_quantity: 1,
        unit: 'un',
        correction_factor: 1.00,
        notes: '1 caixinha'
      },
      {
        id: 'item-9',
        item_type: 'packaging',
        ingredient_id: 'ing-19',
        item_name: 'Saco Kraft de Entrega (Delivery)',
        net_quantity: 1,
        unit: 'un',
        correction_factor: 1.00,
        notes: '1 saco de entrega'
      },
      {
        id: 'item-10',
        item_type: 'packaging',
        ingredient_id: 'ing-20',
        item_name: 'Guardanapos de Papel Folha Dupla',
        net_quantity: 3,
        unit: 'un',
        correction_factor: 1.00,
        notes: '3 guardanapos'
      },
      {
        id: 'item-11',
        item_type: 'packaging',
        ingredient_id: 'ing-21',
        item_name: 'Sachês de Molho Individual (Ketchup/Maio)',
        net_quantity: 2,
        unit: 'un',
        correction_factor: 1.00,
        notes: '2 sachês de cortesia'
      }
    ]
  },

  // 2. Cachorro-Quente 2 Salsichas
  {
    id: 'rec-2',
    code: 'HOT-002',
    name: 'Cachorro-Quente 2 Salsichas',
    type: 'final_product',
    category: 'Lanches',
    yield_portions: 1,
    yield_unit: 'un',
    portion_size_description: '1 Lanche montado duplo (~330g)',
    waste_percent: 5.0,
    sale_price: 18.00,
    preparation_method: 'Mesma montagem do lanche tradicional com 2 salsichas paralelas no pão aquecido.',
    notes: 'Nosso campeão de vendas! Pancho duplo bem recheado.',
    items: [
      {
        id: 'item-201',
        item_type: 'ingredient',
        ingredient_id: 'ing-2',
        item_name: 'Pão de Hot Dog Tradicional',
        net_quantity: 1,
        unit: 'un',
        correction_factor: 1.00,
        notes: '1 pão'
      },
      {
        id: 'item-202',
        item_type: 'ingredient',
        ingredient_id: 'ing-1',
        item_name: 'Salsicha Hot Dog Especial',
        net_quantity: 100, // 2 salsichas = 100g
        unit: 'g',
        correction_factor: 1.00,
        notes: '2 salsichas (~100g)'
      },
      {
        id: 'item-203',
        item_type: 'sub_recipe',
        sub_recipe_id: 'sub-1',
        item_name: 'Maionese Caseira Especial',
        net_quantity: 30,
        unit: 'g',
        correction_factor: 1.00,
        notes: '30g'
      },
      {
        id: 'item-204',
        item_type: 'ingredient',
        ingredient_id: 'ing-14',
        item_name: 'Ketchup Profissional',
        net_quantity: 15,
        unit: 'g',
        correction_factor: 1.00,
        notes: '15g'
      },
      {
        id: 'item-205',
        item_type: 'ingredient',
        ingredient_id: 'ing-15',
        item_name: 'Mostarda Amarela Suave',
        net_quantity: 10,
        unit: 'g',
        correction_factor: 1.00,
        notes: '10g'
      },
      {
        id: 'item-206',
        item_type: 'ingredient',
        ingredient_id: 'ing-16',
        item_name: 'Milho Verde em Conserva',
        net_quantity: 20,
        unit: 'g',
        correction_factor: 1.00,
        notes: '20g'
      },
      {
        id: 'item-207',
        item_type: 'ingredient',
        ingredient_id: 'ing-17',
        item_name: 'Batata Palha Crocante Extrafina',
        net_quantity: 20,
        unit: 'g',
        correction_factor: 1.00,
        notes: '20g'
      },
      {
        id: 'item-208',
        item_type: 'packaging',
        ingredient_id: 'ing-18',
        item_name: 'Caixinha de Hot Dog Kraft com Tampa',
        net_quantity: 1,
        unit: 'un',
        correction_factor: 1.00,
        notes: '1 caixinha'
      },
      {
        id: 'item-209',
        item_type: 'packaging',
        ingredient_id: 'ing-19',
        item_name: 'Saco Kraft de Entrega (Delivery)',
        net_quantity: 1,
        unit: 'un',
        correction_factor: 1.00,
        notes: '1 saco kraft'
      },
      {
        id: 'item-210',
        item_type: 'packaging',
        ingredient_id: 'ing-20',
        item_name: 'Guardanapos de Papel Folha Dupla',
        net_quantity: 3,
        unit: 'un',
        correction_factor: 1.00,
        notes: '3 guardanapos'
      },
      {
        id: 'item-211',
        item_type: 'packaging',
        ingredient_id: 'ing-21',
        item_name: 'Sachês de Molho Individual (Ketchup/Maio)',
        net_quantity: 2,
        unit: 'un',
        correction_factor: 1.00,
        notes: '2 sachês'
      }
    ]
  },

  // 3. Cachorro-Quente 3 Salsichas
  {
    id: 'rec-3',
    code: 'HOT-003',
    name: 'Cachorro-Quente 3 Salsichas (Mega Pancho)',
    type: 'final_product',
    category: 'Lanches',
    yield_portions: 1,
    yield_unit: 'un',
    portion_size_description: '1 Lanche gigante triplo (~380g)',
    waste_percent: 5.0,
    sale_price: 22.00,
    preparation_method: 'Pão especial com 3 salsichas suculentas, maionese artesanal, complementos completos e batata palha abundante.',
    notes: 'Lanche para quem tem fome de leão! Alta margem bruta.',
    items: [
      {
        id: 'item-301',
        item_type: 'ingredient',
        ingredient_id: 'ing-2',
        item_name: 'Pão de Hot Dog Tradicional',
        net_quantity: 1,
        unit: 'un',
        correction_factor: 1.00,
        notes: '1 pão'
      },
      {
        id: 'item-302',
        item_type: 'ingredient',
        ingredient_id: 'ing-1',
        item_name: 'Salsicha Hot Dog Especial',
        net_quantity: 150, // 3 salsichas = 150g
        unit: 'g',
        correction_factor: 1.00,
        notes: '3 salsichas (~150g)'
      },
      {
        id: 'item-303',
        item_type: 'sub_recipe',
        sub_recipe_id: 'sub-1',
        item_name: 'Maionese Caseira Especial',
        net_quantity: 35,
        unit: 'g',
        correction_factor: 1.00,
        notes: '35g'
      },
      {
        id: 'item-304',
        item_type: 'ingredient',
        ingredient_id: 'ing-14',
        item_name: 'Ketchup Profissional',
        net_quantity: 15,
        unit: 'g',
        correction_factor: 1.00,
        notes: '15g'
      },
      {
        id: 'item-305',
        item_type: 'ingredient',
        ingredient_id: 'ing-15',
        item_name: 'Mostarda Amarela Suave',
        net_quantity: 10,
        unit: 'g',
        correction_factor: 1.00,
        notes: '10g'
      },
      {
        id: 'item-306',
        item_type: 'ingredient',
        ingredient_id: 'ing-16',
        item_name: 'Milho Verde em Conserva',
        net_quantity: 25,
        unit: 'g',
        correction_factor: 1.00,
        notes: '25g'
      },
      {
        id: 'item-307',
        item_type: 'ingredient',
        ingredient_id: 'ing-17',
        item_name: 'Batata Palha Crocante Extrafina',
        net_quantity: 25,
        unit: 'g',
        correction_factor: 1.00,
        notes: '25g'
      },
      {
        id: 'item-308',
        item_type: 'packaging',
        ingredient_id: 'ing-18',
        item_name: 'Caixinha de Hot Dog Kraft com Tampa',
        net_quantity: 1,
        unit: 'un',
        correction_factor: 1.00,
        notes: '1 caixinha'
      },
      {
        id: 'item-309',
        item_type: 'packaging',
        ingredient_id: 'ing-19',
        item_name: 'Saco Kraft de Entrega (Delivery)',
        net_quantity: 1,
        unit: 'un',
        correction_factor: 1.00,
        notes: '1 saco kraft'
      },
      {
        id: 'item-310',
        item_type: 'packaging',
        ingredient_id: 'ing-20',
        item_name: 'Guardanapos de Papel Folha Dupla',
        net_quantity: 3,
        unit: 'un',
        correction_factor: 1.00,
        notes: '3 guardanapos'
      },
      {
        id: 'item-311',
        item_type: 'packaging',
        ingredient_id: 'ing-21',
        item_name: 'Sachês de Molho Individual (Ketchup/Maio)',
        net_quantity: 2,
        unit: 'un',
        correction_factor: 1.00,
        notes: '2 sachês'
      }
    ]
  },

  // 4. Pudim de Leite no Pote (145 ml) - Lote de 16 potinhos!
  {
    id: 'rec-4',
    code: 'PO-001',
    name: 'Pudim de Leite no Pote (145 ml)',
    type: 'final_product',
    category: 'Sobremesas',
    yield_portions: 16, // Rendimento de 16 potinhos!
    yield_unit: 'potinhos',
    portion_size_description: 'Lote de 16 potinhos individuais de 145 ml cada',
    waste_percent: 5.0, // 5% de perda no liquidificador e envase
    sale_price: 8.00, // Preço de venda unitário por potinho
    preparation_method: 'Hidratar a gelatina na água por 5 min e aquecer levemente. No liquidificador, bater o leite condensado, creme de leite, leite em pó e leite integral junto com a gelatina hidratada até ficar bem homogêneo. Distribuir a calda caramelizada no fundo dos 16 potinhos (25g cada) e preencher com o creme de pudim. Tampar e refrigerar por no mínimo 4 horas.',
    notes: 'Sobremesa de altíssima aceitação. O sistema rateia os ingredientes do lote para calcular o custo exato de cada pote de 145 ml.',
    items: [
      // Massa do Pudim
      {
        id: 'item-401',
        item_type: 'ingredient',
        ingredient_id: 'ing-9',
        item_name: 'Gelatina em Pó Sem Sabor',
        net_quantity: 24, // 2 envelopes (24g)
        unit: 'g',
        correction_factor: 1.00,
        notes: '2 envelopes de 12g (24g total)'
      },
      {
        id: 'item-402',
        item_type: 'ingredient',
        ingredient_id: 'ing-8',
        item_name: 'Água Filtrada (Hidratação)',
        net_quantity: 105, // 7 colheres de sopa (~15ml cada = 105ml)
        unit: 'ml',
        correction_factor: 1.00,
        notes: '7 colheres de sopa (~105 ml)'
      },
      {
        id: 'item-403',
        item_type: 'ingredient',
        ingredient_id: 'ing-10',
        item_name: 'Creme de Leite UHT (200g)',
        net_quantity: 400, // 2 caixinhas de 200g
        unit: 'g',
        correction_factor: 1.00,
        notes: '2 caixas de 200g (400g total)'
      },
      {
        id: 'item-404',
        item_type: 'ingredient',
        ingredient_id: 'ing-11',
        item_name: 'Leite Condensado (395g)',
        net_quantity: 790, // 2 caixinhas de 395g
        unit: 'g',
        correction_factor: 1.00,
        notes: '2 caixas de 395g (790g total)'
      },
      {
        id: 'item-405',
        item_type: 'ingredient',
        ingredient_id: 'ing-12',
        item_name: 'Leite em Pó Integral',
        net_quantity: 100, // 1 xícara de chá ~100g
        unit: 'g',
        correction_factor: 1.00,
        notes: '1 xícara de chá (~100g)'
      },
      {
        id: 'item-406',
        item_type: 'ingredient',
        ingredient_id: 'ing-13',
        item_name: 'Leite Integral Líquido',
        net_quantity: 1000, // 1 Litro
        unit: 'ml',
        correction_factor: 1.00,
        notes: '1 litro (1000 ml)'
      },
      // Calda do Pudim (Sub-Receita vinculada: 1 receita inteira rateada para os 16 potes)
      {
        id: 'item-407',
        item_type: 'sub_recipe',
        sub_recipe_id: 'sub-2',
        item_name: 'Calda Caramelizada para Pudim',
        net_quantity: 16, // 16 porções (a receita inteira da calda)
        unit: 'porções',
        correction_factor: 1.00,
        notes: '1 lote da calda rateado entre os 16 potinhos'
      },
      // Embalagens para o lote de 16 potes
      {
        id: 'item-408',
        item_type: 'packaging',
        ingredient_id: 'ing-22',
        item_name: 'Potinho Plástico com Tampa 145 ml',
        net_quantity: 16, // 16 potinhos
        unit: 'un',
        correction_factor: 1.00,
        notes: '16 potinhos com tampa hermética'
      },
      {
        id: 'item-409',
        item_type: 'packaging',
        ingredient_id: 'ing-23',
        item_name: 'Colherzinha de Sobremesa Descartável',
        net_quantity: 16, // 16 colheres
        unit: 'un',
        correction_factor: 1.00,
        notes: '16 colheres para envio aos clientes'
      }
    ]
  }
];

export const INITIAL_SIMULATIONS = {
  'rec-1': 420, // 420 lanches/mês
  'rec-2': 380, // 380 lanches/mês
  'rec-3': 160, // 160 lanches/mês
  'rec-4': 280  // 280 potinhos de pudim/mês
};

// ==============================================================================
// 2. ESTADO GLOBAL DO MÓDULO DE FICHAS TÉCNICAS
// ==============================================================================

export const state = {
  ingredients: JSON.parse(JSON.stringify(INITIAL_INGREDIENTS)),
  subRecipes: JSON.parse(JSON.stringify(INITIAL_SUB_RECIPES)),
  recipes: JSON.parse(JSON.stringify(INITIAL_FINAL_RECIPES)),
  simulations: { ...INITIAL_SIMULATIONS },
  currency: typeof window !== 'undefined' ? (localStorage.getItem('PM_RECIPES_CURRENCY') || 'BRL') : 'BRL', // 'BRL' (R$) ou 'PYG' (Gs.)
  exchangeRateGs: typeof window !== 'undefined' ? (Number(localStorage.getItem('PM_EXCHANGE_RATE_GS')) || 1350) : 1350, // 1 R$ = 1.350 Gs.
  pricingMarkup: 2.2, // Carregado dinamicamente do módulo de precificação
  fixedCostPercent: 25.0, // Carregado dinamicamente
  variableCostPercent: 15.0, // Carregado dinamicamente
  targetProfitPercent: 20.0, // Carregado dinamicamente
  activeTab: 'catalog', // 'catalog' | 'sub_recipes' | 'final_recipes' | 'sales_simulation'
  selectedRecipeId: 'rec-1',
  searchQuery: '',
  categoryFilter: 'all',
  isSaving: false,
  lastSavedAt: null
};

// ==============================================================================
// 3. MÉTODOS DE FORMATAÇÃO E CÁLCULO CULINÁRIO / FINANCEIRO
// ==============================================================================

export function getCurrencySymbol() {
  return state.currency === 'PYG' ? 'Gs.' : 'R$';
}

export function setCurrency(currency) {
  state.currency = currency === 'PYG' ? 'PYG' : 'BRL';
  if (typeof window !== 'undefined') {
    localStorage.setItem('PM_RECIPES_CURRENCY', state.currency);
  }
}

export function setExchangeRate(rate) {
  const num = Math.max(1, Number(rate || 1350));
  state.exchangeRateGs = num;
  if (typeof window !== 'undefined') {
    localStorage.setItem('PM_EXCHANGE_RATE_GS', num);
  }
}

export function toCurrentCurrencyValue(brlValue, round = false) {
  const val = Number(brlValue || 0);
  if (state.currency === 'PYG') {
    const inGs = val * state.exchangeRateGs;
    return round ? Math.round(inGs) : Math.round(inGs * 100) / 100;
  }
  return round ? Math.round(val * 100) / 100 : val;
}

export function fromCurrentCurrencyValue(inputVal) {
  const val = Number(inputVal || 0);
  if (state.currency === 'PYG') {
    return val / state.exchangeRateGs;
  }
  return val;
}

export function formatCurrency(value, currency = state.currency) {
  const num = Number(value || 0);
  if (currency === 'PYG') {
    const valGs = num * state.exchangeRateGs;
    if (Math.abs(valGs) > 0 && Math.abs(valGs) < 100) {
      return valGs.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' Gs.';
    }
    return Math.round(valGs).toLocaleString('pt-BR') + ' Gs.';
  }
  return 'R$ ' + num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatPercent(value) {
  const num = Number(value || 0);
  return num.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%';
}

/**
 * Calcula o custo unitário base de um ingrediente a partir do pacote comprado
 */
export function calculateIngredientUnitCost(purchasePrice, purchaseQty, purchaseUnit, baseUnit) {
  const price = Number(purchasePrice || 0);
  const qty = Number(purchaseQty || 1);
  if (qty <= 0 || price <= 0) return 0;

  // Normalização de unidades
  const pUnit = (purchaseUnit || '').toLowerCase();
  const bUnit = (baseUnit || '').toLowerCase();

  // Ex: compra em kg, usa em g -> 1 kg = 1000g
  if (pUnit === 'kg' && bUnit === 'g') {
    return price / (qty * 1000);
  }
  // Ex: compra em l, usa em ml -> 1 L = 1000ml
  if (pUnit === 'l' && bUnit === 'ml') {
    return price / (qty * 1000);
  }
  // Ex: compra em g, usa em g
  if (pUnit === 'g' && bUnit === 'g') {
    return price / qty;
  }
  // Ex: compra em ml, usa em ml
  if (pUnit === 'ml' && bUnit === 'ml') {
    return price / qty;
  }
  // Ex: compra em un, fardo, pacote, caixa
  return price / qty;
}

/**
 * Calcula o custo detalhado de uma Sub-Receita
 */
export function calculateSubRecipeCost(subRecipe) {
  if (!subRecipe || !subRecipe.items) {
    return { totalCost: 0, costPerUnit: 0, costPerGram: 0, yieldPortions: 1 };
  }

  let totalIngredientsCost = 0;

  subRecipe.items.forEach(item => {
    const ing = state.ingredients.find(i => i.id === item.ingredient_id);
    const unitCost = ing ? Number(ing.unit_cost || 0) : 0;
    const netQty = Number(item.net_quantity || 0);
    const fc = Math.max(1.0, Number(item.correction_factor || 1.0));
    const grossQty = netQty * fc;
    const itemCost = grossQty * unitCost;
    totalIngredientsCost += itemCost;
  });

  const wastePercent = Number(subRecipe.waste_percent || 0);
  const costWithWaste = totalIngredientsCost * (1 + wastePercent / 100);
  const yieldAmount = Number(subRecipe.yield_portions || 1);
  const costPerUnit = yieldAmount > 0 ? (costWithWaste / yieldAmount) : 0;

  return {
    rawIngredientsCost: totalIngredientsCost,
    wastePercent,
    totalCost: costWithWaste,
    yieldPortions: yieldAmount,
    yieldUnit: subRecipe.yield_unit,
    costPerUnit // Custo por grama (se yield for em g) ou por porção (se for em porções)
  };
}

/**
 * Retorna o custo de um item dentro de uma receita (seja ingrediente ou sub-receita)
 */
export function getItemCostInfo(item) {
  let unitCost = 0;
  let name = item.item_name;
  let unit = item.unit;

  if (item.item_type === 'sub_recipe') {
    const sub = state.subRecipes.find(s => s.id === item.sub_recipe_id);
    if (sub) {
      name = sub.name;
      const subCalc = calculateSubRecipeCost(sub);
      unitCost = subCalc.costPerUnit;
      unit = sub.yield_unit;
    }
  } else {
    const ing = state.ingredients.find(i => i.id === item.ingredient_id);
    if (ing) {
      name = ing.name;
      unitCost = Number(ing.unit_cost || 0);
      unit = ing.base_unit;
    }
  }

  const netQty = Number(item.net_quantity || 0);
  const fc = Math.max(1.0, Number(item.correction_factor || 1.0));
  const grossQty = netQty * fc;
  const totalCost = grossQty * unitCost;

  return {
    name,
    unit,
    unitCost,
    netQty,
    fc,
    grossQty,
    totalCost
  };
}

/**
 * Calcula a Ficha Técnica Completa de um Produto Final
 */
export function calculateRecipeFinancials(recipe) {
  if (!recipe || !recipe.items) {
    return null;
  }

  let ingredientsCost = 0;
  let packagingCost = 0;

  const calculatedItems = recipe.items.map(item => {
    const info = getItemCostInfo(item);
    if (item.item_type === 'packaging') {
      packagingCost += info.totalCost;
    } else {
      ingredientsCost += info.totalCost;
    }
    return {
      ...item,
      ...info
    };
  });

  const yieldPortions = Math.max(1, Number(recipe.yield_portions || 1));
  const wastePercent = Number(recipe.waste_percent || 0);

  // Aplicação da % de Perda na produção sobre os ingredientes alimentares
  const ingredientsCostWithWaste = ingredientsCost * (1 + wastePercent / 100);
  const totalBatchCost = ingredientsCostWithWaste + packagingCost;

  // Custo por porção/unidade individual
  const costPerPortion = totalBatchCost / yieldPortions;
  const ingredientsPerPortion = ingredientsCostWithWaste / yieldPortions;
  const packagingPerPortion = packagingCost / yieldPortions;

  // Precificação e Margens
  const salePrice = Number(recipe.sale_price || 0);
  const markupDivisor = Number(state.pricingMarkup || 2.2);
  const suggestedPrice = Math.round((costPerPortion * markupDivisor) * 2) / 2; // Arredonda para 0.50

  const grossProfit = salePrice > 0 ? (salePrice - costPerPortion) : 0;
  const grossProfitMarginPercent = salePrice > 0 ? (grossProfit / salePrice) * 100 : 0;
  const cmvPercent = salePrice > 0 ? (costPerPortion / salePrice) * 100 : 0;

  // Decomposição para o gráfico de barras proporcional
  // Lucro Líquido Real = Preço - Custo Receita - Custos Fixos Prop. - Custos Variáveis Prop.
  const fixedCostShare = salePrice * (state.fixedCostPercent / 100);
  const varCostShare = salePrice * (state.variableCostPercent / 100);
  const estimatedNetProfit = salePrice > 0 ? (salePrice - costPerPortion - fixedCostShare - varCostShare) : 0;
  const netProfitMarginPercent = salePrice > 0 ? (estimatedNetProfit / salePrice) * 100 : 0;

  return {
    calculatedItems,
    yieldPortions,
    yieldUnit: recipe.yield_unit,
    portionSizeDesc: recipe.portion_size_description || `${yieldPortions} ${recipe.yield_unit}`,
    wastePercent,
    ingredientsCost,
    ingredientsCostWithWaste,
    packagingCost,
    totalBatchCost,
    costPerPortion,
    ingredientsPerPortion,
    packagingPerPortion,
    salePrice,
    suggestedPrice,
    markupDivisor,
    grossProfit,
    grossProfitMarginPercent,
    cmvPercent,
    fixedCostShare,
    varCostShare,
    estimatedNetProfit,
    netProfitMarginPercent
  };
}

/**
 * Calcula a Simulação de Vendas Mensal Consolidada
 */
export function calculateSalesSimulation() {
  let totalProjectedRevenue = 0;
  let totalProjectedCmv = 0;
  let totalProjectedGrossProfit = 0;
  let totalUnits = 0;

  const rows = state.recipes.map(recipe => {
    const calc = calculateRecipeFinancials(recipe);
    const monthlyUnits = Number(state.simulations[recipe.id] || 0);
    const revenue = monthlyUnits * calc.salePrice;
    const cmv = monthlyUnits * calc.costPerPortion;
    const grossProfit = revenue - cmv;
    const marginPercent = revenue > 0 ? (grossProfit / revenue) * 100 : 0;

    totalProjectedRevenue += revenue;
    totalProjectedCmv += cmv;
    totalProjectedGrossProfit += grossProfit;
    totalUnits += monthlyUnits;

    return {
      recipeId: recipe.id,
      code: recipe.code,
      name: recipe.name,
      category: recipe.category,
      unitCmv: calc.costPerPortion,
      salePrice: calc.salePrice,
      grossProfitMarginPercent: calc.grossProfitMarginPercent,
      unitGrossProfit: calc.grossProfit,
      monthlyUnits,
      projectedRevenue: revenue,
      projectedCmv: cmv,
      projectedGrossProfit: grossProfit,
      revenueSharePercent: 0 // preenchido abaixo
    };
  });

  // Calcula percentual de participação de cada produto no faturamento
  rows.forEach(r => {
    r.revenueSharePercent = totalProjectedRevenue > 0 ? (r.projectedRevenue / totalProjectedRevenue) * 100 : 0;
  });

  const overallGrossMarginPercent = totalProjectedRevenue > 0 
    ? (totalProjectedGrossProfit / totalProjectedRevenue) * 100 
    : 0;

  return {
    rows,
    totalUnits,
    totalProjectedRevenue,
    totalProjectedCmv,
    totalProjectedGrossProfit,
    overallGrossMarginPercent
  };
}

// ==============================================================================
// 4. ATUALIZAÇÃO EM CASCATA & PERSISTÊNCIA RESILIENTE
// ==============================================================================

/**
 * Atualiza o preço ou dados de um insumo e propaga em cascata
 */
export function updateIngredient(id, patch) {
  const ingIndex = state.ingredients.findIndex(i => i.id === id);
  if (ingIndex === -1) return false;

  const ing = state.ingredients[ingIndex];
  Object.assign(ing, patch);

  // Sincronização inteligente da unidade base se a unidade de compra mudou
  if (patch.purchase_unit) {
    const pu = String(patch.purchase_unit).toLowerCase();
    if (pu === 'kg' || pu === 'g') {
      ing.base_unit = 'g';
    } else if (pu === 'l' || pu === 'ml') {
      ing.base_unit = 'ml';
    } else if (['un', 'fardo', 'cx', 'pct'].includes(pu)) {
      ing.base_unit = 'un';
    }
  }

  // Recalcula custo unitário
  ing.unit_cost = calculateIngredientUnitCost(
    ing.purchase_price,
    ing.purchase_quantity,
    ing.purchase_unit,
    ing.base_unit
  );

  saveStateDebounced();
  return true;
}

/**
 * Adiciona um novo insumo ao catálogo
 */
export function addIngredient(data) {
  const newId = 'ing-' + Date.now();
  const codeNum = state.ingredients.length + 1;
  const prefix = data.type === 'embalagem' ? 'EMB-' : 'INS-';
  const code = prefix + String(codeNum).padStart(3, '0');

  const unitCost = calculateIngredientUnitCost(
    data.purchase_price,
    data.purchase_quantity,
    data.purchase_unit,
    data.base_unit
  );

  const newIng = {
    id: newId,
    code: data.code || code,
    name: data.name,
    category: data.category || (data.type === 'embalagem' ? 'Embalagens e Descartáveis' : 'Mercearia e Secos'),
    type: data.type || 'ingrediente',
    purchase_quantity: Number(data.purchase_quantity || 1),
    purchase_unit: data.purchase_unit || 'un',
    purchase_price: Number(data.purchase_price || 0),
    base_unit: data.base_unit || 'un',
    unit_cost: unitCost,
    default_correction_factor: Number(data.default_correction_factor || 1.00),
    notes: data.notes || ''
  };

  state.ingredients.push(newIng);
  saveStateDebounced();
  return newIng;
}

/**
 * Remove um insumo do catálogo (se não estiver em uso)
 */
export function deleteIngredient(id) {
  // Verifica se está em uso em alguma sub-receita ou receita
  const usedInSub = state.subRecipes.some(sr => sr.items.some(it => it.ingredient_id === id));
  const usedInRec = state.recipes.some(r => r.items.some(it => it.ingredient_id === id));

  if (usedInSub || usedInRec) {
    return { success: false, message: 'Este insumo não pode ser excluído pois está em uso nas receitas!' };
  }

  const ing = state.ingredients.find(i => i.id === id);
  state.ingredients = state.ingredients.filter(i => i.id !== id);
  
  if (ing) {
    deleteIngredientFromSupabase(ing.id, ing.code);
  }

  saveStateDebounced();
  return { success: true };
}

/**
 * Atualiza parâmetros de uma receita (ex: % perda, preço de venda, rendimento)
 */
export function updateRecipe(recipeId, patch) {
  const rec = state.recipes.find(r => r.id === recipeId);
  if (!rec) return false;
  Object.assign(rec, patch);
  saveStateDebounced();
  return true;
}

/**
 * Atualiza um item dentro de uma receita (ex: quantidade líquida, F.C.)
 */
export function updateRecipeItem(recipeId, itemId, patch) {
  const rec = state.recipes.find(r => r.id === recipeId);
  if (!rec) return false;
  const item = rec.items.find(it => it.id === itemId);
  if (!item) return false;
  Object.assign(item, patch);
  saveStateDebounced();
  return true;
}

/**
 * Adiciona um item a uma receita existente
 */
export function addRecipeItem(recipeId, itemData) {
  const rec = state.recipes.find(r => r.id === recipeId);
  if (!rec) return false;

  const newItem = {
    id: 'item-' + Date.now(),
    item_type: itemData.item_type || 'ingredient',
    ingredient_id: itemData.ingredient_id || null,
    sub_recipe_id: itemData.sub_recipe_id || null,
    item_name: itemData.item_name || 'Novo Item',
    net_quantity: Number(itemData.net_quantity || 1),
    unit: itemData.unit || 'g',
    correction_factor: Number(itemData.correction_factor || 1.00),
    notes: itemData.notes || ''
  };

  rec.items.push(newItem);
  saveStateDebounced();
  return newItem;
}

/**
 * Remove um item de uma receita
 */
export function removeRecipeItem(recipeId, itemId) {
  const rec = state.recipes.find(r => r.id === recipeId);
  if (!rec) return false;
  rec.items = rec.items.filter(it => it.id !== itemId);
  saveStateDebounced();
  return true;
}

/**
 * Atualiza estimativa de vendas de um produto
 */
export function updateSimulationUnits(recipeId, units) {
  state.simulations[recipeId] = Math.max(0, parseInt(units || 0, 10));
  saveStateDebounced();
}

// ==============================================================================
// 5. INTEGRAÇÃO COM MÓDULO DE PRECIFICAÇÃO E SUPABASE
// ==============================================================================

/**
 * Carrega o markup e dados financeiros calculados na página /admin/precificacao
 */
export function loadPricingIntegration() {
  try {
    const savedPricing = localStorage.getItem('PM_PRICING_SETTINGS');
    const savedFixed = localStorage.getItem('PM_FIXED_COSTS');
    const savedChannels = localStorage.getItem('PM_SALES_CHANNELS');

    if (savedPricing) {
      const p = JSON.parse(savedPricing);
      const monthlyRev = Number(p.monthly_projected_revenue || 35000000);
      let totalFixed = 0;
      if (savedFixed) {
        const fc = JSON.parse(savedFixed);
        totalFixed = fc.reduce((acc, c) => acc + Number(c.monthly_value || 0), 0);
      } else {
        totalFixed = 8780000; // Valor padrão Pancho Mbarate
      }

      const fixedPct = monthlyRev > 0 ? (totalFixed / monthlyRev) * 100 : 25;
      const varPct = Number(p.tax_percent || 10) + Number(p.waste_percent || 2.5) + Number(p.maintenance_percent || 2) + Number(p.other_variable_percent || 1.5) + 3.0; // ~19%
      const profitPct = Number(p.target_profit_percent || 20);

      const totalPct = fixedPct + varPct + profitPct;
      if (totalPct < 100) {
        const markupDiv = 100 / (100 - totalPct);
        state.pricingMarkup = Math.round(markupDiv * 100) / 100;
        state.fixedCostPercent = Math.round(fixedPct * 10) / 10;
        state.variableCostPercent = Math.round(varPct * 10) / 10;
        state.targetProfitPercent = Math.round(profitPct * 10) / 10;
        return;
      }
    }
  } catch (e) {
    console.warn('Erro ao ler integração de precificação:', e);
  }

  // Padrão de fallback saudável para gastronomia
  state.pricingMarkup = 2.20;
  state.fixedCostPercent = 25.0;
  state.variableCostPercent = 18.0;
  state.targetProfitPercent = 20.0;
}

/**
 * Carrega os dados de receitas do Supabase ou LocalStorage
 */
export async function loadRecipeData() {
  loadPricingIntegration();

  // 1. Tenta carregar do LocalStorage primeiro para resposta instantânea na interface
  try {
    const local = localStorage.getItem('PM_RECIPES_DATA_V1');
    if (local) {
      const parsed = JSON.parse(local);
      if (parsed.ingredients && parsed.ingredients.length > 0) state.ingredients = parsed.ingredients;
      if (parsed.subRecipes && parsed.subRecipes.length > 0) state.subRecipes = parsed.subRecipes;
      if (parsed.recipes && parsed.recipes.length > 0) state.recipes = parsed.recipes;
      if (parsed.simulations) state.simulations = parsed.simulations;
    }
  } catch (e) {
    console.warn('Erro ao carregar dados locais de receitas:', e);
  }

  // 2. Carrega dados atualizados do Supabase se disponível
  try {
    const dbData = await fetchRecipeDataFromSupabase();
    if (dbData) {
      if (dbData.ingredients && dbData.ingredients.length > 0) {
        state.ingredients = dbData.ingredients;
      }
      if (dbData.subRecipes && dbData.subRecipes.length > 0) {
        state.subRecipes = dbData.subRecipes;
      }
      if (dbData.recipes && dbData.recipes.length > 0) {
        state.recipes = dbData.recipes;
      }
      if (dbData.simulations && Object.keys(dbData.simulations).length > 0) {
        state.simulations = dbData.simulations;
      }

      // Atualiza cache local com a versão oficial do Supabase
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('PM_RECIPES_DATA_V1', JSON.stringify({
          ingredients: state.ingredients,
          subRecipes: state.subRecipes,
          recipes: state.recipes,
          simulations: state.simulations,
          savedAt: new Date().toISOString()
        }));
      }
    }
  } catch (err) {
    console.warn('Supabase não conectado ou erro ao ler receitas. Mantendo dados locais.', err);
  }

  return state;
}

let saveTimer = null;
export function saveStateDebounced() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveRecipeData();
  }, 400);
}

/**
 * Salva os dados no LocalStorage e sincroniza todas as tabelas no Supabase
 */
export async function saveRecipeData() {
  state.isSaving = true;

  // 1. Salva imediatamente em LocalStorage (resiliência offline)
  const payload = {
    ingredients: state.ingredients,
    subRecipes: state.subRecipes,
    recipes: state.recipes,
    simulations: state.simulations,
    savedAt: new Date().toISOString()
  };
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('PM_RECIPES_DATA_V1', JSON.stringify(payload));
  }
  state.lastSavedAt = new Date();

  // 2. Sincronização estruturada no Supabase (insumos, fichas, itens e simulações)
  try {
    await saveAllRecipeDataToSupabase(state);
  } catch (e) {
    console.warn('Erro ao sincronizar receitas no Supabase (operando via local):', e);
  }

  state.isSaving = false;
  return true;
}

/**
 * Restaura os dados padrão de fábrica
 */
export function resetToDefaults() {
  state.ingredients = JSON.parse(JSON.stringify(INITIAL_INGREDIENTS));
  state.subRecipes = JSON.parse(JSON.stringify(INITIAL_SUB_RECIPES));
  state.recipes = JSON.parse(JSON.stringify(INITIAL_FINAL_RECIPES));
  state.simulations = { ...INITIAL_SIMULATIONS };
  saveRecipeData();
}
