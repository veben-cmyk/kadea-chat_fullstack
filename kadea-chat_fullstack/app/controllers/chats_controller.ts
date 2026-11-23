import type { HttpContext } from '@adonisjs/core/http'
import {  formatMessageTime } from '../helpers/time.ts'
import db from '@adonisjs/lucid/services/db'
import User from '#models/user'
import Conversation from '#models/conversation'
import ConversationMember from '#models/conversation_member'
import Message from '#models/message'
import { buildConversationList } from '#services/conversation_list'
import { DateTime } from 'luxon'
import transmit from '@adonisjs/transmit/services/main'




export default class ChatController {
  /**
   * Construit la liste des discussions de l'utilisateur pour la sidebar.
   * Méthode privée : partagée par index, create (et show plus tard).
   */
  

  /**
   * GET /chat : liste des discussions
   */
  async index({ request, view, auth }: HttpContext) {
    const search = String(request.input('q', '')).trim()
    const conversations = await buildConversationList(auth.user!, search)

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
    const conversations = await buildConversationList(user)

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
      /**
   * GET /chat/:id : ouvre une conversation et affiche ses messages
   */
  async show({ params, view, response, session, auth }: HttpContext) {
    const user = auth.user!

    // 1. Charger la conversation, À CONDITION que je sois membre.
    // Sans le whereHas, n'importe qui pourrait lire n'importe quelle conversation en changeant le numéro dans l'adresse.
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

    // 2. Les infos de l'en-tête, envoyées à chat/conversation_header.edge
    // "other" = l'autre personne dans une discussion privée (1v1).
    // Les membres sont déjà chargés par le preload() de l'étape 1 :
    const other = row.members.find((member) => member.userId !== user.id)?.user
    const conversation = {
      id: row.id,
      // Groupe : son nom. Discussion privée : le nom de l'autre personne.
      title: row.isGroup ? (row.name ?? 'Groupe') : (other?.fullName ?? 'Utilisateur'),
      // Un groupe n'a pas de photo : l'avatar affichera l'initiale.
      avatarUrl: row.isGroup ? null : (other?.avatarUrl ?? null),
      isGroup: row.isGroup,
      // Nombre de participants, affiché sous le nom du groupe ("3 membres").
      memberCount: row.members.length,
    }

    // NOUVEAU — 3. "Lu" : j'ouvre la conversation, donc j'ai tout lu jusqu'à maintenant.
    // On retrouve MA ligne de participation (déjà chargée par le preload) et on la met à jour.
    const myMembership = row.members.find((member) => member.userId === user.id)
    if (myMembership) {
      myMembership.lastReadAt = DateTime.now()
      await myMembership.save()

      // On prévient les autres navigateurs ouverts : "cette personne vient de tout lire"
      transmit.broadcast(`conversations/${row.id}`, { type: 'read', readerId: user.id })
    }

    // NOUVEAU — Jusqu'à quand l'AUTRE personne a lu.
    // Seulement en discussion privée (dans un groupe : null, donc jamais "lu").
    // null aussi si l'autre n'a jamais ouvert la conversation.
    const otherReadAt = row.isGroup
      ? null
      : (row.members.find((member) => member.userId !== user.id)?.lastReadAt ?? null)

    // 4. Les messages, du plus ancien au plus récent
    const rows = await Message.query()
      .where('conversationId', row.id)
      .preload('sender')
      .orderBy('createdAt', 'asc')

    const messages = rows.map((message) => {
      const isMine = message.senderId === user.id // sert à aligner la bulle à droite ou à gauche
      return {
        id: message.id,
        content: message.content,
        senderName: message.sender.fullName,
        isMine,
        isDeleted: message.isDeleted,
        timeLabel: formatMessageTime(message.createdAt),
        // NOUVEAU : "lu" = c'est MON message ET l'autre a lu APRÈS son envoi.
        // Les dates Luxon se comparent directement avec <= (plus tôt ou en même temps).
        isRead: isMine && otherReadAt !== null && message.createdAt <= otherReadAt,
      }
    })

    // 5. La sidebar affiche toujours la liste complète de mes discussions
    const conversations = await buildConversationList(user)

    return view.render('pages/chat/show', {
      conversations,
      conversation,
      messages,
      // Le JavaScript doit savoir qui regarde la page pour choisir gauche ou droite
      currentUserId: user.id,
    })
  }

    /**
   * POST /chat/:id/read : "j'ai tout lu jusqu'à maintenant".
   * Appelé en arrière-plan par app.js quand un message arrive pendant que je regarde.
   */
  async markRead({ params, response, auth }: HttpContext) {
    const user = auth.user!

    // MA participation à CETTE conversation.
    // Si je n'en suis pas membre, la requête ne trouve rien : impossible de "lire"
    // une conversation qui n'est pas la mienne en changeant le numéro dans l'adresse.
    const membership = await ConversationMember.query()
      .where('conversationId', params.id)
      .where('userId', user.id)
      .first()

    if (!membership) return response.notFound({ error: 'Conversation introuvable.' })

    membership.lastReadAt = DateTime.now()
    await membership.save()

    // On prévient les autres navigateurs : "cette personne a tout lu".
    // type: 'read' permet à app.js de distinguer cet événement d'un nouveau message.
    // (C'est l'étape C qui s'en servira pour afficher "lu" en direct.)
    transmit.broadcast(`conversations/${params.id}`, { type: 'read', readerId: user.id })

    return response.ok({ ok: true })
  }
}