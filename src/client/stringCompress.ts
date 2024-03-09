//@ts-nocheck

type level = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | undefined;
type mem = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | undefined;

export function downloadBlob(data, fileName, mimeType) {
    var blob, url;
    blob = new Blob([data], {
        type: mimeType
    });
    url = window.URL.createObjectURL(blob);
    downloadURL(url, fileName);
    setTimeout(function () {
        return window.URL.revokeObjectURL(url);
    }, 1000);
};

export async function loadCompressedStateFromUrl(url: string, game: Game): any {
    const blob = await fetchBinaryFile(url);
    const string = await decompressString(blob);
    const data = JSON.parse(string);
    return data;
}

async function fetchBinaryFile(url: string): Promise<Blob> {
    try {
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error('Failed to fetch binary file');
        }

        const blob = await response.blob();
        return blob;
    } catch (error) {
        console.error('Error fetching binary file:', error);
        throw error;
    }
}

function downloadURL(data, fileName) {
    var a;
    a = document.createElement('a');
    a.href = data;
    a.download = fileName;
    document.body.appendChild(a);
    a.style = 'display: none';
    a.click();
    a.remove();
};

export function compressString(text: string, level: level = 5, mem: mem = 4): any {
    // The default compression method is gzip
    // Increasing mem may increase performance at the cost of memory
    // The mem ranges from 0 to 12, where 4 is the default
    const buf = fflate.strToU8(text);
    const compressed = fflate.compressSync(buf, { level: level, mem: mem });
    return compressed;
}

export async function decompressString(compressed: Blob): Promise<string> {
    const arrayBuffer = await blobToArrayBuffer(compressed);
    if (arrayBuffer === null || typeof arrayBuffer === "string") throw new Error("wrong type");
    const decompressed = fflate.decompressSync(new Uint8Array(arrayBuffer));
    return fflate.strFromU8(decompressed);
}

function blobToArrayBuffer(blob: Blob): Promise<ArrayBuffer | string | null> {
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
