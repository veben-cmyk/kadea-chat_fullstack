import type { HttpContext } from '@adonisjs/core/http'
import crypto from 'node:crypto'
import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import mail from '@adonisjs/mail/services/main'
import env from '#start/env'
import User from '#models/user'
import Token from '#models/token'
import { registerValidator } from '#validators/register'
import VerifyEmail from '#mails/verify_email_notification'

//  Adapte le chemin :  le fichier du kit qui contient loginValidator
import { errors } from '@adonisjs/auth'
import { loginValidator } from '#validators/user'

const EMAIL_CONFIRMATION = 'EMAIL_CONFIRMATION'

/**
 * Empreinte SHA-256 d'un token : c'est elle qu'on enregistre et qu'on recherche.
 * Le token en clair ne va jamais en base.
 */
function hashToken(token: string) {
    return crypto.createHash('sha256').update(token).digest('hex')
}

export default class AuthController {
    async showRegister({ view }: HttpContext) {
        return view.render('pages/auth/register')
    }

    async register({ request, response, session }: HttpContext) {
    // 1. Valider les données du formulaire
        const payload = await request.validateUsing(registerValidator)

    // 2. Token en clair (envoyé par e-mail) : sa version hachée ira en base
        const token = crypto.randomBytes(32).toString('hex')

    // 3. Compte et token créés ensemble : si l'un échoue, aucun des deux n'existe
        const user = await db.transaction(async (trx) => {

            const newUser = await User.create(payload, { client: trx })

        await Token.create(
            {
                userId: newUser.id,
            type: EMAIL_CONFIRMATION,
            tokenHash: hashToken(token),
            expiresAt: DateTime.now().plus({ hours: 24 }),
            },
            {
            client: trx,
            }
        )

        return newUser
    })

    // 4. Lien de confirmation (APP_URL est validée au démarrage, pas de valeur de repli)
    const verificationUrl = `${env.get('APP_URL')}/verify-email/${token}`

    // Pratique pour tester en local, jamais affiché en production
    if (env.get('NODE_ENV') === 'development') {
        console.log('Lien de confirmation :', verificationUrl)
    }

    // 5. Envoi du mail hors transaction : un échec d'envoi n'annule pas l'inscription
    try {
        await mail.send(new VerifyEmail(user, verificationUrl))
        session.flash('success', 'Compte créé ! Vérifie tes e-mails pour activer ton compte.')
    } catch (error) {
        console.error("Erreur lors de l'envoi de l'e-mail de confirmation :", error)
        session.flash('warning', "Compte créé, mais l'e-mail de confirmation n'a pas pu être envoyé.")
    }

    // 6. Pas de connexion automatique : retour vers la page de connexion
    return response.redirect().toRoute('login.show')
    }

    /**
   * Valide le lien de confirmation reçu par e-mail
   */
    async verifyEmail({ params, response, session }: HttpContext) {
        const tokenHash = hashToken(params.token)

    // Vérification et modifications dans une seule transaction.
    // forUpdate() verrouille la ligne : deux clics simultanés sur le lien
    // ne peuvent pas le valider deux fois.
    const confirmed = await db.transaction(async (trx) => {
        const storedToken = await Token.query({ client: trx })
        .where('tokenHash', tokenHash)
        .where('type', EMAIL_CONFIRMATION)
        .whereNull('usedAt')
        .where('expiresAt', '>', DateTime.now().toJSDate())
        .forUpdate()
        .first()

      // Inconnu, mauvais type, déjà utilisé ou expiré : un seul cas à traiter
        if (!storedToken) {
            return false
        }

        const user = await User.findOrFail(storedToken.userId, { client: trx })
        user.isEmailConfirmed = true
        storedToken.usedAt = DateTime.now()

        await user.save()
        await storedToken.save()

        return true
    })

    if (!confirmed) {
        session.flash('error', 'Ce lien de confirmation est invalide, expiré ou déjà utilisé.')
        return response.redirect().toRoute('login.show')
    }

    session.flash('success', 'Adresse e-mail confirmée ! Tu peux te connecter.')
    return response.redirect().toRoute('login.show')
    }

    /**
   * Affiche la page de connexion
   */
    async showLogin({ view }: HttpContext) {
    return view.render('pages/auth/login')
    }

    /**
   * Traite le formulaire de connexion
   */
    async login({ request, response, session, auth }: HttpContext) {
    // 1. Valider les champs du formulaire (e-mail + mot de passe)
        const { email, password } = await request.validateUsing(loginValidator)

    // 2. Vérifier les identifiants.
    // verifyCredentials cherche l'utilisateur par e-mail, compare le mot de passe
    // haché, et lève E_INVALID_CREDENTIALS si quelque chose ne va pas.
    let user: User
    try {
        user = await User.verifyCredentials(email, password)
    } catch (error) {
        if (error instanceof errors.E_INVALID_CREDENTIALS) {
        // Même message dans tous les cas : on ne révèle pas si l'e-mail existe
        session.flash('error', 'E-mail ou mot de passe incorrect.')
        // On garde l'e-mail tapé (jamais le mot de passe) pour old('email')
        session.flashOnly(['email'])
        return response.redirect().toRoute('login.show')
        }
      // Autre erreur (base de données...) : on ne la masque pas
        throw error
    }

    // 3. Connexion refusée tant que l'e-mail n'est pas confirmé.
    // Ce test vient APRÈS le mot de passe : on ne révèle l'état du compte
    // qu'à quelqu'un qui connaît le bon mot de passe.
    if (!user.isEmailConfirmed) {
        session.flash('error', 'Confirme ton adresse e-mail avant de te connecter.')
        session.flashOnly(['email'])
        return response.redirect().toRoute('login.show')
    }

    // 4. Ouvrir la session (guard "web") puis aller vers le chat
    await auth.use('web').login(user)
    return response.redirect().toRoute('chat.index')
    }
}
