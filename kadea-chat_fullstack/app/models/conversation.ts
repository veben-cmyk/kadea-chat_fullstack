import { ConversationSchema } from '#database/schema'
import { hasMany } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import ConversationMember from '#models/conversation_member'
import Message from '#models/message'

export default class Conversation extends ConversationSchema {

      // Les colonnes (id, isGroup, name, createdAt, updatedAt) viennent de
    // ConversationSchema, généré dans database/schema.ts : ne pas les redéclarer.

    /**
   * Relation 1-N : une conversation a plusieurs lignes de participation.
   * Clé étrangère utilisée par défaut : conversationId (déjà dans le schéma
   * généré de ConversationMember).
   */
    @hasMany(() => ConversationMember)
    declare members: HasMany<typeof ConversationMember>

    /**
   * Relation 1-N : une conversation contient plusieurs messages.
   * Clé étrangère utilisée par défaut : conversationId.
   */
    @hasMany(() => Message)
    declare messages: HasMany<typeof Message>
}