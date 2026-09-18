import Button from "../Button";
import ModalBackdrop from "../ModalBackdrop";
import ManifestFields from "../manifest/ManifestFields";

export default function ManifestFormModal({
  onFieldChange,
  previewKm = null,
  isOpen,
  form,
  vehicles,
  drivers,
  companies = [],
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
          {/* Los mismos campos que usa el modal de revision. Una sola copia. */}
          <ManifestFields
            form={form}
            vehicles={vehicles}
            drivers={drivers}
            companies={companies}
            manifestStatuses={manifestStatuses}
            onChange={onChange}
            onFieldChange={onFieldChange}
            previewKm={previewKm}
            isEditing={isEditing}
          />

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
