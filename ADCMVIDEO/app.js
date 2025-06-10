// 🔥 CONFIGURA TU PROYECTO FIREBASE ABAJO:
const firebaseConfig = {
  apiKey: "AIzaSyC6shbQniv5FeXnJYaSasbGKdYibDWhxV8",
  authDomain: "fir-rtc-1d4a1.firebaseapp.com",
  databaseURL: "https://fir-rtc-1d4a1-default-rtdb.firebaseio.com",
  projectId: "fir-rtc-1d4a1",
  storageBucket: "fir-rtc-1d4a1.appspot.com",
  messagingSenderId: "786317659414",
  appId: "1:786317659414:web:4b9fe6fecc349647d1d437"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

const previewVideo = document.getElementById('previewVideo');
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const cameraSelect = document.getElementById('cameraSelect');
const micSelect = document.getElementById('micSelect');
const toggleVideoBtn = document.getElementById('toggleVideo');
const toggleAudioBtn = document.getElementById('toggleAudio');
const enterCallBtn = document.getElementById('enterCall');
const callIdInput = document.getElementById('callId');
const startCallBtn = document.getElementById('startCall');
const joinCallBtn = document.getElementById('joinCall');

let localStream;
let peerConnection;
let isCaller = false;
let videoEnabled = true;
let audioEnabled = true;

const servers = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
};

// Cargar dispositivos
async function loadDevices() {
  const devices = await navigator.mediaDevices.enumerateDevices();
  cameraSelect.innerHTML = '';
  micSelect.innerHTML = '';

  devices.forEach(device => {
    if (device.kind === 'videoinput') {
      cameraSelect.innerHTML += `<option value="${device.deviceId}">${device.label || 'Cámara'}</option>`;
    } else if (device.kind === 'audioinput') {
      micSelect.innerHTML += `<option value="${device.deviceId}">${device.label || 'Micrófono'}</option>`;
    }
  });
}

// Previsualización
async function startPreview() {
  const constraints = {
    video: { deviceId: cameraSelect.value ? { exact: cameraSelect.value } : undefined },
    audio: { deviceId: micSelect.value ? { exact: micSelect.value } : undefined }
  };

  if (localStream) {
    localStream.getTracks().forEach(track => track.stop());
  }

  localStream = await navigator.mediaDevices.getUserMedia(constraints);
  previewVideo.srcObject = localStream;
}

cameraSelect.onchange = startPreview;
micSelect.onchange = startPreview;

toggleVideoBtn.onclick = () => {
  videoEnabled = !videoEnabled;
  localStream.getVideoTracks().forEach(track => track.enabled = videoEnabled);
  toggleVideoBtn.classList.toggle('active', videoEnabled);
  toggleVideoBtn.textContent = videoEnabled ? "Video Activado" : "Video Apagado";
};

toggleAudioBtn.onclick = () => {
  audioEnabled = !audioEnabled;
  localStream.getAudioTracks().forEach(track => track.enabled = audioEnabled);
  toggleAudioBtn.classList.toggle('active', audioEnabled);
  toggleAudioBtn.textContent = audioEnabled ? "Micrófono Activado" : "Micrófono Silenciado";
};

// Entrar a llamada
enterCallBtn.onclick = async () => {
  document.querySelector('.pre-call').classList.add('hide');
  document.querySelector('.controls').classList.remove('hide');
  localVideo.srcObject = localStream;
};

async function initCall() {
  peerConnection = new RTCPeerConnection(servers);
  localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

  peerConnection.ontrack = (event) => {
    remoteVideo.srcObject = event.streams[0];
  };

  peerConnection.onicecandidate = event => {
    if (event.candidate) {
      const candidate = event.candidate.toJSON();
      db.ref(`${callIdInput.value}/candidates/${isCaller ? 'caller' : 'callee'}`).push(candidate);
    }
  };
}

startCallBtn.onclick = async () => {
  isCaller = true;
  await initCall();
  const callRef = db.ref().push();
  callIdInput.value = callRef.key;

  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);
  callRef.set({ offer });

  callRef.on('value', async snapshot => {
    const data = snapshot.val();
    if (!peerConnection.currentRemoteDescription && data?.answer) {
      await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
    }
  });

  db.ref(`${callRef.key}/candidates/callee`).on('child_added', snapshot => {
    const candidate = new RTCIceCandidate(snapshot.val());
    peerConnection.addIceCandidate(candidate);
  });
};

joinCallBtn.onclick = async () => {
  isCaller = false;
  await initCall();
  const callRef = db.ref(callIdInput.value);

  const snapshot = await callRef.once('value');
  const callData = snapshot.val();

  await peerConnection.setRemoteDescription(new RTCSessionDescription(callData.offer));
  const answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);
  callRef.update({ answer });

  db.ref(`${callIdInput.value}/candidates/caller`).on('child_added', snapshot => {
    const candidate = new RTCIceCandidate(snapshot.val());
    peerConnection.addIceCandidate(candidate);
  });
};

// Inicializar
(async () => {
  await loadDevices();
  await startPreview();
})();
