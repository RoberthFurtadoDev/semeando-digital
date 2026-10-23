import { useEffect, useState } from 'react'
import { api } from '../../api.js'
import { Alert, Badge, Card, Empty, Field, Loading, Modal, confirmar } from '../../components/ui.jsx'
import { data, hojeISO } from '../../util.js'

export default function Planos() {
  const [planos, setPlanos] = useState(null)
  const [turmas, setTurmas] = useState([])
  const [form, setForm] = useState(null)
  const [erro, setErro] = useState('')

  const carregar = () => api.get('/professor/planos').then(setPlanos)
  useEffect(() => { carregar(); api.get('/professor/turmas').then(setTurmas) }, [])

  const novo = () => setForm({ turmaId: turmas[0]?.id, disciplina: turmas[0]?.disciplinas[0], data: hojeISO(), titulo: '', objetivos: '', atividades: '' })
  const turmaForm = turmas.find((t) => t.id === Number(form?.turmaId))

  const salvar = async () => {
    setErro('')
    try { await api.post('/professor/planos', { ...form, turmaId: Number(form.turmaId) }); setForm(null); carregar() } catch (e) { setErro(e.message) }
  }
  const excluir = async (id) => { if (await confirmar('Excluir plano de aula?')) { await api.del(`/professor/planos/${id}`); carregar() } }

  if (!planos) return <Loading />
  return (
    <>
      <Card title="Planos de aula" actions={<button className="btn btn-primary" onClick={novo} disabled={!turmas.length}>+ Novo plano</button>}>
        {planos.length === 0 && <Empty>Nenhum plano cadastrado.</Empty>}
        <div className="grid-2">
          {planos.map((p) => (
            <article key={p.id} className="plano">
              <div className="feed-head">
                <h3>{p.titulo}</h3>
                <Badge tone={p.data >= hojeISO() ? 'blue' : 'gray'}>{data(p.data)}</Badge>
              </div>
              <div className="tags"><Badge tone="green">{p.turma.nome}</Badge><Badge tone="purple">{p.disciplina}</Badge></div>
              <p><strong>Objetivos:</strong> {p.objetivos}</p>
              <p><strong>Atividades:</strong> {p.atividades}</p>
              <div className="r"><button className="btn-link txt-red" onClick={() => excluir(p.id)}>Excluir</button></div>
            </article>
          ))}
        </div>
      </Card>
      {form && (
        <Modal title="Novo plano de aula" onClose={() => setForm(null)} footer={<>
          <button className="btn btn-ghost" onClick={() => setForm(null)}>Cancelar</button>
          <button className="btn btn-primary" onClick={salvar}>Salvar</button>
        </>}>
          <Alert tone="error">{erro}</Alert>
          <div className="form-grid">
            <Field label="Turma">
              <select value={form.turmaId} onChange={(e) => { const t = turmas.find((x) => x.id === Number(e.target.value)); setForm({ ...form, turmaId: t.id, disciplina: t.disciplinas[0] }) }}>
                {turmas.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
              </select>
            </Field>
            <Field label="Disciplina">
              <select value={form.disciplina} onChange={(e) => setForm({ ...form, disciplina: e.target.value })}>
                {turmaForm?.disciplinas.map((d) => <option key={d}>{d}</option>)}
              </select>
            </Field>
            <Field label="Data"><input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} /></Field>
            <Field label="Título / tema"><input value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} /></Field>
            <Field label="Objetivos" full><textarea rows={3} value={form.objetivos} onChange={(e) => setForm({ ...form, objetivos: e.target.value })} /></Field>
            <Field label="Atividades / metodologia" full><textarea rows={3} value={form.atividades} onChange={(e) => setForm({ ...form, atividades: e.target.value })} /></Field>
          </div>
        </Modal>
      )}
    </>
  )
}
