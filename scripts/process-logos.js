const { Jimp } = require('jimp');
const path = require('path');
const fs = require('fs');

const brainDir = 'C:\\Users\\trana\\.gemini\\antigravity-ide\\brain\\05616255-0a93-449a-96a8-45f0b055cc00';
const imgWhitePath = path.join(brainDir, 'media__1780146358557.jpg'); // White bg, black logo
const imgBlackPath = path.join(brainDir, 'media__1780146422006.jpg'); // Black bg, white logo

const outputDir = path.join(__dirname, '..', 'assets', 'images');

async function processLogos() {
  try {
    // 1. Process White Background Logo (Turn white pixels transparent)
    console.log('Reading white logo:', imgWhitePath);
    const whiteImg = await Jimp.read(imgWhitePath);
    
    // We scan and set pixels near white (RGB > 230) to transparent
    whiteImg.scan(0, 0, whiteImg.bitmap.width, whiteImg.bitmap.height, function(x, y, idx) {
      const r = this.bitmap.data[idx + 0];
      const g = this.bitmap.data[idx + 1];
      const b = this.bitmap.data[idx + 2];
      
      // If color is very close to white, make it transparent
      if (r > 230 && g > 230 && b > 230) {
        this.bitmap.data[idx + 3] = 0; // Alpha
      } else {
        // Boost contrast / clean black
        const avg = (r + g + b) / 3;
        if (avg < 80) {
          this.bitmap.data[idx + 0] = 0;
          this.bitmap.data[idx + 1] = 0;
          this.bitmap.data[idx + 2] = 0;
        }
      }
    });
    
    // Autocrop transparent margins
    whiteImg.autocrop();
    const destWhite = path.join(outputDir, 'vsign_logo_black.png'); // Black text on transparent
    await whiteImg.write(destWhite);
    console.log('Saved transparent black text logo to:', destWhite);

    // 2. Process Black Background Logo (Turn black pixels transparent)
    console.log('Reading black logo:', imgBlackPath);
    const blackImg = await Jimp.read(imgBlackPath);
    
    blackImg.scan(0, 0, blackImg.bitmap.width, blackImg.bitmap.height, function(x, y, idx) {
      const r = this.bitmap.data[idx + 0];
      const g = this.bitmap.data[idx + 1];
      const b = this.bitmap.data[idx + 2];
      
      // If color is very close to black, make it transparent
      if (r < 40 && g < 40 && b < 40) {
        this.bitmap.data[idx + 3] = 0; // Alpha
      } else {
        // Boost white
        const avg = (r + g + b) / 3;
        if (avg > 180) {
          this.bitmap.data[idx + 0] = 255;
          this.bitmap.data[idx + 1] = 255;
          this.bitmap.data[idx + 2] = 255;
        }
      }
    });
    
    blackImg.autocrop();
    const destBlack = path.join(outputDir, 'vsign_logo_white.png'); // White text on transparent
    await blackImg.write(destBlack);
    console.log('Saved transparent white text logo to:', destBlack);

    console.log('Logo processing completed successfully!');
  } catch (error) {
    console.error('Error processing logos:', error);
  }
}

processLogos();
