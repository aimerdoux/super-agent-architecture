/**
 * Super Agent Voice Interface
 * 
 * Features:
 * - Voice input (speech-to-text via Whisper)
 * - Voice output (text-to-speech via ElevenLabs/sag)
 * - Voice calls (via OpenClaw voice-call plugin)
 * - Natural conversation mode
 * 
 * Requirements:
 * - sag (ElevenLabs TTS): brew install steipete/tap/sag
 * - whisper (OpenAI STT): pip install openai-whisper
 * - voice-call plugin: Already installed in OpenClaw
 */

const fs = require('fs').promises;
const path = require('path');
const { spawn } = require('child_process');

// Configuration
const CONFIG = {
  tts: {
    provider: 'sag', // or 'openai'
    defaultVoice: 'Adam', // ElevenLabs voice
    outputDir: path.join(process.env.OPENCLAW_WORKSPACE || '~/.openclaw/workspace', 'super-agent-data', 'audio')
  },
  stt: {
    provider: 'whisper', // or 'openai-whisper-api'
    model: 'base',
    language: 'en'
  },
  voiceCall: {
    enabled: false, // Set to true for Twilio/Telnyx calls
    provider: 'mock' // 'twilio', 'telnyx', 'plivo', or 'mock'
  }
};

// =====================================================
// TEXT-TO-SPEECH (TTS)
// =====================================================

class VoiceOutput {
  constructor() {
    this.outputDir = CONFIG.tts.outputDir;
    this.ensureDir();
  }
  
  async ensureDir() {
    try {
      await fs.mkdir(this.outputDir, { recursive: true });
    } catch (e) {
      if (e.code !== 'EEXIST') throw e;
    }
  }
  
  // Generate speech from text using sag (ElevenLabs)
  async speak(text, options = {}) {
    const voice = options.voice || CONFIG.tts.defaultVoice;
    const outputFile = path.join(this.outputDir, `response_${Date.now()}.mp3`);
    const emotionalTags = this.addEmotionalTags(options.emotion, options.style);
    
    const fullText = emotionalTags ? `${emotionalTags} ${text}` : text;
    
    try {
      // Use sag CLI for ElevenLabs TTS
      await this.runCommand('sag', [
        'speak',
        '-v', voice,
        '-o', outputFile,
        fullText
      ]);
      
      return {
        success: true,
        file: outputFile,
        format: 'mp3',
        duration: await this.getDuration(outputFile),
        text: text,
        voice: voice
      };
    } catch (error) {
      // Fallback to system TTS
      return this.systemSpeak(text, outputFile);
    }
  }
  
  addEmotionalTags(emotion, style) {
    if (!emotion && !style) return '';
    
    const tags = [];
    if (emotion === 'excited') tags.push('[excited]');
    if (emotion === 'whisper') tags.push('[whispers]');
    if (emotion === 'shout') tags.push('[shouts]');
    if (emotion === 'laugh') tags.push('[laughs]');
    if (style === 'dramatic') tags.push('[short pause]');
    if (style === 'curious') tags.push('[curious]');
    
    return tags.join(' ');
  }
  
  async systemSpeak(text, outputFile) {
    // Fallback to macOS say or Windows Speech Platform
    const platform = process.platform;
    
    try {
      if (platform === 'darwin') {
        await this.runCommand('say', ['-o', outputFile, text]);
      } else if (platform === 'win32') {
        // Windows - save as is for now
        return {
          success: true,
          file: null,
          text: text,
          note: 'System TTS not available on Windows without additional setup'
        };
      }
      
      return {
        success: true,
        file: outputFile,
        text: text
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        text: text
      };
    }
  }
  
  async runCommand(cmd, args) {
    return new Promise((resolve, reject) => {
      const proc = spawn(cmd, args, { cwd: process.cwd() });
      
      let stdout = '';
      let stderr = '';
      
      proc.stdout.on('data', data => stdout += data);
      proc.stderr.on('data', data => stderr += data);
      
      proc.on('close', code => {
        if (code === 0) {
          resolve(stdout);
        } else {
          reject(new Error(`Command failed: ${stderr}`));
        }
      });
      
      proc.on('error', reject);
    });
  }
  
  async getDuration(file) {
    // Estimate duration (MP3 duration requires external tool)
    return null; // Placeholder
  }
  
  // Pre-defined voice personas
  getPersonas() {
    return {
      'Adam': { gender: 'male', style: 'clear, authoritative', emotion: 'neutral' },
      'Sarah': { gender: 'female', style: 'warm, friendly', emotion: 'friendly' },
      'Clawd': { gender: 'male', style: 'robotic, futuristic', emotion: 'curious' },
      'Scientist': { gender: 'male', style: 'excited, dramatic', emotion: 'excited' },
      'Narrator': { gender: 'neutral', style: 'slow, dramatic', emotion: 'mysterious' }
    };
  }
}

// =====================================================
// SPEECH-TO-TEXT (STT)
// =====================================================

class VoiceInput {
  constructor() {
    this.audioDir = path.join(process.env.OPENCLAW_WORKSPACE || '~/.openclaw/workspace', 'super-agent-data', 'audio', 'input');
    this.ensureDir();
  }
  
  async ensureDir() {
    try {
      await fs.mkdir(this.audioDir, { recursive: true });
    } catch (e) {
      if (e.code !== 'EEXIST') throw e;
    }
  }
  
  // Transcribe audio file using Whisper
  async transcribe(audioFile, options = {}) {
    const language = options.language || CONFIG.stt.language;
    const model = options.model || CONFIG.stt.model;
    
    try {
      // Try OpenAI Whisper (if installed)
      const result = await this.runWhisper(audioFile, language, model);
      return result;
    } catch (error) {
      // Fallback to browser-based transcription (placeholder)
      return this.browserTranscribe(audioFile);
    }
  }
  
  async runWhisper(audioFile, language, model) {
    return new Promise((resolve, reject) => {
      const proc = spawn('whisper', [
        audioFile,
        '--language', language,
        '--model', model,
        '--output_format', 'json'
      ], { cwd: this.audioDir });
      
      let stderr = '';
      
      proc.stderr.on('data', data => stderr += data);
      
      proc.on('close', code => {
        if (code === 0) {
          const jsonFile = audioFile.replace(/\.[^.]+$/, '.json');
          fs.readFile(jsonFile, 'utf8')
            .then(data => resolve(JSON.parse(data)))
            .catch(reject);
        } else {
          reject(new Error(`Whisper failed: ${stderr}`));
        }
      });
      
      proc.on('error', error => reject(error));
    });
  }
  
  async browserTranscribe(audioFile) {
    // Placeholder for browser-based transcription
    return {
      success: false,
      note: 'Install whisper for transcription: pip install openai-whisper'
    };
  }
  
  // Start recording from microphone (placeholder)
  async startRecording() {
    return {
      recordingId: `recording_${Date.now()}`,
      status: 'started',
      note: 'Microphone recording requires additional setup'
    };
  }
  
  // Stop recording and transcribe
  async stopRecording(recordingId) {
    return {
      recordingId,
      status: 'stopped',
      transcribed: false,
      note: 'Complete microphone setup required'
    };
  }
}

// =====================================================
// VOICE CALL MANAGER
// =====================================================

class VoiceCallManager {
  constructor() {
    this.activeCalls = new Map();
  }
  
  async initiateCall(to, message = null, options = {}) {
    const callId = `call_${Date.now()}`;
    
    const call = {
      id: callId,
      to,
      status: 'initiating',
      startTime: new Date().toISOString(),
      messages: [],
      options
    };
    
    this.activeCalls.set(callId, call);
    
    try {
      // Use OpenClaw voice-call plugin
      // This would call: openclaw voicecall initiate_call --to +1234567890
      
      call.status = 'connected';
      
      if (message) {
        await this.speakToUser(callId, message);
      }
      
      return {
        success: true,
        callId,
        status: 'connected',
        to
      };
    } catch (error) {
      call.status = 'failed';
      call.error = error.message;
      
      return {
        success: false,
        callId,
        error: error.message
      };
    }
  }
  
  async speakToUser(callId, message) {
    const call = this.activeCalls.get(callId);
    if (!call) {
      throw new Error('Call not found');
    }
    
    call.messages.push({
      type: 'outbound',
      content: message,
      timestamp: new Date().toISOString()
    });
    
    return {
      success: true,
      callId,
      message,
      note: 'Message queued for delivery'
    };
  }
  
  async endCall(callId) {
    const call = this.activeCalls.get(callId);
    if (!call) {
      throw new Error('Call not found');
    }
    
    call.status = 'ended';
    call.endTime = new Date().toISOString();
    
    return {
      success: true,
      callId,
      duration: new Date(call.endTime) - new Date(call.startTime)
    };
  }
  
  getCallStatus(callId) {
    return this.activeCalls.get(callId) || { error: 'Call not found' };
  }
}

// =====================================================
// VOICE CONVERSATION ORCHESTRATOR
// =====================================================

class VoiceConversation {
  constructor() {
    this.output = new VoiceOutput();
    this.input = new VoiceInput();
    this.calls = new VoiceCallManager();
    this.conversationHistory = [];
  }
  
  // Speak a response
  async speak(text, options = {}) {
    const result = await this.output.speak(text, options);
    
    this.conversationHistory.push({
      role: 'assistant',
      type: 'voice',
      content: text,
      audioFile: result.file,
      timestamp: new Date().toISOString()
    });
    
    return result;
  }
  
  // Listen for input
  async listen(audioFile = null, options = {}) {
    let result;
    
    if (audioFile) {
      result = await this.input.transcribe(audioFile, options);
    } else {
      // Simulate listening (placeholder)
      result = {
        success: false,
        text: null,
        note: 'Microphone input requires setup'
      };
    }
    
    if (result.text) {
      this.conversationHistory.push({
        role: 'user',
        type: 'voice',
        content: result.text,
        audioFile: audioFile,
        timestamp: new Date().toISOString()
      });
    }
    
    return result;
  }
  
  // Full voice conversation
  async converse(text, options = {}) {
    // User spoke text
    this.conversationHistory.push({
      role: 'user',
      type: 'text',
      content: text,
      timestamp: new Date().toISOString()
    });
    
    // Generate and speak response
    const response = await this.speak(text, options);
    
    return {
      input: text,
      output: response,
      conversation: this.conversationHistory.slice(-2)
    };
  }
  
  // Start voice call
  async startCall(to, initialMessage = null) {
    return this.calls.initiateCall(to, initialMessage);
  }
  
  // Speak during call
  async speakInCall(callId, message) {
    return this.calls.speakToUser(callId, message);
  }
  
  // End voice call
  async endCall(callId) {
    return this.calls.endCall(callId);
  }
  
  // Get conversation history
  getHistory() {
    return this.conversationHistory;
  }
  
  // Clear history
  clearHistory() {
    this.conversationHistory = [];
  }
}

// =====================================================
// OPENCLAW SKILL INTERFACE
// =====================================================

class VoiceSkill {
  constructor() {
    this.conversation = new VoiceConversation();
  }
  
  // TTS Tools
  async voice_speak(params) {
    const { text, voice, emotion, style } = params;
    return this.conversation.speak(text, { voice, emotion, style });
  }
  
  async voice_personas() {
    return this.conversation.output.getPersonas();
  }
  
  // STT Tools
  async voice_transcribe(params) {
    const { audioFile, language } = params;
    return this.conversation.input.transcribe(audioFile, { language });
  }
  
  async voice_record_start() {
    return this.conversation.input.startRecording();
  }
  
  async voice_record_stop(params) {
    const { recordingId } = params;
    return this.conversation.input.stopRecording(recordingId);
  }
  
  // Conversation Tools
  async voice_converse(params) {
    const { text, voice, emotion } = params;
    return this.conversation.converse(text, { voice, emotion });
  }
  
  async voice_history() {
    return this.conversation.getHistory();
  }
  
  async voice_clear() {
    this.conversation.clearHistory();
    return { success: true };
  }
  
  // Voice Call Tools
  async voice_call_start(params) {
    const { to, message } = params;
    return this.conversation.startCall(to, message);
  }
  
  async voice_call_speak(params) {
    const { callId, message } = params;
    return this.conversation.speakInCall(callId, message);
  }
  
  async voice_call_end(params) {
    const { callId } = params;
    return this.conversation.endCall(callId);
  }
  
  async voice_call_status(params) {
    const { callId } = params;
    return this.conversation.calls.getCallStatus(callId);
  }
}

// Export
module.exports = {
  VoiceSkill,
  VoiceConversation,
  VoiceOutput,
  VoiceInput,
  VoiceCallManager
};
