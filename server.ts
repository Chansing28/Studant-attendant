/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { DBState, Student, AttendanceSession, AttendanceRecord } from "./src/types";

// Database File Path
const DB_FILE = path.join(process.cwd(), "attendance_db.json");

// Helper to read DB state
function readDB(): DBState {
  try {
    if (!fs.existsSync(DB_FILE)) {
      // Return a default populated DB state with authentic Khmer sample students to showcase the visual system immediately
      const defaultState: DBState = {
        students: [
          { id: "S1001", name: "សុខ ជា", gender: "M", dob: "2005-04-12", classId: "B10" },
          { id: "S1002", name: "ចាន់ ភារម្យ", gender: "M", dob: "2004-11-23", classId: "B10" },
          { id: "S1003", name: "ម៉ៅ សុខា", gender: "F", dob: "2005-08-30", classId: "B10" },
          { id: "S1004", name: "សេង ហុង", gender: "M", dob: "2004-01-15", classId: "B11" },
          { id: "S1005", name: "លី ស្រីនី", gender: "F", dob: "2005-09-05", classId: "B11" },
          { id: "S1006", name: "កែវ សុវណ្ណ", gender: "F", dob: "2004-06-20", classId: "B20" },
          { id: "S1007", name: "ជា តារា", gender: "M", dob: "2003-12-10", classId: "B20" },
          { id: "S1008", name: "សំ អាង", gender: "F", dob: "2005-02-14", classId: "B30" },
          { id: "S1009", name: "ហេង វិសាល", gender: "M", dob: "2004-07-19", classId: "B30" }
        ],
        sessions: [
          { id: "sess-default-1", classId: "B10", date: new Date().toISOString().split('T')[0], timeSlot: "08:00 - 09:30", subject: "គណិតវិទ្យាជាន់ខ្ពស់", createdAt: new Date().toISOString() }
        ],
        records: [
          { id: "rec-def-1", sessionId: "sess-default-1", studentId: "S1001", studentName: "សុខ ជា", gender: "M", dob: "2005-04-12", classId: "B10", timestamp: new Date().toISOString(), status: "Present" }
        ],
        settings: {
          teacherPin: "1511"
        }
      };
      fs.writeFileSync(DB_FILE, JSON.stringify(defaultState, null, 2), "utf8");
      return defaultState;
    }
    const data = fs.readFileSync(DB_FILE, "utf8");
    return JSON.parse(data);
  } catch (err) {
    console.error("Error reading database file, returning raw default structure", err);
    return { students: [], sessions: [], records: [], settings: { teacherPin: "1511" } };
  }
}

// Helper to write DB state
function writeDB(state: DBState) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(state, null, 2), "utf8");
  } catch (err) {
    console.error("Failed to write to database file", err);
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // JSON request limit increased to accommodate student selfie base64 image transfers
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // API: Get complete state
  app.get("/api/state", (req, res) => {
    const db = readDB();
    res.json(db);
  });

  // API: Verify student check-in
  app.post("/api/check-in", (req, res) => {
    let { sessionId, studentId, studentName, photo, status } = req.body;
    if (!sessionId) {
       res.status(400).json({ error: "ត្រូវការលេខកូដម៉ោងសិក្សា (Missing Session)" });
       return;
    }
    if (!studentId && !studentName) {
       res.status(400).json({ error: "ត្រូវការឈ្មោះសិស្ស (Missing Student Name)" });
       return;
    }

    const db = readDB();
    const session = db.sessions.find(s => s.id === sessionId);

    if (!session) {
       res.status(404).json({ error: "រកមិនឃើញម៉ោងសិក្សា ឬថ្នាក់នេះទេ (Session not found)" });
       return;
    }

    let student = db.students.find(s => s.id === studentId);
    
    // Fallback: If not found by ID, try searching by exact name in this class
    if (!student && studentName) {
      student = db.students.find(s => s.name.trim().toLowerCase() === studentName.trim().toLowerCase() && s.classId === session.classId);
    }

    // Dynamic fallback: If student still is not in the DB, self-register them in this class!
    if (!student && studentName) {
      student = {
        id: `S-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
        name: studentName.trim(),
        gender: "M", // default male, can update
        dob: "",
        classId: session.classId
      };
      db.students.push(student);
      studentId = student.id;
    }

    if (!student) {
       res.status(404).json({ error: "រកមិនឃើញព័ត៌មានលម្អិតសិស្សនេះទេ (Student not found)" });
       return;
    }

    // Check if classroom matches
    if (student.classId !== session.classId) {
       res.status(400).json({ error: `សិស្សនេះស្ថិតក្នុងថ្នាក់ ${student.classId} មិនមែនថ្នាក់ ${session.classId} ទេ!` });
       return;
    }

    // Find and update or create attendance record
    const existingIndex = db.records.findIndex(r => r.sessionId === session.id && r.studentId === student.id);
    
    const record: AttendanceRecord = {
      id: existingIndex !== -1 ? db.records[existingIndex].id : `rec-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      sessionId,
      studentId: student.id,
      studentName: student.name,
      gender: student.gender,
      dob: student.dob,
      classId: student.classId,
      timestamp: new Date().toISOString(),
      photo: photo || (existingIndex !== -1 ? db.records[existingIndex].photo : undefined),
      status: status || "Present"
    };

    if (existingIndex !== -1) {
       db.records[existingIndex] = record;
    } else {
       db.records.push(record);
    }

    writeDB(db);
    res.json({ success: true, record });
  });

  // API: Bulk import students (replaces or appends)
  app.post("/api/students/import", (req, res) => {
    const { students, replaceAll } = req.body;
    if (!Array.isArray(students)) {
       res.status(400).json({ error: "ទិន្នន័យសិស្សត្រូវតែជាទម្រង់បញ្ជី (Students data must be an array)" });
       return;
    }

    const db = readDB();
    
    const preparedList: Student[] = students.map((s: any, idx: number) => ({
      id: String(s.id || s.Id || `S-${Date.now()}-${idx}-${Math.floor(100 + Math.random() * 900)}`),
      name: String(s.name || s.Name || "គ្មានឈ្មោះ"),
      gender: s.gender === "Female" || s.gender === "F" || s.gender === "ស្រី" ? "F" : "M",
      dob: String(s.dob || s.DOB || ""),
      classId: String(s.classId || s.Class || s.ថ្នាក់ || "B10").trim().toUpperCase(),
      photo: s.photo || undefined,
      qrStatus: s.qrStatus || false
    }));

    if (replaceAll) {
      db.students = preparedList;
    } else {
      // Merge by ID
      preparedList.forEach(newS => {
        const idx = db.students.findIndex(os => os.id === newS.id);
        if (idx !== -1) {
          db.students[idx] = { ...db.students[idx], ...newS };
        } else {
          db.students.push(newS);
        }
      });
    }

    writeDB(db);
    res.json({ success: true, count: preparedList.length, total: db.students.length });
  });

  // API: CRUD Student - Create Single
  app.post("/api/students", (req, res) => {
    const student = req.body;
    if (!student.name || !student.classId) {
       res.status(400).json({ error: "ត្រូវបំពេញឈ្មោះ និងថ្នាក់ (Name and class are required)" });
       return;
    }
    const db = readDB();
    // Prevent duplicate identification
    const existing = db.students.find(s => s.id === student.id);
    if (existing) {
       res.status(400).json({ error: `មានសិស្សដែលមានលេខសំគាល់ ID: ${student.id} រួចហើយ!` });
       return;
    }

    const newStudent: Student = {
      id: student.id || `S-${Date.now()}`,
      name: student.name,
      gender: student.gender || "M",
      dob: student.dob || "",
      classId: student.classId.trim().toUpperCase(),
      photo: student.photo || undefined,
      qrStatus: !!student.qrStatus
    };

    db.students.push(newStudent);
    writeDB(db);
    res.json({ success: true, student: newStudent });
  });

  // API: CRUD Student - Update Single
  app.put("/api/students/:id", (req, res) => {
    const { id } = req.params;
    const updateData = req.body;
    
    const db = readDB();
    const idx = db.students.findIndex(s => s.id === id);
    if (idx === -1) {
       res.status(404).json({ error: "រកមិនឃើញសិស្សម្នាក់នេះកែប្រែទេ" });
       return;
    }

    db.students[idx] = {
      ...db.students[idx],
      name: updateData.name || db.students[idx].name,
      gender: updateData.gender || db.students[idx].gender,
      dob: updateData.dob || db.students[idx].dob,
      classId: (updateData.classId || db.students[idx].classId).trim().toUpperCase(),
      photo: updateData.photo !== undefined ? updateData.photo : db.students[idx].photo,
      qrStatus: updateData.qrStatus !== undefined ? updateData.qrStatus : db.students[idx].qrStatus
    };

    writeDB(db);
    res.json({ success: true, student: db.students[idx] });
  });

  // API: CRUD Student - Delete Single
  app.delete("/api/students/:id", (req, res) => {
    const { id } = req.params;
    const db = readDB();
    const filtered = db.students.filter(s => s.id !== id);
    if (filtered.length === db.students.length) {
       res.status(404).json({ error: "រកមិនឃើញសិស្សសម្រាប់លុបទេ" });
       return;
    }
    db.students = filtered;
    // Also remove their attendance sessions records if needed, or keep history. Let's keep records.
    writeDB(db);
    res.json({ success: true });
  });

  // API: Create Attendance Session
  app.post("/api/sessions", (req, res) => {
    const { classId, date, timeSlot, subject } = req.body;
    if (!classId || !date || !timeSlot) {
       res.status(400).json({ error: "ត្រូវបំពេញថ្នាក់ ថ្ងៃខែ និងម៉ោងសិក្សា (Class, date, and timeslot are required)" });
       return;
    }

    const db = readDB();
    const newSession: AttendanceSession = {
      id: `sess-${Date.now()}`,
      classId: classId.trim().toUpperCase(),
      date,
      timeSlot,
      subject: subject || "ម៉ោងសិក្សាទូទៅ",
      createdAt: new Date().toISOString()
    };

    db.sessions.push(newSession);
    writeDB(db);
    res.json({ success: true, session: newSession });
  });

  // API: Delete Attendance Session
  app.delete("/api/sessions/:id", (req, res) => {
    const { id } = req.params;
    const db = readDB();
    db.sessions = db.sessions.filter(s => s.id !== id);
    // Also clear associated attendance records
    db.records = db.records.filter(r => r.sessionId !== id);
    writeDB(db);
    res.json({ success: true });
  });

  // API: Teacher Overrides or Manually Updates Record Status
  app.post("/api/records/manual", (req, res) => {
    const { sessionId, studentId, status } = req.body;
    if (!sessionId || !studentId || !status) {
       res.status(400).json({ error: "Missing parameters" });
       return;
    }

    const db = readDB();
    const student = db.students.find(s => s.id === studentId);
    if (!student) {
       res.status(404).json({ error: "Student not found" });
       return;
    }

    const recordIndex = db.records.findIndex(r => r.sessionId === sessionId && r.studentId === studentId);
    
    const record: AttendanceRecord = {
      id: recordIndex !== -1 ? db.records[recordIndex].id : `rec-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      sessionId,
      studentId,
      studentName: student.name,
      gender: student.gender,
      dob: student.dob,
      classId: student.classId,
      timestamp: new Date().toISOString(),
      photo: recordIndex !== -1 ? db.records[recordIndex].photo : undefined,
      status: status // 'Present' | 'Late' | 'Absent'
    };

    if (recordIndex !== -1) {
      db.records[recordIndex] = record;
    } else {
      db.records.push(record);
    }

    writeDB(db);
    res.json({ success: true, record });
  });

  // API: Update Teacher PIN
  app.post("/api/settings/teacher-pin", (req, res) => {
    const { pin } = req.body;
    if (!pin || pin.length < 4) {
       res.status(400).json({ error: "PIN លេខកូដត្រូវមានយ៉ាងតិច ៤ ខ្ទង់" });
       return;
    }
    const db = readDB();
    db.settings.teacherPin = pin;
    writeDB(db);
    res.json({ success: true });
  });

  // Vite development server / production client assets rendering
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[FULLSTACK SERVER] Running on host 0.0.0.0, port ${PORT}`);
  });
}

startServer();
