-- Run once on existing databases to add direct Home Class link for Course_classes
ALTER TABLE Course_classes
ADD COLUMN IF NOT EXISTS home_class_id INTEGER REFERENCES Home_class(id) ON DELETE SET NULL;
