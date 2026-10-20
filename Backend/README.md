# Mystery Onyx Store

## Iniciar el sitio y las cuentas

1. Abre una terminal dentro de la carpeta `Backend`.
2. Ejecuta `node server.js`.
3. Visita `http://127.0.0.1:8000` en tu navegador.

El servidor publica el frontend y la API desde la misma dirección. Las cuentas se guardan y actualizan automáticamente en `Backend/data/users.json`. Los correos y nombres se conservan allí, mientras que las contraseñas se guardan como hashes cifrados, nunca en texto legible.

> Importante: subir únicamente los archivos HTML/CSS/JS a un hosting estático no permite registrar cuentas ni escribir en el JSON. Debes usar un hosting compatible con Node.js y configurar como comando de inicio `node Backend/server.js` (o ejecutar ese comando en tu propio servidor).

Rutas disponibles:

- `POST /api/auth/register` — nombre completo, correo y contraseña (mínimo 10 caracteres).
- `POST /api/auth/login` — correo y contraseña.
- `GET /api/health` — comprobación del servicio.
