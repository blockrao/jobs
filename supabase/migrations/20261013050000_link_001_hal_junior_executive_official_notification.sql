-- LINK-001 (ledger A-087): store the official notification for the HAL Junior Executive
-- (Short Term Basis) recruitment, id 1686, and its nine posts (1545 to 1553).
--
-- The record held HAL's home page, https://www.hal-india.co.in, as its notification link.
-- The detailed advertisement, Advt. No. HAL/CHRC-TAR/RECT-03/2026, is published by HAL at the
-- address below (read 2026-10-13: the advertisement number, 150 vacancies, the discipline-wise
-- split, the dates, the fee and the age limits match the record). Applications close
-- 2026-10-17, 14:00 IST.
--
-- The application link is not changed: the advertisement (section 10.2) says to apply through
-- the Careers section of www.hal-india.co.in, which is what the record holds.
--
-- Guarded on the old value, so it only replaces the home-page link.

UPDATE recruitments
SET official_notification_url = 'https://hal-india.co.in/backend//wp-content/uploads/career/Detailed%20Advt%20JESTB%2007-10-2026_1791362564.pdf',
    updated_at = now()
WHERE id = 1686
  AND official_notification_url = 'https://www.hal-india.co.in';

UPDATE posts
SET "officialSourceUrl" = 'https://hal-india.co.in/backend//wp-content/uploads/career/Detailed%20Advt%20JESTB%2007-10-2026_1791362564.pdf'
WHERE id BETWEEN 1545 AND 1553
  AND recruitment_id = 1686
  AND "officialSourceUrl" = 'https://www.hal-india.co.in';
