//@ts-nocheck
export function compressString(text: string, level: number = 5, mem: number = 4): any {
    // The default compression method is gzip
    // Increasing mem may increase performance at the cost of memory
    // The mem ranges from 0 to 12, where 4 is the default
    const buf = fflate.strToU8(text);
    const compressed = fflate.compressSync(buf, { level: level, mem: mem });
    return compressed;
}

export async function decompressString(compressed: Blob): Promise<string> {
    const arrayBuffer = await blobToArrayBuffer(compressed);
    const decompressed = fflate.decompressSync(new Uint8Array(arrayBuffer));
    return fflate.strFromU8(decompressed);
}

function blobToArrayBuffer(blob: Blob) {
    return new Promise((resolve, reject) => {
        const fileReader = new FileReader();
        fileReader.onload = () => {
            resolve(fileReader.result);
        };
        fileReader.onerror = () => {
            reject(fileReader.error);
        };
        fileReader.readAsArrayBuffer(blob);
    });
}
