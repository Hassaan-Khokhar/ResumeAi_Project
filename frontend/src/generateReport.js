import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Dark theme palette matching AI Center
const C = {
  bg: [15, 15, 35],
  card: [25, 25, 55],
  cardBorder: [50, 50, 90],
  purple: [108, 92, 231],
  accent: [168, 85, 247],
  green: [16, 185, 129],
  pink: [236, 72, 153],
  danger: [239, 68, 68],
  warning: [234, 179, 8],
  white: [255, 255, 255],
  textPrimary: [232, 232, 240],
  textSecondary: [160, 160, 190],
  textMuted: [100, 100, 140],
  glassBorder: [60, 60, 100],
};

function fillPage(doc) {
  doc.setFillColor(...C.bg);
  doc.rect(0, 0, 210, 297, 'F');
}

function drawCard(doc, x, y, w, h) {
  doc.setFillColor(...C.card);
  doc.roundedRect(x, y, w, h, 4, 4, 'F');
  doc.setDrawColor(...C.cardBorder);
  doc.setLineWidth(0.3);
  doc.roundedRect(x, y, w, h, 4, 4, 'S');
}

function drawRadarChart(doc, cx, cy, radius, data) {
  const n = data.length;
  const angleStep = (2 * Math.PI) / n;
  const startAngle = -Math.PI / 2;

  // Grid rings
  [0.25, 0.5, 0.75, 1.0].forEach(scale => {
    doc.setDrawColor(50, 50, 80);
    doc.setLineWidth(0.15);
    const r = radius * scale;
    const points = [];
    for (let i = 0; i < n; i++) {
      const angle = startAngle + i * angleStep;
      points.push([cx + r * Math.cos(angle), cy + r * Math.sin(angle)]);
    }
    for (let i = 0; i < n; i++) {
      const next = (i + 1) % n;
      doc.line(points[i][0], points[i][1], points[next][0], points[next][1]);
    }
  });

  // Axis lines
  doc.setDrawColor(50, 50, 80);
  doc.setLineWidth(0.1);
  for (let i = 0; i < n; i++) {
    const angle = startAngle + i * angleStep;
    doc.line(cx, cy, cx + radius * Math.cos(angle), cy + radius * Math.sin(angle));
  }

  // Data polygon fill
  const dataPoints = data.map((d, i) => {
    const angle = startAngle + i * angleStep;
    const r = radius * (d.value / 100);
    return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
  });

  // Fill polygon with blended purple (simulating transparency on dark bg)
  doc.setFillColor(50, 40, 90);
  // Draw filled polygon by triangulating from center
  for (let i = 0; i < dataPoints.length; i++) {
    const next = (i + 1) % dataPoints.length;
    doc.triangle(
      cx, cy,
      dataPoints[i][0], dataPoints[i][1],
      dataPoints[next][0], dataPoints[next][1],
      'F'
    );
  }

  // Outline polygon
  doc.setDrawColor(...C.accent);
  doc.setLineWidth(1);
  for (let i = 0; i < dataPoints.length; i++) {
    const next = (i + 1) % dataPoints.length;
    doc.line(dataPoints[i][0], dataPoints[i][1], dataPoints[next][0], dataPoints[next][1]);
  }

  // Data points (dots)
  dataPoints.forEach(p => {
    doc.setFillColor(...C.accent);
    doc.circle(p[0], p[1], 1.2, 'F');
  });

  // Labels
  data.forEach((d, i) => {
    const angle = startAngle + i * angleStep;
    const lx = cx + (radius + 8) * Math.cos(angle);
    const ly = cy + (radius + 8) * Math.sin(angle);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...C.textPrimary);
    doc.text(d.label, lx, ly + 1, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(...C.textMuted);
    doc.text(`${Math.round(d.value)}%`, lx, ly + 5, { align: 'center' });
  });
}

function drawScoreArc(doc, cx, cy, r, score, color, label) {
  // Background circle
  doc.setDrawColor(50, 50, 80);
  doc.setLineWidth(3);
  doc.circle(cx, cy, r);
  // Score arc
  doc.setDrawColor(...color);
  doc.setLineWidth(3);
  doc.circle(cx, cy, r);
  // Score number
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(...color);
  doc.text(`${Math.round(score)}%`, cx, cy + 2, { align: 'center' });
  // Label
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...C.textMuted);
  doc.text(label, cx, cy + r + 6, { align: 'center' });
}

function drawProgressBar(doc, x, y, w, value, color) {
  doc.setFillColor(40, 40, 70);
  doc.roundedRect(x, y, w, 3.5, 1.5, 1.5, 'F');
  const fillW = Math.max(0, Math.min(w, (value / 100) * w));
  if (fillW > 2) {
    doc.setFillColor(...color);
    doc.roundedRect(x, y, fillW, 3.5, 1.5, 1.5, 'F');
  }
}

function sectionHeader(doc, y, text) {
  doc.setFillColor(...C.purple);
  doc.roundedRect(14, y, 3, 10, 1, 1, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...C.textPrimary);
  doc.text(text, 21, y + 7.5);
  return y + 15;
}

function checkPage(doc, y, needed = 25) {
  if (y + needed > 278) {
    doc.addPage();
    fillPage(doc);
    return 18;
  }
  return y;
}

export function generatePDFReport(r) {
  const doc = new jsPDF();
  const tp = r.trained_model_prediction;

  // ── PAGE 1 ──
  fillPage(doc);

  // Header gradient bar
  for (let i = 0; i < 40; i++) {
    const ratio = i / 40;
    doc.setFillColor(108 + 60 * ratio, 92 - 7 * ratio, 231 + 16 * ratio);
    doc.rect(0, i, 210, 1, 'F');
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(...C.white);
  doc.text('ResumeAI', 14, 18);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(220, 220, 240);
  doc.text('Resume Compatibility Analysis Report', 14, 26);
  doc.setFontSize(7);
  doc.setTextColor(180, 180, 210);
  doc.text(new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }), 14, 33);

  let y = 48;

  // ── Score + Radar row ──
  // Left: Main score circle
  drawCard(doc, 14, y, 60, 55);
  drawScoreArc(doc, 44, y + 22, 14, r.match_score, r.match_score >= 75 ? C.green : r.match_score >= 50 ? C.warning : C.danger, 'Overall Match');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(...C.textMuted);
  doc.text(r.match_score >= 75 ? 'Strong Match' : r.match_score >= 50 ? 'Moderate' : 'Needs Work', 44, y + 49, { align: 'center' });

  // Right: Radar chart
  drawCard(doc, 80, y, 116, 55);
  const radarData = [
    { label: 'Skills', value: r.skills_score || 0 },
    { label: 'Experience', value: r.experience_score || 0 },
    { label: 'Keywords', value: r.keyword_score || 0 },
    { label: 'Overall', value: r.match_score || 0 },
  ];
  drawRadarChart(doc, 138, y + 28, 18, radarData);

  y += 62;

  // ── Score Breakdown ──
  drawCard(doc, 14, y, 182, 50);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...C.textPrimary);
  doc.text('Score Breakdown', 20, y + 10);

  const breakdowns = [
    ['Skills', r.skills_score || 0, C.purple, '60%'],
    ['Experience', r.experience_score || 0, C.accent, '30%'],
    ['Keywords', r.keyword_score || 0, C.pink, '10%'],
  ];

  breakdowns.forEach(([label, val, color, weight], i) => {
    const by = y + 18 + i * 10;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...C.textSecondary);
    doc.text(`${label} (${weight})`, 22, by + 2);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...color);
    doc.text(`${Math.round(val)}%`, 180, by + 2, { align: 'right' });
    drawProgressBar(doc, 70, by - 0.5, 100, val, color);
  });

  y += 56;

  // ── Skills Section ──
  if (r.matched_skills?.length > 0) {
    y = checkPage(doc, y, 30);
    y = sectionHeader(doc, y, 'Matched Skills (' + r.matched_skills.length + ')');
    let xPos = 20;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    r.matched_skills.forEach(skill => {
      const w = doc.getTextWidth(skill) + 8;
      if (xPos + w > 192) { xPos = 20; y += 9; y = checkPage(doc, y); }
      doc.setFillColor(16, 60, 45);
      doc.roundedRect(xPos, y - 4, w, 7, 3, 3, 'F');
      doc.setTextColor(...C.green);
      doc.text(skill, xPos + 4, y + 0.5);
      xPos += w + 3;
    });
    y += 12;
  }

  // ── Missing Skills ──
  if (r.missing_skills?.length > 0) {
    y = checkPage(doc, y, 35);
    y = sectionHeader(doc, y, 'Missing Skills (' + r.missing_skills.length + ')');
    const missData = r.missing_skills.slice(0, 8).map(s => [s.skill, s.importance || '-', s.suggestion || '-']);
    autoTable(doc, {
      startY: y,
      head: [['Skill', 'Priority', 'Suggestion']],
      body: missData,
      margin: { left: 20, right: 20 },
      styles: { fontSize: 7, cellPadding: 3, textColor: C.textSecondary, fillColor: C.card, lineColor: C.glassBorder, lineWidth: 0.2 },
      headStyles: { fillColor: C.purple, textColor: C.white, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [30, 30, 60] },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 30, textColor: C.danger }, 1: { cellWidth: 20 } },
    });
    y = doc.lastAutoTable.finalY + 8;
  }

  // ── Strengths ──
  if (r.strengths?.length > 0) {
    y = checkPage(doc, y, 25);
    y = sectionHeader(doc, y, 'Strengths');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    r.strengths.forEach(s => {
      y = checkPage(doc, y, 10);
      doc.setTextColor(...C.green);
      doc.text('●', 22, y);
      doc.setTextColor(...C.textSecondary);
      const lines = doc.splitTextToSize(s, 160);
      doc.text(lines, 28, y);
      y += lines.length * 4.5 + 2;
    });
    y += 5;
  }

  // ── Improvements ──
  if (r.improvements?.length > 0) {
    y = checkPage(doc, y, 25);
    y = sectionHeader(doc, y, 'Improvements');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    r.improvements.forEach(s => {
      y = checkPage(doc, y, 10);
      doc.setTextColor(...C.warning);
      doc.text('▸', 22, y);
      doc.setTextColor(...C.textSecondary);
      const lines = doc.splitTextToSize(s, 160);
      doc.text(lines, 28, y);
      y += lines.length * 4.5 + 2;
    });
    y += 5;
  }

  // ── AI Summary ──
  if (r.rewritten_summary) {
    y = checkPage(doc, y, 35);
    y = sectionHeader(doc, y, 'AI-Optimized Summary');
    const lines = doc.splitTextToSize(r.rewritten_summary, 158);
    const boxH = lines.length * 4.5 + 10;
    drawCard(doc, 20, y - 2, 170, boxH);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(...C.textSecondary);
    doc.text(lines, 26, y + 5);
    y += boxH + 6;
  }

  // ── ATS Tips ──
  if (r.ats_tips?.length > 0) {
    y = checkPage(doc, y, 25);
    y = sectionHeader(doc, y, 'ATS Optimization Tips');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    r.ats_tips.forEach(t => {
      y = checkPage(doc, y, 10);
      doc.setTextColor(...C.purple);
      doc.text('>', 22, y);
      doc.setTextColor(...C.textSecondary);
      const lines = doc.splitTextToSize(t, 160);
      doc.text(lines, 28, y);
      y += lines.length * 4.5 + 2;
    });
    y += 5;
  }

  // ── ML Model Comparison ──
  if (tp) {
    y = checkPage(doc, y, 55);
    y = sectionHeader(doc, y, 'Trained ML Model vs Gemini AI');

    drawCard(doc, 14, y, 88, 40);
    drawCard(doc, 108, y, 88, 40);

    // Gemini card
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(...C.textMuted);
    doc.text('GEMINI AI', 58, y + 8, { align: 'center' });
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(...C.accent);
    doc.text(Math.round(r.match_score) + '%', 58, y + 20, { align: 'center' });
    doc.setFontSize(7);
    doc.setTextColor(...C.textMuted);
    doc.text(r._meta?.model || 'gemini-flash', 58, y + 26, { align: 'center' });

    // ML card
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(...C.textMuted);
    doc.text('TRAINED ML MODEL', 152, y + 8, { align: 'center' });
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(...C.green);
    doc.text(Math.round(tp.ml_match_score) + '%', 152, y + 20, { align: 'center' });
    doc.setFontSize(7);
    doc.setTextColor(...C.textMuted);
    doc.text('Random Forest Regressor', 152, y + 26, { align: 'center' });

    // Metrics row
    const metrics = [
      ['Skill Match', tp.skill_match_percentage + '%'],
      ['Cosine Sim', tp.cosine_similarity + '%'],
      ['Keywords', tp.keyword_density + '%'],
    ];
    metrics.forEach(([label, val], i) => {
      const mx = 108 + i * 30;
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...C.accent);
      doc.text(val, mx + 14, y + 33, { align: 'center' });
      doc.setFontSize(5.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...C.textMuted);
      doc.text(label, mx + 14, y + 37, { align: 'center' });
    });

    y += 48;
  }

  // ── Footer on all pages ──
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setDrawColor(...C.purple);
    doc.setLineWidth(0.4);
    doc.line(14, 286, 196, 286);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(...C.textMuted);
    doc.text('ResumeAI - AI-Powered Resume Analysis Platform', 14, 291);
    doc.text('Page ' + i + ' of ' + pageCount, 196, 291, { align: 'right' });
  }

  // Save
  const fileName = 'ResumeAI_Report_' + new Date().toISOString().slice(0, 10) + '.pdf';
  const blob = doc.output('blob');
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
