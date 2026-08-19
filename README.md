# Trucker Front

Frontend de la aplicación Trucker construido con React + Vite.

## Requisitos

- Node.js 18 o superior
- npm
- Backend de Trucker corriendo en `http://127.0.0.1:8000`

## Instalación

1. Abre la terminal en la carpeta del proyecto.
2. Instala las dependencias:

```bash
npm install
```

## Ejecutar la aplicación

Inicia el entorno de desarrollo:

```bash
npm run dev
```

Luego abre la URL que te muestre Vite, normalmente:

```text
http://localhost:5173
```

## Compilar para producción

```bash
npm run build
```

Para previsualizar la versión compilada:

```bash
npm run preview
```

## Configuración de API

El frontend está configurado para apuntar al backend en:

```text
http://127.0.0.1:8000
```

Si tu backend corre en otro puerto o host, edita este archivo:

- `src/api.js`

## Estructura principal

```text
src/
  api.js
  App.jsx
  pages/
  components/
  utils/
```

## Notas

- La app usa rutas protegidas por rol.
- Si inicia sesión, el token se guarda en localStorage.
- Si el backend no está levantado, algunas pantallas no funcionarán correctamente.
