-- Create a mock route
INSERT INTO profiles (id, full_name, role) VALUES ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '王司机', 'driver') ON CONFLICT (id) DO NOTHING;

INSERT INTO transport_routes (id, driver_id, route_name, execution_date) 
VALUES (1, 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Avondale 早上班车', CURRENT_DATE) 
ON CONFLICT DO NOTHING;

-- Insert passengers (we assume there are some students in students_info)
INSERT INTO transport_passengers (route_id, student_id, pickup_time, pickup_location, drop_off_location, status)
SELECT 
  1, 
  student_id, 
  '07:30:00', 
  '4 Tiverton Road', 
  'Avondale College', 
  'pending'
FROM students_info
LIMIT 5
ON CONFLICT DO NOTHING;
