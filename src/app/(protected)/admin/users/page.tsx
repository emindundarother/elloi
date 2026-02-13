import { toggleUserActiveAction } from "@/app/actions/admin";
import { requireSession } from "@/lib/auth";
import { ROLE_LABELS } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { formatDateTimeTR } from "@/lib/format";

import { AdminUserCreateForm } from "@/components/admin-user-create-form";

export default async function AdminUsersPage() {
  await requireSession("ADMIN");

  const users = await prisma.user.findMany({
    orderBy: [{ role: "desc" }, { username: "asc" }],
    select: {
      id: true,
      username: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Kullanıcı Yönetimi</h1>
        <p className="muted mt-1 text-sm">Kasiyer ve admin hesapları.</p>
      </div>

      <AdminUserCreateForm />

      <section className="panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-4 py-3 font-medium">Kullanıcı</th>
                <th className="px-4 py-3 font-medium">Rol</th>
                <th className="px-4 py-3 font-medium">Oluşturulma</th>
                <th className="px-4 py-3 font-medium">Durum</th>
                <th className="px-4 py-3 font-medium">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-medium">{user.username}</td>
                  <td className="px-4 py-3">{ROLE_LABELS[user.role]}</td>
                  <td className="px-4 py-3">{formatDateTimeTR(user.createdAt)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                        user.isActive
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      {user.isActive ? "Aktif" : "Pasif"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <form action={toggleUserActiveAction.bind(null, user.id, !user.isActive)}>
                      <button
                        type="submit"
                        className="h-9 rounded-lg border border-slate-300 px-3 text-xs font-semibold"
                      >
                        {user.isActive ? "Pasife Al" : "Aktifleştir"}
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
