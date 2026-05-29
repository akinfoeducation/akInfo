-- Dev convenience: change admin login to username=admin / password=admin
-- password_hash = bcrypt('admin', cost=10)
UPDATE users
SET username      = 'admin',
    password_hash = '$2b$10$vmHbpiaGVnFtNMq12hy/j.ezu3Db2dOv8juh47I4wFQmt3ZBFB9Iy'
WHERE username = 'superadmin'
  AND institute_id = 1;
