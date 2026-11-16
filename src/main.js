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
let weeklyMinutes = 0;
let goalTarget = 0;
const form = document.querySelector('#workout-form');
const formMessage = document.querySelector('#form-message');
const list = document.querySelector('#workout-list');
const emptyState = document.querySelector('#empty-state');
const stepsForm = document.querySelector('#steps-form');
const stepsFields = stepsForm.querySelector('fieldset');
const stepsDate = document.querySelector('#steps-date');
const stepCount = document.querySelector('#step-count');
const stepsButton = stepsForm.querySelector('button');
const stepsMessage = document.querySelector('#steps-message');
const goalForm = document.querySelector('#goal-form');
const goalFields = goalForm.querySelector('fieldset');
const goalInput = document.querySelector('#goal-target');
const goalMessage = document.querySelector('#goal-message');
const goalProgress = document.querySelector('#goal-progress');
const goalProgressText = document.querySelector('#goal-progress-text');
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

const showMessage = (element, message = '', kind = '') => {
  element.textContent = message;
  element.className = `form-message${kind ? ` ${kind}` : ''}`;
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

const renderGoalProgress = () => {
  if (!goalTarget) return;

  goalProgress.hidden = false;
  goalProgress.max = goalTarget;
  goalProgress.value = Math.min(weeklyMinutes, goalTarget);
  const progress = `${weeklyMinutes.toLocaleString()} of ${goalTarget.toLocaleString()} min this week`;
  goalProgressText.textContent = weeklyMinutes >= goalTarget ? `${progress} · Goal reached` : progress;
};

const renderSummary = async () => {
  const { rows } = await database.query('SELECT * FROM current_week_summary()');
  const summary = rows[0];
  weeklyMinutes = Number(summary.total_minutes);
  document.querySelector('#week-minutes').textContent = weeklyMinutes.toLocaleString();
  document.querySelector('#week-average').textContent = Number(summary.average_minutes).toLocaleString(undefined, { maximumFractionDigits: 1 });
  document.querySelector('#week-calories').textContent = Number(summary.total_calories).toLocaleString(undefined, { maximumFractionDigits: 1 });
  document.querySelector('#week-session-count').textContent = `${summary.session_count} ${Number(summary.session_count) === 1 ? 'workout' : 'workouts'} logged`;
  renderGoalProgress();
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
    showMessage(formMessage, 'Workout removed from your history.', 'success');
  });

  row.append(title, date, duration, calories, remove);
  return row;
};

const renderHistory = async () => {
  const { rows } = await database.query(`
    SELECT workout_id, workout_name, workout_date::text AS workout_date, duration_minutes, calories_burned
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
  showMessage(formMessage);
  const formData = new FormData(form);
  const name = String(formData.get('name') ?? '').trim();
  const date = String(formData.get('date') ?? '');
  const duration = Number(formData.get('duration'));
  const caloriesValue = String(formData.get('calories') ?? '').trim();
  const calories = caloriesValue === '' ? 0 : Number(caloriesValue);

  if (!name) return showMessage(formMessage, 'Add a name for this workout.', 'error');
  if (!date) return showMessage(formMessage, 'Choose the date of your workout.', 'error');
  if (!Number.isInteger(duration) || duration < 1 || duration > 480) {
    return showMessage(formMessage, 'Duration must be between 1 and 480 minutes.', 'error');
  }
  if (!Number.isFinite(calories) || calories < 0) {
    return showMessage(formMessage, 'Calories must be zero or greater.', 'error');
  }

  const button = form.querySelector('.submit-button');
  button.disabled = true;
  try {
    await database.query('SELECT log_workout($1, $2, $3, $4)', [name, date, duration, calories]);
    form.reset();
    document.querySelector('#workout-date').value = localDate(today);
    await refresh();
    showMessage(formMessage, 'Workout saved. Nice work showing up.', 'success');
  } catch (error) {
    showMessage(formMessage, friendlyError(error), 'error');
  } finally {
    button.disabled = false;
  }
});

const loadSteps = async () => {
  const date = stepsDate.value;
  stepCount.value = '';
  showMessage(stepsMessage);
  stepCount.disabled = true;
  stepsButton.disabled = true;
  if (!date) return;

  try {
    const { rows } = await database.query('SELECT step_count FROM daily_steps WHERE step_date = $1', [date]);
    if (stepsDate.value === date) stepCount.value = rows[0]?.step_count ?? '';
  } catch {
    if (stepsDate.value === date) {
      showMessage(stepsMessage, 'Couldn’t load steps for this date. Try choosing it again.', 'error');
    }
  } finally {
    if (stepsDate.value === date) {
      stepCount.disabled = false;
      stepsButton.disabled = false;
    }
  }
};

stepsDate.addEventListener('change', loadSteps);

stepsForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  showMessage(stepsMessage);
  stepsFields.disabled = true;
  try {
    await database.query(`
      INSERT INTO daily_steps (step_date, step_count)
      VALUES ($1, $2)
      ON CONFLICT (step_date) DO UPDATE SET step_count = EXCLUDED.step_count
    `, [stepsDate.value, stepCount.valueAsNumber]);
    showMessage(stepsMessage, 'Steps saved.');
  } catch {
    showMessage(stepsMessage, 'Couldn’t save steps. Try again.', 'error');
  } finally {
    stepsFields.disabled = false;
  }
});

const loadGoal = async () => {
  const { rows } = await database.query('SELECT target_minutes FROM weekly_workout_goal');
  goalTarget = rows[0]?.target_minutes ?? 0;
  goalInput.value = goalTarget || '';
  renderGoalProgress();
  goalFields.disabled = false;
};

goalForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const target = goalInput.valueAsNumber;
  showMessage(goalMessage);
  goalFields.disabled = true;
  try {
    await database.query(`
      INSERT INTO weekly_workout_goal (target_minutes)
      VALUES ($1)
      ON CONFLICT (singleton) DO UPDATE SET target_minutes = EXCLUDED.target_minutes
    `, [target]);
    goalTarget = target;
    renderGoalProgress();
    showMessage(goalMessage, 'Goal saved.');
  } catch {
    showMessage(goalMessage, 'Couldn’t save the goal. Try again.', 'error');
  } finally {
    goalFields.disabled = false;
  }
});

const start = async () => {
  displayWeek();
  stepsDate.value = localDate(today);
  document.querySelector('#workout-date').value = localDate(today);
  try {
    database = await databaseReady;
    await database.waitReady;
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    await database.query("SELECT set_config('TimeZone', $1, false)", [timeZone]);
    await database.exec(schema);
    await Promise.all([refresh(), loadSteps(), loadGoal()]);
    stepsFields.disabled = false;
    document.querySelector('.database-status').classList.add('connected');
  } catch (error) {
    console.error(error);
    showMessage(formMessage, 'The local workout database could not start. Refresh the page to try again.', 'error');
  }
};

start();
