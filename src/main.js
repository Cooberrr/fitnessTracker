import { PGlite } from '@electric-sql/pglite';
import databaseFilesUrl from '../node_modules/@electric-sql/pglite/dist/pglite.data?url';
import postgresWasmUrl from '../node_modules/@electric-sql/pglite/dist/pglite.wasm?url';
import initdbWasmUrl from '../node_modules/@electric-sql/pglite/dist/initdb.wasm?url';
import schema from './schema.sql?raw';
import './style.css';

const loadWasmModule = async (url) => WebAssembly.compile(await (await fetch(url)).arrayBuffer());
const databaseReady = Promise.all([
  fetch(databaseFilesUrl).then((response) => response.blob()),
  loadWasmModule(postgresWasmUrl),
  loadWasmModule(initdbWasmUrl),
]).then(([fsBundle, pgliteWasmModule, initdbWasmModule]) => new PGlite('idb://fitness-tracker', {
  fsBundle,
  pgliteWasmModule,
  initdbWasmModule,
}));
let database;
const form = document.querySelector('#workout-form');
const formMessage = document.querySelector('#form-message');
const list = document.querySelector('#workout-list');
const emptyState = document.querySelector('#empty-state');
const today = new Date();

const localDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatDate = (value) => {
  const dateText = String(value).slice(0, 10);
  const [year, month, day] = dateText.split('-').map(Number);
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(year, month - 1, day));
};

const displayWeek = () => {
  const monday = new Date(today);
  monday.setHours(12, 0, 0, 0);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const format = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });
  document.querySelector('#week-date-range').textContent = `${format.format(monday)} – ${format.format(sunday)}`;
  document.querySelector('#today-label').textContent = new Intl.DateTimeFormat('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  }).format(today);
};

const showMessage = (message = '', kind = '') => {
  formMessage.textContent = message;
  formMessage.className = `form-message${kind ? ` ${kind}` : ''}`;
};

const friendlyError = (error) => {
  const code = error?.code;
  if (code === 'FT001' || code === '23514') return 'Duration must be between 1 and 480 minutes.';
  if (code === 'FT002') return 'Add a name for this workout.';
  if (code === 'FT003') return 'Calories must be zero or greater.';
  if (code === '22007' || code === '22008') return 'Choose a valid workout date.';
  if (code === '22P02') return 'Enter numbers for duration and calories.';
  return 'We couldn’t save that workout. Check the details and try again.';
};

const renderSummary = async () => {
  const { rows } = await database.query('SELECT * FROM current_week_summary()');
  const summary = rows[0];
  document.querySelector('#week-minutes').textContent = Number(summary.total_minutes).toLocaleString();
  document.querySelector('#week-average').textContent = Number(summary.average_minutes).toLocaleString(undefined, { maximumFractionDigits: 1 });
  document.querySelector('#week-calories').textContent = Number(summary.total_calories).toLocaleString(undefined, { maximumFractionDigits: 1 });
  document.querySelector('#week-session-count').textContent = `${summary.session_count} ${Number(summary.session_count) === 1 ? 'workout' : 'workouts'} logged`;
};

const makeWorkoutRow = (workout) => {
  const row = document.createElement('article');
  row.className = 'workout-row';

  const icon = document.createElement('span');
  icon.className = 'workout-icon';
  icon.textContent = workout.workout_name.slice(0, 1).toUpperCase();

  const name = document.createElement('strong');
  name.className = 'workout-name';
  name.textContent = workout.workout_name;

  const detail = document.createElement('span');
  detail.className = 'workout-detail';
  detail.textContent = `${workout.duration_minutes} min`;

  const title = document.createElement('div');
  title.className = 'workout-title-cell';
  title.append(icon, name, detail);

  const date = document.createElement('span');
  date.className = 'workout-date';
  date.textContent = formatDate(workout.workout_date);

  const duration = document.createElement('span');
  duration.className = 'workout-duration';
  duration.textContent = `${workout.duration_minutes} min`;

  const calories = document.createElement('span');
  calories.className = 'workout-calories';
  calories.textContent = `${Number(workout.calories_burned).toLocaleString()} kcal`;

  const remove = document.createElement('button');
  remove.className = 'delete-workout';
  remove.type = 'button';
  remove.setAttribute('aria-label', `Delete ${workout.workout_name}`);
  remove.title = 'Delete workout';
  remove.textContent = '×';
  remove.addEventListener('click', async () => {
    await database.query('DELETE FROM workout_log WHERE workout_id = $1', [workout.workout_id]);
    await refresh();
    showMessage('Workout removed from your history.', 'success');
  });

  row.append(title, date, duration, calories, remove);
  return row;
};

const renderHistory = async () => {
  const { rows } = await database.query(`
    SELECT workout_id, workout_name, workout_date, duration_minutes, calories_burned
    FROM workout_log
    ORDER BY workout_date DESC, workout_id DESC
  `);
  list.replaceChildren(...rows.map(makeWorkoutRow));
  emptyState.hidden = rows.length > 0;
  document.querySelector('#history-count').textContent = `${rows.length} ${rows.length === 1 ? 'session' : 'sessions'}`;
};

async function refresh() {
  await Promise.all([renderSummary(), renderHistory()]);
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  showMessage();
  const formData = new FormData(form);
  const name = String(formData.get('name') ?? '').trim();
  const date = String(formData.get('date') ?? '');
  const duration = Number(formData.get('duration'));
  const caloriesValue = String(formData.get('calories') ?? '').trim();
  const calories = caloriesValue === '' ? 0 : Number(caloriesValue);

  if (!name) return showMessage('Add a name for this workout.', 'error');
  if (!date) return showMessage('Choose the date of your workout.', 'error');
  if (!Number.isInteger(duration) || duration < 1 || duration > 480) {
    return showMessage('Duration must be between 1 and 480 minutes.', 'error');
  }
  if (!Number.isFinite(calories) || calories < 0) {
    return showMessage('Calories must be zero or greater.', 'error');
  }

  const button = form.querySelector('.submit-button');
  button.disabled = true;
  try {
    await database.query('SELECT log_workout($1, $2, $3, $4)', [name, date, duration, calories]);
    form.reset();
    document.querySelector('#workout-date').value = localDate(today);
    await refresh();
    showMessage('Workout saved. Nice work showing up.', 'success');
  } catch (error) {
    showMessage(friendlyError(error), 'error');
  } finally {
    button.disabled = false;
  }
});

const start = async () => {
  displayWeek();
  document.querySelector('#workout-date').value = localDate(today);
  try {
    database = await databaseReady;
    await database.waitReady;
    await database.exec(schema);
    await refresh();
    document.querySelector('.database-status').classList.add('connected');
  } catch (error) {
    console.error(error);
    showMessage('The local workout database could not start. Refresh the page to try again.', 'error');
  }
};

start();
