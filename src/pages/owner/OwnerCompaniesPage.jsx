import { useEffect, useState } from "react";
import { toast } from "sonner";

import { api, getErrorMessage } from "../../api";
import { useAccess } from "../../access";
import Button from "../../components/Button";
import DashboardShell from "../../components/DashboardShell";
import CompanyFormModal from "../../components/modals/CompanyFormModal";
import ConfirmModal from "../../components/modals/ConfirmModal";
import TablePagination from "../../components/TablePagination";
import { formatDateOnly } from "../../utils/format";

const EMPTY_COMPANY_FORM = {
  name: "",
  tax_id: "",
  contact_name: "",
  contact_phone: "",
  contact_email: "",
  city: "",
  notes: "",
  is_active: true,
};

const PAGE_SIZE = 8;

/**
 * Las empresas que generan los viajes: el remitente del manifiesto.
 *
 * No son proveedores -- a un proveedor se le paga, y por eso lleva categoria de
 * gasto obligatoria. Estas son el cliente: quien entrega la carga.
 */
export default function OwnerCompaniesPage({ token, me, onLogout, theme, onToggleTheme }) {
  const access = useAccess();
  const canEdit = access.canEdit("companies");

  const [companies, setCompanies] = useState([]);
  const [totalCompanies, setTotalCompanies] = useState(0);
  const [companyForm, setCompanyForm] = useState(EMPTY_COMPANY_FORM);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCompanyId, setEditingCompanyId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("active");
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);

  const totalPages = Math.max(1, Math.ceil(totalCompanies / PAGE_SIZE));

  useEffect(() => {
    fetchCompanies(currentPage, statusFilter, searchTerm);
  }, [currentPage, statusFilter, searchTerm]);

  async function fetchCompanies(page, statusValue, search) {
    try {
      const { data, headers } = await api.get("/owner/companies", {
        params: {
          page,
          page_size: PAGE_SIZE,
          status: statusValue,
          search: search || undefined,
        },
      });
      setCompanies(data);
      setTotalCompanies(Number(headers["x-total-count"] || data.length));
    } catch (err) {
      toast.error(getErrorMessage(err, "No fue posible cargar las empresas."));
    }
  }

  function handlePageChange(nextPage) {
    setCurrentPage(Math.min(Math.max(nextPage, 1), totalPages));
  }

  function handleStatusFilterChange(event) {
    setStatusFilter(event.target.value);
    setCurrentPage(1);
  }

  function handleSearchChange(event) {
    setSearchTerm(event.target.value);
    setCurrentPage(1);
  }

  function clearFilters() {
    setStatusFilter("active");
    setSearchTerm("");
    setCurrentPage(1);
  }

  function openModal() {
    setCompanyForm(EMPTY_COMPANY_FORM);
    setEditingCompanyId(null);
    setIsModalOpen(true);
  }

  function openEditModal(company) {
    setCompanyForm({
      name: company.name,
      tax_id: company.tax_id || "",
      contact_name: company.contact_name || "",
      contact_phone: company.contact_phone || "",
      contact_email: company.contact_email || "",
      city: company.city || "",
      notes: company.notes || "",
      is_active: company.is_active,
    });
    setEditingCompanyId(company.id);
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setEditingCompanyId(null);
  }

  function handleInputChange(event) {
    const { name, value, type, checked } = event.target;
    setCompanyForm((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const payload = {
      ...companyForm,
      tax_id: companyForm.tax_id || null,
      contact_name: companyForm.contact_name || null,
      contact_phone: companyForm.contact_phone || null,
      contact_email: companyForm.contact_email || null,
      city: companyForm.city || null,
      notes: companyForm.notes || null,
    };

    try {
      if (editingCompanyId) {
        await api.put(`/owner/companies/${editingCompanyId}`, payload);
        toast.success("Empresa actualizada correctamente.");
        await fetchCompanies(currentPage, statusFilter, searchTerm);
      } else {
        await api.post("/owner/companies", payload);
        toast.success("Empresa creada correctamente.");
        if (currentPage !== 1) {
          setCurrentPage(1);
        } else {
          await fetchCompanies(1, statusFilter, searchTerm);
        }
      }
      closeModal();
    } catch (err) {
      toast.error(getErrorMessage(err, "No fue posible guardar la empresa."));
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      await api.delete(`/owner/companies/${deleteTarget}`);
      toast.success("Empresa eliminada correctamente.");
      setDeleteTarget(null);
      closeModal();
      await fetchCompanies(currentPage, statusFilter, searchTerm);
    } catch (err) {
      toast.error(getErrorMessage(err, "No fue posible eliminar la empresa."));
    }
  }

  return (
    <DashboardShell
      me={me}
      onLogout={onLogout}
      theme={theme}
      onToggleTheme={onToggleTheme}
      title="Empresas"
      subtitle="Empresas y personas que generan los viajes"
    >
      <section className="panel owner-list-panel">
        <div className="owner-list-header">
          <div>
            <h3>Lista de empresas</h3>
            <p className="hint">Total registradas: {totalCompanies}</p>
          </div>
          {canEdit && <Button onClick={openModal}>Crear empresa</Button>}
        </div>

        <div className="owner-filters-row">
          <div className="field">
            <label htmlFor="company_status_filter">Estado</label>
            <select id="company_status_filter" value={statusFilter} onChange={handleStatusFilterChange}>
              <option value="active">Activas</option>
              <option value="deleted">Eliminadas</option>
              <option value="all">Todas</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="company_search">Buscar</label>
            <input
              id="company_search"
              value={searchTerm}
              onChange={handleSearchChange}
              placeholder="Nombre o NIT"
            />
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
                <th>NIT</th>
                <th>Contacto</th>
                <th>Ciudad</th>
                <th>Estado</th>
                <th>Creada</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {companies.length === 0 && (
                <tr>
                  <td colSpan={7} className="hint">
                    No hay empresas para los filtros seleccionados.
                  </td>
                </tr>
              )}
              {companies.map((company) => (
                <tr key={company.id}>
                  <td>{company.name}</td>
                  <td>{company.tax_id || "-"}</td>
                  <td>{company.contact_name || company.contact_phone || "-"}</td>
                  <td>{company.city || "-"}</td>
                  <td>
                    <span
                      className={`status-badge ${
                        company.deleted_at || !company.is_active ? "status-maintenance" : "status-active"
                      }`}
                    >
                      {company.deleted_at ? "Eliminada" : company.is_active ? "Activa" : "Inactiva"}
                    </span>
                  </td>
                  <td>{formatDateOnly(company.created_at)}</td>
                  <td>
                    {canEdit ? (
                      <button type="button" className="table-action-button" onClick={() => openEditModal(company)}>
                        Editar
                      </button>
                    ) : (
                      <span className="hint">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <TablePagination
          page={currentPage}
          totalItems={totalCompanies}
          pageSize={PAGE_SIZE}
          onPageChange={handlePageChange}
          itemLabel="empresas"
        />
      </section>

      <CompanyFormModal
        isOpen={isModalOpen}
        form={companyForm}
        onChange={handleInputChange}
        onSubmit={handleSubmit}
        onClose={closeModal}
        isEditing={Boolean(editingCompanyId)}
        onDelete={editingCompanyId ? () => setDeleteTarget(editingCompanyId) : undefined}
      />

      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        title="Eliminar empresa"
        message="¿Está seguro de eliminar esta empresa? Los manifiestos que la nombran se conservan, y podrá seguir viéndola en el filtro de eliminadas."
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </DashboardShell>
  );
}
