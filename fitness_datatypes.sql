-- Daily Steps | Datatype - INT
CREATE TEMP TABLE step_data (
    steps INTEGER,
    step_goal INTEGER
);

INSERT INTO step_data VALUES
(8500, 10000),
(9200, 10000),
(11000, 10000);

-- Built In Method 1 - SUM
SELECT SUM(steps) AS total_steps
FROM step_data;

-- Built In Method 2 - ABS
SELECT ABS(step_goal - steps) AS step_difference
FROM step_data;

-- Calories Burned | Datatype - NUMERIC
CREATE TEMP TABLE calorie_data (
    calories NUMERIC(10,3)
);

INSERT INTO calorie_data VALUES
(425.567),
(380.250),
(510.750);

-- Built In Method 3 - ROUND()
SELECT ROUND(calories, 2) AS rounded_calories
FROM calorie_data;

-- Built In Method 4: AVG()
SELECT ROUND(AVG(calories), 2) AS average_calories
FROM calorie_data;


-- Workout Names | Datatype - VARCHAR
CREATE TEMP TABLE workout_data (
    workout_name VARCHAR(100)
);

INSERT INTO workout_data VALUES
('Morning Jog');

-- Built In Method 5: UPPER()
SELECT UPPER(workout_name) AS uppercase_workout
FROM workout_data;

-- Built In Method 6: REPLACE()
SELECT REPLACE(workout_name, 'Jog', 'Run')
AS updated_workout
FROM workout_data;

-- Fitness Goals | Datatype - BOOLEAN 
CREATE TEMP TABLE goal_data (
    goal_completed BOOLEAN
);

INSERT INTO goal_data VALUES
(TRUE),
(FALSE);

-- Built In Method 7: NOT
SELECT goal_completed,
       NOT goal_completed AS reversed_status
FROM goal_data;

-- Built In Method 8: IS TRUE
SELECT goal_completed,
       goal_completed IS TRUE AS goal_achieved
FROM goal_data;