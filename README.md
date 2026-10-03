# PANCHO MBARATE 🌭🔥
> Cardápio Digital & Sistema de Pedidos Mobile-First para Ciudad del Este, Paraguay.

---

## 🎯 Visão Geral
Aplicação web real de cardápio digital e checkout de alta conversão para o **PANCHO MBARATE**, focada em mobile-first, velocidade máxima e pedidos diretos no balcão via WhatsApp:

```
ENTRAR → ESCOLHER → PERSONALIZAR → CONFERIR → WHATSAPP → RETIRAR
```

---

## 🛠️ Stack Tecnológica
* **Frontend**: HTML5 Semântico, Tailwind CSS, JavaScript Moderno (ES6+ Modules), Vanilla CSS.
* **Banco de Dados & Autenticação**: [Supabase](https://supabase.com) (PostgreSQL 15+, Row Level Security, Auth).
* **Backend Seguro**: Supabase Edge Functions (validação de preços e CMV no servidor).
* **Hospedagem & CDN**: [Cloudflare Pages](https://pages.cloudflare.com) (distribuição global ultrarrápida com SSL automático).
* **Canal de Pedidos**: WhatsApp API com mensagens pré-formatadas e identificador único de pedido (`PM-YYYYMMDD-HHMMSS-XXX`).

---

## 📁 Estrutura do Repositório

```
pancho-mbarate/
├── index.html                   # Aplicação cliente (cardápio, personalização, checkout)
├── admin/
│   └── index.html               # Painel administrativo (pedidos, métricas, financeiro)
├── assets/
│   ├── images/                  # Fotos reais e apetitosas dos panchos
│   ├── icons/                   # Ícones da interface
│   └── logo/
│       └── mascot_logo.jpg      # Mascote oficial do Pancho Mbarate
├── css/
│   └── styles.css               # Design system, animações e tokens de estilo
├── js/
│   ├── app.js                   # Controlador da interface do cliente
│   ├── cart.js                  # Gerenciador de estado e código de pedidos
│   ├── products.js              # Catálogo oficial e formatação de moeda (Gs.)
│   ├── whatsapp.js              # Construtor e codificador de mensagens para WhatsApp
│   ├── supabase.js              # Integração de persistência Supabase e modo offline
│   ├── config.js                # Configurações globais e status em tempo real
│   └── admin.js                 # Lógica de dashboard, status e relatórios
├── supabase/
│   ├── schema.sql               # DDL do PostgreSQL com tabelas, índices e dados iniciais
│   ├── policies.sql             # Regras de segurança Row Level Security (RLS)
│   └── functions/
│       └── create-order/        # Edge function para recálculo seguro do pedido
├── .env.example                 # Exemplo de variáveis de ambiente
├── .gitignore                   # Arquivos ignorados no versionamento
└── README.md                    # Documentação oficial
```

---

## 🚀 Como Executar Localmente

Você pode rodar um servidor web estático local (como Python, Node ou o servidor do VS Code / Antigravity):

```bash
# Com Python 3
python -m http.server 8000

# Ou com Node.js (npx serve)
npx serve .
```

Acesse:
* **Cliente**: `http://localhost:8000/`
* **Admin**: `http://localhost:8000/admin/`

> O sistema possui **modo demo resiliente integrado**: funciona imediatamente mesmo sem Supabase configurado, salvando pedidos no navegador e permitindo testar o fluxo de ponta a ponta sem telas brancas ou erros técnicos.

---

## 🗄️ Configuração do Banco Supabase

1. Crie um projeto gratuito ou pago no [Supabase](https://supabase.com).
2. No painel do Supabase, acesse **SQL Editor**.
3. Execute o conteúdo de `supabase/schema.sql` para criar as tabelas:
   * `products`
   * `add_ons`
   * `orders`
   * `order_items`
   * `order_addons`
   * `settings`
4. Execute o conteúdo de `supabase/policies.sql` para ativar o **Row Level Security (RLS)**.
5. Em **Authentication** > **Users**, crie seu usuário administrador para login no painel `/admin`.
6. (Opcional) Faça o deploy da Edge Function com a Supabase CLI:
   ```bash
   supabase functions deploy create-order
   ```

---

## ☁️ Deploy no Cloudflare Pages via GitHub

1. **Subir para o GitHub**:
   ```bash
   git init
   git add .
   git commit -m "feat: lancamento oficial Pancho Mbarate"
   git branch -M main
   git remote add origin https://github.com/SEU_USUARIO/pancho-mbarate.git
   git push -u origin main
   ```

2. **Conectar ao Cloudflare Pages**:
   * No painel da Cloudflare, acesse **Workers & Pages** > **Create application** > **Pages** > **Connect to Git**.
   * Selecione o repositório `pancho-mbarate`.
   * Configurações de Build:
     * **Framework preset**: `None`
     * **Build command**: *(deixar em branco)*
     * **Build output directory**: `/`
   * Clique em **Save and Deploy**.

3. **Variáveis de Ambiente (Opcional)**:
   * Em **Settings** > **Environment variables**, adicione:
     * `SUPABASE_URL`
     * `SUPABASE_ANON_KEY`
     * `WHATSAPP_NUMBER`
     * `GOOGLE_MAPS_URL`

4. **Domínio Personalizado**:
   * No painel da Cloudflare Pages, vá em **Custom domains** e configure seu domínio (ex: `pedir.panchombarate.com`).

---

## 🌭 Produtos Oficiais e Preços

| Produto | Salsichas | Preço (Gs.) | CMV (Gs.) | Destaque |
| :--- | :---: | :---: | :---: | :--- |
| **Pancho Py'aguasu** | 1 | 15.000 Gs. | 6.000 Gs. | Pão artesanal, molhos e crocância |
| **Pancho Mbarate** | 2 | 20.000 Gs. | 8.500 Gs. | 🔥 MAIS PEDIDO |
| **Pancho Mbarate Guasu** | 3 | 22.000 Gs. | 10.500 Gs. | 💪 PARA QUEM ESTÁ COM FOME |

### Adicionais
* **Salsicha Extra**: `+2.500 Gs.` (CMV: 1.200 Gs.)
* **Queijo Extra**: `+6.000 Gs.` (CMV: 2.500 Gs.)

*Nota: O CMV é mantido estritamente confidencial e visível apenas para o administrador no painel `/admin`.*

---

## 💬 Formato da Mensagem no WhatsApp

```text
*NOVO PEDIDO - PANCHO MBARATE* 🌭🔥
---------------------------------
*Pedido:* PM-20260924-110530-942
*Cliente:* Maria Silva
*Lanche:* Pancho Mbarate
*Adicionais:* Queijo Extra (+6.000 Gs.)
*Total:* 26.000 Gs.
*Retirada:* 10–15 min
---------------------------------
_Pedido gerado pelo cardápio digital. Retirada no balcão._
```

---

## 🔒 Segurança e Regras de Negócio
* Nunca expor a chave `service_role` no frontend.
* Preço e CMV recalculados com base no catálogo oficial do banco.
* O status inicial é `INICIADO`. A confirmação da venda ocorre no balcão/WhatsApp e é atualizada para `CONFIRMADO` no painel administrativo.
* Relatório financeiro considera apenas pedidos com status `CONFIRMADO` ou `RETIRADO`.
* Lucro = Receita Confirmada - CMV Confirmado.

---

**PANCHO MBARATE — O autêntico sabor de fronteira em Ciudad del Este!**
