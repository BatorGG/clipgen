const fs = require('node:fs/promises');


async function generateASS(fileName, transcript, timestamp) {
    const adjustedTranscript = transcript;//filterAndAdjustSubtitles(transcript, timestamp)
    if (!adjustedTranscript) {
        console.error('No transcript provided!');
        return false;
    }

    try {
        // ASS header
        const header = `[Script Info]
    Title: Generated Subtitles
    ScriptType: v4.00+
    PlayDepth: 0
    
    [V4+ Styles]
    Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
    Style: Default,Arial,12,&H00FFFFFF,&H00000000,&H00000000,&H64000000,1,0,0,0,100,100,0,0,1,2,1,2,10,10,40,1
    
    [Events]
    Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text`;

        // Helper function to convert seconds to ASS time format (hh:mm:ss.ms)
        function toASSTime(seconds) {
            const hours = String(Math.floor(seconds / 3600)).padStart(2, '0');
            const minutes = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0');
            const secs = String(Math.floor(seconds % 60)).padStart(2, '0');
            const millis = String(Math.floor((seconds % 1) * 100)).padStart(2, '0'); // 2-digit precision
            return `${hours}:${minutes}:${secs}.${millis}`;
        }

        // Generate subtitle lines
        const events = adjustedTranscript.map((item, index, array) => {
            const start = toASSTime(item.start);
            const end = toASSTime(item.start + item.dur);
            
            // Check if there's a next item and if the start time of the next item is sooner
            const nextItem = array[index + 1];
            if (nextItem && nextItem.start < item.start + item.dur) {
                // Use the next item's start time if it's sooner
                const nextStart = toASSTime(nextItem.start);
                return `Dialogue: 0,${start},${nextStart},Default,,0,0,0,,${item.text}`;
            }
        
            return `Dialogue: 0,${start},${end},Default,,0,0,0,,${item.text}`;
        });

        // Combine header and events
        const assText =  `${header}\n${events.join('\n')}`;
        await fs.writeFile(`./downloads/${fileName}.ass`, assText)
        return true;
    }
    catch (error) {
        console.log(error)
        return false
    }
}

function filterAndAdjustSubtitles(subtitles, timestamp) {
    return subtitles
      .filter(subtitle => subtitle.start >= timestamp) // Remove items with start < timestamp
      .map(subtitle => ({
        ...subtitle,
        start: subtitle.start - timestamp // Adjust the start time
      }));
}

module.exports = generateASS;