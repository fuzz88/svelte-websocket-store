import resolve from "@rollup/plugin-node-resolve";
import dev from "rollup-plugin-dev";
import svelte from "rollup-plugin-svelte";
import WebSocket from "ws";

const basedir = "tests/app";
const port = 5000;
const wsPort = 5001;

export default {
  input: `${basedir}/src/index.mjs`,
  output: {
    sourcemap: true,
    format: "esm",
    file: `${basedir}/public/bundle.main.mjs`
  },
  plugins: [
    dev({
      port,
      dirs: [`${basedir}/public`],
      spa: `${basedir}/public/index.html`,
      basePath: `/components/svelte-websocket-store/${basedir}`,
      extend(app, modules) {
        WebSocketServer(app, modules);
      }
    }),
    resolve({ browser: true }),
    svelte()
  ]
};

function WebSocketServer(app, modules) {
  const wss = new WebSocket.Server({ port: wsPort });

  let timer;

  let n = 0;

  wss.on("connection", ws => {
    ws.on("message", message => {
      const m = message.match(/(\w+)\((\w+)\)/);
      if (m) {
        switch (m[1]) {
          case "disconnect":
            {
              wss.close();
              console.log(`close and reopen after ${parseInt(m[2])}ms`);
              setTimeout(() => WebSocketServer(app, modules), parseInt(m[2]));
            }
            break;
          case "timer": {
            if (timer) {
              clearInterval(timer);
            }

            if (m[2] === "on") {
              timer = setInterval(() => {
                n++;
                wss.clients.forEach(client => {
                  if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify(`timer ${n}`));
                  }
                });
              }, 1000);
            }
          }
        }

        return;
      }

      wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(">" + JSON.parse(message)));
        }
      });
    });

    ws.send(JSON.stringify("x"));
  });
}
