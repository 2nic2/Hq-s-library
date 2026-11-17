// Querida Nick, esse é o ínicio das minhas alterações, basicamente eu criei o banco de dados no firebase pra vc, estou usando um meu pra testar, mas depois a gente cria o seu junto ok?
// Notei que o gemini não tinha errado, ele só tinha programado o save no cache do navegador, aí eu adicionei mais uns métodos pra enviar diretamente para um banco de dados na nuvem que eu tenho
// Basicamente sempre que a senhora salvar um novo quadrinho, ele vai fazer o upload no banco de dados e aí deve funcionar em qualquer plataforma

// ==========================================================================
// CONFIGURAÇÃO DO SEU PROJETO FIREBASE (hq-s-library-b1b4a)
// ==========================================================================
const firebaseConfig = {
  apiKey: "AIzaSyBv2HVoKH8zGMZRm8AB_xyx2mNfIPC_dao",
  authDomain: "hq-s-library-b1b4a.firebaseapp.com",
  projectId: "hq-s-library-b1b4a",
  storageBucket: "hq-s-library-b1b4a.firebasestorage.app",
  messagingSenderId: "934974664094",
  appId: "1:934974664094:web:cfa6937c4bf6e80f293a8f"
};

// Inicializa o Firebase e a base de dados Firestore
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Habilita persistência offline automática no celular e PC
db.enablePersistence().catch(err => {
  console.log("Aviso de persistência offline:", err.code);
});

// ==========================================================================
// 1. ESTADO GLOBAL E ARMAZENAMENTO
// ==========================================================================
// Carrega do cache local primeiro para carregar rápido
let colecao = JSON.parse(localStorage.getItem('comic_vault_colecao')) || [];
let rankings = JSON.parse(localStorage.getItem('comic_vault_rankings')) || [];
let html5QrCode = null;
let currentFontScale = parseInt(localStorage.getItem('hq-font-scale')) || 100;

// Sincroniza a COLEÇÃO com a nuvem em tempo real
db.collection('banco_dados').doc('colecao').onSnapshot((doc) => {
  if (doc.exists) {
    colecao = doc.data().itens || [];
    localStorage.setItem('comic_vault_colecao', JSON.stringify(colecao));
    atualizarTodosOsFiltros();
    // Atualiza a tela se estiver na aba da coleção
    if (document.getElementById('tab-colecao').classList.contains('active')) {
      exibirQuadrinhos();
    }
  }
});

// Sincroniza os RANKINGS com a nuvem em tempo real
db.collection('banco_dados').doc('rankings').onSnapshot((doc) => {
  if (doc.exists) {
    rankings = doc.data().itens || [];
    localStorage.setItem('comic_vault_rankings', JSON.stringify(rankings));
    atualizarFiltroPersonagensRanking();
    // Atualiza a tela se estiver na aba de ranking
    if (document.getElementById('tab-ranking').classList.contains('active')) {
      exibirRanking();
    }
  }
});

// Função atualizada para salvar no Firebase e no cache local ao mesmo tempo
function salvarDadosLocais() {
  // Salva no cache local
  localStorage.setItem('comic_vault_colecao', JSON.stringify(colecao));
  localStorage.setItem('comic_vault_rankings', JSON.stringify(rankings));
  
  // Envia para o banco de dados na nuvem (Firebase)
  db.collection('banco_dados').doc('colecao').set({ itens: colecao })
    .catch(err => console.error("Erro ao salvar coleção na nuvem:", err));
    
  db.collection('banco_dados').doc('rankings').set({ itens: rankings })
    .catch(err => console.error("Erro ao salvar rankings na nuvem:", err));
}

function normalizarTexto(texto) {
  if (!texto) return '';
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/-/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// ==========================================================================
// 2. MENU LATERAL E ACESSIBILIDADE VISUAL (TEMA, TAMANHO DAS LETRAS, CONTRASTE)
// ==========================================================================
function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  if (sidebar && overlay) {
    sidebar.classList.toggle('open');
    overlay.classList.toggle('active');
  }
}

function toggleA11yMenu() {
  const panel = document.getElementById('a11y-panel');
  if (panel) panel.classList.toggle('open');
}

function setTheme(theme) {
  const body = document.body;
  const btnDark = document.getElementById('btn-theme-dark');
  const btnLight = document.getElementById('btn-theme-light');

  if (theme === 'light') {
    body.classList.add('light-mode');
    if (btnLight) btnLight.classList.add('active');
    if (btnDark) btnDark.classList.remove('active');
  } else {
    body.classList.remove('light-mode');
    if (btnDark) btnDark.classList.add('active');
    if (btnLight) btnLight.classList.remove('active');
  }

  localStorage.setItem('hq-theme', theme);
}

function changeFontSize(step) {
  if (step === 0) {
    currentFontScale = 100;
  } else {
    currentFontScale = Math.min(135, Math.max(80, currentFontScale + step * 5));
  }
  document.documentElement.style.fontSize = (16 * (currentFontScale / 100)) + 'px';
  const label = document.getElementById('font-scale-label');
  if (label) label.textContent = currentFontScale + '%';
  localStorage.setItem('hq-font-scale', currentFontScale);
}

function toggleHighContrast() {
  const body = document.body;
  const btn = document.getElementById('btn-high-contrast');
  body.classList.toggle('high-contrast');
  const isHC = body.classList.contains('high-contrast');
  if (btn) btn.classList.toggle('active', isHC);
  localStorage.setItem('hq-high-contrast', isHC ? '1' : '0');
}

document.addEventListener('click', (e) => {
  const panel = document.getElementById('a11y-panel');
  const btn = document.querySelector('.a11y-toggle-btn');
  if (panel && panel.classList.contains('open') && !panel.contains(e.target) && !btn.contains(e.target)) {
    panel.classList.remove('open');
  }
});

// ==========================================================================
// 3. NAVEGAÇÃO ENTRE ABAS
// ==========================================================================
function trocarAba(aba) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));

  const tabAlvo = document.getElementById(`tab-${aba}`);
  const btnAlvo = document.getElementById(`btn-tab-${aba}`);

  if (tabAlvo) tabAlvo.classList.add('active');
  if (btnAlvo) btnAlvo.classList.add('active');

  atualizarTodosOsFiltros();

  if (aba === 'colecao') exibirQuadrinhos();
  else if (aba === 'cronologia') exibirCronologia();
  else if (aba === 'subtitulos') exibirSubtitulos();
  else if (aba === 'ranking') exibirRanking();
  else if (aba === 'financeiro') exibirDetalhamentoFinanceiro();
}

// ==========================================================================
// 4. LEITOR DE CÓDIGO DE BARRAS (ISBN)
// ==========================================================================
function iniciarLeitorCodigoBarras() {
  const readerEl = document.getElementById('barcode-reader');
  const btnScan = document.getElementById('btn-scan-barcode');
  const btnStop = document.getElementById('btn-stop-barcode');

  if (!window.Html5Qrcode) {
    alert('Biblioteca de scanner ainda carregando. Tente novamente em 2 segundos.');
    return;
  }

  readerEl.style.display = 'block';
  btnScan.style.display = 'none';
  btnStop.style.display = 'block';

  html5QrCode = new Html5Qrcode('barcode-reader');
  html5QrCode.start(
    { facingMode: 'environment' },
    { fps: 10, qrbox: { width: 250, height: 120 } },
    async (decodedText) => {
      pararLeitorCodigoBarras();
      await buscarDadosPorISBN(decodedText);
    }
  ).catch(err => {
    alert('Não foi possível acessar a câmera: ' + err);
    pararLeitorCodigoBarras();
  });
}

function pararLeitorCodigoBarras() {
  const readerEl = document.getElementById('barcode-reader');
  const btnScan = document.getElementById('btn-scan-barcode');
  const btnStop = document.getElementById('btn-stop-barcode');

  if (html5QrCode) {
    html5QrCode.stop().then(() => {
      html5QrCode.clear();
      html5QrCode = null;
    }).catch(() => {});
  }
  if (readerEl) readerEl.style.display = 'none';
  if (btnScan) btnScan.style.display = 'block';
  if (btnStop) btnStop.style.display = 'none';
}

async function buscarDadosPorISBN(isbn) {
  try {
    const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`);
    const data = await res.json();
    if (data.items && data.items.length > 0) {
      const info = data.items[0].volumeInfo;
      document.getElementById('title').value = info.title || '';
      document.getElementById('writer').value = info.authors ? info.authors.join(', ') : '';
      document.getElementById('original-publisher').value = info.publisher || '';
      if (info.publishedDate) document.getElementById('year').value = info.publishedDate.substring(0, 4);
      if (info.pageCount) document.getElementById('total-pages').value = info.pageCount;
      if (info.imageLinks && info.imageLinks.thumbnail) {
        document.getElementById('cover').value = info.imageLinks.thumbnail.replace('http://', 'https://');
      }
      alert('Dados da HQ preenchidos via ISBN!');
    } else {
      alert(`ISBN ${isbn} lido, mas nenhum registro automático foi encontrado.`);
    }
  } catch (e) {
    alert('Erro ao consultar ISBN: ' + e.message);
  }
}

// ==========================================================================
// 5. CADASTRO, REORDENAÇÃO E EDIÇÃO DE QUADRINHOS
// ==========================================================================
function reordenarCronologiaLocal(personagem, ordemInserida, idHQAtual = null) {
  if (!personagem || !ordemInserida) return;
  const normPersonagem = normalizarTexto(personagem);

  colecao.forEach(hq => {
    if (idHQAtual && Number(hq.id) === Number(idHQAtual)) return;
    const mesmoPersonagem = normalizarTexto(hq.personagem) === normPersonagem;
    const ordemExistente = parseInt(hq.ordemLeitura);
    if (mesmoPersonagem && !isNaN(ordemExistente) && ordemExistente >= ordemInserida) {
      hq.ordemLeitura = ordemExistente + 1;
    }
  });
}

document.getElementById('comic-form').addEventListener('submit', function (e) {
  e.preventDefault();

  const titulo = document.getElementById('title').value.trim();
  if (!titulo) return;

  const personagem = document.getElementById('character').value.trim() || 'Sem Personagem';
  const ordemLeitura = parseInt(document.getElementById('reading-order').value) || null;
  const statusLeitura = document.getElementById('read-status').value;
  const totalPaginas = parseInt(document.getElementById('total-pages').value) || 0;
  let paginasLidas = parseInt(document.getElementById('pages-read').value) || 0;

  if (statusLeitura === 'Já Lido' && totalPaginas > 0 && paginasLidas === 0) {
    paginasLidas = totalPaginas;
  }

  if (ordemLeitura) {
    reordenarCronologiaLocal(personagem, ordemLeitura);
  }

  const novaHQ = {
    id: Date.now(),
    titulo,
    capa: document.getElementById('cover').value.trim(),
    personagem,
    escritor: document.getElementById('writer').value.trim() || 'N/I',
    editoraPublicacao: document.getElementById('original-publisher').value.trim() || 'N/I',
    editora: document.getElementById('publisher').value,
    posse: document.getElementById('ownership').value,
    statusLeitura,
    ano: document.getElementById('year').value || 'N/I',
    anoLido: document.getElementById('read-year').value || 'N/I',
    nota: parseFloat(document.getElementById('rating').value) || 0,
    ordemLeitura,
    totalPaginas,
    paginasLidas,
    precoCapa: parseFloat(document.getElementById('cover-price').value) || 0,
    precoPago: parseFloat(document.getElementById('paid-price').value) || 0,
    historiasInclusas: document.getElementById('included-content').value.trim(),
    resenha: document.getElementById('review').value.trim(),
    historicoLeituras: [],
    vezesLido: statusLeitura === 'Já Lido' ? 1 : 0
  };

  colecao.push(novaHQ);
  salvarDadosLocais();
  this.reset();
  atualizarTodosOsFiltros();
  alert('HQ registrada com sucesso!');
});

// ==========================================================================
// 6. EXIBIÇÃO DA ESTANTE E ESTATÍSTICAS
// ==========================================================================
function atualizarEstatisticas() {
  const total = colecao.length;
  const lendo = colecao.filter(c => c.statusLeitura === 'Lendo' || c.statusLeitura === 'Releitura').length;
  const lidos = colecao.filter(c => c.statusLeitura === 'Já Lido').length;
  const queroLer = colecao.filter(c => c.statusLeitura === 'Quero Ler').length;

  let paginasLidas = 0;
  let paginasTotais = 0;
  colecao.forEach(c => {
    paginasLidas += Number(c.paginasLidas) || 0;
    paginasTotais += Number(c.totalPaginas) || 0;
  });

  const perc = paginasTotais > 0 ? Math.round((paginasLidas / paginasTotais) * 100) : 0;

  document.getElementById('stat-total').textContent = total;
  document.getElementById('stat-reading').textContent = lendo;
  document.getElementById('stat-read').textContent = lidos;
  document.getElementById('stat-want').textContent = queroLer;
  document.getElementById('stat-pages-total').textContent = paginasLidas;
  document.getElementById('stat-percent-global').textContent = perc + '%';
}

function exibirQuadrinhos() {
  atualizarEstatisticas();
  const grid = document.getElementById('comic-list');
  const termo = normalizarTexto(document.getElementById('search-input')?.value || '');
  if (!grid) return;

  grid.innerHTML = '';

  const filtrados = colecao.filter(c => {
    if (!termo) return true;
    const alvo = normalizarTexto(`${c.titulo} ${c.personagem} ${c.escritor} ${c.editoraPublicacao} ${c.historiasInclusas}`);
    return alvo.includes(termo);
  });

  if (filtrados.length === 0) {
    grid.innerHTML = '<div class="empty-state" style="width: 100%;">Nenhuma HQ encontrada na estante.</div>';
    return;
  }

  filtrados.forEach(hq => {
    const spine = document.createElement('div');
    spine.className = 'comic-card-spine';
    spine.setAttribute('data-editora', hq.editora || 'Outros');
    spine.title = `${hq.titulo} (${hq.personagem})`;
    spine.onclick = () => abrirDetalhesQuadrinho(hq.id);
    spine.innerHTML = `<span class="spine-title">${hq.titulo}</span>`;
    grid.appendChild(spine);
  });
}

document.getElementById('search-input')?.addEventListener('input', exibirQuadrinhos);

// ==========================================================================
// 7. MODAL DE DETALHES, PROGRESSO E EDIÇÃO (COM MODO RELEITURA)
// ==========================================================================
function abrirDetalhesQuadrinho(id) {
  const q = colecao.find(item => Number(item.id) === Number(id));
  if (!q) return;

  const modal = document.getElementById('detail-modal');
  const body = document.getElementById('detail-modal-body');

  const perc = q.totalPaginas > 0 ? Math.min(100, Math.round((q.paginasLidas / q.totalPaginas) * 100)) : 0;
  const capaHTML = q.capa
    ? `<img src="${q.capa}" alt="${q.titulo}" style="width:120px; height:180px; object-fit:cover; border-radius:4px; border:1px solid var(--border-color);">`
    : '';

  const badgeReleitura = (q.vezesLido && q.vezesLido > 1)
    ? `<span style="background:var(--accent-color); color:#fff; padding:2px 6px; border-radius:3px; font-size:0.7rem; font-family:monospace; margin-left:6px;">LIDO ${q.vezesLido}x</span>`
    : '';

  let historicoHTML = '';
  if (q.historicoLeituras && q.historicoLeituras.length > 0) {
    historicoHTML = `<div style="margin-top:12px; padding:10px; background:var(--bg-input); border-radius:4px; border-left:3px solid var(--accent-color); font-size:0.8rem;">
      <strong>HISTÓRICO DE LEITURAS:</strong>
      ${q.historicoLeituras.map(h => `<div style="margin-top:4px; color:var(--text-muted);">• ${h.data} — Nota: ${h.nota || 'N/I'} ${h.resenha ? `("${h.resenha}")` : ''}</div>`).join('')}
    </div>`;
  }

  body.innerHTML = `
    <div style="display:flex; gap:16px; align-items:flex-start; margin-bottom:14px;">
      ${capaHTML}
      <div style="flex:1;">
        <h3 style="color:var(--text-title); margin-bottom:6px;">${q.titulo} ${badgeReleitura}</h3>
        <p style="font-size:0.82rem; margin-bottom:4px;"><strong>Personagem:</strong> ${q.personagem}</p>
        <p style="font-size:0.82rem; margin-bottom:4px;"><strong>Escritor:</strong> ${q.escritor}</p>
        <p style="font-size:0.82rem; margin-bottom:4px;"><strong>Editora:</strong> ${q.editora} (${q.editoraPublicacao})</p>
        <p style="font-size:0.82rem; margin-bottom:4px;"><strong>Status:</strong> ${q.statusLeitura} | <strong>Posse:</strong> ${q.posse}</p>
        <p style="font-size:0.82rem;"><strong>Nota:</strong> ${q.nota > 0 ? q.nota + ' / 5' : 'Sem nota'}</p>
      </div>
    </div>

    ${q.totalPaginas > 0 ? `
      <div style="margin-bottom:12px;">
        <div style="display:flex; justify-content:space-between; font-size:0.78rem; font-family:monospace; margin-bottom:4px;">
          <span>PROGRESSO</span>
          <span>${q.paginasLidas}/${q.totalPaginas} págs (${perc}%)</span>
        </div>
        <div style="background:var(--bg-input); height:8px; border-radius:4px; overflow:hidden; border:1px solid var(--border-color);">
          <div style="width:${perc}%; height:100%; background:var(--accent-color);"></div>
        </div>
      </div>
    ` : ''}

    ${q.historiasInclusas ? `<p style="font-size:0.82rem; margin-bottom:8px;"><strong>Conteúdo:</strong> ${q.historiasInclusas}</p>` : ''}
    ${q.resenha ? `<div style="padding:10px; background:var(--bg-input); border-radius:4px; font-size:0.82rem; font-style:italic;">"${q.resenha}"</div>` : ''}
    ${historicoHTML}

    <div style="display:flex; gap:8px; margin-top:16px;">
      <button type="button" class="btn-tech action-btn-progress" style="flex:1;" onclick="atualizarPaginasLidas(${q.id})">PÁGINAS</button>
      <button type="button" class="btn-tech action-btn-edit" style="flex:1;" onclick="abrirModalEdicao(${q.id})">EDITAR</button>
      <button type="button" class="btn-tech action-btn-delete" style="flex:1;" onclick="apagarQuadrinho(${q.id})">EXCLUIR</button>
    </div>
  `;

  modal.classList.add('active');
}

function fecharModalDetalhes() {
  document.getElementById('detail-modal')?.classList.remove('active');
}

function atualizarPaginasLidas(id) {
  const q = colecao.find(item => Number(item.id) === Number(id));
  if (!q) return;

  const novaPagina = prompt(`Em qual página você está? (Total: ${q.totalPaginas || 'não informado'})`, q.paginasLidas || 0);
  if (novaPagina === null) return;

  const num = parseInt(novaPagina);
  if (isNaN(num) || num < 0) return;

  q.paginasLidas = num;
  if (q.totalPaginas > 0 && num >= q.totalPaginas) {
    q.paginasLidas = q.totalPaginas;
    if (q.statusLeitura === 'Releitura') {
      q.vezesLido = (q.vezesLido || 1) + 1;
    } else {
      q.vezesLido = Math.max(1, q.vezesLido || 1);
    }
    q.statusLeitura = 'Já Lido';
  }

  salvarDadosLocais();
  abrirDetalhesQuadrinho(id);
  exibirQuadrinhos();
}

function abrirModalEdicao(id) {
  const q = colecao.find(item => Number(item.id) === Number(id));
  if (!q) return;

  fecharModalDetalhes();

  document.getElementById('edit-id').value = q.id;
  document.getElementById('edit-title').value = q.titulo;
  document.getElementById('edit-cover').value = q.capa || '';
  document.getElementById('edit-character').value = q.personagem;
  document.getElementById('edit-writer').value = q.escritor !== 'N/I' ? q.escritor : '';
  document.getElementById('edit-original-publisher').value = q.editoraPublicacao !== 'N/I' ? q.editoraPublicacao : '';
  document.getElementById('edit-publisher').value = q.editora;
  document.getElementById('edit-ownership').value = q.posse;
  document.getElementById('edit-read-status').value = q.statusLeitura;
  document.getElementById('edit-year').value = q.ano !== 'N/I' ? q.ano : '';
  document.getElementById('edit-read-year').value = q.anoLido !== 'N/I' ? q.anoLido : '';
  document.getElementById('edit-rating').value = q.nota || '';
  document.getElementById('edit-reading-order').value = q.ordemLeitura || '';
  document.getElementById('edit-total-pages').value = q.totalPaginas || '';
  document.getElementById('edit-pages-read').value = q.paginasLidas || '';
  document.getElementById('edit-cover-price').value = q.precoCapa || '';
  document.getElementById('edit-paid-price').value = q.precoPago || '';
  document.getElementById('edit-included-content').value = q.historiasInclusas || '';
  document.getElementById('edit-review').value = q.resenha || '';

  document.getElementById('edit-modal').classList.add('active');
}

function fecharModalEdicao() {
  document.getElementById('edit-modal')?.classList.remove('active');
}

document.getElementById('edit-form').addEventListener('submit', function (e) {
  e.preventDefault();
  const id = Number(document.getElementById('edit-id').value);
  const q = colecao.find(item => Number(item.id) === id);
  if (!q) return;

  const novoStatus = document.getElementById('edit-read-status').value;
  const statusAnterior = q.statusLeitura;
  const novaOrdem = parseInt(document.getElementById('edit-reading-order').value) || null;
  const novoPersonagem = document.getElementById('edit-character').value.trim() || 'Sem Personagem';

  if (novaOrdem && novaOrdem !== q.ordemLeitura) {
    reordenarCronologiaLocal(novoPersonagem, novaOrdem, id);
  }

  let historicoAtualizado = q.historicoLeituras ? [...q.historicoLeituras] : [];
  let totalVezesLido = q.vezesLido || 1;

  if (novoStatus === 'Já Lido' && statusAnterior === 'Releitura') {
    const novaResenha = prompt('Deseja registrar um comentário para esta releitura?');
    const novaNota = prompt('Nota para esta releitura (0.5 a 5):');
    historicoAtualizado.push({
      data: new Date().toLocaleDateString('pt-BR'),
      nota: parseFloat(novaNota) || q.nota,
      resenha: novaResenha || ''
    });
    totalVezesLido += 1;
  }

  q.titulo = document.getElementById('edit-title').value.trim();
  q.capa = document.getElementById('edit-cover').value.trim();
  q.personagem = novoPersonagem;
  q.escritor = document.getElementById('edit-writer').value.trim() || 'N/I';
  q.editoraPublicacao = document.getElementById('edit-original-publisher').value.trim() || 'N/I';
  q.editora = document.getElementById('edit-publisher').value;
  q.posse = document.getElementById('edit-ownership').value;
  q.statusLeitura = novoStatus;
  q.ano = document.getElementById('edit-year').value || 'N/I';
  q.anoLido = document.getElementById('edit-read-year').value || 'N/I';
  q.nota = parseFloat(document.getElementById('edit-rating').value) || 0;
  q.ordemLeitura = novaOrdem;
  q.totalPaginas = parseInt(document.getElementById('edit-total-pages').value) || 0;
  q.paginasLidas = parseInt(document.getElementById('edit-pages-read').value) || 0;
  q.precoCapa = parseFloat(document.getElementById('edit-cover-price').value) || 0;
  q.precoPago = parseFloat(document.getElementById('edit-paid-price').value) || 0;
  q.historiasInclusas = document.getElementById('edit-included-content').value.trim();
  q.resenha = document.getElementById('edit-review').value.trim();
  q.historicoLeituras = historicoAtualizado;
  q.vezesLido = totalVezesLido;

  if (novoStatus === 'Já Lido' && q.totalPaginas > 0) {
    q.paginasLidas = q.totalPaginas;
  }

  salvarDadosLocais();
  fecharModalEdicao();
  atualizarTodosOsFiltros();
  exibirQuadrinhos();
});

function apagarQuadrinho(id) {
  if (!confirm('Tem certeza que deseja excluir esta HQ?')) return;
  colecao = colecao.filter(item => Number(item.id) !== Number(id));
  salvarDadosLocais();
  fecharModalDetalhes();
  atualizarTodosOsFiltros();
  exibirQuadrinhos();
}

// ==========================================================================
// 8. FILTROS, CRONOLOGIA, CONTEÚDO (A-Z), RANKING E FINANCEIRO
// ==========================================================================
function atualizarTodosOsFiltros() {
  atualizarFiltroPersonagens('character-filter');
  atualizarFiltroPersonagens('subtitulos-character-filter');
  atualizarFiltroPersonagensRanking();
  atualizarFiltroFinanceiro();
}

function atualizarFiltroPersonagens(idSelect) {
  const select = document.getElementById(idSelect);
  if (!select) return;

  const valorAtual = select.value;
  select.innerHTML = '<option value="">Selecione um Personagem...</option>';

  const listaUnica = [];
  colecao.forEach(c => {
    const p = c.personagem ? c.personagem.trim() : '';
    if (p && normalizarTexto(p) !== 'sem personagem') {
      if (!listaUnica.some(item => normalizarTexto(item) === normalizarTexto(p))) {
        listaUnica.push(p);
      }
    }
  });

  listaUnica.sort((a, b) => a.localeCompare(b)).forEach(p => {
    const opt = document.createElement('option');
    opt.value = p;
    opt.textContent = p;
    select.appendChild(opt);
  });

  select.value = valorAtual;
}

function exibirCronologia() {
  const list = document.getElementById('cronologia-list');
  const sel = document.getElementById('character-filter')?.value;
  if (!list) return;

  list.innerHTML = '';
  if (!sel) {
    list.innerHTML = '<div class="empty-state" style="grid-column: 1/-1;">Aguardando seleção de personagem...</div>';
    return;
  }

  const filtrados = colecao
    .filter(c => normalizarTexto(c.personagem) === normalizarTexto(sel))
    .sort((a, b) => {
      if (a.ordemLeitura && b.ordemLeitura) return a.ordemLeitura - b.ordemLeitura;
      if (a.ordemLeitura) return -1;
      if (b.ordemLeitura) return 1;
      return (parseInt(a.ano) || 0) - (parseInt(b.ano) || 0);
    });

  if (filtrados.length === 0) {
    list.innerHTML = '<div class="empty-state" style="grid-column: 1/-1;">Nenhum quadrinho encontrado para este personagem.</div>';
    return;
  }

  filtrados.forEach((hq, idx) => {
    const numOrdem = hq.ordemLeitura || (idx + 1);
    const card = document.createElement('div');
    card.className = 'chrono-card';
    card.onclick = () => abrirDetalhesQuadrinho(hq.id);

    const capa = hq.capa
      ? `<img src="${hq.capa}" alt="${hq.titulo}" class="chrono-cover-img">`
      : `<div class="chrono-cover-img" style="background:var(--bg-card); display:flex; align-items:center; justify-content:center; font-family:monospace; font-size:0.7rem; color:var(--text-muted);">SEM CAPA</div>`;

    card.innerHTML = `
      <span class="chrono-badge">#${numOrdem}</span>
      ${capa}
      <div class="chrono-title" title="${hq.titulo}">${hq.titulo}</div>
      <div class="chrono-meta">${hq.ano !== 'N/I' ? hq.ano : ''}</div>
    `;
    list.appendChild(card);
  });
}

function exibirSubtitulos() {
  const list = document.getElementById('subtitulos-list');
  const sel = document.getElementById('subtitulos-character-filter')?.value;
  if (!list) return;

  list.innerHTML = '';
  if (!sel) {
    list.innerHTML = '<div class="empty-state">Aguardando seleção de personagem...</div>';
    return;
  }

  const hqsDoPersonagem = colecao.filter(c => normalizarTexto(c.personagem) === normalizarTexto(sel));
  const historias = [];

  hqsDoPersonagem.forEach(hq => {
    if (hq.historiasInclusas) {
      hq.historiasInclusas.split(',').map(s => s.trim()).filter(Boolean).forEach(sub => {
        historias.push({ nome: sub, hqTitulo: hq.titulo, hqId: hq.id });
      });
    }
  });

  if (historias.length === 0) {
    list.innerHTML = '<div class="empty-state">Nenhuma história inclusa cadastrada para este personagem.</div>';
    return;
  }

  historias.sort((a, b) => a.nome.localeCompare(b.nome)).forEach(item => {
    const div = document.createElement('div');
    div.className = 'tech-list-item';
    div.style.display = 'flex';
    div.style.justifyContent = 'space-between';
    div.style.alignItems = 'center';
    div.style.gap = '10px';
    div.innerHTML = `
      <div>
        <strong style="color:var(--text-title);">${item.nome}</strong>
        <div style="font-size:0.75rem; color:var(--text-muted);">Publicado em: ${item.hqTitulo}</div>
      </div>
      <button type="button" class="btn-tech action-btn-edit" onclick="abrirDetalhesQuadrinho(${item.hqId})">VER HQ</button>
    `;
    list.appendChild(div);
  });
}

document.getElementById('ranking-form').addEventListener('submit', function (e) {
  e.preventDefault();
  const titulo = document.getElementById('ranking-title').value.trim();
  if (!titulo) return;

  rankings.push({
    id: Date.now(),
    titulo,
    personagem: document.getElementById('ranking-character').value.trim() || 'Geral',
    posicao: parseInt(document.getElementById('ranking-position').value) || 99,
    nota: parseFloat(document.getElementById('ranking-rating').value) || 0,
    comentario: document.getElementById('ranking-comment').value.trim()
  });

  salvarDadosLocais();
  this.reset();
  atualizarFiltroPersonagensRanking();
  exibirRanking();
});

function atualizarFiltroPersonagensRanking() {
  const select = document.getElementById('ranking-character-filter');
  if (!select) return;

  const val = select.value;
  select.innerHTML = '<option value="">Filtrar Ranking por Personagem...</option>';
  const unicos = [...new Set(rankings.map(r => r.personagem).filter(Boolean))].sort();
  unicos.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p;
    opt.textContent = p;
    select.appendChild(opt);
  });
  select.value = val;
}

function exibirRanking() {
  const list = document.getElementById('ranking-list');
  const filtro = document.getElementById('ranking-character-filter')?.value;
  if (!list) return;

  list.innerHTML = '';
  const filtrados = rankings
    .filter(r => !filtro || normalizarTexto(r.personagem) === normalizarTexto(filtro))
    .sort((a, b) => a.posicao - b.posicao);

  if (filtrados.length === 0) {
    list.innerHTML = '<div class="empty-state">Nenhum item no ranking ainda.</div>';
    return;
  }

  filtrados.forEach(r => {
    const div = document.createElement('div');
    div.className = 'tech-list-item';
    div.style.display = 'flex';
    div.style.justifyContent = 'space-between';
    div.style.alignItems = 'center';
    div.innerHTML = `
      <div>
        <span style="background:var(--accent-color); color:#fff; padding:2px 7px; border-radius:3px; font-family:monospace; font-weight:bold; margin-right:6px;">#${r.posicao}</span>
        <strong style="color:var(--text-title);">${r.titulo}</strong> <span style="color:var(--text-muted); font-size:0.8rem;">(${r.personagem})</span>
        <div style="font-size:0.8rem; color:var(--text-muted); margin-top:4px;">Nota: ${r.nota}/5 ${r.comentario ? `— "${r.comentario}"` : ''}</div>
      </div>
      <button type="button" class="btn-tech action-btn-delete" onclick="apagarRanking(${r.id})">✕</button>
    `;
    list.appendChild(div);
  });
}

function apagarRanking(id) {
  rankings = rankings.filter(r => r.id !== id);
  salvarDadosLocais();
  atualizarFiltroPersonagensRanking();
  exibirRanking();
}

function atualizarFiltroFinanceiro() {
  const select = document.getElementById('finance-comic-filter');
  if (!select) return;

  const val = select.value;
  select.innerHTML = '<option value="">Selecione a HQ para análise de custo...</option>';
  colecao.forEach(hq => {
    const opt = document.createElement('option');
    opt.value = hq.id;
    opt.textContent = hq.titulo;
    select.appendChild(opt);
  });
  select.value = val;
}

function exibirDetalhamentoFinanceiro() {
  const id = document.getElementById('finance-comic-filter')?.value;
  const container = document.getElementById('finance-display-container');
  const emptyMsg = document.getElementById('finance-empty-msg');
  if (!container) return;

  if (!id) {
    container.style.display = 'none';
    if (emptyMsg) emptyMsg.style.display = 'block';
    return;
  }

  const hq = colecao.find(c => Number(c.id) === Number(id));
  if (!hq) return;

  const pago = Number(hq.precoPago) || 0;
  const capa = Number(hq.precoCapa) || 0;
  const econ = Math.max(0, capa - pago);

  document.getElementById('finance-thumb-box').innerHTML = hq.capa
    ? `<img src="${hq.capa}" class="hud-thumb" alt="${hq.titulo}">`
    : '';
  document.getElementById('finance-hq-title').textContent = hq.titulo;
  document.getElementById('finance-hq-meta').textContent = `${hq.editora} // ${hq.posse}`;
  document.getElementById('finance-val-pago').textContent = `R$ ${pago.toFixed(2).replace('.', ',')}`;
  document.getElementById('finance-val-capa').textContent = `R$ ${capa.toFixed(2).replace('.', ',')}`;
  document.getElementById('finance-val-econ').textContent = `R$ ${econ.toFixed(2).replace('.', ',')}`;

  container.style.display = 'grid';
  if (emptyMsg) emptyMsg.style.display = 'none';
}

// ==========================================================================
// 9. INICIALIZAÇÃO E EXPOSIÇÃO GLOBAL
// ==========================================================================
window.addEventListener('DOMContentLoaded', () => {
  const savedTheme = localStorage.getItem('hq-theme') || 'dark';
  setTheme(savedTheme);

  document.documentElement.style.fontSize = (16 * (currentFontScale / 100)) + 'px';
  const label = document.getElementById('font-scale-label');
  if (label) label.textContent = currentFontScale + '%';

  if (localStorage.getItem('hq-high-contrast') === '1') {
    document.body.classList.add('high-contrast');
    const btn = document.getElementById('btn-high-contrast');
    if (btn) btn.classList.add('active');
  }

  atualizarTodosOsFiltros();
  exibirQuadrinhos();
});

window.toggleSidebar = toggleSidebar;
window.toggleA11yMenu = toggleA11yMenu;
window.setTheme = setTheme;
window.changeFontSize = changeFontSize;
window.toggleHighContrast = toggleHighContrast;
window.trocarAba = trocarAba;
window.iniciarLeitorCodigoBarras = iniciarLeitorCodigoBarras;
window.pararLeitorCodigoBarras = pararLeitorCodigoBarras;
window.abrirDetalhesQuadrinho = abrirDetalhesQuadrinho;
window.fecharModalDetalhes = fecharModalDetalhes;
window.atualizarPaginasLidas = atualizarPaginasLidas;
window.abrirModalEdicao = abrirModalEdicao;
window.fecharModalEdicao = fecharModalEdicao;
window.apagarQuadrinho = apagarQuadrinho;
window.exibirCronologia = exibirCronologia;
window.exibirSubtitulos = exibirSubtitulos;
window.exibirRanking = exibirRanking;
window.apagarRanking = apagarRanking;
window.exibirDetalhamentoFinanceiro = exibirDetalhamentoFinanceiro;
