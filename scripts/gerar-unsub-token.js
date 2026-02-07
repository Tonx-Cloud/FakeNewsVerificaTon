#!/usr/bin/env node
// gerar-unsub-token.js
// Usage:
// UNSUB_SECRET="..." node scripts/gerar-unsub-token.js [USER_ID]

const crypto = require('crypto')

const secret = process.env.UNSUB_SECRET || process.argv[2]
const userId = process.argv[3] || 'USER_UUID'

if (!secret) {
  console.error('Provide UNSUB_SECRET as env or first arg')
  process.exit(1)
}

const exp = Date.now() + 30 * 24 * 60 * 60 * 1000 // 30 days
const payloadObj = { userId, exp }
const payloadJson = JSON.stringify(payloadObj)

function base64url(input) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
}

const payload = base64url(payloadJson)
const sig = crypto.createHmac('sha256', secret).update(payload).digest('hex')

console.log(`${payload}.${sig}`)
