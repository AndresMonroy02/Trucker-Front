import Button from "../Button";
import ModalBackdrop from "../ModalBackdrop";

export default function VehicleFormModal({
  isOpen,
  form,
  vehicleStatuses,
  drivers,
  onChange,
  onSubmit,
  onClose,
  onDelete,
  isEditing = false,
}) {
  if (!isOpen) return null;

  return (
    <ModalBackdrop onClick={onClose}>
      <section
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-label={isEditing ? "Editar vehiculo" : "Crear nuevo vehiculo"}
        onClick={(event) => event.stopPropagation()}
      >
        <h3>{isEditing ? "Editar vehiculo" : "Nuevo vehiculo"}</h3>
        <form className="owner-form" onSubmit={onSubmit}>
          <div className="field">
            <label htmlFor="plate">Placa</label>
            {/* Editable now: the plate stopped being the primary key, so correcting
                a typo no longer means deleting the vehicle and its manifests. */}
            <input id="plate" name="plate" value={form.plate} onChange={onChange} required />
            {isEditing ? (
              <p className="hint">Corregir la placa conserva los manifiestos y gastos del vehiculo.</p>
            ) : null}
          </div>

          <div className="field">
            <label htmlFor="model">Modelo</label>
            <input id="model" name="model" value={form.model} onChange={onChange} required />
          </div>

          <div className="owner-inline-fields">
            <div className="field">
              <label htmlFor="year">Ano</label>
              <input id="year" name="year" value={form.year} onChange={onChange} required />
            </div>
            <div className="field">
              <label htmlFor="status">Estado</label>
              <select id="status" name="status_id" value={form.status_id} onChange={onChange} required>
                <option value="">Selecciona un estado</option>
                {vehicleStatuses.map((vehicleStatus) => (
                  <option key={vehicleStatus.id} value={vehicleStatus.id}>
                    {vehicleStatus.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

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

          <div className="actions-row">
            <Button type="submit">{isEditing ? "Guardar cambios" : "Guardar vehiculo"}</Button>
            {isEditing && onDelete && (
              <Button type="button" variant="cancel" onClick={onDelete}>
                Eliminar vehiculo
              </Button>
            )}
            <Button type="button" variant="cancel" onClick={onClose}>Cancelar</Button>
          </div>
        </form>
      </section>
    </ModalBackdrop>
  );
}