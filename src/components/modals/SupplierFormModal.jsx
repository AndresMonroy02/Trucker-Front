import Button from "../Button";

export default function SupplierFormModal({
  isOpen,
  form,
  supplierTypes,
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
        aria-label="Crear proveedor"
        onClick={(event) => event.stopPropagation()}
      >
        <h3>Nuevo proveedor</h3>
        <form className="owner-form" onSubmit={onSubmit}>
          <div className="owner-inline-fields">
            <div className="field">
              <label htmlFor="supplier_name">Nombre</label>
              <input id="supplier_name" name="name" value={form.name} onChange={onChange} required />
            </div>
            <div className="field">
              <label htmlFor="supplier_type_id">Tipo</label>
              <select id="supplier_type_id" name="supplier_type_id" value={form.supplier_type_id} onChange={onChange} required>
                <option value="">Selecciona un tipo</option>
                {supplierTypes.map((supplierType) => (
                  <option key={supplierType.id} value={supplierType.id}>
                    {supplierType.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="field">
            <label htmlFor="tax_id">NIT o identificacion</label>
            <input id="tax_id" name="tax_id" value={form.tax_id} onChange={onChange} />
          </div>

          <div className="owner-inline-fields">
            <div className="field">
              <label htmlFor="contact_name">Contacto</label>
              <input id="contact_name" name="contact_name" value={form.contact_name} onChange={onChange} />
            </div>
            <div className="field">
              <label htmlFor="contact_phone">Telefono</label>
              <input id="contact_phone" name="contact_phone" type="tel" value={form.contact_phone} onChange={onChange} />
            </div>
          </div>

          <div className="owner-inline-fields">
            <div className="field">
              <label htmlFor="contact_email">Correo electronico</label>
              <input id="contact_email" name="contact_email" type="email" value={form.contact_email} onChange={onChange} />
            </div>
            <div className="field">
              <label htmlFor="city">Ciudad</label>
              <input id="city" name="city" value={form.city} onChange={onChange} />
            </div>
          </div>

          <label className="owner-checkbox">
            <input name="is_active" type="checkbox" checked={form.is_active} onChange={onChange} />
            Proveedor activo
          </label>

          <div className="actions-row">
            <Button type="submit">Guardar proveedor</Button>
            <Button type="button" variant="cancel" onClick={onClose}>
              Cancelar
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}