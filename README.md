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

## Pruebas de humo

```bash
npm run smoke
```

Renderiza cada pantalla y cada modal una vez, en Node, y verifica el HTML que
sale. Existe porque `npm run build` no ve el error que de verdad ocurre: un
componente que usa una prop que nadie declaro compila perfecto y lanza
`ReferenceError` al renderizar. Eso ya paso dos veces.

No corre efectos (`useEffect`), asi que no ve la carga de datos. Los casos estan
en `scripts/smoke/harness.jsx`; agrega uno cada vez que una pantalla gane una
prop o una opcion.

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
  brand.js
  pages/
  components/
  utils/
```

## Marca

El nombre y el logo estan en un solo lugar: `src/brand.js`. Para cambiarlos,
edita `BRAND_NAME` ahi o reemplaza `src/assets/logo.png`; ningun otro archivo
escribe el nombre ni apunta a la imagen.

`src/assets/logo-wordmark.png` es la version con el nombre incluido, la que el
backend copia para encabezar los PDF que genera. Si cambia la marca, reemplaza
las dos.

## Notas

- La app usa rutas protegidas por rol.
- Si inicia sesión, el token se guarda en localStorage.
- Si el backend no está levantado, algunas pantallas no funcionarán correctamente.
