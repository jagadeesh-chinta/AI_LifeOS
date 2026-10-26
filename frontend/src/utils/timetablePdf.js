import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Helper to draw modern AI LifeOS branded header
const drawBrandHeader = (doc, title, subtitle, metaRight) => {
  const pageWidth = doc.internal.pageSize.getWidth();

  // Top Navy Header Banner
  doc.setFillColor(15, 23, 42); // #0f172a
  doc.rect(0, 0, pageWidth, 75, 'F');

  // Gradient Accent Strip (Purple to Cyan)
  doc.setFillColor(139, 92, 246); // #8b5cf6
  doc.rect(0, 72, pageWidth * 0.5, 3, 'F');
  doc.setFillColor(6, 182, 212); // #06b6d4
  doc.rect(pageWidth * 0.5, 72, pageWidth * 0.5, 3, 'F');

  // Header Brand
  doc.setFontSize(20);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text('AI LifeOS', 40, 36);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(6, 182, 212);
  doc.text(subtitle || 'INTELLIGENT TIMETABLE & SCHEDULING SUITE', 40, 52);

  // Timetable Title Right
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text(title, pageWidth - 40, 36, { align: 'right' });

  // Meta / Date Right
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184); // #94a3b8
  const dateStr = metaRight || `Generated: ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  doc.text(dateStr, pageWidth - 40, 52, { align: 'right' });

  return 95; // startY for content
};

const drawFooter = (doc) => {
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184);
    doc.text('AI LifeOS • Timetable Planning & Productivity Suites', 40, pageHeight - 20);
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - 40, pageHeight - 20, { align: 'right' });
  }
};

/**
 * 1. Export Daily Life Timetable to PDF
 */
export const exportDailyLifePdf = (timetable) => {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'pt',
    format: 'a4'
  });

  const title = timetable.title || 'Daily Life Routine Timetable';
  let startY = drawBrandHeader(
    doc,
    title,
    'PERSONAL WEEKLY ROUTINE & ACTIVITY BLUEPRINT',
    timetable.settings?.week_start_date ? `Week of ${timetable.settings.week_start_date}` : null
  );

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const activities = timetable.data?.activities || [];

  // Flatten and order activities by day and start_time
  const rows = [];
  days.forEach((day) => {
    const dayActs = activities.filter((a) => {
      if (Array.isArray(a.days)) return a.days.includes(day) || a.days.includes('Daily');
      return a.day === day || a.day === 'Daily' || a.day_of_week === day;
    }).sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''));

    if (dayActs.length === 0) {
      rows.push([day, '—', 'Free Time / Rest', 'Personal', 'Unscheduled leisure & recreation', '—']);
    } else {
      dayActs.forEach((act, idx) => {
        rows.push([
          idx === 0 ? day : '',
          `${act.start_time || ''} - ${act.end_time || ''}`,
          act.title || 'Activity',
          act.category || 'Routine',
          act.description || (act.priority ? `Priority: ${act.priority}` : '—'),
          act.location || '—'
        ]);
      });
    }
  });

  autoTable(doc, {
    startY,
    head: [['Day', 'Time Window', 'Activity Title', 'Category', 'Description / Priority', 'Location']],
    body: rows,
    theme: 'grid',
    styles: {
      fontSize: 8.5,
      cellPadding: 6,
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240]
    },
    headStyles: {
      fillColor: [30, 41, 59], // #1e293b
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252] // #f8fafc
    },
    columnStyles: {
      0: { cellWidth: 70, fontStyle: 'bold' },
      1: { cellWidth: 100, fontStyle: 'bold', textColor: [6, 182, 212] },
      2: { cellWidth: 180, fontStyle: 'bold' },
      3: { cellWidth: 80 },
      4: { cellWidth: 'auto' },
      5: { cellWidth: 90 }
    },
    showHead: 'everyPage'
  });

  drawFooter(doc);
  doc.save(`${title.replace(/[^a-zA-Z0-9_-]/g, '_')}_Daily_Timetable.pdf`);
};

/**
 * 2. Export AI Study Timetable to PDF
 */
export const exportAIStudyPdf = (timetable) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4'
  });

  const title = timetable.title || 'AI Personalized Study Timetable';
  const data = timetable.data || {};
  let startY = drawBrandHeader(doc, title, 'AI STUDY SYNTHESIS & ACADEMIC ACCELERATOR');
  const pageWidth = doc.internal.pageSize.getWidth();

  // Summary synopsis card
  if (data.strategy_summary) {
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(40, startY, pageWidth - 80, 46, 6, 6, 'F');

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('ACADEMIC FOCUS & STUDY STRATEGY:', 52, startY + 16);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    const summaryLines = doc.splitTextToSize(data.strategy_summary, pageWidth - 105);
    doc.text(summaryLines, 52, startY + 30);

    startY += 60;
  }

  // Subject prioritization table
  if (data.subject_weights && data.subject_weights.length > 0) {
    const subjectRows = data.subject_weights.map((s) => [
      s.name,
      s.proficiency || 'Intermediate',
      s.is_difficult ? 'Demanding (Extra Focus)' : 'Balanced',
      s.exam_date || 'Standard Coursework',
      `${(s.weight * 3).toFixed(1)} hrs/wk`
    ]);

    autoTable(doc, {
      startY,
      head: [['Subject / Domain', 'Proficiency', 'Target Focus', 'Exam Target', 'Est. Weekly Time']],
      body: subjectRows,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 5 },
      headStyles: { fillColor: [139, 92, 246], textColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: [250, 245, 255] }
    });

    startY = doc.lastAutoTable.finalY + 20;
  }

  // Weekly study blocks table
  const weekly = data.weekly_schedule || {};
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const scheduleRows = [];

  days.forEach((day) => {
    const slots = weekly[day] || [];
    if (slots.length > 0) {
      slots.forEach((slot, idx) => {
        scheduleRows.push([
          idx === 0 ? day : '',
          `${slot.start_time} - ${slot.end_time}`,
          slot.subject || 'Study Block',
          slot.method || slot.title || 'Revision',
          slot.category || 'STUDY'
        ]);
      });
    }
  });

  if (scheduleRows.length > 0) {
    autoTable(doc, {
      startY,
      head: [['Day', 'Time Window', 'Subject', 'Study Method / Focus Area', 'Session Type']],
      body: scheduleRows,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 5 },
      headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 70 },
        1: { textColor: [6, 182, 212], fontStyle: 'bold', cellWidth: 90 },
        2: { fontStyle: 'bold', cellWidth: 110 }
      },
      showHead: 'everyPage'
    });
  }

  drawFooter(doc);
  doc.save(`${title.replace(/[^a-zA-Z0-9_-]/g, '_')}_AI_Study_Schedule.pdf`);
};

/**
 * 3. Export Faculty Timetable to PDF
 */
export const exportFacultyPdf = (timetable, selectedClass = null, selectedFaculty = null) => {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'pt',
    format: 'a4'
  });

  const title = timetable.title || timetable.settings?.term_name || 'Faculty Teaching Timetable';
  const data = timetable.data || {};
  const institution = data.institution_name || timetable.settings?.institution_name || 'Academic Institution';

  let startY = drawBrandHeader(
    doc,
    title,
    `FACULTY & INSTITUTIONAL SCHEDULING • ${institution.toUpperCase()}`,
    data.term_name || 'Master Term Schedule'
  );

  const workingDays = data.working_days || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const periodSlots = data.period_slots || [];
  const classes = data.classes || [];

  // Generate a page for each class section or target class
  const targetClasses = selectedClass ? [selectedClass] : classes;

  targetClasses.forEach((cls, cIdx) => {
    if (cIdx > 0) {
      doc.addPage('a4', 'landscape');
      startY = drawBrandHeader(
        doc,
        `${title} - Class ${cls}`,
        `CLASS TIMETABLE • SECTION ${cls}`,
        data.term_name
      );
    } else {
      // Subhead for first page
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 41, 59);
      doc.text(`Class / Section Schedule: ${cls}`, 40, startY);
      startY += 15;
    }

    // Grid: Columns = Periods, Rows = Days
    const head = ['Day', ...periodSlots.map((p) => `${p.label}\n(${p.start_time}-${p.end_time})`)];
    const classSchedule = data.schedule_by_class?.[cls] || {};

    const rows = workingDays.map((day) => {
      const daySlots = classSchedule[day] || [];
      const row = [day];

      periodSlots.forEach((slot, sIdx) => {
        const item = daySlots[sIdx];
        if (!item) {
          row.push('Free Period');
        } else if (item.is_break) {
          row.push('LUNCH BREAK');
        } else {
          row.push(`${item.code || ''}\n${item.name || ''}\nFac: ${item.faculty || ''}\n[${item.room || ''}]`);
        }
      });

      return row;
    });

    autoTable(doc, {
      startY,
      head: [head],
      body: rows,
      theme: 'grid',
      styles: {
        fontSize: 7.5,
        cellPadding: 4,
        halign: 'center',
        valign: 'middle'
      },
      headStyles: {
        fillColor: [15, 23, 42],
        textColor: [255, 255, 255],
        fontSize: 7.5,
        fontStyle: 'bold'
      },
      columnStyles: {
        0: { fontStyle: 'bold', halign: 'left', cellWidth: 60 }
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252]
      }
    });

    startY = doc.lastAutoTable.finalY + 25;
  });

  // Faculty Workload Summary Table on new page
  if (data.faculty_summary && data.faculty_summary.length > 0) {
    doc.addPage('a4', 'landscape');
    startY = drawBrandHeader(doc, 'Faculty Workload & Hours Summary', 'TEACHING PERIOD DISTRIBUTION AUDIT');

    const summaryRows = data.faculty_summary.map((f) => [
      f.faculty_name,
      `${f.target_periods} periods`,
      `${f.scheduled_periods} periods`,
      `${f.utilization_rate}%`,
      f.utilization_rate >= 100 ? 'Fully Allocated' : 'Partial / Under Allocated'
    ]);

    autoTable(doc, {
      startY,
      head: [['Faculty Member', 'Target Teaching Hours/Wk', 'Allocated Periods', 'Workload Fulfillment', 'Status']],
      body: summaryRows,
      theme: 'grid',
      styles: { fontSize: 8.5, cellPadding: 6 },
      headStyles: { fillColor: [139, 92, 246], textColor: [255, 255, 255] }
    });
  }

  drawFooter(doc);
  doc.save(`${title.replace(/[^a-zA-Z0-9_-]/g, '_')}_Faculty_Timetable.pdf`);
};
