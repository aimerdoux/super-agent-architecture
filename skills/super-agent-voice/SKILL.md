---
name: super-agent-voice
description: Voice interface for Super Agent - TTS, STT, and voice calls
metadata:
  {
    "openclaw":
      {
        "emoji": "🗣️",
        "requires": { "bins": ["sag"] },
        "primaryEnv": "ELEVENLABS_API_KEY",
      },
  }
---

# Super Agent Voice Interface

Voice capabilities for the Super Agent.

## Features

- **Text-to-Speech**: Generate voice responses using ElevenLabs (sag)
- **Speech-to-Text**: Transcribe audio using OpenAI Whisper
- **Voice Calls**: Initiate and manage voice calls via OpenClaw plugin
- **Emotional Voice**: Add emotional tags to speech
- **Voice Personas**: Pre-configured voice settings

## Setup

### Text-to-Speech (TTS)
```bash
# Install sag (ElevenLabs CLI)
brew install steipete/tap/sag

# Set API key
export ELEVENLABS_API_KEY=your_key_here

# Test
sag "Hello, I am your Super Agent!"
```

### Speech-to-Text (STT)
```bash
# Install Whisper
pip install openai-whisper

# Test
whisper audio.mp3 --language en
```

### Voice Calls
Requires OpenClaw voice-call plugin:
```bash
openclaw configure --section plugins.entries.voice-call
```

## Available Voices

| Persona | Voice ID | Style |
|---------|----------|-------|
| Adam | (default) | Clear, authoritative |
| Sarah | (optional) | Warm, friendly |
| Clawd | Clawd | Futuristic, curious |
| Scientist | (custom) | Excited, dramatic |

## Emotional Tags

Add emotion to speech:
```
[excited] - Enthusiastic delivery
[whispers] - Quiet, secretive
[shouts] - Loud delivery
[laughs] - With laughter
[short pause] - Dramatic pause
[curious] - Inquisitive tone
```

## Usage

### Generate Voice Response
```
sag "[excited] Hello! I'm your Super Agent!"
```

### Voice Conversation
```bash
# Speak text
sag "How can I help you today?"

# Transcribe response
whisper response.mp3 --model base
```

### Voice Call
```bash
# Initiate call
openclaw voicecall call --to "+15555550123" --message "Hello from Super Agent"
```

## Tools

### voice_speak
Generate speech from text.

Params:
- `text` (required): Text to speak
- `voice`: Voice persona
- `emotion`: Emotional style
- `style`: Speaking style

### voice_transcribe
Transcribe audio file.

Params:
- `audioFile` (required): Path to audio
- `language`: Language code

### voice_converse
Full voice conversation.

Params:
- `text` (required): Input text
- `voice`: Voice persona
- `emotion`: Emotional style

### voice_call_*
Manage voice calls.

Actions:
- `voice_call_start`: Initiate call
- `voice_call_speak`: Speak during call
- `voice_call_end`: End call
- `voice_call_status`: Get call status

## Examples

```javascript
// Generate voice response
await voice_speak({
  text: "Hello! I'm your Super Agent.",
  voice: "Adam",
  emotion: "excited"
});

// Start voice call
await voice_call_start({
  to: "+13054965876",
  message: "Hello! This is your Super Agent calling."
});
```

## Files

- `index.js` - Main skill implementation
- Voice output: `~/.openclaw/workspace/super-agent-data/audio/`
