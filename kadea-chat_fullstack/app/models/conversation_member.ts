import { ConversationMemberSchema } from '#database/schema'
import { belongsTo} from '@adonisjs/lucid/orm'
import Conversation from '#models/conversation'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from '#models/user'

export default class ConversationMember extends ConversationMemberSchema {

    // une participation appartient à une conversation
    @belongsTo(() => Conversation)
    declare conversation: BelongsTo<typeof Conversation>

    // une participation appartient à un utilisateur
    @belongsTo(()=> User)
    declare user: BelongsTo<typeof User>
}