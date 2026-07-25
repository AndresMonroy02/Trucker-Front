const DEFAULT_PAGE_SIZE = 8;

export default function TablePagination({
  page,
  totalItems,
  pageSize = DEFAULT_PAGE_SIZE,
  onPageChange,
  itemLabel = "registros",
}) {
  if (!totalItems) {
    return null;
  }

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const from = (safePage - 1) * pageSize + 1;
  const to = Math.min(safePage * pageSize, totalItems);

  return (
    <div className="table-pagination" role="navigation" aria-label="Paginacion de tabla">
      <p className="table-pagination-meta">
        Mostrando {from}-{to} de {totalItems} {itemLabel}
      </p>
      <div className="table-pagination-actions">
        <button
          type="button"
          className="table-page-btn"
          onClick={() => onPageChange(safePage - 1)}
          disabled={safePage === 1}
        >
          Anterior
        </button>
        <span className="table-pagination-page">Pagina {safePage} de {totalPages}</span>
        <button
          type="button"
          className="table-page-btn"
          onClick={() => onPageChange(safePage + 1)}
          disabled={safePage === totalPages}
        >
          Siguiente
        </button>
      </div>
    </div>
  );
}
