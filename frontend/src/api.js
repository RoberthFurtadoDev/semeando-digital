const TOKEN_KEY = 'semeando_token'
const DEMO = !!import.meta.env.VITE_DEMO
let tokenMemoria = null

export const getToken = () => {
  if (DEMO) return tokenMemoria
  try { return localStorage.getItem(TOKEN_KEY) } catch { return null }
}
export const setToken = (t) => {
  if (DEMO) { tokenMemoria = t; return }
  try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY) } catch { /* armazenamento indisponível */ }
}

async function request(method, url, body) {
  if (DEMO) {
    // Versão de demonstração: o "backend" roda no próprio navegador (src/demo/servidor.js)
    const { atender } = await import('./demo/servidor.js')
    return atender(method, url, body ? JSON.parse(JSON.stringify(body)) : undefined, getToken())
  }
  const headers = { 'Content-Type': 'application/json' }
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(`/api${url}`, { method, headers, body: body ? JSON.stringify(body) : undefined })
  if (res.status === 401 && !url.startsWith('/auth/login')) {
    setToken(null)
    window.location.href = '/login'
  }
  const text = await res.text()
  const data = text ? JSON.parse(text) : null
  if (!res.ok) throw new Error(data?.mensagem || 'Erro ao comunicar com o servidor')
  return data
}

export const api = {
  get: (url) => request('GET', url),
  post: (url, body) => request('POST', url, body),
  put: (url, body) => request('PUT', url, body),
  del: (url) => request('DELETE', url),
  async download(url, nome) {
    if (DEMO) {
      const r = await request('GET', url)
      return { nome, conteudo: typeof r === 'string' ? r : JSON.stringify(r, null, 2) }
    }
    const res = await fetch(`/api${url}`, { headers: { Authorization: `Bearer ${getToken()}` } })
    if (!res.ok) throw new Error('Falha no download')
    const blob = await res.blob()
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = nome
    a.click()
    URL.revokeObjectURL(a.href)
  }
}
