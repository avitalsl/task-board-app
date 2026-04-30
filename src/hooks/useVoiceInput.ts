import { useState, useCallback, useRef } from 'react';
import { transcribeAudioViaApi } from '../api/boardClient';
import { useStore } from '../store';

interface VoiceInputResult {
  isListening: boolean;
  transcript: string | null;
  error: string | null;
  start: () => void;
  stop: () => void;
}

// getSpeechRecognition is reserved for a future fast path: window.SpeechRecognition || window.webkitSpeechRecognition
// See the TODO in start() below.

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const comma = result.indexOf(',');
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read audio blob'));
    reader.readAsDataURL(blob);
  });
}

async function transcribeWithWhisper(audioBlob: Blob): Promise<string> {
  const ownerKey = useStore.getState().ui.ownerKey;
  if (!ownerKey) throw new Error('Not authorized.');
  const audio = await blobToBase64(audioBlob);
  const { text } = await transcribeAudioViaApi(ownerKey, audio, audioBlob.type || 'audio/webm');
  return text;
}

export function useVoiceInput(): VoiceInputResult {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startWhisper = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunksRef.current = [];

      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      recorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      // Voice activity detection: auto-stop after the user has spoken and then
      // gone silent for SILENCE_MS. SILENCE_RMS is normalized [-1,1] amplitude;
      // 0.015 is a conservative threshold above typical room noise floor.
      // SILENCE_MS sits above the longest natural between-word pauses (incl.
      // Hebrew fricatives) to avoid mid-sentence cutoffs.
      const SILENCE_RMS = 0.015;
      const SILENCE_MS = 800;
      const MAX_DURATION_MS = 30000;

      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 1024;
      source.connect(analyser);
      const sampleBuffer = new Uint8Array(analyser.fftSize);

      let hasSpoken = false;
      let lastLoudTime = Date.now();

      const stopIfRecording = () => {
        if (recorder.state === 'recording') recorder.stop();
      };

      const vadInterval = window.setInterval(() => {
        analyser.getByteTimeDomainData(sampleBuffer);
        let sumSq = 0;
        for (let i = 0; i < sampleBuffer.length; i++) {
          const v = (sampleBuffer[i] - 128) / 128;
          sumSq += v * v;
        }
        const rms = Math.sqrt(sumSq / sampleBuffer.length);

        if (rms > SILENCE_RMS) {
          hasSpoken = true;
          lastLoudTime = Date.now();
        } else if (hasSpoken && Date.now() - lastLoudTime > SILENCE_MS) {
          stopIfRecording();
        }
      }, 100);

      // Safety net: VAD can fail to trigger in noisy environments.
      const safetyTimer = window.setTimeout(stopIfRecording, MAX_DURATION_MS);

      recorder.onstop = async () => {
        clearInterval(vadInterval);
        clearTimeout(safetyTimer);
        audioContext.close().catch(() => {});
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        try {
          const text = await transcribeWithWhisper(blob);
          setTranscript(text);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Whisper transcription failed.');
        }
        setIsListening(false);
      };

      recorder.start();
      return true;
    } catch (err) {
      if (err instanceof DOMException && err.name === 'NotAllowedError') {
        setError('Microphone permission denied.');
      } else {
        setError('Could not access microphone.');
      }
      setIsListening(false);
      return false;
    }
  }, []);

  const start = useCallback(() => {
    setTranscript(null);
    setError(null);
    setIsListening(true);

    // Always use Whisper so Hebrew, English, and mixed speech all work via auto-detection.
    // TODO: re-enable Web Speech API as a fast path for single-language use (free, instant,
    //       but requires a fixed lang code — replace startWhisper() with:
    //         const usedWebSpeech = startWebSpeech(); if (!usedWebSpeech) startWhisper();
    startWhisper();
  }, [startWhisper]);

  const stop = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state === 'recording') {
      recorderRef.current.stop();
      recorderRef.current = null;
    }
    setIsListening(false);
  }, []);

  return { isListening, transcript, error, start, stop };
}
