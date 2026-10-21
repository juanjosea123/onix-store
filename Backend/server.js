const express = require('express');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();
app.use(express.json());

// Configuración de Supabase con las credenciales de entorno
const supabaseUrl = process.env.SUPABASE_URL='https://olklsdzxlugrgxlelrgt.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY='sb_publishable_6_bvuF40nccO62w1Lm6t4w_-8LvIRki';
const supabase = createClient(supabaseUrl, supabaseKey);

// Endpoint para registrar un emprendedor
app.post('/api/emprendedores', async (req, res) => {
    try {
        const { nombre_completo, email, pass } = req.body;

        // Validar campos obligatorios
        if (!nombre_completo || !email || !pass) {
            return res.status(400).json({ error: 'Todos los campos son obligatorios' });
        }

        // Insertar en la tabla "Emprendedores"
        // Nota: El campo "id" es incremental y no es necesario enviarlo.
        const { data, error } = await supabase
            .from('Emprendedores')
            .insert([
                { 
                    nombre completo: nombre_completo, // O usar corchetes si hay espacios: data['nombre completo']
                    email: email, 
                    pass: pass 
                }
            ])
            .select();

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        return res.status(201).json({
            message: 'Emprendedor registrado exitosamente',
            data: data[0]
        });

    } catch (err) {
        return res.status(500).json({ error: 'Error interno del servidor', details: err.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});