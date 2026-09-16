import Button from "../Button";
import MoneyInput from "../MoneyInput";
import ModalBackdrop from "../ModalBackdrop";

export default function PaymentFormModal({
  isOpen,
  form,
  paymentMethods,
  currency,
  balanceDue,
  /* The cartera table opens this for a row, where the trip is not otherwise on
     screen, so it names the manifest in the heading. */
  title = "Registrar pago",
  onChange,
  onSubmit,
  onClose,
}) {
  if (!isOpen) return null;

  return (
    <ModalBackdrop onClick={onClose}>
      <section
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
      >
        <h3>{title}</h3>
        <p className="hint">
          Lo que el cliente pago del flete. Puedes registrar varios pagos y cada uno con su metodo.
        </p>

        <form className="owner-form" onSubmit={onSubmit}>
          <div className="owner-inline-fields">
            <div className="field">
              <label htmlFor="payment_amount">Monto ({currency})</label>
              <MoneyInput id="payment_amount" name="amount" value={form.amount} onChange={onChange} required />
              {balanceDue ? <p className="hint">Saldo pendiente: {balanceDue}</p> : null}
            </div>
            <div className="field">
              <label htmlFor="payment_date">Fecha del pago</label>
              <input
                id="payment_date"
                name="payment_date"
                type="date"
                value={form.payment_date}
                onChange={onChange}
                required
              />
            </div>
          </div>

          <div className="field">
            <label htmlFor="payment_method">Metodo de pago</label>
            <select
              id="payment_method"
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

          <div className="owner-inline-fields">
            <div className="field">
              <label htmlFor="payer_name">Quien pago</label>
              <input id="payer_name" name="payer_name" value={form.payer_name} onChange={onChange} />
            </div>
            <div className="field">
              <label htmlFor="payment_reference">Referencia</label>
              <input
                id="payment_reference"
                name="reference_code"
                value={form.reference_code}
                onChange={onChange}
                placeholder="Numero de transferencia"
              />
            </div>
          </div>

          <div className="field">
            <label htmlFor="payment_notes">Notas</label>
            <input id="payment_notes" name="notes" value={form.notes} onChange={onChange} />
          </div>

          <div className="actions-row">
            <Button type="submit">Guardar pago</Button>
            <Button type="button" variant="cancel" onClick={onClose}>Cancelar</Button>
          </div>
        </form>
      </section>
    </ModalBackdrop>
  );
}
