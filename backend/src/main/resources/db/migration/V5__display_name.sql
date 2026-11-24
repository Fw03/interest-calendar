UPDATE daily_contents
SET source_name = '日有所喜原创'
WHERE source_name = '有点日历原创';

UPDATE daily_contents
SET license_note = '项目原创短句，可用于日有所喜卡片'
WHERE license_note = '项目原创短句，可用于有点日历卡片';

UPDATE share_records
SET public_payload_json = REPLACE(public_payload_json,
    '"sourceName":"有点日历原创"', '"sourceName":"日有所喜原创"')
WHERE public_payload_json LIKE '%"sourceName":"有点日历原创"%';
