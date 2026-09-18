import MoneyInput from "../MoneyInput";
import PlaceAutocomplete from "../PlaceAutocomplete";

// Mirrors SUPPORTED_CURRENCIES in the backend config. The app records the currency
// of every amount; it does not convert between them.
const CURRENCIES = ["COP", "USD", "VES", "PEN", "BRL"];

/**
 * Los campos de un manifiesto, una sola vez.
 *
 * Dos pantallas los piden: el formulario manual de siempre y el de revision de
 * un manifiesto leido. Son catorce campos, y una segunda copia se desincroniza
 * en la primera semana -- es exactamente la razon por la que AttachmentField se
 * extrajo en su dia.
 *
 * `needsReview` y `readings` llegan vacios desde el formulario manual, y
 * entonces esto se comporta igual que antes: sin resaltados y sin notas.
 */
export default function ManifestFields({
  form,
  vehicles,
  drivers,
  companies = [],
  manifestStatuses,
  onChange,
  onFieldChange,
  previewKm = null,
  isEditing = false,
  // Nombres de campo que la maquina no leyo con seguridad.
  needsReview = [],
  // Lo que la maquina creyo leer, por campo: {value, confidence, raw_text}.
  readings = null,
  // Se muestra bajo el selector de vehiculo cuando la placa leida no existe.
  unmatchedPlate = null,
}) {
  const flagged = new Set(needsReview);

  /** La clase del campo, para pintar en ambar lo que hay que mirar. */
  function fieldClass(name) {
    return flagged.has(name) ? "field field-review" : "field";
  }

  /**
   * Lo que la maquina leyo, cuando vale la pena decirlo.
   *
   * El caso util es un valor vacio con texto crudo: convierte una casilla en
   * blanco sin explicacion en algo que el usuario corrige de una mirada.
   */
  function reading(name) {
    const read = readings?.[name];
    if (!read || !read.raw_text) return null;
    if (read.value === null) {
      return <p className="hint hint-warning">Leimos «{read.raw_text}» y no supimos interpretarlo.</p>;
    }
    if (flagged.has(name)) {
      return <p className="hint hint-warning">Leimos «{read.raw_text}». Confirma que sea correcto.</p>;
    }
    return null;
  }

  return (
    <>
      <div className={fieldClass("manifest_number")}>
        <label htmlFor="manifest_number">Numero de manifiesto</label>
        <input
          id="manifest_number"
          name="manifest_number"
          value={form.manifest_number}
          onChange={onChange}
          required
        />
        {reading("manifest_number")}
      </div>

      <div className="owner-inline-fields">
        <div className={fieldClass("origin")}>
          <PlaceAutocomplete
            id="origin"
            label="Origen"
            required
            value={form.origin}
            placeId={form.origin_place_id}
            onTextChange={(text) => onFieldChange("origin", text)}
            onPlaceChange={(placeId) => onFieldChange("origin_place_id", placeId)}
          />
          {reading("origin")}
        </div>
        <div className={fieldClass("destination")}>
          <PlaceAutocomplete
            id="destination"
            label="Destino"
            required
            value={form.destination}
            placeId={form.destination_place_id}
            onTextChange={(text) => onFieldChange("destination", text)}
            onPlaceChange={(placeId) => onFieldChange("destination_place_id", placeId)}
          />
          {reading("destination")}
        </div>
      </div>

      {/* Directly under the two endpoints, on purpose. A distance typed by
          hand is never overwritten, so when somebody changes the destination
          the stale figure has to be in the same glance. */}
      <div className="field">
        <label htmlFor="distance_km">Distancia (km)</label>
        <input
          id="distance_km"
          name="distance_km"
          type="number"
          min="0"
          step="0.01"
          value={form.distance_km ?? ""}
          onChange={onChange}
          placeholder="Se calcula sola si ambos lugares tienen ubicacion"
        />
        {/* Texto, nunca dentro del input. Escribirla ahi la marcaria como
            puesta a mano, y un numero que calculo Google quedaria registrado
            como escrito por una persona. */}
        {previewKm !== null ? (
          <p className="hint">
            <strong>Distancia estimada: {previewKm} km</strong> — se guarda sola.
            Escribe un numero solo si conoces el recorrido real.
          </p>
        ) : (
          <p className="hint">
            {form.distance_source === "provider"
              ? "Calculada desde el mapa. Si la escribes, se respeta lo que escribas."
              : "Opcional. Se calcula sola al elegir los dos lugares."}
          </p>
        )}
      </div>

      <div className="owner-inline-fields">
        <div className={fieldClass("departure_date")}>
          <label htmlFor="departure_date">Fecha salida</label>
          <input
            id="departure_date"
            name="departure_date"
            type="date"
            value={form.departure_date}
            onChange={onChange}
            required
          />
          {reading("departure_date")}
        </div>
        <div className="field">
          <label htmlFor="arrival_date">Fecha llegada</label>
          <input
            id="arrival_date"
            name="arrival_date"
            type="date"
            value={form.arrival_date}
            onChange={onChange}
          />
          {/* El manifiesto del RNDC no la imprime, asi que en una revision
              siempre llega vacia. Decirlo evita que parezca un fallo. */}
          {readings && <p className="hint">El manifiesto no trae fecha de llegada.</p>}
        </div>
      </div>

      <div className="owner-inline-fields">
        <div className={fieldClass("driver_name")}>
          <label htmlFor="driver_id">Conductor</label>
          <select id="driver_id" name="driver_id" value={form.driver_id} onChange={onChange}>
            <option value="">Sin conductor asignado</option>
            {drivers.map((driver) => (
              <option key={driver.id} value={driver.id}>
                {driver.name} - {driver.license}
              </option>
            ))}
          </select>
          {reading("driver_name")}
        </div>
        <div className={fieldClass("vehicle_plate")}>
          <label htmlFor="vehicle_id">Vehiculo</label>
          {/* Keyed on the vehicle id, not the plate: a corrected plate must not
              break the manifests already pointing at that truck. */}
          <select
            id="vehicle_id"
            name="vehicle_id"
            value={form.vehicle_id}
            onChange={onChange}
            required
          >
            <option value="">Selecciona un vehiculo</option>
            {vehicles.map((vehicle) => (
              <option key={vehicle.id} value={vehicle.id}>
                {vehicle.plate} - {vehicle.model}
              </option>
            ))}
          </select>
          {/* Nada se crea solo: si la placa leida no esta en la flota, lo
              decimos y la persona elige. Un camion inventado por un error de
              lectura es basura que alguien tendra que borrar despues. */}
          {unmatchedPlate ? (
            <p className="hint hint-warning">
              La placa <strong>{unmatchedPlate}</strong> no esta registrada. Elige el vehiculo
              o registralo primero en Vehiculos.
            </p>
          ) : (
            reading("vehicle_plate")
          )}
        </div>
      </div>

      <div className="owner-inline-fields">
        <div className={fieldClass("freight_value")}>
          <label htmlFor="freight_value">Valor del flete</label>
          <MoneyInput id="freight_value" name="freight_value" value={form.freight_value} onChange={onChange} />
          {reading("freight_value")}
        </div>
        <div className="field">
          <label htmlFor="currency">Moneda</label>
          {/* Bloqueada en COP por ahora. El manifiesto del RNDC es un documento
              colombiano y no imprime moneda: sus cifras son pesos siempre, asi
              que ofrecer un selector solo permitia equivocarse.

              La lista sigue completa en el backend y el valor viaja igual en el
              payload, asi que volver a habilitarlo es quitar `disabled`. Y si se
              esta editando un viaje antiguo en otra moneda, se muestra la suya
              en vez de reescribirsela. */}
          <select
            id="currency"
            name="currency"
            value={form.currency || "COP"}
            onChange={onChange}
            disabled
            required
          >
            {CURRENCIES.map((code) => (
              <option key={code} value={code}>{code}</option>
            ))}
          </select>
          <p className="hint">
            Por ahora todos los viajes se registran en COP. Gastos y pagos deben usar
            esta misma moneda.
          </p>
        </div>
      </div>

      <div className={fieldClass("company_name")}>
        <label htmlFor="company_id">Empresa generadora</label>
        <select id="company_id" name="company_id" value={form.company_id} onChange={onChange}>
          <option value="">Sin empresa asignada</option>
          {companies.map((company) => (
            <option key={company.id} value={company.id}>
              {company.name}
              {company.tax_id ? ` - ${company.tax_id}` : ""}
            </option>
          ))}
        </select>
        {readings && !form.company_id && readings.company_name?.value ? (
          <p className="hint hint-warning">
            El manifiesto nombra a <strong>{readings.company_name.value}</strong>
            {readings.company_tax_id?.value ? ` (NIT ${readings.company_tax_id.value})` : ""}, que
            no esta en tu lista. Creala en Empresas o deja el viaje sin empresa.
          </p>
        ) : (
          <p className="hint">Quien genera la carga. Se administra en la pantalla Empresas.</p>
        )}
      </div>

      <div className={fieldClass("cargo_description")}>
        <label htmlFor="cargo_description">Descripcion de carga</label>
        <input id="cargo_description" name="cargo_description" value={form.cargo_description} onChange={onChange} />
        {reading("cargo_description")}
      </div>

      <div className="field">
        <label htmlFor="status_id">Estado</label>
        <select id="status_id" name="status_id" value={form.status_id} onChange={onChange} required={isEditing}>
          <option value="">{isEditing ? "Selecciona un estado" : "Estado por defecto"}</option>
          {manifestStatuses.map((manifestStatus) => (
            <option key={manifestStatus.id} value={manifestStatus.id}>
              {manifestStatus.label}
            </option>
          ))}
        </select>
      </div>
    </>
  );
}
