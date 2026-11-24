import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
 
const supabaseUrl = 'https://olklsdzxlugrgxlelrgt.supabase.co'
const supabaseKey = 'sb_publishable_6_bvuF40nccO62w1Lm6t4w_-8LvIRki';

export const supabase = createClient(
    supabaseUrl,
    supabaseKey
)