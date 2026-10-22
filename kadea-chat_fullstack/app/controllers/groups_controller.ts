import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import User from '#models/user'
import Conversation from '#models/conversation'
import ConversationMember from '#models/conversation_member'
import { createGroupValidator } from '#validators/group'
import { buildConversationList } from '#services/conversation_list'

export default class GroupsController {
    /** GET /groups/new : formulaire de création (nom + choix des membres) */
  async create({ view, auth }: HttpContext) {
    const user = auth.user! 

    // Tous les autres utilisateurs (sans moi), par ordre alphabétique
    const users = await User.query().whereNot('id', user.id).orderBy('fullName', 'asc').limit(50)
    const conversations = await buildConversationList(user)

    return view.render('pages/groups/new', { users, conversations })
  }

  /** POST /groups : crée le groupe, moi en admin, les personnes choisies en membres */
  async store({ request, response, session, auth }: HttpContext) {
    const user = auth.user!
    const { name, memberIds } = await request.validateUsing(createGroupValidator)

    // Le navigateur peut être modifié : on nettoie la liste côté serveur.
    // Set retire les doublons, filter m'enlève (je suis ajouté à part, en admin),
    // et whereIn ne garde que des utilisateurs qui existent vraiment.
    const ids = [...new Set(memberIds)].filter((id) => id !== user.id)
    const members = await User.query().whereIn('id', ids)

    if (members.length === 0) {
      session.flash('error', 'Choisis au moins une personne pour le groupe.')
      return response.redirect().toRoute('group.new')
    }

    // Groupe + participations dans UNE transaction : si une ligne échoue, rien n'est créé
    const group = await db.transaction(async (trx) => {
      const created = await Conversation.create({ isGroup: true, name }, { client: trx })

      await ConversationMember.createMany(
        [
          { conversationId: created.id, userId: user.id, role: 'admin' },
          ...members.map((member) => ({
            conversationId: created.id,
            userId: member.id,
            role: 'member',
          })),
        ],
        { client: trx }
      )

      return created
    })

    session.flash('success', 'Groupe créé.')
    return response.redirect().toRoute('chat.show', { id: group.id })
  }
}