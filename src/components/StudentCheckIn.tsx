/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Camera, CheckCircle2, User, RefreshCw, Calendar, Clock, BookOpen, ChevronRight, Upload, ShieldCheck, Heart } from "lucide-react";
import { DBState, Student, AttendanceSession } from "../types";

interface StudentCheckInProps {
  dbState: DBState;
  onRefresh: () => void;
  initialSessionId: string | null;
  initialClassId: string | null;
  userId?: string; // If student scans a direct personal QR code
}

export default function StudentCheckIn({
  dbState,
  onRefresh,
  initialSessionId,
  initialClassId,
  userId
}: StudentCheckInProps) {
  const [selectedClass, setSelectedClass] = useState<string>(initialClassId || "");
  const [selectedSessionId, setSelectedSessionId] = useState<string>(initialSessionId || "");
  const [selectedStudentId, setSelectedStudentId] = useState<string>(userId || "");
  const [studentNameInput, setStudentNameInput] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [success, setSuccess] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Computed lists
  const classesList = Array.from(new Set(dbState.students.map(s => s.classId))).sort();
  
  // Available sessions for the selected class
  const classSessions = dbState.sessions.filter(s => !selectedClass || s.classId === selectedClass);
  
  // Students in selected class who haven't check-in yet in this session
  const classStudents = dbState.students.filter(s => s.classId === selectedClass);
  const checkedInStudentIds = dbState.records
    .filter(r => r.sessionId === selectedSessionId)
    .map(r => r.studentId);
  const remainingStudents = classStudents.filter(s => !checkedInStudentIds.includes(s.id));

  // Sync session and class
  useEffect(() => {
    if (initialSessionId) {
      const activeSess = dbState.sessions.find(s => s.id === initialSessionId);
      if (activeSess) {
        setSelectedSessionId(initialSessionId);
        setSelectedClass(activeSess.classId);
      }
    }
  }, [initialSessionId, dbState.sessions]);

  // Sync direct student login via Personal Student QR scanning
  useEffect(() => {
    if (userId) {
      const parentStudent = dbState.students.find(s => s.id === userId);
      if (parentStudent) {
        setSelectedClass(parentStudent.classId);
        setSelectedStudentId(userId);
        setStudentNameInput(parentStudent.name);
      }
    }
  }, [userId, dbState.students]);

  // If a session gets selected, auto-select its class
  const handleSessionChange = (sessId: string) => {
    setSelectedSessionId(sessId);
    const s = dbState.sessions.find(session => session.id === sessId);
    if (s) {
      setSelectedClass(s.classId);
    }
  };

  const handleCheckInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSessionId) {
      setErrorMsg("សូមជ្រើសរើសម៉ោងសិក្សាដែលកំពុងបង្រៀន (Please select teaching hour)");
      return;
    }
    if (!studentNameInput.trim()) {
      setErrorMsg("សូមបញ្ចូលឈ្មោះរបស់អ្នកដើម្បីបន្ត (Please enter your name)");
      return;
    }

    setErrorMsg(null);
    setSubmitting(true);

    try {
      const response = await fetch("/api/check-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: selectedSessionId,
          studentId: selectedStudentId || undefined,
          studentName: studentNameInput.trim(),
          status: "Present"
        })
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.error || "ការចុះវត្តមានបានបរាជ័យ");
      }

      setSuccess(true);
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message || "មានកំហុសបច្ចេកទេសក្នុងការចុះឈ្មោះវត្តមាន (Technical error occurred)");
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setSelectedStudentId("");
    setStudentNameInput("");
    setSuccess(false);
    setErrorMsg(null);
  };

  const activeSessionDetails = dbState.sessions.find(s => s.id === selectedSessionId);

  return (
    <div id="student-check-in-pane" className="min-h-screen bg-[#0A0C10] flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-[#151921] rounded-2xl shadow-xl border border-white/5 overflow-hidden text-slate-200">
        {/* Banner */}
        <div className="bg-[#0F1218] border-b border-white/10 p-6 text-white text-center pb-8 relative">
          <div className="absolute top-4 right-4 text-xs bg-white/5 border border-white/10 px-3 py-1 rounded-full text-indigo-400 flex items-center gap-1.5 font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            និស្សិតចុះវត្តមាន
          </div>
          <h2 className="text-2xl font-bold font-sans tracking-tight">សាលាស្រង់វត្តមាន</h2>
          <p className="text-slate-400 text-sm mt-1">សូមស្កេន ឬជ្រើសរើសព័ត៌មានរបស់អ្នកដើម្បីចុះវត្តមាន</p>
        </div>

        {/* Dynamic State Layouts */}
        <AnimatePresence mode="wait">
          {success ? (
            <motion.div
              key="success-container"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="p-8 text-center"
            >
              <div className="w-20 h-20 bg-emerald-500/10 text-emerald-450 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-12 h-12" />
              </div>
              <h3 className="text-2xl font-bold text-white">ការចុះវត្តមានទទួលបានជោគជ័យ!</h3>
              <p className="text-slate-400 mt-2 font-light">
                វត្តមានរបស់ <span className="font-semibold text-indigo-400">{studentNameInput}</span> សម្រាប់ថ្នាក់ <span className="font-semibold text-white">{selectedClass}</span> ត្រូវបានកត់ត្រាក្នុងប្រព័ន្ធរួចរាល់។
              </p>

              <div className="my-6 p-4 bg-white/5 border border-white/10 rounded-xl max-w-sm mx-auto text-left space-y-2.5 text-sm text-slate-300">
                <div className="flex items-center gap-2"><Clock className="w-4 h-4 text-emerald-450" /> <span>ម៉ោងចុះ៖ {new Date().toLocaleTimeString('km-KH')}</span></div>
                {activeSessionDetails && (
                  <>
                    <div className="flex items-center gap-2"><BookOpen className="w-4 h-4 text-indigo-400" /> <span>មុខវិជ្ជា៖ {activeSessionDetails.subject || "ទូទៅ / គ្មាន"}</span></div>
                    <div className="flex items-center gap-2"><Calendar className="w-4 h-4 text-indigo-400" /> <span>ម៉ោងបង្រៀន៖ {activeSessionDetails.timeSlot}</span></div>
                  </>
                )}
              </div>

              <button
                id="reset-form-btn"
                onClick={resetForm}
                className="mt-6 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-md transition-colors font-medium text-sm cursor-pointer"
              >
                ចុះវត្តមានសិស្សផ្សេងទៀត
              </button>
            </motion.div>
          ) : (
            <motion.form
              key="attendance-form"
              onSubmit={handleCheckInSubmit}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-6 space-y-5"
            >
              {errorMsg && (
                <div className="p-3.5 bg-red-500/10 border-l-4 border-red-500 text-red-200 text-sm rounded-r-md">
                  {errorMsg}
                </div>
              )}

              {/* Step 1: Session selection if not provided */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-450 mb-1">ជ្រើសរើសថ្នាក់ (Classroom)</label>
                    <select
                      id="class-selector"
                      disabled={!!initialClassId}
                      value={selectedClass}
                      onChange={(e) => {
                        setSelectedClass(e.target.value);
                        setSelectedSessionId("");
                        setSelectedStudentId("");
                        setStudentNameInput("");
                      }}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:bg-white/5"
                    >
                      <option className="bg-[#151921] text-white" value="">-- ជ្រើសរើសថ្នាក់ --</option>
                      {classesList.map(c => (
                        <option className="bg-[#151921] text-white" key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-450 mb-1">សកម្មភាពម៉ោងសិក្សា (Session)</label>
                    <select
                      id="session-selector"
                      disabled={!!initialSessionId}
                      value={selectedSessionId}
                      onChange={(e) => handleSessionChange(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:bg-white/5"
                    >
                      <option className="bg-[#151921] text-white" value="">-- ម៉ោងសិក្សា --</option>
                      {classSessions.map(sess => (
                        <option className="bg-[#151921] text-white" key={sess.id} value={sess.id}>
                          {sess.timeSlot} ({sess.subject || "ទូទៅ"})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {activeSessionDetails && (
                  <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-xs text-indigo-300 space-y-1">
                    <div className="font-bold flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5" /> មុខវិជ្ជា៖ {activeSessionDetails.subject || "ម៉ោងសិក្សាទូទៅ"}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" style={{ minWidth: '14px' }} /> ម៉ោងបង្រៀន៖ {activeSessionDetails.timeSlot} | ថ្ងៃទី៖ {new Date(activeSessionDetails.date).toLocaleDateString('km-KH')}
                    </div>
                  </div>
                )}

                {/* Manual Name Input with Autocomplete Suggestions */}
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5 flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-indigo-400" />
                    ឈ្មោះសិស្ស (Student Name)
                  </label>
                  <input
                    type="text"
                    id="student-name-input"
                    disabled={!selectedClass}
                    placeholder={selectedClass ? "សូមវាយបញ្ចូលឈ្មោះរបស់អ្នក..." : "សូមជ្រើសរើសថ្នាក់ជាមុនសិន..."}
                    value={studentNameInput}
                    onChange={(e) => {
                      const val = e.target.value;
                      setStudentNameInput(val);
                      const matched = classStudents.find(
                        s => s.name.trim().toLowerCase() === val.trim().toLowerCase()
                      );
                      if (matched) {
                        setSelectedStudentId(matched.id);
                      } else {
                        setSelectedStudentId("");
                      }
                    }}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-semibold text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                  />

                  {/* Autocomplete Quick Choices */}
                  {selectedClass && remainingStudents.length > 0 && (
                    <div className="mt-2.5">
                      <p className="text-[11px] text-slate-400 mb-1.5">
                        ប៉ះលើឈ្មោះខាងក្រោមដើម្បីបំពេញរហ័ស (Tap to fill name):
                      </p>
                      <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1 bg-white/5 rounded-lg border border-white/5">
                        {remainingStudents
                          .filter(s => !studentNameInput || s.name.toLowerCase().includes(studentNameInput.toLowerCase()))
                          .map(student => (
                            <button
                              key={student.id}
                              type="button"
                              onClick={() => {
                                setStudentNameInput(student.name);
                                setSelectedStudentId(student.id);
                              }}
                              className="px-2 py-1 bg-indigo-600/10 hover:bg-indigo-600/30 text-indigo-300 rounded text-xs transition-colors cursor-pointer"
                            >
                              {student.name} ({student.gender === "M" ? "ប្រុស" : "ស្រី"})
                            </button>
                          ))}
                        {selectedClass && remainingStudents.filter(s => !studentNameInput || s.name.toLowerCase().includes(studentNameInput.toLowerCase())).length === 0 && (
                          <span className="text-[10px] text-slate-500 px-2 py-0.5">ផ្ទូគ្នា ឬបំពេញឈ្មោះដោយខ្លួនឯង</span>
                        )}
                      </div>
                    </div>
                  )}

                  {selectedClass && remainingStudents.length === 0 && (
                    <p className="text-[11px] text-emerald-450 mt-1">
                      សិស្សទាំងអស់បានចុះវត្តមានរួចរាល់ហើយ! (All present)
                    </p>
                  )}
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                id="submit-attendance-btn"
                disabled={submitting || !studentNameInput.trim() || !selectedSessionId}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl py-3 text-sm font-bold shadow-lg shadow-indigo-600/10 active:scale-[0.98] transition-all disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    កំពុងបញ្ជូនវត្តមាន... (Submitting...)
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4.5 h-4.5" />
                    បញ្ជាក់វត្តមានរបស់ខ្ញុំ (Check In Now)
                  </>
                )}
              </button>
            </motion.form>
          )}
        </AnimatePresence>

        {/* Footer */}
        <div className="bg-[#0F1218] p-4 border-t border-white/5 text-center text-xs text-slate-500 font-mono flex items-center justify-center gap-1">
          Made with <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500 animate-pulse" /> for Academic Excellence
        </div>
      </div>
    </div>
  );
}
