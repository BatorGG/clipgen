const { spawn } = require('child_process');
const path = require('path');
const ffmpegPath = require('ffmpeg-static');
const fs = require('fs');


async function downloadYoutubeSection({
  videoUrl,
  fileName,
  outputPath,
  startTime,
  endTime
}) {
  return new Promise((resolve, reject) => {
      const binPath = path.join(process.cwd(), 'bin');
      const ytDlpPath = path.join(binPath, 'yt-dlp_linux');
      const cookiesPath = path.join(binPath, 'cookies.txt');

      // Create temporary filenames for video and audio
      const tempDir = path.dirname(outputPath);
      const tempVideo = path.join(tempDir, `temp_video_${fileName}.mp4`);
      const tempAudio = path.join(tempDir, `temp_audio_${fileName}.m4a`);

      checkPermissions(ffmpegPath, 'FFmpeg binary');

      console.log('Downloading video stream...');
      console.log('Executing yt-dlp command:', ytDlpPath, [
        videoUrl,
        '--add-header', 'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
        '--no-mtime',
        '--no-playlist',
        '--ffmpeg-location', ffmpegPath,
        '-f', 'bv*[height<=720][fps<=30]',
        '--download-sections', `*${startTime}-${endTime}`,
        '--force-keyframes-at-cuts',
        '--external-downloader', 'ffmpeg',
        '--external-downloader-args', `ffmpeg_i:-ss ${startTime} -t ${calculateDuration(startTime, endTime)}`,
        '--cookies', cookiesPath,
        '-o', tempVideo,
    ]);

      const downloadVideo = spawn(ytDlpPath, [
          '--verbose',
          videoUrl,
          '--add-header', 'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
          '--no-mtime',
          '--no-playlist',
          '--ffmpeg-location', ffmpegPath,
          '-f', 'bv*[height<=720][fps<=30]',  // Use WebM format at 720p 30fps
          '--download-sections', `*${startTime}-${endTime}`,
          '--force-keyframes-at-cuts',  // Force keyframe at cut points
          '--external-downloader', 'ffmpeg',  // Use FFmpeg for downloading
          '--cookies', cookiesPath,
          '-o', tempVideo
      ]);

      downloadVideo.stdout.on('data', (data) => {
          const output = data.toString();
          if (output.includes('[download]')) {
              console.log('Video:', output.trim());
          }
      });

      downloadVideo.stderr.on('data', (data) => {
          console.error('Video stderr:', data.toString());
      });

      downloadVideo.on('close', (code) => {
          if (code === 0) {
              console.log('Video downloaded, now downloading audio...');
              
              const downloadAudio = spawn(ytDlpPath, [
                  videoUrl,
                  '--add-header', 'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
                  '--no-mtime',
                  '--no-playlist',
                  '--ffmpeg-location', ffmpegPath,
                  '-f', 'ba',
                  '--download-sections', `*${startTime}-${endTime}`,
                  '--force-keyframes-at-cuts',
                  '--external-downloader', 'ffmpeg',
                  '--external-downloader-args', `ffmpeg_i:-ss ${startTime} -t ${calculateDuration(startTime, endTime)}`,
                  '--cookies', cookiesPath,
                  '-o', tempAudio
              ]);

              downloadAudio.stdout.on('data', (data) => {
                  const output = data.toString();
                  if (output.includes('[download]')) {
                      console.log('Audio:', output.trim());
                  }
              });

              downloadAudio.stderr.on('data', (data) => {
                  console.error('Audio stderr:', data.toString());
              });

              downloadAudio.on('close', (audioCode) => {
                  if (audioCode === 0) {
                      console.log('Audio downloaded, now merging...');

                      // Merge the already synchronized streams
                      const ffmpegProcess = spawn(ffmpegPath, [
                          '-i', tempVideo,
                          '-i', tempAudio,
                          '-map', '0:v:0',
                          '-map', '1:a:0',
                          '-c:v', 'copy',
                          '-c:a', 'aac',
                          '-shortest',
                          '-y',
                          outputPath
                      ]);

                      ffmpegProcess.stdout.on('data', (data) => {
                          console.log('FFmpeg:', data.toString());
                      });

                      ffmpegProcess.stderr.on('data', (data) => {
                          console.log('FFmpeg:', data.toString());
                      });

                      ffmpegProcess.on('close', (ffmpegCode) => {
                          // Clean up temporary files
                          try {
                              fs.unlinkSync(tempVideo);
                              //fs.unlinkSync(tempAudio); Whisperhez kell még
                              console.log('Temporary files cleaned up');
                          } catch (err) {
                              console.error('Error cleaning up temporary files:', err);
                          }

                          if (ffmpegCode === 0) {
                              resolve('Video successfully downloaded and merged');
                          } else {
                              reject(new Error(`FFmpeg merge failed with code ${ffmpegCode}`));
                          }
                      });
                  } else {
                      reject(new Error(`Audio download failed with code ${audioCode}`));
                  }
              });
          } else {
              reject(new Error(`Video download failed with code ${code}`));
          }
      });

      downloadVideo.on('error', (error) => {
          reject(error);
      });
  });
}

// Helper function to calculate duration between two timestamps
function calculateDuration(startTime, endTime) {
  const getSeconds = (timeStr) => {
      const [hours, minutes, seconds] = timeStr.split(':').map(Number);
      return hours * 3600 + minutes * 60 + seconds;
  };
  
  return String(getSeconds(endTime) - getSeconds(startTime));
}

function formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
}


// Example usage:
async function downloadHighlight(fileName, id, start, dur) {
    return new Promise(async (resolve, reject) => {
        try {
            const startTime = formatTime(Math.floor(start))
            const endTime = formatTime(Math.ceil((start + dur)))
            console.log('Starting download process...');
            
            const downloadpath = path.join(process.cwd(), 'downloads');
            const outPutFile = fileName + ".mp4"
            const outputPath = path.join(downloadpath, outPutFile)
            await downloadYoutubeSection({
                videoUrl: `https://www.youtube.com/watch?v=${id}`,
                fileName: fileName,
                outputPath: outputPath,
                startTime: startTime,
                endTime: endTime
            });
            console.log('Process completed successfully!');
            resolve(fileName)
            return fileName 
        } catch (error) {
            console.error('Error:', error);
            reject(null)
            return null
        }
    });
}

function checkPermissions(filePath, description) {
    console.log(`Checking permissions for: ${description}`);
    fs.access(filePath, fs.constants.F_OK, (err) => {
        if (err) {
            console.error(`${description} does not exist.`);
        } else {
            console.log(`${description} exists.`);
            fs.access(filePath, fs.constants.R_OK | fs.constants.W_OK, (err) => {
                if (err) {
                    console.error(`${description} is not readable/writable.`);
                } else {
                    console.log(`${description} is readable and writable.`);
                }
            });
        }
    });
}

function testFFmpeg() {
    console.log(`Testing FFmpeg at path: ${ffmpegPath}`);
  
    // Test 1: Check FFmpeg version
    const versionTest = spawn(ffmpegPath, ['-version']);
  
    versionTest.stdout.on('data', (data) => {
      console.log(`FFmpeg Version Output:\n${data.toString()}`);
    });
  
    versionTest.stderr.on('data', (data) => {
      console.error(`FFmpeg Version Error Output:\n${data.toString()}`);
    });
  
    versionTest.on('close', (code) => {
      if (code === 0) {
        console.log('FFmpeg version test succeeded.');
        testFFmpegFunctionality(); // Proceed to functionality test
      } else {
        console.error(`FFmpeg version test failed with code: ${code}`);
      }
    });
  }
  
  function testFFmpegFunctionality() {
    console.log('Testing FFmpeg functionality...');
  
    const testOutput = path.join(process.cwd(), 'test_video.mp4');
  
    // Generate a 5-second test video
    const functionalityTest = spawn(ffmpegPath, [
      '-f', 'lavfi',                 // Use FFmpeg's internal test source
      '-i', 'testsrc=size=128x128:rate=1', // Simple test video
      '-t', '5',                     // Duration: 5 seconds
      testOutput                     // Output file
    ]);
  
    functionalityTest.stdout.on('data', (data) => {
      console.log(`FFmpeg Functional Test Output:\n${data.toString()}`);
    });
  
    functionalityTest.stderr.on('data', (data) => {
      console.error(`FFmpeg Functional Test Error Output:\n${data.toString()}`);
    });
  
    functionalityTest.on('close', (code) => {
      if (code === 0) {
        console.log(`FFmpeg functionality test succeeded. Test video created at: ${testOutput}`);
      } else {
        console.error(`FFmpeg functionality test failed with code: ${code}`);
      }
    });
  }
  

module.exports = downloadHighlight;
