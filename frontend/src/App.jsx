import { createContext, useContext, useEffect, useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { api, getToken, setToken } from './api.js'
import Layout from './components/Layout.jsx'
import { ConfirmHost, Loading } from './components/ui.jsx'
import Login from './pages/Login.jsx'
import Avisos from './pages/Avisos.jsx'
import Calendario from './pages/Calendario.jsx'
import Materiais from './pages/Materiais.jsx'
import GestorPainel from './pages/gestor/Painel.jsx'
import Matriculas from './pages/gestor/Matriculas.jsx'
import Turmas from './pages/gestor/Turmas.jsx'
import Financeiro from './pages/gestor/Financeiro.jsx'
import Instituicao from './pages/gestor/Instituicao.jsx'
import Conformidade from './pages/gestor/Conformidade.jsx'
import ProfessorPainel from './pages/professor/Painel.jsx'
import Diario from './pages/professor/Diario.jsx'
import Planos from './pages/professor/Planos.jsx'
import AlunoPainel from './pages/aluno/Painel.jsx'
import Filhos from './pages/responsavel/Filhos.jsx'
import ResponsavelFinanceiro from './pages/responsavel/Financeiro.jsx'

const AuthContext = createContext(null)
export const useAuth = () => useContext(AuthContext)

export const MENUS = {
  GESTOR: [
    { to: '/gestor', label: 'Painel', icon: '📊', el: <GestorPainel /> },
    { to: '/gestor/matriculas', label: 'Matrículas', icon: '📝', el: <Matriculas /> },
    { to: '/gestor/turmas', label: 'Turmas e Professores', icon: '🏫', el: <Turmas /> },
    { to: '/gestor/financeiro', label: 'Financeiro', icon: '💰', el: <Financeiro /> },
    { to: '/gestor/avisos', label: 'Avisos', icon: '📢', el: <Avisos /> },
    { to: '/gestor/calendario', label: 'Calendário', icon: '📅', el: <Calendario /> },
    { to: '/gestor/conformidade', label: 'Conformidade', icon: '🛡️', el: <Conformidade /> },
    { to: '/gestor/instituicao', label: 'Instituição', icon: '⚙️', el: <Instituicao /> },
  ],
  PROFESSOR: [
    { to: '/professor', label: 'Minhas turmas', icon: '🏫', el: <ProfessorPainel /> },
    { to: '/professor/diario', label: 'Diário de classe', icon: '📒', el: <Diario /> },
    { to: '/professor/planos', label: 'Planos de aula', icon: '🗂️', el: <Planos /> },
    { to: '/professor/avisos', label: 'Avisos', icon: '📢', el: <Avisos /> },
    { to: '/professor/calendario', label: 'Calendário', icon: '📅', el: <Calendario /> },
  ],
  ALUNO: [
    { to: '/aluno', label: 'Meu boletim', icon: '📘', el: <AlunoPainel /> },
    { to: '/aluno/materiais', label: 'Materiais', icon: '✏️', el: <Materiais /> },
    { to: '/aluno/avisos', label: 'Avisos', icon: '📢', el: <Avisos /> },
    { to: '/aluno/calendario', label: 'Calendário', icon: '📅', el: <Calendario /> },
  ],
  RESPONSAVEL: [
    { to: '/responsavel', label: 'Meus filhos', icon: '👨‍👩‍👧', el: <Filhos /> },
    { to: '/responsavel/financeiro', label: 'Financeiro', icon: '💳', el: <ResponsavelFinanceiro /> },
    { to: '/responsavel/avisos', label: 'Avisos', icon: '📢', el: <Avisos /> },
    { to: '/responsavel/calendario', label: 'Calendário', icon: '📅', el: <Calendario /> },
    { to: '/responsavel/materiais', label: 'Materiais', icon: '✏️', el: <Materiais /> },
  ],
}

export default function App() {
  const [usuario, setUsuario] = useState(null)
  const [carregando, setCarregando] = useState(!!getToken())

  useEffect(() => {
    if (!getToken()) return
    api.get('/auth/me').then(setUsuario).catch(() => setToken(null)).finally(() => setCarregando(false))
  }, [])

  const entrar = async (email, senha) => {
    const r = await api.post('/auth/login', { email, senha })
    setToken(r.token)
    setUsuario(r.usuario)
  }

  const sair = async () => {
    try { await api.post('/auth/logout') } catch { /* sessão já encerrada */ }
    setToken(null)
    setUsuario(null)
  }

  if (carregando) return <Loading />

  const menu = usuario ? MENUS[usuario.perfil] : []
  return (
    <AuthContext.Provider value={{ usuario, entrar, sair }}>
      <ConfirmHost />
      <Routes>
        <Route path="/login" element={usuario ? <Navigate to={menu[0].to} /> : <Login />} />
        {usuario && (
          <Route element={<Layout menu={menu} />}>
            {menu.map((m) => <Route key={m.to} path={m.to} element={m.el} />)}
          </Route>
        )}
        <Route path="*" element={<Navigate to={usuario ? menu[0].to : '/login'} />} />
      </Routes>
    </AuthContext.Provider>
  )
}
