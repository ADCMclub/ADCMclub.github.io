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

let localStream;
let peerConnection;
let isCaller = false;
let videoEnabled = true;
let audioEnabled = true;

const servers = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

window.onload = async () => {
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

  async function loadDevices() {
    const devices = await navigator.mediaDevices.enumerateDevices();
    cameraSelect.innerHTML = '';
    micSelect.innerHTML = '';
    devices.forEach(device => {
      const option = `<option value="${device.deviceId}">${device.label || device.kind}</option>`;
      if (device.kind === 'videoinput') cameraSelect.innerHTML += option;
      if (device.kind === 'audioinput') micSelect.innerHTML += option;
    });
  }

  async function startPreview() {
    const constraints = {
      video: cameraSelect.value ? { deviceId: { exact: cameraSelect.value } } : true,
      audio: micSelect.value ? { deviceId: { exact: micSelect.value } } : true
    };
    if (localStream) localStream.getTracks().forEach(track => track.stop());
    localStream = await navigator.mediaDevices.getUserMedia(constraints);
    previewVideo.srcObject = localStream;
  }

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

  cameraSelect.onchange = startPreview;
  micSelect.onchange = startPreview;

  enterCallBtn.onclick = async () => {
    document.querySelector('.pre-call').classList.add('hide');
    document.querySelector('.controls').classList.remove('hide');
    localVideo.srcObject = localStream;
  };

  async function initCall() {
    peerConnection = new RTCPeerConnection(servers);
    localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
    peerConnection.ontrack = event => {
      console.log("Recibiendo media remota...");
      remoteVideo.srcObject = event.streams[0];
    };
    peerConnection.onicecandidate = event => {
      if (event.candidate) {
        const role = isCaller ? 'caller' : 'callee';
        db.ref(`${callIdInput.value}/candidates/${role}`).push(event.candidate.toJSON());
      }
    };
  }

  startCallBtn.onclick = async () => {
    isCaller = true;
    await initCall();
    const callRef = db.ref().push();
    const callId = callRef.key;
    callIdInput.value = callId;

    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);

    // Añadir timestamp
    await callRef.set({
      offer,
      timestamp: firebase.database.ServerValue.TIMESTAMP
    });

    // Auto-eliminar en 24h (en milisegundos)
    setTimeout(() => {
      db.ref(callId).remove();
    }, 86400000); // 24 * 60 * 60 * 1000

    // Esperar respuesta
    callRef.on('value', async snapshot => {
      const data = snapshot.val();
      if (data?.answer && !peerConnection.currentRemoteDescription) {
        console.log("Recibiendo respuesta...");
        await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
      }
    });

    db.ref(`${callId}/candidates/callee`).on('child_added', snapshot => {
      const candidate = new RTCIceCandidate(snapshot.val());
      peerConnection.addIceCandidate(candidate);
    });
  };

  joinCallBtn.onclick = async () => {
    const callId = callIdInput.value.trim();
    if (!callId) return alert("Debes ingresar un ID de llamada");
    isCaller = false;
    await initCall();

    const callRef = db.ref(callId);
    const snapshot = await callRef.once('value');
    const callData = snapshot.val();
    if (!callData?.offer) return alert("No se encontró una oferta válida.");

    await peerConnection.setRemoteDescription(new RTCSessionDescription(callData.offer));
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    callRef.update({ answer });

    db.ref(`${callId}/candidates/caller`).on('child_added', snapshot => {
      const candidate = new RTCIceCandidate(snapshot.val());
      peerConnection.addIceCandidate(candidate);
    });
  };

  await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
  await loadDevices();
  await startPreview();
};
