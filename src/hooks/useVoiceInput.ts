import { useState, useCallback, useRef } from 'react';

interface VoiceInputResult {
  isListening: boolean;
  transcript: string | null;
  error: string | null;
  start: () => void;
  stop: () => void;
}

type SpeechRecognitionType = InstanceType<typeof window.SpeechRecognition>;

function getSpeechRecognition(): (new () => SpeechRecognitionType) | null {
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

async function transcribeWithWhisper(audioBlob: Blob): Promise<string> {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  if (!apiKey) throw new Error('OpenAI API key is not configured.');

  const formData = new FormData();
  formData.append('file', audioBlob, 'recording.webm');
  formData.append('model', 'whisper-1');

  const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: formData,
  });

  if (!res.ok) {
    throw new Error(`Whisper API error: ${res.status}`);
  }

  const data = await res.json();
  return data.text;
}

export function useVoiceInput(): VoiceInputResult {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognitionType | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startWebSpeech = useCallback(() => {
    const SpeechRecognition = getSpeechRecognition();
    if (!SpeechRecognition) return false;

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = (event: { results: { item: (i: number) => { item: (j: number) => { transcript: string } }; length: number } }) => {
      const text = event.results.item(0).item(0).transcript;
      setTranscript(text);
      setIsListening(false);
    };

    recognition.onerror = (event: { error: string }) => {
      if (event.error === 'not-allowed') {
        setError('Microphone permission denied.');
      } else {
        setError(`Speech recognition error: ${event.error}`);
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    return true;
  }, []);

  const startWhisper = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunksRef.current = [];

      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      recorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
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

    const usedWebSpeech = startWebSpeech();
    if (!usedWebSpeech) {
      startWhisper();
    }
  }, [startWebSpeech, startWhisper]);

  const stop = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    if (recorderRef.current && recorderRef.current.state === 'recording') {
      recorderRef.current.stop();
      recorderRef.current = null;
    }
    setIsListening(false);
  }, []);

  return { isListening, transcript, error, start, stop };
}
