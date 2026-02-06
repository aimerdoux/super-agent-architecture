// Super Agent Core - Test Suite
const { SuperAgent, getAgent } = require('./index.js');

async function test() {
  console.log('🧪 Testing Super Agent Core...\n');
  
  try {
    // Test 1: Initialize
    const agent = await getAgent();
    console.log('✅ Initialized:', agent.initialized);
    
    // Test 2: Status
    const status = await agent.status();
    console.log('\n📊 Agent Status:', JSON.stringify(status, null, 2));
    
    // Test 3: Memory
    const memory = await agent.memory.store('Test memory from comprehensive analysis', { 
      tier: 'working', 
      importance: 0.8,
      category: 'test'
    });
    console.log('\n💾 Memory stored:', memory.id);
    
    // Test 4: Recall
    const recalled = await agent.memory.recall('Test');
    console.log('💭 Memory recalled:', recalled.length);
    
    // Test 5: Task
    const task = await agent.tasks.create('Comprehensive analysis task', { 
      priority: 8,
      type: 'analysis'
    });
    console.log('📋 Task created:', task.id);
    
    // Test 6: Skills
    const skills = await agent.evolution.getSkills();
    console.log('🛠️ Skills registered:', Object.keys(skills).length);
    
    // Test 7: Tool listing
    const tools = agent.tools.list();
    console.log('🔧 Tools available:', tools.length);
    
    // Test 8: Evolution
    const evolution = await agent.evolve();
    console.log('\n📈 Evolution Analysis:', JSON.stringify(evolution, null, 2));
    
    console.log('\n✅ All core tests passed!');
    console.log('\n🎯 Ready for proactive operation!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

test();
