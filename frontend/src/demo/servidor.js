// Backend de demonstração em JavaScript: espelha as regras do backend Java
// (CobrancaService, MatriculaService, PedagogicoService, controllers) para rodar
// o sistema inteiro no navegador. Dados fictícios, recriados a cada carregamento.

const CAPACIDADE = 30
const SENHA = '123456'
const INFANTIL = ['Maternal I', 'Maternal II', 'Infantil I', 'Infantil II']
const DISC_INF = ['Linguagem', 'Matemática', 'Natureza e Sociedade', 'Artes e Movimento']
const DISC_FUND = ['Português', 'Matemática', 'Ciências', 'História', 'Geografia', 'Artes', 'Educação Física']
const MAT_INF = ['1 caixa de lápis de cor (12 cores)', '2 tubos de cola branca 90g', '1 pacote de massinha de modelar',
  '1 tesoura sem ponta', '1 pasta com elástico', '1 caderno de desenho grande', '1 estojo de giz de cera', '1 avental de pintura']
const MAT_FUND = ['4 cadernos de 96 folhas', '2 lápis grafite nº 2', '2 borrachas', '1 apontador com depósito',
  '1 caixa de lápis de cor (12 cores)', '1 régua de 30 cm', '1 tubo de cola branca 90g', '1 tesoura sem ponta', '1 dicionário de língua portuguesa']
const MATERIAIS = Object.fromEntries([...INFANTIL.map((t) => [t, MAT_INF]), ...['1º ano', '2º ano', '3º ano', '4º ano', '5º ano'].map((t) => [t, MAT_FUND])])

// ---------- utilidades ----------
class Erro extends Error {
  constructor(status, mensagem) { super(mensagem); this.status = status }
}
const r2 = (v) => Math.round((v + Number.EPSILON) * 100) / 100
const pad = (n, t = 2) => String(n).padStart(t, '0')
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const parse = (s) => { const [a, m, d] = s.slice(0, 10).split('-').map(Number); return new Date(a, m - 1, d) }
const hoje = () => iso(new Date())
const addDias = (s, n) => { const d = parse(s); d.setDate(d.getDate() + n); return iso(d) }
const dias = (de, ate) => Math.round((parse(ate) - parse(de)) / 86400000)
const agora = (diasAtras = 0) => { const d = new Date(Date.now() - diasAtras * 86400000); return d.toISOString().slice(0, 19) }
const fimDoMes = (ano, mes) => iso(new Date(ano, mes, 0))
const vazio = (s) => s === null || s === undefined || String(s).trim() === ''
const fmt = (v) => r2(v).toFixed(2)

function rng(seed) {
  let a = seed
  const next = () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
  return { int: (n) => Math.floor(next() * n), dbl: next, gauss: () => Math.sqrt(-2 * Math.log(next() || 1e-9)) * Math.cos(2 * Math.PI * next()) }
}

// ---------- banco em memória ----------
let seq = 1
const id = () => seq++
const db = { usuarios: [], turmas: [], precos: [], alunos: [], contratos: [], parcelas: [], notas: [], freq: [], aulas: [], planos: [], avisos: [], eventos: [], auditoria: [] }
const tokens = new Map()
const porId = (lista, i, oque) => { const x = db[lista].find((e) => e.id === Number(i)); if (!x) throw new Erro(404, `${oque} não encontrado(a)`); return x }
const usuario = (i) => db.usuarios.find((u) => u.id === i)
const turma = (i) => db.turmas.find((t) => t.id === i)

function auditar(u, acao, detalhe) {
  db.auditoria.unshift({ id: id(), dataHora: agora(), usuario: u ? `${u.nome} <${u.email}>` : 'sistema', acao, detalhe })
}

// ---------- regras de domínio ----------
const segmento = (t) => t.segmento
const tipoCobranca = (s) => (s === 'INFANTIL' ? 'Taxa de associado' : 'Mensalidade (boleto)')
const tipoDocumento = (s) => (s === 'INFANTIL' ? 'Ficha de sócio' : 'Contrato de prestação de serviços')
const disciplinas = (s) => (s === 'INFANTIL' ? DISC_INF : DISC_FUND)

function pendencias(a) {
  const p = []
  if (!a.docCertidaoNascimento) p.push('Certidão de nascimento')
  if (!a.docComprovanteResidencia) p.push('Comprovante de residência')
  if (!a.docCartaoVacina) p.push('Cartão de vacina')
  if (!a.docFoto) p.push('Foto 3x4')
  if (!a.docDocumentoResponsavel) p.push('Documento do responsável')
  if (!a.taxaMatriculaPaga) p.push('Taxa de matrícula')
  if (!a.consentimentoLgpd) p.push('Termo de consentimento LGPD')
  if (vazio(a.hospitalReferencia) || vazio(a.contatoEmergencia)) p.push('Dados de emergência (Anexo I)')
  return p
}
const matriculados = (t) => db.alunos.filter((a) => a.turmaId === t.id && a.status === 'MATRICULADO')
const vagas = (t) => CAPACIDADE - matriculados(t).length

const valorTabela = (serie) => {
  const p = db.precos.find((x) => x.serie === serie)
  if (!p) throw new Erro(422, 'Série sem valor na tabela oficial: ' + serie)
  return p.valor
}
const alunoDe = (c) => db.alunos.find((a) => a.id === c.alunoId)
const valorOficial = (c) => r2(valorTabela(turma(alunoDe(c).turmaId).nome) * (100 - c.descontoPercentual) / 100)
const divergente = (c) => r2(c.valorParcela) !== valorOficial(c)
const inst = () => db.inst

function gerarParcelas(c, apenasAVencer = true) {
  if (c.parcelasGeradas) throw new Erro(409, 'As parcelas deste contrato já foram geradas')
  if (divergente(c)) throw new Erro(422, `Valor da parcela (R$ ${fmt(c.valorParcela)}) diverge da tabela oficial (R$ ${fmt(valorOficial(c))}). Corrija o contrato antes de emitir a cobrança.`)
  let geradas = 0
  for (let i = 1; i <= c.numeroParcelas; i++) {
    const venc = iso(new Date(c.anoLetivo, i, 10))
    if (apenasAVencer && venc < hoje()) continue
    db.parcelas.push({ id: id(), contratoId: c.id, numero: i, vencimento: venc, valor: c.valorParcela, pago: false, dataPagamento: null, valorPago: null,
      codigoBoleto: 'CORA-' + Math.random().toString(16).slice(2, 10).toUpperCase() })
    geradas++
  }
  c.parcelasGeradas = true
  return geradas
}
const diasAtraso = (p) => Math.max(0, dias(p.vencimento, p.pago ? p.dataPagamento : hoje()))
const multa = (p) => (diasAtraso(p) === 0 ? 0 : r2(p.valor * inst().multaPercentual / 100))
const juros = (p) => r2(p.valor * (inst().jurosMensalPercentual / 100 / 30 * diasAtraso(p)))
const total = (p) => r2(p.valor + multa(p) + juros(p))
const situacao = (p) => (p.pago ? 'PAGA' : p.vencimento < hoje() ? 'ATRASADA' : 'ABERTA')
const contratoDe = (p) => db.contratos.find((c) => c.id === p.contratoId)

function parcelaView(p) {
  const c = contratoDe(p), a = alunoDe(c), t = turma(a.turmaId)
  return { id: p.id, aluno: a.nome, alunoId: a.id, turma: t.nome, tipo: tipoCobranca(t.segmento), numero: p.numero, totalParcelas: c.numeroParcelas,
    vencimento: p.vencimento, valor: p.valor, diasAtraso: p.pago ? 0 : diasAtraso(p), multa: p.pago ? 0 : multa(p), juros: p.pago ? 0 : juros(p),
    total: p.pago ? p.valorPago : total(p), situacao: situacao(p), dataPagamento: p.dataPagamento, codigoBoleto: p.codigoBoleto }
}

function novoContrato(a, ano) {
  const t = turma(a.turmaId)
  const c = { id: id(), alunoId: a.id, tipo: tipoDocumento(t.segmento), anoLetivo: ano, numeroParcelas: 11, valorParcela: valorTabela(t.nome),
    descontoPercentual: 0, observacao: null, dataEmissao: hoje(), parcelasGeradas: false }
  db.contratos.push(c)
  return c
}

function boletim(a) {
  const ns = db.notas.filter((n) => n.alunoId === a.id)
  return disciplinas(turma(a.turmaId).segmento).map((d) => {
    const l = { disciplina: d }
    let soma = 0, qtd = 0
    for (let b = 1; b <= 4; b++) {
      const n = ns.find((x) => x.disciplina === d && x.bimestre === b)
      l['b' + b] = n ? n.valor : null
      if (n) { soma += n.valor; qtd++ }
    }
    const media = qtd === 0 ? null : Math.round(soma / qtd * 10) / 10
    l.media = media
    l.situacao = media === null ? 'Sem notas' : qtd < 4 ? (media >= 6 ? 'Em andamento' : 'Atenção') : (media >= 6 ? 'Aprovado' : 'Recuperação')
    return l
  })
}
function frequencia(a) {
  const fs = db.freq.filter((f) => f.alunoId === a.id)
  const pres = fs.filter((f) => f.presente).length
  return { aulas: fs.length, presencas: pres, faltas: fs.length - pres, percentual: fs.length ? Math.round(pres * 1000 / fs.length) / 10 : 100 }
}

// ---------- serialização (mesmo formato do JSON do Spring) ----------
const usuarioPub = (u) => u && { id: u.id, nome: u.nome, email: u.email, perfil: u.perfil, telefone: u.telefone ?? null, disciplinas: u.disciplinas ?? null }
const turmaJSON = (t) => t && { id: t.id, nome: t.nome, segmento: t.segmento, turno: t.turno, sala: t.sala, horario: t.horario, professor: usuarioPub(usuario(t.professorId)), capacidade: CAPACIDADE }
function alunoJSON(a) {
  const resps = a.responsaveis.map(usuario)
  const { responsaveis, usuarioId, turmaId, ...resto } = a
  return { ...resto, turma: turmaJSON(turma(turmaId)), pendencias: pendencias(a), responsaveisNomes: resps.map((r) => r.nome),
    responsavelEmail: resps[0]?.email ?? null, responsavelTelefone: resps[0]?.telefone ?? null }
}
const avisoJSON = (v) => ({ ...v, turma: v.turmaId ? turmaJSON(turma(v.turmaId)) : null })
function contratoView(c) {
  const a = alunoDe(c), t = turma(a.turmaId)
  return { id: c.id, aluno: a.nome, matricula: a.matricula, dataNascimento: a.dataNascimento, turma: t.nome, segmento: t.segmento, tipo: c.tipo,
    tipoCobranca: tipoCobranca(t.segmento), responsavel: a.responsaveis.map((r) => usuario(r).nome).join(', '), anoLetivo: c.anoLetivo,
    numeroParcelas: c.numeroParcelas, valorParcela: c.valorParcela, valorTabela: valorTabela(t.nome), valorOficial: valorOficial(c),
    descontoPercentual: c.descontoPercentual, divergente: divergente(c), parcelasGeradas: c.parcelasGeradas, observacao: c.observacao,
    dataEmissao: c.dataEmissao, hospitalReferencia: a.hospitalReferencia, contatoEmergencia: a.contatoEmergencia, autorizadosRetirada: a.autorizadosRetirada }
}
function painelAluno(a) {
  const t = turma(a.turmaId)
  return { id: a.id, nome: a.nome, matricula: a.matricula, dataNascimento: a.dataNascimento, turma: t.nome, segmento: t.segmento, turno: t.turno,
    sala: t.sala, horario: t.horario, professor: usuario(t.professorId)?.nome ?? '—', status: a.status, boletim: boletim(a), frequencia: frequencia(a),
    materiais: MATERIAIS[t.nome] ?? [], hospitalReferencia: a.hospitalReferencia, contatoEmergencia: a.contatoEmergencia, autorizadosRetirada: a.autorizadosRetirada }
}

// ---------- carga de dados fictícios (mesma do DataSeeder.java) ----------
function semear() {
  const rnd = rng(42)
  const ano = new Date().getFullYear()
  const hj = hoje()
  db.inst = { id: 1, razaoSocial: 'Instituto Educacional Semeando', nomeFantasia: 'Centro Educacional Semeando', cnpj: '00.000.000/0001-00',
    endereco: 'Rua Exemplo, 100 - Pontal da Ilha, São Luís/MA', telefone: '(98) 0000-0000', multaPercentual: 2.0, jurosMensalPercentual: 1.0 }
  const user = (nome, email, perfil, extra = {}) => { const u = { id: id(), nome, email, senha: SENHA, perfil, telefone: null, disciplinas: null, ...extra }; db.usuarios.push(u); return u }
  const gestor = user('Coordenação Semeando', 'gestor@exemplo.com', 'GESTOR')
  const ana = user('Ana Beatriz Souza', 'professor@exemplo.com', 'PROFESSOR', { disciplinas: 'Polivalente - Ensino Fundamental' })
  const carlos = user('Carlos Mendes', 'professor2@exemplo.com', 'PROFESSOR', { disciplinas: 'Polivalente - Educação Infantil' })
  const juliana = user('Juliana Costa', 'professor3@exemplo.com', 'PROFESSOR', { disciplinas: 'Polivalente - Ensino Fundamental' })
  const defs = [['Maternal I', 'INFANTIL', 'Manhã', 'Sala 1', '07:30 - 11:30', carlos, 150], ['Maternal II', 'INFANTIL', 'Manhã', 'Sala 2', '07:30 - 11:30', carlos, 150],
    ['Infantil I', 'INFANTIL', 'Tarde', 'Sala 1', '13:30 - 17:30', carlos, 180], ['Infantil II', 'INFANTIL', 'Tarde', 'Sala 2', '13:30 - 17:30', carlos, 180],
    ['1º ano', 'FUNDAMENTAL', 'Manhã', 'Sala 3', '07:00 - 11:30', juliana, 375], ['2º ano', 'FUNDAMENTAL', 'Manhã', 'Sala 4', '07:00 - 11:30', juliana, 375],
    ['3º ano', 'FUNDAMENTAL', 'Manhã', 'Sala 5', '07:00 - 11:30', ana, 375], ['4º ano', 'FUNDAMENTAL', 'Tarde', 'Sala 3', '13:00 - 17:30', juliana, 375],
    ['5º ano', 'FUNDAMENTAL', 'Tarde', 'Sala 5', '13:00 - 17:30', ana, 375]]
  const T = {}
  for (const [nome, seg, turno, sala, horario, prof, valor] of defs) {
    const t = { id: id(), nome, segmento: seg, turno, sala, horario, professorId: prof.id }
    db.turmas.push(t); T[nome] = t
    db.precos.push({ id: id(), serie: nome, valor })
  }
  const idade = (t) => ({ 'Maternal I': 2, 'Maternal II': 3, 'Infantil I': 4, 'Infantil II': 5 }[t.nome] ?? 5 + Number(t.nome[0]))
  const NOMES = ['Ana', 'Bruno', 'Clara', 'Davi', 'Elisa', 'Felipe', 'Giovana', 'Heitor', 'Isabela', 'Joaquim', 'Laura', 'Miguel', 'Nina', 'Otávio', 'Pietra', 'Rafael',
    'Sara', 'Theo', 'Valentina', 'Arthur', 'Beatriz', 'Caio', 'Helena', 'Enzo', 'Lívia', 'Gabriel', 'Manuela', 'Samuel', 'Alice', 'Benício', 'Cecília', 'Lorenzo',
    'Marina', 'Noah', 'Yasmin', 'Bernardo']
  const SOBRE = ['Almeida', 'Barbosa', 'Cardoso', 'Dias', 'Esteves', 'Farias', 'Gomes', 'Lima', 'Moraes', 'Nogueira', 'Ribeiro', 'Teixeira']
  const RESP = ['Patrícia', 'Ricardo', 'Fernanda', 'Marcos', 'Juliana', 'Paulo', 'Cristina', 'André', 'Luciana', 'Rodrigo', 'Simone', 'Fábio']
  let seqResp = 1
  const responsavel = (sobrenome) => { const n = seqResp++; return user(`${RESP[n % RESP.length]} ${sobrenome}`, `resp${n}@exemplo.com`, 'RESPONSAVEL', { telefone: `(98) 90000-${pad(100 + n, 4)}` }) }
  const docsOk = (a) => Object.assign(a, { docCertidaoNascimento: true, docComprovanteResidencia: true, docCartaoVacina: true, docFoto: true,
    docDocumentoResponsavel: true, taxaMatriculaPaga: true, comprovanteTaxa: 'REC-' + (1000 + rnd.int(9000)), consentimentoLgpd: true })
  const baseAluno = (nome, t, resp, nasc, status) => ({ id: id(), nome, dataNascimento: nasc, matricula: null, turmaId: t.id, status, motivoRejeicao: null,
    docCertidaoNascimento: false, docComprovanteResidencia: false, docCartaoVacina: false, docFoto: false, docDocumentoResponsavel: false,
    taxaMatriculaPaga: false, comprovanteTaxa: null, fardamento: null, hospitalReferencia: null, contatoEmergencia: null, autorizadosRetirada: null,
    consentimentoLgpd: false, usuarioId: null, responsaveis: [resp.id] })
  const matriculado = (nome, t, resp, nasc) => {
    const a = docsOk(baseAluno(nome, t, resp, nasc, 'MATRICULADO'))
    Object.assign(a, { hospitalReferencia: 'Hospital Municipal (exemplo)', contatoEmergencia: `${resp.nome} - ${resp.telefone}`, autorizadosRetirada: resp.nome })
    a.matricula = ano + pad(a.id, 4)
    db.alunos.push(a); return a
  }
  const maria = user('Maria Pereira', 'responsavel@exemplo.com', 'RESPONSAVEL', { telefone: '(98) 90000-0001' })
  const lucas = matriculado('Lucas Pereira', T['3º ano'], maria, `${ano - 8}-04-12`)
  lucas.usuarioId = user('Lucas Pereira', 'aluno@exemplo.com', 'ALUNO').id
  matriculado('Sofia Pereira', T['Infantil II'], maria, `${ano - 5}-09-03`)
  let i = 0
  for (const t of db.turmas) for (let k = 0; k < 5; k++, i++) {
    const sob = SOBRE[(i * 7) % SOBRE.length]
    matriculado(`${NOMES[i % NOMES.length]} ${sob}`, t, responsavel(sob), `${ano - idade(t)}-${pad(1 + rnd.int(12))}-${pad(1 + rnd.int(28))}`)
  }
  let divergenteCriado = false, bolsaCriada = false
  for (const a of [...db.alunos]) {
    const c = novoContrato(a, ano)
    const t = turma(a.turmaId)
    if (!divergenteCriado && a !== lucas && t.nome === '3º ano') {
      divergenteCriado = true
      c.valorParcela = 310; c.observacao = 'Contrato migrado do arquivo Word - valor a conferir'
      continue
    }
    if (!bolsaCriada && t.nome === '5º ano') { bolsaCriada = true; c.descontoPercentual = 50; c.observacao = 'Bolsa social de 50%'; c.valorParcela = valorOficial(c) }
    gerarParcelas(c, false)
    const inad = a === lucas || rnd.int(5) === 0
    for (const p of db.parcelas.filter((x) => x.contratoId === c.id)) {
      if (p.vencimento < hj && !(inad && p.vencimento > addDias(hj, -50))) {
        p.pago = true; p.dataPagamento = addDias(p.vencimento, -rnd.int(5)); p.valorPago = p.valor
      }
    }
  }
  const pre = (nome, t, status) => { const a = baseAluno(nome, t, responsavel(nome.split(' ').pop()), addDias(hj, -365 * idade(t) - rnd.int(300)), status); db.alunos.push(a); return a }
  Object.assign(pre('Pedro Henrique Dias', T['1º ano'], 'PRE_MATRICULA'), { docCertidaoNascimento: true, docFoto: true })
  Object.assign(pre('Luna Farias', T['Maternal I'], 'PRE_MATRICULA'), { docCertidaoNascimento: true, docComprovanteResidencia: true, consentimentoLgpd: true })
  const p3 = docsOk(pre('Matheus Lima', T['4º ano'], 'APROVADA'))
  const r3 = usuario(p3.responsaveis[0])
  Object.assign(p3, { fardamento: '2 camisas (P), 1 bermuda (P)', hospitalReferencia: 'Hospital Municipal (exemplo)', contatoEmergencia: `${r3.nome} - (98) 90000-0999`, autorizadosRetirada: r3.nome })
  pre('Antônio Ribeiro', T['5º ano'], 'REJEITADA').motivoRejeicao = 'Família optou por outra escola após visita.'

  const diasAula = []
  for (let d = addDias(hj, -1); diasAula.length < 20; d = addDias(d, -1)) { const w = parse(d).getDay(); if (w !== 0 && w !== 6) diasAula.push(d) }
  for (const a of db.alunos.filter((x) => x.status === 'MATRICULADO')) {
    const base = 5.5 + rnd.dbl() * 4
    for (const disc of disciplinas(turma(a.turmaId).segmento)) for (let b = 1; b <= 3; b++)
      db.notas.push({ id: id(), alunoId: a.id, disciplina: disc, bimestre: b, valor: Math.max(0, Math.min(10, Math.round((base + rnd.gauss()) * 2) / 2)) })
    for (const d of diasAula) db.freq.push({ id: id(), alunoId: a.id, data: d, presente: rnd.int(100) < 92 })
  }
  ;[['Português', 'Leitura compartilhada e interpretação de texto: fábulas.'], ['Matemática', 'Multiplicação com reagrupamento - exercícios no caderno.'],
    ['Ciências', 'Ciclo da água: experimento com evaporação.'], ['História', 'A formação da cidade de São Luís.']]
    .forEach(([disc, cont], k) => db.aulas.push({ id: id(), turmaId: T['3º ano'].id, data: diasAula[k], disciplina: disc, conteudo: cont }))
  const plano = (t, disciplina, data, titulo, objetivos, atividades) => db.planos.push({ id: id(), turmaId: t.id, professorId: ana.id, disciplina, data, titulo, objetivos, atividades })
  plano(T['3º ano'], 'Matemática', addDias(hj, 2), 'Divisão exata', 'Compreender a divisão como repartição em partes iguais.', 'Uso de material concreto (tampinhas), resolução de problemas em dupla.')
  plano(T['5º ano'], 'Ciências', addDias(hj, 3), 'Sistema solar', 'Identificar os planetas e suas características.', 'Vídeo curto, construção de maquete em grupo e roda de conversa.')
  const aviso = (titulo, mensagem, autor, t, d) => db.avisos.push({ id: id(), titulo, mensagem, autor: autor.nome, turmaId: t?.id ?? null, dataHora: agora(d) })
  aviso('Reunião de pais e mestres', 'Convidamos todas as famílias para a reunião do 4º bimestre no sábado, às 9h, no pátio da escola.', gestor, null, 1)
  aviso('Campanha de vacinação', 'Lembramos que o cartão de vacina atualizado é documento obrigatório para a rematrícula.', gestor, null, 3)
  aviso('Feira de Ciências', 'O 3º ano apresentará os experimentos sobre o ciclo da água na próxima sexta-feira. Tragam garrafa PET.', ana, T['3º ano'], 2)
  aviso(`Rematrícula ${ano + 1}`, 'As rematrículas para o próximo ano letivo começam em novembro. Fique atento aos documentos obrigatórios.', gestor, null, 5)
  const ev = (data, titulo, tipo) => db.eventos.push({ id: id(), data, titulo, tipo })
  ev(`${ano}-02-02`, 'Início do ano letivo', 'LETIVO'); ev(`${ano}-04-21`, 'Tiradentes', 'FERIADO'); ev(`${ano}-04-30`, 'Fim do 1º bimestre', 'AVALIACAO')
  ev(`${ano}-07-03`, 'Fim do 2º bimestre', 'AVALIACAO'); ev(`${ano}-07-06`, 'Início do recesso escolar', 'FERIADO'); ev(`${ano}-07-27`, 'Retorno das aulas', 'LETIVO')
  ev(`${ano}-09-07`, 'Independência do Brasil', 'FERIADO'); ev(`${ano}-09-30`, 'Fim do 3º bimestre', 'AVALIACAO'); ev(addDias(hj, 7), 'Feira de Ciências', 'LETIVO')
  ev(addDias(hj, 15), 'Reunião de pais e mestres', 'REUNIAO'); ev(`${ano}-12-11`, 'Fim do 4º bimestre', 'AVALIACAO'); ev(`${ano}-12-18`, 'Encerramento do ano letivo', 'LETIVO')
  auditar(null, 'CARGA_INICIAL', 'Massa de dados fictícia criada para demonstração (RN07).')
}
semear()

// ---------- rotas ----------
const rotas = []
const rota = (metodo, padrao, perfis, fn) => rotas.push({ metodo, re: new RegExp('^' + padrao.replace(/:(\w+)/g, '(?<$1>[^/]+)') + '$'), perfis, fn })
const ordenarEventos = () => [...db.eventos].sort((a, b) => a.data.localeCompare(b.data))
const ordenarAvisos = () => [...db.avisos].sort((a, b) => b.dataHora.localeCompare(a.dataHora))
const doResponsavel = (u) => db.alunos.filter((a) => a.responsaveis.includes(u.id)).sort((a, b) => a.nome.localeCompare(b.nome))
const filhos = (u) => doResponsavel(u).filter((a) => a.status === 'MATRICULADO')
const blank = vazio
const porNome = (a, b) => a.nome.localeCompare(b.nome)

rota('POST', '/auth/login', null, ({ body }) => {
  const u = db.usuarios.find((x) => x.email.toLowerCase() === String(body?.email ?? '').trim().toLowerCase())
  if (!u || u.senha !== body?.senha) throw new Erro(401, 'E-mail ou senha inválidos')
  const token = crypto.randomUUID ? crypto.randomUUID() : String(Math.random())
  tokens.set(token, u.id)
  return { token, usuario: { id: u.id, nome: u.nome, email: u.email, perfil: u.perfil } }
})
rota('GET', '/auth/config', null, () => ({ googleClientId: null }))
rota('GET', '/auth/me', [], ({ u }) => ({ id: u.id, nome: u.nome, email: u.email, perfil: u.perfil }))
rota('POST', '/auth/logout', [], ({ token }) => { tokens.delete(token) })

rota('GET', '/avisos', [], ({ u }) => {
  if (u.perfil === 'GESTOR') return ordenarAvisos().map(avisoJSON)
  const vis = new Set()
  if (u.perfil === 'PROFESSOR') db.turmas.filter((t) => t.professorId === u.id).forEach((t) => vis.add(t.id))
  if (u.perfil === 'ALUNO') db.alunos.filter((a) => a.usuarioId === u.id).forEach((a) => vis.add(a.turmaId))
  if (u.perfil === 'RESPONSAVEL') doResponsavel(u).forEach((a) => vis.add(a.turmaId))
  return ordenarAvisos().filter((v) => !v.turmaId || vis.has(v.turmaId)).map(avisoJSON)
})
rota('GET', '/calendario', [], () => ordenarEventos())
rota('GET', '/instituicao', [], () => ({ ...inst() }))
rota('GET', '/materiais', [], () => MATERIAIS)

// ----- gestor -----
const G = ['GESTOR']
function obrigacoes() {
  const hj = hoje(), d = parse(hj), y = d.getFullYear(), m = d.getMonth() + 1
  let smtt = `${y}-03-31`; if (smtt < hj) smtt = `${y + 1}-03-31`
  let censo = `${y}-06-30`; if (censo < hj) censo = `${y + 1}-06-30`
  const presenca = fimDoMes(y, m % 2 === 0 ? m : m + 1)
  const ob = (nome, orgao, prazo, descricao) => { const dr = dias(hj, prazo); return { nome, orgao, prazo, descricao, diasRestantes: dr, status: dr <= 15 ? 'URGENTE' : dr <= 60 ? 'PROXIMO' : 'NO_PRAZO' } }
  return [ob('Sistema Presença', 'MEC', presenca, 'Atualização bimestral de frequência escolar'), ob('Dados SMTT', 'SMTT', smtt, 'Informações anuais de alunos por turno'),
    ob('Censo Escolar', 'INEP', censo, 'Matrícula inicial - exportação dos dados dos alunos')]
}
rota('GET', '/gestor/dashboard', G, () => {
  let recebido = 0, previsto = 0, atraso = 0
  const inad = new Set(), mes = hoje().slice(0, 7)
  for (const p of db.parcelas) {
    if (p.pago && p.dataPagamento.slice(0, 7) === mes) recebido += p.valorPago
    if (p.vencimento.slice(0, 7) === mes) previsto += p.valor
    if (situacao(p) === 'ATRASADA') { atraso += total(p); inad.add(contratoDe(p).alunoId) }
  }
  return { alunosMatriculados: db.alunos.filter((a) => a.status === 'MATRICULADO').length,
    preMatriculas: db.alunos.filter((a) => ['PRE_MATRICULA', 'APROVADA'].includes(a.status)).length,
    professores: db.usuarios.filter((x) => x.perfil === 'PROFESSOR').length,
    ocupacao: db.turmas.map((t) => ({ turma: t.nome, matriculados: CAPACIDADE - vagas(t), capacidade: CAPACIDADE })),
    recebidoMes: r2(recebido), previstoMes: r2(previsto), emAtraso: r2(atraso), alunosInadimplentes: inad.size,
    contratosDivergentes: db.contratos.filter(divergente).length, obrigacoes: obrigacoes() }
})
rota('GET', '/gestor/alunos', G, () => [...db.alunos].sort(porNome).map(alunoJSON))
rota('POST', '/gestor/alunos', G, ({ u, body: f }) => {
  if (blank(f.nome) || blank(f.responsavelNome) || blank(f.responsavelEmail) || !f.turmaId) throw new Erro(400, 'Preencha nome do aluno, turma e dados do responsável')
  let resp = db.usuarios.find((x) => x.email.toLowerCase() === f.responsavelEmail.trim().toLowerCase())
  if (!resp) { resp = { id: id(), nome: f.responsavelNome.trim(), email: f.responsavelEmail.trim().toLowerCase(), senha: SENHA, perfil: 'RESPONSAVEL', telefone: f.responsavelTelefone, disciplinas: null }; db.usuarios.push(resp) }
  if (resp.perfil !== 'RESPONSAVEL') throw new Erro(400, 'Este e-mail já pertence a um usuário que não é responsável')
  const t = porId('turmas', f.turmaId, 'Turma')
  const a = { id: id(), nome: f.nome.trim(), dataNascimento: f.dataNascimento || null, matricula: null, turmaId: t.id, status: 'PRE_MATRICULA', motivoRejeicao: null,
    docCertidaoNascimento: false, docComprovanteResidencia: false, docCartaoVacina: false, docFoto: false, docDocumentoResponsavel: false, taxaMatriculaPaga: false,
    comprovanteTaxa: null, fardamento: null, hospitalReferencia: null, contatoEmergencia: null, autorizadosRetirada: null, consentimentoLgpd: false, usuarioId: null, responsaveis: [resp.id] }
  db.alunos.push(a)
  auditar(u, 'PRE_MATRICULA', `Pré-matrícula de ${a.nome} (${t.nome})`)
  return alunoJSON(a)
})
rota('PUT', '/gestor/alunos/:id', G, ({ u, p, body: f }) => {
  const a = porId('alunos', p.id, 'Aluno')
  if (f.turmaId && Number(f.turmaId) !== a.turmaId) {
    const nova = porId('turmas', f.turmaId, 'Turma'), atual = turma(a.turmaId)
    if (a.status === 'MATRICULADO') {
      if (nova.segmento !== atual.segmento) throw new Erro(400, 'Troca entre Educação Infantil e Fundamental exige nova matrícula (modelo de cobrança diferente)')
      if (vagas(nova) <= 0) throw new Erro(400, `Turma ${nova.nome} sem vagas (máx. 30)`)
    }
    a.turmaId = nova.id
  }
  if (!blank(f.nome)) a.nome = f.nome.trim()
  a.dataNascimento = f.dataNascimento || null
  for (const k of ['docCertidaoNascimento', 'docComprovanteResidencia', 'docCartaoVacina', 'docFoto', 'docDocumentoResponsavel', 'taxaMatriculaPaga', 'consentimentoLgpd']) a[k] = !!f[k]
  for (const k of ['comprovanteTaxa', 'fardamento', 'hospitalReferencia', 'contatoEmergencia', 'autorizadosRetirada']) a[k] = f[k] ?? null
  const pend = pendencias(a)
  auditar(u, 'ALTERACAO_ALUNO', `Dados de ${a.nome} atualizados. Pendências: ${pend.length ? pend.join(', ') : 'nenhuma'}`)
  return alunoJSON(a)
})
rota('POST', '/gestor/alunos/:id/aprovar', G, ({ u, p }) => {
  const a = porId('alunos', p.id, 'Aluno')
  if (a.status !== 'PRE_MATRICULA') throw new Erro(400, 'Somente pré-matrículas podem ser aprovadas')
  a.status = 'APROVADA'; auditar(u, 'APROVACAO', 'Pré-matrícula aprovada: ' + a.nome)
  return alunoJSON(a)
})
rota('POST', '/gestor/alunos/:id/rejeitar', G, ({ u, p, body }) => {
  const a = porId('alunos', p.id, 'Aluno')
  if (a.status === 'MATRICULADO') throw new Erro(400, 'Aluno já matriculado')
  if (blank(body?.motivo)) throw new Erro(400, 'Informe o motivo da rejeição')
  a.status = 'REJEITADA'; a.motivoRejeicao = body.motivo
  auditar(u, 'REJEICAO', `Pré-matrícula rejeitada: ${a.nome}. Motivo: ${body.motivo}`)
  return alunoJSON(a)
})
rota('POST', '/gestor/alunos/:id/efetivar', G, ({ u, p }) => {
  const a = porId('alunos', p.id, 'Aluno'), t = turma(a.turmaId)
  if (a.status !== 'APROVADA') throw new Erro(422, 'A pré-matrícula precisa ser aprovada antes')
  const pend = pendencias(a)
  if (pend.length) throw new Erro(422, 'Matrícula com pendências: ' + pend.join(', '))
  if (vagas(t) <= 0) throw new Erro(422, `Turma ${t.nome} atingiu o limite de ${CAPACIDADE} alunos`)
  a.status = 'MATRICULADO'
  if (!a.matricula) a.matricula = new Date().getFullYear() + pad(a.id, 4)
  const c = novoContrato(a, new Date().getFullYear())
  auditar(u, 'MATRICULA_EFETIVADA', `${a.nome} matriculado(a) em ${t.nome}. ${c.tipo} emitido(a) com parcela de R$ ${fmt(c.valorParcela)}`)
  return alunoJSON(a)
})
rota('GET', '/gestor/turmas', G, () => db.turmas.map((t) => ({ id: t.id, nome: t.nome, segmento: t.segmento, turno: t.turno, sala: t.sala, horario: t.horario,
  professorId: t.professorId, professor: usuario(t.professorId)?.nome ?? '—', matriculados: CAPACIDADE - vagas(t), capacidade: CAPACIDADE, valorTabela: valorTabela(t.nome) })))
rota('PUT', '/gestor/turmas/:id', G, ({ u, p, body: f }) => {
  const t = porId('turmas', p.id, 'Turma')
  t.professorId = f.professorId ? porId('usuarios', f.professorId, 'Professor').id : null
  Object.assign(t, { sala: f.sala, turno: f.turno, horario: f.horario })
  auditar(u, 'ALTERACAO_TURMA', `Turma ${t.nome} atualizada`)
  return { mensagem: 'Turma atualizada' }
})
rota('GET', '/gestor/turmas/:id/alunos', G, ({ p }) => matriculados(porId('turmas', p.id, 'Turma')).sort(porNome).map(alunoJSON))
rota('GET', '/gestor/professores', G, () => db.usuarios.filter((x) => x.perfil === 'PROFESSOR').sort(porNome).map((x) => ({ id: x.id, nome: x.nome, email: x.email,
  telefone: x.telefone, disciplinas: x.disciplinas, turmas: db.turmas.filter((t) => t.professorId === x.id).map((t) => t.nome).sort() })))
rota('POST', '/gestor/professores', G, ({ u, body: f }) => {
  if (blank(f.nome) || blank(f.email)) throw new Erro(400, 'Informe nome e e-mail')
  if (db.usuarios.some((x) => x.email.toLowerCase() === f.email.trim().toLowerCase())) throw new Erro(400, 'E-mail já cadastrado')
  const n = { id: id(), nome: f.nome.trim(), email: f.email.trim().toLowerCase(), senha: SENHA, perfil: 'PROFESSOR', telefone: f.telefone, disciplinas: f.disciplinas }
  db.usuarios.push(n); auditar(u, 'NOVO_PROFESSOR', 'Professor(a) cadastrado(a): ' + n.nome)
  return { mensagem: 'Professor cadastrado. Senha inicial: ' + SENHA }
})
rota('GET', '/gestor/precos', G, () => db.precos.map((x) => ({ ...x })))
rota('PUT', '/gestor/precos/:id', G, ({ u, p, body }) => {
  const v = Number(body?.valor)
  if (!(v > 0)) throw new Erro(400, 'Valor inválido')
  const pr = porId('precos', p.id, 'Preço')
  auditar(u, 'ALTERACAO_TABELA', `${pr.serie}: R$ ${fmt(pr.valor)} -> R$ ${fmt(v)}`)
  pr.valor = r2(v); return { ...pr }
})
rota('GET', '/gestor/contratos', G, () => [...db.contratos]
  .sort((a, b) => (divergente(b) - divergente(a)) || alunoDe(a).nome.localeCompare(alunoDe(b).nome)).map(contratoView))
const atualizarContrato = (u, c, f) => {
  if (c.parcelasGeradas) throw new Erro(400, 'Contrato com cobranças já emitidas não pode ser alterado')
  const d = Number(f.descontoPercentual)
  if (!(d >= 0 && d <= 100)) throw new Erro(400, 'Desconto deve estar entre 0 e 100%')
  const antes = `R$ ${fmt(c.valorParcela)} / desconto ${c.descontoPercentual}%`
  c.descontoPercentual = d
  c.valorParcela = f.valorParcela == null ? valorOficial(c) : r2(Number(f.valorParcela))
  c.observacao = f.observacao ?? null
  auditar(u, 'ALTERACAO_CONTRATO', `${alunoDe(c).nome}: ${antes} -> R$ ${fmt(c.valorParcela)} / desconto ${c.descontoPercentual}%`)
  return contratoView(c)
}
rota('PUT', '/gestor/contratos/:id', G, ({ u, p, body }) => atualizarContrato(u, porId('contratos', p.id, 'Contrato'), body))
rota('POST', '/gestor/contratos/:id/corrigir', G, ({ u, p }) => { const c = porId('contratos', p.id, 'Contrato'); return atualizarContrato(u, c, { valorParcela: null, descontoPercentual: c.descontoPercentual, observacao: c.observacao }) })
rota('POST', '/gestor/contratos/:id/gerar', G, ({ u, p }) => {
  const c = porId('contratos', p.id, 'Contrato')
  const geradas = gerarParcelas(c)
  auditar(u, 'COBRANCA_EMITIDA', `${geradas} parcelas de R$ ${fmt(c.valorParcela)} emitidas para ${alunoDe(c).nome}`)
  return { ...contratoView(c), parcelasEmitidas: geradas }
})
rota('GET', '/gestor/parcelas', G, () => [...db.parcelas]
  .sort((a, b) => a.vencimento.localeCompare(b.vencimento) || alunoDe(contratoDe(a)).nome.localeCompare(alunoDe(contratoDe(b)).nome)).map(parcelaView))
rota('POST', '/gestor/parcelas/:id/pagar', G, ({ u, p }) => {
  const pa = porId('parcelas', p.id, 'Parcela')
  if (pa.pago) throw new Erro(409, 'Parcela já está paga')
  pa.valorPago = total(pa); pa.dataPagamento = hoje(); pa.pago = true
  auditar(u, 'BAIXA_PAGAMENTO', `Parcela ${pa.numero} de ${alunoDe(contratoDe(pa)).nome} paga: R$ ${fmt(pa.valorPago)} (boleto ${pa.codigoBoleto})`)
  return parcelaView(pa)
})
rota('PUT', '/gestor/instituicao', G, ({ u, body: f }) => {
  Object.assign(db.inst, { razaoSocial: f.razaoSocial, nomeFantasia: f.nomeFantasia, cnpj: f.cnpj, endereco: f.endereco, telefone: f.telefone,
    multaPercentual: Number(f.multaPercentual), jurosMensalPercentual: Number(f.jurosMensalPercentual) })
  auditar(u, 'ALTERACAO_INSTITUICAO', 'Identidade institucional atualizada')
  return { ...db.inst }
})
const novoAviso = (u, f, turmaId) => {
  if (blank(f.titulo) || blank(f.mensagem)) throw new Erro(400, 'Informe título e mensagem')
  const v = { id: id(), titulo: f.titulo, mensagem: f.mensagem, autor: u.nome, dataHora: agora(), turmaId }
  db.avisos.push(v); return avisoJSON(v)
}
rota('POST', '/gestor/avisos', G, ({ u, body: f }) => novoAviso(u, f, f.turmaId ? porId('turmas', f.turmaId, 'Turma').id : null))
rota('DELETE', '/gestor/avisos/:id', G, ({ p }) => { db.avisos = db.avisos.filter((v) => v.id !== Number(p.id)) })
rota('POST', '/gestor/calendario', G, ({ body: f }) => {
  if (!f.data || blank(f.titulo)) throw new Erro(400, 'Informe data e título')
  const e = { id: id(), data: f.data, titulo: f.titulo, tipo: f.tipo }; db.eventos.push(e); return e
})
rota('DELETE', '/gestor/calendario/:id', G, ({ p }) => { db.eventos = db.eventos.filter((e) => e.id !== Number(p.id)) })
rota('GET', '/gestor/auditoria', G, () => db.auditoria.slice(0, 200))
rota('GET', '/gestor/obrigacoes', G, () => obrigacoes())
rota('GET', '/gestor/exportar/:tipo', G, ({ u, p }) => {
  const lista = db.alunos.filter((a) => a.status === 'MATRICULADO').sort(porNome)
  let csv
  if (p.tipo === 'censo') csv = 'matricula;nome;data_nascimento;turma;etapa;turno\n' + lista.map((a) => { const t = turma(a.turmaId); return [a.matricula, a.nome, a.dataNascimento, t.nome, t.segmento, t.turno].join(';') }).join('\n')
  else if (p.tipo === 'smtt') csv = 'turma;turno;horario;quantidade_alunos\n' + db.turmas.map((t) => [t.nome, t.turno, t.horario, lista.filter((a) => a.turmaId === t.id).length].join(';')).join('\n')
  else throw new Erro(400, 'Tipo de exportação inválido')
  auditar(u, 'EXPORTACAO', `Exportação ${p.tipo.toUpperCase()} gerada`)
  return csv
})
rota('GET', '/gestor/backup', G, ({ u }) => {
  const b = { geradoEm: agora(), instituicao: { ...db.inst }, alunos: db.alunos.map(alunoJSON), contratos: db.contratos.map(contratoView),
    parcelas: db.parcelas.map(parcelaView), notas: db.notas.map((n) => ({ alunoId: n.alunoId, disciplina: n.disciplina, bimestre: n.bimestre, valor: n.valor })) }
  auditar(u, 'BACKUP', 'Cópia de segurança gerada')
  return b
})

// ----- professor -----
const P = ['PROFESSOR']
const minhaTurma = (i, u) => {
  const t = porId('turmas', i, 'Turma')
  if (t.professorId !== u.id) throw new Erro(403, 'Esta turma não está atribuída a você')
  return t
}
rota('GET', '/professor/turmas', P, ({ u }) => db.turmas.filter((t) => t.professorId === u.id).sort(porNome).map((t) => ({ id: t.id, nome: t.nome,
  segmento: t.segmento, turno: t.turno, sala: t.sala, horario: t.horario, alunos: matriculados(t).length, disciplinas: disciplinas(t.segmento) })))
rota('GET', '/professor/turmas/:id/alunos', P, ({ u, p }) => matriculados(minhaTurma(p.id, u)).sort(porNome).map((a) => ({ id: a.id, nome: a.nome,
  matricula: a.matricula, frequencia: frequencia(a).percentual, boletim: boletim(a) })))
rota('GET', '/professor/turmas/:id/notas', P, ({ u, p, q }) => matriculados(minhaTurma(p.id, u)).sort(porNome).map((a) => ({ alunoId: a.id, nome: a.nome,
  valor: db.notas.find((n) => n.alunoId === a.id && n.disciplina === q.disciplina && n.bimestre === Number(q.bimestre))?.valor ?? null })))
rota('POST', '/professor/turmas/:id/notas', P, ({ u, p, body: f }) => {
  const t = minhaTurma(p.id, u)
  if (!(f.bimestre >= 1 && f.bimestre <= 4)) throw new Erro(400, 'Bimestre inválido')
  const ids = new Set(matriculados(t).map((a) => a.id))
  const itens = f.notas.filter((i) => ids.has(i.alunoId) && i.valor != null)
  if (itens.some((i) => i.valor < 0 || i.valor > 10)) throw new Erro(400, 'Notas devem estar entre 0 e 10')
  for (const i of itens) {
    const n = db.notas.find((x) => x.alunoId === i.alunoId && x.disciplina === f.disciplina && x.bimestre === f.bimestre)
    if (n) n.valor = i.valor
    else db.notas.push({ id: id(), alunoId: i.alunoId, disciplina: f.disciplina, bimestre: f.bimestre, valor: i.valor })
  }
  auditar(u, 'LANCAMENTO_NOTAS', `${itens.length} notas de ${f.disciplina} (${f.bimestre}º bim.) - ${t.nome}`)
  return { mensagem: `${itens.length} notas salvas` }
})
rota('GET', '/professor/turmas/:id/frequencia', P, ({ u, p, q }) => matriculados(minhaTurma(p.id, u)).sort(porNome).map((a) => {
  const f = db.freq.find((x) => x.alunoId === a.id && x.data === q.data)
  return { alunoId: a.id, nome: a.nome, presente: f ? f.presente : true, registrado: !!f }
}))
rota('POST', '/professor/turmas/:id/frequencia', P, ({ u, p, body: f }) => {
  const t = minhaTurma(p.id, u)
  if (!f.data || f.data > hoje()) throw new Erro(400, 'Data inválida')
  const ids = new Set(matriculados(t).map((a) => a.id))
  for (const i of f.presencas.filter((x) => ids.has(x.alunoId))) {
    const fr = db.freq.find((x) => x.alunoId === i.alunoId && x.data === f.data)
    if (fr) fr.presente = i.presente
    else db.freq.push({ id: id(), alunoId: i.alunoId, data: f.data, presente: i.presente })
  }
  return { mensagem: 'Frequência registrada' }
})
const aulaJSON = (r) => ({ ...r, turma: turmaJSON(turma(r.turmaId)) })
rota('GET', '/professor/turmas/:id/aulas', P, ({ u, p }) => { const t = minhaTurma(p.id, u); return db.aulas.filter((r) => r.turmaId === t.id).sort((a, b) => b.data.localeCompare(a.data)).map(aulaJSON) })
rota('POST', '/professor/turmas/:id/aulas', P, ({ u, p, body: f }) => {
  const t = minhaTurma(p.id, u)
  if (!f.data || blank(f.conteudo)) throw new Erro(400, 'Informe data e conteúdo')
  const r = { id: id(), turmaId: t.id, data: f.data, disciplina: f.disciplina, conteudo: f.conteudo }
  db.aulas.push(r); return aulaJSON(r)
})
const planoJSON = (pl) => { const { professorId, turmaId, ...resto } = pl; return { ...resto, turma: turmaJSON(turma(turmaId)) } }
rota('GET', '/professor/planos', P, ({ u }) => db.planos.filter((pl) => pl.professorId === u.id).sort((a, b) => (b.data ?? '').localeCompare(a.data ?? '')).map(planoJSON))
rota('POST', '/professor/planos', P, ({ u, body: f }) => {
  if (!f.turmaId || blank(f.titulo)) throw new Erro(400, 'Informe turma e título')
  const pl = { id: id(), professorId: u.id, turmaId: minhaTurma(f.turmaId, u).id, disciplina: f.disciplina, data: f.data || null, titulo: f.titulo, objetivos: f.objetivos, atividades: f.atividades }
  db.planos.push(pl); return planoJSON(pl)
})
rota('DELETE', '/professor/planos/:id', P, ({ u, p }) => { db.planos = db.planos.filter((pl) => !(pl.id === Number(p.id) && pl.professorId === u.id)) })
rota('POST', '/professor/avisos', P, ({ u, body: f }) => {
  if (blank(f.titulo) || blank(f.mensagem)) throw new Erro(400, 'Informe título e mensagem')
  return novoAviso(u, f, minhaTurma(f.turmaId, u).id)
})

// ----- aluno e responsável -----
rota('GET', '/aluno/painel', ['ALUNO'], ({ u }) => {
  const a = db.alunos.find((x) => x.usuarioId === u.id)
  if (!a) throw new Erro(404, 'Cadastro de aluno não vinculado')
  return painelAluno(a)
})
rota('GET', '/responsavel/filhos', ['RESPONSAVEL'], ({ u }) => filhos(u).map(painelAluno))
rota('GET', '/responsavel/parcelas', ['RESPONSAVEL'], ({ u }) => {
  const ids = new Set(filhos(u).map((a) => a.id))
  return db.parcelas.filter((p) => ids.has(contratoDe(p).alunoId)).map(parcelaView).sort((a, b) => a.vencimento.localeCompare(b.vencimento))
})
rota('PUT', '/responsavel/filhos/:id/emergencia', ['RESPONSAVEL'], ({ u, p, body: f }) => {
  const a = filhos(u).find((x) => x.id === Number(p.id))
  if (!a) throw new Erro(403, 'Aluno não vinculado a você')
  Object.assign(a, { hospitalReferencia: f.hospitalReferencia, contatoEmergencia: f.contatoEmergencia, autorizadosRetirada: f.autorizadosRetirada })
  auditar(u, 'DADOS_EMERGENCIA', 'Responsável atualizou dados de emergência de ' + a.nome)
  return painelAluno(a)
})

// ---------- ponto de entrada usado por api.js ----------
export async function atender(metodo, url, body, token) {
  await new Promise((r) => setTimeout(r, 60)) // pequena latência, como uma API real
  const [caminho, qs] = url.split('?')
  const q = Object.fromEntries(new URLSearchParams(qs ?? ''))
  for (const r of rotas) {
    if (r.metodo !== metodo) continue
    const m = caminho.match(r.re)
    if (!m) continue
    let u = null
    if (r.perfis) {
      u = usuario(tokens.get(token))
      if (!u) throw new Erro(401, 'Sessão expirada, faça login novamente')
      if (r.perfis.length && !r.perfis.includes(u.perfil)) throw new Erro(403, 'Acesso não permitido para o seu perfil')
    }
    const res = r.fn({ u, p: m.groups ?? {}, q, body, token })
    return res === undefined ? null : JSON.parse(JSON.stringify(res))
  }
  throw new Erro(404, 'Rota não encontrada: ' + caminho)
}
