-- Workout Durations | Data Structure 1 - ARRAY
DO $$
DECLARE
    workout_minutes INTEGER[] := ARRAY[30, 45, 20, 60, 40];

    -- Workout Details | Data Structure 2 - RECORD
    workout RECORD;

    current_minutes INTEGER;
    total_minutes INTEGER := 0;
    workout_number INTEGER := 0;

    average_minutes NUMERIC;
    longest_workout INTEGER;
    shortest_workout INTEGER;

BEGIN

    -- Control Structure 1 - FOREACH LOOP
    FOREACH current_minutes IN ARRAY workout_minutes
    LOOP
        workout_number := workout_number + 1;
        total_minutes := total_minutes + current_minutes;

        -- Control Structure 2 - IF / ELSIF / ELSE
        IF current_minutes >= 60 THEN
            RAISE NOTICE 'Workout %: % minutes - Long Workout',
                workout_number, current_minutes;

        ELSIF current_minutes >= 30 THEN
            RAISE NOTICE 'Workout %: % minutes - Medium Workout',
                workout_number, current_minutes;

        ELSE
            RAISE NOTICE 'Workout %: % minutes - Short Workout',
                workout_number, current_minutes;
        END IF;

    END LOOP;


    -- Workout Statistics
    average_minutes :=
        total_minutes::NUMERIC / array_length(workout_minutes, 1);

    longest_workout :=
        (SELECT MAX(value)
        FROM unnest(workout_minutes) AS value);

    shortest_workout :=
        (SELECT MIN(value)
        FROM unnest(workout_minutes) AS value);


    -- Display Workout Summary
    RAISE NOTICE 'Number of workouts: %',
        array_length(workout_minutes, 1);

    RAISE NOTICE 'Total workout time: % minutes',
        total_minutes;

    RAISE NOTICE 'Average workout time: % minutes',
        ROUND(average_minutes, 2);

    RAISE NOTICE 'Longest workout: % minutes',
        longest_workout;

    RAISE NOTICE 'Shortest workout: % minutes',
        shortest_workout;


    -- Store Workout Information | RECORD
    SELECT
        'Running' AS exercise_name,
        45 AS duration_minutes,
        350 AS calories_burned
    INTO workout;


    -- Display Workout Record
    RAISE NOTICE 'Exercise: %',
        workout.exercise_name;

    RAISE NOTICE 'Duration: % minutes',
        workout.duration_minutes;

    RAISE NOTICE 'Calories burned: %',
        workout.calories_burned;

END $$;