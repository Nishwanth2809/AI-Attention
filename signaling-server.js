const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 3001 });

let clients = [];

wss.on('connection', ws => {
  clients.push(ws);
  ws.on('message', msg => {
    // Relay message to all other clients
    clients.forEach(client => {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(msg);
      }
    });
  });
  ws.on('close', () => {
    clients = clients.filter(c => c !== ws);
  });
});

console.log('Signaling server running on ws://localhost:3001');
