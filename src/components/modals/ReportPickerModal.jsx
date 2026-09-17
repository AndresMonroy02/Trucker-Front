import { useEffect, useState } from "react";

import Button from "../Button";
import ModalBackdrop from "../ModalBackdrop";

/**
 * Which rows go in the document.
 *
 * Everything starts ticked, because "the whole period" is what the button used to
 * do and is what most people want; unticking is the exception the picker exists
 * for. The parent owns the fetch so this stays a dumb list, like every other
 * modal here.
 *
 * Generic over what is being listed: `columns` says what to show, `options` is
 * whatever switches that particular report has. Both reports pick their rows the
 * same way, and a third one should not need a third copy of this.
 */
export default function ReportPickerModal({
  isOpen,
  title = "Generar reporte",
  subtitle,
  rows,
  columns,
  // The row's name, for the checkbox's accessible label. Without it a screen
  // reader announces a column of identical "Incluir" boxes.
  labelOf = (row) => row.name,
  emptyMessage = "No hay registros para los filtros seleccionados. Ajusta el filtro y vuelve a intentarlo.",
  // Report-specific switches, rendered above the list. The parent owns their
  // state, because it is the parent that sends them to the API.
  options = null,
  isGenerating = false,
  onGenerate,
  onClose,
}) {
  const [selected, setSelected] = useState(() => new Set());

  // Re-tick everything whenever the modal opens on a different set of rows.
  useEffect(() => {
    if (isOpen) setSelected(new Set(rows.map((row) => row.id)));
  }, [isOpen, rows]);

  if (!isOpen) return null;

  function toggle(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const allTicked = rows.length > 0 && selected.size === rows.length;

  return (
    <ModalBackdrop onClick={onClose}>
      <section
        className="modal-card modal-card-wide"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
      >
        <h3>{title}</h3>
        {subtitle ? <p className="hint">{subtitle}</p> : null}

        {rows.length === 0 ? (
          <p className="hint">{emptyMessage}</p>
        ) : (
          <>
            {options ? <div className="report-options">{options}</div> : null}

            <div className="owner-list-header">
              <p className="hint">
                {selected.size} de {rows.length} seleccionados
              </p>
              <button
                type="button"
                className="table-action-button"
                onClick={() =>
                  setSelected(allTicked ? new Set() : new Set(rows.map((row) => row.id)))
                }
              >
                {allTicked ? "Desmarcar todos" : "Marcar todos"}
              </button>
            </div>

            <div className="owner-table-wrap report-picker">
              <table className="owner-table owner-table-tight">
                <thead>
                  <tr>
                    <th aria-label="Incluir" />
                    {columns.map((column) => (
                      <th key={column.header}>{column.header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selected.has(row.id)}
                          onChange={() => toggle(row.id)}
                          aria-label={`Incluir ${labelOf(row)}`}
                        />
                      </td>
                      {columns.map((column) => (
                        <td key={column.header}>{column.render(row)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        <div className="actions-row">
          <Button
            type="button"
            onClick={() => onGenerate([...selected])}
            disabled={selected.size === 0 || isGenerating}
          >
            {isGenerating ? "Generando..." : "Generar PDF"}
          </Button>
          <Button type="button" variant="cancel" onClick={onClose}>
            Cancelar
          </Button>
        </div>
        <p className="hint">El documento queda guardado y podras consultarlo en Reportes.</p>
      </section>
    </ModalBackdrop>
  );
}
