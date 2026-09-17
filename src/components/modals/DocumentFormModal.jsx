import { useMemo } from "react";

import Button from "../Button";
import ModalBackdrop from "../ModalBackdrop";
import { formatFileSize } from "../../utils/format";

/**
 * Register or renew a compliance document.
 *
 * The holder picker drives everything else: choosing "Vehiculo" narrows the type
 * list to the ones that apply to a truck, so a licencia de conduccion can never
 * be filed against a plate. The API enforces the same rule, but the form should
 * not offer a choice that is about to be rejected.
 */
export default function DocumentFormModal({
  isOpen,
  form,
  documentTypes,
  vehicles,
  drivers,
  onChange,
  onSubmit,
  onClose,
  onDelete,
  isEditing = false,
  file = null,
  pendingFile = null,
  isUploading = false,
  onFileChange,
  onRemoveFile,
  onClearPendingFile,
  onPreviewFile,
}) {
  const typesForHolder = useMemo(
    () => documentTypes.filter((type) => type.applies_to === form.holder_kind),
    [documentTypes, form.holder_kind],
  );

  if (!isOpen) return null;

  return (
    <ModalBackdrop onClick={onClose}>
      <section
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-label={isEditing ? "Editar documento" : "Registrar documento"}
        onClick={(event) => event.stopPropagation()}
      >
        <h3>{isEditing ? "Editar documento" : "Nuevo documento"}</h3>
        <form className="owner-form" onSubmit={onSubmit}>
          <div className="owner-inline-fields">
            <div className="field">
              <label htmlFor="holder_kind">Pertenece a</label>
              <select id="holder_kind" name="holder_kind" value={form.holder_kind} onChange={onChange}>
                <option value="vehicle">Vehiculo</option>
                <option value="driver">Conductor</option>
              </select>
            </div>

            {form.holder_kind === "vehicle" ? (
              <div className="field">
                <label htmlFor="vehicle_id">Vehiculo</label>
                <select id="vehicle_id" name="vehicle_id" value={form.vehicle_id} onChange={onChange} required>
                  <option value="">Selecciona un vehiculo</option>
                  {vehicles.map((vehicle) => (
                    <option key={vehicle.id} value={vehicle.id}>
                      {vehicle.plate} - {vehicle.model}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="field">
                <label htmlFor="driver_id">Conductor</label>
                <select id="driver_id" name="driver_id" value={form.driver_id} onChange={onChange} required>
                  <option value="">Selecciona un conductor</option>
                  {drivers.map((driver) => (
                    <option key={driver.id} value={driver.id}>
                      {driver.name} - {driver.license}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="field">
            <label htmlFor="document_type_id">Tipo de documento</label>
            <select
              id="document_type_id"
              name="document_type_id"
              value={form.document_type_id}
              onChange={onChange}
              required
            >
              <option value="">Selecciona un tipo</option>
              {typesForHolder.map((type) => (
                <option key={type.id} value={type.id}>{type.label}</option>
              ))}
            </select>
          </div>

          <div className="owner-inline-fields">
            <div className="field">
              <label htmlFor="issued_on">Expedido</label>
              <input id="issued_on" name="issued_on" type="date" value={form.issued_on} onChange={onChange} />
              <p className="hint">Opcional. Al llenarlo se propone el vencimiento un ano despues.</p>
            </div>
            <div className="field">
              <label htmlFor="expires_on">Vence</label>
              <input
                id="expires_on"
                name="expires_on"
                type="date"
                value={form.expires_on}
                onChange={onChange}
                required
              />
            </div>
          </div>

          <div className="owner-inline-fields">
            <div className="field">
              <label htmlFor="number">Numero</label>
              <input id="number" name="number" value={form.number} onChange={onChange} placeholder="Numero de poliza o SOAT" />
            </div>
            <div className="field">
              <label htmlFor="issuer">Expedido por</label>
              <input id="issuer" name="issuer" value={form.issuer} onChange={onChange} placeholder="Aseguradora o CDA" />
            </div>
          </div>

          <div className="field">
            <label htmlFor="notes">Notas</label>
            <textarea id="notes" name="notes" rows={2} value={form.notes} onChange={onChange} />
          </div>

          {/* Available on create as well: the upload endpoint needs a document id,
              so the page holds the chosen file and sends it as soon as the row
              exists. Nobody should have to save, reopen, and attach. */}
          <div className="field">
            <label htmlFor="document_file">Archivo</label>
            {file ? (
              <div className="document-file-row">
                <strong>{file.name}</strong>
                <span className="hint">{formatFileSize(file.size)}</span>
                {onPreviewFile && (
                  <button type="button" className="table-action-button" onClick={onPreviewFile}>
                    Ver
                  </button>
                )}
                {/* A real navigation, not a handler: the signed URL already is the
                    credential, and the disposition that makes it save rather than
                    open is signed into it by the API. */}
                <a
                  className="table-action-button"
                  href={file.download_url || file.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  Descargar
                </a>
                {onRemoveFile && (
                  <button type="button" className="table-action-button" onClick={onRemoveFile}>
                    Quitar
                  </button>
                )}
              </div>
            ) : pendingFile ? (
              <div className="document-file-row">
                <strong>{pendingFile.name}</strong>
                <span className="hint">{formatFileSize(pendingFile.size)}</span>
                <span className="hint">se adjunta al guardar</span>
                {onClearPendingFile && (
                  <button type="button" className="table-action-button" onClick={onClearPendingFile}>
                    Quitar
                  </button>
                )}
              </div>
            ) : (
              <p className="hint">Sin archivo adjunto.</p>
            )}
            <input
              id="document_file"
              type="file"
              accept=".pdf,image/jpeg,image/png,image/webp,image/heic"
              onChange={onFileChange}
              disabled={isUploading}
            />
            <p className="hint">
              {isUploading ? "Subiendo archivo..." : "PDF o foto del documento, hasta 10 MB."}
            </p>
          </div>

          {!isEditing && (
            <p className="hint">
              Para renovar, registra un documento nuevo. El anterior se conserva como
              historial y deja de generar alertas.
            </p>
          )}

          <div className="actions-row">
            <Button type="submit">{isEditing ? "Guardar cambios" : "Guardar documento"}</Button>
            {isEditing && onDelete && (
              <Button type="button" variant="cancel" onClick={onDelete}>
                Eliminar documento
              </Button>
            )}
            <Button type="button" variant="cancel" onClick={onClose}>Cancelar</Button>
          </div>
        </form>
      </section>
    </ModalBackdrop>
  );
}
