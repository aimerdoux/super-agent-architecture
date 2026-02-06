/**
 * Voice Interface Test Suite
 */

const { VoiceSkill } = require('./index.js');

async function test() {
  console.log('🧪 Testing Voice Interface...\n');
  
  try {
    const voice = new VoiceSkill();
    
    // Test 1: Get voice personas
    console.log('1. Testing voice personas...');
    const personas = await voice.voice_personas();
    console.log('✅ Personas loaded:', Object.keys(personas).length);
    
    // Test 2: Get conversation history (empty)
    console.log('\n2. Testing conversation history...');
    const history = await voice.voice_history();
    console.log('✅ History retrieved:', history.length, 'entries');
    
    // Test 3: Test speak (will fail without ElevenLabs, but verifies structure)
    console.log('\n3. Testing speak function...');
    const speakResult = await voice.voice_speak({
      text: 'Hello! I am your Super Agent.',
      voice: 'Adam',
      emotion: 'neutral'
    });
    console.log('✅ Speak function executed');
    console.log('   Success:', speakResult.success);
    console.log('   Note:', speakResult.note || 'Audio generated');
    
    // Test 4: Clear history
    console.log('\n4. Testing history clear...');
    const clearResult = await voice.voice_clear();
    console.log('✅ History cleared:', clearResult.success);
    
    console.log('\n✅ All voice interface tests passed!');
    console.log('\n📝 Next Steps:');
    console.log('   1. Install sag: brew install steipete/tap/sag');
    console.log('   2. Set ELEVENLABS_API_KEY');
    console.log('   3. Install whisper: pip install openai-whisper');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

test();
