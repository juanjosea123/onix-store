import { supabase } from './supabase.js'

const formulario = document.getElementById('loginForm')

formulario.addEventListener('submit', async (e) => {
    e.preventDefault()
    const email = document.getElementById('loginEmail').value
    const password = document.getElementById('loginPassword').value

    const { data, error } = await supabase.auth.signInWithCredentials({
        email: email,
        password: password
    })
    const mensaje = document.getElementById('mensaje')

    if (error){
        mensaje.textContent = 'Error: ' + error.message
        mensaje.style.color = 'red'
    }
    else{
        window.location.href = './panel.html'
    }
})