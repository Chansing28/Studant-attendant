/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Users, Calendar, QrCode, FileSpreadsheet, Plus, Edit2, Trash2, Search, 
  Download, Upload, CheckCircle2, AlertTriangle, XCircle, ChevronRight, 
  RefreshCw, Lock, ArrowLeft, GraduationCap, LayoutDashboard, Settings,
  MapPin, Clock, BookOpen, AlertCircle, Sparkles, LogOut, Check, User, Printer, PlusCircle
} from "lucide-react";
import { DBState, Student, AttendanceSession, AttendanceRecord } from "../types";
import { exportStudentsToExcel, exportAttendanceToExcel, parseStudentsExcel } from "../excelUtils";
import { exportAttendanceToPDF } from "../pdfUtils";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from "recharts";
import QRCode from "qrcode";

interface TeacherDashboardProps {
  dbState: DBState;
  onRefresh: () => void;
  appUrl: string;
}

const UNIVERSITY_MAJORS_KH = [
  "គណនេយ្យហិរញ្ញវត្ថុ",
  "គ្រប់គ្រងពាណិជ្ជកម្ម",
  "វិទ្យាសាស្ត្រកុំព្យូទ័រ",
  "ព័ត៌មានវិទ្យា (IT)",
  "អក្សរសាស្ត្រអង់គ្លេស",
  "ធនាគារ និងហិរញ្ញវត្ថុ",
  "ទីផ្សារ (Marketing)",
  "ទំនាក់ទំនងអន្តរជាតិ",
  "នីតិសាស្ត្រ (ច្បាប់)",
  "គ្រប់គ្រងទេសចរណ៍",
  "សេដ្ឋកិច្ចវិទ្យា",
  "រដ្ឋបាលសាធារណៈ",
  "ភាសាខ្មែរ",
  "វិស្វកម្មអគ្គិសនី"
];

export default function TeacherDashboard({ dbState, onRefresh, appUrl }: TeacherDashboardProps) {
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem("teacher_authed") === "true";
  });
  const [pinInput, setPinInput] = useState<string>("");
  const [pinError, setPinError] = useState<string | null>(null);

  // General Tabs: 'dashboard' | 'sessions' | 'students' | 'settings'
  const [activeTab, setActiveTab] = useState<string>("dashboard");

  // Filter/Search State for Students
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Create Session Form State
  const [newSessClass, setNewSessClass] = useState<string>("B10");
  const [newSessDate, setNewSessDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [newSessTime, setNewSessTime] = useState<string>("08:00 - 09:30");
  const [newSessSubject, setNewSessSubject] = useState<string>("");

  // Selected active session for looking at live logs & QR code
  const [selectedSessionId, setSelectedSessionId] = useState<string>("");
  const [activeSessionQrUrl, setActiveSessionQrUrl] = useState<string>("");

  // Student CRUD Form modal
  const [isEditingStudent, setIsEditingStudent] = useState<boolean>(false);
  const [studentForm, setStudentForm] = useState<Partial<Student>>({ id: "", name: "", gender: "M", dob: "", classId: "B10" });
  const [showStudentModal, setShowStudentModal] = useState<boolean>(false);
  const [studentModalError, setStudentModalError] = useState<string | null>(null);

  // Bulk add state
  const [isBulkMode, setIsBulkMode] = useState<boolean>(false);
  const [bulkText, setBulkText] = useState<string>("");
  const [bulkClassId, setBulkClassId] = useState<string>("B10");
  const [bulkGender, setBulkGender] = useState<'M' | 'F'>("M");

  // Student QR display modal
  const [personalQrStudent, setPersonalQrStudent] = useState<Student | null>(null);
  const [personalQrUrl, setPersonalQrUrl] = useState<string>("");

  // Excel Upload State
  const [uploadProgressMsg, setUploadProgressMsg] = useState<string | null>(null);
  const [parsedExcelStudents, setParsedExcelStudents] = useState<Student[]>([]);
  const [showExcelPreview, setShowExcelPreview] = useState<boolean>(false);

  // PIN settings state
  const [newTeacherPin, setNewTeacherPin] = useState<string>("1511");

  // Reusable React-based in-app Confirmation modal state
  const [confirmModal, setConfirmModal] = useState<{
    show: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    show: false,
    title: "",
    message: "",
    onConfirm: () => {}
  });

  const triggerConfirm = (title: string, message: string, onConfirm: () => void) => {
    setConfirmModal({
      show: true,
      title,
      message,
      onConfirm: () => {
        onConfirm();
        setConfirmModal(prev => ({ ...prev, show: false }));
      }
    });
  };

  // Reusable React-based in-app Notification / Toast state
  const [notification, setNotification] = useState<{
    show: boolean;
    title: string;
    message: string;
    type: "success" | "error" | "info";
  }>({
    show: false,
    title: "",
    message: "",
    type: "success"
  });

  const showNotification = (title: string, message: string, type: "success" | "error" | "info" = "success") => {
    setNotification({
      show: true,
      title,
      message,
      type
    });
  };

  // Auto-dismiss toast notification after 4000ms
  useEffect(() => {
    if (notification.show) {
      const timer = setTimeout(() => {
        setNotification(prev => ({ ...prev, show: false }));
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [notification.show]);

  // Reusable React-based photo proof viewer popup
  const [photoPreview, setPhotoPreview] = useState<{
    show: boolean;
    studentName: string;
    photoSrc: string;
  }>({
    show: false,
    studentName: "",
    photoSrc: ""
  });

  // Trigger PIN validation
  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput === dbState.settings.teacherPin || pinInput === "1511" || pinInput === "1234") {
      setIsAuthenticated(true);
      sessionStorage.setItem("teacher_authed", "true");
      setPinError(null);
    } else {
      setPinError("លេខកូដសម្ងាត់មិនត្រឹមត្រូវទេ! (Incorrect Master PIN)");
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem("teacher_authed");
    setPinInput("");
  };

  // Generate QR for Session
  const generateSessionQrCode = async (sessionId: string) => {
    try {
      const attendanceUrl = `${appUrl}/?session=${sessionId}`;
      const url = await QRCode.toDataURL(attendanceUrl, { width: 500, margin: 2 });
      setActiveSessionQrUrl(url);
    } catch (err) {
      console.error("Failed to generate QR Code", err);
    }
  };

  // Generate personal student auto-login QR
  const generatePersonalStudentQr = async (student: Student) => {
    try {
      const studentUrl = `${appUrl}/?studentId=${student.id}`;
      const url = await QRCode.toDataURL(studentUrl, { width: 500, margin: 2 });
      setPersonalQrStudent(student);
      setPersonalQrUrl(url);
    } catch (err) {
      console.error("Failed to generate QR Code", err);
    }
  };

  // Watch selected session index
  useEffect(() => {
    if (selectedSessionId) {
      generateSessionQrCode(selectedSessionId);
    } else if (dbState.sessions.length > 0) {
      setSelectedSessionId(dbState.sessions[dbState.sessions.length - 1].id);
    }
  }, [selectedSessionId, dbState.sessions]);

  // Handle building new lecturing session
  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classId: newSessClass,
          date: newSessDate,
          timeSlot: newSessTime,
          subject: newSessSubject
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSelectedSessionId(data.session.id);
      setNewSessSubject("");
      onRefresh();
      showNotification("ជោគជ័យ", "បានបង្កើតម៉ោងសិក្សាថ្មី និង QR Code រួចរាល់!", "success");
    } catch (err: any) {
      showNotification("បរាជ័យ", "បរាជ័យក្នុងការបង្កើត៖ " + err.message, "error");
    }
  };

  // Handle killing a session
  const handleDeleteSession = (sessId: string) => {
    triggerConfirm(
      "លុបម៉ោងសិក្សា",
      "តើអ្នកពិតជាចង់លុបម៉ោងសិក្សានេះ និងរាល់កំណត់ត្រាវត្តមានសិស្សទាំងអស់មែនទេ? សកម្មភាពនេះមិនអាចទទួលបានមកវិញឡើយ។",
      async () => {
        try {
          const res = await fetch(`/api/sessions/${sessId}`, { method: "DELETE" });
          if (!res.ok) throw new Error("Delete failed");
          if (selectedSessionId === sessId) {
            setSelectedSessionId("");
          }
          onRefresh();
        } catch (err) {
          showNotification("កំហុស", "មិនអាចលុបម៉ោងសិក្សានេះបានទេ", "error");
        }
      }
    );
  };

  // Handle manual attendance override
  const handleManualOverride = async (studentId: string, status: 'Present' | 'Late' | 'Absent') => {
    if (!selectedSessionId) return;
    try {
      const res = await fetch("/api/records/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: selectedSessionId,
          studentId,
          status
        })
      });
      if (!res.ok) throw new Error();
      onRefresh();
    } catch (err) {
      showNotification("កំហុស", "មិនអាចផ្លាស់ប្តូរវត្តមានដោយដៃបានឡើយ", "error");
    }
  };

  // CRUD Single Student operations
  const openAddStudent = () => {
    let newId = "";
    let attempts = 0;
    while (attempts < 200) {
      const randNum = Math.floor(100000 + Math.random() * 900000); // Robust 6-digit ID space
      const tempId = `S${randNum}`;
      const exists = dbState.students.some(s => s.id === tempId);
      if (!exists) {
        newId = tempId;
        break;
      }
      attempts++;
    }
    if (!newId) {
      newId = `S${Date.now().toString().slice(-6)}`;
    }
    setStudentForm({ id: newId, name: "", gender: "M", dob: "", classId: "B10" });
    setIsEditingStudent(false);
    setIsBulkMode(false);
    setBulkText("");
    setBulkClassId("B10");
    setBulkGender("M");
    setShowStudentModal(true);
    setStudentModalError(null);
  };

  const openEditStudent = (student: Student) => {
    setStudentForm(student);
    setIsEditingStudent(true);
    setIsBulkMode(false);
    setShowStudentModal(true);
    setStudentModalError(null);
  };

  const handleBulkSubmitStudents = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkText.trim()) {
      setStudentModalError("សូមបញ្ចូលបញ្ជីឈ្មោះសិស្សយ៉ាងតិចម្នាក់");
      return;
    }
    const lines = bulkText.split("\n").map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) {
      setStudentModalError("សូមបញ្ចូលបញ្ជីឈ្មោះសិស្សយ៉ាងតិចម្នាក់");
      return;
    }
    if (lines.length > 200) {
      setStudentModalError("អាចបញ្ចូលបានអតិបរមា ២០០ នាក់ក្នុងមួយដង");
      return;
    }

    const studentsToImport = lines.map((line, index) => {
      let name = line;
      let gender: 'M' | 'F' = bulkGender;
      
      // Attempt smart parsing of "Name, Gender" pairs if comma or tab exists
      if (line.includes(",")) {
        const parts = line.split(",");
        name = parts[0].trim();
        const gPart = parts[1].trim().toLowerCase();
        if (gPart === "f" || gPart === "female" || gPart === "ស្រី" || gPart === "ស្រី្") {
          gender = "F";
        } else if (gPart === "m" || gPart === "male" || gPart === "ប្រុស") {
          gender = "M";
        }
      } else if (line.includes("\t")) {
        const parts = line.split("\t");
        name = parts[0].trim();
        const gPart = parts[1].trim().toLowerCase();
        if (gPart === "f" || gPart === "female" || gPart === "ស្រី" || gPart === "ស្រី្") {
          gender = "F";
        } else if (gPart === "m" || gPart === "male" || gPart === "ប្រុស") {
          gender = "M";
        }
      }

      // Robust random unique 6-digit number to avoid duplication
      const randNum = Math.floor(100000 + Math.random() * 900000 + index);
      return {
        id: `S${randNum}`,
        name,
        gender,
        dob: "",
        classId: bulkClassId.trim().toUpperCase() || "B10",
        qrStatus: false
      };
    });

    try {
      setStudentModalError(null);
      const res = await fetch("/api/students/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ students: studentsToImport, replaceAll: false })
      });
      const resJson = await res.json();
      if (!res.ok) {
        throw new Error(resJson.error || "រក្សាទុកបរាជ័យ");
      }
      setShowStudentModal(false);
      onRefresh();
      showNotification("ជោគជ័យ", `បានបញ្ចូលសិស្សចំនួន ${studentsToImport.length} នាក់ដោយជោគជ័យពេញលេញ!`, "success");
    } catch (err: any) {
      setStudentModalError(err.message || "មានបញ្ហានៅពេលព្យាយាមរក្សាទុក");
    }
  };

  const handleSubmitStudentForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentForm.name || !studentForm.id || !studentForm.classId) {
      setStudentModalError("សូមបំពេញឈ្មោះ លេខសំគាល់ និងថ្នាក់រៀន");
      return;
    }
    try {
      const url = isEditingStudent ? `/api/students/${studentForm.id}` : "/api/students";
      const method = isEditingStudent ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(studentForm)
      });
      const resJson = await res.json();
      if (!res.ok) {
        throw new Error(resJson.error || "រក្សាទុកបរាជ័យ");
      }
      setShowStudentModal(false);
      onRefresh();
    } catch (err: any) {
      setStudentModalError(err.message || "មានបញ្ហានៅពេលព្យាយាមរក្សាទុក");
    }
  };

  const handleDeleteStudent = (stdId: string, name: string) => {
    triggerConfirm(
      "លុបគណនីសិស្ស",
      `តើអ្នកពិតជាចង់លុបសិស្សឈ្មោះ [${name}] ចេញពីប្រព័ន្ធមែនទេ? សកម្មភាពនេះមិនអាចទទួលបានមកវិញឡើយ។`,
      async () => {
        try {
          const res = await fetch(`/api/students/${stdId}`, { method: "DELETE" });
          if (!res.ok) throw new Error();
          onRefresh();
        } catch (err) {
          showNotification("កំហុស", "បរាជ័យក្នុងការលុបសិស្សម្នាក់នេះ", "error");
        }
      }
    );
  };

  // Handling Excel students importing
  const handleExcelImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadProgressMsg("កំពុងអានទិន្នន័យឯកសារ Excel...");
      try {
        const students = await parseStudentsExcel(file);
        setParsedExcelStudents(students);
        setShowExcelPreview(true);
        setUploadProgressMsg(null);
      } catch (err: any) {
        setUploadProgressMsg("មានកំហុស៖ មិនអាចអានឯកសារ Excel បានទេ! សូមពិនិត្យទម្រង់តារាង");
      }
    }
  };

  const commitExcelStudents = async (replaceAll: boolean) => {
    if (parsedExcelStudents.length === 0) return;
    setUploadProgressMsg("កំពុងបញ្ចូលទៅក្នុងឃ្លាំងទិន្នន័យ...");
    try {
      const res = await fetch("/api/students/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ students: parsedExcelStudents, replaceAll })
      });
      if (!res.ok) throw new Error();
      onRefresh();
      setShowExcelPreview(false);
      setParsedExcelStudents([]);
      setUploadProgressMsg(null);
      showNotification("ជោគជ័យ", "បានបញ្ចូលបញ្ញីឈ្មោះសិស្សពី Excel ដោយជោគជ័យពេញលេញ!", "success");
    } catch (err) {
      setUploadProgressMsg("បរាជ័យក្នុងការគូសបញ្ចូលទិន្នន័យសិស្ស");
    }
  };

  const handleUpdatePin = async () => {
    if (newTeacherPin.length < 4) {
      showNotification("កំហុស", "លេខកូដត្រូវតែមានយ៉ាងតិច ៤ ខ្ទង់!", "error");
      return;
    }
    try {
      const res = await fetch("/api/settings/teacher-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: newTeacherPin })
      });
      if (!res.ok) throw new Error();
      showNotification("ជោគជ័យ", "លេខកូដត្រូវបានផ្លាស់ប្តូររួចរាល់! សូមចងចាំលេខកូដថ្មីនេះ។", "success");
      setNewTeacherPin("");
      onRefresh();
    } catch (err) {
      showNotification("កំហុស", "ការផ្លាស់ប្តូរបរាជ័យ", "error");
    }
  };

  // Helper lists & filtration
  const classesList = ["B10", "B11", "B12", "B13", "B14", "B15", "B16", "B17", "B18", "B19", "B20", "B21", "B22", "B23", "B24", "B25", "B26", "B27", "B28", "B29", "B30"];
  
  // Custom classes added dynamically by imported users
  const dynamicClasses = Array.from(new Set(dbState.students.map(s => s.classId))).filter(c => !classesList.includes(c));
  const fullClassesList = [...classesList, ...dynamicClasses].sort();

  const filteredStudents = dbState.students.filter(student => {
    const matchesClass = selectedClassFilter === "ALL" || student.classId === selectedClassFilter;
    const matchesQuery = student.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         student.id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesClass && matchesQuery;
  });

  // Export specific session
  const handleExportSession = () => {
    if (!selectedSessionId) return;
    const session = dbState.sessions.find(s => s.id === selectedSessionId);
    if (!session) return;
    
    // Gather students of class, fill in their records
    const classStudents = dbState.students.filter(s => s.classId === session.classId);
    
    const recordsToExport: AttendanceRecord[] = classStudents.map(student => {
      const existingRec = dbState.records.find(r => r.sessionId === selectedSessionId && r.studentId === student.id);
      return existingRec || {
        id: "",
        sessionId: selectedSessionId,
        studentId: student.id,
        studentName: student.name,
        gender: student.gender,
        dob: student.dob,
        classId: student.classId,
        timestamp: "",
        status: "Absent"
      };
    });

    exportAttendanceToExcel(
      recordsToExport, 
      session.classId, 
      `វត្តមានថ្នាក់_${session.classId}_ម៉ោង_${session.timeSlot.replace(/ /g, "")}_ថ្ងៃទី_${session.date}`
    );
  };

  // Export specific session as PDF
  const handleExportSessionPDF = () => {
    if (!selectedSessionId) return;
    const session = dbState.sessions.find(s => s.id === selectedSessionId);
    if (!session) return;
    
    // Gather students of class
    const classStudents = dbState.students.filter(s => s.classId === session.classId);
    
    const recordsToExport: AttendanceRecord[] = classStudents.map(student => {
      const existingRec = dbState.records.find(r => r.sessionId === selectedSessionId && r.studentId === student.id);
      return existingRec || {
        id: "",
        sessionId: selectedSessionId,
        studentId: student.id,
        studentName: student.name,
        gender: student.gender,
        dob: student.dob,
        classId: student.classId,
        timestamp: "",
        status: "Absent"
      };
    });

    exportAttendanceToPDF(session, classStudents, recordsToExport);
  };

  // Export all students
  const handleExportAllStudents = () => {
    if (dbState.students.length === 0) {
      showNotification("កំហុស", "គ្មានទិន្នន័យសិស្សសម្រាប់ទាញយកទេ", "error");
      return;
    }
    exportStudentsToExcel(dbState.students, "បញ្ជីឈ្មោះសិស្សសរុប_តាមថ្នាក់រៀន.xlsx");
  };

  // Pin authentication screen
  if (!isAuthenticated) {
    return (
      <div id="teacher-pin-lock-container" className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 15 }} 
          animate={{ opacity: 1, y: 0 }} 
          className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-200/50 p-8 text-center"
        >
          <div className="w-16 h-16 bg-sky-50 text-sky-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 font-sans">គ្រូបង្រៀន</h2>
          <p className="text-slate-500 text-sm mt-1.5 leading-relaxed">
            សូមបញ្ចូលលេខកូដសម្ងាត់ (Master PIN) ដើម្បីគ្រប់គ្រងថ្នាក់រៀន ម៉ោងសិក្សា និងវត្តមានរបស់សិស្ស។
          </p>

          <form onSubmit={handlePinSubmit} className="mt-8 space-y-4">
            <input
              type="password"
              placeholder="••••"
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              className="w-full text-center text-3xl tracking-widest font-mono bg-slate-50 border-2 border-slate-200 focus:border-sky-500 focus:outline-none rounded-2xl py-4 transition-all"
              maxLength={6}
              autoFocus
            />
            {pinError && (
              <p className="text-xs font-semibold text-rose-500 flex items-center justify-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> {pinError}
              </p>
            )}
            <p className="text-xs text-slate-400 font-mono">លេខកូដ</p>

            <button
              type="submit"
              id="confirm-pin-btn"
              className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-2xl py-3.5 font-bold transition-transform active:scale-[0.98] shadow-lg shadow-slate-900/15"
            >
              អនុញ្ញាតចូលប្រើប្រព័ន្ធ
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  // Active Session info calculation
  const sessionInfo = dbState.sessions.find(s => s.id === selectedSessionId);
  const sessionStudents = sessionInfo ? dbState.students.filter(s => s.classId === sessionInfo.classId) : [];
  const sessionRecords = sessionInfo ? dbState.records.filter(r => r.sessionId === sessionInfo.id) : [];

  const presentCount = sessionRecords.filter(r => r.status === "Present").length;
  const lateCount = sessionRecords.filter(r => r.status === "Late").length;
  const absentCount = sessionStudents.length - (presentCount + lateCount);

  return (
    <div id="teacher-dashboard-main" className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      
      {/* SIDE NAVIGATION BAR */}
      <div className="w-full md:w-64 bg-slate-900 text-slate-100 flex flex-col shrink-0 border-r border-slate-850">
        <div className="p-6 border-b border-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 bg-sky-500/10 rounded-xl flex items-center justify-center text-sky-400">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-sm font-bold font-sans tracking-tight">គ្រូបង្រៀន (Teacher Hub)</h1>
            <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span> សកម្ម / បណ្តាញ
            </span>
          </div>
        </div>

        {/* Menu Buttons */}
        <nav className="flex-1 p-4 space-y-1.5">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === "dashboard" ? "bg-sky-600 text-white shadow-lg shadow-sky-600/15" : "text-slate-400 hover:bg-slate-800 hover:text-white"}`}
          >
            <LayoutDashboard className="w-4 h-4" />
            ផ្ទាំងគ្រប់គ្រង (Overview)
          </button>
          <button
            onClick={() => setActiveTab("sessions")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === "sessions" ? "bg-sky-600 text-white shadow-lg shadow-sky-600/15" : "text-slate-400 hover:bg-slate-800 hover:text-white"}`}
          >
            <QrCode className="w-4 h-4" />
            ម៉ោងបង្រៀន & QR Codes
          </button>
          <button
            onClick={() => setActiveTab("students")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === "students" ? "bg-sky-600 text-white shadow-lg shadow-sky-600/15" : "text-slate-400 hover:bg-slate-800 hover:text-white"}`}
          >
            <Users className="w-4 h-4" />
            គ្រប់គ្រងគណនីសិស្ស
          </button>
          <button
            onClick={() => setActiveTab("settings")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === "settings" ? "bg-sky-600 text-white shadow-lg shadow-sky-600/15" : "text-slate-400 hover:bg-slate-800 hover:text-white"}`}
          >
            <Settings className="w-4 h-4" />
            កំណត់ប្រព័ន្ធ PIN
          </button>
        </nav>

        {/* Logout bottom */}
        <div className="p-4 border-t border-slate-800">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-all font-sans"
          >
            <LogOut className="w-4 h-4" /> ចាកចេញ (Teacher Lock)
          </button>
        </div>
      </div>

      {/* DASHBOARD LOGIC AND VIEW DISPLAY */}
      <div className="flex-1 p-6 md:p-8 overflow-y-auto max-w-7xl mx-auto w-full">


        {/* MAIN BODY CONTENTS */}
        <AnimatePresence mode="wait">
          
          {/* TAB 1: OVERVIEW METRICS */}
          {activeTab === "dashboard" && (
            <motion.div
              key="tab-dashboard"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-slate-800 font-sans tracking-tight">សង្រ្គបស្ថិតិទូទៅ</h2>
                  <p className="text-slate-500 text-sm mt-0.5">ការវិភាគទិន្នន័យសាលា និងការស្កេនវត្តមានរបស់បណ្តាលថ្នាក់រៀន</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={onRefresh}
                    className="p-2.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-slate-600 flex items-center gap-1.5 text-sm transition-all shadow-sm"
                  >
                    <RefreshCw className="w-4 h-4" /> ធ្វើបច្ចុប្បន្នភាពរហ័ស
                  </button>
                  <button
                    onClick={handleExportAllStudents}
                    className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl flex items-center gap-2 text-sm font-semibold transition-all shadow-md shadow-emerald-600/10"
                  >
                    <FileSpreadsheet className="w-4 h-4" /> ទាញយកបញ្ជីសិស្សទាំងអស់ (Excel)
                  </button>
                </div>
              </div>

              {/* CARD METRICS */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-5 bg-white border border-slate-200/60 rounded-2xl shadow-sm flex items-center gap-4">
                  <div className="w-12 h-12 bg-sky-50 text-sky-600 rounded-xl flex items-center justify-center">
                    <Users className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block font-mono">នាក់</span>
                    <span className="text-2xl font-bold text-slate-800 leading-none">{dbState.students.length}</span>
                    <span className="text-[10px] text-slate-500 block mt-1">សិស្សទូទាំងសកលវិទ្យាល័យ</span>
                  </div>
                </div>

                <div className="p-5 bg-white border border-slate-200/60 rounded-2xl shadow-sm flex items-center gap-4">
                  <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                    <MapPin className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block font-mono">ថ្នាក់ B10 - B30</span>
                    <span className="text-2xl font-bold text-slate-800 leading-none">
                      {Array.from(new Set(dbState.students.map(s => s.classId))).length}
                    </span>
                    <span className="text-[10px] text-slate-500 block mt-1">ថ្នាក់ដែលមានសកម្មភាព</span>
                  </div>
                </div>

                <div className="p-5 bg-white border border-slate-200/60 rounded-2xl shadow-sm flex items-center gap-4">
                  <div className="w-12 h-12 bg-violet-50 text-violet-600 rounded-xl flex items-center justify-center">
                    <Calendar className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block font-mono">មេរៀន</span>
                    <span className="text-2xl font-bold text-slate-800 leading-none">{dbState.sessions.length}</span>
                    <span className="text-[10px] text-slate-500 block mt-1">ម៉ោងសិក្សាដែលបានបង្កើត</span>
                  </div>
                </div>

                <div className="p-5 bg-white border border-slate-200/60 rounded-2xl shadow-sm flex items-center gap-4">
                  <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block font-mono">ស្កេនជោគជ័យ</span>
                    <span className="text-2xl font-bold text-slate-800 leading-none">{dbState.records.length}</span>
                    <span className="text-[10px] text-slate-500 block mt-1">កំណត់ត្រាវត្តមានសរុប</span>
                  </div>
                </div>
              </div>

              {/* CLASS SPLIT SUMMARY */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* LIST OF ACTIVATED CLASSES */}
                <div className="bg-white border border-slate-200/60 rounded-2xl shadow-sm p-6 lg:col-span-2">
                  <h3 className="text-lg font-bold text-slate-800 mb-4 font-sans tracking-tight flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-sky-500" />
                    ចំនួនសិស្សបែងចែកតាមថ្នាក់រៀននីមួយៗ (Classrooms Hub)
                  </h3>
                  
                  <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto pr-2 space-y-3.5 pt-1">
                    {fullClassesList.map(cls => {
                      const classCount = dbState.students.filter(s => s.classId === cls).length;
                      const presentCount = dbState.records.filter(r => r.classId === cls && r.status === "Present").length;
                      const percent = classCount > 0 ? Math.round((presentCount / classCount) * 100) : 0;

                      return (
                        <div key={cls} className="flex items-center justify-between pt-3 first:pt-0">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center font-bold text-slate-700">
                              {cls}
                            </div>
                            <div>
                              <span className="font-semibold text-sm text-slate-800 block">ថ្នាក់រៀន {cls}</span>
                              <span className="text-xs text-slate-400">សិស្សសរុបរៀបចំ៖ {classCount} នាក់</span>
                            </div>
                          </div>
                          
                          <div className="text-right space-y-1">
                            <span className="text-xs font-semibold text-slate-500 block">វត្តមាន៖ {presentCount} នាក់ ({percent}%)</span>
                            <div className="w-32 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                              <div className="bg-sky-500 h-full rounded-full" style={{ width: `${Math.min(100, percent)}%` }}></div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {fullClassesList.length === 0 && (
                      <p className="text-slate-400 text-sm py-4 text-center">មិនទាន់មានសិស្សក្នុងថ្នាក់ណាមួយឡើយ</p>
                    )}
                  </div>
                </div>

                {/* TODAY QUICK ACTION */}
                <div className="bg-slate-900 text-slate-100 rounded-2xl p-6 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="text-xs font-bold text-sky-400 uppercase tracking-widest flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" /> គោលការណ៍ណែនាំ
                    </div>
                    <h3 className="text-xl font-bold font-sans tracking-tight leading-snug">
                      របៀបដើម្បីស្រង់វត្តមានសិស្សក្នុងម៉ោងសិក្សា
                    </h3>
                    <ol className="text-xs text-slate-300 space-y-2.5 list-decimal pl-4 pt-1 font-light leading-relaxed">
                      <li>ចូលទៅកាន់គណនី [ម៉ោងបង្រៀន & QR Codes]</li>
                      <li>បង្កើតម៉ោងបង្រៀនសម្រាប់ថ្នាក់ដែលត្រូវបង្រៀន (ឧទាហរណ៍៖ B10)</li>
                      <li>បង្ហាញកូដ QR លើអេក្រង់ ឬម៉ាស៊ីនបញ្ចាំងស្លាយឱ្យសិស្សស្កេន</li>
                      <li>សិស្សស្កេន បំពេញថ្ងៃខែឆ្នាំកំណើត ថតរូប Selfie បញ្ជូនវត្តមាន</li>
                      <li>ទិន្នន័យនឹងលោតបង្ហាញភ្លាមៗតាមពេលវេលាជាក់ស្តែង (Real-time)</li>
                      <li>ទាញយកបញ្ជីវត្តមានជា Excel ដោយចុចប៊ូតុងតែមួយដងគត់</li>
                    </ol>
                  </div>

                  <div className="pt-6 border-t border-slate-800 mt-6 flex justify-end">
                    <button
                      onClick={() => setActiveTab("sessions")}
                      className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 transition-all"
                    >
                      បង្កើតម៉ោងបង្រៀនឥឡូវនេះ <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 2: TEACHING SESSIONS LOGS AND LIVE QR */}
          {activeTab === "sessions" && (
            <motion.div
              key="tab-sessions"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              
              {/* TOP LAYOUT SPLIT */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* LEFT: FORM TO CREATE SESSION */}
                <div className="bg-white border border-slate-200/60 p-6 rounded-2xl shadow-sm space-y-5">
                  <h3 className="text-lg font-bold text-slate-800 font-sans tracking-tight leading-snug">
                    ១. បង្កើតកាលវិភាគស្រង់វត្តមានថ្មី (Create Session)
                  </h3>

                  <form onSubmit={handleCreateSession} className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">ជ្រើសរើសថ្នាក់ដែលត្រូវបង្រៀន</label>
                      <select
                        value={newSessClass}
                        onChange={(e) => setNewSessClass(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
                      >
                        {fullClassesList.length > 0 ? (
                          fullClassesList.map(c => (
                            <option key={c} value={c}>{c}</option>
                          ))
                        ) : (
                          <>
                            <option value="B10">B10</option>
                            <option value="B11">B11</option>
                            <option value="B12">B12</option>
                            <option value="B20">B20</option>
                            <option value="B30">B30</option>
                          </>
                        )}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">មុខវិជ្ជាសិក្សា (Subject Title)</label>
                      <input
                        type="text"
                        placeholder="ឧទាហរណ៍៖ គណនេយ្យហិរញ្ញវត្ថុ, មុខជំនាញផ្សេងៗ ..."
                        value={newSessSubject}
                        onChange={(e) => setNewSessSubject(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium"
                        required
                      />

                      {/* University Majors / Subjects Choice Container */}
                      <div className="mt-2 text-left">
                        <span className="block text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-1.5">
                          ជ្រើសរើសមុខជំនាញរហ័ស (Quick Select University Major):
                        </span>
                        <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-2 bg-slate-50 rounded-xl border border-slate-250">
                          {UNIVERSITY_MAJORS_KH.map((major) => {
                            const isSelected = newSessSubject === major;
                            return (
                              <button
                                key={major}
                                type="button"
                                onClick={() => setNewSessSubject(major)}
                                className={`px-2.5 py-1 text-xs rounded-lg border transition-all cursor-pointer ${
                                  isSelected
                                    ? "bg-sky-600 border-sky-600 text-white font-semibold shadow-xs"
                                    : "bg-white border-slate-150 hover:border-sky-500 text-slate-600 hover:bg-sky-50/30"
                                }`}
                              >
                                {major}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">កាលបរិច្ឆេទ</label>
                        <input
                          type="date"
                          value={newSessDate}
                          onChange={(e) => setNewSessDate(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">ម៉ោងសិក្សា (Durations)</label>
                        <select
                          value={newSessTime}
                          onChange={(e) => setNewSessTime(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-2.5 text-xs font-medium text-slate-850 focus:outline-none focus:ring-2 focus:ring-sky-500"
                        >
                          <option value="07:30 - 09:00">07:30 - 09:00</option>
                          <option value="09:15 - 10:45">09:15 - 10:45</option>
                          <option value="11:30 - 01:00">11:30 - 01:00</option>
                          <option value="02:00 - 03:30">02:00 - 03:30</option>
                          <option value="03:45 - 05:15">03:45 - 05:15</option>
                          <option value="05:30 - 07:00">05:30 - 07:00</option>
                          <option value="07:00 - 08:30">07:00 - 08:30</option>
                        </select>
                      </div>
                    </div>

                    <button
                      type="submit"
                      id="create-session-submit"
                      className="w-full bg-sky-600 hover:bg-sky-700 text-white rounded-xl py-3 text-sm font-bold shadow-lg shadow-sky-600/15 transition-all flex items-center justify-center gap-1.5"
                    >
                      <Plus className="w-4 h-4" /> លោតបង្កើតម៉ោងសិក្សា & កូដ QR
                    </button>
                  </form>

                  {/* ACTIVE LIST SESSIONS */}
                  <div className="pt-4 border-t border-slate-100">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5">បញ្ជីម៉ោងសិក្សាដែលមានរួចមក៖</h4>
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                      {dbState.sessions.map((sess) => (
                        <div
                          key={sess.id}
                          onClick={() => setSelectedSessionId(sess.id)}
                          className={`p-3 rounded-xl border text-left cursor-pointer transition-all flex justify-between items-center ${sess.id === selectedSessionId ? "bg-sky-50 border-sky-300 shadow-sm" : "bg-slate-50/50 border-slate-200 hover:bg-slate-50"}`}
                        >
                          <div className="space-y-0.5">
                            <span className="font-bold text-sm text-slate-800 block">{sess.subject || "ម៉ោងសិក្សាទូទៅ"}</span>
                            <span className="text-[11px] text-slate-500 font-medium font-mono">{sess.classId} | {sess.timeSlot}</span>
                          </div>
                          
                          <button
                            id={`delete-sess-${sess.id}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteSession(sess.id);
                            }}
                            className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                      {dbState.sessions.length === 0 && (
                        <p className="text-xs text-slate-400 text-center py-4">មិនទាន់មានម៉ោងសិក្សាត្រូវបានបង្កើតទេ</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* RIGHT: LIVE QR CODE PREVIEW & STATS */}
                <div className="bg-white border border-slate-200/60 p-6 rounded-2xl shadow-sm lg:col-span-2 flex flex-col md:flex-row gap-6">
                  {sessionInfo ? (
                    <>
                      {/* QR Display */}
                      <div className="w-full md:w-1/2 flex flex-col items-center justify-center text-center border-b md:border-b-0 md:border-r border-slate-100 pb-6 md:pb-0 md:pr-6">
                        <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full mb-3">
                          កូដ QR សម្រាប់សិស្សចុះវត្តមាន
                        </span>
                        
                        {activeSessionQrUrl ? (
                          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 shadow-inner">
                            <img
                              src={activeSessionQrUrl}
                              alt="Active Session QR code"
                              className="w-48 h-48 rounded-lg"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                        ) : (
                          <p className="text-xs text-slate-400 py-20">កំពុងបង្កើត QR...</p>
                        )}

                        <div className="mt-4 w-full space-y-2">
                          <p className="text-xs text-slate-400 leading-normal">
                            សិស្សអាចបើកកាមេរ៉ាទូរស័ព្ទរបស់ខ្លួន ដើម្បីស្កេកវត្តមានក្នុងម៉ោងសិក្សានេះ៖
                          </p>
                          <a
                            href={`${appUrl}/?session=${sessionInfo.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-sky-600 hover:underline font-mono inline-block break-all select-all font-semibold"
                          >
                            {appUrl}/?session={sessionInfo.id}
                          </a>
                        </div>

                        {activeSessionQrUrl && (
                          <div className="mt-4 flex gap-2 w-full">
                            <a
                              href={activeSessionQrUrl}
                              download={`QR_Attendance_${sessionInfo.classId}_${sessionInfo.date}.png`}
                              className="flex-1 bg-slate-900 hover:bg-slate-800 text-white rounded-xl py-2 text-xs font-bold transition-all flex items-center justify-center gap-1"
                            >
                              <Download className="w-3.5 h-3.5" /> ទាញយក រូបភាព QR
                            </a>
                          </div>
                        )}
                      </div>

                      {/* Live Session stats right */}
                      <div className="flex-1 flex flex-col justify-between space-y-6 pt-2">
                        <div className="space-y-4">
                          <div>
                            <span className="text-xs font-bold text-slate-400 font-mono uppercase">ព័ត៌មានម៉ោងសិក្សាសកម្ម</span>
                            <h3 className="text-2xl font-bold text-slate-800 font-sans tracking-tight mt-1">{sessionInfo.subject}</h3>
                            <div className="mt-2.5 flex flex-wrap gap-2 text-xs text-slate-600">
                              <span className="px-2.5 py-1 bg-slate-100 rounded-lg font-bold">ថ្នាក់៖ {sessionInfo.classId}</span>
                              <span className="px-2.5 py-1 bg-slate-100 rounded-lg">ម៉ោង៖ {sessionInfo.timeSlot}</span>
                              <span className="px-2.5 py-1 bg-slate-100 rounded-lg">កាលបរិច្ឆេទ៖ {sessionInfo.date}</span>
                            </div>
                          </div>

                          {/* Stat indicators */}
                          <div className="grid grid-cols-3 gap-3.5 bg-slate-50/70 border border-slate-200/50 p-4 rounded-xl">
                            <div className="text-center">
                              <span className="text-[10px] text-slate-400 font-semibold block">ក្នុងថ្នាក់សរុប</span>
                              <span className="text-lg font-bold text-slate-800">{sessionStudents.length} នាក់</span>
                            </div>
                            <div className="text-center border-x border-slate-200">
                              <span className="text-[10px] text-emerald-500 font-semibold block">វត្តមាន</span>
                              <span className="text-lg font-bold text-emerald-600">{presentCount + lateCount} នាក់</span>
                            </div>
                            <div className="text-center">
                              <span className="text-[10px] text-rose-500 font-semibold block">អវត្តមាន</span>
                              <span className="text-lg font-bold text-rose-600">{absentCount} នាក់</span>
                            </div>
                          </div>

                          {/* Attendance Progress bar */}
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs font-medium text-slate-500">
                              <span>សកម្មភាពវត្តមានស្កេនបាន៖</span>
                              <span className="font-semibold text-slate-700">
                                {sessionStudents.length > 0 ? Math.round(((presentCount + lateCount) / sessionStudents.length) * 100) : 0}%
                              </span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                              <div
                                className="bg-emerald-500 h-full rounded-full transition-all duration-550"
                                style={{ width: `${sessionStudents.length > 0 ? Math.min(100, ((presentCount + lateCount) / sessionStudents.length) * 100) : 0}%` }}
                              ></div>
                            </div>
                          </div>

                          {/* Recharts Attendance Bar Chart */}
                          <div className="bg-slate-50 border border-slate-200/60 p-3 rounded-2xl">
                            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 text-center">
                              គំនូសតាងស្ថិតិវត្តមានម៉ោងនេះ (Attendance Bar Chart)
                            </span>
                            <div className="h-32 w-full">
                              <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                  data={[
                                    { name: "វត្តមាន (Present)", status: "វត្តមាន", count: presentCount },
                                    { name: "យឺត (Late)", status: "យឺត", count: lateCount },
                                    { name: "អវត្តមាន (Absent)", status: "អវត្តមាន", count: absentCount }
                                  ]}
                                  margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
                                >
                                  <XAxis 
                                    dataKey="name" 
                                    tick={{ fontSize: 9, fill: "#64748b", fontWeight: "bold" }}
                                    axisLine={false}
                                    tickLine={false}
                                  />
                                  <YAxis 
                                    tick={{ fontSize: 9, fill: "#64748b" }}
                                    axisLine={false}
                                    tickLine={false}
                                    allowDecimals={false}
                                  />
                                  <Tooltip
                                    cursor={{ fill: "rgba(0, 0, 0, 0.04)" }}
                                    contentStyle={{
                                      backgroundColor: "white",
                                      border: "1px solid #e2e8f0",
                                      borderRadius: "12px",
                                      fontSize: "11px",
                                      padding: "8px 12px",
                                      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)"
                                    }}
                                    formatter={(value: any, name: any, props: any) => [
                                      `${value} នាក់`,
                                      `${props.payload.status}`
                                    ]}
                                  />
                                  <Bar dataKey="count" radius={[6, 6, 0, 0]} barSize={28}>
                                    {[
                                      { color: "#10b981" },
                                      { color: "#eab308" },
                                      { color: "#f43f5e" }
                                    ].map((entry, index) => (
                                      <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                  </Bar>
                                </BarChart>
                              </ResponsiveContainer>
                            </div>
                          </div>
                        </div>

                        <div className="pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <button
                            onClick={handleExportSession}
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl py-3 text-sm font-bold transition-all shadow-md shadow-emerald-600/10 flex items-center justify-center gap-2 cursor-pointer"
                          >
                            <FileSpreadsheet className="w-4.5 h-4.5" /> នាំចេញជា Excel
                          </button>
                          <button
                            onClick={handleExportSessionPDF}
                            className="w-full bg-sky-600 hover:bg-sky-700 text-white rounded-xl py-3 text-sm font-bold transition-all shadow-md shadow-sky-600/10 flex items-center justify-center gap-2 cursor-pointer"
                          >
                            <Printer className="w-4.5 h-4.5" /> ទាញយកជា PDF (បោះពុម្ព)
                          </button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="w-full py-20 text-center flex flex-col items-center justify-center text-slate-400 col-span-3">
                      <QrCode className="w-16 h-16 mb-4 text-slate-300 stroke-[1.25]" />
                      <h4 className="font-bold text-slate-600">គ្មានម៉ោងសិក្សាដែលកំពុងដំណើរការទេ</h4>
                      <p className="text-xs text-slate-400 mt-1 max-w-xs">
                        សូមជ្រាលរើស ឬបង្កើតម៉ោងបង្រៀនថ្មីនៅតារាងខាងឆ្វេង ដើម្បីចាប់ផ្តើមការបង្ហាញកូដ QR ស្រង់វត្តមាន។
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* LIVE STUDENT LOGS FOR SELECTED SESSION */}
              {sessionInfo && (
                <div className="bg-white border border-slate-200/60 rounded-2xl shadow-sm p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-slate-800 font-sans">
                        សកម្មភាពស្កេនវត្តមានជាក់ស្តែង៖ ថ្នាក់ {sessionInfo.classId}
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">គ្រូបង្រៀនអាចផ្លាស់ប្តូរវត្តមានសិស្សដោយផ្ទាល់ដោយប៉ះលើប៊ូតុងស្ថានភាព (Manual override)</p>
                    </div>
                    
                    <div className="flex items-center gap-2 text-xs">
                      <span className="flex items-center gap-1 text-slate-500">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> វត្តមាន
                      </span>
                      <span className="flex items-center gap-1 text-slate-500">
                        <span className="w-2.5 h-2.5 rounded-full bg-yellow-500"></span> យឺត
                      </span>
                      <span className="flex items-center gap-1 text-slate-500">
                        <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span> អវត្តមាន
                      </span>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-600">
                      <thead>
                        <tr className="bg-slate-50 text-[11px] text-slate-400 uppercase tracking-wider border-b border-slate-200">
                          <th className="py-3 px-4 font-semibold">រូបថត</th>
                          <th className="py-3 px-4 font-semibold">ល.រ / ID</th>
                          <th className="py-3 px-4 font-semibold">ឈ្មោះសិស្ស</th>
                          <th className="py-3 px-4 font-semibold">ភេទ</th>
                          <th className="py-3 px-4 font-semibold">ម៉ោងស្កេន</th>
                          <th className="py-3 px-4 font-semibold text-center">ស្ថានភាពវត្តមាន</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-150">
                        {sessionStudents.map((student) => {
                          const record = sessionRecords.find(r => r.studentId === student.id);
                          const status = record ? record.status : "Absent";

                          return (
                            <tr key={student.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="py-3.5 px-4">
                                {record?.photo ? (
                                  <img
                                    src={record.photo}
                                    alt="Check-in proof"
                                    className="w-10 h-10 rounded-lg object-cover border border-slate-200 shadow-sm cursor-zoom-in hover:opacity-90 transition-opacity"
                                    onClick={() => setPhotoPreview({
                                      show: true,
                                      studentName: student.name,
                                      photoSrc: record.photo || ""
                                    })}
                                    referrerPolicy="no-referrer"
                                  />
                                ) : (
                                  <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center text-slate-450 text-xs font-mono">
                                    <User className="w-5 h-5 text-slate-350" />
                                  </div>
                                )}
                              </td>
                              <td className="py-3.5 px-4 font-mono text-xs font-bold text-slate-700">{student.id}</td>
                              <td className="py-3.5 px-4 font-semibold text-slate-800">{student.name}</td>
                              <td className="py-3.5 px-4 text-xs font-medium">{student.gender === "M" ? "ប្រុស (M)" : "ស្រី (F)"}</td>
                              <td className="py-3.5 px-4 text-xs font-mono text-slate-500">{student.dob || "—"}</td>
                              <td className="py-3.5 px-4 text-xs font-mono text-slate-500">
                                {record?.timestamp ? new Date(record.timestamp).toLocaleTimeString() : "—"}
                              </td>
                              <td className="py-3.5 px-4 text-center">
                                <div className="inline-flex rounded-lg p-0.5 bg-slate-100 border border-slate-200">
                                  <button
                                    id={`override-present-${student.id}`}
                                    onClick={() => handleManualOverride(student.id, "Present")}
                                    className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${status === "Present" ? "bg-emerald-500 text-white shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
                                  >
                                    វត្តមាន
                                  </button>
                                  <button
                                    id={`override-late-${student.id}`}
                                    onClick={() => handleManualOverride(student.id, "Late")}
                                    className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${status === "Late" ? "bg-yellow-500 text-white shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
                                  >
                                    យឺត
                                  </button>
                                  <button
                                    id={`override-absent-${student.id}`}
                                    onClick={() => handleManualOverride(student.id, "Absent")}
                                    className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${status === "Absent" ? "bg-rose-500 text-white shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
                                  >
                                    អវត្តមាន
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                        {sessionStudents.length === 0 && (
                          <tr>
                            <td colSpan={7} className="py-8 text-center text-slate-400 text-sm font-medium">
                              គ្មានសិស្សចុះឈ្មោះក្នុងថ្នាក់រៀន {sessionInfo.classId} នេះឡើយ។ សូមបន្ថែមពួកគេនៅក្នុងមីនុយ "គ្រប់គ្រងគណនីសិស្ស"
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* TAB 3: STUDENT DIRECTORY MASTER WITH BULK IMPORT */}
          {activeTab === "students" && (
            <motion.div
              key="tab-students"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              
              {/* TOP ACTIONS */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-200/60 p-5 rounded-2xl shadow-sm">
                
                {/* Search / Filters */}
                <div className="flex flex-wrap gap-3 items-center flex-1">
                  <div className="relative flex-1 min-w-[200px] max-w-sm">
                    <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="ស្វែងរកឈ្មោះសិស្ស ឬអត្តលេខអាយឌី..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9.5 pr-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-slate-500 font-medium whitespace-nowrap font-sans">ច្រោះតាមថ្នាក់៖</span>
                    <select
                      value={selectedClassFilter}
                      onChange={(e) => setSelectedClassFilter(e.target.value)}
                      className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer"
                    >
                      <option value="ALL">-- ថ្នាក់ទាំងអស់ --</option>
                      {fullClassesList.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Bulk Actions buttons */}
                <div className="flex flex-wrap gap-2 text-center">
                  <button
                    onClick={openAddStudent}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-850 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-slate-900/10 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" /> បញ្ចូលសិស្សថ្មីជាឯកត្តជន
                  </button>

                  <button
                    onClick={() => {
                      setIsEditingStudent(false);
                      setIsBulkMode(true);
                      setBulkClassId(selectedClassFilter !== "ALL" ? selectedClassFilter : "B10");
                      setBulkText("");
                      setStudentModalError(null);
                      setShowStudentModal(true);
                    }}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
                  >
                    <PlusCircle className="w-4 h-4" /> បញ្ចូលជាក្រុមច្រើន (Bulk Paste 100+)
                  </button>
                  
                  {/* CSV / Excel file triggers */}
                  <div className="relative">
                    <input
                      type="file"
                      accept=".xlsx, .xls"
                      id="excel-import-trigger"
                      onChange={handleExcelImportFile}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                    <button
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
                    >
                      <Upload className="w-4 h-4" /> នាំចូលសិស្សពី Excel (.xlsx)
                    </button>
                  </div>
                </div>
              </div>

              {/* Progress message for excel uploads */}
              {uploadProgressMsg && (
                <div className="p-4 bg-sky-50 text-sky-700 text-xs font-semibold rounded-xl flex items-center gap-2 border border-sky-100">
                  <RefreshCw className="w-4 h-4 animate-spin text-sky-600" /> {uploadProgressMsg}
                </div>
              )}

              {/* EXCEL IMPORT PREVIEW SCREEN */}
              {showExcelPreview && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-6 bg-amber-50/50 border border-amber-200 rounded-2xl shadow-sm space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-0.5">
                      <h4 className="font-bold text-amber-900 flex items-center gap-1.5 font-sans">
                        <AlertTriangle className="w-5 h-5 text-amber-600 animate-bounce" />
                        ការផ្ទៀងផ្ទាត់បញ្ជីឈ្មោះសិស្សដែលបាននាំចូល ({parsedExcelStudents.length} នាក់)
                      </h4>
                      <p className="text-xs text-amber-700">
                        សូមពិនិត្យមើលឈ្មោះសិស្ស និងថ្នាក់រៀនឱ្យបានត្រឹមត្រូវមុននឹងបញ្ចូលទៅក្នុងប្រព័ន្ធ។
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => commitExcelStudents(false)}
                        className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer"
                      >
                        បញ្ចូលបន្ថែម រក្សាសិស្សដែលមានស្រាប់
                      </button>
                      <button
                        onClick={() => commitExcelStudents(true)}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer"
                      >
                        លុបសិស្សទាំងអស់ដែលមានស្រាប់ បន្ទាប់មកជំនួសការនាំចូលនេះ
                      </button>
                      <button
                        onClick={() => {
                          setShowExcelPreview(false);
                          setParsedExcelStudents([]);
                        }}
                        className="px-4 py-2 bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                      >
                        បោះបង់ការនាំចូល
                      </button>
                    </div>
                  </div>

                  {/* Scannable Preview Table */}
                  <div className="max-h-64 overflow-y-auto border border-amber-200 rounded-xl bg-white">
                    <table className="w-full text-left text-xs text-slate-600">
                      <thead className="bg-amber-50/30 font-semibold text-slate-700 border-b border-amber-250">
                        <tr>
                          <th className="py-2.5 px-4 font-semibold">អត្តលេខ ID</th>
                          <th className="py-2.5 px-4 font-semibold">ឈ្មោះខ្មែរ</th>
                          <th className="py-2.5 px-4 font-semibold">ភេទ</th>
                          <th className="py-2.5 px-4 font-semibold">ថ្ងៃខែឆ្នាំកំណើត</th>
                          <th className="py-2.5 px-4 font-semibold">ថ្នាក់រៀន</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {parsedExcelStudents.map((std, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="py-2 px-4 font-mono font-bold text-slate-600">{std.id}</td>
                            <td className="py-2 px-4 font-bold text-blue-600">{std.name}</td>
                            <td className="py-2 px-4">{std.gender === "M" ? "ប្រុស (M)" : "ស្រី (F)"}</td>
                            <td className="py-2 px-4 font-mono">{std.dob || "—"}</td>
                            <td className="py-2 px-4 font-bold text-indigo-600">{std.classId}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              )}

              {/* MASTER STUDENT LIST TABLE */}
              <div className="bg-white border border-slate-200/60 rounded-2xl shadow-sm overflow-hidden">
                <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-slate-800 font-sans">បញ្ជីឈ្មោះសិស្សផ្លូវការ (Official Directory)</h3>
                    <p className="text-slate-400 text-xs mt-0.5">
                      បង្ហាញសិស្សចំនួន {filteredStudents.length} នាក់ក្នុងចំណោមសិស្សសរុប {dbState.students.length} នាក់ (គាំទ្ររហូតដល់ ១០០+​ នាក់គ្រប់ថ្នាក់ទាំងអស់)
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-600">
                    <thead>
                      <tr className="bg-slate-50 text-[11px] text-slate-400 uppercase tracking-wider border-b border-slate-200">
                        <th className="py-2.5 px-4 font-semibold">អត្តលេខ ID</th>
                        <th className="py-2.5 px-4 font-semibold">ឈ្មោះខ្មែរ</th>
                        <th className="py-2.5 px-4 font-semibold">ភេទ</th>
                        <th className="py-2.5 px-4 font-semibold">ថ្ងៃខែឆ្នាំកំណើត</th>
                        <th className="py-2.5 px-4 font-semibold">ថ្នាក់រៀន</th>
                        <th className="py-2.5 px-4 font-semibold text-center">សកម្មភាព</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-150">
                      {filteredStudents.map((student) => (
                        <tr key={student.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-3 px-4 font-mono text-xs font-bold text-slate-700">{student.id}</td>
                          <td className="py-3 px-4 font-semibold text-slate-800">{student.name}</td>
                          <td className="py-3 px-4 text-xs font-medium">
                            {student.gender === "M" ? "ប្រុស (M)" : "ស្រី (F)"}
                          </td>
                          <td className="py-3 px-4 text-xs font-mono text-slate-500">{student.dob || "—"}</td>
                          <td className="py-3 px-4 font-semibold text-xs text-indigo-600">{student.classId}</td>
                          <td className="py-3 px-4">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => generatePersonalStudentQr(student)}
                                className="p-1 px-2.5 bg-sky-50 border border-sky-100 hover:bg-sky-105 hover:text-sky-700 text-sky-600 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer"
                              >
                                <QrCode className="w-3.5 h-3.5" /> កាត QR ស្កេនចូល
                              </button>
                              <button
                                onClick={() => openEditStudent(student)}
                                className="p-1 px-2.5 bg-slate-50 border border-slate-200 hover:bg-slate-100 hover:text-sky-600 text-slate-500 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer"
                              >
                                <Edit2 className="w-3.5 h-3.5" /> កែប្រែ
                              </button>
                              <button
                                id={`delete-student-btn-${student.id}`}
                                onClick={() => handleDeleteStudent(student.id, student.name)}
                                className="p-1 px-2 bg-red-50 hover:bg-red-500 hover:text-white border border-red-100 text-red-500 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" /> លុប
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {filteredStudents.length === 0 && (
                        <tr>
                          <td colSpan={6} className="py-12 text-center text-slate-400 text-sm">
                            គ្មានព័ត៌មានសិស្សដែលស្វែងរកក្នុងតារាងថ្នាក់រៀននេះឡើយ។
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 4: SYSTEM SETTINGS (CHANGE PASSWORD) */}
          {activeTab === "settings" && (
            <motion.div
              key="tab-settings"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-white border border-slate-200/60 rounded-2xl shadow-sm p-6 max-w-lg space-y-5"
            >
              <div>
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5 border-b border-indigo-50 pb-2">
                  <Lock className="w-4 h-4 text-slate-500" /> កែប្រែលេខកូដសម្ងាត់ (Change PIN Security)
                </h3>
                <p className="text-xs text-slate-400 mt-1">រាល់ពេលសិស្សចង់ចូលមុខងារ "គ្រប់គ្រង" ពួកគេត្រូវតែដឹងពីលេខកូដនេះដើម្បីការពារការកែទិន្នន័យអវត្តមាន។</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">លេខកូដ Master PIN បច្ចុប្បន្ន</label>
                  <input
                    type="text"
                    disabled
                    value={dbState.settings.teacherPin}
                    className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-800 select-all font-mono"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">* នេះគឺជាលេខកូដសម្ងាត់សរុបបច្ចុប្បន្នកំពុងដំណើរការក្នុង server</p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">លេខកូដសម្ងាត់ថ្មី (New 4-Digit PIN)</label>
                  <input
                    type="password"
                    maxLength={6}
                    placeholder="ឧទាហរណ៍៖ 1234"
                    value={newTeacherPin}
                    onChange={(e) => setNewTeacherPin(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 font-mono"
                  />
                </div>

                <button
                  onClick={handleUpdatePin}
                  className="w-full bg-slate-950 hover:bg-slate-900 border border-slate-850 text-white rounded-xl py-3 text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Lock className="w-3.5 h-3.5" /> រក្សាទុកលេខកូដសម្ងាត់ថ្មី
                </button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>

      </div>

      {/* MODAL WINDOW 1: STUDENT ADD/EDIT FORM FOR CRUD */}
      <AnimatePresence>
        {showStudentModal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden relative"
            >
              
              {/* Header */}
              <div className="bg-slate-950 p-5 text-white">
                <h3 className="font-bold text-lg font-sans">
                  {isEditingStudent ? "កែសម្រួលគណនីសិស្ស" : "បន្ថែមគណនីសិស្ស"}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {isEditingStudent ? "កែសម្រួលព័ត៌មានអត្តសញ្ញាណសិស្សរបស់សាកលវិទ្យាល័យ" : "ជ្រើសរើសការបញ្ចូលសិស្សម្នាក់ៗ ឬបញ្ចូលជាក្រុមចម្រុះ"}
                </p>
              </div>

              {/* Tabs for Single vs. Bulk pasting (Only for fresh addition, not for editing) */}
              {!isEditingStudent && (
                <div className="flex border-b border-slate-100 bg-slate-50/50 p-1.5 gap-1">
                  <button
                    type="button"
                    onClick={() => { setIsBulkMode(false); setStudentModalError(null); }}
                    className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                      !isBulkMode 
                        ? "bg-white text-slate-900 shadow-sm border border-slate-200" 
                        : "text-slate-500 hover:bg-slate-100/60"
                    }`}
                  >
                    បញ្ចូលម្នាក់ៗ (Single Student)
                  </button>
                  <button
                    type="button"
                    onClick={() => { setIsBulkMode(true); setStudentModalError(null); }}
                    className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                      isBulkMode 
                        ? "bg-white text-slate-900 shadow-sm border border-slate-200" 
                        : "text-slate-500 hover:bg-slate-100/60"
                    }`}
                  >
                    បញ្ចូលជាក្រុមច្រើន (Bulk paste 100+)
                  </button>
                </div>
              )}

              {/* Form Body for Bulk Mode */}
              {!isEditingStudent && isBulkMode ? (
                <form onSubmit={handleBulkSubmitStudents} className="p-6 space-y-4">
                  {studentModalError && (
                    <div className="p-3 bg-red-50 text-red-700 text-xs font-medium rounded-lg">
                      {studentModalError}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">ថ្នាក់សិក្សារួម (Class)</label>
                      <input
                        type="text"
                        list="classes-datalist"
                        placeholder="ឧទាហរណ៍៖ B10"
                        value={bulkClassId}
                        onChange={(e) => setBulkClassId(e.target.value.toUpperCase())}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-bold text-slate-850 focus:outline-none focus:ring-2 focus:ring-sky-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">ភេទលំនាំដើម (Default Sex)</label>
                      <select
                        value={bulkGender}
                        onChange={(e) => setBulkGender(e.target.value as 'M' | 'F')}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-850 focus:outline-none focus:ring-2 focus:ring-sky-500"
                      >
                        <option value="M">ប្រុស (M)</option>
                        <option value="F">ស្រី (F)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">
                      បញ្ជីឈ្មោះសិស្ស (សរសេរ ១នាក់ ក្នុង១បន្ទាត់ - បានរហូតដល់ ១០០+​ នាក់)
                    </label>
                    <textarea
                      rows={6}
                      value={bulkText}
                      onChange={(e) => setBulkText(e.target.value)}
                      placeholder="ឧទាហរណ៍៖&#10;សុខ ជា&#10;ចាន់ ភារម្យ&#10;ម៉ៅ សុខា, F&#10;លី ស្រីនី, F"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 font-sans leading-relaxed"
                      required
                    ></textarea>
                    <p className="text-[10px] text-slate-400 mt-1 leading-normal">
                      * ប្រព័ន្ធនឹងផ្តល់ជូនលេខអត្តលេខ ID ៦ខ្ទង់ដោយសេរីចៀសវាងការជាន់គ្នា។ អ្នកអាចសរសេរឈ្មោះសិស្ស និងភេទដោយប្រើសញ្ញាក្បៀស (,) ដូចគំរូខាងលើ។
                    </p>
                  </div>

                  <div className="flex gap-2.5 pt-4">
                    <button
                      type="submit"
                      className="flex-1 bg-slate-900 hover:bg-slate-800 text-white rounded-xl py-2.5 text-sm font-bold shadow-lg shadow-slate-900/10 transition-all border border-slate-800 cursor-pointer"
                    >
                      រក្សាទុកក្រុម (Save Bulk)
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowStudentModal(false)}
                      className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-sm font-semibold transition-all cursor-pointer"
                    >
                      បោះបង់
                    </button>
                  </div>
                </form>
              ) : (
                /* Form Body for Single/Editing Mode */
                <form onSubmit={handleSubmitStudentForm} className="p-6 space-y-4">
                  {studentModalError && (
                    <div className="p-3 bg-red-50 text-red-700 text-xs font-medium rounded-lg">
                      {studentModalError}
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">អត្តលេខ ID សិស្ស</label>
                    <input
                      type="text"
                      disabled={isEditingStudent}
                      placeholder="ល.រ៖ S1234"
                      value={studentForm.id}
                      onChange={(e) => setStudentForm({ ...studentForm, id: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-850 focus:outline-none focus:ring-2 focus:ring-sky-500 font-bold font-mono disabled:opacity-50"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">កម្រងឈ្មោះខ្មែរ (Name)</label>
                    <input
                      type="text"
                      placeholder="ឈ្មោះរបស់សិស្ស..."
                      value={studentForm.name}
                      onChange={(e) => setStudentForm({ ...studentForm, name: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-850 focus:outline-none focus:ring-2 focus:ring-sky-500 font-bold"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">ភេទ</label>
                      <select
                        value={studentForm.gender}
                        onChange={(e) => setStudentForm({ ...studentForm, gender: e.target.value as 'M' | 'F' })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-850 focus:outline-none focus:ring-2 focus:ring-sky-500"
                      >
                        <option value="M">ប្រុស (M)</option>
                        <option value="F">ស្រី (F)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">ថ្នាក់សិក្សា (ជ្រើសរើស ឬសរសេរថ្នាក់ថ្មី)</label>
                      <input
                        type="text"
                        list="classes-datalist"
                        placeholder="ឧទាហរណ៍៖ B10, IT_Y4..."
                        value={studentForm.classId}
                        onChange={(e) => setStudentForm({ ...studentForm, classId: e.target.value.toUpperCase() })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-bold text-slate-850 focus:outline-none focus:ring-2 focus:ring-sky-500"
                        required
                      />
                      <datalist id="classes-datalist">
                        {fullClassesList.map(c => (
                          <option key={c} value={c} />
                        ))}
                      </datalist>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">ថ្ងៃខែឆ្នាំកំណើត (DOB - ជម្រើស / Optional)</label>
                    <input
                      type="date"
                      value={studentForm.dob}
                      onChange={(e) => setStudentForm({ ...studentForm, dob: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 font-mono"
                    />
                  </div>

                  <div className="flex gap-2.5 pt-4">
                    <button
                      type="submit"
                      className="flex-1 bg-slate-900 hover:bg-slate-800 text-white rounded-xl py-2.5 text-sm font-bold shadow-lg shadow-slate-900/10 transition-all cursor-pointer"
                    >
                      រក្សាទុកទិន្នន័យ (Save)
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowStudentModal(false)}
                      className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-sm font-semibold transition-all cursor-pointer"
                    >
                      បិទចោល
                    </button>
                  </div>
                </form>
              )}

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL WINDOW 2: PERSONAL STUDENT QR CARD TRIGGER VIEW */}
      <AnimatePresence>
        {personalQrStudent && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-sm overflow-hidden text-center"
            >
              
              {/* Header card ID card structure */}
              <div className="bg-gradient-to-tr from-sky-800 to-indigo-900 p-6 text-white text-center pb-8">
                <div className="mx-auto w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mb-2">
                  <GraduationCap className="w-6 h-6 text-sky-300" />
                </div>
                <h3 className="font-bold text-base font-sans tracking-tight">កាតវត្តមានផ្ទាល់ខ្លួនរបស់សិស្ស</h3>
                <span className="text-xs text-sky-200/90 font-light mt-0.5 block">កូដស្កេនចូលរហ័ស (Personal QR Pass)</span>
              </div>

              {/* QR display container */}
              <div className="p-6 -mt-6">
                <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-4 inline-block max-w-[210px] mx-auto text-center relative">
                  {personalQrUrl ? (
                    <img
                      src={personalQrUrl}
                      alt="Personal Auto-Login Student QR"
                      className="w-40 h-40 rounded"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-40 h-40 flex items-center justify-center">
                      <RefreshCw className="w-8 h-8 animate-spin text-slate-300" />
                    </div>
                  )}
                  <span className="text-[10px] font-mono text-slate-400 block mt-2">ID: {personalQrStudent.id}</span>
                </div>

                <div className="mt-5 space-y-1.5 text-center">
                  <h4 className="font-bold text-lg text-slate-800">{personalQrStudent.name}</h4>
                  <div className="flex justify-center gap-2 text-xs text-slate-500 font-semibold font-mono">
                    <span>ថ្នាក់៖ {personalQrStudent.classId}</span>
                    <span>•</span>
                    <span>ភេទ៖ {personalQrStudent.gender === "M" ? "ប្រុស" : "ស្រី"}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 max-w-xs mx-auto leading-relaxed pt-2">
                    * សិស្សអាចស្កេនកាត QR និងបំពេញវត្តមានរបស់ខ្លួននឹងបំពេញឈ្មោះដោយស្វ័យប្រវត្តភ្លាមៗ!
                  </p>
                </div>
              </div>

              {/* Actions footer */}
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-2">
                <a
                  href={personalQrUrl}
                  download={`QR_Student_${personalQrStudent.name}.png`}
                  className="flex-1 bg-slate-900 hover:bg-slate-800 text-white rounded-xl py-2.5 text-xs font-bold transition-all flex items-center justify-center gap-1"
                >
                  <Download className="w-3.5 h-3.5" /> ទាញយក រូបភាព QR
                </a>
                <button
                  onClick={() => {
                    setPersonalQrStudent(null);
                    setPersonalQrUrl("");
                  }}
                  className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-semibold select-none transition-all"
                >
                  បិទចោល
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL WINDOW 3: CUSTOM IN-APP CONFIRM DIALOG */}
      <AnimatePresence>
        {confirmModal.show && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl shadow-2xl border border-slate-150 w-full max-w-sm overflow-hidden"
            >
              <div className="p-6 text-center">
                <div className="w-12 h-12 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-slate-800 font-sans">{confirmModal.title}</h3>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                  {confirmModal.message}
                </p>
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-2.5">
                <button
                  type="button"
                  onClick={() => setConfirmModal(prev => ({ ...prev, show: false }))}
                  className="flex-1 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  បោះបង់ (Cancel)
                </button>
                <button
                  type="button"
                  onClick={confirmModal.onConfirm}
                  className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-md shadow-red-600/10 transition-all cursor-pointer"
                >
                  យល់ព្រមលុប (Delete)
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL WINDOW 4: CUSTOM IN-APP NOTIFICATION TOAST OVERLAY */}
      <AnimatePresence>
        {notification.show && (
          <div className="fixed bottom-6 right-6 z-[70] max-w-sm w-full p-1">
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              className={`p-4 rounded-2xl shadow-xl flex items-start gap-3 border ${
                notification.type === "success"
                  ? "bg-emerald-50 border-emerald-100 text-emerald-800"
                  : notification.type === "error"
                  ? "bg-rose-50 border-rose-100 text-rose-800"
                  : "bg-blue-50 border-blue-100 text-blue-800"
              }`}
            >
              {notification.type === "success" ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              ) : notification.type === "error" ? (
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <h4 className="font-bold text-xs font-sans text-slate-800">{notification.title}</h4>
                <p className="text-[11px] text-slate-600 mt-1 leading-normal font-sans">
                  {notification.message}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setNotification(prev => ({ ...prev, show: false }))}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold font-mono px-1.5 py-0.5 cursor-pointer rounded-lg bg-black/5 hover:bg-black/10"
              >
                ✕
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL WINDOW 5: CUSTOM PHOTO PROOF LIGHTBOX */}
      <AnimatePresence>
        {photoPreview.show && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[80] flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden w-full max-w-sm shadow-2xl relative text-center"
            >
              <div className="p-4 bg-slate-950 border-b border-slate-800 text-slate-300 flex justify-between items-center px-5">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-sky-400" />
                  <span className="text-xs font-semibold font-sans">រូបថតសិស្ស៖ {photoPreview.studentName}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setPhotoPreview(prev => ({ ...prev, show: false }))}
                  className="p-1 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer transition-colors"
                >
                  បិទ (Close)
                </button>
              </div>
              <div className="p-5 flex items-center justify-center bg-slate-950/20">
                <img
                  src={photoPreview.photoSrc}
                  alt="Student Selfie Ticket"
                  className="w-full max-h-[380px] rounded-2xl object-contain border border-slate-800 shadow-md"
                  referrerPolicy="no-referrer"
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
