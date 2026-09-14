import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { api, getErrorMessage, sendDriverInvite } from "../../api";
import Button from "../../components/Button";
import DashboardShell from "../../components/DashboardShell";
import DriverFormModal from "../../components/modals/DriverFormModal";
import ConfirmModal from "../../components/modals/ConfirmModal";
import TablePagination from "../../components/TablePagination";
import { isValidEmail } from "../../utils/validation";
import { formatDateTime } from "../../utils/format";

const INITIAL_FORM = {
  name: "",
  license: "",
  phone: "",
  status_id: "",
  user_id: "",
  account_mode: "new",
  account_username: "",
  account_email: "",
};

const PAGE_SIZE = 8;

// What the owner needs to know at a glance: can this driver log in yet, and if not, why.
function getAccountBadge(driver) {
  if (!driver.user_id) {
    return { label: "Sin cuenta", className: "status-neutral", title: "" };
  }
  if (driver.account_is_active) {
    return { label: "Activada", className: "status-active", title: "El conductor ya configuro su contrasena." };
  }
  if (driver.last_invite_state === "failed") {
    return {
      label: "Envio fallido",
      className: "status-maintenance",
      title: driver.last_invite_error || "No fue posible enviar la invitacion.",
    };
  }
  if (driver.last_invite_state === "expired") {
    return {
      label: "Invitacion vencida",
      className: "status-in-transit",
      title: `Vencio el ${formatDateTime(driver.invite_expires_at)}`,
    };
  }
  if (driver.last_invite_state === "pending") {
    return {
      label: "Invitacion enviada",
      className: "status-pending",
      title: `Enviada el ${formatDateTime(driver.last_invite_sent_at)}. Vence el ${formatDateTime(driver.invite_expires_at)}`,
    };
  }
  return { label: "Pendiente", className: "status-pending", title: "" };
}

function canResendInvite(driver) {
  return Boolean(driver?.user_id) && !driver?.account_is_active;
}

export default function OwnerDriversPage({ token, me, onLogout, theme, onToggleTheme }) {
  const [drivers, setDrivers] = useState([]);
  const [totalDrivers, setTotalDrivers] = useState(0);
  const [driverStatuses, setDriverStatuses] = useState([]);
  const [driverAccounts, setDriverAccounts] = useState([]);
  const [form, setForm] = useState(INITIAL_FORM);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState(null);
  const [resendingId, setResendingId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("active");
  const [deleteTarget, setDeleteTarget] = useState(null);

  const totalPages = Math.max(1, Math.ceil(totalDrivers / PAGE_SIZE));
  const paginatedDrivers = useMemo(() => drivers, [drivers]);

  useEffect(() => {
    fetchDrivers(currentPage, statusFilter);
  }, [currentPage, statusFilter]);

  useEffect(() => {
    fetchDriverStatuses();
  }, []);

  async function fetchDrivers(page, statusValue) {
    try {
      const { data, headers } = await api.get("/owner/drivers", {
        params: { page, page_size: PAGE_SIZE, status: statusValue },
      });
      setDrivers(data);
      setTotalDrivers(Number(headers["x-total-count"] || data.length));
    } catch (err) {
      toast.error(getErrorMessage(err, "No fue posible cargar conductores."));
    }
  }

  async function fetchDriverStatuses() {
    try {
      const { data } = await api.get("/owner/driver-statuses");
      setDriverStatuses(data);
    } catch (err) {
      toast.error(getErrorMessage(err, "No fue posible cargar los estados de conductor."));
    }
  }

  async function fetchDriverAccounts() {
    try {
      const { data } = await api.get("/owner/driver-accounts");
      setDriverAccounts(data);
    } catch (err) {
      toast.error(getErrorMessage(err, "No fue posible cargar las cuentas de conductor."));
    }
  }

  function openModal() {
    setForm(INITIAL_FORM);
    setEditingDriver(null);
    fetchDriverAccounts();
    setIsModalOpen(true);
  }

  function openEditModal(driver) {
    setForm({
      name: driver.name,
      license: driver.license,
      phone: driver.phone,
      status_id: String(driver.status_id),
      user_id: driver.user_id ? String(driver.user_id) : "",
      account_mode: driver.user_id ? "existing" : "none",
      account_username: "",
      account_email: "",
    });
    setEditingDriver(driver);
    // No account dropdown in edit mode, so there is nothing to populate.
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setEditingDriver(null);
  }

  function handlePageChange(nextPage) {
    const safePage = Math.min(Math.max(nextPage, 1), totalPages);
    setCurrentPage(safePage);
  }

  function handleInputChange(event) {
    const { name, value, type, checked } = event.target;
    setForm((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  }

  function handleStatusFilterChange(event) {
    setStatusFilter(event.target.value);
    setCurrentPage(1);
  }

  function clearFilters() {
    setStatusFilter("active");
    setCurrentPage(1);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const name = form.name.trim();
    const license = form.license.trim();
    const phone = form.phone.trim();

    if (!name || !license || !phone || !form.status_id) {
      toast.error("Nombre, licencia, telefono y estado son obligatorios.");
      return;
    }

    try {
      if (editingDriver) {
        // Editing never touches the account link; use Reenviar for the invitation.
        const payload = { name, license, phone, status_id: Number(form.status_id) };
        await api.put(`/owner/drivers/${editingDriver.id}`, payload);
        toast.success("Conductor actualizado correctamente.");
        await fetchDrivers(currentPage, statusFilter);
        closeModal();
        return;
      }

      const payload = {
        name,
        license,
        phone,
        status_id: Number(form.status_id),
      };

      if (form.account_mode === "existing") {
        if (!form.user_id) {
          toast.error("Selecciona la cuenta de conductor que quieres vincular.");
          return;
        }
        payload.user_id = Number(form.user_id);
      } else {
        const accountUsername = form.account_username.trim();
        const accountEmail = form.account_email.trim();
        if (!accountUsername || !accountEmail) {
          toast.error("Usuario y correo son obligatorios para crear la cuenta del conductor.");
          return;
        }
        if (/\s/.test(accountUsername)) {
          toast.error("El usuario no puede contener espacios.");
          return;
        }
        if (accountUsername.length < 3) {
          toast.error("El usuario debe tener al menos 3 caracteres.");
          return;
        }
        if (!isValidEmail(accountEmail)) {
          toast.error("Ingresa un correo valido.");
          return;
        }
        payload.account_username = accountUsername;
        payload.account_email = accountEmail;
      }

      const { data } = await api.post("/owner/drivers", payload);
      if (data?.last_invite_state === "failed") {
        toast.warning(
          data.last_invite_error
            ? `Conductor creado, pero el correo fallo: ${data.last_invite_error}`
            : "Conductor creado, pero no fue posible enviar la invitacion. Reenviala desde la tabla.",
        );
      } else if (data?.user_id && !data?.account_is_active) {
        toast.success("Conductor creado. Se envio la invitacion por correo.");
      } else {
        toast.success("Conductor creado correctamente.");
      }

      if (currentPage !== 1) {
        setCurrentPage(1);
      } else {
        await fetchDrivers(1, statusFilter);
      }
      closeModal();
    } catch (err) {
      toast.error(getErrorMessage(err, "No fue posible crear el conductor."));
    }
  }

  function requestDelete(driverId) {
    setDeleteTarget(driverId);
  }

  async function handleSendInvite(driverId) {
    if (!driverId) return;
    setResendingId(driverId);
    try {
      await sendDriverInvite(driverId);
      toast.success("Invitacion reenviada al conductor.");
      await fetchDrivers(currentPage, statusFilter);
    } catch (err) {
      toast.error(getErrorMessage(err, "No fue posible enviar la invitacion."));
    } finally {
      setResendingId(null);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      await api.delete(`/owner/drivers/${deleteTarget}`);
      toast.success("Conductor eliminado correctamente.");
      setDeleteTarget(null);
      closeModal();
      await fetchDrivers(currentPage, statusFilter);
    } catch (err) {
      toast.error(getErrorMessage(err, "No fue posible eliminar el conductor."));
    }
  }

  return (
    <DashboardShell
      me={me}
      onLogout={onLogout}
      theme={theme}
      onToggleTheme={onToggleTheme}
      title="Conductores"
      subtitle="Crea y administra tus conductores"
    >
      <section className="panel owner-list-panel">
        <div className="owner-list-header">
          <div>
            <h3>Lista de conductores</h3>
            <p className="hint">Total registrados: {totalDrivers}</p>
          </div>
          <Button onClick={openModal}>Crear nuevo conductor</Button>
        </div>

        <div className="owner-filters-row">
          <div className="field">
            <label htmlFor="driver_status_filter">Estado</label>
            <select id="driver_status_filter" value={statusFilter} onChange={handleStatusFilterChange}>
              <option value="active">Activos</option>
              <option value="deleted">Eliminados</option>
              <option value="all">Todos</option>
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
                <th>Nombre</th>
                <th>Correo</th>
                <th>Licencia</th>
                <th>Telefono</th>
                <th>Estado</th>
                <th>Cuenta</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {paginatedDrivers.length === 0 && (
                <tr><td colSpan={7} className="hint">No hay conductores para los filtros seleccionados.</td></tr>
              )}
              {paginatedDrivers.map((driver) => {
                const accountBadge = getAccountBadge(driver);
                return (
                  <tr key={driver.id}>
                    <td>{driver.name}</td>
                    <td>{driver.account_email || "-"}</td>
                    <td>{driver.license}</td>
                    <td>{driver.phone}</td>
                    <td>
                      <span className={`status-badge ${driver.status?.code === "available" ? "status-active" : "status-maintenance"}`}>
                        {driver.status?.label || "-"}
                      </span>
                    </td>
                    <td>
                      <span className={`status-badge ${accountBadge.className}`} title={accountBadge.title}>
                        {accountBadge.label}
                      </span>
                    </td>
                    <td>
                      <div className="owner-row-actions">
                        <button type="button" className="table-action-button" onClick={() => openEditModal(driver)}>
                          Editar
                        </button>
                        {canResendInvite(driver) && (
                          <button
                            type="button"
                            className="table-action-button"
                            disabled={resendingId === driver.id}
                            onClick={() => handleSendInvite(driver.id)}
                          >
                            {resendingId === driver.id ? "Enviando..." : "Reenviar"}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <TablePagination
          page={currentPage}
          totalItems={totalDrivers}
          pageSize={PAGE_SIZE}
          onPageChange={handlePageChange}
          itemLabel="conductores"
        />
      </section>

      <DriverFormModal
        isOpen={isModalOpen}
        form={form}
        driverStatuses={driverStatuses}
        driverAccounts={driverAccounts}
        onChange={handleInputChange}
        onSubmit={handleSubmit}
        onClose={closeModal}
        isEditing={Boolean(editingDriver)}
        canResendInvite={canResendInvite(editingDriver)}
        onDelete={editingDriver ? () => requestDelete(editingDriver.id) : undefined}
        onSendInvite={editingDriver ? () => handleSendInvite(editingDriver.id) : undefined}
      />

      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        title="Eliminar conductor"
        message="Esta seguro de eliminar este conductor? Podra seguir viendolo en el filtro de eliminados."
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </DashboardShell>
  );
}

