import { useEffect, useState } from 'react'
import { api } from '../../api.js'
import { Alert, Badge, Card, Loading, Modal } from '../../components/ui.jsx'
import { data, dataHora, hojeISO } from '../../util.js'
import { NOME_OBRIGACAO, TOM_OBRIGACAO } from './Painel.jsx'

export default function Conformidade() {
  const [obrig, setObrig] = useState(null)
  const [logs, setLogs] = useState([])
  const [busca, setBusca] = useState('')
  const [msg, setMsg] = useState({})
  const [arquivo, setArquivo] = useState(null)

  const carregar = () => {
    api.get('/gestor/obrigacoes').then(setObrig)
    api.get('/gestor/auditoria').then(setLogs)
  }
  useEffect(carregar, [])

  const baixar = async (url, nome, ok) => {
    try { const r = await api.download(url, nome); if (r) setArquivo(r); setMsg({ ok }); carregar() } catch (e) { setMsg({ erro: e.message }) }
  }

  if (!obrig) return <Loading />
  const filtrados = logs.filter((l) => `${l.acao} ${l.detalhe} ${l.usuario}`.toLowerCase().includes(busca.toLowerCase()))
  return (
    <>
      <Alert tone="success" onClose={() => setMsg({})}>{msg.ok}</Alert>
      <Alert tone="error" onClose={() => setMsg({})}>{msg.erro}</Alert>
      <div className="grid-3">
        {obrig.map((o) => (
          <div key={o.nome} className={`obrig tone-${TOM_OBRIGACAO[o.status]}`}>
            <div className="obrig-head"><strong>{o.nome}</strong><Badge tone={TOM_OBRIGACAO[o.status]}>{NOME_OBRIGACAO[o.status]}</Badge></div>
            <small className="muted">{o.orgao} · {o.descricao}</small>
            <div className="obrig-prazo">Prazo: <strong>{data(o.prazo)}</strong> ({o.diasRestantes} dias)</div>
          </div>
        ))}
      </div>
      <Card title="Exportações e cópia de segurança">
        <div className="export-grid">
          <button className="btn btn-ghost" onClick={() => baixar('/gestor/exportar/censo', `censo-escolar-${hojeISO()}.csv`, 'Arquivo do Censo Escolar gerado.')}>📤 Exportar Censo Escolar (INEP)</button>
          <button className="btn btn-ghost" onClick={() => baixar('/gestor/exportar/smtt', `smtt-${hojeISO()}.csv`, 'Arquivo SMTT gerado.')}>📤 Exportar dados SMTT</button>
          <button className="btn btn-primary" onClick={() => baixar('/gestor/backup', `backup-semeando-${hojeISO()}.json`, 'Backup gerado com sucesso.')}>💾 Gerar backup</button>
        </div>
      </Card>
      {arquivo && (
        <Modal wide title={arquivo.nome} onClose={() => setArquivo(null)} footer={
          <button className="btn btn-primary" onClick={() => navigator.clipboard?.writeText(arquivo.conteudo).catch(() => {})}>Copiar conteúdo</button>
        }>
          <p className="muted small">Na versão de demonstração online o arquivo é exibido aqui; rodando localmente ele é baixado.</p>
          <textarea readOnly rows={14} value={arquivo.conteudo} className="mono" onFocus={(e) => e.target.select()} />
        </Modal>
      )}
      <Card title="Log de auditoria" actions={<input placeholder="🔍 Filtrar..." value={busca} onChange={(e) => setBusca(e.target.value)} />}>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Data/hora</th><th>Usuário</th><th>Ação</th><th>Detalhe</th></tr></thead>
            <tbody>
              {filtrados.map((l) => (
                <tr key={l.id}>
                  <td data-label="Data/hora" className="nowrap">{dataHora(l.dataHora)}</td>
                  <td data-label="Usuário">{l.usuario}</td>
                  <td data-label="Ação"><Badge tone="gray">{l.acao}</Badge></td>
                  <td data-label="Detalhe">{l.detalhe}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  )
}
