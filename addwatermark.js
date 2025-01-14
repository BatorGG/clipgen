const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const fs = require('fs');

ffmpeg.setFfmpegPath(ffmpegPath);

function addWatermark(inputFile) {
    return new Promise((resolve, reject) => {
        // Input and output paths
        const inputVideoPath = `./downloads/${inputFile}_subs.mp4`;
        const watermarkImagePath = './downloads/watermark.png';
        const outputVideoPath = `./downloads/${inputFile}_final.mp4`;

        // Ensure the input video and watermark exist
        if (!fs.existsSync(inputVideoPath)) {
            console.error('Input video not found!');
            reject(null)
            return
        }

        if (!fs.existsSync(watermarkImagePath)) {
            console.error('Watermark image not found!');
            reject(null)
            return
        }

        // Add watermark to the video
        ffmpeg(inputVideoPath)
            .outputOptions([
                '-vf', `movie=${watermarkImagePath} [watermark]; [in][watermark] overlay=0:0 [out]`
            ])
            .save(outputVideoPath)
            .on('start', (commandLine) => {
                console.log('FFmpeg process started with command:', commandLine);
            })
            .on('progress', (progress) => {
                console.log(`Processing: ${progress.percent}% done`);
            })
            .on('end', () => {
                console.log('Watermark added successfully!');
                fs.unlinkSync(inputVideoPath)
                resolve(inputFile)
            })
            .on('error', (err) => {
                console.error('An error occurred:', err.message);
                reject(null)
            });

    });

}

module.exports = addWatermark;