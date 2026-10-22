import type User from '#models/user'
import Conversation from '#models/conversation'
import Message from '#models/message'
import { formatTimeLabel } from '../helpers/time.js'

/**
 * Construit la liste des discussions de l'utilisateur pour la barre de gauche.
 * Partagée par ChatController, GroupsController...
 */
export async function buildConversationList(user: User, search = '') {
  const rows = await Conversation.query()
    .whereHas('members', (query) => query.where('userId', user.id))
    .preload('members', (query) => query.preload('user'))
    .orderBy('updatedAt', 'desc')

  const items = await Promise.all(
    rows.map(async (conversation) => {
      const other = conversation.members.find((member) => member.userId !== user.id)?.user

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

  return search
    ? items.filter((item) => item.title.toLowerCase().includes(search.toLowerCase()))
    : items
}