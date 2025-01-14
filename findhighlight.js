require('dotenv').config()
const OpenAI = require('openai');
const openai = new OpenAI({ apiKey: process.env.OpenAI });

async function findHighlight(transcript, n) {

    let bestN = ""
    if (n > 1) {
        bestN = `Please only return the ${n} best highlights!`
    }
    else {
        bestN = "Please only return the one best highlight!"
    }


        try {
            console.log("Getting video highlight");
    
            const completion = await openai.chat.completions.create({
            messages: [
                {"role": "system", "content": "You are a video content assistant that identifies key moments or highlights based on the transcript of YouTube videos."},
                {"role": "user", "content": `Given the following transcript of a YouTube video, identify the key moments or highlights based on the content, emotional tone, or significance of the text.
                    The transcript consists of individual segments, each with text, start time, and duration.
                    \n\nPlease follow these steps:
                    \n\n1. Identify key moments or highlights in the video based on the content or emotional tone.
                    \n2. For each highlight, calculate the start time as the 'timestamp' (the start of the first segment of the highlight).
                    \n3. Calculate the duration by subtracting the start time of the first segment from the end time of the last segment in the highlight (start time of the last segment + duration of the last segment).
                    \n\nRespond only with an array of the highlights in the format below:
                    \n\n[\n    {\n        "title": "Title of highlight 1",\n        "timestamp": 15.2,\n        "duration": 60.5\n    },\n    {\n        "title": "Title of highlight 2",\n        "timestamp": 125.6,\n        "duration": 32.2\n    }\n]
                    \nPlease pay attention to JSON syntax!
                    \n${bestN}
                    \n\nHere is the transcript:\n\n${transcript}`}
                ],
            "max_tokens": 1000,
            model: "gpt-4o-mini",
            });
        
            console.log(completion.choices[0]);
            const response = completion.choices[0];
            const content = response.message.content;
            const jsonString = content.replace('```json\n', '').replace('```', '').trim();
            const dataArray = JSON.parse(jsonString);
            //const dataArray = JSON.parse(response.message.content);
            //resolve(dataArray)
            return dataArray
        }
        catch (error) {
            console.log(error)
            //reject(null)
            return null
        }
}

module.exports = findHighlight;