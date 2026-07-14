import B2 from 'backblaze-b2';

const b2 = new B2({
  applicationKeyId: process.env.B2_KEY_ID,
  applicationKey: process.env.B2_APP_KEY
});

const BUCKET_ID = process.env.B2_BUCKET_ID;
const FILE_NAME = process.env.B2_FILE_NAME || 'matches.json';

const DEFAULT_STATE = { players: {}, matches: [] };

async function authorize() {
  await b2.authorize();
}

async function getLatestFileVersion() {
  const list = await b2.listFileNames({
    bucketId: BUCKET_ID,
    maxFileCount: 100,
    prefix: FILE_NAME
  });

  const exact = (list?.data?.files || []).find((f) => f.fileName === FILE_NAME);
  return exact || null;
}

async function streamToString(stream) {
  if (!stream) return '';

  if (typeof stream === 'string') return stream;
  if (Buffer.isBuffer(stream)) return stream.toString('utf8');

  return await new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    stream.on('error', reject);
  });
}

async function readState() {
  await authorize();
  const file = await getLatestFileVersion();
  if (!file) return DEFAULT_STATE;

  const dl = await b2.downloadFileById({ fileId: file.fileId, responseType: 'stream' });
  const raw = await streamToString(dl?.data);

  if (!raw) return DEFAULT_STATE;

  try {
    const parsed = JSON.parse(raw);
    return {
      players: parsed?.players && typeof parsed.players === 'object' ? parsed.players : {},
      matches: Array.isArray(parsed?.matches) ? parsed.matches : []
    };
  } catch {
    return DEFAULT_STATE;
  }
}

function validatePayload(body) {
  if (!body || typeof body !== 'object') return false;
  if (!('players' in body) || !('matches' in body)) return false;
  if (typeof body.players !== 'object' || body.players === null) return false;
  if (!Array.isArray(body.matches)) return false;
  return true;
}

async function writeState(nextState) {
  await authorize();

  const uploadUrlResp = await b2.getUploadUrl({ bucketId: BUCKET_ID });
  const uploadUrl = uploadUrlResp?.data?.uploadUrl;
  const uploadAuthToken = uploadUrlResp?.data?.authorizationToken;

  const payload = Buffer.from(JSON.stringify(nextState), 'utf8');

  await b2.uploadFile({
    uploadUrl,
    uploadAuthToken,
    fileName: FILE_NAME,
    data: payload,
    mime: 'application/json'
  });
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (!BUCKET_ID || !process.env.B2_KEY_ID || !process.env.B2_APP_KEY) {
    return res.status(500).json({ error: 'Missing Backblaze configuration' });
  }

  try {
    if (req.method === 'GET') {
      const state = await readState();
      return res.status(200).json(state);
    }

    if (req.method === 'POST') {
      const body = req.body;

      if (!validatePayload(body)) {
        return res.status(400).json({ error: 'Invalid payload. Expected { players: object, matches: array }' });
      }

      await writeState(body);
      return res.status(200).json({ ok: true });
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Storage API error:', error);
    return res.status(500).json({ error: 'Storage operation failed' });
  }
}
