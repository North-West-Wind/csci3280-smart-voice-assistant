import { SAPI4TTS } from "../tts/sapi4";

const tts = new SAPI4TTS("Sam", 100, 150);
tts.process("soi soi soi");