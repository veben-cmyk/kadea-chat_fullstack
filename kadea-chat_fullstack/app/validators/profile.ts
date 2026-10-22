import vine from '@vinejs/vine'

// Formulaire "Informations"
export const updateProfileValidator = vine.create(
    vine.object({
        
        fullName: vine.string().trim().minLength(2).maxLength(50),
    })
)

// Formulaire "Mot de passe"
export const updatePasswordValidator = vine.create(
    vine.object({
        currentPassword: vine.string(),
        // confirmed() attend un champ nommé exactement password_confirmation
        password: vine.string().minLength(8).maxLength(128).confirmed(),
    })
)