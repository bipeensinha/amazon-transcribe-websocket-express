if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}

const crypto = require('crypto');
const express = require('express');
const proxy = require('http-proxy-middleware');
const v4                = require('./lib/aws-signature-v4'); // to generate our pre-signed URL

const ACCESS_ID = process.env.ACCESS_ID;
const SECRET_KEY = process.env.SECRET_KEY;

const url = createPresignedUrl();

var wsProxy = proxy('/ws', {
    target: url,
    ws: true, // enable websocket proxy
    logLevel: 'debug',
    changeOrigin: true,
    pathRewrite: {
     '^/ws' : ''               // remove path.
    },
});

const app = express();
app.use(express.static('public'));
app.use(wsProxy); // add the proxy to express

const server = app.listen(3000);
server.on('upgrade', wsProxy.upgrade); // optional: upgrade externally

console.log('[DEMO] Server: listening on port 3000');
console.log('[DEMO] Opening: http://localhost:3000');

require('open')('http://localhost:3000');

app.get('/', function (request, response) {
    response.sendFile(__dirname + '/index.html');
});

function createPresignedUrl() {
    let region = 'us-west-2';
    let languageCode = 'en-US';
    let sampleRate = '44100'
    
    let query = "language-code=" + languageCode + "&media-encoding=pcm&sample-rate=" + sampleRate;

    let endpoint = "transcribestreaming." + region + ".amazonaws.com:8443";

    console.log(endpoint);

    // get a preauthenticated URL that we can use to establish our WebSocket
    return v4.createPresignedURL(
        'GET',
        endpoint,
        '/stream-transcription-websocket',
        'transcribe',
        crypto.createHash('sha256').update('', 'utf8').digest('hex'), {
            'key': ACCESS_ID,
            'secret': SECRET_KEY,
            'protocol': 'wss',
            'expires': 15,
            'region': region,
            'query': query
        }
    );
}