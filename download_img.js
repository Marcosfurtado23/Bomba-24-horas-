import https from 'https';
import fs from 'fs';

https.get('https://postimg.cc/qhyPSdjq', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const match = data.match(/https:\/\/i\.postimg\.cc\/[^"]+/);
    if (match) {
      const imageUrl = match[0];
      console.log('Found image URL:', imageUrl);
      https.get(imageUrl, (imgRes) => {
        const file = fs.createWriteStream('public/icon.png');
        imgRes.pipe(file);
        file.on('finish', () => {
          file.close();
          console.log('Image downloaded to public/icon.png');
        });
      });
    } else {
      console.log('Image URL not found');
    }
  });
});
