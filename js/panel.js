import { supabase } from './supabase.js'

const { data, error } = await supabase.auth.getUser()

if (error || !data.user) {
    window.location.href = './index.html'
}
else{
    document.getElementById('usuario').textContent = 'Usuario: ' + data.user.email
}

document.getElementById('cerrarSesion').addEventListener('click', async () => {
    const { error } = await supabase.auth.signOut()
    window.location.href = './index.html'
})