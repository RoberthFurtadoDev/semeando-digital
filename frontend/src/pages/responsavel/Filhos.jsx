import { useEffect, useState } from 'react'
import { api } from '../../api.js'
import AlunoResumo from '../../components/AlunoResumo.jsx'
import { Alert, Card, Empty, Field, Loading, Modal, Tabs } from '../../components/ui.jsx'

export default function Filhos() {
  const [filhos, setFilhos] = useState(null)
  const [sel, setSel] = useState(0)
  const [edit, setEdit] = useState(null)
  const [msg, setMsg] = useState({})

  const carregar = () => api.get('/responsavel/filhos').then(setFilhos)
  useEffect(() => { carregar() }, [])

  const salvar = async () => {
    try {
      await api.put(`/responsavel/filhos/${edit.id}/emergencia`, edit)
      setEdit(null); setMsg({ ok: 'Dados de emergência atualizados.' }); carregar()
    } catch (e) { setMsg({ erro: e.message }) }
  }

  if (!filhos) return <Loading />
  if (!filhos.length) return <Card><Empty>Nenhum aluno vinculado ao seu cadastro.</Empty></Card>
  const a = filhos[sel]
  return (
    <>
      <Alert tone="success" onClose={() => setMsg({})}>{msg.ok}</Alert>
      {filhos.length > 1 && <Tabs active={sel} onChange={setSel} tabs={filhos.map((f, i) => ({ id: i, label: `${f.nome.split(' ')[0]} · ${f.turma}` }))} />}
      <AlunoResumo aluno={a} />
      <Card title="🚑 Emergência e retirada" actions={
        <button className="btn btn-ghost" onClick={() => setEdit({ id: a.id, hospitalReferencia: a.hospitalReferencia ?? '', contatoEmergencia: a.contatoEmergencia ?? '', autorizadosRetirada: a.autorizadosRetirada ?? '' })}>Atualizar</button>
      }>
        <dl className="info-grid">
          <div><dt>Hospital de referência</dt><dd>{a.hospitalReferencia || '—'}</dd></div>
          <div><dt>Contato de emergência</dt><dd>{a.contatoEmergencia || '—'}</dd></div>
          <div><dt>Autorizados a retirar</dt><dd>{a.autorizadosRetirada || '—'}</dd></div>
        </dl>
      </Card>
      {edit && (
        <Modal title="Dados de emergência" onClose={() => { setEdit(null); setMsg({}) }} footer={<>
          <button className="btn btn-ghost" onClick={() => setEdit(null)}>Cancelar</button>
          <button className="btn btn-primary" onClick={salvar}>Salvar</button>
        </>}>
          <Alert tone="error">{msg.erro}</Alert>
          <div className="form-grid">
            <Field label="Hospital de referência" full><input value={edit.hospitalReferencia} onChange={(e) => setEdit({ ...edit, hospitalReferencia: e.target.value })} /></Field>
            <Field label="Contato de emergência" full><input value={edit.contatoEmergencia} onChange={(e) => setEdit({ ...edit, contatoEmergencia: e.target.value })} /></Field>
            <Field label="Pessoas autorizadas a retirar" full><input value={edit.autorizadosRetirada} onChange={(e) => setEdit({ ...edit, autorizadosRetirada: e.target.value })} /></Field>
          </div>
        </Modal>
      )}
    </>
  )
}
