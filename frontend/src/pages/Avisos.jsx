import { useEffect, useState } from 'react'
import { api } from '../api.js'
import { useAuth } from '../App.jsx'
import { Alert, Badge, Card, Empty, Field, Loading, Modal, confirmar } from '../components/ui.jsx'
import { dataHora } from '../util.js'

export default function Avisos() {
  const { usuario } = useAuth()
  const podePublicar = usuario.perfil === 'GESTOR' || usuario.perfil === 'PROFESSOR'
  const [avisos, setAvisos] = useState(null)
  const [turmas, setTurmas] = useState([])
  const [form, setForm] = useState(null)
  const [msg, setMsg] = useState('')
  const [erro, setErro] = useState('')

  const carregar = () => api.get('/avisos').then(setAvisos)
  useEffect(() => {
    carregar()
    if (usuario.perfil === 'GESTOR') api.get('/gestor/turmas').then(setTurmas)
    if (usuario.perfil === 'PROFESSOR') api.get('/professor/turmas').then(setTurmas)
  }, [usuario.perfil])

  const publicar = async () => {
    setErro('')
    try {
      const base = usuario.perfil === 'GESTOR' ? '/gestor' : '/professor'
      await api.post(`${base}/avisos`, { ...form, turmaId: form.turmaId ? Number(form.turmaId) : null })
      setForm(null)
      setMsg('Aviso publicado!')
      carregar()
    } catch (e) { setErro(e.message) }
  }

  const excluir = async (id) => {
    if (!(await confirmar('Excluir este aviso?'))) return
    await api.del(`/gestor/avisos/${id}`)
    carregar()
  }

  if (!avisos) return <Loading />
  return (
    <>
      <Alert tone="success" onClose={() => setMsg('')}>{msg}</Alert>
      <Card title="Mural de avisos" actions={podePublicar && (
        <button className="btn btn-primary" onClick={() => setForm({ titulo: '', mensagem: '', turmaId: usuario.perfil === 'PROFESSOR' ? turmas[0]?.id ?? '' : '' })}>+ Novo aviso</button>
      )}>
        {avisos.length === 0 && <Empty>Nenhum aviso no momento.</Empty>}
        <div className="feed">
          {avisos.map((a) => (
            <article key={a.id} className="feed-item">
              <div className="feed-head">
                <h3>{a.titulo}</h3>
                <Badge tone={a.turma ? 'blue' : 'green'}>{a.turma ? a.turma.nome : 'Toda a escola'}</Badge>
              </div>
              <p>{a.mensagem}</p>
              <div className="feed-foot">
                <small className="muted">{a.autor} · {dataHora(a.dataHora)}</small>
                {usuario.perfil === 'GESTOR' && <button className="btn-link txt-red" onClick={() => excluir(a.id)}>Excluir</button>}
              </div>
            </article>
          ))}
        </div>
      </Card>

      {form && (
        <Modal title="Novo aviso" onClose={() => setForm(null)} footer={<>
          <button className="btn btn-ghost" onClick={() => setForm(null)}>Cancelar</button>
          <button className="btn btn-primary" onClick={publicar}>Publicar</button>
        </>}>
          <Alert tone="error">{erro}</Alert>
          <div className="form-grid">
            <Field label="Título" full><input value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} /></Field>
            <Field label="Destinatários" full>
              <select value={form.turmaId} onChange={(e) => setForm({ ...form, turmaId: e.target.value })}>
                {usuario.perfil === 'GESTOR' && <option value="">Toda a escola</option>}
                {turmas.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
              </select>
            </Field>
            <Field label="Mensagem" full><textarea rows={5} value={form.mensagem} onChange={(e) => setForm({ ...form, mensagem: e.target.value })} /></Field>
          </div>
        </Modal>
      )}
    </>
  )
}
