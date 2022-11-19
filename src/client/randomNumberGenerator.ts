
function setGameSeed(seed: number) {
    if (seed < 0) {
        throw new DOMException("seed thouls be >= 0");
    }
    gameData.state.randumNumberGenerator.seed = seed;
    let a = gameData.state.randumNumberGenerator.seed * 15485863;
    return (a * a * a % 2038074743) / 2038074743;
}

function nextRandom() {
    gameData.state.randumNumberGenerator.seed++;
    let a = gameData.state.randumNumberGenerator.seed * 15485863;
    return (a * a * a % 2038074743) / 2038074743;
}
