import { useState } from "react";

import { AppShell } from "@/components/layout/AppShell";
import { getCurrentAcademicYearId } from "@/data/mockData";
import { LoginPage } from "@/features/auth/LoginPage";
import { ClassDetailPage } from "@/features/classes/ClassDetailPage";
import { HomePage } from "@/features/home/HomePage";

type Screen = "login" | "home" | "class-detail";

function App() {
  const [screen, setScreen] = useState<Screen>("login");
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [selectedYearId, setSelectedYearId] = useState(getCurrentAcademicYearId);

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

  if (screen === "login") {
    return <LoginPage onLogin={() => setScreen("home")} />;
  }

  return (
    <AppShell onLogout={handleLogout}>
      {screen === "class-detail" && selectedClassId ? (
        <ClassDetailPage classId={selectedClassId} onBack={handleBackHome} />
      ) : (
        <HomePage
          selectedYearId={selectedYearId}
          onYearChange={setSelectedYearId}
          onOpenClass={handleOpenClass}
        />
      )}
    </AppShell>
  );
}

export default App;
