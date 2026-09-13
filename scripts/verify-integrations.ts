import {
  validateServerEnv,
  validateClientEnv,
  getSanitizedConfigReport,
  sanitizeDatabaseUrl,
  sanitizeRedisUrl,
} from '@cdsprep/config';

async function main() {
  try {
    process.loadEnvFile?.('.env');
  } catch {
    // If .env file does not exist, use process.env as-is
  }

  console.log('\n================================================================');
  console.log('    CDSPrep External Services & Production Configuration Verifier');
  console.log('================================================================\n');

  let hasErrors = false;

  // 1. Client Environment Leakage Check
  console.log('🔍 [1/3] Checking for Secret Leakage in Client Bundles...');
  try {
    const clientEnv = validateClientEnv(process.env);
    console.log('   ✅ Client environment URLs verified:');
    console.log(`      • NEXT_PUBLIC_APP_URL: ${clientEnv.NEXT_PUBLIC_APP_URL}`);
    console.log(`      • NEXT_PUBLIC_API_URL: ${clientEnv.NEXT_PUBLIC_API_URL}`);
  } catch (err: any) {
    console.error('   ❌ CRITICAL CLIENT ENVIRONMENT ERROR:\n', err.message);
    hasErrors = true;
  }

  // 2. Server Environment Schema Validation
  console.log('\n🔍 [2/3] Validating Server Environment Schema & Secrets Entropy...');
  let serverEnv: any = null;
  try {
    serverEnv = validateServerEnv(process.env);
    console.log('   ✅ Server environment conforms to strict production schema.');
    console.log(`      • Node Environment: ${serverEnv.NODE_ENV}`);
    console.log(`      • API Port: ${serverEnv.PORT}`);
    console.log(`      • Database URL: ${sanitizeDatabaseUrl(serverEnv.DATABASE_URL)}`);
    console.log(`      • Redis URL: ${sanitizeRedisUrl(serverEnv.REDIS_URL)}`);
    console.log(`      • CORS Origins: ${serverEnv.CORS_ORIGIN}`);
  } catch (err: any) {
    console.error('   ❌ SERVER ENVIRONMENT VALIDATION FAILED:\n', err.message);
    hasErrors = true;
  }

  // 3. Sanitized Integration Status Report
  console.log('\n🔍 [3/3] Generating Sanitized Provider Matrix (Zero Secret Exposure)...');
  if (serverEnv) {
    const report = getSanitizedConfigReport(serverEnv);

    console.log('\n┌────────────────────────────────┬────────────────┬────────────────┬───────────────────────────┐');
    console.log('│ Service                        │ Provider       │ Status         │ Safe Operational Details  │');
    console.log('├────────────────────────────────┼────────────────┼────────────────┼───────────────────────────┤');

    for (const item of report) {
      const service = item.service.padEnd(30, ' ');
      const provider = item.provider.padEnd(14, ' ');
      let status = item.status;
      if (status === 'CONFIGURED') status = '✅ CONFIGURED ';
      else if (status === 'MOCK_MODE') status = '⚠️ MOCK_MODE  ';
      else if (status === 'DISABLED') status = '⚪ DISABLED   ';
      else status = '❌ MISSING    ';

      const detailsStr = item.details
        ? Object.entries(item.details)
            .map(([k, v]) => `${k}=${v}`)
            .join(', ')
            .slice(0, 25)
            .padEnd(25, ' ')
        : ''.padEnd(25, ' ');

      console.log(`│ ${service} │ ${provider} │ ${status} │ ${detailsStr} │`);
    }
    console.log('└────────────────────────────────┴────────────────┴────────────────┴───────────────────────────┘\n');

    // Missing critical required services check
    const missingCritical = report.filter(
      (r) =>
        (r.service === 'PostgreSQL Database' || r.service === 'Redis Cache & Queues') &&
        r.status === 'MISSING_CONFIG',
    );

    if (missingCritical.length > 0) {
      console.error('❌ Critical persistent services are unconfigured:');
      for (const mc of missingCritical) {
        console.error(`   • ${mc.service} is missing configuration.`);
      }
      hasErrors = true;
    }
  }

  if (hasErrors) {
    console.error('💥 Integration verification completed with ERRORS.');
    console.error('👉 Refer to docs/api-keys-setup.md to provision required service credentials.\n');
    process.exit(1);
  } else {
    console.log('✨ All external integrations and configuration checks PASSED successfully!\n');
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('Fatal verification runner error:', err);
  process.exit(1);
});
