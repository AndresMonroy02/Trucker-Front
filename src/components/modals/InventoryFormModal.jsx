import AttachmentField from "../AttachmentField";
import Button from "../Button";
import ModalBackdrop from "../ModalBackdrop";

export default function InventoryFormModal({
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
        aria-label={isEditing ? "Editar inventario" : "Nuevo inventario"}
        onClick={(event) => event.stopPropagation()}
      >
        <h3>{isEditing ? "Editar inventario" : "Nuevo inventario"}</h3>
        <form className="owner-form" onSubmit={onSubmit}>
          <div className="owner-inline-fields">
            <div className="field">
              <label htmlFor="inventory_vehicle_id">Vehiculo</label>
              <select
                id="inventory_vehicle_id"
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
              <label htmlFor="inventory_date">Fecha</label>
              <input
                id="inventory_date"
                type="date"
                name="inventory_date"
                value={form.inventory_date}
                onChange={onChange}
                required
              />
            </div>
          </div>

          <div className="field">
            <label htmlFor="inventory_name">Nombre</label>
            <input
              id="inventory_name"
              name="name"
              value={form.name}
              onChange={onChange}
              maxLength={140}
              required
            />
          </div>

          <div className="field">
            <label htmlFor="inventory_description">Descripcion</label>
            <textarea
              id="inventory_description"
              name="description"
              value={form.description}
              onChange={onChange}
              rows={3}
            />
          </div>

          <AttachmentField
            id="inventory_file"
            label="Foto del elemento"
            preview
            accept="image/jpeg,image/png,image/webp,image/heic"
            hint="JPG, PNG o WEBP, hasta 10 MB. Se imprime en el reporte de inventario."
            file={file}
            pendingFile={pendingFile}
            isUploading={isUploading}
            onFileChange={onFileChange}
            onRemoveFile={onRemoveFile}
            onClearPendingFile={onClearPendingFile}
            onPreviewFile={onPreviewFile}
          />

          <div className="actions-row">
            <Button type="submit">{isEditing ? "Guardar cambios" : "Guardar inventario"}</Button>
            {isEditing && onDelete && (
              <Button type="button" variant="cancel" onClick={onDelete}>
                Eliminar inventario
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
