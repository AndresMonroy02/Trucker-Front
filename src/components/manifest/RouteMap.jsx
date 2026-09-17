import { useEffect, useState } from "react";

import { api } from "../../api";

/**
 * El viaje dibujado en un mapa.
 *
 * La imagen la trae el backend, no el navegador. No es un rodeo: la llave de
 * Google esta restringida por IP justamente porque nunca sale del servidor, y un
 * <img src> apuntando a Google la publicaria en el HTML. El precio de traerla por
 * aqui es que la imagen tiene que viajar como blob, porque un <img> no lleva el
 * Authorization que el endpoint exige.
 *
 * Tres cosas que parecen detalles y no lo son:
 *
 * - **Si no hay coordenadas no se pide nada.** El detalle ya trae los dos
 *   lugares, asi que la pregunta se responde aca y no con un 404 de ida y vuelta.
 * - **Un mapa que no carga no muestra error.** Es el mismo criterio con el que un
 *   viaje se guarda aunque el geocoder este caido: la ruta es el dato, el dibujo
 *   es un adorno.
 * - **El enlace a Google Maps no es una API** y no cuesta nada. Lleva los
 *   place_id del proveedor, que es lo que evita que abra la otra Cartagena.
 */
export default function RouteMap({ manifest, basePath = "/owner" }) {
  const origin = manifest?.origin_place;
  const destination = manifest?.destination_place;
  const drawable = Boolean(
    origin?.lat && origin?.lng &&
    destination?.lat && destination?.lng &&
    origin.id !== destination.id
  );

  const [imageUrl, setImageUrl] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!drawable) return undefined;

    let objectUrl = null;
    let cancelled = false;

    async function load() {
      try {
        const { data } = await api.get(`${basePath}/manifests/${manifest.id}/route-map`, {
          responseType: "blob",
        });
        objectUrl = URL.createObjectURL(data);
        if (cancelled) {
          /* Navegaron a otro viaje mientras la imagen venia en camino. Sin esto
             el blob queda vivo hasta que se recargue la pagina. */
          URL.revokeObjectURL(objectUrl);
          objectUrl = null;
          return;
        }
        setImageUrl(objectUrl);
      } catch {
        if (!cancelled) setFailed(true);
      }
    }

    setImageUrl(null);
    setFailed(false);
    load();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [manifest?.id, basePath, drawable]);

  if (!drawable || failed) return null;

  const point = (place) => `${place.lat},${place.lng}`;
  const mapsUrl = new URL("https://www.google.com/maps/dir/");
  mapsUrl.search = new URLSearchParams({
    api: "1",
    origin: point(origin),
    destination: point(destination),
    ...(origin.provider_place_id ? { origin_place_id: origin.provider_place_id } : {}),
    ...(destination.provider_place_id ? { destination_place_id: destination.provider_place_id } : {}),
  }).toString();

  return (
    <figure className="route-map">
      {imageUrl ? (
        <img src={imageUrl} alt={`Ruta de ${manifest.origin} a ${manifest.destination}`} />
      ) : (
        /* Del alto de la imagen, para que la tarjeta no salte cuando llega. */
        <div className="route-map-placeholder" aria-hidden="true" />
      )}
      <figcaption>
        {/* Importa cuando la distancia es "ingresada": si alguien escribio 900 km
            sobre una carretera de 698, este mapa no respalda esa cifra. */}
        <span className="hint">Trazado calculado por Google</span>
        <a href={mapsUrl.toString()} target="_blank" rel="noopener noreferrer">
          Abrir en Google Maps
        </a>
      </figcaption>
    </figure>
  );
}
