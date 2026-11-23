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

      // NOUVEAU : combien de messages je n'ai pas encore lus dans cette conversation ?
      // MA participation (déjà chargée par le preload) contient lastReadAt.
      const me = conversation.members.find((member) => member.userId === user.id)

      // Non lu = écrit par quelqu'un d'AUTRE + pas supprimé + envoyé APRÈS ma dernière lecture
      const unreadQuery = Message.query()
        .where('conversationId', conversation.id)
        .whereNot('senderId', user.id)
        .where('isDeleted', false)

      // Si je n'ai jamais ouvert la conversation (lastReadAt = null) : tout est non lu,
      // donc on n'ajoute pas de condition de date
      if (me?.lastReadAt) {
        unreadQuery.where('createdAt', '>', me.lastReadAt.toJSDate())
      }

      // count('* as total') demande à la base de COMPTER au lieu de renvoyer les lignes.
      // Lucid range le résultat dans $extras.total (parfois en texte : Number() le convertit)
      const [unread] = await unreadQuery.count('* as total')
      const unreadCount = Number(unread.$extras.total)

      return {
        id: conversation.id,
        title: conversation.isGroup
          ? (conversation.name ?? 'Groupe')
          : (other?.fullName ?? 'Utilisateur'),
        avatarUrl: conversation.isGroup ? null : (other?.avatarUrl ?? null),
        lastMessagePreview: last ? (last.isDeleted ? 'Message supprimé' : last.content) : '',
        lastMessageTimeLabel: last ? formatTimeLabel(last.createdAt) : '',
        unreadCount, // NOUVEAU
      }
    })
  )

  return search
    ? items.filter((item) => item.title.toLowerCase().includes(search.toLowerCase()))
    : items
}