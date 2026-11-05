# Recruitment & Talent Intelligence Platform: Requirements

Source: hackathon brief, Web App Development track. Recorded 2026-11-05.
Sections 1–5 restate the brief. Section 6 is our own module breakdown.

## 1. The goal

Build an AI-powered recruitment platform that helps recruiters publish jobs, process resumes,
evaluate job-related qualifications, shortlist applicants, schedule interviews and understand
recruitment activity.

- Use semantic matching and explainable recommendations, not simple keyword matching.
- Hiring decisions must stay under human control.

**Success criterion:** a reliable end-to-end workflow, meaningful AI functionality, transparent
evidence-based recommendations and solid engineering, not merely the greatest number of features.

## 2. Final demonstration scenario

1. A recruiter posts a Backend Developer vacancy requiring Python, Django, PostgreSQL and Docker.
2. Three candidates apply with resumes.
3. The system extracts evidence, produces job-relevance scores with explanations, identifies
   missing evidence and presents the candidates for human review.
4. The recruiter shortlists one applicant.
5. The recruiter generates interview questions and schedules an interview.
6. The recruiter sees the dashboard update.

## 3. Evaluation rubric (100 marks)

| Criterion | Marks |
|---|---|
| Architecture & functional completeness | 30 |
| AI implementation & matching quality | 25 |
| Resume parsing & extraction | 15 |
| UI & experience | 15 |
| Innovation, testing, security & deployment | 15 |

Late submissions are not evaluated. Code should be clean and easy to understand.

## 4. Technical scope

- Any technology stack is allowed.
- Suggested frontend: React/Next.js.
- Suggested backend: FastAPI, Django, Node.js or Rails.
- Suggested database: PostgreSQL, MySQL or MongoDB.
- Suggested parsing: PyMuPDF or pdfplumber.
- Suggested AI: OpenAI, Gemini, a local LLM or Sentence Transformers.
- Suggested semantic retrieval: FAISS, ChromaDB or pgvector.
- **Hardcoded AI responses do not count as implemented AI features.**

## 5. Functional requirements

### User roles

- **Recruiter:** manages vacancies, reviews candidates, shortlists applications, schedules
  interviews and views analytics.
- **Candidate:** maintains a profile, uploads a resume, applies for jobs and tracks application
  status.

### 5.1 Authentication & access control (brief §3.1)

- Recruiter and candidate registration, login and logout.
- Role-based dashboards and authorization. Candidates cannot access recruiter-only information.
- Secure password handling, session management and input validation.

### 5.2 Job posting & management (brief §3.2)

- Create, edit, close and reopen jobs with title, department, location, type, salary and
  description.
- Specify required and preferred skills, experience, qualifications and skill importance.
- List vacancies with applicant counts.
- AI extraction of requirements from free-text descriptions.

### 5.3 Resume upload & parsing (brief §3.3)

- Upload PDF resumes. DOCX support is optional.
- Extract name, contact information, skills, education, relevant experience and projects.
- Normalize equivalent terms (e.g. JS and JavaScript), store structured results and permit
  candidate corrections.
- Handle unsupported documents, empty resumes and parsing failures gracefully.

### 5.4 Candidate matching (brief §3.4)

- Compare candidate evidence with job requirements using semantic similarity, not only exact
  keywords.
- Produce an explainable job-relevance score with matched skills, gaps and supporting evidence.
- Rank applicants for recruiter review and allow manual filters and overrides.
- Suggested weighted scoring: skills 50%, experience 25%, project relevance 15%, qualifications
  10%. Teams may justify alternatives.

### 5.5 Skill gap & explainability (brief §3.5)

- Distinguish missing evidence from confirmed absence of a skill.
- Show supporting resume excerpts and explain each recommendation.
- Suggest learning areas and allow recruiters to correct extracted skills.

### 5.6 Application pipeline (brief §3.6)

- Candidates submit applications and view their status.
- Recruiters view, shortlist, reject or advance candidates manually and add private notes.
- Maintain an audit trail of status changes.
- Suggested states: Submitted → Parsed → AI Assessment Available → Recruiter Review →
  Shortlisted/Rejected → Interview → Selected/Rejected.

### 5.7 Interview question generation (brief §3.7)

- Generate role-specific questions with beginner, intermediate and advanced difficulty.
- Create questions about candidate projects and provide answer guidelines.
- Allow recruiters to edit, remove and regenerate questions.

### 5.8 Interview scheduling & feedback (brief §3.8)

- Schedule date, time, interviewer and interview type, and show interview schedules.
- Flag scheduling conflicts and store structured interviewer feedback.
- Permit authorized recruiters to record final decisions. Notifications may be simulated.

### 5.9 Recruitment analytics (brief §3.9)

- Display active jobs, applications, shortlisted candidates, pending reviews and interviews.
- Charts by job and stage, application-to-shortlist rate and average processing time.
- Identify common job-related skill gaps across applicants.

### 5.10 Advanced talent intelligence (brief §3.10)

- **Natural-language talent search:** recruiters enter queries such as "Python developers with
  REST API experience" and get matching applicants with supporting resume evidence.
- **Semantic resume search:** index resume text using embeddings and retrieve relevant candidates
  even when their wording differs from the query.
- **Duplicate application detection:** identify likely duplicate candidate records using
  normalized contact details and document similarity, with human confirmation before merging.
- **Resume-to-job recommendations:** recommend open vacancies to candidates using their verified
  skills, interests and relevant project experience.
- **Talent pool discovery:** search previously reviewed applicants when a new job is published,
  respecting access permissions and data retention.
- **Candidate comparison:** show side-by-side job-related evidence, missing information and score
  explanations for selected applicants.
- **Fairness and bias safeguards:** exclude protected or irrelevant personal characteristics from
  scoring, and test whether changing such attributes affects recommendations.
- **AI hallucination verification:** link extracted skills and generated claims to actual resume
  excerpts, and flag unsupported assertions for manual review.

## 6. Module breakdown and build order

Each module gets its own plan. Build in this order.

| # | Module | Requirements | Done when |
|---|---|---|---|
| 1 | Foundation | Section 4 | An empty app with its database is live on a URL |
| 2 | Auth & roles | 5.1 | A candidate is blocked from recruiter pages and data |
| 3 | Jobs | 5.2 | Pasting a job description fills in the structured fields |
| 4 | Resume parsing | 5.3 | Good, empty, scanned and wrong-type files all behave sensibly |
| 5 | Matching & explainability | 5.4, 5.5 | Every score can be traced back to resume text |
| 6 | Application pipeline | 5.6 | Each status change is logged, and candidates can't see notes |
| 7 | Interview questions | 5.7 | Questions mention the candidate's actual projects |
| 8 | Scheduling & feedback | 5.8 | A double-booked interviewer gets flagged |
| 9 | Analytics | 5.9 | The dashboard updates after a shortlist |
| 10 | Talent search | 5.10: search, semantic, pool, recommendations | A search finds a candidate whose resume uses different wording |
| 11 | Comparison & duplicates | 5.10: comparison, duplicates | Nothing merges without a recruiter's approval |
| 12 | Trust, testing & delivery | 5.10: fairness, hallucination; Section 3 | The full demo scenario runs cleanly on the live URL |

**Priority:** modules 1–9 are the required core. Do module 12 next, then 10, then 11. If time runs
short, cut module 11 first.
