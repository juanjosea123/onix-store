import express from 'express';
import { supabase } from '../config/supabase.js';

const router = express.Router();

router.post('/register', async (req, res) => {
  const { nombre_completo, email, password } = req.body;

  if (!nombre_completo || !email || !password) {
    return res.status(400).json({ error: 'Missing fields' });
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: nombre_completo
      }
    }
  });

  if (error) return res.status(400).json({ error: error.message });

  return res.status(201).json({ user: data.user });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) return res.status(401).json({ error: error.message });

  return res.json({ user: data.user, session: data.session });
});

export default router;