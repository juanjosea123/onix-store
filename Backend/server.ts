import express, { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

const app = express();
app.use(express.json());

// Configuración de Supabase con las credenciales de entorno
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://olklsdzxlugrgxlelrgt.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_6_bvuF40nccO62w1Lm6t4w_-8LvIRki';
const supabase = createClient(supabaseUrl, supabaseKey);

// Interfaz para tipar el cuerpo de la petición (Request Body)
interface EmprendedorBody {
    nombre_completo: string;
    email: string;
    pass: string;
}

// Endpoint para registrar un emprendedor
app.post('/api/emprendedores', async (req: Request<{}, {}, EmprendedorBody>, res: Response): Promise<any> => {
    try {
        const { nombre_completo, email, pass } = req.body;

        // Validar campos obligatorios
        if (!nombre_completo || !email || !pass) {
            return res.status(400).json({ error: 'Todos los campos son obligatorios' });
        }

        // Insertar en la tabla "Emprendedores"
        // Nota: Si la columna en tu BD tiene espacio (ej. "nombre completo"), 
        // utiliza notación de corchetes: { "nombre completo": nombre_completo, ... }
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
            message: 'Emprendedor registrado exitosamente',
            data: data ? data[0] : null
        });

    } catch (err: any) {
        return res.status(500).json({ error: 'Error interno del servidor', details: err.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor TypeScript corriendo en el puerto ${PORT}`);
});