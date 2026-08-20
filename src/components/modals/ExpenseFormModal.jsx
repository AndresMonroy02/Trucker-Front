import Button from "../Button";
import MoneyInput from "../MoneyInput";

export default function ExpenseFormModal({
  isOpen,
  form,
  expenses,
  editingIndex,
  manifests,
  suppliers,
  expenseTypes,
  onChange,
  onSubmit,
  onClose,
  onAdd,
  onEdit,
  onRemove,
  onDelete,
  isEditingExisting = false,
  lockManifest = false,
}) {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <section
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-label="Registrar gasto"
        onClick={(event) => event.stopPropagation()}
      >
        <h3>{isEditingExisting || editingIndex !== null ? "Editar gasto" : "Nuevo gasto"}</h3>
        <form className="owner-form" onSubmit={onSubmit} noValidate>
          <div className="field">
            <label htmlFor="expense_manifest_id">Manifiesto</label>
            <select
              id="expense_manifest_id"
              name="manifest_id"
              value={form.manifest_id}
              onChange={onChange}
              disabled={lockManifest}
              required
            >
              <option value="">Selecciona un manifiesto</option>
              {manifests.map((manifest) => (
                <option key={manifest.id} value={manifest.id}>
                  {manifest.manifest_number} ({manifest.status?.label || "Sin estado"})
                </option>
              ))}
            </select>
          </div>

          <fieldset className="expense-entry">
            <legend>{editingIndex === null ? "Datos del gasto" : "Editando gasto"}</legend>
              <div className="field">
                <label htmlFor="supplier_id">Proveedor (opcional)</label>
                <select id="supplier_id" name="supplier_id" value={form.supplier_id} onChange={onChange}>
                  <option value="">Sin proveedor</option>
                  {suppliers.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
                  ))}
                </select>
              </div>
              <div className="owner-inline-fields">
                <div className="field">
                  <label htmlFor="expense_type">Tipo gasto</label>
                  <select id="expense_type" name="expense_type_id" value={form.expense_type_id} onChange={onChange} required>
                    <option value="">Selecciona un tipo</option>
                    {expenseTypes.map((expenseType) => (
                      <option key={expenseType.id} value={expenseType.id}>{expenseType.label}</option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="amount">Monto</label>
                  <MoneyInput id="amount" name="amount" value={form.amount} onChange={onChange} required />
                </div>
              </div>
              <div className="owner-inline-fields">
                <div className="field">
                  <label htmlFor="expense_date">Fecha gasto</label>
                  <input id="expense_date" name="expense_date" type="date" value={form.expense_date} onChange={onChange} required />
                </div>
                <div className="field">
                  <label htmlFor="payment_method">Metodo pago</label>
                  <input id="payment_method" name="payment_method" value={form.payment_method} onChange={onChange} />
                </div>
              </div>
              <div className="field">
                <label htmlFor="description">Descripcion</label>
                <input id="description" name="description" value={form.description} onChange={onChange} required />
              </div>
              <div className="owner-inline-fields">
                <div className="field">
                  <label htmlFor="reference_code">Codigo referencia</label>
                  <input id="reference_code" name="reference_code" value={form.reference_code} onChange={onChange} />
                </div>
                <div className="field">
                  <label htmlFor="location">Ubicacion</label>
                  <input id="location" name="location" value={form.location} onChange={onChange} />
                </div>
              </div>
              <div className="field">
                <label htmlFor="notes">Notas</label>
                <input id="notes" name="notes" value={form.notes} onChange={onChange} />
              </div>
              <label className="owner-checkbox">
                <input name="is_paid" type="checkbox" checked={form.is_paid} onChange={onChange} />
                Gasto pagado
              </label>
          </fieldset>

          {!isEditingExisting && expenses.length > 0 && (
            <div className="expense-list">
              <div className="expense-list-header">
                <strong>Gastos por guardar ({expenses.length})</strong>
              </div>
              {expenses.map((expense, index) => (
                <div className="expense-list-item" key={index}>
                  <div>
                    <strong>{expense.description}</strong>
                    <span>{expenseTypes.find((type) => type.id === Number(expense.expense_type_id))?.label || "Tipo sin seleccionar"}</span>
                    <span>{expense.amount ? `$ ${expense.amount}` : "Sin monto"} | {expense.expense_date || "Sin fecha"}</span>
                  </div>
                  <div className="actions-row">
                    <Button type="button" onClick={() => onEdit(index)}>Editar</Button>
                    <Button type="button" variant="cancel" onClick={() => onRemove(index)}>Eliminar</Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="actions-row">
            {!isEditingExisting && <Button type="button" onClick={onAdd}>{editingIndex === null ? "Agregar gasto a la lista" : "Actualizar gasto"}</Button>}
            <Button type="submit">{isEditingExisting ? "Guardar cambios" : "Guardar gastos"}</Button>
            {isEditingExisting && onDelete && (
              <Button type="button" variant="cancel" onClick={onDelete}>
                Eliminar
              </Button>
            )}
            <Button type="button" variant="cancel" onClick={onClose}>
              Cancelar
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}
