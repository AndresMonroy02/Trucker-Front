import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import {
  api,
  createAdvance,
  createManifestPayment,
  deleteAdvance,
  fetchAdvanceBalances,
  fetchAdvances,
  fetchPaymentMethods,
  fetchReceivables,
  getErrorMessage,
} from "../../api";
import Button from "../../components/Button";
import DashboardShell from "../../components/DashboardShell";
import AdvanceFormModal from "../../components/modals/AdvanceFormModal";
import ConfirmModal from "../../components/modals/ConfirmModal";
import PaymentFormModal from "../../components/modals/PaymentFormModal";
import TablePagination from "../../components/TablePagination";
import { formatDate, formatMoney } from "../../utils/format";

const PAGE_SIZE = 8;
const CURRENCY = "COP";

function emptyPaymentForm() {
  return {
    amount: "",
    payment_date: new Date().toISOString().slice(0, 10),
    payment_method_id: "",
    payer_name: "",
    reference_code: "",
    notes: "",
  };
}

function emptyAdvanceForm() {
  return {
    driver_id: "",
    manifest_id: "",
    kind: "advance",
    amount: "",
    advance_date: new Date().toISOString().slice(0, 10),
    payment_method_id: "",
    reference_code: "",
    notes: "",
  };
}

/** How overdue a receivable is, using the same badge vocabulary as the rest of the app. */
function agingBadgeClass(days) {
  if (days > 60) return "status-cancelled";
  if (days > 30) return "status-maintenance";
  if (days > 15) return "status-in-transit";
  return "status-pending";
}

export default function OwnerFinancePage({ token, me, onLogout, theme, onToggleTheme }) {
  const navigate = useNavigate();

  const [receivables, setReceivables] = useState([]);
  const [receivablesTotal, setReceivablesTotal] = useState(0);
  const [receivablesPage, setReceivablesPage] = useState(1);

  const [balances, setBalances] = useState([]);

  const [advances, setAdvances] = useState([]);
  const [advancesTotal, setAdvancesTotal] = useState(0);
  const [advancesPage, setAdvancesPage] = useState(1);
  const [driverFilter, setDriverFilter] = useState("");

  const [drivers, setDrivers] = useState([]);
  const [manifests, setManifests] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState(emptyAdvanceForm);
  const [deleteTarget, setDeleteTarget] = useState(null);

  /* The receivable row being paid. Payments are registered from this table
     directly -- a trip drops off the list the moment it is settled, so sending
     the owner to the detail page just to type one amount was a detour. */
  const [paymentTarget, setPaymentTarget] = useState(null);
  const [paymentForm, setPaymentForm] = useState(emptyPaymentForm);

  const loadReceivables = useCallback(async () => {
    try {
      const { data, headers } = await fetchReceivables({
        page: receivablesPage,
        page_size: PAGE_SIZE,
        currency: CURRENCY,
      });
      // Paying off the last trip on a page empties it; step back rather than
      // leaving the owner staring at "Mostrando 0-0" with no way forward.
      if (data.length === 0 && receivablesPage > 1) {
        setReceivablesPage((prev) => prev - 1);
        return;
      }
      setReceivables(data);
      setReceivablesTotal(Number(headers["x-total-count"] || data.length || 0));
    } catch (err) {
      toast.error(getErrorMessage(err, "No fue posible cargar la cartera."));
    }
  }, [receivablesPage]);

  const loadBalances = useCallback(async () => {
    try {
      const { data } = await fetchAdvanceBalances({ currency: CURRENCY });
      setBalances(data);
    } catch (err) {
      toast.error(getErrorMessage(err, "No fue posible cargar los saldos de conductores."));
    }
  }, []);

  const loadAdvances = useCallback(async () => {
    try {
      const { data, headers } = await fetchAdvances({
        page: advancesPage,
        page_size: PAGE_SIZE,
        driver_id: driverFilter || undefined,
      });
      setAdvances(data);
      setAdvancesTotal(Number(headers["x-total-count"] || data.length || 0));
    } catch (err) {
      toast.error(getErrorMessage(err, "No fue posible cargar los anticipos."));
    }
  }, [advancesPage, driverFilter]);

  useEffect(() => {
    loadReceivables();
  }, [loadReceivables]);

  useEffect(() => {
    loadBalances();
  }, [loadBalances]);

  useEffect(() => {
    loadAdvances();
  }, [loadAdvances]);

  useEffect(() => {
    async function loadOptions() {
      try {
        const [driverResponse, manifestResponse, methodResponse] = await Promise.all([
          api.get("/owner/drivers", { params: { page: 1, page_size: 100 } }),
          api.get("/owner/manifests", { params: { status: "all", page: 1, page_size: 100 } }),
          fetchPaymentMethods(),
        ]);
        setDrivers(driverResponse.data);
        setManifests(manifestResponse.data);
        setPaymentMethods(methodResponse.data);
      } catch (err) {
        toast.error(getErrorMessage(err, "No fue posible cargar los datos del formulario."));
      }
    }
    loadOptions();
  }, []);

  const totalReceivable = useMemo(
    () => receivables.reduce((sum, item) => sum + Number(item.balance_due || 0), 0),
    [receivables],
  );
  const totalOwedByDrivers = useMemo(
    () => balances.reduce((sum, item) => sum + Math.max(Number(item.balance || 0), 0), 0),
    [balances],
  );

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function openModal() {
    setForm(emptyAdvanceForm());
    setIsModalOpen(true);
  }

  function handlePaymentChange(event) {
    const { name, value } = event.target;
    setPaymentForm((prev) => ({ ...prev, [name]: value }));
  }

  function openPaymentModal(receivable) {
    setPaymentForm(emptyPaymentForm());
    setPaymentTarget(receivable);
  }

  async function handlePaymentSubmit(event) {
    event.preventDefault();
    if (!paymentTarget) return;

    if (!paymentForm.amount || Number(paymentForm.amount) <= 0) {
      toast.error("Ingresa un monto mayor a cero.");
      return;
    }
    if (!paymentForm.payment_method_id) {
      toast.error("Selecciona el metodo de pago.");
      return;
    }

    try {
      await createManifestPayment(paymentTarget.manifest_id, {
        amount: Number(paymentForm.amount),
        currency: paymentTarget.currency || CURRENCY,
        payment_date: paymentForm.payment_date,
        payment_method_id: Number(paymentForm.payment_method_id),
        payer_name: paymentForm.payer_name || null,
        reference_code: paymentForm.reference_code || null,
        notes: paymentForm.notes || null,
      });
      toast.success("Pago registrado correctamente.");
      setPaymentTarget(null);
      await loadReceivables();
    } catch (err) {
      toast.error(getErrorMessage(err, "No fue posible registrar el pago."));
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!form.driver_id) {
      toast.error("Selecciona un conductor.");
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
        manifest_id: form.manifest_id ? Number(form.manifest_id) : null,
        kind: form.kind,
        amount: Number(form.amount),
        currency: CURRENCY,
        advance_date: form.advance_date,
        payment_method_id: Number(form.payment_method_id),
        reference_code: form.reference_code || null,
        notes: form.notes || null,
      });
      toast.success("Movimiento registrado correctamente.");
      setIsModalOpen(false);
      setAdvancesPage(1);
      await Promise.all([loadAdvances(), loadBalances()]);
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
      await Promise.all([loadAdvances(), loadBalances()]);
    } catch (err) {
      toast.error(getErrorMessage(err, "No fue posible eliminar el movimiento."));
    }
  }

  return (
    <DashboardShell
      me={me}
      onLogout={onLogout}
      theme={theme}
      onToggleTheme={onToggleTheme}
      title="Cartera y anticipos"
      subtitle="Lo que te deben los clientes y lo que te deben los conductores"
    >
      <section className="owner-kpi-grid">
        <article className="kpi-card">
          <p className="kpi-label">Por cobrar (esta pagina)</p>
          <p className="kpi-value kpi-negative">{formatMoney(totalReceivable, CURRENCY)}</p>
          <p className="kpi-hint">Fletes entregados sin pagar del todo</p>
        </article>

        <article className="kpi-card">
          <p className="kpi-label">Anticipos sin liquidar</p>
          <p className="kpi-value">{formatMoney(totalOwedByDrivers, CURRENCY)}</p>
          <p className="kpi-hint">Efectivo que los conductores aun tienen</p>
        </article>

        <article className="kpi-card">
          <p className="kpi-label">Viajes con saldo</p>
          <p className="kpi-value">{receivablesTotal}</p>
          <p className="kpi-hint">Manifiestos con cobro pendiente</p>
        </article>
      </section>

      <section className="panel owner-list-panel">
        <div className="owner-list-header">
          <div>
            <h3>Cartera por cobrar</h3>
            <p className="hint">Ordenada del viaje mas antiguo al mas reciente</p>
          </div>
        </div>

        <div className="owner-table-wrap">
          <table className="owner-table">
            <thead>
              <tr>
                <th>Manifiesto</th>
                <th>Ruta</th>
                <th>Salida</th>
                <th>Dias</th>
                <th>Flete</th>
                <th>Cobrado</th>
                <th>Saldo</th>
                <th>Ultimo pago</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {receivables.map((item) => (
                <tr key={item.manifest_id}>
                  <td>
                    <button
                      type="button"
                      className="table-link"
                      onClick={() => navigate(`/dashboard/owner/routes/${item.manifest_id}`)}
                    >
                      {item.manifest_number}
                    </button>
                  </td>
                  <td>{item.origin} - {item.destination}</td>
                  <td>{formatDate(item.departure_date)}</td>
                  <td>
                    <span className={`status-badge ${agingBadgeClass(item.days_outstanding)}`}>
                      {item.days_outstanding} dias
                    </span>
                  </td>
                  <td>{formatMoney(item.freight_value, item.currency)}</td>
                  <td>{formatMoney(item.total_paid, item.currency)}</td>
                  <td className="kpi-negative">{formatMoney(item.balance_due, item.currency)}</td>
                  <td>{item.last_payment_date ? formatDate(item.last_payment_date) : "Sin pagos"}</td>
                  <td>
                    <div className="owner-row-actions">
                      <Button type="button" variant="secondary" onClick={() => openPaymentModal(item)}>
                        Registrar pago
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {receivables.length === 0 ? (
                <tr>
                  <td colSpan={9}>No tienes cartera pendiente. Todos los fletes estan cobrados.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <TablePagination
          page={receivablesPage}
          totalItems={receivablesTotal}
          pageSize={PAGE_SIZE}
          onPageChange={setReceivablesPage}
          itemLabel="viajes"
        />
      </section>

      <section className="panel owner-list-panel">
        <div className="owner-list-header">
          <div>
            <h3>Saldos de conductores</h3>
            <p className="hint">Entregado menos gastado con anticipo menos devuelto</p>
          </div>
        </div>

        <div className="owner-table-wrap">
          <table className="owner-table owner-table-tight">
            <thead>
              <tr>
                <th>Conductor</th>
                <th>Entregado</th>
                <th>Gastado</th>
                <th>Devuelto</th>
                <th>Saldo</th>
              </tr>
            </thead>
            <tbody>
              {balances.map((balance) => (
                <tr key={balance.driver_id}>
                  <td>
                    {balance.driver_name}
                    {balance.is_deleted ? (
                      <span className="status-badge status-badge-inline status-cancelled" title="Conductor eliminado con saldo pendiente">
                        Eliminado
                      </span>
                    ) : null}
                  </td>
                  <td>{formatMoney(balance.total_given, balance.currency)}</td>
                  <td>{formatMoney(balance.total_spent_from_advance, balance.currency)}</td>
                  <td>{formatMoney(balance.total_returned, balance.currency)}</td>
                  <td className={Number(balance.balance || 0) > 0 ? "kpi-negative" : "kpi-positive"}>
                    {formatMoney(balance.balance, balance.currency)}
                  </td>
                </tr>
              ))}
              {balances.length === 0 ? (
                <tr>
                  <td colSpan={5}>Todavia no tienes conductores registrados.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel owner-list-panel">
        <div className="owner-list-header">
          <div>
            <h3>Movimientos de anticipos</h3>
            <p className="hint">Entregas y devoluciones de efectivo</p>
          </div>
          <Button type="button" onClick={openModal}>Registrar movimiento</Button>
        </div>

        <div className="owner-filters-row">
          <div className="field">
            <label htmlFor="filter_advance_driver">Conductor</label>
            <select
              id="filter_advance_driver"
              value={driverFilter}
              onChange={(event) => {
                setDriverFilter(event.target.value);
                setAdvancesPage(1);
              }}
            >
              <option value="">Todos</option>
              {drivers.map((driver) => (
                <option key={driver.id} value={driver.id}>{driver.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="owner-table-wrap">
          <table className="owner-table owner-table-tight">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Conductor</th>
                <th>Manifiesto</th>
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
                  <td>{advance.driver_name || "-"}</td>
                  <td>{advance.manifest_number || "General"}</td>
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
                  <td colSpan={7}>Sin movimientos registrados.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <TablePagination
          page={advancesPage}
          totalItems={advancesTotal}
          pageSize={PAGE_SIZE}
          onPageChange={setAdvancesPage}
          itemLabel="movimientos"
        />
      </section>

      <PaymentFormModal
        isOpen={Boolean(paymentTarget)}
        form={paymentForm}
        paymentMethods={paymentMethods}
        currency={paymentTarget?.currency || CURRENCY}
        title={paymentTarget ? `Registrar pago - ${paymentTarget.manifest_number}` : undefined}
        balanceDue={
          paymentTarget ? formatMoney(paymentTarget.balance_due, paymentTarget.currency) : null
        }
        onChange={handlePaymentChange}
        onSubmit={handlePaymentSubmit}
        onClose={() => setPaymentTarget(null)}
      />

      <AdvanceFormModal
        isOpen={isModalOpen}
        form={form}
        paymentMethods={paymentMethods}
        drivers={drivers}
        manifests={manifests}
        currency={CURRENCY}
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
    </DashboardShell>
  );
}
