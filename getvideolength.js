require('dotenv').config();
const { google } = require('googleapis');

async function getVideoLength(videoId) {
    const youtube = google.youtube({
        version: 'v3',
        auth: process.env.Google,
    });

    try {
        const response = await youtube.videos.list({
            part: 'contentDetails',
            id: videoId,
        });

        const video = response.data.items[0];
        if (video) {
            const duration = video.contentDetails.duration;
            console.log(`Duration of video ${videoId}: ${duration}`);

            const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
            const hours = match[1] ? match[1].replace('H', '') : '0';
            const minutes = match[2] ? match[2].replace('M', '') : '0';
            const seconds = match[3] ? match[3].replace('S', '') : '0';

            console.log(`${hours}h ${minutes}m ${seconds}s`);

            const secs = parseInt(hours)*3600 + parseInt(minutes)*60 + parseInt(seconds)
            return secs

        } else {
            console.log('Video not found.');
            return 0
        }
    } catch (error) {
        console.error('Error fetching video length:', error);
        return 0
    }
}

module.exports = getVideoLength;