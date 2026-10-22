// import vine from '@vinejs/vine'

// export const createGroupValidator = vine.create(
//   vine.object({
//     name: vine.string().trim().minLength(2).maxLength(100),
//     members: vine.array(vine.number()).min(1), // Liste des IDs des utilisateurs à ajouter
//   })
// )

import vine from '@vinejs/vine'

export const createGroupValidator = vine.create(
  vine.object({
    name: vine.string().trim().minLength(2).maxLength(60),
    // Au moins un autre membre. Le navigateur envoie des textes ("3"),
    // vine.number() les convertit en nombres.
    memberIds: vine.array(vine.number().positive()).minLength(1),
  })
)