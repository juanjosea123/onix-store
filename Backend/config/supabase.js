import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Reemplaza los valores entre comillas si prefieres colocarlos directamente aquí
const supabaseUrl = process.env.SUPABASE_URL || 'https://olklsdzxlugrgxlelrgt.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'sb_publishable_6_bvuF40nccO62w1Lm6t4w_-8LvIRki';
const supabase = createClient(supabaseUrl, supabaseKey);

export { supabase };