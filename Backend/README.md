# Mystery Onyx Store

## Iniciar el sitio y las cuentas

1. Abre una terminal dentro de la carpeta `Backend`.
2. Ejecuta `node server.js`.
3. Visita `http://127.0.0.1:8000` en tu navegador.

El servidor publica el frontend y la API desde la misma dirección. Las cuentas se guardan automáticamente en `Backend/data/users.json`; ese archivo se crea al registrar la primera cuenta y no debe compartirse públicamente.

Rutas disponibles:

- `POST /api/auth/register` — nombre completo, correo y contraseña (mínimo 10 caracteres).
- `POST /api/auth/login` — correo y contraseña.
- `GET /api/health` — comprobación del servicio.
