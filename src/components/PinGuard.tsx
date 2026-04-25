import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

const PinGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [isChecking, setIsChecking] = useState(true)
  const router = useRouter()

  useEffect(() => {
    // Check if user is already authenticated
    const session = localStorage.getItem('user_pin_session')
    if (session) {
      setIsAuthenticated(true)
    }
    setIsChecking(false)
  }, [])

  // Bypass PIN guard for admin page
  if (router.pathname.startsWith('/admin')) {
    return <>{children}</>
  }

  if (isChecking) {
    return <div className="flex h-screen items-center justify-center bg-white dark:bg-gray-900"><FontAwesomeIcon icon="circle-notch" spin className="text-4xl text-gray-400" /></div>
  }

  if (isAuthenticated) {
    return <>{children}</>
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/verify-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      })
      const data = await res.json()

      if (res.ok && data.success) {
        localStorage.setItem('user_pin_session', 'true')
        setIsAuthenticated(true)
      } else {
        setError(data.message || 'PIN is incorrect')
      }
    } catch (err) {
      setError('An error occurred while verifying the PIN.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-lg dark:bg-gray-800">
        <h2 className="mb-6 text-center text-2xl font-bold text-gray-800 dark:text-gray-100">
          Enter PIN to Access
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="Enter your PIN"
              className="w-full rounded-lg border border-gray-300 p-3 text-center text-xl tracking-widest text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
              required
              autoFocus
            />
          </div>
          {error && <p className="text-center text-sm text-red-500">{error}</p>}
          <button
            type="submit"
            disabled={loading || !pin}
            className="w-full rounded-lg bg-blue-600 p-3 font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? <FontAwesomeIcon icon="circle-notch" spin /> : 'Unlock'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default PinGuard
