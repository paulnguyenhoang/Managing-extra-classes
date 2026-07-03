import { useState } from "react";

import { AppShell } from "@/components/layout/AppShell";
import type { SidebarScreen } from "@/components/layout/Sidebar";
import {
  type ClassOverview,
  getAllClassOverviews,
  getCurrentAcademicYearId,
} from "@/data/mockData";
import { LoginPage } from "@/features/auth/LoginPage";
import { BackupPage } from "@/features/backup/BackupPage";
import { ClassDetailPage } from "@/features/classes/ClassDetailPage";
import { HomePage } from "@/features/home/HomePage";
import { SchedulePage } from "@/features/schedule/SchedulePage";
import { SettingsPage } from "@/features/settings/SettingsPage";
import { TuitionDashboardPage } from "@/features/tuition-dashboard/TuitionDashboardPage";

type Screen = "login" | "class-detail" | SidebarScreen;

function App() {
  const [screen, setScreen] = useState<Screen>("login");
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [selectedYearId, setSelectedYearId] = useState(getCurrentAcademicYearId);
  const [classOverviews, setClassOverviews] = useState(getAllClassOverviews);
  const selectedClass = classOverviews.find((classItem) => classItem.id === selectedClassId);

  function handleOpenClass(classId: string) {
    setSelectedClassId(classId);
    setScreen("class-detail");
  }

  function handleBackHome() {
    setSelectedClassId(null);
    setScreen("home");
  }

  function handleNavigate(nextScreen: SidebarScreen) {
    setSelectedClassId(null);
    setScreen(nextScreen);
  }

  function handleLogout() {
    setSelectedClassId(null);
    setScreen("login");
  }

  function handleCreateClass(classItem: ClassOverview) {
    setClassOverviews((current) => [...current, classItem]);
  }

  function handleUpdateClass(classId: string, updates: Partial<ClassOverview>) {
    setClassOverviews((current) =>
      current.map((classItem) =>
        classItem.id === classId ? { ...classItem, ...updates } : classItem,
      ),
    );
  }

  function renderCurrentScreen() {
    if (screen === "class-detail" && selectedClass) {
      return (
        <ClassDetailPage
          classItem={selectedClass}
          onBack={handleBackHome}
          onClassUpdate={handleUpdateClass}
        />
      );
    }

    if (screen === "schedule") {
      return <SchedulePage />;
    }

    if (screen === "tuition-dashboard") {
      return <TuitionDashboardPage />;
    }

    if (screen === "backup") {
      return <BackupPage />;
    }

    if (screen === "settings") {
      return <SettingsPage />;
    }

    return (
      <HomePage
        selectedYearId={selectedYearId}
        classOverviews={classOverviews}
        onYearChange={setSelectedYearId}
        onOpenClass={handleOpenClass}
        onCreateClass={handleCreateClass}
      />
    );
  }

  if (screen === "login") {
    return <LoginPage onLogin={() => setScreen("home")} />;
  }

  const activeSidebarScreen: SidebarScreen = screen === "class-detail" ? "home" : screen;

  return (
    <AppShell
      activeScreen={activeSidebarScreen}
      onNavigate={handleNavigate}
      onLogout={handleLogout}
    >
      {renderCurrentScreen()}
    </AppShell>
  );
}

export default App;
