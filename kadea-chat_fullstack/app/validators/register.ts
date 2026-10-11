import vine from '@vinejs/vine'

export const registerValidator = vine.create(
    vine.object({
        full_name: vine.string().trim().minLength(2).maxLength(50),
        email: vine.string().trim().normalizeEmail().email().unique({ table: 'users', column: 'email' }),
        password: vine.string()
        .minLength(8)
        .maxLength(128)
        .confirmed() ,
    })
)