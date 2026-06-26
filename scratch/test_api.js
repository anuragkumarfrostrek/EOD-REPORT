const http = require('http');

const API_URL = 'http://localhost:5000/api';

const request = (method, path, body = null, token = null) => {
  return new Promise((resolve, reject) => {
    const url = new URL(API_URL + path);
    const options = {
      method: method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode >= 400) {
            reject({ status: res.statusCode, error: parsed.error || parsed });
          } else {
            resolve(parsed);
          }
        } catch (e) {
          if (res.statusCode >= 400) {
            reject({ status: res.statusCode, error: data });
          } else {
            resolve(data);
          }
        }
      });
    });

    req.on('error', (err) => reject(err));

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
};

const runTest = async () => {
  console.log('🏁 Starting Integration Test...');
  const email = `test_multi_${Date.now()}@eod.com`;
  const password = 'TestPassword123';
  
  try {
    // 1. Register
    console.log(`\n1. Registering user: ${email}...`);
    const regRes = await request('POST', '/auth/register', {
      name: 'Multi Project User',
      email,
      password,
    });
    const token = regRes.token;
    console.log('✅ User registered successfully. Token received.');

    // 2. Add Projects
    console.log('\n2. Creating projects...');
    const proj1 = await request('POST', '/projects', { name: 'VettEdge' }, token);
    const proj2 = await request('POST', '/projects', { name: 'Acme API' }, token);
    console.log(`✅ Projects created: VettEdge (ID: ${proj1.project.id}), Acme API (ID: ${proj2.project.id})`);

    // 3. Create Multi-Project Report
    console.log('\n3. Creating EOD report with multiple projects...');
    const reportDate = new Date().toISOString().split('T')[0];
    const payload = {
      report_date: reportDate,
      sections: [
        {
          project_id: proj1.project.id,
          done_tasks: [
            { description: 'Implemented login flow', start_time: '09:00', end_time: '11:00' }
          ],
          in_progress_tasks: [] // Should fallback to '• None'
        },
        {
          project_id: proj2.project.id,
          done_tasks: [
            { description: 'Integrated stripe webhook', start_time: '11:00', end_time: '14:00' }
          ],
          in_progress_tasks: [
            { description: 'Refactoring checkout component', progress_status: '50% complete' }
          ]
        }
      ],
      blockers: [] // Should fallback to '• None'
    };

    const createRes = await request('POST', '/reports', payload, token);
    const reportId = createRes.report.id;
    console.log(`✅ Report created successfully with ID: ${reportId}`);

    // 4. Fetch the created report
    console.log('\n4. Fetching EOD report details...');
    const getRes = await request('GET', `/reports/${reportId}`, null, token);
    console.log('✅ Report fetched. Sections count:', getRes.report.sections.length);
    console.log('Done tasks count:', getRes.report.done_tasks.length);
    console.log('In progress tasks count:', getRes.report.in_progress_tasks.length);
    console.log('Project names aggregate (top-level):', getRes.report.project_name);

    // 5. Generate plaintext report text
    console.log('\n5. Generating plaintext Slack-formatted report text...');
    const textRes = await request('GET', `/reports/${reportId}/text`, null, token);
    console.log('---- GENERATED EOD REPORT FORMAT ----');
    console.log(textRes.text);
    console.log('------------------------------------');

    // 6. Update Report
    console.log('\n6. Updating EOD report...');
    const updatePayload = {
      report_date: reportDate,
      sections: [
        {
          project_id: proj1.project.id,
          done_tasks: [
            { description: 'Implemented login flow and updated middleware', start_time: '09:00', end_time: '12:00' }
          ],
          in_progress_tasks: []
        },
        {
          project_id: proj2.project.id,
          done_tasks: [
            { description: 'Integrated stripe webhook', start_time: '12:00', end_time: '14:00' }
          ],
          in_progress_tasks: [
            { description: 'Refactoring checkout component', progress_status: '80% complete' }
          ]
        }
      ],
      blockers: [
        { description: 'Blocked by Acme API keys' }
      ]
    };

    const updateRes = await request('PUT', `/reports/${reportId}`, updatePayload, token);
    console.log('✅ Report updated successfully.');

    // 7. Generate updated plaintext report text
    console.log('\n7. Fetching updated Slack-formatted report...');
    const updatedTextRes = await request('GET', `/reports/${reportId}/text`, null, token);
    console.log('---- UPDATED GENERATED EOD REPORT FORMAT ----');
    console.log(updatedTextRes.text);
    console.log('-------------------------------------------');

    // 8. List reports filter check
    console.log('\n8. Testing report search and filter list...');
    const listRes = await request('GET', '/reports', null, token);
    console.log(`✅ Reports list has ${listRes.reports.length} report(s).`);
    console.log('Report project name in list:', listRes.reports[0].project_name);

    console.log('\n🎉 ALL TESTS PASSED SUCCESSFULLY! ✅');
  } catch (err) {
    console.error('\n❌ Test failed:', err);
    process.exit(1);
  }
};

runTest();
