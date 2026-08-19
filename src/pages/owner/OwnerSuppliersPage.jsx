import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { toast } from "sonner";

import { api } from "../../api";
import Button from "../../components/Button";
import DashboardShell from "../../components/DashboardShell";
import SupplierFormModal from "../../components/modals/SupplierFormModal";
import TablePagination from "../../components/TablePagination";
import { getDashboardPathByRole } from "../../utils/roleRouting";

const EMPTY_SUPPLIER_FORM = {
  name: "",
  supplier_type_id: "",
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
  const [supplierTypes, setSupplierTypes] = useState([]);
  const [supplierForm, setSupplierForm] = useState(EMPTY_SUPPLIER_FORM);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(totalSuppliers / PAGE_SIZE));
  const paginatedSuppliers = useMemo(() => suppliers, [suppliers]);

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (me && me.role !== "owner_profile") {
    return <Navigate to={getDashboardPathByRole(me.role)} replace />;
  }

  useEffect(() => {
    fetchSuppliers(currentPage);
  }, [currentPage]);

  useEffect(() => {
    fetchSupplierTypes();
  }, []);

  async function fetchSuppliers(page) {
    try {
      const { data, headers } = await api.get("/owner/suppliers", {
        params: { page, page_size: PAGE_SIZE },
      });
      setSuppliers(data);
      setTotalSuppliers(Number(headers["x-total-count"] || data.length));
    } catch (err) {
      toast.error(err.response?.data?.detail || "No fue posible cargar proveedores.");
    }
  }

  async function fetchSupplierTypes() {
    try {
      const { data } = await api.get("/owner/supplier-types");
      setSupplierTypes(data);
    } catch (err) {
      toast.error(err.response?.data?.detail || "No fue posible cargar los tipos de proveedor.");
    }
  }

  function handlePageChange(nextPage) {
    const safePage = Math.min(Math.max(nextPage, 1), totalPages);
    setCurrentPage(safePage);
  }

  function openModal() {
    setSupplierForm(EMPTY_SUPPLIER_FORM);
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
  }

  function handleInputChange(event) {
    const { name, value, type, checked } = event.target;
    setSupplierForm((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const payload = {
      ...supplierForm,
      supplier_type_id: Number(supplierForm.supplier_type_id),
      tax_id: supplierForm.tax_id || null,
      contact_name: supplierForm.contact_name || null,
      contact_phone: supplierForm.contact_phone || null,
      contact_email: supplierForm.contact_email || null,
      city: supplierForm.city || null,
    };

    try {
      await api.post("/owner/suppliers", payload);
      if (currentPage !== 1) {
        setCurrentPage(1);
      } else {
        await fetchSuppliers(1);
      }
      toast.success("Proveedor creado correctamente.");
      closeModal();
    } catch (err) {
      toast.error(err.response?.data?.detail || "No fue posible crear el proveedor.");
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

        <div className="owner-table-wrap">
          <table className="owner-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Tipo</th>
                <th>Contacto</th>
                <th>Ciudad</th>
                <th>Estado</th>
                <th>Creado</th>
              </tr>
            </thead>
            <tbody>
              {paginatedSuppliers.map((supplier) => (
                <tr key={supplier.id}>
                  <td>{supplier.name}</td>
                  <td>{supplier.supplier_type?.label || "-"}</td>
                  <td>{supplier.contact_name || supplier.contact_phone || "-"}</td>
                  <td>{supplier.city || "-"}</td>
                  <td>
                    <span className={`status-badge ${supplier.is_active ? "status-active" : "status-maintenance"}`}>
                      {supplier.is_active ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td>{formatDate(supplier.created_at)}</td>
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
        supplierTypes={supplierTypes}
        onChange={handleInputChange}
        onSubmit={handleSubmit}
        onClose={closeModal}
      />
    </DashboardShell>
  );
}
