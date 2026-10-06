-- Daily Steps | Datatype - INT
CREATE TEMP TABLE steps (
    step INTEGER,
    goal INTEGER
);

INSERT INTO steps VALUES
(8500, 10000), (9200, 10000), (11000, 10000);

-- Method 1 - SUM: gets sum of values
SELECT SUM(step) AS steptotal
FROM steps;

-- Method 2 - ABS: returns absolute positive value of an expression
SELECT ABS(goal - step) AS newsteps
FROM steps;

-- Calories Burned | Datatype - NUMERIC
CREATE TEMP TABLE caloriecount (
    calories NUMERIC(10,3)
);

INSERT INTO caloriecount VALUES
(425.5), (300.255), (500.75);

-- Method 3 - ROUND(): rounds value to specific decimal place
SELECT ROUND(calories, 2) AS rounded
FROM caloriecount;

-- Method 4 - AVG(): gets average of numeric columns
SELECT ROUND(AVG(calories), 2) AS calavg
FROM caloriecount;


-- Workout Names | Datatype - VARCHAR
CREATE TEMP TABLE workouts (
    workouttype VARCHAR(100)
);

INSERT INTO workouts VALUES
('Morning Jog');

-- Method 5 - UPPER(): converts string to uppercase
SELECT UPPER(workouttype) AS workoutupper
FROM workouts;

-- Method 6 - REPLACE(): replaces string/substring with new one
SELECT REPLACE(workouttype, 'Jog', 'Run')
AS workoutnew
FROM workouts;

-- Fitness Goals | Datatype - BOOLEAN 
CREATE TEMP TABLE goals (
    goalreached BOOLEAN );

INSERT INTO goals VALUES
(TRUE), (FALSE);

-- Method 7 - NOT: opposite of current state
SELECT goalreached,
       NOT goalreached AS reversed
FROM goals;

-- Method 8 - IS TRUE: looks to see if true
SELECT goalreached,
       goalreached IS TRUE AS goaldone
FROM goals;
