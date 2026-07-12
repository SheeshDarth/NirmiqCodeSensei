# Product Requirements Document — NirmiqCodeSensei

## 1. Product Name

NirmiqCodeSensei

## 2. Product Vision

NirmiqCodeSensei is a local-first AI learning operating system that helps students understand, explain, debug, and master AI-assisted projects instead of blindly vibe-coding them.

The product exists because AI tools make project creation easier, but they can weaken real understanding if the student only copies generated code. NirmiqCodeSensei solves this by transforming projects, documents, and codebases into guided learning paths, explain-back checks, DSA links, debug exercises, and portfolio-ready project understanding.

## 3. Target User

Primary:
- Engineering students
- AIML students
- Students using AI coding assistants
- Students building portfolio projects
- Students preparing for placements, internships, viva, hackathons, and project reviews

Secondary:
- Self-taught developers
- Bootcamp students
- Junior developers
- Educators mentoring project-based learning

## 4. Core User Problem

Students can build projects using AI tools, but they often cannot:
- Explain how the project works.
- Debug generated code.
- Understand architectural decisions.
- Connect project logic to fundamentals.
- Prepare for viva/interview questions.
- Retain learning after project completion.
- Avoid dependency on AI.

## 5. Product Promise

“Build with AI, but learn like a real engineer.”

## 6. Product Goals

### MVP Goals
- Allow users to create a learning workspace for a project.
- Let users add project descriptions, code files, notes, and learning goals.
- Generate a learning map for a project.
- Create explain-back questions.
- Track understanding level per module.
- Provide debugging checklists.
- Provide DSA/fundamental concept links for project features.
- Maintain local-first notes and progress.

### Long-Term Goals
- Full local codebase ingestion.
- Graph-based learning paths.
- Voice explain-back mode.
- Personalized weak-area detection.
- Offline local LLM support.
- GitHub repository analyzer.
- Project-to-portfolio conversion.
- Viva/interview simulator.
- Team/classroom mode.

## 7. User Personas

### Persona 1: The Vibe-Coding Student
Builds projects fast using Claude/ChatGPT but cannot explain internals clearly.

Needs:
- Code explanation
- Learning plan
- Debugging help
- Concept map
- Interview/viva questions

### Persona 2: The Placement-Focused Student
Needs DSA, project explanation, and interview preparation.

Needs:
- DSA mapping
- System design basics
- Resume project bullets
- Mock interview questions

### Persona 3: The Serious Builder
Wants to build authentic projects and deeply understand the architecture.

Needs:
- Architecture documentation
- Decision logs
- Technical depth
- Git-based workflow

## 8. MVP Feature List

### 8.1 Workspace Dashboard
Users can create workspaces:
- Project workspace
- Topic workspace
- DSA workspace
- Exam workspace

Each workspace includes:
- Title
- Description
- Goal
- Status
- Created date
- Progress score

### 8.2 Project Ingestion
Users can add:
- Project name
- Tech stack
- GitHub link
- Local file notes
- Manual architecture notes
- README content
- Important code snippets

MVP does not need full automatic repo parsing initially. Start with manual + pasted content.

### 8.3 Learning Map Generator
Generates:
- Module breakdown
- Concepts required
- Files/components involved
- Beginner explanation
- Intermediate explanation
- Advanced explanation
- “What you must be able to explain” checklist

### 8.4 Explain-Back Mode
The system asks questions like:
- What does this module do?
- Why is this dependency needed?
- Explain this function in simple words.
- What breaks if this file is removed?
- How would you rebuild this feature without AI?

User answers manually.
System stores confidence:
- Red: cannot explain
- Yellow: partial understanding
- Green: confident

### 8.5 Debugging Coach
For each bug, user records:
- Bug summary
- Error message
- Suspected cause
- Actual cause
- Fix
- Lesson learned
- Prevention rule

### 8.6 DSA/Concept Bridge
Maps project features to fundamentals:
- Authentication → hashing, tokens, state management
- Search → indexing, tries, embeddings, ranking
- File upload → streams, validation, storage
- Recommendation → similarity, vectors, scoring
- Scheduling → queues, priority, time complexity

### 8.7 Daily Learning Log
Stores:
- What I built today
- What I understood
- What I still do not understand
- Bugs faced
- Concepts revised
- Next action

### 8.8 Progress Dashboard
Displays:
- Workspaces count
- Current active project
- Concepts mastered
- Weak areas
- Explain-back score
- Debugging lessons count
- Streak

## 9. Non-Functional Requirements

### Performance
- MVP should load dashboard under 2 seconds locally.
- SQLite queries should be simple and indexed.

### Privacy
- User learning logs and project notes must be stored locally by default.
- No forced cloud account in MVP.

### Maintainability
- Feature-first folder structure.
- Clear naming.
- TypeScript strict mode.
- Small components.
- Documentation updated per feature.

### Accessibility
- Keyboard navigable.
- Good contrast.
- Clear typography.
- Mobile-responsive layout.

## 10. Success Metrics

MVP success:
- User can create at least one project workspace.
- User can create a learning map.
- User can answer explain-back questions.
- User can log debugging lessons.
- User can see progress dashboard.
- User can export notes as Markdown.

Behavioral success:
- User understands project better after using the app.
- User can prepare for viva/interview from generated notes.
- User reduces blind AI dependency.

## 11. MVP Scope

Included:
- Local web app
- Workspaces
- Learning maps
- Explain-back questions
- Debug logs
- Daily logs
- Progress dashboard
- Markdown export

Excluded from MVP:
- Full autonomous repo parsing
- Local LLM inference
- Multi-user sync
- Mobile app
- Paid plans
- Complex graph visualization
- Real-time collaboration

## 12. Product Philosophy

NirmiqCodeSensei should not be a generic AI chatbot.

It should feel like:
- A personal academic operating system
- A strict project mentor
- A learning debugger
- A thinking trainer
- A proof-of-understanding system
