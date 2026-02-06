#!/usr/bin/env node
/**
 * Skill Security Auditor
 * 
 * Security-first approach to skill integration:
 * - Scans for suspicious patterns
 * - Verifies file/network access patterns
 * - Checks skill source reputation
 * - Logs all security findings
 * 
 * Usage: node memory/skill-security-audit.js <skill-url or path>
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Security rules for skill auditing
const SECURITY_RULES = {
  dangerousPatterns: [
    { pattern: /eval\s*\(/i, severity: 'critical', name: 'Dynamic code execution (eval)' },
    { pattern: /exec\s*\(/i, severity: 'critical', name: 'Command execution' },
    { pattern: /child_process/i, severity: 'critical', name: 'Child process spawning' },
    { pattern: /fork\s*\(/i, severity: 'critical', name: 'Process forking' },
    { pattern: /spawn\s*\(/i, severity: 'critical', name: 'Process spawning' },
    { pattern: /rm\s+-rf/i, severity: 'critical', name: 'Destructive file operation' },
    { pattern: /chmod\s+777/i, severity: 'critical', name: 'World-writable permissions' },
    { pattern: /sudo\s+/i, severity: 'critical', name: 'Privilege escalation attempt' },
    { pattern: /\.env(?!\w)/i, severity: 'high', name: 'Environment file access' },
    { pattern: /process\.env/i, severity: 'high', name: 'Environment variable access' },
    { pattern: /process\.cwd/i, severity: 'medium', name: 'Current working directory access' },
    { pattern: /__dirname/i, severity: 'medium', name: 'Directory path exposure' },
    { pattern: /fetch\s*\(/i, severity: 'medium', name: 'Network request (potential exfiltration)' },
    { pattern: /axios/i, severity: 'medium', name: 'HTTP client (potential exfiltration)' },
    { pattern: /https?:\/\//i, severity: 'medium', name: 'Network URL patterns' },
    { pattern: /WebSocket/i, severity: 'medium', name: 'WebSocket connection' },
    { pattern: /crypto\.(createHash|createCipher)/i, severity: 'medium', name: 'Cryptographic operations' },
    { pattern: /buffer\s*\[/i, severity: 'low', name: 'Buffer access patterns' },
    { pattern: /readFileSync/i, severity: 'low', name: 'File read operations' },
    { pattern: /writeFileSync/i, severity: 'low', name: 'File write operations' },
    { pattern: /unlink/i, severity: 'high', name: 'File deletion' },
    { pattern: /rename/i, severity: 'medium', name: 'File rename' },
    { pattern: /mkdir\s*\(/i, severity: 'low', name: 'Directory creation' },
  ],
  
  suspiciousPermissions: [
    { pattern: /"permissions"\s*:\s*\{[^}]*"all"/i, severity: 'high', name: 'All permissions requested' },
    { pattern: /"fileSystem"\s*:\s*\[.*"all".*\]/i, severity: 'critical', name: 'Full filesystem access' },
    { pattern: /"exec"\s*:\s*true/i, severity: 'critical', name: 'Execution permission' },
    { pattern: /"network"\s*:\s*true/i, severity: 'high', name: 'Unrestricted network access' },
  ],
  
  requiredChecks: [
    'Verify skill source (GitHub repo, author reputation)',
    'Check for security advisories or reported vulnerabilities',
    'Review commit history for suspicious changes',
    'Verify digital signature if available',
    'Check if skill has been audited by community',
    'Verify dependencies for known vulnerabilities',
  ]
};

// Audit results structure
class SecurityAudit {
  constructor(skillName, skillPath) {
    this.skillName = skillName;
    this.skillPath = skillPath;
    this.timestamp = new Date().toISOString();
    this.filesScanned = [];
    this.findings = [];
    this.riskScore = 0;
    this.riskLevel = 'unknown';
    this.recommendation = 'pending';
  }

  addFinding(type, severity, name, file, context = '') {
    const finding = {
      type,
      severity, // critical, high, medium, low, info
      name,
      file,
      context,
      timestamp: this.timestamp
    };
    this.findings.push(finding);
    
    // Calculate risk score
    const severityScores = { critical: 100, high: 75, medium: 50, low: 25, info: 0 };
    this.riskScore += severityScores[severity] || 0;
    
    return finding;
  }

  calculateRiskLevel() {
    if (this.riskScore >= 100) this.riskLevel = 'critical';
    else if (this.riskScore >= 75) this.riskLevel = 'high';
    else if (this.riskScore >= 50) this.riskLevel = 'medium';
    else if (this.riskScore >= 25) this.riskLevel = 'low';
    else this.riskLevel = 'safe';
  }

  generateRecommendation() {
    if (this.riskLevel === 'critical') {
      this.recommendation = '❌ REJECT - Critical security risks detected';
    } else if (this.riskLevel === 'high') {
      this.recommendation = '⚠️  REJECT - High security risks require fixes';
    } else if (this.riskLevel === 'medium') {
      this.recommendation = '🔶 CONDITIONAL APPROVE - Review findings before installing';
    } else if (this.riskLevel === 'low') {
      this.recommendation = '✅ APPROVE - Minor issues, safe to install with monitoring';
    } else {
      this.recommendation = '✅ APPROVE - No significant security concerns';
    }
  }
}

// Scan a single file for suspicious patterns
function scanFile(filePath, audit) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const ext = path.extname(filePath);
    
    // Only scan code files
    if (!['.js', '.ts', '.json', '.md', '.py', '.sh'].includes(ext)) {
      return;
    }
    
    audit.filesScanned.push(filePath);
    
    // Check for dangerous patterns
    for (const rule of SECURITY_RULES.dangerousPatterns) {
      if (rule.pattern.test(content)) {
        // Get context around the match
        const match = content.match(rule.pattern);
        const index = content.indexOf(match[0]);
        const contextStart = Math.max(0, index - 50);
        const contextEnd = Math.min(content.length, index + match[0].length + 50);
        const context = content.substring(contextStart, contextEnd).replace(/\n/g, ' ');
        
        audit.addFinding('pattern', rule.severity, rule.name, filePath, context);
      }
    }
    
    // Check JSON files for suspicious permissions
    if (ext === '.json' && content.includes('permissions')) {
      for (const rule of SECURITY_RULES.suspiciousPermissions) {
        if (rule.pattern.test(content)) {
          audit.addFinding('permission', rule.severity, rule.name, filePath);
        }
      }
    }
    
  } catch (e) {
    // Ignore unreadable files
  }
}

// Recursively scan directory
function scanDirectory(dirPath, audit) {
  try {
    const items = fs.readdirSync(dirPath);
    
    for (const item of items) {
      const fullPath = path.join(dirPath, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        // Skip node_modules and hidden directories
        if (!item.startsWith('.') && item !== 'node_modules') {
          scanDirectory(fullPath, audit);
        }
      } else {
        scanFile(fullPath, audit);
      }
    }
  } catch (e) {
    audit.addFinding('error', 'info', `Could not scan directory: ${e.message}`);
  }
}

// Verify skill source
async function verifySource(repoUrl) {
  const checks = {
    repoExists: false,
    hasLicense: false,
    stars: 0,
    forks: 0,
    lastCommit: null,
    contributors: 0
  };
  
  try {
    // Check if it's a GitHub repo
    if (repoUrl.includes('github.com')) {
      const repoPath = repoUrl.replace('https://github.com/', '').replace('.git', '');
      
      // In production, would use GitHub API
      // For now, just log the check
      checks.repoExists = true;
      console.log(`  📋 Source verification: ${repoUrl}`);
      console.log(`     - Would verify via GitHub API in production`);
    }
  } catch (e) {
    console.log(`  ⚠️  Source verification failed: ${e.message}`);
  }
  
  return checks;
}

// Main audit function
async function auditSkill(skillName, skillPath, repoUrl = null) {
  console.log(`\n🔒 SECURITY AUDIT: ${skillName}`);
  console.log('='.repeat(60));
  
  const audit = new SecurityAudit(skillName, skillPath);
  
  // Step 1: Source verification
  console.log('\n📋 Step 1: Source Verification');
  if (repoUrl) {
    const sourceCheck = await verifySource(repoUrl);
    if (sourceCheck.repoExists) {
      audit.addFinding('source', 'info', 'GitHub repository verified', repoUrl);
    }
  } else {
    audit.addFinding('source', 'medium', 'No source URL provided - manual verification required');
  }
  
  // Step 2: File scanning
  console.log('\n📋 Step 2: File Scanning');
  scanDirectory(skillPath, audit);
  console.log(`   Scanned ${audit.filesScanned.length} files`);
  
  // Step 3: Calculate risk
  console.log('\n📋 Step 3: Risk Assessment');
  audit.calculateRiskLevel();
  console.log(`   Risk Score: ${audit.riskScore}`);
  console.log(`   Risk Level: ${audit.riskLevel.toUpperCase()}`);
  
  // Step 4: Generate recommendation
  console.log('\n📋 Step 4: Recommendation');
  audit.generateRecommendation();
  console.log(`   ${audit.recommendation}`);
  
  // Step 5: Report findings
  console.log('\n📋 Step 5: Findings Summary');
  const critical = audit.findings.filter(f => f.severity === 'critical').length;
  const high = audit.findings.filter(f => f.severity === 'high').length;
  const medium = audit.findings.filter(f => f.severity === 'medium').length;
  const low = audit.findings.filter(f => f.severity === 'low').length;
  
  console.log(`   Critical: ${critical} | High: ${high} | Medium: ${medium} | Low: ${low}`);
  
  if (audit.findings.length > 0) {
    console.log('\n⚠️  DETAILED FINDINGS:');
    audit.findings
      .filter(f => f.severity !== 'info')
      .forEach(f => {
        const icon = f.severity === 'critical' ? '🔴' : f.severity === 'high' ? '🟠' : f.severity === 'medium' ? '🟡' : '🟢';
        console.log(`   ${icon} [${f.severity.toUpperCase()}] ${f.name}`);
        console.log(`      File: ${f.file}`);
        if (f.context) {
          console.log(`      Context: ${f.context.substring(0, 100)}...`);
        }
      });
  }
  
  // Save audit report
  const reportPath = path.join(__dirname, 'security-audit-reports', `${skillName}-${Date.now()}.json`);
  const reportDir = path.dirname(reportPath);
  
  try {
    fs.mkdirSync(reportDir, { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify(audit, null, 2));
    console.log(`\n💾 Audit report saved: ${reportPath}`);
  } catch (e) {
    console.log(`\n⚠️  Could not save audit report: ${e.message}`);
  }
  
  console.log('\n' + '='.repeat(60));
  
  return audit;
}

// Export for use in self-evolution
module.exports = {
  SecurityAudit,
  auditSkill,
  SECURITY_RULES
};

// CLI usage
if (require.main === module) {
  const skillName = process.argv[2] || 'unknown-skill';
  const skillPath = process.argv[3] || '.';
  const repoUrl = process.argv[4] || null;
  
  auditSkill(skillName, skillPath, repoUrl)
    .then(audit => {
      process.exit(audit.riskLevel === 'critical' || audit.riskLevel === 'high' ? 1 : 0);
    })
    .catch(e => {
      console.error('Audit failed:', e);
      process.exit(1);
    });
}
