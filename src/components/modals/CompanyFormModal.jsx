import Button from "../Button";
import ModalBackdrop from "../ModalBackdrop";

export default function CompanyFormModal({
  isOpen,
  form,
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
        aria-label={isEditing ? "Editar empresa" : "Crear empresa"}
        onClick={(event) => event.stopPropagation()}
      >
        <h3>{isEditing ? "Editar empresa" : "Nueva empresa"}</h3>
        <form className="owner-form" onSubmit={onSubmit}>
          <div className="owner-inline-fields">
            <div className="field">
              <label htmlFor="company_name">Nombre o razon social</label>
              <input id="company_name" name="name" value={form.name} onChange={onChange} required />
            </div>
            <div className="field">
              <label htmlFor="company_tax_id">NIT o identificacion</label>
              <input id="company_tax_id" name="tax_id" value={form.tax_id} onChange={onChange} />
              {/* Opcional a proposito: un generador puede ser una persona con
                  cedula, y el viaje se registra igual. */}
              <p className="hint">Opcional. Sirve para reconocer la empresa al leer un manifiesto.</p>
            </div>
          </div>

          <div className="owner-inline-fields">
            <div className="field">
              <label htmlFor="company_contact_name">Contacto</label>
              <input id="company_contact_name" name="contact_name" value={form.contact_name} onChange={onChange} />
            </div>
            <div className="field">
              <label htmlFor="company_contact_phone">Telefono</label>
              <input id="company_contact_phone" name="contact_phone" type="tel" value={form.contact_phone} onChange={onChange} />
            </div>
          </div>

          <div className="owner-inline-fields">
            <div className="field">
              <label htmlFor="company_contact_email">Correo electronico</label>
              <input id="company_contact_email" name="contact_email" type="email" value={form.contact_email} onChange={onChange} />
            </div>
            <div className="field">
              <label htmlFor="company_city">Ciudad</label>
              <input id="company_city" name="city" value={form.city} onChange={onChange} />
            </div>
          </div>

          <div className="field">
            <label htmlFor="company_notes">Notas</label>
            <input id="company_notes" name="notes" value={form.notes} onChange={onChange} />
          </div>

          <label className="owner-checkbox">
            <input name="is_active" type="checkbox" checked={form.is_active} onChange={onChange} />
            Empresa activa
          </label>

          <div className="actions-row">
            <Button type="submit">{isEditing ? "Guardar cambios" : "Guardar empresa"}</Button>
            {isEditing && onDelete && (
              <Button type="button" variant="cancel" onClick={onDelete}>
                Eliminar empresa
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
