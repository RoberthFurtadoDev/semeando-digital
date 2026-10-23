import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../api.js'
import { Alert, Badge, Card, Loading, Stat } from '../../components/ui.jsx'
import { data, moeda } from '../../util.js'

export const TOM_OBRIGACAO = { URGENTE: 'red', PROXIMO: 'amber', NO_PRAZO: 'green' }
export const NOME_OBRIGACAO = { URGENTE: 'Urgente', PROXIMO: 'Próximo', NO_PRAZO: 'No prazo' }

export default function Painel() {
  const [d, setD] = useState(null)
  useEffect(() => { api.get('/gestor/dashboard').then(setD) }, [])
  if (!d) return <Loading />
  return (
    <>
      {d.contratosDivergentes > 0 && (
        <Alert tone="warning">
          ⚠️ {d.contratosDivergentes} contrato(s) com valor divergente da tabela oficial. A emissão de cobrança está bloqueada até a correção. <Link to="/gestor/financeiro">Revisar contratos →</Link>
        </Alert>
      )}
      <div className="grid-4">
        <Stat icon="🎒" label="Alunos matriculados" value={d.alunosMatriculados} hint={`${d.professores} professores`} />
        <Stat icon="📝" label="Pré-matrículas pendentes" value={d.preMatriculas} tone="blue" hint={<Link to="/gestor/matriculas">Ver processos</Link>} />
        <Stat icon="💵" label="Recebido no mês" value={moeda(d.recebidoMes)} tone="green" hint={`Previsto: ${moeda(d.previstoMes)}`} />
        <Stat icon="⏰" label="Em atraso (c/ juros)" value={moeda(d.emAtraso)} tone="red" hint={`${d.alunosInadimplentes} aluno(s) inadimplente(s)`} />
      </div>
      <div className="grid-2">
        <Card title="Ocupação das turmas (máx. 30)">
          <div className="bars">
            {d.ocupacao.map((o) => {
              const pct = Math.round((o.matriculados / o.capacidade) * 100)
              return (
                <div key={o.turma} className="bar-row">
                  <span className="bar-label">{o.turma}</span>
                  <div className="bar"><div className={`bar-fill ${pct >= 90 ? 'full' : ''}`} style={{ width: `${Math.max(pct, 3)}%` }} /></div>
                  <span className="bar-value">{o.matriculados}/{o.capacidade}</span>
                </div>
              )
            })}
          </div>
        </Card>
        <Card title="Obrigações externas" actions={<Link className="btn btn-ghost" to="/gestor/conformidade">Abrir</Link>}>
          <ul className="list">
            {d.obrigacoes.map((o) => (
              <li key={o.nome}>
                <div className="grow">
                  <strong>{o.nome}</strong> <small className="muted">({o.orgao})</small>
                  <div className="muted small">{o.descricao}</div>
                </div>
                <div className="r">
                  <Badge tone={TOM_OBRIGACAO[o.status]}>{NOME_OBRIGACAO[o.status]}</Badge>
                  <div className="small muted">{data(o.prazo)} · {o.diasRestantes} dias</div>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  )
}
