import { supabase } from './supabase.js'

const formulario = document.getElementById('registroForm')

if (formulario){
    formulario.addEventListener('submit', async (event) => {
        event.preventDefault()
        const nombre = document.getElementById('nombre').value
        const email = document.getElementById('email').value
        const password = document.getElementById('password').value

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
        const mensaje = document.getElementById('mensaje')
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

/*async function getUsers() {
    const { data, error } = await supabase.from('users').select('*')

    if (error){
        console.error(error)
        return
    }

    console.log(data)
}

getUsers()*/