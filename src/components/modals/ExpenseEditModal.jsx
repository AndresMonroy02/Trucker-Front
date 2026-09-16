import ExpenseFormModal from "./ExpenseFormModal";
import ConfirmModal from "./ConfirmModal";

export default function ExpenseEditModal({
  isOpen,
  form,
  manifests,
  suppliers,
  expenseTypes,
  paymentMethods = [],
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
        paymentMethods={paymentMethods}
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
        message="Seguro que quieres eliminar este gasto? Esta accion no se puede deshacer."
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        onConfirm={onConfirmDelete}
        onCancel={onCancelDelete}
      />
    </>
  );
}
