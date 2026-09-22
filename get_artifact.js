const https = require('https');
https.get('https://api.github.com/repos/Trilok310/trustpointfin/actions/runs/35491836458/artifacts', { headers: { 'User-Agent': 'Node.js', 'Accept': 'application/vnd.github.v3+json' } }, res => {
  let data = '';
  res.on('data', c => data+=c);
  res.on('end', () => console.log(JSON.parse(data).artifacts.map(a => ({name: a.name, url: a.archive_download_url}))));
});
