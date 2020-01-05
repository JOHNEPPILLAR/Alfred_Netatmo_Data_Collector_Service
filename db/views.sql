CREATE OR REPLACE VIEW vw_battery_data AS
SELECT last("time", "time") AS "time", last(battery, "time") AS battery, location, 'netatmo' AS device
FROM netatmo
WHERE time > NOW() - interval '1 hour' 
GROUP BY location