const { GoogleGenAI, Type } = require('@google/genai');

/**
 * Returns a configured GoogleGenAI instance or null if not configured
 */
function getClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'PASTE_YOUR_NEW_GEMINI_API_KEY_HERE' || apiKey.trim() === '') {
    return null;
  }
  return new GoogleGenAI({ apiKey: apiKey.trim() });
}

/**
 * Schema for structured schedule generation
 */
const scheduleResponseSchema = {
  type: Type.OBJECT,
  properties: {
    date: { type: Type.STRING },
    summary: { type: Type.STRING },
    schedule: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          task_id: { type: Type.INTEGER },
          title: { type: Type.STRING },
          start_time: { type: Type.STRING, description: "Start time in HH:MM 24-hour format" },
          end_time: { type: Type.STRING, description: "End time in HH:MM 24-hour format" },
          duration_minutes: { type: Type.INTEGER },
          reason: { type: Type.STRING },
          category: { type: Type.STRING },
          priority: { type: Type.STRING },
          type: { type: Type.STRING }
        },
        required: ["title", "start_time", "end_time"]
      }
    },
    breaks: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          start_time: { type: Type.STRING },
          end_time: { type: Type.STRING }
        },
        required: ["title", "start_time", "end_time"]
      }
    },
    unscheduled_tasks: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          task_id: { type: Type.INTEGER },
          reason: { type: Type.STRING }
        },
        required: ["task_id", "reason"]
      }
    },
    recommendations: {
      type: Type.ARRAY,
      items: { type: Type.STRING }
    }
  },
  required: ["summary", "schedule"]
};

/**
 * Schema for parsing natural language text into tasks
 */
const parseTaskSchema = {
  type: Type.OBJECT,
  properties: {
    tasks: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          due_date: { type: Type.STRING },
          duration_minutes: { type: Type.INTEGER },
          priority: { type: Type.STRING }
        },
        required: ["title"]
      }
    }
  },
  required: ["tasks"]
};

/**
 * Generate a personalized daily schedule using Gemini
 */
exports.generateScheduleWithGemini = async (context) => {
  const ai = getClient();
  if (!ai) {
    throw new Error('GEMINI_API_KEY is not configured or contains placeholder value');
  }

  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

  const systemInstruction = `
You are the AI LifeOS Planner — an elite productivity and schedule architect.
Your objective is to design a realistic, highly personalized, and balanced daily schedule strictly for the specified date (${context.date}).

CRITICAL SCHEDULING RULES:
1. Adapt completely to the user's actual commitments, tasks, events, and goals for this specific date:
   - If an exam, critical meeting, or fixed event is scheduled (e.g. Exam from 02:00 PM – 03:00 PM):
     * Prioritize exam preparation, study, and revision in morning and pre-event blocks.
     * Include freshening up and timely meals (breakfast, lunch).
     * Allocate realistic travel time before and after the exam center/venue (e.g. "Travel to exam center").
     * Keep the exam/event slot exact, high-priority, and uncompromised.
     * Schedule restorative rest, decompression, and recovery immediately following the event.
     * Schedule evening goal progress, light routine, dinner, and sufficient sleep prep.
   - If the user has work tasks:
     * Create a work-focused schedule prioritizing high-priority and urgent tasks during peak morning and early afternoon windows.
     * Include reasonable breaks (hydration, stretch), lunch, and an evening wind-down.
   - If the user has zero tasks:
     * Build an enriching, structured flow starting at Wake Time and ending at Sleep Time with morning routines, healthy habits, deep learning/focus blocks, meals, and rest.
2. Full Day Flow & Logical Bookends:
   - Begin at or near the user's wake time (${context.preferences.wake_time || '06:00'}) with a morning routine (e.g. "Wake up and morning routine").
   - Conclude at or near sleep time (${context.preferences.sleep_time || '22:00'}) with sleep prep (e.g. "Prepare for sleep").
   - Include realistic meals (Breakfast, Lunch, Dinner) and short breaks between intensive focus sessions.
3. Strict Chronology & Non-Overlapping:
   - NEVER overlap schedule entries. All time intervals must be strictly sequential (end_time of one <= start_time of next).
   - Ensure start_time and end_time are in standard 24-hour HH:MM format (e.g. "06:00", "07:00", "14:00", "15:00").
4. Truthfulness & Integrity:
   - NEVER invent fictional user tasks or claim tasks are completed.
   - NEVER move tomorrow's tasks into today's plan.
   - If a task cannot fit into the waking window, add it to 'unscheduled_tasks' with an honest reason.
5. Provide clear, descriptive, and human-friendly titles for each block (e.g. "Wake up and morning routine", "Study priority exam topics", "Freshen up", "Breakfast", "Revise exam topics", "Lunch", "Travel to exam center", "Exam", "Rest and recovery", "Work toward an active goal", "Dinner", "Prepare for sleep").
`;

  const prompt = `
Context for Date: ${context.date}
Timezone: ${context.timezone || 'UTC'}

User Preferences:
- Wake Time: ${context.preferences.wake_time || '06:00'}
- Sleep Time: ${context.preferences.sleep_time || '22:00'}
- Work Hours: ${context.preferences.work_start || '09:00'} - ${context.preferences.work_end || '17:00'}
- Focus Block: ${context.preferences.preferred_focus_minutes || 60} mins
- Break Duration: ${context.preferences.preferred_break_minutes || 15} mins

Authenticated User Tasks for ${context.date}:
${JSON.stringify(context.tasks, null, 2)}

Active Goals:
${JSON.stringify(context.goals, null, 2)}

Habits to Maintain:
${JSON.stringify(context.habits, null, 2)}

Fixed Calendar Events for ${context.date} (MUST NOT BE OVERLAPPED):
${JSON.stringify(context.events, null, 2)}

Generate the structured JSON daily plan for ${context.date}.
`;

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: scheduleResponseSchema,
        temperature: 0.2
      }
    });

    const responseText = response.text;
    if (!responseText) {
      throw new Error('Empty response received from Gemini API');
    }

    return JSON.parse(responseText);
  } catch (error) {
    // Sanitize error message to prevent leaking credentials or internal stack traces
    const errorMessage = error?.message || 'Error communicating with Gemini API';
    console.error('Gemini Service Error:', errorMessage);

    if (errorMessage.includes('API_KEY_INVALID') || errorMessage.includes('invalid api key')) {
      throw new Error('Gemini API key is invalid. Please check your GEMINI_API_KEY in backend/.env');
    }
    if (errorMessage.includes('RESOURCE_EXHAUSTED') || errorMessage.includes('429')) {
      throw new Error('Gemini API quota exceeded or rate limit reached. Please wait or check your Gemini quota.');
    }
    if (errorMessage.includes('not found') || errorMessage.includes('unsupported model')) {
      throw new Error(`The configured Gemini model (${model}) is not available or unsupported.`);
    }

    throw new Error(`Gemini scheduling failed: ${errorMessage}`);
  }
};

/**
 * Natural language task parsing with Gemini
 */
exports.parseTextWithGemini = async (text) => {
  const ai = getClient();
  if (!ai) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

  const prompt = `Extract structured task items from the following user description:\n"${text}"`;

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: parseTaskSchema,
        temperature: 0.1
      }
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error('Gemini Parse Error:', error?.message);
    throw new Error('Failed to parse text with Gemini');
  }
};
