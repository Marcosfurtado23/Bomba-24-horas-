import fs from 'fs';
import { Readable } from 'stream';
import { finished } from 'stream/promises';

async function download(url, filename) {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        'Referer': 'https://postimg.cc/'
      }
    });
    console.log(url, 'Status:', res.status);
    if (!res.ok) throw new Error(`unexpected response ${res.statusText}`);
    const fileStream = fs.createWriteStream(filename);
    await finished(Readable.fromWeb(res.body).pipe(fileStream));
    console.log('Downloaded successfully to', filename);
  } catch (err) {
    console.error('Error downloading:', err.message);
  }
}

download('https://i.postimg.cc/nFHrPMcP/Bomba24horas-20260415-163048-0000.png', 'public/icon.png');
