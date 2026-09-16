import Button from "../Button";
import ModalBackdrop from "../ModalBackdrop";

/**
 * Inviting somebody into the account.
 *
 * The roles come from the API, each with the screens it opens, so the picker
 * explains itself from the permissions registry -- add a screen there and the
 * explanation here updates on its own.
 */
export default function MemberInviteModal({ isOpen, form, roles, onChange, onSubmit, onClose }) {
  if (!isOpen) return null;

  const selected = roles.find((role) => role.key === form.role);

  return (
    <ModalBackdrop onClick={onClose}>
      <section
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-label="Invitar a alguien al equipo"
        onClick={(event) => event.stopPropagation()}
      >
        <h3>Invitar al equipo</h3>
        <p className="hint">
          Le enviamos un correo para que cree su propia contrasena. Nadie mas comparte la tuya.
        </p>

        <form className="owner-form" onSubmit={onSubmit}>
          <div className="owner-inline-fields">
            <div className="field">
              <label htmlFor="member_username">Usuario</label>
              <input
                id="member_username"
                name="username"
                value={form.username}
                onChange={onChange}
                placeholder="laura"
                required
              />
            </div>
            <div className="field">
              <label htmlFor="member_email">Correo</label>
              <input
                id="member_email"
                name="email"
                type="email"
                value={form.email}
                onChange={onChange}
                placeholder="laura@empresa.com"
                required
              />
            </div>
          </div>

          <div className="field">
            <label htmlFor="member_role">Rol</label>
            <select id="member_role" name="role" value={form.role} onChange={onChange} required>
              {roles.map((role) => (
                <option key={role.key} value={role.key}>{role.label}</option>
              ))}
            </select>
            {selected ? (
              <div className="role-preview">
                <p className="hint">{selected.description}</p>
                <p className="role-preview-screens">
                  <strong>Puede entrar a:</strong> {selected.screens.join(", ")}
                </p>
              </div>
            ) : null}
          </div>

          <div className="actions-row">
            <Button type="submit">Enviar invitacion</Button>
            <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          </div>
        </form>
      </section>
    </ModalBackdrop>
  );
}
