// src/components/UserManagement.tsx
import { useEffect, useMemo, useState } from "react";

import { useAuth } from "@/auth/AuthContext";
import { useI18n } from "@/i18n/I18nProvider";

type Role = "admin" | "staff" | "maintenance";
type SimpleUser = { username: string; role: Role };

export default function UserManagement() {
  const { user } = useAuth();
  const { t } = useI18n();

  const [users, setUsers] = useState<SimpleUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<Role>("staff");
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const canManage = user?.role === "admin";

  const canCreate = useMemo(() => {
    return newUsername.trim().length >= 3 && newPassword.length >= 4;
  }, [newUsername, newPassword]);

  const loadUsers = async () => {
    try {
      setLoadingUsers(true);
      const res = await window.api?.listUsers?.();
      if (res?.ok && Array.isArray(res.users)) {
        const list = (res.users as any[]).map(u => ({
          username: String(u.username),
          role: (u.role as Role) ?? "staff",
        }));
        setUsers(list);
      } else {
        window.logger?.warn?.("[users] listUsers failed", res);
      }
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const onCreateUser = async () => {
    if (!canManage || !canCreate || creating) return;
    try {
      setCreating(true);
      const payload = { username: newUsername.trim(), password: newPassword, role: newRole };
      window.logger?.info?.("[users] createUser", { ...payload, password: "***" });
      const res = await window.api?.createUser?.(payload);
      if (!res?.ok) {
        alert(res?.error || t("um_create_failed"));
        return;
      }
      setNewUsername("");
      setNewPassword("");
      setNewRole("staff");
      await loadUsers();
    } finally {
      setCreating(false);
    }
  };

  const onDeleteUser = async (u: SimpleUser) => {
    if (!canManage) return;
    if (u.username === user?.username) {
      alert(t("um_cannot_delete_self"));
      return;
    }
    const ok = confirm(t("um_delete_confirm").replace("{user}", u.username));
    if (!ok) return;
    try {
      setDeleting(u.username);
      const res = await window.api?.deleteUser?.(u.username);
      if (!res?.ok) {
        alert(res?.error || t("um_delete_failed"));
        return;
      }
      await loadUsers();
    } finally {
      setDeleting(null);
    }
  };

  return (
    <section className="p-4 bg-white rounded-2xl border shadow-sm">
      <fieldset className="rounded-xl border p-3">
        <legend className="px-2 text-sm font-semibold">{t("user_mgmt_title")}</legend>

        {!canManage && (
          <div className="mt-2 text-sm rounded-lg border border-amber-200 bg-amber-50 text-amber-900 px-3 py-2">
            {t("um_no_permission")}
          </div>
        )}

        {/* Create user */}
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="text-sm">
            <span className="text-gray-600">{t("username")}</span>
            <input
              className="mt-1 w-full border rounded-lg px-3 py-2"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              placeholder="jdoe"
              disabled={!canManage}
            />
          </label>

          <label className="text-sm">
            <span className="text-gray-600">{t("password")}</span>
            <input
              className="mt-1 w-full border rounded-lg px-3 py-2"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••"
              disabled={!canManage}
            />
          </label>

          <label className="text-sm">
            <span className="text-gray-600">{t("role_label")}</span>
            <select
              className="mt-1 w-full border rounded-lg px-3 py-2"
              value={newRole}
              onChange={(e) => setNewRole(e.target.value as Role)}
              disabled={!canManage}
            >
              <option value="staff">staff</option>
              <option value="maintenance">maintenance</option>
              <option value="admin">admin</option>
            </select>
          </label>

          <div className="flex items-end">
            <button
              onClick={onCreateUser}
              disabled={!canManage || !canCreate || creating}
              className="w-full px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {creating ? t("creating") : t("create_user")}
            </button>
          </div>
        </div>
      </fieldset>

      {/* Users list */}
      <fieldset className="mt-4 rounded-xl border p-3">
        <legend className="px-2 text-sm font-semibold">{t("user_list_title")}</legend>

        <div className="mt-2">
          {loadingUsers ? (
            <div className="text-sm text-gray-500">{t("loading")}</div>
          ) : users.length === 0 ? (
            <div className="text-sm text-gray-500">{t("no_users")}</div>
          ) : (
            <ul className="divide-y">
              {users.map((u) => {
                const isSelf = u.username === user?.username;
                const disabled = !canManage || isSelf || deleting === u.username;
                return (
                  <li key={u.username} className="py-2 flex items-center justify-between">
                    <div className="text-sm">
                      <div className="font-medium">{u.username}</div>
                      <div className="text-gray-500">{u.role.toUpperCase()}</div>
                    </div>
                    <button
                      onClick={() => onDeleteUser(u)}
                      disabled={disabled}
                      className={`px-3 py-1.5 rounded-lg border ${
                        disabled ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-50"
                      }`}
                      title={isSelf ? (t("um_cannot_delete_self") as string) : (t("delete_user") as string)}
                    >
                      {deleting === u.username ? t("deleting") : t("delete_user")}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </fieldset>
    </section>
  );
}
