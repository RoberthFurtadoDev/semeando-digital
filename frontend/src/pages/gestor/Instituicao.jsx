import { useEffect, useState } from 'react'
import { api } from '../../api.js'
import { Alert, Card, Field, Loading } from '../../components/ui.jsx'

export default function Instituicao() {
  const [f, setF] = useState(null)
  const [msg, setMsg] = useState({})
  useEffect(() => { api.get('/instituicao').then(setF) }, [])
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const salvar = async (e) => {
    e.preventDefault()
    try {
      setF(await api.put('/gestor/instituicao', { ...f, multaPercentual: Number(f.multaPercentual), jurosMensalPercentual: Number(f.jurosMensalPercentual) }))
      setMsg({ ok: 'Dados institucionais salvos. Todos os contratos, fichas e comunicados passam a usar estas informações.' })
    } catch (err) { setMsg({ erro: err.message }) }
  }
  if (!f) return <Loading />
  return (
    <form onSubmit={salvar}>
      <Alert tone="success" onClose={() => setMsg({})}>{msg.ok}</Alert>
      <Alert tone="error" onClose={() => setMsg({})}>{msg.erro}</Alert>
      <Card title="Identidade institucional (cadastro único)">
        <p className="muted">Razão social, nome fantasia, CNPJ e endereço são cadastrados uma única vez e reutilizados em todos os documentos emitidos.</p>
        <div className="form-grid">
          <Field label="Razão social"><input value={f.razaoSocial} onChange={set('razaoSocial')} /></Field>
          <Field label="Nome fantasia"><input value={f.nomeFantasia} onChange={set('nomeFantasia')} /></Field>
          <Field label="CNPJ"><input value={f.cnpj} onChange={set('cnpj')} /></Field>
          <Field label="Telefone"><input value={f.telefone} onChange={set('telefone')} /></Field>
          <Field label="Endereço" full><input value={f.endereco} onChange={set('endereco')} /></Field>
        </div>
      </Card>
      <Card title="Regras de cobrança em atraso">
        <div className="form-grid">
          <Field label="Multa por atraso (%)"><input type="number" step="0.1" min="0" value={f.multaPercentual} onChange={set('multaPercentual')} /></Field>
          <Field label="Juros de mora ao mês (%)"><input type="number" step="0.1" min="0" value={f.jurosMensalPercentual} onChange={set('jurosMensalPercentual')} /></Field>
        </div>
        <div className="form-actions"><button className="btn btn-primary">Salvar</button></div>
      </Card>
    </form>
  )
}
