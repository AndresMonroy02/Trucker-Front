import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { toast } from "sonner";

import { api } from "../../api";
import Button from "../../components/Button";
import DashboardShell from "../../components/DashboardShell";
import SupplierFormModal from "../../components/modals/SupplierFormModal";
import ConfirmModal from "../../components/modals/ConfirmModal";
import TablePagination from "../../components/TablePagination";
import { getDashboardPathByRole } from "../../utils/roleRouting";

const EMPTY_SUPPLIER_FORM = {
  name: "",
  expense_type_id: "",
  tax_id: "",
  contact_name: "",
  contact_phone: "",
  contact_email: "",
  city: "",
  is_active: true,
};

const PAGE_SIZE = 8;

function formatDate(value) {
  if (!value) return "-";
  return new Date(`${value}T00:00:00`).toLocaleDateString("es-CO");
}

export default function OwnerSuppliersPage({ token, me, onLogout, theme, onToggleTheme }) {
  const [suppliers, setSuppliers] = useState([]);
  const [totalSuppliers, setTotalSuppliers] = useState(0);
  const [expenseTypes, setExpenseTypes] = useState([]);
  const [supplierForm, setSupplierForm] = useState(EMPTY_SUPPLIER_FORM);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplierId, setEditingSupplierId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("active");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);

  const totalPages = Math.max(1, Math.ceil(totalSuppliers / PAGE_SIZE));
  const paginatedSuppliers = useMemo(() => suppliers, [suppliers]);

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (me && me.role !== "owner_profile") {
    return <Navigate to={getDashboardPathByRole(me.role)} replace />;
  }

  useEffect(() => {
    fetchSuppliers(currentPage, statusFilter, categoryFilter);
  }, [currentPage, statusFilter, categoryFilter]);

  useEffect(() => {
    fetchExpenseTypes();
  }, []);

  async function fetchSuppliers(page, statusValue, expenseTypeId) {
    try {
      const { data, headers } = await api.get("/owner/suppliers", {
        params: {
          page,
          page_size: PAGE_SIZE,
          status: statusValue,
          expense_type_id: expenseTypeId || undefined,
        },
      });
      setSuppliers(data);
      setTotalSuppliers(Number(headers["x-total-count"] || data.length));
    } catch (err) {
      toast.error(err.response?.data?.detail || "No fue posible cargar proveedores.");
    }
  }

  async function fetchExpenseTypes() {
    try {
      const { data } = await api.get("/owner/expense-types");
      setExpenseTypes(data);
    } catch (err) {
      toast.error(err.response?.data?.detail || "No fue posible cargar las categorias de gasto.");
    }
  }

  function handlePageChange(nextPage) {
    const safePage = Math.min(Math.max(nextPage, 1), totalPages);
    setCurrentPage(safePage);
  }

  function handleStatusFilterChange(event) {
    setStatusFilter(event.target.value);
    setCurrentPage(1);
  }

  function handleCategoryFilterChange(event) {
    setCategoryFilter(event.target.value);
    setCurrentPage(1);
  }

  function clearFilters() {
    setStatusFilter("active");
    setCategoryFilter("");
    setCurrentPage(1);
  }

  function openModal() {
    setSupplierForm(EMPTY_SUPPLIER_FORM);
    setEditingSupplierId(null);
    setIsModalOpen(true);
  }

  function openEditModal(supplier) {
    setSupplierForm({
      name: supplier.name,
      expense_type_id: String(supplier.expense_type_id),
      tax_id: supplier.tax_id || "",
      contact_name: supplier.contact_name || "",
      contact_phone: supplier.contact_phone || "",
      contact_email: supplier.contact_email || "",
      city: supplier.city || "",
      is_active: supplier.is_active,
    });
    setEditingSupplierId(supplier.id);
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setEditingSupplierId(null);
  }

  function handleInputChange(event) {
    const { name, value, type, checked } = event.target;
    setSupplierForm((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const payload = {
      ...supplierForm,
      expense_type_id: Number(supplierForm.expense_type_id),
      tax_id: supplierForm.tax_id || null,
      contact_name: supplierForm.contact_name || null,
      contact_phone: supplierForm.contact_phone || null,
      contact_email: supplierForm.contact_email || null,
      city: supplierForm.city || null,
    };

    try {
      if (editingSupplierId) {
        await api.put(`/owner/suppliers/${editingSupplierId}`, payload);
        toast.success("Proveedor actualizado correctamente.");
        await fetchSuppliers(currentPage, statusFilter, categoryFilter);
      } else {
        await api.post("/owner/suppliers", payload);
        toast.success("Proveedor creado correctamente.");
        if (currentPage !== 1) {
          setCurrentPage(1);
        } else {
          await fetchSuppliers(1, statusFilter, categoryFilter);
        }
      }
      closeModal();
    } catch (err) {
      toast.error(err.response?.data?.detail || "No fue posible guardar el proveedor.");
    }
  }

  function requestDelete(supplierId) {
    setDeleteTarget(supplierId);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      await api.delete(`/owner/suppliers/${deleteTarget}`);
      toast.success("Proveedor eliminado correctamente.");
      setDeleteTarget(null);
      closeModal();
      await fetchSuppliers(currentPage, statusFilter, categoryFilter);
    } catch (err) {
      toast.error(err.response?.data?.detail || "No fue posible eliminar el proveedor.");
    }
  }

  return (
    <DashboardShell
      me={me}
      onLogout={onLogout}
      theme={theme}
      onToggleTheme={onToggleTheme}
      title="Proveedores"
      subtitle="Lista y alta de proveedores para gastos de ruta"
    >
      <section className="panel owner-list-panel">
        <div className="owner-list-header">
          <div>
            <h3>Lista de proveedores</h3>
            <p className="hint">Total registrados: {totalSuppliers}</p>
          </div>
          <Button onClick={openModal}>Crear proveedor</Button>
        </div>

        <div className="owner-filters-row">
          <div className="field">
            <label htmlFor="status_filter">Estado</label>
            <select id="status_filter" value={statusFilter} onChange={handleStatusFilterChange}>
              <option value="active">Activos</option>
              <option value="deleted">Eliminados</option>
              <option value="all">Todos</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="category_filter">Categoria</label>
            <select id="category_filter" value={categoryFilter} onChange={handleCategoryFilterChange}>
              <option value="">Todas las categorias</option>
              {expenseTypes.map((expenseType) => (
                <option key={expenseType.id} value={expenseType.id}>
                  {expenseType.label}
                </option>
              ))}
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
                <th>Categoria</th>
                <th>Contacto</th>
                <th>Ciudad</th>
                <th>Estado</th>
                <th>Creado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {paginatedSuppliers.length === 0 && (
                <tr>
                  <td colSpan={7} className="hint">
                    No hay proveedores para los filtros seleccionados.
                  </td>
                </tr>
              )}
              {paginatedSuppliers.map((supplier) => (
                <tr key={supplier.id}>
                  <td>{supplier.name}</td>
                  <td>{supplier.expense_type?.label || "-"}</td>
                  <td>{supplier.contact_name || supplier.contact_phone || "-"}</td>
                  <td>{supplier.city || "-"}</td>
                  <td>
                    <span
                      className={`status-badge ${
                        supplier.deleted_at || !supplier.is_active ? "status-maintenance" : "status-active"
                      }`}
                    >
                      {supplier.deleted_at ? "Eliminado" : supplier.is_active ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td>{formatDate(supplier.created_at)}</td>
                  <td>
                    <button type="button" className="table-action-button" onClick={() => openEditModal(supplier)}>
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <TablePagination
          page={currentPage}
          totalItems={totalSuppliers}
          pageSize={PAGE_SIZE}
          onPageChange={handlePageChange}
          itemLabel="proveedores"
        />
      </section>

      <SupplierFormModal
        isOpen={isModalOpen}
        form={supplierForm}
        expenseTypes={expenseTypes}
        onChange={handleInputChange}
        onSubmit={handleSubmit}
        onClose={closeModal}
        isEditing={Boolean(editingSupplierId)}
        onDelete={editingSupplierId ? () => requestDelete(editingSupplierId) : undefined}
      />

      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        title="Eliminar proveedor"
        message="¿Está seguro de eliminar este proveedor? Podrá seguir viéndolo en el filtro de eliminados."
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </DashboardShell>
  );
}
