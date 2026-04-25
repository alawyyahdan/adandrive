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
      // Get location from Cloudflare headers
      const ip = req.headers.get('cf-connecting-ip') || 'Unknown IP'
      const country = req.headers.get('cf-ipcountry') || 'Unknown Country'
      const city = req.headers.get('cf-ipcity') || 'Unknown City'
      const location = `${city}, ${country}`

      // Get WIB Time
      const wibTime = new Intl.DateTimeFormat('id-ID', {
        timeZone: 'Asia/Jakarta',
        dateStyle: 'full',
        timeStyle: 'long',
      }).format(new Date())

      const message = `🔔 *AdanDrive Login Alert*\n\n👤 *User:* ${user.name}\n🔑 *PIN:* ${user.pin}\n⏱ *Waktu (WIB):* ${wibTime}\n📍 *Lokasi:* ${location}\n🌐 *IP:* ${ip}`

      const url = `https://api.telegram.org/bot${telegram.token}/sendMessage`
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: telegram.chatId,
          text: message,
          parse_mode: 'Markdown',
        }),
      }).catch((e) => console.error('Failed to send Telegram notification:', e))
    }

    return NextResponse.json({ success: true, name: user.name })
  } catch (error) {
    console.error('Verify PIN error:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}
