import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";

import { api } from "../../api";
import Button from "../../components/Button";
import DashboardShell from "../../components/DashboardShell";
import TablePagination from "../../components/TablePagination";
import { getDashboardPathByRole } from "../../utils/roleRouting";

const EMPTY_SUPPLIER_FORM = {
  name: "",
  supplier_type: "other",
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
  const [supplierForm, setSupplierForm] = useState(EMPTY_SUPPLIER_FORM);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
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

  async function fetchSuppliers(page) {
    try {
      const { data, headers } = await api.get("/owner/suppliers", {
        params: { page, page_size: PAGE_SIZE },
      });
      setSuppliers(data);
      setTotalSuppliers(Number(headers["x-total-count"] || data.length));
    } catch (err) {
      setErrorMessage(err.response?.data?.detail || "No fue posible cargar proveedores.");
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
    const { name, value } = event.target;
    setSupplierForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSuccessMessage("");
    setErrorMessage("");

    const payload = {
      ...supplierForm,
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
      setSuccessMessage("Proveedor creado correctamente.");
      closeModal();
    } catch (err) {
      setErrorMessage(err.response?.data?.detail || "No fue posible crear el proveedor.");
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
      {successMessage ? <p className="success">{successMessage}</p> : null}
      {errorMessage ? <p className="error">{errorMessage}</p> : null}

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
                  <td>{supplier.supplier_type}</td>
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

      {isModalOpen ? (
        <div className="modal-backdrop" role="presentation" onClick={closeModal}>
          <section
            className="modal-card"
            role="dialog"
            aria-modal="true"
            aria-label="Crear proveedor"
            onClick={(event) => event.stopPropagation()}
          >
            <h3>Nuevo proveedor</h3>
            <form className="owner-form" onSubmit={handleSubmit}>
              <div className="field">
                <label htmlFor="name">Nombre</label>
                <input id="name" name="name" value={supplierForm.name} onChange={handleInputChange} required />
              </div>

              <div className="owner-inline-fields">
                <div className="field">
                  <label htmlFor="supplier_type">Tipo</label>
                  <select id="supplier_type" name="supplier_type" value={supplierForm.supplier_type} onChange={handleInputChange}>
                    <option value="fuel_station">Estacion combustible</option>
                    <option value="toll_operator">Operador peaje</option>
                    <option value="workshop">Taller</option>
                    <option value="restaurant">Restaurante</option>
                    <option value="lodging">Hospedaje</option>
                    <option value="other">Otro</option>
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="tax_id">NIT / Tax ID</label>
                  <input id="tax_id" name="tax_id" value={supplierForm.tax_id} onChange={handleInputChange} />
                </div>
              </div>

              <div className="owner-inline-fields">
                <div className="field">
                  <label htmlFor="contact_name">Contacto</label>
                  <input id="contact_name" name="contact_name" value={supplierForm.contact_name} onChange={handleInputChange} />
                </div>
                <div className="field">
                  <label htmlFor="contact_phone">Telefono</label>
                  <input id="contact_phone" name="contact_phone" value={supplierForm.contact_phone} onChange={handleInputChange} />
                </div>
              </div>

              <div className="owner-inline-fields">
                <div className="field">
                  <label htmlFor="contact_email">Email</label>
                  <input id="contact_email" name="contact_email" value={supplierForm.contact_email} onChange={handleInputChange} />
                </div>
                <div className="field">
                  <label htmlFor="city">Ciudad</label>
                  <input id="city" name="city" value={supplierForm.city} onChange={handleInputChange} />
                </div>
              </div>

              <div className="actions-row">
                <Button type="submit">Guardar proveedor</Button>
                <Button type="button" variant="cancel" onClick={closeModal}>Cancelar</Button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </DashboardShell>
  );
}
