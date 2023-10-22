export type RandomSeed = {
    seed: number,
}

export function nextRandom(seed: RandomSeed) {
    seed.seed++;
    let a = seed.seed * 15485863;
    return (a * a * a % 2038074743) / 2038074743;
}

export function fixedRandom(x: number, y: number, seed: number) {
    return ((Math.sin((x * 112.01716 + y * 718.233 + seed * 1234.1234) * 437057.545323) * 1000000) & 255) / 256;
}
