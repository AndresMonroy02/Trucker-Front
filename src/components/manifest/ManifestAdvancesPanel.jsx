import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { createAdvance, deleteAdvance, fetchAdvances, getErrorMessage } from "../../api";
import { formatDate, formatMoney } from "../../utils/format";
import Button from "../Button";
import AdvanceFormModal from "../modals/AdvanceFormModal";
import ConfirmModal from "../modals/ConfirmModal";
import TablePagination from "../TablePagination";

const PAGE_SIZE = 5;

function emptyForm(driverId, manifestId) {
  return {
    driver_id: driverId ? String(driverId) : "",
    manifest_id: manifestId ? String(manifestId) : "",
    kind: "advance",
    amount: "",
    advance_date: new Date().toISOString().slice(0, 10),
    payment_method_id: "",
    reference_code: "",
    notes: "",
  };
}

/** Cash handed to the driver for this trip, and whatever came back. */
export default function ManifestAdvancesPanel({ manifestId, manifest, paymentMethods, drivers, onChanged }) {
  const [advances, setAdvances] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState(() => emptyForm(null, null));
  const [deleteTarget, setDeleteTarget] = useState(null);

  const currency = manifest?.currency || "COP";
  const driverId = manifest?.driver_id;

  const loadAdvances = useCallback(async () => {
    if (!manifestId) return;
    try {
      const { data, headers } = await fetchAdvances({
        manifest_id: manifestId,
        page,
        page_size: PAGE_SIZE,
      });
      setAdvances(data);
      setTotal(Number(headers["x-total-count"] || data.length || 0));
    } catch (err) {
      toast.error(getErrorMessage(err, "No fue posible cargar los anticipos."));
    }
  }, [manifestId, page]);

  useEffect(() => {
    loadAdvances();
  }, [loadAdvances]);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function openModal(kind) {
    setForm({ ...emptyForm(driverId, manifestId), kind });
    setIsModalOpen(true);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!form.driver_id) {
      toast.error("Este manifiesto no tiene conductor asignado.");
      return;
    }
    if (!form.amount || Number(form.amount) <= 0) {
      toast.error("Ingresa un monto mayor a cero.");
      return;
    }
    if (!form.payment_method_id) {
      toast.error("Selecciona el metodo.");
      return;
    }

    try {
      await createAdvance({
        driver_id: Number(form.driver_id),
        manifest_id: Number(form.manifest_id),
        kind: form.kind,
        amount: Number(form.amount),
        currency,
        advance_date: form.advance_date,
        payment_method_id: Number(form.payment_method_id),
        reference_code: form.reference_code || null,
        notes: form.notes || null,
      });
      toast.success("Movimiento registrado correctamente.");
      setIsModalOpen(false);
      setPage(1);
      await loadAdvances();
      onChanged?.();
    } catch (err) {
      toast.error(getErrorMessage(err, "No fue posible registrar el movimiento."));
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      await deleteAdvance(deleteTarget);
      toast.success("Movimiento eliminado.");
      setDeleteTarget(null);
      await loadAdvances();
      onChanged?.();
    } catch (err) {
      toast.error(getErrorMessage(err, "No fue posible eliminar el movimiento."));
    }
  }

  const balance = Number(manifest?.driver_advance_balance || 0);

  return (
    <article className="panel owner-list-panel">
      <div className="owner-list-header">
        <div>
          <h3>Anticipos del conductor</h3>
          <p className="hint">
            {driverId
              ? `Saldo del viaje: ${formatMoney(balance, currency)}${balance > 0 ? " (el conductor te debe)" : ""}`
              : "Asigna un conductor al manifiesto para registrar anticipos."}
          </p>
        </div>
        {driverId ? (
          <div className="owner-row-actions">
            <Button type="button" onClick={() => openModal("advance")}>Entregar anticipo</Button>
            <Button type="button" variant="secondary" onClick={() => openModal("return")}>
              Registrar devolucion
            </Button>
          </div>
        ) : null}
      </div>

      <div className="owner-table-wrap">
        <table className="owner-table owner-table-tight">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Movimiento</th>
              <th>Metodo</th>
              <th>Monto</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {advances.map((advance) => (
              <tr key={advance.id}>
                <td>{formatDate(advance.advance_date)}</td>
                <td>
                  <span className={`status-badge ${advance.kind === "advance" ? "status-pending" : "status-active"}`}>
                    {advance.kind === "advance" ? "Entregado" : "Devuelto"}
                  </span>
                </td>
                <td>{advance.payment_method?.label || "-"}</td>
                <td>{formatMoney(advance.amount, advance.currency)}</td>
                <td>
                  <div className="owner-row-actions">
                    <Button type="button" variant="cancel" onClick={() => setDeleteTarget(advance.id)}>
                      Eliminar
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {advances.length === 0 ? (
              <tr>
                <td colSpan={5}>Sin anticipos registrados para este viaje.</td>
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
        itemLabel="movimientos"
      />

      <AdvanceFormModal
        isOpen={isModalOpen}
        form={form}
        paymentMethods={paymentMethods}
        drivers={drivers}
        currency={currency}
        lockDriver
        lockManifest
        onChange={handleChange}
        onSubmit={handleSubmit}
        onClose={() => setIsModalOpen(false)}
      />

      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        title="Eliminar movimiento"
        message="Seguro que quieres eliminarlo? El saldo del conductor se recalcula."
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </article>
  );
}
