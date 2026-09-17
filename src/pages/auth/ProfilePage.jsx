import { useState } from "react";
import { toast } from "sonner";

import { api, getErrorMessage } from "../../api";
import { useAccess } from "../../access";
import Button from "../../components/Button";
import DashboardShell from "../../components/DashboardShell";

const EMPTY_PASSWORD_FORM = {
  current_password: "",
  new_password: "",
  confirm_password: "",
};

export default function ProfilePage({ me, onLogout, onProfileSaved, theme, onToggleTheme }) {
  if (!me) {
    return (
      <DashboardShell
        me={me}
        onLogout={onLogout}
        theme={theme}
        onToggleTheme={onToggleTheme}
        title="Perfil"
        subtitle="Cargando datos del perfil..."
      >
        <section className="panel">
          <p className="hint">Cargando perfil...</p>
        </section>
      </DashboardShell>
    );
  }

  /* `key` en vez de un efecto que copie `me` al formulario.
     Con el efecto habia un fotograma con los campos vacios: el formulario se
     sembraba DESPUES del primer pintado, y en ese hueco `form.username` ("") no
     coincidia con `me.username`, asi que la pantalla pedia la contrasena actual
     sin que nadie hubiera tocado nada. Sembrar el estado en el montaje no tiene
     ese hueco. */
  return <ProfileForm key={me.id} {...{ me, onLogout, onProfileSaved, theme, onToggleTheme }} />;
}

function ProfileForm({ me, onLogout, onProfileSaved, theme, onToggleTheme }) {
  const access = useAccess();

  const [form, setForm] = useState(() => ({
    full_name: me.full_name || "",
    username: me.username || "",
    email: me.email || "",
    current_password: "",
  }));
  const [passwordForm, setPasswordForm] = useState(EMPTY_PASSWORD_FORM);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  /* El usuario y el correo son las dos formas de iniciar sesion, asi que el
     backend pide la contrasena para moverlos. Se calcula aqui tambien, pero solo
     para decirlo antes de que rebote: quien manda es el servidor, que es el
     unico que ve lo que hay guardado. */
  const identityChanged = form.username !== me.username || form.email !== me.email;

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  }

  function handlePasswordChange(event) {
    const { name, value } = event.target;
    setPasswordForm((previous) => ({ ...previous, [name]: value }));
  }

  async function submitProfile(event) {
    event.preventDefault();
    if (identityChanged && !form.current_password) {
      toast.error("Escribe tu contrasena actual para cambiar el usuario o el correo.");
      return;
    }

    setSavingProfile(true);
    try {
      const { data } = await api.put("/users/me", {
        full_name: form.full_name.trim() || null,
        username: form.username.trim(),
        email: form.email.trim(),
        current_password: form.current_password || null,
      });
      /* El token trae el usuario nuevo dentro. Si cambio y no se reemplaza, la
         siguiente peticion sale con un token que nombra a alguien que ya no
         existe con ese nombre: 401 y sesion caida por guardar el perfil. */
      onProfileSaved?.(data.user, data.access_token);
      setForm((previous) => ({ ...previous, current_password: "" }));
      toast.success(
        data.access_token
          ? "Perfil actualizado. Tu usuario de acceso cambio."
          : "Perfil actualizado."
      );
    } catch (err) {
      toast.error(getErrorMessage(err, "No fue posible guardar el perfil."));
    } finally {
      setSavingProfile(false);
    }
  }

  async function submitPassword(event) {
    event.preventDefault();
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      toast.error("La confirmacion no coincide con la contrasena nueva.");
      return;
    }

    setSavingPassword(true);
    try {
      await api.post("/users/me/password", {
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password,
      });
      setPasswordForm(EMPTY_PASSWORD_FORM);
      /* Sin cierre de sesion a proposito: el sujeto del token es el usuario, que
         esto no toca. Echar a alguien por rotar su contrasena le ensena a no
         rotarla. */
      toast.success("Contrasena actualizada.");
    } catch (err) {
      toast.error(getErrorMessage(err, "No fue posible cambiar la contrasena."));
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <DashboardShell
      me={me}
      onLogout={onLogout}
      theme={theme}
      onToggleTheme={onToggleTheme}
      title="Perfil"
      subtitle="Tu cuenta y como entras a ella"
    >
      <section className="panel profile-page-panel">
        <div>
          <h3>Datos de perfil</h3>
          <p className="hint">
            El nombre es como te ven los demas. El usuario y el correo son con lo que entras.
          </p>
        </div>

        <form className="profile-form" onSubmit={submitProfile}>
          <div className="field">
            <label htmlFor="full_name">Nombre</label>
            <input
              id="full_name"
              name="full_name"
              value={form.full_name}
              onChange={handleChange}
              maxLength={120}
              placeholder="Como quieres que te llamen"
            />
          </div>

          <div className="field">
            <label htmlFor="username">Usuario</label>
            <input
              id="username"
              name="username"
              value={form.username}
              onChange={handleChange}
              minLength={3}
              maxLength={50}
              required
            />
          </div>

          <div className="field profile-form-full">
            <label htmlFor="email">Correo</label>
            <input
              id="email"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              required
            />
          </div>

          {identityChanged ? (
            <div className="field profile-form-full">
              <label htmlFor="current_password">Contrasena actual</label>
              <input
                id="current_password"
                name="current_password"
                type="password"
                value={form.current_password}
                onChange={handleChange}
                autoComplete="current-password"
                required
              />
              <small className="hint">
                Cambiar el usuario o el correo cambia la forma de entrar a la cuenta, asi que
                hace falta la contrasena y no solo la sesion abierta.
              </small>
            </div>
          ) : null}

          <div className="actions-row profile-form-full">
            <Button type="submit" disabled={savingProfile}>
              {savingProfile ? "Guardando..." : "Guardar cambios"}
            </Button>
          </div>
        </form>

        <div className="profile-grid">
          <div>
            <span className="profile-label">Rol</span>
            {/* El rol de la cuenta (Propietario, Contador...), no el crudo
                "owner_profile" que salia antes. */}
            <strong>{access.roleLabel || "Sin perfil"}</strong>
          </div>
          <div>
            <span className="profile-label">Estado</span>
            {/* Leido, no escrito a mano. Antes decia "Activo" pasara lo que
                pasara, que es la clase de dato que se cree sin mirar. */}
            <strong>{me.is_active ? "Activa" : "Pendiente de activar"}</strong>
          </div>
        </div>
      </section>

      <section className="panel profile-page-panel">
        <div>
          <h3>Cambiar contrasena</h3>
          <p className="hint">
            Las demas sesiones que tengas abiertas siguen activas hasta que venzan solas.
          </p>
        </div>

        <form className="profile-form" onSubmit={submitPassword}>
          <div className="field profile-form-full">
            <label htmlFor="password_current">Contrasena actual</label>
            <input
              id="password_current"
              name="current_password"
              type="password"
              value={passwordForm.current_password}
              onChange={handlePasswordChange}
              autoComplete="current-password"
              required
            />
          </div>

          <div className="field">
            <label htmlFor="password_new">Contrasena nueva</label>
            <input
              id="password_new"
              name="new_password"
              type="password"
              value={passwordForm.new_password}
              onChange={handlePasswordChange}
              autoComplete="new-password"
              minLength={8}
              required
            />
          </div>

          <div className="field">
            <label htmlFor="password_confirm">Confirmar contrasena</label>
            <input
              id="password_confirm"
              name="confirm_password"
              type="password"
              value={passwordForm.confirm_password}
              onChange={handlePasswordChange}
              autoComplete="new-password"
              minLength={8}
              required
            />
          </div>

          <div className="actions-row profile-form-full">
            <Button type="submit" disabled={savingPassword}>
              {savingPassword ? "Cambiando..." : "Cambiar contrasena"}
            </Button>
          </div>
        </form>
      </section>
    </DashboardShell>
  );
}
