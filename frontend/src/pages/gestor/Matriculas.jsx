import { useEffect, useMemo, useState } from 'react'
import { api } from '../../api.js'
import { Alert, Badge, Card, Empty, Field, Loading, Modal, Tabs } from '../../components/ui.jsx'
import { data } from '../../util.js'

const STATUS = {
  PRE_MATRICULA: ['Pré-matrícula', 'blue'], APROVADA: ['Aprovada', 'amber'],
  MATRICULADO: ['Matriculado', 'green'], REJEITADA: ['Rejeitada', 'red'],
}
const DOCS = [
  ['docCertidaoNascimento', 'Certidão de nascimento'], ['docComprovanteResidencia', 'Comprovante de residência'],
  ['docCartaoVacina', 'Cartão de vacina'], ['docFoto', 'Foto 3x4'], ['docDocumentoResponsavel', 'Documento do responsável'],
  ['taxaMatriculaPaga', 'Taxa de matrícula paga'], ['consentimentoLgpd', 'Termo de consentimento LGPD (art. 14)'],
]

export default function Matriculas() {
  const [alunos, setAlunos] = useState(null)
  const [turmas, setTurmas] = useState([])
  const [aba, setAba] = useState('processos')
  const [busca, setBusca] = useState('')
  const [turmaFiltro, setTurmaFiltro] = useState('')
  const [nova, setNova] = useState(null)
  const [edit, setEdit] = useState(null)
  const [rejeitar, setRejeitar] = useState(null)
  const [msg, setMsg] = useState({})

  const carregar = () => api.get('/gestor/alunos').then(setAlunos)
  useEffect(() => { carregar(); api.get('/gestor/turmas').then(setTurmas) }, [])

  const lista = useMemo(() => (alunos || []).filter((a) => {
    const naAba = aba === 'processos' ? ['PRE_MATRICULA', 'APROVADA'].includes(a.status)
      : aba === 'matriculados' ? a.status === 'MATRICULADO' : a.status === 'REJEITADA'
    return naAba && a.nome.toLowerCase().includes(busca.toLowerCase()) && (!turmaFiltro || a.turma?.id === Number(turmaFiltro))
  }), [alunos, aba, busca, turmaFiltro])

  const acao = async (fn, sucesso) => {
    setMsg({})
    try { const r = await fn(); setMsg({ ok: sucesso }); carregar(); return r } catch (e) { setMsg({ erro: e.message }) }
  }

  const abrir = (a) => setEdit({
    ...a, turmaId: a.turma?.id,
    ...Object.fromEntries(['comprovanteTaxa', 'fardamento', 'hospitalReferencia', 'contatoEmergencia', 'autorizadosRetirada'].map((k) => [k, a[k] ?? ''])),
  })

  const salvar = async () => {
    const r = await acao(() => api.put(`/gestor/alunos/${edit.id}`, edit), 'Dados salvos.')
    if (r) abrir(r)
  }

  const contagem = (s) => (alunos || []).filter((a) => s.includes(a.status)).length

  if (!alunos) return <Loading />
  return (
    <>
      <Alert tone="success" onClose={() => setMsg({})}>{msg.ok}</Alert>
      <Alert tone="error" onClose={() => setMsg({})}>{!edit && !nova && !rejeitar && msg.erro}</Alert>
      <Card>
        <div className="toolbar">
          <Tabs active={aba} onChange={setAba} tabs={[
            { id: 'processos', label: `Em andamento (${contagem(['PRE_MATRICULA', 'APROVADA'])})` },
            { id: 'matriculados', label: `Matriculados (${contagem(['MATRICULADO'])})` },
            { id: 'rejeitadas', label: `Rejeitadas (${contagem(['REJEITADA'])})` },
          ]} />
          <button className="btn btn-primary" onClick={() => setNova({ nome: '', dataNascimento: '', turmaId: turmas[0]?.id, responsavelNome: '', responsavelEmail: '', responsavelTelefone: '' })}>+ Pré-matrícula</button>
        </div>
        <div className="filters">
          <input placeholder="🔍 Buscar aluno..." value={busca} onChange={(e) => setBusca(e.target.value)} />
          <select value={turmaFiltro} onChange={(e) => setTurmaFiltro(e.target.value)}>
            <option value="">Todas as turmas</option>
            {turmas.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
          </select>
        </div>
        {lista.length === 0 ? <Empty /> : (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Aluno</th><th>Turma</th><th>Responsável</th><th>Status</th><th>Documentação</th><th></th></tr></thead>
              <tbody>
                {lista.map((a) => (
                  <tr key={a.id}>
                    <td data-label="Aluno"><strong>{a.nome}</strong><div className="muted small">{a.matricula ? `Mat. ${a.matricula}` : `Nasc. ${data(a.dataNascimento)}`}</div></td>
                    <td data-label="Turma">{a.turma?.nome}</td>
                    <td data-label="Responsável">{a.responsaveisNomes.join(', ')}</td>
                    <td data-label="Status"><Badge tone={STATUS[a.status][1]}>{STATUS[a.status][0]}</Badge></td>
                    <td data-label="Documentação">{a.pendencias.length === 0
                      ? <Badge tone="green">Completa</Badge>
                      : <Badge tone="amber">{a.pendencias.length} pendência(s)</Badge>}</td>
                    <td className="r actions-cell">
                      {a.status === 'PRE_MATRICULA' && <button className="btn btn-sm btn-primary" onClick={() => acao(() => api.post(`/gestor/alunos/${a.id}/aprovar`), `Pré-matrícula de ${a.nome} aprovada.`)}>Aprovar</button>}
                      {a.status === 'APROVADA' && <button className="btn btn-sm btn-primary" onClick={() => acao(() => api.post(`/gestor/alunos/${a.id}/efetivar`), `${a.nome} matriculado(a)! Contrato/ficha emitido.`)}>Efetivar</button>}
                      {['PRE_MATRICULA', 'APROVADA'].includes(a.status) && <button className="btn btn-sm btn-ghost txt-red" onClick={() => setRejeitar({ id: a.id, nome: a.nome, motivo: '' })}>Rejeitar</button>}
                      <button className="btn btn-sm btn-ghost" onClick={() => abrir(a)}>Ficha</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {nova && (
        <Modal title="Nova pré-matrícula" onClose={() => { setNova(null); setMsg({}) }} footer={<>
          <button className="btn btn-ghost" onClick={() => setNova(null)}>Cancelar</button>
          <button className="btn btn-primary" onClick={async () => { if (await acao(() => api.post('/gestor/alunos', { ...nova, dataNascimento: nova.dataNascimento || null }), 'Pré-matrícula registrada.')) setNova(null) }}>Registrar</button>
        </>}>
          <Alert tone="error">{msg.erro}</Alert>
          <h4 className="section-title">Dados do aluno</h4>
          <div className="form-grid">
            <Field label="Nome completo" full><input value={nova.nome} onChange={(e) => setNova({ ...nova, nome: e.target.value })} /></Field>
            <Field label="Data de nascimento"><input type="date" value={nova.dataNascimento} onChange={(e) => setNova({ ...nova, dataNascimento: e.target.value })} /></Field>
            <Field label="Turma pretendida">
              <select value={nova.turmaId} onChange={(e) => setNova({ ...nova, turmaId: Number(e.target.value) })}>
                {turmas.map((t) => <option key={t.id} value={t.id}>{t.nome} ({t.capacidade - t.matriculados} vagas)</option>)}
              </select>
            </Field>
          </div>
          <h4 className="section-title">Responsável</h4>
          <div className="form-grid">
            <Field label="Nome" full><input value={nova.responsavelNome} onChange={(e) => setNova({ ...nova, responsavelNome: e.target.value })} /></Field>
            <Field label="E-mail (login do portal)"><input type="email" value={nova.responsavelEmail} onChange={(e) => setNova({ ...nova, responsavelEmail: e.target.value })} /></Field>
            <Field label="Telefone"><input value={nova.responsavelTelefone} onChange={(e) => setNova({ ...nova, responsavelTelefone: e.target.value })} /></Field>
          </div>
          <p className="muted small">Se o e-mail for novo, um acesso de responsável é criado com a senha inicial 123456.</p>
        </Modal>
      )}

      {rejeitar && (
        <Modal title={`Rejeitar pré-matrícula — ${rejeitar.nome}`} onClose={() => { setRejeitar(null); setMsg({}) }} footer={<>
          <button className="btn btn-ghost" onClick={() => setRejeitar(null)}>Cancelar</button>
          <button className="btn btn-danger" onClick={async () => { if (await acao(() => api.post(`/gestor/alunos/${rejeitar.id}/rejeitar`, { motivo: rejeitar.motivo }), 'Pré-matrícula rejeitada.')) setRejeitar(null) }}>Confirmar rejeição</button>
        </>}>
          <Alert tone="error">{msg.erro}</Alert>
          <Field label="Motivo da rejeição" full><textarea rows={4} value={rejeitar.motivo} onChange={(e) => setRejeitar({ ...rejeitar, motivo: e.target.value })} /></Field>
        </Modal>
      )}

      {edit && (
        <Modal wide title={`Ficha do aluno — ${edit.nome}`} onClose={() => { setEdit(null); setMsg({}) }} footer={<>
          <button className="btn btn-ghost" onClick={() => setEdit(null)}>Fechar</button>
          <button className="btn btn-primary" onClick={salvar}>Salvar alterações</button>
        </>}>
          <Alert tone="error">{msg.erro}</Alert>
          {edit.status === 'REJEITADA' && <Alert tone="warning">Motivo da rejeição: {edit.motivoRejeicao}</Alert>}
          <div className="form-grid">
            <Field label="Nome"><input value={edit.nome} onChange={(e) => setEdit({ ...edit, nome: e.target.value })} /></Field>
            <Field label="Nascimento"><input type="date" value={edit.dataNascimento ?? ''} onChange={(e) => setEdit({ ...edit, dataNascimento: e.target.value })} /></Field>
            <Field label="Turma">
              <select value={edit.turmaId} onChange={(e) => setEdit({ ...edit, turmaId: Number(e.target.value) })}>
                {turmas.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
              </select>
            </Field>
            <Field label="Responsável(is)"><input disabled value={`${edit.responsaveisNomes.join(', ')} · ${edit.responsavelTelefone ?? ''}`} /></Field>
          </div>
          <h4 className="section-title">Checklist de documentos obrigatórios {edit.pendencias.length === 0 ? <Badge tone="green">Completo</Badge> : <Badge tone="amber">{edit.pendencias.length} pendente(s)</Badge>}</h4>
          <div className="checks">
            {DOCS.map(([k, label]) => (
              <label key={k} className={`check ${edit[k] ? 'on' : ''}`}>
                <input type="checkbox" checked={!!edit[k]} onChange={(e) => setEdit({ ...edit, [k]: e.target.checked })} />
                {label}
              </label>
            ))}
          </div>
          <div className="form-grid">
            <Field label="Nº comprovante da taxa de matrícula"><input value={edit.comprovanteTaxa} onChange={(e) => setEdit({ ...edit, comprovanteTaxa: e.target.value })} /></Field>
            <Field label="Fardamento (peças, tamanhos e quantidades)"><input value={edit.fardamento} onChange={(e) => setEdit({ ...edit, fardamento: e.target.value })} placeholder="Ex.: 2 camisas (P), 1 bermuda (P)" /></Field>
          </div>
          <h4 className="section-title">Emergência e retirada</h4>
          <div className="form-grid">
            <Field label="Hospital de referência"><input value={edit.hospitalReferencia} onChange={(e) => setEdit({ ...edit, hospitalReferencia: e.target.value })} /></Field>
            <Field label="Contato de emergência"><input value={edit.contatoEmergencia} onChange={(e) => setEdit({ ...edit, contatoEmergencia: e.target.value })} /></Field>
            <Field label="Pessoas autorizadas a retirar o aluno" full><input value={edit.autorizadosRetirada} onChange={(e) => setEdit({ ...edit, autorizadosRetirada: e.target.value })} /></Field>
          </div>
        </Modal>
      )}
    </>
  )
}
