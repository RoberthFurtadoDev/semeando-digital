import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../api.js'
import { useAuth } from '../../App.jsx'
import Boletim from '../../components/Boletim.jsx'
import { Badge, Card, Empty, Loading, Modal, Stat } from '../../components/ui.jsx'
import { nota } from '../../util.js'

export default function Painel() {
  const { usuario } = useAuth()
  const [turmas, setTurmas] = useState(null)
  const [sel, setSel] = useState(null)
  const [alunos, setAlunos] = useState(null)
  const [boletim, setBoletim] = useState(null)

  useEffect(() => {
    api.get('/professor/turmas').then((t) => { setTurmas(t); if (t[0]) setSel(t[0]) })
  }, [])
  useEffect(() => {
    if (sel) { setAlunos(null); api.get(`/professor/turmas/${sel.id}/alunos`).then(setAlunos) }
  }, [sel])

  if (!turmas) return <Loading />
  if (turmas.length === 0) return <Card><Empty>Nenhuma turma atribuída a você.</Empty></Card>
  const total = turmas.reduce((s, t) => s + t.alunos, 0)
  const mediaGeral = (a) => {
    const ms = a.boletim.map((b) => b.media).filter((m) => m !== null)
    return ms.length ? ms.reduce((s, m) => s + m, 0) / ms.length : null
  }

  return (
    <>
      <div className="welcome">
        <h2>Olá, {usuario.nome.split(' ')[0]}! 👋</h2>
        <p className="muted">Acompanhe suas turmas e registre o diário de classe.</p>
      </div>
      <div className="grid-3">
        <Stat icon="🏫" label="Minhas turmas" value={turmas.length} />
        <Stat icon="🎒" label="Alunos" value={total} tone="blue" />
        <Stat icon="📒" label="Diário de classe" value={<Link to="/professor/diario">Lançar →</Link>} tone="amber" />
      </div>
      <div className="turma-cards">
        {turmas.map((t) => (
          <button key={t.id} className={`turma-card ${sel?.id === t.id ? 'active' : ''}`} onClick={() => setSel(t)}>
            <strong>{t.nome}</strong>
            <span className="muted small">{t.turno} · {t.horario} · {t.sala}</span>
            <span className="small">{t.alunos} alunos</span>
          </button>
        ))}
      </div>
      {sel && (
        <Card title={`Alunos — ${sel.nome}`}>
          {!alunos ? <Loading /> : (
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Aluno</th><th>Matrícula</th><th className="c">Média geral</th><th className="c">Frequência</th><th></th></tr></thead>
                <tbody>
                  {alunos.map((a) => {
                    const m = mediaGeral(a)
                    return (
                      <tr key={a.id}>
                        <td data-label="Aluno"><strong>{a.nome}</strong></td>
                        <td data-label="Matrícula">{a.matricula}</td>
                        <td data-label="Média geral" className={`c ${m !== null && m < 6 ? 'txt-red' : ''}`}><strong>{nota(m)}</strong></td>
                        <td data-label="Frequência" className="c"><Badge tone={a.frequencia >= 75 ? 'green' : 'red'}>{a.frequencia}%</Badge></td>
                        <td className="r"><button className="btn btn-sm btn-ghost" onClick={() => setBoletim(a)}>Boletim</button></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
      {boletim && <Modal wide title={`Boletim — ${boletim.nome}`} onClose={() => setBoletim(null)}><Boletim linhas={boletim.boletim} /></Modal>}
    </>
  )
}
