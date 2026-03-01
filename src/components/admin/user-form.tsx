"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Dialog } from "@/components/ui/dialog";
import { useTranslation } from "@/i18n/config";

interface UserData {
  id?: string;
  email: string;
  password: string;
  role: string;
}

interface UserFormProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: UserData) => Promise<void>;
  user?: { id: string; email: string; role: string } | null;
}

export function UserForm({ open, onClose, onSave, user }: UserFormProps) {
  const [data, setData] = useState<UserData>({
    email: "",
    password: "",
    role: "ADMIN",
  });
  const [saving, setSaving] = useState(false);
  const t = useTranslation();

  useEffect(() => {
    if (user) {
      setData({ email: user.email, password: "", role: user.role, id: user.id });
    } else {
      setData({ email: "", password: "", role: "ADMIN" });
    }
  }, [user, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await onSave(data);
    setSaving(false);
    onClose();
  };

  const roleOptions = [
    { value: "ADMIN", label: t.users.roles.ADMIN },
    { value: "SUPER_ADMIN", label: t.users.roles.SUPER_ADMIN },
  ];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={user ? t.users.editUser : t.users.addUser}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          id="email"
          type="email"
          label={t.users.email}
          value={data.email}
          onChange={(e) => setData({ ...data, email: e.target.value })}
          required
        />

        <Input
          id="password"
          type="password"
          label={t.users.password}
          value={data.password}
          onChange={(e) => setData({ ...data, password: e.target.value })}
          required={!user}
          placeholder={user ? "Leer lassen für keine Änderung" : ""}
        />
        <p className="text-xs text-muted-foreground -mt-2">{t.users.passwordHint}</p>

        <Select
          id="role"
          label={t.users.role}
          options={roleOptions}
          value={data.role}
          onChange={(e) => setData({ ...data, role: e.target.value })}
        />

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            {t.common.cancel}
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? t.common.loading : t.common.save}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
