const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
ffmpeg.setFfmpegPath(ffmpegPath);
const fs = require('fs');

const generateASS = require("./generateass")

async function addSubtitles(fileName, transcript, timestamp) {

	const success = await generateASS(fileName, transcript, timestamp);
	if (success) {
		const subtitlesFile = `./downloads/${fileName}.ass`; // Use 'subtitles.srt' if you're using SRT format

		const inputVideo = `./downloads/${fileName}_cropped.mp4`;
		const outputVideo = `./downloads/${fileName}_subs.mp4`;

		return new Promise(async (resolve, reject) => {
			try {

				ffmpeg(inputVideo)
					.outputOptions('-vf', `subtitles=${subtitlesFile}`)
					.on('start', (cmd) => console.log(`Started: ${cmd}`))
					.on('error', (err) => {
						console.error('Error:', err.message)
						reject(err.message)
					})
					.on('end', () => {
						console.log('Finished processing!')
						resolve(fileName)
						fs.unlinkSync(inputVideo)
						fs.unlinkSync(subtitlesFile)
					})
					.save(outputVideo);
				
			}
			catch (error) {
				console.log(error);
				reject(error);
			}
		});
	}


}

module.exports = addSubtitles;