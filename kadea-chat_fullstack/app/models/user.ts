import { UserSchema } from '#database/schema'
import hash from '@adonisjs/core/services/hash'
import { compose } from '@adonisjs/core/helpers'
import { withAuthFinder } from '@adonisjs/auth/mixins/lucid'
import Token from '#models/token'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import { hasMany } from '@adonisjs/lucid/orm'
import ConversationMember from '#models/conversation_member'
import Message from '#models/message'

/**
 * User model represents a user in the application.
 * It extends UserSchema and includes authentication capabilities
 * through the withAuthFinder mixin.
 */
export default class User extends compose(UserSchema, withAuthFinder(hash)) {
  /**
   * Relation 1-N : un utilisateur a plusieurs jetons
   * (confirmation d'e-mail, réinitialisation du mot de passe).
   * Clé étrangère : tokens.user_id (userId, devinée par Lucid).
   */
  @hasMany(() => Token)
  declare tokens: HasMany<typeof Token>

    /**
   * Relation 1-N : un utilisateur a plusieurs participations,
   * une par conversation dont il est membre (avec son rôle et sa dernière lecture).
   * C'est un côté de la relation N-N utilisateurs <-> conversations.
   */
  @hasMany(() => ConversationMember)
  declare memberships: HasMany<typeof ConversationMember>

  /**
   * Relation 1-N : un utilisateur peut envoyé plusieurs messages.
   */
  @hasMany(() => Message, { foreignKey: 'senderId' })
  declare sentMessages: HasMany<typeof Message>
}
