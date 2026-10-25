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

  /// GET /groups/:id/members : liste des membres (tous les membres la voient)
  /// POST /groups/:id/members : ajouter des membres (admin seulement)
  /// POST /groups/:id/members/:userId/remove : retirer un membre (admin seulement)     
  /** Charge un groupe SEULEMENT si je suis membre, avec tous ses membres. Sinon null. */
  private async loadGroup(id: string, userId: number) {
    return Conversation.query()
      .where('id', id)
      .where('isGroup', true)
      .whereHas('members', (query) => query.where('userId', userId))
      .preload('members', (query) => query.preload('user'))
      .first()
  }

  /** GET /groups/:id/members : liste des membres (tous les membres la voient) */
  async members({ params, view, response, session, auth }: HttpContext) {
    const user = auth.user!
    const group = await this.loadGroup(params.id, user.id)

    if (!group) {
      session.flash('error', "Ce groupe n'existe pas.")
      return response.redirect().toRoute('chat.index')
    }

    const isAdmin = group.members.find((m) => m.userId === user.id)?.role === 'admin'

    // Personnes qu'on peut encore ajouter : tous ceux qui ne sont pas déjà membres
    const memberIds = group.members.map((m) => m.userId)
    const candidates = isAdmin
      ? await User.query().whereNotIn('id', memberIds).orderBy('fullName', 'asc').limit(50)
      : []

    return view.render('pages/groups/members', {
      group: { id: group.id, name: group.name ?? 'Groupe' },
      members: group.members.map((m) => ({
        id: m.userId,
        fullName: m.user.fullName,
        email: m.user.email,
        avatarUrl: m.user.avatarUrl,
        role: m.role,
        isMe: m.userId === user.id,
      })),
      isAdmin,
      candidates,
      conversations: await buildConversationList(user),
    })
  }

  /** POST /groups/:id/members : ajouter des membres (admin seulement) */
  async addMembers({ params, request, response, session, auth }: HttpContext) {
    const user = auth.user!
    const group = await this.loadGroup(params.id, user.id)

    if (!group) {
      session.flash('error', "Ce groupe n'existe pas.")
      return response.redirect().toRoute('chat.index')
    }

    // Le contrôle se fait ICI, côté serveur : cacher le bouton ne suffit pas,
    // quelqu'un pourrait envoyer la requête à la main.
    if (group.members.find((m) => m.userId === user.id)?.role !== 'admin') {
      session.flash('error', 'Seuls les administrateurs peuvent ajouter des membres.')
      return response.redirect().toRoute('groups.members', { id: group.id })
    }

    // Une seule case cochée arrive comme un texte, plusieurs comme un tableau : on uniformise
    const raw = request.input('memberIds', [])
    const ids = (Array.isArray(raw) ? raw : [raw]).map(Number).filter((id) => Number.isInteger(id) && id > 0)

    // On retire les doublons et les personnes déjà dans le groupe
    const existing = group.members.map((m) => m.userId)
    const newIds = [...new Set(ids)].filter((id) => !existing.includes(id))
    const users = await User.query().whereIn('id', newIds)

    if (users.length === 0) {
      session.flash('error', 'Choisis au moins une personne à ajouter.')
      return response.redirect().toRoute('groups.members', { id: group.id })
    }

    await ConversationMember.createMany(
      users.map((u) => ({ conversationId: group.id, userId: u.id, role: 'member' }))
    )

    session.flash('success', 'Membres ajoutés.')
    return response.redirect().toRoute('groups.members', { id: group.id })
  }

  /** POST /groups/:id/members/:userId/remove : retirer un membre (admin seulement) */
  async removeMember({ params, response, session, auth }: HttpContext) {
    const user = auth.user!
    const group = await this.loadGroup(params.id, user.id)

    if (!group) {
      session.flash('error', "Ce groupe n'existe pas.")
      return response.redirect().toRoute('chat.index')
    }

    if (group.members.find((m) => m.userId === user.id)?.role !== 'admin') {
      session.flash('error', 'Seuls les administrateurs peuvent retirer des membres.')
      return response.redirect().toRoute('groups.members', { id: group.id })
    }

    const targetId = Number(params.userId)

    if (targetId === user.id) {
      session.flash('error', 'Tu ne peux pas te retirer toi-même du groupe.')
      return response.redirect().toRoute('groups.members', { id: group.id })
    }

    // On supprime seulement la participation : ses anciens messages restent dans le groupe
    await ConversationMember.query()
      .where('conversationId', group.id)
      .where('userId', targetId)
      .delete()

    session.flash('success', 'Membre retiré.')
    return response.redirect().toRoute('groups.members', { id: group.id })
  }
}