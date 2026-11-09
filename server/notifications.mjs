import {assert, today} from './domain.mjs';
import {one, rows} from './service.mjs';

const defaults = {backup: true, books: true, due: true, backupDay: 1, booksDay: 5, dueDays: 7};
const dayMs = 86400000;

function weeklyDate(day, date) {
  const time = Date.parse(date);
  const elapsed = (new Date(time).getUTCDay() - day + 7) % 7;
  return new Date(time - elapsed * dayMs).toISOString().slice(0, 10);
}

export async function notificationInbox(client, actor, input = {}) {
  const key = 'notification_inbox_' + actor;
  await client.query("insert into library.system_settings(key,value) values($1,'{}') on conflict do nothing", [key]);
  const {value} = await one(client, 'select value from library.system_settings where key=$1 for update', [key]);
  let preferences = {...defaults, ...value.preferences};
  if (input.preferences) {
    const next = input.preferences;
    for (const kind of ['backup', 'books', 'due']) assert(typeof next[kind] === 'boolean', 'Cài đặt thông báo không hợp lệ.');
    for (const field of ['backupDay', 'booksDay']) assert(Number.isInteger(next[field]) && next[field] >= 0 && next[field] <= 6, 'Ngày nhắc hằng tuần không hợp lệ.');
    assert(Number.isInteger(next.dueDays) && next.dueDays >= 1 && next.dueDays <= 30, 'Chọn nhắc trước từ 1 đến 30 ngày.');
    preferences = Object.fromEntries(Object.keys(defaults).map(field => [field, next[field]]));
  }
  const date = today();
  const active = [];
  for (const kind of ['backup', 'books']) {
    if (!preferences[kind]) continue;
    const scheduled = weeklyDate(preferences[kind + 'Day'], date);
    active.push({id: kind + ':' + scheduled, kind, date: scheduled,
      title: kind === 'backup' ? 'Sao lưu dữ liệu thư viện' : 'Kiểm tra và cập nhật kho sách',
      detail: kind === 'backup'
        ? 'Tải bản sao lưu từ Cài đặt và lưu ở nơi riêng có bảo mật. Đây là lời nhắc sao lưu thủ công.'
        : 'Kiểm tra số lượng, thông tin và trạng thái của các đầu sách trong tuần.'});
  }
  if (preferences.due) {
    const until = new Date(Date.parse(date) + preferences.dueDays * dayMs).toISOString().slice(0, 10);
    const items = await rows(client, `select i.id, i.due_on, l.code as loan_code, c.code as copy_code, t.title, r.full_name
      from library.loan_items i join library.loans l on l.id=i.loan_id
      join library.readers r on r.id=l.reader_id join library.book_copies c on c.id=i.copy_id
      join library.book_titles t on t.id=c.title_id
      where i.resolution_status='OPEN' and i.due_on <= $1::date order by i.due_on, i.id`, [until]);
    for (const item of items) active.push({
      id: 'due:' + item.id + ':' + item.due_on, kind: 'due', date: item.due_on,
      title: 'Thu sách · ' + item.loan_code,
      detail: item.full_name + ' · ' + item.title + ' (' + item.copy_code + '). Hạn trả ' + item.due_on.split('-').reverse().join('/') + '.',
      loanCode: item.loan_code
    });
  }
  const inbox = new Map((value.items || []).map(item => [item.id, item]));
  const activeIds = new Set(active.map(item => item.id));
  for (const item of active) inbox.set(item.id, {...item, read: inbox.get(item.id)?.read === true});
  if (input.readId !== undefined) {
    assert(typeof input.readId === 'string' && inbox.has(input.readId), 'Không tìm thấy thông báo.', 404);
    inbox.get(input.readId).read = true;
  }
  // Keep unread reminders until opened. Keep read markers for still-active reminders.
  const items = [...inbox.values()].filter(item => !item.read || activeIds.has(item.id));
  const stored = {preferences, items};
  if (JSON.stringify(stored) !== JSON.stringify(value)) {
    await client.query('update library.system_settings set value=$2 where key=$1', [key, JSON.stringify(stored)]);
  }
  return {preferences, items: items.filter(item => preferences[item.kind])
    .sort((a, b) => Number(a.read) - Number(b.read) || b.date.localeCompare(a.date))};
}
