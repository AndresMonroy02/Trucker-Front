import Button from "../Button";
import MoneyInput from "../MoneyInput";
import ModalBackdrop from "../ModalBackdrop";

export default function AdvanceFormModal({
  isOpen,
  form,
  paymentMethods,
  drivers = [],
  manifests = [],
  currency,
  lockDriver = false,
  lockManifest = false,
  onChange,
  onSubmit,
  onClose,
}) {
  if (!isOpen) return null;

  const isReturn = form.kind === "return";

  return (
    <ModalBackdrop onClick={onClose}>
      <section
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-label={isReturn ? "Registrar devolucion" : "Registrar anticipo"}
        onClick={(event) => event.stopPropagation()}
      >
        <h3>{isReturn ? "Registrar devolucion" : "Registrar anticipo"}</h3>
        <p className="hint">
          {isReturn
            ? "Efectivo que el conductor te devuelve. Baja el saldo que te debe."
            : "Efectivo que le entregas al conductor para el viaje. Sube el saldo que te debe."}
        </p>

        <form className="owner-form" onSubmit={onSubmit}>
          <div className="field">
            <label htmlFor="advance_kind">Movimiento</label>
            <select id="advance_kind" name="kind" value={form.kind} onChange={onChange} required>
              <option value="advance">Anticipo entregado</option>
              <option value="return">Devolucion del conductor</option>
            </select>
          </div>

          <div className="field">
            <label htmlFor="advance_driver">Conductor</label>
            <select
              id="advance_driver"
              name="driver_id"
              value={form.driver_id}
              onChange={onChange}
              disabled={lockDriver}
              required
            >
              <option value="">Selecciona un conductor</option>
              {drivers.map((driver) => (
                <option key={driver.id} value={driver.id}>
                  {driver.name} - {driver.license}
                </option>
              ))}
            </select>
          </div>

          {!lockManifest ? (
            <div className="field">
              <label htmlFor="advance_manifest">Manifiesto (opcional)</label>
              <select id="advance_manifest" name="manifest_id" value={form.manifest_id} onChange={onChange}>
                <option value="">Sin manifiesto (anticipo general)</option>
                {manifests.map((manifest) => (
                  <option key={manifest.id} value={manifest.id}>
                    {manifest.manifest_number} - {manifest.origin} a {manifest.destination}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          <div className="owner-inline-fields">
            <div className="field">
              <label htmlFor="advance_amount">Monto ({currency})</label>
              <MoneyInput id="advance_amount" name="amount" value={form.amount} onChange={onChange} required />
            </div>
            <div className="field">
              <label htmlFor="advance_date">Fecha</label>
              <input
                id="advance_date"
                name="advance_date"
                type="date"
                value={form.advance_date}
                onChange={onChange}
                required
              />
            </div>
          </div>

          <div className="owner-inline-fields">
            <div className="field">
              <label htmlFor="advance_method">Metodo</label>
              <select
                id="advance_method"
                name="payment_method_id"
                value={form.payment_method_id}
                onChange={onChange}
                required
              >
                <option value="">Selecciona un metodo</option>
                {paymentMethods.map((paymentMethod) => (
                  <option key={paymentMethod.id} value={paymentMethod.id}>
                    {paymentMethod.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="advance_reference">Referencia</label>
              <input
                id="advance_reference"
                name="reference_code"
                value={form.reference_code}
                onChange={onChange}
              />
            </div>
          </div>

          <div className="field">
            <label htmlFor="advance_notes">Notas</label>
            <input id="advance_notes" name="notes" value={form.notes} onChange={onChange} />
          </div>

          <div className="actions-row">
            <Button type="submit">Guardar movimiento</Button>
            <Button type="button" variant="cancel" onClick={onClose}>Cancelar</Button>
          </div>
        </form>
      </section>
    </ModalBackdrop>
  );
}
