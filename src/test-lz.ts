import LZString from 'lz-string';
const testChar = String.fromCharCode(0xD800);
// Wait, LZString.compressToUTF16 might generate 0xD800
let found = -1;
for (let i = 0; i < 1000; i++) {
   const str = Array.from({length: i}, () => 'a').join('');
   const c = LZString.compressToUTF16(str);
   for (let j = 0; j < c.length; j++) {
      if (c.charCodeAt(j) >= 0xD800 && c.charCodeAt(j) <= 0xDFFF) {
         found = c.charCodeAt(j);
         break;
      }
   }
   if (found !== -1) {
       console.log("Found surrogate:", found.toString(16), "at length", i);
       break;
   }
}
