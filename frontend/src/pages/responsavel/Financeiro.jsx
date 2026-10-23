import { useEffect, useState } from 'react'
import { api } from '../../api.js'
import { Alert, Badge, Card, Empty, Loading, Modal, Stat } from '../../components/ui.jsx'
import { data, moeda } from '../../util.js'
import { SITUACAO } from '../gestor/Financeiro.jsx'

export default function Financeiro() {
  const [parcelas, setParcelas] = useState(null)
  const [boleto, setBoleto] = useState(null)
  const [inst, setInst] = useState(null)
  useEffect(() => {
    const ordem = { ATRASADA: 0, ABERTA: 1, PAGA: 2 }
    api.get('/responsavel/parcelas').then((l) => setParcelas([...l].sort((a, b) => ordem[a.situacao] - ordem[b.situacao] || (ordem[a.situacao] === 2 ? b.vencimento.localeCompare(a.vencimento) : a.vencimento.localeCompare(b.vencimento)))))
    api.get('/instituicao').then(setInst)
  }, [])
  if (!parcelas) return <Loading />
  if (!parcelas.length) return <Card><Empty>Nenhuma cobrança encontrada.</Empty></Card>

  const atrasadas = parcelas.filter((p) => p.situacao === 'ATRASADA')
  const abertas = parcelas.filter((p) => p.situacao === 'ABERTA')
  const proxima = abertas[0]
  const soma = (l) => l.reduce((s, p) => s + Number(p.total), 0)

  return (
    <>
      {atrasadas.length > 0 && <Alert tone="warning">⚠️ Você possui {atrasadas.length} parcela(s) em atraso. Multa e juros são calculados automaticamente até a data do pagamento.</Alert>}
      <div className="grid-3">
        <Stat icon="⏰" label="Em atraso" value={moeda(soma(atrasadas))} tone="red" hint={`${atrasadas.length} parcela(s)`} />
        <Stat icon="📅" label="Próximo vencimento" value={proxima ? moeda(proxima.total) : '—'} tone="blue" hint={proxima ? `${data(proxima.vencimento)} · ${proxima.aluno.split(' ')[0]}` : ''} />
        <Stat icon="✅" label="Pagas no ano" value={parcelas.filter((p) => p.situacao === 'PAGA').length} tone="green" />
      </div>
      <Card title="Minhas cobranças">
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Aluno</th><th>Tipo</th><th>Parcela</th><th>Vencimento</th><th>Valor</th><th>Encargos</th><th>Total</th><th>Situação</th><th></th></tr></thead>
            <tbody>
              {parcelas.map((p) => (
                <tr key={p.id}>
                  <td data-label="Aluno"><strong>{p.aluno}</strong><div className="muted small">{p.turma}</div></td>
                  <td data-label="Tipo">{p.tipo}</td>
                  <td data-label="Parcela">{p.numero}/{p.totalParcelas}</td>
                  <td data-label="Vencimento">{data(p.vencimento)}</td>
                  <td data-label="Valor">{moeda(p.valor)}</td>
                  <td data-label="Encargos">{Number(p.multa) + Number(p.juros) > 0 ? <span className="txt-red">{moeda(Number(p.multa) + Number(p.juros))}</span> : '—'}</td>
                  <td data-label="Total"><strong>{moeda(p.total)}</strong></td>
                  <td data-label="Situação"><Badge tone={SITUACAO[p.situacao][1]}>{SITUACAO[p.situacao][0]}</Badge></td>
                  <td className="r">{p.situacao !== 'PAGA' && <button className="btn btn-sm btn-primary" onClick={() => setBoleto(p)}>Ver boleto</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      {boleto && (
        <Modal title="Boleto (simulação CORA)" onClose={() => setBoleto(null)}>
          <div className="boleto">
            <div className="boleto-row"><span>Beneficiário</span><strong>{inst?.razaoSocial}</strong></div>
            <div className="boleto-row"><span>CNPJ</span><strong>{inst?.cnpj}</strong></div>
            <div className="boleto-row"><span>Aluno</span><strong>{boleto.aluno}</strong></div>
            <div className="boleto-row"><span>Referente</span><strong>{boleto.tipo} · parcela {boleto.numero}/{boleto.totalParcelas}</strong></div>
            <div className="boleto-row"><span>Vencimento</span><strong>{data(boleto.vencimento)}</strong></div>
            <div className="boleto-row"><span>Valor original</span><strong>{moeda(boleto.valor)}</strong></div>
            {boleto.diasAtraso > 0 && <>
              <div className="boleto-row txt-red"><span>Multa</span><strong>{moeda(boleto.multa)}</strong></div>
              <div className="boleto-row txt-red"><span>Juros ({boleto.diasAtraso} dias)</span><strong>{moeda(boleto.juros)}</strong></div>
            </>}
            <div className="boleto-row total"><span>Total a pagar</span><strong>{moeda(boleto.total)}</strong></div>
            <div className="barcode" aria-hidden="true" />
            <code className="linha">{boleto.codigoBoleto} 00190.00009 01234.567890 12345.678901 1 {String(Math.round(boleto.total * 100)).padStart(10, '0')}</code>
            <p className="muted small c">Documento ilustrativo para demonstração — sem valor de pagamento.</p>
          </div>
        </Modal>
      )}
    </>
  )
}
