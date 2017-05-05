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

// If you use this as a template, update the copyright with your own name.

// Sample Node-RED node file

module.exports = function(RED) {
  "use strict";
  // require any external libraries we may need....
  //var foo = require("foo-library");
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

    // connect to server

    // disconnect from server

    // handle auto-reconnect

    // function to send data to OPC Server
  }

  RED.nodes.registerType("opc-server", OPCServerConfigNode);

  function OPCClientNode(config) {
    // Create a RED node
    RED.nodes.createNode(this, config);

    // copy "this" object in case we need it in context of callbacks of other functions.

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

        var data = null;
        if (msg.payload instanceof String || typeof msg.payload == "string" || !isNaN(msg.payload)) {
          var hex = chroma(msg.payload).hex().replace("#", "");
          data = Buffer.allocUnsafe(numleds * 3).fill(hex, "hex");
        } else if (
          Buffer.isBuffer(msg.payload) ||
          msg.payload instanceof UInt32Array
        )
          data = msg.payload;
        else if (Array.isArray(msg.payload) && msg.payload.length > 0) {
          data = Uint32Array.from(msg.payload);
        }
        // else if () number
        // if payload is an integer

        // if payload is
        /*
        Uint32Array
        Buffer
        Array
        value --> int, string (hex / rgb(...).)
        */
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
