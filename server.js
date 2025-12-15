const express = require('express');
const { TextToSpeechClient } = require('@google-cloud/text-to-speech');

const app = express();
app.use(express.json({ limit: '10mb' }));

// Initialize Google TTS
const ttsClient = new TextToSpeechClient({
  credentials: JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON)
});

app.post('/api/synthesize', async (req, res) => {
  try {
    const { message } = req.body;
    if (!message || message.type !== 'voice-request') {
      return res.status(400).json({ error: 'Invalid request' });
    }

    const { text, sampleRate } = message;
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return res.status(400).json({ error: 'Invalid or missing text' });
    }

    // Validate sample rate (Vapi sends 8k, 16k, 24k, etc.)
    const validRates = [8000, 16000, 22050, 24000, 44100];
    const rate = validRates.includes(sampleRate) ? sampleRate : 24000;

    // Synthesize Thai voice
    const [response] = await ttsClient.synthesizeSpeech({
      input: { text: text.trim() },
      voice: {
        languageCode: 'th-TH',
        name: 'th-TH-Neural2-C'  // ← Human-like Thai female voice
      },
      audioConfig: {
        audioEncoding: 'LINEAR16', // raw 16-bit PCM
        sampleRateHertz: rate
      }
    });

    const audioBuffer = response.audioContent;
    if (!audioBuffer || audioBuffer.length === 0) {
      throw new Error('Empty audio from Google TTS');
    }

    // Send raw PCM to Vapi
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Length', audioBuffer.length);
    res.send(audioBuffer);

  } catch (error) {
    console.error('TTS Error:', error.message);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Thai TTS failed' });
    }
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Thai TTS server running on port ${PORT}`);
});
