// Querida Nick, esse é o ínicio das minhas alterações, basicamente eu criei o banco de dados no firebase pra vc, estou usando um meu pra testar, mas depois a gente cria o seu junto ok?
//Notei que o gemini não tinha errado, ele só tinha programado o save no cache do navegador, aí eu adicionei mais uns métodos pra enviar diretamente para um banco de dados na nuvem que eu tenho
//Basicamente sempre que a senhora salvar um novo quadrinho, ele vai fazer o upload no banco de dados e aí deve funcionar em qualquer plataforma
// CONFIGURAÇÃO DO SEU PROJETO FIREBASE (hq-s-library-b1b4a)
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

// BANCO DE DADOS EM MEMÓRIA
let colecao = [];
let rankingColecao = [];

// ESCUTA A COLEÇÃO DE HQS EM TEMPO REAL NO FIREBASE
db.collection("quadrinhos").onSnapshot(snapshot => {
  colecao = snapshot.docs.map(doc => ({
    firestoreDocId: doc.id,
    ...doc.data()
  }));
  atualizarTodosOsFiltros();
  exibirQuadrinhos();
  
  // Atualiza a aba ativa no momento se for necessário
  const abaAtiva = document.querySelector('.tab-content.active');
  if (abaAtiva) {
    if (abaAtiva.id === 'tab-cronologia') exibirCronologia();
    else if (abaAtiva.id === 'tab-subtitulos') exibirSubtitulos();
    else if (abaAtiva.id === 'tab-financeiro') exibirDetalhamentoFinanceiro();
  }
}, err => {
  console.error("Erro ao sincronizar HQs:", err);
});

// ESCUTA A COLEÇÃO DE RANKING EM TEMPO REAL NO FIREBASE
db.collection("ranking").onSnapshot(snapshot => {
  rankingColecao = snapshot.docs.map(doc => ({
    firestoreDocId: doc.id,
    ...doc.data()
  }));
  atualizarFiltroPersonagensRanking();
  exibirRanking();
}, err => {
  console.error("Erro ao sincronizar Ranking:", err);
});

// NORMALIZAÇÃO DE TEXTO ULTRA FLEXÍVEL
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

// TROCA DE ABAS
function trocarAba(aba) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));

  const tabAlvo = document.getElementById(`tab-${aba}`);
  const btnAlvo = document.getElementById(`btn-tab-${aba}`);

  if (tabAlvo) tabAlvo.classList.add('active');
  if (btnAlvo) btnAlvo.classList.add('active');

  atualizarTodosOsFiltros();

  if (aba === 'colecao') exibirQuadrinhos();
  else if (aba === 'cronologia') { exibirCronologia(); }
  else if (aba === 'subtitulos') { exibirSubtitulos(); }
  else if (aba === 'ranking') { exibirRanking(); }
  else if (aba === 'financeiro') { exibirDetalhamentoFinanceiro(); }
}

// ATUALIZA TODOS OS SELETORES
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
  select.innerHTML = '<option value="">Selecione o Personagem...</option>';

  const personagens = colecao
    .map(c => c.personagem ? c.personagem.trim() : '')
    .filter(p => p !== '' && p.toLowerCase() !== 'sem personagem');

  const listaUnica = [];
  personagens.forEach(p => {
    const norm = normalizarTexto(p);
    if (!listaUnica.some(item => normalizarTexto(item) === norm)) {
      listaUnica.push(p);
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

// ABRIR POP-UP DE DETALHES
function abrirDetalhesQuadrinho(id) {
  const idNum = Number(id);
  const quadrinho = colecao.find(item => Number(item.id) === idNum);
  if (!quadrinho) return;

  const modalBody = document.getElementById('detail-modal-body');
  const modal = document.getElementById('detail-modal');

  if (!modalBody || !modal) return;

  let avisoPosse = '';
  if (quadrinho.statusLeitura === 'Quero Ler') {
    avisoPosse = quadrinho.posse === 'Não Possuo' 
      ? '<span style="color: #ff2e55; font-weight: bold;"> [BUY REQUIRED]</span>'
      : '<span style="color: #00ff9d; font-weight: bold;"> [IN STOCK]</span>';
  }

  // Tag visual das releituras 
  let badgevezesLido = (quadrinho.vezesLido && quadrinho.vezesLido > 1)
    ? `<span style="background: #8b5cf6; color: #fff; padding: 2px 6px; border-radius: 3px; font-size: 0.7rem; margin-left: 6px; font-weight: bold;">LIDO ${quadrinho.vezesLido}x</span>` 
    : '';
  
  let htmlProgresso = '';
  if (quadrinho.totalPaginas > 0) {
    const porcentagem = Math.min(100, Math.round((quadrinho.paginasLidas / quadrinho.totalPaginas) * 100));
    htmlProgresso = `
      <div style="margin: 12px 0;">
        <div style="font-size: 0.75rem; color: #818399; font-family: monospace;">PROGRESSO // ${porcentagem}% (${quadrinho.paginasLidas}/${quadrinho.totalPaginas} PÁGS)</div>
        <div style="background: #090a0d; height: 6px; border-radius: 2px; overflow: hidden; margin-top: 4px; border: 1px solid #232238;">
          <div style="background: #a78bfa; height: 100%; width: ${porcentagem}%;"></div>
        </div>
      </div>
    `;
  }

  let htmlResenha = quadrinho.resenha && quadrinho.resenha.trim() !== ''
    ? `<div style="background: #090a0d; padding: 10px; border-left: 2px solid #8b5cf6; font-size: 0.8rem; margin-top: 10px;">"${quadrinho.resenha}"</div>`
    : '';

  // Histórico de Releituras
  let htmlHistorico = '';
  if (quadrinho.historicoLeituras && quadrinho.historicoLeituras.length > 0) {
    let itensHist = quadrinho.historicoLeituras.map(h => 
      `<li style="margin-bottom: 4px;">📅 <strong>${h.data}:</strong> Nota ${h.nota || 'S/N'} ${h.resenha ? `- "${h.resenha}"` : ''}</li>`
    ).join('');
    
    htmlHistorico = `
      <div style="margin-top: 12px; background: #0c0d12; padding: 8px; border: 1px solid #232238; border-radius: 4px; font-size: 0.75rem; color: #a0a2b3;">
        <strong style="color: #a78bfa;">HISTÓRICO DE RELEITURAS:</strong>
        <ul style="padding-left: 16px; margin: 6px 0 0 0; list-style-type: square;">${itensHist}</ul>
      </div>
    `;
  }
  
  let elementoCapa = quadrinho.capa && quadrinho.capa.trim() !== ''
    ? `<img src="${quadrinho.capa}" alt="${quadrinho.titulo}" style="max-height: 240px; width: auto; border-radius: 2px; display: block; margin: 0 auto 15px auto; border: 1px solid #232238;">`
    : `<div style="height: 140px; display: flex; align-items: center; justify-content: center; background: #090a0d; border: 1px solid #232238; font-family: monospace; font-size: 0.75rem; color: #515366; margin-bottom: 15px;">NO IMAGE DATA</div>`;

  modalBody.innerHTML = `
    <div style="text-align: center;">
      ${elementoCapa}
      <h3 style="margin: 0 0 6px 0; color: #ffffff; font-size: 1.1rem; letter-spacing: 0.5px;">${quadrinho.titulo}</h3>
    </div>
    <div style="font-size: 0.82rem; line-height: 1.6; color: #a0a2b3;">
      <div><strong>Personagem:</strong> ${quadrinho.personagem}</div>
      <div><strong>Roteiro:</strong> ${quadrinho.escritor}</div>
      <div><strong>Editora:</strong> ${quadrinho.editoraPublicacao} (${quadrinho.editora})</div>
      <div><strong>Ano:</strong> ${quadrinho.ano} | <strong>Lido:</strong> ${quadrinho.anoLido}</div>
      <div><strong>Status:</strong> ${quadrinho.statusLeitura} ${avisoPosse}</div>
      <div><strong>Score:</strong> ${quadrinho.nota || 'Sem Nota'}</div>
      ${htmlProgresso}
      ${htmlResenha}
    </div>
    <div class="btn-row" style="display: flex; gap: 8px; margin-top: 16px;">
      <button class="btn-tech action-btn-progress" onclick="fecharModalDetalhes(); atualizarPaginasLidas(${quadrinho.id})">PÁGINAS</button>
      <button class="btn-tech action-btn-edit" onclick="fecharModalDetalhes(); abrirModalEdicao(${quadrinho.id})">EDITAR</button>
      <button class="btn-tech action-btn-delete" onclick="fecharModalDetalhes(); apagarQuadrinho(${quadrinho.id})">EXCLUIR</button>
    </div>
  `;

  modal.classList.add('active');
}

function fecharModalDetalhes() {
  const modal = document.getElementById('detail-modal');
  if (modal) modal.classList.remove('active');
}

// CRIA LOMBADA TECH
function criarCardHTML(quadrinho) {
  const spine = document.createElement('div');
  spine.classList.add('comic-card-spine');
  spine.setAttribute('data-editora', quadrinho.editora || 'Outros');
  spine.setAttribute('title', quadrinho.titulo);
  spine.setAttribute('onclick', `abrirDetalhesQuadrinho(${quadrinho.id})`);

  spine.innerHTML = `<div class="spine-title">${quadrinho.titulo}</div>`;
  return spine;
}

// RENDER DA ESTANTE
function exibirQuadrinhos() {
  const comicList = document.getElementById('comic-list');
  if (!comicList) return;
  comicList.innerHTML = '';

  document.getElementById('stat-total').innerText = colecao.length;
  document.getElementById('stat-reading').innerText = colecao.filter(c => c.statusLeitura === 'Lendo').length;
  document.getElementById('stat-read').innerText = colecao.filter(c => c.statusLeitura === 'Já Lido').length;
  document.getElementById('stat-want').innerText = colecao.filter(c => c.statusLeitura === 'Quero Ler').length;

  let lidas = 0, totais = 0;
  colecao.forEach(c => { lidas += (c.paginasLidas || 0); totais += (c.totalPaginas || 0); });

  document.getElementById('stat-pages-total').innerText = lidas.toLocaleString('pt-BR');
  document.getElementById('stat-percent-global').innerText = `${totais > 0 ? Math.round((lidas / totais) * 100) : 0}%`;

  const termo = document.getElementById('search-input') ? document.getElementById('search-input').value.toLowerCase().trim() : '';

  const filtrados = colecao.filter(q => {
    if (!termo) return true;
    return q.titulo.toLowerCase().includes(termo) ||
           q.personagem.toLowerCase().includes(termo) ||
           q.escritor.toLowerCase().includes(termo) ||
           (q.historiasInclusas && q.historiasInclusas.toLowerCase().includes(termo));
  });

  if (filtrados.length === 0) {
    comicList.innerHTML = '<div class="empty-state" style="width:100%;">NENHUM REGISTRO ENCONTRADO</div>';
    return;
  }

  filtrados.forEach(q => comicList.appendChild(criarCardHTML(q)));
}

// ABA CRONOLOGIA
function exibirCronologia() {
  const list = document.getElementById('cronologia-list');
  const sel = document.getElementById('character-filter').value;
  if (!list) return;

  list.innerHTML = '';

  if (!sel) {
    list.innerHTML = '<div class="empty-state" style="grid-column: 1/-1;">Aguardando seleção de personagem...</div>';
    return;
  }

  const normSel = normalizarTexto(sel);

  const filtrados = colecao
    .filter(c => normalizarTexto(c.personagem) === normSel || normalizarTexto(c.personagem).includes(normSel))
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

  filtrados.forEach((quadrinho, index) => {
    const numOrdem = quadrinho.ordemLeitura || (index + 1);
    const card = document.createElement('div');
    card.classList.add('chrono-card');
    card.setAttribute('onclick', `abrirDetalhesQuadrinho(${quadrinho.id})`);

    let elementoCapa = quadrinho.capa && quadrinho.capa.trim() !== ''
      ? `<img src="${quadrinho.capa}" alt="${quadrinho.titulo}" class="chrono-cover-img">`
      : `<div class="chrono-cover-img" style="background:#09090e; display:flex; align-items:center; justify-content:center; font-family:monospace; font-size:0.65rem; color:#515366; text-align:center;">SEM CAPA</div>`;

    card.innerHTML = `
      <span class="chrono-badge">#${numOrdem}</span>
      ${elementoCapa}
      <div class="chrono-title" title="${quadrinho.titulo}">${quadrinho.titulo}</div>
      <div class="chrono-meta">${quadrinho.ano !== 'N/I' ? quadrinho.ano : ''}</div>
    `;

    list.appendChild(card);
  });
}

// ABA CONTEÚDO (TODAS AS HISTÓRIAS DO PERSONAGEM EM ORDEM ALFABÉTICA DE A A Z)
function exibirSubtitulos() {
  const list = document.getElementById('subtitulos-list');
  const selElement = document.getElementById('subtitulos-character-filter');
  if (!list || !selElement) return;

  const sel = selElement.value;
  list.innerHTML = '';

  if (!sel) {
    list.innerHTML = '<div class="empty-state">Aguardando seleção de personagem...</div>';
    return;
  }

  const normSel = normalizarTexto(sel);

  let listaHistorias = [];

  colecao.forEach(hq => {
    const normPersonagemHQ = normalizarTexto(hq.personagem);
    const bateuPersonagem = normPersonagemHQ === normSel || normPersonagemHQ.includes(normSel) || normSel.includes(normPersonagemHQ);

    if (hq.historiasInclusas && hq.historiasInclusas.trim() !== '') {
      const itens = hq.historiasInclusas.split(/,|\n/);

      itens.forEach(itemRaw => {
        const nomeLimpo = itemRaw.trim();
        if (nomeLimpo !== '') {
          const normItem = normalizarTexto(nomeLimpo);
          
          if (bateuPersonagem || normItem.includes(normSel)) {
            const notaSalva = (hq.subtitulosDetalhes && hq.subtitulosDetalhes[nomeLimpo]) 
              ? hq.subtitulosDetalhes[nomeLimpo].nota 
              : null;

            listaHistorias.push({
              nomeHistoria: nomeLimpo,
              hqPaiId: hq.id,
              hqPaiTitulo: hq.titulo,
              notaIndividual: notaSalva
            });
          }
        }
      });
    }
  });

  if (listaHistorias.length === 0) {
    list.innerHTML = '<div class="empty-state">Nenhuma história cadastrada no campo "Histórias Inclusas" para este personagem.</div>';
    return;
  }

  // ORDENAÇÃO DE A a Z
  listaHistorias.sort((a, b) => a.nomeHistoria.localeCompare(b.nomeHistoria, undefined, { numeric: true, sensitivity: 'base' }));

  listaHistorias.forEach(item => {
    const el = document.createElement('div');
    el.classList.add('tech-list-item');
    el.style.display = 'flex';
    el.style.justifyContent = 'space-between';
    el.style.alignItems = 'center';
    el.style.gap = '12px';

    const textoNota = item.notaIndividual ? `<span style="color: #ffb703; font-size: 0.8rem; margin-left: 8px;">★ ${item.notaIndividual}</span>` : '';

    el.innerHTML = `
      <div style="flex: 1;">
        <strong style="color: #a78bfa; font-size: 0.9rem;">${item.nomeHistoria}</strong> ${textoNota}<br>
        <small style="color: #616375; font-size: 0.75rem;">ALOCADO EM: ${item.hqPaiTitulo}</small>
      </div>
      <div style="display: flex; gap: 6px;">
        <button class="btn-tech" style="padding: 5px 8px; font-size: 0.7rem; color: #ffb703; border-color: rgba(255, 183, 3, 0.3);" 
                onclick="atribuirNotaSubtitulo(${item.hqPaiId}, '${item.nomeHistoria.replace(/'/g, "\\'")}')">
          NOTA
        </button>
        <button class="btn-tech" style="padding: 5px 8px; font-size: 0.7rem; color: #a78bfa; border-color: rgba(167, 139, 250, 0.3);" 
                onclick="abrirDetalhesQuadrinho(${item.hqPaiId})">
          VER HQ
        </button>
      </div>
    `;

    list.appendChild(el);
  });
}

function atribuirNotaSubtitulo(hqId, nomeHistoria) {
  const hq = colecao.find(c => Number(c.id) === Number(hqId));
  if (!hq) return;

  const subtitulosDetalhes = hq.subtitulosDetalhes ? { ...hq.subtitulosDetalhes } : {};
  const notaAtual = subtitulosDetalhes[nomeHistoria] ? subtitulosDetalhes[nomeHistoria].nota : '';

  const res = prompt(`Atribuir nota (0.5 a 5) para "${nomeHistoria}":`, notaAtual);
  if (res !== null) {
    const num = parseFloat(res.replace(',', '.'));
    if (!isNaN(num) && num >= 0 && num <= 5) {
      if (!subtitulosDetalhes[nomeHistoria]) subtitulosDetalhes[nomeHistoria] = {};
      subtitulosDetalhes[nomeHistoria].nota = num;
    } else if (res.trim() === '') {
      delete subtitulosDetalhes[nomeHistoria];
    } else {
      return;
    }

    const docId = hq.firestoreDocId || String(hq.id);
    db.collection("quadrinhos").doc(docId).update({ subtitulosDetalhes })
      .catch(err => console.error("Erro ao salvar nota da história no Firebase:", err));
  }
}

// ABA FINANCEIRA
function atualizarFiltroFinanceiro() {
  const select = document.getElementById('finance-comic-filter');
  if (!select) return;

  const valorAtual = select.value;
  select.innerHTML = '<option value="">Selecione a HQ para análise de custo...</option>';

  const fisicos = colecao.filter(c => c.posse === 'Já Possuo - Físico').sort((a,b) => a.titulo.localeCompare(b.titulo));

  fisicos.forEach(item => {
    const opt = document.createElement('option');
    opt.value = item.id;
    opt.textContent = `${item.titulo} (${item.ano || 'S/A'})`;
    select.appendChild(opt);
  });

  select.value = valorAtual;
}

function exibirDetalhamentoFinanceiro() {
  const select = document.getElementById('finance-comic-filter');
  const container = document.getElementById('finance-display-container');
  const emptyMsg = document.getElementById('finance-empty-msg');

  if (!select || !select.value) {
    if (container) container.style.display = 'none';
    if (emptyMsg) emptyMsg.style.display = 'block';
    return;
  }

  const idSel = Number(select.value);
  const q = colecao.find(item => Number(item.id) === idSel);

  if (!q) return;

  if (emptyMsg) emptyMsg.style.display = 'none';
  if (container) container.style.display = 'grid';

  const thumbBox = document.getElementById('finance-thumb-box');
  thumbBox.innerHTML = q.capa 
    ? `<img src="${q.capa}" class="hud-thumb">`
    : `<div class="hud-thumb" style="background:#09090e; display:flex; align-items:center; justify-content:center; font-size:0.5rem; color:#515366; text-align:center;">NO COVER</div>`;

  document.getElementById('finance-hq-title').innerText = q.titulo;
  document.getElementById('finance-hq-meta').innerText = `ANO: ${q.ano || 'N/I'} | PUBLISHER: ${q.editoraPublicacao || 'N/I'}`;

  const pPago = q.precoPago ? parseFloat(q.precoPago) : 0;
  const pCapa = q.precoCapa ? parseFloat(q.precoCapa) : 0;
  const pEcon = pCapa > pPago ? pCapa - pPago : 0;

  document.getElementById('finance-val-pago').innerText = `R$ ${pPago.toFixed(2).replace('.', ',')}`;
  document.getElementById('finance-val-capa').innerText = `R$ ${pCapa.toFixed(2).replace('.', ',')}`;
  document.getElementById('finance-val-econ').innerText = `R$ ${pEcon.toFixed(2).replace('.', ',')}`;
}

// FORMULÁRIO DE CADASTRO (ENVIA DIRETO PARA O FIREBASE)
document.getElementById('comic-form').addEventListener('submit', function(e) {
  e.preventDefault();

  const idUnico = Date.now();
  const novo = {
    id: idUnico,
    titulo: document.getElementById('title').value.trim() || 'Sem Título',
    capa: document.getElementById('cover').value.trim(),
    personagem: document.getElementById('character').value.trim() || 'Sem Personagem',
    escritor: document.getElementById('writer').value.trim() || 'Sem Escritor',
    editoraPublicacao: document.getElementById('original-publisher').value.trim() || 'Sem Editora',
    editora: document.getElementById('publisher').value,
    posse: document.getElementById('ownership').value,
    statusLeitura: document.getElementById('read-status').value,
    ano: document.getElementById('year').value || 'N/I',
    anoLido: document.getElementById('read-year').value || 'N/I',
    nota: document.getElementById('rating').value ? parseFloat(document.getElementById('rating').value) : 0,
    ordemLeitura: document.getElementById('reading-order').value ? parseInt(document.getElementById('reading-order').value) : null,
    totalPaginas: document.getElementById('total-pages').value ? parseInt(document.getElementById('total-pages').value) : 0,
    paginasLidas: document.getElementById('pages-read').value ? parseInt(document.getElementById('pages-read').value) : 0,
    precoCapa: document.getElementById('cover-price').value ? parseFloat(document.getElementById('cover-price').value) : 0,
    precoPago: document.getElementById('paid-price').value ? parseFloat(document.getElementById('paid-price').value) : 0,
    historiasInclusas: document.getElementById('included-content').value.trim(),
    subtitulosDetalhes: {},
    resenha: document.getElementById('review').value.trim(),
    historicoLeituras: []
    vezesLido: 1 
  };

  db.collection("quadrinhos").doc(String(idUnico)).set(novo)
    .then(() => {
      this.reset();
      trocarAba('colecao');
    })
    .catch(err => console.error("Erro ao salvar HQ no Firebase:", err));
});

// MODAL DE EDIÇÃO
function abrirModalEdicao(id) {
  const q = colecao.find(item => Number(item.id) === Number(id));
  if (!q) return;

  document.getElementById('edit-id').value = q.id;
  document.getElementById('edit-title').value = q.titulo;
  document.getElementById('edit-cover').value = q.capa || '';
  document.getElementById('edit-character').value = q.personagem;
  document.getElementById('edit-writer').value = q.escritor;
  document.getElementById('edit-original-publisher').value = q.editoraPublicacao;
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
  document.getElementById('edit-modal').classList.remove('active');
}

document.getElementById('edit-form').addEventListener('submit', function(e) {
  e.preventDefault();
  const id = Number(document.getElementById('edit-id').value);
  const q = colecao.find(item => Number(item.id) === id);
  if (!q) return;

const novoStatus = document.getElementById('edit-read-status').value;
  const statusAnterior = q.statusLeitura;
  
  let historicoAtualizado = q.historicoLeituras ? [...q.historicoLeituras] : [];
  let totalVezesLido = q.vezesLido || 1;

  // Se mudou de Releitura para Lido, arquiva a leitura anterior no histórico
  if (statusAnterior === 'Releitura' && novoStatus === 'Já Lido') {
    const dataHoje = new Date().toLocaleDateString('pt-BR');
    historicoAtualizado.push({
      data: dataHoje,
      nota: q.nota || 0,
      resenha: q.resenha || ''
    });
    totalVezesLido += 1;
  }
  
  const dadosAtualizados = {
    titulo: document.getElementById('edit-title').value.trim(),
    capa: document.getElementById('edit-cover').value.trim(),
    personagem: document.getElementById('edit-character').value.trim(),
    escritor: document.getElementById('edit-writer').value.trim(),
    editoraPublicacao: document.getElementById('edit-original-publisher').value.trim(),
    editora: document.getElementById('edit-publisher').value,
    posse: document.getElementById('edit-ownership').value,
    statusLeitura: document.getElementById('edit-read-status').value,
    ano: document.getElementById('edit-year').value || 'N/I',
    anoLido: document.getElementById('edit-read-year').value || 'N/I',
    nota: document.getElementById('edit-rating').value ? parseFloat(document.getElementById('edit-rating').value) : 0,
    ordemLeitura: document.getElementById('edit-reading-order').value ? parseInt(document.getElementById('edit-reading-order').value) : null,
    totalPaginas: document.getElementById('edit-total-pages').value ? parseInt(document.getElementById('edit-total-pages').value) : 0,
    paginasLidas: document.getElementById('edit-pages-read').value ? parseInt(document.getElementById('edit-pages-read').value) : 0,
    precoCapa: document.getElementById('edit-cover-price').value ? parseFloat(document.getElementById('edit-cover-price').value) : 0,
    precoPago: document.getElementById('edit-paid-price').value ? parseFloat(document.getElementById('edit-paid-price').value) : 0,
    historiasInclusas: document.getElementById('edit-included-content').value.trim(),
    resenha: document.getElementById('edit-review').value.trim()
  };

  const docId = q.firestoreDocId || String(q.id);
  db.collection("quadrinhos").doc(docId).update(dadosAtualizados)
    .then(() => fecharModalEdicao())
    .catch(err => console.error("Erro ao atualizar no Firebase:", err));
});

// APAGAR REGISTRO NO FIREBASE
function apagarQuadrinho(id) {
  if (confirm('Confirmar exclusão deste registro?')) {
    const q = colecao.find(item => Number(item.id) === Number(id));
    if (!q) return;

    const docId = q.firestoreDocId || String(q.id);
    db.collection("quadrinhos").doc(docId).delete()
      .catch(err => console.error("Erro ao excluir do Firebase:", err));
  }
}

// ATUALIZAR PÁGINAS LIDAS NO FIREBASE
function atualizarPaginasLidas(id) {
  const q = colecao.find(item => Number(item.id) === Number(id));
  if (!q) return;

  const res = prompt(`Página atual para "${q.titulo}":`, q.paginasLidas || 0);
  if (res !== null && res.trim() !== '') {
    const val = parseInt(res.trim());
    if (!isNaN(val)) {
      const docId = q.firestoreDocId || String(q.id);
      db.collection("quadrinhos").doc(docId).update({ paginasLidas: val })
        .catch(err => console.error("Erro ao atualizar páginas lidas:", err));
    }
  }
}

// RANKING FORM SUBMIT
document.getElementById('ranking-form').addEventListener('submit', function(e) {
  e.preventDefault();
  const idUnico = Date.now();
  const novo = {
    id: idUnico,
    titulo: document.getElementById('ranking-title').value.trim(),
    personagem: document.getElementById('ranking-character').value.trim(),
    posicao: parseInt(document.getElementById('ranking-position').value) || 99,
    nota: parseFloat(document.getElementById('ranking-rating').value) || 0,
    comentario: document.getElementById('ranking-comment').value.trim()
  };

  db.collection("ranking").doc(String(idUnico)).set(novo)
    .then(() => this.reset())
    .catch(err => console.error("Erro ao salvar item do ranking:", err));
});

function atualizarFiltroPersonagensRanking() {
  const select = document.getElementById('ranking-character-filter');
  if (!select) return;

  const valorAtual = select.value;
  select.innerHTML = '<option value="">Filtrar Ranking por Personagem...</option>';

  const listaUnica = [];
  rankingColecao.forEach(r => {
    if (r.personagem) {
      const norm = normalizarTexto(r.personagem);
      if (!listaUnica.some(item => normalizarTexto(item) === norm)) {
        listaUnica.push(r.personagem.trim());
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

function exibirRanking() {
  const list = document.getElementById('ranking-list');
  const sel = document.getElementById('ranking-character-filter').value;
  if (!list || !sel) return;

  list.innerHTML = '';
  const normSel = normalizarTexto(sel);

  const filtrados = rankingColecao
    .filter(r => normalizarTexto(r.personagem) === normSel)
    .sort((a,b) => a.posicao - b.posicao);

  if (filtrados.length === 0) {
    list.innerHTML = '<div class="empty-state">Nenhum item ranqueado para este personagem.</div>';
    return;
  }

  filtrados.forEach(r => {
    const el = document.createElement('div');
    el.classList.add('tech-list-item');
    el.innerHTML = `<span style="color:#a78bfa; font-family:monospace; font-weight:bold; margin-right:8px;">[#${r.posicao}]</span> <strong>${r.titulo}</strong> <span style="color:#ffb703;">(${r.nota})</span><p style="color:#717384; font-size:0.8rem; margin-top:4px;">"${r.comentario}"</p>`;
    list.appendChild(el);
  });
}

if (document.getElementById('search-input')) {
  document.getElementById('search-input').addEventListener('input', exibirQuadrinhos);
}

// ABRIR / FECHAR SIDEBAR RETRÁTIL
function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  
  if (sidebar && overlay) {
    sidebar.classList.toggle('open');
    overlay.classList.toggle('active');
  }
}

// MAPPING GLOBAL
window.abrirDetalhesQuadrinho = abrirDetalhesQuadrinho;
window.fecharModalDetalhes = fecharModalDetalhes;
window.trocarAba = trocarAba;
window.abrirModalEdicao = abrirModalEdicao;
window.fecharModalEdicao = fecharModalEdicao;
window.apagarQuadrinho = apagarQuadrinho;
window.atualizarPaginasLidas = atualizarPaginasLidas;
window.exibirCronologia = exibirCronologia;
window.exibirSubtitulos = exibirSubtitulos;
window.exibirRanking = exibirRanking;
window.exibirDetalhamentoFinanceiro = exibirDetalhamentoFinanceiro;
window.atribuirNotaSubtitulo = atribuirNotaSubtitulo;
window.toggleSidebar = toggleSidebar;
