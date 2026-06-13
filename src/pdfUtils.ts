/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Student, AttendanceSession, AttendanceRecord } from "./types";

/**
 * Generates a clean, print-optimized document for the current session's attendance
 * and opens the browser's native print-to-PDF dialog.
 */
export function exportAttendanceToPDF(
  session: AttendanceSession,
  students: Student[],
  records: AttendanceRecord[]
) {
  // Sort students alphabetically by name or ID
  const sortedStudents = [...students].sort((a, b) => a.name.localeCompare(b.name, "km"));

  // Calculate stats
  const total = students.length;
  const presentCount = records.filter(r => r.status === "Present").length;
  const lateCount = records.filter(r => r.status === "Late").length;
  const absentCount = total - (presentCount + lateCount);
  const boysCount = students.filter(s => s.gender === "M").length;
  const girlsCount = students.filter(s => s.gender === "F").length;
  const presentRate = total > 0 ? Math.round(((presentCount + lateCount) / total) * 100) : 0;

  // Build rows
  const tableRows = sortedStudents.map((student, index) => {
    const record = records.find(r => r.studentId === student.id);
    let statusLabel = "";
    let statusClass = "";
    let timeLabel = "—";

    if (record) {
      if (record.status === "Present") {
        statusLabel = "វត្តមាន (Present)";
        statusClass = "text-emerald-700 bg-emerald-50 font-bold border border-emerald-100";
      } else if (record.status === "Late") {
        statusLabel = "យឺត (Late)";
        statusClass = "text-amber-700 bg-amber-50 font-bold border border-amber-100";
      } else {
        statusLabel = "អវត្តមាន (Absent)";
        statusClass = "text-rose-700 bg-rose-50 font-bold border border-rose-100";
      }

      if (record.timestamp) {
        try {
          const d = new Date(record.timestamp);
          timeLabel = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
        } catch {
          timeLabel = "—";
        }
      }
    } else {
      statusLabel = "អវត្តមាន (Absent)";
      statusClass = "text-rose-700 bg-rose-50 font-bold border border-rose-100";
    }

    return `
      <tr class="border-b border-slate-200 hover:bg-slate-50 transition-colors text-xs lg:text-sm">
        <td class="py-2.5 px-4 text-center font-medium font-sans text-slate-500">${index + 1}</td>
        <td class="py-2.5 px-4 font-semibold font-sans text-slate-700 text-left">${student.id}</td>
        <td class="py-2.5 px-4 font-semibold text-slate-900 text-left">${student.name}</td>
        <td class="py-2.5 px-4 text-center font-medium text-slate-700">${student.gender === "M" ? "ប្រុស" : "ស្រី"}</td>
        <td class="py-2.5 px-4 text-center font-mono font-medium text-slate-600">${timeLabel}</td>
        <td class="py-2.5 px-4 text-center">
          <span class="inline-block px-2.5 py-1 text-[11px] rounded-lg tracking-wide ${statusClass}">
            ${statusLabel}
          </span>
        </td>
      </tr>
    `;
  }).join("");

  // Create document frame
  const htmlContent = `
    <!DOCTYPE html>
    <html lang="km">
    <head>
      <meta charset="UTF-8">
      <title>របាយការណ៍វត្តមានសិស្ស - ${session.subject}</title>
      <link href="https://fonts.googleapis.com/css2?family=Kantumruy+Pro:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
      <script src="https://cdn.tailwindcss.com"></script>
      <style>
        body {
          font-family: 'Kantumruy Pro', 'Inter', 'Khmer OS Battambang', 'Segoe UI', sans-serif;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        @media print {
          @page {
            size: A4 portrait;
            margin: 15mm;
          }
          body {
            margin: 0;
            background-color: white;
            color: #0f172a;
          }
          .no-print {
            display: none !important;
          }
        }
      </style>
    </head>
    <body class="bg-white p-4 max-w-4xl mx-auto text-slate-800">
      <!-- HEADER CORNER / UNIVERSAL HEADING -->
      <div class="flex flex-col items-center justify-center text-center mb-8">
        <h2 class="text-sm font-bold text-slate-700 font-sans tracking-widest leading-loose uppercase">ព្រះរាជាណាចក្រកម្ពុជា</h2>
        <h3 class="text-xs font-semibold text-slate-600 font-sans tracking-wide leading-loose">ជាតិ សាសនា ព្រះមហាក្សត្រ</h3>
        <div class="w-16 h-0.5 bg-slate-350 my-1 justify-center block"></div>
        <div class="w-32 h-0.25 bg-slate-200 mb-6 justify-center block"></div>
        
        <h1 class="text-lg lg:text-xl font-bold text-slate-900 tracking-tight leading-normal font-sans">
          របាយការណ៍វត្តមានសិស្សប្រចាំថ្នាក់ (Attendance Report)
        </h1>
        <p class="text-[11px] text-slate-400 font-medium tracking-wider mt-1 uppercase font-mono">School Management Portal</p>
      </div>

      <!-- METADATA INFORMATION GRID -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 border border-slate-200 rounded-2xl p-5 mb-6 text-xs lg:text-sm">
        <div>
          <span class="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">មុខវិជ្ជា / Subject</span>
          <span class="font-bold text-slate-800 block text-sm mt-0.5">${session.subject || "ម៉ោងសិក្សាទូទៅ"}</span>
        </div>
        <div>
          <span class="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">ថ្នាក់រៀន / Class</span>
          <span class="font-bold text-slate-800 block text-sm mt-0.5">${session.classId}</span>
        </div>
        <div>
          <span class="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">កាលបរិច្ឆេទ / Date</span>
          <span class="font-bold text-slate-800 block text-sm mt-0.5">${session.date}</span>
        </div>
        <div>
          <span class="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">ម៉ោងសិក្សា / Session</span>
          <span class="font-bold text-slate-800 block text-sm mt-0.5">${session.timeSlot}</span>
        </div>
      </div>

      <!-- KEY STATISTICAL SUMMARY -->
      <div class="grid grid-cols-4 gap-3 bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-8">
        <div class="text-center p-2">
          <span class="text-[10px] text-slate-400 font-bold block uppercase">សិស្សសរុប (Total)</span>
          <span class="text-base lg:text-lg font-extrabold text-slate-800 font-sans block mt-1">${total} នាក់</span>
          <span class="text-[10px] text-slate-400 block font-light">(ប្រុស៖ ${boysCount} | ស្រី៖ ${girlsCount})</span>
        </div>
        <div class="text-center border-l border-slate-200 p-2">
          <span class="text-[10px] text-emerald-600 font-bold block uppercase">វត្តមាន (Present)</span>
          <span class="text-base lg:text-lg font-extrabold text-emerald-600 font-sans block mt-1">${presentCount} នាក់</span>
        </div>
        <div class="text-center border-l border-slate-200 p-2">
          <span class="text-[10px] text-amber-600 font-bold block uppercase">យឺត (Late)</span>
          <span class="text-base lg:text-lg font-extrabold text-amber-600 font-sans block mt-1">${lateCount} នាក់</span>
        </div>
        <div class="text-center border-l border-slate-200 p-2">
          <span class="text-[10px] text-rose-600 font-bold block uppercase">អវត្តមាន (Absent)</span>
          <span class="text-base lg:text-lg font-extrabold text-rose-600 font-sans block mt-1">${absentCount} នាក់</span>
        </div>
      </div>

      <!-- ATTENDANCE RATE METRIC -->
      <div class="flex items-center justify-between border-b border-slate-200 pb-2 mb-4 text-xs font-semibold text-slate-500">
        <span>បញ្ជីឈ្មោះលម្អិត និងស្ថានភាពវត្តមាន៖</span>
        <span class="bg-sky-50 text-sky-700 px-3 py-1 rounded-full uppercase tracking-wider font-mono text-[10px]">
          អត្រាវត្តមាន (Attendance Rate): ${presentRate}%
        </span>
      </div>

      <!-- MAIN ATTENDANCE DATA TABLE -->
      <div class="overflow-x-auto border border-slate-200 rounded-2xl">
        <table class="w-full text-sm text-left text-slate-500 border-collapse">
          <thead class="text-xs text-slate-700 uppercase bg-slate-50 border-b border-slate-200 font-bold">
            <tr>
              <th scope="col" class="py-3 px-4 text-center w-12">ល.រ</th>
              <th scope="col" class="py-3 px-4 text-left w-32">ល.កូដសិស្ស (ID)</th>
              <th scope="col" class="py-3 px-4 text-left">ឈ្មោះសិស្ស</th>
              <th scope="col" class="py-3 px-4 text-center w-20">ភេទ</th>
              <th scope="col" class="py-3 px-4 text-center w-36">ម៉ោងចុះវត្តមាន</th>
              <th scope="col" class="py-3 px-4 text-center w-40">ស្ថានភាព</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows || `
              <tr>
                <td colspan="6" class="py-12 text-center text-slate-400 bg-white">
                  គ្មានទិន្នន័យសិស្ស ឬវត្តមានក្នុងថ្នាក់នេះឡើយ។
                </td>
              </tr>
            `}
          </tbody>
        </table>
      </div>

      <!-- FOOTER SIGN-OFF SECTION -->
      <div class="mt-16 flex justify-between gap-8 text-xs lg:text-sm text-slate-600 px-4">
        <div class="text-left space-y-1">
          <p class="font-medium">រៀបចំដោយគ្រូបង្រៀន (Teacher's Signature)</p>
          <div class="h-16"></div>
          <p class="text-slate-400">......................................................</p>
        </div>
        <div class="text-right space-y-1">
          <p class="font-medium">កាលបរិច្ឆេទ (Date)</p>
          <div class="h-16 font-mono text-slate-500 flex items-end justify-end">
            ${new Date().toLocaleDateString("km-KH", { day: "numeric", month: "long", year: "numeric" })}
          </div>
          <p class="text-slate-400">......................................................</p>
        </div>
      </div>
    </body>
    </html>
  `;

  // Create temporary iframe for standalone execution
  const iframe = document.createElement("iframe");
  iframe.style.position = "absolute";
  iframe.style.width = "0px";
  iframe.style.height = "0px";
  iframe.style.border = "none";
  document.body.appendChild(iframe);

  const iframeDoc = iframe.contentWindow?.document || iframe.contentDocument;
  if (iframeDoc) {
    iframeDoc.open();
    iframeDoc.write(htmlContent);
    iframeDoc.close();

    // Trigger printed context focus once stylesheets load
    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      
      // Cleanup after print dialog dismisses
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 1000);
    }, 550);
  }
}
