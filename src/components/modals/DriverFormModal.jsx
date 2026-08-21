import Button from "../Button";

export default function DriverFormModal({
  isOpen,
  form,
  driverStatuses,
  driverAccounts = [],
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
        aria-label="Crear conductor"
        onClick={(event) => event.stopPropagation()}
      >
        <h3>Nuevo conductor</h3>
        <form className="owner-form" onSubmit={onSubmit}>
          <div className="field">
            <label htmlFor="driver_name">Nombre</label>
            <input id="driver_name" name="name" value={form.name} onChange={onChange} required />
          </div>

          <div className="owner-inline-fields">
            <div className="field">
              <label htmlFor="license">Licencia</label>
              <input id="license" name="license" value={form.license} onChange={onChange} required />
            </div>
            <div className="field">
              <label htmlFor="phone">Telefono</label>
              <input id="phone" name="phone" type="tel" value={form.phone} onChange={onChange} required />
            </div>
          </div>

          <div className="field">
            <label htmlFor="driver_status_id">Estado</label>
            <select id="driver_status_id" name="status_id" value={form.status_id} onChange={onChange} required>
              <option value="">Selecciona un estado</option>
              {driverStatuses.map((driverStatus) => (
                <option key={driverStatus.id} value={driverStatus.id}>
                  {driverStatus.label}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="driver_user_id">Cuenta de conductor (opcional)</label>
            <select id="driver_user_id" name="user_id" value={form.user_id} onChange={onChange}>
              <option value="">Sin cuenta asignada</option>
              {driverAccounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.username} ({account.email})
                </option>
              ))}
            </select>
          </div>

          <div className="actions-row">
            <Button type="submit">Guardar conductor</Button>
            <Button type="button" variant="cancel" onClick={onClose}>
              Cancelar
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}