import Button from "../Button";
import MoneyInput from "../MoneyInput";
import ModalBackdrop from "../ModalBackdrop";
import PlaceAutocomplete from "../PlaceAutocomplete";

// Mirrors SUPPORTED_CURRENCIES in the backend config. The app records the currency
// of every amount; it does not convert between them.
const CURRENCIES = ["COP", "USD", "VES", "PEN", "BRL"];

export default function ManifestFormModal({
  onFieldChange,
  previewKm = null,
  isOpen,
  form,
  vehicles,
  drivers,
  manifestStatuses,
  onChange,
  onSubmit,
  onClose,
  isEditing = false,
}) {
  if (!isOpen) return null;

  return (
    <ModalBackdrop onClick={onClose}>
      <section
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-label={isEditing ? "Editar manifiesto" : "Crear manifiesto"}
        onClick={(event) => event.stopPropagation()}
      >
        <h3>{isEditing ? "Editar manifiesto" : "Nuevo manifiesto"}</h3>
        <form className="owner-form" onSubmit={onSubmit}>
          <div className="field">
            <label htmlFor="manifest_number">Numero de manifiesto</label>
            <input
              id="manifest_number"
              name="manifest_number"
              value={form.manifest_number}
              onChange={onChange}
              required
            />
          </div>

          <div className="owner-inline-fields">
            <PlaceAutocomplete
              id="origin"
              label="Origen"
              required
              value={form.origin}
              placeId={form.origin_place_id}
              onTextChange={(text) => onFieldChange("origin", text)}
              onPlaceChange={(placeId) => onFieldChange("origin_place_id", placeId)}
            />
            <PlaceAutocomplete
              id="destination"
              label="Destino"
              required
              value={form.destination}
              placeId={form.destination_place_id}
              onTextChange={(text) => onFieldChange("destination", text)}
              onPlaceChange={(placeId) => onFieldChange("destination_place_id", placeId)}
            />
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
            <div className="field">
              <label htmlFor="departure_date">Fecha salida</label>
              <input
                id="departure_date"
                name="departure_date"
                type="date"
                value={form.departure_date}
                onChange={onChange}
                required
              />
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
            </div>
          </div>

          <div className="owner-inline-fields">
            <div className="field">
              <label htmlFor="driver_id">Conductor</label>
              <select id="driver_id" name="driver_id" value={form.driver_id} onChange={onChange}>
                <option value="">Sin conductor asignado</option>
                {drivers.map((driver) => (
                  <option key={driver.id} value={driver.id}>
                    {driver.name} - {driver.license}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
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
            </div>
          </div>

          <div className="owner-inline-fields">
            <div className="field">
              <label htmlFor="freight_value">Valor del flete</label>
              <MoneyInput id="freight_value" name="freight_value" value={form.freight_value} onChange={onChange} />
            </div>
            <div className="field">
              <label htmlFor="currency">Moneda</label>
              <select id="currency" name="currency" value={form.currency} onChange={onChange} required>
                {CURRENCIES.map((code) => (
                  <option key={code} value={code}>{code}</option>
                ))}
              </select>
              <p className="hint">Gastos y pagos del viaje deben usar esta misma moneda.</p>
            </div>
          </div>

          <div className="field">
            <label htmlFor="cargo_description">Descripcion de carga</label>
            <input id="cargo_description" name="cargo_description" value={form.cargo_description} onChange={onChange} />
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

          <div className="actions-row">
            <Button type="submit">{isEditing ? "Guardar cambios" : "Guardar manifiesto"}</Button>
            <Button type="button" variant="cancel" onClick={onClose}>
              Cancelar
            </Button>
          </div>
        </form>
      </section>
    </ModalBackdrop>
  );
}
