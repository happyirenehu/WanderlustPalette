import { File } from 'expo-file-system';
import { GLView } from 'expo-gl';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet } from 'react-native';

import { extractPhotoColors } from '../utils/photoColorExtractor';

const MAX_DIMENSION = 64;
const MAX_RGBA_BYTES = MAX_DIMENSION * MAX_DIMENSION * 4;

function validDimension(value) {
  return Number.isFinite(value) && Number.isInteger(value) && value > 0;
}

function validateImage(value) {
  if (!value || typeof value.uri !== 'string' || !value.uri.startsWith('file://')) {
    throw new Error('Photo extraction requires a local file.');
  }
  if (!validDimension(value.width) || !validDimension(value.height)) {
    throw new Error('Photo extraction requires valid image dimensions.');
  }
}

function analysisSize(width, height) {
  const scale = Math.min(1, MAX_DIMENSION / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

function compileShader(gl, type, source) {
  const shader = gl.createShader(type);
  if (!shader) throw new Error('GL shader creation failed.');
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const message = gl.getShaderInfoLog(shader) || 'unknown shader error';
    gl.deleteShader(shader);
    throw new Error(message);
  }
  return shader;
}

function cleanupGl(resources) {
  const { gl } = resources;
  if (!gl) return;
  try {
    if (resources.framebuffer) gl.deleteFramebuffer(resources.framebuffer);
    if (resources.readbackTexture) gl.deleteTexture(resources.readbackTexture);
    if (resources.sourceTexture) gl.deleteTexture(resources.sourceTexture);
    if (resources.buffer) gl.deleteBuffer(resources.buffer);
    if (resources.program) gl.deleteProgram(resources.program);
    if (resources.vertexShader) gl.deleteShader(resources.vertexShader);
    if (resources.fragmentShader) gl.deleteShader(resources.fragmentShader);
  } catch {
    // GLView may already have released its context.
  }
}

function assertNoGlError(gl, operation) {
  const error = gl.getError();
  if (error !== gl.NO_ERROR) {
    throw new Error(`${operation} failed with GL error 0x${error.toString(16)}.`);
  }
}

export default function PhotoPaletteExtractor({ request, onComplete }) {
  const [analysis, setAnalysis] = useState(null);
  const completedRef = useRef(false);
  const analysisUriRef = useRef('');
  const glResourcesRef = useRef({});

  const complete = (result) => {
    if (completedRef.current) return;
    completedRef.current = true;
    onComplete(result);
  };

  useEffect(() => {
    let active = true;
    completedRef.current = false;
    setAnalysis(null);

    const prepareAnalysis = async () => {
      let context;
      let renderedImage;
      try {
        validateImage(request);
        const durableFile = new File(request.uri);
        if (!durableFile.exists || durableFile.size <= 0) {
          throw new Error('The staged Journey photo is unavailable.');
        }

        const target = analysisSize(request.width, request.height);
        context = ImageManipulator.manipulate(request.uri);
        if (target.width !== request.width || target.height !== request.height) {
          context.resize(target);
        }
        renderedImage = await context.renderAsync();
        const result = await renderedImage.saveAsync({ format: SaveFormat.JPEG, compress: 1 });
        if (
          !active
          || typeof result.uri !== 'string'
          || !result.uri.startsWith('file://')
          || !validDimension(result.width)
          || !validDimension(result.height)
          || result.width > MAX_DIMENSION
          || result.height > MAX_DIMENSION
        ) {
          if (result?.uri?.startsWith('file://')) {
            const unusedFile = new File(result.uri);
            if (unusedFile.exists) unusedFile.delete();
          }
          if (active) throw new Error('Image analysis did not produce a safe bounded JPEG.');
          return;
        }

        analysisUriRef.current = result.uri;
        setAnalysis({ uri: result.uri, width: result.width, height: result.height });
      } catch (error) {
        if (active) complete({ ok: false, colors: [], error: error instanceof Error ? error.message : String(error) });
      } finally {
        renderedImage?.release?.();
        context?.release?.();
      }
    };

    prepareAnalysis();
    return () => {
      active = false;
      cleanupGl(glResourcesRef.current);
      glResourcesRef.current = {};
      if (analysisUriRef.current) {
        try {
          const analysisFile = new File(analysisUriRef.current);
          if (analysisFile.exists) analysisFile.delete();
        } catch {
          // Cache cleanup is best-effort.
        }
        analysisUriRef.current = '';
      }
    };
  }, [request.id, request.uri, request.width, request.height]);

  const handleContextCreate = (gl) => {
    const resources = { gl };
    glResourcesRef.current = resources;

    try {
      validateImage(analysis);
      if (analysis.width > MAX_DIMENSION || analysis.height > MAX_DIMENSION) {
        throw new Error('Analysis dimensions exceed the safety bound.');
      }

      const vertexShader = compileShader(gl, gl.VERTEX_SHADER, `
        attribute vec2 aPosition;
        attribute vec2 aTexCoord;
        varying vec2 vTexCoord;
        void main() {
          gl_Position = vec4(aPosition, 0.0, 1.0);
          vTexCoord = aTexCoord;
        }
      `);
      const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, `
        precision mediump float;
        varying vec2 vTexCoord;
        uniform sampler2D uTexture;
        void main() {
          gl_FragColor = texture2D(uTexture, vTexCoord);
        }
      `);
      resources.vertexShader = vertexShader;
      resources.fragmentShader = fragmentShader;

      const program = gl.createProgram();
      if (!program) throw new Error('GL program creation failed.');
      resources.program = program;
      gl.attachShader(program, vertexShader);
      gl.attachShader(program, fragmentShader);
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        throw new Error(gl.getProgramInfoLog(program) || 'GL program link failed.');
      }
      gl.useProgram(program);

      const buffer = gl.createBuffer();
      if (!buffer) throw new Error('GL buffer creation failed.');
      resources.buffer = buffer;
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        -1, -1, 0, 0,
         1, -1, 1, 0,
        -1,  1, 0, 1,
         1,  1, 1, 1,
      ]), gl.STATIC_DRAW);

      const position = gl.getAttribLocation(program, 'aPosition');
      const texCoord = gl.getAttribLocation(program, 'aTexCoord');
      const sampler = gl.getUniformLocation(program, 'uTexture');
      if (position < 0 || texCoord < 0 || sampler === null) {
        throw new Error('GL shader inputs are unavailable.');
      }
      const stride = 4 * Float32Array.BYTES_PER_ELEMENT;
      gl.enableVertexAttribArray(position);
      gl.vertexAttribPointer(position, 2, gl.FLOAT, false, stride, 0);
      gl.enableVertexAttribArray(texCoord);
      gl.vertexAttribPointer(texCoord, 2, gl.FLOAT, false, stride, 2 * Float32Array.BYTES_PER_ELEMENT);

      const sourceTexture = gl.createTexture();
      if (!sourceTexture) throw new Error('GL source texture creation failed.');
      resources.sourceTexture = sourceTexture;
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, sourceTexture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, { localUri: analysis.uri });
      assertNoGlError(gl, 'Photo texture upload');
      gl.uniform1i(sampler, 0);

      const readbackTexture = gl.createTexture();
      const framebuffer = gl.createFramebuffer();
      resources.readbackTexture = readbackTexture;
      resources.framebuffer = framebuffer;
      if (!readbackTexture || !framebuffer) throw new Error('GL readback target creation failed.');
      gl.bindTexture(gl.TEXTURE_2D, readbackTexture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, analysis.width, analysis.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, readbackTexture, 0);
      if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
        throw new Error('GL readback framebuffer is incomplete.');
      }

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, sourceTexture);
      gl.viewport(0, 0, analysis.width, analysis.height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      const byteCount = analysis.width * analysis.height * 4;
      if (!Number.isSafeInteger(byteCount) || byteCount <= 0 || byteCount > MAX_RGBA_BYTES) {
        throw new Error('RGBA allocation exceeds the safety bound.');
      }
      const rgba = new Uint8Array(byteCount);
      gl.readPixels(0, 0, analysis.width, analysis.height, gl.RGBA, gl.UNSIGNED_BYTE, rgba);
      assertNoGlError(gl, 'Photo readback');

      const extraction = extractPhotoColors(rgba, analysis.width, analysis.height);
      complete(extraction.ok
        ? { ok: true, colors: extraction.colors.map((color) => color.hex), error: null }
        : { ok: false, colors: [], error: extraction.error });
    } catch (error) {
      complete({ ok: false, colors: [], error: error instanceof Error ? error.message : String(error) });
    } finally {
      try {
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.endFrameEXP();
      } catch {
        // Completion still reports the original extraction result.
      }
      cleanupGl(resources);
      glResourcesRef.current = {};
    }
  };

  return analysis ? (
    <GLView
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      msaaSamples={0}
      onContextCreate={handleContextCreate}
      style={styles.hidden}
    />
  ) : null;
}

const styles = StyleSheet.create({
  hidden: { height: 1, opacity: 0, position: 'absolute', width: 1 },
});
