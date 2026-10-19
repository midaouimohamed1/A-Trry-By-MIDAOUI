# RepoLister-X (A Trry By MIDAOUI)
> **GitHub Catalog Assistant & Reasoning Scaffold for Clean-Room Reverse Engineering**

RepoLister-X is a specialized, production-ready GitHub catalog assistant and AI tool focused strictly on **"clean-room reverse engineering"** and its core foundational principle: **separating behavioral specification from implementation**.

---

## 🎯 Core Principles & Constraints

1. **Single Platform Constraint (GitHub Only)**:
   - Exclusively queries the official GitHub REST API.
   - Zero reliance on Google, YouTube, or external blogs.
2. **Strict Neutrality**:
   - Never rates, ranks by popularity, or recommends repositories.
   - Never explains how any tool, exploit, or program works.
   - Reports strictly and verbatim what repositories declare about themselves.
3. **Mandatory 3-Angle Strategy (Every Single Query)**:
   - **Angle 1 (Direct Terms)**: `"clean room"`, `"clean-room"`, `"black box specification"`, `"functional spec reverse engineering"`.
   - **Angle 2 (Adjacent Angles)**: Technical specification templates used by reverse engineering teams; legal/compliance independent development proof; historical/precursor repositories (10-20+ years).
   - **Angle 3 (Cross-Domain Analogies)**: Applying "separating meaning and specification from exact implementation" across Law, Translation (intermediate representations), and Clean-Slate Architecture.
4. **Step 1: Pre-Flight Estimation**:
   - Runs lightweight `per_page=1` queries to read `total_count` for each angle.
   - Sums and presents the total estimated count across all angles before listing anything.
5. **Date-Range Slicing (Bypassing GitHub 1,000 Result Limit)**:
   - Slices backwards month-by-month starting from today.
   - Dynamically subdivides into week-by-week intervals when a month is saturated (> 900 items).
6. **Rate-Limit Guard (>= 2s Delay Enforcement)**:
   - Enforces a minimum 2,100ms interval between calls to guarantee compliance with the 10 requests/minute unauthenticated ceiling.
   - Optional GitHub Token support for 30–60 requests/minute.
7. **Neutrality & Uncertainty Flagging**:
   - Unclear or brief items are flagged with `[flagged, verify yourself]`.
   - Omitted count is reported explicitly ("never silently drop anything").
8. **Batching (50 Items)**:
   - Strict numbered format: `{num}. {name} - {link} - {angle} - {description}`.
   - Standard footer with total found, total remaining, date range, self-verification link, and `"Type continue for the next batch"`.

---

## 🚀 Features

- **Live Batch Runner**: Interactive web dashboard executing real-time GitHub queries.
- **Reasoning Console & CoT**: Simulated AI Assistant interface showing step-by-step thinking scaffolds.
- **Export Center**:
  - **Claude MCP Server**: Ready-to-use Model Context Protocol server in TypeScript for Claude Desktop and Claude Code.
  - **Gemini Function Calling**: `@google/genai` TypeScript declaration and Gem system instruction.
  - **OpenAI Action**: OpenAPI 3.1 schema for ChatGPT Custom GPTs.
  - **Standalone CLI**: `repolister-x.mjs` executable terminal runner.

---

## 💻 Quick Start

### 1. Installation
```bash
npm install
```

### 2. Development Mode
```bash
npm run dev
```
Open `http://localhost:3000` in your browser.

### 3. Production Build
```bash
npm run build
npm start
```

---

## 📜 License
MIT License - Developed with precision by **MIDAOUI**.
