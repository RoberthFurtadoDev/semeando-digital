import { useEffect, useState } from 'react'
import { api } from '../api.js'
import { Alert, Card, Loading } from '../components/ui.jsx'

export default function Materiais() {
  const [materiais, setMateriais] = useState(null)
  const [turma, setTurma] = useState('')
  useEffect(() => {
    api.get('/materiais').then((m) => { setMateriais(m); setTurma(Object.keys(m)[0]) })
  }, [])
  if (!materiais) return <Loading />
  const fundamental = !['Maternal I', 'Maternal II', 'Infantil I', 'Infantil II'].includes(turma)
  return (
    <Card title="Lista de materiais escolares" actions={
      <select value={turma} onChange={(e) => setTurma(e.target.value)} aria-label="Turma">
        {Object.keys(materiais).map((t) => <option key={t}>{t}</option>)}
      </select>
    }>
      <ul className="checklist">
        {materiais[turma].map((m) => <li key={m}>✏️ {m}</li>)}
      </ul>
      {fundamental && (
        <Alert tone="info">📚 Os livros didáticos do {turma} são adquiridos diretamente junto ao fornecedor externo indicado pela escola.</Alert>
      )}
    </Card>
  )
}
