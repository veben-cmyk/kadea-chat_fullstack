import crypto from 'node:crypto'

/** Token en clair, à envoyer par e-mail */
export function generateToken() {
  return crypto.randomBytes(32).toString('hex')
}

/** Empreinte SHA-256 : c'est elle qu'on enregistre et qu'on recherche. Le clair n'est jamais en base. */
export function hashToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex')
}