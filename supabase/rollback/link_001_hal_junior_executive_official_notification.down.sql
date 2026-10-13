-- Rollback for 20261013050000_link_001_hal_junior_executive_official_notification.sql.
-- Restores the home-page link the record held before. Guarded on the new value.

UPDATE recruitments
SET official_notification_url = 'https://www.hal-india.co.in'
WHERE id = 1686
  AND official_notification_url = 'https://hal-india.co.in/backend//wp-content/uploads/career/Detailed%20Advt%20JESTB%2007-10-2026_1791362564.pdf';

UPDATE posts
SET "officialSourceUrl" = 'https://www.hal-india.co.in'
WHERE id BETWEEN 1545 AND 1553
  AND recruitment_id = 1686
  AND "officialSourceUrl" = 'https://hal-india.co.in/backend//wp-content/uploads/career/Detailed%20Advt%20JESTB%2007-10-2026_1791362564.pdf';
