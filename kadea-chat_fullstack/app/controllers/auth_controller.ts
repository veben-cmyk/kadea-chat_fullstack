import type { HttpContext } from '@adonisjs/core/http'
import User from '#models/user'
import { registerValidator } from '#validators/register'


export default class AuthController {

    async showRegister({ view }: HttpContext) {
    // ici : retourner la vue
        return view.render('pages/auth/register')
    }

    
    async register({ request, response }: HttpContext) {
        const payload = await request.validateUsing(registerValidator)
        console.log(payload)
    }
}