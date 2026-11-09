import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { FormAlert } from '@/components/forms/FormAlert';
import { Button } from '@/components/ui/Button';
import { ADMIN_ROUTES } from '@/config/adminRoutes';
import { useAuth } from '@/hooks/useAuth';

export function AdminUserMenu() {
  const { admin, logout } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  if (!admin) {
    return null;
  }

  async function onLogout() {
    setBusy(true);
    setNotice(null);
    const result = await logout();
    setBusy(false);
    if (!result.serverInvalidated) {
      setNotice(result.message);
      // Still leave admin area after local clear.
      window.setTimeout(() => {
        void navigate(ADMIN_ROUTES.login, { replace: true });
      }, 1200);
      return;
    }
    void navigate(ADMIN_ROUTES.login, { replace: true });
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="text-right">
        <p className="font-sans text-body-sm font-medium text-primary">
          {admin.firstName} {admin.lastName}
        </p>
        <p className="font-sans text-caption text-on-surface-variant">
          Admin · {admin.email}
        </p>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="md"
        onClick={() => void onLogout()}
        isLoading={busy}
      >
        Sign out
      </Button>
      {notice ? <FormAlert tone="info">{notice}</FormAlert> : null}
    </div>
  );
}
