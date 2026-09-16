import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import {
  createManifestPayment,
  deleteManifestPayment,
  fetchManifestPayments,
  getErrorMessage,
} from "../../api";
import { formatDate, formatMoney } from "../../utils/format";
import Button from "../Button";
import ConfirmModal from "../modals/ConfirmModal";
import PaymentFormModal from "../modals/PaymentFormModal";
import TablePagination from "../TablePagination";

const PAGE_SIZE = 5;

function emptyForm() {
  return {
    amount: "",
    payment_date: new Date().toISOString().slice(0, 10),
    payment_method_id: "",
    payer_name: "",
    reference_code: "",
    notes: "",
  };
}

/**
 * What the client actually paid against this trip's freight.
 *
 * Owns its own fetching so the detail page does not grow another four pieces of
 * state; `onChanged` tells the page to refetch the trip totals.
 */
export default function ManifestPaymentsPanel({ manifestId, manifest, paymentMethods, onChanged }) {
  const [payments, setPayments] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const currency = manifest?.currency || "COP";

  const loadPayments = useCallback(async () => {
    if (!manifestId) return;
    try {
      const { data, headers } = await fetchManifestPayments(manifestId, { page, page_size: PAGE_SIZE });
      setPayments(data);
      setTotal(Number(headers["x-total-count"] || data.length || 0));
    } catch (err) {
      toast.error(getErrorMessage(err, "No fue posible cargar los pagos."));
    }
  }, [manifestId, page]);

  useEffect(() => {
    loadPayments();
  }, [loadPayments]);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function openModal() {
    setForm(emptyForm());
    setIsModalOpen(true);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!form.amount || Number(form.amount) <= 0) {
      toast.error("Ingresa un monto mayor a cero.");
      return;
    }
    if (!form.payment_method_id) {
      toast.error("Selecciona el metodo de pago.");
      return;
    }

    try {
      await createManifestPayment(manifestId, {
        amount: Number(form.amount),
        currency,
        payment_date: form.payment_date,
        payment_method_id: Number(form.payment_method_id),
        payer_name: form.payer_name || null,
        reference_code: form.reference_code || null,
        notes: form.notes || null,
      });
      toast.success("Pago registrado correctamente.");
      setIsModalOpen(false);
      setPage(1);
      await loadPayments();
      onChanged?.();
    } catch (err) {
      toast.error(getErrorMessage(err, "No fue posible registrar el pago."));
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      await deleteManifestPayment(deleteTarget);
      toast.success("Pago eliminado.");
      setDeleteTarget(null);
      await loadPayments();
      onChanged?.();
    } catch (err) {
      toast.error(getErrorMessage(err, "No fue posible eliminar el pago."));
    }
  }

  return (
    <article className="panel owner-list-panel">
      <div className="owner-list-header">
        <div>
          <h3>Pagos del cliente</h3>
          <p className="hint">
            Cobrado {formatMoney(manifest?.total_paid, currency)} de {formatMoney(manifest?.freight_value, currency)}
          </p>
        </div>
        <Button type="button" onClick={openModal}>Registrar pago</Button>
      </div>

      <div className="owner-table-wrap">
        <table className="owner-table owner-table-tight">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Metodo</th>
              <th>Quien pago</th>
              <th>Referencia</th>
              <th>Monto</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((payment) => (
              <tr key={payment.id}>
                <td>{formatDate(payment.payment_date)}</td>
                <td>{payment.payment_method?.label || "-"}</td>
                <td>{payment.payer_name || "-"}</td>
                <td>{payment.reference_code || "-"}</td>
                <td>{formatMoney(payment.amount, payment.currency)}</td>
                <td>
                  <div className="owner-row-actions">
                    <Button type="button" variant="cancel" onClick={() => setDeleteTarget(payment.id)}>
                      Eliminar
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {payments.length === 0 ? (
              <tr>
                <td colSpan={6}>Todavia no hay pagos registrados para este viaje.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <TablePagination
        page={page}
        totalItems={total}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        itemLabel="pagos"
      />

      <PaymentFormModal
        isOpen={isModalOpen}
        form={form}
        paymentMethods={paymentMethods}
        currency={currency}
        balanceDue={formatMoney(manifest?.balance_due, currency)}
        onChange={handleChange}
        onSubmit={handleSubmit}
        onClose={() => setIsModalOpen(false)}
      />

      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        title="Eliminar pago"
        message="Seguro que quieres eliminar este pago? El saldo del viaje se recalcula."
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </article>
  );
}
