const { listen } = window.__TAURI__.event;
const { invoke } = window.__TAURI__.core;

const originalFetch = window.fetch;
window.fetch = async (url, options = {}) => {
  const secret = await invoke('get_daemon_secret').catch(() => '');
  const headers = { ...options.headers };
  if (secret) headers['Authorization'] = `Bearer ${secret}`;
  return originalFetch(url, { ...options, headers });
};

const views = {
  loading: document.getElementById('view-loading'),
  pin: document.getElementById('view-pin'),
  active: document.getElementById('view-active'),
  shutdown: document.getElementById('view-shutdown')
};

const pinDisplay = document.getElementById('pin-display');
const btnCopy = document.getElementById('btn-copy');
const btnUnlink = document.getElementById('btn-unlink');
const btnShutdown = document.getElementById('btn-shutdown');

let currentPin = "";

const hideAllViews = () => {
  Object.values(views).forEach(v => v.style.display = 'none');
};

const renderAgentState = (state) => {
  hideAllViews();

  if (state.status === 'offline' || state.status === 'initializing') {
    return views.loading.style.display = 'block';
  }

  if (state.status === 'waiting_pin') {
    currentPin = state.pin || "";
    pinDisplay.innerText = state.pin || "------";
    return views.pin.style.display = 'block';
  }

  if (state.status === 'paired') {
    return views.active.style.display = 'block';
  }

  if (state.status === 'shutting_down') {
    return views.shutdown.style.display = 'block';
  }
};

listen('agent-state-changed', (event) => {
  try {
    const state = typeof event.payload === 'string' ? JSON.parse(event.payload) : event.payload;
    renderAgentState(state);
  } catch (e) {}
});

btnCopy.addEventListener('click', () => {
  if (!currentPin) return;
  navigator.clipboard.writeText(currentPin);
  btnCopy.innerText = "¡Copiado!";
  setTimeout(() => btnCopy.innerText = "Copiar PIN", 2000);
});

btnUnlink.addEventListener('click', () => {
  invoke('request_unlink').catch(() => {});
});

btnShutdown.addEventListener('click', () => {
  invoke('request_shutdown').catch(() => {});
});

const btnRefreshPin = document.getElementById('btnRefreshPin');
if (btnRefreshPin) {
  btnRefreshPin.addEventListener('click', () => {
    btnRefreshPin.innerText = "Refrescando...";
    btnRefreshPin.disabled = true;
    invoke('request_refresh_pin').catch(() => {
      btnRefreshPin.innerText = "Refrescar PIN";
      btnRefreshPin.disabled = false;
    });

    setTimeout(() => {
      btnRefreshPin.innerText = "Refrescar PIN";
      btnRefreshPin.disabled = false;
    }, 4000);
  });
}




renderAgentState({ status: 'loading' });

const getDaemonUrl = async () => invoke('get_daemon_base_url').catch(() => 'http://127.0.0.1:45987');


