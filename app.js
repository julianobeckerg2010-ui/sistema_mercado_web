const STORAGE_KEY = 'mercado_facil_pro_web_db_v1';
const SESSION_KEY = 'mercado_facil_pro_web_session_v1';

const state = {
  db: null,
  currentUser: null,
  cart: {},
  selectedProductId: null,
  selectedOrderId: null,
  adminTab: 'products',
};

const formatCurrency = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

const defaultProducts = [
  ['Arroz Premium 5kg', 29.9, 'Alimentos', 18, 'Pacote premium, ideal para o dia a dia.'],
  ['Feijão Carioca 1kg', 8.9, 'Alimentos', 26, 'Grãos selecionados e alta qualidade.'],
  ['Macarrão Espaguete', 5.49, 'Alimentos', 34, 'Massa tradicional para receitas rápidas.'],
  ['Leite Integral 1L', 5.99, 'Bebidas', 40, 'Leite integral longa vida.'],
  ['Refrigerante Cola 2L', 10.99, 'Bebidas', 20, 'Bebida gelada para toda a família.'],
  ['Café Torrado 500g', 16.5, 'Alimentos', 15, 'Café encorpado e aromático.'],
  ['Detergente Neutro', 2.79, 'Limpeza', 50, 'Limpeza eficiente com alto rendimento.'],
  ['Sabão em Pó 1,6kg', 19.9, 'Limpeza', 17, 'Roupas limpas e perfumadas.'],
  ['Papel Higiênico 12 rolos', 18.9, 'Higiene', 22, 'Folha dupla, macio e resistente.'],
  ['Shampoo Hidratante', 15.9, 'Higiene', 14, 'Cuidado diário para os cabelos.'],
];

const elements = {
  screens: {
    auth: document.getElementById('screen-auth'),
    admin: document.getElementById('screen-admin'),
    client: document.getElementById('screen-client'),
  },
  loginForm: document.getElementById('login-form'),
  registerForm: document.getElementById('register-form'),
  loginUsuario: document.getElementById('login-usuario'),
  loginSenha: document.getElementById('login-senha'),
  cadNome: document.getElementById('cad-nome'),
  cadUsuario: document.getElementById('cad-usuario'),
  cadSenha: document.getElementById('cad-senha'),
  adminTitle: document.getElementById('admin-title'),
  adminSubtitle: document.getElementById('admin-subtitle'),
  adminSummary: document.getElementById('admin-summary'),
  adminLogout: document.getElementById('admin-logout'),
  adminNome: document.getElementById('admin-nome'),
  adminPreco: document.getElementById('admin-preco'),
  adminCategoria: document.getElementById('admin-categoria'),
  adminEstoque: document.getElementById('admin-estoque'),
  adminDescricao: document.getElementById('admin-descricao'),
  productForm: document.getElementById('product-form'),
  btnNovoProduto: document.getElementById('btn-novo-produto'),
  btnAtualizarProduto: document.getElementById('btn-atualizar-produto'),
  btnRemoverProduto: document.getElementById('btn-remover-produto'),
  btnLimparForm: document.getElementById('btn-limpar-form'),
  adminProductsBody: document.getElementById('admin-products-body'),
  adminOrdersBody: document.getElementById('admin-orders-body'),
  btnVerItensPedido: document.getElementById('btn-ver-itens-pedido'),
  adminProductsTab: document.getElementById('admin-products-tab'),
  adminOrdersTab: document.getElementById('admin-orders-tab'),
  adminTabButtons: Array.from(document.querySelectorAll('[data-admin-tab]')),
  clientSubtitle: document.getElementById('client-subtitle'),
  clientLogout: document.getElementById('client-logout'),
  clientSearch: document.getElementById('client-search'),
  clientCategory: document.getElementById('client-category'),
  btnClientOrdersTop: document.getElementById('btn-client-orders-top'),
  btnClientOrdersSide: document.getElementById('btn-client-orders-side'),
  btnClientCheckoutTop: document.getElementById('btn-client-checkout-top'),
  btnClientCheckoutSide: document.getElementById('btn-client-checkout-side'),
  catalogGrid: document.getElementById('catalog-grid'),
  cartContent: document.getElementById('cart-content'),
  modalRoot: document.getElementById('modal-root'),
  toastRoot: document.getElementById('toast-root'),
};

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

async function sha256(text) {
  const bytes = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hashBuffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function nextId(key) {
  state.db.meta[key] += 1;
  return state.db.meta[key];
}

function saveDatabase() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.db));
}

function saveSession() {
  const payload = {
    currentUserId: state.currentUser?.id ?? null,
    cart: state.cart,
  };
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(payload));
}

function restoreSession() {
  const raw = sessionStorage.getItem(SESSION_KEY);
  if (!raw || !state.db) return;

  try {
    const session = JSON.parse(raw);
    if (session.currentUserId) {
      state.currentUser = state.db.users.find((user) => user.id === session.currentUserId) || null;
    }
    if (session.cart && typeof session.cart === 'object') {
      state.cart = session.cart;
    }
  } catch {
    sessionStorage.removeItem(SESSION_KEY);
  }
}

async function createInitialDatabase() {
  const adminPassword = await sha256('admin123');
  const employeePassword = await sha256('func123');

  const db = {
    meta: {
      lastUserId: 2,
      lastProductId: defaultProducts.length,
      lastOrderId: 0,
      lastOrderItemId: 0,
    },
    users: [
      { id: 1, nome: 'Administrador', usuario: 'dono', senha: adminPassword, perfil: 'dono' },
      { id: 2, nome: 'Funcionário', usuario: 'funcionario', senha: employeePassword, perfil: 'funcionario' },
    ],
    products: defaultProducts.map((product, index) => ({
      id: index + 1,
      nome: product[0],
      preco: product[1],
      categoria: product[2],
      estoque: product[3],
      descricao: product[4],
    })),
    orders: [],
    orderItems: [],
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  return db;
}

async function ensureDatabase() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    state.db = await createInitialDatabase();
    return;
  }

  try {
    state.db = JSON.parse(raw);
  } catch {
    state.db = await createInitialDatabase();
  }
}

function currentUserName() {
  return state.currentUser?.nome || '';
}

function showScreen(screen) {
  Object.entries(elements.screens).forEach(([name, section]) => {
    section.classList.toggle('active', name === screen);
    section.classList.toggle('hidden', name !== screen);
  });
}

function notify(title, message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<strong>${escapeHtml(title)}</strong><div>${escapeHtml(message)}</div>`;
  elements.toastRoot.appendChild(toast);
  setTimeout(() => {
    toast.remove();
  }, 3600);
}

function escapeHtml(text) {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function formatDateTime(date = new Date()) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function getCategories() {
  return [...new Set(state.db.products.map((product) => product.categoria).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

function searchProducts(search = '', category = 'Todas') {
  return deepClone(state.db.products)
    .filter((product) => {
      const matchesSearch = !search.trim() || product.nome.toLowerCase().includes(search.trim().toLowerCase());
      const matchesCategory = !category || category === 'Todas' || product.categoria === category;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
}

function getProductById(productId) {
  return state.db.products.find((product) => product.id === Number(productId)) || null;
}

function getAdminSummary() {
  return {
    produtos: state.db.products.length,
    estoque: state.db.products.reduce((sum, product) => sum + Number(product.estoque || 0), 0),
    pedidos: state.db.orders.length,
    faturamento: state.db.orders.reduce((sum, order) => sum + Number(order.total || 0), 0),
  };
}

function getGeneralOrders() {
  return deepClone(state.db.orders)
    .sort((a, b) => b.id - a.id)
    .map((order) => {
      const user = state.db.users.find((item) => item.id === order.usuario_id);
      return {
        ...order,
        nome: user?.nome || 'Usuário removido',
        usuario: user?.usuario || '-',
      };
    });
}

function getClientOrders(userId) {
  return deepClone(state.db.orders)
    .filter((order) => order.usuario_id === userId)
    .sort((a, b) => b.id - a.id);
}

function getOrderItems(orderId) {
  return deepClone(state.db.orderItems)
    .filter((item) => item.pedido_id === Number(orderId))
    .sort((a, b) => a.id - b.id);
}

function clearProductForm() {
  state.selectedProductId = null;
  elements.adminNome.value = '';
  elements.adminPreco.value = '';
  elements.adminCategoria.value = '';
  elements.adminEstoque.value = '';
  elements.adminDescricao.value = '';
  renderAdminProductsTable();
}

function openModal({ title, subtitle = '', body = '', narrow = false, actions = [] }) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';

  const card = document.createElement('div');
  card.className = `modal-card ${narrow ? 'narrow' : ''}`;
  card.innerHTML = `
    <div class="modal-head">
      <div>
        <h2>${escapeHtml(title)}</h2>
        ${subtitle ? `<p>${escapeHtml(subtitle)}</p>` : ''}
      </div>
      <button class="modal-close" type="button" aria-label="Fechar">✕</button>
    </div>
    <div class="modal-body">${body}</div>
    <div class="modal-actions"></div>
  `;

  const close = () => overlay.remove();

  card.querySelector('.modal-close').addEventListener('click', close);
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) close();
  });

  const actionsEl = card.querySelector('.modal-actions');
  actions.forEach((action) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `btn ${action.variant || 'btn-ghost'}`;
    button.textContent = action.label;
    button.addEventListener('click', () => {
      action.onClick?.();
      if (!action.keepOpen) close();
    });
    actionsEl.appendChild(button);
  });

  if (!actions.length) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn btn-primary';
    button.textContent = 'Fechar';
    button.addEventListener('click', close);
    actionsEl.appendChild(button);
  }

  overlay.appendChild(card);
  elements.modalRoot.innerHTML = '';
  elements.modalRoot.appendChild(overlay);
}

function confirmAction({ title, subtitle, onConfirm }) {
  openModal({
    title,
    subtitle,
    narrow: true,
    body: '<p class="muted-note">Confirme a ação para continuar.</p>',
    actions: [
      { label: 'Cancelar', variant: 'btn-ghost' },
      { label: 'Confirmar', variant: 'btn-danger', onClick: onConfirm },
    ],
  });
}

function fillProductForm(productId) {
  const product = getProductById(productId);
  if (!product) return;

  state.selectedProductId = product.id;
  elements.adminNome.value = product.nome;
  elements.adminPreco.value = String(product.preco);
  elements.adminCategoria.value = product.categoria;
  elements.adminEstoque.value = String(product.estoque);
  elements.adminDescricao.value = product.descricao || '';
  renderAdminProductsTable();
}

function validateProductForm() {
  const nome = elements.adminNome.value.trim();
  const precoText = elements.adminPreco.value.trim().replace(',', '.');
  const categoria = elements.adminCategoria.value.trim();
  const estoqueText = elements.adminEstoque.value.trim();
  const descricao = elements.adminDescricao.value.trim();

  if (!nome || !precoText || !categoria || !estoqueText) {
    throw new Error('Preencha nome, preço, categoria e estoque.');
  }

  const preco = Number(precoText);
  const estoque = Number(estoqueText);

  if (!Number.isFinite(preco) || !Number.isInteger(estoque)) {
    throw new Error('Preço ou estoque em formato inválido.');
  }

  if (preco < 0 || estoque < 0) {
    throw new Error('Preço e estoque devem ser maiores ou iguais a zero.');
  }

  return { nome, preco, categoria, estoque, descricao };
}

function renderAdminSummary() {
  const resumo = getAdminSummary();
  elements.adminSummary.innerHTML = `
    <article class="summary-card blue"><small>Produtos cadastrados</small><strong>${resumo.produtos}</strong></article>
    <article class="summary-card green"><small>Itens em estoque</small><strong>${resumo.estoque}</strong></article>
    <article class="summary-card orange"><small>Pedidos realizados</small><strong>${resumo.pedidos}</strong></article>
    <article class="summary-card red"><small>Faturamento</small><strong>${formatCurrency.format(resumo.faturamento)}</strong></article>
  `;
}

function renderAdminProductsTable() {
  const products = searchProducts();
  elements.adminProductsBody.innerHTML = '';

  products.forEach((product) => {
    const row = document.createElement('tr');
    row.dataset.id = String(product.id);
    row.classList.toggle('selected', state.selectedProductId === product.id);
    row.innerHTML = `
      <td>${product.id}</td>
      <td>${escapeHtml(product.nome)}</td>
      <td>${escapeHtml(product.categoria)}</td>
      <td>${formatCurrency.format(product.preco)}</td>
      <td>${product.estoque}</td>
    `;
    row.addEventListener('click', () => fillProductForm(product.id));
    elements.adminProductsBody.appendChild(row);
  });
}

function renderAdminOrdersTable() {
  const orders = getGeneralOrders();
  elements.adminOrdersBody.innerHTML = '';

  orders.forEach((order) => {
    const row = document.createElement('tr');
    row.dataset.id = String(order.id);
    row.classList.toggle('selected', state.selectedOrderId === order.id);
    row.innerHTML = `
      <td>${order.id}</td>
      <td>${escapeHtml(order.nome)}</td>
      <td>${escapeHtml(order.usuario)}</td>
      <td>${formatCurrency.format(order.total)}</td>
      <td>${escapeHtml(order.status)}</td>
      <td>${escapeHtml(order.criado_em)}</td>
    `;
    row.addEventListener('click', () => {
      state.selectedOrderId = order.id;
      renderAdminOrdersTable();
    });
    elements.adminOrdersBody.appendChild(row);
  });
}

function renderAdmin() {
  if (!state.currentUser) return;

  const perfil = state.currentUser.perfil.charAt(0).toUpperCase() + state.currentUser.perfil.slice(1);
  elements.adminTitle.textContent = `Painel administrativo • ${perfil}`;
  elements.adminSubtitle.textContent = `Bem-vindo, ${currentUserName()}. Gerencie catálogo, estoque e pedidos em um só lugar.`;

  renderAdminSummary();
  renderAdminProductsTable();
  renderAdminOrdersTable();
  updateAdminTabs();
}

function updateAdminTabs() {
  const isProducts = state.adminTab === 'products';
  elements.adminProductsTab.classList.toggle('hidden', !isProducts);
  elements.adminOrdersTab.classList.toggle('hidden', isProducts);
  elements.adminProductsTab.classList.toggle('active', isProducts);
  elements.adminOrdersTab.classList.toggle('active', !isProducts);
  elements.adminTabButtons.forEach((button) => {
    button.classList.toggle('active', button.dataset.adminTab === state.adminTab);
  });
}

function setAdminTab(tab) {
  state.adminTab = tab;
  updateAdminTabs();
}

function renderClientFilters() {
  const previousCategory = elements.clientCategory.value || 'Todas';
  const options = ['Todas', ...getCategories()];
  elements.clientCategory.innerHTML = options
    .map((category) => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`)
    .join('');
  elements.clientCategory.value = options.includes(previousCategory) ? previousCategory : 'Todas';
}

function renderCatalog() {
  const search = elements.clientSearch.value || '';
  const category = elements.clientCategory.value || 'Todas';
  const products = searchProducts(search, category);

  if (!products.length) {
    elements.catalogGrid.innerHTML = `
      <article class="empty-card">
        <h3>Nenhum produto encontrado</h3>
        <p>Tente outro termo de busca ou selecione uma categoria diferente.</p>
      </article>
    `;
    return;
  }

  elements.catalogGrid.innerHTML = products
    .map((product) => {
      const disabled = product.estoque === 0;
      return `
        <article class="product-card">
          <div class="product-top">
            <span class="category-pill">${escapeHtml(product.categoria)}</span>
            <span class="stock-pill ${disabled ? 'zero' : 'ok'}">Estoque: ${product.estoque}</span>
          </div>
          <h3>${escapeHtml(product.nome)}</h3>
          <p>${escapeHtml(product.descricao || '')}</p>
          <div class="product-price">${formatCurrency.format(product.preco)}</div>
          <div class="product-footer">
            <input class="qty-input" data-qty-for="${product.id}" type="number" min="1" step="1" value="1" max="${Math.max(1, product.estoque)}" ${disabled ? 'disabled' : ''} />
            <button class="btn btn-primary add-to-cart" type="button" data-product-id="${product.id}" ${disabled ? 'disabled' : ''}>Adicionar ao carrinho</button>
          </div>
        </article>
      `;
    })
    .join('');

  elements.catalogGrid.querySelectorAll('.add-to-cart').forEach((button) => {
    button.addEventListener('click', () => {
      const productId = Number(button.dataset.productId);
      const input = elements.catalogGrid.querySelector(`[data-qty-for="${productId}"]`);
      addToCart(productId, input?.value);
    });
  });
}

function renderCart() {
  const cartEntries = Object.entries(state.cart)
    .map(([productId, item]) => ({ productId: Number(productId), quantidade: Number(item.quantidade || 0) }))
    .filter((item) => getProductById(item.productId));

  if (!cartEntries.length) {
    elements.cartContent.innerHTML = `
      <article class="empty-card">
        <h3>Carrinho vazio</h3>
        <p>Adicione produtos do catálogo para começar sua compra.</p>
      </article>
    `;
    return;
  }

  let total = 0;
  let itens = 0;
  const itemsHtml = cartEntries
    .map((entry) => {
      const product = getProductById(entry.productId);
      const subtotal = product.preco * entry.quantidade;
      total += subtotal;
      itens += entry.quantidade;
      return `
        <article class="cart-item">
          <h4>${escapeHtml(product.nome)}</h4>
          <p>Qtd: ${entry.quantidade} • Subtotal: ${formatCurrency.format(subtotal)}</p>
          <button class="btn btn-soft-danger remove-cart-item" type="button" data-remove-id="${product.id}">Remover</button>
        </article>
      `;
    })
    .join('');

  elements.cartContent.innerHTML = `
    ${itemsHtml}
    <div class="cart-summary">
      <strong>Total: ${formatCurrency.format(total)}</strong>
      <span>Itens: ${itens}</span>
    </div>
  `;

  elements.cartContent.querySelectorAll('.remove-cart-item').forEach((button) => {
    button.addEventListener('click', () => removeFromCart(Number(button.dataset.removeId)));
  });
}

function renderClient() {
  if (!state.currentUser) return;
  elements.clientSubtitle.textContent = `Olá, ${currentUserName()}. Explore os produtos, monte o carrinho e acompanhe seus pedidos.`;
  renderClientFilters();
  renderCatalog();
  renderCart();
}

function showOrderItemsModal(orderId, title = `Pedido #${orderId}`) {
  const items = getOrderItems(orderId);
  if (!items.length) {
    notify('Pedidos', 'Esse pedido não possui itens.', 'warning');
    return;
  }

  const body = `
    <div class="modal-list">
      ${items
        .map(
          (item) => `
            <div class="modal-line">
              • ${escapeHtml(item.nome_produto)} | Qtd: ${item.quantidade} | Unit.: ${formatCurrency.format(item.preco_unitario)} | Subtotal: ${formatCurrency.format(item.subtotal)}
            </div>
          `,
        )
        .join('')}
    </div>
  `;

  openModal({
    title,
    subtitle: 'Detalhes dos produtos comprados',
    body,
  });
}

function showClientOrdersModal() {
  const orders = getClientOrders(state.currentUser.id);
  const body = orders.length
    ? orders
        .map((order) => {
          const items = getOrderItems(order.id)
            .map(
              (item) => `<div class="order-item">- ${escapeHtml(item.nome_produto)} | ${item.quantidade}x | ${formatCurrency.format(item.subtotal)}</div>`,
            )
            .join('');
          return `
            <article class="order-card">
              <h3>Pedido #${order.id}</h3>
              <div class="order-meta">Data: ${escapeHtml(order.criado_em)} • Status: ${escapeHtml(order.status)} • Total: ${formatCurrency.format(order.total)}</div>
              ${items}
            </article>
          `;
        })
        .join('')
    : '<article class="order-card"><div class="order-meta">Você ainda não realizou nenhuma compra.</div></article>';

  openModal({
    title: 'Histórico de pedidos',
    subtitle: 'Confira as compras feitas nesta conta.',
    body,
  });
}

async function handleLogin(event) {
  event.preventDefault();
  const usuario = elements.loginUsuario.value.trim();
  const senha = elements.loginSenha.value.trim();

  if (!usuario || !senha) {
    notify('Atenção', 'Preencha usuário e senha.', 'warning');
    return;
  }

  const senhaHash = await sha256(senha);
  const user = state.db.users.find((item) => item.usuario === usuario && item.senha === senhaHash);

  if (!user) {
    notify('Login', 'Usuário ou senha inválidos.', 'error');
    return;
  }

  state.currentUser = user;
  state.cart = {};
  state.selectedProductId = null;
  state.selectedOrderId = null;
  saveSession();
  renderApp();
}

async function handleRegister(event) {
  event.preventDefault();
  const nome = elements.cadNome.value.trim();
  const usuario = elements.cadUsuario.value.trim();
  const senha = elements.cadSenha.value.trim();

  if (!nome || !usuario || !senha) {
    notify('Cadastro', 'Preencha todos os campos para criar a conta.', 'warning');
    return;
  }

  if (state.db.users.some((user) => user.usuario.toLowerCase() === usuario.toLowerCase())) {
    notify('Cadastro', 'Esse nome de usuário já está em uso.', 'error');
    return;
  }

  const senhaHash = await sha256(senha);
  const newUser = {
    id: nextId('lastUserId'),
    nome,
    usuario,
    senha: senhaHash,
    perfil: 'cliente',
  };

  state.db.users.push(newUser);
  saveDatabase();
  elements.cadNome.value = '';
  elements.cadUsuario.value = '';
  elements.cadSenha.value = '';
  notify('Cadastro', 'Conta criada com sucesso!', 'success');
}

function logout() {
  state.currentUser = null;
  state.cart = {};
  state.selectedProductId = null;
  state.selectedOrderId = null;
  saveSession();
  renderApp();
}

function saveNewProduct() {
  try {
    const product = validateProductForm();
    state.db.products.push({ id: nextId('lastProductId'), ...product });
    saveDatabase();
    clearProductForm();
    renderAdmin();
    notify('Produto', 'Produto cadastrado com sucesso.', 'success');
  } catch (error) {
    notify('Produto', error.message, 'error');
  }
}

function updateProduct() {
  if (!state.selectedProductId) {
    notify('Produto', 'Selecione um produto para atualizar.', 'warning');
    return;
  }

  try {
    const productData = validateProductForm();
    const product = getProductById(state.selectedProductId);
    Object.assign(product, productData);
    saveDatabase();
    clearProductForm();
    renderAdmin();
    notify('Produto', 'Produto atualizado com sucesso.', 'success');
  } catch (error) {
    notify('Produto', error.message, 'error');
  }
}

function removeProduct() {
  if (!state.selectedProductId) {
    notify('Produto', 'Selecione um produto para remover.', 'warning');
    return;
  }

  confirmAction({
    title: 'Excluir',
    subtitle: 'Deseja remover o produto selecionado?',
    onConfirm: () => {
      state.db.products = state.db.products.filter((product) => product.id !== state.selectedProductId);
      saveDatabase();
      clearProductForm();
      renderAdmin();
      notify('Produto', 'Produto removido com sucesso.', 'success');
    },
  });
}

function addToCart(productId, quantityValue) {
  const product = getProductById(productId);
  if (!product) {
    notify('Carrinho', 'Produto não encontrado.', 'error');
    return;
  }

  let quantity = Number(quantityValue);
  if (!Number.isInteger(quantity)) quantity = 1;

  if (quantity <= 0) {
    notify('Carrinho', 'A quantidade deve ser maior que zero.', 'warning');
    return;
  }

  if (quantity > product.estoque) {
    notify('Carrinho', 'Quantidade maior que o estoque disponível.', 'error');
    return;
  }

  const current = Number(state.cart[productId]?.quantidade || 0);
  if (current + quantity > product.estoque) {
    notify('Carrinho', 'A soma no carrinho ultrapassa o estoque disponível.', 'error');
    return;
  }

  state.cart[productId] = {
    produtoId: productId,
    quantidade: current + quantity,
  };

  saveSession();
  renderCart();
  notify('Carrinho', `${product.nome} adicionado ao carrinho.`, 'success');
}

function removeFromCart(productId) {
  delete state.cart[productId];
  saveSession();
  renderCart();
}

function finalizePurchase() {
  if (!Object.keys(state.cart).length) {
    notify('Compra', 'Seu carrinho está vazio.', 'warning');
    return;
  }

  const updatedProducts = [];
  let total = 0;

  for (const [productIdText, item] of Object.entries(state.cart)) {
    const productId = Number(productIdText);
    const product = getProductById(productId);
    if (!product) {
      notify('Compra', `Produto ID ${productId} não encontrado.`, 'error');
      return;
    }

    if (item.quantidade > product.estoque) {
      notify('Compra', `Estoque insuficiente para ${product.nome}.`, 'error');
      return;
    }

    const subtotal = item.quantidade * product.preco;
    total += subtotal;
    updatedProducts.push({ product, quantidade: item.quantidade, subtotal });
  }

  const orderId = nextId('lastOrderId');
  const order = {
    id: orderId,
    usuario_id: state.currentUser.id,
    total,
    status: 'Pago',
    criado_em: formatDateTime(new Date()),
  };
  state.db.orders.push(order);

  updatedProducts.forEach(({ product, quantidade, subtotal }) => {
    state.db.orderItems.push({
      id: nextId('lastOrderItemId'),
      pedido_id: orderId,
      produto_id: product.id,
      nome_produto: product.nome,
      quantidade,
      preco_unitario: product.preco,
      subtotal,
    });
    product.estoque -= quantidade;
  });

  state.cart = {};
  saveDatabase();
  saveSession();
  renderClient();
  notify('Compra finalizada', `Pedido #${orderId} finalizado com sucesso!`, 'success');
}

function renderApp() {
  if (!state.currentUser) {
    showScreen('auth');
    elements.loginSenha.value = '';
    return;
  }

  if (['dono', 'funcionario'].includes(state.currentUser.perfil)) {
    showScreen('admin');
    renderAdmin();
    return;
  }

  showScreen('client');
  renderClient();
}

function bindEvents() {
  elements.loginForm.addEventListener('submit', handleLogin);
  elements.registerForm.addEventListener('submit', handleRegister);
  elements.adminLogout.addEventListener('click', logout);
  elements.clientLogout.addEventListener('click', logout);

  elements.btnNovoProduto.addEventListener('click', saveNewProduct);
  elements.btnAtualizarProduto.addEventListener('click', updateProduct);
  elements.btnRemoverProduto.addEventListener('click', removeProduct);
  elements.btnLimparForm.addEventListener('click', clearProductForm);
  elements.btnVerItensPedido.addEventListener('click', () => {
    if (!state.selectedOrderId) {
      notify('Pedidos', 'Selecione um pedido para visualizar os itens.', 'warning');
      return;
    }
    showOrderItemsModal(state.selectedOrderId, `Itens do pedido #${state.selectedOrderId}`);
  });

  elements.adminTabButtons.forEach((button) => {
    button.addEventListener('click', () => setAdminTab(button.dataset.adminTab));
  });

  elements.clientSearch.addEventListener('input', renderCatalog);
  elements.clientCategory.addEventListener('change', renderCatalog);
  elements.btnClientOrdersTop.addEventListener('click', showClientOrdersModal);
  elements.btnClientOrdersSide.addEventListener('click', showClientOrdersModal);
  elements.btnClientCheckoutTop.addEventListener('click', finalizePurchase);
  elements.btnClientCheckoutSide.addEventListener('click', finalizePurchase);
}

(async function init() {
  await ensureDatabase();
  restoreSession();
  bindEvents();
  renderApp();
})();
