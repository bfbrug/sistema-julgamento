#!/usr/bin/env node
/**
 * Gera secrets seguros para uso em produção.
 * Execute: node scripts/gen-secrets.js
 */
const crypto = require('crypto')

function gen(label) {
  const secret = crypto.randomBytes(64).toString('hex')
  console.log(`${label}=${secret}`)
}

console.log('\n# Cole as variáveis abaixo nas configurações do Railway:\n')
gen('JWT_ACCESS_SECRET')
gen('JWT_REFRESH_SECRET')
console.log('\n# Lembrete: as duas chaves DEVEM ser diferentes entre si.\n')
