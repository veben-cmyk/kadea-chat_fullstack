import type { HttpContext } from '@adonisjs/core/http'
import hash from '@adonisjs/core/services/hash'
import { updateProfileValidator, updatePasswordValidator } from '#validators/profile'

export default class ProfileController {
    /** GET /profile : affiche la page */
  async show({ view, auth }: HttpContext) {
    return view.render('pages/profile/show', { profileUser: auth.user! })
  }

  /** POST /profile : change le nom */
  async update({ request, response, session, auth }: HttpContext) {
    const user = auth.user!
    const { fullName } = await request.validateUsing(updateProfileValidator)

    user.fullName = fullName
    await user.save()

    session.flash('success', 'Profil mis à jour.')
    return response.redirect().toRoute('profile.show')
  }

  /** POST /profile/password : change le mot de passe */
  async updatePassword({ request, response, session, auth }: HttpContext) {
    const user = auth.user!
    const { currentPassword, password } = await request.validateUsing(updatePasswordValidator)

    // On vérifie l'ancien mot de passe : sinon, quelqu'un qui trouve ta session
    // ouverte pourrait changer ton mot de passe sans le connaître.
    // hash.verify compare le texte tapé avec le mot de passe chiffré en base.
    const isValid = await hash.verify(user.password, currentPassword)
    if (!isValid) {
      session.flash('error', 'Ton mot de passe actuel est incorrect.')
      return response.redirect().toRoute('profile.show')
    }

    // Le modèle chiffre le nouveau mot de passe automatiquement au save()
    user.password = password
    await user.save()

    session.flash('success', 'Mot de passe modifié.')
    return response.redirect().toRoute('profile.show')
  }

    /** POST /profile/avatar : enregistre l'adresse de la photo déjà envoyée à Cloudinary */
  async updateAvatar({ request, response, session, auth }: HttpContext) {
    const user = auth.user!
    const avatarUrl = String(request.input('avatarUrl', ''))

    // Garde-fou : on n'accepte QUE une adresse de MON espace Cloudinary.
    // Sans ça, quelqu'un pourrait enregistrer n'importe quelle adresse comme "photo".
    // 255 = taille de la colonne avatar_url.
    if (!avatarUrl.startsWith('https://res.cloudinary.com/hze8r3qp/') || avatarUrl.length > 255) {
      session.flash('error', 'Photo invalide.')
      return response.redirect().toRoute('profile.show')
    }

    user.avatarUrl = avatarUrl
    await user.save()

    session.flash('success', 'Photo de profil mise à jour.')
    return response.redirect().toRoute('profile.show')
  }

  /** POST /profile/avatar/delete : retire la photo (retour à l'initiale) */
  async destroyAvatar({ response, session, auth }: HttpContext) {
    const user = auth.user!
    user.avatarUrl = null
    await user.save()

    session.flash('success', 'Photo supprimée.')
    return response.redirect().toRoute('profile.show')
  }
}