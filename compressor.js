const fileInput = document.getElementById('fileInput');
const compressButton = document.getElementById('compressButton');
const fileInfo = document.getElementById('fileInfo');
const statusText = document.getElementById('statusText');
const progressBar = document.getElementById('progressBar');
const downloadBox = document.getElementById('downloadBox');
const downloadLink = document.getElementById('downloadLink');

let selectedFile = null;
let ffmpeg = null;


function formatMB(bytes) {
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}


function setStatus(message) {
  statusText.textContent = message;
}


function setProgress(value) {
  progressBar.style.width =
    Math.max(0, Math.min(100, value)) + '%';
}


fileInput.addEventListener('change', function () {

  selectedFile = fileInput.files[0];

  downloadBox.style.display = 'none';
  setProgress(0);

  if (!selectedFile) {

    fileInfo.textContent = 'No file selected';
    compressButton.disabled = true;

    setStatus('Select an audio or video file.');

    return;
  }

  fileInfo.textContent =
    selectedFile.name +
    ' — ' +
    formatMB(selectedFile.size);

  compressButton.disabled = false;

  setStatus(
    'File ready.\n\n' +
    'Click "Compress Recording".'
  );
});


async function loadFFmpeg() {

  if (ffmpeg) {
    return;
  }

  if (
    typeof FFmpeg === 'undefined' ||
    typeof FFmpeg.createFFmpeg !== 'function'
  ) {
    throw new Error(
      'FFmpeg library did not load correctly.'
    );
  }

  setStatus(
    'Loading compression engine...\n\n' +
    'Please wait.'
  );

  const createFFmpeg = FFmpeg.createFFmpeg;
  const fetchFile = FFmpeg.fetchFile;

  ffmpeg = createFFmpeg({
    log: true
  });

  ffmpeg.setProgress(function (event) {

    if (
      event &&
      typeof event.ratio === 'number'
    ) {

      setProgress(event.ratio * 100);

    }

  });

  await ffmpeg.load();

  window.MeetingAI_fetchFile = fetchFile;
}


async function compressVideo(file) {

  const inputName = 'input_video';
  const outputName = 'compressed_video.mp4';

  setStatus(
    'Preparing video...\n\n' +
    'Please keep this browser tab open.'
  );

  setProgress(5);

  ffmpeg.FS(
    'writeFile',
    inputName,
    await window.MeetingAI_fetchFile(file)
  );

  setStatus(
    'Compressing video...\n\n' +
    'Please wait. Large videos can take several minutes.'
  );

  await ffmpeg.run(
    '-i',
    inputName,
    '-c:v',
    'libx264',
    '-preset',
    'veryfast',
    '-crf',
    '32',
    '-c:a',
    'aac',
    '-b:a',
    '64k',
    '-movflags',
    '+faststart',
    outputName
  );

  setProgress(95);

  const data =
    ffmpeg.FS(
      'readFile',
      outputName
    );

  ffmpeg.FS(
    'unlink',
    inputName
  );

  ffmpeg.FS(
    'unlink',
    outputName
  );

  return new Blob(
    [data.buffer],
    {
      type: 'video/mp4'
    }
  );
}


async function compressAudio(file) {

  const inputName = 'input_audio';
  const outputName = 'compressed_audio.mp3';

  setStatus(
    'Compressing audio...\n\n' +
    'Please wait.'
  );

  ffmpeg.FS(
    'writeFile',
    inputName,
    await window.MeetingAI_fetchFile(file)
  );

  await ffmpeg.run(
    '-i',
    inputName,
    '-c:a',
    'libmp3lame',
    '-b:a',
    '64k',
    outputName
  );

  setProgress(95);

  const data =
    ffmpeg.FS(
      'readFile',
      outputName
    );

  ffmpeg.FS(
    'unlink',
    inputName
  );

  ffmpeg.FS(
    'unlink',
    outputName
  );

  return new Blob(
    [data.buffer],
    {
      type: 'audio/mpeg'
    }
  );
}


compressButton.addEventListener(
  'click',
  async function () {

    if (!selectedFile) {
      return;
    }

    compressButton.disabled = true;
    downloadBox.style.display = 'none';
    setProgress(0);

    try {

      await loadFFmpeg();

      let compressedBlob;

      if (
        selectedFile.type.startsWith('video/')
      ) {

        compressedBlob =
          await compressVideo(selectedFile);

      } else {

        compressedBlob =
          await compressAudio(selectedFile);

      }

      setProgress(100);

      const originalSize =
        formatMB(selectedFile.size);

      const compressedSize =
        formatMB(compressedBlob.size);

      const downloadURL =
        URL.createObjectURL(compressedBlob);

      const originalName =
        selectedFile.name
          .replace(/\.[^/.]+$/, '');

      const extension =
        selectedFile.type.startsWith('video/')
          ? 'mp4'
          : 'mp3';

      downloadLink.href = downloadURL;

      downloadLink.download =
        originalName +
        '_compressed.' +
        extension;

      downloadBox.style.display = 'block';

      setStatus(
        'Compression completed successfully.\n\n' +
        'Original: ' +
        originalSize +
        '\n' +
        'Compressed: ' +
        compressedSize +
        '\n\n' +
        'Click "Download Compressed File".'
      );

    } catch (error) {

      console.error(error);

      setProgress(0);

      setStatus(
        'Compression failed:\n\n' +
        error.message
      );

    } finally {

      compressButton.disabled = false;

    }

  }
);