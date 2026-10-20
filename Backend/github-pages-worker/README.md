# API para GitHub Pages con Cloudflare Workers

GitHub Pages solo publica archivos estáticos y no puede ejecutar `server.js` ni escribir en `users.json`. Esta carpeta contiene una API desplegable como Cloudflare Worker, con una base KV persistente para los usuarios.

## Configuración

1. Crea una cuenta de Cloudflare y, en **Workers & Pages > KV**, crea un namespace llamado `onyx-users`.
2. Abre `wrangler.toml` y reemplaza `REEMPLAZA_CON_EL_ID_DE_TU_KV` por el ID de ese namespace.
3. En **Workers & Pages**, crea un Worker y sube esta carpeta mediante Wrangler o pega `src/worker.js` desde el editor de Cloudflare. Configura el binding KV con nombre `USERS`.
4. En los ajustes del Worker, agrega la variable `ALLOWED_ORIGIN` con el origen de tu sitio GitHub Pages, por ejemplo `https://usuario.github.io`. Aunque tu sitio esté en un repositorio (`/nombre-del-repositorio`), esa parte no se incluye en el origen.
5. Publica el Worker y copia su URL terminada en `workers.dev`.
6. Abre `Website/api-config.js`, pega esa URL en `window.ONYX_API_URL` y vuelve a publicar el contenido de `Website` en GitHub Pages.

Las cuentas se guardan como valores JSON individuales en KV. Los nombres y correos se conservan; las contraseñas se derivan con PBKDF2-SHA-256 y no se almacenan en texto legible.

## Importante

No subas el contenido de `Backend/data/users.json` al repositorio público como base de usuarios. Para el sitio publicado usa el Worker y KV.
