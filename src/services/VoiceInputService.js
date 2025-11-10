// src/services/VoiceInputService.js

import Voice from '@react-native-voice/voice';

class VoiceInputService {
  constructor() {
    this.isListening = false;
    this.callback = null;
    
    Voice.onSpeechResults = this.onSpeechResults.bind(this);
    Voice.onSpeechError = this.onSpeechError.bind(this);
    Voice.onSpeechEnd = this.onSpeechEnd.bind(this);
  }

  onSpeechResults(event) {
    if (event.value && event.value.length > 0) {
      const spokenText = event.value[0];
      console.log('Voice Input:', spokenText);
      if (this.callback) {
        this.callback(spokenText, null);
      }
    }
  }

  onSpeechError(event) {
    console.error('Voice Error:', event.error);
    if (this.callback) {
      this.callback(null, event.error?.message || 'Voice recognition error');
    }
  }

  onSpeechEnd() {
    this.isListening = false;
  }

  async startListening(callback, language = 'en-IN') {
    this.callback = callback;
    try {
      await Voice.start(language);
      this.isListening = true;
      console.log(`Voice listening started in ${language}`);
      return true;
    } catch (error) {
      console.error('Failed to start voice:', error);
      return false;
    }
  }

  async stopListening() {
    try {
      await Voice.stop();
      this.isListening = false;
      console.log('Voice listening stopped');
    } catch (error) {
      console.error('Failed to stop voice:', error);
    }
  }

  async destroy() {
    try {
      await Voice.destroy();
      Voice.removeAllListeners();
    } catch (error) {
      console.error('Failed to destroy voice:', error);
    }
  }

  getIsListening() {
    return this.isListening;
  }
}

export default new VoiceInputService();
