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


