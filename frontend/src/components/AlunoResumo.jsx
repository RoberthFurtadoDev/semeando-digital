import Boletim from './Boletim.jsx'
import { Card, Stat } from './ui.jsx'
import { iniciais, nota } from '../util.js'

export default function AlunoResumo({ aluno, children }) {
  const medias = aluno.boletim.map((b) => b.media).filter((m) => m !== null)
  const media = medias.length ? medias.reduce((s, m) => s + m, 0) / medias.length : null
  const f = aluno.frequencia
  return (
    <>
      <div className="profile">
        <div className="avatar lg">{iniciais(aluno.nome)}</div>
        <div className="grow">
          <h2>{aluno.nome}</h2>
          <p className="muted">{aluno.turma} · {aluno.turno} ({aluno.horario}) · {aluno.sala} · Matrícula {aluno.matricula}</p>
          <p className="muted small">Professor(a): {aluno.professor}</p>
        </div>
        {children}
      </div>
      <div className="grid-3">
        <Stat icon="⭐" label="Média geral" value={nota(media)} tone={media !== null && media < 6 ? 'red' : 'green'} />
        <Stat icon="✅" label="Frequência" value={`${f.percentual}%`} tone={f.percentual >= 75 ? 'blue' : 'red'} hint={`${f.presencas} presenças · ${f.faltas} faltas`} />
        <Stat icon="📚" label="Disciplinas" value={aluno.boletim.length} tone="amber" />
      </div>
      <Card title="Boletim escolar">
        <Boletim linhas={aluno.boletim} />
      </Card>
    </>
  )
}
