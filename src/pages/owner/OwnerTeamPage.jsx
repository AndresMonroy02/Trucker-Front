import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import {
  deleteTeamMember,
  fetchTeamMembers,
  fetchTeamRoles,
  getErrorMessage,
  inviteTeamMember,
  resendTeamInvite,
  updateTeamMember,
} from "../../api";
import Button from "../../components/Button";
import DashboardShell from "../../components/DashboardShell";
import ConfirmModal from "../../components/modals/ConfirmModal";
import MemberInviteModal from "../../components/modals/MemberInviteModal";
import { formatDate } from "../../utils/format";

function emptyInvite(defaultRole) {
  return { username: "", email: "", role: defaultRole || "auxiliar" };
}

export default function OwnerTeamPage({ token, me, onLogout, theme, onToggleTheme }) {
  const [members, setMembers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [form, setForm] = useState(emptyInvite());
  const [removeTarget, setRemoveTarget] = useState(null);

  const load = useCallback(async () => {
    try {
      const [membersResponse, rolesResponse] = await Promise.all([
        fetchTeamMembers(),
        fetchTeamRoles(),
      ]);
      setMembers(membersResponse.data);
      setRoles(rolesResponse.data);
    } catch (err) {
      toast.error(getErrorMessage(err, "No fue posible cargar el equipo."));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const counts = useMemo(() => ({
    active: members.filter((m) => m.is_active && m.account_activated).length,
    pending: members.filter((m) => !m.account_activated).length,
    paused: members.filter((m) => !m.is_active).length,
  }), [members]);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function openInvite() {
    setForm(emptyInvite(roles[0]?.key));
    setIsInviteOpen(true);
  }

  async function handleInvite(event) {
    event.preventDefault();
    try {
      await inviteTeamMember({
        username: form.username.trim(),
        email: form.email.trim(),
        role: form.role,
      });
      toast.success("Invitacion enviada.");
      setIsInviteOpen(false);
      await load();
    } catch (err) {
      toast.error(getErrorMessage(err, "No fue posible enviar la invitacion."));
    }
  }

  async function changeRole(member, role) {
    try {
      await updateTeamMember(member.id, { role, is_active: member.is_active });
      toast.success("Rol actualizado.");
      await load();
    } catch (err) {
      toast.error(getErrorMessage(err, "No fue posible cambiar el rol."));
    }
  }

  async function toggleActive(member) {
    try {
      await updateTeamMember(member.id, { role: member.role, is_active: !member.is_active });
      toast.success(member.is_active ? "Acceso pausado." : "Acceso reactivado.");
      await load();
    } catch (err) {
      toast.error(getErrorMessage(err, "No fue posible cambiar el acceso."));
    }
  }

  async function resend(member) {
    try {
      await resendTeamInvite(member.id);
      toast.success("Invitacion reenviada.");
    } catch (err) {
      toast.error(getErrorMessage(err, "No fue posible reenviar la invitacion."));
    }
  }

  async function confirmRemove() {
    if (!removeTarget) return;
    try {
      await deleteTeamMember(removeTarget.id);
      toast.success("Persona retirada del equipo.");
      setRemoveTarget(null);
      await load();
    } catch (err) {
      toast.error(getErrorMessage(err, "No fue posible retirar a esta persona."));
    }
  }

  return (
    <DashboardShell
      me={me}
      onLogout={onLogout}
      theme={theme}
      onToggleTheme={onToggleTheme}
      title="Equipo"
      subtitle="Quien tiene acceso a los datos de tu empresa"
    >
      <section className="owner-kpi-grid">
        <article className="kpi-card">
          <p className="kpi-label">Activos</p>
          <p className="kpi-value">{counts.active}</p>
          <p className="kpi-hint">Personas que pueden entrar hoy</p>
        </article>
        <article className="kpi-card">
          <p className="kpi-label">Invitaciones pendientes</p>
          <p className="kpi-value">{counts.pending}</p>
          <p className="kpi-hint">Aun no crean su contrasena</p>
        </article>
        <article className="kpi-card">
          <p className="kpi-label">Pausados</p>
          <p className="kpi-value">{counts.paused}</p>
          <p className="kpi-hint">Conservan su historial, sin acceso</p>
        </article>
      </section>

      <section className="panel owner-list-panel">
        <div className="owner-list-header">
          <div>
            <h3>Personas con acceso</h3>
            <p className="hint">
              Cada quien entra con su propio usuario, y el historial registra quien hizo cada cambio
            </p>
          </div>
          <Button type="button" onClick={openInvite}>Invitar persona</Button>
        </div>

        <div className="owner-table-wrap">
          <table className="owner-table">
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Correo</th>
                <th>Rol</th>
                <th>Estado</th>
                <th>Desde</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => {
                const isOwner = member.role === "owner";
                return (
                  <tr key={member.id}>
                    <td>
                      {/* El nombre si lo pusieron, el usuario si no. Una lista de
                          personas donde dice "conductor_uno" no le sirve a nadie. */}
                      {member.full_name || member.username}
                      {member.is_self ? (
                        <span className="status-badge status-badge-inline status-active">Tu</span>
                      ) : null}
                      {member.full_name ? (
                        <small className="hint"> {member.username}</small>
                      ) : null}
                    </td>
                    <td>{member.email}</td>
                    <td>
                      {isOwner || member.is_self ? (
                        member.role_label
                      ) : (
                        <select
                          value={member.role}
                          onChange={(event) => changeRole(member, event.target.value)}
                          aria-label={`Rol de ${member.username}`}
                        >
                          {roles.map((role) => (
                            <option key={role.key} value={role.key}>{role.label}</option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td>
                      {!member.account_activated ? (
                        <span className="status-badge status-pending">Pendiente</span>
                      ) : member.is_active ? (
                        <span className="status-badge status-active">Activo</span>
                      ) : (
                        <span className="status-badge status-cancelled">Pausado</span>
                      )}
                    </td>
                    <td>{formatDate(member.created_at)}</td>
                    <td>
                      <div className="owner-row-actions">
                        {member.is_self || isOwner ? (
                          <span className="hint">—</span>
                        ) : (
                          <>
                            {!member.account_activated ? (
                              <Button type="button" variant="secondary" onClick={() => resend(member)}>
                                Reenviar
                              </Button>
                            ) : null}
                            <Button type="button" variant="secondary" onClick={() => toggleActive(member)}>
                              {member.is_active ? "Pausar" : "Reactivar"}
                            </Button>
                            <Button type="button" variant="cancel" onClick={() => setRemoveTarget(member)}>
                              Retirar
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {members.length === 0 ? (
                <tr>
                  <td colSpan={6}>Todavia no has invitado a nadie.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <MemberInviteModal
        isOpen={isInviteOpen}
        form={form}
        roles={roles}
        onChange={handleChange}
        onSubmit={handleInvite}
        onClose={() => setIsInviteOpen(false)}
      />

      <ConfirmModal
        isOpen={Boolean(removeTarget)}
        title="Retirar del equipo"
        message={
          removeTarget
            ? `${removeTarget.username} perdera el acceso de inmediato. Lo que registro se conserva.`
            : ""
        }
        confirmLabel="Retirar"
        cancelLabel="Cancelar"
        onConfirm={confirmRemove}
        onCancel={() => setRemoveTarget(null)}
      />
    </DashboardShell>
  );
}
