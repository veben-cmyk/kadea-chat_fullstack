import { BaseMail } from '@adonisjs/mail'
import type User from '#models/user'//importer

export default class VerifyEmailNotification extends BaseMail {
  // subject = ''
  // Garde l'adresse "from" déjà présente dans ton fichier généré
  
  subject = 'Confirme ton adresse e-mail'

  // L'utilisateur et le lien arrivent ici, depuis le contrôleur
  constructor(
    private user: User,
    private verificationUrl: string
  ) {
    super()
  }
  /**
   * The "prepare" method is called automatically when
   * the email is sent or queued.
   */
  prepare() {
    this.message
    this.message.to(this.user.email).text(
      `Bonjour ${this.user.fullName},\n\n` +
        `Pour confirmer ton adresse e-mail, ouvre ce lien (valable 24 heures) :\n` +
        `${this.verificationUrl}\n\n` +
        `Si tu n'as pas créé de compte, ignore ce message.`
    )
  }
}