INSERT INTO interest_modules(code, name, description, sort_order, enabled) VALUES
('almanac','传统黄历','农历、星期与二十四节气',0,TRUE),
('quote','每日名言','每天读一句原创短句',1,TRUE),
('note','日程备注','按日期保存私人的备注与待办',2,TRUE),
('zodiac','星座','星座设置与娱乐演示',3,TRUE),
('music','音乐','即将上线',4,TRUE),
('film','电影','即将上线',5,TRUE),
('history','历史上的今天','即将上线',6,TRUE),
('weather','天气','天气数据源尚未配置',7,TRUE);
INSERT INTO daily_contents(content_date,module_code,variant_key,title,content_json,source_name,license_note,published) VALUES
('2026-11-21','quote','default','每日名言','{"text":"给今天留一小段空白，写点自己喜欢的。"}','有点日历原创','项目原创短句，可用于有点日历卡片',TRUE);
