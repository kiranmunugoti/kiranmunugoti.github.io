const fs = require("fs");
const path = require("path");
const {
  Document, Packer, Paragraph, TextRun, AlignmentType, BorderStyle, LevelFormat
} = require("docx");

const NAME_SIZE = 32, CONTACT_SIZE = 18, SECTION_SIZE = 22, BODY_SIZE = 20;
const INK = "1a1a1a", MUTED = "555555";

const template = JSON.parse(fs.readFileSync(path.join(process.cwd(), "resume-template.json"), "utf8"));
const config = JSON.parse(fs.readFileSync(path.join(process.cwd(), "repos-config.json"), "utf8"));
const verifiedSkills = JSON.parse(fs.readFileSync(path.join(process.cwd(), "skills-verified.json"), "utf8")).skills;
const verifiedLower = new Set(verifiedSkills.map(s => s.toLowerCase()));

// --- Compute the dynamic Projects section ---
const projectEntries = (config.repositories || [])
  .filter(r => r.addToResumeProjects === true)
  .map(r => {
    const matchedTags = (r.tags || []).filter(t => verifiedLower.has(t.toLowerCase()));
    return { name: r.name, year: r.year || "", description: r.description || "", tags: matchedTags };
  })
  .filter(p => p.tags.length > 0); // safety net: never show a project with zero defensible skills

// --- Document builders (same structure as the original resume) ---
function sectionHeading(text) {
  return new Paragraph({
    spacing: { before: 240, after: 100 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "999999", space: 2 } },
    children: [new TextRun({ text: text.toUpperCase(), bold: true, size: SECTION_SIZE, color: INK, font: "Calibri" })]
  });
}
function bullet(text) {
  return new Paragraph({
    numbering: { reference: "bullet-list", level: 0 },
    spacing: { after: 60 },
    children: [new TextRun({ text, size: BODY_SIZE, font: "Calibri" })]
  });
}
function jobHeader(title, company, dateRange, location) {
  return new Paragraph({
    spacing: { before: 160, after: 40 },
    tabStops: [{ type: "right", position: 9360 }],
    children: [
      new TextRun({ text: title + " – " + company, bold: true, size: BODY_SIZE, font: "Calibri" }),
      new TextRun({ text: "\t" + dateRange + "  " + location, size: BODY_SIZE, color: MUTED, font: "Calibri", italics: true })
    ]
  });
}
function skillLine(label, value) {
  return new Paragraph({
    spacing: { after: 60 },
    children: [
      new TextRun({ text: label + ": ", bold: true, size: BODY_SIZE, font: "Calibri" }),
      new TextRun({ text: value, size: BODY_SIZE, font: "Calibri" })
    ]
  });
}

const children = [
  new Paragraph({
    alignment: AlignmentType.CENTER, spacing: { after: 40 },
    children: [new TextRun({ text: template.name, bold: true, size: NAME_SIZE, font: "Calibri" })]
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER, spacing: { after: 160 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 10, color: "222222", space: 4 } },
    children: [new TextRun({ text: template.contact, size: CONTACT_SIZE, color: MUTED, font: "Calibri" })]
  }),
  sectionHeading("Summary"),
  new Paragraph({ spacing: { after: 100 }, children: [new TextRun({ text: template.summary, size: BODY_SIZE, font: "Calibri" })] }),
  sectionHeading("Technical Skills"),
  ...template.technicalSkills.map(s => skillLine(s.label, s.value))
];

// Only include a Projects section at all if there's something real to show.
if (projectEntries.length > 0) {
  children.push(sectionHeading("Projects"));
  projectEntries.forEach(p => {
    children.push(new Paragraph({
      spacing: { before: 60, after: 20 },
      children: [
        new TextRun({ text: p.name, bold: true, size: BODY_SIZE, font: "Calibri" }),
        new TextRun({ text: "  —  Personal Project, " + p.year, size: BODY_SIZE, color: MUTED, italics: true, font: "Calibri" })
      ]
    }));
    if (p.description) {
      children.push(new Paragraph({
        spacing: { after: 20 },
        children: [new TextRun({ text: p.description, size: BODY_SIZE, font: "Calibri" })]
      }));
    }
    children.push(new Paragraph({
      spacing: { before: 20, after: 100 },
      children: [new TextRun({ text: p.tags.join(" · "), size: 18, color: MUTED, italics: true, font: "Calibri" })]
    }));
  });
}

children.push(sectionHeading("Professional Experience"));
template.experience.forEach(job => {
  children.push(jobHeader(job.title, job.company, job.dateRange, job.location));
  job.bullets.forEach(b => children.push(bullet(b)));
});

children.push(sectionHeading("Education"));
template.education.forEach((e, i) => {
  children.push(new Paragraph({ spacing: { after: i === template.education.length - 1 ? 100 : 40 }, children: [new TextRun({ text: e, size: BODY_SIZE, font: "Calibri" })] }));
});

children.push(sectionHeading("Certifications"));
template.certifications.forEach(c => children.push(bullet(c)));

const doc = new Document({
  numbering: {
    config: [{
      reference: "bullet-list",
      levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 360, hanging: 260 } } } }]
    }]
  },
  sections: [{
    properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 620, bottom: 620, left: 700, right: 700 } } },
    children
  }]
});

Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync(path.join(process.cwd(), "resume.docx"), buf);
  console.log("Generated resume.docx with", projectEntries.length, "project(s) in Projects section.");
});
