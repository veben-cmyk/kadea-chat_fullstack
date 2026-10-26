import { BaseMail } from '@adonisjs/mail'
import type User from '#models/user'

export default class ResetPasswordNotification extends BaseMail {
  subject = 'Réinitialise ton mot de passe - Kadea Chat'

  constructor(
    private user: User,
    private resetUrl: string
  ) {
    super()
  }

  prepare() {
    this.message.to(this.user.email).html(`
        <p>Bonjour,</p>
        <p>Tu as demandé à réinitialiser ton mot de passe. Clique sur le lien ci-dessous (valable 1 heure) :</p>
        <p><a href="${this.resetUrl}">Choisir un nouveau mot de passe</a></p>
        <p>Si tu n'es pas à l'origine de cette demande, ignore simplement cet e-mail.</p>
    `)
  }
}