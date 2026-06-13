/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { GraduationCap, QrCode, Lock, ChevronRight, BookOpen, Clock, Users2, Sparkles, RefreshCw } from "lucide-react";
import { DBState } from "./types";
import StudentCheckIn from "./components/StudentCheckIn";
import TeacherDashboard from "./components/TeacherDashboard";

export default function App() {
  const [dbState, setDbState] = useState<DBState | null>(null);
  const [appUrl, setAppUrl] = useState<string>("");
  const [mode, setMode] = useState<"gate" | "student" | "teacher">("gate");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // URL query state
  const [urlSessionId, setUrlSessionId] = useState<string | null>(null);
  const [urlClassId, setUrlClassId] = useState<string | null>(null);
  const [urlStudentId, setUrlStudentId] = useState<string | null>(null);

  const fetchState = async () => {
    try {
      const res = await fetch("/api/state");
      if (!res.ok) throw new Error("មិនអាចទទួលបានទិន្នន័យពីម៉ាស៊ីនមេឡើយ");
      const data = await res.json();
      setDbState(data);
    } catch (err: any) {
      setError(err.message || "ការភ្ជាប់ទៅកាន់ម៉ាស៊ីនមេបានរំខាន");
    } finally {
      setLoading(false);
    }
  };

  // Setup app state on load
  useEffect(() => {
    // Dynamically retrieve URL info
    setAppUrl(window.location.origin);

    // Initial load
    fetchState();

    // Check query params
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("session") || params.get("sessionId");
    const classId = params.get("class") || params.get("classId");
    const studentId = params.get("studentId") || params.get("id");
    const queryMode = params.get("mode");

    if (sessionId) {
      setUrlSessionId(sessionId);
      setMode("student");
    } else if (studentId) {
      setUrlStudentId(studentId);
      setMode("student");
    } else if (classId) {
      setUrlClassId(classId);
      setMode("student");
    } else if (queryMode === "teacher") {
      setMode("teacher");
    } else if (queryMode === "student") {
      setMode("student");
    }
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0C10] flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <RefreshCw className="w-10 h-10 animate-spin text-indigo-500 mx-auto" />
          <p className="text-sm font-semibold text-slate-400 font-sans">កំពុងភ្ជាប់ទៅកាន់ប្រព័ន្ធ និងផ្ទុកទិន្នន័យ...</p>
        </div>
      </div>
    );
  }

  if (error || !dbState) {
    return (
      <div className="min-h-screen bg-[#0A0C10] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-[#151921] rounded-3xl p-8 shadow-xl text-center border border-white/10">
          <div className="w-14 h-14 bg-red-500/10 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Lock className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-bold text-white">ការភ្ជាប់ទៅកាន់ Server បានរអាក់រអួល</h3>
          <p className="text-slate-400 text-sm mt-2">{error || "សូមពិនិត្យមើលថាតើ Node server កំពុងដំណើរការដែរឬទេ"}</p>
          <button
            onClick={fetchState}
            className="mt-6 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold transition-colors"
          >
            ព្យាយាមឡើងវិញ (Retry)
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="font-sans antialiased text-slate-200 bg-[#0A0C10] min-h-screen">
      
      <AnimatePresence mode="wait">
        
        {/* GATEWAY PORTAL: SELECT ROLE */}
        {mode === "gate" && (
          <motion.div
            key="gateway-gate"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="min-h-screen flex items-center justify-center p-4 bg-[#0A0C10]"
          >
            <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* BRAND CARD HEADER */}
              <div className="md:col-span-2 text-center space-y-2 mb-4">
                <div className="inline-flex p-3 bg-[#151921] border border-white/10 rounded-2xl shadow-sm text-indigo-400">
                  <GraduationCap className="w-12 h-12" />
                </div>
                <h1 className="text-3xl font-extrabold text-white tracking-tight font-sans">
                  ប្រព័ន្ធស្រង់វត្តមាននិស្សិតតាម QR Code
                </h1>
                <p className="text-slate-400 text-sm max-w-lg mx-auto leading-relaxed">
                  សូមជ្រើសរើសរបៀបប្រើប្រាស់ស្របតាមតួនាទីរបស់អ្នកនៅក្នុងសាកលវិទ្យាល័យ (Class B10 - B30)។
                </p>
              </div>

              {/* CARD 1: STUDENT ACCESS PORTAL */}
              <motion.div
                whileHover={{ y: -4, scale: 1.01 }}
                onClick={() => setMode("student")}
                className="bg-[#151921] border border-white/10 rounded-3xl p-8 hover:border-indigo-500 transition-all shadow-xl cursor-pointer flex flex-col justify-between text-left group"
              >
                <div className="space-y-6">
                  <div className="w-14 h-14 bg-white/5 text-slate-300 rounded-2xl flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300">
                    <QrCode className="w-8 h-8" />
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-2xl font-bold font-sans text-white tracking-tight">សិស្សស្កេនវត្តមាន</h2>
                    <p className="text-slate-400 text-sm font-light leading-relaxed">
                      ចុះឈ្មោះវត្តមានរបស់ខ្លួនឯងដោយការស្កេនកូដ QR ពីគ្រូបង្រៀន ឬស្វែងរកឈ្មោះរបស់ខ្លួនជាមួយកាមេរ៉ាទូរស័ព្ទ។
                    </p>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between text-indigo-400 font-bold text-sm">
                  <span>ស្កេនវត្តមានទីនេះ (Student Check-In)</span>
                  <ChevronRight className="w-5 h-5 group-hover:translate-x-1.5 transition-transform" />
                </div>
              </motion.div>

              {/* CARD 2: TEACHER ACCESS PORTAL */}
              <motion.div
                whileHover={{ y: -4, scale: 1.01 }}
                onClick={() => setMode("teacher")}
                className="bg-[#151921] border border-white/10 rounded-3xl p-8 hover:border-indigo-500 transition-all shadow-xl cursor-pointer flex flex-col justify-between text-left group"
              >
                <div className="space-y-6 text-white">
                  <div className="w-14 h-14 bg-white/5 text-slate-300 rounded-2xl flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300">
                    <Lock className="w-7 h-7" />
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-2xl font-bold font-sans text-white tracking-tight">គ្រូបង្រៀន / គ្រប់គ្រង</h2>
                    <p className="text-slate-400 text-sm font-light leading-relaxed">
                      បង្កើតកាលវិភាគបង្រៀន បង្ហាញ QR Code ស្រង់វត្តមាន នាំចូលសិស្សពី Excel (Khmer Font) និងទាញយកកំណត់ត្រាសាលា។
                    </p>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between text-indigo-400 font-bold text-sm">
                  <span>គ្រប់គ្រងប្រព័ន្ធគ្រូ (Teacher Panel)</span>
                  <ChevronRight className="w-5 h-5 group-hover:translate-x-1.5 transition-transform" />
                </div>
              </motion.div>

              {/* FOOTER */}
              <div className="md:col-span-2 text-center text-xs text-slate-500 py-4 border-t border-white/5 mt-4 leading-normal">
                ប្រព័ន្ធស្រង់វត្តមានរសិស្ស ស្គាល់ហ្វុនអក្សរខ្មែរ ១០០% ៖ ថ្នាក់ B10 ដល់ B30 របស់សាកលវិទ្យាល័យ។
              </div>

            </div>
          </motion.div>
        )}

        {/* MODE 1: STUDENT VIEW PATH */}
        {mode === "student" && (
          <motion.div
            key="student-view-portal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="relative"
          >
            {/* Quick Back to Welcome Gate for Student, unless pre-locked url */}
            {!urlSessionId && !urlStudentId && (
              <button
                id="back-to-gate-from-student"
                onClick={() => setMode("gate")}
                className="absolute top-4 left-4 z-50 bg-[#151921] hover:bg-white/10 border border-white/10 p-2.5 rounded-xl font-semibold text-slate-300 flex items-center gap-1.5 text-xs shadow-sm cursor-pointer"
              >
                <ChevronRight className="w-4 h-4 rotate-180" /> ត្រឡប់ក្រោយ (Gateway)
              </button>
            )}

            <StudentCheckIn
              dbState={dbState}
              onRefresh={fetchState}
              initialSessionId={urlSessionId}
              initialClassId={urlClassId}
              userId={urlStudentId || undefined}
            />
          </motion.div>
        )}

        {/* MODE 2: TEACHER VIEW PATH */}
        {mode === "teacher" && (
          <motion.div
            key="teacher-view-portal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Quick gateway exit button */}
            <div className="bg-[#0F1218] px-6 py-2 border-b border-white/5 flex justify-between items-center text-slate-400 text-xs md:hidden">
              <button
                onClick={() => setMode("gate")}
                className="flex items-center gap-1 text-slate-300 font-bold cursor-pointer"
              >
                <ChevronRight className="w-3.5 h-3.5 rotate-180" /> ថយក្រោយ (Gateway)
              </button>
              <span>គ្រប់គ្រងវត្តមាន</span>
            </div>

            <TeacherDashboard
              dbState={dbState}
              onRefresh={fetchState}
              appUrl={appUrl}
            />
          </motion.div>
        )}

      </AnimatePresence>

    </div>
  );
}
