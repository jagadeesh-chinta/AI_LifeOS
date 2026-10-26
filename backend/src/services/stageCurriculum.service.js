/**
 * Stage Curriculum & Interactive Progress Service for AI LifeOS Career Guidance.
 * 
 * Responsibilities:
 * 1. Generate and persist granular technology & topic roadmaps for each career stage.
 * 2. Track circular topic completion states in MySQL with timestamps and user notes.
 * 3. Calculate 3-tier progress: Technology-level, Stage-level, and Goal-level.
 * 4. Provide contextual AI Learning Assistant for individual topics.
 * 5. Support any career goal dynamically (Full Stack, Mobile/Flutter, AI/ML, Data Analyst, Cloud/DevOps, etc.).
 */
const pool = require('../config/db');
const AppError = require('../utils/AppError');
const axios = require('axios');

// Curated comprehensive curriculum database for primary engineering tracks
const CURATED_STAGE_CURRICULUMS = {
  // 1. FULL STACK WEB DEVELOPER
  full_stack: {
    1: {
      technologies: [
        {
          id: 'html5',
          name: 'HTML5 Semantic Web',
          icon_type: 'html',
          description: 'Document structure, accessibility, modern semantic elements, and SEO fundamentals.',
          topics: [
            {
              id: 'html5_doc_structure',
              title: 'HTML Document Structure & Nesting',
              short_description: 'Understanding DOCTYPE, html, head, body tags, viewport meta, and proper DOM element nesting.',
              estimated_time: '45 mins',
              difficulty: 'Beginner',
              key_concepts: ['DOCTYPE html', 'head vs body', 'meta tags', 'DOM nesting rules'],
              why_important: 'The foundational blueprint of every web page rendered by browsers.',
              code_example: '<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>App</title>\n</head>\n<body>\n  <main><h1>Hello World</h1></main>\n</body>\n</html>',
              practical_exercise: 'Build a valid semantic landing page skeleton with correct meta tags and viewport scaling.'
            },
            {
              id: 'html5_semantic_tags',
              title: 'Semantic HTML Elements',
              short_description: 'Replacing generic divs with header, nav, main, section, article, aside, and footer.',
              estimated_time: '45 mins',
              difficulty: 'Beginner',
              key_concepts: ['header, nav, main', 'section vs article', 'aside, footer', 'Screen reader navigation'],
              why_important: 'Dramatically improves SEO ranking and web accessibility for screen readers.',
              code_example: '<header><nav><a href="/">Home</a></nav></header>\n<main>\n  <article>\n    <h2>Latest News</h2>\n    <p>Semantic tags give meaning.</p>\n  </article>\n</main>\n<footer>&copy; 2026</footer>',
              practical_exercise: 'Refactor a div-heavy webpage into a structured semantic document.'
            },
            {
              id: 'html5_forms_validation',
              title: 'Forms, Inputs & Native Validation',
              short_description: 'Text, email, number, select, checkbox, radio, form submission, and regex pattern matching.',
              estimated_time: '60 mins',
              difficulty: 'Beginner',
              key_concepts: ['form action & method', 'label & input linking with id', 'required, pattern, min/max', 'Form accessibility'],
              why_important: 'User data collection and authentication entry points on the web.',
              code_example: '<form id="loginForm">\n  <label for="email">Email</label>\n  <input type="email" id="email" required placeholder="user@example.com">\n  <button type="submit">Log In</button>\n</form>',
              practical_exercise: 'Create a multi-field registration form with client-side validation rules and accessible labels.'
            },
            {
              id: 'html5_accessibility_seo',
              title: 'Accessibility (a11y) & SEO Foundations',
              short_description: 'ARIA attributes, image alt tags, heading hierarchy (h1-h6), tab indices, and open graph meta tags.',
              estimated_time: '45 mins',
              difficulty: 'Intermediate',
              key_concepts: ['alt text strategies', 'aria-label & role', 'Heading levels hierarchy', 'Open Graph social tags'],
              why_important: 'Ensures inclusive user experiences and peak search engine discoverability.',
              code_example: '<button aria-label="Close modal dialog" onclick="closeModal()">\n  <span aria-hidden="true">&times;</span>\n</button>',
              practical_exercise: 'Audit a website using Lighthouse or axe-core and remediate all contrast and ARIA warnings.'
            }
          ]
        },
        {
          id: 'css3',
          name: 'CSS3 Architecture & Modern Layouts',
          icon_type: 'css',
          description: 'Box model, Flexbox, CSS Grid, custom properties, responsive media queries, and animations.',
          topics: [
            {
              id: 'css3_box_model',
              title: 'Box Model, Sizing & Specificity',
              short_description: 'Content, padding, border, margin, box-sizing: border-box, and selector cascade hierarchy.',
              estimated_time: '45 mins',
              difficulty: 'Beginner',
              key_concepts: ['box-sizing: border-box', 'Margin collapsing', 'Specificity calculations (0,0,0,0)', 'Cascade order'],
              why_important: 'Prevents unexpected layout overflow bugs and selector override conflicts.',
              code_example: '*, *::before, *::after {\n  box-sizing: border-box;\n  margin: 0;\n  padding: 0;\n}\n.card {\n  padding: 1.5rem;\n  border: 1px solid #334155;\n}',
              practical_exercise: 'Create a clean card component with defined padding, border, and margin without overflow.'
            },
            {
              id: 'css3_flexbox',
              title: 'Flexbox Layouts & Alignment',
              short_description: 'Main axis, cross axis, justify-content, align-items, flex-direction, flex-grow, shrink, and wrap.',
              estimated_time: '60 mins',
              difficulty: 'Beginner',
              key_concepts: ['display: flex', 'justify-content vs align-items', 'flex: 1 auto', 'gap property'],
              why_important: 'The primary layout system for navigation bars, item lists, and 1-dimensional alignment.',
              code_example: '.nav-container {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  gap: 1rem;\n}',
              practical_exercise: 'Build a responsive header and navbar with flex alignment, search bar, and user avatar.'
            },
            {
              id: 'css3_grid',
              title: 'CSS Grid & 2D Layouts',
              short_description: 'Grid templates, repeat, minmax, auto-fit/auto-fill, grid-template-areas, and gap sizing.',
              estimated_time: '75 mins',
              difficulty: 'Intermediate',
              key_concepts: ['display: grid', 'grid-template-columns: repeat(auto-fit, minmax(280px, 1fr))', 'grid-gap', 'grid-area alignment'],
              why_important: 'Essential for modern responsive dashboards, image galleries, and multi-column magazine layouts.',
              code_example: '.dashboard-grid {\n  display: grid;\n  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));\n  gap: 1.5rem;\n}',
              practical_exercise: 'Construct a multi-card responsive analytics dashboard that reflows automatically on mobile screens.'
            },
            {
              id: 'css3_responsive_media_queries',
              title: 'Responsive Design & Mobile-First Approach',
              short_description: 'Mobile-first breakpoints with min-width, fluid typography with clamp(), and touch targets.',
              estimated_time: '60 mins',
              difficulty: 'Intermediate',
              key_concepts: ['Mobile-first design', '@media (min-width: 768px)', 'clamp(1rem, 2.5vw, 2rem)', 'Touch target sizes (48px+)'],
              why_important: 'Over 60% of web traffic originates from mobile devices.',
              code_example: '/* Mobile first */\n.sidebar { display: none; }\n@media (min-width: 1024px) {\n  .sidebar { display: block; width: 260px; }\n}',
              practical_exercise: 'Develop a responsive product showcase that adapts smoothly from 360px mobile to 1440px desktop.'
            },
            {
              id: 'css3_variables_animations',
              title: 'CSS Variables & Smooth Transitions',
              short_description: 'Custom properties (:root variables), transition timing functions, transform: translateY(), and keyframes.',
              estimated_time: '45 mins',
              difficulty: 'Intermediate',
              key_concepts: ['var(--primary-color)', 'transition: all 0.2s cubic-bezier', 'transform: scale(1.02)', '@keyframes pulse'],
              why_important: 'Powers dark/light themes and creates polished, interactive micro-animations.',
              code_example: ':root {\n  --accent: #06b6d4;\n}\n.button {\n  background: var(--accent);\n  transition: transform 0.2s ease;\n}\n.button:hover {\n  transform: translateY(-2px);\n}',
              practical_exercise: 'Implement a theme toggle using CSS variables with smooth hover elevation states.'
            }
          ]
        },
        {
          id: 'javascript_es6',
          name: 'Modern JavaScript (ES6+)',
          icon_type: 'js',
          description: 'Scope, closures, array methods, destructuring, asynchronous JS, Promises, async/await, and APIs.',
          topics: [
            {
              id: 'js_variables_scope',
              title: 'Variables, Types & Lexical Scope',
              short_description: 'let vs const vs var, block scope, primitive types vs references, and truthy/falsy evaluation.',
              estimated_time: '45 mins',
              difficulty: 'Beginner',
              key_concepts: ['Block scope', 'const immutability of references', 'Pass by value vs reference', 'Type coercion'],
              why_important: 'Eliminates unexpected bugs, variable shadowing, and unintended state mutation.',
              code_example: 'const user = { name: "Alex" };\nuser.name = "Morgan"; // Allowed\n// user = {}; // TypeError: Assignment to constant variable',
              practical_exercise: 'Debug scope issues in a legacy script and refactor all vars to modern const and let declarations.'
            },
            {
              id: 'js_functions_arrow',
              title: 'Arrow Functions & Rest/Spread Operators',
              short_description: 'Lexical this binding, implicit returns, rest parameters (...args), and object/array spread cloning.',
              estimated_time: '45 mins',
              difficulty: 'Beginner',
              key_concepts: ['Arrow syntax () => {}', 'Lexical this', 'Spread {...obj, key: val}', 'Rest parameters'],
              why_important: 'Standard idiom in modern React, Node.js, and functional JavaScript programming.',
              code_example: 'const add = (a, b) => a + b;\nconst updatedUser = { ...user, active: true };\nconst sumAll = (...nums) => nums.reduce((a, b) => a + b, 0);',
              practical_exercise: 'Write immutable state update helper functions using object and array spread syntax.'
            },
            {
              id: 'js_array_methods',
              title: 'Array Methods (map, filter, reduce, find)',
              short_description: 'Functional array manipulation without imperative for-loops; transformation, filtering, and aggregation.',
              estimated_time: '60 mins',
              difficulty: 'Intermediate',
              key_concepts: ['map() transformation', 'filter() predicate', 'reduce() accumulator', 'find() & some()/every()'],
              why_important: 'Crucial for rendering dynamic UI lists, filtering tables, and computing metrics.',
              code_example: 'const tasks = [{ id: 1, done: true }, { id: 2, done: false }];\nconst completed = tasks.filter(t => t.done);\nconst totalTasks = tasks.reduce((acc, t) => acc + 1, 0);',
              practical_exercise: 'Transform raw API product data: filter by category, calculate total cost, and map to display items.'
            },
            {
              id: 'js_async_promises',
              title: 'Promises & Asynchronous Execution',
              short_description: 'Call stack, event loop, microtask queue, Promise states (pending, resolved, rejected), and chaining.',
              estimated_time: '60 mins',
              difficulty: 'Intermediate',
              key_concepts: ['Event loop & call stack', 'new Promise((res, rej) => {})', '.then().catch().finally()', 'Microtasks queue'],
              why_important: 'Enables responsive web apps that handle network requests without freezing the UI.',
              code_example: 'const fetchData = () => {\n  return new Promise((resolve) => {\n    setTimeout(() => resolve({ status: 200 }), 500);\n  });\n};\nfetchData().then(data => console.log(data));',
              practical_exercise: 'Wrap a callback-based timer function in a clean, reusable Promise.'
            },
            {
              id: 'js_async_await_fetch',
              title: 'async/await & Fetch API Integration',
              short_description: 'Modern asynchronous syntax, try/catch error handling, HTTP headers, and JSON serialization.',
              estimated_time: '60 mins',
              difficulty: 'Intermediate',
              key_concepts: ['async function', 'await keyword', 'try/catch/finally', 'fetch(url, options).json()'],
              why_important: 'The primary method for communicating with backend servers and cloud REST APIs.',
              code_example: 'async function getProfile(userId) {\n  try {\n    const res = await fetch(`/api/users/${userId}`);\n    if (!res.ok) throw new Error("HTTP error " + res.status);\n    return await res.json();\n  } catch (err) {\n    console.error("Fetch failed:", err.message);\n  }\n}',
              practical_exercise: 'Build a weather widget that fetches live weather from a public API with loading and error states.'
            },
            {
              id: 'js_local_storage',
              title: 'Browser Storage (localStorage & sessionStorage)',
              short_description: 'Key-value client storage, JSON.stringify / JSON.parse, quota limits, and persistence across tabs.',
              estimated_time: '45 mins',
              difficulty: 'Beginner',
              key_concepts: ['localStorage.setItem()', 'localStorage.getItem()', 'JSON.stringify & parse', 'Storage events'],
              why_important: 'Preserves user preferences, draft form data, and authentication tokens across browser reloads.',
              code_example: 'const saveTheme = (theme) => localStorage.setItem("app_theme", theme);\nconst getTheme = () => localStorage.getItem("app_theme") || "system";',
              practical_exercise: 'Create a persistent shopping cart that stores items in localStorage and restores them on page refresh.'
            }
          ]
        },
        {
          id: 'git_github',
          name: 'Git Version Control & GitHub',
          icon_type: 'git',
          description: 'Repositories, commits, branching, merging, conflict resolution, pull requests, and collaboration.',
          topics: [
            {
              id: 'git_init_commit',
              title: 'Git Fundamentals: Staging & Commits',
              short_description: 'git init, git status, git add, crafting meaningful atomic commit messages, and .gitignore files.',
              estimated_time: '45 mins',
              difficulty: 'Beginner',
              key_concepts: ['Working tree vs staging area', 'git commit -m', '.gitignore setup', 'git log --oneline'],
              why_important: 'The universal safety net and history tracking standard for all software engineers.',
              code_example: 'git init\ngit add index.html style.css\ngit commit -m "feat: implement responsive navigation layout"',
              practical_exercise: 'Initialize a new repository, configure a .gitignore for node_modules/.env, and make 3 atomic commits.'
            },
            {
              id: 'git_branches_merge',
              title: 'Branching, Merging & Conflict Resolution',
              short_description: 'git checkout -b, feature branch workflows, fast-forward vs three-way merges, and resolving merge conflicts.',
              estimated_time: '60 mins',
              difficulty: 'Intermediate',
              key_concepts: ['git branch & switch', 'git merge branch_name', 'Merge conflict markers (<<<, ===, >>>)', 'git rebase basics'],
              why_important: 'Enables safe parallel development without breaking the main production branch.',
              code_example: 'git checkout -b feature/auth-modal\n# Make changes and commit\ngit checkout main\ngit merge feature/auth-modal',
              practical_exercise: 'Create two branches with conflicting edits to the same file, merge them, and resolve the conflict cleanly.'
            },
            {
              id: 'git_remotes_pr',
              title: 'Remote Repositories, Push & Pull Requests',
              short_description: 'git remote add origin, git push -u, cloning, forking, opening GitHub Pull Requests, and code review.',
              estimated_time: '45 mins',
              difficulty: 'Beginner',
              key_concepts: ['git remote -v', 'git push origin main', 'git pull --rebase', 'GitHub Pull Request workflow'],
              why_important: 'The core collaboration mechanism for open-source and professional engineering teams.',
              code_example: 'git remote add origin https://github.com/username/project.git\ngit push -u origin main',
              practical_exercise: 'Push a project to GitHub, create a feature branch, and open a Pull Request with a descriptive summary.'
            }
          ]
        },
        {
          id: 'dom_integration',
          name: 'DOM Architecture & App Integration',
          icon_type: 'dom',
          description: 'Document Object Model traversal, event delegation, dynamic rendering, and building complete interactive apps.',
          topics: [
            {
              id: 'dom_traversal_selection',
              title: 'DOM Querying, Traversal & Modification',
              short_description: 'querySelector, querySelectorAll, createElement, appendChild, classList, and dataset attributes.',
              estimated_time: '60 mins',
              difficulty: 'Beginner',
              key_concepts: ['document.querySelector()', 'element.classList.toggle()', 'document.createElement()', 'textContent vs innerHTML'],
              why_important: 'Allows JavaScript to dynamically read, create, and modify HTML elements on the fly.',
              code_example: 'const list = document.querySelector("#taskList");\nconst item = document.createElement("li");\nitem.textContent = "New Task";\nlist.appendChild(item);',
              practical_exercise: 'Write a script that creates and mounts a dynamic modal dialog to the document body.'
            },
            {
              id: 'dom_event_delegation',
              title: 'Event Bubbling & Event Delegation',
              short_description: 'Event propagation phases (capturing, target, bubbling), e.target, e.currentTarget, and delegation on lists.',
              estimated_time: '60 mins',
              difficulty: 'Intermediate',
              key_concepts: ['Event bubbling', 'e.stopPropagation()', 'e.preventDefault()', 'Event delegation on parent container'],
              why_important: 'Massively improves performance by using one event listener instead of hundreds on dynamic list items.',
              code_example: 'document.querySelector("#itemContainer").addEventListener("click", (e) => {\n  if (e.target.matches("button.delete-btn")) {\n    e.target.closest("li").remove();\n  }\n});',
              practical_exercise: 'Attach a single click listener to a list that handles delete, edit, and toggle actions dynamically.'
            },
            {
              id: 'dom_interactive_mini_project',
              title: 'Interactive Project: Dynamic Task & Budget Planner',
              short_description: 'Synthesizing HTML, CSS, JavaScript, and localStorage into a complete, standalone responsive application.',
              estimated_time: '90 mins',
              difficulty: 'Intermediate',
              key_concepts: ['State-driven UI', 'DOM event handlers', 'Local persistence', 'Form input sanitization'],
              why_important: 'Proves mastery of Stage 1 foundations before moving into React and frontend frameworks.',
              code_example: '// Synthesizes events, DOM rendering, and localStorage into a complete interactive page',
              practical_exercise: 'Build an interactive Task Planner with filters (All, Active, Completed), local storage, and count statistics.'
            }
          ]
        }
      ]
    },
    2: {
      technologies: [
        {
          id: 'react_core',
          name: 'React Foundations & JSX',
          icon_type: 'react',
          description: 'Virtual DOM, component-driven architecture, JSX syntax, and props passing.',
          topics: [
            {
              id: 'react_jsx_components',
              title: 'Components, JSX & Props Data Flow',
              short_description: 'Functional components, JSX expressions, passing props, and children composition.',
              estimated_time: '60 mins',
              difficulty: 'Beginner',
              key_concepts: ['One-way data flow', 'JSX syntax rules', 'Props destructuring', 'props.children'],
              why_important: 'The core building block of all modern frontend web applications.',
              code_example: 'function UserCard({ name, role }) {\n  return (\n    <div className="card">\n      <h3>{name}</h3>\n      <p>{role}</p>\n    </div>\n  );\n}',
              practical_exercise: 'Create a reusable Avatar and ProfileCard component with customizable props.'
            },
            {
              id: 'react_state_usestate',
              title: 'State Management with useState',
              short_description: 'Component state, immutability, batching, functional updates, and controlled form inputs.',
              estimated_time: '60 mins',
              difficulty: 'Beginner',
              key_concepts: ['const [state, setState] = useState()', 'Functional updates prev => !prev', 'Controlled inputs', 'Derived state'],
              why_important: 'Powers reactive user interfaces that update automatically when data changes.',
              code_example: 'const [count, setCount] = useState(0);\nconst increment = () => setCount(prev => prev + 1);',
              practical_exercise: 'Build a multi-field filter bar with live search, dropdown, and active tags using useState.'
            }
          ]
        },
        {
          id: 'react_hooks',
          name: 'Hooks & Side Effects',
          icon_type: 'react',
          description: 'useEffect lifecycle, dependency arrays, custom hooks, and cleanup functions.',
          topics: [
            {
              id: 'react_useeffect_lifecycle',
              title: 'useEffect & Side Effect Management',
              short_description: 'Data fetching, subscription cleanup, dependency arrays, and preventing infinite re-render loops.',
              estimated_time: '75 mins',
              difficulty: 'Intermediate',
              key_concepts: ['Dependency array rules', 'Cleanup return () => {}', 'Component mounting/unmounting', 'Race condition handling'],
              why_important: 'Coordinates data fetching, timers, and browser listeners safely.',
              code_example: 'useEffect(() => {\n  let active = true;\n  fetchUserData(userId).then(data => { if (active) setUser(data); });\n  return () => { active = false; };\n}, [userId]);',
              practical_exercise: 'Implement a debounced live-search hook that cancels obsolete requests.'
            },
            {
              id: 'react_custom_hooks',
              title: 'Creating Reusable Custom Hooks',
              short_description: 'Extracting stateful logic into useLocalStorage, useWindowSize, useFetch, and useDebounce.',
              estimated_time: '60 mins',
              difficulty: 'Intermediate',
              key_concepts: ['Logic extraction', 'Naming convention useX', 'Returning values or tuples', 'Reusability across components'],
              why_important: 'Eliminates duplicated logic across components and cleans up component code.',
              code_example: 'function useLocalStorage(key, initialValue) {\n  const [value, setValue] = useState(() => JSON.parse(localStorage.getItem(key)) || initialValue);\n  useEffect(() => localStorage.setItem(key, JSON.stringify(value)), [key, value]);\n  return [value, setValue];\n}',
              practical_exercise: 'Write a custom hook useOnlineStatus that tracks whether the user has internet connectivity.'
            }
          ]
        },
        {
          id: 'react_routing',
          name: 'Routing & Application Architecture',
          icon_type: 'routing',
          description: 'React Router v6, URL parameters, nested routes, protected routes, and layouts.',
          topics: [
            {
              id: 'react_router_nested',
              title: 'React Router v6 & Layouts',
              short_description: 'BrowserRouter, Routes, Route, Outlet, useParams, and useSearchParams.',
              estimated_time: '60 mins',
              difficulty: 'Intermediate',
              key_concepts: ['createBrowserRouter or Routes', 'Outlet for parent layouts', 'useNavigate programmatic navigation', 'useParams for dynamic IDs'],
              why_important: 'Transforms a single-page app into a navigable multi-view application with shareable URLs.',
              code_example: '<Routes>\n  <Route path="/" element={<AppLayout />}>\n    <Route index element={<Dashboard />} />\n    <Route path="goals/:id" element={<GoalDetail />} />\n  </Route>\n</Routes>',
              practical_exercise: 'Create a multi-tab dashboard layout with persistent sidebar and dynamic route loading.'
            }
          ]
        }
      ]
    },
    3: {
      technologies: [
        {
          id: 'nodejs_express',
          name: 'Node.js & Express Architecture',
          icon_type: 'node',
          description: 'RESTful API principles, Express routing, middleware chain, and request lifecycle.',
          topics: [
            {
              id: 'node_express_rest',
              title: 'Express REST API Design & Controller Pattern',
              short_description: 'HTTP verbs (GET, POST, PUT, DELETE), status codes, route parameters, and controllers.',
              estimated_time: '60 mins',
              difficulty: 'Intermediate',
              key_concepts: ['app.use(express.json())', 'req.params & req.body', 'Status codes 200, 201, 400, 404, 500', 'Router separation'],
              why_important: 'The core backend framework powering modern JavaScript full-stack stacks.',
              code_example: 'const router = express.Router();\nrouter.get("/tasks", taskController.getAllTasks);\nrouter.post("/tasks", taskController.createTask);',
              practical_exercise: 'Build a CRUD REST API with Express router separation and proper HTTP response codes.'
            },
            {
              id: 'node_middleware_errors',
              title: 'Middleware Chain & Centralized Error Handling',
              short_description: 'Custom middleware, logging, async error handling wrappers, and standardized error responses.',
              estimated_time: '60 mins',
              difficulty: 'Intermediate',
              key_concepts: ['(req, res, next) pattern', 'Global error handler (err, req, res, next)', 'Custom AppError class', 'Validation middleware'],
              why_important: 'Ensures application resilience and avoids unhandled promise rejection crashes.',
              code_example: 'app.use((err, req, res, next) => {\n  const status = err.statusCode || 500;\n  res.status(status).json({ success: false, message: err.message });\n});',
              practical_exercise: 'Create a request logger middleware and a global error handling middleware.'
            }
          ]
        },
        {
          id: 'auth_jwt',
          name: 'Authentication & Security',
          icon_type: 'security',
          description: 'Password hashing with bcrypt, JWT token signing/verification, and protected route middleware.',
          topics: [
            {
              id: 'auth_jwt_tokens',
              title: 'JWT Authentication & Token Verification',
              short_description: 'Stateless authentication, Bearer tokens, payload claims, expiration, and authorization headers.',
              estimated_time: '75 mins',
              difficulty: 'Intermediate',
              key_concepts: ['jwt.sign(payload, secret, { expiresIn })', 'jwt.verify(token, secret)', 'Authorization: Bearer header', 'Protect middleware'],
              why_important: 'Secures user data and establishes user identity across stateless API requests.',
              code_example: 'const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: "7d" });',
              practical_exercise: 'Build a protect middleware that verifies the JWT header and attaches the user to req.user.'
            },
            {
              id: 'auth_password_hashing',
              title: 'Password Hashing & Security Best Practices',
              short_description: 'bcrypt salt rounds, constant-time comparison, input sanitization, and CORS configuration.',
              estimated_time: '45 mins',
              difficulty: 'Intermediate',
              key_concepts: ['bcrypt.hash(pwd, 12)', 'bcrypt.compare()', 'CORS origin whitelisting', 'Helmet security headers'],
              why_important: 'Protects user accounts against data breaches and unauthorized cross-origin access.',
              code_example: 'const hashedPassword = await bcrypt.hash(password, 12);\nconst isMatch = await bcrypt.compare(password, user.password);',
              practical_exercise: 'Implement secure registration and login controllers with bcrypt and input sanitization.'
            }
          ]
        }
      ]
    },
    4: {
      technologies: [
        {
          id: 'mysql_sql',
          name: 'Relational Database Engineering & MySQL',
          icon_type: 'database',
          description: 'Schema normalization, foreign keys, indexing, complex joins, transactions, and ACID properties.',
          topics: [
            {
              id: 'db_normalization_schema',
              title: 'Database Schema Design & Normalization',
              short_description: '1NF, 2NF, 3NF, primary keys, foreign keys, cascades, and one-to-many / many-to-many relationships.',
              estimated_time: '60 mins',
              difficulty: 'Intermediate',
              key_concepts: ['Primary & Foreign Keys', '1NF, 2NF, 3NF rules', 'ON DELETE CASCADE', 'Junction tables for Many-to-Many'],
              why_important: 'Eliminates data redundancy and guarantees referential integrity across relational data.',
              code_example: 'CREATE TABLE tasks (\n  id INT AUTO_INCREMENT PRIMARY KEY,\n  user_id INT NOT NULL,\n  title VARCHAR(255) NOT NULL,\n  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE\n);',
              practical_exercise: 'Design a normalized 3-table schema for users, projects, and task assignments.'
            },
            {
              id: 'db_indexing_optimization',
              title: 'Indexes, EXPLAIN Plans & Query Optimization',
              short_description: 'B-Tree indexes, composite indexes, analyzing query bottlenecks with EXPLAIN, and pagination.',
              estimated_time: '75 mins',
              difficulty: 'Advanced',
              key_concepts: ['B-Tree index mechanics', 'EXPLAIN query analysis', 'Composite index column order', 'Offset vs Keyset pagination'],
              why_important: 'Prevents expensive full table scans and keeps queries under 10ms as datasets scale to millions of rows.',
              code_example: 'CREATE INDEX idx_user_status ON tasks (user_id, status);\nEXPLAIN SELECT * FROM tasks WHERE user_id = 5 AND status = "TODO";',
              practical_exercise: 'Analyze a slow query with EXPLAIN and apply a composite index to reduce examined rows by 90%.'
            },
            {
              id: 'db_transactions_acid',
              title: 'Transactions & ACID Compliance',
              short_description: 'START TRANSACTION, COMMIT, ROLLBACK, isolation levels, and preventing race conditions.',
              estimated_time: '60 mins',
              difficulty: 'Advanced',
              key_concepts: ['Atomicity, Consistency, Isolation, Durability', 'START TRANSACTION / COMMIT / ROLLBACK', 'Deadlocks prevention', 'Row-level locking'],
              why_important: 'Guarantees critical financial and business operations succeed completely or abort safely without corruption.',
              code_example: 'const conn = await pool.getConnection();\ntry {\n  await conn.beginTransaction();\n  await conn.query("UPDATE accounts SET balance = balance - 100 WHERE id = 1");\n  await conn.query("UPDATE accounts SET balance = balance + 100 WHERE id = 2");\n  await conn.commit();\n} catch (err) {\n  await conn.rollback();\n} finally { conn.release(); }',
              practical_exercise: 'Implement a transactional checkout flow that debits inventory and records an order atomically.'
            }
          ]
        }
      ]
    },
    5: {
      technologies: [
        {
          id: 'testing_qa',
          name: 'Integration Testing & Verification',
          icon_type: 'testing',
          description: 'Unit testing with Jest/Vitest, API integration tests with Supertest, and End-to-End browser tests.',
          topics: [
            {
              id: 'test_unit_vitest',
              title: 'Unit Testing Functions & Hooks with Vitest',
              short_description: 'Test runners, assertions (expect), mocks, test coverage, and pure function testing.',
              estimated_time: '60 mins',
              difficulty: 'Intermediate',
              key_concepts: ['describe / it / test', 'expect().toBe() / toEqual()', 'vi.fn() mocks', 'Coverage reporting'],
              why_important: 'Catches regressions before production deployment and provides refactoring confidence.',
              code_example: 'import { describe, it, expect } from "vitest";\ndescribe("calculateProgress", () => {\n  it("returns 50% for 5 of 10 completed", () => {\n    expect(calculateProgress(5, 10)).toBe(50);\n  });\n});',
              practical_exercise: 'Write unit tests covering edge cases for a progress calculation and date formatting utility.'
            },
            {
              id: 'test_api_supertest',
              title: 'API Integration Testing with Supertest',
              short_description: 'Testing Express routes, status codes, response payloads, database state, and authentication headers.',
              estimated_time: '75 mins',
              difficulty: 'Intermediate',
              key_concepts: ['request(app).get()', 'Bearer auth injection', 'Status code assertions', 'Database cleanup hooks'],
              why_important: 'Verifies the complete request-response cycle and database interaction end-to-end.',
              code_example: 'const res = await request(app)\n  .get("/api/goals")\n  .set("Authorization", `Bearer ${token}`);\nexpect(res.status).toBe(200);\nexpect(Array.isArray(res.body.goals)).toBe(true);',
              practical_exercise: 'Create integration tests for user registration, duplicate email rejection, and authenticated profile access.'
            }
          ]
        }
      ]
    },
    6: {
      technologies: [
        {
          id: 'devops_cloud',
          name: 'Cloud Deployment, CI/CD & DevOps',
          icon_type: 'cloud',
          description: 'Docker containerization, GitHub Actions automated pipelines, cloud hosting, and reverse proxy setup.',
          topics: [
            {
              id: 'devops_docker_containers',
              title: 'Docker Containerization & Multi-Stage Builds',
              short_description: 'Dockerfile instructions, multi-stage Node/Vite builds, docker-compose, and environment isolation.',
              estimated_time: '75 mins',
              difficulty: 'Intermediate',
              key_concepts: ['FROM node:alpine', 'WORKDIR & COPY', 'Multi-stage production build', 'docker-compose up'],
              why_important: 'Eliminates "works on my machine" issues and standardizes deployment across environments.',
              code_example: 'FROM node:20-alpine AS build\nWORKDIR /app\nCOPY package*.json ./\nRUN npm ci\nCOPY . .\nRUN npm run build\nEXPOSE 5000\nCMD ["npm", "start"]',
              practical_exercise: 'Write a production-ready multi-stage Dockerfile for a React frontend and Node.js backend.'
            },
            {
              id: 'devops_github_actions',
              title: 'Automated CI/CD with GitHub Actions',
              short_description: 'Workflow YAML, triggers (push, pull_request), test automation, build verification, and deployment.',
              estimated_time: '60 mins',
              difficulty: 'Intermediate',
              key_concepts: ['on: [push, pull_request]', 'jobs & steps', 'actions/checkout & setup-node', 'Secrets management'],
              why_important: 'Automates testing and deployment so buggy code is blocked from reaching production.',
              code_example: 'name: CI Pipeline\non: [push]\njobs:\n  build:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - uses: actions/setup-node@v4\n        with: { node-version: 20 }\n      - run: npm ci\n      - run: npm test',
              practical_exercise: 'Create a GitHub Actions workflow that runs linter and test suite on every pull request.'
            }
          ]
        }
      ]
    }
  },

  // 2. FLUTTER / MOBILE APP DEVELOPER
  mobile_flutter: {
    1: {
      technologies: [
        {
          id: 'dart_core',
          name: 'Dart Programming Language Core',
          icon_type: 'dart',
          description: 'Type system, null safety, collections, OOP, factory constructors, and async streams.',
          topics: [
            {
              id: 'dart_null_safety',
              title: 'Sound Null Safety & Type System',
              short_description: 'Non-nullable types, nullable types with ?, null assertion with !, and late initialization.',
              estimated_time: '45 mins',
              difficulty: 'Beginner',
              key_concepts: ['String vs String?', 'null-aware operators (??, ?.)', 'late keyword', 'Type inference with var/final'],
              why_important: 'Prevents null pointer runtime crashes at compile time in Flutter applications.',
              code_example: 'String? nullableName;\nString greeting = nullableName ?? "Guest";\nlate final String initializedLater;',
              practical_exercise: 'Refactor legacy Dart code to enforce sound null safety without runtime exceptions.'
            },
            {
              id: 'dart_oop_mixins',
              title: 'Classes, Inheritance & Mixins',
              short_description: 'Constructors, named constructors, factory constructors, mixins with the "with" keyword, and extensions.',
              estimated_time: '60 mins',
              difficulty: 'Intermediate',
              key_concepts: ['Named constructors Class.fromMap()', 'factory constructors', 'Mixins (with Logger)', 'Extension methods'],
              why_important: 'Fundamental architectural pattern used across the Flutter framework and UI widget tree.',
              code_example: 'class User {\n  final String name;\n  User({required this.name});\n  factory User.fromJson(Map<String, dynamic> json) => User(name: json["name"]);\n}',
              practical_exercise: 'Build a User data model with factory fromJson and toJson serialization methods.'
            }
          ]
        },
        {
          id: 'flutter_widgets',
          name: 'Flutter Widget Architecture & UI',
          icon_type: 'flutter',
          description: 'Stateless vs Stateful widgets, widget tree lifecycle, Row, Column, Stack, and responsive layouts.',
          topics: [
            {
              id: 'flutter_widget_tree',
              title: 'Stateless vs StatefulWidget & BuildContext',
              short_description: 'The immutable widget tree, element tree, render tree, setState() triggering, and context usage.',
              estimated_time: '60 mins',
              difficulty: 'Beginner',
              key_concepts: ['StatelessWidget build()', 'StatefulWidget & State lifecycle', 'setState()', 'BuildContext lookup'],
              why_important: 'Everything in Flutter is a widget; understanding how state triggers rebuilds is essential.',
              code_example: 'class Counter extends StatefulWidget {\n  @override\n  State<Counter> createState() => _CounterState();\n}\nclass _CounterState extends State<Counter> {\n  int _count = 0;\n  void _inc() => setState(() => _count++);\n  @override\n  Widget build(BuildContext context) => ElevatedButton(onPressed: _inc, child: Text("$_count"));\n}',
              practical_exercise: 'Create an interactive counter screen with animated state changes and reset button.'
            },
            {
              id: 'flutter_layouts_responsive',
              title: 'Row, Column, Stack & LayoutBuilder',
              short_description: 'Flex alignments, Expanded, Flexible, Stack with Positioned, and MediaQuery responsive sizing.',
              estimated_time: '60 mins',
              difficulty: 'Beginner',
              key_concepts: ['MainAxisAlignment & CrossAxisAlignment', 'Expanded vs Flexible', 'Stack & Positioned', 'LayoutBuilder & MediaQuery'],
              why_important: 'Ensures Flutter UI renders flawlessly across phones, tablets, and foldable screens.',
              code_example: 'Row(\n  mainAxisAlignment: MainAxisAlignment.spaceBetween,\n  children: [\n    Icon(Icons.star),\n    Expanded(child: Text("Product Title", overflow: TextOverflow.ellipsis)),\n  ],\n)',
              practical_exercise: 'Construct a responsive product card that adapts layout between portrait and landscape modes.'
            }
          ]
        }
      ]
    },
    2: {
      technologies: [
        {
          id: 'flutter_state_management',
          name: 'State Management (Riverpod / Bloc)',
          icon_type: 'state',
          description: 'Architecting predictable state, separation of business logic, and reactive UI rebuilding.',
          topics: [
            {
              id: 'flutter_riverpod_basics',
              title: 'Riverpod Providers & ConsumerWidget',
              short_description: 'StateProvider, StateNotifierProvider, ref.watch vs ref.read, and dependency injection.',
              estimated_time: '75 mins',
              difficulty: 'Intermediate',
              key_concepts: ['ProviderScope root', 'ConsumerWidget build(context, ref)', 'ref.watch for reactive updates', 'AutoDispose modifiers'],
              why_important: 'Industry-standard state management that is compile-safe and does not depend on BuildContext.',
              code_example: 'final counterProvider = StateProvider<int>((ref) => 0);\n\nclass Display extends ConsumerWidget {\n  @override\n  Widget build(BuildContext context, WidgetRef ref) {\n    final count = ref.watch(counterProvider);\n    return Text("$count");\n  }\n}',
              practical_exercise: 'Build an e-commerce shopping cart using Riverpod to add items and compute total price.'
            }
          ]
        }
      ]
    }
  },

  // 3. AI / MACHINE LEARNING ENGINEER
  ai_ml: {
    1: {
      technologies: [
        {
          id: 'python_math_core',
          name: 'Mathematics & Python Core for ML',
          icon_type: 'python',
          description: 'Linear algebra, vectorization with NumPy, data manipulation with Pandas, and statistics.',
          topics: [
            {
              id: 'numpy_vectorization',
              title: 'NumPy Arrays & Vectorized Matrix Operations',
              short_description: 'N-dimensional arrays, broadcasting rules, matrix multiplication (dot product), and linear algebra routines.',
              estimated_time: '60 mins',
              difficulty: 'Beginner',
              key_concepts: ['np.ndarray', 'Vectorization vs Python loops', 'Broadcasting dimensions', 'np.dot & @ operator'],
              why_important: 'Powers high-performance tensor mathematics essential for machine learning algorithms.',
              code_example: 'import numpy as np\nX = np.array([[1, 2], [3, 4]])\nW = np.array([[0.5], [0.5]])\ny_pred = X @ W  # Vectorized matrix product',
              practical_exercise: 'Implement a vectorized linear regression hypothesis function using pure NumPy matrix multiplication.'
            },
            {
              id: 'pandas_data_wrangling',
              title: 'Pandas DataFrames, Cleaning & Feature Extraction',
              short_description: 'Reading CSV/Parquet, handling missing values (NaN), groupby aggregations, and merging dataframes.',
              estimated_time: '60 mins',
              difficulty: 'Beginner',
              key_concepts: ['pd.DataFrame & Series', 'df.dropna() & fillna()', 'df.groupby().agg()', 'apply & lambda transformations'],
              why_important: '80% of machine learning engineering is data wrangling and preparation.',
              code_example: 'import pandas as pd\ndf = pd.read_csv("data.csv")\nclean_df = df.dropna().groupby("category")["revenue"].mean()',
              practical_exercise: 'Load a messy real-world housing dataset, impute missing values, and calculate summary metrics.'
            }
          ]
        }
      ]
    }
  }
};

/**
 * Generate dynamic structured curriculum for any career stage using LLM with deterministic fallback
 */
function generateDynamicStageCurriculum(goalTitle, stage, stageNumber) {
  const t = goalTitle.toLowerCase();
  const stageName = stage.stage_name || `Stage ${stageNumber}`;
  const techStr = stage.technologies || 'Core Technologies';
  const skillsStr = stage.skills_topics || 'Foundational principles';
  const project = stage.practical_project || 'Hands-on Milestone Project';
  const duration = stage.estimated_duration || '4 weeks';

  // Check if we have curated matching
  let matchedTrack = null;
  if (t.includes('full stack') || t.includes('web') || t.includes('software engineer') || t.includes('frontend') || t.includes('mern')) {
    matchedTrack = CURATED_STAGE_CURRICULUMS.full_stack;
  } else if (t.includes('flutter') || t.includes('mobile') || t.includes('android') || t.includes('ios')) {
    matchedTrack = CURATED_STAGE_CURRICULUMS.mobile_flutter;
  } else if (t.includes('ai') || t.includes('machine learning') || t.includes('data science') || t.includes('ml')) {
    matchedTrack = CURATED_STAGE_CURRICULUMS.ai_ml;
  }

  if (matchedTrack && matchedTrack[stageNumber]) {
    return {
      stage_number: stageNumber,
      stage_name: stageName,
      practical_project: project,
      estimated_duration: duration,
      technologies: matchedTrack[stageNumber].technologies
    };
  }

  // Synthesize dynamic modular curriculum from stage technologies & skills
  const techNames = techStr.split(/[,/|&]/).map(s => s.trim()).filter(s => s.length > 1);
  const primaryTechs = techNames.length > 0 ? techNames : ['Core Architecture', 'Specialized Frameworks', 'Testing & Tooling'];

  const generatedTechs = primaryTechs.slice(0, 4).map((tech, techIdx) => {
    const slug = tech.toLowerCase().replace(/[^a-z0-9]+/g, '_');
    return {
      id: `${slug}_stage${stageNumber}`,
      name: tech,
      icon_type: 'code',
      description: `Comprehensive mastery of ${tech} tailored to ${goalTitle} requirements.`,
      topics: [
        {
          id: `${slug}_fundamentals_${stageNumber}`,
          title: `${tech} Foundations & Core Architecture`,
          short_description: `Understanding fundamental syntax, configuration, conventions, and mental model of ${tech}.`,
          estimated_time: '45 mins',
          difficulty: 'Beginner',
          key_concepts: [`${tech} initialization`, 'Core conventions', 'Configuration setup', 'Common design patterns'],
          why_important: `Provides the essential operational knowledge required for ${stageName}.`,
          code_example: `// Core implementation pattern for ${tech}\nconsole.log("Mastering ${tech} for ${goalTitle}");`,
          practical_exercise: `Set up a development workspace for ${tech} and build a minimal working prototype.`
        },
        {
          id: `${slug}_deep_dive_${stageNumber}`,
          title: `${tech} In-Depth Implementation & Logic`,
          short_description: `Building real-world features, managing state, error handling, and component communication in ${tech}.`,
          estimated_time: '60 mins',
          difficulty: 'Intermediate',
          key_concepts: ['Asynchronous workflows', 'State management', 'Data validation', 'Error handling strategies'],
          why_important: `Transforms basic syntax understanding into production-ready feature execution.`,
          code_example: `// Production implementation pattern\nasync function handle${tech.replace(/[^a-zA-Z]/g, '')}() {\n  // Execute business logic with error handling\n}`,
          practical_exercise: `Implement an end-to-end feature integrating ${tech} with data persistence.`
        },
        {
          id: `${slug}_optimization_${stageNumber}`,
          title: `${tech} Best Practices, Testing & Optimization`,
          short_description: `Writing clean code, debugging edge cases, writing automated tests, and performance tuning for ${tech}.`,
          estimated_time: '60 mins',
          difficulty: 'Advanced',
          key_concepts: ['Performance profiling', 'Automated unit tests', 'Memory optimization', 'Security review'],
          why_important: `Ensures code maintains high reliability, security, and scalability under production load.`,
          code_example: `// Test case verifying ${tech} behavior\ntest("validates core feature execution", () => {\n  // Assertion logic\n});`,
          practical_exercise: `Write test cases for ${tech} and optimize response time / rendering performance.`
        }
      ]
    };
  });

  return {
    stage_number: stageNumber,
    stage_name: stageName,
    practical_project: project,
    estimated_duration: duration,
    technologies: generatedTechs
  };
}

/**
 * Retrieve or Generate Stage Curriculum (persisted in MySQL so it never changes randomly)
 */
exports.getStageCurriculum = async (userId, goalId, stageNumber) => {
  const num = parseInt(stageNumber, 10);
  if (isNaN(num) || num < 1) {
    throw new AppError('Invalid stage number', 400);
  }

  // 1. Fetch Goal & Roadmap
  const [goals] = await pool.query('SELECT * FROM goals WHERE id = ? AND user_id = ?', [goalId, userId]);
  if (goals.length === 0) {
    throw new AppError('Goal not found or access denied', 404);
  }

  const goal = goals[0];
  let roadmap = null;
  if (goal.career_roadmap) {
    try {
      roadmap = typeof goal.career_roadmap === 'string' ? JSON.parse(goal.career_roadmap) : goal.career_roadmap;
    } catch {}
  }

  const stages = roadmap?.stages || [];
  const targetStage = stages.find(s => s.stage_number === num) || stages[num - 1] || {
    stage_number: num,
    stage_name: `Stage ${num}`,
    skills_topics: 'Key concepts and skills',
    technologies: 'Core Technologies',
    practical_project: 'Milestone Practical Project',
    estimated_duration: '4 weeks'
  };

  // 2. Check if curriculum is already persisted in MySQL
  const [curriculumRows] = await pool.query(
    'SELECT * FROM career_stage_curriculums WHERE goal_id = ? AND stage_number = ?',
    [goalId, num]
  );

  let curriculum = null;
  if (curriculumRows.length > 0) {
    try {
      curriculum = JSON.parse(curriculumRows[0].curriculum_data);
    } catch (e) {
      console.warn('Failed to parse saved curriculum, regenerating:', e.message);
    }
  }

  // 3. If not saved, generate and persist
  if (!curriculum || !curriculum.technologies || curriculum.technologies.length === 0) {
    curriculum = generateDynamicStageCurriculum(goal.title, targetStage, num);
    try {
      await pool.query(
        `INSERT INTO career_stage_curriculums (goal_id, user_id, stage_number, stage_name, curriculum_data)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE curriculum_data = VALUES(curriculum_data), stage_name = VALUES(stage_name)`,
        [goalId, userId, num, targetStage.stage_name || `Stage ${num}`, JSON.stringify(curriculum)]
      );
    } catch (dbErr) {
      console.error('Failed to persist stage curriculum:', dbErr);
    }
  }

  // 4. Fetch user's completed topics for this stage
  const [progressRows] = await pool.query(
    'SELECT technology_id, topic_id, completed, notes, completed_at FROM career_topic_progress WHERE user_id = ? AND goal_id = ? AND stage_number = ?',
    [userId, goalId, num]
  );

  const completedMap = new Map();
  progressRows.forEach(row => {
    if (row.completed) {
      completedMap.set(row.topic_id, {
        completed: true,
        completed_at: row.completed_at,
        notes: row.notes
      });
    }
  });

  // 5. Merge completion state & calculate progress at Technology & Stage levels
  let stageTotalTopics = 0;
  let stageCompletedTopics = 0;
  let nextRecommendedTopic = null;

  const enrichedTechs = (curriculum.technologies || []).map(tech => {
    let techTotal = 0;
    let techCompleted = 0;

    const enrichedTopics = (tech.topics || []).map(topic => {
      stageTotalTopics++;
      techTotal++;

      const isCompleted = completedMap.has(topic.id);
      if (isCompleted) {
        stageCompletedTopics++;
        techCompleted++;
      } else if (!nextRecommendedTopic) {
        nextRecommendedTopic = {
          technology_id: tech.id,
          technology_name: tech.name,
          ...topic
        };
      }

      const rec = completedMap.get(topic.id);
      return {
        ...topic,
        completed: isCompleted,
        completed_at: rec?.completed_at || null,
        notes: rec?.notes || null
      };
    });

    const techPercent = techTotal > 0 ? Math.round((techCompleted / techTotal) * 100) : 0;

    return {
      ...tech,
      progress: {
        completed: techCompleted,
        total: techTotal,
        percentage: techPercent
      },
      topics: enrichedTopics
    };
  });

  const stagePercent = stageTotalTopics > 0 ? Math.round((stageCompletedTopics / stageTotalTopics) * 100) : 0;

  // 6. Calculate Overall Goal Progress
  const [goalProgressRows] = await pool.query(
    'SELECT COUNT(*) as completed_count FROM career_topic_progress WHERE user_id = ? AND goal_id = ? AND completed = 1',
    [userId, goalId]
  );
  const totalGoalCompleted = goalProgressRows[0]?.completed_count || 0;

  // Estimate total topics across all stages
  const totalStagesCount = stages.length || 5;
  const avgTopicsPerStage = Math.max(stageTotalTopics, 12);
  const estimatedGoalTotalTopics = Math.max(totalStagesCount * avgTopicsPerStage, totalGoalCompleted);
  const overallGoalPercent = estimatedGoalTotalTopics > 0 ? Math.round((totalGoalCompleted / estimatedGoalTotalTopics) * 100) : 0;

  return {
    goal_id: Number(goalId),
    goal_title: goal.title,
    stage_number: num,
    stage_name: targetStage.stage_name || `Stage ${num}`,
    practical_project: targetStage.practical_project,
    estimated_duration: targetStage.estimated_duration,
    technologies: enrichedTechs,
    progress: {
      stage: {
        completed: stageCompletedTopics,
        total: stageTotalTopics,
        percentage: stagePercent
      },
      goal: {
        completed: totalGoalCompleted,
        total: estimatedGoalTotalTopics,
        percentage: overallGoalPercent
      }
    },
    next_recommended_topic: nextRecommendedTopic
  };
};

/**
 * Toggle topic completion status and recalculate progress
 */
exports.toggleTopicCompletion = async (userId, goalId, stageNumber, technologyId, topicId, completedState = null, notes = null) => {
  const num = parseInt(stageNumber, 10);

  // 1. Verify goal ownership
  const [goals] = await pool.query('SELECT id, title FROM goals WHERE id = ? AND user_id = ?', [goalId, userId]);
  if (goals.length === 0) {
    throw new AppError('Goal not found or access denied', 404);
  }

  // 2. Check current status if completedState is null
  let nextState = completedState;
  if (nextState === null) {
    const [existing] = await pool.query(
      'SELECT completed FROM career_topic_progress WHERE user_id = ? AND goal_id = ? AND topic_id = ?',
      [userId, goalId, topicId]
    );
    nextState = existing.length > 0 ? !existing[0].completed : true;
  }

  const completedAt = nextState ? new Date() : null;

  // 3. Upsert into career_topic_progress
  await pool.query(
    `INSERT INTO career_topic_progress (goal_id, user_id, stage_number, technology_id, topic_id, completed, completed_at, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE 
       completed = VALUES(completed), 
       completed_at = VALUES(completed_at), 
       notes = COALESCE(VALUES(notes), notes)`,
    [goalId, userId, num, technologyId, topicId, nextState, completedAt, notes]
  );

  // 4. Return updated stage curriculum with recalculated progress
  const updatedCurriculum = await exports.getStageCurriculum(userId, goalId, num);

  // 5. Update goals.progress in MySQL to stay synchronized
  const newGoalPercent = updatedCurriculum.progress.goal.percentage;
  await pool.query('UPDATE goals SET progress = ? WHERE id = ? AND user_id = ?', [newGoalPercent, goalId, userId]);

  return {
    success: true,
    topic_id: topicId,
    completed: nextState,
    completed_at: completedAt,
    progress: updatedCurriculum.progress,
    stage_curriculum: updatedCurriculum
  };
};

/**
 * Reset all progress for a single stage
 */
exports.resetStageProgress = async (userId, goalId, stageNumber) => {
  const num = parseInt(stageNumber, 10);
  await pool.query(
    'DELETE FROM career_topic_progress WHERE user_id = ? AND goal_id = ? AND stage_number = ?',
    [userId, goalId, num]
  );

  // Recalculate
  const updated = await exports.getStageCurriculum(userId, goalId, num);
  await pool.query('UPDATE goals SET progress = ? WHERE id = ? AND user_id = ?', [
    updated.progress.goal.percentage,
    goalId,
    userId
  ]);

  return { success: true, message: `Progress for Stage ${num} has been reset.`, stage_curriculum: updated };
};

/**
 * Reset all progress across the entire goal
 */
exports.resetGoalProgress = async (userId, goalId) => {
  await pool.query('DELETE FROM career_topic_progress WHERE user_id = ? AND goal_id = ?', [userId, goalId]);
  await pool.query('UPDATE goals SET progress = 0 WHERE id = ? AND user_id = ?', [goalId, userId]);
  return { success: true, message: 'All topic progress for this goal has been reset to 0%.' };
};

/**
 * Contextual AI Learning Assistant for individual topics
 */
exports.askTopicAssistant = async (userId, goalId, stageNumber, topicContext, userQuery) => {
  if (!userQuery || !userQuery.trim()) {
    throw new AppError('Question or prompt is required', 400);
  }

  const [goals] = await pool.query('SELECT title FROM goals WHERE id = ? AND user_id = ?', [goalId, userId]);
  const goalTitle = goals.length > 0 ? goals[0].title : 'Career Goal';

  const systemPrompt = `
You are the AI LifeOS Interactive Learning Mentor dedicated to helping the user master this specific topic.

TOPIC CONTEXT:
- Career Goal: "${goalTitle}"
- Stage: "${topicContext.stage_name || `Stage ${stageNumber}`}"
- Technology: "${topicContext.technology_name || 'Core Tech'}"
- Topic Title: "${topicContext.topic_title || 'Topic'}"
- Description: "${topicContext.short_description || ''}"
- Key Concepts: ${(topicContext.key_concepts || []).join(', ')}

PEDAGOGICAL INSTRUCTIONS:
1. Explain clearly with real-world analogies suitable for learners.
2. Provide clean, well-commented code snippets or practical steps.
3. If the user asks for a quiz, give 3-5 multiple-choice questions with answers hidden or explained.
4. If the user asks for an interview explanation, highlight what senior tech interviewers look for.
5. Keep responses structured using markdown headers, bold points, and code blocks.
`;

  // 1. Try OpenAI
  const openAiKey = process.env.OPENAI_API_KEY || process.env.AI_API_KEY;
  if (openAiKey && !openAiKey.startsWith('your_') && openAiKey.trim() !== '') {
    try {
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userQuery }
          ],
          temperature: 0.7
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${openAiKey.trim()}`
          },
          timeout: 10000
        }
      );
      if (response.data?.choices?.[0]?.message?.content) {
        return {
          success: true,
          answer: response.data.choices[0].message.content,
          provider: 'openai'
        };
      }
    } catch (e) {
      console.warn('OpenAI topic assistant failed, trying Gemini:', e.message);
    }
  }

  // 2. Try Gemini
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey && !geminiKey.startsWith('your_') && geminiKey.trim() !== '') {
    try {
      const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey.trim()}`;
      const response = await axios.post(
        url,
        {
          contents: [
            {
              role: 'user',
              parts: [{ text: `${systemPrompt}\n\nUSER QUESTION: ${userQuery}` }]
            }
          ]
        },
        { timeout: 10000 }
      );
      const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) {
        return {
          success: true,
          answer: text,
          provider: 'gemini'
        };
      }
    } catch (e) {
      console.warn('Gemini topic assistant failed, using contextual fallback:', e.message);
    }
  }

  // 3. High quality contextual fallback
  const fallbackAnswer = `### Master ${topicContext.topic_title || 'Topic'}

**What this means for ${goalTitle}:**
${topicContext.short_description || 'Understanding the core mechanisms and design patterns of this technology.'}

#### Core Principles to Remember:
${(topicContext.key_concepts || ['Fundamental principles', 'Implementation syntax', 'Performance & Error handling']).map(k => `- **${k}**: Essential for robust, maintainable architecture.`).join('\n')}

#### Practical Application Example:
\`\`\`javascript
// Example implementation pattern for ${topicContext.topic_title}
function demonstrateConcept() {
  // 1. Initialize input parameters
  // 2. Apply core business logic
  // 3. Return clean, validated result
  return true;
}
\`\`\`

#### Hands-On Challenge:
${topicContext.practical_exercise || 'Build a small prototype demonstrating this concept and verify test cases.'}

*Ask me to give you a practice quiz, explain with a real-world analogy, or review common technical interview questions on this topic!*`;

  return {
    success: true,
    answer: fallbackAnswer,
    provider: 'contextual_mentor'
  };
};

/**
 * Get overall goal progress summary for all stages in Career Guidance
 */
exports.getGoalProgressSummary = async (userId, goalId) => {
  const [goals] = await pool.query('SELECT id, title, career_roadmap, progress FROM goals WHERE id = ? AND user_id = ?', [goalId, userId]);
  if (goals.length === 0) {
    throw new AppError('Goal not found', 404);
  }

  const goal = goals[0];
  let roadmap = null;
  if (goal.career_roadmap) {
    try {
      roadmap = typeof goal.career_roadmap === 'string' ? JSON.parse(goal.career_roadmap) : goal.career_roadmap;
    } catch {}
  }

  const stages = roadmap?.stages || [];

  // Fetch completed topics per stage
  const [completedRows] = await pool.query(
    'SELECT stage_number, COUNT(*) as completed_count FROM career_topic_progress WHERE user_id = ? AND goal_id = ? AND completed = 1 GROUP BY stage_number',
    [userId, goalId]
  );

  const completedByStage = new Map();
  let totalCompleted = 0;
  completedRows.forEach(r => {
    completedByStage.set(r.stage_number, r.completed_count);
    totalCompleted += r.completed_count;
  });

  const stageSummaries = stages.map((s, idx) => {
    const stageNum = s.stage_number || idx + 1;
    const completed = completedByStage.get(stageNum) || 0;
    // Estimate ~12 topics per stage if not yet opened
    const total = 12;
    return {
      stage_number: stageNum,
      stage_name: s.stage_name,
      completed,
      total,
      percentage: Math.min(100, Math.round((completed / total) * 100))
    };
  });

  const estimatedTotal = stages.length * 12;
  const overallPercent = estimatedTotal > 0 ? Math.min(100, Math.round((totalCompleted / estimatedTotal) * 100)) : 0;

  return {
    goal_id: goal.id,
    goal_title: goal.title,
    overall_progress: overallPercent,
    total_completed: totalCompleted,
    total_topics: estimatedTotal,
    stages: stageSummaries
  };
};
