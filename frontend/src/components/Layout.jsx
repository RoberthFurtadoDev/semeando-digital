import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../App.jsx'
import { iniciais } from '../util.js'

const NOME_PERFIL = { GESTOR: 'Gestão / Secretaria', PROFESSOR: 'Professor(a)', ALUNO: 'Aluno(a)', RESPONSAVEL: 'Responsável' }

export default function Layout({ menu }) {
  const { usuario, sair } = useAuth()
  const [aberto, setAberto] = useState(false)
  const local = useLocation()
  useEffect(() => setAberto(false), [local.pathname])
  const atual = menu.find((m) => m.to === local.pathname)

  return (
    <div className="app">
      <aside className={`sidebar ${aberto ? 'open' : ''}`}>
        <div className="brand">
          <span className="brand-logo">🌱</span>
          <div>
            <strong>Semeando Digital</strong>
            <small>Gestão Escolar</small>
          </div>
        </div>
        <nav>
          {menu.map((m, i) => (
            <NavLink key={m.to} to={m.to} end={i === 0} className="nav-item">
              <span className="nav-icon">{m.icon}</span>{m.label}
            </NavLink>
          ))}
        </nav>
        <div className="side-user">
          <div className="avatar">{iniciais(usuario.nome)}</div>
          <div className="side-user-info">
            <strong>{usuario.nome}</strong>
            <small>{NOME_PERFIL[usuario.perfil]}</small>
          </div>
        </div>
        <button className="btn btn-ghost btn-block" onClick={sair}>Sair</button>
      </aside>
      {aberto && <div className="backdrop" onClick={() => setAberto(false)} />}
      <div className="main">
        <header className="topbar">
          <button className="icon-btn menu-btn" onClick={() => setAberto(true)} aria-label="Abrir menu">☰</button>
          <h1>{atual?.label}</h1>
          <span className="chip">{NOME_PERFIL[usuario.perfil]}</span>
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
