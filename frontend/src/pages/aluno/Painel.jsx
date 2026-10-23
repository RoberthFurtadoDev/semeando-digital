import { useEffect, useState } from 'react'
import { api } from '../../api.js'
import AlunoResumo from '../../components/AlunoResumo.jsx'
import { Card, Loading } from '../../components/ui.jsx'

export default function Painel() {
  const [aluno, setAluno] = useState(null)
  const [erro, setErro] = useState('')
  useEffect(() => { api.get('/aluno/painel').then(setAluno).catch((e) => setErro(e.message)) }, [])
  if (erro) return <Card><p>{erro}</p></Card>
  if (!aluno) return <Loading />
  return (
    <>
      <AlunoResumo aluno={aluno} />
      <Card title={`Lista de materiais — ${aluno.turma}`}>
        <ul className="checklist cols">
          {aluno.materiais.map((m) => <li key={m}>✏️ {m}</li>)}
        </ul>
      </Card>
    </>
  )
}
