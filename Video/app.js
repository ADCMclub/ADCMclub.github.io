let canvas = document.getElementById('studio');
let ctx = canvas.getContext('2d');

let scene = 1;
let stream1, stream2;
let video1 = document.createElement('video');
let video2 = document.createElement('video');
video1.autoplay = true;
video2.autoplay = true;

let mediaRecorder;
let recordedChunks = [];

async function initStreams() {
  stream1 = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
  stream2 = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });

  video1.srcObject = stream1;
  video2.srcObject = stream2;

  requestAnimationFrame(draw);
}

function setScene(s) {
  scene = s;
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  switch (scene) {
    case 1:
      ctx.drawImage(video1, 0, 0, canvas.width / 2, canvas.height);
      ctx.drawImage(video2, canvas.width / 2, 0, canvas.width / 2, canvas.height);
      break;
    case 2:
      ctx.drawImage(video1, 0, 0, canvas.width, canvas.height);
      break;
    case 3:
      ctx.drawImage(video2, 0, 0, canvas.width, canvas.height);
      break;
  }

  requestAnimationFrame(draw);
}

function startRecording() {
  let stream = canvas.captureStream(30); // 30 fps
  mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' });

  recordedChunks = [];
  mediaRecorder.ondataavailable = function (e) {
    if (e.data.size > 0) recordedChunks.push(e.data);
  };

  mediaRecorder.onstop = function () {
    let blob = new Blob(recordedChunks, { type: 'video/webm' });
    let url = URL.createObjectURL(blob);
    let a = document.createElement('a');
    a.href = url;
    a.download = 'grabacion.webm';
    a.click();
  };

  mediaRecorder.start();
}

function stopRecording() {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
  }
}

initStreams();
