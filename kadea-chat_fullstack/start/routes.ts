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
import { middleware } from '#start/kernel'

router.on('/').render('pages/home').as('home')


// 2. Inscription (Register) - En premier
router.get('/register', [AuthController, 'showRegister']).as('register.show')
router.post('/register', [AuthController, 'register']).as('register.store')
router.get('/verify-email/:token', [AuthController, 'verifyEmail']).as('verify.email')

// 3. Connexion (Login)
router.get('/login', [AuthController, 'showLogin']).as('login.show')
router.post('/login', [AuthController, 'login']).as('login.store')


// Page chat provisoire, réservée aux utilisateurs connectés.
// Si on n'est pas connecté, le middleware auth renvoie vers la page de login.
// Messagerie : liste des conversations (page d'accueil du chat)
router
    .get('/chat', ({ view }) => view.render('pages/chat/index'))
    .as('chat.index')
    .use(middleware.auth())

// Une conversation ouverte (":id" = l'identifiant de la conversation)
router
    .get('/chat/:id', ({ view }) => view.render('pages/chat/show'))
    .as('chat.conversation')
    .use(middleware.auth())
