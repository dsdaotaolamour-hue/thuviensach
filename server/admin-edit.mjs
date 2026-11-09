import {randomUUID} from 'node:crypto';
import {assert, text, money, phone, url} from './domain.mjs';
import {one, audit} from './service.mjs';

export async function editTitle(client, actor, input) {
  const previous = await one(client, 'select * from library.book_titles where id=$1 for update', [input.id]);
  assert(previous, 'Không tìm thấy đầu sách.', 404);
  assert(previous.version === input.version, 'Thông tin đã thay đổi. Vui lòng tải lại.', 409);

  if (input.archive) {
    const open = await one(client, `select i.id from library.loan_items i
      join library.book_copies c on c.id=i.copy_id
      where c.title_id=$1 and i.resolution_status<>'RESOLVED' limit 1`, [input.id]);
    assert(!open, 'Đầu sách còn cuốn trên phiếu chưa xử lý xong.');
    const result = await one(client, `update library.book_titles set archived_at=now(),show_on_web=false,
      version=version+1,updated_at=now() where id=$1 returning *`, [input.id]);
    await audit(client, actor, 'ARCHIVE', 'book_titles', input.id, previous, result, text(input.reason, 'Lý do', 2000, true));
    return result;
  }

  if (input.price != null) money(input.price, 'Giá bìa');
  assert(input.pages == null || (Number.isInteger(input.pages) && input.pages > 0), 'Số trang cần lớn hơn 0.');
  assert(input.year == null || (Number.isInteger(input.year) && input.year >= 1000 && input.year <= 9999), 'Năm xuất bản không hợp lệ.');
  assert(['IN_PRINT', 'OUT_OF_PRINT', 'UNKNOWN'].includes(input.publishStatus), 'Tình trạng phát hành không hợp lệ.');
  assert(!input.languageGroup || ['VIETNAMESE', 'FOREIGN'].includes(input.languageGroup), 'Nhóm ngôn ngữ không hợp lệ.');
  const category = await one(client, `insert into library.book_categories(name) values($1)
    on conflict(name) do update set name=excluded.name returning id`, [text(input.category, 'Thể loại', 200, true)]);
  const result = await one(client, `update library.book_titles set title=$2,authors=$3,category_id=$4,
    publisher=$5,language=$6,publication_year=$7,isbn=$8,page_count=$9,cover_price_vnd=$10,
    publication_status=$11,compensation_language_group=$12,cover_url=$13,description=$14,short_description=$14,
    version=version+1,updated_at=now() where id=$1 returning *`, [input.id,
    text(input.title, 'Tên sách', 500, true), text(input.author || '', 'Tác giả', 500), category.id,
    text(input.publisher || '', 'Nhà xuất bản', 300), text(input.language || '', 'Ngôn ngữ', 100),
    input.year, text(input.isbn || '', 'ISBN', 100), input.pages, input.price, input.publishStatus,
    input.languageGroup || null, url(input.coverUrl || ''), text(input.description || '', 'Mô tả', 10000)]);
  await audit(client, actor, 'EDIT', 'book_titles', input.id, previous, result);
  return result;
}

export async function editReader(client, actor, input) {
  const previous = await one(client, 'select * from library.readers where id=$1 for update', [input.id]);
  assert(previous, 'Không tìm thấy độc giả.', 404);
  assert(previous.version === input.version, 'Hồ sơ đã thay đổi. Vui lòng tải lại.', 409);
  let result;
  if (input.archive) {
    const open = await one(client, "select id from library.loans where reader_id=$1 and status<>'COMPLETED' limit 1", [input.id]);
    assert(!open, 'Độc giả còn phiếu hoặc nghĩa vụ chưa hoàn tất.');
    result = await one(client, "update library.readers set archived_at=now(),account_status='Tạm khóa',version=version+1,updated_at=now() where id=$1 returning *", [input.id]);
  } else if (input.status) {
    assert(['Hoạt động', 'Tạm khóa'].includes(input.status), 'Trạng thái không hợp lệ.');
    result = await one(client, 'update library.readers set account_status=$2,version=version+1,updated_at=now() where id=$1 returning *', [input.id, input.status]);
  } else {
    assert(['COMPANY', 'INTERNAL', 'WALK_IN'].includes(input.category), 'Nhóm độc giả không hợp lệ.');
    result = await one(client, `update library.readers set full_name=$2,phone_normalized=$3,phone_display=$4,
      reader_category=$5,policy_group_default=$6,email=$7,address=$8,organization=$9,notes=$10,
      version=version+1,updated_at=now() where id=$1 returning *`, [input.id,
      text(input.name, 'Họ tên', 300, true), phone(input.phone), text(input.phone, 'Điện thoại', 30, true),
      input.category, input.category === 'WALK_IN' ? 'WALK_IN' : 'COMPANY', text(input.email || '', 'Email', 320),
      text(input.address || '', 'Địa chỉ', 1000), text(input.organization || '', 'Cơ sở', 300), text(input.note || '', 'Ghi chú', 3000)]);
  }
  await audit(client, actor, input.archive ? 'ARCHIVE' : 'EDIT', 'readers', input.id, previous, result, input.reason || '');
  return result;
}

export async function saveNote(client, actor, input) {
  const id = input.id || randomUUID();
  assert(/^[a-f0-9-]{36}$/i.test(id), 'Mã ghi chú không hợp lệ.');
  const key = 'admin_note_' + id;
  const previous = await one(client, 'select value from library.system_settings where key=$1 for update', [key]);
  if (input.id) assert(previous && previous.value.version === input.version, 'Ghi chú đã thay đổi.', 409);
  const value = {
    id, title: text(input.title, 'Tiêu đề', 300, true), body: text(input.body || '', 'Nội dung', 10000),
    done: input.done === true, archived: input.archive === true,
    version: (previous?.value.version || 0) + 1, updatedAt: new Date().toISOString()
  };
  await client.query(`insert into library.system_settings(key,value) values($1,$2)
    on conflict(key) do update set value=excluded.value`, [key, JSON.stringify(value)]);
  await audit(client, actor, input.archive ? 'ARCHIVE_NOTE' : 'SAVE_NOTE', 'system_settings', key, previous?.value, value);
  return value;
}
