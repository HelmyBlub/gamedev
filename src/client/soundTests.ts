export function generateBeep(duration: number, frequency: number) {
    console.log("sound frequency:", frequency);
    const audioContext = new window.AudioContext();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain(); // Create a GainNode for volume control

    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime); // Set frequency

    // Connect oscillator to gainNode, and gainNode to audio output
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Set volume (gain) of the gainNode
    gainNode.gain.setValueAtTime(0.01, audioContext.currentTime);

    oscillator.start(); // Start oscillator
    setTimeout(() => {
        oscillator.stop(); // Stop oscillator after specified duration
    }, duration);
}
