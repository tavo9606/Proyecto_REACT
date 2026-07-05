# SGIH - Hospital Vida Sana

Monorepo con backend (Express + PostgreSQL) y frontend (React + Vite).

## Backend

```
cd backend
npm install
npm run dev   # http://localhost:3000
```

Variables de entorno (`backend/.env`): `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_PORT`.
En producción (Hostinger), estas variables se configuran directamente en el panel de Node.js, no en este archivo.

## Frontend

```
cd frontend
npm install
npm run dev       # http://localhost:5173
npm run build     # genera frontend/dist para producción
```

`VITE_API_URL` se define en `frontend/.env` (desarrollo) y `frontend/.env.production` (build de producción, apunta a `https://sgihgvc.com/api`).

## Despliegue en sgihgvc.com

- El **frontend compilado** (`frontend/dist`) debe subirse a la raíz del dominio (document root) en hPanel.
- El **backend** debe correr como app de Node.js en hPanel con Application Root apuntando a `backend/` y archivo de arranque `index.js`, montada en `sgihgvc.com/api`.
