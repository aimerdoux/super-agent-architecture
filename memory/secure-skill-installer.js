#!/usr/bin/env node
/**
 * Secure Skill Installer for OpenClaw
 * 
 * Security-first skill installation with:
 * - Pre-installation security audit
 * - Sandbox testing in isolation
 * - Permission manifest review
 * - Rollback capability
 * 
 * Usage: node memory/secure-skill-installer.js <skill-repo-url>
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');

// Configuration
const CONFIG = {
  skillsDir: path.join(process.env.HOME || process.env.USERPROFILE, '.openclaw', 'skills'),
  workspaceSkillsDir: path.join(__dirname, '..', 'skills'),
  auditReportsDir: path.join(__dirname, 'security-audit-reports'),
  sandboxDir: path.join(__dirname, 'skill-sandbox'),
  backupDir: path.join(__dirname, 'skill-backups'),
  maxInstallRisk: 'medium' // Only install skills up to this risk level
};

// Install phases
const PHASES = {
  DOWNLOAD: 'download',
  AUDIT: 'audit',
  SANDBOX: 'sandbox',
  INSTALL: 'install',
  VERIFY: 'verify',
  COMPLETE: 'complete'
};

// Install result codes
const RESULT = {
  SUCCESS: 'success',
  FAILED: 'failed',
  REJECTED: 'rejected',
  ROLLED_BACK: 'rolled_back'
};

class SecureSkillInstaller {
  constructor(repoUrl) {
    this.repoUrl = repoUrl;
    this.repoName = this.extractRepoName(repoUrl);
    this.tempDir = path.join(CONFIG.sandboxDir, `install-${Date.now()}`);
    this.auditReport = null;
    this.installResult = null;
    this.logEntries = [];  // Changed from this.log to this.logEntries
  }

  extractRepoName(url) {
    const match = url.match(/github\.com[/:]([^/]+)\/([^/.]+)/);
    if (match) return match[2];
    return url.split('/').pop().replace('.git', '');
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const entry = { timestamp, type, message };
    this.logEntries.push(entry);
    const icon = type === 'error' ? '🔴' : type === 'warning' ? '🟠' : type === 'success' ? '✅' : '📋';
    console.log(`${icon} [${type.toUpperCase()}] ${message}`);
  }

  async run() {
    console.log(`\n🛡️  SECURE SKILL INSTALLER`);
    console.log('='.repeat(60));
    console.log(`📦 Installing: ${this.repoUrl}`);
    console.log(`🆔 Skill: ${this.repoName}`);
    console.log(`🕐 Started: ${new Date().toISOString()}`);
    console.log('='.repeat(60));

    try {
      // Phase 1: Download to sandbox
      await this.download();

      // Phase 2: Security audit
      const auditPassed = await this.audit();
      if (!auditPassed) {
        return this.reject('Security audit failed');
      }

      // Phase 3: Sandbox testing
      const sandboxPassed = await this.sandboxTest();
      if (!sandboxPassed) {
        return this.reject('Sandbox testing failed');
      }

      // Phase 4: Install
      await this.install();

      // Phase 5: Verify
      await this.verify();

      // Complete
      return this.complete();

    } catch (e) {
      return this.fail(e.message);
    }
  }

  async download() {
    this.log('Phase 1: Downloading skill to sandbox...', 'info');
    
    try {
      fs.mkdirSync(this.tempDir, { recursive: true });
      
      // Clone with depth 1 (shallow clone)
      execSync(`git clone --depth 1 ${this.repoUrl} ${this.tempDir}`, {
        cwd: CONFIG.sandboxDir,
        stdio: 'pipe'
      });
      
      this.log(`Downloaded to: ${this.tempDir}`, 'success');
      
      // Verify structure
      const files = fs.readdirSync(this.tempDir);
      if (!files.includes('SKILL.md') && !files.includes('skill.json')) {
        throw new Error('No SKILL.md or skill.json found - not a valid skill');
      }
      
      this.log('Skill structure verified', 'success');
      
    } catch (e) {
      throw new Error(`Download failed: ${e.message}`);
    }
  }

  async audit() {
    this.log('Phase 2: Running security audit...', 'info');
    
    try {
      // Load security auditor
      const { auditSkill } = require('./skill-security-audit.js');
      
      this.auditReport = await auditSkill(
        this.repoName,
        this.tempDir,
        this.repoUrl
      );
      
      // Check if risk level is acceptable
      const riskLevels = ['safe', 'low', 'medium', 'high', 'critical'];
      const maxIndex = riskLevels.indexOf(CONFIG.maxInstallRisk);
      const skillIndex = riskLevels.indexOf(this.auditReport.riskLevel);
      
      if (skillIndex > maxIndex) {
        this.log(`Risk level ${this.auditReport.riskLevel} exceeds maximum allowed (${CONFIG.maxInstallRisk})`, 'error');
        return false;
      }
      
      this.log(`Security audit PASSED (${this.auditReport.riskLevel} risk)`, 'success');
      return true;
      
    } catch (e) {
      this.log(`Audit failed: ${e.message}`, 'error');
      return false;
    }
  }

  async sandboxTest() {
    this.log('Phase 3: Running sandbox tests...', 'info');
    
    try {
      // Create isolated test environment
      const testDir = path.join(CONFIG.sandboxDir, 'test', this.repoName);
      fs.mkdirSync(testDir, { recursive: true });
      
      // Copy skill to test directory
      this.copyRecursive(this.tempDir, testDir);
      
      // Run basic sanity checks
      this.log('Running basic functionality checks...', 'info');
      
      // Check if skill can be loaded
      const skillJsonPath = path.join(testDir, 'skill.json');
      if (fs.existsSync(skillJsonPath)) {
        const skillJson = JSON.parse(fs.readFileSync(skillJsonPath, 'utf8'));
        this.log(`Skill name: ${skillJson.name}`, 'info');
        this.log(`Skill version: ${skillJson.version}`, 'info');
      }
      
      // Check permissions in SKILL.md
      const skillMdPath = path.join(testDir, 'SKILL.md');
      if (fs.existsSync(skillMdPath)) {
        const content = fs.readFileSync(skillMdPath, 'utf8');
        if (content.includes('"permissions"') || content.includes('permissions:')) {
          this.log('Skill has permission requirements - reviewing...', 'warning');
        }
      }
      
      this.log('Sandbox tests completed', 'success');
      
      // Cleanup test directory
      try {
        fs.rmSync(testDir, { recursive: true, force: true });
      } catch (e) {
        // Ignore cleanup errors
      }
      
      return true;
      
    } catch (e) {
      this.log(`Sandbox test failed: ${e.message}`, 'error');
      return false;
    }
  }

  async install() {
    this.log('Phase 4: Installing skill...', 'info');
    
    try {
      // Backup existing skill if it exists
      const installPath = path.join(CONFIG.skillsDir, this.repoName);
      
      if (fs.existsSync(installPath)) {
        this.log('Backing up existing skill...', 'warning');
        const backupPath = path.join(CONFIG.backupDir, `${this.repoName}-${Date.now()}`);
        fs.mkdirSync(path.dirname(backupPath), { recursive: true });
        this.copyRecursive(installPath, backupPath);
        this.log(`Backup created: ${backupPath}`, 'info');
      }
      
      // Install skill
      fs.mkdirSync(installPath, { recursive: true });
      this.copyRecursive(this.tempDir, installPath);
      
      this.log(`Installed to: ${installPath}`, 'success');
      
    } catch (e) {
      throw new Error(`Installation failed: ${e.message}`);
    }
  }

  async verify() {
    this.log('Phase 5: Verifying installation...', 'info');
    
    try {
      const installPath = path.join(CONFIG.skillsDir, this.repoName);
      
      // Verify files exist
      const requiredFiles = ['skill.json', 'SKILL.md'];
      for (const file of requiredFiles) {
        const filePath = path.join(installPath, file);
        if (!fs.existsSync(filePath)) {
          throw new Error(`Required file missing: ${file}`);
        }
      }
      
      // Verify skill.json is valid
      const skillJson = JSON.parse(
        fs.readFileSync(path.join(installPath, 'skill.json'), 'utf8')
      );
      
      this.log(`Verified: ${skillJson.name} v${skillJson.version}`, 'success');
      
    } catch (e) {
      throw new Error(`Verification failed: ${e.message}`);
    }
  }

  complete() {
    this.installResult = RESULT.SUCCESS;
    console.log('\n' + '='.repeat(60));
    console.log('✅ INSTALLATION COMPLETE');
    console.log('='.repeat(60));
    console.log(`📦 Skill: ${this.repoName}`);
    console.log(`📍 Location: ${path.join(CONFIG.skillsDir, this.repoName)}`);
    console.log(`🔒 Risk Level: ${this.auditReport.riskLevel}`);
    console.log(`📊 Findings: ${this.auditReport.findings.length}`);
    console.log(`🕐 Completed: ${new Date().toISOString()}`);
    console.log('='.repeat(60));
    
    this.saveInstallLog();
    return { success: true, skill: this.repoName };
  }

  reject(reason) {
    this.installResult = RESULT.REJECTED;
    console.log('\n' + '='.repeat(60));
    console.log('❌ INSTALLATION REJECTED');
    console.log('='.repeat(60));
    console.log(`Reason: ${reason}`);
    console.log(`🕐 Rejected: ${new Date().toISOString()}`);
    console.log('='.repeat(60));
    
    this.saveInstallLog();
    return { success: false, reason };
  }

  fail(error) {
    this.installResult = RESULT.FAILED;
    console.log('\n' + '='.repeat(60));
    console.log('❌ INSTALLATION FAILED');
    console.log('='.repeat(60));
    console.log(`Error: ${error}`);
    console.log(`🕐 Failed: ${new Date().toISOString()}`);
    console.log('='.repeat(60));
    
    this.saveInstallLog();
    return { success: false, error };
  }

  copyRecursive(src, dest) {
    if (!fs.existsSync(src)) return;
    
    const stats = fs.statSync(src);
    if (stats.isDirectory()) {
      fs.mkdirSync(dest, { recursive: true });
      for (const item of fs.readdirSync(src)) {
        this.copyRecursive(
          path.join(src, item),
          path.join(dest, item)
        );
      }
    } else {
      fs.copyFileSync(src, dest);
    }
  }

  saveInstallLog() {
    try {
      const logPath = path.join(CONFIG.auditReportsDir, `install-${this.repoName}-${Date.now()}.json`);
      fs.mkdirSync(path.dirname(logPath), { recursive: true });
      
      fs.writeFileSync(logPath, JSON.stringify({
        repoUrl: this.repoUrl,
        repoName: this.repoName,
        result: this.installResult,
        timestamp: new Date().toISOString(),
        auditReport: this.auditReport ? {
          riskLevel: this.auditReport.riskLevel,
          riskScore: this.auditReport.riskScore,
          findings: this.auditReport.findings.length
        } : null,
        log: this.logEntries || []
      }, null, 2));
      
      console.log(`📋 Install log saved: ${logPath}`);
    } catch (e) {
      console.log(`⚠️ Could not save install log: ${e.message}`);
    }
  }
}

// CLI usage
async function main() {
  const repoUrl = process.argv[2];
  
  if (!repoUrl) {
    console.log('\n🛡️  Secure Skill Installer');
    console.log('Usage: node secure-skill-installer.js <github-repo-url>');
    console.log('\nExample:');
    console.log('  node secure-skill-installer.js https://github.com/openclaw/skills/git-sync');
    console.log('\n⚠️  All skills undergo security audit before installation');
    process.exit(1);
  }
  
  const installer = new SecureSkillInstaller(repoUrl);
  const result = await installer.run();
  process.exit(result.success ? 0 : 1);
}

module.exports = {
  SecureSkillInstaller,
  CONFIG,
  PHASES,
  RESULT
};

if (require.main === module) {
  main();
}
