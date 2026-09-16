import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { api, getErrorMessage } from "../../api";
import { IfCanEdit, useAccess } from "../../access";
import Button from "../../components/Button";
import DashboardShell from "../../components/DashboardShell";
import ConfirmModal from "../../components/modals/ConfirmModal";
import DocumentFormModal from "../../components/modals/DocumentFormModal";
import DocumentPaymentsModal from "../../components/modals/DocumentPaymentsModal";
import DocumentPreviewModal from "../../components/modals/DocumentPreviewModal";
import TablePagination from "../../components/TablePagination";
import { formatDate, formatMoney } from "../../utils/format";

const INITIAL_FORM = {
  holder_kind: "vehicle",
  vehicle_id: "",
  driver_id: "",
  document_type_id: "",
  expires_on: "",
  issued_on: "",
  number: "",
  issuer: "",
  notes: "",
};

const PAGE_SIZE = 10;

const STATE_CLASS = {
  vencido: "status-expired",
  por_vencer: "status-expiring",
  vigente: "status-valid",
};

/**
 * The same day, one year on.
 *
 * Date arithmetic, not 365 days: a SOAT expedido 29 February 2028 expires 28
 * February 2029, and adding 365 days would land a day out across a leap year.
 */
function oneYearOn(isoDate) {
  const [year, month, day] = isoDate.split("-").map(Number);
  if (!year || !month || !day) return "";
  const next = new Date(year + 1, month - 1, day);
  // Rolls 29 Feb -> 1 Mar; step back to the last valid day of the month instead.
  if (next.getMonth() !== month - 1) next.setDate(0);
  return [
    next.getFullYear(),
    String(next.getMonth() + 1).padStart(2, "0"),
    String(next.getDate()).padStart(2, "0"),
  ].join("-");
}

/** "Vence en 5 dias" says more than "Por vencer"; the number is what people act on. */
function statePhrase(document) {
  const days = document.days_left;
  if (days < 0) return days === -1 ? "Vencio ayer" : `Vencio hace ${-days} dias`;
  if (days === 0) return "Vence hoy";
  if (days === 1) return "Vence manana";
  return `Vence en ${days} dias`;
}

/** "3/6 pagadas" plus the next date -- enough to tell a settled plan from a live one. */
function PlanCell({ summary }) {
  if (!summary) return <span className="hint">-</span>;

  const settled = summary.paid_count === summary.installments;
  return (
    <div className="document-plan-cell">
      <span className={summary.overdue_count ? "kpi-negative" : undefined}>
        {summary.paid_count}/{summary.installments} pagadas
      </span>
      {!settled && summary.next_due_date && (
        <span className="hint">Proxima {formatDate(summary.next_due_date)}</span>
      )}
      {summary.overdue_count > 0 && (
        <span className="status-badge status-expired">
          {summary.overdue_count} vencida{summary.overdue_count === 1 ? "" : "s"}
        </span>
      )}
    </div>
  );
}

export default function OwnerDocumentsPage({ token, me, onLogout, theme, onToggleTheme }) {
  const access = useAccess();
  const canEdit = access.canEdit("documents");

  const [documents, setDocuments] = useState([]);
  const [totalDocuments, setTotalDocuments] = useState(0);
  const [alerts, setAlerts] = useState({ alert_days: 30, expired_count: 0, expiring_count: 0, items: [] });
  const [documentTypes, setDocumentTypes] = useState([]);
  const [expenseTypes, setExpenseTypes] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDocumentId, setEditingDocumentId] = useState(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const [currentPage, setCurrentPage] = useState(1);
  const [stateFilter, setStateFilter] = useState("all");
  const [holderFilter, setHolderFilter] = useState("all");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [paymentsTarget, setPaymentsTarget] = useState(null);
  const [editingFile, setEditingFile] = useState(null);
  // Chosen before the document exists; uploaded the moment it does.
  const [pendingFile, setPendingFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  // The expiry this page filled in itself. Only a value it put there may be
  // overwritten when the issue date changes -- never one somebody typed.
  const [autoExpiry, setAutoExpiry] = useState("");
  // The document whose scan is being previewed, with freshly signed links.
  const [previewTarget, setPreviewTarget] = useState(null);

  const totalPages = Math.max(1, Math.ceil(totalDocuments / PAGE_SIZE));

  useEffect(() => {
    fetchDocuments(currentPage, stateFilter, holderFilter);
  }, [currentPage, stateFilter, holderFilter]);

  useEffect(() => {
    fetchAlerts();
    fetchDocumentTypes();
    fetchExpenseTypes();
    fetchVehicles();
    fetchDrivers();
  }, []);

  const alertSummary = useMemo(() => {
    const {
      expired_count: expired,
      expiring_count: expiring,
      payments_overdue_count: cuotasVencidas = 0,
      payments_due_count: cuotasPorPagar = 0,
    } = alerts;
    const parts = [];
    if (expired) parts.push(`${expired} vencido${expired === 1 ? "" : "s"}`);
    if (expiring) parts.push(`${expiring} por vencer`);
    if (cuotasVencidas) {
      parts.push(`${cuotasVencidas} cuota${cuotasVencidas === 1 ? "" : "s"} vencida${cuotasVencidas === 1 ? "" : "s"}`);
    }
    if (cuotasPorPagar) {
      parts.push(`${cuotasPorPagar} cuota${cuotasPorPagar === 1 ? "" : "s"} por pagar`);
    }
    if (parts.length === 0) return null;
    if (parts.length === 1) return parts[0];
    return `${parts.slice(0, -1).join(", ")} y ${parts[parts.length - 1]}`;
  }, [alerts]);

  const isCritical = alerts.expired_count > 0 || alerts.payments_overdue_count > 0;

  async function fetchDocuments(page, state, holder) {
    try {
      const { data, headers } = await api.get("/owner/documents", {
        params: { page, page_size: PAGE_SIZE, state, holder },
      });
      setDocuments(data);
      setTotalDocuments(Number(headers["x-total-count"] || data.length));
    } catch (err) {
      toast.error(getErrorMessage(err, "No fue posible cargar los documentos."));
    }
  }

  async function fetchAlerts() {
    try {
      const { data } = await api.get("/owner/documents/alerts");
      setAlerts(data);
    } catch (err) {
      toast.error(getErrorMessage(err, "No fue posible cargar las alertas."));
    }
  }

  async function fetchDocumentTypes() {
    try {
      const { data } = await api.get("/owner/document-types");
      setDocumentTypes(data);
    } catch (err) {
      toast.error(getErrorMessage(err, "No fue posible cargar los tipos de documento."));
    }
  }

  async function fetchExpenseTypes() {
    try {
      const { data } = await api.get("/owner/expense-types");
      setExpenseTypes(data);
    } catch {
      // Only used to preselect "Seguros" when expensing a cuota; the API falls
      // back to that code on its own, so the screen still works without it.
      setExpenseTypes([]);
    }
  }

  async function fetchVehicles() {
    try {
      const { data } = await api.get("/owner/vehicles", { params: { page: 1, page_size: 100 } });
      setVehicles(data);
    } catch (err) {
      toast.error(getErrorMessage(err, "No fue posible cargar los vehiculos."));
    }
  }

  async function fetchDrivers() {
    try {
      const { data } = await api.get("/owner/active-drivers");
      setDrivers(data);
    } catch (err) {
      toast.error(getErrorMessage(err, "No fue posible cargar los conductores."));
    }
  }

  async function refresh() {
    await Promise.all([fetchDocuments(currentPage, stateFilter, holderFilter), fetchAlerts()]);
  }

  function handlePageChange(nextPage) {
    setCurrentPage(Math.min(Math.max(nextPage, 1), totalPages));
  }

  function openModal() {
    setForm(INITIAL_FORM);
    setEditingDocumentId(null);
    setEditingFile(null);
    setPendingFile(null);
    setAutoExpiry("");
    setIsModalOpen(true);
  }

  /** Renewing pre-fills the holder and type, then asks only for the new expiry. */
  function openRenewModal(document) {
    setForm({
      ...INITIAL_FORM,
      holder_kind: document.holder_kind,
      vehicle_id: document.vehicle_id ? String(document.vehicle_id) : "",
      driver_id: document.driver_id ? String(document.driver_id) : "",
      document_type_id: String(document.document_type_id),
      issuer: document.issuer || "",
    });
    setEditingDocumentId(null);
    setEditingFile(null);
    setPendingFile(null);
    setAutoExpiry("");
    setIsModalOpen(true);
  }

  function openEditModal(document) {
    setForm({
      holder_kind: document.holder_kind,
      vehicle_id: document.vehicle_id ? String(document.vehicle_id) : "",
      driver_id: document.driver_id ? String(document.driver_id) : "",
      document_type_id: String(document.document_type_id),
      expires_on: document.expires_on || "",
      issued_on: document.issued_on || "",
      number: document.number || "",
      issuer: document.issuer || "",
      notes: document.notes || "",
    });
    setEditingDocumentId(document.id);
    setEditingFile(null);
    setPendingFile(null);
    setAutoExpiry("");
    setIsModalOpen(true);
    // The signed download link is minted per read, so it comes from the detail
    // endpoint rather than the list.
    loadFile(document.id);
  }

  /** Signed links expire in minutes, so they are minted on open, not reused. */
  async function openPreview(document) {
    try {
      const { data } = await api.get(`/owner/documents/${document.id}`);
      if (!data.file) {
        toast.error("Este documento ya no tiene archivo adjunto.");
        await refresh();
        return;
      }
      setPreviewTarget({ document: data, file: data.file });
    } catch (err) {
      toast.error(getErrorMessage(err, "No fue posible abrir el archivo."));
    }
  }

  async function loadFile(documentId) {
    try {
      const { data } = await api.get(`/owner/documents/${documentId}`);
      setEditingFile(data.file);
    } catch {
      // The form still works without it; only the attachment row is missing.
      setEditingFile(null);
    }
  }

  async function handleFileChange(event) {
    const [selected] = event.target.files || [];
    // Clear the input either way, so re-picking the same file fires onChange again.
    event.target.value = "";
    if (!selected) return;

    // No document yet: hold it and send it the moment one exists.
    if (!editingDocumentId) {
      setPendingFile(selected);
      return;
    }
    await uploadFile(editingDocumentId, selected);
  }

  async function uploadFile(documentId, selected) {
    const payload = new FormData();
    payload.append("file", selected);
    setIsUploading(true);
    try {
      const { data } = await api.post(`/owner/documents/${documentId}/file`, payload, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setEditingFile(data);
      setPendingFile(null);
      return true;
    } catch (err) {
      toast.error(getErrorMessage(err, "No fue posible adjuntar el archivo."));
      return false;
    } finally {
      setIsUploading(false);
    }
  }

  async function handleRemoveFile() {
    if (!editingDocumentId) return;
    try {
      await api.delete(`/owner/documents/${editingDocumentId}/file`);
      setEditingFile(null);
      toast.success("Archivo eliminado.");
      await refresh();
    } catch (err) {
      toast.error(getErrorMessage(err, "No fue posible eliminar el archivo."));
    }
  }

  function closeModal() {
    setIsModalOpen(false);
    setEditingDocumentId(null);
    setEditingFile(null);
    setPendingFile(null);
    setAutoExpiry("");
  }

  function handleInputChange(event) {
    const { name, value } = event.target;
    setForm((prev) => {
      const next = { ...prev, [name]: value };
      // Switching holder invalidates both the chosen holder and the type, which
      // only applies to the other kind.
      if (name === "holder_kind") {
        next.vehicle_id = "";
        next.driver_id = "";
        next.document_type_id = "";
      }
      // A SOAT, a tecnomecanica and most polizas run a year from the day they
      // were issued, so propose that -- but only over an empty field or over a
      // date this page proposed before. Never over one somebody typed.
      if (name === "issued_on" && value) {
        if (!prev.expires_on || prev.expires_on === autoExpiry) {
          const proposed = oneYearOn(value);
          next.expires_on = proposed;
          setAutoExpiry(proposed);
        }
      }
      return next;
    });
  }

  function clearFilters() {
    setStateFilter("all");
    setHolderFilter("all");
    setCurrentPage(1);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const isVehicle = form.holder_kind === "vehicle";
    const holderId = isVehicle ? form.vehicle_id : form.driver_id;
    if (!holderId) {
      toast.error(isVehicle ? "Selecciona un vehiculo." : "Selecciona un conductor.");
      return;
    }
    if (!form.document_type_id) {
      toast.error("Selecciona un tipo de documento.");
      return;
    }

    const payload = {
      document_type_id: Number(form.document_type_id),
      vehicle_id: isVehicle ? Number(form.vehicle_id) : null,
      driver_id: isVehicle ? null : Number(form.driver_id),
      expires_on: form.expires_on,
      issued_on: form.issued_on || null,
      number: form.number || null,
      issuer: form.issuer || null,
      notes: form.notes || null,
    };

    try {
      if (editingDocumentId) {
        await api.put(`/owner/documents/${editingDocumentId}`, payload);
        toast.success("Documento actualizado correctamente.");
      } else {
        const { data: created } = await api.post("/owner/documents", payload);
        setCurrentPage(1);

        // The document exists either way. If the upload then fails the row is
        // still there and keeps the staged file, so the modal stays open for a
        // retry rather than the file vanishing without a word.
        if (pendingFile) {
          const uploaded = await uploadFile(created.id, pendingFile);
          if (!uploaded) {
            setEditingDocumentId(created.id);
            await refresh();
            toast.error("El documento se guardo, pero el archivo no. Intenta adjuntarlo de nuevo.");
            return;
          }
        }
        toast.success(
          pendingFile
            ? "Documento y archivo guardados correctamente."
            : "Documento registrado correctamente.",
        );
      }
      closeModal();
      await refresh();
    } catch (err) {
      toast.error(getErrorMessage(err, "No fue posible guardar el documento."));
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      await api.delete(`/owner/documents/${deleteTarget}`);
      toast.success("Documento eliminado correctamente.");
      setDeleteTarget(null);
      closeModal();
      await refresh();
    } catch (err) {
      toast.error(getErrorMessage(err, "No fue posible eliminar el documento."));
    }
  }

  return (
    <DashboardShell
      me={me}
      onLogout={onLogout}
      theme={theme}
      onToggleTheme={onToggleTheme}
      title="Documentos"
      subtitle="SOAT, tecnomecanica, polizas y licencias, con aviso antes de que venzan"
    >
      {alertSummary && (
        <section className={`panel document-alert-panel ${isCritical ? "is-critical" : "is-warning"}`}>
          <div className="owner-list-header">
            <div>
              <h3>{alertSummary}</h3>
              <p className="hint">
                {alerts.expired_count > 0
                  ? "Un vehiculo con documentos vencidos no puede circular legalmente."
                  : alerts.payments_overdue_count > 0
                  ? "Una cuota vencida puede llevar a que la aseguradora cancele la poliza."
                  : `Documentos y cuotas de los proximos ${alerts.alert_days} dias.`}
              </p>
            </div>
          </div>

          <ul className="document-alert-list">
            {alerts.items.map((document) => (
              <li key={document.id}>
                <span className={`status-badge ${STATE_CLASS[document.state]}`}>
                  {document.state_label}
                </span>
                <strong>{document.document_type?.label}</strong>
                <span>{document.holder_label || "-"}</span>
                <span className="hint">{statePhrase(document)}</span>
                {document.payment_summary?.next_due_date && (
                  <span className="hint">
                    Cuota {formatMoney(
                      document.payment_summary.next_due_amount,
                      document.payment_summary.currency,
                    )} vence {formatDate(document.payment_summary.next_due_date)}
                  </span>
                )}
                <IfCanEdit screen="documents">
                  <button type="button" className="table-action-button" onClick={() => openRenewModal(document)}>
                    Renovar
                  </button>
                </IfCanEdit>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="panel owner-list-panel">
        <div className="owner-list-header">
          <div>
            <h3>Documentos registrados</h3>
            <p className="hint">
              Renovar es registrar un documento nuevo: el anterior queda como historial.
            </p>
          </div>
          <IfCanEdit screen="documents">
            <Button onClick={openModal}>Registrar documento</Button>
          </IfCanEdit>
        </div>

        <div className="owner-filters-row">
          <div className="field">
            <label htmlFor="document_state_filter">Estado</label>
            <select
              id="document_state_filter"
              value={stateFilter}
              onChange={(event) => { setStateFilter(event.target.value); setCurrentPage(1); }}
            >
              <option value="all">Todos</option>
              <option value="alerta">Requieren atencion</option>
              <option value="vencido">Vencidos</option>
              <option value="por_vencer">Por vencer</option>
              <option value="vigente">Vigentes</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="document_holder_filter">Pertenece a</label>
            <select
              id="document_holder_filter"
              value={holderFilter}
              onChange={(event) => { setHolderFilter(event.target.value); setCurrentPage(1); }}
            >
              <option value="all">Todos</option>
              <option value="vehicle">Vehiculos</option>
              <option value="driver">Conductores</option>
            </select>
          </div>
          <Button type="button" variant="secondary" onClick={clearFilters}>
            Limpiar filtros
          </Button>
        </div>

        <div className="owner-table-wrap">
          <table className="owner-table">
            <thead>
              <tr>
                <th>Documento</th>
                <th>Vehiculo / conductor</th>
                <th>Numero</th>
                <th>Vence</th>
                <th>Estado</th>
                <th>Cuotas</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {documents.length === 0 && (
                <tr>
                  <td colSpan={7} className="hint">
                    No hay documentos para los filtros seleccionados.
                  </td>
                </tr>
              )}
              {documents.map((document) => (
                <tr key={document.id} className={document.is_current ? "" : "is-superseded"}>
                  <td>
                    {document.document_type?.label}
                    {document.file && (
                      <span className="document-file-marker" title={document.file.name}>
                        {/* A marker, not a control: the action lives in Acciones
                            with the others, where people look for it. */}
                        &#128206;
                      </span>
                    )}
                    {!document.is_current && <span className="hint"> (historial)</span>}
                  </td>
                  <td>{document.holder_label || "-"}</td>
                  <td>{document.number || "-"}</td>
                  <td>{formatDate(document.expires_on)}</td>
                  <td>
                    {document.is_current ? (
                      <span className={`status-badge ${STATE_CLASS[document.state]}`}>
                        {statePhrase(document)}
                      </span>
                    ) : (
                      <span className="hint">Reemplazado</span>
                    )}
                  </td>
                  <td>
                    <PlanCell summary={document.payment_summary} />
                  </td>
                  <td>
                    <button
                      type="button"
                      className="table-action-button"
                      onClick={() => setPaymentsTarget(document)}
                    >
                      Cuotas
                    </button>
                    {canEdit && (
                      <button type="button" className="table-action-button" onClick={() => openEditModal(document)}>
                        Editar
                      </button>
                    )}
                    {canEdit && document.is_current && (
                      <button type="button" className="table-action-button" onClick={() => openRenewModal(document)}>
                        Renovar
                      </button>
                    )}
                    {/* Last, and only on rows that carry one. */}
                    {document.file && (
                      <button
                        type="button"
                        className="table-action-button"
                        onClick={() => openPreview(document)}
                      >
                        Ver archivo
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <TablePagination
          page={currentPage}
          totalItems={totalDocuments}
          pageSize={PAGE_SIZE}
          onPageChange={handlePageChange}
          itemLabel="documentos"
        />
      </section>

      <DocumentFormModal
        isOpen={isModalOpen}
        form={form}
        documentTypes={documentTypes}
        vehicles={vehicles}
        drivers={drivers}
        onChange={handleInputChange}
        onSubmit={handleSubmit}
        onClose={closeModal}
        isEditing={Boolean(editingDocumentId)}
        onDelete={editingDocumentId ? () => setDeleteTarget(editingDocumentId) : undefined}
        file={editingFile}
        pendingFile={pendingFile}
        isUploading={isUploading}
        onFileChange={handleFileChange}
        onRemoveFile={editingFile ? handleRemoveFile : undefined}
        onClearPendingFile={pendingFile ? () => setPendingFile(null) : undefined}
        onPreviewFile={editingFile ? () => setPreviewTarget({
          document: documents.find((item) => item.id === editingDocumentId),
          file: editingFile,
        }) : undefined}
      />

      <DocumentPreviewModal
        isOpen={Boolean(previewTarget)}
        document={previewTarget?.document}
        file={previewTarget?.file}
        onClose={() => setPreviewTarget(null)}
      />

      <DocumentPaymentsModal
        isOpen={Boolean(paymentsTarget)}
        document={paymentsTarget}
        expenseTypes={expenseTypes}
        canEdit={canEdit}
        onClose={() => setPaymentsTarget(null)}
        onChanged={refresh}
      />

      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        title="Eliminar documento"
        message="Esta seguro de eliminar este documento? Dejara de aparecer en las alertas."
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </DashboardShell>
  );
}
