const axios = require('axios');
const xml2js = require('xml2js');
const he = require('he');
const { YoutubeTranscript } = require('youtube-transcript');


async function getText(videoId) {
    console.log(videoId)
    YoutubeTranscript.fetchTranscript('https://www.youtube.com/watch?v=Pr0tPxEpFjo').then(console.log);
    return null
    /*
    return new Promise(async (resolve, reject) => {
        try { 

            const videoUrl = `https://youtu.be/${videoId}`;
            const response = await axios.get(videoUrl, {
                proxy: proxy,
                headers: {
                  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }
              });

            // Step 2: Extract the timed text URL from the response
            const timedTextRegex = /(?:timedtext\?v=([^&]+))/g; // Look for timedtext URL
            const match = response.data.match(timedTextRegex);
            const matchString = match[0]
            const searchString = '","name"'
            
            const index = matchString.indexOf(searchString);
            const timedTextUrl = index !== -1 ? matchString.substring(0, index) : matchString;

            const formattedUrl = timedTextUrl.replace(/\\u0026/g, '&');

            const fullUrl = "https://www.youtube.com/api/" + formattedUrl

            const transcriptResponse = await axios.get(fullUrl, {
                headers: {
                  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }
              });
            const xml = transcriptResponse.data;

            // Step 5: Parse the XML
            xml2js.parseString(xml, async (err, result) => {
                if (err) {
                    throw new Error('Error parsing XML.');
                    reject(null)
                }

                //console.log(result.transcript.text)
                

                const inputArray = result.transcript.text;

                const transformedArray = inputArray.map(item => ({
                    text: item._,
                    start: parseFloat(item.$.start),
                    dur: parseFloat(item.$.dur)
                }));

                //console.log(transformedArray)
                
                const cleanedTranscript = transformedArray.map(entry => ({
                    ...entry,
                    text: he.decode(entry.text)
                }));

                console.log(cleanedTranscript)
                resolve(cleanedTranscript);
                return cleanedTranscript;
            });
        


        } catch (error) {
            console.error(error);
            reject(null);
            return null;
        }
    });
    */


}

const videoId = "lx2nFfwM8cI";
getText(videoId);

module.exports = getText;