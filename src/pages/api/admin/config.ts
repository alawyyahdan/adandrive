import { NextRequest, NextResponse } from 'next/server'
import { KVNamespace } from '@cloudflare/workers-types'

export const runtime = 'edge'

export default async function handler(req: NextRequest): Promise<Response> {
  const adminPassword = process.env.ADMIN_PASSWORD
  const authHeader = req.headers.get('Authorization')

  if (!adminPassword) {
    return NextResponse.json({ success: false, message: 'ADMIN_PASSWORD is not set in environment' }, { status: 500 })
  }

  if (authHeader !== `Bearer ${adminPassword}`) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
  }

  const { ONEDRIVE_CF_INDEX_KV } = process.env as unknown as { ONEDRIVE_CF_INDEX_KV: KVNamespace }

  if (req.method === 'GET') {
    try {
      const pinsJson = await ONEDRIVE_CF_INDEX_KV.get('pin_users')
      const telegramJson = await ONEDRIVE_CF_INDEX_KV.get('telegram_config')

      const pins = pinsJson ? JSON.parse(pinsJson) : []
      const telegram = telegramJson ? JSON.parse(telegramJson) : { token: '', chatId: '' }

      return NextResponse.json({ success: true, data: { pins, telegram } })
    } catch (error) {
      return NextResponse.json({ success: false, message: 'Failed to fetch config' }, { status: 500 })
    }
  }

  if (req.method === 'POST') {
    try {
      const { pins, telegram } = await req.json()

      if (pins) {
        await ONEDRIVE_CF_INDEX_KV.put('pin_users', JSON.stringify(pins))
      }
      if (telegram) {
        await ONEDRIVE_CF_INDEX_KV.put('telegram_config', JSON.stringify(telegram))
      }

      return NextResponse.json({ success: true, message: 'Configuration saved' })
    } catch (error) {
      return NextResponse.json({ success: false, message: 'Failed to save config' }, { status: 500 })
    }
  }

  return new Response('Method not allowed', { status: 405 })
}
