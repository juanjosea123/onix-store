import express from 'express';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Cargar las variables de entorno desde el archivo .env
dotenv.config();

const app = express();
app.use(express.json());

// Configuración de Supabase con las credenciales provistas
const supabaseUrl = process.env.SUPABASE_URL || 'https://olklsdzxlugrgxlelrgt.supabase.co';
const supabaseKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || 'sb_secret_6F0uewzMywj3NeRF1eId_g_DP-gbFsg';
const supabaseJwksUrl = process.env.SUPABASE_JWKS_URL || 'https://olklsdzxlugrgxlelrgt.supabase.co/auth/v1/.well-known/jwks.json';

// Inicializar el cliente de Supabase
const supabase = createClient(supabaseUrl, supabaseKey);

// Interfaz para definir el cuerpo de la solicitud (Request Body)
/**
 * Ruta para registrar un nuevo emprendedor
 */
app.post('/api/emprendedores', async (req, res) => {
    try {
        const { nombre_completo, email, pass } = req.body;

        // Validar que los campos requeridos no estén vacíos
        if (!nombre_completo || !email || !pass) {
            return res.status(400).json({ 
                error: 'Los campos nombre_completo, email y pass son obligatorios.' 
            });
        }

        // Inserción en la tabla "Emprendedores" de Supabase
        const { data, error } = await supabase
            .from('Emprendedores')
            .insert([
                { 
                    "nombre completo": nombre_completo, 
                    email: email, 
                    pass: pass 
                }
            ])
            .select();

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        return res.status(201).json({
            message: 'Emprendedor registrado correctamente',
            data: data ? data[0] : null
        });

    } catch (err) {
        return res.status(500).json({ 
            error: 'Error interno del servidor', 
            details: err.message 
        });
    }
});

// Inicializar el puerto del servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor ejecutándose en el puerto ${PORT}`);
    console.log(`JWKS URL configurada: ${supabaseJwksUrl}`);
});