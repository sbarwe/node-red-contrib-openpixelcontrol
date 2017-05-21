/**
 * Copyright Sebastian Barwe (sebastian.barwe@gmail.com)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 **/

module.exports = function(RED) {
  "use strict";
  const OpcClientStream = require("openpixelcontrol-stream").OpcClientStream,
    net = require("net"),
    chroma = require("chroma-js");

  function OPCServerConfigNode(config) {
    RED.nodes.createNode(this, config);

    (this.numleds = config.numleds), (this.host = config.server);
    this.port = config.port;

    this.connected = false;
    this.connecting = false;
    this.closing = false;
    this.idle = false;
    this.configusers = {};

    this.opcclient = new OpcClientStream();
    this.socket = null;
    var node = this;

    // connect to openpixelcontrol-server
    this.connect = function() {
      if (!node.connected && !node.connecting) {
        node.connecting = true;
        node.idle = false;
        for (var id in node.configusers) {
          if (node.configusers.hasOwnProperty(id)) {
            node.configusers[id].status({
              fill: "yellow",
              shape: "ring",
              text: "node-red:common.status.connecting"
            });
          }
        }
        node.socket = net.createConnection(node.port, node.host);
        // timeout is called when connection is idle (longer time no traffic)
        node.socket.on("timeout", function() {
          node.idle = true;
          for (var id in node.configusers) {
            if (node.configusers.hasOwnProperty(id)) {
              node.configusers[id].status({
                fill: "green",
                shape: "ring",
                text: "node-red:common.status.connected"
              });
            }
          }
        });

        node.socket.on("connect", function() {
          node.connecting = false;
          node.connected = true;

          node.socket.setTimeout(1000);
          node.opcclient.pipe(node.socket);
          node.log(
            RED._("opc.state.connected", {
              opcserver: node.host + ":" + node.port
            })
          );
          for (var id in node.configusers) {
            if (node.configusers.hasOwnProperty(id)) {
              node.configusers[id].status({
                fill: "green",
                shape: "dot",
                text: "node-red:common.status.connected"
              });
            }
          }
        });

        node.socket.on("close", function() {
          if (node.connected) {
            node.connected = false;
            node.opcclient.unpipe(node.socket);
            node.log(
              RED._("opc.state.disconnected", {
                opcserver: node.host + ":" + node.port
              })
            );
          } else if (node.connecting) {
            node.log(
              RED._("opc.state.connect-failed", {
                opcserver: node.host + ":" + node.port
              })
            );
            node.connecting = false;
          }
          for (var id in node.configusers) {
            if (node.configusers.hasOwnProperty(id)) {
              node.configusers[id].status({
                fill: "red",
                shape: "ring",
                text: "node-red:common.status.disconnected"
              });
            }
          }
        });

        // Register connect error handler
        node.socket.on("error", function(error) {
          if (node.connecting) {
            node.socket.destroy();
            node.connected = false;
          }
        });
      }
    };

    this.disconnect = function() {
      if (node.socket) {
        node.socket.unref();
        node.socket.destroy();
        node.socket = null;
      }
    };

    this.register = function(configuserNode) {
      node.configusers[configuserNode.id] = configuserNode;
      if (Object.keys(node.configusers).length === 1) {
        node.connect();
      }
    };

    this.deregister = function(configuserNode, done) {
      delete node.configusers[configuserNode.id];
      if (node.closing) {
        return done();
      }
      if (Object.keys(node.configusers).length === 0) {
        if (node.client && node.client.connected) {
          return node.client.end(done);
        } else {
          node.client.end();
          return done();
        }
      }
      done();
    };

    this.callopc = function(command, channel, data, systemId = 0) {
      if (node.connecting) return;
      if (node.connected == false) {
        node.connect();
        return;
      }
      if (command == 0) node.opcclient.setPixelColors(channel, data);
      else if (command == 255) node.opcclient.sysex(channel, systemId, data);
      else node.log("Command not supported", command);

      if (node.idle) {
        node.idle = false;
        for (var id in node.configusers) {
          if (node.configusers.hasOwnProperty(id)) {
            node.configusers[id].status({
              fill: "green",
              shape: "dot",
              text: "node-red:common.status.connected"
            });
          }
        }
      }
    };
  }

  RED.nodes.registerType("opc-server", OPCServerConfigNode);

  function colormixer(colorBuffersToMix, outputBuffer) {
    function rgb2cmyk(r, g, b) {
      // convert to CMYK
      let c = 255 - r; // cyan
      let m = 255 - g; // magenta
      let y = 255 - b; // yellow
      let k = Math.min(c, m, y); // black
      c = (c - k) / (255 - k);
      m = (m - k) / (255 - k);
      y = (y - k) / (255 - k);
      return [c, m, y, k];
    }

    let acc = new Array(outputBuffer.length / 3);

    for (let i = 0; i < acc.length; i++) {
      let idx = i * 3;
      acc[i] = [0, 0, 0, 0]; // accumulated cmyk
      for (let j = 0; j < colorBuffersToMix.length; j++) {
        var rgbarray = colorBuffersToMix[j];
        var cmyk = rgb2cmyk(
          rgbarray[idx + 0],
          rgbarray[idx + 1],
          rgbarray[idx + 2]
        );
        for (let o = 0; o < 4; o++)
          acc[i][o] += cmyk[o];
      }
      for (let o = 0; o < 4; o++)
        acc[i][o] /= colorBuffersToMix.length;
      let c = acc[i][0];
      let m = acc[i][1];
      let y = acc[i][2];
      let k = acc[i][3];
      let r = Math.round((1.0 - (c * (1.0 - k) + k)) * 255.0 + 0.5);
      let g = Math.round((1.0 - (m * (1.0 - k) + k)) * 255.0 + 0.5);
      let b = Math.round((1.0 - (y * (1.0 - k) + k)) * 255.0 + 0.5);
      outputBuffer[idx + 0] = r;
      outputBuffer[idx + 1] = g;
      outputBuffer[idx + 2] = b;
    }
  }

  // create a buffer of r,g,b,r,g,b,r,g,b ... values from different payload types.
  function getcolordata(payload, numleds) {
    let data = null;
    if (
      payload instanceof String ||
      typeof payload == "string" ||
      !isNaN(payload)
    ) {
      var hex = chroma(payload).hex().replace("#", "");
      data = Buffer.allocUnsafe(numleds * 3).fill(hex, "hex");
    } else if (Buffer.isBuffer(payload)) {
      if (payload.length > numleds * 3 || payload.length < numleds * 3)
        throw new Error(
          "Length of buffer mismatch. Expected a length of " + numleds * 3
        );
      data = payload;
    } else if (payload instanceof UInt8Array) {
      if (payload.length > numleds * 3 || payload.length < numleds * 3)
        throw new Error(
          "Length of UInt8Array mismatch. Expected a length of " + numleds * 3
        );
      data = Buffer.from(payload);
    } else if (payload instanceof UInt32Array) {
      if (payload.length > numleds || payload.length < numleds)
        throw new Error(
          "Length of Uint32Array mismatch. Expected a length of " + numleds
        );
      data = Buffer.allocUnsafe(numleds * 3);
      let offset = 0;
      for (let i; i < numleds; i++) {
        let v = payload[i];
        data[offset++] = (v >> 16) & 0xff; // r
        data[offset++] = (v >> 8) & 0xff; // g
        data[offset++] = v & 0xff; // b
      }
    } else if (Array.isArray(payload)) {
      if (payload.length == numleds) {
        // format an array of color values ['#rrggbb', '#rrggbb' ]
        data = Buffer.allocUnsafe(numleds * 3);
        let offset = 0;
        for (let i; i < numleds; i++) {
          let v = payload[i];
          if (v instanceof String || typeof v == "string") {
            var hex = v.replace("#", "");
            offset += data.write(hex, offset, 3, "hex");
          } else
            throw Error(
              "you need to provide an array of strings, numbers or a buffer"
            );
        }
      } else if (payload.length == numleds * 3) {
        data = Buffer.allocUnsafe(numleds * 3);
        for (let i; i < numleds * 3; i++)
          data[i] = payload[i] & 0xff;
      } else {
        // mix color here
        data = Buffer.allocUnsafe(numleds * 3);
        let colorBuffersToMix = payload.map(function(arr) {
          return getcolordata(arr, numleds);
        });
        // mix them
        colormixer(colorBuffersToMix, data);
      }
    }
    return data;
  }

  function OPCClientNode(config) {
    // Create a RED node
    RED.nodes.createNode(this, config);

    this.command = config.command;
    this.channel = config.channel;
    this.opcserver = config.opcserver;
    this.opcserverConnection = RED.nodes.getNode(this.opcserver);
    var node = this;

    // setup OPC stream client handling
    if (node.opcserverConnection) {
      node.opcserverConnection.register(this);
      // respond to inputs....
      this.on("input", function(msg) {
        var command = parseInt(msg.command ? msg.command : node.command, 10);
        var channel = parseInt(msg.channel ? msg.channel : node.channel, 10);
        var systemid = msg.systemid || 0;
        var numleds = node.opcserverConnection.numleds;

        var data = getcolordata(msg.payload, numleds);

        if (data != null)
          node.opcserverConnection.callopc(command, channel, data, systemid);
      });
    }

    this.on("close", function(done) {
      if (node.opcserverConnection) {
        node.opcserverConnection.disconnect();
        node.opcserverConnection.deregister(done);
      }
    });
  }

  // Register the node by name. This must be called before overriding any of the
  // Node functions.
  RED.nodes.registerType("opc-client", OPCClientNode);
};
