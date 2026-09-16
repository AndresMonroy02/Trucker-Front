import { formatDate, formatMoney } from "../../utils/format";

const STATE_CLASS = {
  vencida: "status-expired",
  por_pagar: "status-expiring",
  pagada: "status-valid",
  programada: "status-neutral",
};

/** "en 5 dias" is what makes somebody act; "Por pagar" is just a category. */
function whenPhrase(payment) {
  if (payment.paid_on) return `Pagada el ${formatDate(payment.paid_on)}`;
  const days = payment.days_left;
  if (days < 0) return days === -1 ? "Vencio ayer" : `Vencio hace ${-days} dias`;
  if (days === 0) return "Vence hoy";
  if (days === 1) return "Vence manana";
  return `Vence en ${days} dias`;
}

/**
 * The cuota table for one document.
 *
 * Presentational: it renders what it is given and calls back. The modal around it
 * owns the fetching, so this stays easy to read and to reuse if cuotas ever need
 * to appear somewhere else.
 */
export default function DocumentPaymentsPanel({
  payments,
  summary,
  canEdit,
  onTogglePaid,
  onDelete,
}) {
  if (payments.length === 0) {
    return (
      <p className="hint">
        Este documento no tiene plan de pagos. Genera uno para recibir aviso antes
        de cada cuota.
      </p>
    );
  }

  return (
    <>
      {summary && (
        <div className="document-plan-summary">
          <div>
            <span className="hint">Total</span>
            <strong>{formatMoney(summary.total_amount, summary.currency)}</strong>
          </div>
          <div>
            <span className="hint">Pagado</span>
            <strong>{formatMoney(summary.paid_amount, summary.currency)}</strong>
          </div>
          <div>
            <span className="hint">Saldo</span>
            <strong>{formatMoney(summary.balance, summary.currency)}</strong>
          </div>
          <div>
            <span className="hint">Cuotas</span>
            <strong>{summary.paid_count} de {summary.installments} pagadas</strong>
          </div>
        </div>
      )}

      <div className="owner-table-wrap">
        <table className="owner-table">
          <thead>
            <tr>
              <th>Cuota</th>
              <th>Monto</th>
              <th>Vence</th>
              <th>Estado</th>
              {canEdit && <th>Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {payments.map((payment) => (
              <tr key={payment.id}>
                <td>{payment.installment_number}</td>
                <td>{formatMoney(payment.amount, payment.currency)}</td>
                <td>{formatDate(payment.due_date)}</td>
                <td>
                  <span className={`status-badge ${STATE_CLASS[payment.state]}`}>
                    {whenPhrase(payment)}
                  </span>
                  {payment.expense_id && (
                    <span className="hint"> Gasto registrado</span>
                  )}
                </td>
                {canEdit && (
                  <td>
                    <button
                      type="button"
                      className="table-action-button"
                      onClick={() => onTogglePaid(payment)}
                    >
                      {payment.paid_on ? "Marcar pendiente" : "Marcar pagada"}
                    </button>
                    <button
                      type="button"
                      className="table-action-button"
                      onClick={() => onDelete(payment)}
                    >
                      Eliminar
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
