import type { HttpContext } from '@adonisjs/core/http'
import { formatTimeLabel, formatMessageTime } from '../helpers/time.ts'
import db from '@adonisjs/lucid/services/db'
import User from '#models/user'
import Conversation from '#models/conversation'
import ConversationMember from '#models/conversation_member'
import Message from '#models/message'

/**
 * Heure si le message date d'aujourd'hui, sinon jour/mois (ex: "14:32" ou "12/10")
 */


export default class ChatController {
  /**
   * Construit la liste des discussions de l'utilisateur pour la sidebar.
   * Méthode privée : partagée par index, create (et show plus tard).
   */
  private async buildConversationList(user: User, search = '') {
    // 1. Les conversations dont je suis membre, avec tous leurs membres chargés
    const rows = await Conversation.query()
      .whereHas('members', (query) => query.where('userId', user.id))
      .preload('members', (query) => query.preload('user'))
      .orderBy('updatedAt', 'desc')

    // 2. Transformer chaque conversation en objet simple pour la vue
    const items = await Promise.all(
      rows.map(async (conversation) => {
        // Dans une conversation privée, "l'autre" est le membre qui n'est pas moi
        const other = conversation.members.find((member) => member.userId !== user.id)?.user

        // Dernier message de CETTE conversation
        const last = await Message.query()
          .where('conversationId', conversation.id)
          .orderBy('createdAt', 'desc')
          .first()

        return {
          id: conversation.id,
          title: conversation.isGroup
            ? (conversation.name ?? 'Groupe')
            : (other?.fullName ?? 'Utilisateur'),
          avatarUrl: conversation.isGroup ? null : (other?.avatarUrl ?? null),
          lastMessagePreview: last?.content ?? '',
          lastMessageTimeLabel: last ? formatTimeLabel(last.createdAt) : '',
        }
      })
    )

    // 3. Recherche : on garde les conversations dont le titre contient le texte
    return search
      ? items.filter((item) => item.title.toLowerCase().includes(search.toLowerCase()))
      : items
  }

  /**
   * GET /chat : liste des discussions
   */
  async index({ request, view, auth }: HttpContext) {
    const search = String(request.input('q', '')).trim()
    const conversations = await this.buildConversationList(auth.user!, search)

    return view.render('pages/chat/index', { conversations, search })
  }

  /**
   * GET /chat/new : choisir une personne pour démarrer une discussion
   */
  async create({ request, view, auth }: HttpContext) {
    const user = auth.user!
    const search = String(request.input('q', '')).trim()

    // Tous les utilisateurs sauf moi
    const usersQuery = User.query().whereNot('id', user.id).orderBy('fullName', 'asc').limit(20)

    // Si une recherche est tapée : filtre sur le nom OU l'e-mail.
    // Le callback regroupe les deux conditions entre parenthèses, sinon le
    // "OR" annulerait le "whereNot" ci-dessus.
    if (search) {
      usersQuery.where((query) => {
        query.whereILike('fullName', `%${search}%`).orWhereILike('email', `%${search}%`)
      })
    }

    const users = await usersQuery
    // La sidebar de la page affiche toujours la liste complète de mes discussions
    const conversations = await this.buildConversationList(user)

    return view.render('pages/chat/new', { users, conversations, search })
  }

  /**
   * POST /chat : ouvre la conversation privée avec une personne (la crée si elle n'existe pas)
   */
  async store({ request, response, session, auth }: HttpContext) {
    const user = auth.user!

    // 1. Lire et vérifier l'identifiant de l'autre personne
    const otherId = Number(request.input('userId'))

    if (!Number.isInteger(otherId) || otherId === user.id) {
      session.flash('error', 'Personne invalide.')
      return response.redirect().toRoute('chat.new')
    }

    const other = await User.find(otherId)
    if (!other) {
      session.flash('error', "Cet utilisateur n'existe pas.")
      return response.redirect().toRoute('chat.new')
    }

    // 2. Une conversation privée existe-t-elle déjà entre nous deux ? (pour éviter les doublons)
    const existing = await Conversation.query()
      .where('isGroup', false)
      .whereHas('members', (query) => query.where('userId', user.id))
      .whereHas('members', (query) => query.where('userId', otherId))
      .first()

    if (existing) {
      return response.redirect().toRoute('chat.show', { id: existing.id })
    }

    // 3. Sinon on la crée : conversation + 2 participations, dans une seule transaction
    const conversation = await db.transaction(async (trx) => {
      const created = await Conversation.create({ isGroup: false }, { client: trx })

      await ConversationMember.createMany(
        [
          { conversationId: created.id, userId: user.id },
          { conversationId: created.id, userId: otherId },
        ],
        { client: trx }
      )

      return created
    })

    return response.redirect().toRoute('chat.show', { id: conversation.id })
  }

    /**
   * GET /chat/:id : ouvre une conversation et affiche ses messages
   */
  async show({ params, view, response, session, auth }: HttpContext) {
    const user = auth.user!

    // 1. Charger la conversation, À CONDITION que je sois membre.
    // Sans le whereHas, n'importe qui pourrait lire n'importe quelle
    // conversation en changeant le numéro dans l'adresse.
    const row = await Conversation.query()
      .where('id', params.id)
      .whereHas('members', (query) => query.where('userId', user.id))
      .preload('members', (query) => query.preload('user'))
      .first()

    // Conversation inconnue OU dont je ne fais pas partie : même réponse dans les deux cas
    if (!row) {
      session.flash('error', "Cette discussion n'existe pas.")
      return response.redirect().toRoute('chat.index')
    }

    // 2. Titre et avatar : même logique que la sidebar
    const other = row.members.find((member) => member.userId !== user.id)?.user
    const conversation = {
      id: row.id,
      title: row.isGroup ? (row.name ?? 'Groupe') : (other?.fullName ?? 'Utilisateur'),
      avatarUrl: row.isGroup ? null : (other?.avatarUrl ?? null),
      isGroup: row.isGroup,
    }

    // 3. Les messages, du plus ancien au plus récent
    const rows = await Message.query()
      .where('conversationId', row.id)
      .preload('sender')
      .orderBy('createdAt', 'asc')

    const messages = rows.map((message) => ({
      id: message.id,
      content: message.content,
      senderName: message.sender.fullName,
      isMine: message.senderId === user.id, // sert à aligner la bulle à droite ou à gauche
      timeLabel: formatMessageTime(message.createdAt),
    }))

    // 4. La sidebar affiche toujours la liste complète de mes discussions
    const conversations = await this.buildConversationList(user)

    return view.render('pages/chat/show', { conversations, conversation, messages })
  }
}