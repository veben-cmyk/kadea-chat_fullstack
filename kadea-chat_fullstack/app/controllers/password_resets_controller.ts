import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import mail from '@adonisjs/mail/services/main'
import env from '#start/env'
import User from '#models/user'
import Token from '#models/token'
import ResetPasswordNotification from '#mails/reset_password_notification'
import { forgotPasswordValidator, resetPasswordValidator } from '#validators/password_reset'
import { generateToken, hashToken } from '../helpers/token.js'

const PASSWORD_RESET = 'password_reset'

export default class PasswordResetsController {
    /** GET /forgot-password : formulaire "quel est ton e-mail ?" */
  async showForgot({ view }: HttpContext) {
    return view.render('pages/auth/forgot')
  }

  /** POST /forgot-password : envoie le lien */
  async sendLink({ request, response, session }: HttpContext) {
    const { email } = await request.validateUsing(forgotPasswordValidator)
    const user = await User.findBy('email', email)

    // On n'envoie qu'aux comptes confirmés. Dans TOUS les cas, la réponse est la même :
    // on ne révèle pas quelles adresses sont inscrites.
    if (user && user.isEmailConfirmed) {
      const token = generateToken()

      await db.transaction(async (trx) => {
        // Les anciens liens non utilisés sont invalidés : seul le dernier fonctionne
        const oldTokens = await Token.query({ client: trx })
          .where('userId', user.id)
          .where('type', PASSWORD_RESET)
          .whereNull('usedAt')

        for (const old of oldTokens) {
          old.usedAt = DateTime.now()
          await old.save()
        }

        await Token.create(
          {
            userId: user.id,
            type: PASSWORD_RESET,
            tokenHash: hashToken(token),
            expiresAt: DateTime.now().plus({ hours: 1 }),
          },
          { client: trx }
        )
      })

      const resetUrl = `${env.get('APP_URL')}/reset-password/${token}`

      // Un échec d'envoi ne change pas la réponse : sinon on révélerait que l'adresse existe
      try {
        await mail.send(new ResetPasswordNotification(user, resetUrl))
      } catch (error) {
        console.error("Erreur lors de l'envoi de l'e-mail de réinitialisation :", error)
      }
    }

    session.flash('success', "Si cette adresse correspond à un compte, un lien vient d'être envoyé.")
    return response.redirect().toRoute('login.show')
  }

  /** GET /reset-password/:token : formulaire du nouveau mot de passe */
  async showReset({ params, view, response, session }: HttpContext) {
    // On vérifie le lien AVANT d'afficher le formulaire
    const stored = await Token.query()
      .where('tokenHash', hashToken(params.token))
      .where('type', PASSWORD_RESET)
      .whereNull('usedAt')
      .where('expiresAt', '>', DateTime.now().toJSDate())
      .first()

    if (!stored) {
      session.flash('error', 'Ce lien est invalide, expiré ou déjà utilisé.')
      return response.redirect().toRoute('forgot.show')
    }

    return view.render('pages/auth/reset', { token: params.token })
  }

  /** POST /reset-password/:token : enregistre le nouveau mot de passe */
  async reset({ params, request, response, session }: HttpContext) {
    const { password } = await request.validateUsing(resetPasswordValidator)

    // Même méthode que verifyEmail : vérification + modifications dans UNE transaction,
    // et forUpdate() pour qu'un double clic ne serve pas le lien deux fois.
    const done = await db.transaction(async (trx) => {
      const stored = await Token.query({ client: trx })
        .where('tokenHash', hashToken(params.token))
        .where('type', PASSWORD_RESET)
        .whereNull('usedAt')
        .where('expiresAt', '>', DateTime.now().toJSDate())
        .forUpdate()
        .first()

      if (!stored) return false

      const user = await User.findOrFail(stored.userId, { client: trx })
      user.password = password // le modèle le chiffre automatiquement au save()
      stored.usedAt = DateTime.now()

      await user.save()
      await stored.save()
      return true
    })

    if (!done) {
      session.flash('error', 'Ce lien est invalide, expiré ou déjà utilisé.')
      return response.redirect().toRoute('forgot.show')
    }

    session.flash('success', 'Mot de passe modifié. Tu peux te connecter.')
    return response.redirect().toRoute('login.show')
  }
}