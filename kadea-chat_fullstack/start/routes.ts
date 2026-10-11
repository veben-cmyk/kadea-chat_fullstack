/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import router from '@adonisjs/core/services/router'

router.on('/').render('pages/home').as('home')


// Routes d'authentification
router.on('/login').render('pages/auth/login').as('login.show')
router.on('/register').render('pages/auth/register').as('register.store')