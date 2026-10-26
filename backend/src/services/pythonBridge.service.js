/**
 * Python Bridge Service for AI LifeOS Hybrid Planner.
 * Connects Node.js Express to the Python Hybrid Scheduling Engine.
 * 
 * Supports:
 * 1. HTTP connection to FastAPI microservice (http://127.0.0.1:8000/api/schedule/generate)
 * 2. Automatic zero-downtime child_process execution (python python_service/cli.py) via stdin/stdout
 */
const axios = require('axios');
const { spawn } = require('child_process');
const path = require('path');

const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || 'http://127.0.0.1:8000';

/**
 * Execute Python scheduling engine via Child Process (stdin/stdout)
 */
function runPythonSchedulerViaProcess(payload) {
  return new Promise((resolve, reject) => {
    const pythonScript = path.resolve(__dirname, '../../python_service/cli.py');
    const pythonExe = process.platform === 'win32' ? 'python' : 'python3';

    const pyProcess = spawn(pythonExe, [pythonScript], {
      cwd: path.resolve(__dirname, '../..'),
      env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
    });

    let stdoutData = '';
    let stderrData = '';

    pyProcess.stdout.on('data', (data) => {
      stdoutData += data.toString('utf-8');
    });

    pyProcess.stderr.on('data', (data) => {
      stderrData += data.toString('utf-8');
    });

    pyProcess.on('close', (code) => {
      if (code !== 0 && !stdoutData.trim()) {
        return reject(new Error(`Python scheduler exited with code ${code}: ${stderrData || 'Unknown error'}`));
      }

      try {
        const raw = stdoutData.trim();
        const jsonStart = raw.indexOf('{');
        const jsonEnd = raw.lastIndexOf('}');
        const jsonStr = (jsonStart !== -1 && jsonEnd !== -1) ? raw.substring(jsonStart, jsonEnd + 1) : raw;
        const parsed = JSON.parse(jsonStr);
        if (parsed.success === false) {
          return reject(new Error(parsed.error || 'Python scheduler error'));
        }
        resolve(parsed);
      } catch (err) {
        reject(new Error(`Failed to parse Python scheduler output: ${err.message}. Raw output: ${stdoutData}`));
      }
    });

    pyProcess.on('error', (err) => {
      reject(new Error(`Failed to spawn Python process: ${err.message}`));
    });

    // Send payload via stdin
    pyProcess.stdin.write(JSON.stringify(payload));
    pyProcess.stdin.end();
  });
}

/**
 * Call Python Scheduling Engine:
 * First attempts FastAPI HTTP endpoint; automatically falls back to process execution.
 */
exports.generateScheduleWithPython = async (context) => {
  // 1. Try FastAPI microservice endpoint if available
  try {
    const response = await axios.post(`${PYTHON_SERVICE_URL}/api/schedule/generate`, context, {
      timeout: 6000,
      headers: { 'Content-Type': 'application/json' }
    });

    if (response.data && response.data.success) {
      return response.data;
    }
  } catch (httpError) {
    // If HTTP connection refused or timed out, seamlessly fall back to child process
    // console.log('FastAPI HTTP unavailable, using child process execution:', httpError.message);
  }

  // 2. Direct Child Process execution
  return await runPythonSchedulerViaProcess(context);
};
