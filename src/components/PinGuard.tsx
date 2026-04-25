import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

const PinGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [isChecking, setIsChecking] = useState(true)
  const router = useRouter()

  useEffect(() => {
    // Check if user is already authenticated via cookie or localStorage
    const cookieSession = document.cookie.split('; ').find(row => row.startsWith('user_pin_session='))
    const localSession = localStorage.getItem('user_pin_session')
    
    if (cookieSession || localSession) {
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
        // Set persistent cookie (30 minutes) and localStorage
        document.cookie = `user_pin_session=true; path=/; max-age=${60 * 30}`
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
    <>
      <Head>
        <title>Login</title>
      </Head>
      <div className="relative flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        {/* Decorative background shapes */}
        <div className="absolute top-10 left-10 h-72 w-72 rounded-full bg-blue-300 opacity-20 mix-blend-multiply blur-3xl filter dark:bg-blue-900 dark:opacity-40"></div>
        <div className="absolute bottom-10 right-10 h-72 w-72 rounded-full bg-purple-300 opacity-20 mix-blend-multiply blur-3xl filter dark:bg-purple-900 dark:opacity-40"></div>
        <div className="absolute -bottom-8 left-20 h-72 w-72 rounded-full bg-pink-300 opacity-20 mix-blend-multiply blur-3xl filter dark:bg-pink-900 dark:opacity-40"></div>

        <div className="z-10 w-full max-w-sm rounded-2xl border border-white/20 bg-white/70 p-8 shadow-2xl backdrop-blur-xl dark:border-gray-700/30 dark:bg-gray-800/70">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-tr from-blue-500 to-indigo-500 text-white shadow-lg">
              <FontAwesomeIcon icon="key" className="text-2xl" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
              Welcome Back
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Please enter your PIN to continue
            </p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <input
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="• • • •"
                className="w-full rounded-xl border border-gray-200 bg-white/50 p-4 text-center text-2xl tracking-[0.5em] text-gray-900 outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/20 dark:border-gray-600/50 dark:bg-gray-700/50 dark:text-white dark:focus:border-blue-400 dark:focus:bg-gray-700"
                required
                autoFocus
              />
            </div>
            {error && (
              <div className="animate-pulse text-center text-sm font-medium text-red-500">
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={loading || !pin}
              className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 p-4 font-bold text-white shadow-lg transition-all hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-4 focus:ring-blue-500/30 disabled:opacity-50"
            >
              {loading ? <FontAwesomeIcon icon="circle-notch" spin /> : 'Unlock Access'}
            </button>
          </form>
        </div>
      </div>
    </>
  )
}

export default PinGuard
