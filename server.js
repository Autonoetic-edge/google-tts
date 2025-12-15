const express = require('express');
const { TextToSpeechClient } = require('@google-cloud/text-to-speech');

const app = express();
app.use(express.json({ limit: '10mb' }));

// Initialize Google TTS with credentials from env
const ttsClient = new TextToSpeechClient({
  credentials: JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON)
});

const VOICE_NAME = process.env.GOOGLE_VOICE_NAME || 'en-US-Neural2-F';

app.post('/api/synthesize', async (req, res) => {
  try {
    const { message } = req.body;
    if (!message || message.type !== 'voice-request') {
      return res.status(400).json({ error: 'Invalid request' });
    }

    const { text, sampleRate } = message;
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Missing text' });
    }

    const validRates = [8000, 16000, 22050, 24000, 44100];
    const rate = validRates.includes(sampleRate) ? sampleRate : 24000;

    const [response] = await ttsClient.synthesizeSpeech({
      input: { text: text },
      voice: { languageCode: 'en-US', name: VOICE_NAME },
      audioConfig: {
        audioEncoding: 'LINEAR16',
        sampleRateHertz: rate
      }
    });

    const audioBuffer = response.audioContent;
    if (!audioBuffer || audioBuffer.length === 0) {
      throw new Error('Empty audio from Google');
    }

    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Length', audioBuffer.length);
    res.send(audioBuffer);

  } catch (error) {
    console.error('TTS Error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'TTS failed' });
    }
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Google TTS server running on port ${PORT}`);
});