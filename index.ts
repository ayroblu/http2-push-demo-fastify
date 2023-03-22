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
  pushResponses(req.raw.stream)
  reply.type('text/html').send(getHtmlStream());
});
app.get('/data.json', (_req, reply) => {
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

  pushHtmlStream(readableStream).catch(console.error);

  return readableStream;
}
async function pushHtmlStream(readableStream: stream.Readable) {
  readableStream.push(`<html>
<head>
<title>demo site</title>
</head>
`)
await wait(3_000);
  readableStream.push(`<body>
<div>Content</div>
`)
await wait(800);
  readableStream.push(`
<div>Content 2</div>
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
