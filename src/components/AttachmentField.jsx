import { useEffect, useState } from "react";

import { formatFileSize } from "../utils/format";

/**
 * The one optional file a row can carry.
 *
 * Three forms now show this exact block -- an inventory's photo, a maintenance's
 * invoice, a vehicle's photo -- so it lives here rather than being copied a third
 * and fourth time out of DocumentFormModal.
 *
 * It is available on create as well as edit: the upload endpoint needs a row id,
 * so the page holds the chosen file in `pendingFile` and sends it the moment the
 * row exists. Nobody should have to save, reopen, and attach.
 *
 * `preview` turns on a thumbnail. A scan is a filename and a link -- nobody reads
 * a PDF at 90px -- but a truck's photo is only meaningful if you can see it, both
 * the one already saved and the one just picked.
 */
export default function AttachmentField({
  id,
  label = "Archivo",
  // The file already recorded on the row: {name, size, url, download_url, is_missing}.
  file = null,
  // A browser File chosen before the row exists.
  pendingFile = null,
  isUploading = false,
  accept = ".pdf,image/jpeg,image/png,image/webp,image/heic",
  hint = "PDF o foto, hasta 10 MB.",
  onFileChange,
  onRemoveFile,
  onClearPendingFile,
  onPreviewFile,
  preview = false,
}) {
  // The picked file lives only in the browser, so showing it before it is
  // uploaded means an object URL -- revoked on change so it does not leak.
  const [pendingUrl, setPendingUrl] = useState(null);

  useEffect(() => {
    if (!preview || !pendingFile) {
      setPendingUrl(null);
      return undefined;
    }
    const objectUrl = URL.createObjectURL(pendingFile);
    setPendingUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [preview, pendingFile]);

  const thumbnail = preview ? pendingUrl || (!file?.is_missing && file?.url) || null : null;

  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {thumbnail && (
        <img className="attachment-thumb" src={thumbnail} alt={label} />
      )}
      {file ? (
        <div className="document-file-row">
          <strong>{file.name}</strong>
          <span className="hint">{formatFileSize(file.size)}</span>
          {file.is_missing && (
            <span className="hint hint-warning">el archivo ya no esta disponible</span>
          )}
          {onPreviewFile && !file.is_missing && (
            <button type="button" className="table-action-button" onClick={onPreviewFile}>
              Ver
            </button>
          )}
          {/* A real navigation, not a handler: the signed URL already is the
              credential, and the disposition that makes it save rather than open
              is signed into it by the API. */}
          {(file.download_url || file.url) && (
            <a
              className="table-action-button"
              href={file.download_url || file.url}
              target="_blank"
              rel="noreferrer"
            >
              Descargar
            </a>
          )}
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
      <input id={id} type="file" accept={accept} onChange={onFileChange} disabled={isUploading} />
      <p className="hint">{isUploading ? "Subiendo archivo..." : hint}</p>
    </div>
  );
}
