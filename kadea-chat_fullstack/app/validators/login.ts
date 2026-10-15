import vine from '@vinejs/vine'
export const loginValidator = vine.create(
    vine.object({
    // normalizeEmail : même traitement qu'à l'inscription (minuscules)
    email: vine.string().trim().normalizeEmail().email(),
    // Pas de minLength ici : c'est verifyCredentials qui juge le mot de passe
    password: vine.string(),
    })
)