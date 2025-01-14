require('dotenv').config()
const OpenAI = require('openai');
const openai = new OpenAI({ apiKey: process.env.OpenAI });
const fs = require("fs");

async function getNewTranscript(audioFile) {
    const transcription = await openai.audio.transcriptions.create({
        file: fs.createReadStream(audioFile),
        model: "whisper-1",
        response_format: "verbose_json",
        timestamp_granularities: ["word"]
    });

    fs.unlinkSync(audioFile)

    const transformedArray = transcription.words.map(item => ({
        text: item.word,
        start: item.start,
        dur: parseFloat((item.end - item.start).toFixed(10)), // To ensure precision
      }));
      
    console.log(transformedArray);

    return transformedArray
}

module.exports = getNewTranscript;