import { useEffect, useState } from "react";
import { toast } from "sonner";

import { api, getErrorMessage } from "../../api";
import Button from "../Button";
import DocumentPaymentsPanel from "../documents/DocumentPaymentsPanel";
import ModalBackdrop from "../ModalBackdrop";
import MoneyInput from "../MoneyInput";

const INITIAL_PLAN = {
  total_amount: "",
  installments: "6",
  first_due_date: "",
  every_days: "",
  cadence: "monthly",
};

/**
 * The payment plan for one document.
 *
 * A SOAT or a poliza is usually financed, so the common case is not "enter six
 * cuotas" but "split this total into six" -- the generator is the primary action
 * and the table below it is the result.
 */
export default function DocumentPaymentsModal({
  isOpen,
  document,
  expenseTypes = [],
  canEdit,
  onClose,
  onChanged,
}) {
  const [payments, setPayments] = useState([]);
  const [summary, setSummary] = useState(null);
  const [plan, setPlan] = useState(INITIAL_PLAN);
  const [isPlanOpen, setIsPlanOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  // The cuota waiting to be confirmed as paid, and how it should be expensed.
  const [payTarget, setPayTarget] = useState(null);
  const [createExpense, setCreateExpense] = useState(true);
  const [expenseTypeId, setExpenseTypeId] = useState("");

  useEffect(() => {
    if (isOpen && document) load();
  }, [isOpen, document?.id]);

  async function load() {
    try {
      const [{ data: rows }, { data: detail }] = await Promise.all([
        api.get(`/owner/documents/${document.id}/payments`),
        api.get(`/owner/documents/${document.id}`),
      ]);
      setPayments(rows);
      setSummary(detail.payment_summary);
      setIsPlanOpen(rows.length === 0);
    } catch (err) {
      toast.error(getErrorMessage(err, "No fue posible cargar las cuotas."));
    }
  }

  async function refresh() {
    await load();
    // The row's summary and the alert panel both move when a cuota does.
    if (onChanged) await onChanged();
  }

  function handlePlanChange(event) {
    const { name, value } = event.target;
    setPlan((prev) => ({ ...prev, [name]: value }));
  }

  async function handleGenerate(event) {
    event.preventDefault();
    if (!plan.total_amount || !plan.first_due_date) {
      toast.error("Indica el valor total y la fecha de la primera cuota.");
      return;
    }

    const payload = {
      total_amount: plan.total_amount,
      installments: Number(plan.installments),
      first_due_date: plan.first_due_date,
      // Monthly is the default; every_days is the escape hatch for a plan that
      // is not monthly.
      every_days: plan.cadence === "days" ? Number(plan.every_days || 30) : null,
      replace_existing: payments.length > 0,
    };

    setIsSaving(true);
    try {
      await api.post(`/owner/documents/${document.id}/payments/plan`, payload);
      toast.success("Plan de pagos generado.");
      setPlan(INITIAL_PLAN);
      setIsPlanOpen(false);
      await refresh();
    } catch (err) {
      toast.error(getErrorMessage(err, "No fue posible generar el plan."));
    } finally {
      setIsSaving(false);
    }
  }

  function handleTogglePaid(payment) {
    // Unmarking needs no decision; marking paid may also record the cost, which
    // does.
    if (payment.paid_on) {
      savePayment(payment, { paid_on: null });
      return;
    }
    const seguros = expenseTypes.find((type) => type.code === "insurance");
    setExpenseTypeId(seguros ? String(seguros.id) : "");
    // Only offer to create it when this cuota has not already produced one.
    setCreateExpense(!payment.expense_id);
    setPayTarget(payment);
  }

  async function savePayment(payment, overrides) {
    try {
      await api.put(`/owner/document-payments/${payment.id}`, {
        amount: payment.amount,
        currency: payment.currency,
        due_date: payment.due_date,
        installment_number: payment.installment_number,
        paid_on: payment.paid_on,
        payment_method_id: payment.payment_method_id,
        reference_code: payment.reference_code,
        notes: payment.notes,
        ...overrides,
      });
      await refresh();
      return true;
    } catch (err) {
      toast.error(getErrorMessage(err, "No fue posible actualizar la cuota."));
      return false;
    }
  }

  async function confirmPaid(event) {
    event.preventDefault();
    const today = new Date().toISOString().slice(0, 10);
    const ok = await savePayment(payTarget, {
      paid_on: today,
      create_expense: createExpense,
      expense_type_id: createExpense && expenseTypeId ? Number(expenseTypeId) : null,
    });
    if (ok) {
      toast.success(
        createExpense ? "Cuota pagada y gasto registrado." : "Cuota marcada como pagada.",
      );
      setPayTarget(null);
    }
  }

  async function handleDelete(payment) {
    try {
      await api.delete(`/owner/document-payments/${payment.id}`);
      await refresh();
    } catch (err) {
      toast.error(getErrorMessage(err, "No fue posible eliminar la cuota."));
    }
  }

  if (!isOpen || !document) return null;

  return (
    <ModalBackdrop onClick={onClose}>
      <section
        className="modal-card modal-card-wide"
        role="dialog"
        aria-modal="true"
        aria-label="Plan de pagos del documento"
        onClick={(event) => event.stopPropagation()}
      >
        <h3>
          {document.document_type?.label} - {document.holder_label}
        </h3>
        <p className="hint">Cuotas del documento. Recibiras un aviso 7 dias antes de cada una.</p>

        {canEdit && (
          <div className="actions-row">
            <Button type="button" variant="secondary" onClick={() => setIsPlanOpen((open) => !open)}>
              {isPlanOpen ? "Cancelar" : payments.length ? "Rehacer plan" : "Generar plan"}
            </Button>
          </div>
        )}

        {canEdit && isPlanOpen && (
          <form className="owner-form document-plan-form" onSubmit={handleGenerate}>
            {payments.length > 0 && (
              <p className="hint">
                Generar un plan nuevo reemplaza las {payments.length} cuotas actuales.
              </p>
            )}

            <div className="owner-inline-fields">
              <div className="field">
                <label htmlFor="total_amount">Valor total</label>
                <MoneyInput
                  id="total_amount"
                  name="total_amount"
                  value={plan.total_amount}
                  onChange={handlePlanChange}
                />
              </div>
              <div className="field">
                <label htmlFor="installments">Numero de cuotas</label>
                <input
                  id="installments"
                  name="installments"
                  type="number"
                  min="1"
                  max="120"
                  value={plan.installments}
                  onChange={handlePlanChange}
                  required
                />
              </div>
            </div>

            <div className="owner-inline-fields">
              <div className="field">
                <label htmlFor="first_due_date">Primera cuota</label>
                <input
                  id="first_due_date"
                  name="first_due_date"
                  type="date"
                  value={plan.first_due_date}
                  onChange={handlePlanChange}
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="cadence">Frecuencia</label>
                <select id="cadence" name="cadence" value={plan.cadence} onChange={handlePlanChange}>
                  <option value="monthly">Mensual</option>
                  <option value="days">Cada N dias</option>
                </select>
              </div>
            </div>

            {plan.cadence === "days" && (
              <div className="field">
                <label htmlFor="every_days">Dias entre cuotas</label>
                <input
                  id="every_days"
                  name="every_days"
                  type="number"
                  min="1"
                  max="365"
                  value={plan.every_days}
                  onChange={handlePlanChange}
                  placeholder="30"
                />
              </div>
            )}

            <div className="actions-row">
              <Button type="submit" disabled={isSaving}>
                {isSaving ? "Generando..." : "Generar cuotas"}
              </Button>
            </div>
          </form>
        )}

        {payTarget && (
          <form className="owner-form document-plan-form" onSubmit={confirmPaid}>
            <h4>Marcar la cuota {payTarget.installment_number} como pagada</h4>

            {payTarget.expense_id ? (
              <p className="hint">
                Esta cuota ya tiene un gasto registrado. No se creara otro.
              </p>
            ) : (
              <>
                <label className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={createExpense}
                    onChange={(event) => setCreateExpense(event.target.checked)}
                  />
                  <span>Registrar tambien el gasto</span>
                </label>

                {/* The point of the whole feature: nobody should pay a cuota and
                    then type the same cost into Gastos by hand. */}
                <p className="hint">
                  Al marcar la cuota como pagada se registra el gasto automaticamente.
                  No es necesario crearlo de nuevo en Gastos.
                </p>

                {createExpense && (
                  <div className="field">
                    <label htmlFor="cuota_expense_type">Tipo de gasto</label>
                    <select
                      id="cuota_expense_type"
                      value={expenseTypeId}
                      onChange={(event) => setExpenseTypeId(event.target.value)}
                    >
                      <option value="">Seguros</option>
                      {expenseTypes.map((type) => (
                        <option key={type.id} value={type.id}>{type.label}</option>
                      ))}
                    </select>
                  </div>
                )}
              </>
            )}

            <div className="actions-row">
              <Button type="submit">Confirmar pago</Button>
              <Button type="button" variant="cancel" onClick={() => setPayTarget(null)}>
                Cancelar
              </Button>
            </div>
          </form>
        )}

        <DocumentPaymentsPanel
          payments={payments}
          summary={summary}
          canEdit={canEdit}
          onTogglePaid={handleTogglePaid}
          onDelete={handleDelete}
        />

        <div className="actions-row">
          <Button type="button" variant="cancel" onClick={onClose}>Cerrar</Button>
        </div>
      </section>
    </ModalBackdrop>
  );
}
