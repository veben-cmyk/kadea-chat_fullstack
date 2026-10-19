import { MessageSchema } from '#database/schema'
import { belongsTo } from '@adonisjs/lucid/orm'
import Conversation from '#models/conversation'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from '#models/user'

export default class Message extends MessageSchema {

    // un messages appartient à une conversation
    @belongsTo(()=> Conversation)
    declare conversation: BelongsTo<typeof Conversation>

    //un message appartient à un utilisateur (sender)
    @belongsTo(()=> User, { foreignKey: 'senderId' })
    declare sender: BelongsTo<typeof User>
}