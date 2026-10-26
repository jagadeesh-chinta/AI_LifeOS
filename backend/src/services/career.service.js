const axios = require('axios');
const pool = require('../config/db');
const AppError = require('../utils/AppError');

// Intelligent deterministic fallback generator when AI network connections are unavailable
function generateDeterministicRoadmap(title, durationStr) {
  const t = title.toLowerCase();

  if (t.includes('app') || t.includes('flutter') || t.includes('mobile') || t.includes('react native') || t.includes('ios') || t.includes('android')) {
    return {
      goal_title: title,
      target_duration: durationStr || '6 Months',
      overview: `A comprehensive, industry-aligned mobile application development roadmap structured to take you from foundational concepts to building, testing, and publishing production-ready cross-platform or native apps.`,
      required_skills: [
        'Mobile UI/UX Principles',
        'State Management',
        'REST & GraphQL APIs',
        'Device Hardware APIs (Camera, GPS, Storage)',
        'App Store & Play Store Deployment'
      ],
      ai_provider: 'curated_engineering_fallback',
      stages: [
        {
          stage_number: 1,
          stage_name: '1. Mobile Foundations & UI',
          skills_topics: 'Mobile design principles, responsive mobile layouts, layout widgets, lifecycle',
          technologies: 'Flutter/Dart, or React Native / Expo, TypeScript',
          practical_project: 'Personal Portfolio & Expense Tracker App',
          estimated_duration: '4 weeks'
        },
        {
          stage_number: 2,
          stage_name: '2. Dynamic State & Navigation',
          skills_topics: 'Deep linking, screen navigation, global state management, caching',
          technologies: 'Bloc/Riverpod or Redux Toolkit/Zustand',
          practical_project: 'E-Commerce Mobile Catalog with Cart',
          estimated_duration: '4 weeks'
        },
        {
          stage_number: 3,
          stage_name: '3. Backend Integration & Auth',
          skills_topics: 'Authentication tokens, push notifications, offline-first data sync',
          technologies: 'Firebase Auth, Supabase, Axios/Dio',
          practical_project: 'Real-Time Social Feed & Messaging App',
          estimated_duration: '4 weeks'
        },
        {
          stage_number: 4,
          stage_name: '4. Native Capabilities & Storage',
          skills_topics: 'Camera, geolocation, SQLite/Hive storage, biometric authentication',
          technologies: 'SQLite, CoreLocation, Camera APIs',
          practical_project: 'Fitness Tracking & Route Mapping App',
          estimated_duration: '3 weeks'
        },
        {
          stage_number: 5,
          stage_name: '5. Testing, CI/CD & Store Release',
          skills_topics: 'Unit/Widget tests, fastlane, code signing, App Store & Google Play release',
          technologies: 'Fastlane, GitHub Actions, Play Console, App Store Connect',
          practical_project: 'Production App Store / TestFlight Release',
          estimated_duration: '3 weeks'
        }
      ],
      milestones: [
        'Complete basic interactive UI and responsive screens',
        'Master asynchronous data fetching and local persistence',
        'Deploy first internal test build on Android/iOS devices',
        'Publish full mobile application to public app store'
      ],
      checklist: [
        'Understand mobile app lifecycle and background processing',
        'Proficient in modern mobile state management patterns',
        'Configured CI/CD automated builds and signing credentials',
        'Successfully deployed and validated app performance with zero memory leaks'
      ]
    };
  }

  if (t.includes('machine learning') || t.includes('ai') || t.includes('data science') || t.includes('deep learning')) {
    return {
      goal_title: title,
      target_duration: durationStr || '6 Months',
      overview: `A rigorous end-to-end curriculum for modern Artificial Intelligence and Machine Learning, covering statistical foundations, supervised/unsupervised algorithms, deep neural architectures, and real-world MLOps deployment.`,
      required_skills: [
        'Applied Mathematics & Linear Algebra',
        'Data Manipulation & Visualization',
        'Classical Machine Learning Algorithms',
        'Deep Learning Architectures (Transformers, CNNs)',
        'Model Deployment & Monitoring (MLOps)'
      ],
      ai_provider: 'curated_engineering_fallback',
      stages: [
        {
          stage_number: 1,
          stage_name: '1. Mathematical & Python Core',
          skills_topics: 'Linear algebra, multivariate calculus, probability distributions, matrix operations',
          technologies: 'Python 3, NumPy, Pandas, Matplotlib, Seaborn',
          practical_project: 'Exploratory Data Analysis on Real-World Financial Dataset',
          estimated_duration: '4 weeks'
        },
        {
          stage_number: 2,
          stage_name: '2. Supervised & Unsupervised ML',
          skills_topics: 'Regression, classification, clustering, dimensionality reduction, feature engineering',
          technologies: 'Scikit-Learn, XGBoost, LightGBM',
          practical_project: 'Predictive Customer Churn & Segmentation Model',
          estimated_duration: '5 weeks'
        },
        {
          stage_number: 3,
          stage_name: '3. Deep Learning & Neural Nets',
          skills_topics: 'Backpropagation, optimization algorithms, CNNs for computer vision, RNNs',
          technologies: 'PyTorch, TensorFlow, Keras',
          practical_project: 'Medical Image Classifier with PyTorch',
          estimated_duration: '5 weeks'
        },
        {
          stage_number: 4,
          stage_name: '4. NLP, LLMs & Generative AI',
          skills_topics: 'Attention mechanisms, Transformer architectures, prompt engineering, fine-tuning, RAG',
          technologies: 'Hugging Face Transformers, LangChain, Vector DBs (Chroma/FAISS)',
          practical_project: 'Domain-Specific Retrieval-Augmented Generation (RAG) System',
          estimated_duration: '4 weeks'
        },
        {
          stage_number: 5,
          stage_name: '5. MLOps & Production Inference',
          skills_topics: 'Model versioning, Dockerization, REST model serving, latency optimization',
          technologies: 'FastAPI, Docker, MLflow, ONNX Runtime',
          practical_project: 'End-to-End Scalable ML Microservice on Cloud',
          estimated_duration: '3 weeks'
        }
      ],
      milestones: [
        'Perform exploratory data analysis and feature engineering on raw data',
        'Train, tune, and evaluate classical ML models with high precision',
        'Build and train neural network models in PyTorch',
        'Deploy a scalable RAG or prediction pipeline with monitoring'
      ],
      checklist: [
        'Mastered gradient descent, cost functions, and regularization techniques',
        'Proficient in building evaluation metrics (ROC-AUC, F1-score, BLEU)',
        'Hands-on experience fine-tuning LLMs or vision transformers',
        'Deployed containerized inference endpoints with API docs'
      ]
    };
  }

  // Default: Full Stack & Modern Software Engineering
  return {
    goal_title: title,
    target_duration: durationStr || '6 Months',
    overview: `A structured, industry-grade career roadmap designed to systematically build expertise, ship tangible portfolio applications, and prepare for professional excellence in ${title}.`,
    required_skills: [
      'Core Programming Fundamentals',
      'Modern Frontend Architecture & State',
      'Scalable Backend REST/GraphQL APIs',
      'Relational & Document Database Modeling',
      'Cloud Deployment & CI/CD Pipelines'
    ],
    ai_provider: 'curated_engineering_fallback',
    stages: [
      {
        stage_number: 1,
        stage_name: '1. Foundations & Modern JavaScript',
        skills_topics: 'HTML5 semantic markup, CSS3 flexbox/grid, modern ES6+ JavaScript, DOM architecture',
        technologies: 'HTML5, CSS3, JavaScript (ES6+), Git & GitHub',
        practical_project: 'Interactive Responsive Web Portfolio & Dashboard',
        estimated_duration: '4 weeks'
      },
      {
        stage_number: 2,
        stage_name: '2. Frontend Architecture & React',
        skills_topics: 'Component composition, custom hooks, client routing, global state management, Tailwind CSS',
        technologies: 'React.js, Vite, Tailwind CSS, Lucide Icons',
        practical_project: 'Collaborative Task & Project Management App',
        estimated_duration: '4 weeks'
      },
      {
        stage_number: 3,
        stage_name: '3. Backend APIs & Authentication',
        skills_topics: 'RESTful architecture, Express middleware, JWT auth, password hashing, input validation',
        technologies: 'Node.js, Express.js, JWT, bcryptjs',
        practical_project: 'Multi-Tenant Authentication & Resource API Service',
        estimated_duration: '4 weeks'
      },
      {
        stage_number: 4,
        stage_name: '4. Database Engineering & Optimization',
        skills_topics: 'Schema modeling, foreign keys, transactions, indexing, SQL queries, connection pooling',
        technologies: 'MySQL, PostgreSQL, Prisma or Knex.js',
        practical_project: 'Scalable Inventory & Analytics Database with Views',
        estimated_duration: '3 weeks'
      },
      {
        stage_number: 5,
        stage_name: '5. Full-Stack Integration & Testing',
        skills_topics: 'Connecting frontend to backend, error boundaries, optimistic UI updates, unit testing',
        technologies: 'Axios, Vitest / Jest, Postman',
        practical_project: 'Production-Ready SaaS Platform with Payments/Email',
        estimated_duration: '3 weeks'
      },
      {
        stage_number: 6,
        stage_name: '6. Cloud Deployment, CI/CD & DevOps',
        skills_topics: 'Containerization, environment variable security, automated pipelines, CDN caching',
        technologies: 'Docker, GitHub Actions, Vercel / Render / AWS',
        practical_project: 'Live Globally Deployed Application with Automated CI/CD',
        estimated_duration: '2 weeks'
      }
    ],
    milestones: [
      'Master fundamental syntax, styling, and version control',
      'Build fully functional Single Page Application with dynamic state',
      'Implement secure authentication and authorized database queries',
      'Deploy full-stack project live to the internet with continuous deployment'
    ],
    checklist: [
      'Confident in modern frontend layout and state management',
      'Able to design relational schemas and write optimized SQL',
      'Implemented secure JWT authentication and password hashing',
      'Deployed live portfolio demonstrating production code quality'
    ]
  };
}

// Query OpenAI API
async function queryOpenAI(prompt) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey.startsWith('your_') || apiKey.trim() === '') {
    return null;
  }

  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

  try {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model,
        messages: [
          {
            role: 'system',
            content: 'You are an elite Senior Staff Engineer and Tech Career Advisor. Generate realistic, comprehensive, actionable career guidance roadmaps in structured JSON format only.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey.trim()}`
        },
        timeout: 15000
      }
    );

    const content = response.data.choices?.[0]?.message?.content;
    if (content) {
      const parsed = JSON.parse(content);
      parsed.ai_provider = 'OpenAI';
      return parsed;
    }
  } catch (err) {
    // console.log('[Career Service] OpenAI API unavailable:', err.message);
  }
  return null;
}

// Query Gemini API
async function queryGemini(prompt) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'PASTE_YOUR_NEW_GEMINI_API_KEY_HERE' || apiKey.startsWith('your_') || apiKey.trim() === '') {
    return null;
  }

  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey.trim()}`;
    const payload = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.2
      }
    };

    const response = await axios.post(url, payload, { timeout: 15000 });
    const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (text) {
      const parsed = JSON.parse(text);
      parsed.ai_provider = 'Google Gemini';
      return parsed;
    }
  } catch (err) {
    // console.log('[Career Service] Gemini API unavailable:', err.message);
  }
  return null;
}

// Generate or Retrieve Career Guidance Roadmap for a user goal
exports.getCareerRoadmap = async (userId, goalId, forceRegenerate = false) => {
  // 1. Fetch the goal
  const [goals] = await pool.query('SELECT * FROM goals WHERE id = ? AND user_id = ?', [goalId, userId]);
  if (goals.length === 0) {
    throw new AppError('Goal not found', 404);
  }

  const goal = goals[0];

  // 2. Return cached roadmap if available and not forcing regeneration
  if (!forceRegenerate && goal.career_roadmap) {
    try {
      const cached = typeof goal.career_roadmap === 'string'
        ? JSON.parse(goal.career_roadmap)
        : goal.career_roadmap;
      if (cached && cached.stages && cached.stages.length > 0) {
        return cached;
      }
    } catch (e) {
      // If parsing fails, regenerate
    }
  }

  // 3. Format duration string
  const durationStr = goal.duration_value
    ? `${goal.duration_value} ${goal.duration_unit || 'Months'}`
    : goal.custom_duration || '6 Months';

  const prompt = `
Generate a comprehensive, career roadmap for the following user goal:
Goal Title: "${goal.title}"
Target Duration: "${durationStr}"
Description / Context: "${goal.description || 'Personal professional development objective'}"

Return a valid JSON object matching EXACTLY this structure:
{
  "goal_title": "${goal.title}",
  "target_duration": "${durationStr}",
  "overview": "Detailed 2-3 sentence strategic summary of the career path and objective.",
  "required_skills": ["Skill 1", "Skill 2", "Skill 3", "Skill 4", "Skill 5"],
  "stages": [
    {
      "stage_number": 1,
      "stage_name": "Stage 1 Name (e.g. 1. Foundations)",
      "skills_topics": "Key skills and theoretical concepts to learn",
      "technologies": "Specific tools, languages, and frameworks",
      "practical_project": "Concrete real-world project to build and publish",
      "estimated_duration": "4 weeks"
    }
  ],
  "milestones": ["Milestone 1", "Milestone 2", "Milestone 3", "Milestone 4"],
  "checklist": ["Checklist item 1", "Checklist item 2", "Checklist item 3", "Checklist item 4"]
}
Ensure the stages fit the target duration of "${durationStr}" reasonably (e.g. 4 to 6 stages total).
`;

  // 4. Try OpenAI first
  let roadmap = await queryOpenAI(prompt);

  // 5. If OpenAI fails, try Gemini
  if (!roadmap) {
    roadmap = await queryGemini(prompt);
  }

  // 6. If both external APIs fail or keys are invalid, use deterministic engineering roadmap
  if (!roadmap || !roadmap.stages || roadmap.stages.length === 0) {
    roadmap = generateDeterministicRoadmap(goal.title, durationStr);
  }

  // Ensure metadata is filled
  roadmap.goal_title = goal.title;
  roadmap.target_duration = durationStr;
  roadmap.generated_at = new Date().toISOString();

  // 7. Persist to MySQL so subsequent requests are fast and permanent
  try {
    await pool.query(
      'UPDATE goals SET career_roadmap = ? WHERE id = ? AND user_id = ?',
      [JSON.stringify(roadmap), goalId, userId]
    );
  } catch (dbErr) {
    console.error('Failed to cache roadmap in MySQL:', dbErr);
  }

  return roadmap;
};
