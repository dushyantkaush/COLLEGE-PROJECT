const citySelect = document.getElementById('city');
const lastUpdated = document.getElementById('last-updated');
const dateDisplay = document.getElementById('date');
const modal = document.getElementById('modal');
const customizeBtn = document.getElementById('customize');
const closeModalBtn = document.getElementById('close-modal');
const highlightsBody = document.getElementById('highlights-body');
const highlightsTable = document.getElementById('highlights-table');
const highlightsTitle = document.getElementById('highlights-title');
const detectLocationBtn = document.getElementById('detect-location');
const detectedCity = document.getElementById('detected-city');
const historicalBtn = document.getElementById('historical-btn');

let currentUnit = 'Celsius';
const apiKey = '77758097dc3e2831e1782b5369fdcdea';
let lastFetchedCity = null;
let lastFetchedCoords = null;
let showingHistorical = false;

// ===== Modal Handlers =====
customizeBtn.addEventListener('click', () => modal.style.display = 'flex');
closeModalBtn.addEventListener('click', () => modal.style.display = 'none');
window.onclick = e => { if (e.target == modal) modal.style.display = 'none'; };

// ===== City Change =====
citySelect.addEventListener('change', async () => {
lastFetchedCity = citySelect.value;
lastFetchedCoords = null;
await updateWeatherData(lastFetchedCity);
if (!showingHistorical) await updateForecastByCity(lastFetchedCity);
});

// ===== GPS Detection =====
detectLocationBtn.addEventListener('click', () => {
if (navigator.geolocation) {
navigator.geolocation.getCurrentPosition(async pos => {
const lat = pos.coords.latitude;
const lon = pos.coords.longitude;
try {
const res = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}`);
const data = await res.json();
const cityName = data.name || 'Your Location';
detectedCity.innerText = `Detected City: ${cityName}`;
citySelect.value = cityName;
lastFetchedCity = cityName;
lastFetchedCoords = { lat, lon };
await updateWeatherByCoords(lat, lon);
if (!showingHistorical) await updateForecastByCoords(lat, lon);
} catch {
detectedCity.innerText = 'Unable to detect city';
}
}, () => detectedCity.innerText = 'Location access denied');
} else detectedCity.innerText = 'Geolocation not supported';
});

// ===== Fetch Weather =====
async function updateWeatherData(city) {
try {
const res = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric`);
const data = await res.json();
updateWeatherUI(
data.main.temp, data.main.feels_like, data.main.humidity,
(data.visibility/1000).toFixed(1), data.wind.speed, data.weather[0].main
);
updateLastUpdatedTime();
if (!showingHistorical) await updateForecastByCoords(data.coord.lat, data.coord.lon);
} catch { console.error('Error fetching weather'); }
}

async function updateWeatherByCoords(lat, lon) {
try {
const res = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`);
const data = await res.json();
updateWeatherUI(
data.main.temp, data.main.feels_like, data.main.humidity,
(data.visibility/1000).toFixed(1), data.wind.speed, data.weather[0].main
);
updateLastUpdatedTime();
} catch { console.error('Error fetching GPS weather'); }
}

// ===== Update Weather UI =====
function updateWeatherUI(t, f, h, v, w, c) {
document.getElementById('temperature').innerText = `${convertTemperature(t, currentUnit)}°${currentUnit.charAt(0)}`;
document.getElementById('feels-like').innerText = `${convertTemperature(f, currentUnit)}°${currentUnit.charAt(0)}`;
document.getElementById('humidity').innerText = `${h}%`;
document.getElementById('visibility').innerText = `${v} km`;
document.getElementById('wind-speed').innerText = `${w} m/s`;
document.getElementById('condition').innerText = c;
dateDisplay.innerText = new Date().toLocaleDateString('en-US', { weekday:'long', year:'numeric', month:'short', day:'numeric' });
}
function updateLastUpdatedTime() {
const now = new Date();
lastUpdated.innerText = `Last Updated: ${now.toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })}`;
}

// ===== Forecast =====
async function updateForecastByCity(city) {
try {
const geoRes = await fetch(`https://api.openweathermap.org/geo/1.0/direct?q=${city}&limit=1&appid=${apiKey}`);
const geo = await geoRes.json();
if (geo.length === 0) return;
await updateForecastByCoords(geo[0].lat, geo[0].lon);
} catch { console.error('Error fetching city coordinates'); }
}
async function updateForecastByCoords(lat, lon) {
try {
const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,weathercode&timezone=auto`);
const data = await res.json();
displayForecastData(data.daily);
} catch { console.error('Error fetching forecast'); }
}

// ===== Display Forecast / Historical =====
let lastForecastData = null; // Stores latest 7-day forecast
let lastHistoricalData = null; // Stores latest historical data

// ===== Updated Display Function =====
function displayForecastData(forecast, type='forecast') {
highlightsTitle.innerText = (type==='forecast')
? `${lastFetchedCity || 'Your Location'} – 7 Day Forecast`
: `${lastFetchedCity || 'Your Location'} – Highlights`;
highlightsBody.innerHTML = '';

for (let i = 0; i < forecast.time.length; i++) {
const date = new Date(forecast.time[i]).toLocaleDateString('en-US',{ weekday:'short', month:'short', day:'numeric' });
const min = convertTemperature(forecast.temperature_2m_min[i], currentUnit);
const max = convertTemperature(forecast.temperature_2m_max[i], currentUnit);
const avg = convertTemperature((forecast.temperature_2m_min[i]+forecast.temperature_2m_max[i])/2,currentUnit);
const cond = mapWeatherCode(forecast.weathercode[i]);
const alert = (forecast.weathercode[i]>=60 && forecast.weathercode[i]<70)?'Rain Alert':'–';
const row = document.createElement('tr');
row.innerHTML = `<td>${date}</td><td>${min}°${currentUnit.charAt(0)}</td><td>${max}°${currentUnit.charAt(0)}</td><td>${avg}°${currentUnit.charAt(0)}</td><td>${cond}</td>`;
highlightsBody.appendChild(row);
}
highlightsTable.style.display = 'table';

// Save data for unit switching
if(type==='forecast') lastForecastData = forecast;
else lastHistoricalData = forecast;
}

// ===== Weather Code Mapping =====
function mapWeatherCode(code) {
const map = {0:'Clear',1:'Mainly Clear',2:'Partly Cloudy',3:'Overcast',45:'Fog',48:'Rime Fog',51:'Light Drizzle',53:'Drizzle',55:'Dense Drizzle',61:'Rain',63:'Moderate Rain',65:'Heavy Rain',71:'Snowfall',80:'Rain Showers',81:'Moderate Showers',82:'Heavy Showers'};
return map[code]||'Unknown';
}

// ===== Unit Selection =====
document.getElementById('btn-celsius').onclick = () => switchUnit('Celsius');
document.getElementById('btn-fahrenheit').onclick = () => switchUnit('Fahrenheit');
document.getElementById('btn-kelvin').onclick = () => switchUnit('Kelvin');

function switchUnit(unit) {
currentUnit = unit;
modal.style.display='none';

// Update weather values
if(lastFetchedCoords) updateWeatherByCoords(lastFetchedCoords.lat,lastFetchedCoords.lon);
else if(lastFetchedCity) updateWeatherData(lastFetchedCity);
else updateWeatherData(citySelect.value);

// Update table using cached data
if(showingHistorical && lastHistoricalData) displayForecastData(lastHistoricalData,'historical');
else if(!showingHistorical && lastForecastData) displayForecastData(lastForecastData,'forecast');
}

// ===== Temperature Conversion =====
function convertTemperature(temp, unit) {
if(unit==='Fahrenheit') return ((temp*9/5)+32).toFixed(1);
if(unit==='Kelvin') return (temp+273.15).toFixed(1);
return temp.toFixed(1);
}

// ===== Initialize =====
lastFetchedCity = citySelect.value;
updateWeatherData(citySelect.value);
updateForecastByCity(citySelect.value);

// ===== Alerts =====
const alertsBtn = document.getElementById('alerts-btn');
const alertsModal = document.createElement('div');
alertsModal.id='alerts-modal'; alertsModal.className='modal';
alertsModal.innerHTML=`<div class="modal-content"><span id="close-alerts" class="close">&times;</span><h2>Weather Alerts</h2><div id="alerts-body" style="max-height:400px;overflow-y:auto;text-align:left;"></div></div>`;
document.body.appendChild(alertsModal);
const closeAlertsBtn = document.getElementById('close-alerts');
const alertsBody = document.getElementById('alerts-body');

alertsBtn.addEventListener('click', async () => {
alertsModal.style.display='flex';
if(lastFetchedCoords) await fetchAlerts(lastFetchedCoords.lat,lastFetchedCoords.lon);
else if(lastFetchedCity) await fetchAlertsByCity(lastFetchedCity);
else await fetchAlertsByCity(citySelect.value);
});
closeAlertsBtn.onclick=()=>alertsModal.style.display='none';
window.onclick=e=>{if(e.target==alertsModal) alertsModal.style.display='none';};

async function fetchAlertsByCity(city){
try{
const geoRes=await fetch(`https://api.openweathermap.org/geo/1.0/direct?q=${city}&limit=1&appid=${apiKey}`);
const geo=await geoRes.json();
if(geo.length===0) return;
await fetchAlerts(geo[0].lat,geo[0].lon);
}catch{alertsBody.innerHTML=`<p style="color:red;">Error fetching alerts</p>`;}
}
async function fetchAlerts(lat,lon){
try{
const res=await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,weathercode&timezone=auto&alerts=1`);
const data=await res.json();
if(data.alerts && data.alerts.length>0){
alertsBody.innerHTML='';
data.alerts.forEach((alert,i)=>{
const div=document.createElement('div');
div.style.borderBottom='1px solid #ccc';
div.style.marginBottom='10px';
div.style.paddingBottom='10px';
div.innerHTML=`<strong>${alert.title||'Alert '+(i+1)}</strong><p>${alert.description||'No details available'}</p><p><em>Start: ${new Date(alert.start*1000).toLocaleString()}</em></p><p><em>End: ${new Date(alert.end*1000).toLocaleString()}</em></p>`;
alertsBody.appendChild(div);
});
}else alertsBody.innerHTML=`<p style="color:green;">No active weather alerts for this area.</p>`;
}catch(err){alertsBody.innerHTML=`<p style="color:red;">Error fetching alerts</p>`; console.error(err);}
}

// ===== Historical Data Toggle =====
historicalBtn.addEventListener('click', async ()=>{
showingHistorical=!showingHistorical;
if(showingHistorical){
historicalBtn.innerText="7-Day Forecast";
if(lastFetchedCoords) await fetchHistoricalData(lastFetchedCoords.lat,lastFetchedCoords.lon);
else if(lastFetchedCity) await fetchHistoricalByCity(lastFetchedCity);
else await fetchHistoricalByCity(citySelect.value);
}else{
historicalBtn.innerText="Historical Data";
if(lastFetchedCoords) await updateForecastByCoords(lastFetchedCoords.lat,lastFetchedCoords.lon);
else if(lastFetchedCity) await updateForecastByCity(lastFetchedCity);
else await updateForecastByCity(citySelect.value);
}
});

// ===== Fetch Historical Data =====
async function fetchHistoricalByCity(city){
try{
const geoRes=await fetch(`https://api.openweathermap.org/geo/1.0/direct?q=${city}&limit=1&appid=${apiKey}`);
const geo=await geoRes.json();
if(geo.length===0) return;
await fetchHistoricalData(geo[0].lat,geo[0].lon);
}catch{highlightsBody.innerHTML=`<p style="color:red;">Error fetching historical data</p>`;}
}

async function fetchHistoricalData(lat,lon){
try{
const today=new Date();
const endDate=today.toISOString().split('T')[0];
const pastDate=new Date(today); pastDate.setDate(pastDate.getDate()-6);
const startDate=pastDate.toISOString().split('T')[0];
const res=await fetch(`https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=${startDate}&end_date=${endDate}&daily=temperature_2m_max,temperature_2m_min,weathercode&timezone=auto`);
const data=await res.json();
displayForecastData(data.daily,'historical');
}catch(err){highlightsBody.innerHTML=`<p style="color:red;">Error fetching historical data</p>`; console.error(err);}
}