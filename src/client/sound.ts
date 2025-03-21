import { ABILITY_MUSIC_SHEET_UPGRADE_INSTRUMENT_SINE } from "./ability/musician/abilityMusicSheetInstrumentSine.js";
import { ABILITY_MUSIC_SHEET_UPGRADE_INSTRUMENT_SQUARE } from "./ability/musician/abilityMusicSheetInstrumentSquare.js";
import { ABILITY_MUSIC_SHEET_UPGRADE_INSTRUMENT_TRIANGLE } from "./ability/musician/abilityMusicSheetInstrumentTriangle.js";

export type Note = "C" | "D" | "E" | "F" | "G" | "A" | "B";
export type Semitone = "flat" | "sharp";
export type MusicNote = {
    note: Note,
    semitone?: Semitone,
    durationFactor: number,
    octave: number,
    tick: number,
    type?: string
};
export type MusicSheet = {
    notes: MusicNote[],
    speed: number,
};

export const notesToFrequencyIndex = { "C": 0, "C#": 1, "D": 2, "Eb": 3, "E": 4, "F": 5, "F#": 6, "G": 7, "G#": 8, "A": 9, "Bb": 10, "B": 11 };
export const notesFrequency = [
    [16.35, 17.32, 18.35, 19.45, 20.60, 21.83, 23.12, 24.50, 25.96, 27.50, 29.14, 30.87],
    [32.70, 34.65, 36.71, 38.89, 41.20, 43.65, 46.25, 49.00, 51.91, 55.00, 58.27, 61.74],
    [65.41, 69.30, 73.42, 77.78, 82.41, 87.31, 92.50, 98.00, 103.8, 110.0, 116.5, 123.5],
    [130.8, 138.6, 146.8, 155.6, 164.8, 174.6, 185.0, 196.0, 207.7, 220.0, 233.1, 246.9],
    [261.6, 277.2, 293.7, 311.1, 329.6, 349.2, 370.0, 392.0, 415.3, 440.0, 466.2, 493.9],
    [523.3, 554.4, 587.3, 622.3, 659.3, 698.5, 740.0, 784.0, 830.6, 880.0, 932.3, 987.8],
    [1047, 1109, 1175, 1245, 1319, 1397, 1480, 1568, 1661, 1760, 1865, 1976],
    [2093, 2217, 2349, 2489, 2637, 2794, 2960, 3136, 3322, 3520, 3729, 3951],
    [4186, 4435, 4699, 4978, 5274, 5588, 5920, 6272, 6645, 7040, 7459, 7902]
]


export type Sound = {
    audioContext: AudioContext,
    volume: GainNode,
    customDelay: number,
}

export function createSound(): Sound {
    const audioContext = new window.AudioContext();
    const volume = audioContext.createGain();
    const sound: Sound = {
        audioContext,
        volume: volume,
        customDelay: 0,
    };
    volume.connect(sound.audioContext.destination);
    volume.gain.setValueAtTime(0.1, sound.audioContext.currentTime);
    return sound;
}

export function playMusicNote(musicSheet: MusicSheet, note: MusicNote, distanceFromSource: number, sound?: Sound) {
    const volumeModify = Math.min(1 - distanceFromSource / 1000, 1);
    if (volumeModify <= 0) return;
    generateNote(musicSheet.speed * 0.9 * note.durationFactor, note, volumeModify, sound);
}

export function generateNote(duration: number, note: MusicNote, volumeModify: number, sound?: Sound) {
    if (sound === undefined) return;

    const gainNode = sound.audioContext.createGain();
    gainNode.connect(sound.volume);
    let soundVolumeModify = volumeModify;
    const oscillator = sound.audioContext.createOscillator();
    if (note.type) {
        if (note.type === ABILITY_MUSIC_SHEET_UPGRADE_INSTRUMENT_SINE) oscillator.type = "sine";
        if (note.type === ABILITY_MUSIC_SHEET_UPGRADE_INSTRUMENT_SQUARE) {
            oscillator.type = "square";
            soundVolumeModify *= 0.15;
        }
        if (note.type === ABILITY_MUSIC_SHEET_UPGRADE_INSTRUMENT_TRIANGLE) {
            oscillator.type = "triangle";
            soundVolumeModify *= 0.90;
        }
    }
    let frequencyIndex = notesToFrequencyIndex[note.note];
    let octave = note.octave;
    if (note.semitone) {
        if (note.semitone === "flat") {
            frequencyIndex--;
        } else {
            frequencyIndex++;
        }
        if (frequencyIndex < 0) {
            frequencyIndex = notesFrequency[0].length - 1;
            octave--;
        }
        if (frequencyIndex > notesFrequency[0].length - 1) {
            frequencyIndex = 0;
            octave++;
        }
    }
    oscillator.frequency.setValueAtTime(notesFrequency[octave][frequencyIndex], sound.audioContext.currentTime);
    oscillator.connect(gainNode);

    const attackTime = 0.05;
    const decayTime = 0.1;

    const currentTime = sound.audioContext.currentTime;

    gainNode.gain.setValueAtTime(0, currentTime);
    gainNode.gain.linearRampToValueAtTime(1 * soundVolumeModify, currentTime + attackTime);
    gainNode.gain.linearRampToValueAtTime(0.5 * soundVolumeModify, currentTime + attackTime + decayTime);
    let stopTime = currentTime + duration / 1000;
    if (stopTime <= currentTime + attackTime + decayTime) stopTime = currentTime + attackTime + decayTime + 0.05;
    gainNode.gain.linearRampToValueAtTime(0, stopTime);

    oscillator.start(currentTime);
    oscillator.stop(stopTime);
}
