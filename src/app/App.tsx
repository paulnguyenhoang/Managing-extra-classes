import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";

import { AppShell } from "@/components/layout/AppShell";
import type { SidebarScreen } from "@/components/layout/Sidebar";
import { LoginPage } from "@/features/auth/LoginPage";
import { BackupPage } from "@/features/backup/BackupPage";
import { ClassDetailPage } from "@/features/classes/ClassDetailPage";
import { HomePage } from "@/features/home/HomePage";
import { SchedulePage } from "@/features/schedule/SchedulePage";
import { SettingsPage } from "@/features/settings/SettingsPage";
import { TuitionDashboardPage } from "@/features/tuition-dashboard/TuitionDashboardPage";
import {
  getCurrentAcademicYearId,
  listAcademicYears,
  setCurrentAcademicYear,
} from "@/services/academicYearApi";
import {
  createClass,
  listClassOverviewsByYear,
} from "@/services/classApi";
import type { AcademicYear } from "@/types/academic-year";
import type { ClassGrade, ClassOverview, CreateClassInput } from "@/types/class";

type Screen = "login" | "class-detail" | SidebarScreen;

type DatabaseReadyStatus = {
  ready: boolean;
  database_path: string;
  applied_migrations: string[];
};

function App() {
  const [screen, setScreen] = useState<Screen>("login");
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [selectedYearId, setSelectedYearId] = useState<number | null>(null);
  const [selectedGrade, setSelectedGrade] = useState<ClassGrade | null>(null);
  const [classOverviews, setClassOverviews] = useState<ClassOverview[]>([]);
  const [isSchoolDataLoading, setIsSchoolDataLoading] = useState(false);
  const [hasLoadedSchoolData, setHasLoadedSchoolData] = useState(false);
  const [schoolDataError, setSchoolDataError] = useState("");
  const selectedClass = classOverviews.find((classItem) => classItem.id === selectedClassId);

  useEffect(() => {
    if (!import.meta.env.DEV) {
      return;
    }

    invoke<DatabaseReadyStatus>("check_database_ready")
      .then((status) => {
        console.info("[database] ready", status);
      })
      .catch((error) => {
        console.warn("[database] readiness check failed", error);
      });
  }, []);

  useEffect(() => {
    if (
      screen === "login" ||
      hasLoadedSchoolData ||
      academicYears.length > 0 ||
      isSchoolDataLoading
    ) {
      return;
    }

    void loadInitialSchoolData();
  }, [academicYears.length, hasLoadedSchoolData, isSchoolDataLoading, screen]);

  async function loadInitialSchoolData() {
    setIsSchoolDataLoading(true);
    setSchoolDataError("");

    try {
      const [years, currentYearId] = await Promise.all([
        listAcademicYears(),
        getCurrentAcademicYearId(),
      ]);
      const nextYearId = currentYearId || years[0]?.id || null;

      setAcademicYears(years);
      setSelectedYearId(nextYearId);

      if (nextYearId !== null) {
        setClassOverviews(await listClassOverviewsByYear(nextYearId));
      } else {
        setClassOverviews([]);
      }
    } catch (error) {
      console.warn("[school-data] load failed", error);
      setSchoolDataError("Không tải được dữ liệu năm học và lớp học từ database.");
    } finally {
      setHasLoadedSchoolData(true);
      setIsSchoolDataLoading(false);
    }
  }

  async function loadClassesForYear(yearId: number | null) {
    if (yearId === null) {
      setClassOverviews([]);
      return;
    }

    setIsSchoolDataLoading(true);
    setSchoolDataError("");

    try {
      setClassOverviews(await listClassOverviewsByYear(yearId));
    } catch (error) {
      console.warn("[school-data] load classes failed", error);
      setSchoolDataError("Không tải được danh sách lớp học.");
    } finally {
      setIsSchoolDataLoading(false);
    }
  }

  function handleOpenClass(classId: number) {
    const openedClass = classOverviews.find((classItem) => classItem.id === classId);
    if (openedClass && (openedClass.grade === 8 || openedClass.grade === 9)) {
      setSelectedGrade(openedClass.grade);
    }
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

  async function handleYearChange(yearId: number) {
    setSelectedYearId(yearId);

    try {
      await setCurrentAcademicYear(yearId);
    } catch (error) {
      console.warn("[school-data] set current year failed", error);
      setSchoolDataError("Không lưu được năm học hiện tại.");
    }

    await loadClassesForYear(yearId);
  }

  async function handleCreateClass(input: CreateClassInput) {
    const createdClass = await createClass(input);
    setClassOverviews((current) => [...current, createdClass]);
  }

  function handleUpdateClass(classId: number, updates: Partial<ClassOverview>) {
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
        academicYears={academicYears}
        selectedYearId={selectedYearId}
        selectedGrade={selectedGrade}
        classOverviews={classOverviews}
        isLoading={isSchoolDataLoading}
        errorMessage={schoolDataError}
        onYearChange={handleYearChange}
        onGradeChange={setSelectedGrade}
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
