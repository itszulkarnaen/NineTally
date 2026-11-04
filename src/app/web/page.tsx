"use client";

import { useState } from "react";
import { useApp } from "@/context/AppContext";
import { NavTab, ValidationAlertState } from "@/components/web/types";
import { WebSidebar } from "@/components/web/WebSidebar";
import { WebHeader } from "@/components/web/WebHeader";
import { BudgetTab } from "@/components/web/tabs/BudgetTab";
import { RealizationTab } from "@/components/web/tabs/RealizationTab";
import { BankBalanceTab } from "@/components/web/tabs/BankBalanceTab";
import { CashflowItemsTab } from "@/components/web/tabs/CashflowItemsTab";
import { CategoriesTab } from "@/components/web/tabs/CategoriesTab";
import { AssetsTab } from "@/components/web/tabs/AssetsTab";
import { ValidationAlertModal } from "@/components/web/modals/ValidationAlertModal";
import { CashflowUnit } from "@/types";

export default function WebPage() {
  const {
    cashflowUnits,
    selectedMonth,
    setSelectedMonth,
    updateCashflowUnit,
    cloudSyncStatus,
    retryCloudSync,
  } = useApp();

  const [activeTab, setActiveTab] = useState<NavTab>("budget");
  const [globalToast, setGlobalToast] = useState<string | null>(null);
  const [validationAlert, setValidationAlert] = useState<ValidationAlertState | null>(null);

  const handleLogout = async () => {
    if (window.confirm("Yakin mau keluar dari NineTally?")) {
      await fetch("/api/auth/logout", { method: "POST" });
      window.location.href = "/login";
    }
  };

  const handleToggleUnitArchive = async (unit: CashflowUnit) => {
    const res = await updateCashflowUnit(unit.id, { is_active: !unit.is_active });
    if (!res.success) {
      setValidationAlert({
        title: "Gagal Mengubah Status Item",
        message: res.message || "Terjadi kesalahan saat memperbarui status ke database.",
      });
      return;
    }
    if (validationAlert?.suggestArchiveUnitId === unit.id) {
      setValidationAlert(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#E3F2FD] flex text-[#242921]">
      {/* 1. SIDEBAR NAVIGATION */}
      <WebSidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        cloudSyncStatus={cloudSyncStatus}
        retryCloudSync={retryCloudSync}
        onLogout={handleLogout}
      />

      {/* 2. MAIN CONTENT AREA */}
      <main className="flex-1 p-8 overflow-y-auto max-h-screen">
        <div className="max-w-6xl mx-auto space-y-6">
          <WebHeader
            activeTab={activeTab}
            selectedMonth={selectedMonth}
            setSelectedMonth={setSelectedMonth}
            globalToast={globalToast}
          />

          {/* Tab Views */}
          {activeTab === "budget" && <BudgetTab />}
          {activeTab === "realization" && <RealizationTab />}
          {activeTab === "bank-balance" && <BankBalanceTab />}
          {activeTab === "cashflow-items" && (
            <CashflowItemsTab
              setValidationAlert={setValidationAlert}
              setToast={setGlobalToast}
            />
          )}
          {activeTab === "categories" && (
            <CategoriesTab
              setValidationAlert={setValidationAlert}
              setToast={setGlobalToast}
            />
          )}
          {activeTab === "assets" && (
            <AssetsTab
              setValidationAlert={setValidationAlert}
              setToast={setGlobalToast}
            />
          )}
        </div>
      </main>

      {/* Validation & Referential Integrity Modal */}
      <ValidationAlertModal
        validationAlert={validationAlert}
        onClose={() => setValidationAlert(null)}
        cashflowUnits={cashflowUnits}
        onArchiveUnit={handleToggleUnitArchive}
      />
    </div>
  );
}
