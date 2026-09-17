import AttachmentField from "../AttachmentField";
import Button from "../Button";
import MoneyInput from "../MoneyInput";
import ModalBackdrop from "../ModalBackdrop";

// Mirrors SUPPORTED_CURRENCIES in the backend config. The app records the currency
// of every amount; it does not convert between them.
const CURRENCIES = ["COP", "USD", "VES", "PEN", "BRL"];

export default function MaintenanceFormModal({
  isOpen,
  form,
  vehicles,
  onChange,
  onSubmit,
  onClose,
  onDelete,
  isEditing = false,
  file = null,
  pendingFile = null,
  isUploading = false,
  onFileChange,
  onRemoveFile,
  onClearPendingFile,
  onPreviewFile,
}) {
  if (!isOpen) return null;

  return (
    <ModalBackdrop onClick={onClose}>
      <section
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-label={isEditing ? "Editar mantenimiento" : "Nuevo mantenimiento"}
        onClick={(event) => event.stopPropagation()}
      >
        <h3>{isEditing ? "Editar mantenimiento" : "Nuevo mantenimiento"}</h3>
        <form className="owner-form" onSubmit={onSubmit}>
          <div className="owner-inline-fields">
            <div className="field">
              <label htmlFor="maintenance_vehicle_id">Vehiculo</label>
              <select
                id="maintenance_vehicle_id"
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
            <div className="field">
              <label htmlFor="maintenance_date">Fecha</label>
              <input
                id="maintenance_date"
                type="date"
                name="maintenance_date"
                value={form.maintenance_date}
                onChange={onChange}
                required
              />
            </div>
          </div>

          <div className="field">
            <label htmlFor="maintenance_name">Nombre</label>
            <input
              id="maintenance_name"
              name="name"
              value={form.name}
              onChange={onChange}
              maxLength={140}
              required
            />
          </div>

          <div className="field">
            <label htmlFor="maintenance_description">Descripcion</label>
            <textarea
              id="maintenance_description"
              name="description"
              value={form.description}
              onChange={onChange}
              rows={3}
            />
          </div>

          <div className="owner-inline-fields">
            <div className="field">
              <label htmlFor="maintenance_amount">Monto</label>
              <MoneyInput
                id="maintenance_amount"
                name="amount"
                value={form.amount}
                onChange={onChange}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="maintenance_currency">Moneda</label>
              <select
                id="maintenance_currency"
                name="currency"
                value={form.currency}
                onChange={onChange}
                required
              >
                {CURRENCIES.map((code) => (
                  <option key={code} value={code}>{code}</option>
                ))}
              </select>
            </div>
          </div>

          <p className="hint">
            {isEditing
              ? "Al guardar tambien se actualiza el gasto que este mantenimiento genero."
              : "Al guardar se registra tambien como un gasto del vehiculo, visible en la pantalla de Gastos."}
          </p>

          <AttachmentField
            id="maintenance_file"
            label="Factura o foto"
            file={file}
            pendingFile={pendingFile}
            isUploading={isUploading}
            onFileChange={onFileChange}
            onRemoveFile={onRemoveFile}
            onClearPendingFile={onClearPendingFile}
            onPreviewFile={onPreviewFile}
          />

          <div className="actions-row">
            <Button type="submit">{isEditing ? "Guardar cambios" : "Guardar mantenimiento"}</Button>
            {isEditing && onDelete && (
              <Button type="button" variant="cancel" onClick={onDelete}>
                Eliminar mantenimiento
              </Button>
            )}
            <Button type="button" variant="cancel" onClick={onClose}>
              Cancelar
            </Button>
          </div>
        </form>
      </section>
    </ModalBackdrop>
  );
}
