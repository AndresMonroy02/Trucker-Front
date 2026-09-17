import Button from "../Button";
import ModalBackdrop from "../ModalBackdrop";
import { formatFileSize } from "../../utils/format";

/**
 * The attached scan, rendered in the page.
 *
 * Both links are short-lived signed URLs minted by the API, and they differ only
 * in the Content-Disposition signed into them: `url` renders inline, `download_url`
 * saves. That distinction has to come from the server -- the `download` attribute
 * on an anchor is ignored cross-origin, and the bucket is a different origin.
 */
export default function DocumentPreviewModal({
  isOpen,
  document,
  file,
  onClose,
  // What the header says under the filename. Documents describe themselves by
  // type and holder; an inventory or a maintenance passes its own line.
  subtitle,
}) {
  if (!isOpen || !file) return null;

  const isPdf = file.content_type === "application/pdf";
  const isImage = (file.content_type || "").startsWith("image/");

  return (
    <ModalBackdrop onClick={onClose}>
      <section
        className="modal-card modal-card-wide document-preview"
        role="dialog"
        aria-modal="true"
        aria-label={`Vista previa de ${file.name}`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="owner-list-header">
          <div>
            <h3>{file.name}</h3>
            <p className="hint">
              {subtitle ?? (
                <>
                  {document?.document_type?.label}
                  {document?.holder_label ? ` - ${document.holder_label}` : ""}
                </>
              )}
              {" · "}
              {formatFileSize(file.size)}
            </p>
          </div>
        </div>

        <div className="document-preview-frame">
          {/* Never point the viewer at a link that will 404: the browser renders
              the provider's raw XML error, which is meaningless to whoever is
              looking at it. The API tells us the object is gone; say so. */}
          {file.is_missing ? (
            <div className="document-preview-empty">
              <p className="hint-warning">
                El archivo ya no esta en el almacenamiento.
              </p>
              <p className="hint">
                El documento conserva el nombre <strong>{file.name}</strong>, pero el
                archivo fue eliminado del bucket. Adjuntalo de nuevo desde Editar.
              </p>
            </div>
          ) : !file.url ? (
            <div className="document-preview-empty">
              <p className="hint-warning">No fue posible generar el enlace.</p>
              <p className="hint">
                Revisa que el almacenamiento este configurado y vuelve a intentarlo.
              </p>
            </div>
          ) : isImage ? (
            <img src={file.url} alt={file.name} />
          ) : isPdf ? (
            /* An <iframe> rather than <embed>: it degrades to the browser's own
               "cannot display" message instead of a blank rectangle. */
            <iframe src={file.url} title={file.name} />
          ) : (
            <p className="hint">
              Este formato no se puede ver aqui. Descargalo para abrirlo.
            </p>
          )}
        </div>

        <div className="actions-row">
          {/* Plain anchor, not an api call: the signed URL is already the
              credential, and letting the browser navigate keeps the file out of
              the app's memory. Absent entirely when there is nothing to fetch. */}
          {file.url && (
            <a className="button-link" href={file.download_url || file.url} target="_blank" rel="noreferrer">
              Descargar
            </a>
          )}
          <Button type="button" variant="cancel" onClick={onClose}>Cerrar</Button>
        </div>

        {file.url && (
          <p className="hint">
            El enlace vence en unos minutos. Si deja de funcionar, vuelve a abrir esta ventana.
          </p>
        )}
      </section>
    </ModalBackdrop>
  );
}
