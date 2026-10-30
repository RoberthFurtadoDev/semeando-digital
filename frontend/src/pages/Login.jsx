import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../App.jsx'
import { api } from '../api.js'
import { Alert } from '../components/ui.jsx'

function carregarScriptGoogle() {
  if (window.google?.accounts?.id) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = 'https://accounts.google.com/gsi/client'
    s.async = true
    s.onload = resolve
    s.onerror = reject
    document.head.appendChild(s)
  })
}

const DEMO = [
  { perfil: 'Gestão', email: 'gestor@exemplo.com', icon: '🏢' },
  { perfil: 'Professor', email: 'professor@exemplo.com', icon: '👩‍🏫' },
  { perfil: 'Aluno', email: 'aluno@exemplo.com', icon: '🎒' },
  { perfil: 'Responsável', email: 'responsavel@exemplo.com', icon: '👪' },
]

export default function Login() {
  const { entrar, entrarComGoogle } = useAuth()
  const googleBtn = useRef(null)
  const [googleAtivo, setGoogleAtivo] = useState(false)
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [verSenha, setVerSenha] = useState(false)
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)

  // Login com Google (Google Identity Services): só aparece se o backend tiver GOOGLE_CLIENT_ID
  useEffect(() => {
    let cancelado = false
    api.get('/auth/config').then(({ googleClientId }) => {
      if (!googleClientId || cancelado) return
      carregarScriptGoogle().then(() => {
        if (cancelado || !googleBtn.current) return
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: async ({ credential }) => {
            setErro('')
            setEnviando(true)
            try { await entrarComGoogle(credential) } catch (err) { setErro(err.message) } finally { setEnviando(false) }
          },
        })
        window.google.accounts.id.renderButton(googleBtn.current, {
          theme: 'outline', size: 'large', text: 'signin_with', shape: 'rectangular', locale: 'pt-BR',
          width: Math.min(400, googleBtn.current.offsetWidth || 320),
        })
        setGoogleAtivo(true)
      }).catch(() => {})
    }).catch(() => {})
    return () => { cancelado = true }
  }, [entrarComGoogle])

  const enviar = async (e, em = email, se = senha) => {
    e?.preventDefault()
    setErro('')
    setEnviando(true)
    try { await entrar(em.trim(), se) } catch (err) { setErro(`${err.message}. A senha de demonstração é 123456 (6 dígitos); você digitou ${se.length} caractere(s).`) } finally { setEnviando(false) }
  }

  return (
    <div className="login-page">
      <div className="login-hero">
        <div className="login-hero-inner">
          <span className="hero-logo">🌱</span>
          <h1>Semeando Digital</h1>
          <p>Sistema de Gestão Escolar do Centro Educacional Semeando — matrícula, contratos, cobrança, diário de classe e portal da família em um só lugar.</p>
          <ul>
            <li>✔ Cobrança dual: taxa de associado e mensalidade</li>
            <li>✔ Validação automática contra a tabela oficial</li>
            <li>✔ Checklist de documentos e dados de emergência</li>
            <li>✔ Auditoria e conformidade com a LGPD</li>
          </ul>
        </div>
      </div>
      <div className="login-box">
        <form className="login-form" onSubmit={enviar}>
          <h2>Entrar</h2>
          <p className="muted">Acesse com seu e-mail e senha.</p>
          <Alert tone="error">{erro}</Alert>
          <label className="field">
            <span>E-mail</span>
            <input id="email" type="email" autoComplete="off" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" required autoFocus />
          </label>
          <label className="field">
            <span>Senha</span>
            <div className="senha-wrap">
              <input id="senha" type={verSenha ? 'text' : 'password'} value={senha} onChange={(e) => setSenha(e.target.value)}
                placeholder="••••••" autoComplete="off" required />
              <button type="button" className="btn-link senha-toggle" onClick={() => setVerSenha(!verSenha)}>{verSenha ? 'Ocultar' : 'Mostrar'}</button>
            </div>
          </label>
          <button className="btn btn-primary btn-block" disabled={enviando}>{enviando ? 'Entrando...' : 'Entrar'}</button>
          <div className={googleAtivo ? 'google-area' : 'hidden'}>
            <div className="divider"><span>ou</span></div>
            <div ref={googleBtn} className="google-btn" />
          </div>

          <div className="demo">
            <p className="muted small">Acesso rápido para demonstração (senha <strong>123456</strong>):</p>
            <div className="demo-grid">
              {DEMO.map((d) => (
                <button type="button" key={d.email} className="demo-btn" disabled={enviando}
                  onClick={() => { setEmail(d.email); setSenha('123456'); enviar(null, d.email, '123456') }}>
                  <span>{d.icon}</span>{d.perfil}
                </button>
              ))}
            </div>
          </div>
          <p className="muted small lgpd">🔒 Ambiente de demonstração com dados 100% fictícios (LGPD, art. 14).</p>
        </form>
      </div>
    </div>
  )
}
