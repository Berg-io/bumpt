"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Users, ShieldCheck, Shield, KeyRound, Globe } from "lucide-react";
import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { UserForm } from "@/components/admin/user-form";
import { useTranslation, useLocale, useDateSettings } from "@/i18n/config";
import { formatAppDate } from "@/lib/format-date";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/hooks/use-auth";

interface UserItem {
  id: string;
  email: string;
  role: string;
  authType: string;
  createdAt: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editUser, setEditUser] = useState<UserItem | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { user: authUser } = useAuth();
  const t = useTranslation();
  const { locale } = useLocale();
  const dateSettings = useDateSettings();
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    if (authUser && authUser.role !== "SUPER_ADMIN") {
      router.push("/dashboard");
    }
  }, [authUser, router]);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/users");
      if (res.ok) {
        const data = await res.json();
        setUsers(data.data);
      } else if (res.status === 403) {
        router.push("/dashboard");
      }
    } catch {
      toast("Fehler beim Laden", "error");
    } finally {
      setLoading(false);
    }
  }, [toast, router]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleSave = async (data: { id?: string; email: string; password: string; role: string }) => {
    try {
      const isEdit = !!editUser;
      const url = isEdit ? `/api/users/${editUser!.id}` : "/api/users";
      const method = isEdit ? "PUT" : "POST";

      const body: Record<string, string> = { email: data.email, role: data.role };
      if (data.password) body.password = data.password;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        toast(isEdit ? "Benutzer aktualisiert" : "Benutzer erstellt", "success");
        fetchUsers();
      } else {
        const err = await res.json();
        toast(err.error || "Error", "error");
      }
    } catch {
      toast("Netzwerkfehler", "error");
    }
    setEditUser(null);
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    if (authUser?.id === deleteId) {
      toast(t.users.cannotDeleteSelf, "error");
      setDeleteId(null);
      return;
    }

    try {
      const res = await fetch(`/api/users/${deleteId}`, { method: "DELETE" });
      if (res.ok) {
        toast("User deleted", "success");
        fetchUsers();
      } else {
        const err = await res.json();
        toast(err.error || "Error", "error");
      }
    } catch {
      toast("Netzwerkfehler", "error");
    }
    setDeleteId(null);
  };

  const formatDate = (dateStr: string) => {
    return formatAppDate(dateStr, dateSettings, "date");
  };

  if (authUser && authUser.role !== "SUPER_ADMIN") {
    return null;
  }

  return (
    <>
      <Header
        title={t.users.title}
        actions={
          <Button onClick={() => { setEditUser(null); setFormOpen(true); }} size="sm">
            <Plus className="h-4 w-4 mr-1" />
            {t.users.addUser}
          </Button>
        }
      />

      <div className="flex-1 p-4 lg:p-8">
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
            ) : users.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Users className="h-12 w-12 mb-3 opacity-50" />
                <p>{t.common.noData}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b text-left text-sm text-muted-foreground">
                      <th className="p-4 font-medium">{t.users.email}</th>
                      <th className="p-4 font-medium">{t.users.role}</th>
                      <th className="p-4 font-medium hidden md:table-cell">{t.users.authType}</th>
                      <th className="p-4 font-medium hidden sm:table-cell">{t.users.createdAt}</th>
                      <th className="p-4 font-medium text-right">{t.common.actions}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            {u.role === "SUPER_ADMIN" ? (
                              <ShieldCheck className="h-4 w-4 text-primary" />
                            ) : (
                              <Shield className="h-4 w-4 text-muted-foreground" />
                            )}
                            <span className="font-medium">{u.email}</span>
                            {authUser?.id === u.id && (
                              <Badge variant="outline" className="text-xs">Du</Badge>
                            )}
                          </div>
                        </td>
                        <td className="p-4">
                          <Badge variant={u.role === "SUPER_ADMIN" ? "default" : "outline"}>
                            {t.users.roles[u.role as keyof typeof t.users.roles] || u.role}
                          </Badge>
                        </td>
                        <td className="p-4 hidden md:table-cell">
                          <Badge variant="outline" className={u.authType === "saml" ? "border-blue-500/50 text-blue-600 dark:text-blue-400" : ""}>
                            {u.authType === "saml" ? (
                              <Globe className="h-3 w-3 mr-1" />
                            ) : (
                              <KeyRound className="h-3 w-3 mr-1" />
                            )}
                            {t.users.authTypes[u.authType as keyof typeof t.users.authTypes] || u.authType}
                          </Badge>
                        </td>
                        <td className="p-4 hidden sm:table-cell text-sm text-muted-foreground">
                          {formatDate(u.createdAt)}
                        </td>
                        <td className="p-4">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => { setEditUser(u); setFormOpen(true); }}
                              title={t.common.edit}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeleteId(u.id)}
                              disabled={authUser?.id === u.id}
                              title={t.common.delete}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <UserForm
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditUser(null); }}
        onSave={handleSave}
        user={editUser}
      />

      <Dialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        title={t.users.deleteUser}
      >
        <p className="text-sm text-muted-foreground mb-4">
          {t.users.deleteConfirm}
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setDeleteId(null)}>
            {t.common.cancel}
          </Button>
          <Button variant="outline" className="text-destructive border-destructive/40 hover:bg-destructive/10" onClick={handleDelete}>
            {t.common.delete}
          </Button>
        </div>
      </Dialog>
    </>
  );
}
