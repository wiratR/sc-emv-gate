// src/pages/Settings.tsx
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import LogSettings from "@/components/LogSettings";
import UserManagement from "@/components/UserManagement";
import { useI18n } from "@/i18n/I18nProvider";

export default function Settings() {
  const { t } = useI18n();

  return (
    <div className="min-h-screen bg-white">
      <Header />

      <main className="mx-auto max-w-7xl p-6">
        <h1 className="text-2xl font-semibold">{t("settings_title")}</h1>
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* LEFT: Log settings (moved to its own component) */}
          <LogSettings />
          {/* RIGHT: User management */}
          <UserManagement />
        </div>
      </main>

      <Footer />
    </div>
  );
}
