import { DailyContent, InterestCode, Preferences } from '../types';
import { dayInfo } from '../utils/date';

export const modules: { code: InterestCode; title: string; mark: string; description: string }[] = [
  { code: 'zodiac', title: '星座', mark: '✦', description: '星座设置与娱乐演示' },
  { code: 'almanac', title: '传统黄历', mark: '历', description: '农历、星期与二十四节气' },
  { code: 'quote', title: '每日名言', mark: '“', description: '每天读一句原创短句' },
  { code: 'note', title: '日程备注', mark: '记', description: '按日期保存私人的备注与待办' },
  { code: 'music', title: '音乐', mark: '♪', description: '即将上线' },
  { code: 'film', title: '电影', mark: '影', description: '即将上线' },
  { code: 'history', title: '历史上的今天', mark: '史', description: '即将上线' },
  { code: 'weather', title: '天气', mark: '☁', description: '天气数据源尚未配置' },
];

export const signs = ['未设置', '白羊座', '金牛座', '双子座', '巨蟹座', '狮子座', '处女座', '天秤座', '天蝎座', '射手座', '摩羯座', '水瓶座', '双鱼座'];
export const defaultInterests: InterestCode[] = ['almanac', 'quote', 'note', 'zodiac'];

const quotes = [
  '给今天留一小段空白，写点自己喜欢的。',
  '慢一点也可以，日子会记得每一步。',
  '把目光收回来，看看手上这一件小事。',
  '给喜欢的事留个位置，哪怕只有十分钟。',
];

export function localDaily(date: string, preferences: Preferences) {
  const info = dayInfo(date);
  return preferences.selectedInterests.map((code): DailyContent => {
    const module = modules.find((item) => item.code === code)!;
    const card = (text: string, availability: DailyContent['availability'], sourceName = '') =>
      ({ code, title: module.title, payload: { text }, availability, isDemo: availability === 'demo', sourceName });
    switch (code) {
      case 'quote': return card(quotes[((info?.day || 1) - 1) % quotes.length], 'available', '日有所喜原创');
      case 'almanac': return card(info ? [info.weekdayLabel, '农历 ' + info.lunarLabel, info.solarTerm].filter(Boolean).join(' · ') : '暂无历法信息', 'available', 'lunar-javascript');
      case 'zodiac': return preferences.zodiacSign
        ? card(preferences.zodiacSign + ' · 今天可以给喜欢的事情留一点时间。', 'demo', '娱乐演示')
        : card('在「我的」选择星座，查看娱乐演示。', 'unconfigured');
      case 'note': return card('', 'available');
      case 'weather': return card(module.description, 'unconfigured');
      default: return card('即将上线', 'coming-soon');
    }
  });
}

export function cardsFor(date: string, preferences: Preferences, remote: DailyContent[] = []) {
  return localDaily(date, preferences).map((local) => {
    const card = local.code === 'note' || local.code === 'zodiac' ? local : remote.find((item) => item.code === local.code) || local;
    return { ...card, mark: modules.find((item) => item.code === card.code)!.mark };
  });
}
