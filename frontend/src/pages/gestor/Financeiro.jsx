import { useEffect, useMemo, useState } from 'react'
import { api } from '../../api.js'
import { Alert, Badge, Card, Empty, Field, Loading, Modal, Tabs, confirmar } from '../../components/ui.jsx'
import { data, moeda } from '../../util.js'

export const SITUACAO = { PAGA: ['Paga', 'green'], ABERTA: ['Em aberto', 'blue'], ATRASADA: ['Atrasada', 'red'] }

export default function Financeiro() {
  const [aba, setAba] = useState('contratos')
  const [msg, setMsg] = useState({})
  return (
    <>
      <Alert tone="success" onClose={() => setMsg({})}>{msg.ok}</Alert>
      <Alert tone="error" onClose={() => setMsg({})}>{msg.erro}</Alert>
      <Tabs active={aba} onChange={(a) => { setAba(a); setMsg({}) }} tabs={[
        { id: 'contratos', label: 'Contratos e fichas' },
        { id: 'parcelas', label: 'Cobranças (CORA)' },
        { id: 'tabela', label: 'Tabela oficial' },
      ]} />
      {aba === 'contratos' && <Contratos setMsg={setMsg} />}
      {aba === 'parcelas' && <Parcelas setMsg={setMsg} />}
      {aba === 'tabela' && <Tabela setMsg={setMsg} />}
    </>
  )
}

function Contratos({ setMsg }) {
  const [lista, setLista] = useState(null)
  const [busca, setBusca] = useState('')
  const [filtro, setFiltro] = useState('')
  const [edit, setEdit] = useState(null)
  const [doc, setDoc] = useState(null)
  const [inst, setInst] = useState(null)
  const carregar = () => api.get('/gestor/contratos').then(setLista)
  useEffect(() => { carregar(); api.get('/instituicao').then(setInst) }, [])

  const acao = async (fn, ok) => {
    setMsg({})
    try { const r = await fn(); setMsg({ ok: typeof ok === 'function' ? ok(r) : ok }); carregar(); return true } catch (e) { setMsg({ erro: e.message }); window.scrollTo(0, 0) }
  }

  const filtrados = useMemo(() => (lista || []).filter((c) => c.aluno.toLowerCase().includes(busca.toLowerCase())
    && (!filtro || (filtro === 'divergente' ? c.divergente : filtro === 'pendente' ? !c.parcelasGeradas : c.segmento === filtro))), [lista, busca, filtro])
  if (!lista) return <Loading />
  return (
    <Card title="Contratos de serviços (Fundamental) e fichas de sócio (Infantil)">
      <div className="filters">
        <input placeholder="🔍 Buscar aluno..." value={busca} onChange={(e) => setBusca(e.target.value)} />
        <select value={filtro} onChange={(e) => setFiltro(e.target.value)} aria-label="Filtro">
          <option value="">Todos ({lista.length})</option>
          <option value="divergente">Somente divergentes</option>
          <option value="pendente">Cobrança não emitida</option>
          <option value="FUNDAMENTAL">Ensino Fundamental (contratos)</option>
          <option value="INFANTIL">Educação Infantil (fichas de sócio)</option>
        </select>
      </div>
      {filtrados.length === 0 ? <Empty /> : (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Aluno</th><th>Documento</th><th>Parcela</th><th>Tabela oficial</th><th>Validação</th><th>Cobrança</th><th></th></tr></thead>
            <tbody>
              {filtrados.map((c) => (
                <tr key={c.id} className={c.divergente ? 'row-warn' : ''}>
                  <td data-label="Aluno"><strong>{c.aluno}</strong><div className="muted small">{c.turma} · {c.responsavel}</div></td>
                  <td data-label="Documento">{c.tipo}<div className="muted small">{c.tipoCobranca}</div></td>
                  <td data-label="Parcela">{c.numeroParcelas}x {moeda(c.valorParcela)}{c.descontoPercentual > 0 && <div><Badge tone="purple">Bolsa {c.descontoPercentual}%</Badge></div>}</td>
                  <td data-label="Tabela oficial">{moeda(c.valorOficial)}</td>
                  <td data-label="Validação">{c.divergente ? <Badge tone="red">⚠ Divergente</Badge> : <Badge tone="green">✔ Conforme</Badge>}</td>
                  <td data-label="Cobrança">{c.parcelasGeradas ? <Badge tone="green">Emitida</Badge> : <Badge tone="gray">Não emitida</Badge>}</td>
                  <td className="r actions-cell">
                    {c.divergente && <button className="btn btn-sm btn-warning" onClick={() => acao(() => api.post(`/gestor/contratos/${c.id}/corrigir`), `Contrato de ${c.aluno} corrigido para ${moeda(c.valorOficial)}.`)}>Corrigir valor</button>}
                    {!c.parcelasGeradas && <button className="btn btn-sm btn-primary" onClick={() => acao(() => api.post(`/gestor/contratos/${c.id}/gerar`), (r) => `${r.parcelasEmitidas} boleto(s) a vencer emitido(s) na CORA para ${c.aluno}.`)}>Emitir boletos</button>}
                    {!c.parcelasGeradas && <button className="btn btn-sm btn-ghost" onClick={() => setEdit({ ...c })}>Editar</button>}
                    <button className="btn btn-sm btn-ghost" onClick={() => setDoc(c)}>Documento</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {edit && (
        <Modal title={`Condições do contrato — ${edit.aluno}`} onClose={() => setEdit(null)} footer={<>
          <button className="btn btn-ghost" onClick={() => setEdit(null)}>Cancelar</button>
          <button className="btn btn-primary" onClick={async () => {
            if (await acao(() => api.put(`/gestor/contratos/${edit.id}`, { valorParcela: null, descontoPercentual: Number(edit.descontoPercentual), observacao: edit.observacao }), 'Contrato atualizado.')) setEdit(null)
          }}>Salvar</button>
        </>}>
          <p className="muted">O valor da parcela é calculado automaticamente a partir da tabela oficial ({moeda(edit.valorTabela)}) aplicando a bolsa/desconto, evitando divergências.</p>
          <div className="form-grid">
            <Field label="Bolsa / desconto (%)"><input type="number" min="0" max="100" value={edit.descontoPercentual} onChange={(e) => setEdit({ ...edit, descontoPercentual: e.target.value })} /></Field>
            <Field label="Valor resultante"><input disabled value={moeda(edit.valorTabela * (1 - (Number(edit.descontoPercentual) || 0) / 100))} /></Field>
            <Field label="Observação (acordo, bolsa...)" full><input value={edit.observacao ?? ''} onChange={(e) => setEdit({ ...edit, observacao: e.target.value })} /></Field>
          </div>
        </Modal>
      )}

      {doc && inst && (
        <Modal wide title={doc.tipo} onClose={() => setDoc(null)} footer={!import.meta.env.VITE_DEMO && <button className="btn btn-primary" onClick={() => window.print()}>🖨 Imprimir</button>}>
          <div className="documento print-area">
            <div className="doc-head">
              <strong>{inst.razaoSocial}</strong>
              <span>{inst.nomeFantasia} · CNPJ {inst.cnpj}</span>
              <span>{inst.endereco} · {inst.telefone}</span>
            </div>
            <h3 className="c">{doc.tipo.toUpperCase()} — ANO LETIVO {doc.anoLetivo}</h3>
            <p><strong>CONTRATADA:</strong> {inst.razaoSocial} ({inst.nomeFantasia}), inscrita no CNPJ {inst.cnpj}, com sede em {inst.endereco}.</p>
            <p><strong>{doc.segmento === 'INFANTIL' ? 'ASSOCIADO(A)' : 'CONTRATANTE'}:</strong> {doc.responsavel}, responsável legal pelo(a) aluno(a) <strong>{doc.aluno}</strong>, nascido(a) em {data(doc.dataNascimento)}, matrícula {doc.matricula}, turma {doc.turma}.</p>
            {doc.segmento === 'INFANTIL'
              ? <p><strong>CLÁUSULA 1ª —</strong> O(A) associado(a) contribuirá mensalmente com a <strong>taxa de associado</strong> de {moeda(doc.valorParcela)}, em {doc.numeroParcelas} parcelas, destinada à manutenção das atividades do Instituto.</p>
              : <p><strong>CLÁUSULA 1ª —</strong> Pela prestação dos serviços educacionais, o(a) contratante pagará a anuidade em {doc.numeroParcelas} parcelas mensais de {moeda(doc.valorParcela)}, via boleto bancário, com vencimento no dia 10 de cada mês.</p>}
            <p><strong>CLÁUSULA 2ª —</strong> Parcelas pagas após o vencimento sofrerão multa de {inst.multaPercentual}% e juros de mora de {inst.jurosMensalPercentual}% ao mês, calculados pro rata die.</p>
            {doc.descontoPercentual > 0 && <p><strong>CLÁUSULA 3ª —</strong> Fica concedida bolsa de {doc.descontoPercentual}% sobre o valor da tabela oficial ({moeda(doc.valorTabela)}). {doc.observacao}</p>}
            <p><strong>ANEXO I — DADOS DE EMERGÊNCIA:</strong> Hospital de referência: {doc.hospitalReferencia || '—'} · Contato: {doc.contatoEmergencia || '—'} · Autorizados a retirar: {doc.autorizadosRetirada || '—'}.</p>
            <p><strong>LGPD —</strong> Os dados pessoais do(a) aluno(a) são tratados conforme o art. 14 da Lei nº 13.709/2018, com consentimento específico do responsável.</p>
            <p className="r">São Luís/MA, {data(doc.dataEmissao)}</p>
            <div className="signatures"><span>{inst.nomeFantasia}</span><span>{doc.responsavel}</span></div>
          </div>
        </Modal>
      )}
    </Card>
  )
}

function Parcelas({ setMsg }) {
  const [lista, setLista] = useState(null)
  const [filtro, setFiltro] = useState('ATRASADA')
  const [busca, setBusca] = useState('')
  const carregar = () => api.get('/gestor/parcelas').then(setLista)
  useEffect(() => { carregar() }, [])

  const pagar = async (p) => {
    if (!(await confirmar(`Confirmar baixa da parcela ${p.numero} de ${p.aluno} no valor de ${moeda(p.total)}?`))) return
    try { await api.post(`/gestor/parcelas/${p.id}/pagar`); setMsg({ ok: 'Pagamento registrado.' }); carregar() } catch (e) { setMsg({ erro: e.message }) }
  }

  const filtradas = useMemo(() => (lista || []).filter((p) => (!filtro || p.situacao === filtro) && p.aluno.toLowerCase().includes(busca.toLowerCase())), [lista, filtro, busca])
  if (!lista) return <Loading />
  const soma = filtradas.reduce((s, p) => s + Number(p.total), 0)
  return (
    <Card title={`Cobranças — ${filtradas.length} parcela(s) · ${moeda(soma)}`}>
      <div className="filters">
        <input placeholder="🔍 Buscar aluno..." value={busca} onChange={(e) => setBusca(e.target.value)} />
        <select value={filtro} onChange={(e) => setFiltro(e.target.value)}>
          <option value="">Todas</option>
          <option value="ATRASADA">Atrasadas</option>
          <option value="ABERTA">Em aberto</option>
          <option value="PAGA">Pagas</option>
        </select>
      </div>
      {filtradas.length === 0 ? <Empty /> : (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Aluno</th><th>Tipo</th><th>Parcela</th><th>Vencimento</th><th>Valor</th><th>Multa + Juros</th><th>Total</th><th>Situação</th><th></th></tr></thead>
            <tbody>
              {filtradas.map((p) => (
                <tr key={p.id}>
                  <td data-label="Aluno"><strong>{p.aluno}</strong><div className="muted small">{p.turma}</div></td>
                  <td data-label="Tipo">{p.tipo}</td>
                  <td data-label="Parcela">{p.numero}/{p.totalParcelas}<div className="muted small">{p.codigoBoleto}</div></td>
                  <td data-label="Vencimento">{data(p.vencimento)}{p.diasAtraso > 0 && <div className="small txt-red">{p.diasAtraso} dias de atraso</div>}</td>
                  <td data-label="Valor">{moeda(p.valor)}</td>
                  <td data-label="Multa + Juros">{Number(p.multa) + Number(p.juros) > 0 ? moeda(Number(p.multa) + Number(p.juros)) : '—'}</td>
                  <td data-label="Total"><strong>{moeda(p.total)}</strong></td>
                  <td data-label="Situação"><Badge tone={SITUACAO[p.situacao][1]}>{SITUACAO[p.situacao][0]}</Badge>{p.dataPagamento && <div className="muted small">em {data(p.dataPagamento)}</div>}</td>
                  <td className="r">{p.situacao !== 'PAGA' && <button className="btn btn-sm btn-primary" onClick={() => pagar(p)}>Dar baixa</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}

function Tabela({ setMsg }) {
  const [lista, setLista] = useState(null)
  const [valores, setValores] = useState({})
  const carregar = () => api.get('/gestor/precos').then((l) => { setLista(l); setValores(Object.fromEntries(l.map((p) => [p.id, p.valor]))) })
  useEffect(() => { carregar() }, [])
  const salvar = async (p) => {
    try { await api.put(`/gestor/precos/${p.id}`, { valor: Number(valores[p.id]) }); setMsg({ ok: `Valor do ${p.serie} atualizado.` }); carregar() } catch (e) { setMsg({ erro: e.message }) }
  }
  if (!lista) return <Loading />
  return (
    <Card title="Tabela oficial de mensalidades e taxas">
      <p className="muted">Fonte única de valores. Todo contrato é validado contra esta tabela antes da emissão de boletos.</p>
      <div className="price-grid">
        {lista.map((p) => (
          <div key={p.id} className="price">
            <strong>{p.serie}</strong>
            <small className="muted">{['Maternal I', 'Maternal II', 'Infantil I', 'Infantil II'].includes(p.serie) ? 'Taxa de associado' : 'Mensalidade'}</small>
            <div className="price-edit">
              <span>R$</span>
              <input type="number" step="0.01" value={valores[p.id]} onChange={(e) => setValores({ ...valores, [p.id]: e.target.value })} />
              <button className="btn btn-sm btn-primary" disabled={Number(valores[p.id]) === Number(p.valor)} onClick={() => salvar(p)}>Salvar</button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}
