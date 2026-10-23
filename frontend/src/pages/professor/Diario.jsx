import { useEffect, useState } from 'react'
import { api } from '../../api.js'
import { Alert, Card, Empty, Field, Loading, Tabs } from '../../components/ui.jsx'
import { data, hojeISO } from '../../util.js'

export default function Diario() {
  const [turmas, setTurmas] = useState(null)
  const [turmaId, setTurmaId] = useState('')
  const [aba, setAba] = useState('frequencia')
  const [msg, setMsg] = useState({})

  useEffect(() => {
    api.get('/professor/turmas').then((t) => { setTurmas(t); if (t[0]) setTurmaId(t[0].id) })
  }, [])

  if (!turmas) return <Loading />
  if (!turmas.length) return <Card><Empty>Nenhuma turma atribuída.</Empty></Card>
  const turma = turmas.find((t) => t.id === Number(turmaId))

  return (
    <>
      <Alert tone="success" onClose={() => setMsg({})}>{msg.ok}</Alert>
      <Alert tone="error" onClose={() => setMsg({})}>{msg.erro}</Alert>
      <div className="toolbar">
        <Tabs active={aba} onChange={(a) => { setAba(a); setMsg({}) }} tabs={[
          { id: 'frequencia', label: 'Frequência' }, { id: 'notas', label: 'Notas' }, { id: 'conteudo', label: 'Conteúdo ministrado' },
        ]} />
        <select value={turmaId} onChange={(e) => setTurmaId(Number(e.target.value))} aria-label="Turma">
          {turmas.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
        </select>
      </div>
      {aba === 'frequencia' && <FrequenciaTab key={turmaId} turma={turma} setMsg={setMsg} />}
      {aba === 'notas' && <NotasTab key={turmaId} turma={turma} setMsg={setMsg} />}
      {aba === 'conteudo' && <ConteudoTab key={turmaId} turma={turma} setMsg={setMsg} />}
    </>
  )
}

function FrequenciaTab({ turma, setMsg }) {
  const [dia, setDia] = useState(hojeISO())
  const [lista, setLista] = useState(null)
  useEffect(() => { setLista(null); api.get(`/professor/turmas/${turma.id}/frequencia?data=${dia}`).then(setLista) }, [turma.id, dia])
  const salvar = async () => {
    try {
      await api.post(`/professor/turmas/${turma.id}/frequencia`, { data: dia, presencas: lista.map((l) => ({ alunoId: l.alunoId, presente: l.presente })) })
      setMsg({ ok: `Frequência de ${data(dia)} registrada.` })
    } catch (e) { setMsg({ erro: e.message }) }
  }
  const presentes = lista?.filter((l) => l.presente).length ?? 0
  return (
    <Card title={`Chamada — ${turma.nome}`} actions={<input type="date" value={dia} max={hojeISO()} onChange={(e) => setDia(e.target.value)} />}>
      {!lista ? <Loading /> : (
        <>
          <p className="muted">{presentes} presentes · {lista.length - presentes} faltas</p>
          <div className="chamada">
            {lista.map((l, i) => (
              <button key={l.alunoId} className={`chamada-item ${l.presente ? 'presente' : 'falta'}`}
                onClick={() => setLista(lista.map((x, j) => (j === i ? { ...x, presente: !x.presente } : x)))}>
                <span>{l.nome}</span>
                <strong>{l.presente ? '✔ Presente' : '✕ Falta'}</strong>
              </button>
            ))}
          </div>
          <div className="form-actions"><button className="btn btn-primary" onClick={salvar}>Salvar chamada</button></div>
        </>
      )}
    </Card>
  )
}

function NotasTab({ turma, setMsg }) {
  const [disciplina, setDisciplina] = useState(turma.disciplinas[0])
  const [bimestre, setBimestre] = useState(4)
  const [lista, setLista] = useState(null)
  useEffect(() => {
    setLista(null)
    api.get(`/professor/turmas/${turma.id}/notas?disciplina=${encodeURIComponent(disciplina)}&bimestre=${bimestre}`).then(setLista)
  }, [turma.id, disciplina, bimestre])
  const salvar = async () => {
    try {
      const r = await api.post(`/professor/turmas/${turma.id}/notas`, {
        disciplina, bimestre,
        notas: lista.map((l) => ({ alunoId: l.alunoId, valor: l.valor === '' || l.valor === null ? null : Number(l.valor) })),
      })
      setMsg({ ok: r.mensagem })
    } catch (e) { setMsg({ erro: e.message }) }
  }
  return (
    <Card title={`Lançamento de notas — ${turma.nome}`}>
      <div className="filters">
        <select value={disciplina} onChange={(e) => setDisciplina(e.target.value)} aria-label="Disciplina">
          {turma.disciplinas.map((d) => <option key={d}>{d}</option>)}
        </select>
        <select value={bimestre} onChange={(e) => setBimestre(Number(e.target.value))} aria-label="Bimestre">
          {[1, 2, 3, 4].map((b) => <option key={b} value={b}>{b}º bimestre</option>)}
        </select>
      </div>
      {!lista ? <Loading /> : (
        <>
          <div className="notas-list">
            {lista.map((l, i) => (
              <label key={l.alunoId} className="nota-row">
                <span>{l.nome}</span>
                <input type="number" min="0" max="10" step="0.5" value={l.valor ?? ''} placeholder="—"
                  className={l.valor !== null && l.valor !== '' && Number(l.valor) < 6 ? 'low' : ''}
                  onChange={(e) => setLista(lista.map((x, j) => (j === i ? { ...x, valor: e.target.value } : x)))} />
              </label>
            ))}
          </div>
          <div className="form-actions"><button className="btn btn-primary" onClick={salvar}>Salvar notas</button></div>
        </>
      )}
    </Card>
  )
}

function ConteudoTab({ turma, setMsg }) {
  const [lista, setLista] = useState(null)
  const [f, setF] = useState({ data: hojeISO(), disciplina: turma.disciplinas[0], conteudo: '' })
  const carregar = () => api.get(`/professor/turmas/${turma.id}/aulas`).then(setLista)
  useEffect(() => { carregar() }, [turma.id])
  const salvar = async (e) => {
    e.preventDefault()
    try { await api.post(`/professor/turmas/${turma.id}/aulas`, f); setF({ ...f, conteudo: '' }); setMsg({ ok: 'Conteúdo registrado.' }); carregar() } catch (err) { setMsg({ erro: err.message }) }
  }
  return (
    <div className="grid-2">
      <Card title="Registrar aula">
        <form onSubmit={salvar} className="form-grid">
          <Field label="Data"><input type="date" value={f.data} onChange={(e) => setF({ ...f, data: e.target.value })} /></Field>
          <Field label="Disciplina">
            <select value={f.disciplina} onChange={(e) => setF({ ...f, disciplina: e.target.value })}>
              {turma.disciplinas.map((d) => <option key={d}>{d}</option>)}
            </select>
          </Field>
          <Field label="Conteúdo ministrado" full><textarea rows={4} value={f.conteudo} onChange={(e) => setF({ ...f, conteudo: e.target.value })} /></Field>
          <div className="form-actions full"><button className="btn btn-primary">Registrar</button></div>
        </form>
      </Card>
      <Card title="Histórico">
        {!lista ? <Loading /> : lista.length === 0 ? <Empty /> : (
          <ul className="timeline">
            {lista.map((r) => (
              <li key={r.id}><small className="muted">{data(r.data)} · {r.disciplina}</small><p>{r.conteudo}</p></li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
