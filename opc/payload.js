"use strict";
const chroma = require("chroma-js");

module.exports = (function() {
  var self = this;

  /**
   * @desc Mixing multiple Buffers containing rgb values into one outputbuffer
   * @param {Buffer[]} colorBuffersToMix Array of Buffers
   * @param {Buffer} outputBuffer Buffer to write mixed colors to
   */
  function colormixer(colorBuffersToMix, outputBuffer) {
    //TODO: remove chroma here and make it more performant by selfcalculation

    for (let i = 0; i < outputBuffer.length / 3; i++) {
      let idx = i * 3;

      let color = chroma([
        colorBuffersToMix[0][idx],
        colorBuffersToMix[0][idx + 1],
        colorBuffersToMix[0][idx + 2]
      ]);

      for (let j = 1; j < colorBuffersToMix.length; j++) {
        color = chroma.mix(
          color,
          [
            colorBuffersToMix[j][idx],
            colorBuffersToMix[j][idx + 1],
            colorBuffersToMix[j][idx + 2]
          ],
          0.5,
          "hsl"
        );
        
      }
      color = color.rgb();
      outputBuffer[idx + 0] = color[0] & 0xff;
      outputBuffer[idx + 1] = color[1] & 0xff;
      outputBuffer[idx + 2] = color[2] & 0xff;
    }

  }

  /**
   * @desc create a buffer of r,g,b,r,g,b,r,g,b ... values from different payload types
   * @param {*} payload some input valueable as a color(s)
   * @param {integer} pixel number of LEDs/Pixel
   */
  function getcolordata(payload, pixel) {
    let data = null;
    if (
      payload instanceof String ||
      typeof payload == "string" ||
      !isNaN(payload)
    ) {
      var hex = chroma(payload).hex().replace("#", "");
      data = Buffer.allocUnsafe(pixel * 3).fill(hex, "hex");
    } else if (Buffer.isBuffer(payload)) {
      if (payload.length > pixel * 3 || payload.length < pixel * 3)
        throw new Error(
          "Length of buffer mismatch. Expected a length of " + pixel * 3
        );
      data = payload;
    } else if (payload instanceof Uint8Array) {
      if (payload.length > pixel * 3 || payload.length < pixel * 3)
        throw new Error(
          "Length of Uint8Array mismatch. Expected a length of " + pixel * 3
        );
      data = Buffer.from(payload);
    } else if (payload instanceof Uint32Array) {
      if (payload.length > pixel || payload.length < pixel)
        throw new Error(
          "Length of Uint32Array mismatch. Expected a length of " + pixel
        );
      data = Buffer.allocUnsafe(pixel * 3);
      let offset = 0;
      for (let i; i < pixel; i++) {
        let v = payload[i];
        data[offset++] = (v >> 16) & 0xff; // r
        data[offset++] = (v >> 8) & 0xff; // g
        data[offset++] = v & 0xff; // b
      }
    } else if (Array.isArray(payload)) {
      if (payload.length == pixel) {
        // format an array of color values ['#rrggbb', '#rrggbb' ]
        data = Buffer.allocUnsafe(pixel * 3);
        let offset = 0;
        for (let i; i < pixel; i++) {
          let v = payload[i];
          if (v instanceof String || typeof v == "string") {
            var hex = v.replace("#", "");
            offset += data.write(hex, offset, 3, "hex");
          } else
            throw Error(
              "you need to provide an array of strings, numbers or a buffer"
            );
        }
      } else if (payload.length == pixel * 3) {
        data = Buffer.allocUnsafe(pixel * 3);
        for (let i; i < pixel * 3; i++)
          data[i] = payload[i] & 0xff;
      } else {
        // mix color here
        data = Buffer.allocUnsafe(pixel * 3);
        let colorBuffersToMix = payload.map(function(arr) {
          return getcolordata(arr, pixel);
        });
        // mix them
        colormixer(colorBuffersToMix, data);
      }
    }
    return data;
  }

  return {
    mix: colormixer,
    toBuffer: getcolordata
  };
})();
