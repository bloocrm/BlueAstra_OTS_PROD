/* =====================================================
   TRANSCRIPTION SERVICE
   Downloads a meeting recording, extracts low-bitrate mono audio with
   ffmpeg (chunking if needed to stay under Whisper's 25MB limit), and
   transcribes it with OpenAI Whisper.
   ===================================================== */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const OPENAI_URL = 'https://api.openai.com/v1/audio/transcriptions';
const MAX_BYTES = 24 * 1024 * 1024; // stay just under Whisper's 25MB cap

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args);
    let err = '';
    p.stderr.on('data', d => { err += d.toString(); });
    p.on('error', reject);
    p.on('close', code => code === 0 ? resolve() : reject(new Error(`${cmd} failed: ${err.slice(-400)}`)));
  });
}

async function downloadTo(url, dest) {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error('Recording download failed: ' + resp.status);
  fs.writeFileSync(dest, Buffer.from(await resp.arrayBuffer()));
  return dest;
}

async function whisper(filePath) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error('OPENAI_API_KEY not configured');
  const form = new FormData();
  form.append('file', new Blob([fs.readFileSync(filePath)]), path.basename(filePath));
  form.append('model', process.env.WHISPER_MODEL || 'whisper-1');
  form.append('response_format', 'text');
  const resp = await fetch(OPENAI_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}` },
    body: form
  });
  if (!resp.ok) throw new Error('Whisper error ' + resp.status + ': ' + (await resp.text()).slice(0, 300));
  return (await resp.text()).trim();
}

// Transcribe a local media file (audio or video): extract mono audio, chunk if
// large, run Whisper. Captures every speaker present in the file.
async function transcribeFile(inputPath) {
  const tmp = os.tmpdir();
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const audio = path.join(tmp, `aud-${id}.mp3`);
  const cleanup = [audio];
  try {
    await run('ffmpeg', ['-y', '-i', inputPath, '-ac', '1', '-ar', '16000', '-b:a', '48k', audio]);

    if (fs.statSync(audio).size <= MAX_BYTES) {
      return await whisper(audio);
    }

    // Long recording — split into 20-minute chunks and transcribe each
    const pattern = path.join(tmp, `chunk-${id}-%03d.mp3`);
    await run('ffmpeg', ['-y', '-i', audio, '-f', 'segment', '-segment_time', '1200', '-c', 'copy', pattern]);
    const chunks = fs.readdirSync(tmp).filter(f => f.startsWith(`chunk-${id}-`)).sort();
    let out = '';
    for (const c of chunks) {
      const cp = path.join(tmp, c);
      cleanup.push(cp);
      out += (out ? '\n' : '') + await whisper(cp);
    }
    return out;
  } finally {
    cleanup.forEach(f => { try { fs.unlinkSync(f); } catch (_) {} });
  }
}

// Download a recording URL and transcribe it
async function transcribeUrl(url) {
  const tmp = os.tmpdir();
  const input = path.join(tmp, `rec-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`);
  try {
    await downloadTo(url, input);
    return await transcribeFile(input);
  } finally {
    try { fs.unlinkSync(input); } catch (_) {}
  }
}

module.exports = { transcribeUrl, transcribeFile, whisper };
