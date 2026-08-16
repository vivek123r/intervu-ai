"use client";

import {
  Award,
  BookOpen,
  Briefcase,
  Check,
  ChevronDown,
  ChevronUp,
  Code,
  FileCode,
  FileText,
  Plus,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";

import { ActionButton, IconButton } from "@/components/ui/buttons";
import { useUpdateResumeMutation } from "@/services/api/documents.api";
import type { Resume } from "@/types/domain";

import styles from "./resume-detail-modal.module.css";

interface ResumeDetailModalProps {
  resume: Resume;
  onClose: () => void;
}

export function ResumeDetailModal({ resume, onClose }: ResumeDetailModalProps) {
  const [updateResume, { isLoading: isSaving }] = useUpdateResumeMutation();

  const [summary, setSummary] = useState(resume.summary ?? "");
  const [skills, setSkills] = useState<string[]>(resume.parsedSkills ?? []);
  const [skillInput, setSkillInput] = useState("");

  const [highlights, setHighlights] = useState<string[]>(resume.keyHighlights ?? []);
  const [highlightInput, setHighlightInput] = useState("");

  const [experiencePoints, setExperiencePoints] = useState<string[]>(resume.experiencePoints ?? []);
  const [experienceInput, setExperienceInput] = useState("");

  const [projects, setProjects] = useState<string[]>(resume.projects ?? []);
  const [projectInput, setProjectInput] = useState("");

  const [education, setEducation] = useState<string[]>(resume.education ?? []);
  const [educationInput, setEducationInput] = useState("");

  const [certifications, setCertifications] = useState<string[]>(resume.certifications ?? []);
  const [certInput, setCertInput] = useState("");

  const [domains, setDomains] = useState<string[]>(resume.domainStrengths ?? []);
  const [domainInput, setDomainInput] = useState("");

  const [showRawText, setShowRawText] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Skill actions
  const handleAddSkill = () => {
    const trimmed = skillInput.trim();
    if (!trimmed) return;
    if (!skills.some((s) => s.toLowerCase() === trimmed.toLowerCase())) {
      setSkills([...skills, trimmed]);
    }
    setSkillInput("");
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setSkills(skills.filter((s) => s !== skillToRemove));
  };

  // Highlights actions
  const handleAddHighlight = () => {
    const trimmed = highlightInput.trim();
    if (!trimmed) return;
    setHighlights([...highlights, trimmed]);
    setHighlightInput("");
  };

  const handleUpdateHighlight = (index: number, val: string) => {
    const next = [...highlights];
    next[index] = val;
    setHighlights(next);
  };

  const handleRemoveHighlight = (index: number) => {
    setHighlights(highlights.filter((_, i) => i !== index));
  };

  // Experience actions
  const handleAddExperience = () => {
    const trimmed = experienceInput.trim();
    if (!trimmed) return;
    setExperiencePoints([...experiencePoints, trimmed]);
    setExperienceInput("");
  };

  const handleUpdateExperience = (index: number, val: string) => {
    const next = [...experiencePoints];
    next[index] = val;
    setExperiencePoints(next);
  };

  const handleRemoveExperience = (index: number) => {
    setExperiencePoints(experiencePoints.filter((_, i) => i !== index));
  };

  // Projects actions
  const handleAddProject = () => {
    const trimmed = projectInput.trim();
    if (!trimmed) return;
    setProjects([...projects, trimmed]);
    setProjectInput("");
  };

  const handleUpdateProject = (index: number, val: string) => {
    const next = [...projects];
    next[index] = val;
    setProjects(next);
  };

  const handleRemoveProject = (index: number) => {
    setProjects(projects.filter((_, i) => i !== index));
  };

  // Education actions
  const handleAddEducation = () => {
    const trimmed = educationInput.trim();
    if (!trimmed) return;
    setEducation([...education, trimmed]);
    setEducationInput("");
  };

  const handleRemoveEducation = (index: number) => {
    setEducation(education.filter((_, i) => i !== index));
  };

  // Certifications actions
  const handleAddCert = () => {
    const trimmed = certInput.trim();
    if (!trimmed) return;
    setCertifications([...certifications, trimmed]);
    setCertInput("");
  };

  const handleRemoveCert = (index: number) => {
    setCertifications(certifications.filter((_, i) => i !== index));
  };

  // Domain actions
  const handleAddDomain = () => {
    const trimmed = domainInput.trim();
    if (!trimmed) return;
    if (!domains.some((d) => d.toLowerCase() === trimmed.toLowerCase())) {
      setDomains([...domains, trimmed]);
    }
    setDomainInput("");
  };

  const handleRemoveDomain = (domainToRemove: string) => {
    setDomains(domains.filter((d) => d !== domainToRemove));
  };

  const handleSave = async () => {
    try {
      await updateResume({
        id: resume.id,
        updates: {
          summary: summary.trim() || undefined,
          parsedSkills: skills,
          keyHighlights: highlights.filter((h) => h.trim().length > 0),
          experiencePoints: experiencePoints.filter((e) => e.trim().length > 0),
          projects: projects.filter((p) => p.trim().length > 0),
          education: education.filter((ed) => ed.trim().length > 0),
          certifications: certifications.filter((c) => c.trim().length > 0),
          domainStrengths: domains,
        },
      }).unwrap();

      setSavedSuccess(true);
      setTimeout(() => {
        setSavedSuccess(false);
        onClose();
      }, 1000);
    } catch (err) {
      console.error("Failed to update resume:", err);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose} role="dialog" aria-modal="true">
      <motion.div
        className={styles.modalCard}
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Header */}
        <header className={styles.modalHeader}>
          <div className={styles.headerTitleRow}>
            <div className={styles.fileIconBox}>
              <FileText size={22} />
            </div>
            <div>
              <div className={styles.titleBadgeRow}>
                <h2>{resume.fileName}</h2>
                <span className={styles.aiBadge}>
                  <Sparkles size={13} /> Full AI Resume Context
                </span>
              </div>
              <p className={styles.headerMeta}>
                Uploaded on {new Date(resume.uploadedAt).toLocaleDateString(undefined, { dateStyle: "medium" })} ·
                Every skill, metric, role, and project is extracted and editable below.
              </p>
            </div>
          </div>
          <IconButton ariaLabel="Close modal" onClick={onClose}>
            <X size={18} />
          </IconButton>
        </header>

        {/* Modal Body */}
        <div className={styles.modalBody}>
          {/* Executive Summary */}
          <section className={styles.editorSection}>
            <div className={styles.sectionHeading}>
              <div className={styles.sectionIconRow}>
                <Briefcase size={16} />
                <h3>Executive Summary</h3>
              </div>
              <small>Calibrates interviewer persona, seniority level &amp; tone.</small>
            </div>
            <textarea
              className={styles.summaryTextarea}
              rows={3}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Candidate executive summary..."
            />
          </section>

          {/* Technical Skills */}
          <section className={styles.editorSection}>
            <div className={styles.sectionHeading}>
              <div className={styles.sectionIconRow}>
                <Code size={16} />
                <h3>All Technical Skills ({skills.length})</h3>
              </div>
              <small>Every programming language, framework, database, tool, and protocol found in your resume.</small>
            </div>
            <div className={styles.skillsCloud}>
              {skills.map((skill) => (
                <span key={skill} className={styles.skillChip}>
                  {skill}
                  <button
                    type="button"
                    onClick={() => handleRemoveSkill(skill)}
                    aria-label={`Remove ${skill}`}
                    className={styles.removeChipBtn}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <div className={styles.addInlineRow}>
              <input
                className={styles.inlineInput}
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                placeholder="Add missing skill (e.g. Go, Kubernetes, Kafka, PyTorch)..."
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddSkill();
                  }
                }}
              />
              <ActionButton
                variant="ghost"
                onClick={handleAddSkill}
                disabled={!skillInput.trim()}
              >
                <Plus size={14} /> Add Skill
              </ActionButton>
            </div>
          </section>

          {/* Key Highlights & Metrics */}
          <section className={styles.editorSection}>
            <div className={styles.sectionHeading}>
              <div className={styles.sectionIconRow}>
                <Sparkles size={16} />
                <h3>Scale Feats, Latency &amp; Key Metrics ({highlights.length})</h3>
              </div>
              <small>The AI interviewer will formulate architectural and technical probe questions around these feats.</small>
            </div>
            <div className={styles.highlightsList}>
              <AnimatePresence initial={false}>
                {highlights.map((highlight, index) => (
                  <motion.div
                    key={index}
                    className={styles.highlightRow}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <span className={styles.bulletDot}>•</span>
                    <input
                      className={styles.highlightInput}
                      value={highlight}
                      onChange={(e) => handleUpdateHighlight(index, e.target.value)}
                    />
                    <IconButton
                      ariaLabel="Delete highlight"
                      onClick={() => handleRemoveHighlight(index)}
                    >
                      <Trash2 size={14} />
                    </IconButton>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
            <div className={styles.addInlineRow}>
              <input
                className={styles.inlineInput}
                value={highlightInput}
                onChange={(e) => setHighlightInput(e.target.value)}
                placeholder="Add accomplishment (e.g. Architected Kafka pipeline processing 100k events/sec)..."
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddHighlight();
                  }
                }}
              />
              <ActionButton
                variant="ghost"
                onClick={handleAddHighlight}
                disabled={!highlightInput.trim()}
              >
                <Plus size={14} /> Add Metric
              </ActionButton>
            </div>
          </section>

          {/* Experience & Work History */}
          <section className={styles.editorSection}>
            <div className={styles.sectionHeading}>
              <div className={styles.sectionIconRow}>
                <Briefcase size={16} />
                <h3>Roles &amp; Experience History ({experiencePoints.length})</h3>
              </div>
              <small>Work history, companies, and initiatives.</small>
            </div>
            <div className={styles.highlightsList}>
              <AnimatePresence initial={false}>
                {experiencePoints.map((exp, index) => (
                  <motion.div
                    key={index}
                    className={styles.highlightRow}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <span className={styles.bulletDot}>•</span>
                    <input
                      className={styles.highlightInput}
                      value={exp}
                      onChange={(e) => handleUpdateExperience(index, e.target.value)}
                    />
                    <IconButton
                      ariaLabel="Delete experience point"
                      onClick={() => handleRemoveExperience(index)}
                    >
                      <Trash2 size={14} />
                    </IconButton>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
            <div className={styles.addInlineRow}>
              <input
                className={styles.inlineInput}
                value={experienceInput}
                onChange={(e) => setExperienceInput(e.target.value)}
                placeholder="Add role or initiative (e.g. Senior Software Engineer @ Acme Corp, 2022-Present)..."
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddExperience();
                  }
                }}
              />
              <ActionButton
                variant="ghost"
                onClick={handleAddExperience}
                disabled={!experienceInput.trim()}
              >
                <Plus size={14} /> Add Role
              </ActionButton>
            </div>
          </section>

          {/* Projects */}
          <section className={styles.editorSection}>
            <div className={styles.sectionHeading}>
              <div className={styles.sectionIconRow}>
                <FileCode size={16} />
                <h3>Projects &amp; Open Source ({projects.length})</h3>
              </div>
              <small>Key projects, architecture repos, and side initiatives.</small>
            </div>
            <div className={styles.highlightsList}>
              <AnimatePresence initial={false}>
                {projects.map((proj, index) => (
                  <motion.div
                    key={index}
                    className={styles.highlightRow}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <span className={styles.bulletDot}>•</span>
                    <input
                      className={styles.highlightInput}
                      value={proj}
                      onChange={(e) => handleUpdateProject(index, e.target.value)}
                    />
                    <IconButton
                      ariaLabel="Delete project"
                      onClick={() => handleRemoveProject(index)}
                    >
                      <Trash2 size={14} />
                    </IconButton>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
            <div className={styles.addInlineRow}>
              <input
                className={styles.inlineInput}
                value={projectInput}
                onChange={(e) => setProjectInput(e.target.value)}
                placeholder="Add project (e.g. Built Distributed Consensus Engine in Rust)..."
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddProject();
                  }
                }}
              />
              <ActionButton
                variant="ghost"
                onClick={handleAddProject}
                disabled={!projectInput.trim()}
              >
                <Plus size={14} /> Add Project
              </ActionButton>
            </div>
          </section>

          {/* Education & Certifications */}
          <section className={styles.editorSection}>
            <div className={styles.sectionHeading}>
              <div className={styles.sectionIconRow}>
                <BookOpen size={16} />
                <h3>Education &amp; Credentials</h3>
              </div>
              <small>Degrees, universities, honors, and verified certifications.</small>
            </div>

            {/* Education */}
            <div className={styles.highlightsList}>
              {education.map((ed, index) => (
                <div key={index} className={styles.highlightRow}>
                  <BookOpen size={13} style={{ color: "#ffd976" }} />
                  <span style={{ flex: 1, fontSize: "0.82rem", color: "#f6f5f3" }}>{ed}</span>
                  <IconButton ariaLabel="Delete education" onClick={() => handleRemoveEducation(index)}>
                    <Trash2 size={14} />
                  </IconButton>
                </div>
              ))}
            </div>
            <div className={styles.addInlineRow}>
              <input
                className={styles.inlineInput}
                value={educationInput}
                onChange={(e) => setEducationInput(e.target.value)}
                placeholder="Add education (e.g. B.S. in Computer Science, Stanford University)..."
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddEducation();
                  }
                }}
              />
              <ActionButton variant="ghost" onClick={handleAddEducation} disabled={!educationInput.trim()}>
                <Plus size={14} /> Add Education
              </ActionButton>
            </div>

            {/* Certifications */}
            <div className={styles.highlightsList} style={{ marginTop: "0.85rem" }}>
              {certifications.map((c, index) => (
                <div key={index} className={styles.highlightRow}>
                  <Award size={13} style={{ color: "#ffd976" }} />
                  <span style={{ flex: 1, fontSize: "0.82rem", color: "#f6f5f3" }}>{c}</span>
                  <IconButton ariaLabel="Delete certification" onClick={() => handleRemoveCert(index)}>
                    <Trash2 size={14} />
                  </IconButton>
                </div>
              ))}
            </div>
            <div className={styles.addInlineRow}>
              <input
                className={styles.inlineInput}
                value={certInput}
                onChange={(e) => setCertInput(e.target.value)}
                placeholder="Add certification (e.g. AWS Solutions Architect Professional)..."
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddCert();
                  }
                }}
              />
              <ActionButton variant="ghost" onClick={handleAddCert} disabled={!certInput.trim()}>
                <Plus size={14} /> Add Credential
              </ActionButton>
            </div>
          </section>

          {/* Domain Strengths */}
          <section className={styles.editorSection}>
            <div className={styles.sectionHeading}>
              <div className={styles.sectionIconRow}>
                <Award size={16} />
                <h3>Domain Strengths</h3>
              </div>
              <small>Core architectural domains of proficiency.</small>
            </div>
            <div className={styles.skillsCloud}>
              {domains.map((dom) => (
                <span key={dom} className={`${styles.skillChip} ${styles.domainChip}`}>
                  {dom}
                  <button
                    type="button"
                    onClick={() => handleRemoveDomain(dom)}
                    aria-label={`Remove ${dom}`}
                    className={styles.removeChipBtn}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <div className={styles.addInlineRow}>
              <input
                className={styles.inlineInput}
                value={domainInput}
                onChange={(e) => setDomainInput(e.target.value)}
                placeholder="Add domain (e.g. Distributed Systems, Event-Driven Architecture)..."
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddDomain();
                  }
                }}
              />
              <ActionButton
                variant="ghost"
                onClick={handleAddDomain}
                disabled={!domainInput.trim()}
              >
                <Plus size={14} /> Add Domain
              </ActionButton>
            </div>
          </section>

          {/* Raw Text Viewer */}
          {resume.rawText && (
            <section className={styles.editorSection}>
              <button
                type="button"
                className={styles.rawTextToggle}
                onClick={() => setShowRawText(!showRawText)}
              >
                <div className={styles.sectionIconRow}>
                  <FileText size={15} />
                  <span>Full Extracted Text from Document</span>
                </div>
                {showRawText ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>

              {showRawText && (
                <pre className={styles.rawTextPre}>
                  {resume.rawText}
                </pre>
              )}
            </section>
          )}
        </div>

        {/* Footer */}
        <footer className={styles.modalFooter}>
          <ActionButton variant="ghost" onClick={onClose} disabled={isSaving}>
            Cancel
          </ActionButton>
          <ActionButton onClick={handleSave} disabled={isSaving}>
            {savedSuccess ? (
              <>
                <Check size={16} /> Saved!
              </>
            ) : isSaving ? (
              "Saving..."
            ) : (
              "Save Changes"
            )}
          </ActionButton>
        </footer>
      </motion.div>
    </div>
  );
}
