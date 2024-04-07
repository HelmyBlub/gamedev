import { Game } from "./gameModel";

export type Note = "C" | "C#" | "D" | "Eb" | "E" | "F" | "F#" | "G" | "G#" | "A" | "Bb" | "B";
export type MusicNote = { note: Note, durationFactor: number, octave: number, tick: number };
export type MusicSheet = {
    notes: MusicNote[],
    speed: number,
};

const baseOctave = 4;
const musicSheetAmazingGrace: MusicSheet = {
    speed: 400,
    notes: [
        { note: "G", tick: 0, durationFactor: 1, octave: baseOctave - 2 },
        { note: "C", tick: 2, durationFactor: 2, octave: baseOctave - 1 },
        { note: "E", tick: 4, durationFactor: 1, octave: baseOctave - 1 },
        { note: "C", tick: 5, durationFactor: 1, octave: baseOctave - 1 },
        { note: "E", tick: 6, durationFactor: 2, octave: baseOctave - 1 },
        { note: "D", tick: 8, durationFactor: 1, octave: baseOctave - 1 },
        { note: "C", tick: 10, durationFactor: 2, octave: baseOctave - 1 },
        { note: "A", tick: 12, durationFactor: 1, octave: baseOctave - 2 },

        { note: "G", tick: 14, durationFactor: 2, octave: baseOctave - 2 },
        { note: "G", tick: 16, durationFactor: 1, octave: baseOctave - 2 },
        { note: "C", tick: 18, durationFactor: 2, octave: baseOctave - 1 },
        { note: "E", tick: 20, durationFactor: 1, octave: baseOctave - 1 },
        { note: "C", tick: 21, durationFactor: 1, octave: baseOctave - 1 },
        { note: "E", tick: 22, durationFactor: 2, octave: baseOctave - 1 },
        { note: "D", tick: 24, durationFactor: 1, octave: baseOctave - 1 },
        { note: "G", tick: 26, durationFactor: 2, octave: baseOctave - 1 },
    ]
}

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
    volumne: GainNode,
}

export function createSound(): Sound {
    const audioContext = new window.AudioContext();
    const volumne = audioContext.createGain();
    const sound = {
        audioContext,
        volumne,
    };
    volumne.connect(sound.audioContext.destination);
    volumne.gain.setValueAtTime(0.1, sound.audioContext.currentTime);
    return sound;
}

export function playMusicSheet1(sound: Sound | undefined) {
    if (!sound) return;
    playMusicSheetLoop(musicSheetAmazingGrace, sound, 0);
}

function playMusicSheetLoop(musicSheet: MusicSheet, sound: Sound, nextIndex: number) {
    const currentNote = musicSheet.notes[nextIndex];
    generateNote(musicSheet.speed * 0.9, currentNote.note, currentNote.octave, sound);
    if (musicSheet.notes.length > nextIndex + 1) {
        const nextNote = musicSheet.notes[nextIndex + 1];
        const tickDiff = nextNote.tick - currentNote.tick;
        if (tickDiff < 0) {
            console.log(`music sheet time broken at ${nextIndex + 1}`);
        } else if (tickDiff === 0) {
            playMusicSheetLoop(musicSheet, sound, ++nextIndex);
        } else {
            setTimeout(() => { playMusicSheetLoop(musicSheet, sound, ++nextIndex) }, tickDiff * musicSheet.speed);
        }
    }
}

export function generateChordGBD(duration: number, octave: number, game: Game) {
    generateNote(duration, "G", octave, game.sound);
    generateNote(duration, "B", octave, game.sound);
    generateNote(duration, "D", octave, game.sound);
}

export function generateNote(duration: number, node: Note, octave: number, sound: Sound | undefined) {
    if (sound === undefined) return;
    console.log("sound", node, `octave: ${octave}`);

    const gainNode = sound.audioContext.createGain();
    gainNode.connect(sound.volumne);

    const oscillator = sound.audioContext.createOscillator();
    oscillator.frequency.setValueAtTime(notesFrequency[octave][notesToFrequencyIndex[node]], sound.audioContext.currentTime);
    oscillator.connect(gainNode);
    oscillator.start();
    setTimeout(() => {
        if (sound === undefined) return;
        let stopDuration = 0.5;
        gainNode.gain.exponentialRampToValueAtTime(0.00001, sound.audioContext.currentTime + stopDuration);
        setTimeout(() => {
            oscillator.stop();
        }, stopDuration * 1000);
    }, duration);
}
