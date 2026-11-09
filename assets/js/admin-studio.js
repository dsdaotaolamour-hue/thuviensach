/* Admin presentation built from the supplied Lamour screen designs. */
const studio = {
  tab: 'dashboard', bookId: null, readerId: null, readerTab: 'all',
  loanRange: null, calendarMonth: null, rangeStart: null, dialogResolve: null, lastFocus: null
};
const studioTitles = {
  dashboard: 'Tổng quan', analytics: 'Thống kê', books: 'Kho sách', readers: 'Độc giả',
  loans: 'Mượn và trả sách', wallets: 'Ví tiền', notes: 'Ghi chú',
  print: 'In phiếu', logs: 'Nhật ký', settings: 'Cài đặt'
};
const studioDescriptions = {
  dashboard: 'Các việc cần làm và tình hình thư viện hôm nay.',
  analytics: 'Theo dõi tình trạng kho và các khoản đã thanh toán.',
  books: 'Tìm sách, kiểm tra số cuốn còn sẵn hoặc cập nhật danh mục.',
  readers: 'Tra cứu thông tin, tiền cọc và lịch sử mượn sách.',
  loans: 'Lập phiếu mới, nhận sách trả và theo dõi các cuốn quá hạn.',
  wallets: 'Theo dõi tiền cọc, số dư và giao dịch.',
  notes: 'Sắp xếp công việc nội bộ theo trạng thái.',
  print: 'Tìm phiếu đã phát hành, xem trước và in hoặc lưu PDF.',
  logs: 'Tra cứu các thao tác quản trị trong 15 ngày gần nhất.',
  settings: 'Quản lý thông tin thư viện và chính sách.'
};

function studioIcon(name) {
  const paths = {
    dashboard: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
    analytics: '<path d="M5 20V12M12 20V4M19 20V8"/>',
    books: '<path d="M5 3h14v18H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2ZM3 17h16M7 7h8"/>',
    readers: '<circle cx="12" cy="7" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/>',
    loans: '<path d="M5 3h14v18l-3-2-4 2-4-2-3 2ZM8 7h8M8 11h6"/>',
    wallets: '<rect x="3" y="5" width="18" height="15" rx="2"/><path d="M3 9h18M15 14h6"/>',
    notes: '<rect x="4" y="4" width="16" height="18" rx="2"/><path d="M8 2v4M16 2v4M8 11h8M8 15h6"/>',
    print: '<path d="M7 8V3h10v5M7 17H3V9h18v8h-4M7 14h10v7H7Z"/>',
    logs: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    settings: '<circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2"/>',
    search: '<circle cx="10" cy="10" r="7"/><path d="m15 15 6 6"/>',
    bell: '<path d="M5 17h14l-2-4V8a5 5 0 0 0-10 0v5ZM10 21h4"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 2v6M17 2v6M3 11h18"/>',
    upload: '<path d="M3 17v4h18v-4M12 17V3M7 8l5-5 5 5"/>',
    help: '<circle cx="12" cy="12" r="10"/><path d="M9 8a3 3 0 1 1 4 3v3M12 17v1"/>'
  };
  return `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[name] || paths.notes}</svg>`;
}

function studioButton(label, handler, style = '') {
  return `<button type="button" class="studio-button ${style}" onclick="${handler}">${label}</button>`;
}

function studioTable(headers, body, id = '') {
  return `<div class="studio-table-scroll"><table class="studio-table"><thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody ${id ? `id="${id}"` : ''}>${body}</tbody></table></div>`;
}

function studioEmpty(message, columns) {
  return `<tr><td colspan="${columns}" class="studio-empty">${esc(message)}</td></tr>`;
}

function studioSearch(id, placeholder, handler) {
  return `<label class="studio-search">${studioIcon('search')}<input type="search" id="${id}" aria-label="${placeholder}" placeholder="${placeholder}" oninput="${handler}" /></label>`;
}

function studioSelect(id, label, options, handler) {
  return `<select id="${id}" aria-label="${label}" onchange="${handler}">${options.map(([value, text]) => `<option value="${esc(value)}">${esc(text)}</option>`).join('')}</select>`;
}

const previousInstallExtra = installExtra;
installExtra = function () {
  previousInstallExtra();
  installStudio();
};

function installStudio() {
  if (document.getElementById('studioHeading')) return;
  const admin = document.getElementById('page-admin');
  admin.classList.add('studio-layout', 'lamour-workspace');
  const sidebar = admin.querySelector('.admin-sidebar');
  sidebar.innerHTML = `<a class="studio-brand" href="#/admin/dashboard"><span>L</span><strong>LAMOUR<small>THƯ VIỆN SÁCH NGÀNH SPA</small></strong></a>
    <nav class="sidebar-nav" aria-label="Quản trị"><p class="studio-nav-label">Công việc hằng ngày</p>
    ${studioNav(['dashboard', 'loans', 'books', 'readers'])}<p class="studio-nav-label">Quản lý thư viện</p>
    ${studioNav(['wallets', 'notes', 'analytics', 'logs', 'settings'])}</nav>
    <div class="studio-account"><div class="studio-avatar">AD</div><strong id="activeAdminName">Quản trị viên</strong>
    <small id="activeAdminRole">Quản trị thư viện</small>
    ${studioButton('Xem website ↗', "navigateTo('home')", 'white')}${studioButton('Đăng xuất', 'handleLogout()', 'white')}</div>`;

  admin.querySelector('.admin-topbar').innerHTML = `<button class="admin-menu-toggle" aria-label="Mở menu" onclick="toggleAdminSidebar()">☰</button>
    <div class="studio-feature-search">${studioSearch('studioFeatureSearch', 'Tìm kiếm tính năng', 'searchStudioFeatures()')}<div id="studioSearchResults" hidden></div></div>
    <div class="studio-top-icons"><button aria-label="Hướng dẫn" onclick="studioHelp()">${studioIcon('help')}</button>
    <button id="studioBell" aria-label="Thông báo" onclick="studioNotifications()">${studioIcon('bell')}<i id="studioAlertCount" hidden></i></button>
    <button aria-label="Tài khoản quản trị" onclick="switchAdminTab('settings')" class="studio-avatar">AD</button></div>`;

  const content = admin.querySelector('.admin-content');
  content.insertAdjacentHTML('afterbegin', `<div class="studio-heading" id="studioHeading"><div><h1 id="adminTabTitle">Dashboard</h1><p id="adminTabSubtitle">Home &gt; Dashboard</p></div>
    <div class="studio-heading-actions"><span class="studio-date">${studioIcon('calendar')}<time id="studioToday"></time></span>
    ${studioButton(`${studioIcon('upload')} Xuất dữ liệu`, 'studioExport()', 'green')}</div></div>`);

  const importPanel = document.getElementById('importForm').closest('.panel-card');
  importPanel.classList.add('studio-import-content');
  const booksPane = document.getElementById('admin-tab-books');
  booksPane.innerHTML = `<div class="studio-toolbar">${studioSearch('adminBookSearch', 'Tìm theo mã sách, tên sách hoặc tác giả', 'renderAdminBooks()')}
    ${studioSelect('adminBookCategoryFilter', 'Chuyên mục', [['ALL', 'Tất cả chuyên mục']], 'renderAdminBooks()')}
    ${studioSelect('adminBookAvailabilityFilter', 'Trạng thái sách', [['ALL', 'Tất cả trạng thái'], ['AVAILABLE', 'Có sẵn'], ['UNAVAILABLE', 'Hết sẵn sàng'], ['WEB', 'Hiển thị web'], ['ARCHIVED', 'Đã lưu trữ']], 'renderAdminBooks()')}
    ${studioButton('Tìm kiếm', 'renderAdminBooks()', 'text')}${studioButton('Xóa lọc', 'clearBookFilters()', 'text danger-text')}
    <div class="studio-toolbar-actions">${studioButton('＋ Thêm đầu sách', 'openNewBookModal()')}${studioButton('CẬP NHẬT DATA SÁCH', 'openStudioImport()', 'white')}</div></div>
    <p id="adminBookResultCount" class="studio-result"></p><div class="studio-book-layout">
    <section class="studio-card studio-list studio-title-list">${studioTable(['Đầu sách', 'Có sẵn / Tổng'], '', 'adminBooksTableBody')}
      <footer class="studio-log-pagination"><label>Hiển thị <select id="studioBookPageSize" onchange="changeStudioBookPage(1)"><option value="10">10</option><option value="20">20</option></select> đầu sách / trang</label>
      <span id="studioBookPageStatus" role="status"></span><div><button id="studioBookPrev" class="studio-button white" onclick="changeStudioBookPage(studio.bookPage - 1)">Trước</button>
      <button id="studioBookNext" class="studio-button white" onclick="changeStudioBookPage(studio.bookPage + 1)">Sau</button></div></footer></section>
    <aside class="studio-card studio-book-detail" id="studioBookDetail"></aside></div>`;
  createStudioOverlay('studioImportModal', 'Cập nhật data sách', importPanel);
  document.getElementById('importMode').replaceChildren(new Option('Đối chiếu theo mã · thêm mới và cập nhật','SYNC'));
  const password = document.createElement('label');
  password.innerHTML = 'Mật khẩu xác nhận<input name="password" id="studioImportPassword" type="password" autocomplete="current-password" required placeholder="Nhập mật khẩu quản trị để tải file lên" />';
  document.getElementById('importForm').insertBefore(password, document.getElementById('importForm').querySelector('button'));
  const drop = document.createElement('label');
  drop.className = 'studio-dropzone';
  drop.htmlFor = 'importFile';
  drop.tabIndex = 0;
  drop.innerHTML = `${studioIcon('upload')}<strong>Kéo thả file Excel tại đây hoặc bấm để chọn</strong><span id="studioImportFilename">File .xlsx, tối đa 5 MB</span>`;
  const fileInput = document.getElementById('importFile');
  fileInput.parentElement.before(drop);
  fileInput.parentElement.classList.add('studio-file-input');
  fileInput.addEventListener('change', () => setText('studioImportFilename', fileInput.files[0]?.name || 'Chưa chọn file'));
  drop.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); fileInput.click(); } });
  for (const name of ['dragover', 'dragleave', 'drop']) drop.addEventListener(name, event => {
    event.preventDefault();
    drop.classList.toggle('dragging', name === 'dragover');
    if (name === 'drop' && event.dataTransfer.files.length) {
      fileInput.files = event.dataTransfer.files;
      fileInput.dispatchEvent(new Event('change'));
    }
  });
  importPanel.querySelector('p').textContent = 'Đối chiếu theo mã. Dòng giống hệt được bỏ qua. Để sửa dữ liệu hiện có, nên xuất file mới nhất rồi giữ nguyên cột VERSION.';
  importPanel.insertAdjacentHTML('beforeend', '<p class="studio-subtle">Để chỉnh tồn, tăng hoặc giảm TỔNG SỐ CUỐN và CÓ SẴN cùng mức. Không thêm mã cuốn mới ở sheet SÁCH cho cùng đầu sách. ĐANG MƯỢN và ĐANG SỬA là số liệu chỉ đọc.</p>');

  buildStudioDashboard();
  buildStudioReaders();
  buildStudioLoans();
  document.getElementById('admin-tab-print')?.remove();
  content.insertAdjacentHTML('beforeend', `<section id="admin-tab-logs" class="admin-tab-pane">
    <section class="studio-card"><header class="studio-panel-heading"><div><h2>Lịch sử thao tác</h2><p class="studio-subtle">10 mục mỗi trang · Mới nhất trước</p></div></header>
    ${studioTable(['Thời gian', 'Hành động', 'Bản ghi', 'Chi tiết'], '', 'studioLogRows')}
    <footer class="studio-log-pagination"><span id="studioLogStatus" role="status"></span>
    <div><button id="studioLogPrevious" class="studio-button white" onclick="loadStudioLogs(studio.logPage - 1)">Trang trước</button>
    <button id="studioLogNext" class="studio-button white" onclick="loadStudioLogs(studio.logPage + 1)">Trang sau</button></div>
    </footer></section></section>`);
  for (const [tab, title] of [['analytics', 'Phân tích'], ['notes', 'Ghi chú']]) {
    content.insertAdjacentHTML('beforeend', `<section id="admin-tab-${tab}" class="admin-tab-pane"><div id="studio${tab}"></div></section>`);
  }
  const wallets = document.getElementById('admin-tab-wallets');
  wallets.classList.add('studio-wallets');
  wallets.insertAdjacentHTML('afterbegin', '<div id="studioWalletOverview"></div>');
  const walletPanels = wallets.querySelectorAll(':scope > .panel-card');
  for (const [panel, label] of [[walletPanels[0], 'Chi tiết tài khoản ví'], [walletPanels[2], 'Chuyển tiền và thêm ví'], [walletPanels[3], 'Quyết toán và đảo giao dịch']]) {
    if (!panel) continue;
    const group = document.createElement('details');
    group.className = 'studio-wallet-group';
    const summary = document.createElement('summary');
    summary.textContent = label;
    panel.replaceWith(group);
    group.append(summary, panel);
    if (walletPanels[1]) wallets.insertBefore(group, walletPanels[1]);
  }
  document.getElementById('studionotes').innerHTML = `<header class="studio-section-banner">
    <div><small>CÔNG VIỆC NỘI BỘ</small><h2>Sổ ghi chú thư viện</h2><p>Theo dõi việc cần làm và xem lại những việc đã hoàn thành.</p></div>
    ${studioButton('＋ Thêm ghi chú', 'editStudioNote()', 'green')}
  </header><div class="studio-toolbar"><label class="studio-search">${studioIcon('search')}<input type="search" id="studioNoteSearch" aria-label="Tìm ghi chú" placeholder="Tìm theo tiêu đề hoặc nội dung" oninput="renderStudioNotes()"></label></div>
  <div id="studioNoteBoard" class="studio-note-board"></div>`;
  createStudioOverlay('studioDialog', 'Thông báo');
  createStudioOverlay('studioEditor', 'Chỉnh sửa');
  createStudioOverlay('studioCalendar', 'Chọn khoảng ngày');
  createStudioOverlay('studioHelpModal', 'Hướng dẫn sử dụng');
  createStudioOverlay('studioLoanDetailsModal', 'Chi tiết phiếu');
  createStudioOverlay('studioLoanPrintModal', 'In phiếu / Lưu PDF');
  createStudioOverlay('studioNotificationModal', 'Thông báo');
  createStudioOverlay('studioResetModal', 'Reset dữ liệu thư viện');
  createStudioOverlay('studioOperationsModal', 'Nhập dữ liệu Excel');
  for (const [tab,kind,label] of [['readers','readers','Nhập Excel độc giả'],['loans','loans','Nhập Excel phiếu mượn'],['wallets','transfers','Nhập Excel chuyển ví']]) {
    document.getElementById('admin-tab-'+tab).insertAdjacentHTML('afterbegin',`<div class="studio-toolbar">${studioButton(label,`openStudioOperations('${kind}')`,'white')}</div>`);
  }
  document.getElementById('admin-tab-settings').insertAdjacentHTML('beforeend', `<section class="studio-card studio-card-padding">
    <h2>Reset dữ liệu thư viện</h2><p>Xóa sách, độc giả, phiếu, giao dịch, số dư và nhật ký. Giữ tài khoản quản trị, chính sách và cấu hình website.</p>
    ${studioButton('Reset database', 'openStudioReset()', 'red')}</section>`);
  window.setInterval(() => {
    if (liveState && !document.hidden) void refreshStudioInbox();
  }, 60000);
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      const open = [...document.querySelectorAll('.modal-overlay.open')].at(-1);
      if (open) closeModal(open.id);
    }
    const dialog = [...document.querySelectorAll('.modal-overlay.open')].at(-1);
    if (event.key !== 'Tab' || !dialog) return;
    const controls = [...dialog.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href],[tabindex="0"]')].filter(el => el.getClientRects().length);
    const first = controls[0], last = controls.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  });
  for (const overlay of document.querySelectorAll('.modal-overlay')) {
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.addEventListener('click', event => { if (event.target === overlay) closeModal(overlay.id); });
  }
  switchAdminTab('dashboard', false);
}

function studioNav(tabs) {
  return tabs.map(tab => `<button class="side-link" data-tab="${tab}" onclick="switchAdminTab('${tab}')"><span class="side-icon">${studioIcon(tab)}</span><span>${studioTitles[tab]}</span></button>`).join('');
}

function createStudioOverlay(id, title, child) {
  const overlay = document.createElement('div');
  overlay.id = id;
  overlay.className = 'modal-overlay studio-overlay';
  overlay.setAttribute('aria-hidden', 'true');
  overlay.innerHTML = `<div class="modal-dialog"><header class="modal-header"><h2 id="${id}Title">${title}</h2><button class="modal-close" aria-label="Đóng" onclick="closeModal('${id}')">×</button></header><div class="modal-body" id="${id}Body"></div></div>`;
  overlay.setAttribute('aria-labelledby', id + 'Title');
  if (child) overlay.querySelector('.modal-body').append(child);
  document.body.append(overlay);
}

switchAdminTab = function (tab, syncUrl = true) {
  if (tab === 'print') tab = 'loans';
  if (!studioTitles[tab]) tab = 'dashboard';
  studio.tab = tab;
  document.querySelectorAll('.side-link').forEach(button => {
    button.classList.toggle('active', button.dataset.tab === tab);
    button.setAttribute('aria-current', button.dataset.tab === tab ? 'page' : 'false');
  });
  document.querySelectorAll('.admin-tab-pane').forEach(pane => pane.classList.toggle('active', pane.id === 'admin-tab-' + tab));
  setText('adminTabTitle', studioTitles[tab]);
  setText('adminTabSubtitle', studioDescriptions[tab]);
  setText('studioToday', new Intl.DateTimeFormat('vi-VN', {dateStyle: 'full', timeZone: 'Asia/Ho_Chi_Minh'}).format(new Date()));
  renderAllAdminViews();
  renderStudioExtras();
  if (tab === 'logs' && liveState) void loadStudioLogs(1);
  document.querySelector('.admin-sidebar')?.classList.remove('open');
  if (syncUrl && document.getElementById('page-admin').classList.contains('active')) history.replaceState(null, '', '#/admin/' + tab);
};

let studioLogRequest = 0;
async function loadStudioLogs(page) {
  const request = ++studioLogRequest;
  const previous = document.getElementById('studioLogPrevious');
  const next = document.getElementById('studioLogNext');
  const rows = document.getElementById('studioLogRows');
  previous.disabled = next.disabled = true;
  setText('studioLogStatus', 'Đang tải nhật ký…');
  try {
    const result = await api('admin/audit-logs?page=' + page);
    if (request !== studioLogRequest || !liveState) return;
    studio.logPage = result.page;
    rows.innerHTML = result.logs.map(log => `<tr><td>${esc(new Date(log.occurred_at).toLocaleString('vi-VN', {timeZone:'Asia/Ho_Chi_Minh'}))}</td>
      <td><span class="studio-tag">${esc(studioLogLabel(log.action))}</span></td>
      <td><b>${esc(studioLogLabel(log.target_table))}</b><small>${esc(log.target_id)}</small></td>
      <td>${esc(log.reason || '—')}</td></tr>`).join('') || studioEmpty('Chưa có thao tác trong 15 ngày gần nhất.', 4);
    setText('studioLogStatus', `Trang ${result.page} / ${result.pages} · ${result.total} mục`);
    previous.disabled = result.page <= 1;
    next.disabled = result.page >= result.pages;
  } catch {
    if (request !== studioLogRequest || !liveState) return;
    rows.innerHTML = studioEmpty('Không tải được nhật ký.', 4);
    setText('studioLogStatus', 'Mở lại tab Nhật ký để thử lại.');
  }
}

function studioLogLabel(value) {
  return ({LOGIN:'Đăng nhập', ISSUE:'Cho mượn sách', RETURN:'Nhận sách trả', CREATE:'Thêm mới', EDIT:'Chỉnh sửa', ARCHIVE:'Lưu trữ', VISIBILITY:'Đổi hiển thị', SAVE_NOTE:'Lưu ghi chú', POLICY_VERSION:'Cập nhật chính sách',
    loans:'Phiếu mượn', readers:'Độc giả', book_titles:'Đầu sách', book_copies:'Cuốn sách', admin_accounts:'Tài khoản', system_settings:'Cài đặt', financial_transactions:'Giao dịch'})[value] || value;
}

function buildStudioDashboard() {
  const pane = document.getElementById('admin-tab-dashboard');
  const reminders = document.getElementById('reminderList').closest('.panel-card');
  pane.innerHTML = `<div class="workspace-shortcuts">
    ${studioButton('+ Lập phiếu mượn','openNewLoanModal()','green')}
    ${studioButton('Nhận sách trả',"switchAdminTab('loans');clearStudioLoanFilters()",'white')}</div>
    <div id="adminKpiGrid" class="studio-kpis"></div>
    <div class="workspace-dashboard">
      <div class="workspace-stack">
        <section class="studio-card"><header class="studio-panel-heading"><div><h2>Phiếu đang theo dõi</h2><p class="studio-subtle">Tiến độ thu sách theo từng phiếu</p></div>${studioButton('Tất cả phiếu',"switchAdminTab('loans')",'white')}</header>
        ${studioTable(['Phiếu / Độc giả','Trạng thái','Đã thu','Hạn gần nhất',''], '', 'workspaceLoanRows')}</section>
        <section class="studio-card"><header class="studio-panel-heading"><h2>Công việc thư viện</h2>${studioButton('Mở ghi chú',"switchAdminTab('notes')",'white')}</header><div id="workspaceNoteBoard" class="workspace-note-board"></div></section>
        <section class="studio-card"><header class="studio-panel-heading"><h2>Số dư và quỹ cọc</h2>${studioButton('Chi tiết ví',"switchAdminTab('wallets')",'white')}</header>
        ${studioTable(['Mã ví','Hình thức','Số dư','Cọc đang giữ','Trạng thái'], '', 'dashboardWalletBody')}</section>
      </div>
      <aside class="workspace-stack">
        <section class="studio-card"><header class="studio-panel-heading"><div><h2>Lịch thu sách</h2><p class="studio-subtle">Chọn ngày có sách đến hạn</p></div></header><div id="workspaceCalendar" class="workspace-calendar"></div></section>
        <section class="studio-card"><header class="studio-panel-heading"><h2>Cần chú ý</h2></header><div id="dashboardAlertsList" class="studio-card-padding"></div></section>
        <section class="studio-card"><header class="studio-panel-heading"><h2>Hoạt động gần đây</h2>${studioButton('Nhật ký',"switchAdminTab('logs')",'text')}</header><div id="studioRecentLogs" class="studio-card-padding"></div></section>
      </aside>
    </div>
    <details class="studio-reminder-details"><summary>Độc giả mượn nhiều</summary><div id="studioTopReaders"></div></details>`;
  const details = document.createElement('details');
  details.className = 'studio-reminder-details';
  details.innerHTML = '<summary>Nhắc hạn và lịch sử liên hệ thu hồi</summary>';
  details.append(reminders);
  pane.append(details);
}

function workspaceOpenLoan(id) {
  const loan = liveState.loans.find(loan=>loan.id===id);
  if (!loan) return;
  clearStudioLoanFilters();
  document.getElementById('adminLoanSearch').value=loan.code;
  studio.loanId=id;
  switchAdminTab('loans');
  showStudioLoanDetails(id);
}

function workspaceCalendarMonth(offset) {
  const month=studio.overviewMonth || liveState.today.slice(0,7);
  const [year,number]=month.split('-').map(Number);
  studio.overviewMonth=new Date(Date.UTC(year,number-1+offset,1)).toISOString().slice(0,7);
  renderWorkspaceCalendar();
}

function workspaceCalendarDay(date) {
  studio.overviewDay=date;
  renderWorkspaceCalendar();
  document.getElementById('workspace-day-'+date)?.focus();
}

function renderWorkspaceCalendar() {
  const target=document.getElementById('workspaceCalendar');
  const month=studio.overviewMonth || liveState.today.slice(0,7);
  const [year,number]=month.split('-').map(Number);
  const leading=(new Date(Date.UTC(year,number-1,1)).getUTCDay()+6)%7;
  const days=new Date(Date.UTC(year,number,0)).getUTCDate();
  const due=new Map();
  for (const item of liveState.loan_items) {
    if (item.resolution_status!=='OPEN' || !item.due_on?.startsWith(month)) continue;
    if (!due.has(item.due_on)) due.set(item.due_on,[]);
    due.get(item.due_on).push(item);
  }
  const selected=studio.overviewDay?.startsWith(month) ? studio.overviewDay : liveState.today;
  const cells=Array.from({length:days},(_,index)=>{
    const date=month+'-'+String(index+1).padStart(2,'0');
    const count=due.get(date)?.length || 0;
    return `<button type="button" id="workspace-day-${date}" aria-pressed="${date===selected}" aria-label="${date}, ${count} cuốn đến hạn" onclick="workspaceCalendarDay('${date}')">${index+1}${count?'<i></i>':''}</button>`;
  }).join('');
  const loans=new Map(liveState.loans.map(loan=>[loan.id,loan]));
  const rows=[...new Set((due.get(selected)||[]).map(item=>item.loan_id))].map(id=>loans.get(id)).filter(Boolean);
  target.innerHTML=`<div class="workspace-calendar-header"><strong>Tháng ${number}, ${year}</strong><div>
    <button type="button" aria-label="Tháng trước" onclick="workspaceCalendarMonth(-1)">‹</button>
    <button type="button" aria-label="Tháng sau" onclick="workspaceCalendarMonth(1)">›</button></div></div>
    <div class="workspace-calendar-grid">${['T2','T3','T4','T5','T6','T7','CN'].map(day=>`<small>${day}</small>`).join('')}
    ${'<span></span>'.repeat(leading)}${cells}</div>
    <div class="workspace-calendar-agenda">${rows.map(loan=>studioButton(esc(loan.code)+' · '+esc(loan.reader_snapshot?.full_name),`workspaceOpenLoan('${loan.id}')`,'mini white')).join('') || '<p class="studio-subtle">Không có phiếu đến hạn ngày đang chọn.</p>'}</div>`;
}

function renderWorkspaceOverview() {
  const grouped=new Map();
  for (const item of liveState.loan_items) {
    if (!grouped.has(item.loan_id)) grouped.set(item.loan_id,[]);
    grouped.get(item.loan_id).push(item);
  }
  const active=liveState.loans.filter(loan=>loan.status!=='COMPLETED').map(loan=>{
    const items=grouped.get(loan.id)||[];
    const due=items.filter(item=>item.resolution_status==='OPEN').map(item=>item.due_on).sort()[0];
    return {loan,items,due};
  }).sort((a,b)=>(a.due||'9999').localeCompare(b.due||'9999')).slice(0,6);
  document.getElementById('workspaceLoanRows').innerHTML=active.map(({loan,items,due})=>{
    const received=items.filter(item=>item.returned_on).length;
    const overdue=due && due<liveState.today;
    const label=overdue?'Quá hạn':loan.status==='PENDING_SETTLEMENT'?'Chờ xử lý':received?'Trả một phần':'Đang mượn';
    return `<tr><td><b>${esc(loan.code)}</b><small>${esc(loan.reader_snapshot?.full_name)}</small></td>
    <td><span class="studio-tag ${overdue?'overdue':''}">${label}</span></td>
    <td><div class="workspace-progress"><progress aria-label="Tiến độ thu sách" max="${items.length||1}" value="${received}"></progress><small>${received}/${items.length}</small></div></td>
    <td>${esc(due||'—')}</td><td>${studioButton('Mở',`workspaceOpenLoan('${loan.id}')`,'mini white')}</td></tr>`;
  }).join('') || studioEmpty('Hiện không có phiếu đang mở.',5);
  const notes=(liveState.notes||[]).filter(note=>!note.archived);
  document.getElementById('workspaceNoteBoard').innerHTML=[false,true].map(done=>{
    const list=notes.filter(note=>Boolean(note.done)===done);
    return `<section><h3>${done?'Đã hoàn thành':'Cần thực hiện'} <small>${list.length}</small></h3>
      ${list.slice(0,3).map(note=>`<article><b>${esc(note.title)}</b></article>`).join('') || '<p class="studio-subtle">Chưa có ghi chú.</p>'}</section>`;
  }).join('');
  renderWorkspaceCalendar();
}

function buildStudioReaders() {
  document.getElementById('admin-tab-readers').innerHTML = `<div class="studio-toolbar">${studioSearch('adminReaderSearch', 'Tìm độc giả theo tên, mã hoặc số điện thoại', 'renderAdminReaders()')}
    ${studioSelect('adminReaderTypeFilter', 'Nhóm khách', [['ALL', 'Tất cả nhóm khách'], ...Object.values(readerLabels).map(label => [label, label])], 'renderAdminReaders()')}
    ${studioSelect('adminReaderLoanFilter', 'Trạng thái mượn', [['ALL', 'Tất cả trạng thái'], ['BORROWING', 'Đang mượn'], ['OVERDUE', 'Quá hạn'], ['NO_LOAN', 'Chưa có phiếu mở']], 'renderAdminReaders()')}
    ${studioButton('Tìm kiếm', 'renderAdminReaders()', 'text')}${studioButton('Xóa lọc', 'clearReaderFilters()', 'text danger-text')}
    <div class="studio-toolbar-actions">${studioButton('＋ Thêm độc giả', 'openNewReaderModal()', 'green')}</div></div>
    <p id="adminReaderResultCount" class="studio-result"></p><div class="studio-reader-layout">
    <section class="studio-card studio-list">${studioTable(['Mã', 'Họ và tên', 'Số điện thoại', ''], '', 'adminReadersTableBody')}</section>
    <div id="studioReaderDetail"></div></div>`;
}

function buildStudioLoans() {
  document.getElementById('admin-tab-loans').innerHTML = `<div class="studio-toolbar">${studioSearch('adminLoanSearch', 'Tìm mã phiếu, độc giả, điện thoại hoặc tên sách', 'renderAdminLoans()')}
    ${studioButton(`${studioIcon('calendar')} Tất cả ngày`, 'openStudioCalendar()', 'white')}
    ${studioSelect('adminLoanFilter', 'Trạng thái phiếu', [['ALL', 'Tất cả trạng thái'], ['Đang mượn', 'Đang mượn'], ['Trả một phần', 'Trả một phần'], ['Quá hạn', 'Quá hạn'], ['Chờ quyết toán', 'Chờ quyết toán'], ['Chờ sách thay thế', 'Chờ thay thế'], ['Đã trả – Đã xử lý', 'Đã xử lý']], 'renderAdminLoans()')}
    ${studioSelect('adminLoanReaderTypeFilter', 'Nhóm khách', [['ALL', 'Tất cả nhóm khách'], ...Object.values(readerLabels).map(label => [label, label])], 'renderAdminLoans()')}
    ${studioButton('Tìm kiếm', 'renderAdminLoans()', 'text')}${studioButton('Xóa lọc', 'clearStudioLoanFilters()', 'text danger-text')}
    <div class="studio-toolbar-actions">${studioButton('＋ THÊM PHIẾU MỚI', 'openNewLoanModal()', 'green')}</div></div>
    <p id="studioLoanRangeLabel" class="studio-result"></p><div class="studio-loan-counts" id="loanStatusTabs"><span>Tất cả <b id="loanCountAll">0</b></span><span>Đang mở <b id="loanCountActive">0</b></span><span>Quá hạn <b id="loanCountOverdue">0</b></span><span>Đã xử lý <b id="loanCountDone">0</b></span></div>
    <p id="adminLoanResultCount" class="studio-result"></p><section class="studio-card studio-loan-list">
    ${studioTable(['Mã phiếu', 'Độc giả', 'Đã nhận / Tổng', 'Ngày mượn', 'Hạn trả', 'Trạng thái', 'Thao tác'], '', 'adminLoansTableBody')}</section>`;
}

function selectedTitle() { return liveState?.book_titles.find(book => book.id === studio.bookId); }
function selectedReader() { return liveState?.readers.find(reader => reader.id === studio.readerId); }

renderAdminBooks = function () {
  if (!liveState || !document.getElementById('studioBookDetail')) return;
  const categorySelect = document.getElementById('adminBookCategoryFilter');
  const selectedCategory = categorySelect.value;
  categorySelect.innerHTML = '<option value="ALL">Tất cả chuyên mục</option>' + liveState.book_categories.map(category => `<option value="${category.id}">${esc(category.name)}</option>`).join('');
  categorySelect.value = [...categorySelect.options].some(option => option.value === selectedCategory) ? selectedCategory : 'ALL';
  const query = normalizeSearch(val('adminBookSearch'));
  const status = val('adminBookAvailabilityFilter');
  const inventory = new Map();
  for (const copy of liveState.book_copies) {
    if (copy.status === 'LOST' || copy.status === 'RETIRED') continue;
    const counts = inventory.get(copy.title_id) || {total:0,available:0};
    counts.total++;
    if (copy.status === 'READY') counts.available++;
    inventory.set(copy.title_id,counts);
  }
  const books = liveState.book_titles.filter(book => {
    const available = inventory.get(book.id)?.available ?? 0;
    return (status === 'ARCHIVED' ? !!book.archived_at : !book.archived_at)
      && (!query || normalizeSearch(`${book.code} ${book.title} ${book.authors}`).includes(query))
      && (categorySelect.value === 'ALL' || categorySelect.value === book.category_id)
      && (['ALL', 'ARCHIVED'].includes(status) || status === 'WEB' && book.show_on_web || status === 'AVAILABLE' && available > 0 || status === 'UNAVAILABLE' && available === 0);
  });
  books.sort((a,b) => a.code.localeCompare(b.code, 'vi', {numeric:true}));
  const filter = JSON.stringify([query, status, categorySelect.value]);
  if (studio.bookFilter !== filter) studio.bookPage = 1;
  studio.bookFilter = filter;
  const size = Number(val('studioBookPageSize')) || 10;
  const pages = Math.max(1,Math.ceil(books.length / size));
  studio.bookPage = Math.min(studio.bookPage || 1,pages);
  const page = books.slice((studio.bookPage - 1) * size,studio.bookPage * size);
  if (!page.some(book => book.id === studio.bookId)) studio.bookId = page[0]?.id || null;
  setText('studioBookPageStatus', `Trang ${studio.bookPage} / ${pages}`);
  document.getElementById('studioBookPrev').disabled = studio.bookPage <= 1;
  document.getElementById('studioBookNext').disabled = studio.bookPage >= pages;
  setText('adminBookResultCount', `${books.length} đầu sách`);
  document.getElementById('adminBooksTableBody').innerHTML = page.map(book => {
    const counts = inventory.get(book.id) || {available:0,total:0};
    return `<tr class="${book.id === studio.bookId ? 'selected' : ''}"><td><button type="button" class="studio-book-choice" aria-pressed="${book.id === studio.bookId}" onclick="selectStudioBook('${book.id}')"><small>${esc(book.code)}</small><strong>${esc(book.title)}</strong></button></td><td>${counts.available} / ${counts.total}</td></tr>`;
  }).join('') || studioEmpty('Chưa có đầu sách phù hợp. Thêm sách hoặc nhập Excel để bắt đầu.', 2);
  renderStudioBookDetail();
};

function changeStudioBookPage(page) { studio.bookPage = page; renderAdminBooks(); }
function selectStudioBook(id) {
  studio.bookId = id;
  renderAdminBooks();
  document.querySelector('.studio-book-choice[aria-pressed="true"]')?.focus({preventScroll:true});
  if (window.matchMedia?.('(max-width: 680px)').matches) document.getElementById('studioBookDetail').scrollIntoView({block:'start'});
}

function renderStudioBookDetail() {
  const book = selectedTitle();
  const target = document.getElementById('studioBookDetail');
  if (!book) { target.innerHTML = '<div class="studio-empty">Chọn một đầu sách để xem thông tin.</div>'; return; }
  const category = liveState.book_categories.find(item => item.id === book.category_id);
  const counts = getBookCounts(book.code);
  const copies = liveState.book_copies.filter(copy => copy.title_id === book.id).sort((a,b)=>a.code.localeCompare(b.code,'vi',{numeric:true}));
  target.innerHTML = `<div class="studio-book-summary"><div class="studio-book-cover">${bookCover({title: esc(book.title), author: esc(book.authors), coverUrl: esc(book.cover_url)})}</div>
    <div><span class="studio-tag">Mã: ${esc(book.code)}</span><h2>${esc(book.title)}</h2><p><b>Tác giả</b> ${esc(book.authors) || 'Chưa cập nhật'}</p><span class="studio-tag solid">Số lượng tồn: ${getBookCounts(book.code).available}</span></div></div>
    <dl class="studio-book-meta"><div><dt>Nhà xuất bản</dt><dd>${esc(book.publisher) || 'Chưa rõ'}</dd></div><div><dt>Thể loại</dt><dd>${esc(category?.name)}</dd></div><div><dt>Giá bìa</dt><dd>${book.cover_price_vnd == null ? 'Chưa rõ' : formatCurrency(book.cover_price_vnd)}</dd></div><div><dt>Ngôn ngữ</dt><dd>${esc(book.language)}</dd></div></dl>
    <details><summary>Nội dung sách</summary><p class="studio-description">${esc(book.description || book.short_description) || 'Nội dung đang được cập nhật.'}</p></details>
    <section class="studio-copy-stock"><h3>Kho của đầu sách này</h3>
    <p><b>${counts.available}</b> có sẵn · <b>${counts.total}</b> tổng cuốn · <b>${counts.borrowed}</b> đang mượn</p>
    ${book.archived_at ? '' : studioButton('Điều chỉnh tổng cuốn', 'adjustStudioBookTotal()', 'white')}
    ${book.archived_at ? '' : studioButton('Thêm một cuốn', `addQuickCopy('${book.code}')`, 'white')}
    <p class="studio-subtle">Chọn mã cuốn để chỉnh tình trạng, vị trí và trạng thái. Tồn có sẵn tính theo số cuốn ở trạng thái Có sẵn.</p>
    <div class="studio-copy-choices">${copies.map(copy => studioButton(`${esc(copy.code)} <small>${esc(copyLabels[copy.status])}</small>`, `studioCopyStatus('${copy.id}')`, 'white')).join('') || 'Chưa có cuốn nào.'}</div></section>
    <p class="studio-subtle">${book.archived_at ? 'Đã lưu trữ' : book.show_on_web ? 'Đang hiển thị trên website' : 'Đang ẩn trên website'}</p>
    <div class="studio-detail-actions">${!book.archived_at && counts.available>0 ? studioButton('Tạo phiếu mượn', "openStudioLoanForm(null,{bookId:'"+book.id+"'})", 'green') : '<span class="studio-subtle">Hết cuốn có sẵn</span>'}
    ${studioButton('Chỉnh sửa', 'editStudioBook()', 'dark-green')}${studioButton(book.show_on_web ? 'Khóa hiển thị' : 'Mở hiển thị', 'toggleStudioBook()', 'yellow')}${studioButton('Xóa sách', 'archiveStudioBook()', 'red')}</div>`;
}

function adjustStudioBookTotal() {
  const book = selectedTitle();
  const previousTotal = getBookCounts(book.code).total;
  openStudioEditor('Điều chỉnh tổng cuốn · ' + book.code, [
    {name:'total', label:'Tổng cuốn mới', type:'number', value:previousTotal, min:0, required:true},
    {name:'reason', label:'Lý do (giảm sẽ thanh lý các cuốn Có sẵn có mã lớn nhất)', required:true}
  ], input => api('admin/copies/total', {...input, total:Number(input.total), titleId:book.id, previousTotal}));
}

renderAdminReaders = function () {
  if (!liveState || !document.getElementById('studioReaderDetail')) return;
  const query = normalizeSearch(val('adminReaderSearch'));
  const readers = liveState.readers.filter(reader => {
    const loans = liveState.loans.filter(loan => loan.reader_id === reader.id);
    const open = liveState.loan_items.filter(item => loans.some(loan => loan.id === item.loan_id) && item.resolution_status === 'OPEN');
    return !reader.archived_at && (!query || normalizeSearch(`${reader.code} ${reader.full_name} ${reader.phone_display}`).includes(query))
      && (val('adminReaderTypeFilter') === 'ALL' || readerLabels[reader.reader_category] === val('adminReaderTypeFilter'))
      && (val('adminReaderLoanFilter') === 'ALL' || val('adminReaderLoanFilter') === 'BORROWING' && open.length || val('adminReaderLoanFilter') === 'OVERDUE' && open.some(item => item.due_on < liveState.today) || val('adminReaderLoanFilter') === 'NO_LOAN' && !loans.some(loan => loan.status !== 'COMPLETED'));
  });
  if (!readers.some(reader => reader.id === studio.readerId)) studio.readerId = readers[0]?.id || null;
  setText('adminReaderResultCount', `${readers.length} độc giả`);
  document.getElementById('adminReadersTableBody').innerHTML = readers.map(reader => `<tr class="${reader.id === studio.readerId ? 'selected' : ''}"><td>${esc(reader.code)}</td><td>${esc(reader.full_name)}</td><td>${esc(reader.phone_display)}</td><td>${studioButton('Thao tác', `selectStudioReader('${reader.id}')`, 'mini white')}</td></tr>`).join('') || studioEmpty('Chưa có độc giả phù hợp.', 4);
  renderStudioReaderDetail();
};

function selectStudioReader(id) { studio.readerId = id; studio.readerTab = 'all'; renderAdminReaders(); }

function readerItems(readerId) {
  const loans = liveState.loans.filter(loan => loan.reader_id === readerId);
  return liveState.loan_items.filter(item => loans.some(loan => loan.id === item.loan_id));
}

function itemDeposit(itemId) {
  return liveState.deposit_entries.filter(entry => entry.loan_item_id === itemId).reduce((sum, entry) => sum + (entry.direction === 'INCREASE' ? 1 : -1) * Number(entry.amount_vnd), 0);
}

function renderStudioReaderDetail() {
  const reader = selectedReader();
  const target = document.getElementById('studioReaderDetail');
  if (!reader) { target.innerHTML = '<div class="studio-card studio-empty">Chọn một độc giả để xem hồ sơ.</div>'; return; }
  const items = readerItems(reader.id);
  const held = items.reduce((sum, item) => sum + itemDeposit(item.id), 0);
  const deposits = liveState.deposit_entries.filter(entry => items.some(item => item.id === entry.loan_item_id) && entry.direction === 'INCREASE');
  const depositTimes = liveState.financial_transactions.filter(tx => deposits.some(entry => entry.transaction_id === tx.id)).map(tx => String(tx.occurred_at).slice(0, 10)).sort();
  const initials = reader.full_name.split(/\s+/).slice(-2).map(part => part[0]).join('').toUpperCase();
  target.innerHTML = `<header class="studio-reader-heading"><h2>${esc(reader.code)} <span class="studio-tag solid">${reader.account_status === 'Hoạt động' ? 'Hoạt động' : 'Tạm khóa'}</span></h2><div class="studio-detail-actions">${reader.account_status==='Hoạt động' ? studioButton('Tạo phiếu mượn',"openStudioLoanForm(null,{readerId:'"+reader.id+"'})",'green') : ''}
    ${studioButton('Chỉnh sửa', 'editStudioReader()', 'dark-green')}${studioButton(reader.account_status === 'Hoạt động' ? 'Khóa khách' : 'Mở khóa', 'toggleStudioReader()', 'yellow')}${studioButton('Xóa khách', 'archiveStudioReader()', 'red')}</div></header>
    <div class="studio-reader-loan-links">${liveState.loans.filter(loan=>loan.reader_id===reader.id).map(loan=>studioButton(esc(loan.code),`workspaceOpenLoan('${loan.id}')`,'mini white')).join('')}</div>
    <div class="studio-reader-cards"><section class="studio-card studio-profile"><div class="studio-profile-avatar">${esc(initials)}</div><span class="studio-tag solid">${readerLabels[reader.reader_category]}</span><h2>${esc(reader.full_name)}</h2><p>${esc(reader.email) || 'Chưa có email'}</p><b>${esc(reader.phone_display)}</b></section>
    <section class="studio-card studio-personal"><h3>Thông tin cá nhân</h3><div><small>Địa chỉ</small><p>${esc(reader.address) || 'Chưa cập nhật'}</p></div><div><small>Cơ sở / Đơn vị</small><p>${esc(reader.organization) || 'Chưa cập nhật'}</p></div><div><small>Ghi chú</small><p>${esc(reader.notes) || 'Chưa có ghi chú'}</p></div></section>
    <div class="studio-reader-stats"><section class="studio-card"><h3>Số tiền đang cọc</h3><strong>${formatCurrency(held)}</strong>${held && depositTimes.length ? `<p>Từ ngày ${esc(depositTimes[0])}</p>` : '<p>Hiện không giữ cọc</p>'}</section><section class="studio-card"><h3>Tổng sách đã mượn</h3><strong>${items.length} <small>quyển</small></strong></section></div></div>
    <nav class="studio-reader-tabs" aria-label="Lịch sử độc giả">${[['all', 'Tất cả giao dịch'], ['returned', 'Đã hoàn trả sách'], ['open', 'Đang mượn'], ['deposit', 'Lịch sử cọc'], ['reverse', 'Giao dịch đảo']].map(([id, label]) => studioButton(label, `studioReaderHistory('${id}')`, studio.readerTab === id ? 'active text' : 'text')).join('')}</nav>
    <section class="studio-card studio-reader-history" id="studioReaderHistory"></section>`;
  renderStudioReaderHistory();
}

function studioReaderHistory(tab) { studio.readerTab = tab; renderStudioReaderDetail(); }

function renderStudioReaderHistory() {
  const reader = selectedReader();
  if (!reader) return;
  const items = readerItems(reader.id);
  const target = document.getElementById('studioReaderHistory');
  if (['all', 'deposit', 'reverse'].includes(studio.readerTab)) {
    const transactions = liveState.financial_transactions.filter(tx => tx.reader_id === reader.id
      && (studio.readerTab !== 'deposit' || liveState.deposit_entries.some(entry => entry.transaction_id === tx.id))
      && (studio.readerTab !== 'reverse' || tx.reversal_of_id));
    target.innerHTML = studioTable(['Mã giao dịch', 'Ngày', 'Hoạt động', 'Số tiền', 'Ghi chú'], transactions.map(tx => `<tr><td>${esc(tx.code)}</td><td>${esc(String(tx.occurred_at).slice(0, 10))}</td><td>${esc(typeLabels[tx.type] || tx.type)}</td><td>${formatCurrency(tx.amount_vnd)}</td><td>${esc(tx.reason)}</td></tr>`).join('') || studioEmpty('Chưa có giao dịch trong nhóm này.', 5));
    return;
  }
  const visible = items.filter(item => studio.readerTab === 'open' ? item.resolution_status === 'OPEN' : !!item.returned_on);
  target.innerHTML = studioTable(['Mã phiếu', 'Cuốn sách', 'Hạn trả', 'Ngày trả', 'Trạng thái'], visible.map(item => {
    const loan = liveState.loans.find(loan => loan.id === item.loan_id);
    const copy = liveState.book_copies.find(copy => copy.id === item.copy_id);
    return `<tr><td>${studioButton(esc(loan.code),`workspaceOpenLoan('${loan.id}')`,'mini white')}</td><td>${esc(copy.code)}<small>${esc(item.title_snapshot.title)}</small></td><td>${item.due_on}</td><td>${item.returned_on || '—'}</td><td>${studioItemStatus(item)}</td></tr>`;
  }).join('') || studioEmpty('Chưa có sách trong nhóm này.', 5));
}

function studioItemStatus(item) {
  if (item.resolution_status === 'RESOLVED') return item.loss_confirmed_on ? 'Báo mất · Đã xử lý' : 'Đã trả – Đã xử lý';
  if (item.resolution_status === 'RETURNED') return 'Chờ quyết toán';
  if (item.resolution_status === 'LOST_PENDING') return 'Chờ sách thay thế';
  return item.due_on < liveState.today ? 'Quá hạn' : 'Đang mượn';
}

function studioLoanDetails(loan, items, copies) {
  const body = items.map(item => {
    let operation = '';
    if (item.resolution_status === 'OPEN') operation = studioButton('Trả / Báo mất', `openReturnModal('${item.id}')`, 'mini dark-green') + studioButton('Liên hệ', `recordContact('${item.id}')`, 'mini white');
    if (item.resolution_status === 'RETURNED') operation = studioButton('Quyết toán', `settlePendingUi('${item.id}')`, 'mini dark-green');
    if (item.resolution_status === 'LOST_PENDING') operation = studioButton('Nhận thay thế', `receiveReplacement('${item.id}')`, 'mini dark-green') + studioButton('Quyết toán', `settlePendingUi('${item.id}')`, 'mini white');
    const status = studioItemStatus(item);
    const received = item.returned_on || (item.loss_confirmed_on ? 'Báo mất ' + item.loss_confirmed_on : '—');
    return `<tr><td><b>${esc(copies.get(item.copy_id)?.code || '—')}</b><small>${esc(item.title_snapshot?.title)}</small></td>
      <td>${esc(item.checkout_on || loan.borrowed_on)}</td><td>${esc(item.due_on)}</td><td>${esc(received)}</td><td>${formatCurrency(itemDeposit(item.id))}</td>
      <td><span class="studio-tag ${status === 'Quá hạn' ? 'overdue' : ''}">${esc(status)}</span></td><td class="studio-row-actions">${operation || '—'}</td></tr>`;
  }).join('');
  return `<section class="studio-loan-detail"><header><div><h3>Chi tiết phiếu ${esc(loan.code)}</h3><p>Ngày mượn ${esc(loan.borrowed_on)} · ${items.length} cuốn</p></div>
    <div>${loan.status!=='COMPLETED' ? studioButton('Mượn thêm sách', `openStudioLoanForm('${loan.id}')`, 'mini green') : ''}
    ${studioButton('Thu cọc',`showStudioLoanDeposit('${loan.id}')`,'mini white')}
    ${liveState.print_documents.some(entry=>entry.loan_id===loan.id) ? studioButton('In phiếu', `openStudioLoanPrint('${loan.id}')`, 'mini white') : ''}</div></header>
    <p>${esc(loan.reader_snapshot?.full_name || liveState.readers.find(reader=>reader.id===loan.reader_id)?.full_name)} · Cọc đang giữ ${formatCurrency(items.reduce((sum,item)=>sum+itemDeposit(item.id),0))}</p>
    ${studioTable(['Cuốn sách', 'Ngày giao', 'Hạn trả', 'Ngày nhận / Báo mất', 'Cọc đang giữ', 'Trạng thái', 'Thao tác'],body || studioEmpty('Phiếu chưa có cuốn sách.',7))}
    ${studioLoanHistory(loan,items,copies)}</section>`;
}

function studioLoanHistory(loan,items,copies) {
  const events=[];
  for (const item of items) {
    const code=copies.get(item.copy_id)?.code || item.title_snapshot?.title || 'Cuốn sách';
    events.push({date:item.checkout_on || loan.borrowed_on,label:'Giao sách',detail:code+' · '+(item.condition_out_note || item.condition_out || '—')});
    if (item.returned_on) events.push({date:item.returned_on,label:'Nhận lại sách',detail:code});
    if (item.loss_confirmed_on) events.push({date:item.loss_confirmed_on,label:'Ghi nhận mất',detail:code});
  }
  events.sort((a,b)=>b.date.localeCompare(a.date));
  return `<details class="studio-loan-history"><summary>Lịch sử giao và nhận sách (${events.length})</summary>
    <ul>${events.map(event=>`<li><time>${esc(event.date)}</time> · <b>${event.label}</b> · ${esc(event.detail)}</li>`).join('')}</ul></details>`;
}

function toggleStudioLoan(id) {
  showStudioLoanDetails(id);
}

function showStudioLoanDetails(id, open = true) {
  const loan=liveState?.loans.find(loan=>loan.id===id);
  if (!loan) return;
  studio.loanId=id;
  setText('studioLoanDetailsModalTitle','Phiếu '+loan.code);
  document.getElementById('studioLoanDetailsModalBody').innerHTML=studioLoanDetails(loan,
    liveState.loan_items.filter(item=>item.loan_id===id),new Map(liveState.book_copies.map(copy=>[copy.id,copy])));
  if (open) openModal('studioLoanDetailsModal');
}

function showStudioLoanDeposit(id) {
  const items=liveState.loan_items.filter(item=>item.loan_id===id);
  const due=items.reduce((sum,item)=>sum+Number(item.deposit_required_vnd || 0),0);
  const collected=liveState.financial_transactions.filter(entry=>entry.loan_id===id && entry.type==='COLLECT_DEPOSIT')
    .reduce((sum,entry)=>sum+Number(entry.amount_vnd),0);
  const message=due===0 ? 'Phiếu này không yêu cầu tiền cọc.' :
    collected>=due ? `Phiếu đã ghi nhận thu ${formatCurrency(collected)} khi giao sách. Các khoản hoàn hoặc khấu trừ được xử lý khi trả sách và quyết toán.` :
    `Đã ghi nhận ${formatCurrency(collected)} trên ${formatCurrency(due)} tiền cọc. Kiểm tra sổ giao dịch trong Ví tiền trước khi xử lý chênh lệch.`;
  void requestStudioDialog('Thu cọc',message,{confirmLabel:'Đóng',cancelLabel:'Quay lại'});
}

function openStudioLoanPrint(id) {
  const documents=liveState.print_documents.filter(entry=>entry.loan_id===id)
    .sort((a,b)=>String(b.created_at || b.snapshot.printedAt || '').localeCompare(String(a.created_at || a.snapshot.printedAt || '')));
  if (!documents.length) return;
  const labels={BORROW:'Phiếu mượn',RETURN:'Phiếu trả',REPLACEMENT:'Biên nhận thay thế',STATEMENT:'Biên nhận quyết toán'};
  document.getElementById('studioLoanPrintModalBody').innerHTML=`<div class="studio-loan-print-actions">
    <label>Chứng từ <select id="studioLoanDocumentSelect" onchange="renderStudioLoanDocument()">${documents.map(entry=>`<option value="${esc(entry.id)}">${esc(labels[entry.type] || entry.type)} · ${esc(entry.code)}</option>`).join('')}</select></label>
    <button type="button" class="studio-button green" onclick="window.print()">In phiếu / Lưu PDF</button></div>
    <div id="studioLoanPrintSheet"></div>`;
  renderStudioLoanDocument();
  openModal('studioLoanPrintModal');
}

function renderStudioLoanDocument() {
  const selected=liveState?.print_documents.find(entry=>entry.id===val('studioLoanDocumentSelect') && entry.loan_id===studio.loanId);
  document.getElementById('studioLoanPrintSheet').innerHTML=selected ? loanPaperMarkup(selected) : '';
}

renderAdminLoans = function () {
  if (!liveState) return;
  const query = normalizeSearch(val('adminLoanSearch'));
  const filter = val('adminLoanFilter');
  const group = val('adminLoanReaderTypeFilter');
  const readers = new Map(liveState.readers.map(reader=>[reader.id,reader]));
  const copies = new Map(liveState.book_copies.map(copy=>[copy.id,copy]));
  const grouped = new Map();
  for (const item of liveState.loan_items) {
    if (!grouped.has(item.loan_id)) grouped.set(item.loan_id,[]);
    grouped.get(item.loan_id).push(item);
  }
  const loans = liveState.loans.map(loan => {
    const items = grouped.get(loan.id) || [];
    const reader = loan.reader_snapshot || readers.get(loan.reader_id) || {};
    const received = items.filter(item=>item.returned_on).length;
    const open = items.filter(item=>item.resolution_status==='OPEN').length;
    const overdue = items.some(item=>studioItemStatus(item)==='Quá hạn');
    const pendingReplacement = items.some(item=>item.resolution_status==='LOST_PENDING');
    const pendingSettlement = items.some(item=>item.resolution_status==='RETURNED');
    const done = loan.status==='COMPLETED';
    const status = done ? (received===items.length ? 'Đã thu đủ' : 'Đã xử lý') :
      overdue ? 'Quá hạn' : open && open<items.length ? 'Trả một phần' :
      pendingReplacement ? 'Chờ sách thay thế' : pendingSettlement ? 'Chờ quyết toán' : 'Đang mượn';
    return {loan,items,reader,received,open,overdue,pendingReplacement,pendingSettlement,done,status};
  });
  const visible = loans.filter(({loan,items,reader,open,overdue,pendingReplacement,pendingSettlement,done}) => {
    const search = [loan.code,reader.code,reader.full_name,reader.phone_display,...items.flatMap(item=>[copies.get(item.copy_id)?.code,item.title_snapshot?.title])].join(' ');
    const matchesStatus = filter==='ALL' ||
      (filter==='Đang mượn' && open>0) ||
      (filter==='Trả một phần' && open>0 && open<items.length) ||
      (filter==='Quá hạn' && overdue) ||
      (filter==='Chờ sách thay thế' && pendingReplacement) ||
      (filter==='Chờ quyết toán' && pendingSettlement) ||
      (filter==='Đã trả – Đã xử lý' && done);
    return matchesStatus && (!query || normalizeSearch(search).includes(query))
      && (group==='ALL' || readerLabels[loan.category_snapshot || reader.reader_category]===group)
      && (!studio.loanRange || loan.borrowed_on>=studio.loanRange[0] && loan.borrowed_on<=studio.loanRange[1]);
  });
  setText('loanCountAll',loans.length);
  setText('loanCountActive',loans.filter(row=>!row.done).length);
  setText('loanCountOverdue',loans.filter(row=>row.overdue).length);
  setText('loanCountDone',loans.filter(row=>row.done).length);
  setText('adminLoanResultCount',`${visible.length} phiếu`);
  setText('studioLoanRangeLabel',studio.loanRange ? `Ngày mượn từ ${studio.loanRange[0]} đến ${studio.loanRange[1]}` : 'Đang xem tất cả ngày mượn');
  document.getElementById('adminLoansTableBody').innerHTML = visible.map(({loan,items,reader,received,overdue,status})=>{
    return `<tr class="${studio.loanId===loan.id ? 'selected' : ''}"><td>${studioButton(esc(loan.code),`toggleStudioLoan('${loan.id}')`,'mini white')}</td>
      <td>${esc(reader.full_name)}<small>${esc(reader.phone_display)}</small></td><td>${received} / ${items.length}</td>
      <td>${esc(loan.borrowed_on)}</td><td>${esc(items.filter(item=>item.resolution_status==='OPEN').map(item=>item.due_on).sort()[0] || loan.due_on)}</td>
      <td><span class="studio-tag ${overdue ? 'overdue' : ''}">${esc(status)}</span></td>
      <td>${studioButton('Mở phiếu',`toggleStudioLoan('${loan.id}')`,'mini white')}</td></tr>`;
  }).join('') || studioEmpty('Chưa có phiếu phù hợp với bộ lọc.',7);
  if (document.getElementById('studioLoanDetailsModal')?.classList.contains('open')) showStudioLoanDetails(studio.loanId,false);
};
function clearStudioLoanFilters() {
  studio.loanRange = null;
  for (const id of ['adminLoanFilter', 'adminLoanReaderTypeFilter']) document.getElementById(id).value = 'ALL';
  document.getElementById('adminLoanSearch').value = '';
  renderAdminLoans();
}

const previousRenderDashboard = renderAdminDashboard;
renderAdminDashboard = function () {
  if (!liveState) return;
  previousRenderDashboard();
  renderWorkspaceOverview();
  const lastMetric = document.getElementById('adminKpiGrid').lastElementChild;
  lastMetric?.remove();
  const top = [...liveState.readers].map(reader => ({reader, count: readerItems(reader.id).length})).filter(item => item.count).sort((a, b) => b.count - a.count).slice(0, 5);
  document.getElementById('studioTopReaders').innerHTML = studioTable(['Mã', 'Tên khách', 'Sách đã mượn', 'Loại'], top.map(({reader, count}) => `<tr><td>${esc(reader.code)}</td><td><button class="studio-link" onclick="studio.readerId='${reader.id}';switchAdminTab('readers')">${esc(reader.full_name)}</button></td><td>${count} cuốn</td><td>${readerLabels[reader.reader_category]}</td></tr>`).join('') || studioEmpty('Chưa có lịch sử mượn sách.', 4));
  document.getElementById('studioRecentLogs').innerHTML = liveState.audit_logs.slice(0, 5).map(log => `<div class="studio-log"><span></span><div><b>${esc(log.action)}</b><small>${esc(log.target_table)} · ${new Date(log.occurred_at).toLocaleString('vi-VN')}</small></div></div>`).join('') || '<p class="studio-subtle">Chưa có nhật ký.</p>';
};

function renderStudioExtras() {
  if (!liveState) return;
  renderStudioWalletOverview();
  renderStudioNotes();
  renderStudioAnalytics();
}

function renderStudioWalletOverview() {
  const wallets = liveState.wallets.map(wallet => ({
    wallet,
    ...getWalletStats(esc(wallet.display_name))
  }));
  const totals = [
    ['Tổng số dư', formatCurrency(wallets.reduce((sum, entry) => sum + entry.balance, 0))],
    ['Tiền cọc đang giữ', formatCurrency(wallets.reduce((sum, entry) => sum + entry.depositHeld, 0))],
    ['Ví đang hoạt động', wallets.filter(({wallet}) => wallet.active).length]
  ];
  document.getElementById('studioWalletOverview').innerHTML = `<header class="studio-section-banner">
    <div><small>QUẢN LÝ DÒNG TIỀN</small><h2>Ví thanh toán &amp; quỹ cọc</h2><p>Xem số dư, tiền cọc và lịch sử giao dịch của thư viện.</p></div>
    <div class="studio-banner-icon">${studioIcon('wallets')}</div>
  </header><div class="studio-wallet-totals">${totals.map(([label, value]) => `<article><span>${label}</span><strong>${value}</strong></article>`).join('')}</div>
  <div class="studio-wallet-grid">${wallets.map(({wallet, balance, depositHeld}) => `<article class="studio-card studio-wallet-card">
    <header><span class="studio-wallet-icon">${studioIcon('wallets')}</span><span class="studio-tag">${wallet.active ? 'Đang hoạt động' : 'Ngừng hoạt động'}</span></header>
    <small>${esc(wallet.code)}</small><h3>${esc(wallet.display_name)}</h3>
    <dl><div><dt>Số dư hiện tại</dt><dd>${formatCurrency(balance)}</dd></div><div><dt>Cọc đang giữ</dt><dd>${formatCurrency(depositHeld)}</dd></div></dl>
  </article>`).join('') || '<p class="studio-empty">Chưa có ví thanh toán.</p>'}</div>`;
}

const previousRenderExtra = renderExtra;
renderExtra = function () {
  previousRenderExtra();
  renderStudioExtras();
  if (liveState) void refreshStudioInbox();
};

function renderStudioAnalytics() {
  const owned = liveState.book_copies.filter(copy => !['LOST', 'RETIRED'].includes(copy.status)).length;
  const borrowed = liveState.book_copies.filter(copy => copy.status === 'ON_LOAN').length;
  const denominator = Math.max(1, liveState.book_copies.length);
  document.getElementById('studioanalytics').innerHTML = `<section class="studio-card studio-card-padding"><h2>Tình trạng kho sách</h2><p class="studio-subtle">Tổng đang sở hữu ${owned} cuốn · Đang mượn ${borrowed} cuốn</p>
    <div class="studio-bars">${Object.entries(copyLabels).map(([status, label]) => {
      const count = liveState.book_copies.filter(copy => copy.status === status).length;
      return `<div><span>${label}</span><div><i style="width:${count / denominator * 100}%"></i></div><b>${count}</b></div>`;
    }).join('')}</div></section><section class="studio-card studio-card-padding"><h2>Nghĩa vụ đã thanh toán</h2><p class="studio-analysis-value">${formatCurrency(liveState.charge_allocations.reduce((sum, entry) => sum + (entry.direction === 'APPLY' ? 1 : -1) * Number(entry.amount_vnd), 0))}</p><p class="studio-subtle">Tổng các khoản đã được thanh toán hoặc khấu trừ cọc.</p></section>`;
}

function renderStudioNotes() {
  const query = normalizeSearch(val('studioNoteSearch'));
  const notes = (liveState.notes || []).filter(note => !note.archived && normalizeSearch(`${note.title} ${note.body}`).includes(query))
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  document.getElementById('studioNoteBoard').innerHTML = [false, true].map(done => {
    const items = notes.filter(note => Boolean(note.done) === done);
    return `<section class="studio-note-lane ${done ? 'is-done' : ''}">
      <header><h2>${done ? 'Đã hoàn thành' : 'Cần thực hiện'}</h2><span>${items.length}</span></header>
      ${items.map(note => `<article class="studio-card studio-note">
        <h3>${esc(note.title)}</h3><p>${esc(note.body)}</p>
        <small>${new Date(note.updatedAt).toLocaleString('vi-VN', {timeZone: 'Asia/Ho_Chi_Minh'})}</small>
        <footer>${studioButton('Chỉnh sửa', `editStudioNote('${note.id}')`, 'white')}${studioButton(done ? 'Mở lại' : 'Hoàn thành', `toggleStudioNote('${note.id}')`, 'dark-green')}</footer>
      </article>`).join('') || `<p class="studio-empty">${query ? 'Không có ghi chú phù hợp.' : 'Chưa có ghi chú trong mục này.'}</p>`}
    </section>`;
  }).join('');
}

const previousOpenModal = openModal;
const previousCloseModal = closeModal;
openModal = function (id) {
  const overlay = document.getElementById(id);
  if (!overlay) return;
  if (!overlay.classList.contains('open')) overlay.returnFocus = document.activeElement;
  document.body.append(overlay);
  previousOpenModal(id);
  overlay?.setAttribute('aria-hidden', 'false');
  document.body.classList.add('studio-modal-open');
  setTimeout(() => overlay?.querySelector('input:not([type=hidden]),select,textarea,button')?.focus(), 0);
};
closeModal = function (id) {
  const overlay=document.getElementById(id);
  if (id === 'studioOperationsModal') document.getElementById('studioOperationsModalBody')?.replaceChildren();
  if (id === 'studioResetModal') {
    clearInterval(studioResetTimer);
    studioResetTimer = null;
    studioResetToken = null;
    document.getElementById('studioResetModalBody')?.replaceChildren();
  }
  previousCloseModal(id);
  document.getElementById(id)?.setAttribute('aria-hidden', 'true');
  if (id === 'studioDialog' && studio.dialogResolve) {
    studio.dialogResolve(null);
    studio.dialogResolve = null;
  }
  if (!document.querySelector('.modal-overlay.open')) document.body.classList.remove('studio-modal-open');
  if (overlay?.returnFocus?.isConnected) overlay.returnFocus.focus();
  else [...document.querySelectorAll('.modal-overlay.open')].at(-1)?.querySelector('button')?.focus();
};

let studioResetTimer = null;
let studioResetToken = null;

function openStudioReset() {
  const body = document.getElementById('studioResetModalBody');
  body.innerHTML = `<form onsubmit="prepareStudioReset(event)">
    <p>Reset sẽ xóa dữ liệu vận hành và đưa số dư về 0. Hệ thống sẽ tải bản sao lưu trước; chọn lại đúng file đã tải để xác nhận.</p>
    <label>Mật khẩu quản trị<input type="password" name="password" autocomplete="current-password" required></label>
    <label>Nhập lại mật khẩu<input type="password" name="confirmPassword" autocomplete="current-password" required></label>
    <label>Gõ “tôi đồng ý reset”<input name="phrase" required autocomplete="off"></label>
    <p>Mã xác nhận: <strong id="studioResetCode">…</strong> <small id="studioResetCountdown"></small></p>
    <label>Nhập mã đang hiển thị<input name="code" inputmode="numeric" pattern="[0-9]{6}" maxlength="6" required autocomplete="off"></label>
    <div class="studio-modal-actions"><button type="submit" class="studio-button green">Tạo và tải bản sao lưu</button></div>
  </form>`;
  openModal('studioResetModal');
  const form = body.querySelector('form');
  let expiresAt = 0, loading = false;
  const tick = async () => {
    if (!form.isConnected || form.dataset.busy) return;
    if (Date.now() >= expiresAt && !loading) {
      loading = true;
      try {
        const challenge = await api('admin/reset/challenge', {});
        if (!form.isConnected) return;
        setText('studioResetCode', challenge.code);
        form.elements.code.value = '';
        expiresAt = challenge.expiresAt;
      } catch { setText('studioResetCode', 'Không lấy được mã'); expiresAt = Date.now() + 10000; }
      finally { loading = false; }
    }
    if (form.isConnected) setText('studioResetCountdown', `Đổi sau ${Math.max(0,Math.ceil((expiresAt-Date.now())/1000))} giây`);
  };
  clearInterval(studioResetTimer);
  studioResetTimer = setInterval(tick, 300);
  void tick();
}

async function prepareStudioReset(event) {
  event.preventDefault();
  const form = event.currentTarget;
  await action(async () => {
    const result = await api('admin/reset/prepare', Object.fromEntries(new FormData(form)));
    if (!form.isConnected) return;
    clearInterval(studioResetTimer);
    studioResetToken = result.token;
    const filename = 'lamour-backup-before-reset-' + new Date().toISOString().slice(0,10) + '.json';
    const url = URL.createObjectURL(new Blob([result.backup],{type:'application/json'}));
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url),60000);
    document.getElementById('studioResetModalBody').innerHTML = `<form onsubmit="commitStudioReset(event)">
      <p>Chờ trình duyệt tải xong <b>${filename}</b>, sau đó chọn lại file đó bên dưới. Phiên xác nhận có hiệu lực 15 phút.</p>
      <label>File sao lưu đã tải<input type="file" name="backup" accept=".json,application/json" required></label>
      <div class="studio-modal-actions">${studioButton('Hủy', "closeModal('studioResetModal')", 'white')}
      <button type="submit" class="studio-button red">Xác nhận xóa dữ liệu</button></div></form>`;
  },form);
}

async function commitStudioReset(event) {
  event.preventDefault();
  const form = event.currentTarget;
  await action(async () => {
    const token = studioResetToken;
    const bytes = await form.elements.backup.files[0].arrayBuffer();
    const digest = await crypto.subtle.digest('SHA-256',bytes);
    const fileHash = Array.from(new Uint8Array(digest),byte=>byte.toString(16).padStart(2,'0')).join('');
    if (!form.isConnected || studioResetToken !== token) return;
    await api('admin/reset/commit',{token,fileHash});
    closeModal('studioResetModal');
    clearPrivate();
    await refreshState();
    await publicRefresh();
    switchAdminTab('dashboard');
    showToast('Đã reset dữ liệu thư viện.');
  },form);
}

function requestStudioDialog(title, message, options = {}) {
  if (studio.dialogResolve) studio.dialogResolve(null);
  setText('studioDialogTitle', title);
  document.getElementById('studioDialogBody').innerHTML = `<form id="studioDialogForm"><p class="studio-dialog-message">${esc(message)}</p>
    ${options.reason ? '<label>Lý do / ghi nhận<input name="reason" required maxlength="2000" autocomplete="off" /></label>' : ''}
    <div class="studio-modal-actions"><button type="button" class="studio-button white" onclick="closeModal('studioDialog')">${options.cancelLabel || 'Hủy'}</button>
    <button type="submit" class="studio-button ${options.danger ? 'red' : 'dark-green'}">${esc(options.confirmLabel || 'Xác nhận')}</button></div></form>`;
  return new Promise(resolve => {
    studio.dialogResolve = resolve;
    document.getElementById('studioDialogForm').onsubmit = event => {
      event.preventDefault();
      const data = Object.fromEntries(new FormData(event.target));
      studio.dialogResolve = null;
      closeModal('studioDialog');
      resolve(data);
    };
    openModal('studioDialog');
  });
}

function editorField(field) {
  const required = field.required ? 'required' : '';
  let input;
  if (field.options) {
    input = `<select name="${field.name}" ${required}>${field.options.map(([value, label]) => `<option value="${esc(value)}" ${String(field.value ?? '') === String(value) ? 'selected' : ''}>${esc(label)}</option>`).join('')}</select>`;
  } else if (field.type === 'textarea') {
    input = `<textarea name="${field.name}" rows="4" ${required}>${esc(field.value)}</textarea>`;
  } else {
    input = `<input name="${field.name}" type="${field.type || 'text'}" value="${esc(field.value)}" ${required} ${field.min != null ? `min="${field.min}"` : ''} ${field.max != null ? `max="${field.max}"` : ''} ${field.step ? `step="${field.step}"` : ''} />`;
  }
  return `<label class="${field.type === 'textarea' ? 'studio-span-two' : ''}">${esc(field.label)}${input}</label>`;
}

function openStudioEditor(title, fields, save) {
  setText('studioEditorTitle', title);
  document.getElementById('studioEditorBody').innerHTML = `<form id="studioEditorForm"><div class="studio-editor-fields">${fields.map(editorField).join('')}</div><div id="studioEditorError" role="alert" hidden></div><div class="studio-modal-actions">${studioButton('Hủy', "closeModal('studioEditor')", 'white')}<button type="submit" class="studio-button dark-green">Lưu thay đổi</button></div></form>`;
  const form = document.getElementById('studioEditorForm');
  form.onsubmit = async event => {
    event.preventDefault();
    if (form.dataset.busy) return;
    form.dataset.busy = '1';
    const button = form.querySelector('button[type=submit]');
    button.disabled = true;
    try {
      await save(Object.fromEntries(new FormData(form)));
      closeModal('studioEditor');
      await refreshState();
      showToast('Đã lưu thay đổi.');
    } catch (error) {
      const box = document.getElementById('studioEditorError');
      box.hidden = false;
      box.textContent = error.message;
    } finally {
      delete form.dataset.busy;
      button.disabled = false;
    }
  };
  openModal('studioEditor');
}

function editStudioBook() {
  const book = selectedTitle();
  if (!book) return;
  const category = liveState.book_categories.find(item => item.id === book.category_id);
  const fields = [
    {name: 'title', label: 'Tên sách', value: book.title, required: true},
    {name: 'author', label: 'Tác giả', value: book.authors},
    {name: 'category', label: 'Thể loại', value: category?.name, required: true},
    {name: 'publisher', label: 'Nhà xuất bản', value: book.publisher},
    {name: 'price', label: 'Giá bìa (đ) · trống nếu chưa rõ', value: book.cover_price_vnd, type: 'number', min: 0},
    {name: 'pages', label: 'Số trang', value: book.page_count, type: 'number', min: 1},
    {name: 'language', label: 'Ngôn ngữ', value: book.language},
    {name: 'year', label: 'Năm xuất bản', value: book.publication_year, type: 'number', min: 1000, max: 9999},
    {name: 'isbn', label: 'ISBN', value: book.isbn},
    {name: 'coverUrl', label: 'URL ảnh bìa', value: book.cover_url, type: 'url'},
    {name: 'publishStatus', label: 'Tình trạng phát hành', value: book.publication_status, options: [['UNKNOWN', 'Chưa rõ'], ['IN_PRINT', 'Đang phát hành'], ['OUT_OF_PRINT', 'Ngừng phát hành']]},
    {name: 'languageGroup', label: 'Nhóm đơn giá trang', value: book.compensation_language_group, options: [['', 'Chưa rõ'], ['VIETNAMESE', 'Tiếng Việt'], ['FOREIGN', 'Nước ngoài']]},
    {name: 'description', label: 'Nội dung sách', value: book.description, type: 'textarea'}
  ];
  openStudioEditor('Chỉnh sửa đầu sách ' + book.code, fields, input => api('admin/book-titles/edit', {
    ...input, id: book.id, version: book.version,
    price: input.price === '' ? null : Number(input.price), pages: input.pages === '' ? null : Number(input.pages), year: input.year === '' ? null : Number(input.year)
  }));
}

async function toggleStudioBook() {
  const book = selectedTitle();
  const confirmed = await requestStudioDialog(book.show_on_web ? 'Khóa hiển thị sách' : 'Mở hiển thị sách', `Đổi hiển thị ${book.code} trên kho sách công khai?`);
  if (confirmed) await toggleBookWebVisibility(book.code, !book.show_on_web);
}

async function archiveStudioBook() {
  const book = selectedTitle();
  const confirmed = await requestStudioDialog('Xóa sách khỏi danh sách hoạt động', `Lưu trữ ${book.code} — ${book.title}. Chỉ thực hiện khi các cuốn đã hoàn tất nghĩa vụ. Lịch sử vẫn được giữ để đối chiếu.`, {reason: true, danger: true, confirmLabel: 'Xác nhận lưu trữ'});
  if (confirmed) await action(async () => { await api('admin/book-titles/edit', {id: book.id, version: book.version, archive: true, reason: confirmed.reason}); await refreshState(); });
}

function editStudioReader() {
  const reader = selectedReader();
  if (!reader) return;
  openStudioEditor('Chỉnh sửa độc giả ' + reader.code, [
    {name: 'name', label: 'Họ và tên', value: reader.full_name, required: true},
    {name: 'phone', label: 'Số điện thoại', value: reader.phone_display, required: true, type: 'tel'},
    {name: 'email', label: 'Email', value: reader.email, type: 'email'},
    {name: 'category', label: 'Nhóm khách', value: reader.reader_category, options: Object.entries(readerLabels)},
    {name: 'address', label: 'Địa chỉ', value: reader.address},
    {name: 'organization', label: 'Cơ sở / Đơn vị', value: reader.organization},
    {name: 'note', label: 'Ghi chú hồ sơ', value: reader.notes, type: 'textarea'}
  ], input => api('admin/readers/edit', {...input, id: reader.id, version: reader.version}));
}

async function toggleStudioReader() {
  const reader = selectedReader();
  const status = reader.account_status === 'Hoạt động' ? 'Tạm khóa' : 'Hoạt động';
  const confirmed = await requestStudioDialog('Đổi trạng thái độc giả', `${reader.full_name} → ${status}. Hồ sơ tạm khóa sẽ không được lập phiếu mới.`, {reason: true});
  if (confirmed) await action(async () => { await api('admin/readers/edit', {id: reader.id, version: reader.version, status, reason: confirmed.reason}); await refreshState(); });
}

async function archiveStudioReader() {
  const reader = selectedReader();
  const confirmed = await requestStudioDialog('Xóa khách khỏi danh sách hoạt động', `Lưu trữ hồ sơ ${reader.full_name}. Cần hoàn tất các phiếu và nghĩa vụ trước khi thực hiện.`, {reason: true, danger: true, confirmLabel: 'Xác nhận lưu trữ'});
  if (confirmed) await action(async () => { await api('admin/readers/edit', {id: reader.id, version: reader.version, archive: true, reason: confirmed.reason}); await refreshState(); });
}

function editStudioNote(id) {
  const note = (liveState.notes || []).find(item => item.id === id);
  openStudioEditor(note ? 'Chỉnh sửa ghi chú' : 'Thêm ghi chú', [
    {name: 'title', label: 'Tiêu đề', value: note?.title, required: true},
    {name: 'body', label: 'Nội dung', value: note?.body, type: 'textarea'}
  ], input => api('admin/notes', {...input, ...(note ? {id: note.id, version: note.version, done: note.done} : {})}));
}

async function toggleStudioNote(id) {
  const note = liveState.notes.find(item => item.id === id);
  await action(async () => { await api('admin/notes', {...note, done: !note.done}); await refreshState(); });
}

function openStudioImport() {
  document.getElementById('studioImportPassword').value = '';
  openModal('studioImportModal');
}

previewImport = async function (event) {
  event.preventDefault();
  await action(async () => {
    const file = document.getElementById('importFile').files[0];
    if (!file) throw new Error('Chọn file Excel trước khi kiểm tra.');
    const data = new FormData();
    data.set('file', file);
    data.set('mode', val('importMode'));
    data.set('password', val('studioImportPassword'));
    const result = await api('admin/book-imports/validate', data);
    document.getElementById('studioImportPassword').value = '';
    importJob = result.job;
    const skipped = result.rows.filter(row => row.action === 'SKIP' && !row.errors.length).length;
    const fields = {total:'Tổng số cuốn',available:'Có sẵn',title:'Tên sách',author:'Tác giả',category:'Thể loại',publisher:'Nhà xuất bản',language:'Ngôn ngữ',acquiredOn:'Ngày nhập',coverUrl:'Ảnh bìa',description:'Mô tả',year:'Năm xuất bản',isbn:'ISBN',price:'Giá bìa',showOnWeb:'Hiển thị web',pages:'Số trang',publishStatus:'Phát hành',languageGroup:'Nhóm đơn giá',condition:'Tình trạng',mediaType:'Loại',shelf:'Vị trí kệ',note:'Ghi chú'};
    document.getElementById('importPreview').innerHTML = `<h3>Kết quả kiểm tra</h3><p>${result.rows.length} dòng · ${skipped} không đổi · ${result.job.status === 'INVALID' ? 'Cần sửa lỗi' : result.job.status === 'UNCHANGED' ? 'Không có gì cần cập nhật' : 'Sẵn sàng xác nhận'}</p>
      ${skipped === result.rows.length ? '' : studioTable(['Sheet / dòng', 'Mã', 'Thay đổi / lỗi'], result.rows.filter(row => row.action !== 'SKIP' || row.errors.length).map(row => `<tr><td>${esc(row.sheet)} / ${row.row}</td><td>${esc(row.data.code)}</td><td class="studio-import-diff">${row.errors.length ? esc(row.errors.join('; ')) : row.action === 'CREATE' ? 'Thêm mới · ' + esc(row.data.title || row.data.titleCode) + (row.data.stock ? ' · Thêm ' + row.data.stock.total + ' cuốn Có sẵn' : '') : `<ul>${row.changes.map(change=>`<li><b>${esc(fields[change.field])}:</b> ${esc(change.from ?? '—')} → ${esc(change.to ?? '—')}</li>`).join('')}</ul>`}</td></tr>`).join(''))}
      ${result.job.status === 'VALIDATED' ? studioButton('CẬP NHẬT DATA', 'confirmImport()', 'red') : ''}`;
  }, event.target);
};

confirmImport = async function () {
  const confirmed = await requestStudioDialog('Xác nhận nhập Excel', 'Ghi toàn bộ các dòng đã kiểm tra hợp lệ vào kho sách?', {confirmLabel: 'Cập nhật data'});
  if (!confirmed) return;
  await action(async () => { const result = await api('admin/book-imports/commit', {jobId: importJob.id}); setText('importPreview', `Đã nhập ${result.imported} dòng.`); await refreshState(); showToast('Đã cập nhật kho sách.'); });
};

function studioHelp() {
  const sections = [
    ['Website công khai', 'Vào Kho sách để tìm theo tên, tác giả hoặc chuyên mục. Mở một cuốn để xem tình trạng và gửi yêu cầu mượn qua Zalo. Nội quy & Quy trình giải thích điều kiện mượn, tiền cọc và thời hạn trả.'],
    ['ISOV và Kho dữ liệu online', 'Dùng menu trang chủ để xem thông tin chương trình ISOV hoặc mở các thư mục tài nguyên. Một số tài liệu cần quyền truy cập từ đơn vị quản lý.'],
    ['Tổng quan và Thống kê', 'Xem số sách, độc giả, phiếu quá hạn và tiền cọc đang giữ. Dùng các nút đầu trang để cho mượn, nhận sách trả hoặc in phiếu.'],
    ['Kho sách', 'Tìm theo mã, tên hoặc tác giả. Chọn một dòng để xem chi tiết đầu sách. Mục Cập nhật data sách cho phép kiểm tra file Excel trước khi nhập.'],
    ['Độc giả', 'Tìm hồ sơ theo tên, mã hoặc số điện thoại. Mở hồ sơ để xem các lần mượn, tiền cọc và lịch sử giao dịch.'],
    ['Mượn và trả sách', 'Khi cho mượn, chọn độc giả và từng cuốn sách rồi kiểm tra hạn và tiền cọc trước khi xác nhận. Khi nhận trả, tìm mã phiếu rồi chọn Trả / Báo mất trên đúng dòng cuốn sách.'],
    ['Ví tiền', 'Kiểm tra số dư, cọc đang giữ và sổ giao dịch. Mở nhóm thao tác để chuyển ví, thêm ví hoặc xử lý khoản chờ quyết toán.'],
    ['Ghi chú', 'Tạo ghi chú cho công việc nội bộ. Chọn Hoàn thành để chuyển mục sang cột đã làm, hoặc Mở lại nếu cần xử lý tiếp.'],
    ['In phiếu', 'Vào Mượn và trả sách, mở đúng phiếu rồi chọn In phiếu. Chọn chứng từ và bấm In phiếu / Lưu PDF.'],
    ['Nhật ký và Cài đặt', 'Nhật ký hiển thị các thao tác trong 15 ngày gần nhất. Vào Cài đặt để sửa chính sách, thông tin thư viện hoặc tải bản sao lưu.'],
    ['Thông báo', 'Bấm chuông để xem các mục cần chú ý. Bấm từng mục để đọc chi tiết. Trong Tùy chỉnh, chọn bật hoặc tắt từng loại nhắc, ngày nhắc hằng tuần và số ngày báo trước hạn trả.']
  ];
  document.getElementById('studioHelpModalBody').innerHTML = `<p class="studio-subtle">Chọn tiêu đề để mở phần bạn cần.</p><div class="studio-guide-list">${sections.map(([title, detail]) =>
    `<details><summary>${esc(title)}</summary><p>${esc(detail)}</p></details>`).join('')}</div>`;
  openModal('studioHelpModal');
}

function openStudioOperations(kind) {
  const config = {
    readers:['Nhập Excel độc giả','Thêm hồ sơ mới hoặc cập nhật theo mã và VERSION từ file xuất.'],
    loans:['Nhập Excel phiếu mượn','Nhập phiếu mượn mới cho độc giả và cuốn đã có trong hệ thống. Kiểm tra đúng hạn trả và số cọc đã thu.'],
    transfers:['Nhập Excel chuyển ví','Ghi nhận chuyển tiền giữa các ví đã thực hiện. Các khoản cọc đi theo phiếu mượn.']
  }[kind];
  if (!config) return;
  setText('studioOperationsModalTitle',config[0]);
  document.getElementById('studioOperationsModalBody').innerHTML = `<p>${config[1]}</p>
    <div class="studio-toolbar">${studioButton('Tải mẫu',`downloadStudioOperations('${kind}',true)`,'white')}
    ${kind==='readers'?studioButton('Xuất danh sách',`downloadStudioOperations('${kind}',false)`,'white'):''}</div>
    <form onsubmit="previewStudioOperations(event,'${kind}')">
    <label>File Excel<input name="file" type="file" accept=".xlsx" required></label>
    <label>Mật khẩu quản trị<input name="password" type="password" autocomplete="current-password" required></label>
    <button type="submit" class="studio-button green">Kiểm tra &amp; xem trước</button></form>
    <div id="studioOperationsPreview" aria-live="polite"></div>`;
  openModal('studioOperationsModal');
}

function downloadStudioOperations(kind, template) {
  return action(()=>download('admin/operations-excel/template?kind='+kind+'&template='+(template?'1':'0'),null,kind+'.xlsx'));
}

async function previewStudioOperations(event, kind) {
  event.preventDefault();
  const form = event.currentTarget;
  const preview = document.getElementById('studioOperationsPreview');
  preview.replaceChildren();
  await action(async () => {
    const data = new FormData(form);
    data.set('kind',kind);
    form.elements.password.value = '';
    const result = await api('admin/operations-excel/preview',data);
    if (!form.isConnected) return;
    preview.innerHTML = `<h3>Kết quả kiểm tra</h3>
      ${studioTable(['Dòng','Mã','Thay đổi / lỗi'],result.rows.map(row=>`<tr><td>${row.row}</td><td>${esc(row.reference)}</td><td>${esc(row.error || row.summary)}</td></tr>`).join(''))}
      ${result.jobId? `<form class="studio-modal-actions" onsubmit="commitStudioOperations(event,'${result.jobId}')">
      <label><input type="checkbox" required> Tôi đã đối chiếu các dòng và xác nhận dữ liệu đúng thực tế.</label>
      <button type="submit" class="studio-button green">Xác nhận nhập</button></form>`:''}`;
  },form);
}

async function commitStudioOperations(event, jobId) {
  event.preventDefault();
  await action(async()=>{
    const result = await api('admin/operations-excel/commit',{jobId});
    closeModal('studioOperationsModal');
    await refreshState();
    showToast(`Đã nhập ${result.imported} dòng.`);
  },event.currentTarget);
}

let studioInbox = null;
let studioInboxView = 'list';
let studioInboxDetail = null;
let studioInboxQueue = Promise.resolve();
let studioInboxSession = 0;

function updateStudioBell() {
  const count = studioInbox?.items.filter(item => !item.read).length || 0;
  const badge = document.getElementById('studioAlertCount');
  badge.hidden = !count;
  badge.textContent = count > 99 ? '99+' : count;
  const bell = document.getElementById('studioBell');
  bell.classList.toggle('has-unread', count > 0);
  bell.setAttribute('aria-label', count ? `Thông báo, ${count} chưa đọc` : 'Thông báo');
}

function refreshStudioInbox(input = {}) {
  const session = studioInboxSession;
  const run = async () => {
    if (!liveState || session !== studioInboxSession) return false;
    try {
      const result = await api('admin/notifications', input);
      if (!liveState || session !== studioInboxSession) return false;
      if (JSON.stringify(result) === JSON.stringify(studioInbox)) return true;
      studioInbox = result;
      updateStudioBell();
      if (studioInboxView === 'list' && document.getElementById('studioNotificationModal').classList.contains('open')) renderStudioInbox();
      return true;
    } catch {
      if (session === studioInboxSession) setText('studioInboxStatus', 'Không kết nối được. Vui lòng thử lại.');
      return false;
    }
  };
  studioInboxQueue = studioInboxQueue.then(run);
  return studioInboxQueue;
}

function studioNotifications() {
  studioInboxView = 'list';
  studioInboxDetail = null;
  renderStudioInbox();
  openModal('studioNotificationModal');
  void refreshStudioInbox();
}

const studioNotificationLabels = {backup:'Sao lưu hằng tuần', books:'Cập nhật sách hằng tuần', due:'Gần đến hạn trả sách'};

function renderStudioInbox() {
  const body = document.getElementById('studioNotificationModalBody');
  const items = studioInbox?.items || [];
  if (studioInboxView === 'detail' && studioInboxDetail) {
    const item = studioInboxDetail;
    const target = {backup:'settings', books:'books', due:'loans'}[item.kind];
    const label = {backup:'Mở Cài đặt', books:'Mở Kho sách', due:'Xem phiếu mượn'}[item.kind];
    body.innerHTML = `<div class="studio-inbox-detail">${studioButton('← Danh sách', 'showStudioInboxList()', 'text')}
      <span class="studio-tag">${studioNotificationLabels[item.kind]}</span><h3>${esc(item.title)}</h3>
      <p>${esc(item.detail)}</p>${studioButton(label, `followStudioNotification('${target}')`, 'green')}</div><p id="studioInboxStatus" role="status"></p>`;
    return;
  }
  body.innerHTML = `<div class="studio-inbox-header"><div><strong>${items.filter(item => !item.read).length} chưa đọc</strong>
    <p class="studio-subtle">Mở từng thông báo để xem chi tiết.</p></div>
    <div>${studioInbox && ['backup','books','due'].some(kind=>studioInbox.preferences[kind]) ? studioButton('Tắt mọi nhắc nhở','disableStudioReminders()','white') : ''}
    ${studioButton('Tùy chỉnh', 'editStudioNotifications()', 'white')}</div></div>
    <p id="studioInboxStatus" role="status">${studioInbox ? '' : 'Đang tải thông báo…'}</p>
    <div class="studio-inbox-list">${items.map((item, index) => `<button type="button" class="studio-inbox-item ${item.read ? '' : 'is-unread'}" onclick="openStudioNotification(${index})">
      <span class="studio-inbox-icon">${studioIcon({backup:'upload', books:'books', due:'calendar'}[item.kind])}</span>
      <span><small>${studioNotificationLabels[item.kind]} · ${esc(item.date.split('-').reverse().join('/'))}</small>
      <strong>${esc(item.title)}</strong></span><span class="studio-inbox-state">${item.read ? 'Đã đọc' : 'Chưa đọc'}</span>
    </button>`).join('') || (studioInbox ? '<p class="studio-empty">Bạn chưa có thông báo.</p>' : '')}</div>`;
}

function showStudioInboxList() {
  studioInboxView = 'list';
  renderStudioInbox();
  document.querySelector('#studioNotificationModalBody button')?.focus();
}

async function disableStudioReminders() {
  if (!studioInbox) return;
  await refreshStudioInbox({preferences:{...studioInbox.preferences,backup:false,books:false,due:false}});
}

async function openStudioNotification(index) {
  const item = studioInbox?.items[index];
  if (!item) return;
  studioInboxView = 'detail';
  studioInboxDetail = item;
  renderStudioInbox();
  document.querySelector('#studioNotificationModalBody button')?.focus();
  if (!item.read) await refreshStudioInbox({readId: item.id});
}

function followStudioNotification(tab) {
  const item = studioInboxDetail;
  closeModal('studioNotificationModal');
  switchAdminTab(tab);
  if (tab === 'loans' && item?.loanCode) {
    clearLoanFilters();
    document.getElementById('adminLoanSearch').value = item.loanCode;
    renderAdminLoans();
  }
}

function editStudioNotifications() {
  if (!studioInbox) { void refreshStudioInbox(); return; }
  studioInboxView = 'settings';
  const preferences = studioInbox.preferences;
  const weekdays = ['Chủ nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
  document.getElementById('studioNotificationModalBody').innerHTML = `<form class="studio-notification-form" onsubmit="saveStudioNotifications(event)">
    ${Object.entries(studioNotificationLabels).map(([kind, title]) => `<fieldset><legend>${title}</legend>
      <label class="studio-notification-toggle"><input type="checkbox" name="${kind}" ${preferences[kind] ? 'checked' : ''}> Bật thông báo</label>
      ${kind === 'due' ? `<label>Nhắc trước hạn (ngày)<input type="number" name="dueDays" min="1" max="30" value="${preferences.dueDays}" required></label>`
        : `<label>Ngày nhắc<select name="${kind}Day">${weekdays.map((day, index) => `<option value="${index}" ${index === preferences[kind + 'Day'] ? 'selected' : ''}>${day}</option>`).join('')}</select></label>`}
    </fieldset>`).join('')}
    <p id="studioInboxStatus" role="status"></p>
    <div class="studio-modal-actions">${studioButton('Quay lại', 'showStudioInboxList()', 'white')}<button type="submit" class="studio-button green">Lưu tùy chỉnh</button></div></form>`;
  document.querySelector('#studioNotificationModalBody input')?.focus();
}

async function saveStudioNotifications(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const button = form.querySelector('[type=submit]');
  button.disabled = true;
  const data = new FormData(form);
  const preferences = {
    backup: data.has('backup'), books: data.has('books'), due: data.has('due'),
    backupDay: Number(data.get('backupDay')), booksDay: Number(data.get('booksDay')), dueDays: Number(data.get('dueDays'))
  };
  const saved = await refreshStudioInbox({preferences});
  button.disabled = false;
  if (saved && form.isConnected) showStudioInboxList();
}

function searchStudioFeatures() {
  const query = normalizeSearch(val('studioFeatureSearch'));
  const results = document.getElementById('studioSearchResults');
  results.hidden = !query;
  results.innerHTML = Object.entries(studioTitles).filter(([, label]) => normalizeSearch(label).includes(query)).map(([tab, label]) => `<button onclick="switchAdminTab('${tab}');document.getElementById('studioSearchResults').hidden=true">${esc(label)}</button>`).join('') || '<p>Không tìm thấy tính năng.</p>';
}

function studioExport() {
  if (!liveState) return;
  if (studio.tab === 'books') { action(() => download('admin/book-export', null, 'dau-sach-lamour.xlsx')); return; }
  const sources = {
    readers: [liveState.readers.filter(reader => !reader.archived_at), ['code', 'full_name', 'phone_display', 'email', 'reader_category', 'address', 'organization', 'notes']],
    loans: [liveState.loans, ['code', 'borrowed_on', 'due_on', 'status', 'notes']],
    wallets: [liveState.financial_transactions, ['code', 'type', 'amount_vnd', 'occurred_at', 'reason']],
    notes: [(liveState.notes || []).filter(note => !note.archived), ['title', 'body', 'done', 'updatedAt']],
    settings: [liveState.audit_logs, ['occurred_at', 'action', 'target_table', 'target_id', 'reason']]
  };
  const [records, columns] = sources[studio.tab] || [db.wallets.map(wallet => ({code: wallet.id, name: decodeHtml(wallet.name), ...getWalletStats(wallet.name)})), ['code', 'name', 'balance', 'depositHeld']];
  const cell = value => {
    let string = String(value ?? '');
    if (/^[=+@-]/.test(string)) string = "'" + string;
    return '"' + string.replace(/"/g, '""') + '"';
  };
  const csv = '\ufeff' + [columns.map(cell).join(','), ...records.map(record => columns.map(column => cell(record[column])).join(','))].join('\r\n');
  const objectUrl = URL.createObjectURL(new Blob([csv], {type: 'text/csv;charset=utf-8'}));
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = 'lamour-' + studio.tab + '.csv';
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}

function openStudioCalendar() {
  studio.calendarMonth = (studio.loanRange?.[0] || liveState?.today || new Date().toISOString().slice(0, 10)).slice(0, 7);
  studio.rangeStart = null;
  setText('studioCalendarTitle', 'Lọc theo ngày mượn');
  document.getElementById('studioCalendarBody').innerHTML = `<select id="studioCalendarPreset" aria-label="Khoảng ngày" onchange="studioDatePreset(this.value)"><option value="CUSTOM">Chọn khoảng ngày</option><option value="TODAY">Hôm nay</option><option value="MONTH">Tháng này</option><option value="ALL">Tất cả ngày</option></select>
    <div id="studioCalendarGrid"></div><div class="studio-date-inputs"><label>Từ ngày<input type="date" id="studioDateFrom" onchange="renderStudioCalendar()" /></label><label>Đến ngày<input type="date" id="studioDateTo" onchange="renderStudioCalendar()" /></label></div>
    <p id="studioCalendarHint" aria-live="polite">Chọn ngày bắt đầu và ngày kết thúc.</p>`;
  const dialog = document.querySelector('#studioCalendar .modal-dialog');
  dialog.querySelector('.studio-calendar-footer')?.remove();
  dialog.insertAdjacentHTML('beforeend', `<footer class="studio-modal-actions studio-calendar-footer">${studioButton('Hủy', "closeModal('studioCalendar')", 'white')}${studioButton('Áp dụng', 'applyStudioDates()', 'dark-green')}</footer>`);
  document.getElementById('studioDateFrom').value = studio.loanRange?.[0] || '';
  document.getElementById('studioDateTo').value = studio.loanRange?.[1] || '';
  renderStudioCalendar();
  openModal('studioCalendar');
}

function renderStudioCalendar() {
  const [year, month] = studio.calendarMonth.split('-').map(Number);
  const first = new Date(Date.UTC(year, month - 1, 1));
  const offset = (first.getUTCDay() + 6) % 7;
  const count = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const from = val('studioDateFrom'), to = val('studioDateTo');
  let days = '<span aria-hidden="true"></span>'.repeat(offset);
  for (let day = 1; day <= count; day++) {
    const date = studio.calendarMonth + '-' + String(day).padStart(2, '0');
    days += `<button type="button" class="${date === from || date === to ? 'endpoint' : from && to && date > from && date < to ? 'in-range' : ''}" aria-label="${day}/${month}/${year}" aria-pressed="${date === from || date === to}" onclick="selectStudioDay('${date}')">${day}</button>`;
  }
  document.getElementById('studioCalendarGrid').innerHTML = `<header><h3>Tháng ${month}. ${year}</h3><div>${studioButton('‹', 'moveStudioMonth(-1)', 'calendar-arrow')}${studioButton('›', 'moveStudioMonth(1)', 'calendar-arrow')}</div></header>
    <div class="studio-calendar-days">${['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map(day => `<strong>${day}</strong>`).join('')}${days}</div>`;
}

function moveStudioMonth(direction) {
  const [year, month] = studio.calendarMonth.split('-').map(Number);
  studio.calendarMonth = new Date(Date.UTC(year, month - 1 + direction, 1)).toISOString().slice(0, 7);
  renderStudioCalendar();
}

function selectStudioDay(date) {
  if (!studio.rangeStart) {
    studio.rangeStart = date;
    document.getElementById('studioDateFrom').value = date;
    document.getElementById('studioDateTo').value = '';
    setText('studioCalendarHint', 'Chọn ngày kết thúc. Có thể chọn cùng ngày để lọc một ngày.');
  } else {
    const range = [studio.rangeStart, date].sort();
    document.getElementById('studioDateFrom').value = range[0];
    document.getElementById('studioDateTo').value = range[1];
    studio.rangeStart = null;
    setText('studioCalendarHint', `Từ ${range[0]} đến ${range[1]}`);
  }
  renderStudioCalendar();
}

function studioDatePreset(preset) {
  const today = liveState.today;
  if (preset === 'ALL') { studio.loanRange = null; closeModal('studioCalendar'); renderAdminLoans(); return; }
  if (preset === 'CUSTOM') return;
  document.getElementById('studioDateFrom').value = preset === 'TODAY' ? today : today.slice(0, 7) + '-01';
  const [year, month] = today.split('-').map(Number);
  document.getElementById('studioDateTo').value = preset === 'TODAY' ? today : new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
  studio.calendarMonth = today.slice(0, 7);
  renderStudioCalendar();
}

function applyStudioDates() {
  const from = val('studioDateFrom'), to = val('studioDateTo');
  if (!from || !to || from > to) { setText('studioCalendarHint', 'Chọn đủ hai ngày, ngày kết thúc từ ngày bắt đầu trở đi.'); return; }
  studio.loanRange = [from, to];
  closeModal('studioCalendar');
  renderAdminLoans();
}

addQuickCopy = function (code) {
  const title = liveState.book_titles.find(book => book.code === code);
  if (!title) { showToast('Không tìm thấy đầu sách.'); return; }
  openStudioEditor('Thêm cuốn cho ' + title.code, [
    {name: 'shelf', label: 'Vị trí kệ'}, {name: 'condition', label: 'Tình trạng', value: 'Tốt'}, {name: 'note', label: 'Ghi chú', type: 'textarea'}
  ], input => api('admin/copies', {...input, titleId: title.id}));
};

openNewCopyModal = function () {
  openStudioEditor('Thêm cuốn sách', [
    {name: 'titleId', label: 'Đầu sách', options: liveState.book_titles.filter(book => !book.archived_at).map(book => [book.id, book.code + ' — ' + book.title]), required: true},
    {name: 'shelf', label: 'Vị trí kệ'}, {name: 'condition', label: 'Tình trạng', value: 'Tốt'}, {name: 'note', label: 'Ghi chú', type: 'textarea'}
  ], input => api('admin/copies', input));
};

function studioCopyStatus(id) {
  const copy = liveState.book_copies.find(item => item.id === id);
  if (!copy) return;
  openStudioEditor('Chỉnh cuốn ' + copy.code, [
    {name: 'status', label: 'Trạng thái kho', value: copy.status, options: Object.entries(copyLabels).filter(([status]) => copy.status === 'ON_LOAN' ? status === 'ON_LOAN' : status !== 'ON_LOAN')},
    {name:'condition',label:'Tình trạng vật lý',value:copy.physical_condition,required:true},
    {name:'mediaType',label:'Loại',value:copy.media_type,required:true},
    {name:'shelf',label:'Vị trí kệ',value:copy.shelf_location},
    {name:'acquiredOn',label:'Ngày nhập',type:'date',value:copy.acquired_on,required:true},
    {name:'note',label:'Ghi chú tình trạng',type:'textarea',value:copy.condition_note},
    {name: 'reason', label: 'Lý do đổi trạng thái', required: true, type: 'textarea'}
  ], input => api('admin/copies/status', {...input, id: copy.id, version: copy.version}));
}

recordContact = function (id) {
  const item = liveState.loan_items.find(item => item.id === id);
  openStudioEditor('Ghi nhận liên hệ thu hồi', [
    {name: 'channel', label: 'Kênh liên hệ', options: [['Điện thoại', 'Điện thoại'], ['Zalo', 'Zalo'], ['Tại quầy', 'Tại quầy']]},
    {name: 'nextDate', label: 'Ngày liên hệ tiếp', type: 'date'},
    {name: 'content', label: 'Nội dung liên hệ', required: true, type: 'textarea'},
    {name: 'result', label: 'Kết quả', required: true, type: 'textarea'}
  ], input => api('admin/contacts', {...input, loanId: item.loan_id}));
};

receiveReplacement = function (id) {
  openStudioEditor('Nhận sách thay thế', [{name: 'reason', label: 'Ghi nhận kiểm tra sách mới cùng tên, tác giả và tình trạng', type: 'textarea', required: true}], input => api('admin/replacements', {...input, itemId: id}));
};

settlePendingUi = async function (id) {
  await action(async () => {
    const quote = await api('admin/settlements/quote', {itemId: id});
    openStudioEditor(`Quyết toán · Khấu trừ ${formatCurrency(quote.applied)} · Hoàn ${formatCurrency(quote.refund)} · Thu thêm ${formatCurrency(quote.extra)}`, [
      {name: 'walletId', label: 'Ví thực tế thu / chi', options: liveState.wallets.filter(wallet => wallet.active).map(wallet => [wallet.id, wallet.display_name]), required: true},
      {name: 'reason', label: 'Ghi nhận đã thực thu / chi đúng số tiền nêu trên', type: 'textarea', required: true}
    ], input => api('admin/settlements', {...input, itemId: id, version: quote.version, quoteHash: quote.quoteHash, cashConfirmed: true}));
  });
};

reverseTransferUi = async function (id) {
  const confirmed = await requestStudioDialog('Đảo giao dịch chuyển ví', 'Ghi nhận dòng tiền ngược chiều của giao dịch này. Hãy xác nhận khoản chuyển ngược đã được thực hiện.', {reason: true, danger: true});
  if (confirmed) await action(async () => { await api('admin/transactions/reverse', {id, reason: confirmed.reason}); await refreshState(); });
};

const baseOpenNewLoanModal = openNewLoanModal;
const baseLoanPayload = loanPayload;
let studioAppendLoanId = null;
let studioLoanQuoteRequest = 0;
const studioLoanCopyNotes = new Map();

openNewLoanModal = function () { openStudioLoanForm(); };

function openStudioLoanForm(loanId = null, {readerId,bookId} = {}) {
  if (!liveState) return;
  const loan = liveState.loans.find(row=>row.id===loanId);
  if (loanId && (!loan || loan.status==='COMPLETED')) return;
  const book=bookId && liveState.book_titles.find(book=>book.id===bookId && !book.archived_at);
  const copy=book && liveState.book_copies.find(copy=>copy.title_id===book.id && copy.status==='READY');
  if (bookId && !copy) { showToast('Đầu sách không còn cuốn có sẵn.'); return; }
  studioAppendLoanId = loanId;
  studioLoanQuoteRequest++;
  studioLoanCopyNotes.clear();
  baseOpenNewLoanModal();
  document.getElementById('loanReaderSelect').value='';
  document.getElementById('loanStartDate').min=loan?.borrowed_on || '';
  document.getElementById('loanStartDate').max=liveState.today;
  document.querySelector('#newLoanModal .modal-header h3').textContent = loan ? 'Mượn thêm · '+loan.code : 'Lập phiếu mượn sách mới';
  document.getElementById('loanReaderSearch').disabled = Boolean(loan);
  document.getElementById('loanReaderSelect').disabled = Boolean(loan);
  document.getElementById('studioLoanFormHistory').innerHTML = loan
    ? studioLoanHistory(loan,liveState.loan_items.filter(item=>item.loan_id===loan.id),new Map(liveState.book_copies.map(copy=>[copy.id,copy])))
    : '';
  filterStudioLoanReaders(loan?.reader_id || readerId);
  filterStudioLoanBooks();
  renderStudioLoanCart();
  if (copy) {
    document.getElementById('loanBookMatch').value=copy.id;
    addStudioLoanCopy();
  }
  void onLoanReaderChange();
}

function filterStudioLoanReaders(lockedReaderId) {
  const select=document.getElementById('loanReaderSelect');
  const previous=lockedReaderId || select.value;
  const query=normalizeSearch(val('loanReaderSearch'));
  const readers=liveState.readers.filter(reader=>!reader.archived_at && reader.account_status!=='Tạm khóa'
    && (lockedReaderId ? reader.id===lockedReaderId : normalizeSearch([reader.code,reader.full_name,reader.phone_display,reader.phone_normalized].join(' ')).includes(query)));
  select.replaceChildren(new Option('Chọn độc giả',''));
  for (const reader of readers) select.add(new Option([reader.code,reader.full_name,reader.phone_display,readerLabels[reader.reader_category]].filter(Boolean).join(' · '),reader.id));
  if (readers.some(reader=>reader.id===previous)) select.value=previous;
  else if (query && readers.length===1) select.value=readers[0].id;
  void onLoanReaderChange();
}

function filterStudioLoanBooks() {
  const select=document.getElementById('loanBookMatch');
  const query=normalizeSearch(val('loanBookSearch'));
  const choices=[...document.getElementById('loanCopySelect').options].filter(option=>!option.selected && normalizeSearch(option.text).includes(query));
  select.replaceChildren();
  for (const option of choices) select.add(new Option(option.text,option.value));
  if (!choices.length) select.add(new Option('Không có cuốn phù hợp',''));
  select.disabled=!choices.length;
}

function addStudioLoanCopy() {
  const option=[...document.getElementById('loanCopySelect').options].find(option=>option.value===val('loanBookMatch'));
  if (!option || option.selected) return;
  if (studioLoanCopyNotes.size>=100) {showToast('Mỗi lần giao tối đa 100 cuốn.');return;}
  option.selected=true;
  const copy=liveState.book_copies.find(copy=>copy.id===option.value);
  studioLoanCopyNotes.set(option.value,[copy?.physical_condition,copy?.condition_note].filter(Boolean).join(' · ') || 'Sách tốt, nguyên vẹn');
  renderStudioLoanCart();
  filterStudioLoanBooks();
  void onLoanReaderChange();
}

function removeStudioLoanCopy(id) {
  const option=[...document.getElementById('loanCopySelect').options].find(option=>option.value===id);
  if (option) option.selected=false;
  studioLoanCopyNotes.delete(id);
  renderStudioLoanCart();
  filterStudioLoanBooks();
  void onLoanReaderChange();
}

function renderStudioLoanCart() {
  const options=[...document.getElementById('loanCopySelect').selectedOptions];
  document.getElementById('studioLoanCart').innerHTML = `<p><b>${options.length} cuốn sẽ giao</b></p>` + options.map(option=>`<div class="studio-loan-cart-row">
    <div><strong>${esc(option.text)}</strong><label>Tình trạng khi giao<input required maxlength="2000" value="${esc(studioLoanCopyNotes.get(option.value))}" oninput="studioLoanCopyNotes.set('${option.value}',this.value)"></label></div>
    ${studioButton('Bỏ',`removeStudioLoanCopy('${option.value}')`,'mini white')}</div>`).join('');
}

function renderStudioLoanPreview() {
  const paper=document.getElementById('studioLoanPaper');
  if (!paper || !liveState) return;
  const input=loanPayload();
  const original=liveState.loans.find(loan=>loan.id===input.loanId);
  const reader=original?.reader_snapshot || liveState.readers.find(reader=>reader.id===input.readerId);
  const copies=new Map(liveState.book_copies.map(copy=>[copy.id,copy]));
  const titles=new Map(liveState.book_titles.map(title=>[title.id,title]));
  const deposit=val('loanDepositInput')==='' ? null : Number(val('loanDepositInput'));
  const loan=original || {reader_snapshot:reader,borrowed_on:input.borrowDate,due_on:val('loanDueDate'),created_at:liveState.today};
  const items=original ? liveState.loan_items.filter(item=>item.loan_id===original.id)
    .map(item=>({...item,copy_code:copies.get(item.copy_id)?.code})) : [];
  for (const id of input.copyIds) {
    const copy=copies.get(id);
    if (!copy) continue;
    items.push({
      copy_code:copy.code,title_snapshot:titles.get(copy.title_id),
      condition_out_note:input.copyNotes[id],checkout_on:input.borrowDate,due_on:val('loanDueDate'),
      deposit_required_vnd:deposit===null ? null : deposit/input.copyIds.length
    });
  }
  const transactions=original ? liveState.financial_transactions.filter(entry=>entry.loan_id===original.id) : [];
  paper.innerHTML=loanPaperMarkup({
    snapshot:{loan,items,settings:liveState.settings,transactions},
    draft:true,pendingDeposit:deposit,
    walletName:deposit>0 ? liveState.wallets.find(wallet=>wallet.id===input.walletId)?.display_name : ''
  });
}

loanPayload = function () {
  return {...baseLoanPayload(),loanId:studioAppendLoanId,copyNotes:Object.fromEntries(studioLoanCopyNotes)};
};

onLoanReaderChange = async function () {
  const request=++studioLoanQuoteRequest;
  const input=loanPayload();
  document.getElementById('loanDueDate').value='';
  document.getElementById('loanDepositInput').value='';
  document.getElementById('loanDepositConfirmed').checked=false;
  document.getElementById('loanWarningAck').checked=false;
  renderStudioLoanPreview();
  if (!input.readerId || !input.copyIds.length || !input.borrowDate) {
    setText('loanWarnings','Chọn độc giả, ngày mượn và thêm sách để tính cọc.');
    return;
  }
  setText('loanWarnings','Đang tính hạn trả và tiền cọc…');
  try {
    const quote=await api('admin/loans/quote',input);
    if (request!==studioLoanQuoteRequest) return;
    document.getElementById('loanDueDate').value=quote.dueDate;
    document.getElementById('loanDepositInput').value=quote.deposit;
    renderStudioLoanPreview();
    setText('loanWarnings',quote.overdue ? `Độc giả có ${quote.overdue} cuốn quá hạn. Xác nhận đã xem cảnh báo để tiếp tục.` : 'Đã tính theo nhóm độc giả và chính sách hiện hành.');
  } catch (error) {
    if (request===studioLoanQuoteRequest) setText('loanWarnings',error.message);
  }
};

submitNewLoan = async function (event) {
  event.preventDefault();
  await action(async () => {
    const input = loanPayload();
    if (!input.readerId || !input.copyIds.length) throw new Error('Chọn độc giả và thêm ít nhất một cuốn sách.');
    const quote = await api('admin/loans/quote', input);
    if (quote.overdue && !input.warningAcknowledged) throw new Error('Hãy xác nhận đã xem cảnh báo quá hạn.');
    if (quote.deposit>0 && (!input.walletId || !input.depositConfirmed)) throw new Error('Chọn ví và xác nhận đã nhận đủ tiền cọc.');
    const confirmed = await requestStudioDialog(input.loanId ? 'Xác nhận giao thêm sách' : 'Phát hành phiếu mượn', `${input.copyIds.length} cuốn · Hạn trả ${quote.dueDate} · Tiền cọc ${formatCurrency(quote.deposit)}. Xác nhận bàn giao và tiền cọc đã nhận theo phiếu.`);
    if (!confirmed) return;
    const loan = await api('admin/loans/issue', {...input, quoteToken: quote.quoteToken});
    closeModal('newLoanModal');
    await refreshState();
    workspaceOpenLoan(loan.id);
    showToast((input.loanId ? 'Đã giao thêm sách trên phiếu ' : 'Đã phát hành phiếu ') + loan.code + '.');
  }, event.target);
};

submitReturnLoan = async function (event) {
  event.preventDefault();
  await action(async () => {
    await recalculateReturnSettlement();
    if (!returnQuoteValue) throw new Error('Chưa có báo giá hợp lệ.');
    const input = {...returnPayload(), version: returnQuoteValue.version, quoteHash: returnQuoteValue.quoteHash};
    const confirmed = await requestStudioDialog('Xác nhận xử lý cuốn sách', input.settleNow ? 'Ghi nhận tình trạng sách và các khoản thu / hoàn theo báo giá đã xem.' : 'Ghi nhận sách đã nhận. Tiền và nghĩa vụ được giữ để quyết toán sau.');
    if (!confirmed) return;
    studio.loanId = liveState.loan_items.find(item=>item.id===input.itemId)?.loan_id || studio.loanId;
    await api('admin/returns', input);
    closeModal('returnLoanModal');
    await refreshState();
    showToast('Đã xử lý cuốn sách.');
  }, event.target);
};

const previousRouteHash = routeHash;
routeHash = function () {
  const tab = location.hash.startsWith('#/admin/') ? location.hash.split('/')[2] : null;
  if (tab && studioTitles[tab] && window.liveSession) { navigateTo('admin'); switchAdminTab(tab, false); return; }
  previousRouteHash();
};

const previousClearPrivate = clearPrivate;
clearPrivate = function () {
  studioInboxSession++;
  studioInbox = studioInboxDetail = null;
  studioInboxView = 'list';
  document.getElementById('studioNotificationModalBody')?.replaceChildren();
  if (document.getElementById('studioBell')) updateStudioBell();
  studioLogRequest++;
  previousClearPrivate();
  for (const id of ['studioBookDetail', 'studioReaderDetail', 'studioNoteBoard', 'studioWalletOverview', 'studioanalytics', 'studioTopReaders', 'studioRecentLogs']) document.getElementById(id)?.replaceChildren();
  const noteSearch = document.getElementById('studioNoteSearch');
  if (noteSearch) noteSearch.value = '';
  studio.bookId = null;
  studio.readerId = null;
  document.querySelectorAll('.modal-overlay.open').forEach(overlay => closeModal(overlay.id));
};
