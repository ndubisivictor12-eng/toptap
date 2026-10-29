const balanceLabel = document.querySelector('#balance');
const tapButton = document.querySelector('#tapButton');
const telegramApp = window.Telegram?.WebApp;

if (telegramApp) {
  telegramApp.ready();
  telegramApp.expand();
}

let balance = Number(localStorage.getItem('toptap-demo-balance') || 0);
balanceLabel.textContent = balance.toLocaleString();

tapButton.addEventListener('click', () => {
  balance += 1;
  balanceLabel.textContent = balance.toLocaleString();
  localStorage.setItem('toptap-demo-balance', String(balance));
  tapButton.classList.add('pulse');
  window.setTimeout(() => tapButton.classList.remove('pulse'), 110);
});
