import { supabase } from './supabase.js'

const formulario = document.getElementById('registerPanel')

if (formulario){
    formulario.addEventListener('submit', async (event) => {
        event.preventDefault()
        const nombre = document.getElementById('registerName').value
        const email = document.getElementById('registerEmail').value
        const password = document.getElementById('registerPassword').value

        const { data, error } = await supabase.auth.signUp({
            email: email,
            password: password,
            options: {
                data: {
                    full_name: nombre
                },
                emailRedirectTo: window.location.origin + window.location.pathname
            }
        })
        const mensaje = document.getElementById('authMessage')
        if (error) {
            mensaje.textContent = error.message
            mensaje.style.color = 'red'
        } else {
            mensaje.textContent = 'Registro exitoso. Por favor, revisa tu correo electrónico para verificar tu cuenta.'
            mensaje.style.color = 'green'
        }
        formulario.reset()
    })
}