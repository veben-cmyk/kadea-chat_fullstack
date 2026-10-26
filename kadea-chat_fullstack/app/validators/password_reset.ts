import vine from '@vinejs/vine'

export const forgotPasswordValidator = vine.create(
  vine.object({
    email: vine.string().trim().normalizeEmail().email(),
  })
)

export const resetPasswordValidator = vine.create(
  vine.object({
    // confirmed() attend un champ nommé exactement password_confirmation
    password: vine.string().minLength(8).maxLength(128).confirmed(),
  })
)