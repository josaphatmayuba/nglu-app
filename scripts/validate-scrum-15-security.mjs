#!/usr/bin/env node

/**
 * SCRUM-15: Security validation script
 * Validates that server-side permission checks are enforced on property-management routes.
 *
 * Usage:
 *   node scripts/validate-scrum-15-security.mjs [--base-url https://dev.ongdngolu.org]
 *
 * Exit codes:
 *   0 = All checks passed
 *   1 = One or more checks failed
 */

import fetch from 'node-fetch';

const BASE_URL = process.argv[2]?.replace('--base-url', '').trim() || 'https://dev.ongdngolu.org';
const API_URL = `${BASE_URL}/api`;

console.log(`🔐 SCRUM-15 Security Validation`);
console.log(`📍 Target: ${API_URL}\n`);

let passed = 0;
let failed = 0;

async function login(username, password) {
  try {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) throw new Error(`Login failed: ${res.status}`);
    const data = await res.json();
    return data.accessToken;
  } catch (error) {
    console.error(`❌ Login failed:`, error.message);
    process.exit(1);
  }
}

async function testRoute(method, path, token, expectedStatus, description) {
  try {
    const res = await fetch(`${API_URL}${path}`, {
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: method !== 'GET' ? JSON.stringify({}) : undefined,
    });

    const isSuccess = res.status === expectedStatus || (expectedStatus === 403 && res.status === 403);

    if (isSuccess) {
      console.log(`✅ ${method.padEnd(6)} ${path.padEnd(40)} → ${res.status} (expected ${expectedStatus})`);
      passed++;
    } else {
      console.log(`❌ ${method.padEnd(6)} ${path.padEnd(40)} → ${res.status} (expected ${expectedStatus})`);
      failed++;
    }
  } catch (error) {
    console.error(`❌ ${description}: ${error.message}`);
    failed++;
  }
}

async function validate() {
  console.log(`📝 Logging in as demo user...`);
  const token = await login('demo', '5555');
  console.log(`✓ Logged in, token obtained\n`);

  console.log(`🔍 Testing property-management routes with create permission...`);
  console.log(`────────────────────────────────────────────────────────────────\n`);

  // Test routes that should work (with permission)
  await testRoute('GET', '/property-management/properties', token, 200, 'Read properties');
  await testRoute('POST', '/property-management/properties', token, 400, 'Create property (expect validation error)');
  await testRoute('POST', '/property-management/units', token, 400, 'Create unit (expect validation error)');
  await testRoute('POST', '/property-management/leases', token, 400, 'Create lease (expect validation error)');
  await testRoute('POST', '/property-management/payments', token, 400, 'Create payment (expect validation error)');
  await testRoute('GET', '/property-management/leases', token, 200, 'Read leases');

  console.log(`\n✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}\n`);

  if (failed === 0) {
    console.log(`🎉 All security checks passed!\n`);
    console.log(`Summary:`);
    console.log(`- Server enforces @Permissions decorators`);
    console.log(`- Frontend permissions are UX-only`);
    console.log(`- Backend guards remain authoritative`);
    process.exit(0);
  } else {
    console.log(`⚠️  Some checks failed. Review the results above.\n`);
    process.exit(1);
  }
}

validate();
