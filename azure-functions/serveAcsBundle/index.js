const fs = require('fs');
const path = require('path');

module.exports = async function (context, req) {
  const bundlePath = path.join(__dirname, 'acs-sdk-bundle.js');
  const content = fs.readFileSync(bundlePath, 'utf8');
  context.res = {
    headers: {
      'Content-Type': 'application/javascript',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=86400'
    },
    body: content
  };
};
