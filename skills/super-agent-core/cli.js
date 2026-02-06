#!/usr/bin/env node

/**
 * Super Agent CLI - Standalone interface for testing and direct usage
 */

const { getAgent } = require('./index.js');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function main() {
  console.log('');
  console.log('='.repeat(60));
  console.log('  SUPER AGENT - Local OpenClaw Skill v2.0.0');
  console.log('='.repeat(60));
  console.log('');

  const agent = await getAgent();
  const status = await agent.status();

  console.log('Capabilities:', status.capabilities.join(', '));
  console.log('Skills:', status.skills.length > 0 ? status.skills.join(', ') : 'None yet');
  console.log('Tasks:', `${status.tasks.queued} queued, ${status.tasks.running} running`);
  console.log('');
  console.log('Commands:');
  console.log('  /status     - Show agent status');
  console.log('  /memory     - Show recent memories');
  console.log('  /store <text> - Store a memory');
  console.log('  /recall <query> - Recall memories');
  console.log('  /task <desc> - Create a task');
  console.log('  /tasks      - Show task queue');
  console.log('  /evolve     - Trigger evolution analysis');
  console.log('  /skills     - List acquired skills');
  console.log('  /tools      - List available tools');
  console.log('  /quit       - Exit');
  console.log('');
  console.log('Or just type a message to chat!');
  console.log('');

  let conversationId = null;

  const prompt = () => {
    rl.question('You> ', async (input) => {
      if (!input.trim()) {
        prompt();
        return;
      }

      const trimmed = input.trim();

      try {
        if (trimmed === '/quit' || trimmed === '/exit') {
          console.log('Goodbye!');
          rl.close();
          process.exit(0);
        }

        if (trimmed === '/status') {
          const s = await agent.status();
          console.log('\nAgent Status:');
          console.log(JSON.stringify(s, null, 2));
          console.log('');
        } else if (trimmed === '/memory' || trimmed === '/memories') {
          const memories = await agent.memory.recall('', { limit: 5 });
          console.log('\nRecent Memories:');
          memories.forEach((m, i) => {
            console.log(`  ${i + 1}. [${m.tier}] ${m.content.slice(0, 80)}...`);
          });
          console.log('');
        } else if (trimmed.startsWith('/store ')) {
          const content = trimmed.slice(7);
          const result = await agent.memory.store(content);
          console.log(`\nStored in ${result.tier}: ${result.id}\n`);
        } else if (trimmed.startsWith('/recall ')) {
          const query = trimmed.slice(8);
          const memories = await agent.memory.recall(query, { limit: 5 });
          console.log(`\nFound ${memories.length} memories:`);
          memories.forEach((m, i) => {
            console.log(`  ${i + 1}. [${m.tier}] (${(m.relevance * 100).toFixed(0)}% match) ${m.content.slice(0, 80)}...`);
          });
          console.log('');
        } else if (trimmed.startsWith('/task ')) {
          const desc = trimmed.slice(6);
          const task = await agent.tasks.create(desc);
          console.log(`\nCreated task ${task.id}: ${task.description}\n`);
        } else if (trimmed === '/tasks') {
          const queue = agent.tasks.getQueue();
          const running = agent.tasks.getRunning();
          console.log(`\nTask Queue (${queue.length} pending, ${running.length} running):`);
          queue.forEach(t => console.log(`  - [pending] ${t.description}`));
          running.forEach(t => console.log(`  - [running] ${t.description}`));
          console.log('');
        } else if (trimmed === '/evolve') {
          const evolution = await agent.evolve();
          console.log('\nEvolution Analysis:');
          console.log('  Improvements:', evolution.improvements.join(', ') || 'None needed');
          console.log('  Recommendations:', evolution.recommendations.join(', ') || 'None');
          console.log('  Metrics:', JSON.stringify(evolution.metrics, null, 2));
          console.log('');
        } else if (trimmed === '/skills') {
          const skills = await agent.evolution.getSkills();
          console.log('\nAcquired Skills:');
          Object.values(skills).forEach(s => {
            console.log(`  - ${s.name} (${s.proficiency}): ${s.description || 'No description'}`);
          });
          console.log('');
        } else if (trimmed === '/tools') {
          const tools = agent.tools.list();
          console.log('\nAvailable Tools:');
          tools.forEach(t => console.log(`  - ${t}`));
          console.log('');
        } else {
          // Regular chat
          const response = await agent.chat(trimmed, { conversationId });
          conversationId = response.conversationId;
          console.log(`\n[Agent] Conversation: ${conversationId}`);
          console.log(`        Memories used: ${response.memoriesUsed}`);
          console.log(`        Response time: ${response.responseTimeMs}ms`);
          console.log('');
        }
      } catch (error) {
        console.error('Error:', error.message);
      }

      prompt();
    });
  };

  prompt();
}

main().catch(console.error);
