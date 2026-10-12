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

router.on('/').render('pages/home').as('home')


// 2. Inscription (Register) - En premier
router.get('/register', [AuthController, 'showRegister']).as('register.show')
router.post('/register', [AuthController, 'register']).as('register.store')

// 3. Connexion (Login)
router.on('/login').render('pages/auth/login').as('login.show')
