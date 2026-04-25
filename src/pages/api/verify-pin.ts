import { NextRequest, NextResponse } from 'next/server'
import { KVNamespace } from '@cloudflare/workers-types'

export const runtime = 'edge'

export default async function handler(req: NextRequest): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const { ONEDRIVE_CF_INDEX_KV } = process.env as unknown as { ONEDRIVE_CF_INDEX_KV: KVNamespace }

  try {
    const { pin } = await req.json()
    if (!pin) {
      return NextResponse.json({ success: false, message: 'PIN is required' }, { status: 400 })
    }

    // Fetch config from KV
    const pinsJson = await ONEDRIVE_CF_INDEX_KV.get('pin_users')
    const telegramJson = await ONEDRIVE_CF_INDEX_KV.get('telegram_config')

    const pins: { pin: string; name: string }[] = pinsJson ? JSON.parse(pinsJson) : []
    const telegram: { token: string; chatId: string } = telegramJson ? JSON.parse(telegramJson) : null

    // Verify PIN
    const user = pins.find((p) => p.pin === pin)

    if (!user) {
      return NextResponse.json({ success: false, message: 'Invalid PIN' }, { status: 401 })
    }

    // If Telegram is configured, send notification
    if (telegram?.token && telegram?.chatId) {
      const ip = req.headers.get('cf-connecting-ip') || req.headers.get('x-forwarded-for') || 'Unknown IP'
      const userAgent = req.headers.get('user-agent') || 'Unknown Device'
      const referer = req.headers.get('referer') || 'Direct/None'

      let isp = 'Unknown ISP'
      let mapLink = 'N/A'
      let detailedLocation = 'Unknown Location'

      // Fetch detailed IP info if it's a valid public IP
      if (ip && ip !== 'Unknown IP' && ip !== '127.0.0.1' && ip !== '::1') {
        try {
          // Take the first IP if there are multiple in x-forwarded-for
          const cleanIp = ip.split(',')[0].trim()
          const ipDataRes = await fetch(`http://ip-api.com/json/${cleanIp}`)
          const ipData = await ipDataRes.json()
          
          if (ipData.status === 'success') {
            detailedLocation = `${ipData.city}, ${ipData.regionName}, ${ipData.country}`
            isp = ipData.isp
            mapLink = `https://www.google.com/maps?q=${ipData.lat},${ipData.lon}`
          }
        } catch (e) {
          // Fallback to Cloudflare headers if fetch fails
          const country = req.headers.get('cf-ipcountry') || ''
          const city = req.headers.get('cf-ipcity') || ''
          detailedLocation = [city, country].filter(Boolean).join(', ') || 'Unknown Location'
        }
      }

      // Get WIB Time
      const wibTime = new Intl.DateTimeFormat('id-ID', {
        timeZone: 'Asia/Jakarta',
        dateStyle: 'full',
        timeStyle: 'long',
      }).format(new Date())

      // Escape HTML function to prevent Telegram API parse errors
      const escapeHtml = (text: string) => {
        return String(text)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#039;')
      }

      const message = `🔔 <b>AdanDrive Login Alert</b>\n\n👤 <b>User:</b> ${escapeHtml(user.name)}\n🔑 <b>PIN:</b> ${escapeHtml(user.pin)}\n⏱ <b>Waktu (WIB):</b> ${escapeHtml(wibTime)}\n\n📍 <b>Lokasi:</b> ${escapeHtml(detailedLocation)}\n🏢 <b>Provider/ISP:</b> ${escapeHtml(isp)}\n🗺 <b>Maps:</b> <a href="${mapLink}">Buka Google Maps</a>\n\n🌐 <b>IP:</b> ${escapeHtml(ip)}\n📱 <b>Perangkat:</b> ${escapeHtml(userAgent)}\n🔗 <b>Referrer:</b> ${escapeHtml(referer)}`

      const url = `https://api.telegram.org/bot${telegram.token}/sendMessage`
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: telegram.chatId,
            text: message,
            parse_mode: 'HTML',
          }),
        })
        if (!response.ok) {
          console.error('Telegram API Error:', await response.text())
        }
      } catch (e) {
        console.error('Failed to send Telegram notification:', e)
      }
    }

    return NextResponse.json({ success: true, name: user.name })
  } catch (error) {
    console.error('Verify PIN error:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}
