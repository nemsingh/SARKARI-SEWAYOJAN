import LZString from 'lz-string';
const compressed = LZString.compressToUTF16('hello world');
console.log(compressed);
const decompressed = LZString.decompressFromUTF16(compressed);
console.log(decompressed);
const invalid = LZString.decompressFromUTF16('<html><body>hello</body></html>');
console.log(invalid);
