declare interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

declare interface SpeechRecognitionResult {
  0: SpeechRecognitionAlternative;
  isFinal: boolean;
  length: number;
}

declare interface SpeechRecognitionResultList {
  [index: number]: SpeechRecognitionResult;
  length: number;
}

declare interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

declare interface SpeechRecognition extends EventTarget {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
  onend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onerror: ((this: SpeechRecognition, ev: Event) => any) | null;
}

declare interface Window {
  webkitSpeechRecognition?: {
    new (): SpeechRecognition;
  };
  SpeechRecognition?: {
    new (): SpeechRecognition;
  };
}


