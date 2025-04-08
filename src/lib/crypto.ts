/**
 * Utility functions for file handling
 */

/**
 * Converts a File object (e.g., from an <input type="file">) to Uint8Array.
 */
export async function fileToUint8Array(file: File): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result instanceof ArrayBuffer) {
        resolve(new Uint8Array(event.target.result));
      } else {
        reject(new Error('Failed to read file as ArrayBuffer.'));
      }
    };
    reader.onerror = (event) => {
      reject(
        new Error(
          `File reading error: ${
            event.target?.error?.message ?? 'Unknown error'
          }`
        )
      );
    };
    reader.readAsArrayBuffer(file);
  });
}
