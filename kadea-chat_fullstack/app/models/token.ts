import { TokenSchema } from '#database/schema'
import { belongsTo } from '@adonisjs/lucid/orm'
import User from '#models/user'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

export default class Token extends TokenSchema {
    //un jeton appartient à un user
    
    @belongsTo(()=> User)
    declare user: BelongsTo<typeof User>

}