// Isolated data for UI tests and the localhost-only preview server.
export function adminFixture() {
  const uuid = index => `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`;
  const state = {
    today: '2026-11-07',
    settings: {libraryName: 'Thư viện sách Ngành Spa', address: '', hotline: '', zaloOaId: '', termsOnPrint: 'Điều khoản kiểm thử'},
    policy: {company_term_months: 12, walkin_term_months: 3, walkin_deposit_vnd: 500000, late_fee_vnd_per_day: 5000, replacement_technical_fee_vnd: 20000, out_of_print_multiplier: 3},
    book_categories: [{id: uuid(1), name: 'Chăm sóc da'}, {id: uuid(2), name: 'Vận hành Spa'}],
    book_titles: [], book_copies: [], readers: [], loans: [], loan_items: [],
    wallets: [{id: uuid(80), code: 'V01', display_name: 'Momo', type: 'MOMO', opening_balance_vnd: 0, active: true},
      {id: uuid(81), code: 'V02', display_name: 'Ngân hàng', type: 'BANK', opening_balance_vnd: 0, active: true},
      {id: uuid(82), code: 'V03', display_name: 'Tiền mặt', type: 'CASH', opening_balance_vnd: 0, active: true}],
    financial_transactions: [], cash_entries: [], deposit_entries: [], charges: [], charge_allocations: [],
    collection_contacts: [], print_documents: [], content_links: [], reminder_events: [], audit_logs: [], notes: []
  };
  const names = ['Chăm sóc da và hàng rào bảo vệ', 'Vận hành Spa từ nền tảng', 'Dinh dưỡng và làn da', 'Kỹ năng tư vấn khách hàng'];
  for (let index = 0; index < names.length; index++) {
    const book = {id: uuid(10 + index), code: 'DS00' + (index + 1), title: names[index], authors: 'Tác giả kiểm thử', category_id: uuid(index % 2 + 1),
      publisher: 'Nhà xuất bản kiểm thử', language: 'Tiếng Việt', publication_year: 2026, isbn: '00123456789' + index,
      cover_price_vnd: 320000, page_count: 240, publication_status: 'IN_PRINT', compensation_language_group: 'VIETNAMESE',
      cover_url: '', description: 'Nội dung dùng để kiểm tra bố cục và khả năng hiển thị thông tin sách.\n\nĐây là dữ liệu thử nghiệm trong bản xem trước cục bộ.',
      short_description: 'Tài liệu thử nghiệm giao diện', show_on_web: true, version: 1, archived_at: null};
    state.book_titles.push(book);
    for (let copy = 0; copy < 3; copy++) state.book_copies.push({id: uuid(30 + index * 3 + copy), code: book.code + '-00' + (copy + 1),
      title_id: book.id, status: 'READY', physical_condition: 'Tốt', shelf_location: 'Kệ A' + (index + 1), condition_note: '', version: 1});
  }
  state.readers = ['Nguyễn Minh Anh', 'Trần Hoàng Hà', 'Lê Khánh Linh'].map((name, index) => ({id: uuid(50 + index), code: 'DG00' + (index + 1), full_name: name,
    phone_display: '090000000' + index, phone_normalized: '090000000' + index, email: 'reader' + index + '@example.test',
    reader_category: index ? 'COMPANY' : 'WALK_IN', account_status: 'Hoạt động', address: 'Địa chỉ kiểm thử', organization: 'Spa kiểm thử', notes: 'Hồ sơ dùng để kiểm thử', version: 1}));
  for (let index = 0; index < 2; index++) {
    const reader = state.readers[index];
    const copy = state.book_copies[index];
    const title = state.book_titles.find(book => book.id === copy.title_id);
    const loan = {id: uuid(60 + index), code: 'PM00' + (index + 1), reader_id: reader.id, borrowed_on: '2026-08-01',
      due_on: index ? '2027-08-01' : '2026-11-01', status: 'ACTIVE', reader_snapshot: {...reader}, notes: ''};
    state.loans.push(loan);
    state.loan_items.push({id: uuid(70 + index), loan_id: loan.id, copy_id: copy.id, title_snapshot: {...title},
      due_on: loan.due_on, resolution_status: 'OPEN', condition_out: 'Tốt', condition_out_note: 'Sách nguyên vẹn',
      deposit_wallet_id: index ? null : uuid(80), deposit_required_vnd: index ? 0 : 500000, version: 1});
    copy.status = 'ON_LOAN';
  }
  state.financial_transactions.push({id: uuid(90), code: 'GD001', reader_id: uuid(50), loan_id: uuid(60), type: 'COLLECT_DEPOSIT', amount_vnd: 500000, occurred_at: '2026-08-01T03:00:00Z', reason: 'Thu cọc kiểm thử'});
  state.deposit_entries.push({transaction_id: uuid(90), loan_item_id: uuid(70), direction: 'INCREASE', amount_vnd: 500000});
  state.cash_entries.push({transaction_id: uuid(90), wallet_id: uuid(80), direction: 'IN', amount_vnd: 500000});
  state.audit_logs.push({id: uuid(95), occurred_at: '2026-11-07T03:00:00Z', action: 'ISSUE', target_table: 'loans', target_id: uuid(60), reason: 'Nhật ký thử nghiệm'});
  state.notes.push({id: uuid(96), title: 'Kiểm kê sách tuần này', body: 'Kiểm tra tình trạng các cuốn ở kệ A.\nDữ liệu thử nghiệm.', done: false, version: 1, updatedAt: '2026-11-07T03:00:00Z'});
  return state;
}
