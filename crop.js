const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const ffprobePath = require('ffprobe-static').path;
ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);
const fs = require('fs')

async function cropVideo(fileName) {
  const inputFile = `./downloads/${fileName}.mp4`
  const outputFile = `./downloads/${fileName}_cropped.mp4`
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(inputFile, (err, metadata) => {
        if (err) {
          return reject(`Error fetching video metadata: ${err}`);
        }
  
        // Get video resolution
        const { width, height } = metadata.streams.find((stream) => stream.codec_type === 'video');
        console.log(`Original Resolution: ${width}x${height}`);
  
        // Calculate target dimensions for 9:16 crop
        const targetHeight = height; // Keep the original height
        const targetWidth = Math.floor(targetHeight * (9 / 16)); // Calculate width for 9:16
  
        console.log(`Target Resolution: ${targetWidth}x${targetHeight}`);
  
        // Crop the video
        ffmpeg(inputFile)
          .videoFilters(`crop=${targetWidth}:${targetHeight}`)
          .output(outputFile)
          .on('start', (commandLine) => {
            console.log('FFmpeg command:', commandLine);
          })
          .on('end', () => {
            console.log('Cropping completed successfully!');
            fs.unlinkSync(inputFile)
            resolve(fileName); // Resolve the Promise on success
          })
          .on('error', (err) => {
            console.error('Error occurred:', err.message);
            reject(err); // Reject the Promise on error
          })
          .run();
      });
    });
}

module.exports = cropVideo;