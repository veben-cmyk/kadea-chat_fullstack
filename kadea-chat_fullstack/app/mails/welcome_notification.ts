import { BaseMail } from '@adonisjs/mail'

export default class WelcomeNotification extends BaseMail {
  subject = ''

  /**
   * The "prepare" method is called automatically when
   * the email is sent or queued.
   */
  prepare() {
    this.message.to('user@example.com')
  }
}