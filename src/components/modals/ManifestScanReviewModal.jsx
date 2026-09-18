import { useEffect, useState } from "react";

import Button from "../Button";
import ModalBackdrop from "../ModalBackdrop";
import ManifestFields from "../manifest/ManifestFields";
import { formatFileSize } from "../../utils/format";

/**
 * Revisar un manifiesto leido antes de guardarlo.
 *
 * El documento a la izquierda y los campos a la derecha, para poder comparar sin
 * cambiar de ventana. Nada llega a la base hasta que alguien mira esto y acepta:
 * es lo que hace utilizable un lector que a veces se equivoca.
 *
 * La vista previa sale de un object URL local. No hace falta ninguna URL firmada
 * -- el archivo esta en memoria del navegador y el manifiesto todavia no existe
 * -- y es el mismo patron que AttachmentField usa para un archivo pendiente.
 */
export default function ManifestScanReviewModal({
  isOpen,
  file,
  draft,
  form,
  vehicles,
  drivers,
  companies,
  manifestStatuses,
  onChange,
  onFieldChange,
  onSubmit,
  onClose,
  onRetryWithOcr,
  previewKm = null,
  isSaving = false,
  isRetrying = false,
}) {
  const [previewUrl, setPreviewUrl] = useState(null);

  useEffect(() => {
    if (!isOpen || !file) {
      setPreviewUrl(null);
      return undefined;
    }
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    // Revocado al cerrar o al cambiar de archivo, para no filtrar el blob.
    return () => URL.revokeObjectURL(objectUrl);
  }, [isOpen, file]);

  if (!isOpen || !draft) return null;

  const isPdf = file?.type === "application/pdf";
  const isImage = (file?.type || "").startsWith("image/");
  const needsReview = draft.needs_review || [];
  const readFromPdf = draft.source === "text_layer";
  // Grados que hubo que girar el documento para poder leerlo. Si no se dice, el
  // usuario compara unos campos derechos contra una foto tumbada y no sabe cual
  // de los dos esta mal.
  const rotation = draft.rotation || 0;

  // La placa se leyo pero no coincide con ningun vehiculo de la flota.
  const unmatchedPlate =
    draft.vehicle_plate?.value && !form.vehicle_id ? draft.vehicle_plate.value : null;

  return (
    <ModalBackdrop onClick={onClose}>
      <section
        className="modal-card modal-card-wide manifest-scan-review"
        role="dialog"
        aria-modal="true"
        aria-label="Revisar manifiesto cargado"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="owner-list-header">
          <div>
            <h3>Revisa el manifiesto</h3>
            <p className="hint">
              {readFromPdf
                ? "Leido del PDF original, sin margen de error."
                : "Leido de una imagen, asi que puede haber errores."}
              {needsReview.length > 0
                ? ` Revisa los ${needsReview.length} campos resaltados antes de guardar.`
                : " Todos los campos se leyeron con seguridad."}
            </p>
          </div>
        </div>

        <div className="manifest-scan-grid">
          <div className="manifest-scan-document">
            {rotation > 0 && (
              <p className="hint hint-warning">
                El documento venia girado. Lo leimos girandolo {rotation}°
                {isImage ? " y aqui lo mostramos derecho." : "."}
              </p>
            )}
            {/* Se endereza solo la imagen: un PDF va dentro de un iframe y
                girarlo por CSS deja el visor con las barras cruzadas. */}
            {previewUrl && isImage && (
              <img
                src={previewUrl}
                alt={file.name}
                className={rotation ? `manifest-scan-turn-${rotation}` : undefined}
              />
            )}
            {previewUrl && isPdf && <iframe src={previewUrl} title={file.name} />}
            {previewUrl && !isImage && !isPdf && (
              <p className="hint">Este formato no se puede ver aqui.</p>
            )}
            {file && (
              <p className="hint">
                {file.name} · {formatFileSize(file.size)}
              </p>
            )}
            {/* El manifiesto casi nunca viene solo: llega dentro del paquete del
                despacho, con la remesa y la factura. Decir de que pagina se leyo
                es la diferencia entre "leyo otra cosa" y "leyo la pagina 2". */}
            {draft.pages_read > 1 && (
              <p className="hint hint-warning">
                El archivo tiene {draft.pages_read} paginas. Tomamos los datos de la
                pagina {draft.page_number}, que es la que tiene el manifiesto.
              </p>
            )}
            {/* El PDF traia capa de texto y aun asi salio vacio: el reintento
                forzando OCR es barato y evita el callejon sin salida. */}
            {readFromPdf && needsReview.length > 3 && onRetryWithOcr && (
              <button
                type="button"
                className="table-action-button"
                onClick={onRetryWithOcr}
                disabled={isRetrying}
              >
                {isRetrying ? "Releyendo..." : "Releer como imagen"}
              </button>
            )}
          </div>

          <form className="owner-form manifest-scan-form" onSubmit={onSubmit}>
            <ManifestFields
              form={form}
              vehicles={vehicles}
              drivers={drivers}
              companies={companies}
              manifestStatuses={manifestStatuses}
              onChange={onChange}
              onFieldChange={onFieldChange}
              previewKm={previewKm}
              needsReview={needsReview}
              readings={draft}
              unmatchedPlate={unmatchedPlate}
            />

            <div className="actions-row">
              <Button type="submit" disabled={isSaving}>
                {isSaving ? "Guardando..." : "Guardar manifiesto"}
              </Button>
              <Button type="button" variant="cancel" onClick={onClose} disabled={isSaving}>
                Cancelar
              </Button>
            </div>
            <p className="hint">El documento se adjunta al manifiesto al guardar.</p>
          </form>
        </div>
      </section>
    </ModalBackdrop>
  );
}
