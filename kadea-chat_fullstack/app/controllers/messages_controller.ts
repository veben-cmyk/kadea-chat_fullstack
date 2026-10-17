import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import Conversation from '#models/conversation'
import Message from '#models/message'

export default class MessagesController {
    /**
   * POST /chat/:id/messages : enregistre un message dans une conversation
   */
    async store({ params, request, response, session, auth }: HttpContext) {

        const user = auth.user!

    // 1. La conversation doit exister ET je dois en être membre.
    // Sans ce test, quelqu'un pourrait écrire dans une conversation qui n'est pas la sienne.
        const conversation = await Conversation.query()
            .where('id', params.id)
            .whereHas('members', (query) => query.where('userId', user.id))
            .first()

            if (!conversation) {
                session.flash('error', "Cette discussion n'existe pas.")
                return response.redirect().toRoute('chat.index')
            }

        // 2. Lire le texte (le nom du champ doit être le même que dans message_form.edge)
        const content = String(request.input('content', '')).trim()

        // Message vide : on ne crée rien et on revient à la conversation
            if (!content) {
            return response.redirect().toRoute('chat.show', { id: conversation.id })
            }

            // Limite de taille, pour éviter des messages énormes en base
            if (content.length > 2000) {
                session.flash('error', 'Ton message est trop long (2000 caractères maximum).')
                return response.redirect().toRoute('chat.show', { id: conversation.id })
            }
    
        // 3. Enregistrer le message : l'expéditeur vient de la session, jamais du formulaire,
        // sinon on pourrait écrire au nom de quelqu'un d'autre
        await Message.create({
            conversationId: conversation.id,
            senderId: user.id,
            content,
        })

        // 4. Marquer la conversation comme active : la sidebar les trie par updatedAt,
        // donc celle-ci remontera en haut de la liste
        conversation.updatedAt = DateTime.now()
        await conversation.save()

        // 5. Retour à la conversation, qui affiche maintenant le nouveau message
        return response.redirect().toRoute('chat.show', { id: conversation.id })

    }
}