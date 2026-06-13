/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as XLSX from "xlsx";
import { Student, AttendanceRecord } from "./types";

// Dynamic Khmer and English column mapping
const COLUMN_MAPPINGS = {
  id: ["id", "លេខសម្គាល់", "លេខកូដ", "student id", "student_id", "លេខកូដសិស្ស", "អាយឌី", "កូដសិស្ស", "ល.រ", "លរ", "no", "no."],
  name: ["name", "ឈ្មោះ", "កម្រងឈ្មោះ", "full name", "fullname", "ឈ្មោះសិស្ស", "គោត្តនាម", "នាម", "គោត្តនាម និងនាម", "គោត្តនាម-នាម"],
  gender: ["gender", "ភេទ", "gender_slug", "sex"],
  classId: ["classid", "class", "ថ្នាក់", "ថ្នាក់រៀន", "classroom", "class_id", "ក្រុម"],
  dob: ["dob", "ថ្ងៃកំណើត", "ថ្ងៃខែឆ្នាំកំណើត", "date of birth", "birth", "dob_date", "ថ្ងៃ ខែ ឆ្នាំ កំណើត", "ថ្ងៃខែឆ្នាំ"],
};

/**
 * Parses user uploaded Excel file and returns normalized Student objects.
 * Supports both Khmer & English column headers.
 */
export function parseStudentsExcel(file: File): Promise<Student[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        // Parse workbook
        const workbook = XLSX.read(data, { type: "binary", codepage: 65001 }); // 65001 is UTF-8 code page
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Convert to array of arrays or JSON
        const rawRows = XLSX.utils.sheet_to_json<any>(worksheet, { header: 1 });
        if (rawRows.length === 0) {
          resolve([]);
          return;
        }

        const headers = (rawRows[0] as string[]).map(h => String(h).trim().toLowerCase());
        const dataRows = rawRows.slice(1);

        // Find matches for our keys
        const findIndex = (keys: string[]) => {
          return headers.findIndex(h => keys.some(key => h === key || h.includes(key)));
        };

        const idIdx = findIndex(COLUMN_MAPPINGS.id);
        const nameIdx = findIndex(COLUMN_MAPPINGS.name);
        const genderIdx = findIndex(COLUMN_MAPPINGS.gender);
        const dobIdx = findIndex(COLUMN_MAPPINGS.dob);
        const classIdx = findIndex(COLUMN_MAPPINGS.classId);

        // Map raw data rows to robust Student models
        const students: Student[] = [];
        dataRows.forEach((row: any[], index) => {
          if (!row || row.length === 0) return;

          // Resolve values
          const nameVal = nameIdx !== -1 && row[nameIdx] ? String(row[nameIdx]).trim() : "";
          if (!nameVal) return; // Skip rows without name

          const idVal = idIdx !== -1 && row[idIdx] ? String(row[idIdx]).trim() : `S-${Date.now()}-${index}`;
          const rawGender = genderIdx !== -1 && row[genderIdx] ? String(row[genderIdx]).trim() : "M";
          const dobVal = dobIdx !== -1 && row[dobIdx] ? String(row[dobIdx]).trim() : "";
          const classVal = classIdx !== -1 && row[classIdx] ? String(row[classIdx]).trim() : "B10";

          // Format gender
          let gender: 'M' | 'F' = "M";
          if (rawGender.toLowerCase().startsWith("f") || rawGender === "ស្រី" || rawGender === "ស្រី្" || rawGender.includes("female") || rawGender.includes("F")) {
            gender = "F";
          }

          students.push({
            id: idVal,
            name: nameVal,
            gender,
            dob: dobVal,
            classId: classVal.toUpperCase(),
            qrStatus: false
          });
        });

        resolve(students);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsBinaryString(file);
  });
}

/**
 * Downloads a list of students as a beautiful Khmer-labeled excel sheet.
 * Segregates students by classroom tabs!
 */
export function exportStudentsToExcel(students: Student[], filename = "បញ្ជីឈ្មោះសិស្ស_តាមថ្នាក់.xlsx") {
  const wb = XLSX.utils.book_new();

  // Group students by Class
  const classes = Array.from(new Set(students.map(s => s.classId || "B10"))).sort();

  classes.forEach(cls => {
    const classStudents = students.filter(s => s.classId === cls);
    
    // Build Khmer Rows
    const excelRows = classStudents.map((s, idx) => ({
      "ល.រ (No.)": idx + 1,
      "អត្តលេខសិស្ស (Student ID)": s.id,
      "ឈ្មោះសិស្ស (Student Name)": s.name,
      "ភេទ (Gender)": s.gender === "M" ? "ប្រុស (M)" : "ស្រី (F)",
      "ថ្ងៃខែឆ្នាំកំណើត (DOB)": s.dob || "មិនទាន់បញ្ចូល",
      "ថ្នាក់រៀន (Class)": s.classId
    }));

    const ws = XLSX.utils.json_to_sheet(excelRows);
    
    // Set column widths for beautiful layout in MS Excel
    ws["!cols"] = [
      { wch: 10 }, // No.
      { wch: 25 }, // Student ID
      { wch: 30 }, // Name
      { wch: 15 }, // Gender
      { wch: 15 }  // Class
    ];

    XLSX.utils.book_append_sheet(wb, ws, `ថ្នាក់_${cls}`);
  });

  if (classes.length === 0) {
    // Empty sheet fallback
    const ws = XLSX.utils.json_to_sheet([{ "សារ": "គ្មានទិន្នន័យ" }]);
    XLSX.utils.book_append_sheet(wb, ws, "ទិន្នន័យទទេ");
  }

  XLSX.writeFile(wb, filename);
}

/**
 * Downloads attendance logs of a session/date range.
 * Segregates student records by classroom into distinct Excel tabs.
 */
export function exportAttendanceToExcel(records: AttendanceRecord[], className: string, title: string, filename = "ស្រង់វត្តមាន.xlsx") {
  const wb = XLSX.utils.book_new();

  // Group the records by Class so each class goes to its own sheet
  const classes = Array.from(new Set(records.map(r => r.classId))).sort();

  classes.forEach(cls => {
    const classRecords = records.filter(r => r.classId === cls);

    const excelRows = classRecords.map((r, idx) => {
      // Readable time
      const timeStr = r.timestamp ? new Date(r.timestamp).toLocaleTimeString("km-KH", { hour: "2-digit", minute: "2-digit" }) : "";
      const dateStr = r.timestamp ? new Date(r.timestamp).toLocaleDateString("km-KH") : "";

      let statusKh = "អវត្តមាន (Absent)";
      if (r.status === "Present") statusKh = "វត្តមាន (Present)";
      if (r.status === "Late") statusKh = "យឺត (Late)";

      return {
        "ល.រ (No.)": idx + 1,
        "អត្តលេខ (ID)": r.studentId,
        "ឈ្មោះសិស្ស (Name)": r.studentName,
        "ភេទ (Gender)": r.gender === "M" ? "ប្រុស (M)" : "ស្រី (F)",
        "ថ្នាក់ (Class)": r.classId,
        "កាលបរិច្ឆេទ (Date)": dateStr,
        "ម៉ោងស្កេនវត្តមាន (Check-in Time)": timeStr,
        "ស្ថានភាពវត្តមាន (Status)": statusKh
      };
    });

    const ws = XLSX.utils.json_to_sheet(excelRows);

    // Dynamic width calculation
    ws["!cols"] = [
      { wch: 8 },  // No.
      { wch: 18 }, // ID
      { wch: 28 }, // Name
      { wch: 12 }, // Gender
      { wch: 12 }, // Class
      { wch: 18 }, // Date
      { wch: 22 }, // Time
      { wch: 25 }  // Status
    ];

    XLSX.utils.book_append_sheet(wb, ws, `ថ្នាក់_${cls}`);
  });

  if (classes.length === 0) {
    const ws = XLSX.utils.json_to_sheet([{ "សារ": "គ្មានវត្តមានត្រូវបានកត់ត្រាឡើយ" }]);
    XLSX.utils.book_append_sheet(wb, ws, "គ្មានវត្តមាន");
  }

  XLSX.writeFile(wb, `${title}_${filename}`);
}
