/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import router from '@adonisjs/core/services/router'
const AuthController = () => import('#controllers/auth_controller')
const ChatController = () => import('#controllers/chats_controller')
import { middleware } from '#start/kernel'

router.on('/').render('pages/home').as('home')
const MessagesController = () => import('#controllers/messages_controller')

// profile
const ProfileController = () => import('#controllers/profile_controller')

import transmit from '@adonisjs/transmit/services/main'
import Conversation from '#models/conversation'


// 2. Inscription (Register) - En premier
router.get('/register', [AuthController, 'showRegister']).as('register.show')
router.post('/register', [AuthController, 'register']).as('register.store')
router.get('/verify-email/:token', [AuthController, 'verifyEmail']).as('verify.email')

// 3. Connexion (Login)
router.get('/login', [AuthController, 'showLogin']).as('login.show')
router.post('/login', [AuthController, 'login']).as('login.store')


router.get('/chat', [ChatController, 'index']).as('chat.index').use(middleware.auth())
router.get('/chat/new', [ChatController, 'create']).as('chat.new').use(middleware.auth())
router.post('/chat', [ChatController, 'store']).as('chat.store').use(middleware.auth())
router.get('/chat/:id', [ChatController, 'show']).as('chat.show').use(middleware.auth())
// Une conversation ouverte (":id" = l'identifiant de la conversation)


router.post('/chat/:id/messages', [MessagesController, 'store'])
    .as('messages.store')
    .use(middleware.auth())

    // profile
router.get('/profile', [ProfileController, 'show']).as('profile.show').use(middleware.auth())
router.post('/profile', [ProfileController, 'update']).as('profile.update').use(middleware.auth())
router.post('/profile/password', [ProfileController, 'updatePassword']).as('profile.password').use(middleware.auth())

//profile
router.post('/profile/avatar', [ProfileController, 'updateAvatar']).as('profile.avatar').use(middleware.auth())
router.post('/profile/avatar/delete', [ProfileController, 'destroyAvatar']).as('profile.avatar.destroy').use(middleware.auth())

// deconnexion
router.post('/logout', [AuthController, 'logout']).as('logout').use(middleware.auth())



/**
 * Canal privé d'une conversation : "conversations/3"
 * Transmit appelle cette fonction quand un navigateur essaie de s'abonner.
 * Retourner true accepte l'abonnement, false le refuse.
 */
transmit.authorize<{ id: string }>('conversations/:id', async (ctx, { id }) => {
    await ctx.auth.check()
    
    const user = ctx.auth.user
    if (!user) return false

  // Même règle que dans show et store : il faut être membre de la conversation
    const conversation = await Conversation.query()
    .where('id', id)
    .whereHas('members', (query) => query.where('userId', user.id))
    .first()

    return conversation !== null
})

transmit.registerRoutes()