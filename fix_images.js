const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const files = [
  'android-icon-foreground.png',
  'android-icon-monochrome.png',
  'splash-icon.png',
  'icon.png'
];

async function fix() {
  for (const file of files) {
    const filePath = path.join(__dirname, 'assets', file);
    if (!fs.existsSync(filePath)) {
      console.log('Skipping ' + file);
      continue;
    }
    const tempPath = filePath + '.temp.png';
    
    try {
      // Convert to PNG
      await sharp(filePath)
        .toFormat('png')
        .toFile(tempPath);
        
      // Replace original
      fs.renameSync(tempPath, filePath);
      console.log('Fixed ' + file);
    } catch (e) {
      console.error('Error fixing ' + file + ':', e.message);
    }
  }
}

fix().catch(console.error);
