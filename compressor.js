const fileInput = document.getElementById("fileInput");
const compressBtn = document.getElementById("compressBtn");
const status = document.getElementById("status");

let selectedFile = null;

// File selection
fileInput.addEventListener("change", function () {

  if (fileInput.files.length === 0) {
    selectedFile = null;
    status.textContent = "No file selected";
    return;
  }

  selectedFile = fileInput.files[0];

  status.textContent =
    "Selected: " +
    selectedFile.name +
    " (" +
    (selectedFile.size / 1024 / 1024).toFixed(1) +
    " MB)";
});


// Compression button
compressBtn.addEventListener("click", async function () {

  if (!selectedFile) {
    status.textContent = "Please select a file first.";
    return;
  }

  compressBtn.disabled = true;

  try {

    status.textContent = "Loading FFmpeg...";

    if (typeof FFmpeg === "undefined") {
      throw new Error("FFmpeg library is not available.");
    }

    if (typeof FFmpeg.createFFmpeg !== "function") {
      throw new Error("FFmpeg createFFmpeg function is not available.");
    }

    const ffmpeg = FFmpeg.createFFmpeg({
      log: true
    });

    await ffmpeg.load();

    status.textContent =
      "Compressing " +
      selectedFile.name +
      "...";

    const inputName = selectedFile.name;

    const isVideo =
      selectedFile.type.startsWith("video/");

    const outputName =
      isVideo
        ? "MeetingAI_Compressed.mp4"
        : "MeetingAI_Compressed.mp3";

    ffmpeg.FS(
      "writeFile",
      inputName,
      await FFmpeg.fetchFile(selectedFile)
    );

    if (isVideo) {

      await ffmpeg.run(
        "-i",
        inputName,
        "-c:v",
        "libx264",
        "-crf",
        "32",
        "-preset",
        "veryfast",
        "-c:a",
        "aac",
        "-b:a",
        "64k",
        outputName
      );

    } else {

      await ffmpeg.run(
        "-i",
        inputName,
        "-c:a",
        "libmp3lame",
        "-b:a",
        "64k",
        outputName
      );

    }

    const output =
      ffmpeg.FS(
        "readFile",
        outputName
      );

    const blob =
      new Blob(
        [output.buffer],
        {
          type: isVideo
            ? "video/mp4"
            : "audio/mpeg"
        }
      );

    const downloadUrl =
      URL.createObjectURL(blob);

    const downloadLink =
      document.createElement("a");

    downloadLink.href = downloadUrl;
    downloadLink.download = outputName;

    document.body.appendChild(downloadLink);

    downloadLink.click();

    downloadLink.remove();

    URL.revokeObjectURL(downloadUrl);

    status.textContent =
      "Compression completed. The compressed file was downloaded.";

  } catch (error) {

    console.error(error);

    status.textContent =
      "Compression failed: " +
      error.message;

  } finally {

    compressBtn.disabled = false;

  }

});
