import { useState, useEffect } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

interface PinUser {
  pin: string
  name: string
}

interface TelegramConfig {
  token: string
  chatId: string
}

export default function AdminDashboard() {
  const [password, setPassword] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const [pins, setPins] = useState<PinUser[]>([])
  const [telegram, setTelegram] = useState<TelegramConfig>({ token: '', chatId: '' })

  const fetchConfig = async (authPass: string) => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/config', {
        headers: { Authorization: `Bearer ${authPass}` },
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setPins(data.data.pins || [])
        setTelegram(data.data.telegram || { token: '', chatId: '' })
        setIsAuthenticated(true)
        setError('')
      } else {
        setError(data.message || 'Invalid password')
        setIsAuthenticated(false)
      }
    } catch (err) {
      setError('Error fetching config')
    }
    setLoading(false)
  }

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    fetchConfig(password)
  }

  const handleSave = async () => {
    setLoading(true)
    setSuccessMsg('')
    setError('')
    try {
      const res = await fetch('/api/admin/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${password}`,
        },
        body: JSON.stringify({ pins, telegram }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setSuccessMsg('Configuration saved successfully!')
      } else {
        setError(data.message || 'Error saving config')
      }
    } catch (err) {
      setError('Error saving config')
    }
    setLoading(false)
  }

  const addPin = () => setPins([...pins, { pin: '', name: '' }])
  const removePin = (index: number) => setPins(pins.filter((_, i) => i !== index))
  const updatePin = (index: number, field: 'pin' | 'name', value: string) => {
    const newPins = [...pins]
    newPins[index][field] = value
    setPins(newPins)
  }

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-lg dark:bg-gray-800">
          <h2 className="mb-6 text-center text-2xl font-bold text-gray-800 dark:text-gray-100">Admin Login</h2>
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Admin Password"
              className="w-full rounded border p-2 dark:bg-gray-700 dark:text-white dark:border-gray-600"
              required
            />
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded bg-blue-600 p-2 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? <FontAwesomeIcon icon="circle-notch" spin /> : 'Login'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8 dark:bg-gray-900 dark:text-white">
      <div className="mx-auto max-w-3xl rounded-xl bg-white p-6 shadow-lg dark:bg-gray-800">
        <h1 className="mb-6 text-3xl font-bold">Admin Dashboard</h1>

        {error && <div className="mb-4 rounded bg-red-100 p-3 text-red-700">{error}</div>}
        {successMsg && <div className="mb-4 rounded bg-green-100 p-3 text-green-700">{successMsg}</div>}

        <div className="mb-8 border-b pb-8 dark:border-gray-700">
          <h2 className="mb-4 text-xl font-semibold">PIN Management</h2>
          <div className="space-y-3">
            {pins.map((p, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <input
                  type="text"
                  placeholder="Name"
                  value={p.name}
                  onChange={(e) => updatePin(idx, 'name', e.target.value)}
                  className="flex-1 rounded border p-2 dark:bg-gray-700 dark:border-gray-600"
                />
                <input
                  type="text"
                  placeholder="PIN"
                  value={p.pin}
                  onChange={(e) => updatePin(idx, 'pin', e.target.value)}
                  className="w-1/3 rounded border p-2 dark:bg-gray-700 dark:border-gray-600"
                />
                <button
                  onClick={() => removePin(idx)}
                  className="rounded bg-red-500 px-3 py-2 text-white hover:bg-red-600"
                >
                  <FontAwesomeIcon icon="trash-alt" />
                </button>
              </div>
            ))}
            <button
              onClick={addPin}
              className="mt-2 rounded bg-green-500 px-4 py-2 text-white hover:bg-green-600"
            >
              <FontAwesomeIcon icon="plus" className="mr-2" /> Add User
            </button>
          </div>
        </div>

        <div className="mb-8">
          <h2 className="mb-4 text-xl font-semibold">Telegram Notifications</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Bot Token</label>
              <input
                type="text"
                value={telegram.token}
                onChange={(e) => setTelegram({ ...telegram, token: e.target.value })}
                className="w-full rounded border p-2 dark:bg-gray-700 dark:border-gray-600"
                placeholder="123456789:ABCdefGHIjklMNOpqrSTUvwxYZ"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Chat ID</label>
              <input
                type="text"
                value={telegram.chatId}
                onChange={(e) => setTelegram({ ...telegram, chatId: e.target.value })}
                className="w-full rounded border p-2 dark:bg-gray-700 dark:border-gray-600"
                placeholder="-1001234567890"
              />
            </div>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={loading}
          className="w-full rounded bg-blue-600 p-3 text-lg font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? <FontAwesomeIcon icon="circle-notch" spin /> : 'Save Changes'}
        </button>
      </div>
    </div>
  )
}
