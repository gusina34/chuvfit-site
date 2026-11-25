/**
 * Google Apps Script для сайта chuv.fit: принимает анкеты и меню с сайта и записывает их в Google Таблицу.
 *
 * Листы создаются сами:
 *   «Анкеты» — одна строка на каждую отправленную анкету;
 *   «Меню»   — одна строка на каждое меню, отправленное из калькулятора.
 *
 * Настройка (один раз):
 * 1. Создайте новую Google Таблицу, например «Сайт — заявки».
 * 2. Расширения → Apps Script → удалите всё и вставьте этот код → 💾.
 * 3. Развернуть → Новое развёртывание → тип «Веб-приложение»:
 *    «Выполнять как: я», «У кого есть доступ: все» → Развернуть → разрешите доступ.
 * 4. Скопируйте ссылку, которая заканчивается на /exec, и вставьте её в assets/config.js (scriptUrl).
 *
 * Уведомления в Telegram (по желанию): Настройки проекта → Свойства скрипта →
 *   BOT_TOKEN = токен бота из @BotFather, CHAT_ID = ваш числовой id в Telegram (узнать: @userinfobot).
 *   Сначала напишите своему боту /start, иначе он не сможет вам писать.
 *
 * После изменений кода: Развернуть → Управление развёртываниями → ✏️ → Версия: новая → Развернуть.
 */

const HEALTH = [
  ['A1', 'сердце / давление'], ['A2', 'боль в груди'], ['A3', 'головокружения / обмороки'],
  ['A4', 'хроническое заболевание'], ['A5', 'лекарства постоянно'], ['A6', 'только под наблюдением врача'],
  ['B1', 'боль в суставах / спине'], ['B2', 'травмы / операции за год'], ['B3', 'грыжи / протрузии'],
  ['B4', 'остеопороз'], ['B5', 'варикоз'], ['B6', 'подтекание мочи'], ['B7', 'диастаз'],
  ['B8', 'беременность / роды < года'], ['B9', 'менопауза']
];
const RED = ['A1', 'A2', 'A3', 'A6', 'B8']; // «да» здесь — нужен допуск врача
const TEXTS = [
  ['details', 'пояснения к здоровью'], ['place', 'где тренируется'], ['inv', 'инвентарь'], ['exp', 'опыт тренировок'],
  ['steps', 'шагов в день'], ['food', 'питание (вчера)'], ['water', 'вода'], ['allerg', 'аллергии / не ест'],
  ['sweets', 'сладкое, фастфуд, алкоголь'], ['counted', 'считала КБЖУ'], ['goal21', 'цель на 21 день'],
  ['goal90', 'цель на 3 месяца'], ['why', 'что изменится'], ['block', 'что мешало'], ['time', 'время на тренировки'],
  ['sure', 'уверенность 1–10'], ['stage', 'стадия готовности'], ['sleep', 'сон'], ['stress', 'стресс 1–10'],
  ['work', 'работа'], ['support', 'поддержка близких']
];
const ANKETA_HEADERS = ['дата', 'имя', 'контакт', 'возраст', 'рост', 'вес', 'НУЖЕН ДОПУСК ВРАЧА']
  .concat(HEALTH.map(h => h[1]), TEXTS.map(t => t[1]), ['статус']);
const MENU_HEADERS = ['дата', 'имя', 'контакт', 'возраст', 'рост', 'вес', 'цель', 'норма', 'ккал', 'белки, г', 'жиры, г', 'углеводы, г', 'меню', 'статус'];
const MAX_PER_HOUR = 60; // защита от спама: не больше 60 заявок в час

function doPost(e) {
  let body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return json_({ error: 'bad request' });
  }
  const d = body.data || {};
  if (!text_(d.name) || !text_(d.contact)) return json_({ error: 'no contact' });
  if (!underLimit_()) return json_({ error: 'too many' });

  if (body.type === 'anketa') return json_(saveAnketa_(d));
  if (body.type === 'menu') return json_(saveMenu_(d));
  return json_({ error: 'unknown type' });
}

function doGet() {
  return json_({ ok: true, info: 'Сайт chuv.fit: приём анкет работает' });
}

function saveAnketa_(d) {
  const red = RED.some(k => d[k] === 'да');
  const row = [new Date(), text_(d.name, 100), text_(d.contact, 100), number_(d.age, 10, 100), number_(d.height, 100, 250),
    number_(d.weight, 25, 300), red ? 'ДА' : 'нет']
    .concat(HEALTH.map(h => (d[h[0]] === 'да' || d[h[0]] === 'нет') ? d[h[0]] : ''))
    .concat(TEXTS.map(t => text_(d[t[0]], 1000)))
    .concat(['новая']);
  withLock_(() => sheet_('Анкеты', ANKETA_HEADERS).appendRow(row));
  notify_('📝 Новая анкета: ' + row[1] + ', ' + row[2] + (red ? '\n⚠️ Нужен допуск врача' : ''));
  return { ok: true };
}

function saveMenu_(d) {
  const row = [new Date(), text_(d.name, 100), text_(d.contact, 100), number_(d.age, 10, 100), number_(d.height, 100, 250),
    number_(d.weight, 25, 300), text_(d.goal, 100), text_(d.norm, 100), number_(d.kcal, 0, 10000), number_(d.p, 0, 1000),
    number_(d.f, 0, 1000), number_(d.c, 0, 2000), text_(d.menu, 3000), 'новое'];
  withLock_(() => sheet_('Меню', MENU_HEADERS).appendRow(row));
  notify_('🍽 Новое меню на проверку: ' + row[1] + ', ' + row[2] + ' — ' + row[8] + ' ккал');
  return { ok: true };
}

// ---- Служебное ----

function sheet_(name, headers) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  }
  return sheet;
}

function underLimit_() {
  const cache = CacheService.getScriptCache();
  const key = 'count_' + Utilities.formatDate(new Date(), 'UTC', 'yyyyMMddHH');
  const count = Number(cache.get(key) || 0) + 1;
  cache.put(key, String(count), 3600);
  return count <= MAX_PER_HOUR;
}

function notify_(message) {
  const props = PropertiesService.getScriptProperties();
  const token = props.getProperty('BOT_TOKEN');
  const chat = props.getProperty('CHAT_ID');
  if (!token || !chat) return;
  try {
    UrlFetchApp.fetch('https://api.telegram.org/bot' + token + '/sendMessage', {
      method: 'post', contentType: 'application/json', muteHttpExceptions: true,
      payload: JSON.stringify({ chat_id: chat, text: message + '\n\nОткройте таблицу «Сайт — заявки».' })
    });
  } catch (err) { /* уведомление не обязательно */ }
}

function withLock_(fn) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try { fn(); } finally { lock.releaseLock(); }
}

// Текст: обрезаем длину и защищаем от формул (= + - @ в начале таблица посчитала бы формулой)
function text_(value, max) {
  const s = String(value == null ? '' : value).trim().slice(0, max || 200);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function number_(value, min, max) {
  const n = Number(String(value == null ? '' : value).replace(',', '.'));
  return value !== '' && isFinite(n) && n >= min && n <= max ? n : '';
}

function json_(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}
