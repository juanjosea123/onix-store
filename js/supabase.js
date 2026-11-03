import { createClient } from '@supabase/supabase-js';

// Reemplaza los valores entre comillas si prefieres colocarlos directamente aquí
const supabaseUrl = process.env.SUPABASE_URL || 'https://olklsdzxlugrgxlelrgt.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'sb_publishable_6_bvuF40nccO62w1Lm6t4w_-8LvIRki';

export const supabase = createClient(supabaseUrl, supabaseKey);