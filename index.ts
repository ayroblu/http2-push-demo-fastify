import fastify from 'fastify';
import fs from 'fs';
import { ServerHttp2Stream } from 'http2';

import stream from 'stream';

const app = fastify({
  http2: true,
  https: {
    key: fs.readFileSync('server.key'),
    cert: fs.readFileSync('server.crt')
  }
});

app.get('/', (req, reply) => {
  const pushStream = req.raw.stream;
  if (pushStream.pushAllowed) {
    pushResponses(req.raw.stream)
  }
  reply.headers({
    'Cache-Control': 'no-cache, no-store, must-revalidate, pre-check=0, post-check=0',
  }).type('text/html; charset=utf-8').send(getHtmlStream());
});
app.get('/data.json', async (_req, reply) => {
  await wait(4_000);
  reply.send({hello: 'world'});
});

app.listen({port: 3000}).catch(console.error);

function pushResponses(stream: ServerHttp2Stream) {
  stream.pushStream({ ':path': '/data.json' }, (err, pushStream) => {
    if (err) {
      throw err
    }
    pushStream.respond({ ':status': 200, 'content-type': 'application/json' })
    pushStream.end(JSON.stringify({hello: 'new world'}))
  })
}

function getHtmlStream() {
  const readableStream = new stream.Readable();
  readableStream._read = ()=>{};

  pushHtmlStream(readableStream).catch(console.error);

  return readableStream;
}
async function pushHtmlStream(readableStream: stream.Readable) {
  readableStream.push(`<html>
<head>
<title>demo site</title>
</head>
`)
  await wait(800);
  readableStream.push(`<body>
<div>Content</div>
`)
  await wait(800);
  readableStream.push(`
<div>Content 2</div>
<script async>
fetch('/data.json').then(res => {
  if (res.ok) {
    return res.text();
  }
  throw new Error('not ok');
}).then(text => {
  const el = document.createElement('div');
  el.innerText = text
  document.body.appendChild(el);
}).catch(console.error);
</script>
`)
  await wait(800);
  readableStream.push(`
<div>Content 3</div>
</body>
</html>
`)

  readableStream.push(null);
}
function wait(numMillis: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, numMillis));
}
