// mock-third-party-chat.js
console.log('💬 Mock Chat Widget: Mulai download dan instansiasi...');
const startTime = performance.now();

// Menstimulasi heavy JS compilation & execution (blocking main thread) selama 350ms
while (performance.now() - startTime < 350) {
  // Blocking main thread
}

console.log(`💬 Mock Chat Widget: Selesai dimuat dalam ${(performance.now() - startTime).toFixed(1)}ms`);

// Membuat UI widget chat
const chatDiv = document.createElement('div');
chatDiv.id = 'mock-chat-widget';
chatDiv.style.position = 'fixed';
chatDiv.style.bottom = '20px';
chatDiv.style.right = '20px';
chatDiv.style.width = '300px';
chatDiv.style.height = '400px';
chatDiv.style.backgroundColor = '#10b981'; // Emerald green
chatDiv.style.color = '#ffffff';
chatDiv.style.borderRadius = '12px';
chatDiv.style.padding = '20px';
chatDiv.style.boxShadow = '0 10px 25px -5px rgba(0,0,0,0.3)';
chatDiv.style.fontFamily = 'system-ui, -apple-system, sans-serif';
chatDiv.style.zIndex = '9999';
chatDiv.style.transition = 'all 0.3s ease';
chatDiv.innerHTML = `
  <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(255,255,255,0.2); padding-bottom:10px; margin-bottom:15px;">
    <h4 style="margin:0; font-size:16px;">Live Support Chat</h4>
    <button onclick="document.getElementById('mock-chat-widget').style.display='none'" style="background:none; border:none; color:white; cursor:pointer; font-size:18px;">&times;</button>
  </div>
  <p style="font-size:14px; margin:0 0 15px 0; line-height:1.4;">Halo! Ada yang bisa kami bantu hari ini? Tim kami siap melayani Anda secara real-time.</p>
  <div style="background:rgba(255,255,255,0.15); border-radius:8px; padding:10px; height:180px; overflow-y:auto; font-size:13px; margin-bottom:15px; border:1px solid rgba(255,255,255,0.1);">
    <i>Sistem: Agen kami sedang online.</i>
  </div>
  <div style="display:flex; gap:8px;">
    <input type="text" placeholder="Tulis pesan..." style="flex:1; border:none; padding:8px 12px; border-radius:6px; font-size:13px; outline:none; color:#374151;">
    <button style="border:none; background:#047857; color:white; padding:8px 16px; border-radius:6px; font-weight:600; cursor:pointer;">Kirim</button>
  </div>
`;
document.body.appendChild(chatDiv);
