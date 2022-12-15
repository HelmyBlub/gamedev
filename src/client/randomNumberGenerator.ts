export type RandomSeed = {
    seed: number,
}

export function nextRandom(seed: RandomSeed) {
    seed.seed++;
    let a = seed.seed * 15485863;
    return (a * a * a % 2038074743) / 2038074743;
}
