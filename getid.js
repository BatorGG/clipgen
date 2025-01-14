function getYouTubeVideoId(url) {
    // Return null if no URL is provided
    if (!url) return null;

    // Regular expressions to match different YouTube URL formats
    const patterns = {
        // Matches youtube.com/watch?v= format
        standard: /(?:youtube\.com\/watch\?v=|youtube\.com\/embed\/|youtube\.com\/v\/)([^&\n?#]+)/,
        // Matches youtu.be/ format
        shortened: /youtu\.be\/([^&\n?#]+)/,
        // Matches youtube.com/shorts/ format
        shorts: /youtube\.com\/shorts\/([^&\n?#]+)/
    };

    try {
        // Clean the URL by trimming whitespace
        url = url.trim();

        // Try each pattern to find a match
        for (let type in patterns) {
            const match = url.match(patterns[type]);
            if (match && match[1]) {
                return match[1];
            }
        }

        // Return null if no pattern matches
        return null;
    } catch (error) {
        // Return null if any error occurs
        return null;
    }
}

module.exports = getYouTubeVideoId;