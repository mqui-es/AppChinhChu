const { Jimp } = require('jimp');
const path = require('path');
const fs = require('fs');

const sourceLogoPath = 'C:\\Users\\trana\\.gemini\\antigravity-ide\\brain\\acaccceb-0baf-49cb-bfc9-8c76e9438f7e\\media__1780340801783.jpg';
const outputDir = path.join(__dirname, '..', 'assets', 'images');

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

async function run() {
  try {
    console.log('Processing logos...');
    
    // Copy the original uploaded file to assets/images for record keeping
    const destOriginal = path.join(outputDir, 'vsign_logo_original.jpg');
    fs.copyFileSync(sourceLogoPath, destOriginal);
    console.log('Copied original logo to:', destOriginal);

    // 1. Process transparent white logo
    const imgWhite = await Jimp.read(sourceLogoPath);
    imgWhite.scan(0, 0, imgWhite.bitmap.width, imgWhite.bitmap.height, function(x, y, idx) {
      const r = this.bitmap.data[idx + 0];
      const g = this.bitmap.data[idx + 1];
      const b = this.bitmap.data[idx + 2];
      
      // If pixel is black/dark, make it transparent
      if (r < 50 && g < 50 && b < 50) {
        this.bitmap.data[idx + 3] = 0; // Alpha
      } else {
        // Boost white logo visibility
        const avg = (r + g + b) / 3;
        if (avg > 150) {
          this.bitmap.data[idx + 0] = 255;
          this.bitmap.data[idx + 1] = 255;
          this.bitmap.data[idx + 2] = 255;
        }
      }
    });
    imgWhite.autocrop();
    const destWhite = path.join(outputDir, 'vsign_logo_white.png');
    await imgWhite.write(destWhite);
    console.log('Saved transparent white logo to:', destWhite);

    // 2. Process transparent black logo
    const imgBlack = await Jimp.read(sourceLogoPath);
    imgBlack.scan(0, 0, imgBlack.bitmap.width, imgBlack.bitmap.height, function(x, y, idx) {
      const r = this.bitmap.data[idx + 0];
      const g = this.bitmap.data[idx + 1];
      const b = this.bitmap.data[idx + 2];
      
      // If pixel is black/dark, make it transparent
      if (r < 50 && g < 50 && b < 50) {
        this.bitmap.data[idx + 3] = 0; // Alpha
      } else {
        // Make non-black pixels pure black
        this.bitmap.data[idx + 0] = 0;
        this.bitmap.data[idx + 1] = 0;
        this.bitmap.data[idx + 2] = 0;
      }
    });
    imgBlack.autocrop();
    const destBlack = path.join(outputDir, 'vsign_logo_black.png');
    await imgBlack.write(destBlack);
    console.log('Saved transparent black logo to:', destBlack);

    // 3. Process icon.png (1024x1024, black background, centered logo with safe margins)
    const imgIconSrc = await Jimp.read(sourceLogoPath);
    imgIconSrc.scan(0, 0, imgIconSrc.bitmap.width, imgIconSrc.bitmap.height, function(x, y, idx) {
      const r = this.bitmap.data[idx + 0];
      const g = this.bitmap.data[idx + 1];
      const b = this.bitmap.data[idx + 2];
      
      // Make background transparent for cropping
      if (r < 40 && g < 40 && b < 40) {
        this.bitmap.data[idx + 3] = 0;
      }
    });
    imgIconSrc.autocrop();
    
    // Resize keeping aspect ratio
    const iconAspect = imgIconSrc.bitmap.width / imgIconSrc.bitmap.height;
    let iconW = 640;
    let iconH = Math.round(iconW / iconAspect);
    if (iconH > 640) {
      iconH = 640;
      iconW = Math.round(iconH * iconAspect);
    }
    imgIconSrc.resize({ w: iconW, h: iconH });
    
    // Now create a 1024x1024 black background
    const bgIcon = await Jimp.read(sourceLogoPath);
    bgIcon.resize({ w: 1024, h: 1024 });
    bgIcon.scan(0, 0, 1024, 1024, function(x, y, idx) {
      this.bitmap.data[idx + 0] = 0; // Solid black
      this.bitmap.data[idx + 1] = 0;
      this.bitmap.data[idx + 2] = 0;
      this.bitmap.data[idx + 3] = 255;
    });
    
    // Paste centered
    const iconX = Math.round((1024 - iconW) / 2);
    const iconY = Math.round((1024 - iconH) / 2);
    bgIcon.composite(imgIconSrc, iconX, iconY);
    const destIcon = path.join(outputDir, 'icon.png');
    await bgIcon.write(destIcon);
    console.log('Saved 1024x1024 app icon to:', destIcon);

    // 4. Process splash-icon.png (centered white logo with transparent background)
    const imgSplashSrc = await Jimp.read(destWhite);
    const splashAspect = imgSplashSrc.bitmap.width / imgSplashSrc.bitmap.height;
    let splashW = 380;
    let splashH = Math.round(splashW / splashAspect);
    if (splashH > 380) {
      splashH = 380;
      splashW = Math.round(splashH * splashAspect);
    }
    imgSplashSrc.resize({ w: splashW, h: splashH });
    
    // Create transparent background
    const bgSplash = await Jimp.read(sourceLogoPath);
    bgSplash.resize({ w: 1024, h: 1024 });
    bgSplash.scan(0, 0, 1024, 1024, function(x, y, idx) {
      this.bitmap.data[idx + 3] = 0; // Transparent
    });
    
    const splashX = Math.round((1024 - splashW) / 2);
    const splashY = Math.round((1024 - splashH) / 2);
    bgSplash.composite(imgSplashSrc, splashX, splashY);
    const destSplash = path.join(outputDir, 'splash-icon.png');
    await bgSplash.write(destSplash);
    console.log('Saved transparent splash icon to:', destSplash);

    // 5. Process favicon.png (48x48, transparent white logo)
    const imgFavicon = await Jimp.read(destWhite);
    imgFavicon.resize({ w: 48, h: 48 });
    const destFavicon = path.join(outputDir, 'favicon.png');
    await imgFavicon.write(destFavicon);
    console.log('Saved 48x48 favicon to:', destFavicon);

    console.log('Logo rebranding processing completed successfully!');
  } catch (err) {
    console.error('Error during logo rebranding:', err);
  }
}

run();
