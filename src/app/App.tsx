import { useState } from "react";

import { AppShell } from "@/components/layout/AppShell";
import {
  type ClassOverview,
  getAllClassOverviews,
  getCurrentAcademicYearId,
} from "@/data/mockData";
import { LoginPage } from "@/features/auth/LoginPage";
import { ClassDetailPage } from "@/features/classes/ClassDetailPage";
import { HomePage } from "@/features/home/HomePage";

type Screen = "login" | "home" | "class-detail";

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

  if (screen === "login") {
    return <LoginPage onLogin={() => setScreen("home")} />;
  }

  return (
    <AppShell onLogout={handleLogout}>
      {screen === "class-detail" && selectedClass ? (
        <ClassDetailPage
          classItem={selectedClass}
          onBack={handleBackHome}
          onClassUpdate={handleUpdateClass}
        />
      ) : (
        <HomePage
          selectedYearId={selectedYearId}
          classOverviews={classOverviews}
          onYearChange={setSelectedYearId}
          onOpenClass={handleOpenClass}
          onCreateClass={handleCreateClass}
        />
      )}
    </AppShell>
  );
}

export default App;
