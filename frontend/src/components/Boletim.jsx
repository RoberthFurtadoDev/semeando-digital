import { Badge } from './ui.jsx'
import { nota } from '../util.js'

const tom = (s) => ({ Aprovado: 'green', 'Em andamento': 'blue', Atenção: 'amber', Recuperação: 'red' }[s] || 'gray')

export default function Boletim({ linhas }) {
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th>Disciplina</th><th className="c">1º Bim</th><th className="c">2º Bim</th>
            <th className="c">3º Bim</th><th className="c">4º Bim</th><th className="c">Média</th><th>Situação</th>
          </tr>
        </thead>
        <tbody>
          {linhas.map((l) => (
            <tr key={l.disciplina}>
              <td data-label="Disciplina"><strong>{l.disciplina}</strong></td>
              {[1, 2, 3, 4].map((b) => (
                <td key={b} data-label={`${b}º Bim`} className={`c ${l['b' + b] !== null && l['b' + b] < 6 ? 'txt-red' : ''}`}>{nota(l['b' + b])}</td>
              ))}
              <td data-label="Média" className="c"><strong>{nota(l.media)}</strong></td>
              <td data-label="Situação"><Badge tone={tom(l.situacao)}>{l.situacao}</Badge></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
