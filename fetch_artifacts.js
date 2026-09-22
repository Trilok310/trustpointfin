const https = require('https');
const fs = require('fs');

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Node.js', 'Accept': 'application/vnd.github.v3+json' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

async function run() {
  try {
    const runs = await fetchJson('https://api.github.com/repos/Trilok310/trustpointfin/actions/runs?status=failure&per_page=5');
    for (const runObj of runs.workflow_runs) {
      console.log('Run ID:', runObj.id, 'Created At:', runObj.created_at);
      const artifacts = await fetchJson(`https://api.github.com/repos/Trilok310/trustpointfin/actions/runs/${runObj.id}/artifacts`);
      if (artifacts.artifacts && artifacts.artifacts.length > 0) {
        for (const a of artifacts.artifacts) {
          console.log('  - Artifact:', a.name, 'URL:', a.archive_download_url);
        }
      } else {
        console.log('  - No artifacts');
      }
    }
  } catch (e) {
    console.error(e);
  }
}
run();
