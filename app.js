const balanceLabel = document.querySelector('#balance');
const energyLabel = document.querySelector('#energy');
const tapButton = document.querySelector('#tapButton');
const gameStatus = document.querySelector('#gameStatus');
const telegramApp = window.Telegram?.WebApp;

const API_URL = 'https://ipygbcnhmdtwnspfymdq.supabase.co/functions/v1/toptap';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_DJVqaPSMSSqXLD6j2gtHoQ_6ceX08in';

if (telegramApp) {
  telegramApp.ready();
  telegramApp.expand();
}

function showError(message) {
  gameStatus.textContent = message;
  gameStatus.classList.add('error');
}

function render(player) {
  balanceLabel.textContent = Number(player.balance).toLocaleString();
  energyLabel.textContent = Number(player.energy).toLocaleString() + ' / ' + Number(player.max_energy).toLocaleString();
}

async function send(action, tapCount = 0) {
  if (!telegramApp?.initData) {
    throw new Error('Open TopTap from Telegram to play.');
  }
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_PUBLISHABLE_KEY,
    },
    body: JSON.stringify({ initData: telegramApp.initData, action, tapCount }),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Could not reach TopTap.');
  return result;
}

send('state').then(render).then(() => {
  gameStatus.textContent = 'Ready to collect';
}).catch(error => showError(error.message));

tapButton.addEventListener('click', async () => {
  tapButton.disabled = true;
  tapButton.classList.add('pulse');
  try {
    const result = await send('tap', 1);
    render(result.player);
    gameStatus.textContent = result.taps_awarded ? '+1 TAP earned' : 'You are out of energy';
  } catch (error) {
    showError(error.message);
  } finally {
    tapButton.disabled = false;
    window.setTimeout(() => tapButton.classList.remove('pulse'), 110);
  }
});
