import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { api, deleteManifest, fetchPaymentMethods, getErrorMessage } from "../../api";
import Button from "../../components/Button";
import DashboardShell from "../../components/DashboardShell";
import ConfirmModal from "../../components/modals/ConfirmModal";
import ExpenseFormModal from "../../components/modals/ExpenseFormModal";
import ManifestFormModal from "../../components/modals/ManifestFormModal";
import ManifestScanReviewModal from "../../components/modals/ManifestScanReviewModal";
import TablePagination from "../../components/TablePagination";
import { formatDate, formatMoney, formatPercent } from "../../utils/format";

const EMPTY_MANIFEST_FORM = {
  manifest_number: "",
  origin: "",
  destination: "",
  departure_date: "",
  arrival_date: "",
  cargo_description: "",
  freight_value: "",
  currency: "COP",
  vehicle_id: "",
  driver_id: "",
  status_id: "",
  company_id: "",
  // These four travel with the rest because the PUT sends the whole object. Leave
  // one out and editing a trip blanks that column -- the update splats every key
  // it receives straight onto the row.
  origin_place_id: null,
  destination_place_id: null,
  distance_km: "",
  distance_source: null,
};

const EMPTY_MANIFEST_FILTERS = {
  dateFrom: "",
  dateTo: "",
  statusIds: [],
  vehicleId: "",
  driverId: "",
  includeDeleted: false,
};

const EMPTY_EXPENSE_FORM = {
  manifest_id: "",
  supplier_id: "",
  expense_type_id: "",
  description: "",
  amount: "",
  expense_date: "",
  payment_method_id: "",
  paid_from_advance: false,
  reference_code: "",
  location: "",
  is_paid: true,
  notes: "",
};

const MANIFEST_PAGE_SIZE = 8;

function getManifestStatusBadgeClass(code) {
  switch (code) {
    case "pending":
      return "status-pending";
    case "in_transit":
      return "status-in-transit";
    case "delivered":
      return "status-delivered";
    case "cancelled":
      return "status-cancelled";
    default:
      return "status-neutral";
  }
}

export default function OwnerRoutesPage({ token, me, onLogout, theme, onToggleTheme }) {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState("all");
  const [manifests, setManifests] = useState([]);
  const [totalManifests, setTotalManifests] = useState(0);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [expenseTypes, setExpenseTypes] = useState([]);
  const [manifestStatuses, setManifestStatuses] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [manifestModalOpen, setManifestModalOpen] = useState(false);
  // Cargar un manifiesto: el archivo se queda en memoria del navegador entre la
  // lectura y el guardado, para previsualizarlo y para adjuntarlo despues sin
  // pedirlo dos veces al usuario.
  const [scanFile, setScanFile] = useState(null);
  const [scanDraft, setScanDraft] = useState(null);
  const [scanModalOpen, setScanModalOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isSavingScan, setIsSavingScan] = useState(false);
  const [isRetryingScan, setIsRetryingScan] = useState(false);
  const scanInputRef = useRef(null);
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const statusDropdownRef = useRef(null);
  const [manifestForm, setManifestForm] = useState(EMPTY_MANIFEST_FORM);
  const [previewKm, setPreviewKm] = useState(null);
  const [editingManifestId, setEditingManifestId] = useState(null);
  const [manifestFilters, setManifestFilters] = useState(EMPTY_MANIFEST_FILTERS);
  const [expenseForm, setExpenseForm] = useState(EMPTY_EXPENSE_FORM);
  const [expenseForms, setExpenseForms] = useState([]);
  const [editingExpenseIndex, setEditingExpenseIndex] = useState(null);
  const [expenseManifestLocked, setExpenseManifestLocked] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [manifestDeleteTarget, setManifestDeleteTarget] = useState(null);
  const [currentManifestPage, setCurrentManifestPage] = useState(1);

  useEffect(() => {
    fetchManifests(statusFilter, currentManifestPage);
  }, [statusFilter, currentManifestPage, manifestFilters]);

  useEffect(() => {
    fetchSuppliers();
  }, []);

  useEffect(() => {
    fetchExpenseTypes();
  }, []);

  useEffect(() => {
    fetchManifestStatuses();
  }, []);

  useEffect(() => {
    fetchVehicles();
  }, []);

  useEffect(() => {
    fetchCompanies();
  }, []);

  useEffect(() => {
    fetchActiveDrivers();
  }, []);

  useEffect(() => {
    loadPaymentMethods();
  }, []);

  useEffect(() => {
    if (!statusDropdownOpen) return;

    function handlePointerDown(event) {
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target)) {
        setStatusDropdownOpen(false);
      }
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setStatusDropdownOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [statusDropdownOpen]);

  const safeManifestTotalPages = Math.max(1, Math.ceil(totalManifests / MANIFEST_PAGE_SIZE));

  const activeCount = useMemo(
    () => manifests.filter((item) => ["pending", "in_transit"].includes(item.status?.code)).length,
    [manifests],
  );
  const closedCount = useMemo(
    () => manifests.filter((item) => ["delivered", "cancelled"].includes(item.status?.code)).length,
    [manifests],
  );
  const paginatedManifests = useMemo(() => manifests, [manifests]);
  const selectedStatusLabels = useMemo(
    () =>
      manifestFilters.statusIds.length === 0
        ? ["Todos"]
        : manifestStatuses
            .filter((status) => manifestFilters.statusIds.includes(status.id))
            .map((status) => status.label),
    [manifestFilters.statusIds, manifestStatuses],
  );

  async function fetchManifests(status, page) {
    try {
      const { data, headers } = await api.get("/owner/manifests", {
        params: {
          status,
          page,
          page_size: MANIFEST_PAGE_SIZE,
          status_ids: manifestFilters.statusIds.length > 0 ? manifestFilters.statusIds : undefined,
          date_from: manifestFilters.dateFrom || undefined,
          date_to: manifestFilters.dateTo || undefined,
          vehicle_id: manifestFilters.vehicleId || undefined,
          driver_id: manifestFilters.driverId || undefined,
          include_deleted: manifestFilters.includeDeleted || undefined,
        },
        paramsSerializer: { indexes: null },
      });
      setManifests(data);
      setTotalManifests(Number(headers["x-total-count"] || data.length));
    } catch (err) {
      toast.error(getErrorMessage(err, "No fue posible cargar los manifiestos."));
    }
  }

  async function fetchSuppliers() {
    try {
      const { data } = await api.get("/owner/suppliers", {
        params: { page: 1, page_size: 100 },
      });
      setSuppliers(data);
    } catch (err) {
      toast.error(getErrorMessage(err, "No fue posible cargar proveedores."));
    }
  }

  async function loadPaymentMethods() {
    try {
      const { data } = await fetchPaymentMethods();
      setPaymentMethods(data);
    } catch (err) {
      toast.error(getErrorMessage(err, "No fue posible cargar los metodos de pago."));
    }
  }

  async function confirmDeleteManifest() {
    if (!manifestDeleteTarget) return;
    try {
      await deleteManifest(manifestDeleteTarget.id);
      toast.success("Manifiesto eliminado junto con sus gastos y pagos.");
      setManifestDeleteTarget(null);
      await fetchManifests(statusFilter, currentManifestPage);
    } catch (err) {
      toast.error(getErrorMessage(err, "No fue posible eliminar el manifiesto."));
    }
  }

  async function fetchCompanies() {
    try {
      const { data } = await api.get("/owner/companies", {
        params: { page: 1, page_size: 100, status: "active" },
      });
      setCompanies(data);
    } catch (err) {
      toast.error(getErrorMessage(err, "No fue posible cargar las empresas."));
    }
  }

  async function fetchVehicles() {
    try {
      const { data } = await api.get("/owner/vehicles", {
        params: { page: 1, page_size: 100 },
      });
      setVehicles(data);
    } catch (err) {
      toast.error(getErrorMessage(err, "No fue posible cargar vehiculos."));
    }
  }

  async function fetchActiveDrivers() {
    try {
      const { data } = await api.get("/owner/active-drivers");
      setDrivers(data);
    } catch (err) {
      toast.error(getErrorMessage(err, "No fue posible cargar los conductores activos."));
    }
  }

  async function fetchExpenseTypes() {
    try {
      const { data } = await api.get("/owner/expense-types");
      setExpenseTypes(data);
    } catch (err) {
      toast.error(getErrorMessage(err, "No fue posible cargar los tipos de gasto."));
    }
  }

  async function fetchManifestStatuses() {
    try {
      const { data } = await api.get("/owner/manifest-statuses");
      setManifestStatuses(data);
    } catch (err) {
      toast.error(getErrorMessage(err, "No fue posible cargar los estados de manifiesto."));
    }
  }

  function openManifestModal() {
    setManifestForm(EMPTY_MANIFEST_FORM);
    setEditingManifestId(null);
    setManifestModalOpen(true);
  }

  // ---------------------------------------------------------------------
  // Cargar un manifiesto: leerlo, revisarlo, y solo entonces guardarlo
  // ---------------------------------------------------------------------

  /**
   * El borrador que devolvio el lector, mapeado al formulario de siempre.
   *
   * Los ids resueltos entran donde el servidor encontro coincidencia; donde no,
   * el campo queda vacio y el modal lo resalta. Nada se inventa aqui.
   */
  function draftToForm(draft) {
    const read = (name) => draft[name]?.value ?? "";
    return {
      ...EMPTY_MANIFEST_FORM,
      manifest_number: read("manifest_number"),
      origin: read("origin"),
      destination: read("destination"),
      departure_date: read("departure_date"),
      cargo_description: read("cargo_description"),
      freight_value: read("freight_value"),
      currency: draft.currency || "COP",
      vehicle_id: draft.vehicle_id || "",
      driver_id: draft.driver_id || "",
      company_id: draft.company_id || "",
      // Enlazados solo si ya tenias el lugar. Si no, el texto queda escrito y el
      // autocompletado se encarga cuando la persona lo elija -- y a partir de
      // ahi todo manifiesto que lo nombre coincide solo.
      origin_place_id: draft.origin_place_id ?? null,
      destination_place_id: draft.destination_place_id ?? null,
      // La distancia NO se escribe en el campo: hacerlo la marcaria como puesta
      // a mano y el servidor respetaria ese numero en vez de calcularlo. Se
      // muestra aparte, igual que en el formulario de siempre.
      distance_km: "",
      distance_source: null,
    };
  }

  async function readManifestFile(selected, { forceOcr = false } = {}) {
    const payload = new FormData();
    payload.append("file", selected);
    try {
      const { data } = await api.post("/owner/manifests/extract", payload, {
        headers: { "Content-Type": "multipart/form-data" },
        params: forceOcr ? { force_ocr: true } : undefined,
      });
      setScanDraft(data);
      setManifestForm(draftToForm(data));
      setEditingManifestId(null);
      setScanModalOpen(true);
      return true;
    } catch (err) {
      toast.error(getErrorMessage(err, "No fue posible leer el manifiesto."));
      return false;
    }
  }

  async function handleScanFileChange(event) {
    const [selected] = event.target.files || [];
    // Permite volver a elegir el mismo archivo despues de cancelar.
    event.target.value = "";
    if (!selected) return;
    setScanFile(selected);
    setIsScanning(true);
    try {
      const ok = await readManifestFile(selected);
      if (!ok) setScanFile(null);
    } finally {
      setIsScanning(false);
    }
  }

  async function retryScanWithOcr() {
    if (!scanFile) return;
    setIsRetryingScan(true);
    try {
      await readManifestFile(scanFile, { forceOcr: true });
    } finally {
      setIsRetryingScan(false);
    }
  }

  function closeScanModal() {
    setScanModalOpen(false);
    setScanDraft(null);
    setScanFile(null);
  }

  /**
   * Guardar lo revisado: crear el viaje y adjuntarle el documento.
   *
   * Si el adjunto falla, el manifiesto YA existe. Se deja el modal abierto y se
   * dice lo que paso, en vez de fingir que no se guardo nada -- es el mismo
   * manejo que hace la pantalla de Documentos.
   */
  async function submitScannedManifest(event) {
    event.preventDefault();
    setIsSavingScan(true);
    try {
      const created = await createManifestFromForm();
      if (!created) return;
      if (scanFile) {
        const attachment = new FormData();
        attachment.append("file", scanFile);
        try {
          await api.post(`/owner/manifests/${created.id}/file`, attachment, {
            headers: { "Content-Type": "multipart/form-data" },
          });
        } catch (err) {
          toast.error(
            getErrorMessage(err, "El manifiesto se guardo, pero no fue posible adjuntar el documento."),
          );
        }
      }
      toast.success("Manifiesto creado correctamente.");
      closeScanModal();
      if (currentManifestPage !== 1) {
        setCurrentManifestPage(1);
      } else {
        await fetchManifests(statusFilter, currentManifestPage);
      }
    } finally {
      setIsSavingScan(false);
    }
  }

  function openEditManifestModal(manifest) {
    setManifestForm({
      manifest_number: manifest.manifest_number,
      origin: manifest.origin,
      destination: manifest.destination,
      departure_date: manifest.departure_date,
      arrival_date: manifest.arrival_date || "",
      cargo_description: manifest.cargo_description || "",
      freight_value: manifest.freight_value,
      currency: manifest.currency || "COP",
      vehicle_id: manifest.vehicle_id || "",
      driver_id: manifest.driver_id || "",
      status_id: manifest.status_id,
      company_id: manifest.company_id || "",
      origin_place_id: manifest.origin_place_id ?? null,
      destination_place_id: manifest.destination_place_id ?? null,
      distance_km: manifest.distance_km ?? "",
      distance_source: manifest.distance_source ?? null,
    });
    setEditingManifestId(manifest.id);
    setManifestModalOpen(true);
  }

  function closeManifestModal() {
    setManifestModalOpen(false);
    setEditingManifestId(null);
  }

  function openExpenseModal(manifestId) {
    setExpenseForm({ ...EMPTY_EXPENSE_FORM, manifest_id: String(manifestId) });
    setExpenseForms([]);
    setEditingExpenseIndex(null);
    setExpenseManifestLocked(true);
    setExpenseModalOpen(true);
  }

  function closeExpenseModal() {
    setExpenseModalOpen(false);
    setExpenseManifestLocked(false);
  }

  /** For the place picker, which sets values no <input> event carries. */
  function handleManifestField(name, value) {
    setManifestForm((prev) => ({ ...prev, [name]: value }));
  }

  // The distance, shown as soon as both endpoints are pinned and before anything
  // is saved. Kept OUT of the form: writing it into distance_km would make the
  // server record a figure Google produced as one a person typed.
  useEffect(() => {
    const origin = manifestForm.origin_place_id;
    const destination = manifestForm.destination_place_id;
    if (!manifestModalOpen || !origin || !destination || origin === destination) {
      setPreviewKm(null);
      return undefined;
    }
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get("/owner/manifests/distance-preview", {
          params: { origin_place_id: origin, destination_place_id: destination },
        });
        if (!cancelled) setPreviewKm(data.distance_km ?? null);
      } catch {
        // A preview nobody gets is not worth a message; the trip saves anyway.
        if (!cancelled) setPreviewKm(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [manifestModalOpen, manifestForm.origin_place_id, manifestForm.destination_place_id]);

  function handleManifestInput(event) {
    const { name, value, type, checked } = event.target;
    setManifestForm((prev) => {
      if (name !== "driver_id") {
        return { ...prev, [name]: type === "checkbox" ? checked : value };
      }

      const assignedVehicle = vehicles.find((vehicle) => vehicle.driver_id === Number(value));
      return {
        ...prev,
        driver_id: value,
        vehicle_id: assignedVehicle?.id || prev.vehicle_id,
      };
    });
  }

  function handleExpenseInput(event) {
    const { name, value, type, checked } = event.target;
    setExpenseForm((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  }

  function validateExpenseForm(form) {
    if (!form.manifest_id) {
      toast.error("Selecciona un manifiesto para registrar el gasto.");
      return false;
    }
    if (!form.expense_type_id || !form.description.trim() || !form.amount || Number(form.amount) <= 0 || !form.expense_date) {
      toast.error("Completa tipo, monto, fecha y descripcion del gasto.");
      return false;
    }
    return true;
  }

  function addExpenseForm() {
    if (!validateExpenseForm(expenseForm)) return;

    setExpenseForms((prev) => {
      if (editingExpenseIndex === null) return [...prev, expenseForm];
      return prev.map((item, index) => (index === editingExpenseIndex ? expenseForm : item));
    });
    setExpenseForm({ ...EMPTY_EXPENSE_FORM, manifest_id: expenseForm.manifest_id });
    setEditingExpenseIndex(null);
  }

  function editExpenseForm(index) {
    setExpenseForm(expenseForms[index]);
    setEditingExpenseIndex(index);
  }

  function removeExpenseForm(index) {
    setExpenseForms((prev) => prev.filter((_, formIndex) => formIndex !== index));
    if (editingExpenseIndex === index) {
      setExpenseForm({ ...EMPTY_EXPENSE_FORM, manifest_id: expenseForm.manifest_id });
      setEditingExpenseIndex(null);
    } else if (editingExpenseIndex !== null && editingExpenseIndex > index) {
      setEditingExpenseIndex((prev) => prev - 1);
    }
  }

  function handleManifestPageChange(nextPage) {
    const safePage = Math.min(Math.max(nextPage, 1), safeManifestTotalPages);
    setCurrentManifestPage(safePage);
  }

  function handleStatusFilterChange(event) {
    const nextStatus = event.target.value;
    setStatusFilter(nextStatus);
    setCurrentManifestPage(1);
  }

  function handleManifestFilterChange(event) {
    const { name, value, type, checked } = event.target;
    setManifestFilters((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
    setCurrentManifestPage(1);
  }

  function handleManifestStatusFilterToggle(statusId) {
    const nextStatusIds = manifestFilters.statusIds.includes(statusId)
      ? manifestFilters.statusIds.filter((id) => id !== statusId)
      : [...manifestFilters.statusIds, statusId];

    setManifestFilters((prev) => ({ ...prev, statusIds: nextStatusIds }));
    setCurrentManifestPage(1);
  }

  function clearManifestFilters() {
    setManifestFilters(EMPTY_MANIFEST_FILTERS);
    setStatusDropdownOpen(false);
    setCurrentManifestPage(1);
  }

  /** El formulario, normalizado al cuerpo que espera la API. */
  function manifestPayload() {
    return {
      ...manifestForm,
      freight_value: manifestForm.freight_value ? Number(manifestForm.freight_value) : 0,
      arrival_date: manifestForm.arrival_date || null,
      cargo_description: manifestForm.cargo_description || null,
      vehicle_id: manifestForm.vehicle_id ? Number(manifestForm.vehicle_id) : null,
      driver_id: manifestForm.driver_id ? Number(manifestForm.driver_id) : null,
      status_id: manifestForm.status_id ? Number(manifestForm.status_id) : null,
      company_id: manifestForm.company_id ? Number(manifestForm.company_id) : null,
      // An empty box means "work it out", not zero. The server resolves the
      // final value either way and ignores whatever source we send.
      distance_km: manifestForm.distance_km === "" || manifestForm.distance_km === null
        ? null
        : Number(manifestForm.distance_km),
    };
  }

  /**
   * Crea el manifiesto y devuelve lo creado, o null si fallo.
   *
   * Separado del submit porque el flujo de "cargar manifiesto" necesita el id
   * para adjuntarle el documento justo despues.
   */
  async function createManifestFromForm() {
    try {
      const { data } = await api.post("/owner/manifests", manifestPayload());
      return data;
    } catch (err) {
      toast.error(getErrorMessage(err, "No fue posible crear el manifiesto."));
      return null;
    }
  }

  async function submitManifest(event) {
    event.preventDefault();

    const payload = manifestPayload();

    try {
      if (editingManifestId) {
        await api.put(`/owner/manifests/${editingManifestId}`, payload);
        toast.success("Manifiesto actualizado correctamente.");
      } else {
        await api.post("/owner/manifests", payload);
        toast.success("Manifiesto creado correctamente.");
      }
      closeManifestModal();
      if (currentManifestPage !== 1 && !editingManifestId) {
        setCurrentManifestPage(1);
      } else {
        await fetchManifests(statusFilter, currentManifestPage);
      }
    } catch (err) {
      toast.error(getErrorMessage(err, `No fue posible ${editingManifestId ? "actualizar" : "crear"} el manifiesto.`));
    }
  }

  async function submitExpense(event) {
    event.preventDefault();

    let expensesToSubmit = expenseForms;
    if (editingExpenseIndex !== null) {
      if (!validateExpenseForm(expenseForm)) return;
      expensesToSubmit = expenseForms.map((item, index) => (index === editingExpenseIndex ? expenseForm : item));
    } else if (expenseForms.length === 0 || expenseForm.description || expenseForm.amount || expenseForm.expense_type_id || expenseForm.expense_date) {
      if (!validateExpenseForm(expenseForm)) return;
      expensesToSubmit = [...expenseForms, expenseForm];
    }

    const manifestId = Number((expensesToSubmit[0] || expenseForm).manifest_id);
    const payload = {
      expenses: expensesToSubmit.map((expenseForm) => ({
        supplier_id: expenseForm.supplier_id ? Number(expenseForm.supplier_id) : null,
        expense_type_id: Number(expenseForm.expense_type_id),
        description: expenseForm.description,
        amount: Number(expenseForm.amount),
        expense_date: expenseForm.expense_date,
        payment_method_id: expenseForm.payment_method_id ? Number(expenseForm.payment_method_id) : null,
        paid_from_advance: Boolean(expenseForm.paid_from_advance),
        reference_code: expenseForm.reference_code || null,
        location: expenseForm.location || null,
        is_paid: expenseForm.is_paid,
        notes: expenseForm.notes || null,
      })),
    };

    try {
      await api.post(`/owner/manifests/${manifestId}/expenses/bulk`, payload);
      toast.success(`${expensesToSubmit.length} gasto(s) registrado(s) correctamente.`);
      closeExpenseModal();
      setExpenseForm(EMPTY_EXPENSE_FORM);
      setExpenseForms([]);
      setEditingExpenseIndex(null);
      await fetchManifests(statusFilter, currentManifestPage);
    } catch (err) {
      toast.error(getErrorMessage(err, "No fue posible registrar el gasto."));
    }
  }

  return (
    <DashboardShell
      me={me}
      onLogout={onLogout}
      theme={theme}
      onToggleTheme={onToggleTheme}
      title="Manifiestos"
      subtitle="Gestiona rutas, crea gastos por ruta y consulta el detalle"
    >
      <section className="panel owner-list-panel">
        <div className="owner-list-header">
          <div>
            <h3>Manifiestos de ruta</h3>
            <p className="hint">Activos (pagina actual): {activeCount} | Cerrados (pagina actual): {closedCount} | Total: {totalManifests}</p>
          </div>
          <div className="actions-row">
            <Button onClick={openManifestModal}>Crear manifiesto</Button>
            {/* El mismo accept que AttachmentField, para no aceptar aqui lo que
                el bucket rechazaria despues. */}
            <input
              ref={scanInputRef}
              type="file"
              accept=".pdf,image/jpeg,image/png,image/webp,image/heic"
              onChange={handleScanFileChange}
              hidden
            />
            <Button
              type="button"
              variant="secondary"
              onClick={() => scanInputRef.current?.click()}
              disabled={isScanning}
            >
              {isScanning ? "Leyendo manifiesto..." : "Cargar manifiesto"}
            </Button>
          </div>
        </div>

        <div className="owner-filters-row">
          <div className="field">
            <label htmlFor="filter_date_from">Salida desde</label>
            <input
              id="filter_date_from"
              name="dateFrom"
              type="date"
              value={manifestFilters.dateFrom}
              onChange={handleManifestFilterChange}
            />
          </div>
          <div className="field">
            <label htmlFor="filter_date_to">Salida hasta</label>
            <input
              id="filter_date_to"
              name="dateTo"
              type="date"
              value={manifestFilters.dateTo}
              onChange={handleManifestFilterChange}
            />
          </div>
          <div className="field">
            <label>Fase</label>
            <div className="status-dropdown" ref={statusDropdownRef}>
              <button
                type="button"
                className="status-dropdown-trigger"
                aria-expanded={statusDropdownOpen}
                onClick={() => setStatusDropdownOpen((prev) => !prev)}
              >
                {selectedStatusLabels.length === 1 && selectedStatusLabels[0] === "Todos"
                  ? "Todos"
                  : selectedStatusLabels.join(", ") || "Todos"}
              </button>
              {statusDropdownOpen && (
                <div className="status-dropdown-panel">
                  <label className="status-dropdown-option">
                    <input
                      type="checkbox"
                      checked={manifestFilters.statusIds.length === 0}
                      onChange={() => {
                        setManifestFilters((prev) => ({ ...prev, statusIds: [] }));
                        setCurrentManifestPage(1);
                      }}
                    />
                    <span>Todos</span>
                  </label>
                  {manifestStatuses.map((manifestStatus) => (
                    <label key={manifestStatus.id} className="status-dropdown-option">
                      <input
                        type="checkbox"
                        checked={manifestFilters.statusIds.includes(manifestStatus.id)}
                        onChange={() => {
                          handleManifestStatusFilterToggle(manifestStatus.id);
                        }}
                      />
                      <span>{manifestStatus.label}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="field">
            <label htmlFor="filter_vehicle_id">Vehiculo</label>
            <select
              id="filter_vehicle_id"
              name="vehicleId"
              value={manifestFilters.vehicleId}
              onChange={handleManifestFilterChange}
            >
              <option value="">Todos</option>
              {vehicles.map((vehicle) => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicle.plate} - {vehicle.model}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="filter_driver_id">Conductor</label>
            <select
              id="filter_driver_id"
              name="driverId"
              value={manifestFilters.driverId}
              onChange={handleManifestFilterChange}
            >
              <option value="">Todos</option>
              {drivers.map((driver) => (
                <option key={driver.id} value={driver.id}>
                  {driver.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label className="owner-checkbox" htmlFor="filter_include_deleted">
              <input
                id="filter_include_deleted"
                name="includeDeleted"
                type="checkbox"
                checked={manifestFilters.includeDeleted}
                onChange={handleManifestFilterChange}
              />
              Ver eliminados
            </label>
          </div>
          <Button type="button" variant="secondary" onClick={clearManifestFilters}>
            Limpiar filtros
          </Button>
        </div>

        <div className="owner-table-wrap">
          <table className="owner-table">
            <thead>
              <tr>
                <th>Manifiesto</th>
                <th>Ruta</th>
                <th>Km</th>
                <th>Vehiculo</th>
                <th>Salida</th>
                <th>Estado</th>
                <th>Flete</th>
                <th>Cobrado</th>
                <th>Por cobrar</th>
                <th>Gastos</th>
                <th>Resultado</th>
                <th>Margen</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {paginatedManifests.map((manifest) => (
                <tr key={manifest.id}>
                  <td>{manifest.manifest_number}</td>
                  <td>{manifest.origin} - {manifest.destination}</td>
                  {/* Un viaje sin distancia muestra "-", nunca 0: cero kilometros
                      es una afirmacion falsa. Mismo criterio que margin_pct
                      cuando no hay flete. */}
                  <td>
                    {manifest.distance_km
                      ? `${Number(manifest.distance_km).toLocaleString("es-CO")} km`
                      : "-"}
                  </td>
                  <td>{manifest.vehicle_plate || "-"}</td>
                  <td>{formatDate(manifest.departure_date)}</td>
                  <td>
                    <span className={`status-badge ${getManifestStatusBadgeClass(manifest.status?.code)}`}>
                      {manifest.status?.label || "Sin estado"}
                    </span>
                    {manifest.deleted_at ? (
                      <span className="status-badge status-cancelled">Eliminado</span>
                    ) : null}
                  </td>
                  <td>{formatMoney(manifest.freight_value, manifest.currency)}</td>
                  <td>{formatMoney(manifest.total_paid, manifest.currency)}</td>
                  <td className={Number(manifest.balance_due || 0) > 0 ? "kpi-negative" : undefined}>
                    {formatMoney(manifest.balance_due, manifest.currency)}
                  </td>
                  <td>{formatMoney(manifest.total_expenses, manifest.currency)}</td>
                  <td className={Number(manifest.net_result || 0) >= 0 ? "kpi-positive" : "kpi-negative"}>
                    {formatMoney(manifest.net_result, manifest.currency)}
                  </td>
                  <td className={Number(manifest.margin_pct || 0) >= 0 ? "kpi-positive" : "kpi-negative"}>
                    {formatPercent(manifest.margin_pct)}
                  </td>
                  <td>
                    <div className="owner-row-actions">
                      <Button type="button" variant="secondary" onClick={() => navigate(`/dashboard/owner/routes/${manifest.id}`)}>
                        Detalle
                      </Button>
                      <Button type="button" variant="secondary" onClick={() => openEditManifestModal(manifest)}>
                        Editar
                      </Button>
                      <Button type="button" onClick={() => openExpenseModal(manifest.id)}>
                        Agregar gasto
                      </Button>
                      {manifest.deleted_at ? null : (
                        <Button type="button" variant="cancel" onClick={() => setManifestDeleteTarget(manifest)}>
                          Eliminar
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <TablePagination
          page={currentManifestPage}
          totalItems={totalManifests}
          pageSize={MANIFEST_PAGE_SIZE}
          onPageChange={handleManifestPageChange}
          itemLabel="manifiestos"
        />
      </section>

      <ManifestFormModal
        isOpen={manifestModalOpen}
        form={manifestForm}
        onFieldChange={handleManifestField}
        previewKm={previewKm}
        vehicles={vehicles}
        drivers={drivers}
        companies={companies}
        manifestStatuses={manifestStatuses}
        onChange={handleManifestInput}
        onSubmit={submitManifest}
        onClose={closeManifestModal}
        isEditing={Boolean(editingManifestId)}
      />

      <ManifestScanReviewModal
        isOpen={scanModalOpen}
        file={scanFile}
        draft={scanDraft}
        previewKm={scanDraft?.distance_km ?? null}
        form={manifestForm}
        vehicles={vehicles}
        drivers={drivers}
        companies={companies}
        manifestStatuses={manifestStatuses}
        onChange={handleManifestInput}
        onFieldChange={handleManifestField}
        onSubmit={submitScannedManifest}
        onClose={closeScanModal}
        onRetryWithOcr={retryScanWithOcr}
        isSaving={isSavingScan}
        isRetrying={isRetryingScan}
      />

      <ExpenseFormModal
        isOpen={expenseModalOpen}
        form={expenseForm}
        expenses={expenseForms}
        editingIndex={editingExpenseIndex}
        manifests={manifests}
        suppliers={suppliers}
        expenseTypes={expenseTypes}
        paymentMethods={paymentMethods}
        onChange={handleExpenseInput}
        onAdd={addExpenseForm}
        onEdit={editExpenseForm}
        onRemove={removeExpenseForm}
        onSubmit={submitExpense}
        onClose={closeExpenseModal}
        lockManifest={expenseManifestLocked}
      />

      <ConfirmModal
        isOpen={Boolean(manifestDeleteTarget)}
        title="Eliminar manifiesto"
        message={
          manifestDeleteTarget
            ? `Se eliminara el manifiesto ${manifestDeleteTarget.manifest_number} junto con sus gastos y pagos. Podras verlo de nuevo activando "Ver eliminados".`
            : ""
        }
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        onConfirm={confirmDeleteManifest}
        onCancel={() => setManifestDeleteTarget(null)}
      />
    </DashboardShell>
  );
}
