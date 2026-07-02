import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './App.css'

interface UserProfile {
  sub: string
  email: string
  name: string
  provider: string
  role: string
}

const apiBase = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080'
const storageKey = 'wms_auth_token'
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function App() {
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState<UserProfile | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({})

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const token = params.get('token')
    const errorParam = params.get('error')

    if (errorParam) {
      setError(decodeURIComponent(errorParam))
      window.history.replaceState(null, '', window.location.pathname)
      return
    }

    if (token) {
      localStorage.setItem(storageKey, token)
      window.history.replaceState(null, '', window.location.pathname)
    }

    const savedToken = localStorage.getItem(storageKey)
    if (savedToken) {
      fetchProfile(savedToken)
    }
  }, [])

  const fetchProfile = async (token: string) => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`${apiBase}/api/me`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const body = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(body?.error || 'Unable to fetch profile, please sign in again.')
      }

      setUser(body.user)
    } catch (err) {
      setUser(null)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const validateFields = () => {
    const errors: { email?: string; password?: string } = {}

    if (!email.trim()) {
      errors.email = 'Email is required.'
    } else if (!emailRegex.test(email)) {
      errors.email = 'Please enter a valid email address.'
    }

    if (!password) {
      errors.password = 'Password is required.'
    } else if (password.length < 8) {
      errors.password = 'Password must be at least 8 characters.'
    }

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleGoogleSignIn = () => {
    window.location.href = `${apiBase}/auth/google`
  }

  const handleLocalSignIn = async () => {
    setError(null)
    setFieldErrors({})

    if (!validateFields()) {
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`${apiBase}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })
      const body = await response.json().catch(() => null)

      if (!response.ok) {
        setError(body?.error || 'Unable to sign in with email and password.')
        if (body?.details) {
          setFieldErrors(body.details)
        }
        return
      }

      const token = body?.token
      if (!token) {
        setError('Unable to sign in, missing authentication token.')
        return
      }

      localStorage.setItem(storageKey, token)
      setUser(body.user)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign in.')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem(storageKey)
    setUser(null)
    setError(null)
    setEmail('')
    setPassword('')
    setFieldErrors({})
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            user ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <LoginPage
                loading={loading}
                error={error}
                email={email}
                password={password}
                fieldErrors={fieldErrors}
                onEmailChange={setEmail}
                onPasswordChange={setPassword}
                onLocalSignIn={handleLocalSignIn}
                onGoogleSignIn={handleGoogleSignIn}
              />
            )
          }
        />
        <Route
          path="/dashboard"
          element={
            user ? (
              <Dashboard user={user} onLogout={handleLogout} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route path="*" element={<Navigate to={user ? '/dashboard' : '/'} replace />} />
      </Routes>
    </BrowserRouter>
  )
}

/* ---------------------------- icon primitives ---------------------------- */

function MailIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <rect x="2.5" y="4.5" width="15" height="11" rx="2.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M3.5 5.5L10 11L16.5 5.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function LockIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <rect x="4.5" y="9" width="11" height="8" rx="2.2" stroke="currentColor" strokeWidth="1.4" />
      <path d="M7 9V6.5a3 3 0 0 1 6 0V9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M10 2.5l6 2.2v4.3c0 4-2.6 6.9-6 8.5-3.4-1.6-6-4.5-6-8.5V4.7l6-2.2Z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <path d="M7.3 10.1l1.9 1.9 3.6-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ArrowRightIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M4 10h12M12 6l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function LayoutIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <rect x="3" y="3" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="1.4" />
      <path d="M3 8.5H17" stroke="currentColor" strokeWidth="1.4" />
      <path d="M8 8.5V17" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  )
}

function BoxIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M10 2.8 17 6.4v7.2L10 17.2 3 13.6V6.4L10 2.8Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M3 6.4 10 10l7-3.6M10 10v7.2" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  )
}

function TruckIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M2.5 5.5h8v8h-8z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M10.5 9h3.6L17 11.6v2.9h-2.6" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <circle cx="6" cy="14.5" r="1.6" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="13.5" cy="14.5" r="1.6" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  )
}

function ChartIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M3 17V3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M3 17H17" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M6 14V10M10 14V7M14 14V11.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

function SettingsIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="2.6" stroke="currentColor" strokeWidth="1.4" />
      <path
        d="M10 3v1.4M10 15.6V17M17 10h-1.4M4.4 10H3M14.9 5.1l-1 1M6.1 13.9l-1 1M14.9 14.9l-1-1M6.1 6.1l-1-1"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  )
}

function LogoutIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M8 17H4.5A1.5 1.5 0 0 1 3 15.5v-11A1.5 1.5 0 0 1 4.5 3H8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M13 13.5 17 10l-4-3.5M17 10H7.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function RefreshIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M16 6.5A6.5 6.5 0 1 0 17 10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M16 3v3.5h-3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

function DocIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M5.5 2.5h6L16 7v10a1 1 0 0 1-1 1H5.5a1 1 0 0 1-1-1v-13a1 1 0 0 1 1-1Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M11.5 2.5V7H16" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  )
}

/* -------------------------------- login page ------------------------------- */

function LoginPage({
  loading,
  error,
  email,
  password,
  fieldErrors,
  onEmailChange,
  onPasswordChange,
  onLocalSignIn,
  onGoogleSignIn
}: {
  loading: boolean
  error: string | null
  email: string
  password: string
  fieldErrors: { email?: string; password?: string }
  onEmailChange: (value: string) => void
  onPasswordChange: (value: string) => void
  onLocalSignIn: () => Promise<void>
  onGoogleSignIn: () => void
}) {
  return (
    <div className="app-shell">
      <div className="login-page">
        <div className="login-brand">
          <div className="brand-icon">
            <BoxIcon />
          </div>
          <h1>WMS</h1>
          <p>Warehouse Management System</p>
        </div>

        <section className="login-card">
          {/* ✅ แก้ตรงนี้: secure-pill ขึ้นมาอยู่บน */}
          <div className="card-heading">
            <span className="secure-pill">
              <ShieldIcon />
              Secure
            </span>
            <div>
              <p className="small-label">Welcome back</p>
              <h2>Sign in to your account</h2>
            </div>
          </div>

          <div className="login-info">
            <p>Sign in with email and password, or continue with your Google account to reach your warehouse dashboard.</p>
          </div>

          <div className="credentials-form">
            <label className="input-label" htmlFor="email">
              Email
              <div className={`input-wrap${fieldErrors.email ? ' input-wrap-error' : ''}`}>
                <span className="input-icon">
                  <MailIcon />
                </span>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => onEmailChange(event.target.value)}
                  className="text-input"
                  placeholder="you@company.com"
                  aria-invalid={Boolean(fieldErrors.email)}
                />
              </div>
              {fieldErrors.email && <p className="field-error">{fieldErrors.email}</p>}
            </label>
            <label className="input-label" htmlFor="password">
              Password
              <div className={`input-wrap${fieldErrors.password ? ' input-wrap-error' : ''}`}>
                <span className="input-icon">
                  <LockIcon />
                </span>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(event) => onPasswordChange(event.target.value)}
                  className="text-input"
                  placeholder="Enter your password"
                  aria-invalid={Boolean(fieldErrors.password)}
                />
              </div>
              {fieldErrors.password && <p className="field-error">{fieldErrors.password}</p>}
            </label>
            <button className="button button-primary" type="button" onClick={onLocalSignIn} disabled={loading}>
              {loading ? 'Signing in…' : 'Sign in'}
              {!loading && <ArrowRightIcon />}
            </button>
          </div>

          <div className="divider">or continue with</div>
          <button className="button button-secondary" type="button" onClick={onGoogleSignIn} disabled={loading}>
            <span className="google-icon">G</span>
            Sign in with Google
          </button>

          {loading && <p className="status-message">Checking credentials…</p>}
          {error && <p className="status-message error">{error}</p>}
        </section>

        <p className="login-footnote">Protected by role-based access control and encrypted sessions.</p>
      </div>
    </div>
  )
}

/* -------------------------------- dashboard -------------------------------- */

function Dashboard({ user, onLogout }: { user: UserProfile; onLogout: () => void }) {
  const inventoryItems = [
    { sku: 'WMS-001', product: 'Pallet Rack', location: 'A1-04', stock: 18, status: 'In stock' },
    { sku: 'WMS-002', product: 'Packing Tape', location: 'B2-11', stock: 34, status: 'In stock' },
    { sku: 'WMS-003', product: 'Forklift Battery', location: 'C3-02', stock: 4, status: 'Low stock' },
    { sku: 'WMS-004', product: 'Shipping Labels', location: 'B1-08', stock: 72, status: 'In stock' },
    { sku: 'WMS-005', product: 'Bubble Wrap', location: 'A3-06', stock: 12, status: 'Low stock' }
  ]

  const shipmentSummary = [
    { label: 'Incoming', value: '24', detail: 'Arriving today', icon: <TruckIcon /> },
    { label: 'Outgoing', value: '17', detail: 'Pending dispatch', icon: <BoxIcon /> },
    { label: 'Low stock', value: '2', detail: 'Needs replenishment', icon: <ChartIcon /> }
  ]

  const navItems = [
    { label: 'Overview', icon: <LayoutIcon />, active: true },
    { label: 'Inventory', icon: <BoxIcon /> },
    { label: 'Shipments', icon: <TruckIcon /> },
    { label: 'Reports', icon: <ChartIcon /> },
    { label: 'Settings', icon: <SettingsIcon /> }
  ]

  const initials = user.name
    .split(' ')
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <div className="dashboard-page">
      <div className="dashboard-shell">
        <header className="dashboard-topbar">
          <div>
            <p className="small-label">Warehouse Control Center</p>
            <h1>Warehouse dashboard</h1>
            <p className="dashboard-subtitle">
              Signed in as <strong>{user.email}</strong> · {user.role}
            </p>
          </div>
          <div className="dashboard-top-actions">
            <button className="button button-secondary" type="button" onClick={onLogout}>
              <LogoutIcon />
              Sign out
            </button>
          </div>
        </header>

        <div className="dashboard-layout">
          <aside className="dashboard-sidebar">
            <div className="profile-card">
              <p className="label">Admin profile</p>
              <div className="profile-identity">
                <span className="avatar-badge">{initials || 'U'}</span>
                <div>
                  <h2>{user.name}</h2>
                  <p>{user.email}</p>
                </div>
              </div>
              <span className="status-badge status-ok">{user.role}</span>
            </div>

            <nav className="sidebar-nav">
              {navItems.map((item) => (
                <button key={item.label} className={`nav-link${item.active ? ' active' : ''}`} type="button">
                  <span className="nav-link-icon">{item.icon}</span>
                  {item.label}
                </button>
              ))}
            </nav>
          </aside>

          <main className="dashboard-content">
            <section className="status-grid">
              {shipmentSummary.map((item) => (
                <article key={item.label} className="status-card">
                  <div className="status-card-top">
                    <p className="status-card-label">{item.label}</p>
                    <span className="status-card-icon">{item.icon}</span>
                  </div>
                  <h2>{item.value}</h2>
                  <p>{item.detail}</p>
                </article>
              ))}
            </section>

            <section className="overview-panel">
              <div>
                <h2>Warehouse overview</h2>
                <p>Monitor inventory levels, shipping readiness, and warehouse performance from one place.</p>
              </div>
              <div className="overview-actions">
                <button className="button button-primary" type="button">
                  <PlusIcon />
                  Add stock
                </button>
                <button className="button button-secondary" type="button">
                  <DocIcon />
                  Create order
                </button>
              </div>
            </section>

            <section className="table-card">
              <div className="table-card-header">
                <div>
                  <h2>Inventory snapshot</h2>
                  <p>Latest stock status across key warehouse bins.</p>
                </div>
                <button className="button button-secondary" type="button">
                  <RefreshIcon />
                  Refresh
                </button>
              </div>

              <div className="table-wrapper">
                <table className="inventory-table">
                  <thead>
                    <tr>
                      <th>SKU</th>
                      <th>Product</th>
                      <th>Location</th>
                      <th>Stock</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventoryItems.map((item) => (
                      <tr key={item.sku}>
                        <td className="cell-mono">{item.sku}</td>
                        <td>{item.product}</td>
                        <td className="cell-mono">{item.location}</td>
                        <td>{item.stock}</td>
                        <td>
                          <span className={`status-badge ${item.status === 'Low stock' ? 'status-low' : 'status-ok'}`}>
                            {item.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </main>
        </div>
      </div>
    </div>
  )
}

export default App