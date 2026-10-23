import { useEffect, useState } from 'react'

let abrirConfirmacao = null

/** Confirmação dentro da página (substitui window.confirm). */
export const confirmar = (mensagem) =>
  new Promise((resolve) => (abrirConfirmacao ? abrirConfirmacao({ mensagem, resolve }) : resolve(window.confirm(mensagem))))

export function ConfirmHost() {
  const [pedido, setPedido] = useState(null)
  useEffect(() => {
    abrirConfirmacao = setPedido
    return () => { abrirConfirmacao = null }
  }, [])
  if (!pedido) return null
  const responder = (ok) => { pedido.resolve(ok); setPedido(null) }
  return (
    <Modal title="Confirmação" onClose={() => responder(false)} footer={<>
      <button className="btn btn-ghost" onClick={() => responder(false)}>Cancelar</button>
      <button className="btn btn-primary" onClick={() => responder(true)} autoFocus>Confirmar</button>
    </>}>
      <p>{pedido.mensagem}</p>
    </Modal>
  )
}

export function Card({ title, actions, children, className = '' }) {
  return (
    <section className={`card ${className}`}>
      {(title || actions) && (
        <header className="card-head">
          {title && <h2>{title}</h2>}
          {actions && <div className="card-actions">{actions}</div>}
        </header>
      )}
      {children}
    </section>
  )
}

export function Stat({ label, value, hint, tone = 'green', icon }) {
  return (
    <div className={`stat tone-${tone}`}>
      <div className="stat-icon">{icon}</div>
      <div>
        <div className="stat-label">{label}</div>
        <div className="stat-value">{value}</div>
        {hint && <div className="stat-hint">{hint}</div>}
      </div>
    </div>
  )
}

export function Badge({ tone = 'gray', children }) {
  return <span className={`badge badge-${tone}`}>{children}</span>
}

export function Modal({ title, onClose, children, footer, wide }) {
  useEffect(() => {
    const esc = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [onClose])
  return (
    <div className="modal-bg" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${wide ? 'modal-wide' : ''}`} role="dialog" aria-modal="true">
        <header className="modal-head">
          <h3>{title}</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Fechar">✕</button>
        </header>
        <div className="modal-body">{children}</div>
        {footer && <footer className="modal-foot">{footer}</footer>}
      </div>
    </div>
  )
}

export function Alert({ tone = 'info', children, onClose }) {
  if (!children) return null
  return (
    <div className={`alert alert-${tone}`}>
      <span>{children}</span>
      {onClose && <button className="icon-btn" onClick={onClose} aria-label="Fechar">✕</button>}
    </div>
  )
}

export function Empty({ children = 'Nenhum registro encontrado.' }) {
  return <p className="empty">{children}</p>
}

export function Loading() {
  return <div className="loading"><span className="spinner" /> Carregando...</div>
}

export function Field({ label, children, full }) {
  return (
    <label className={`field ${full ? 'full' : ''}`}>
      <span>{label}</span>
      {children}
    </label>
  )
}

export function Tabs({ tabs, active, onChange }) {
  return (
    <div className="tabs" role="tablist">
      {tabs.map((t) => (
        <button key={t.id} role="tab" aria-selected={active === t.id}
          className={active === t.id ? 'tab active' : 'tab'} onClick={() => onChange(t.id)}>
          {t.label}
        </button>
      ))}
    </div>
  )
}
