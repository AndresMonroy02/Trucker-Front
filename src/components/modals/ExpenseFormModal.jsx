import Button from "../Button";
import MoneyInput from "../MoneyInput";
import ModalBackdrop from "../ModalBackdrop";

export default function ExpenseFormModal({
  isOpen,
  form,
  expenses,
  editingIndex,
  manifests,
  vehicles = [],
  suppliers,
  expenseTypes,
  paymentMethods = [],
  onChange,
  onSubmit,
  onClose,
  onAdd,
  onEdit,
  onRemove,
  onDelete,
  isEditingExisting = false,
  isNew = false,
  lockManifest = false,
}) {
  // Seguros is the type a poliza or SOAT cuota is recorded under, so it is the
  // one worth warning about being entered twice.
  const isInsuranceType = expenseTypes.some(
    (type) => String(type.id) === String(form.expense_type_id) && type.code === "insurance",
  );
  // No trip means no driver whose advance could have paid for it.
  const isGeneral = !form.manifest_id;

  if (!isOpen) return null;

  return (
    <ModalBackdrop onClick={onClose}>
      <section
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-label="Registrar gasto"
        onClick={(event) => event.stopPropagation()}
      >
        <h3>{isNew ? "Nuevo gasto" : isEditingExisting || editingIndex !== null ? "Editar gasto" : "Nuevo gasto"}</h3>
        <form className="owner-form" onSubmit={onSubmit} noValidate>
          <div className="field">
            <label htmlFor="expense_manifest_id">Manifiesto</label>
            <select
              id="expense_manifest_id"
              name="manifest_id"
              value={form.manifest_id}
              onChange={onChange}
              disabled={lockManifest}
            >
              {/* Optional now: tyres, a workshop bill or the office rent belong to
                  no trip. Choosing this reveals the vehicle picker instead. */}
              <option value="">Sin manifiesto - gasto general</option>
              {manifests.map((manifest) => (
                <option key={manifest.id} value={manifest.id}>
                  {manifest.manifest_number} ({manifest.status?.label || "Sin estado"})
                </option>
              ))}
            </select>
          </div>

          {/* A trip expense takes its truck from the trip, so the two are never
              offered together -- which is also what the check constraint says. */}
          {!form.manifest_id && (
            <div className="field">
              <label htmlFor="expense_vehicle_id">Vehiculo (opcional)</label>
              <select id="expense_vehicle_id" name="vehicle_id" value={form.vehicle_id} onChange={onChange}>
                <option value="">Sin vehiculo - gasto de la empresa</option>
                {vehicles.map((vehicle) => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {vehicle.plate} - {vehicle.model}
                  </option>
                ))}
              </select>
              <p className="hint">
                Un gasto general no afecta el margen de ningun viaje. Se reporta aparte
                en el panel, y por vehiculo cuando indicas uno.
              </p>
            </div>
          )}

          {/* The duplicate nobody can detect for you: a cuota already recorded by
              the documents screen, typed in again here. */}
          {isInsuranceType && !form.document_payment_id && (
            <p className="hint hint-warning">
              Las cuotas de polizas y SOAT ya generan su gasto al marcarse como pagadas
              en Documentos. Revisa que no lo estes registrando dos veces.
            </p>
          )}

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
                  <label htmlFor="payment_method_id">Metodo pago</label>
                  <select
                    id="payment_method_id"
                    name="payment_method_id"
                    value={form.payment_method_id}
                    onChange={onChange}
                  >
                    <option value="">Sin especificar</option>
                    {paymentMethods.map((paymentMethod) => (
                      <option key={paymentMethod.id} value={paymentMethod.id}>
                        {paymentMethod.label}
                      </option>
                    ))}
                  </select>
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
              {/* An anticipo is cash handed to a driver FOR A TRIP, and the balance
                  that settles it reaches the driver through the manifest. With no
                  trip there is no driver to credit, so the flag would settle
                  nothing while the row went on claiming it did. The API refuses
                  the same combination. */}
              <label className={`owner-checkbox ${isGeneral ? "is-disabled" : ""}`}>
                <input
                  name="paid_from_advance"
                  type="checkbox"
                  checked={form.paid_from_advance && !isGeneral}
                  onChange={onChange}
                  disabled={isGeneral}
                />
                Pagado con anticipo del conductor
              </label>
              <p className="hint">
                {isGeneral
                  ? "Solo aplica a gastos de un manifiesto: el anticipo se descuenta del saldo del conductor del viaje."
                  : "Marca esta casilla solo si el conductor lo pago con el dinero que le entregaste. Descuenta del saldo que te debe."}
              </p>
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
            <Button type="submit">{isNew ? "Guardar gasto" : isEditingExisting ? "Guardar cambios" : "Guardar gastos"}</Button>
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
    </ModalBackdrop>
  );
}
