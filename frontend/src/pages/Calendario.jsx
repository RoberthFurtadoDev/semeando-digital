import { useEffect, useState } from 'react'
import { api } from '../api.js'
import { useAuth } from '../App.jsx'
import { Alert, Badge, Card, Field, Loading, Modal, confirmar } from '../components/ui.jsx'
import { hojeISO } from '../util.js'

const TIPOS = { LETIVO: ['Letivo', 'green'], FERIADO: ['Feriado/Recesso', 'red'], REUNIAO: ['Reunião', 'blue'], AVALIACAO: ['Avaliação', 'amber'] }
const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

export default function Calendario() {
  const { usuario } = useAuth()
  const gestor = usuario.perfil === 'GESTOR'
  const [eventos, setEventos] = useState(null)
  const [form, setForm] = useState(null)
  const [erro, setErro] = useState('')
  const hoje = hojeISO()

  const carregar = () => api.get('/calendario').then(setEventos)
  useEffect(() => { carregar() }, [])

  const salvar = async () => {
    setErro('')
    try { await api.post('/gestor/calendario', form); setForm(null); carregar() } catch (e) { setErro(e.message) }
  }
  const excluir = async (id) => { if (await confirmar('Excluir evento?')) { await api.del(`/gestor/calendario/${id}`); carregar() } }

  if (!eventos) return <Loading />
  const porMes = {}
  eventos.forEach((e) => { const m = Number(e.data.slice(5, 7)) - 1; (porMes[m] ||= []).push(e) })
  const proximos = eventos.filter((e) => e.data >= hoje).slice(0, 3)

  return (
    <>
      {proximos.length > 0 && (
        <div className="grid-3">
          {proximos.map((e) => (
            <div key={e.id} className="event-card">
              <div className="event-date"><strong>{e.data.slice(8, 10)}</strong><span>{MESES[Number(e.data.slice(5, 7)) - 1].slice(0, 3)}</span></div>
              <div><small className="muted">Próximo evento</small><div><strong>{e.titulo}</strong></div></div>
            </div>
          ))}
        </div>
      )}
      <Card title={`Calendário letivo ${eventos[0]?.data.slice(0, 4) ?? ''}`} actions={gestor && (
        <button className="btn btn-primary" onClick={() => setForm({ data: hoje, titulo: '', tipo: 'LETIVO' })}>+ Novo evento</button>
      )}>
        <div className="months">
          {Object.keys(porMes).map((m) => (
            <div key={m} className="month">
              <h3>{MESES[m]}</h3>
              <ul>
                {porMes[m].map((e) => (
                  <li key={e.id} className={e.data < hoje ? 'past' : ''}>
                    <span className="day">{e.data.slice(8, 10)}</span>
                    <span className="grow">{e.titulo}</span>
                    <Badge tone={TIPOS[e.tipo]?.[1]}>{TIPOS[e.tipo]?.[0] ?? e.tipo}</Badge>
                    {gestor && <button className="icon-btn small" onClick={() => excluir(e.id)} aria-label="Excluir">✕</button>}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Card>
      {form && (
        <Modal title="Novo evento" onClose={() => setForm(null)} footer={<>
          <button className="btn btn-ghost" onClick={() => setForm(null)}>Cancelar</button>
          <button className="btn btn-primary" onClick={salvar}>Salvar</button>
        </>}>
          <Alert tone="error">{erro}</Alert>
          <div className="form-grid">
            <Field label="Data"><input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} /></Field>
            <Field label="Tipo">
              <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
                {Object.entries(TIPOS).map(([k, v]) => <option key={k} value={k}>{v[0]}</option>)}
              </select>
            </Field>
            <Field label="Título" full><input value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} /></Field>
          </div>
        </Modal>
      )}
    </>
  )
}
