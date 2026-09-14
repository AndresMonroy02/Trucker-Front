import Button from "../Button";

export default function DriverFormModal({
  isOpen,
  form,
  driverStatuses,
  driverAccounts = [],
  onChange,
  onSubmit,
  onClose,
  onDelete,
  onSendInvite,
  canResendInvite = false,
  isEditing = false,
}) {
  if (!isOpen) return null;

  const hasExistingAccount = Boolean(form.user_id);
  const isCreatingNewAccount = !isEditing && form.account_mode === "new";

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <section
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-label={isEditing ? "Editar conductor" : "Crear conductor"}
        onClick={(event) => event.stopPropagation()}
      >
        <h3>{isEditing ? "Editar conductor" : "Nuevo conductor"}</h3>
        <form className="owner-form" onSubmit={onSubmit}>
          <div className="field">
            <label htmlFor="driver_name">Nombre</label>
            <input id="driver_name" name="name" value={form.name} onChange={onChange} required />
          </div>

          <div className="owner-inline-fields">
            <div className="field">
              <label htmlFor="license">Licencia</label>
              <input id="license" name="license" value={form.license} onChange={onChange} required />
            </div>
            <div className="field">
              <label htmlFor="phone">Telefono</label>
              <input id="phone" name="phone" type="tel" value={form.phone} onChange={onChange} required />
            </div>
          </div>

          <div className="field">
            <label htmlFor="driver_status_id">Estado</label>
            <select id="driver_status_id" name="status_id" value={form.status_id} onChange={onChange} required>
              <option value="">Selecciona un estado</option>
              {driverStatuses.map((driverStatus) => (
                <option key={driverStatus.id} value={driverStatus.id}>
                  {driverStatus.label}
                </option>
              ))}
            </select>
          </div>

          {!isEditing && (
            <>
              <div className="field">
                <label htmlFor="account_mode">Cuenta de conductor</label>
                <select id="account_mode" name="account_mode" value={form.account_mode} onChange={onChange}>
                  <option value="new">Crear cuenta nueva e invitar</option>
                  <option value="existing">Vincular cuenta existente</option>
                </select>
              </div>

              {form.account_mode === "existing" && (
                <div className="field">
                  <label htmlFor="driver_user_id">Selecciona la cuenta</label>
                  <select id="driver_user_id" name="user_id" value={form.user_id} onChange={onChange}>
                    <option value="">Selecciona una cuenta</option>
                    {driverAccounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.username} ({account.email})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </>
          )}

          {isEditing && (
            <div className="field">
              <label>Cuenta de conductor</label>
              <p className="hint">
                {!hasExistingAccount
                  ? "Este conductor no tiene una cuenta vinculada."
                  : canResendInvite
                    ? "La cuenta aun no ha sido activada. Puedes reenviar la invitacion."
                    : "La cuenta ya esta activada."}
              </p>
            </div>
          )}

          {isCreatingNewAccount && (
            <>
              <div className="owner-inline-fields">
                <div className="field">
                  <label htmlFor="account_username">Usuario</label>
                  <input
                    id="account_username"
                    name="account_username"
                    value={form.account_username}
                    onChange={onChange}
                    pattern="\S{3,}"
                    title="Sin espacios, minimo 3 caracteres"
                    placeholder="sin espacios"
                    required
                  />
                </div>
                <div className="field">
                  <label htmlFor="account_email">Correo</label>
                  <input
                    id="account_email"
                    name="account_email"
                    type="email"
                    value={form.account_email}
                    onChange={onChange}
                    required
                  />
                </div>
              </div>
              <p className="hint">
                Se enviara un enlace al correo para que el conductor configure su contrasena.
                El enlace vence en 7 dias y solo puede usarse una vez.
              </p>
            </>
          )}

          <div className="actions-row">
            <Button type="submit">{isEditing ? "Guardar cambios" : "Guardar conductor"}</Button>
            {isEditing && hasExistingAccount && canResendInvite && onSendInvite && (
              <Button type="button" variant="secondary" onClick={onSendInvite}>
                Reenviar invitacion
              </Button>
            )}
            {isEditing && onDelete && (
              <Button type="button" variant="cancel" onClick={onDelete}>
                Eliminar conductor
              </Button>
            )}
            <Button type="button" variant="cancel" onClick={onClose}>
              Cancelar
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}