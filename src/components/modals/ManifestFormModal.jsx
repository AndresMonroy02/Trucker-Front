import Button from "../Button";

export default function ManifestFormModal({
  isOpen,
  form,
  vehicles,
  manifestStatuses,
  onChange,
  onSubmit,
  onClose,
}) {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <section
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-label="Crear manifiesto"
        onClick={(event) => event.stopPropagation()}
      >
        <h3>Nuevo manifiesto</h3>
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
            <div className="field">
              <label htmlFor="origin">Origen</label>
              <input id="origin" name="origin" value={form.origin} onChange={onChange} required />
            </div>
            <div className="field">
              <label htmlFor="destination">Destino</label>
              <input id="destination" name="destination" value={form.destination} onChange={onChange} required />
            </div>
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
              <label htmlFor="vehicle_plate">Vehiculo</label>
              <select
                id="vehicle_plate"
                name="vehicle_plate"
                value={form.vehicle_plate}
                onChange={onChange}
                required
              >
                <option value="">Selecciona un vehiculo</option>
                {vehicles.map((vehicle) => (
                  <option key={vehicle.plate} value={vehicle.plate}>
                    {vehicle.plate} - {vehicle.model}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="driver_name">Conductor</label>
              <input id="driver_name" name="driver_name" value={form.driver_name} onChange={onChange} />
            </div>
          </div>

          <div className="field">
            <label htmlFor="freight_value">Valor del flete</label>
            <input
              id="freight_value"
              name="freight_value"
              type="number"
              min="0"
              step="0.01"
              value={form.freight_value}
              onChange={onChange}
            />
          </div>

          <div className="field">
            <label htmlFor="cargo_description">Descripcion de carga</label>
            <input id="cargo_description" name="cargo_description" value={form.cargo_description} onChange={onChange} />
          </div>

          <div className="field">
            <label htmlFor="status_id">Estado</label>
            <select id="status_id" name="status_id" value={form.status_id} onChange={onChange}>
              <option value="">Estado por defecto</option>
              {manifestStatuses.map((manifestStatus) => (
                <option key={manifestStatus.id} value={manifestStatus.id}>
                  {manifestStatus.label}
                </option>
              ))}
            </select>
          </div>

          <label className="owner-checkbox">
            <input name="is_closed" type="checkbox" checked={form.is_closed} onChange={onChange} />
            Crear como ruta cerrada
          </label>

          <div className="actions-row">
            <Button type="submit">Guardar manifiesto</Button>
            <Button type="button" variant="cancel" onClick={onClose}>
              Cancelar
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}
