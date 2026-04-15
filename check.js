import fs from 'fs';

async function check() {
  const res = await fetch('https://postimg.cc/nzPnsFm4');
  const text = await res.text();
  
  const matches = text.match(/https:\/\/i\.postimg\.cc\/[^"]+/g);
  console.log("Found URLs:", matches);
}
check();
