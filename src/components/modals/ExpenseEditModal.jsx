import ExpenseFormModal from "./ExpenseFormModal";
import ConfirmModal from "./ConfirmModal";

export default function ExpenseEditModal({
  isOpen,
  form,
  manifests,
  suppliers,
  expenseTypes,
  onChange,
  onSubmit,
  onClose,
  onDelete,
  isDeleteConfirmOpen,
  onConfirmDelete,
  onCancelDelete,
}) {
  return (
    <>
      <ExpenseFormModal
        isOpen={isOpen}
        form={form}
        expenses={[]}
        editingIndex={null}
        manifests={manifests}
        suppliers={suppliers}
        expenseTypes={expenseTypes}
        onChange={onChange}
        onSubmit={onSubmit}
        onClose={onClose}
        onAdd={() => undefined}
        onEdit={() => undefined}
        onRemove={() => undefined}
        onDelete={onDelete}
        isEditingExisting
      />

      <ConfirmModal
        isOpen={isDeleteConfirmOpen}
        title="Eliminar gasto"
        message="¿Está seguro de eliminar este gasto? Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        onConfirm={onConfirmDelete}
        onCancel={onCancelDelete}
      />
    </>
  );
}
