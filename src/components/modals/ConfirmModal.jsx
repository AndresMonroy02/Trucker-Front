import Button from "../Button";

export default function ConfirmModal({
  isOpen,
  title = "Confirmar accion",
  message,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  onConfirm,
  onCancel,
}) {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" role="presentation" onClick={onCancel}>
      <section
        className="modal-card"
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
      >
        <h3>{title}</h3>
        <p>{message}</p>
        <div className="actions-row">
          <Button type="button" variant="cancel" onClick={onConfirm}>
            {confirmLabel}
          </Button>
          <Button type="button" onClick={onCancel}>
            {cancelLabel}
          </Button>
        </div>
      </section>
    </div>
  );
}
