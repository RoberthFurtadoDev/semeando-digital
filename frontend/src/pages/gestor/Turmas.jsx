import { useEffect, useState } from 'react'
import { api } from '../../api.js'
import { Alert, Badge, Card, Field, Loading, Modal } from '../../components/ui.jsx'
import { moeda } from '../../util.js'

export default function Turmas() {
  const [turmas, setTurmas] = useState(null)
  const [profs, setProfs] = useState([])
  const [edit, setEdit] = useState(null)
  const [novoProf, setNovoProf] = useState(null)
  const [verAlunos, setVerAlunos] = useState(null)
  const [msg, setMsg] = useState({})

  const carregar = () => {
    api.get('/gestor/turmas').then(setTurmas)
    api.get('/gestor/professores').then(setProfs)
  }
  useEffect(carregar, [])

  const salvarTurma = async () => {
    try {
      await api.put(`/gestor/turmas/${edit.id}`, { ...edit, professorId: edit.professorId ? Number(edit.professorId) : null })
      setEdit(null); setMsg({ ok: 'Turma atualizada.' }); carregar()
    } catch (e) { setMsg({ erro: e.message }) }
  }

  const salvarProf = async () => {
    try {
      const r = await api.post('/gestor/professores', novoProf)
      setNovoProf(null); setMsg({ ok: r.mensagem }); carregar()
    } catch (e) { setMsg({ erro: e.message }) }
  }

  const abrirAlunos = async (t) => setVerAlunos({ turma: t, alunos: await api.get(`/gestor/turmas/${t.id}/alunos`) })

  if (!turmas) return <Loading />
  return (
    <>
      <Alert tone="success" onClose={() => setMsg({})}>{msg.ok}</Alert>
      <Card title="Grade de turmas">
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Turma</th><th>Segmento</th><th>Turno / Horário</th><th>Sala</th><th>Professor(a)</th><th>Ocupação</th><th>Valor oficial</th><th></th></tr></thead>
            <tbody>
              {turmas.map((t) => (
                <tr key={t.id}>
                  <td data-label="Turma"><strong>{t.nome}</strong></td>
                  <td data-label="Segmento"><Badge tone={t.segmento === 'INFANTIL' ? 'purple' : 'blue'}>{t.segmento === 'INFANTIL' ? 'Ed. Infantil' : 'Fundamental'}</Badge></td>
                  <td data-label="Turno">{t.turno} · {t.horario}</td>
                  <td data-label="Sala">{t.sala}</td>
                  <td data-label="Professor(a)">{t.professor}</td>
                  <td data-label="Ocupação">{t.matriculados}/{t.capacidade} <span className="muted small">({t.capacidade - t.matriculados} vagas)</span></td>
                  <td data-label="Valor oficial">{moeda(t.valorTabela)} <div className="muted small">{t.segmento === 'INFANTIL' ? 'taxa de associado' : 'mensalidade'}</div></td>
                  <td className="r actions-cell">
                    <button className="btn btn-sm btn-ghost" onClick={() => abrirAlunos(t)}>Alunos</button>
                    <button className="btn btn-sm btn-ghost" onClick={() => setEdit({ ...t, professorId: t.professorId ?? '' })}>Editar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Professores" actions={<button className="btn btn-primary" onClick={() => setNovoProf({ nome: '', email: '', telefone: '', disciplinas: '' })}>+ Professor</button>}>
        <div className="grid-3">
          {profs.map((p) => (
            <div key={p.id} className="person">
              <strong>{p.nome}</strong>
              <span className="muted small">{p.email}</span>
              <span className="small">{p.disciplinas || '—'}</span>
              <div className="tags">{p.turmas.length ? p.turmas.map((t) => <Badge key={t} tone="green">{t}</Badge>) : <span className="muted small">Sem turmas</span>}</div>
            </div>
          ))}
        </div>
      </Card>

      {edit && (
        <Modal title={`Editar turma — ${edit.nome}`} onClose={() => { setEdit(null); setMsg({}) }} footer={<>
          <button className="btn btn-ghost" onClick={() => setEdit(null)}>Cancelar</button>
          <button className="btn btn-primary" onClick={salvarTurma}>Salvar</button>
        </>}>
          <Alert tone="error">{msg.erro}</Alert>
          <div className="form-grid">
            <Field label="Professor(a) responsável" full>
              <select value={edit.professorId} onChange={(e) => setEdit({ ...edit, professorId: e.target.value })}>
                <option value="">— Sem professor —</option>
                {profs.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
              </select>
            </Field>
            <Field label="Turno">
              <select value={edit.turno} onChange={(e) => setEdit({ ...edit, turno: e.target.value })}>
                <option>Manhã</option><option>Tarde</option><option>Integral</option>
              </select>
            </Field>
            <Field label="Sala"><input value={edit.sala} onChange={(e) => setEdit({ ...edit, sala: e.target.value })} /></Field>
            <Field label="Horário" full><input value={edit.horario} onChange={(e) => setEdit({ ...edit, horario: e.target.value })} /></Field>
          </div>
        </Modal>
      )}

      {novoProf && (
        <Modal title="Cadastrar professor(a)" onClose={() => { setNovoProf(null); setMsg({}) }} footer={<>
          <button className="btn btn-ghost" onClick={() => setNovoProf(null)}>Cancelar</button>
          <button className="btn btn-primary" onClick={salvarProf}>Cadastrar</button>
        </>}>
          <Alert tone="error">{msg.erro}</Alert>
          <div className="form-grid">
            <Field label="Nome" full><input value={novoProf.nome} onChange={(e) => setNovoProf({ ...novoProf, nome: e.target.value })} /></Field>
            <Field label="E-mail (login)"><input type="email" value={novoProf.email} onChange={(e) => setNovoProf({ ...novoProf, email: e.target.value })} /></Field>
            <Field label="Telefone"><input value={novoProf.telefone} onChange={(e) => setNovoProf({ ...novoProf, telefone: e.target.value })} /></Field>
            <Field label="Disciplinas de atuação" full><input value={novoProf.disciplinas} onChange={(e) => setNovoProf({ ...novoProf, disciplinas: e.target.value })} /></Field>
          </div>
        </Modal>
      )}

      {verAlunos && (
        <Modal title={`Alunos — ${verAlunos.turma.nome}`} onClose={() => setVerAlunos(null)}>
          <ol className="numbered">
            {verAlunos.alunos.map((a) => <li key={a.id}>{a.nome} <span className="muted small">· {a.responsaveisNomes.join(', ')}</span></li>)}
          </ol>
        </Modal>
      )}
    </>
  )
}
