
import https from 'https';

const url = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSjptH2FTggIcQN1-878ZXnmmFA7LgRL0PH6Jz-XxCsz2QfHY3_i84DMggJ48BaIYRx3NT7lGCz0BDc/pub?output=csv";

function fetchWithRedirect(url: string) {
  https.get(url, (res) => {
    if (res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 307 || res.statusCode === 308) {
      if (res.headers.location) {
        fetchWithRedirect(res.headers.location);
        return;
      }
    }
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
      const lines = data.split('\n').slice(0, 10);
      lines.forEach((line, index) => {
        console.log(`${index + 1}: ${line}`);
      });
    });
  }).on('error', (err) => {
    console.error('Error fetching CSV:', err);
  });
}

fetchWithRedirect(url);
